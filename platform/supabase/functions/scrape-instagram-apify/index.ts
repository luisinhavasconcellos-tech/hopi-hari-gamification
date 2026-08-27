// Scrapes Instagram posts/reels via Apify's apify/instagram-scraper actor (sync run).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ACTOR = "apify~instagram-scraper";

interface ApifyItem {
  url?: string;
  inputUrl?: string;
  shortCode?: string;
  shortcode?: string;
  type?: string; // "Image" | "Video" | "Sidecar"
  productType?: string; // "clips" => reel
  caption?: string;
  displayUrl?: string;
  videoUrl?: string;
  likesCount?: number;
  commentsCount?: number;
  videoViewCount?: number;
  videoPlayCount?: number;
  playCount?: number;
  viewCount?: number;
  views?: number;
  viewsCount?: number;
  shareCount?: number;
  sharesCount?: number;
  shares?: number;
  reposts?: number;
  timestamp?: string;
  ownerUsername?: string;
}

const toInt = (v: unknown) => {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : parseInt(String(v).replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
};

const normType = (item: ApifyItem) => {
  const t = (item.type ?? "").toLowerCase();
  if (item.productType === "clips" || t.includes("video")) return "VIDEO";
  if (t.includes("sidecar") || t.includes("carousel") || t.includes("album")) return "CAROUSEL_ALBUM";
  return "IMAGE";
};

const cleanUrl = (url: string) => url.split("?")[0].replace(/\/$/, "") + "/";

const shortcodeFromUrl = (url?: string | null) => {
  if (!url) return null;
  return url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/)?.[1] ?? null;
};

const firstPresentInt = (...values: unknown[]) => {
  const present = values.find((v) => v != null && String(v).trim() !== "");
  return present == null ? null : toInt(present);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const APIFY_TOKEN = Deno.env.get("APIFY_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const missing = [
      !APIFY_TOKEN && "APIFY_TOKEN",
      !SUPABASE_URL && "SUPABASE_URL",
      !SERVICE_ROLE && "SUPABASE_SERVICE_ROLE_KEY",
    ].filter(Boolean);

    if (missing.length) {
      return new Response(
        JSON.stringify({ success: false, error: `Missing env vars: ${missing.join(", ")}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE!);

    const { onlyPending = true, limit = 200 } = await req.json().catch(() => ({}));

    let query = supabase.from("instagram_posts").select("id,post_url,shortcode,share_count");
    if (onlyPending) query = query.eq("scrape_status", "pending");
    const { data: posts, error: fErr } = await query.limit(limit);
    if (fErr) throw fErr;

    if (!posts?.length) {
      return new Response(
        JSON.stringify({
          success: true,
          done: true,
          requested: 0,
          scraped: 0,
          updated: 0,
          failed: 0,
          failures: [],
          message: "No pending posts",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const directUrls = posts.map((p) => p.post_url);
    const byUrl = new Map(posts.map((p) => [cleanUrl(p.post_url), p]));
    const byCode = new Map(
      posts
        .map((p) => [p.shortcode ?? shortcodeFromUrl(p.post_url), p] as const)
        .filter(([code]) => !!code) as Array<readonly [string, typeof posts[number]]>,
    );

    console.log(`[scrape-instagram-apify] sending ${directUrls.length} URLs to Apify`);

    const runUrl = `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=300`;
    const input = {
      directUrls,
      resultsType: "posts",
      resultsLimit: directUrls.length,
      addParentData: false,
    };

    const apifyRes = await fetch(runUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!apifyRes.ok) {
      const txt = await apifyRes.text();
      console.error(`[scrape-instagram-apify] Apify ${apifyRes.status}: ${txt.slice(0, 300)}`);
      throw new Error(`Apify ${apifyRes.status}: ${txt.slice(0, 300)}`);
    }

    const items = (await apifyRes.json()) as ApifyItem[];
    console.log(`[scrape-instagram-apify] Apify returned ${Array.isArray(items) ? items.length : 0} items`);

    let updated = 0;
    const failures: string[] = [];
    const matchedIds = new Set<string>();

    for (const item of Array.isArray(items) ? items : []) {
      const raw = item.url ?? item.inputUrl;
      if (!raw) continue;
      const url = cleanUrl(raw);
      const code =
        item.shortCode ?? item.shortcode ?? shortcodeFromUrl(url) ?? shortcodeFromUrl(item.inputUrl);
      const existing = byUrl.get(url) ?? (code ? byCode.get(code) : undefined);

      if (!existing) {
        console.warn(`[scrape-instagram-apify] no matching row for ${url}`);
        failures.push(`${url}: no matching row`);
        continue;
      }

      const shareCount = firstPresentInt(item.shareCount, item.sharesCount, item.shares, item.reposts);
      const viewCount = firstPresentInt(
        item.videoPlayCount,
        item.playCount,
        item.videoViewCount,
        item.viewCount,
        item.viewsCount,
        item.views,
      );

      const update = {
        shortcode: code,
        media_type: normType(item),
        caption: item.caption ?? null,
        thumbnail_url: item.displayUrl ?? null,
        media_url: item.videoUrl ?? item.displayUrl ?? null,
        like_count: toInt(item.likesCount),
        comments_count: toInt(item.commentsCount),
        share_count: shareCount ?? existing.share_count ?? null,
        view_count: viewCount,
        timestamp: item.timestamp ?? null,
        owner_username: item.ownerUsername ?? null,
        scrape_status: "scraped",
        scraped_at: new Date().toISOString(),
        error_message: null,
        raw_data: item as unknown as Record<string, unknown>,
      };

      const { error } = await supabase.from("instagram_posts").update(update).eq("id", existing.id);
      if (error) {
        console.error(`[scrape-instagram-apify] update error for ${url}: ${error.message}`);
        failures.push(`${url}: ${error.message}`);
        // Registra o erro na linha sem tocar em raw_data.
        const { error: markErr } = await supabase
          .from("instagram_posts")
          .update({
            scrape_status: "failed",
            scraped_at: new Date().toISOString(),
            error_message: `Erro ao atualizar: ${error.message}`.slice(0, 500),
          })
          .eq("id", existing.id);
        if (markErr) console.error(`[scrape-instagram-apify] mark error failed: ${markErr.message}`);
      } else {
        updated++;
        matchedIds.add(existing.id);
      }
    }

    // Mark every requested row Apify did not return (or failed to update) as failed.
    const unmatched = posts.filter((p) => !matchedIds.has(p.id));
    let failed = 0;
    if (unmatched.length) {
      console.warn(`[scrape-instagram-apify] ${unmatched.length} rows without results -> failed`);
      const { error } = await supabase
        .from("instagram_posts")
        .update({
          scrape_status: "failed",
          scraped_at: new Date().toISOString(),
          error_message: "Apify não retornou resultado correspondente para esta URL",
        })
        .in("id", unmatched.map((p) => p.id))
        .neq("scrape_status", "scraped");
      if (error) {
        console.error(`[scrape-instagram-apify] failed-marking error: ${error.message}`);
        failures.push(`mark failed: ${error.message}`);
      } else {
        failed = unmatched.length;
      }
    }


    return new Response(
      JSON.stringify({
        success: true,
        done: true,
        requested: directUrls.length,
        scraped: Array.isArray(items) ? items.length : 0,
        updated,
        failed,
        failures: failures.slice(0, 20),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("scrape-instagram-apify error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
