// Reads social post URLs from Google Sheets and upserts into per-platform tables.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHEET_ID = "1bdFZDsqJ_-g__ZsMRcTPswbCzP90FAfKwin7m6Gf9uo";
const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

const cleanUrl = (u: string) => u.split("?")[0].replace(/\/$/, "") + "/";

type Platform = "instagram" | "tiktok" | "linkedin" | "facebook" | "youtube" | "x";

const TABLES: Record<Platform, string> = {
  instagram: "instagram_posts",
  tiktok: "tiktok_posts",
  linkedin: "linkedin_posts",
  facebook: "facebook_posts",
  youtube: "youtube_posts",
  x: "x_posts",
};

function detect(url: string): { platform: Platform; shortcode: string | null } | null {
  // Instagram
  let m = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  if (m) return { platform: "instagram", shortcode: m[1] };
  // TikTok video
  m = url.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/) || url.match(/tiktok\.com\/.*\/video\/(\d+)/);
  if (m) return { platform: "tiktok", shortcode: m[1] };
  if (/(?:vm|vt)\.tiktok\.com\/([A-Za-z0-9]+)/.test(url)) {
    const sc = url.match(/(?:vm|vt)\.tiktok\.com\/([A-Za-z0-9]+)/)![1];
    return { platform: "tiktok", shortcode: sc };
  }
  // LinkedIn
  m = url.match(/linkedin\.com\/(?:posts|feed\/update)\/([\w:%-]+)/);
  if (m) return { platform: "linkedin", shortcode: m[1] };
  // YouTube
  m = url.match(/youtube\.com\/watch\?v=([\w-]+)/) || url.match(/youtu\.be\/([\w-]+)/) || url.match(/youtube\.com\/shorts\/([\w-]+)/);
  if (m) return { platform: "youtube", shortcode: m[1] };
  // X / Twitter
  m = url.match(/(?:twitter|x)\.com\/[\w.]+\/status\/(\d+)/);
  if (m) return { platform: "x", shortcode: m[1] };
  // Facebook
  if (/facebook\.com|fb\.watch/.test(url)) {
    const sc =
      url.match(/\/posts\/([^\/?#]+)/)?.[1] ||
      url.match(/\/videos\/(\d+)/)?.[1] ||
      url.match(/\/reel\/(\d+)/)?.[1] ||
      url.match(/fb\.watch\/([^\/?#]+)/)?.[1] ||
      url.match(/story_fbid=([\w.]+)/)?.[1] ||
      null;
    return { platform: "facebook", shortcode: sc };
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_SHEETS_API_KEY = Deno.env.get("GOOGLE_SHEETS_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!GOOGLE_SHEETS_API_KEY) throw new Error("GOOGLE_SHEETS_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const sheetsHeaders = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GOOGLE_SHEETS_API_KEY,
    };

    // Fetch with retry/backoff for 429s
    const fetchSheets = async (url: string, attempts = 4): Promise<Response> => {
      let lastRes: Response | null = null;
      for (let i = 0; i < attempts; i++) {
        const res = await fetch(url, { headers: sheetsHeaders });
        if (res.status !== 429) return res;
        lastRes = res;
        const wait = 1500 * Math.pow(2, i); // 1.5s, 3s, 6s, 12s
        await new Promise((r) => setTimeout(r, wait));
      }
      return lastRes!;
    };

    // Get first sheet name (Sheet1 may not exist; e.g. "Página1")
    const metaRes = await fetchSheets(`${GATEWAY}/spreadsheets/${SHEET_ID}?fields=sheets.properties.title`);
    if (!metaRes.ok) {
      const t = await metaRes.text();
      const transient = metaRes.status === 429 || metaRes.status >= 500;
      if (transient) {
        return new Response(
          JSON.stringify({
            success: true,
            skipped: true,
            reason: metaRes.status === 429 ? "rate_limited" : "upstream_unavailable",
            message: metaRes.status === 429
              ? "Google Sheets API rate limit reached. Tente novamente em alguns instantes."
              : `Google Sheets temporariamente indisponível (${metaRes.status}). Tente novamente em instantes.`,
            found: 0,
            inserted: 0,
            byPlatform: {},
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Sheets meta ${metaRes.status}: ${t.slice(0, 200)}`);
    }
    const meta = await metaRes.json() as { sheets?: { properties?: { title?: string } }[] };
    const sheetTitles = (meta.sheets ?? []).map((s) => s.properties?.title).filter(Boolean) as string[];
    if (sheetTitles.length === 0) throw new Error("No sheet found in spreadsheet");

    const values: string[][] = [];
    for (const title of sheetTitles) {
      const range = `${title}!A1:Z2000`;
      const r = await fetchSheets(`${GATEWAY}/spreadsheets/${SHEET_ID}/values/${range}`);
      if (!r.ok) {
        console.warn(`Sheet "${title}" failed: ${r.status}`);
        continue;
      }
      const j = (await r.json()) as { values?: string[][] };
      if (j.values) values.push(...j.values);
    }

    // Group by platform
    const byPlatform: Record<Platform, Map<string, string | null>> = {
      instagram: new Map(),
      tiktok: new Map(),
      linkedin: new Map(),
      facebook: new Map(),
      youtube: new Map(),
      x: new Map(),
    };

    for (const row of values) {
      for (const cell of row) {
        if (typeof cell !== "string") continue;
        const trimmed = cell.trim();
        if (!/^https?:\/\//.test(trimmed)) continue;
        const det = detect(trimmed);
        if (!det) continue;
        const url = cleanUrl(trimmed);
        if (!byPlatform[det.platform].has(url)) byPlatform[det.platform].set(url, det.shortcode);
      }
    }

    const result: Record<string, { found: number; inserted: number }> = {};

    for (const platform of Object.keys(byPlatform) as Platform[]) {
      const map = byPlatform[platform];
      result[platform] = { found: map.size, inserted: 0 };
      if (map.size === 0) continue;

      const table = TABLES[platform];

      // Fetch existing rows in pages (avoid building giant .or() filters -> URL too long)
      const existing: Array<{ post_url: string; shortcode: string | null }> = [];
      const PAGE = 1000;
      for (let from = 0; ; from += PAGE) {
        const { data, error: exErr } = await supabase
          .from(table)
          .select("post_url,shortcode")
          .range(from, from + PAGE - 1);
        if (exErr) throw new Error(`${table}: ${exErr.message}`);
        existing.push(...((data ?? []) as any));
        if (!data || data.length < PAGE) break;
      }

      const existingUrls = new Set(existing.map((r) => r.post_url));
      const existingShortcodes = new Set(existing.map((r) => r.shortcode).filter(Boolean));


      const toInsert: Array<{ post_url: string; shortcode: string | null; scrape_status: string }> = [];
      for (const [url, sc] of map) {
        if (existingUrls.has(url)) continue;
        if (sc && existingShortcodes.has(sc)) continue;
        toInsert.push({ post_url: url, shortcode: sc, scrape_status: "pending" });
      }

      if (toInsert.length) {
        const { error: insErr, count } = await supabase
          .from(table)
          .insert(toInsert, { count: "exact" });
        if (insErr) throw new Error(`${table}: ${insErr.message}`);
        result[platform].inserted = count ?? toInsert.length;
      }
    }

    const totals = Object.values(result).reduce(
      (acc, r) => ({ found: acc.found + r.found, inserted: acc.inserted + r.inserted }),
      { found: 0, inserted: 0 }
    );

    return new Response(
      JSON.stringify({ success: true, ...totals, byPlatform: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("sync-sheet-posts error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
