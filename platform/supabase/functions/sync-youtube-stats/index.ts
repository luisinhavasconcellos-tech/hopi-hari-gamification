// Sync YouTube video stats (likes, comments, views) via YouTube Data API v3
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
    if (!YOUTUBE_API_KEY) throw new Error("YOUTUBE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch all video_ids from youtube_posts
    const { data: posts, error } = await supabase
      .from("youtube_posts")
      .select("id, video_id, post_url")
      .not("video_id", "is", null);
    if (error) throw error;

    // Fallback: extract video_id from post_url if missing
    const extractId = (url: string | null): string | null => {
      if (!url) return null;
      const m = url.match(/(?:v=|\/shorts\/|youtu\.be\/)([A-Za-z0-9_-]{11})/);
      return m?.[1] ?? null;
    };

    const items = (posts ?? [])
      .map((p: any) => ({ id: p.id, video_id: p.video_id || extractId(p.post_url) }))
      .filter((p) => p.video_id);

    const uniqueIds = Array.from(new Set(items.map((p) => p.video_id as string)));
    const statsMap = new Map<string, { likes: number; comments: number; views: number }>();

    // YouTube Data API allows up to 50 ids per call
    for (let i = 0; i < uniqueIds.length; i += 50) {
      const batch = uniqueIds.slice(i, i + 50).join(",");
      const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${batch}&key=${YOUTUBE_API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`YouTube API ${res.status}: ${txt}`);
      }
      const json = await res.json();
      for (const v of json.items ?? []) {
        statsMap.set(v.id, {
          likes: Number(v.statistics?.likeCount ?? 0),
          comments: Number(v.statistics?.commentCount ?? 0),
          views: Number(v.statistics?.viewCount ?? 0),
        });
      }
    }

    let updated = 0;
    let missing = 0;
    for (const p of items) {
      const s = statsMap.get(p.video_id as string);
      if (!s) { missing++; continue; }
      const { error: upErr } = await supabase
        .from("youtube_posts")
        .update({
          like_count: s.likes,
          comments_count: s.comments,
          view_count: s.views,
          scraped_at: new Date().toISOString(),
          scrape_status: "scraped",
        })
        .eq("id", p.id);
      if (!upErr) updated++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_posts: items.length,
        unique_videos: uniqueIds.length,
        updated,
        missing,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
