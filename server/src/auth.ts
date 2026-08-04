import { createHash, timingSafeEqual } from "node:crypto";
import type { MiddlewareHandler } from "hono";
import { env } from "./env.js";

// Hash both sides before comparing: timingSafeEqual requires equal-length
// buffers, and hashing makes the compare constant-time without leaking the
// password length.
const sha = (s: string) => createHash("sha256").update(s).digest();

// marriotty-style shared password over HTTP Basic. The username is ignored —
// browsers prompt once, cache credentials for the realm, and attach them to
// every asset and API request, so the SPA needs zero auth code.
export const basicAuth: MiddlewareHandler = async (c, next) => {
  if (!env.APP_PASSWORD) {
    // dev-only: unset ⇒ open (env.ts refuses to boot like this in prod)
    await next();
    return;
  }
  const header = c.req.header("authorization") ?? "";
  const [scheme, encoded] = header.split(" ");
  const supplied =
    scheme?.toLowerCase() === "basic" && encoded
      ? Buffer.from(encoded, "base64").toString("utf8").split(":").slice(1).join(":")
      : "";
  if (!timingSafeEqual(sha(supplied), sha(env.APP_PASSWORD))) {
    return c.body("authentication required", 401, {
      "WWW-Authenticate": 'Basic realm="meal-prep", charset="UTF-8"',
    });
  }
  await next();
};
