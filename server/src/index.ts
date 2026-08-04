import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { basicAuth } from "./auth.js";
import { db } from "./db/client.js";
import { env } from "./env.js";
import { plansRoute } from "./routes/plans.js";

const app = new Hono();

// Health stays public: Fly's http_service checks can't send credentials.
app.get("/api/health", async (c) => {
  let dbOk = false;
  try {
    await db.run(sql`select 1`);
    dbOk = true;
  } catch {
    // fall through
  }
  return c.json({ ok: true, db: dbOk });
});

// Everything else — API, static assets, and the SPA shell — sits behind the
// shared household password.
app.use("*", basicAuth);

// CSRF posture: HTTP Basic isn't cookie-based, so classic CSRF doesn't apply,
// but keep the belt-and-suspenders form-content-type rejection on mutating
// API routes anyway (browsers attach cached Basic credentials to form posts).
const FORM_CONTENT_TYPES = ["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"];
app.use("/api/*", async (c, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
    const ct = (c.req.header("content-type") ?? "").toLowerCase();
    if (FORM_CONTENT_TYPES.some((t) => ct.startsWith(t))) {
      return c.json({ error: "expected application/json" }, 415);
    }
  }
  await next();
});

app.route("/api/plans", plansRoute);

app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse();
  if (err instanceof ZodError) {
    const issue = err.issues[0];
    return c.json({ error: `invalid ${issue?.path.join(".") ?? "input"}: ${issue?.message ?? "bad input"}` }, 400);
  }
  if (err instanceof SyntaxError) {
    return c.json({ error: "invalid JSON body" }, 400);
  }
  console.error(err);
  return c.json({ error: "internal error" }, 500);
});

// ---- built SPA (production; in dev Vite serves the frontend and proxies /api) ----
if (existsSync(env.WEB_DIST)) {
  app.use("/assets/*", serveStatic({ root: env.WEB_DIST }));
}

let indexHtml: string | null = null;
app.get("*", (c) => {
  if (indexHtml === null) {
    try {
      indexHtml = readFileSync(join(env.WEB_DIST, "index.html"), "utf8");
    } catch {
      return c.text("frontend not built — run the Vite dev server (pnpm dev) or pnpm build", 404);
    }
  }
  return c.html(indexHtml);
});

serve({ fetch: app.fetch, port: env.PORT, hostname: "0.0.0.0" }, (info) => {
  console.log(`server listening on http://localhost:${info.port} (db: ${env.TURSO_DATABASE_URL ?? "file:local.db"})`);
});
