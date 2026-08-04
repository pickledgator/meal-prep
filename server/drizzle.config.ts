import { defineConfig } from "drizzle-kit";

for (const file of ["../.env", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // file absent — ignore
  }
}

const url = process.env.TURSO_DATABASE_URL || "file:local.db";

export default defineConfig({
  dialect: "turso",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url,
    ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
  },
});
