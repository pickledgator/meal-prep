import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { env } from "../env.js";
import * as schema from "./schema.js";

export const libsql = createClient({
  url: env.TURSO_DATABASE_URL ?? "file:local.db",
  ...(env.TURSO_AUTH_TOKEN ? { authToken: env.TURSO_AUTH_TOKEN } : {}),
});

export const db = drizzle(libsql, { schema });

export type Db = typeof db;
