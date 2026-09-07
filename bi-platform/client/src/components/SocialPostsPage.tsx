import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { proxyImage } from "@/lib/imageProxy";
import { engagementRate, formatER, sentimentColor, sentimentEmoji, type ERMode } from "@/lib/engagement";
import WeeklyProgress from "@/components/WeeklyProgress";
import AdvancedKPIs from "@/components/AdvancedKPIs";
import DailyInsights from "@/components/DailyInsights";
import FollowerGrowth from "@/components/FollowerGrowth";
import AIAnalysisPanel from "@/components/AIAnalysisPanel";
import { fetchFollowerCount } from "@/lib/followers";

// Sincronização automática da planilha (edge function) no máximo 1x a cada 10 min por aba do navegador.
const SHEET_SYNC_INTERVAL_MS = 10 * 60 * 1000;
const shouldAutoSync = (key: string) => {
  try {
    const last = Number(sessionStorage.getItem(key) ?? 0);
    return !last || Date.now() - last > SHEET_SYNC_INTERVAL_MS;
  } catch {
    return true;
  }
};
const markSynced = (key: string) => {
  try { sessionStorage.setItem(key, String(Date.now())); } catch { /* sessionStorage indisponível */ }
};

export type SocialPlatform = "tiktok" | "linkedin" | "facebook" | "youtube";

const TABLES = {
  tiktok: "tiktok_posts",
  linkedin: "linkedin_posts",
  facebook: "facebook_posts",
  youtube: "youtube_posts",
} as const;

const LABELS: Record<SocialPlatform, { name: string; emoji: string }> = {
  tiktok: { name: "TikTok", emoji: "" },
  linkedin: { name: "LinkedIn", emoji: "" },
  facebook: { name: "Facebook", emoji: "" },
  youtube: { name: "YouTube", emoji: "▶" },
};

type Sort = "recent" | "likes" | "comments" | "views" | "shares" | "er";

interface PostRow {
  id: string;
  post_url: string;
  shortcode: string | null;
  media_type: string | null;
  caption: string | null;
  thumbnail_url: string | null;
  like_count: number;
  comments_count: number;
  share_count: number | null;
  view_count: number | null;
  timestamp: string | null;
  scrape_status: string;
  owner_username: string | null;
  ai_analysis: any | null;
}

const isProcessedStatus = (status: string | null | undefined) =>
  status === "scraped" || status === "success" || status === "completed";

export default function SocialPostsPage({ platform }: { platform: SocialPlatform }) {
  const { toast } = useToast();
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<Sort>("recent");
  const [scraping, setScraping] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [erMode, setErMode] = useState<ERMode>("auto");
  const [followers, setFollowers] = useState<number>(0);
  const [editingFollowers, setEditingFollowers] = useState(false);
  const [followersDraft, setFollowersDraft] = useState("");

  const meta = LABELS[platform];
  const syncKey = `sheet-sync-at:${platform}`;
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const loadPosts = async () => {
    const { data, error } = await supabase
      .from(TABLES[platform])
      .select("id,post_url,shortcode,media_type,caption,thumbnail_url,like_count,comments_count,share_count,view_count,timestamp,scrape_status,owner_username,ai_analysis")
      .order("timestamp", { ascending: false, nullsFirst: false });
    if (!alive.current) return;
    if (error) {
      toast({ title: "Erro ao carregar posts", description: error.message, variant: "destructive" });
    } else {
      setPosts((data ?? []) as PostRow[]);
    }
    setLoading(false);
  };

  const loadFollowers = async () => {
    const n = await fetchFollowerCount(platform);
    if (alive.current) setFollowers(n);
  };

  const saveFollowers = async () => {
    const n = parseInt(followersDraft.replace(/\D/g, ""), 10) || 0;
    const { error } = await supabase.from("platform_settings").upsert({ platform, follower_count: n, updated_at: new Date().toISOString() });
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      setFollowers(n);
      setEditingFollowers(false);
      toast({ title: "Seguidores atualizados" });
    }
  };

  const syncSheet = async (silent = false) => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-sheet-posts", { body: {} });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? "Falha");
      markSynced(syncKey);
      if (!alive.current) return;
      const platformResult = data.byPlatform?.[platform];
      if (!silent || (platformResult?.inserted ?? 0) > 0) {
        toast({
          title: "Planilha sincronizada",
          description: `${platformResult?.found ?? 0} links de ${meta.name} • ${platformResult?.inserted ?? 0} novos`,
        });
      }
      await loadPosts();
    } catch (e) {
      if (alive.current) toast({ title: "Erro ao sincronizar planilha", description: e instanceof Error ? e.message : "Falha", variant: "destructive" });
    }
    if (alive.current) setSyncing(false);
  };

  const runSentiment = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-sentiment", {
        body: { platform, onlyMissing: true, limit: 30 },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? "Falha");
      toast({ title: "Sentimento analisado", description: `${data.updated ?? 0} posts atualizados` });
      await loadPosts();
    } catch (e) {
      toast({ title: "Erro na análise", description: e instanceof Error ? e.message : "Falha", variant: "destructive" });
    }
    setAnalyzing(false);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadPosts(), loadFollowers()]);
      if (alive.current && shouldAutoSync(syncKey)) await syncSheet(true);
    })();
    /* eslint-disable-next-line */
  }, [platform]);

  const stats = useMemo(() => ({
    total: posts.length,
    scraped: posts.filter((p) => isProcessedStatus(p.scrape_status)).length,
    pending: posts.filter((p) => p.scrape_status === "pending").length,
    missingSentiment: posts.filter((p) => isProcessedStatus(p.scrape_status) && !p.ai_analysis?.sentiment).length,
  }), [posts]);

  const erFor = (p: PostRow) =>
    engagementRate(erMode, {
      likes: p.like_count,
      comments: p.comments_count,
      shares: p.share_count,
      views: p.view_count,
      followers,
      mediaType: p.media_type,
    });

  const filtered = posts
    .filter((p) => (showPending ? p.scrape_status === "pending" : true))
    .sort((a, b) => {
      if (sort === "likes") return (b.like_count ?? 0) - (a.like_count ?? 0);
      if (sort === "comments") return (b.comments_count ?? 0) - (a.comments_count ?? 0);
      if (sort === "views") return (b.view_count ?? 0) - (a.view_count ?? 0);
      if (sort === "shares") return (b.share_count ?? 0) - (a.share_count ?? 0);
      if (sort === "er") return (erFor(b) ?? -1) - (erFor(a) ?? -1);
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tb - ta;
    });

  const launchScrape = async () => {
    setScraping(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-social-apify", {
        body: { platform, onlyPending: true },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? "Falha");
      toast({ title: "Coleta concluída", description: `${data.updated}/${data.scraped} posts atualizados` });
      await loadPosts();
    } catch (e) {
      toast({ title: "Erro na coleta", description: e instanceof Error ? e.message : "Falha", variant: "destructive" });
    }
    setScraping(false);
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Posts do {meta.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {stats.total} posts • <span className="text-success">{stats.scraped} processados</span> •{" "}
            <span className="text-warning">{stats.pending} pendentes</span>
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button onClick={() => syncSheet(false)} disabled={syncing} className="px-4 py-2 rounded-xl text-xs font-semibold bg-card border border-border text-foreground hover:bg-muted transition-all disabled:opacity-50">
            {syncing ? "Sincronizando..." : "Sincronizar planilha"}
          </button>
          <button onClick={runSentiment} disabled={analyzing || stats.missingSentiment === 0} className="px-4 py-2 rounded-xl text-xs font-semibold bg-card border border-border text-foreground hover:bg-muted transition-all disabled:opacity-50">
            {analyzing ? "Analisando..." : `Analisar sentimento (${stats.missingSentiment})`}
          </button>
          <button onClick={launchScrape} disabled={scraping || stats.pending === 0} className="px-4 py-2 rounded-xl text-xs font-semibold gradient-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2">
            {scraping ? (<><div className="w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />Coletando...</>) : (<>Coletar dados ({stats.pending})</>)}
          </button>
        </div>
      </div>

      {/* ER controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3 p-3 rounded-xl bg-card border border-border">
        <span className="text-xs font-semibold text-muted-foreground uppercase">Engagement Rate</span>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button onClick={() => setErMode("auto")} className={`px-3 py-1 text-xs rounded-md transition-all ${erMode === "auto" ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground"}`} title="Vídeos/Reels: por views • Fotos/Carrosséis: por seguidores">Auto por mídia</button>
          <button onClick={() => setErMode("followers")} className={`px-3 py-1 text-xs rounded-md transition-all ${erMode === "followers" ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground"}`}>Por seguidores</button>
          <button onClick={() => setErMode("views")} className={`px-3 py-1 text-xs rounded-md transition-all ${erMode === "views" ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground"}`}>Por views</button>
        </div>
        {erMode === "auto" && (
          <span className="text-[10px] text-muted-foreground italic">Vídeos usam views; demais usam seguidores</span>
        )}
        {(erMode === "followers" || erMode === "auto") && (
          editingFollowers ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={followersDraft}
                onChange={(e) => setFollowersDraft(e.target.value)}
                placeholder="ex: 120000"
                className="px-2 py-1 text-xs rounded-md border border-border bg-background w-32"
                autoFocus
              />
              <button onClick={saveFollowers} className="px-2 py-1 text-xs rounded-md gradient-primary text-primary-foreground">Salvar</button>
              <button onClick={() => setEditingFollowers(false)} className="px-2 py-1 text-xs text-muted-foreground">Cancelar</button>
            </div>
          ) : (
            <button onClick={() => { setFollowersDraft(String(followers || "")); setEditingFollowers(true); }} className="text-xs text-foreground hover:text-primary transition-colors">
              {followers > 0 ? <><strong>{followers.toLocaleString("pt-BR")}</strong> seguidores</> : <span className="text-warning">Definir nº de seguidores →</span>}
            </button>
          )
        )}
      </div>

      <div className="mb-6 flex gap-2 flex-wrap">
        <button onClick={() => setShowPending(false)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!showPending ? "bg-primary/20 text-primary border border-primary/30" : "bg-card text-muted-foreground border border-border hover:text-foreground"}`}>Todos</button>
        <button onClick={() => setShowPending(true)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${showPending ? "bg-primary/20 text-primary border border-primary/30" : "bg-card text-muted-foreground border border-border hover:text-foreground"}`}>Pendentes</button>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="px-3 py-1.5 rounded-lg text-xs bg-card border border-border text-muted-foreground focus:outline-none ml-auto">
          <option value="recent">Mais Recentes</option>
          <option value="er">Maior Engagement Rate</option>
          <option value="likes">Mais Curtidas</option>
          <option value="comments">Mais Comentários</option>
          <option value="views">Mais Visualizações</option>
          <option value="shares">Mais Compartilhamentos</option>
        </select>
      </div>

      <WeeklyProgress posts={posts.filter((p) => isProcessedStatus(p.scrape_status))} />

      <FollowerGrowth platform={platform} currentFollowers={followers} />

      <DailyInsights
        platform={platform === "linkedin" ? "linkedin" : platform}
        posts={posts.filter((p) => isProcessedStatus(p.scrape_status))}
        followers={followers}
      />

      <AdvancedKPIs
        platform={platform === "linkedin" ? "linkedin" : platform}
        posts={posts.filter((p) => isProcessedStatus(p.scrape_status))}
        followers={followers}
      />

      <div className="mb-6">
        <AIAnalysisPanel
          platform={platform === "linkedin" ? "linkedin" : platform}
          title={`Análise IA — ${meta.name}`}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (<div key={i} className="aspect-square rounded-xl bg-card animate-pulse" />))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Nenhum post encontrado. Clique em <strong>Sincronizar planilha</strong> para importar links.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((post) => {
            const isPending = post.scrape_status === "pending";
            const er = erFor(post);
            const sentiment = post.ai_analysis?.sentiment as string | undefined;
            return (
              <a key={post.id} href={post.post_url} target="_blank" rel="noreferrer" className="group relative aspect-square rounded-xl overflow-hidden border border-border hover:border-primary/40 transition-all duration-200 bg-card">
                {post.thumbnail_url ? (
                  <img
                    src={platform === "tiktok" ? post.thumbnail_url : (proxyImage(post.thumbnail_url) ?? post.thumbnail_url)}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    alt=""
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (post.thumbnail_url && img.src !== post.thumbnail_url) img.src = post.thumbnail_url;
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-3">
                    <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center mb-2"><span className="text-[10px] font-semibold text-muted-foreground">{meta.name.slice(0, 2)}</span></div>
                    <p className="text-[10px] text-muted-foreground font-mono break-all">{post.shortcode ?? post.post_url.slice(-20)}</p>
                    <span className="mt-2 text-[9px] text-warning uppercase font-semibold">{isPending ? "Aguardando dados" : "Sem mídia"}</span>
                  </div>
                )}

                {/* Top-left badges: ER + sentiment */}
                {!isPending && (
                  <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                    {er != null && (
                      <span className="text-[10px] font-bold bg-primary/90 text-primary-foreground px-1.5 py-0.5 rounded-md shadow-sm">
                        ER {formatER(er)}
                      </span>
                    )}
                    {sentiment && (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${sentimentColor(sentiment)}`}>
                        {sentimentEmoji(sentiment)} {sentiment === "positive" ? "Positivo" : sentiment === "negative" ? "Negativo" : "Neutro"}
                      </span>
                    )}
                  </div>
                )}

                {!isPending && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200">
                      <p className="text-xs text-foreground line-clamp-2 mb-2">{post.caption?.slice(0, 80) ?? "Sem legenda"}</p>
                      {post.ai_analysis?.summary && (
                        <p className="text-[10px] text-muted-foreground italic line-clamp-2 mb-2">{post.ai_analysis.summary}</p>
                      )}
                      <div className="flex flex-wrap gap-2 text-[11px] text-foreground font-semibold">
                        <span>{post.like_count.toLocaleString("pt-BR")}</span>
                        <span>{post.comments_count.toLocaleString("pt-BR")}</span>
                        {post.view_count ? <span>{post.view_count.toLocaleString("pt-BR")}</span> : null}
                        {post.share_count ? <span>{post.share_count.toLocaleString("pt-BR")}</span> : null}
                      </div>
                    </div>
                  </>
                )}

                {post.timestamp && (
                  <div className="absolute top-2 right-2 text-[10px] text-foreground bg-background/60 px-1.5 py-0.5 rounded-md">
                    {new Date(post.timestamp).toLocaleDateString("pt-BR")}
                  </div>
                )}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
