import { useMemo } from "react";
import {
  buildChannelSnapshot,
  STATUS_COLOR,
  STATUS_LABEL,
  BENCHMARKS,
  type Platform,
  type PostMetric,
} from "@/lib/kpis";

interface Props {
  platform: Platform;
  posts: PostMetric[];
  followers: number;
}

function Tile({ label, value, sub, status }: { label: string; value: string; sub?: string; status?: keyof typeof STATUS_COLOR }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground leading-tight">{label}</p>
        {status && (
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md border ${STATUS_COLOR[status]}`}>
            {STATUS_LABEL[status]}
          </span>
        )}
      </div>
      <p className="text-lg font-bold text-foreground mt-1">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

const fmtPct = (n: number | null, d = 2) => (n == null ? "—" : `${n.toFixed(d)}%`);
const fmtDelta = (n: number) => `${n > 0 ? "▲" : n < 0 ? "▼" : "—"} ${Math.abs(n).toFixed(1)}%`;

export default function AdvancedKPIs({ platform, posts, followers }: Props) {
  const snap = useMemo(() => buildChannelSnapshot(platform, posts, followers), [platform, posts, followers]);
  const bench = BENCHMARKS[platform];
  const hasViews = posts.some((p) => (p.view_count ?? 0) > 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">⚡ KPIs Avançados — últimos {snap.windowDays} dias</h2>
          <p className="text-[11px] text-muted-foreground">
            Benchmarks setor parques BR · ER ≥{bench.er.good}% · Cadência ≥{bench.postsPerWeek.good}/sem
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <Tile
          label="Engagement Rate (followers)"
          value={fmtPct(snap.erFollowers)}
          sub={snap.erFollowersPrev != null ? `${fmtDelta(snap.erFollowersDeltaPct)} vs sem. anterior` : "sem dados anteriores"}
          status={snap.erStatus}
        />
        {hasViews ? (
          <Tile
            label="Engagement Rate (views)"
            value={fmtPct(snap.erViews)}
            sub={snap.erViews == null ? "sem posts c/ views" : "interações / views"}
          />
        ) : (
          <Tile
            label="Interações / post"
            value={posts.length ? Math.round(posts.reduce((s, p) => s + (p.like_count ?? 0) + (p.comments_count ?? 0) + (p.share_count ?? 0), 0) / posts.length).toLocaleString("pt-BR") : "—"}
            sub="média de likes + coments + shares"
          />
        )}
        {hasViews ? (
          <Tile
            label="Reach Rate"
            value={fmtPct(snap.reachRate, 1)}
            sub={snap.reachRate == null ? "precisa de Reels/vídeos com views" : "views médios / seguidores"}
          />
        ) : (
          <Tile
            label="Total de interações"
            value={posts.reduce((s, p) => s + (p.like_count ?? 0) + (p.comments_count ?? 0) + (p.share_count ?? 0), 0).toLocaleString("pt-BR")}
            sub={`acumulado em ${posts.length} posts`}
          />
        )}
        <Tile
          label="Virality Score"
          value={fmtPct(snap.virality, 2)}
          sub={
            snap.virality == null
              ? platform === "youtube"
                ? "precisa de nº de inscritos"
                : "sem shares disponíveis"
              : platform === "youtube"
                ? "melhor vídeo / inscritos"
                : hasViews ? "shares × 100 / views" : "shares / total interações"
          }
        />
        <Tile
          label="Cadência semanal"
          value={`${snap.cadencePerWeek}`}
          sub={`meta ≥${bench.postsPerWeek.good} · ${fmtDelta(snap.cadenceDeltaPct)} WoW`}
          status={snap.cadenceStatus}
        />
        <Tile
          label="Gap médio entre posts"
          value={snap.avgGapHours ? `${snap.avgGapHours.toFixed(1)}h` : "—"}
          sub="dos últimos 30 posts"
        />
        <Tile
          label="Share Rate"
          value={fmtPct(snap.shareRate, 2)}
          sub={
            platform === "youtube"
              ? "n/d — YouTube não expõe shares"
              : snap.shareRate == null ? "sem shares disponíveis" : "shares / views"
          }
        />
        <Tile
          label="Melhor horário"
          value={snap.bestHour ? `${snap.bestHour.hour}h` : "—"}
          sub={snap.bestHour ? (hasViews ? `ER médio ${snap.bestHour.avgER.toFixed(1)}%` : `${snap.bestHour.avgER.toFixed(0)} interações/post`) : "sem dados suficientes"}
        />
      </div>
    </div>
  );
}
