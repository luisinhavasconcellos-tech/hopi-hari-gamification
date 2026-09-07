import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AGGREGATE_GOAL = 4_000_000;
const INSTAGRAM_GOAL = 3_000_000;

const PLATFORMS = [
  { key: "instagram", label: "Instagram", color: "hsl(var(--chart-1, 280 80% 65%))" },
  { key: "facebook", label: "Facebook", color: "hsl(217 90% 62%)" },
  { key: "tiktok", label: "TikTok", color: "hsl(340 82% 62%)" },
  { key: "youtube", label: "YouTube", color: "hsl(0 78% 58%)" },
  { key: "linkedin", label: "LinkedIn", color: "hsl(195 85% 55%)" },
] as const;

type PlatformKey = (typeof PLATFORMS)[number]["key"];

interface Row {
  platform: string;
  date: string;
  followers: number | null;
}

const fmt = (n: number) => n.toLocaleString("pt-BR");
const fmtShort = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
// "YYYY-MM-DD" é interpretado como meia-noite UTC por new Date(); fixa ao meio-dia local para não voltar um dia no Brasil.
const parseDateOnly = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T12:00:00`) : new Date(d));
const fmtDate = (d: string) => parseDateOnly(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

function GoalCard({
  title,
  current,
  goal,
  perWeek,
  color,
}: {
  title: string;
  current: number;
  goal: number;
  perWeek: number | null;
  color: string;
}) {
  const pct = goal ? Math.min(100, (current / goal) * 100) : 0;
  const missing = Math.max(0, goal - current);
  const weeks = perWeek && perWeek > 0 ? missing / perWeek : null;
  const eta =
    weeks != null && isFinite(weeks)
      ? new Date(Date.now() + weeks * 7 * 86400000).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
      : null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">meta {fmtShort(goal)}</span>
      </div>
      <p className="text-3xl font-bold text-foreground mt-2">{fmt(current)}</p>
      <div className="h-3 rounded-full bg-muted mt-4 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
        <span className="font-semibold text-foreground">{pct.toFixed(1)}% da meta</span>
        <span>faltam {fmt(missing)}</span>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">
        {perWeek && perWeek > 0
          ? `Ritmo atual: +${fmt(Math.round(perWeek))}/semana${eta ? ` · projeção: ${eta}` : ""}`
          : "Sem ritmo positivo nas últimas semanas"}
      </p>
    </div>
  );
}

export default function FollowerDatabasePage() {
  const followerHistory = trpc.socialFollowers.history.useQuery();
  const sourceStatus = trpc.socialFollowers.status.useQuery();
  const loading = followerHistory.isLoading;
  const rows = useMemo<Row[]>(() => (followerHistory.data ?? []).map(row => ({
    platform: row.platform.toLowerCase(),
    date: row.observedDate,
    followers: row.followerCount,
  })).sort((a, b) => a.date.localeCompare(b.date)), [followerHistory.data]);

  const model = useMemo(() => {
    // series per platform, forward-filled onto a common date axis
    const byPlatform: Record<string, { date: string; followers: number }[]> = {};
    for (const r of rows) {
      if (!r.followers) continue;
      const key = r.platform;
      (byPlatform[key] ||= []).push({ date: r.date, followers: r.followers });
    }
    const dates = Array.from(new Set(rows.map((r) => r.date))).sort();

    const last: Record<string, number> = {};
    const series = dates.map((date) => {
      const point: Record<string, number | string> = { date };
      let total = 0;
      for (const p of PLATFORMS) {
        const found = byPlatform[p.key]?.find((x) => x.date === date);
        if (found) last[p.key] = found.followers;
        const v = last[p.key];
        if (v != null) {
          point[p.key] = v;
          total += v;
        }
      }
      point.total = total;
      return point;
    });

    // only keep points where all platforms already have a value (stable total)
    const stable = series.filter((p) => PLATFORMS.every((pl) => p[pl.key] != null));

    const currentByPlatform: Record<string, number> = {};
    for (const p of PLATFORMS) {
      const arr = byPlatform[p.key] ?? [];
      currentByPlatform[p.key] = arr.length ? arr[arr.length - 1].followers : 0;
    }
    const totalCurrent = Object.values(currentByPlatform).reduce((s, v) => s + v, 0);

    const growthPerWeek = (key: PlatformKey | "total") => {
      const src = key === "total" ? stable : (byPlatform[key] ?? []).map((x) => ({ date: x.date, total: x.followers }));
      const arr = key === "total" ? src.map((p) => ({ date: p.date as string, total: p.total as number })) : (src as { date: string; total: number }[]);
      if (arr.length < 2) return null;
      const end = arr[arr.length - 1];
      const endTs = parseDateOnly(end.date).getTime();
      const target = endTs - 28 * 86400000;
      let start = arr[0];
      for (const a of arr) if (parseDateOnly(a.date).getTime() <= target) start = a;
      const days = (endTs - parseDateOnly(start.date).getTime()) / 86400000;
      if (days <= 0) return null;
      return ((end.total - start.total) / days) * 7;
    };

    // weekly net growth per platform (last 8 weeks, aggregated)
    const weekly: { week: string; growth: number }[] = [];
    if (stable.length > 1) {
      const step = 7;
      for (let i = stable.length - 1; i - step >= 0 && weekly.length < 8; i -= step) {
        const end = stable[i];
        const start = stable[i - step];
        weekly.unshift({
          week: fmtDate(end.date as string),
          growth: (end.total as number) - (start.total as number),
        });
      }
    }

    const shares = PLATFORMS.map((p) => ({
      name: p.label,
      value: currentByPlatform[p.key],
      color: p.color,
    })).sort((a, b) => b.value - a.value);

    return {
      series: stable.length > 1 ? stable : series,
      instagramSeries: (byPlatform.instagram ?? []).map((x) => ({ date: x.date, followers: x.followers })),
      currentByPlatform,
      totalCurrent,
      totalPerWeek: growthPerWeek("total"),
      igPerWeek: growthPerWeek("instagram"),
      weekly,
      shares,
      lastDate: dates[dates.length - 1],
    };
  }, [rows]);

  if (loading) {
    return (
      <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-4">
        <div className="h-24 rounded-2xl bg-card border border-border animate-pulse" />
        <div className="h-80 rounded-2xl bg-card border border-border animate-pulse" />
      </div>
    );
  }

  const tooltipStyle = {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 12,
    fontSize: 12,
    color: "hsl(var(--foreground))",
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Seguidores</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Evolução da base em todas as redes · meta agregada de 4 milhões e 3 milhões no Instagram
            {model.lastDate ? ` · atualizado em ${parseDateOnly(model.lastDate).toLocaleDateString("pt-BR")}` : ""}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Fonte: Google Sheet · Log Diário · {sourceStatus.data?.lastRun?.status === "completed" ? `última sincronização ${sourceStatus.data.lastRun.completedAt ? new Date(sourceStatus.data.lastRun.completedAt).toLocaleString("pt-BR") : "confirmada"}` : "aguardando a primeira sincronização agendada"}
          </p>
        </div>
        <button
          onClick={() => void followerHistory.refetch()}
          disabled={followerHistory.isFetching}
          className="text-xs rounded-lg border border-border px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted transition disabled:opacity-50 shrink-0"
        >
          {followerHistory.isFetching ? "Atualizando…" : "Atualizar dados"}
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Nenhum dado de seguidores disponível na fonte oficial.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <GoalCard
              title="Total agregado (todas as redes)"
              current={model.totalCurrent}
              goal={AGGREGATE_GOAL}
              perWeek={model.totalPerWeek}
              color="linear-gradient(90deg, hsl(280 80% 65%), hsl(190 85% 55%))"
            />
            <GoalCard
              title="Instagram @hopihari"
              current={model.currentByPlatform.instagram ?? 0}
              goal={INSTAGRAM_GOAL}
              perWeek={model.igPerWeek}
              color="linear-gradient(90deg, hsl(330 80% 60%), hsl(35 90% 60%))"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            {PLATFORMS.map((p) => (
              <div key={p.key} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{p.label}</p>
                </div>
                <p className="text-xl font-bold text-foreground mt-1">{fmt(model.currentByPlatform[p.key] ?? 0)}</p>
                <p className="text-[11px] text-muted-foreground">
                  {((model.currentByPlatform[p.key] / (model.totalCurrent || 1)) * 100).toFixed(1)}% da base
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-1">Total agregado vs meta de 4M</h2>
            <p className="text-[11px] text-muted-foreground mb-4">Soma de Instagram, Facebook, TikTok, YouTube e LinkedIn</p>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={model.series}>
                <defs>
                  <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(280 80% 65%)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(280 80% 65%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtDate} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis
                  tickFormatter={fmtShort}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  domain={[0, AGGREGATE_GOAL]}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(l) => parseDateOnly(String(l)).toLocaleDateString("pt-BR")}
                  formatter={(v: number) => [fmt(v), "Total"]}
                />
                <ReferenceLine
                  y={AGGREGATE_GOAL}
                  stroke="hsl(150 70% 50%)"
                  strokeDasharray="6 4"
                  label={{ value: "Meta 4M", position: "insideTopRight", fill: "hsl(150 70% 50%)", fontSize: 11 }}
                />
                <Area type="monotone" dataKey="total" stroke="hsl(280 80% 65%)" strokeWidth={2} fill="url(#gTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Instagram vs meta de 3M</h2>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={model.instagramSeries}>
                  <defs>
                    <linearGradient id="gIg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(330 80% 60%)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(330 80% 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={fmtDate} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis tickFormatter={fmtShort} stroke="hsl(var(--muted-foreground))" fontSize={11} domain={[0, INSTAGRAM_GOAL]} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelFormatter={(l) => parseDateOnly(String(l)).toLocaleDateString("pt-BR")}
                    formatter={(v: number) => [fmt(v), "Seguidores"]}
                  />
                  <ReferenceLine
                    y={INSTAGRAM_GOAL}
                    stroke="hsl(150 70% 50%)"
                    strokeDasharray="6 4"
                    label={{ value: "Meta 3M", position: "insideTopRight", fill: "hsl(150 70% 50%)", fontSize: 11 }}
                  />
                  <Area type="monotone" dataKey="followers" stroke="hsl(330 80% 60%)" strokeWidth={2} fill="url(#gIg)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Crescimento líquido semanal (agregado)</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={model.weekly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis tickFormatter={fmtShort} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} separator=": " formatter={(v: number) => [fmt(v), "Novos seguidores"]} />
                  <Bar dataKey="growth" radius={[6, 6, 0, 0]}>
                    {model.weekly.map((w, i) => (
                      <Cell key={i} fill={w.growth >= 0 ? "hsl(150 70% 50%)" : "hsl(0 75% 58%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Evolução por rede social</h2>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={model.series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtDate} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis
                  yAxisId="left"
                  tickFormatter={fmtShort}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  scale="log"
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(l) => parseDateOnly(String(l)).toLocaleDateString("pt-BR")}
                  formatter={(v: number, n: string) => [fmt(v), PLATFORMS.find((p) => p.key === n)?.label ?? n]}
                />
                <Legend
                  formatter={(v) => (
                    <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
                      {PLATFORMS.find((p) => p.key === v)?.label ?? v}
                    </span>
                  )}
                />
                {PLATFORMS.map((p) => (
                  <Line
                    key={p.key}
                    yAxisId="left"
                    type="monotone"
                    dataKey={p.key}
                    stroke={p.color}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <p className="text-[11px] text-muted-foreground mt-2">Escala logarítmica para comparar redes de tamanhos diferentes.</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Composição da base por rede</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={model.shares} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tickFormatter={fmtShort} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={80} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [
                    `${fmt(v)} (${((v / (model.totalCurrent || 1)) * 100).toFixed(1)}%)`,
                    "Seguidores",
                  ]}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {model.shares.map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
