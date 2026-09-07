import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { BarChart3, Eye, Heart, MessageCircle, Share2, Users } from "lucide-react";

function formatCount(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : new Intl.NumberFormat("pt-BR").format(value);
}

export default function TiktokMetricsPanel() {
  const metricsQuery = trpc.tiktok.dailyMetrics.useQuery();
  const viewersQuery = trpc.tiktok.viewers.useQuery();
  const latest = metricsQuery.data?.[0];
  const oldest = metricsQuery.data?.[metricsQuery.data.length - 1];
  const latestViewers = viewersQuery.data?.[0];
  const latestDate = latest?.observedDate
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${latest.observedDate}T12:00:00Z`))
    : null;
  const metrics = [
    { label: "Seguidores", value: latest?.followers, icon: Users },
    { label: "Visualizações", value: latest?.videoViews, icon: Eye },
    { label: "Visualizadores", value: latestViewers?.totalViewers, icon: BarChart3 },
    { label: "Curtidas", value: latest?.likes, icon: Heart },
    { label: "Comentários", value: latest?.comments, icon: MessageCircle },
    { label: "Compartilhamentos", value: latest?.shares, icon: Share2 },
  ];
  return (
    <Card className="mb-6 border-border/70 bg-card/90 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="font-serif text-xl text-card-foreground">TikTok · panorama real</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{latestDate ? `Último dia disponível: ${latestDate}` : "Métricas aguardando importação"}</p>
          {latestDate && oldest?.observedDate && <p className="mt-1 text-xs text-muted-foreground">Cobertura: {oldest.observedDate} a {latestDate} · {metricsQuery.data.length} dias</p>}
        </div>
        <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">Fonte TikTok</span>
      </CardHeader>
      <CardContent>
        {metricsQuery.isLoading || viewersQuery.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{metrics.map(metric => <Skeleton key={metric.label} className="h-24 rounded-xl" />)}</div>
        ) : metricsQuery.error || viewersQuery.error ? (
          <p className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">Não foi possível carregar as métricas protegidas do TikTok.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{metrics.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-border/70 bg-background/60 p-4">
              <div className="flex items-center gap-2 text-muted-foreground"><Icon className="h-4 w-4" /><span className="text-xs font-medium uppercase tracking-wide">{label}</span></div>
              <p className="mt-3 font-serif text-2xl text-foreground">{formatCount(value)}</p>
            </div>
          ))}</div>
        )}
      </CardContent>
    </Card>
  );
}
