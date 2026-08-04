import { asc, desc, eq } from "drizzle-orm";
import type {
  Allocation,
  AllocationDestination,
  ComponentDetail,
  Difficulty,
  EssentialGroup,
  GroceryCategory,
  IngredientLine,
  MealDetail,
  PlanDetail,
  PlanSummary,
  PrepSectionDetail,
  StepLine,
} from "shared";
import type { Db } from "./client.js";
import * as t from "./schema.js";

const parseJson = <T>(text: string, fallback: T): T => {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
};

// undefined-stripping helper: DB nulls become absent optional fields so the
// assembled document matches the payload-derived types exactly.
const opt = <T>(v: T | null): T | undefined => (v === null ? undefined : v);

export async function getPlanSummaries(db: Db): Promise<PlanSummary[]> {
  const planRows = await db.select().from(t.plans).orderBy(desc(t.plans.weekOf), desc(t.plans.slug));
  if (planRows.length === 0) return [];
  const mealRows = await db.select().from(t.meals).orderBy(asc(t.meals.mealNumber));
  const mealsByPlan = new Map<string, typeof mealRows>();
  for (const m of mealRows) {
    const list = mealsByPlan.get(m.planId) ?? [];
    list.push(m);
    mealsByPlan.set(m.planId, list);
  }
  return planRows.map((p) => ({
    slug: p.slug,
    weekOf: p.weekOf,
    theme: p.theme,
    servings: p.servings,
    leftovers: p.leftovers,
    difficulty: p.difficulty as Difficulty,
    generatedAt: p.generatedAt,
    meals: (mealsByPlan.get(p.id) ?? []).map((m) => ({
      mealNumber: m.mealNumber,
      name: m.name,
      subtitle: opt(m.subtitle),
      protein: m.protein,
      proteinCategory: m.proteinCategory,
      cuisine: m.cuisine,
    })),
  }));
}

export async function getPlanDetail(db: Db, slug: string): Promise<PlanDetail | null> {
  const plan = await db.select().from(t.plans).where(eq(t.plans.slug, slug)).get();
  if (!plan) return null;

  const [
    mealRows,
    componentRows,
    mealComponentRows,
    groceryRows,
    essentialRows,
    timeSaverRows,
    sectionRows,
    taskRows,
    mealIngredients,
    componentIngredients,
    mealSteps,
    componentSteps,
  ] = await Promise.all([
    db.select().from(t.meals).where(eq(t.meals.planId, plan.id)).orderBy(asc(t.meals.mealNumber)),
    db.select().from(t.components).where(eq(t.components.planId, plan.id)).orderBy(asc(t.components.createdAt)),
    db
      .select({ mealId: t.mealComponents.mealId, componentId: t.mealComponents.componentId, position: t.mealComponents.position })
      .from(t.mealComponents)
      .innerJoin(t.meals, eq(t.mealComponents.mealId, t.meals.id))
      .where(eq(t.meals.planId, plan.id)),
    db
      .select()
      .from(t.groceryItems)
      .where(eq(t.groceryItems.planId, plan.id))
      .orderBy(asc(t.groceryItems.category), asc(t.groceryItems.position)),
    db
      .select()
      .from(t.essentialItems)
      .where(eq(t.essentialItems.planId, plan.id))
      .orderBy(asc(t.essentialItems.group), asc(t.essentialItems.position)),
    db.select().from(t.timeSavers).where(eq(t.timeSavers.planId, plan.id)).orderBy(asc(t.timeSavers.position)),
    db.select().from(t.prepSections).where(eq(t.prepSections.planId, plan.id)).orderBy(asc(t.prepSections.position)),
    db.select().from(t.prepTasks).where(eq(t.prepTasks.planId, plan.id)).orderBy(asc(t.prepTasks.position)),
    db
      .select({ row: t.recipeIngredients })
      .from(t.recipeIngredients)
      .innerJoin(t.meals, eq(t.recipeIngredients.mealId, t.meals.id))
      .where(eq(t.meals.planId, plan.id))
      .orderBy(asc(t.recipeIngredients.position)),
    db
      .select({ row: t.recipeIngredients })
      .from(t.recipeIngredients)
      .innerJoin(t.components, eq(t.recipeIngredients.componentId, t.components.id))
      .where(eq(t.components.planId, plan.id))
      .orderBy(asc(t.recipeIngredients.position)),
    db
      .select({ row: t.recipeSteps })
      .from(t.recipeSteps)
      .innerJoin(t.meals, eq(t.recipeSteps.mealId, t.meals.id))
      .where(eq(t.meals.planId, plan.id))
      .orderBy(asc(t.recipeSteps.position)),
    db
      .select({ row: t.recipeSteps })
      .from(t.recipeSteps)
      .innerJoin(t.components, eq(t.recipeSteps.componentId, t.components.id))
      .where(eq(t.components.planId, plan.id))
      .orderBy(asc(t.recipeSteps.position)),
  ]);

  const componentSlugById = new Map(componentRows.map((c) => [c.id, c.slug]));
  const refSlug = (id: string | null) => (id === null ? undefined : componentSlugById.get(id));

  const toIngredient = (row: typeof t.recipeIngredients.$inferSelect): IngredientLine & { id: string } => ({
    id: row.id,
    section: opt(row.section),
    text: row.text,
    fromPrep: row.fromPrep,
    refComponentSlug: refSlug(row.refComponentId),
  });
  const toStep = (row: typeof t.recipeSteps.$inferSelect): StepLine & { id: string } => ({
    id: row.id,
    section: opt(row.section),
    label: opt(row.label),
    displayNumber: opt(row.displayNumber),
    text: row.text,
    footnote: opt(row.footnote),
  });

  const groupBy = <R extends { row: { mealId: string | null; componentId: string | null } }>(rows: R[], key: "mealId" | "componentId") => {
    const map = new Map<string, R["row"][]>();
    for (const { row } of rows) {
      const owner = row[key];
      if (owner === null) continue;
      const list = map.get(owner) ?? [];
      list.push(row);
      map.set(owner, list);
    }
    return map;
  };
  const ingredientsByMeal = groupBy(mealIngredients, "mealId");
  const ingredientsByComponent = groupBy(componentIngredients, "componentId");
  const stepsByMeal = groupBy(mealSteps, "mealId");
  const stepsByComponent = groupBy(componentSteps, "componentId");

  const componentSlugsByMeal = new Map<string, { slug: string; position: number }[]>();
  for (const mc of mealComponentRows) {
    const slugForId = componentSlugById.get(mc.componentId);
    if (slugForId === undefined) continue;
    const list = componentSlugsByMeal.get(mc.mealId) ?? [];
    list.push({ slug: slugForId, position: mc.position });
    componentSlugsByMeal.set(mc.mealId, list);
  }

  const meals: MealDetail[] = mealRows.map((m) => ({
    id: m.id,
    mealNumber: m.mealNumber,
    name: m.name,
    subtitle: opt(m.subtitle),
    protein: m.protein,
    proteinCategory: m.proteinCategory,
    cuisine: m.cuisine,
    keyIngredients: parseJson<string[]>(m.keyIngredients, []),
    prepTimeMinutes: opt(m.prepTimeMinutes),
    cookTimeMinutes: opt(m.cookTimeMinutes),
    menuBlurb: opt(m.menuBlurb),
    yieldLine: opt(m.yieldLine),
    attribution: opt(m.attribution),
    componentSlugs: (componentSlugsByMeal.get(m.id) ?? []).sort((a, b) => a.position - b.position).map((c) => c.slug),
    preppedIngredients: parseJson<{ text: string; componentSlug?: string }[]>(m.preppedIngredients, []),
    ingredients: (ingredientsByMeal.get(m.id) ?? []).map(toIngredient),
    steps: (stepsByMeal.get(m.id) ?? []).map(toStep),
    hotTip: opt(m.hotTip),
    servingSuggestion: opt(m.servingSuggestion),
  }));

  const components: ComponentDetail[] = componentRows.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    type: c.type,
    yieldText: opt(c.yieldText),
    intro: opt(c.intro),
    attribution: opt(c.attribution),
    storageNote: opt(c.storageNote),
    hotTip: opt(c.hotTip),
    notes: opt(c.notes),
    hasCard: c.hasCard,
    ingredients: (ingredientsByComponent.get(c.id) ?? []).map(toIngredient),
    steps: (stepsByComponent.get(c.id) ?? []).map(toStep),
  }));

  const tasksBySection = new Map<string, typeof taskRows>();
  for (const task of taskRows) {
    const list = tasksBySection.get(task.sectionId) ?? [];
    list.push(task);
    tasksBySection.set(task.sectionId, list);
  }
  const taskIds = taskRows.map((task) => task.id);
  const allocationRows =
    taskIds.length === 0
      ? []
      : await db
          .select({ row: t.prepAllocations })
          .from(t.prepAllocations)
          .innerJoin(t.prepTasks, eq(t.prepAllocations.taskId, t.prepTasks.id))
          .where(eq(t.prepTasks.planId, plan.id))
          .orderBy(asc(t.prepAllocations.position));
  const allocationsByTask = new Map<string, (typeof t.prepAllocations.$inferSelect)[]>();
  for (const { row } of allocationRows) {
    const list = allocationsByTask.get(row.taskId) ?? [];
    list.push(row);
    allocationsByTask.set(row.taskId, list);
  }

  const toDestination = (row: typeof t.prepAllocations.$inferSelect): AllocationDestination => {
    if (row.destinationKind === "component") {
      const slugForId = refSlug(row.componentId);
      if (slugForId !== undefined) return { kind: "component", componentSlug: slugForId };
      return { kind: "text", text: row.destinationText }; // component was deleted — degrade losslessly
    }
    if (row.destinationKind === "storage" && row.storageLabel !== null) {
      return { kind: "storage", storageLabel: row.storageLabel };
    }
    return { kind: "text", text: row.destinationText };
  };

  const prepSections: PrepSectionDetail[] = sectionRows.map((s) => ({
    id: s.id,
    kind: s.kind,
    title: s.title,
    timeEstimate: opt(s.timeEstimate),
    tasks: (tasksBySection.get(s.id) ?? []).map((task) => ({
      id: task.id,
      taskType: task.taskType,
      title: task.title,
      quantityText: opt(task.quantityText),
      componentSlug: refSlug(task.componentId),
      stepRangeText: opt(task.stepRangeText),
      body: opt(task.body),
      mealNumbers: parseJson<number[]>(task.mealNumbers, []),
      allocations: (allocationsByTask.get(task.id) ?? []).map(
        (a): Allocation & { id: string } => ({
          id: a.id,
          quantityText: a.quantityText,
          prepText: opt(a.prepText),
          destination: toDestination(a),
          sundayConsumed: a.sundayConsumed,
          mealNumbers: parseJson<number[]>(a.mealNumbers, []),
        }),
      ),
    })),
  }));

  return {
    id: plan.id,
    slug: plan.slug,
    weekOf: plan.weekOf,
    theme: plan.theme,
    servings: plan.servings,
    leftovers: plan.leftovers,
    difficulty: plan.difficulty as Difficulty,
    generatedAt: new Date(plan.generatedAt).toISOString(),
    menuNote: opt(plan.menuNote),
    metadata: parseJson<Record<string, unknown>>(plan.metadata, {}),
    meals,
    components,
    grocery: groceryRows.map((g) => ({
      id: g.id,
      category: g.category as GroceryCategory,
      isOptional: g.isOptional,
      name: g.name,
      quantityText: g.quantityText,
      grams: opt(g.grams),
      note: opt(g.note),
      mealNumbers: parseJson<number[]>(g.mealNumbers, []),
    })),
    essentials: essentialRows.map((e) => ({
      id: e.id,
      group: e.group as EssentialGroup,
      name: e.name,
      note: opt(e.note),
      mealNumbers: parseJson<number[]>(e.mealNumbers, []),
    })),
    timeSavers: timeSaverRows.map((s) => ({
      id: s.id,
      storeSection: s.storeSection,
      name: s.name,
      note: opt(s.note),
      replaces: parseJson<string[]>(s.replaces, []),
    })),
    prepSections,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}
