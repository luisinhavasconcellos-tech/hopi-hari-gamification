import { useEffect, useMemo, useState } from "react";
import { interactions, type Platform, type PostMetric } from "@/lib/kpis";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  platform: Platform;
  posts: PostMetric[];
  followers: number;
}

interface DayBucket {
  label: string;
  date: Date;
  posts: PostMetric[];
  interactions: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  newFollowers: number;
  impressions: number;
  followers: number;
  postedFlag: boolean;
  engRate: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

interface DailyRow {
  date: string;
  posted: boolean;
  likes: number;
  comments: number;
  shares: number;
  followers: number;
  new_followers: number;
  reach: number;
  views: number;
  engagement_rate: number;
  impressions: number;
}

function buildDayBuckets(posts: PostMetric[], days: number, daily: DailyRow[], anchor: Date): DayBucket[] {
  const today = startOfDay(anchor);
  const dailyByDate = new Map(daily.map((d) => [d.date, d]));
  const buckets: DayBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const start = new Date(today.getTime() - i * DAY_MS);
    const end = new Date(start.getTime() + DAY_MS);
    const inDay = posts.filter((p) => {
      if (!p.timestamp) return false;
      const t = new Date(p.timestamp).getTime();
      return t >= start.getTime() && t < end.getTime();
    });
    const dateKey = start.toISOString().slice(0, 10);
    const sheet = dailyByDate.get(dateKey);

    const fromPosts = {
      interactions: inDay.reduce((s, p) => s + interactions(p), 0),
      views: inDay.reduce((s, p) => s + (p.view_count ?? 0), 0),
      likes: inDay.reduce((s, p) => s + (p.like_count ?? 0), 0),
      comments: inDay.reduce((s, p) => s + (p.comments_count ?? 0), 0),
      shares: inDay.reduce((s, p) => s + (p.share_count ?? 0), 0),
    };

    buckets.push({
      label: start.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }),
      date: start,
      posts: inDay,
      likes: sheet ? num(sheet.likes) : fromPosts.likes,
      comments: sheet ? num(sheet.comments) : fromPosts.comments,
      shares: sheet ? num(sheet.shares) : fromPosts.shares,
      views: sheet ? num(sheet.views) : fromPosts.views,
      interactions: sheet ? num(sheet.likes) + num(sheet.comments) + num(sheet.shares) : fromPosts.interactions,
      reach: num(sheet?.reach),
      newFollowers: num(sheet?.new_followers),
      impressions: num(sheet?.impressions),
      followers: num(sheet?.followers),
      postedFlag: sheet?.posted ?? inDay.length > 0,
      engRate: num(sheet?.engagement_rate),
    });
  }
  return buckets;
}

function deltaPct(curr: number, prev: number): number | null {
  if (!prev) return curr > 0 ? 100 : null;
  return ((curr - prev) / prev) * 100;
}

const num = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? n : 0);
const fmt = (n: number | null | undefined) => num(n).toLocaleString("pt-BR");

function DeltaPill({ value }: { value: number | null }) {
  if (value == null) return <span className="text-[10px] text-muted-foreground">—</span>;
  const positive = value >= 0;
  return (
    <span className={`text-[10px] font-semibold ${positive ? "text-success" : "text-destructive"}`}>
      {positive ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function MetricCell({ label, today: rawToday, yesterday: rawYesterday, isPct = false, prevLabel = "anterior" }: { label: string; today: number | null | undefined; yesterday: number | null | undefined; isPct?: boolean; prevLabel?: string }) {
  const today = num(rawToday);
  const yesterday = num(rawYesterday);
  const delta = deltaPct(today, yesterday);
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex items-baseline justify-between mt-1">
        <p className="text-lg font-bold text-foreground">{isPct ? `${today.toFixed(2)}%` : fmt(today)}</p>
        <DeltaPill value={delta} />
      </div>
      <p className="text-[10px] text-muted-foreground mt-0.5">
        {prevLabel}: {isPct ? `${yesterday.toFixed(2)}%` : fmt(yesterday)}
      </p>
    </div>
  );
}

export default function DailyInsights({ platform, posts, followers }: Props) {
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const loadDaily = async () => {
    const { data } = await supabase
      .from("daily_metrics")
      .select("date,posted,likes,comments,shares,followers,new_followers,reach,views,engagement_rate,impressions")
      .eq("platform", platform)
      .order("date", { ascending: false })
      .limit(60);
    setDaily((data ?? []) as DailyRow[]);
  };

  useEffect(() => {
    loadDaily();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-daily-metrics");
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Falha na sincronização");
      const total = Object.values(data.byPlatform || {}).reduce(
        (s: number, r: any) => s + (r.upserted || 0), 0
      );
      toast({ title: "Sincronizado", description: `${total} linhas atualizadas da planilha.` });
      await loadDaily();
    } catch (e: any) {
      toast({ title: "Erro ao sincronizar", description: e.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  // Âncora = último dia com dado real (planilha ou post), não a data de hoje
  const anchor = useMemo(() => {
    const candidates: number[] = [];
    daily.forEach((d) => {
      const hasData =
        d.posted || num(d.likes) || num(d.comments) || num(d.shares) || num(d.views) || num(d.reach) || num(d.new_followers) || num(d.followers);
      if (hasData && d.date) candidates.push(new Date(`${d.date}T12:00:00`).getTime());
    });
    posts.forEach((p) => {
      if (p.timestamp) candidates.push(new Date(p.timestamp).getTime());
    });
    return candidates.length ? new Date(Math.max(...candidates)) : new Date();
  }, [daily, posts]);

  const buckets = useMemo(() => buildDayBuckets(posts, 14, daily, anchor), [posts, daily, anchor]);

  const hasActivity = (b: DayBucket) =>
    b.postedFlag || b.posts.length > 0 || b.interactions > 0 || b.views > 0 || b.reach > 0;
  const activeBuckets = buckets.filter(hasActivity);

  // Histórico de comparações: cada registro com dado vs o registro anterior
  const historySeries = useMemo(() => {
    const hist = buildDayBuckets(posts, 90, daily, anchor).filter(hasActivity);
    return hist.map((b, i) => {
      const prev = hist[i - 1];
      const d = (curr: number, before?: number) =>
        prev === undefined || !before ? null : ((curr - before) / before) * 100;
      return {
        label: b.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        interactions: b.interactions,
        views: b.views,
        deltaInteractions: d(b.interactions, prev?.interactions),
        deltaViews: d(b.views, prev?.views),
      };
    });
  }, [posts, daily, anchor]);

  const today = activeBuckets[activeBuckets.length - 1] ?? buckets[buckets.length - 1];
  const yesterday = activeBuckets[activeBuckets.length - 2];
  const last7 = buckets.slice(-7);
  const prev7 = buckets.slice(-14, -7);

  const sum = (arr: DayBucket[], k: keyof DayBucket) => arr.reduce((s, b) => s + ((b[k] as number) || 0), 0);
  const last7Inter = sum(last7, "interactions");
  const prev7Inter = sum(prev7, "interactions");
  const last7Views = sum(last7, "views");
  const prev7Views = sum(prev7, "views");
  const last7Reach = sum(last7, "reach");
  const prev7Reach = sum(prev7, "reach");
  const last7NewFollowers = sum(last7, "newFollowers");
  const prev7NewFollowers = sum(prev7, "newFollowers");
  const last7PostCount = last7.reduce((s, b) => s + (b.postedFlag ? 1 : 0), 0);
  const prev7PostCount = prev7.reduce((s, b) => s + (b.postedFlag ? 1 : 0), 0);

  const erDay = (b?: DayBucket) => {
    if (!b) return 0;
    if (b.engRate) return b.engRate;
    return followers && b.posts.length ? (b.interactions / b.posts.length / followers) * 100 : 0;
  };
  const erToday = erDay(today);
  const erYesterday = erDay(yesterday);
  const lastLabel = today ? today.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—";
  const prevLabel = yesterday ? yesterday.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—";

  const maxInter = Math.max(1, ...buckets.map((b) => b.interactions));
  const hasSheetData = daily.length > 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 mb-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Insights Diários — {platform.toUpperCase()}</h2>
          <p className="text-[11px] text-muted-foreground">
            {hasSheetData ? "Dados da planilha de monitoramento diário" : "Calculado a partir dos posts"} · último registro {lastLabel} vs {prevLabel}
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="text-[11px] font-medium px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-accent transition disabled:opacity-50"
        >
          {syncing ? "Sincronizando..." : "Sincronizar planilha"}
        </button>
      </div>

      {/* Último registro vs registro anterior */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <MetricCell label={`Posts · ${lastLabel}`} today={today?.postedFlag ? 1 : today?.posts.length ?? 0} yesterday={yesterday?.postedFlag ? 1 : yesterday?.posts.length ?? 0} prevLabel={`${prevLabel}`} />
        <MetricCell label={`Interações · ${lastLabel}`} today={today?.interactions} yesterday={yesterday?.interactions} prevLabel={`${prevLabel}`} />
        <MetricCell label={`Views · ${lastLabel}`} today={today?.views} yesterday={yesterday?.views} prevLabel={`${prevLabel}`} />
        <MetricCell label={`ER · ${lastLabel}`} today={erToday} yesterday={erYesterday} isPct prevLabel={`${prevLabel}`} />
      </div>

      {/* 7d vs prev 7d */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <MetricCell label="Posts (7d)" today={last7PostCount} yesterday={prev7PostCount} />
        <MetricCell label="Interações (7d)" today={last7Inter} yesterday={prev7Inter} />
        <MetricCell label="Views (7d)" today={last7Views} yesterday={prev7Views} />
        {hasSheetData && (
          <MetricCell label="Novos seguidores (7d)" today={last7NewFollowers} yesterday={prev7NewFollowers} />
        )}
      </div>

      {hasSheetData && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
          <MetricCell label="Alcance (7d)" today={last7Reach} yesterday={prev7Reach} />
          <MetricCell label="Seguidores totais" today={today?.followers || yesterday?.followers} yesterday={yesterday?.followers} />
          <MetricCell label="Impressões (7d)" today={sum(last7, "impressions")} yesterday={sum(prev7, "impressions")} />
        </div>
      )}

      {/* Daily bar chart */}
      <div>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
          Interações por dia (14d)
        </p>
        <div className="flex items-end gap-1 h-28">
          {buckets.map((b, i) => {
            const h = (b.interactions / maxInter) * 100;
            const isToday = i === buckets.length - 1;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <div
                  className={`w-full rounded-t-md transition-all ${isToday ? "bg-primary" : "bg-primary/40 group-hover:bg-primary/70"}`}
                  style={{ height: `${Math.max(2, h)}%` }}
                  title={`${b.label}: ${fmt(b.interactions)} interações`}
                />
              </div>
            );
          })}
        </div>
        <div className="flex gap-1 mt-1">
          {buckets.map((b, i) => (
            <div key={i} className="flex-1 text-center text-[8px] text-muted-foreground truncate">
              {b.date.getDate()}/{b.date.getMonth() + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Evolução das comparações registro a registro */}
      {historySeries.length > 1 && (
        <div className="mt-6">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
            Evolução das comparações (cada registro vs o anterior)
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={historySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={48} />
                <YAxis yAxisId="right" orientation="right" unit="%" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={48} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number | null, name: string) => {
                    if (value == null) return ["—", name];
                    return name.startsWith("Δ")
                      ? [`${value >= 0 ? "+" : ""}${value.toFixed(1)}%`, name]
                      : [fmt(value), name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="interactions" name="Interações" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="deltaInteractions" name="Δ Interações" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                <Line yAxisId="right" type="monotone" dataKey="deltaViews" name="Δ Views" stroke="hsl(var(--accent))" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 2 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
