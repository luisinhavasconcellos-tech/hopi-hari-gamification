import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, MapPin, Sparkles, TrendingUp, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/primitives";
import { NICHE_META, platformColor, platformLabel } from "@/lib/influencer-types";
import type { NicheCategory, Platform } from "@/lib/influencer-types";


export const NICHE_ORDER: NicheCategory[] = [
  "maternity", "kids", "teenage", "adults",
  "tourism", "theme_park", "foodies",
  "lifestyle", "fashion_beauty", "pop_culture",
  "lgbt_pride", "religious",
];

const platforms: { key: Platform; desc: string }[] = [
  { key: "instagram", desc: "Reels, Stories e posts de influenciadores paulistas" },
  { key: "tiktok", desc: "Criadores virais com alto engajamento em SP" },
  { key: "youtube", desc: "YouTubers brasileiros com conteúdo de entretenimento" },
];

export default function InfluencersPage() {
  return (
    <div className="px-5 lg:px-8 py-6">
      <PageHeader
        eyebrow="Audience · Mídia"
        title="Influenciadores"
        subtitle="Busca de criadores reais em São Paulo com +20K seguidores e 3%+ de engajamento, organizados por nicho."
      />

      <div className="flex flex-wrap gap-2">
        {[
          { icon: BadgeCheck, label: "Perfis verificados" },
          { icon: Users, label: "+20K seguidores" },
          { icon: TrendingUp, label: "Eng. ≥ 3%" },
          { icon: MapPin, label: "São Paulo" },
          { icon: Sparkles, label: "12 nichos" },
        ].map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground"
          >
            <Icon className="size-3.5" />
            {label}
          </span>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {platforms.map(({ key, desc }) => (
          <Link
            key={key}
            to={`/audience/influencers/${key}`}
            className="group glass rounded-2xl p-6 h-full flex flex-col items-center text-center transition-transform duration-300 hover:-translate-y-0.5"
            style={{ borderColor: `${platformColor[key]}40` }}
          >
            <span
              className="grid size-12 place-items-center rounded-xl text-lg font-semibold"
              style={{ background: `${platformColor[key]}20`, color: platformColor[key] }}
            >
              {platformLabel[key].slice(0, 2)}
            </span>
            <h2 className="mt-3 font-display text-lg font-semibold">{platformLabel[key]}</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
            <span className="mt-auto pt-4 inline-flex items-center gap-1 rounded-xl border border-border bg-muted/50 px-4 py-2 text-sm font-medium transition-colors group-hover:bg-muted/50">
              Explorar
              <ArrowRight className="size-4" />
            </span>
          </Link>
        ))}
      </div>


      <div className="mt-8">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Nichos disponíveis</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {NICHE_ORDER.map((n) => (
            <span
              key={n}
              className="rounded-lg px-2.5 py-1 text-xs font-semibold"
              style={{
                background: NICHE_META[n].color + "18",
                color: NICHE_META[n].color,
                border: `1px solid ${NICHE_META[n].color}33`,
              }}
            >
              {NICHE_META[n].label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
