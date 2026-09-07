import { Link, useParams } from "react-router-dom";
import { PageHeader } from "@/components/dashboard/primitives";
import { NICHE_META, platformColor, platformLabel } from "@/lib/influencer-types";
import { Camera, Music2, PlaySquare } from "lucide-react";
import type { Platform } from "@/lib/influencer-types";
import { NICHE_ORDER } from "./InfluencersPage";

const PLATFORM_ICON = { instagram: Camera, tiktok: Music2, youtube: PlaySquare } as const;

export default function InfluencerPlatformPage() {
  const { platform } = useParams<{ platform: string }>();
  const p = (platform ?? "instagram") as Platform;

  if (!["instagram", "tiktok", "youtube"].includes(p)) {
    return <div className="px-5 lg:px-8 py-10 text-sm text-muted-foreground">Plataforma inválida</div>;
  }

  const color = platformColor[p];

  return (
    <div className="px-5 lg:px-8 py-6">
      <PageHeader
        eyebrow="Audience · Influenciadores"
        title={platformLabel[p]}
        subtitle="Escolha um nicho para buscar influenciadores reais em São Paulo."
      />

      <div className="flex flex-wrap items-center gap-2">
        {(["instagram", "tiktok", "youtube"] as Platform[]).map((pl) => (
          <Link
            key={pl}
            to={`/audience/influencers/${pl}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: pl === p ? platformColor[pl] + "25" : "transparent",
              color: pl === p ? platformColor[pl] : "hsl(var(--muted-foreground))",
              border: `1px solid ${pl === p ? platformColor[pl] + "40" : "transparent"}`,
            }}
          >
            {(() => { const I = PLATFORM_ICON[pl]; return <I className="size-3.5" />; })()}
            {platformLabel[pl]}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {NICHE_ORDER.map((niche) => {
          const meta = NICHE_META[niche];
          return (
            <Link
              key={niche}
              to={`/audience/influencers/${p}/${niche}`}
              className="group rounded-2xl p-4 sm:p-5 text-center transition-all duration-300 hover:scale-[1.03]"
              style={{ background: "hsl(var(--card))", border: `1.5px solid ${meta.color}20` }}
            >
              <span
                className="mx-auto mb-2 grid size-10 place-items-center rounded-xl text-sm font-semibold transition-transform group-hover:scale-110"
                style={{ background: meta.color + "20", color: meta.color }}
              >
                {meta.label.slice(0, 2)}
              </span>
              <h3 className="font-black text-sm sm:text-base mb-1">{meta.label}</h3>
              <p className="text-muted-foreground text-[11px] mb-3 hidden sm:block">+20K seguidores · 3%+ eng.</p>
              <span
                className="inline-block px-4 py-2 rounded-xl text-xs font-bold"
                style={{ background: meta.color + "20", color: meta.color, border: `1px solid ${meta.color}40` }}
              >
                Buscar criadores →
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 text-xs text-muted-foreground">
        <Link to="/audience/influencers" className="hover:text-foreground transition-colors" style={{ color }}>
          ← Voltar às plataformas
        </Link>
      </div>
    </div>
  );
}
