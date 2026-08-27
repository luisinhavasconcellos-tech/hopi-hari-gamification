import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Scatter,
  ScatterChart,
  ZAxis,
  ReferenceLine,
} from "recharts";
import { Card, CardTitle, Kpi } from "@/components/dashboard/primitives";
import { DataTable, Section, CHART_COLORS, tooltipStyle } from "@/components/audience/AudienceUI";
import { useCrmInstagramOverlap, type OverlapRow } from "@/hooks/useCrmInstagramOverlap";
import type { CrmGeoRow, CrmDimRow } from "@/hooks/useCrmLeads";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatNumber } from "@/lib/mock-data";
import { Layers, Target, Camera, Phone } from "lucide-react";

const UFS = new Set([
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
]);

type Parsed = { level: "uf" | "city"; uf: string; city: string | null; share_pct: number };

/** Aceita linhas do Meta Business Suite: "SP 34,5%", "São Paulo, SP  12,3%", "Campinas SP 1.2%" */
function parsePaste(text: string): { rows: Parsed[]; errors: number } {
  const rows: Parsed[] = [];
  let errors = 0;
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line) => {
      const m = line.match(/(-?[\d.,]+)\s*%?\s*$/);
      if (!m) return void errors++;
      const share = Number(m[1].replace(/\./g, "").replace(",", "."));
      let head = line.slice(0, m.index).replace(/[,;\t|]+$/, "").trim();
      if (!head || !Number.isFinite(share)) return void errors++;

      const tokens = head.split(/[,\t|]+|\s+/).filter(Boolean);
      const last = tokens[tokens.length - 1]?.toUpperCase();
      if (tokens.length === 1 && UFS.has(last)) {
        rows.push({ level: "uf", uf: last, city: null, share_pct: share });
      } else if (UFS.has(last)) {
        const city = head.slice(0, head.toUpperCase().lastIndexOf(last)).replace(/[,\s-]+$/, "").trim();
        if (!city) return void errors++;
        rows.push({ level: "city", uf: last, city, share_pct: share });
      } else {
        errors++;
      }
    });
  return { rows, errors };
}

const pct = (v: number) => `${v.toFixed(1)}%`;
const indexLabel = (v: number) => (Number.isFinite(v) ? `${Math.round(v)}` : "—");

function IndexBadge({ value }: { value: number }) {
  const tone = !Number.isFinite(value)
    ? "bg-primary/15 text-primary"
    : value >= 130
      ? "bg-success/15 text-success"
      : value <= 70
        ? "bg-warning/15 text-warning"
        : "bg-muted/50 text-muted-foreground";
  return <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${tone}`}>{indexLabel(value)}</span>;
}

export default function CrmInstagramOverlap({
  geo,
  ufs,
  ddds,
  totalLeads,
}: {
  geo: CrmGeoRow[];
  ufs: CrmDimRow[];
  ddds: CrmDimRow[];
  totalLeads: number;
}) {
  const o = useCrmInstagramOverlap(geo, ufs, ddds);
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [paste, setPaste] = useState("");
  const [period, setPeriod] = useState("");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const preview = useMemo(() => parsePaste(paste), [paste]);

  const save = async () => {
    if (preview.rows.length === 0) return;
    setSaving(true);
    const payload = preview.rows.map((r) => ({
      level: r.level,
      uf: r.uf,
      city: r.city,
      share_pct: r.share_pct,
      period_label: period || null,
      source: "meta_business_suite",
    }));
    const levels = [...new Set(payload.map((p) => p.level))];
    // substitui o conjunto anterior dos níveis enviados
    await supabase.from("instagram_audience_geo").delete().in("level", levels);
    const { error } = await supabase.from("instagram_audience_geo").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Audiência do Instagram atualizada", description: `${payload.length} localizações importadas.` });
    setPaste("");
    setOpen(false);
    await o.reload();
  };

  const importer = (
    <div className="rounded-xl border border-border bg-muted/50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground">
          Cole as principais localizações do público (Meta Business Suite → Público → Principais localizações).
        </p>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="ml-auto rounded-lg border border-primary/40 bg-primary/15 px-3 py-1.5 text-xs font-medium"
          >
            {o.hasIgGeo ? "Atualizar dados" : "Importar dados"}
          </button>
        )}
      </div>
      {open && (
        <div className="mt-3 space-y-3">
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={7}
            spellCheck={false}
            placeholder={"SP  38,4%\nRJ  9,1%\nSão Paulo, SP  12,3%\nCampinas, SP  3,1%"}
            className="w-full rounded-lg border border-border bg-background/60 p-3 font-mono text-xs outline-none focus:border-primary/50"
          />
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="Período (ex.: abr/2026)"
              className="rounded-lg border border-border bg-background/60 px-3 py-1.5 text-xs outline-none focus:border-primary/50"
            />
            <span className="text-[11px] text-muted-foreground">
              {preview.rows.length} linhas válidas
              {preview.errors > 0 ? ` · ${preview.errors} ignoradas` : ""}
            </span>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => {
                  setOpen(false);
                  setPaste("");
                }}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving || preview.rows.length === 0}
                className="rounded-lg border border-primary/40 bg-primary/15 px-3 py-1.5 text-xs font-medium disabled:opacity-40"
              >
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (o.loading) {
    return (
      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Sobreposição CRM × Instagram" />
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </Card>
      </Section>
    );
  }

  if (!o.hasIgGeo) {
    return (
      <Section cols="grid-cols-1">
        <Card>
          <CardTitle
            title="Sobreposição CRM × Instagram"
            hint="Compara onde estão os leads do CRM e onde está a audiência do Instagram"
          />
          <p className="mb-3 text-sm text-muted-foreground">
            O Instagram não expõe a localização do público pela API — sem esses dados não é possível calcular a
            sobreposição. {isAdmin ? "Importe a distribuição por estado/cidade para liberar a análise." : "Peça a um administrador para importar a distribuição por estado/cidade."}
          </p>
          {isAdmin && importer}
        </Card>
      </Section>
    );
  }

  const chartRows = o.ufRows.slice(0, 14).map((r) => ({
    uf: r.uf,
    Leads: Number(r.leadsShare.toFixed(2)),
    Instagram: Number(r.igShare.toFixed(2)),
  }));
  const scatterRows = o.ufRows
    .filter((r) => r.leadsShare > 0 || r.igShare > 0)
    .map((r) => ({ ...r, x: r.leadsShare, y: r.igShare, z: r.leads || 1 }));
  const maxAxis = Math.max(...scatterRows.map((r) => Math.max(r.x, r.y)), 1);

  const tableRows: OverlapRow[] = o.cityRows.length > 0 ? o.cityRows : o.ufRows;

  return (
    <>
      <Section cols="grid-cols-1">
        <Card>
          <CardTitle
            title="Sobreposição CRM × Instagram"
            hint={`Leads geolocalizados × audiência do Instagram${o.period ? ` · ${o.period}` : ""}`}
          />

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              label="Índice de sobreposição"
              value={pct(o.overlapScore)}
              icon={<Layers className="size-4" />}
            />
            <Kpi
              label="Leads em UFs com audiência"
              value={pct(o.leadsCoveredPct)}
              icon={<Target className="size-4" />}
              accent="accent"
            />
            <Kpi
              label="Audiência em UFs com leads"
              value={pct(o.igCoveredPct)}
              icon={<Camera className="size-4" />}
              accent="success"
            />
            <Kpi
              label="Telefones (DDD) cobertos"
              value={pct(o.phoneCoveredPct)}
              icon={<Phone className="size-4" />}
              accent="warning"
            />
          </div>

          {isAdmin && <div className="mt-4">{importer}</div>}
        </Card>
      </Section>

      <Section>
        <Card>
          <CardTitle title="Share por estado" hint="% da base de leads vs % da audiência do Instagram" />
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartRows} margin={{ left: 4, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="uf" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip {...tooltipStyle} formatter={(v: number) => `${Number(v).toFixed(1)}%`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Leads" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Instagram" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardTitle
            title="Mapa de afinidade"
            hint="Acima da diagonal: IG mais forte que o CRM · abaixo: CRM sub-representado no IG"
          />
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ left: 4, right: 12, top: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                dataKey="x"
                name="Leads"
                domain={[0, Math.ceil(maxAxis)]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Instagram"
                domain={[0, Math.ceil(maxAxis)]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <ZAxis type="number" dataKey="z" range={[40, 400]} />
              <ReferenceLine
                segment={[
                  { x: 0, y: 0 },
                  { x: maxAxis, y: maxAxis },
                ]}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
              />
              <Tooltip
                {...tooltipStyle}
                cursor={{ strokeDasharray: "3 3" }}
                formatter={(v: number, n: string) => [`${Number(v).toFixed(1)}%`, n]}
                labelFormatter={() => ""}
                content={({ payload }) => {
                  const p = payload?.[0]?.payload as OverlapRow | undefined;
                  if (!p) return null;
                  return (
                    <div className="rounded-lg border border-border bg-background/95 p-2 text-xs">
                      <p className="font-medium">{p.uf}</p>
                      <p className="text-muted-foreground">Leads: {pct(p.leadsShare)} ({formatNumber(p.leads)})</p>
                      <p className="text-muted-foreground">Instagram: {pct(p.igShare)}</p>
                      <p className="text-muted-foreground">Índice: {indexLabel(p.index)}</p>
                    </div>
                  );
                }}
              />
              <Scatter data={scatterRows} fill={CHART_COLORS[2]} fillOpacity={0.75} />
            </ScatterChart>
          </ResponsiveContainer>
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle
            title={o.cityRows.length > 0 ? "Sobreposição por cidade" : "Sobreposição por estado"}
            hint="Índice 100 = presença proporcional nas duas bases · >130 audiência sem base de leads · <70 leads sem audiência"
          />
          <DataTable
            rows={tableRows}
            rowKey={(r) => r.key}
            maxHeight="max-h-[460px]"
            columns={[
              { key: "label", header: o.cityRows.length > 0 ? "Cidade" : "Estado", width: "w-[34%]", render: (r) => r.label },
              { key: "uf", header: "UF", render: (r) => r.uf },
              { key: "leads", header: "Leads", align: "right", render: (r) => formatNumber(r.leads) },
              { key: "ls", header: "% leads", align: "right", render: (r) => pct(r.leadsShare) },
              { key: "is", header: "% audiência", align: "right", render: (r) => pct(r.igShare) },
              {
                key: "fol",
                header: "Seguidores est.",
                align: "right",
                render: (r) => (o.igFollowers > 0 ? formatNumber(r.igFollowers) : "—"),
              },
              { key: "idx", header: "Índice", align: "right", render: (r) => <IndexBadge value={r.index} /> },
            ]}
          />
          {(o.ufsOnlyLeads.length > 0 || o.ufsOnlyIg.length > 0) && (
            <div className="mt-3 grid gap-2 text-[11px] text-muted-foreground sm:grid-cols-2">
              {o.ufsOnlyLeads.length > 0 && (
                <p>
                  <span className="text-foreground">Só no CRM:</span> {o.ufsOnlyLeads.join(", ")}
                </p>
              )}
              {o.ufsOnlyIg.length > 0 && (
                <p>
                  <span className="text-foreground">Só no Instagram:</span> {o.ufsOnlyIg.join(", ")}
                </p>
              )}
            </div>
          )}
        </Card>
      </Section>
    </>
  );
}
