import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Platform } from "@/lib/kpis";

interface Props {
  platform: Platform | "twitter";
  currentFollowers?: number;
}

interface Row {
  date: string;
  followers: number;
  new_followers: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function fmt(n: number) {
  return n.toLocaleString("pt-BR");
}

function delta(curr: number, prev: number) {
  if (!prev) return null;
  return ((curr - prev) / prev) * 100;
}

function Tile({
  label,
  value,
  sub,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: number | null;
}) {
  const trendClass =
    trend == null
      ? "text-muted-foreground"
      : trend > 0
        ? "text-success"
        : trend < 0
          ? "text-destructive"
          : "text-muted-foreground";
  const arrow = trend == null ? "" : trend > 0 ? "▲" : trend < 0 ? "▼" : "—";
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground leading-tight">{label}</p>
      <p className="text-lg font-bold text-foreground mt-1">{value}</p>
      <div className="flex items-center gap-1 mt-0.5">
        {trend != null && (
          <span className={`text-[10px] font-semibold ${trendClass}`}>
            {arrow} {Math.abs(trend).toFixed(2)}%
          </span>
        )}
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

export default function FollowerGrowth({ platform, currentFollowers }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("daily_metrics")
      .select("date,followers,new_followers")
      .eq("platform", platform)
      .order("date", { ascending: true });
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform]);

  const sync = async () => {
    setSyncing(true);
    try {
      await supabase.functions.invoke("sync-follower-log");
      await load();
    } finally {
      setSyncing(false);
    }
  };


  const stats = useMemo(() => {
    // use only rows with a follower count >0 for level metrics
    const withFollowers = rows.filter((r) => (r.followers ?? 0) > 0);
    const last = withFollowers[withFollowers.length - 1];
    const today = last ? last.followers : currentFollowers ?? 0;

    const findOnOrBefore = (targetTs: number) => {
      let pick: Row | undefined;
      for (const r of withFollowers) {
        const t = new Date(r.date).getTime();
        if (t <= targetTs) pick = r;
        else break;
      }
      return pick;
    };

    const lastTs = last ? new Date(last.date).getTime() : Date.now();
    const yesterday = findOnOrBefore(lastTs - DAY_MS);
    const weekAgo = findOnOrBefore(lastTs - 7 * DAY_MS);
    const twoWeeksAgo = findOnOrBefore(lastTs - 14 * DAY_MS);
    const monthAgo = findOnOrBefore(lastTs - 30 * DAY_MS);

    // Daily growth = today - yesterday (fallback to new_followers value of last row)
    const dailyAbs =
      yesterday && last ? last.followers - yesterday.followers : last?.new_followers ?? 0;

    const weeklyAbs = weekAgo && last ? last.followers - weekAgo.followers : null;
    const prevWeeklyAbs =
      twoWeeksAgo && weekAgo ? weekAgo.followers - twoWeeksAgo.followers : null;
    const monthlyAbs = monthAgo && last ? last.followers - monthAgo.followers : null;

    // Sum of new_followers in last 7 / 30 days as a secondary measure
    const cutoff7 = lastTs - 7 * DAY_MS;
    const cutoff30 = lastTs - 30 * DAY_MS;
    const sumNew = (cutoff: number) =>
      rows
        .filter((r) => new Date(r.date).getTime() > cutoff)
        .reduce((s, r) => s + (r.new_followers || 0), 0);

    const weekly7 = sumNew(cutoff7);
    const monthly30 = sumNew(cutoff30);

    return {
      today,
      lastDate: last?.date ?? null,
      dailyAbs,
      dailyPct: yesterday && last ? delta(last.followers, yesterday.followers) : null,
      weeklyAbs: weeklyAbs ?? weekly7,
      weeklyPct: weekAgo && last ? delta(last.followers, weekAgo.followers) : null,
      weeklyPrevAbs: prevWeeklyAbs,
      monthlyAbs: monthlyAbs ?? monthly30,
      monthlyPct: monthAgo && last ? delta(last.followers, monthAgo.followers) : null,
      hasData: withFollowers.length > 0,
    };
  }, [rows, currentFollowers]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 mb-6 animate-pulse h-32" />
    );
  }

  if (!stats.hasData) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-1">Crescimento de seguidores</h2>
        <p className="text-xs text-muted-foreground">
          Sem dados de seguidores diários. Sincronize a planilha em <strong>Daily Insights</strong> para popular esta seção.
        </p>
      </div>
    );
  }

  const wowDelta =
    stats.weeklyPrevAbs != null && stats.weeklyPrevAbs !== 0
      ? ((Number(stats.weeklyAbs) - stats.weeklyPrevAbs) / Math.abs(stats.weeklyPrevAbs)) * 100
      : null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Crescimento de seguidores</h2>
          <p className="text-[11px] text-muted-foreground">
            Base: planilha diária{stats.lastDate ? ` · última atualização ${new Date(stats.lastDate).toLocaleDateString("pt-BR")}` : ""}
          </p>
        </div>
        <button
          onClick={sync}
          disabled={syncing}
          className="text-[11px] rounded-lg border border-border px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition disabled:opacity-50"
        >
          {syncing ? "Sincronizando…" : "Sincronizar planilha"}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="Total atual" value={fmt(stats.today)} sub="seguidores" />
        <Tile
          label="Crescimento diário"
          value={`${stats.dailyAbs >= 0 ? "+" : ""}${fmt(stats.dailyAbs)}`}
          sub="vs dia anterior"
          trend={stats.dailyPct}
        />
        <Tile
          label="Crescimento semanal"
          value={`${Number(stats.weeklyAbs) >= 0 ? "+" : ""}${fmt(Number(stats.weeklyAbs))}`}
          sub={wowDelta != null ? `${wowDelta >= 0 ? "▲" : "▼"} ${Math.abs(wowDelta).toFixed(1)}% vs sem. anterior` : "últimos 7 dias"}
          trend={stats.weeklyPct}
        />
        <Tile
          label="Crescimento 30 dias"
          value={`${Number(stats.monthlyAbs) >= 0 ? "+" : ""}${fmt(Number(stats.monthlyAbs))}`}
          sub="últimos 30 dias"
          trend={stats.monthlyPct}
        />
      </div>
    </div>
  );
}
