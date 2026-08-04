import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/client.js";
import { getPlanDetail, getPlanSummaries } from "../db/queries.js";
import * as t from "../db/schema.js";
import { ingestPlan } from "../ingest/ingest-plan.js";

export const plansRoute = new Hono();

plansRoute.get("/", async (c) => {
  return c.json(await getPlanSummaries(db));
});

plansRoute.get("/:slug", async (c) => {
  const plan = await getPlanDetail(db, c.req.param("slug"));
  if (!plan) return c.json({ error: "plan not found" }, 404);
  return c.json(plan);
});

// Same ingestPlan() as the local CLI writer — zod errors surface as 400s via
// the app-level onError handler.
plansRoute.post("/", async (c) => {
  const result = await ingestPlan(db, await c.req.json());
  return c.json(result, result.replaced ? 200 : 201);
});

plansRoute.delete("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const existing = await db.select({ id: t.plans.id }).from(t.plans).where(eq(t.plans.slug, slug)).get();
  if (!existing) return c.json({ error: "plan not found" }, 404);
  await db.delete(t.plans).where(eq(t.plans.id, existing.id));
  return c.json({ deleted: slug });
});
