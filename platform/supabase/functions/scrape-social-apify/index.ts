// Generic social scraper — dispatches to the right Apify actor by platform.
// Body: { platform: "tiktok" | "linkedin" | "facebook", onlyPending?: boolean, limit?: number }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Platform = "tiktok" | "linkedin" | "facebook" | "youtube" | "x";

const TABLES: Record<Platform, string> = {
  tiktok: "tiktok_posts",
  linkedin: "linkedin_posts",
  facebook: "facebook_posts",
  youtube: "youtube_posts",
  x: "x_posts",
};

// Public Apify actors that accept a list of URLs.
const ACTORS: Record<Platform, string> = {
  tiktok: "clockworks~tiktok-scraper",
  linkedin: "apimaestro~linkedin-post-detail",
  // Handles individual post / reel / share URLs.
  facebook: "apify~facebook-posts-scraper",
  youtube: "streamers~youtube-scraper",
  // Tweet detail scraper (accepts tweet URLs)
  x: "apidojo~tweet-scraper",
};

const toInt = (v: unknown) => {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : parseInt(String(v).replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
};

const cleanUrl = (u: string) => u.split("?")[0].replace(/\/$/, "") + "/";

function buildInput(platform: Platform, urls: string[]) {
  switch (platform) {
    case "tiktok":
      return {
        postURLs: urls,
        resultsPerPage: 1,
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
        shouldDownloadSubtitles: false,
        shouldDownloadSlideshowImages: false,
      };
    case "linkedin":
      return { post_urls: urls };
    case "facebook":
      return { startUrls: urls.map((url) => ({ url })), resultsLimit: Math.max(urls.length, 5) };
    case "youtube":
      return { startUrls: urls.map((url) => ({ url })), maxResults: 1, downloadSubtitles: false };
    case "x":
      return {
        tweetIDs: urls
          .map((u) => u.match(/status\/(\d+)/)?.[1])
          .filter(Boolean),
        maxItems: urls.length,
      };
  }
}

function normalize(platform: Platform, item: any) {
  if (platform === "tiktok") {
    return {
      url: item.webVideoUrl ?? item.url,
      shortcode: item.id ?? null,
      media_type: "VIDEO",
      caption: item.text ?? null,
      thumbnail_url: item.videoMeta?.coverUrl ?? item.covers?.[0] ?? null,
      media_url: item.videoMeta?.downloadAddr ?? null,
      like_count: toInt(item.diggCount),
      comments_count: toInt(item.commentCount),
      share_count: toInt(item.shareCount),
      view_count: toInt(item.playCount),
      timestamp: item.createTimeISO ?? (item.createTime ? new Date(item.createTime * 1000).toISOString() : null),
      owner_username: item.authorMeta?.name ?? null,
    };
  }
  if (platform === "linkedin") {
    const post = item.post ?? item;
    const stats = item.stats ?? {};
    const media = (item.media ?? [])[0] ?? {};
    const ts = post.created_at?.timestamp
      ? new Date(post.created_at.timestamp).toISOString()
      : (post.created_at?.date ? new Date(post.created_at.date).toISOString() : (item.posted_at ?? item.published_at ?? null));
    return {
      url: post.url ?? item.url ?? item.input ?? null,
      shortcode: post.urn?.activity_urn ?? post.id ?? item.urn ?? null,
      media_type: (post.type ?? "post").toString().toUpperCase(),
      caption: post.text ?? item.text ?? item.commentary ?? null,
      thumbnail_url: media.thumbnail ?? item.image_url ?? item.thumbnail ?? null,
      media_url: media.video_url ?? media.url ?? item.video_url ?? item.image_url ?? null,
      like_count: toInt(stats.total_reactions ?? item.likes ?? item.num_likes ?? item.reactions?.total),
      comments_count: toInt(stats.comments ?? item.comments ?? item.num_comments),
      share_count: toInt(stats.shares ?? item.shares ?? item.reposts ?? 0),
      view_count: toInt(stats.views ?? item.views ?? item.num_views),
      timestamp: ts,
      owner_username: item.author?.name ?? item.author_name ?? null,
    };
  }
  if (platform === "facebook") {
    const att0 = item.attachments?.[0] ?? {};
    const m0 = item.media?.[0] ?? att0.media ?? {};
    const sfvc = item.short_form_video_context ?? {};
    const playback = sfvc.playback_video ?? {};
    const preferredThumb =
      m0.preferred_thumbnail?.image?.uri ??
      m0.thumbnailImage?.uri ??
      m0.image?.uri ??
      playback.preferred_thumbnail?.image?.uri ??
      playback.thumbnailImage?.uri ??
      m0.thumbnail ?? m0.thumbnailUrl ??
      item.thumbnailUrl ?? item.previewImage ?? item.image ?? null;
    const isVideo =
      m0.__typename === "Video" || !!item.video || !!playback.id ||
      !!item.videoUrl || !!item.video_url ||
      /reel|video|fb\.watch/.test(item.url ?? item.postUrl ?? item.facebookUrl ?? "");
    const ct = item.creation_time ?? item.publishTime ?? item.createdTime;
    const tsIso =
      typeof ct === "number" ? new Date(ct * 1000).toISOString() :
      (item.time ?? item.publishedAt ?? item.timestamp ?? null);
    return {
      url: item.facebookUrl ?? item.url ?? item.postUrl ?? item.topLevelUrl,
      shortcode: item.post_id ?? item.postId ?? item.facebookId ?? item.id ?? item.legacyId ?? null,
      media_type: isVideo ? "VIDEO" : "POST",
      caption: item.message ?? item.text ?? item.postText ?? item.title ?? null,
      thumbnail_url: preferredThumb,
      media_url:
        playback.videoDeliveryLegacyFields?.browser_native_hd_url ??
        playback.videoDeliveryLegacyFields?.browser_native_sd_url ??
        m0.url ?? m0.videoUrl ?? item.videoUrl ?? item.video_url ?? null,
      like_count: toInt(
        item.unified_reactors?.count ?? item.likers?.count ??
        item.likes ?? item.likesCount ?? item.reactionsCount ??
        item.reactions?.total ?? item.reactionCount,
      ),
      comments_count: toInt(item.total_comment_count ?? item.comments ?? item.commentsCount ?? item.commentCount),
      share_count: toInt(item.share_count_reduced ?? item.shares ?? item.sharesCount ?? item.shareCount),
      view_count: toInt(
        playback.play_count ?? item.video?.play_count ??
        item.viewsCount ?? item.videoViewCount ?? item.viewCount ?? item.videoPlayCount,
      ),
      timestamp: tsIso,
      owner_username: item.pageName ?? item.user?.name ?? item.author?.name ?? item.ownerName ?? null,
    };
  }
  if (platform === "x") {
    const id = item.id_str ?? item.id ?? item.tweet_id ?? null;
    const handle = item.author?.userName ?? item.author?.screen_name ?? item.user?.screen_name ?? "hopihari";
    const media0 = (item.extendedEntities?.media ?? item.entities?.media ?? item.media ?? [])[0] ?? {};
    return {
      url: item.url ?? item.twitterUrl ?? (id ? `https://x.com/${handle}/status/${id}` : null),
      shortcode: id ? String(id) : null,
      media_type: media0.type ? String(media0.type).toUpperCase() : "TWEET",
      caption: item.text ?? item.full_text ?? item.fullText ?? null,
      thumbnail_url: media0.media_url_https ?? media0.media_url ?? null,
      media_url: media0.video_info?.variants?.[0]?.url ?? media0.media_url_https ?? null,
      like_count: toInt(item.likeCount ?? item.favorite_count ?? item.favoriteCount),
      comments_count: toInt(item.replyCount ?? item.reply_count),
      share_count: toInt(item.retweetCount ?? item.retweet_count) + toInt(item.quoteCount ?? item.quote_count),
      view_count: toInt(item.viewCount ?? item.views ?? item.view_count),
      timestamp: item.createdAt ? new Date(item.createdAt).toISOString() : (item.created_at ? new Date(item.created_at).toISOString() : null),
      owner_username: handle,
    };
  }
  // youtube
  return {
    url: item.url ?? item.videoUrl,
    shortcode: item.id ?? item.videoId ?? null,
    media_type: "VIDEO",
    caption: item.title ? `${item.title}\n\n${item.text ?? item.description ?? ""}`.trim() : (item.text ?? item.description ?? null),
    thumbnail_url: item.thumbnailUrl ?? item.thumbnail ?? null,
    media_url: item.url ?? null,
    like_count: toInt(item.likes ?? item.likeCount),
    comments_count: toInt(item.commentsCount ?? item.numberOfComments),
    share_count: 0,
    view_count: toInt(item.viewCount ?? item.views),
    timestamp: item.date ?? item.uploadDate ?? item.publishedAt ?? null,
    owner_username: item.channelName ?? item.author ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const TOKEN = Deno.env.get("APIFY_TOKEN");
    if (!TOKEN) throw new Error("APIFY_TOKEN not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Keep batches small so we finish under the 150s edge-function idle timeout.
    // YouTube/Facebook are slow — default to 10 per call.
    const { platform, onlyPending = true, limit = 10 } = await req.json().catch(() => ({}));
    if (!platform || !(platform in TABLES)) {
      throw new Error("platform must be tiktok | linkedin | facebook | youtube | x");
    }
    const table = TABLES[platform as Platform];
    const actor = ACTORS[platform as Platform];

    const query = supabase.from(table).select("id,post_url,shortcode");
    if (onlyPending) query.eq("scrape_status", "pending");
    const { data: posts, error: fErr } = await query.limit(limit);
    if (fErr) throw fErr;
    if (!posts?.length) {
      return new Response(JSON.stringify({ success: true, message: "No pending posts", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // X (Twitter): Apify actors return no data on this account, so use Firecrawl's
    // x-twitter postprocessor, which yields author, date, text, likes and retweets.
    if (platform === "x") {
      const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
      if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");
      let updated = 0;
      const failures: string[] = [];

      for (const p of posts as any[]) {
        try {
          let r = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${FIRECRAWL_API_KEY}` },
            body: JSON.stringify({ url: p.post_url.replace(/\/$/, ""), formats: ["markdown"] }),
          });
          if (r.status === 429) {
            await new Promise((res) => setTimeout(res, 12000));
            r = await fetch("https://api.firecrawl.dev/v1/scrape", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${FIRECRAWL_API_KEY}` },
              body: JSON.stringify({ url: p.post_url.replace(/\/$/, ""), formats: ["markdown"] }),
            });
          }
          const j = await r.json();
          const md: string = j?.data?.markdown ?? "";
          if (!r.ok || !md) {
            failures.push(`${p.post_url}: firecrawl ${r.status}`);
            continue;
          }
          const author = md.match(/Author:\s*(.+?)\s*@([\w.]+)/);
          const posted = md.match(/Posted:\s*([0-9\\\-T:.]+Z)/)?.[1]?.replace(/\\/g, "") ?? null;
          const likes = toInt(md.match(/Likes:\s*([\d.,]+)/)?.[1]);
          const rts = toInt(md.match(/Retweets:\s*([\d.,]+)/)?.[1]);
          const replies = toInt(md.match(/Replies:\s*([\d.,]+)/)?.[1]);
          const views = toInt(md.match(/Views:\s*([\d.,]+)/)?.[1]);
          const body = md.split(/##\s*Post\s*\n/)[1]?.split(/\n##\s/)[0]?.trim() ?? null;

          const { error } = await supabase
            .from("x_posts")
            .update({
              media_type: "TWEET",
              caption: body,
              like_count: likes,
              comments_count: replies,
              share_count: rts,
              view_count: views,
              timestamp: posted,
              owner_username: author?.[2] ?? "hopihari",
              scrape_status: "scraped",
              scraped_at: new Date().toISOString(),
              raw_data: { markdown: md },
            })
            .eq("id", p.id);
          if (error) failures.push(`${p.post_url}: ${error.message}`);
          else updated++;
        } catch (e) {
          failures.push(`${p.post_url}: ${e instanceof Error ? e.message : String(e)}`);
        }
        await new Promise((res) => setTimeout(res, 1500));
      }

      return new Response(
        JSON.stringify({ success: true, platform, requested: posts.length, updated, failures: failures.slice(0, 20) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const directUrls = posts.map((p: any) => p.post_url);
    const input = buildInput(platform as Platform, directUrls);


    // Apify timeout in seconds — must be well under the 150s edge function idle limit.
    const runUrl = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${TOKEN}&timeout=120`;
    const apifyRes = await fetch(runUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!apifyRes.ok) {
      const txt = await apifyRes.text();
      if (apifyRes.status === 402 || txt.includes("not-enough-usage-to-run-paid-actor")) {
        return new Response(JSON.stringify({
          success: false,
          code: "apify_quota_exceeded",
          error: "Créditos do Apify esgotados. Recarregue/atualize o plano em console.apify.com/billing para voltar a coletar posts.",
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`Apify ${apifyRes.status}: ${txt.slice(0, 300)}`);
    }


    const items = (await apifyRes.json()) as any[];
    let updated = 0;
    const failures: string[] = [];

    for (const item of items) {
      // Skip Apify error items (e.g. "no_items", "Empty or private data")
      if (item?.error) {
        failures.push(`${item.url ?? "?"}: ${item.error}${item.errorDescription ? ` (${item.errorDescription})` : ""}`);
        continue;
      }
      const norm = normalize(platform as Platform, item);
      if (!norm.url) continue;
      const url = cleanUrl(norm.url);

      const orParts = [`post_url.eq.${url}`];
      if (norm.shortcode) orParts.push(`shortcode.eq.${norm.shortcode}`);

      const { data: existing } = await supabase
        .from(table)
        .select("id")
        .or(orParts.join(","))
        .limit(1)
        .maybeSingle();

      const update = {
        shortcode: norm.shortcode,
        media_type: norm.media_type,
        caption: norm.caption,
        thumbnail_url: norm.thumbnail_url,
        media_url: norm.media_url,
        like_count: norm.like_count,
        comments_count: norm.comments_count,
        share_count: norm.share_count,
        view_count: norm.view_count,
        timestamp: norm.timestamp,
        owner_username: norm.owner_username,
        scrape_status: "scraped",
        scraped_at: new Date().toISOString(),
        raw_data: item as Record<string, unknown>,
      };

      if (existing) {
        const { error } = await supabase.from(table).update(update).eq("id", existing.id);
        if (error) failures.push(`${url}: ${error.message}`);
        else updated++;
      } else {
        // Apify (esp. Facebook) returns posts from the page that don't match the input URL list.
        // Insert them so the data is captured instead of dropping it.
        const { error } = await supabase.from(table).insert({ post_url: url, ...update });
        if (error) failures.push(`${url}: ${error.message}`);
        else updated++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      platform,
      requested: directUrls.length,
      scraped: items.length,
      updated,
      failures: failures.slice(0, 20),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("scrape-social-apify error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
