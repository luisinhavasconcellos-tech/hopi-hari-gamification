import { useMemo, useState } from "react";
import states from "@/data/brStates.json";
import cityCoords from "@/data/brCityCoords.json";
import dddCoords from "@/data/brDddCoords.json";
import { formatNumber } from "@/lib/mock-data";

type StateShape = { id: string; rings: [number, number][][] };
type Point = { key: string; label: string; sub: string; lon: number; lat: number; leads: number };

const STATES = states as unknown as StateShape[];
const CITY = cityCoords as unknown as Record<string, [number, number]>;
const DDD = dddCoords as unknown as Record<string, [number, number]>;

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

// Projeção equirretangular simples, suficiente para o Brasil
const W = 760;
const H = 780;
const LON0 = -74.2, LON1 = -33.5, LAT0 = -34.2, LAT1 = 5.6;
const px = (lon: number) => ((lon - LON0) / (LON1 - LON0)) * W;
const py = (lat: number) => ((LAT1 - lat) / (LAT1 - LAT0)) * H;

const pathOf = (rings: [number, number][][]) =>
  rings
    .map((r) => r.map(([lon, lat], i) => `${i ? "L" : "M"}${px(lon).toFixed(1)} ${py(lat).toFixed(1)}`).join("") + "Z")
    .join(" ");

/** Escala de calor: azul (baixo) → amarelo → laranja (alto) */
function heat(t: number) {
  const stops: [number, string][] = [
    [0, "hsl(207 100% 35%)"],
    [0.45, "hsl(88 100% 39%)"],
    [0.75, "hsl(48 100% 50%)"],
    [1, "hsl(24 100% 50%)"],
  ];
  let a = stops[0], b = stops[stops.length - 1];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      a = stops[i - 1];
      b = stops[i];
      break;
    }
  }
  return t >= 1 ? stops[stops.length - 1][1] : t <= a[0] ? a[1] : b[1];
}

export default function BrazilLeadsMap({
  cities,
  ddds,
  total,
}: {
  cities: { uf: string; city: string; leads: number }[];
  ddds: { bucket_key: string; bucket_label: string; leads: number }[];
  total: number;
}) {
  const [mode, setMode] = useState<"municipio" | "ddd">("municipio");
  const [hover, setHover] = useState<Point | null>(null);

  const { points, unmatched, stateTotals } = useMemo(() => {
    if (mode === "ddd") {
      const pts: Point[] = [];
      let miss = 0;
      ddds.forEach((d) => {
        const c = DDD[d.bucket_key];
        if (!c) return void miss++;
        pts.push({ key: d.bucket_key, label: d.bucket_label, sub: "região do DDD", lon: c[0], lat: c[1], leads: d.leads });
      });
      return { points: pts, unmatched: miss, stateTotals: new Map<string, number>() };
    }
    const pts: Point[] = [];
    const totals = new Map<string, number>();
    let miss = 0;
    cities.forEach((r) => {
      totals.set(r.uf, (totals.get(r.uf) ?? 0) + r.leads);
      const c = CITY[`${r.uf}|${norm(r.city)}`];
      if (!c) return void miss++;
      pts.push({ key: `${r.uf}-${r.city}`, label: r.city, sub: r.uf, lon: c[0], lat: c[1], leads: r.leads });
    });
    return { points: pts.sort((a, b) => b.leads - a.leads), unmatched: miss, stateTotals: totals };
  }, [cities, ddds, mode]);

  const max = points.reduce((m, p) => Math.max(m, p.leads), 0) || 1;
  const maxState = [...stateTotals.values()].reduce((m, v) => Math.max(m, v), 0) || 1;
  // Escala de potência: SP concentra a base e uma escala linear achataria as demais cidades
  const scale = (v: number) => Math.pow(v / max, 0.35);
  const radius = (v: number) => 2.5 + scale(v) * 20;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(["municipio", "ddd"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
              mode === m
                ? "border-primary/40 bg-primary/15 text-foreground"
                : "border-border bg-muted/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "municipio" ? "Por município" : "Densidade por DDD"}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-muted-foreground">
          {formatNumber(points.length)} pontos mapeados
          {unmatched > 0 ? ` · ${unmatched} sem coordenada` : ""}
        </span>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Mapa de calor de leads do CRM no Brasil">
          <defs>
            <radialGradient id="leadGlow">
              <stop offset="0%" stopColor="white" stopOpacity="0.55" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </radialGradient>
          </defs>

          {STATES.map((s) => {
            const v = stateTotals.get(s.id) ?? 0;
            const t = mode === "municipio" && v > 0 ? Math.pow(v / maxState, 0.4) : 0;
            return (
              <path
                key={s.id}
                d={pathOf(s.rings)}
                fill={t > 0 ? `hsl(207 100% ${18 + t * 22}%)` : "hsl(var(--muted) / 0.25)"}
                stroke="hsl(0 0% 100% / 0.18)"
                strokeWidth={0.7}
              />
            );
          })}

          {points.map((p) => {
            const t = scale(p.leads);
            const r = radius(p.leads);
            const active = hover?.key === p.key;
            return (
              <g key={p.key} onMouseEnter={() => setHover(p)} onMouseLeave={() => setHover(null)}>
                <circle cx={px(p.lon)} cy={py(p.lat)} r={r * 1.6} fill="url(#leadGlow)" opacity={0.25 + t * 0.35} />
                <circle
                  cx={px(p.lon)}
                  cy={py(p.lat)}
                  r={r}
                  fill={heat(t)}
                  fillOpacity={0.55 + t * 0.35}
                  stroke={active ? "white" : "hsl(0 0% 100% / 0.35)"}
                  strokeWidth={active ? 1.6 : 0.6}
                  className="cursor-pointer transition-[stroke-width]"
                />
              </g>
            );
          })}
        </svg>

        <div className="pointer-events-none absolute left-3 bottom-3 rounded-xl border border-border bg-background/80 px-3 py-2 backdrop-blur">
          {hover ? (
            <>
              <div className="text-xs font-medium text-foreground">
                {hover.label} <span className="text-muted-foreground">· {hover.sub}</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {formatNumber(hover.leads)} leads
                {total > 0 ? ` · ${((hover.leads / total) * 100).toFixed(2)}% da base` : ""}
              </div>
            </>
          ) : (
            <div className="text-[11px] text-muted-foreground">Passe o mouse sobre um ponto para ver os leads</div>
          )}
        </div>

        <div className="pointer-events-none absolute right-3 bottom-3 rounded-xl border border-border bg-background/80 px-3 py-2 backdrop-blur">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Concentração</div>
          <div className="mt-1 flex items-center gap-1">
            {[0, 0.35, 0.6, 0.85, 1].map((t) => (
              <span key={t} className="size-3 rounded-sm" style={{ background: heat(t) }} />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>baixa</span>
            <span>{formatNumber(max)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
