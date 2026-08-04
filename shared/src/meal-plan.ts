import { z } from "zod";

// ---------- field primitives ----------

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const trimmed = z.string().trim();
const nonEmpty = trimmed.min(1);
const mealNumber = z.number().int().min(1).max(9);

// ---------- enums ----------

export const difficultySchema = z.enum(["easy", "normal", "challenging"]);
export type Difficulty = z.infer<typeof difficultySchema>;

// Normalized grocery categories; render order is a fixed app-side list.
export const groceryCategorySchema = z.enum([
  "produce",
  "proteins",
  "dairy_eggs",
  "cheese",
  "bakery",
  "refrigerated",
  "frozen",
  "shelf_stable",
  "other",
]);
export type GroceryCategory = z.infer<typeof groceryCategorySchema>;

export const essentialGroupSchema = z.enum(["fats", "spices_aromatics", "other", "tools"]);
export type EssentialGroup = z.infer<typeof essentialGroupSchema>;

// ---------- recipe lines (shared by meals and components) ----------

export const ingredientLineSchema = z
  .object({
    section: nonEmpty.optional(), // "Spicy Salmon", "Accompaniments"
    text: nonEmpty, // full display line; inline markdown allowed
    fromPrep: z.boolean().default(false),
    refComponentSlug: nonEmpty.optional(), // "(from prep)" lines pointing at a component
  })
  .strict();
export type IngredientLine = z.infer<typeof ingredientLineSchema>;

export const stepLineSchema = z
  .object({
    section: nonEmpty.optional(), // "Broil the Salmon", "Morning Of", "Plate & Serve"
    label: nonEmpty.optional(), // bold run-in subhead
    displayNumber: z.number().int().positive().optional(),
    text: nonEmpty, // markdown (bolded ingredients preserved)
    footnote: nonEmpty.optional(), // trailing "*If you heat the buttermilk..." note
  })
  .strict();
export type StepLine = z.infer<typeof stepLineSchema>;

// ---------- prep list ----------

export const allocationDestinationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("component"), componentSlug: nonEmpty }).strict(),
  z.object({ kind: z.literal("storage"), storageLabel: nonEmpty }).strict(), // 'M1 — bowls'
  z.object({ kind: z.literal("text"), text: nonEmpty }).strict(), // legacy/free-form fallback
]);
export type AllocationDestination = z.infer<typeof allocationDestinationSchema>;

export const allocationSchema = z
  .object({
    quantityText: nonEmpty, // "3", "1½ Tbsp", "all"
    prepText: nonEmpty.optional(), // "finely grate", "peel; finely grate"
    destination: allocationDestinationSchema,
    sundayConsumed: z.boolean().default(false), // the 🫙 flag
    mealNumbers: z.array(mealNumber).default([]),
  })
  .strict();
export type Allocation = z.infer<typeof allocationSchema>;

export const prepTaskSchema = z
  .object({
    taskType: z.enum(["task", "ingredient"]),
    title: nonEmpty, // "Start Jasmine Rice" | "Garlic"
    quantityText: nonEmpty.optional(), // ingredient parents: "17 cloves / ~2 heads"
    componentSlug: nonEmpty.optional(), // linked tasks
    stepRangeText: nonEmpty.optional(), // "steps 1–4", "step 1 (press)"
    body: nonEmpty.optional(), // inline method markdown for unlinked cooking tasks
    mealNumbers: z.array(mealNumber).default([]),
    allocations: z.array(allocationSchema).default([]), // only for taskType=ingredient
  })
  .strict();
export type PrepTask = z.infer<typeof prepTaskSchema>;

export const prepSectionSchema = z
  .object({
    kind: z.enum(["tasks", "break"]).default("tasks"), // break = "— CLEANING BREAK —" divider
    title: nonEmpty,
    timeEstimate: nonEmpty.optional(), // "25–30 minutes" (display text)
    tasks: z.array(prepTaskSchema).default([]),
  })
  .strict();
export type PrepSection = z.infer<typeof prepSectionSchema>;

// ---------- meals & components ----------

export const mealPayloadSchema = z
  .object({
    mealNumber,
    name: nonEmpty,
    subtitle: nonEmpty.optional(), // "with Marinated Cucumbers"
    protein: nonEmpty,
    proteinCategory: nonEmpty, // open text: seafood | poultry | red meat | plant-based (legacy: vegetarian)
    cuisine: nonEmpty,
    keyIngredients: z.array(nonEmpty).default([]),
    prepTimeMinutes: z.number().int().nonnegative().optional(),
    cookTimeMinutes: z.number().int().nonnegative().optional(),
    menuBlurb: nonEmpty.optional(), // menu.md comma line
    yieldLine: nonEmpty.optional(), // "Makes 4 servings (2 for dinner + 2 leftover)"
    attribution: nonEmpty.optional(),
    componentSlugs: z.array(nonEmpty).default([]),
    preppedIngredients: z
      .array(z.object({ text: nonEmpty, componentSlug: nonEmpty.optional() }).strict())
      .default([]), // the "From your Sunday prep" blockquote
    ingredients: z.array(ingredientLineSchema).min(1),
    steps: z.array(stepLineSchema).min(1),
    hotTip: nonEmpty.optional(),
    servingSuggestion: nonEmpty.optional(),
  })
  .strict();
export type MealPayload = z.infer<typeof mealPayloadSchema>;

export const componentPayloadSchema = z
  .object({
    slug: nonEmpty, // "garlic-ginger-soy-sauce" (per-plan unique)
    name: nonEmpty,
    type: nonEmpty, // open text: sauce, dressing, marinade, glaze, pickle, grain, ... (20+ in the wild)
    yieldText: nonEmpty.optional(), // "~1 cup"
    intro: nonEmpty.optional(), // prose line under the title
    attribution: nonEmpty.optional(),
    storageNote: nonEmpty.optional(), // "To Store: ..."
    hotTip: nonEmpty.optional(),
    notes: nonEmpty.optional(), // cascade notes from plan.json
    ingredients: z.array(ingredientLineSchema).default([]), // empty ⇒ inline-only component (no card)
    steps: z.array(stepLineSchema).default([]),
  })
  .strict();
export type ComponentPayload = z.infer<typeof componentPayloadSchema>;

// ---------- grocery / essentials / time savers ----------

export const groceryItemPayloadSchema = z
  .object({
    category: groceryCategorySchema,
    isOptional: z.boolean().default(false), // the "## Optional" section
    name: nonEmpty, // "Garlic"
    quantityText: nonEmpty, // "17 cloves / ~2 heads"
    grams: z.number().positive().optional(), // best-effort parse of "/ NNN g"
    note: nonEmpty.optional(), // "Kewpie if you can find it"
    mealNumbers: z.array(mealNumber).default([]), // superscript refs
  })
  .strict();
export type GroceryItemPayload = z.infer<typeof groceryItemPayloadSchema>;

export const essentialItemPayloadSchema = z
  .object({
    group: essentialGroupSchema,
    name: nonEmpty, // may carry qty parenthetical: "Low-Sodium Soy Sauce (~¾ cup total)"
    note: nonEmpty.optional(), // "(soak bamboo 20 minutes before broiling)"
    mealNumbers: z.array(mealNumber).default([]),
  })
  .strict();
export type EssentialItemPayload = z.infer<typeof essentialItemPayloadSchema>;

export const timeSaverPayloadSchema = z
  .object({
    storeSection: nonEmpty, // "Refrigerated", "Frozen", "Bakery", "Deli/Prepared", ...
    name: nonEmpty, // "Store-Bought Peanut Sauce (~1 cup)"
    note: nonEmpty.optional(),
    replaces: z.array(nonEmpty).default([]), // the strikethrough subtraction list
  })
  .strict();
export type TimeSaverPayload = z.infer<typeof timeSaverPayloadSchema>;

// ---------- the atomic plan payload ----------

function crossChecks(plan: PlanPayloadInput, ctx: z.RefinementCtx) {
  const issue = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message });

  // meal numbers unique and contiguous from 1
  const numbers = plan.meals.map((m) => m.mealNumber).sort((a, b) => a - b);
  const contiguous = numbers.every((n, i) => n === i + 1);
  if (!contiguous) issue(`meal numbers must be contiguous from 1; got [${numbers.join(", ")}]`);
  const mealSet = new Set(numbers);

  // component slugs unique
  const slugs = plan.components.map((c) => c.slug);
  const slugSet = new Set(slugs);
  if (slugSet.size !== slugs.length) issue("component slugs must be unique");

  const checkSlug = (slug: string | undefined, where: string) => {
    if (slug !== undefined && !slugSet.has(slug)) issue(`${where} references unknown component "${slug}"`);
  };
  const checkMeals = (nums: number[] | undefined, where: string) => {
    for (const n of nums ?? []) {
      if (!mealSet.has(n)) issue(`${where} references meal ${n}, which is not in this plan`);
    }
  };

  const referenced = new Set<string>();
  const ref = (slug: string | undefined) => {
    if (slug !== undefined) referenced.add(slug);
  };

  for (const meal of plan.meals) {
    for (const s of meal.componentSlugs) {
      checkSlug(s, `meal ${meal.mealNumber} componentSlugs`);
      ref(s);
    }
    for (const p of meal.preppedIngredients) {
      checkSlug(p.componentSlug, `meal ${meal.mealNumber} preppedIngredients`);
      ref(p.componentSlug);
    }
    for (const line of meal.ingredients) {
      checkSlug(line.refComponentSlug, `meal ${meal.mealNumber} ingredients`);
      ref(line.refComponentSlug);
    }
  }
  for (const component of plan.components) {
    for (const line of component.ingredients) {
      checkSlug(line.refComponentSlug, `component "${component.slug}" ingredients`);
      ref(line.refComponentSlug);
    }
  }
  for (const item of plan.grocery) checkMeals(item.mealNumbers, `grocery "${item.name}"`);
  for (const item of plan.essentials) checkMeals(item.mealNumbers, `essential "${item.name}"`);

  for (const section of plan.prepSections) {
    for (const task of section.tasks) {
      if (task.componentSlug !== undefined && task.body !== undefined) {
        issue(`prep task "${task.title}": componentSlug and body are mutually exclusive (one source of truth)`);
      }
      checkSlug(task.componentSlug, `prep task "${task.title}"`);
      ref(task.componentSlug);
      checkMeals(task.mealNumbers, `prep task "${task.title}"`);
      for (const alloc of task.allocations) {
        if (alloc.destination.kind === "component") {
          checkSlug(alloc.destination.componentSlug, `allocation under "${task.title}"`);
          ref(alloc.destination.componentSlug);
        }
        checkMeals(alloc.mealNumbers, `allocation under "${task.title}"`);
      }
    }
  }

  for (const slug of slugSet) {
    if (!referenced.has(slug)) issue(`component "${slug}" is never referenced by a meal, prep task, or allocation`);
  }

  if (!plan.slug.startsWith(plan.weekOf)) issue(`slug "${plan.slug}" must start with weekOf "${plan.weekOf}"`);
  if (Number.isNaN(Date.parse(plan.generatedAt))) issue(`generatedAt "${plan.generatedAt}" is not a parseable timestamp`);
}

const planPayloadBase = z
  .object({
    slug: z.string().regex(/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/, "expected YYYY-MM-DD-theme-slug"),
    weekOf: dateStr,
    theme: nonEmpty,
    servings: z.number().int().positive(),
    leftovers: z.boolean(),
    difficulty: difficultySchema,
    generatedAt: nonEmpty, // ISO-8601 with offset; server converts to epoch ms
    menuNote: nonEmpty.optional(), // menu.md header suffix
    metadata: z.record(z.unknown()).default({}), // rare extras: must_use, occasion, dietary_notes, ...
    meals: z.array(mealPayloadSchema).min(1),
    components: z.array(componentPayloadSchema).default([]),
    grocery: z.array(groceryItemPayloadSchema).min(1),
    essentials: z.array(essentialItemPayloadSchema).default([]),
    timeSavers: z.array(timeSaverPayloadSchema).default([]),
    prepSections: z.array(prepSectionSchema).default([]),
  })
  .strict();

type PlanPayloadInput = z.infer<typeof planPayloadBase>;

// Array order is authoritative — the server assigns row positions from array index.
export const planPayloadSchema = planPayloadBase.superRefine(crossChecks);
export type PlanPayload = z.infer<typeof planPayloadSchema>;

// ---------- API read shapes ----------
// The read API returns the payload structure with server-minted ids attached
// (stable ids let the prep page key check-off state). These are types only —
// the write boundary (planPayloadSchema) is the single runtime contract.

type WithId<T> = T & { id: string };

export type MealDetail = Omit<MealPayload, "ingredients" | "steps"> &
  WithId<{
    ingredients: WithId<IngredientLine>[];
    steps: WithId<StepLine>[];
  }>;

export type ComponentDetail = Omit<ComponentPayload, "ingredients" | "steps"> &
  WithId<{
    ingredients: WithId<IngredientLine>[];
    steps: WithId<StepLine>[];
    hasCard: boolean;
  }>;

export type PrepTaskDetail = Omit<PrepTask, "allocations"> &
  WithId<{
    allocations: WithId<Allocation>[];
  }>;

export type PrepSectionDetail = Omit<PrepSection, "tasks"> &
  WithId<{
    tasks: PrepTaskDetail[];
  }>;

export type PlanDetail = Omit<PlanPayload, "meals" | "components" | "grocery" | "essentials" | "timeSavers" | "prepSections"> &
  WithId<{
    meals: MealDetail[];
    components: ComponentDetail[];
    grocery: WithId<GroceryItemPayload>[];
    essentials: WithId<EssentialItemPayload>[];
    timeSavers: WithId<TimeSaverPayload>[];
    prepSections: PrepSectionDetail[];
    createdAt: number;
    updatedAt: number;
  }>;

export type PlanSummary = {
  slug: string;
  weekOf: string;
  theme: string;
  servings: number;
  leftovers: boolean;
  difficulty: Difficulty;
  generatedAt: number; // epoch ms
  meals: {
    mealNumber: number;
    name: string;
    subtitle?: string;
    protein: string;
    proteinCategory: string;
    cuisine: string;
  }[];
};

// Fixed render order for grocery categories (display labels live in the web app).
export const GROCERY_CATEGORY_ORDER: GroceryCategory[] = [
  "produce",
  "proteins",
  "dairy_eggs",
  "cheese",
  "frozen",
  "refrigerated",
  "shelf_stable",
  "bakery",
  "other",
];

export const ESSENTIAL_GROUP_ORDER: EssentialGroup[] = ["fats", "spices_aromatics", "other", "tools"];
