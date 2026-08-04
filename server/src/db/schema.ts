import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Conventions (matching trip-planning): nanoid text PKs, integer epoch-ms
// timestamps, YYYY-MM-DD wall-clock date strings, cascade FKs, and small
// display-only lists stored as zod-validated JSON in text columns.

export const plans = sqliteTable(
  "plans",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(), // "2026-08-03-summer-menu-classics" — natural upsert key
    weekOf: text("week_of").notNull(), // YYYY-MM-DD
    theme: text("theme").notNull(),
    servings: integer("servings").notNull(),
    leftovers: integer("leftovers", { mode: "boolean" }).notNull().default(false),
    difficulty: text("difficulty", { enum: ["easy", "normal", "challenging"] }).notNull(),
    menuNote: text("menu_note"), // menu.md header suffix, e.g. "adapted from the 7.24 menu"
    generatedAt: integer("generated_at").notNull(), // epoch ms
    // Rare extras that only some plans carry: must_use, occasion, dietary_notes,
    // event_date, ingredient_consolidation. JSON object, zod-loose.
    metadata: text("metadata").notNull().default("{}"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [index("plans_week_idx").on(t.weekOf)],
);

export const meals = sqliteTable(
  "meals",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    mealNumber: integer("meal_number").notNull(), // 1..5 (from "m1")
    name: text("name").notNull(), // history: recipe no-repeats
    subtitle: text("subtitle"), // "with Marinated Cucumbers"
    protein: text("protein").notNull(),
    proteinCategory: text("protein_category").notNull(), // open text — legacy data drifts
    cuisine: text("cuisine").notNull(),
    keyIngredients: text("key_ingredients").notNull().default("[]"), // JSON string[]
    prepTimeMinutes: integer("prep_time_minutes"),
    cookTimeMinutes: integer("cook_time_minutes"),
    menuBlurb: text("menu_blurb"), // menu.md comma line (history: flavor-concept skim)
    yieldLine: text("yield_line"), // "Makes 4 servings (2 for dinner + 2 leftover)"
    attribution: text("attribution"),
    preppedIngredients: text("prepped_ingredients").notNull().default("[]"), // JSON [{text, componentSlug?}]
    hotTip: text("hot_tip"), // markdown inline
    servingSuggestion: text("serving_suggestion"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [uniqueIndex("meals_plan_num_idx").on(t.planId, t.mealNumber)],
);

export const components = sqliteTable(
  "components",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(), // "garlic-ginger-soy-sauce" (per-plan unique)
    name: text("name").notNull(), // history: marquee-sauce no-repeats
    type: text("type").notNull(), // OPEN text (20+ values in the wild) — deliberately not an enum
    yieldText: text("yield_text"), // "~1 cup"
    intro: text("intro"), // prose line under the title
    attribution: text("attribution"),
    storageNote: text("storage_note"),
    hotTip: text("hot_tip"),
    notes: text("notes"), // plan.json components[].notes (cascade notes)
    hasCard: integer("has_card", { mode: "boolean" }).notNull().default(true), // false = inline-only (sriracha-mayo)
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("components_plan_slug_idx").on(t.planId, t.slug),
    index("components_type_idx").on(t.type), // marquee-sauce history query
  ],
);

export const mealComponents = sqliteTable(
  "meal_components",
  {
    mealId: text("meal_id")
      .notNull()
      .references(() => meals.id, { onDelete: "cascade" }),
    componentId: text("component_id")
      .notNull()
      .references(() => components.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.mealId, t.componentId] })],
);

// ONE ingredients table and ONE steps table shared by meals and components —
// exactly one owner FK is set, enforced by the zod contract at the only write
// path (ingestPlan). Avoids four near-identical tables while keeping real rows
// and the "from prep" component linkage.
export const recipeIngredients = sqliteTable(
  "recipe_ingredients",
  {
    id: text("id").primaryKey(),
    mealId: text("meal_id").references(() => meals.id, { onDelete: "cascade" }),
    componentId: text("component_id").references(() => components.id, { onDelete: "cascade" }),
    position: integer("position").notNull(), // order within owner
    section: text("section"), // "Spicy Salmon", "Accompaniments"
    text: text("text").notNull(), // full display line, inline md allowed
    fromPrep: integer("from_prep", { mode: "boolean" }).notNull().default(false),
    refComponentId: text("ref_component_id").references(() => components.id, { onDelete: "set null" }),
  },
  (t) => [index("ri_meal_idx").on(t.mealId, t.position), index("ri_comp_idx").on(t.componentId, t.position)],
);

export const recipeSteps = sqliteTable(
  "recipe_steps",
  {
    id: text("id").primaryKey(),
    mealId: text("meal_id").references(() => meals.id, { onDelete: "cascade" }),
    componentId: text("component_id").references(() => components.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    section: text("section"), // "Broil the Salmon", "Morning Of", "Plate & Serve"
    label: text("label"), // bold run-in subhead
    displayNumber: integer("display_number"), // printed step number (restarts across phases)
    text: text("text").notNull(), // markdown (bolded ingredients preserved)
    footnote: text("footnote"), // trailing "*If you heat the buttermilk..." note
  },
  (t) => [index("rs_meal_idx").on(t.mealId, t.position), index("rs_comp_idx").on(t.componentId, t.position)],
);

export const groceryItems = sqliteTable(
  "grocery_items",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    category: text("category", {
      enum: ["produce", "proteins", "dairy_eggs", "cheese", "bakery", "refrigerated", "frozen", "shelf_stable", "other"],
    }).notNull(),
    isOptional: integer("is_optional", { mode: "boolean" }).notNull().default(false),
    position: integer("position").notNull(), // order within category
    name: text("name").notNull(), // "Garlic"
    quantityText: text("quantity_text").notNull(), // "17 cloves / ~2 heads"
    grams: real("grams"), // best-effort parse of "/ NNN g"
    note: text("note"), // "Kewpie if you can find it"
    mealNumbers: text("meal_numbers").notNull().default("[]"), // JSON int[] — superscript refs
  },
  (t) => [index("grocery_plan_idx").on(t.planId, t.category, t.position)],
);

export const essentialItems = sqliteTable(
  "essential_items",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    group: text("item_group", { enum: ["fats", "spices_aromatics", "other", "tools"] }).notNull(),
    position: integer("position").notNull(),
    name: text("name").notNull(),
    note: text("note"),
    mealNumbers: text("meal_numbers").notNull().default("[]"), // JSON int[]
  },
  (t) => [index("essentials_plan_idx").on(t.planId, t.group, t.position)],
);

export const timeSavers = sqliteTable(
  "time_savers",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    storeSection: text("store_section").notNull(), // open text: "Refrigerated", "Frozen", "Deli/Prepared", ...
    position: integer("position").notNull(),
    name: text("name").notNull(),
    note: text("note"),
    replaces: text("replaces").notNull().default("[]"), // JSON string[] — strikethrough subtraction list
  },
  (t) => [index("timesavers_plan_idx").on(t.planId, t.position)],
);

export const prepSections = sqliteTable(
  "prep_sections",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    kind: text("kind", { enum: ["tasks", "break"] })
      .notNull()
      .default("tasks"), // break = "— CLEANING BREAK —" divider
    title: text("title").notNull(),
    timeEstimate: text("time_estimate"), // "25–30 minutes" (display text)
  },
  (t) => [index("prep_sections_plan_idx").on(t.planId, t.position)],
);

export const prepTasks = sqliteTable(
  "prep_tasks",
  {
    id: text("id").primaryKey(),
    sectionId: text("section_id")
      .notNull()
      .references(() => prepSections.id, { onDelete: "cascade" }),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }), // convenience for per-plan queries
    position: integer("position").notNull(),
    // task = named checkbox (component link / step range / inline body)
    // ingredient = bold parent with allocation children
    taskType: text("task_type", { enum: ["task", "ingredient"] }).notNull(),
    title: text("title").notNull(), // "Start Jasmine Rice" | "Garlic"
    quantityText: text("quantity_text"), // ingredient parents: "17 cloves / ~2 heads"
    componentId: text("component_id").references(() => components.id, { onDelete: "set null" }),
    stepRangeText: text("step_range_text"), // "steps 1–4" — lossless text, not parsed ints
    body: text("body"), // inline method markdown for unlinked tasks
    mealNumbers: text("meal_numbers").notNull().default("[]"), // JSON int[]
  },
  (t) => [index("prep_tasks_section_idx").on(t.sectionId, t.position)],
);

export const prepAllocations = sqliteTable(
  "prep_allocations",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => prepTasks.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    quantityText: text("quantity_text").notNull(), // "3", "1½ Tbsp", "all"
    prepText: text("prep_text"), // "finely grate", "peel; finely grate"
    destinationKind: text("destination_kind", { enum: ["component", "storage", "text"] }).notNull(),
    componentId: text("component_id").references(() => components.id, { onDelete: "set null" }), // kind=component
    storageLabel: text("storage_label"), // kind=storage: 'M1 — bowls'
    destinationText: text("destination_text").notNull(), // lossless raw destination for rendering/fallback
    sundayConsumed: integer("sunday_consumed", { mode: "boolean" }).notNull().default(false), // the 🫙 flag
    mealNumbers: text("meal_numbers").notNull().default("[]"), // JSON int[]
  },
  (t) => [index("prep_alloc_task_idx").on(t.taskId, t.position)],
);
