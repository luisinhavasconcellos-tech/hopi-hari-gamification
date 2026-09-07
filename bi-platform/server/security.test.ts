import express from "express";
import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  apiNotFound,
  buildContentSecurityPolicy,
  createRateLimiter,
  errorHandler,
  originPolicy,
  requestId,
  securityHeaders,
} from "./_core/security";
import { isPublicStorageKey, isValidStorageKey } from "./_core/storageProxy";
import { validateEnv, ENV } from "./_core/env";
import { sendRouteError } from "./_core/httpErrors";
import { ApiAuthError } from "./lib/supabaseAuth";

vi.mock("./db", () => ({ getOrCreatePlatformAccess: vi.fn() }));

async function listen(app: express.Express) {
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server did not bind");
  return { server, url: `http://127.0.0.1:${address.port}` };
}

describe("security headers", () => {
  let server: Server | null = null;
  afterEach(async () => {
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    server = null;
  });

  it("sets hardening headers and the CSP on every response", async () => {
    const app = express();
    app.use(requestId());
    app.use(securityHeaders({ isProduction: true, cspMode: "enforce", frameAncestors: "'self'", csp: "default-src 'self'" }));
    app.get("/api/ping", (_req, res) => res.json({ ok: true }));
    const running = await listen(app);
    server = running.server;
    const response = await fetch(`${running.url}/api/ping`);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(response.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(response.headers.get("content-security-policy")).toBe("default-src 'self'");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-request-id")).toMatch(/[0-9a-f-]{36}/);
    // plain http in the test → no HSTS
    expect(response.headers.get("strict-transport-security")).toBeNull();
  });

  it("uses report-only mode when configured and skips X-Frame-Options for custom ancestors", async () => {
    const app = express();
    app.use(securityHeaders({ isProduction: false, cspMode: "report-only", frameAncestors: "'self' https://editor.example", csp: "default-src 'self'" }));
    app.get("/", (_req, res) => res.send("ok"));
    const running = await listen(app);
    server = running.server;
    const response = await fetch(running.url);
    expect(response.headers.get("content-security-policy")).toBeNull();
    expect(response.headers.get("content-security-policy-report-only")).toBe("default-src 'self'");
    expect(response.headers.get("x-frame-options")).toBeNull();
  });

  it("builds a CSP that allows the configured Supabase projects and extra connect sources", () => {
    const csp = buildContentSecurityPolicy({
      frameAncestors: "'self'",
      connectSrc: ["https://analytics.example.com/"],
      forgeApiUrl: "https://forge.example.com/",
      supabaseUrls: ["https://abc.supabase.co", "not a url"],
    });
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toMatch(/connect-src [^;]*https:\/\/abc\.supabase\.co/);
    expect(csp).toMatch(/connect-src [^;]*wss:\/\/abc\.supabase\.co/);
    expect(csp).toMatch(/connect-src [^;]*https:\/\/analytics\.example\.com/);
    expect(csp).toMatch(/script-src 'self' https:\/\/forge\.example\.com/);
    expect(csp).not.toContain("'unsafe-eval'");
  });
});

describe("origin policy (CSRF guard + CORS)", () => {
  let server: Server | null = null;
  afterEach(async () => {
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    server = null;
  });

  async function start(allowedOrigins: string[] = []) {
    const app = express();
    app.use(originPolicy({ allowedOrigins }));
    app.all("/api/thing", (_req, res) => res.json({ ok: true }));
    app.post("/other", (_req, res) => res.json({ ok: true }));
    const running = await listen(app);
    server = running.server;
    return running.url;
  }

  it("allows requests without an Origin header (cron, curl, same-origin GET)", async () => {
    const url = await start();
    expect((await fetch(`${url}/api/thing`, { method: "POST" })).status).toBe(200);
  });

  it("allows same-origin unsafe requests", async () => {
    const url = await start();
    expect((await fetch(`${url}/api/thing`, { method: "POST", headers: { Origin: url } })).status).toBe(200);
  });

  it("blocks cross-site POSTs to the API but not cross-site GETs", async () => {
    const url = await start();
    const post = await fetch(`${url}/api/thing`, { method: "POST", headers: { Origin: "https://evil.example" } });
    expect(post.status).toBe(403);
    const get = await fetch(`${url}/api/thing`, { headers: { Origin: "https://evil.example" } });
    expect(get.status).toBe(200);
    expect(get.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("blocks the opaque 'null' origin on unsafe methods", async () => {
    const url = await start();
    const post = await fetch(`${url}/api/thing`, { method: "POST", headers: { Origin: "null" } });
    expect(post.status).toBe(403);
  });

  it("emits CORS headers only for allow-listed origins and answers preflights", async () => {
    const url = await start(["https://app.example.com"]);
    const preflight = await fetch(`${url}/api/thing`, {
      method: "OPTIONS",
      headers: { Origin: "https://app.example.com", "Access-Control-Request-Method": "POST" },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("https://app.example.com");
    expect(preflight.headers.get("access-control-allow-credentials")).toBe("true");
    const post = await fetch(`${url}/api/thing`, { method: "POST", headers: { Origin: "https://app.example.com" } });
    expect(post.status).toBe(200);
    const denied = await fetch(`${url}/api/thing`, { method: "OPTIONS", headers: { Origin: "https://evil.example" } });
    expect(denied.status).toBe(403);
  });

  it("ignores paths outside the guarded prefixes", async () => {
    const url = await start();
    expect((await fetch(`${url}/other`, { method: "POST", headers: { Origin: "https://evil.example" } })).status).toBe(200);
  });
});

describe("rate limiter", () => {
  let server: Server | null = null;
  afterEach(async () => {
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    server = null;
  });

  it("returns 429 with Retry-After once the window budget is spent and resets afterwards", async () => {
    let clock = 1_000_000;
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2, now: () => clock });
    const app = express();
    app.use("/api", limiter);
    app.get("/api/x", (_req, res) => res.json({ ok: true }));
    const running = await listen(app);
    server = running.server;

    const first = await fetch(`${running.url}/api/x`);
    expect(first.status).toBe(200);
    expect(first.headers.get("ratelimit-remaining")).toBe("1");
    expect((await fetch(`${running.url}/api/x`)).status).toBe(200);
    const blocked = await fetch(`${running.url}/api/x`);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(await blocked.json()).toEqual({ error: "Too many requests, try again later" });

    clock += 60_001;
    expect((await fetch(`${running.url}/api/x`)).status).toBe(200);
    expect(limiter.size()).toBe(1);
  });

  it("honours skip() and custom keys", async () => {
    const limiter = createRateLimiter({
      windowMs: 60_000,
      max: 1,
      keyGenerator: req => String(req.headers["x-user"] ?? "anon"),
      skip: req => req.headers["x-cron"] === "1",
    });
    const app = express();
    app.use(limiter);
    app.get("/", (_req, res) => res.send("ok"));
    const running = await listen(app);
    server = running.server;
    expect((await fetch(running.url, { headers: { "x-user": "a" } })).status).toBe(200);
    expect((await fetch(running.url, { headers: { "x-user": "a" } })).status).toBe(429);
    expect((await fetch(running.url, { headers: { "x-user": "b" } })).status).toBe(200);
    expect((await fetch(running.url, { headers: { "x-user": "a", "x-cron": "1" } })).status).toBe(200);
  });
});

describe("api 404 and error handler", () => {
  let server: Server | null = null;
  afterEach(async () => {
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    server = null;
  });

  it("answers unknown /api routes with JSON 404 and hides internal errors", async () => {
    const log = vi.fn();
    const app = express();
    app.use(express.json({ limit: "1kb" }));
    app.get("/api/boom", () => {
      throw new Error("database password is hunter2");
    });
    app.post("/api/echo", (req, res) => res.json(req.body));
    app.use(apiNotFound());
    app.use((_req, res) => res.send("spa shell"));
    app.use(errorHandler(log));
    const running = await listen(app);
    server = running.server;

    const missing = await fetch(`${running.url}/api/nope`);
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "Not found" });

    const spa = await fetch(`${running.url}/some/page`);
    expect(await spa.text()).toBe("spa shell");

    const boom = await fetch(`${running.url}/api/boom`);
    expect(boom.status).toBe(500);
    expect(await boom.text()).not.toContain("hunter2");
    expect(log).toHaveBeenCalledTimes(1);

    const tooLarge = await fetch(`${running.url}/api/echo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ blob: "x".repeat(5_000) }),
    });
    expect(tooLarge.status).toBe(413);

    const malformed = await fetch(`${running.url}/api/echo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    expect(malformed.status).toBe(400);
  });
});

describe("route error helper", () => {
  function fakeRes() {
    const res = { statusCode: 200, body: undefined as unknown };
    return {
      res,
      handle: {
        status(code: number) {
          res.statusCode = code;
          return this;
        },
        json(body: unknown) {
          res.body = body;
          return this;
        },
      } as never,
    };
  }

  it("keeps auth errors and hides everything else", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const auth = fakeRes();
    sendRouteError(auth.handle, new ApiAuthError(403, "Account approval required"), "T");
    expect(auth.res).toEqual({ statusCode: 403, body: { error: "Account approval required" } });

    const internal = fakeRes();
    sendRouteError(internal.handle, new Error("connect ECONNREFUSED mysql://root:pw@db"), "T"); // check-secrets: allow (fake)
    expect(internal.res.statusCode).toBe(500);
    expect(JSON.stringify(internal.res.body)).not.toContain("mysql://");
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});

describe("storage proxy key rules", () => {
  it("accepts well-formed keys and rejects traversal or odd characters", () => {
    expect(isValidStorageKey("hopi-logo_ae1fe729.jpg")).toBe(true);
    expect(isValidStorageKey("daily-briefings/2026-09-01/narration_ab12cd34.mp3")).toBe(true);
    expect(isValidStorageKey("../etc/passwd")).toBe(false);
    expect(isValidStorageKey("a/../b")).toBe(false);
    expect(isValidStorageKey("a//b")).toBe(false);
    expect(isValidStorageKey("a\\b")).toBe(false);
    expect(isValidStorageKey("a b")).toBe(false);
    expect(isValidStorageKey("a?x=1")).toBe(false);
    expect(isValidStorageKey("")).toBe(false);
    expect(isValidStorageKey("x".repeat(600))).toBe(false);
  });

  it("treats top-level brand assets as public and nested objects as private", () => {
    expect(isPublicStorageKey("hopi-logo_ae1fe729.jpg", ["public/"])).toBe(true);
    expect(isPublicStorageKey("Fraunces72pt-Bold_df405678.ttf", ["public/"])).toBe(true);
    expect(isPublicStorageKey("daily-briefings/2026-09-01/narration.mp3", ["public/"])).toBe(false);
    expect(isPublicStorageKey("generated/123.png", ["public/"])).toBe(false);
    expect(isPublicStorageKey("public/banner.png", ["public/"])).toBe(true);
  });
});

describe("environment validation", () => {
  it("fails fast on unsafe production configuration", () => {
    expect(() =>
      validateEnv({ ...ENV, isProduction: true, databaseUrl: "", cookieSecret: "" })
    ).toThrow(/DATABASE_URL is required[\s\S]*JWT_SECRET is required/);
    expect(() =>
      validateEnv({ ...ENV, isProduction: true, databaseUrl: "mysql://x", cookieSecret: "short" })
    ).toThrow(/at least 16 characters/);
    expect(() =>
      validateEnv({ ...ENV, isProduction: false, allowedOrigins: ["https://ok.example", "bad/origin"] })
    ).toThrow(/ALLOWED_ORIGINS entry "bad\/origin"/);
  });

  it("only warns about weak-but-valid settings", () => {
    const warnings = validateEnv({
      ...ENV,
      isProduction: true,
      databaseUrl: "mysql://x",
      cookieSecret: "1234567890123456789012",
      sessionCookieSameSite: "none",
      cspMode: "report-only",
      rateLimitDisabled: true,
      allowedOrigins: [],
    });
    expect(warnings.some(w => w.includes("shorter than 32"))).toBe(true);
    expect(warnings.some(w => w.includes("SESSION_COOKIE_SAME_SITE=none"))).toBe(true);
    expect(warnings.some(w => w.includes("CSP_MODE=report-only"))).toBe(true);
    expect(warnings.some(w => w.includes("RATE_LIMIT_DISABLED"))).toBe(true);
  });
});
