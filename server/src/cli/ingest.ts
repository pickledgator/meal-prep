// Local writer → cloud DB (the marriotty pattern). Reads a PlanPayload JSON
// file, validates it, and writes it to TURSO_DATABASE_URL (or file:local.db).
//
//   pnpm ingest <payload.json> [--dry-run]
import { readFileSync } from "node:fs";
import { planPayloadSchema } from "shared";
import { db } from "../db/client.js";
import { env } from "../env.js";
import { ingestPlan } from "../ingest/ingest-plan.js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const file = args.find((a) => !a.startsWith("--"));

if (!file) {
  console.error("usage: pnpm ingest <payload.json> [--dry-run]");
  process.exit(2);
}

let raw: unknown;
try {
  raw = JSON.parse(readFileSync(file, "utf8"));
} catch (err) {
  console.error(`could not read ${file}: ${err instanceof Error ? err.message : err}`);
  process.exit(2);
}

const parsed = planPayloadSchema.safeParse(raw);
if (!parsed.success) {
  console.error(`✗ ${file} failed validation:`);
  for (const issue of parsed.error.issues.slice(0, 20)) {
    console.error(`  - ${issue.path.join(".") || "(root)"}: ${issue.message}`);
  }
  if (parsed.error.issues.length > 20) console.error(`  … and ${parsed.error.issues.length - 20} more`);
  process.exit(1);
}

const payload = parsed.data;
const summary = {
  meals: payload.meals.length,
  components: payload.components.length,
  grocery: payload.grocery.length,
  essentials: payload.essentials.length,
  timeSavers: payload.timeSavers.length,
  prepSections: payload.prepSections.length,
  prepTasks: payload.prepSections.reduce((n, s) => n + s.tasks.length, 0),
};

if (dryRun) {
  console.log(`✓ ${payload.slug} is valid (dry run — nothing written)`);
  console.log(`  ${JSON.stringify(summary)}`);
  process.exit(0);
}

const result = await ingestPlan(db, payload);
console.log(
  `✓ ${result.replaced ? "replaced" : "created"} ${result.slug} in ${env.TURSO_DATABASE_URL ?? "file:local.db"}`,
);
console.log(`  ${JSON.stringify(result.counts)}`);
process.exit(0);
