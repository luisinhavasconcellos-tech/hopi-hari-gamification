import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "@/components/dashboard/primitives";
import type { Influencer, NicheCategory, Platform } from "@/lib/influencer-types";
import {
  NICHE_API_KEYWORDS,
  NICHE_META,
  isNicheCategory,
  isPlatform,
  platformColor,
  platformLabel,
} from "@/lib/influencer-types";
import { discoverPlatform, fmt, scoreColor } from "@/lib/influencer-helpers";

function ScoreBadge({ score }: { score: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl p-1.5 min-w-[40px]"
      style={{ background: scoreColor(score) + "18", border: `1.5px solid ${scoreColor(score)}55` }}
    >
      <span style={{ color: scoreColor(score) }} className="text-lg font-black leading-none">{score}</span>
      <span className="text-[9px] text-muted-foreground font-semibold mt-0.5">FIT</span>
    </div>
  );
}

function InfluencerCard({ inf }: { inf: Influencer }) {
  const color = platformColor[inf.platform];
  return (
    <div className="rounded-2xl p-4" style={{ background: "hsl(var(--card))", border: "1.5px solid hsl(var(--border))" }}>
      <div className="flex gap-3">
        {inf.avatarUrl ? (
          <img
            src={inf.avatarUrl}
            alt={inf.name}
            className="w-10 h-10 rounded-full flex-shrink-0 object-cover"
            style={{ border: `2px solid ${color}40` }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              const next = (e.target as HTMLImageElement).nextElementSibling as HTMLElement | null;
              if (next) next.style.display = "flex";
            }}
          />
        ) : null}
        <div
          className="w-10 h-10 rounded-full items-center justify-center text-xs font-black flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${color}55, ${color}15)`,
            color,
            border: `2px solid ${color}40`,
            display: inf.avatarUrl ? "none" : "flex",
          }}
        >
          {inf.avatarInitials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-bold text-sm truncate">{inf.name}</span>
            {inf.verified && <span className="text-[10px] text-primary font-semibold">✓</span>}
          </div>
          <div className="text-muted-foreground text-xs truncate">{inf.handle}</div>
          {inf.location && <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{inf.location}</div>}
        </div>
        <ScoreBadge score={inf.score} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { label: "Seguidores", value: fmt(inf.followers) },
          { label: "Engajamento", value: `${inf.engagementRate}%` },
          { label: "Likes médio", value: fmt(inf.avgLikes) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-1.5 text-center border border-border/60 bg-muted/50">
            <div className="font-bold text-xs tabular-nums">{s.value}</div>
            <div className="text-muted-foreground text-[9px]">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {inf.niche.map((n) => (
          <span key={n} className="text-[9px] px-1.5 py-0.5 rounded-full border border-border bg-muted/50 text-muted-foreground">
            {n}
          </span>
        ))}
      </div>

      {inf.contactEmail && <div className="mt-1 text-[10px] text-primary truncate">{inf.contactEmail}</div>}

      <a
        href={inf.profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-[11px] font-semibold"
        style={{ color }}
      >
        Ver perfil →
      </a>
    </div>
  );
}

function exportToCSV(influencers: Influencer[], nicheName: string) {
  const headers = ["Name", "Social Media Tag", "Strongest Platform", "Engagement Rate", "Followers", "Niche", "WhatsApp", "Email", "Rating", "Posted?", "Post Link", "Notes"];
  const rows = influencers.map((inf) => [
    inf.name,
    inf.handle,
    inf.platform.charAt(0).toUpperCase() + inf.platform.slice(1),
    `${inf.engagementRate}%`,
    String(inf.followers),
    inf.niche.join(", "),
    "",
    inf.contactEmail || "",
    String(inf.score),
    "",
    inf.profileUrl,
    inf.bio.substring(0, 100).replace(/[\n\r,]/g, " "),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `influencers_${nicheName}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function InfluencerNichePage() {
  const { platform, niche } = useParams<{ platform: string; niche: string }>();
  const validParams = isPlatform(platform) && isNicheCategory(niche);
  const p: Platform = isPlatform(platform) ? platform : "instagram";
  const n: NicheCategory = isNicheCategory(niche) ? niche : "lifestyle";

  const [loading, setLoading] = useState(false);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [sortBy, setSortBy] = useState<"followers" | "engagement">("followers");

  const color = platformColor[p];
  const meta = NICHE_META[n];
  const nicheKeywords = NICHE_API_KEYWORDS[n];

  useEffect(() => {
    setInfluencers([]);
    setHasFetched(false);
  }, [p, n]);

  const runScrape = async () => {
    setLoading(true);
    setInfluencers([]);
    try {
      setInfluencers(await discoverPlatform(p, nicheKeywords, n));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setHasFetched(true);
    }
  };

  if (!validParams) {
    return (
      <div className="px-5 lg:px-8 py-16 text-center text-sm text-muted-foreground">
        Plataforma ou nicho inválido.{" "}
        <Link to="/audience/influencers" className="text-primary">
          ← Voltar aos influenciadores
        </Link>
      </div>
    );
  }

  const sorted = [...influencers].sort((a, b) =>
    sortBy === "followers" ? b.followers - a.followers : b.engagementRate - a.engagementRate,
  );
  const totalReach = influencers.reduce((a, i) => a + i.followers, 0);
  const avgEng = influencers.length
    ? (influencers.reduce((a, i) => a + i.engagementRate, 0) / influencers.length).toFixed(1)
    : "—";

  return (
    <div className="px-5 lg:px-8 py-6">
      <PageHeader
        eyebrow={`Audience · Influenciadores · ${platformLabel[p] ?? p}`}
        title={`${meta.label} no ${platformLabel[p] ?? p}`}
        subtitle="Influenciadores em São Paulo · busca por hashtags e conteúdo."
      />

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Link to={`/audience/influencers/${p}`} className="text-muted-foreground hover:text-foreground transition-colors">
          ← Nichos
        </Link>
        <span
          className="px-3 py-1.5 rounded-lg font-bold"
          style={{ background: meta.color + "20", color: meta.color, border: `1px solid ${meta.color}40` }}
        >
          {platformLabel[p]}
        </span>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          onClick={runScrape}
          disabled={loading}
          className="px-8 py-4 rounded-2xl text-white font-black text-sm transition-all disabled:opacity-50"
          style={{
            background: `linear-gradient(135deg, ${meta.color}, ${color})`,
            boxShadow: loading ? "none" : `0 8px 32px ${meta.color}40`,
          }}
        >
          {loading ? "Buscando (pode levar até 60s)…" : hasFetched ? "Nova busca" : `Buscar ${meta.label}`}
        </button>
      </div>

      {influencers.length > 0 && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Influenciadores", value: String(influencers.length) },
            { label: "Alcance total", value: fmt(totalReach) },
            { label: "Engajamento médio", value: `${avgEng}%` },
            { label: "Melhor fit", value: String(Math.max(...influencers.map((i) => i.score))) },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl p-4 flex flex-col gap-1" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <span className="text-lg font-black tabular-nums">{s.value}</span>
              <span className="text-muted-foreground text-xs">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {influencers.length > 0 && (
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {sorted.length} influenciador{sorted.length !== 1 ? "es" : ""}
            </span>
            <div className="flex gap-1 p-0.5 rounded-lg border border-border bg-muted/50">
              {(["followers", "engagement"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setSortBy(k)}
                  className="px-3 py-1.5 rounded-md text-[11px] font-bold transition-all"
                  style={{
                    background: sortBy === k ? meta.color + "30" : "transparent",
                    color: sortBy === k ? meta.color : "hsl(var(--muted-foreground))",
                  }}
                >
                  {k === "followers" ? "Seguidores ↓" : "Engajamento ↓"}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => exportToCSV(sorted, meta.label)}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
            style={{ background: "#22c55e20", color: "#22c55e", border: "1px solid #22c55e40" }}
          >
            Exportar planilha (.csv)
          </button>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((inf) => (
            <InfluencerCard key={inf.id} inf={inf} />
          ))}
        </div>
      )}

      {hasFetched && !loading && influencers.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm">Nenhum influenciador encontrado para este nicho.</p>
          <Link to={`/audience/influencers/${p}`} className="text-xs text-primary mt-2 inline-block">
            ← Tentar outro nicho
          </Link>
        </div>
      )}
    </div>
  );
}
