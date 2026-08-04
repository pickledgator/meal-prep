import { z } from "zod";

// Load .env from the repo root (dev runs with cwd=server/) or cwd. Real
// environment variables win over file values; missing files are fine (prod
// gets everything from Fly secrets).
for (const file of ["../.env", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // file absent — ignore
  }
}

// .env templates often leave values empty (FOO=). Treat "" as unset so
// defaults and `??` fallbacks behave.
const optional = z
  .string()
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(8080),
  TURSO_DATABASE_URL: optional,
  TURSO_AUTH_TOKEN: optional,
  APP_PASSWORD: optional,
  WEB_DIST: optional.transform((v) => v ?? "web/dist"),
});

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  isProd: parsed.NODE_ENV === "production",
};

// Unset APP_PASSWORD means the basic-auth middleware waves everything
// through — fine on a laptop, never in production.
if (env.isProd && !env.APP_PASSWORD) {
  throw new Error("APP_PASSWORD must be set in production");
}
// Falling back to file:local.db inside an ephemeral Fly container would be
// an empty, amnesiac app — refuse to boot.
if (env.isProd && !env.TURSO_DATABASE_URL) {
  throw new Error("TURSO_DATABASE_URL must be set in production");
}
