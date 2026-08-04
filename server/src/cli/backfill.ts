// One-time backfill: parse every plans/<slug>/ markdown folder into a
// PlanPayload and ingest it through the single write path (ingestPlan).
//
//   pnpm backfill                  build + validate + ingest all plans
//   pnpm backfill --dry-run        build + validate only (writes payloads/)
//   pnpm backfill --plan <slug>    limit to one plan
//   pnpm backfill --verify         read the DB back and assert invariants
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { planPayloadSchema } from "shared";
import { db } from "../db/client.js";
import { env } from "../env.js";
import { ingestPlan } from "../ingest/ingest-plan.js";
import * as t from "../db/schema.js";
import { buildPlanPayload, type PlanPayloadInput } from "../backfill/build-payload.js";
import type { Flag } from "../backfill/util.js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const verify = args.includes("--verify");
const planIndex = args.indexOf("--plan");
const onlyPlan = planIndex >= 0 ? args[planIndex + 1] : undefined;

function findRepoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(dir, "plans")) && existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("could not locate the repo root (looked for plans/ + pnpm-workspace.yaml)");
}

const repoRoot = findRepoRoot();
const plansDir = join(repoRoot, "plans");
const payloadsDir = join(repoRoot, "payloads");

function planSlugs(): string[] {
  const all = readdirSync(plansDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/.test(e.name))
    .map((e) => e.name)
    .sort();
  if (onlyPlan === undefined) return all;
  if (!all.includes(onlyPlan)) {
    console.error(`✗ unknown plan "${onlyPlan}" — known: ${all.join(", ")}`);
    process.exit(2);
  }
  return [onlyPlan];
}

function pad(s: string | number, n: number): string {
  return String(s).padEnd(n);
}

async function runVerify(): Promise<void> {
  const plans = await db.select().from(t.plans);
  const meals = await db.select().from(t.meals);
  const components = await db.select().from(t.components);
  const ingredients = await db.select({ id: t.recipeIngredients.id, mealId: t.recipeIngredients.mealId, componentId: t.recipeIngredients.componentId }).from(t.recipeIngredients);
  const steps = await db.select({ id: t.recipeSteps.id, mealId: t.recipeSteps.mealId, componentId: t.recipeSteps.componentId }).from(t.recipeSteps);
  const grocery = await db.select({ planId: t.groceryItems.planId, category: t.groceryItems.category }).from(t.groceryItems);
  const essentials = await db.select({ planId: t.essentialItems.planId }).from(t.essentialItems);
  const tasks = await db.select({ id: t.prepTasks.id, planId: t.prepTasks.planId }).from(t.prepTasks);
  const allocations = await db
    .select({ taskId: t.prepAllocations.taskId, destinationKind: t.prepAllocations.destinationKind, componentId: t.prepAllocations.componentId })
    .from(t.prepAllocations);

  const expected = planSlugs().length;
  console.log(`plans in db: ${plans.length} (expected ${expected}) ${plans.length === expected ? "✓" : "✗"}`);
  console.log("");

  const componentIds = new Set(components.map((c) => c.id));
  const taskPlan = new Map(tasks.map((task) => [task.id, task.planId]));

  const header = ["plan", "meals±lines", "cards", "grocery-cats", "essentials", "alloc-refs", "result"];
  const widths = [42, 12, 6, 13, 11, 11, 7];
  console.log(header.map((h, i) => pad(h, widths[i])).join(" "));
  console.log(widths.map((w) => "-".repeat(w)).join(" "));

  let allPass = plans.length === expected;
  for (const plan of [...plans].sort((a, b) => a.slug.localeCompare(b.slug))) {
    const planMeals = meals.filter((m) => m.planId === plan.id);
    const mealsOk =
      planMeals.length > 0 &&
      planMeals.every(
        (m) => ingredients.some((r) => r.mealId === m.id) && steps.some((r) => r.mealId === m.id),
      );

    const planComponents = components.filter((c) => c.planId === plan.id);
    const cardsOk = planComponents.filter((c) => c.hasCard).every((c) => steps.some((r) => r.componentId === c.id));

    const categories = new Set(grocery.filter((g) => g.planId === plan.id).map((g) => g.category));
    const groceryOk = categories.size >= 3;

    const essentialsOk = essentials.some((e) => e.planId === plan.id);

    const planAllocs = allocations.filter((a) => taskPlan.get(a.taskId) === plan.id);
    const allocsOk = planAllocs
      .filter((a) => a.destinationKind === "component")
      .every((a) => a.componentId !== null && componentIds.has(a.componentId));

    const pass = mealsOk && cardsOk && groceryOk && essentialsOk && allocsOk;
    allPass &&= pass;
    console.log(
      [
        pad(plan.slug, widths[0]),
        pad(`${planMeals.length} ${mealsOk ? "✓" : "✗"}`, widths[1]),
        pad(cardsOk ? "✓" : "✗", widths[2]),
        pad(`${categories.size} ${groceryOk ? "✓" : "✗"}`, widths[3]),
        pad(essentialsOk ? "✓" : "✗", widths[4]),
        pad(allocsOk ? "✓" : "✗", widths[5]),
        pass ? "PASS" : "FAIL",
      ].join(" "),
    );
  }
  console.log("");
  console.log(allPass ? "✓ all verification checks passed" : "✗ verification failures above");
  process.exit(allPass ? 0 : 1);
}

type BuildRow = {
  slug: string;
  valid: boolean;
  issues: string[];
  flags: Flag[];
  payload: PlanPayloadInput;
  counts: Record<string, number>;
};

async function runBuild(): Promise<void> {
  const rows: BuildRow[] = [];
  for (const slug of planSlugs()) {
    let built;
    try {
      built = buildPlanPayload(plansDir, slug);
    } catch (err) {
      console.error(`✗ ${slug}: builder crashed — ${err instanceof Error ? err.stack : err}`);
      process.exit(1);
    }
    const parsed = planPayloadSchema.safeParse(built.payload);
    const issues = parsed.success
      ? []
      : parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
    const p = built.payload;
    rows.push({
      slug,
      valid: parsed.success,
      issues,
      flags: built.flags,
      payload: p,
      counts: {
        meals: p.meals.length,
        components: p.components?.length ?? 0,
        ingredients:
          p.meals.reduce((n, m) => n + m.ingredients.length, 0) +
          (p.components ?? []).reduce((n, c) => n + (c.ingredients?.length ?? 0), 0),
        steps:
          p.meals.reduce((n, m) => n + m.steps.length, 0) +
          (p.components ?? []).reduce((n, c) => n + (c.steps?.length ?? 0), 0),
        grocery: p.grocery.length,
        essentials: p.essentials?.length ?? 0,
        timeSavers: p.timeSavers?.length ?? 0,
        prepSections: p.prepSections?.length ?? 0,
        prepTasks: (p.prepSections ?? []).reduce((n, s) => n + (s.tasks?.length ?? 0), 0),
        allocations: (p.prepSections ?? []).reduce(
          (n, s) => n + (s.tasks ?? []).reduce((m, task) => m + (task.allocations?.length ?? 0), 0),
          0,
        ),
      },
    });
  }

  mkdirSync(payloadsDir, { recursive: true });
  for (const row of rows) {
    writeFileSync(join(payloadsDir, `${row.slug}.json`), `${JSON.stringify(row.payload, null, 2)}\n`);
  }

  console.log(`built ${rows.length} plan(s) → ${resolve(payloadsDir)}`);
  console.log("");
  const widths = [42, 6, 6, 6, 7, 7, 8, 6, 6, 7, 7, 7, 6];
  const header = ["plan", "ok", "meals", "comps", "ingr", "steps", "grocery", "essn", "tsvr", "sects", "tasks", "allocs", "flags"];
  console.log(header.map((h, i) => pad(h, widths[i])).join(" "));
  console.log(widths.map((w) => "-".repeat(w)).join(" "));
  for (const row of rows) {
    const c = row.counts;
    console.log(
      [
        pad(row.slug, widths[0]),
        pad(row.valid ? "✓" : "✗", widths[1]),
        pad(c.meals, widths[2]),
        pad(c.components, widths[3]),
        pad(c.ingredients, widths[4]),
        pad(c.steps, widths[5]),
        pad(c.grocery, widths[6]),
        pad(c.essentials, widths[7]),
        pad(c.timeSavers, widths[8]),
        pad(c.prepSections, widths[9]),
        pad(c.prepTasks, widths[10]),
        pad(c.allocations, widths[11]),
        pad(row.flags.length, widths[12]),
      ].join(" "),
    );
  }

  const invalid = rows.filter((r) => !r.valid);
  if (invalid.length > 0) {
    console.log("");
    console.log("validation issues:");
    for (const row of invalid) {
      console.log(`  ${row.slug}:`);
      for (const issue of row.issues.slice(0, 25)) console.log(`    - ${issue}`);
      if (row.issues.length > 25) console.log(`    … and ${row.issues.length - 25} more`);
    }
  }

  const flagged = rows.filter((r) => r.flags.length > 0);
  if (flagged.length > 0) {
    console.log("");
    console.log(`flag report (${rows.reduce((n, r) => n + r.flags.length, 0)} lines):`);
    for (const row of flagged) {
      console.log(`  ${row.slug}`);
      for (const flag of row.flags) {
        console.log(`    ${flag.file}:${flag.line} ${flag.reason}`);
      }
    }
  }

  if (dryRun) {
    console.log("");
    console.log(invalid.length === 0 ? "✓ dry run — all plans valid, nothing written" : `✗ dry run — ${invalid.length} plan(s) invalid`);
    process.exit(invalid.length === 0 ? 0 : 1);
  }

  if (invalid.length > 0) {
    console.log("");
    console.log(`✗ refusing to ingest — ${invalid.length} plan(s) failed validation`);
    process.exit(1);
  }

  console.log("");
  for (const row of rows) {
    const result = await ingestPlan(db, row.payload);
    console.log(`✓ ${result.replaced ? "replaced" : "created"} ${result.slug} — ${JSON.stringify(result.counts)}`);
  }
  console.log(`✓ ingested ${rows.length} plan(s) into ${env.TURSO_DATABASE_URL ?? "file:local.db"}`);
  process.exit(0);
}

if (verify) {
  await runVerify();
} else {
  await runBuild();
}
