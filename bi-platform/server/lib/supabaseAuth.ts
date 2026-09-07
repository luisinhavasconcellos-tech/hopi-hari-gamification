import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Request } from "express";
import { ENV } from "../_core/env";
import { getOrCreatePlatformAccess } from "../db";

export class ApiAuthError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiAuthError";
  }
}

let authClient: SupabaseClient | null = null;

/** Lazily created, shared client: no session state is kept, so one instance is safe. */
function getAuthClient(): SupabaseClient {
  if (!authClient) {
    authClient = createClient(ENV.authSupabaseUrl, ENV.authSupabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return authClient;
}

export function extractBearerToken(req: Request): string {
  const authorization = req.headers.authorization;
  if (typeof authorization !== "string") return "";
  const [scheme, ...rest] = authorization.trim().split(/\s+/);
  if (!scheme || scheme.toLowerCase() !== "bearer") return "";
  return rest.join("").trim();
}

export async function resolveSupabaseUserAccess(req: Request) {
  const token = extractBearerToken(req);
  if (!token) throw new ApiAuthError(401, "Authentication required");

  const { data: userData, error: userError } = await getAuthClient().auth.getUser(token);
  if (userError || !userData.user) throw new ApiAuthError(401, "Invalid or expired session");
  const email = userData.user.email?.trim().toLowerCase();
  if (!email) throw new ApiAuthError(403, "An email address is required");
  const fullName =
    typeof userData.user.user_metadata?.full_name === "string"
      ? userData.user.user_metadata.full_name
      : null;

  let access: Awaited<ReturnType<typeof getOrCreatePlatformAccess>>;
  try {
    access = await getOrCreatePlatformAccess(email, fullName);
  } catch (error) {
    console.error("[Auth] platform access lookup failed", error);
    throw new ApiAuthError(503, "Unable to verify platform access");
  }
  if (!access) throw new ApiAuthError(503, "Unable to verify platform access");

  return {
    id: userData.user.id,
    email,
    status: access.status,
    role: access.role,
  } as const;
}

export async function authenticateApprovedSupabaseUser(req: Request) {
  const access = await resolveSupabaseUserAccess(req);
  if (access.status !== "approved") throw new ApiAuthError(403, "Account approval required");
  return access;
}
