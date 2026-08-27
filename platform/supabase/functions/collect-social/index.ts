// collect-social — coleta perfis e amostra de posts dos concorrentes via Apify
// (Instagram + TikTok). Alimenta os snapshots de seguidores e o engajamento
// que vale 43% do score composto do ranking semanal.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function runActor(actorId: string, input: unknown): Promise<any[]> {
  const url =
    `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items` +
    `?token=${Deno.env.get("APIFY_TOKEN")}&timeout=300`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Apify ${actorId} ${res.status}: ${await res.text()}`);
  return await res.json();
}

const avg = (ns: number[]) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const report: Record<string, unknown> = {};
  try {
    if (!Deno.env.get("APIFY_TOKEN")) throw new Error("APIFY_TOKEN não configurado");

    // Modo diagnóstico: confere candidatos de @ sem gravar nada no banco.
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    if (Array.isArray(body?.probe_instagram) && body.probe_instagram.length) {
      const items = await runActor("apify~instagram-profile-scraper", {
        usernames: body.probe_instagram,
        resultsLimit: 1,
      });
      return json({
        ok: true,
        probe: items.map((i: any) => ({
          username: i.username,
          fullName: i.fullName,
          followers: Number(i.followersCount ?? 0),
          verified: Boolean(i.verified),
        })),
      });
    }


    const { data: competitors, error } = await supabase
      .from("ci_competitors")
      .select("id, slug, instagram, tiktok")
      .eq("active", true);
    if (error) throw error;

    const snapshots: any[] = [];
    const posts: any[] = [];
    const errors: string[] = [];

    // ---------- INSTAGRAM ----------
    const igHandles = competitors!.filter((c) => c.instagram);
    if (igHandles.length) {
      try {
        const igItems = await runActor("apify~instagram-profile-scraper", {
          usernames: igHandles.map((c) => c.instagram),
          resultsLimit: 12,
        });

        for (const item of igItems) {
          const comp = igHandles.find(
            (c) => c.instagram?.toLowerCase() === item.username?.toLowerCase(),
          );
          if (!comp) continue;

          const latest = (item.latestPosts ?? []).slice(0, 12);
          const followers = Number(item.followersCount ?? 0);
          const avgLikes = avg(latest.map((p: any) => Number(p.likesCount ?? 0)));
          const avgComments = avg(latest.map((p: any) => Number(p.commentsCount ?? 0)));

          snapshots.push({
            competitor_id: comp.id,
            platform: "instagram",
            followers,
            posts_count: Number(item.postsCount ?? 0),
            avg_likes: avgLikes,
            avg_comments: avgComments,
            engagement_rate: followers ? (avgLikes + avgComments) / followers : 0,
            raw: { username: item.username, fullName: item.fullName },
          });

          for (const p of latest) {
            const externalId = String(p.id ?? p.shortCode ?? "");
            if (!externalId) continue;
            posts.push({
              competitor_id: comp.id,
              platform: "instagram",
              external_id: externalId,
              posted_at: p.timestamp ?? null,
              caption: (p.caption ?? "").slice(0, 2000),
              likes: Number(p.likesCount ?? 0),
              comments: Number(p.commentsCount ?? 0),
              views: p.videoViewCount ? Number(p.videoViewCount) : null,
              url: p.url ?? null,
            });
          }
        }
        report.instagram_profiles = snapshots.length;
      } catch (e) {
        errors.push(`instagram: ${String(e)}`);
      }
    }

    // ---------- TIKTOK ----------
    const ttHandles = competitors!.filter((c) => c.tiktok);
    if (ttHandles.length) {
      try {
        const ttItems = await runActor("clockworks~tiktok-scraper", {
          profiles: ttHandles.map((c) => c.tiktok),
          resultsPerPage: 10,
          shouldDownloadVideos: false,
          shouldDownloadCovers: false,
        });

        const byAuthor = new Map<string, any[]>();
        for (const v of ttItems) {
          const name = v.authorMeta?.name?.toLowerCase();
          if (!name) continue;
          if (!byAuthor.has(name)) byAuthor.set(name, []);
          byAuthor.get(name)!.push(v);
        }

        let ttCount = 0;
        for (const comp of ttHandles) {
          const vids = byAuthor.get(comp.tiktok!.toLowerCase()) ?? [];
          if (!vids.length) continue;
          ttCount++;
          const followers = Number(vids[0].authorMeta?.fans ?? 0);
          const avgLikes = avg(vids.map((v: any) => Number(v.diggCount ?? 0)));
          const avgComments = avg(vids.map((v: any) => Number(v.commentCount ?? 0)));

          snapshots.push({
            competitor_id: comp.id,
            platform: "tiktok",
            followers,
            posts_count: Number(vids[0].authorMeta?.video ?? vids.length),
            avg_likes: avgLikes,
            avg_comments: avgComments,
            engagement_rate: followers ? (avgLikes + avgComments) / followers : 0,
            raw: { handle: comp.tiktok },
          });

          for (const v of vids) {
            if (!v.id) continue;
            posts.push({
              competitor_id: comp.id,
              platform: "tiktok",
              external_id: String(v.id),
              posted_at: v.createTimeISO ?? null,
              caption: (v.text ?? "").slice(0, 2000),
              likes: Number(v.diggCount ?? 0),
              comments: Number(v.commentCount ?? 0),
              views: Number(v.playCount ?? 0),
              url: v.webVideoUrl ?? null,
            });
          }
        }
        report.tiktok_profiles = ttCount;
      } catch (e) {
        errors.push(`tiktok: ${String(e)}`);
      }
    }

    if (snapshots.length) {
      const { error: snapErr } = await supabase.from("ci_social_snapshots").insert(snapshots);
      if (snapErr) throw snapErr;
    }
    if (posts.length) {
      const { error: postErr } = await supabase
        .from("ci_posts")
        .upsert(posts, { onConflict: "platform,external_id" });
      if (postErr) throw postErr;
    }

    report.snapshots = snapshots.length;
    report.posts = posts.length;
    return json({ ok: snapshots.length > 0, errors, ...report });
  } catch (e) {
    console.error("collect-social", e);
    return json({ ok: false, error: String(e), ...report }, 500);
  }
});
