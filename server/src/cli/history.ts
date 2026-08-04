// Plan history for the /meal-prep generator's no-repeats check — replaces the
// old `ls plans/` + `ls plans/*/recipes/` filesystem scan.
//
//   pnpm history [--json] [--limit N]
import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import * as t from "../db/schema.js";

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const limitIndex = args.indexOf("--limit");
const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : undefined;

// Sauce-family component types = the "marquee sauce" no-repeats class.
const SAUCE_TYPES = ["sauce", "dressing", "marinade", "glaze", "vinaigrette", "condiment", "relish", "pickle", "salsa"];

let planQuery = db
  .select({ id: t.plans.id, slug: t.plans.slug, weekOf: t.plans.weekOf, theme: t.plans.theme })
  .from(t.plans)
  .orderBy(desc(t.plans.weekOf), desc(t.plans.slug))
  .$dynamic();
if (limit !== undefined && Number.isFinite(limit)) planQuery = planQuery.limit(limit);
const planRows = await planQuery;
const planIds = planRows.map((p) => p.id);

const mealRows =
  planIds.length === 0
    ? []
    : await db
        .select({
          planId: t.meals.planId,
          mealNumber: t.meals.mealNumber,
          name: t.meals.name,
          protein: t.meals.protein,
          proteinCategory: t.meals.proteinCategory,
          cuisine: t.meals.cuisine,
          menuBlurb: t.meals.menuBlurb,
        })
        .from(t.meals)
        .where(inArray(t.meals.planId, planIds))
        .orderBy(asc(t.meals.mealNumber));

const componentRows =
  planIds.length === 0
    ? []
    : await db
        .select({ planId: t.components.planId, name: t.components.name, type: t.components.type })
        .from(t.components)
        .where(inArray(t.components.planId, planIds));

const history = planRows.map((p) => ({
  slug: p.slug,
  weekOf: p.weekOf,
  theme: p.theme,
  meals: mealRows
    .filter((m) => m.planId === p.id)
    .map(({ planId: _planId, ...m }) => ({ ...m, menuBlurb: m.menuBlurb ?? undefined })),
  marqueeComponents: componentRows
    .filter((c) => c.planId === p.id && SAUCE_TYPES.includes(c.type.toLowerCase()))
    .map((c) => ({ name: c.name, type: c.type })),
}));

if (asJson) {
  console.log(JSON.stringify(history, null, 2));
} else {
  for (const p of history) {
    console.log(`${p.weekOf}  ${p.theme}  (${p.slug})`);
    for (const m of p.meals) console.log(`    M${m.mealNumber} ${m.name} — ${m.protein} · ${m.cuisine}`);
    if (p.marqueeComponents.length > 0) {
      console.log(`    sauces: ${p.marqueeComponents.map((c) => c.name).join(", ")}`);
    }
  }
  if (history.length === 0) console.log("(no plans in the database yet)");
}
process.exit(0);
