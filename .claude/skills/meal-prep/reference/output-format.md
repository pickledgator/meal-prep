# Output Format Specification

This document defines the exact format for all generated meal plan files, based on the reference examples.

---

## Folder Naming Convention

Folders are named with the week's Monday date plus the theme in kebab-case:

```
plans/YYYY-MM-DD-theme-name/
```

**Examples:**
- `plans/2026-01-27-winter-brightness/`
- `plans/2026-01-27-mediterranean/`
- `plans/2026-02-03-asian-comfort/`

This allows multiple plans for the same week with different themes.

---

## 1. plan.json — Structured Data

Machine-readable JSON for future frontend development.

```json
{
  "week_of": "YYYY-MM-DD",
  "folder_name": "YYYY-MM-DD-theme-name",
  "generated_at": "ISO-8601 timestamp",
  "servings": 2,
  "leftovers": false,
  "theme": "Winter Brightness",
  "difficulty": "normal",
  "meals": [
    {
      "id": "m1",
      "name": "White Fish Souvlaki",
      "subtitle": "with Tzatziki",
      "protein": "white fish",
      "protein_category": "seafood",
      "cuisine": "mediterranean",
      "components": ["tzatziki", "lemon-dill-pilaf"],
      "key_ingredients": ["white fish fillets", "garlic", "lemon", "dill"],
      "prep_time_minutes": 25,
      "cook_time_minutes": 15
    }
  ],
  "components": [
    {
      "id": "tzatziki",
      "name": "Scratch That Tzatziki",
      "type": "sauce",
      "yield": "2 cups",
      "used_in": ["m1", "m3", "m5"]
    }
  ],
  "grocery": {
    "produce": [
      {
        "item": "Garlic",
        "quantity": "12 cloves",
        "meals": ["m1", "m2", "m3", "m4", "m5"]
      }
    ],
    "proteins": [],
    "dairy_eggs": [],
    "shelf_stable": []
  }
}
```

---

## 2. menu.md — This Week's Menu

A quick-reference menu overview.

```markdown
# This Week's Menu

_Week of January 27, 2026_

---

**White Fish Souvlaki**
_with Tzatziki_
white fish fillets, dried herbs, garlic, olive oil, lemon, tzatziki, finely chopped fresh herbs

---

**Spring Vegetable Shakshuka**
_with Warm Flatbread_
tomato-red pepper simmer sauce, feta, eggs, arugula, tahini lemon dressing, sugar snap peas, fresh herbs, warm flatbread, extra-virgin olive oil

---

**Peperonata Pizza**
_with Feta & Egg_
jammy peperonata medley (shallots, tomato, and bell pepper), extra-virgin olive oil, feta, freshly ground black pepper, eggs, finely chopped herbs

---

[Continue for all meals...]
```

**Rules:**

- Bold dish name on its own line
- Italic subtitle on next line (starting with "with")
- Ingredients listed in lowercase, comma-separated, can include brief descriptors in parentheses
- Horizontal rule between meals
- Include week date in header

---

## 3. grocery-list.md — Shopping List

Categorized ingredients with superscript meal references.

```markdown
# Grocery List

_Week of January 27, 2026_

## Produce

- Shallot (3 medium)²³⁴
- Garlic (10 cloves)¹²³⁴⁵
- Lemon (4)¹²³⁴⁵
- Roma Tomatoes (2)²³⁴
- Sugar Snap Peas (8 oz / 227 g)²⁵
- Persian Cucumber (1)¹³⁴⁵
- Bell Peppers (3 [Red, Yellow, or Orange])²³⁴
- Radish (1 bunch)¹²⁵
- Arugula (5 oz / 142 g)¹²⁵
- Dill (1 large bunch)¹²³⁴⁵
- Chives (1 bunch)²³⁴
- Baby Bella and/or Shiitake Mushrooms (8 oz / 227 g)²
- Lacinato Kale (1 bunch / ~8 oz)⁴⁵
- Mint (~11-12 leaves)*

## Suggested Proteins

- Boneless-Skinless Chicken Breast (8-9 oz / 227-255 g)¹
- 2 (4 oz / 113 g) White Fish Fillets (Tilapia, Cod, or Halibut)²
- Italian Sausage (½ lb / 227 g)⁵
- Jumbo Shrimp (12-14) peeled & deveined⁴

## Dairy & Eggs

- Eggs (7-9)²³
- Greek Yogurt (2⅔ cup / 600 g)¹³⁴⁵
- Heavy Cream (1 cup / 240 ml)¹³

## Cheese

- Feta (8 oz / 227 g)²³⁴⁵
- Parmesan (1½ cups grated)²⁴⁵

## Shelf-Stable

- Orzo (¼ cup / 50 g)¹⁴
- Long Grain Rice (¾ cup / 150 g)¹⁴
- Tagliatelle Pasta (6-8 oz / 170-227 g)²
- Crushed Tomatoes (28 oz can)²⁴
- Chicken Stock (3¼ cup)¹²³⁴⁵
- Panko Breadcrumbs (1 cup / 50 g)²⁵

## Refrigerated

- Potato Gnocchi (1 lb / 454 g)⁵

---

**KEY**
¹ = White Fish Souvlaki
² = Spring Veggie Shakshuka
³ = Peperonata Pizza
⁴ = Tomato & Pepper Chicken
⁵ = Chicken Skewers

*= rollover ingredient from last week
GREEN = rollover ingredient
```

**Rules:**

- Use Unicode superscript numbers directly attached (no spaces/commas): `¹²³⁴⁵`
- Group by: Produce, Suggested Proteins, Dairy & Eggs, Cheese, Shelf-Stable, Refrigerated, Bakery/Deli
- **Always include gram weights** alongside volume/count: `Sugar Snap Peas (8 oz / 227 g)²⁵`
- For produce with variable weight, include approximate: `Lacinato Kale (1 bunch / ~8 oz)⁴⁵`
- Protein descriptions can lead with quantity: `Boneless-Skinless Chicken Breast (8-9 oz / 227-255 g)¹`
- Use asterisks for special notes: `*if you have access to them, source Meyer Lemons`
- Include KEY at bottom with meal/component name for each number
- Mark rollover ingredients from previous weeks with asterisk or GREEN notation
- Combine quantities if same ingredient used in multiple meals

**Optional Section:**
When recipes include genuinely optional ingredients, group them separately:
```markdown
## Optional

- Spinach (5 oz bag)³
- White Wine (2 Tbsp)⁵
```
Use sparingly—only for ingredients that are truly nice-to-have (garnishes, wine for deglazing when stock works). Most ingredients should be in the main sections.

---

## 4. essentials.md — Essentials & Time Savers

Pantry staples assumed on-hand, plus optional shortcuts.

```markdown
# Essentials & Time Savers

## Essentials

_Assume you have these on hand_

### Fats

- Olive Oil¹²³⁴⁵
- Salted Butter¹⁴

### Spices & Aromatics

- Kosher Salt¹²³⁴⁵
- Black Pepper¹²³⁴⁵
- Dried Oregano¹⁵
- Dried Thyme¹
- Dried Rosemary¹
- Paprika²⁴⁵
- Cumin²⁴⁵
- Cinnamon⁵
- Chicken Bouillon¹⁴
- Red Pepper Flakes²⁴

### Other

- Flaky Salt (optional)³
- All-Purpose Flour²³⁵
- Cornmeal³
- White Cane Sugar²³⁴⁵
- Active Dry Yeast²³⁵
- Honey¹²⁵
- Tahini¹²⁵

---

## Tools

- 2 (8-inch) Wooden or Metal Skewers⁵

---

## Time Savers

_Optional shortcuts — no judgment_

### Refrigerated

- Pre-Peeled Garlic
  - ~~1 bulb of Garlic~~
- Tzatziki (store-bought)
  - ~~Persian Cucumber~~
  - ~~2 cups Full-Fat Greek Yogurt~~
  - ~~4 Garlic cloves~~
  - ~~1 Lemon~~

### Frozen

- Cooked Rice
  - ~~Long-Grain White Rice (¾ cup)~~
- Pizza Dough (must also get Flatbread)
  - ~~Active Dry Yeast~~
  - ~~All-Purpose Flour~~
  - ~~Cornmeal~~

### Bakery

- Flatbread (must also get Pizza Dough)
  - ~~Active Dry Yeast~~
  - ~~All-Purpose Flour~~

---

**KEY**
¹ = White Fish Souvlaki
² = Spring Veggie Shakshuka
³ = Peperonata Pizza
⁴ = Tomato & Pepper Chicken
⁵ = Chicken Skewers

~~Strikethrough~~ = Subtract from grocery list if using Time Saver
```

**Rules:**

- Essentials = things most home cooks already have
- Group Essentials by: Fats, Spices & Aromatics, Other
- Include **Tools** section for special equipment needed (skewers, etc.)
- Time Savers = legitimate shortcuts, organized by store section (Refrigerated, Frozen, Bakery)
- Under each Time Saver, list items to subtract from grocery list (use strikethrough)
- Include meal superscripts for essentials that are key to specific meals
- Include KEY at bottom

---

## 5. prep-list.md — Sunday Prep List

Checkbox format with precise instructions and yields. **Order tasks for maximum efficiency—long-running passive tasks first.**

```markdown
# Sunday Prep List

_Difficulty: Normal_

---

☐ **Preheat Oven to 350°F** 🫙

☐ **Start Rosemary Bread** — see `components/rosemary-bread.md`⁴
Mix dough and set aside to rise (~1-1.5 hours)

☐ **Start Roasted Garlic Butter** (steps 1-2) — see `components/roasted-garlic-butter.md`³
Prep garlic bulb, wrap in foil, place in oven to roast (~1 hour)

☐ **Cook Farro** (½ cup; according to package instructions)³

---

## Prep Produce (⏱ 30 minutes)

- ☐ Butternut Squash (1; peel & dice)³⁴
- ☐ Russet Potatoes (1; julienne² | 1; dice into cubes¹)🫙
- ☐ Garlic (5 cloves; peel)⁵🫙
- ☐ Leeks (1½; trim, halve lengthwise, wash, & slice into 2" pieces¹² | ½; halve & thinly slice⁵)
- ☐ Lemon (1; thinly slice¹² | 1; cut in half lengthwise & thinly slice⁵)

---

## Cooked Prep Tasks

☐ **Boil diced Potatoes** (steps 1-2 in `components/mashed-potatoes.md`)¹
Cook until fork-tender, strain, cool, and store

☐ **Fry Shoestring Potatoes** — see `components/shoestring-potatoes.md`²
Fry julienned potatoes until golden and crispy, store in freezer

☐ **Shape Rosemary Bread** (steps 4-5 in `components/rosemary-bread.md`)⁴

☐ **Finish Roasted Garlic Butter** (step 3)³
Once garlic is cool, squeeze into softened butter

---

_— CLEANING BREAK —_

---

## Prepare Components

☐ **Creamy Lemon Parmesan Dressing** — see `components/lemon-parmesan-dressing.md`²

☐ **Mashed Potatoes** — see `components/mashed-potatoes.md`¹

---

## Optional Additional Prep

☐ **Prepare Roast Chicken** — see `components/roast-chicken.md`¹²
Can be made Sunday or day-of for Meal 1

---

**KEY**
¹ = Mashed Potatoes (served with Roast Chicken)
² = Caesar Frites
³ = Garlic Butter Squash Skillet
⁴ = Rosemary Turkey Melts
⁵ = Leek & Lemon Pasta

🫙 = used in a prepped component (keep out during prep)
⏱ = estimated time
```

**Rules:**

**Task Ordering (Critical for Efficiency):**
1. **Preheat oven** if needed for roasting
2. **Long-running passive tasks first** — bread dough rising, garlic roasting, grains cooking
3. **Prep produce** — knife work while passive tasks run
4. **Cooked prep tasks** — sautéing, blanching, frying
5. **Prepare components** — sauces, dressings (often use prepped items)

**Formatting:**
- Checkbox format (☐) for each major task
- Use bullet checkboxes (- ☐) for sub-items within a section
- Bold ingredient/component name
- Quantity and prep instructions in parentheses: `(8 oz / 227 g; slice/chop at a diagonal)`
- **Include gram weights** in prep quantities where helpful
- Include yields where relevant: `(yield: ~6 cups)` or `(yield: ~1½ cups)`
- Split prep notation for different uses: `(1; julienne² | 1; dice into cubes¹)`
- Superscripts indicate which component/recipe uses this prep
- 🫙 jar emoji = ingredient used in a prepped component (keep it out during prep)
- ⏱ clock = estimated time for that section
- Add _— CLEANING BREAK —_ between raw produce and cooked prep tasks

**KEY Format:**
- The KEY should reference **components or sub-recipes**, not just meal names
- This provides more granular tracking of where ingredients go
- Example: `¹ = Mashed Potatoes (served with Roast Chicken)` rather than just `¹ = Roast Chicken Dinner`

**Cooked Prep Tasks Section:**
- Include a dedicated "Cooked Prep Tasks" section for tasks that involve actual cooking
- Each cooking task (sauté, fry, caramelize, blanch, boil, roast) should be a **separate checkbox**
- Reference step numbers when task is part of a larger component recipe: `(steps 1-2 in...)`
- Include brief inline instructions AND reference to detailed component file

- Reference component files with `see components/filename.md`
- Include KEY at bottom
- Include storage notes where relevant

---

## 6. components/\*.md — Sauce/Component Cards

Standalone recipes for reusable components.

**Filename format:** `kebab-case-name.md` (e.g., `tzatziki.md`, `tahini-lemon-dressing.md`)

```markdown
# Scratch That Tzatziki

_Adapted from "Scratch That" by Alix Traeger_

_Makes about 2 cups_

## Ingredients

- 1 Persian Cucumber
- 2 cups (450 g) Plain Full-Fat Greek Yogurt
- 4 cloves of Garlic, grated
- Juice of 1 Lemon
- 2 Tbsp finely chopped Dill
- Kosher Salt, _to taste_
- Freshly Ground Black Pepper, _to taste_

## Instructions

1. Grate the **cucumber** into a clean towel. Holding the towel over the sink, squeeze out as much liquid from the cucumber as you can.

2. Place the squeezed cucumber in a medium bowl and stir in the **yogurt**, **garlic**, **lemon juice**, and the **dill** to combine well.

3. Season the tzatziki with **salt** and **pepper** to your liking. Cover and refrigerate the tzatziki for at least 30 minutes or up to 24 hours before serving.

---

**To Store:** Transfer to an air-tight container and store in the refrigerator for later use.

**Used in:** Meals 1, 3, 4, 5
```

**Rules:**

- Title in Title Case
- Attribution line in italics if adapted: `_Adapted from "Scratch That" by Alix Traeger_`
- Yield in italics: `_Makes about 2 cups_`
- Include gram weights in parentheses for key ingredients: `2 cups (450 g) Plain Full-Fat Greek Yogurt`
- Use `_to taste_` in italics for seasoning amounts
- Bold key ingredients on first mention in instructions
- Numbered instructions
- Include "**To Store:**" note at end
- Include "**Used in:**" reference to meal numbers

---

## 7. recipes/\*.md — Nightly Recipe Cards

Full recipes for each weeknight dinner.

**Filename format:** `m{N}-kebab-case-name.md` (e.g., `m1-white-fish-souvlaki.md`)

```markdown
# Buttermilk Mashed Potatoes

_served with Melted Leek & Lemon Roast Chicken_

_Makes 2 servings_

---

## Prepped Ingredients

> From your Sunday prep:
>
> - Melted Leek & Lemon Roast Chicken — `components/roast-chicken.md`
> - Boiled diced potatoes (from prep list)

---

## Ingredients

### Buttermilk Mashed Potatoes

- 1 large Russet Potato, 1" dice (from prep)
- Kosher Salt, _to taste_
- ¼ cup Buttermilk
- 2 Tbsp Heavy Cream
- 2 Tbsp Salted Butter

---

## Instructions

### On Prep Day:
**Boil the Potatoes**

1. Place **diced potato** in a large pot of cold water. Add a generous pinch of **salt**. Boil until you can insert a fork into the potato with minimal resistance, about 15-18 minutes. Strain the cooked potatoes and return them to the pot to dry and cool completely.

2. Once cooled, you can prepare the mashed potatoes immediately or place the cooled potatoes in an airtight container to store in the refrigerator and use throughout the week—they will last for 3-5 days.

### Day Of:
**Prepare the Mashed Potatoes**

1. In a saucepan, combine **buttermilk**, **heavy cream**, and **salted butter**. Cook over low heat*, until the mixture begins to steam. Add the **cooked potatoes** and, using a fork or masher, mash the potatoes until smooth and creamy. Cook for 3-4 minutes until the potatoes are hot to the touch. Taste and season with a few pinches of **salt** to taste.

*If you heat the buttermilk too quickly—on high heat—it might curdle. Reduce that risk by continuously whisking and warming it up on low heat; however, if it curdles, don't worry, it's not ruined. It'll still taste fine.

### Plate & Serve

1. Onto your serving plates, spoon a bed of mashed potatoes and top with the melted leeks, lemon slices, and cuts of **roast chicken**. Garnish with **freshly ground black pepper**.

---

> **Hot Tip:** The key to fluffy mashed potatoes is starting with cold water and not over-mashing. Stop as soon as they're smooth.

---

**Serving Suggestion:** Pair with a glass of Chardonnay or a light Pinot Noir.
```

**Rules:**

- Title in Title Case
- Subtitle in italics: `_served with Roast Chicken_` or `_with Tzatziki_`
- Attribution line if adapted: `_Adapted from "Scratch That" by Alix Traeger_`
- Serving yield in italics: `_Makes 2 servings_`
- **Prepped Ingredients** blockquote referencing component files

**"On Prep Day" Sections:**
When a recipe has meaningful prep work beyond simple chopping, include an **"On Prep Day:"** section within the Instructions:
- Use `### On Prep Day:` header followed by the task name in bold
- Explains what to do during Sunday prep
- Use `### Day Of:` header for the weeknight cooking steps
- This is especially useful for recipes with boiling, marinating, or pre-cooking steps

**Plating Instructions (### Plate & Serve):**
Include a dedicated plating section that describes how to assemble the dish visually:
- Build from the base up (puree/grain first, then protein, then garnish)
- Describe sauce application (pool underneath, drizzle on top, serve on side)
- Note garnish placement for visual appeal
- Example: "Spoon the squash puree into the center of a shallow bowl. Nestle the seared cod on top. Scatter broccolini around the fish. Drizzle with vinaigrette and finish with flaky salt and fresh dill."

**Other Formatting:**
- Ingredient sections with `### For X` or `### Accompaniments` headers
- Prepped ingredients in Accompaniments reference "(from prep)" or batch amounts: `½ batch Lemon Dill Pilaf, reheated`
- Use `_to taste_`, `_for garnish_`, `_for serving_`, `_for cooking_` in italics
- Footnotes with asterisks for notes: `*If you heat the buttermilk too quickly...`
- Numbered instructions with section headers (`### Marinate`, `### Cook`, etc.)
- Bold key ingredients on first mention per section
- Use `> **Hot Tip:**` blockquote for technique notes
- Include serving suggestion at end when relevant

---

## Summary of Formatting Conventions

| Element | Format |
|---------|--------|
| Meal/component references | Unicode superscripts directly attached: `¹²³⁴⁵` |
| Grocery weights | Volume AND grams: `Sugar Snap Peas (8 oz / 227 g)²⁵` |
| Recipe weights | Grams in parentheses: `2 cups (450 g) Greek Yogurt` |
| Prep quantities | Include grams where helpful: `Mushrooms (8 oz / 227 g; thinly slice)` |
| Seasoning amounts | Italics: `_to taste_` |
| Garnish/serving | Italics: `_for garnish_`, `_for serving_` |
| Attribution | Italics: `_Adapted from..._` |
| Component dependency | 🫙 jar emoji in prep list |
| Time estimates | ⏱ clock with time: `(⏱ 40-45 minutes)` |
| Yields | In parentheses: `(yield: ~6 cups)` |
| Hot tips | Blockquote: `> **Hot Tip:**` |
| Storage notes | Bold label: `**To Store:**` |
| File references | Backticks: `` `components/tzatziki.md` `` |
| Cooked prep tasks | Separate checkbox per cooking action (sauté, blanch, fry, etc.) |
| Prep list ordering | Long-running tasks first, then produce, then cooking, then components |
| KEY format | References components/sub-recipes: `¹ = Mashed Potatoes` |
| On Prep Day sections | `### On Prep Day:` and `### Day Of:` headers in recipes |
| Plating instructions | `### Plate & Serve` section describing visual assembly |
| Optional groceries | Separate `## Optional` section when needed |
