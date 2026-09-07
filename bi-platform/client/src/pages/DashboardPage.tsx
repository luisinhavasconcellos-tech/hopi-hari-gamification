import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { loadInstagramAccount } from "@/lib/realAccount";
import type { IGAccountMetrics, IGMedia } from "@/lib/instagram";
import { supabase } from "@/integrations/supabase/client";
import { proxyImage } from "@/lib/imageProxy";
import AIAnalysisPanel from "@/components/AIAnalysisPanel";
import GoalProgressChart from "@/components/GoalProgressChart";
import ContentFormatsPanel from "@/components/ContentFormatsPanel";
import { fetchFollowerCount } from "@/lib/followers";
import { Heart, MessageCircle } from "lucide-react";
import OperationalPulse from "@/components/OperationalPulse";
import TiktokMetricsPanel from "@/components/TiktokMetricsPanel";
import SocialComparisonPanel from "@/components/SocialComparisonPanel";
import Weekly360PdfButton from "@/components/Weekly360PdfButton";
import HoraDoHorrorRegistryPanel from "@/components/HoraDoHorrorRegistryPanel";

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 border ${accent ? "bg-primary/5 border-primary/20" : "bg-card border-border"}`}>
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [account, setAccount] = useState<IGAccountMetrics | null>(null);
  const [insights, setInsights] = useState<Record<string, number>>({});
  const [posts, setPosts] = useState<IGMedia[]>([]);
  const [erPosts, setErPosts] = useState<Array<{ like_count: number; comments_count: number; view_count: number | null }>>([]);
  const [followersOverride, setFollowersOverride] = useState<number | null>(null);
  const [growth, setGrowth] = useState<Array<{ date: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const real = await loadInstagramAccount(30);
        setAccount(real.account);
        setInsights(real.insights);
        setGrowth(real.growth);
        // Always load real posts from DB
        const { data: dbPosts } = await supabase
          .from("instagram_posts")
          .select("id,shortcode,post_url,thumbnail_url,caption,like_count,comments_count,media_type,timestamp")
          .eq("scrape_status", "scraped")
          .order("timestamp", { ascending: false, nullsFirst: false })
          .limit(6);
        setPosts(
          (dbPosts ?? []).map((p: any) => ({
            id: p.id,
            caption: p.caption ?? "",
            media_type: (p.media_type ?? "IMAGE") as IGMedia["media_type"],
            media_url: p.thumbnail_url ?? "",
            thumbnail_url: p.thumbnail_url ?? "",
            timestamp: p.timestamp ?? new Date().toISOString(),
            permalink: p.post_url,
            like_count: p.like_count ?? 0,
            comments_count: p.comments_count ?? 0,
          }))
        );

        // Larger sample for ER calc (last 30)
        const { data: erRows } = await supabase
          .from("instagram_posts")
          .select("like_count,comments_count,view_count")
          .eq("scrape_status", "scraped")
          .order("timestamp", { ascending: false, nullsFirst: false })
          .limit(30);
        setErPosts((erRows ?? []) as any);

        // Fonte única de seguidores (log diário oficial, com fallback no cadastro manual)
        const igFollowers = await fetchFollowerCount("instagram");
        if (igFollowers) setFollowersOverride(igFollowers);
      } catch (err) {
        console.error("Dashboard load failed:", err);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const followers = followersOverride ?? account?.followers_count ?? 0;
  const erSample = erPosts.length ? erPosts : posts.map(p => ({ like_count: p.like_count, comments_count: p.comments_count, view_count: null }));
  const avgLikes = erSample.reduce((s, p) => s + (p.like_count ?? 0), 0) / (erSample.length || 1);
  const avgComments = erSample.reduce((s, p) => s + (p.comments_count ?? 0), 0) / (erSample.length || 1);
  // ER by followers: avg interactions per post / followers (Instagram has no shares)
  const engRateFollowers = followers > 0 ? ((avgLikes + avgComments) / followers) * 100 : 0;
  // ER by views: avg interactions / avg views (only posts with views)
  const withViews = erSample.filter(p => (p.view_count ?? 0) > 0);
  const avgViews = withViews.length ? withViews.reduce((s, p) => s + (p.view_count ?? 0), 0) / withViews.length : 0;
  const engRateViews = avgViews > 0 ? ((avgLikes + avgComments) / avgViews) * 100 : 0;
  const fmtER = (v: number) => v >= 10 ? v.toFixed(1) : v.toFixed(2);
  const growthDelta = growth.length > 1 ? growth.at(-1)!.count - growth[0].count : 0;

  return (
    <div id="dashboard-metrics-report" className="min-h-screen p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          {account?.profile_picture_url && (
            <img src={account.profile_picture_url} alt="" className="w-12 h-12 rounded-full border-2 border-primary/30 object-cover" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">@{account?.username}</h1>
            <p className="text-muted-foreground text-sm">{account?.biography?.split("\n")[0]}</p>
          </div>
        </div>
        <Weekly360PdfButton />
      </div>

      <OperationalPulse />
      <TiktokMetricsPanel />
      <SocialComparisonPanel />
      <HoraDoHorrorRegistryPanel />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Seguidores"
          value={followers >= 1e6 ? `${(followers / 1e6).toFixed(2)}M` : followers.toLocaleString("pt-BR")}
          sub={`${growthDelta >= 0 ? "+" : ""}${growthDelta.toLocaleString("pt-BR")} em 30 dias`}
          accent
        />
        <StatCard
          label="Engagement Rate"
          value={`${fmtER(engRateFollowers)}%`}
          sub={`por seguidor • ${engRateViews > 0 ? `${fmtER(engRateViews)}% por views` : `${erSample.length} posts`}`}
        />
        <StatCard
          label="Alcance Mensal"
          value={
            insights.reach
              ? insights.reach >= 1e6
                ? `${(insights.reach / 1e6).toFixed(1)}M`
                : insights.reach.toLocaleString("pt-BR")
              : "Indisponível"
          }
          sub={insights.reach ? "usuários únicos" : "requer Meta Insights conectado"}
        />
        <StatCard
          label="Visitas ao Perfil"
          value={insights.profile_views ? insights.profile_views.toLocaleString("pt-BR") : "Indisponível"}
          sub={insights.profile_views ? "este mês" : "requer Meta Insights conectado"}
        />
      </div>

      <div className="mb-8">
        <GoalProgressChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Growth Chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Crescimento de Seguidores — 30 dias</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={growth}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => v.slice(5)} interval="preserveStartEnd" />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                width={56}
                domain={["auto", "auto"]}
                tickFormatter={(v: number) =>
                  v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : `${(v / 1000).toFixed(1)}k`
                }
              />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12, color: "hsl(var(--popover-foreground))" }}
                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                itemStyle={{ color: "hsl(var(--primary))" }}
                formatter={(v: number) => [v.toLocaleString("pt-BR"), "Seguidores"]}
              />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "hsl(var(--primary))" }} />

            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Quick stats */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground mb-2">Métricas Rápidas</h2>
          {[
            { label: "Impressões", value: (insights.impressions ?? 0).toLocaleString("pt-BR") },
            { label: "Cliques no Site", value: (insights.website_clicks ?? 0).toLocaleString("pt-BR") },
            { label: "Média de Likes", value: Math.round(avgLikes).toLocaleString("pt-BR") },
            { label: "Média de Comentários", value: Math.round(avgComments).toLocaleString("pt-BR") },
            { label: "Total de Posts", value: account?.media_count.toLocaleString("pt-BR") ?? "—" },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
              <span className="text-muted-foreground text-sm">{label}</span>
              <span className="text-foreground font-semibold text-sm">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ContentFormatsPanel platform="instagram" />
        <ContentFormatsPanel platform="facebook" />
      </div>


      <div className="mb-8">
        <AIAnalysisPanel title="Análise IA — Visão Geral (todos os canais)" />
      </div>

      {/* Recent Posts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Posts Recentes</h2>
          <Link to="/posts" className="text-xs text-primary hover:text-primary/80 transition-colors">Ver todos →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {posts.length === 0 ? (
            <div className="col-span-full text-center py-12 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
              Nenhum post processado ainda. Vá em <Link to="/posts" className="text-primary hover:underline">Posts</Link> e clique em "Coletar dados".
            </div>
          ) : posts.map((post) => (
            <Link
              key={post.id}
              to={`/posts/${post.id}`}
              className="group relative aspect-square rounded-xl overflow-hidden border border-border hover:border-primary/40 transition-all duration-200"
            >
              <img src={proxyImage(post.thumbnail_url ?? post.media_url)} referrerPolicy="no-referrer" loading="lazy" alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="flex gap-3 text-xs text-foreground font-medium">
                  <span className="inline-flex items-center gap-1"><Heart className="size-3" /> {post.like_count.toLocaleString("pt-BR")}</span>
                  <span className="inline-flex items-center gap-1"><MessageCircle className="size-3" /> {post.comments_count.toLocaleString("pt-BR")}</span>
                </div>
              </div>
              {post.media_type === "VIDEO" && (
                <div className="absolute top-2 right-2 bg-background/60 rounded-full p-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
