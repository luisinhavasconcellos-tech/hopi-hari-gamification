import type { Express, Request } from "express";
import { ApiAuthError, authenticateApprovedSupabaseUser } from "../lib/supabaseAuth";
import { ENV } from "./env";
import { sdk } from "./sdk";

const MAX_KEY_LENGTH = 512;
// Letters, digits, dot, dash, underscore and forward slashes only. Rejects
// path traversal, backslashes, control characters and encoded tricks.
const KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9._-]+)*$/;

export function isValidStorageKey(key: string): boolean {
  if (!key || key.length > MAX_KEY_LENGTH) return false;
  if (!KEY_PATTERN.test(key)) return false;
  return !key.split("/").some(segment => segment === "." || segment === "..");
}

/**
 * Top-level objects (logo, fonts, login artwork) are public brand assets and
 * must load on the sign-in page. Anything stored under a directory (daily
 * briefing narrations, generated images, imports) requires a signed-in,
 * approved user unless the prefix is explicitly listed in
 * PUBLIC_STORAGE_PREFIXES.
 */
export function isPublicStorageKey(key: string, publicPrefixes: string[] = ENV.publicStoragePrefixes): boolean {
  if (!key.includes("/")) return true;
  return publicPrefixes.some(prefix => prefix && key.startsWith(prefix));
}

async function isAuthenticated(req: Request): Promise<boolean> {
  try {
    await authenticateApprovedSupabaseUser(req);
    return true;
  } catch (error) {
    if (!(error instanceof ApiAuthError) || error.status === 503) return false;
  }
  try {
    await sdk.authenticateRequest(req);
    return true;
  } catch {
    return false;
  }
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!isValidStorageKey(key)) {
      res.status(400).send("Invalid storage key");
      return;
    }

    if (!isPublicStorageKey(key) && !(await isAuthenticated(req))) {
      res.status(401).send("Authentication required");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
        signal: AbortSignal.timeout(15_000),
      });

      if (!forgeResp.ok) {
        console.error(`[StorageProxy] forge error: ${forgeResp.status}`);
        res.status(forgeResp.status === 404 ? 404 : 502).send(
          forgeResp.status === 404 ? "Not found" : "Storage backend error"
        );
        return;
      }

      const { url } = (await forgeResp.json()) as { url?: string };
      if (!url || !/^https:\/\//i.test(url)) {
        res.status(502).send("Invalid signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
