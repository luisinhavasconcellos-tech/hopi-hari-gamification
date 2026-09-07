import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { BarChart3, Camera, Check, Filter, Music2, Users } from "lucide-react";
import { useState } from "react";

type Platform = "facebook" | "instagram" | "tiktok";
const platformLabels: Record<Platform, string> = { facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok" };
const platformIcons: Record<Platform, typeof Users> = { facebook: Users, instagram: Camera, tiktok: Music2 };
const metricLabels: Array<[string, string]> = [
  ["followers", "Seguidores"],
  ["views", "Visualizações"],
  ["interactions", "Interações"],
  ["linkClicks", "Cliques no link"],
  ["visits", "Visitas"],
  ["reach", "Alcance"],
  ["viewers", "Visualizadores"],
  ["profileViews", "Visitas ao perfil"],
];

function formatNumber(value: number | null | undefined) {
  return value === null || value === undefined ? "Indisponível" : new Intl.NumberFormat("pt-BR").format(value);
}

export default function SocialComparisonPanel() {
  const [from, setFrom] = useState("2025-01-01");
  const [to, setTo] = useState("2026-12-31");
  const [platforms, setPlatforms] = useState<Platform[]>(["facebook", "instagram", "tiktok"]);
  const comparison = trpc.socialComparison.useQuery({ from, to, platforms }, { enabled: platforms.length > 0 && from <= to });
  const selectedPlatforms = platforms;

  const togglePlatform = (platform: Platform) => {
    setPlatforms(current => current.includes(platform) ? current.filter(item => item !== platform) : [...current, platform]);
  };

  return (
    <Card className="mb-6 border-border/70 bg-card/90 shadow-sm">
      <CardHeader className="gap-4">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
          <div>
            <CardTitle className="font-serif text-xl text-card-foreground">Comparativo social</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Compare o desempenho importado por plataforma no mesmo período.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground"><Filter className="h-3.5 w-3.5" /> Filtros ativos</div>
        </div>
        <div className="grid gap-3 rounded-xl border border-border/70 bg-background/50 p-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="grid gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">De<Input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label>
          <label className="grid gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Até<Input type="date" value={to} onChange={event => setTo(event.target.value)} /></label>
          <div className="flex flex-wrap gap-2">
            {(["facebook", "instagram", "tiktok"] as Platform[]).map(platform => {
              const active = platforms.includes(platform);
              return <Button key={platform} type="button" variant={active ? "default" : "outline"} size="sm" onClick={() => togglePlatform(platform)} aria-pressed={active} className="gap-1.5"><Check className={`h-3.5 w-3.5 ${active ? "opacity-100" : "opacity-0"}`} />{platformLabels[platform]}</Button>;
            })}
          </div>
        </div>
        {from > to && <p className="text-sm text-destructive">A data inicial precisa ser anterior à data final.</p>}
      </CardHeader>
      <CardContent>
        {comparison.isLoading ? <div className="grid gap-3 md:grid-cols-3"><div className="h-32 animate-pulse rounded-xl bg-muted" /><div className="h-32 animate-pulse rounded-xl bg-muted" /><div className="h-32 animate-pulse rounded-xl bg-muted" /></div> : comparison.error ? <p className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">Não foi possível carregar o comparativo social protegido.</p> : selectedPlatforms.length === 0 ? <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Selecione pelo menos uma plataforma.</p> : (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              {selectedPlatforms.map(platform => {
                const summary = comparison.data?.summary[platform];
                const Icon = platformIcons[platform];
                return <div key={platform} className="rounded-xl border border-border/70 bg-background/60 p-4"><div className="flex items-center gap-2 text-muted-foreground"><Icon className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wide">{platformLabels[platform]}</span></div><p className="mt-3 font-serif text-2xl text-foreground">{summary?.latestDate ?? "Sem dados"}</p><p className="mt-1 text-xs text-muted-foreground">{summary?.observedDays ?? 0} dias no período</p></div>;
              })}
            </div>
            <div className="mt-5 overflow-x-auto rounded-xl border border-border/70">
              <table className="w-full min-w-[720px] text-sm"><thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Métrica</th>{selectedPlatforms.map(platform => <th key={platform} className="px-4 py-3">{platformLabels[platform]} · último dia</th>)}</tr></thead><tbody className="divide-y divide-border/70">{metricLabels.map(([key, label]) => <tr key={key}><th className="px-4 py-3 text-left font-medium text-foreground">{label}</th>{selectedPlatforms.map(platform => <td key={platform} className="px-4 py-3 text-muted-foreground">{formatNumber(comparison.data?.summary[platform]?.latest[key] as number | null | undefined)}</td>)}</tr>)}</tbody></table>
            </div>
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><BarChart3 className="h-3.5 w-3.5" /> Totais só são exibidos quando todos os dias da plataforma possuem valor; “Indisponível” não significa zero.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
