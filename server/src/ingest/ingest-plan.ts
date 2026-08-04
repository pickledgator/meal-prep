import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { planPayloadSchema } from "shared";
import type { Db } from "../db/client.js";
import * as t from "../db/schema.js";

export type IngestResult = {
  planId: string;
  slug: string;
  replaced: boolean;
  counts: {
    meals: number;
    components: number;
    ingredients: number;
    steps: number;
    groceryItems: number;
    essentials: number;
    timeSavers: number;
    prepSections: number;
    prepTasks: number;
    allocations: number;
  };
};

// The single write path for plans — used by the CLI (local writer → Turso),
// the POST /api/plans route, and the backfill importer. Upsert = delete the
// existing plan by slug (FK cascades wipe every child row) and reinsert.
export async function ingestPlan(db: Db, raw: unknown): Promise<IngestResult> {
  const payload = planPayloadSchema.parse(raw);
  const now = Date.now();

  return await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: t.plans.id, createdAt: t.plans.createdAt })
      .from(t.plans)
      .where(eq(t.plans.slug, payload.slug))
      .get();
    if (existing) {
      await tx.delete(t.plans).where(eq(t.plans.id, existing.id));
    }

    const planId = nanoid();
    await tx.insert(t.plans).values({
      id: planId,
      slug: payload.slug,
      weekOf: payload.weekOf,
      theme: payload.theme,
      servings: payload.servings,
      leftovers: payload.leftovers,
      difficulty: payload.difficulty,
      menuNote: payload.menuNote ?? null,
      generatedAt: Date.parse(payload.generatedAt),
      metadata: JSON.stringify(payload.metadata),
      createdAt: existing?.createdAt ?? now, // preserve first-ingest time across replacements
      updatedAt: now,
    });

    // 1) components first — they are the target of every soft reference
    const componentIdBySlug = new Map<string, string>();
    for (const c of payload.components) componentIdBySlug.set(c.slug, nanoid());
    const resolveComponent = (slug: string | undefined) =>
      slug === undefined ? null : (componentIdBySlug.get(slug) ?? null);

    if (payload.components.length > 0) {
      await tx.insert(t.components).values(
        payload.components.map((c, position) => ({
          id: componentIdBySlug.get(c.slug)!,
          planId,
          position,
          slug: c.slug,
          name: c.name,
          type: c.type,
          yieldText: c.yieldText ?? null,
          intro: c.intro ?? null,
          attribution: c.attribution ?? null,
          storageNote: c.storageNote ?? null,
          hotTip: c.hotTip ?? null,
          notes: c.notes ?? null,
          hasCard: c.steps.length > 0,
          createdAt: now,
        })),
      );
    }

    // 2) meals
    const mealIdByNumber = new Map<number, string>();
    for (const m of payload.meals) mealIdByNumber.set(m.mealNumber, nanoid());
    await tx.insert(t.meals).values(
      payload.meals.map((m) => ({
        id: mealIdByNumber.get(m.mealNumber)!,
        planId,
        mealNumber: m.mealNumber,
        name: m.name,
        subtitle: m.subtitle ?? null,
        protein: m.protein,
        proteinCategory: m.proteinCategory,
        cuisine: m.cuisine,
        keyIngredients: JSON.stringify(m.keyIngredients),
        prepTimeMinutes: m.prepTimeMinutes ?? null,
        cookTimeMinutes: m.cookTimeMinutes ?? null,
        menuBlurb: m.menuBlurb ?? null,
        yieldLine: m.yieldLine ?? null,
        attribution: m.attribution ?? null,
        preppedIngredients: JSON.stringify(m.preppedIngredients),
        hotTip: m.hotTip ?? null,
        servingSuggestion: m.servingSuggestion ?? null,
        createdAt: now,
      })),
    );

    const mealComponentRows = payload.meals.flatMap((m) =>
      m.componentSlugs.map((slug, i) => ({
        mealId: mealIdByNumber.get(m.mealNumber)!,
        componentId: componentIdBySlug.get(slug)!,
        position: i,
      })),
    );
    if (mealComponentRows.length > 0) await tx.insert(t.mealComponents).values(mealComponentRows);

    // 3) shared ingredient/step tables (exactly one owner FK set per row)
    type Owner = { mealId: string | null; componentId: string | null };
    const ingredientRows: (typeof t.recipeIngredients.$inferInsert)[] = [];
    const stepRows: (typeof t.recipeSteps.$inferInsert)[] = [];
    const pushLines = (
      owner: Owner,
      ingredients: (typeof payload.meals)[number]["ingredients"],
      steps: (typeof payload.meals)[number]["steps"],
    ) => {
      ingredients.forEach((line, i) =>
        ingredientRows.push({
          id: nanoid(),
          ...owner,
          position: i,
          section: line.section ?? null,
          text: line.text,
          fromPrep: line.fromPrep,
          refComponentId: resolveComponent(line.refComponentSlug),
        }),
      );
      steps.forEach((line, i) =>
        stepRows.push({
          id: nanoid(),
          ...owner,
          position: i,
          section: line.section ?? null,
          label: line.label ?? null,
          displayNumber: line.displayNumber ?? null,
          text: line.text,
          footnote: line.footnote ?? null,
        }),
      );
    };
    for (const m of payload.meals) {
      pushLines({ mealId: mealIdByNumber.get(m.mealNumber)!, componentId: null }, m.ingredients, m.steps);
    }
    for (const c of payload.components) {
      pushLines({ mealId: null, componentId: componentIdBySlug.get(c.slug)! }, c.ingredients, c.steps);
    }
    if (ingredientRows.length > 0) await tx.insert(t.recipeIngredients).values(ingredientRows);
    if (stepRows.length > 0) await tx.insert(t.recipeSteps).values(stepRows);

    // 4) flat lists — position within category/group follows payload order
    const positionWithin = new Map<string, number>();
    const nextPosition = (key: string) => {
      const n = positionWithin.get(key) ?? 0;
      positionWithin.set(key, n + 1);
      return n;
    };

    if (payload.grocery.length > 0) {
      await tx.insert(t.groceryItems).values(
        payload.grocery.map((g) => ({
          id: nanoid(),
          planId,
          category: g.category,
          isOptional: g.isOptional,
          position: nextPosition(`g:${g.category}:${g.isOptional}`),
          name: g.name,
          quantityText: g.quantityText,
          grams: g.grams ?? null,
          note: g.note ?? null,
          mealNumbers: JSON.stringify(g.mealNumbers),
        })),
      );
    }
    if (payload.essentials.length > 0) {
      await tx.insert(t.essentialItems).values(
        payload.essentials.map((e) => ({
          id: nanoid(),
          planId,
          group: e.group,
          position: nextPosition(`e:${e.group}`),
          name: e.name,
          note: e.note ?? null,
          mealNumbers: JSON.stringify(e.mealNumbers),
        })),
      );
    }
    if (payload.timeSavers.length > 0) {
      await tx.insert(t.timeSavers).values(
        payload.timeSavers.map((s, i) => ({
          id: nanoid(),
          planId,
          storeSection: s.storeSection,
          position: i,
          name: s.name,
          note: s.note ?? null,
          replaces: JSON.stringify(s.replaces),
        })),
      );
    }

    // 5) prep tree
    let taskCount = 0;
    let allocationCount = 0;
    for (const [sectionIndex, section] of payload.prepSections.entries()) {
      const sectionId = nanoid();
      await tx.insert(t.prepSections).values({
        id: sectionId,
        planId,
        position: sectionIndex,
        kind: section.kind,
        title: section.title,
        timeEstimate: section.timeEstimate ?? null,
      });
      if (section.tasks.length === 0) continue;
      const taskRows = section.tasks.map((task, i) => ({
        id: nanoid(),
        sectionId,
        planId,
        position: i,
        taskType: task.taskType,
        title: task.title,
        quantityText: task.quantityText ?? null,
        componentId: resolveComponent(task.componentSlug),
        stepRangeText: task.stepRangeText ?? null,
        body: task.body ?? null,
        mealNumbers: JSON.stringify(task.mealNumbers),
      }));
      await tx.insert(t.prepTasks).values(taskRows);
      taskCount += taskRows.length;

      const allocationRows = section.tasks.flatMap((task, taskIndex) =>
        task.allocations.map((a, i) => ({
          id: nanoid(),
          taskId: taskRows[taskIndex].id,
          position: i,
          quantityText: a.quantityText,
          prepText: a.prepText ?? null,
          destinationKind: a.destination.kind,
          componentId: a.destination.kind === "component" ? resolveComponent(a.destination.componentSlug) : null,
          storageLabel: a.destination.kind === "storage" ? a.destination.storageLabel : null,
          destinationText:
            a.destination.kind === "component"
              ? a.destination.componentSlug
              : a.destination.kind === "storage"
                ? a.destination.storageLabel
                : a.destination.text,
          sundayConsumed: a.sundayConsumed,
          mealNumbers: JSON.stringify(a.mealNumbers),
        })),
      );
      if (allocationRows.length > 0) await tx.insert(t.prepAllocations).values(allocationRows);
      allocationCount += allocationRows.length;
    }

    return {
      planId,
      slug: payload.slug,
      replaced: existing !== undefined,
      counts: {
        meals: payload.meals.length,
        components: payload.components.length,
        ingredients: ingredientRows.length,
        steps: stepRows.length,
        groceryItems: payload.grocery.length,
        essentials: payload.essentials.length,
        timeSavers: payload.timeSavers.length,
        prepSections: payload.prepSections.length,
        prepTasks: taskCount,
        allocations: allocationCount,
      },
    };
  });
}
