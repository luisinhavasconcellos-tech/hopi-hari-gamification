/**
 * Security layer for the Express server.
 *
 * Everything in this module is dependency-free on purpose: the middlewares are
 * small, auditable and unit-tested (see server/security.test.ts). They are
 * wired together by `registerSecurity()` in server/_core/index.ts.
 *
 *  - hardened response headers + Content-Security-Policy
 *  - CORS allow-list and a CSRF origin guard for state-changing requests
 *  - in-memory rate limiting (per client IP) with stricter tiers for auth and
 *    expensive endpoints
 *  - request ids and an audit log of denied requests
 *  - a JSON 404 for unknown /api routes and a final error handler that never
 *    leaks stack traces or upstream error text
 */
import { randomUUID } from "node:crypto";
import type { Express, NextFunction, Request, RequestHandler, Response } from "express";
import { ENV } from "./env";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isSecureRequest(req: Request): boolean {
  // `req.protocol` honours `trust proxy`, so X-Forwarded-Proto is covered.
  return req.protocol === "https" || req.secure;
}

/** Origin of the request itself (scheme + host), used to accept same-origin calls. */
export function requestOrigin(req: Request): string | null {
  // `req.hostname` strips the port and honours X-Forwarded-Host when proxies
  // are trusted, so rebuild from the raw header to keep the port.
  const trustProxy = req.app?.get("trust proxy");
  const forwardedHost = trustProxy
    ? (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim()
    : undefined;
  const host = forwardedHost || req.headers.host;
  if (!host) return null;
  return `${isSecureRequest(req) ? "https" : "http"}://${host.toLowerCase()}`;
}

export function normalizeOrigin(origin: string): string {
  try {
    const url = new URL(origin);
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch {
    return origin.trim().toLowerCase();
  }
}

// ---------------------------------------------------------------------------
// Headers + CSP
// ---------------------------------------------------------------------------

export type CspOptions = {
  frameAncestors: string;
  connectSrc: string[];
  forgeApiUrl?: string;
  supabaseUrls: string[];
};

function hostOnly(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function buildContentSecurityPolicy(options: CspOptions): string {
  const supabaseOrigins = options.supabaseUrls.map(hostOnly).filter((v): v is string => Boolean(v));
  const supabaseWs = supabaseOrigins.map(origin => origin.replace(/^https:/, "wss:"));
  const forgeOrigin = options.forgeApiUrl ? hostOnly(options.forgeApiUrl) : null;

  const connectSrc = new Set<string>([
    "'self'",
    ...supabaseOrigins,
    ...supabaseWs,
    // Instagram/Facebook Graph API is read directly from the browser.
    "https://graph.facebook.com",
    "https://graph.instagram.com",
    ...(forgeOrigin ? [forgeOrigin] : []),
    ...options.connectSrc.map(normalizeOrigin),
  ]);

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "frame-ancestors": [options.frameAncestors],
    "form-action": ["'self'"],
    // Vite emits external module scripts only; the Google Maps loader script
    // comes from the Forge proxy.
    "script-src": ["'self'", ...(forgeOrigin ? [forgeOrigin] : [])],
    // Recharts, Radix and the chart theme component rely on inline styles.
    "style-src": ["'self'", "'unsafe-inline'"],
    // Social thumbnails, Supabase storage, S3 redirects and the image proxy.
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:", "https:"],
    // Narration audio is fetched to a blob URL; S3 redirects for direct play.
    "media-src": ["'self'", "blob:", "https:"],
    "connect-src": Array.from(connectSrc),
    "worker-src": ["'self'", "blob:"],
    "frame-src": ["'self'", "https://drive.google.com", "https://www.youtube.com"],
    "manifest-src": ["'self'"],
    "upgrade-insecure-requests": [],
  };

  return Object.entries(directives)
    .map(([name, values]) => (values.length ? `${name} ${values.join(" ")}` : name))
    .join("; ");
}

export type SecurityHeadersOptions = {
  csp?: string;
  cspMode: "enforce" | "report-only" | "off";
  frameAncestors: string;
  isProduction: boolean;
};

export function securityHeaders(options: SecurityHeadersOptions): RequestHandler {
  const selfOnlyFrames = options.frameAncestors.trim() === "'self'";
  return (req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-DNS-Prefetch-Control", "off");
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), geolocation=(), microphone=(self), payment=(), usb=(), interest-cohort=()"
    );
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    if (selfOnlyFrames) res.setHeader("X-Frame-Options", "SAMEORIGIN");
    if (options.isProduction && isSecureRequest(req)) {
      res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
    }
    if (req.path.startsWith("/api/")) {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    }
    if (options.csp && options.cspMode !== "off") {
      res.setHeader(
        options.cspMode === "enforce" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only",
        options.csp
      );
    }
    next();
  };
}

// ---------------------------------------------------------------------------
// CORS + CSRF origin guard
// ---------------------------------------------------------------------------

export type OriginPolicyOptions = {
  allowedOrigins: string[];
  /** Only these path prefixes are guarded (default: /api). */
  pathPrefixes?: string[];
};

/**
 * Same-origin by default. Browsers only send `Origin` on cross-site requests
 * and on same-origin unsafe requests, so:
 *  - no Origin header  → server-to-server / cron / same-origin GET: allowed
 *  - Origin == own origin or in ALLOWED_ORIGINS → allowed (+ CORS headers)
 *  - anything else on POST/PUT/PATCH/DELETE → 403
 */
export function originPolicy(options: OriginPolicyOptions): RequestHandler {
  const allowed = new Set(options.allowedOrigins.map(normalizeOrigin));
  const prefixes = options.pathPrefixes ?? ["/api"];
  return (req, res, next) => {
    if (!prefixes.some(prefix => req.path === prefix || req.path.startsWith(`${prefix}/`))) return next();

    const origin = typeof req.headers.origin === "string" ? normalizeOrigin(req.headers.origin) : null;
    if (!origin || origin === "null") {
      if (origin === "null" && UNSAFE_METHODS.has(req.method)) {
        return res.status(403).json({ error: "Cross-site request blocked" });
      }
      return next();
    }

    const own = requestOrigin(req);
    const isAllowed = origin === own || allowed.has(origin);

    if (isAllowed && origin !== own) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Requested-With");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      res.setHeader("Access-Control-Max-Age", "600");
      res.setHeader("Vary", "Origin");
      if (req.method === "OPTIONS") return res.status(204).end();
    }

    if (!isAllowed) {
      if (req.method === "OPTIONS") return res.status(403).end();
      if (UNSAFE_METHODS.has(req.method)) {
        return res.status(403).json({ error: "Cross-site request blocked" });
      }
    }
    return next();
  };
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

export type RateLimitOptions = {
  windowMs: number;
  max: number;
  /** Extracts the bucket key; defaults to the client IP. */
  keyGenerator?: (req: Request) => string;
  /** Skip limiting for a request (e.g. authenticated cron callbacks). */
  skip?: (req: Request) => boolean;
  message?: string;
  /** Injectable clock for tests. */
  now?: () => number;
};

type Bucket = { count: number; resetAt: number };

export type RateLimiter = RequestHandler & { reset: () => void; size: () => number };

export function createRateLimiter(options: RateLimitOptions): RateLimiter {
  const buckets = new Map<string, Bucket>();
  const now = options.now ?? Date.now;
  const keyOf = options.keyGenerator ?? (req => req.ip || req.socket?.remoteAddress || "unknown");
  let sweepCounter = 0;

  const sweep = (ts: number) => {
    for (const [key, bucket] of buckets) if (bucket.resetAt <= ts) buckets.delete(key);
  };

  const middleware: RequestHandler = (req, res, next) => {
    if (options.skip?.(req)) return next();
    const ts = now();
    if (++sweepCounter % 500 === 0 || buckets.size > 50_000) sweep(ts);

    const key = keyOf(req);
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= ts) {
      bucket = { count: 0, resetAt: ts + options.windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;

    const remaining = Math.max(0, options.max - bucket.count);
    res.setHeader("RateLimit-Limit", String(options.max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil((bucket.resetAt - ts) / 1000)));

    if (bucket.count > options.max) {
      res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - ts) / 1000)));
      return res.status(429).json({ error: options.message ?? "Too many requests, try again later" });
    }
    return next();
  };

  return Object.assign(middleware, {
    reset: () => buckets.clear(),
    size: () => buckets.size,
  });
}

// ---------------------------------------------------------------------------
// Request id + audit log
// ---------------------------------------------------------------------------

export function requestId(): RequestHandler {
  return (req, res, next) => {
    const incoming = req.headers["x-request-id"];
    const id =
      typeof incoming === "string" && /^[A-Za-z0-9._-]{8,128}$/.test(incoming) ? incoming : randomUUID();
    res.locals.requestId = id;
    res.setHeader("X-Request-Id", id);
    next();
  };
}

/** Logs denied API requests (401/403/429) without tokens, bodies or query strings. */
export function auditDeniedRequests(log: (line: string) => void = line => console.warn(line)): RequestHandler {
  return (req, res, next) => {
    res.on("finish", () => {
      if (res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 429) {
        log(
          `[Security] ${res.statusCode} ${req.method} ${req.path} ip=${req.ip ?? "?"} id=${
            res.locals.requestId ?? "-"
          }`
        );
      }
    });
    next();
  };
}

// ---------------------------------------------------------------------------
// 404 for unknown API routes + final error handler
// ---------------------------------------------------------------------------

export function apiNotFound(): RequestHandler {
  return (req, res, next) => {
    if (req.path === "/api" || req.path.startsWith("/api/")) {
      return res.status(404).json({ error: "Not found" });
    }
    return next();
  };
}

type ErrorWithMeta = Error & { status?: number; statusCode?: number; type?: string; expose?: boolean };

export function errorHandler(log: (message: string, error: unknown) => void = (m, e) => console.error(m, e)) {
  return (error: unknown, req: Request, res: Response, _next: NextFunction) => {
    const err = (error ?? {}) as ErrorWithMeta;
    const status = Number(err.status ?? err.statusCode ?? 500);

    // body-parser / raw-body errors carry a `type` we can map without leaking.
    if (err.type === "entity.too.large") {
      return res.status(413).json({ error: "Request body too large" });
    }
    if (err.type === "entity.parse.failed" || err.type === "encoding.unsupported" || err.type === "charset.unsupported") {
      return res.status(400).json({ error: "Malformed request body" });
    }
    if (status >= 400 && status < 500) {
      return res.status(status).json({ error: err.expose === false ? "Request rejected" : err.message || "Request rejected" });
    }

    log(`[Server] Unhandled error on ${req.method} ${req.path} id=${res.locals.requestId ?? "-"}`, error);
    if (res.headersSent) return;
    return res.status(500).json({ error: "Internal server error" });
  };
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

const MINUTE = 60_000;

const AUTH_PATHS = ["/api/auth", "/api/oauth", "/api/trpc/auth."];
const EXPENSIVE_PATHS = [
  "/api/briefings/generate",
  "/api/campaigns/sync",
  "/api/social/followers/sync",
  "/api/trpc/system.notifyOwner",
];

const matchesPrefix = (req: Request, prefixes: string[]) =>
  prefixes.some(prefix => req.path === prefix || req.path.startsWith(prefix));

export type SecurityRegistration = {
  limiters: { api: RateLimiter; auth: RateLimiter; expensive: RateLimiter };
};

/**
 * Installs the security middlewares that must run before body parsing and
 * routing. Call `registerSecurityTail(app)` after the routes.
 */
export function registerSecurity(app: Express, env = ENV): SecurityRegistration {
  app.disable("x-powered-by");
  app.set("trust proxy", env.trustProxy);
  app.set("etag", false);

  app.use(requestId());
  app.use(auditDeniedRequests());
  app.use(
    securityHeaders({
      isProduction: env.isProduction,
      cspMode: env.cspMode,
      frameAncestors: env.allowedFrameAncestors,
      csp: buildContentSecurityPolicy({
        frameAncestors: env.allowedFrameAncestors,
        connectSrc: env.cspConnectSrc,
        forgeApiUrl: env.forgeApiUrl || undefined,
        supabaseUrls: [env.supabaseUrl, env.authSupabaseUrl],
      }),
    })
  );
  app.use(originPolicy({ allowedOrigins: env.allowedOrigins }));

  const skipAll = () => env.rateLimitDisabled;
  const limiters = {
    api: createRateLimiter({ windowMs: MINUTE, max: 300, skip: skipAll }),
    auth: createRateLimiter({
      windowMs: MINUTE,
      max: 60,
      skip: skipAll,
      message: "Too many authentication attempts, try again in a minute",
    }),
    expensive: createRateLimiter({
      windowMs: 10 * MINUTE,
      max: 10,
      skip: skipAll,
      message: "This operation is rate limited, try again later",
    }),
  };

  app.use("/api", limiters.api);
  app.use((req, res, next) => (matchesPrefix(req, AUTH_PATHS) ? limiters.auth(req, res, next) : next()));
  app.use((req, res, next) =>
    matchesPrefix(req, EXPENSIVE_PATHS) ? limiters.expensive(req, res, next) : next()
  );

  return { limiters };
}

/** Installs the API 404 handler; must come after every /api route. */
export function registerApiNotFound(app: Express) {
  app.use(apiNotFound());
}

/** Installs the final error handler; must be the last middleware. */
export function registerErrorHandler(app: Express) {
  app.use(errorHandler());
}
