// Provider factory — chooses the X data source via the X_PROVIDER env var.
// X_PROVIDER = "x_official" | "twitterapi_io" | "auto" (default)
import { XProvider } from "../types.ts";
import { xOfficial } from "./xOfficial.ts";
import { twitterApiIo } from "./twitterApiIo.ts";

export const PROVIDERS: XProvider[] = [twitterApiIo, xOfficial];

export function getXProvider(): XProvider | null {
  const wanted = (Deno.env.get("X_PROVIDER") ?? "auto").trim().toLowerCase();
  if (wanted !== "auto") {
    const p = PROVIDERS.find((x) => x.id === wanted);
    if (!p) throw new Error(`X_PROVIDER inválido: ${wanted}`);
    return p.isConfigured() ? p : null;
  }
  return PROVIDERS.find((p) => p.isConfigured()) ?? null;
}

export { xOfficial, twitterApiIo };
export type { XProvider };
