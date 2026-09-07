/**
 * Central place for every environment variable the server reads.
 *
 * Nothing here should throw at import time (tests and tooling import modules
 * that depend on ENV without a configured environment). `validateEnv()` is
 * called once from the server entrypoint and is the only place that fails
 * fast on a misconfiguration.
 */

const csv = (value: string | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map(part => part.trim())
    .filter(Boolean);

const isProduction = process.env.NODE_ENV === "production";

type SameSite = "lax" | "strict" | "none";
const parseSameSite = (value: string | undefined): SameSite => {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "none" || normalized === "strict" || normalized === "lax") return normalized;
  // Lax blocks cross-site POSTs from carrying the session cookie (CSRF) while
  // still allowing top-level navigations such as the OAuth redirect back to "/".
  return "lax";
};

type CspMode = "enforce" | "report-only" | "off";
const parseCspMode = (value: string | undefined): CspMode => {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "enforce" || normalized === "report-only" || normalized === "off") return normalized;
  // Vite's dev server needs inline/eval scripts for HMR, so the policy is only
  // enforced by default on production builds.
  return isProduction ? "enforce" : "off";
};

/**
 * Express `trust proxy` setting. Production deployments sit behind exactly one
 * reverse proxy (gateway/load balancer) by default; set TRUST_PROXY=false when
 * exposing the Node process directly, or to a hop count / CIDR list otherwise.
 */
const parseTrustProxy = (value: string | undefined): boolean | number | string => {
  if (value === undefined || value === "") return isProduction ? 1 : false;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  if (/^\d+$/.test(normalized)) return Number(normalized);
  return value.trim();
};

// Supabase "anon"/publishable keys are public by design (they ship in the
// browser bundle) and only grant what Row Level Security allows. They still
// live here so the server has exactly one copy of each value.
const DEFAULT_SUPABASE_URL = "https://ylduczowjvbtxixvakxx.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsZHVjem93anZidHhpeHZha3h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMzY5OTMsImV4cCI6MjA5MTgxMjk5M30.w2oKqIYXi6ZlxLLNOoxOPHSYylvZYrgDaYWTsz-zzFo";
const DEFAULT_AUTH_SUPABASE_URL = "https://afqidjbyfrhtxheenhhp.supabase.co";
const DEFAULT_AUTH_SUPABASE_ANON_KEY = "sb_publishable_xZJHFC98c2Zf7WBcdSEV5g_bAGW8iSb";

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction,
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",

  // --- Supabase (data project + auth project) ---
  supabaseUrl: process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY,
  authSupabaseUrl: process.env.AUTH_SUPABASE_URL || DEFAULT_AUTH_SUPABASE_URL,
  authSupabaseAnonKey: process.env.AUTH_SUPABASE_ANON_KEY || DEFAULT_AUTH_SUPABASE_ANON_KEY,

  // --- Security layer ---
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  sessionCookieSameSite: parseSameSite(process.env.SESSION_COOKIE_SAME_SITE),
  /** Extra browser origins allowed to call the API (CORS + CSRF origin guard). */
  allowedOrigins: csv(process.env.ALLOWED_ORIGINS),
  /** CSP frame-ancestors source list, e.g. "'self' https://editor.example.com". */
  allowedFrameAncestors: (process.env.ALLOWED_FRAME_ANCESTORS ?? "'self'").trim() || "'self'",
  cspMode: parseCspMode(process.env.CSP_MODE),
  /** Additional connect-src hosts (comma separated) merged into the CSP. */
  cspConnectSrc: csv(process.env.CSP_CONNECT_SRC),
  rateLimitDisabled: process.env.RATE_LIMIT_DISABLED === "true",
  /** Default JSON/urlencoded body limit. Large uploads get route-level limits. */
  bodyLimit: (process.env.BODY_LIMIT ?? "1mb").trim() || "1mb",
  /** Storage keys under these prefixes can be fetched without a session. */
  publicStoragePrefixes: csv(process.env.PUBLIC_STORAGE_PREFIXES ?? "public/"),
};

export type Env = typeof ENV;

const MIN_SECRET_LENGTH = 16;
const RECOMMENDED_SECRET_LENGTH = 32;

/**
 * Validates the runtime configuration. Returns human-readable warnings and
 * throws on anything that would make production unsafe to start.
 */
export function validateEnv(env: Env = ENV): string[] {
  const warnings: string[] = [];
  const fatal: string[] = [];

  if (env.isProduction) {
    if (!env.databaseUrl) fatal.push("DATABASE_URL is required in production.");
    if (!env.cookieSecret) {
      fatal.push("JWT_SECRET is required in production (it signs session cookies).");
    } else if (env.cookieSecret.length < MIN_SECRET_LENGTH) {
      fatal.push(`JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters.`);
    } else if (env.cookieSecret.length < RECOMMENDED_SECRET_LENGTH) {
      warnings.push(`JWT_SECRET is shorter than ${RECOMMENDED_SECRET_LENGTH} characters; rotate to a longer random value.`);
    }
    if (env.sessionCookieSameSite === "none") {
      warnings.push("SESSION_COOKIE_SAME_SITE=none disables CSRF protection for the session cookie; only use it for embedded (iframe) deployments.");
    }
    if (env.cspMode !== "enforce") {
      warnings.push(`CSP_MODE=${env.cspMode}: the Content-Security-Policy is not enforced.`);
    }
    if (env.rateLimitDisabled) warnings.push("RATE_LIMIT_DISABLED=true: API rate limiting is off.");
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    warnings.push("SUPABASE_URL / SUPABASE_ANON_KEY not set; using the built-in defaults for the data project.");
  }
  if (!process.env.AUTH_SUPABASE_URL || !process.env.AUTH_SUPABASE_ANON_KEY) {
    warnings.push("AUTH_SUPABASE_URL / AUTH_SUPABASE_ANON_KEY not set; using the built-in defaults for the auth project.");
  }
  for (const origin of env.allowedOrigins) {
    if (!/^https?:\/\/[^/\s]+$/.test(origin)) {
      fatal.push(`ALLOWED_ORIGINS entry "${origin}" must be an origin (scheme://host[:port]) without a path.`);
    }
  }

  if (fatal.length > 0) {
    throw new Error(`Invalid server configuration:\n - ${fatal.join("\n - ")}`);
  }
  return warnings;
}
