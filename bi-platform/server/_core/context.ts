import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { User } from "../../drizzle/schema";
import { authenticateApprovedSupabaseUser } from "../lib/supabaseAuth";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

function hasSessionCookie(req: CreateExpressContextOptions["req"]): boolean {
  const header = req.headers.cookie;
  if (!header) return false;
  return Boolean(parseCookieHeader(header)[COOKIE_NAME]);
}

function hasBearerToken(req: CreateExpressContextOptions["req"]): boolean {
  const header = req.headers.authorization;
  return typeof header === "string" && header.startsWith("Bearer ") && header.length > 7;
}

async function supabaseUser(req: CreateExpressContextOptions["req"]): Promise<User | null> {
  try {
    const access = await authenticateApprovedSupabaseUser(req);
    const now = new Date();
    return {
      id: -1,
      openId: `supabase:${access.id}`,
      name: access.email,
      email: access.email,
      loginMethod: "supabase",
      role: access.role === "admin" ? "admin" : "user",
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    };
  } catch {
    return null;
  }
}

async function cookieOrBearerSessionUser(req: CreateExpressContextOptions["req"]): Promise<User | null> {
  try {
    return await sdk.authenticateRequest(req);
  } catch {
    return null;
  }
}

/**
 * Resolves the caller for tRPC procedures.
 *
 * Two authentication methods coexist: the Supabase access token sent as a
 * Bearer header by the web client (primary) and the signed session cookie
 * issued by the OAuth callback (legacy / preview). Anonymous callers get
 * `user: null`; procedures decide whether that is acceptable.
 */
export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;

  if (hasSessionCookie(opts.req)) {
    user = await cookieOrBearerSessionUser(opts.req);
  }
  if (!user && hasBearerToken(opts.req)) {
    user = (await supabaseUser(opts.req)) ?? (await cookieOrBearerSessionUser(opts.req));
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
