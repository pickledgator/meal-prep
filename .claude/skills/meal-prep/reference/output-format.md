# Plan Payload Specification

The plan is delivered as **one structured JSON document** — the `PlanPayload` — validated by `shared/src/meal-plan.ts` (`planPayloadSchema`) and ingested with `pnpm ingest <file> [--dry-run]`. There are no output files besides the payload itself (written to `payloads/<slug>.json`, gitignored). The web app renders every page — menu, grocery, prep, essentials, recipe and component cards — from this structure; KEY blocks, superscript glyphs, and section headings are derived by the renderer and are never authored.

**Inline markdown is allowed inside any `text`-like field**: `**bold**` (ingredients on first mention), `_italic_` (`_to taste_`, `_for garnish_`), `` `code` `` (and `` `components/<slug>.md` `` becomes an app link), `~~strikethrough~~`. Do not put headings, lists, or blockquotes inside text fields — structure comes from the schema.

---

## Old file → payload mapping

| Old markdown convention | Payload field |
|---|---|
| Folder name `plans/YYYY-MM-DD-theme/` | `slug` (same string, no path) |
| `plan.json` metadata | top-level fields (`weekOf`, `theme`, `servings`, `leftovers`, `difficulty`, `generatedAt`) |
| menu.md header suffix ("— adapted from …") | `menuNote` |
| menu.md dish blurb (lowercase comma line) | `meals[].menuBlurb` |
| `recipes/mN-*.md` file | `meals[]` entry (`mealNumber` from `mN`) |
| Recipe `_with X_` italic line | `meals[].subtitle` |
| `_Makes 4 servings (…)_` | `meals[].yieldLine` / `components[].yieldText` |
| `_Adapted from …_` | `attribution` |
| "Prepped Ingredients" blockquote | `meals[].preppedIngredients[] {text, componentSlug?}` |
| `## Ingredients` + `### Section` lines | `ingredients[] {section?, text, fromPrep, refComponentSlug?}` |
| `## Instructions` numbered steps + `### Phase` | `steps[] {section?, label?, displayNumber?, text, footnote?}` |
| `> **Hot Tip:** …` | `hotTip` (marker stripped) |
| `**Serving Suggestion:** …` | `servingSuggestion` |
| `components/*.md` file | `components[]` entry (`slug` from filename) |
| `**To Store:** …` | `components[].storageNote` |
| `**Used in:** Meals 1, 3` | derived from `meals[].componentSlugs` — never authored |
| grocery-list.md sections | `grocery[].category` (enum: produce, proteins, dairy_eggs, cheese, bakery, refrigerated, frozen, shelf_stable, other) |
| `- Name (qty)¹³` superscripts | `mealNumbers: [1, 3]` (plain integers, everywhere) |
| `## Optional` grocery section | `grocery[].isOptional: true` |
| gram weight inside quantity | keep in `quantityText`, also set numeric `grams` |
| essentials.md `### Fats` etc. | `essentials[].group` (fats, spices_aromatics, other, tools) |
| Time Saver `- ~~Struck Item~~` children | `timeSavers[].replaces: ["Struck Item"]` |
| prep-list.md `## Section (⏱ 25 min)` | `prepSections[] {title, timeEstimate?}` |
| `_— CLEANING BREAK —_` divider | a section with `kind: "break"` |
| `☐ **Task** — steps 1–4 in components/x.md¹` | task `{taskType:"task", title, componentSlug:"x", stepRangeText:"steps 1–4", mealNumbers:[1]}` |
| `☐ **Task**` + inline method paragraph | task `{taskType:"task", title, body}` (componentSlug XOR body — schema-enforced) |
| `- ☐ **Garlic — 17 cloves**` parent | task `{taskType:"ingredient", title:"Garlic", quantityText:"17 cloves / ~2 heads"}` |
| `  - 3 → finely grate → Sauce 🫙` child | allocation `{quantityText:"3", prepText:"finely grate", destination:{kind:"component", componentSlug}, sundayConsumed:true}` |
| `  - 2 → mince → "M3 — fried rice"³` child | allocation `{…, destination:{kind:"storage", storageLabel:"M3 — fried rice"}, mealNumbers:[3]}` |
| KEY blocks (grocery/essentials/prep) | derived by the renderer — never authored |

---

## Top level

```jsonc
{
  "slug": "2026-08-03-summer-menu-classics",   // ^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$, must start with weekOf
  "weekOf": "2026-08-03",                       // the Monday
  "theme": "Summer Menu Classics",
  "servings": 2,
  "leftovers": true,
  "difficulty": "normal",                       // easy | normal | challenging
  "generatedAt": "2026-08-01T15:17:22-07:00",   // ISO-8601 with offset
  "menuNote": "adapted from the 7.24 menu",     // optional
  "metadata": {},                                // rare extras only: must_use, occasion, dietary_notes…
  "meals": [ … ],
  "components": [ … ],
  "grocery": [ … ],
  "essentials": [ … ],
  "timeSavers": [ … ],
  "prepSections": [ … ]
}
```

Array order is authoritative everywhere — the renderer preserves it exactly, so compose lists in the order they should read (grocery items within a category, steps, allocations, sections).

## Meals

```jsonc
{
  "mealNumber": 1,                              // contiguous from 1
  "name": "Spicy Salmon Bowls",
  "subtitle": "with Marinated Cucumbers",
  "protein": "salmon",
  "proteinCategory": "seafood",                 // seafood | poultry | red meat | plant-based
  "cuisine": "japanese-american",
  "keyIngredients": ["salmon fillets", "jasmine rice", "persian cucumbers"],
  "prepTimeMinutes": 10,
  "cookTimeMinutes": 12,
  "menuBlurb": "broiler-caramelized salmon, white rice, garlic-ginger soy, …",
  "yieldLine": "Makes 4 servings (2 for dinner + 2 leftover)",
  "componentSlugs": ["garlic-ginger-soy-sauce", "steamed-jasmine-rice"],
  "preppedIngredients": [
    { "text": "\"M1 — salmon glaze\" (½ cup)", "componentSlug": "garlic-ginger-soy-sauce" }
  ],
  "ingredients": [
    { "section": "Spicy Salmon", "text": "1½ lb (680 g) **Salmon Fillets**, skin removed" },
    { "section": "Accompaniments", "text": "3½ cups Steamed Jasmine Rice (from prep)", "fromPrep": true, "refComponentSlug": "steamed-jasmine-rice" }
  ],
  "steps": [
    { "section": "Broil the Salmon", "displayNumber": 1, "text": "Set an oven rack about 6 inches below the broiler…" },
    { "section": "Plate & Serve", "displayNumber": 5, "text": "Spoon a bed of rice into each bowl…" }
  ],
  "hotTip": "For leftovers, pack the cucumbers in their own small container…",
  "servingSuggestion": "A crisp lager or an off-dry Riesling stands up nicely to the heat."
}
```

- `steps[].section` carries the phase headings ("Morning Of", "Day Of", "Plate & Serve", "While the Salmon Broils"). `displayNumber` keeps the printed numbering continuous across phases.
- `steps[].label` is the bold run-in subhead ("**Press:**" style); `footnote` holds a trailing `*note` paragraph.
- Every meal needs ≥1 ingredient and ≥1 step; the recipe completeness rules from the skill (every ingredient touched by a step, reheat steps written out) apply to this content unchanged.

## Components

```jsonc
{
  "slug": "garlic-ginger-soy-sauce",            // unique per plan; the linkable identity
  "name": "Garlic-Ginger Soy Sauce",
  "type": "sauce",                               // open text: sauce, dressing, marinade, glaze, pickle, grain, …
  "yieldText": "~1 cup",
  "intro": "The week's workhorse: salmon glaze and tofu marinade.",   // optional prose line
  "storageNote": "Refrigerate up to 1 week. Stir before using.",
  "ingredients": [ /* same shape as meal ingredients */ ],
  "steps": [ /* same shape as meal steps */ ]
}
```

- A component with **empty `steps`** is an inline-only component (made directly on the prep list, like a 3-ingredient mayo) — give the full method in the prep task's `body` instead.
- Every component must be referenced by at least one meal (`componentSlugs`), prep task, or allocation — the schema rejects orphans.

## Grocery

```jsonc
{ "category": "produce", "name": "Garlic", "quantityText": "17 cloves / ~2 heads", "mealNumbers": [1,2,3,4,5] }
{ "category": "proteins", "name": "Salmon Fillets", "quantityText": "1½ lb / 680 g", "grams": 680, "note": "skin removed — ask the fish counter", "mealNumbers": [1] }
{ "category": "other", "isOptional": true, "name": "Fresh Basil", "quantityText": "small bunch", "note": "torn over the finished pasta", "mealNumbers": [5] }
```

All the grocery rules stand: quantities cover prep + day-of use, nearest store size, **always include gram weights** in `quantityText` (and set `grams` when a single number applies), `isOptional` used sparingly.

## Essentials & Time Savers

```jsonc
{ "group": "fats", "name": "Olive Oil", "mealNumbers": [4,5] }
{ "group": "tools", "name": "8 (10–12 inch) Metal or Bamboo Skewers", "note": "soak bamboo 20 minutes before broiling", "mealNumbers": [4] }
```

```jsonc
{
  "storeSection": "Frozen",
  "name": "Cooked Jasmine Rice (4 pouches, ~10 oz each)",
  "replaces": ["Jasmine Rice (2½ cups dry)"]
}
```

## Prep sections

```jsonc
{
  "kind": "tasks",
  "title": "Prep Aromatics & Produce",
  "timeEstimate": "25–30 minutes",
  "tasks": [
    {
      "taskType": "task",
      "title": "Start Jasmine Rice",
      "componentSlug": "steamed-jasmine-rice",
      "stepRangeText": "steps 1–4",
      "mealNumbers": [1, 3]
    },
    {
      "taskType": "task",
      "title": "Sriracha Mayo",
      "body": "Stir together ⅓ cup (75 g) mayonnaise, 4 tsp sriracha, the prepped juice of ½ lime, and a pinch of kosher salt. Yield: about ⅓ cup → \"M1 — sriracha mayo.\" Keeps 1 week refrigerated.",
      "mealNumbers": [1]
    },
    {
      "taskType": "ingredient",
      "title": "Garlic",
      "quantityText": "17 cloves / ~2 heads",
      "allocations": [
        { "quantityText": "3", "prepText": "finely grate", "destination": { "kind": "component", "componentSlug": "garlic-ginger-soy-sauce" }, "sundayConsumed": true },
        { "quantityText": "4", "prepText": "mince", "destination": { "kind": "storage", "storageLabel": "M3 — fried rice" }, "mealNumbers": [3] }
      ]
    }
  ]
}
```

```jsonc
{ "kind": "break", "title": "— CLEANING BREAK — wipe down boards and knives before sauce work —" }
```

- `componentSlug` and `body` are mutually exclusive on a task (one source of truth for instructions — schema-enforced). A linked task carries only title + step range; an unlinked cooking task carries the complete method in `body`.
- `sundayConsumed: true` is the old 🫙 flag: the allocation is spent by a Sunday component. Storage-labeled allocations (`"M1 — bowls"`) are weeknight hand-offs.
- The dependency ordering rules are unchanged and are yours to enforce: a task must never consume an ingredient or component that appears later in the section order.

---

## Validation & ingest

```bash
pnpm ingest payloads/<slug>.json --dry-run    # zod parse + cross-checks + counts; writes nothing
pnpm ingest payloads/<slug>.json              # transactional ingest (same slug = replace)
pnpm history --json                            # past themes/recipes/sauces for the no-repeats check
```

The dry run mechanically enforces: contiguous meal numbers; every `mealNumbers` entry exists; every `componentSlug`/`refComponentSlug`/allocation reference resolves; no orphan components; task `componentSlug` XOR `body`; `slug` starts with `weekOf`; parseable `generatedAt`. Anything it flags is an authoring bug — fix the payload, not the schema.

## Worked example

A complete real payload to imitate: run `pnpm backfill --plan 2026-08-03-summer-menu-classics --dry-run --out payloads/` once and read `payloads/2026-08-03-summer-menu-classics.json` — it is the canonical week (5 meals, 6 components, a full prep tree) expressed in this format.
