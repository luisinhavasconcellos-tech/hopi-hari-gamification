import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabaseFetchAll";

export type XPost = {
  id: string;
  post_url: string;
  shortcode: string | null;
  caption: string | null;
  like_count: number | null;
  comments_count: number | null;
  share_count: number | null;
  view_count: number | null;
  timestamp: string | null;
  owner_username: string | null;
  scrape_status: string | null;
};

export function useXPosts() {
  const [posts, setPosts] = useState<XPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { rows } = await fetchAllRows<XPost>((from, to) =>
      supabase
        .from("x_posts")
        .select("id,post_url,shortcode,caption,like_count,comments_count,share_count,view_count,timestamp,owner_username,scrape_status")
        .order("timestamp", { ascending: false, nullsFirst: false })
        .order("id")
        .range(from, to),
    );
    setPosts(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const scrape = useCallback(async () => {
    setScraping(true);
    const { data, error } = await supabase.functions.invoke("scrape-social-apify", {
      body: { platform: "x", limit: 6 },
    });
    setScraping(false);
    await load();
    const failed = data && (data as { success?: boolean }).success === false;
    return { error: error?.message ?? (failed ? (data as { error?: string }).error ?? null : null) };
  }, [load]);


  const totals = useMemo(() => {
    const scraped = posts.filter((p) => p.scrape_status === "scraped");
    const sum = (k: keyof XPost) => scraped.reduce((a, p) => a + (Number(p[k]) || 0), 0);
    const likes = sum("like_count");
    const rts = sum("share_count");
    const replies = sum("comments_count");
    const views = sum("view_count");
    return {
      total: posts.length,
      scraped: scraped.length,
      pending: posts.length - scraped.length,
      likes,
      rts,
      replies,
      views,
      engagement: likes + rts + replies,
      avgEngagement: scraped.length ? (likes + rts + replies) / scraped.length : 0,
    };
  }, [posts]);

  return { posts, totals, loading, scraping, scrape, reload: load };
}
