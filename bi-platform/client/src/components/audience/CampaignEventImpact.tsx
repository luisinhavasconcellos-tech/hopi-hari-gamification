import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarRange, Link2, TrendingUp } from "lucide-react";
import { Card, CardTitle, ChartSkeleton, EmptyState, Kpi } from "@/components/dashboard/primitives";
import { DataTable, Section, compact, tooltipStyle } from "@/components/audience/AudienceUI";
import { formatNumber } from "@/lib/format";
import { useCampaignEventImpact, type EventImpact } from "@/hooks/useCampaignEventImpact";
import type { EnrichedCampaign } from "@/hooks/useCampaigns";

const money = (v: number) =>
  v >= 1_000_000 ? `R$ ${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${Math.round(v)}`;

const fmtDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

function rLabel(r: number | null) {
  if (r === null) return { text: "amostra insuficiente", tone: "text-muted-foreground" };
  const a = Math.abs(r);
  const s = a >= 0.7 ? "forte" : a >= 0.4 ? "moderada" : a >= 0.2 ? "fraca" : "desprezível";
  return { text: `${r >= 0 ? "positiva" : "negativa"} ${s}`, tone: r >= 0 ? "text-success" : "text-destructive" };
}

function CorrGrid({ items }: { items: { key: string; label: string; r: number | null }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((c) => {
        const l = rLabel(c.r);
        return (
          <div key={c.key} className="rounded-xl border border-border bg-muted/50 p-3">
            <div className="text-xs text-muted-foreground">{c.label}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-semibold tabular-nums">{c.r === null ? "—" : c.r.toFixed(2)}</span>
              <span className={`text-[11px] ${l.tone}`}>{l.text}</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full ${(c.r ?? 0) >= 0 ? "bg-success" : "bg-destructive"}`}
                style={{ width: `${Math.min(100, Math.abs(c.r ?? 0) * 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CampaignEventImpact({ campaigns }: { campaigns: EnrichedCampaign[] }) {
  const {
    loading,
    impacts,
    sample,
    eventCorrelations,
    monthly,
    monthlyCorrelations,
    totalEvents,
    linkedCount,
    hasData,
  } = useCampaignEventImpact(campaigns);
  const [openId, setOpenId] = useState<string | null>(null);

  const open = impacts.find((i) => i.id === openId) ?? null;

  return (
    <>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Kpi label="Eventos com data" value={String(totalEvents)} icon={<CalendarRange className="size-4 text-primary" />} />
        <Kpi
          label="Eventos com campanha vinculada"
          value={String(linkedCount)}
          icon={<Link2 className="size-4 text-accent" />}
          accent="accent"
        />
        <Kpi
          label="Amostra de correlação"
          value={String(sample.length)}
          icon={<TrendingUp className="size-4 text-success" />}
          accent="success"
        />
      </div>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle
            title="Correlação campanha → evento → público e vendas"
            hint="Cada ponto é um evento com campanhas vinculadas (nome semelhante ou veiculação até 30 dias antes)"
          />
          {loading ? (
            <ChartSkeleton />
          ) : sample.length < 3 ? (
            <EmptyState title="Amostra insuficiente por evento — veja a análise mensal abaixo" />
          ) : (
            <CorrGrid items={eventCorrelations} />
          )}
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle
            title="Correlação mensal"
            hint="Dias de campanha e de evento por mês vs. público (rides) e receita — base 2025–2026"
          />
          {loading ? <ChartSkeleton /> : !hasData ? <EmptyState title="Sem dados operacionais" /> : <CorrGrid items={monthlyCorrelations} />}
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Campanhas, eventos, público e receita por mês" hint="Barras: público e receita · Linhas: dias de campanha e de evento" />
          {loading ? (
            <ChartSkeleton />
          ) : monthly.length === 0 ? (
            <EmptyState title="Sem série mensal" />
          ) : (
            <ResponsiveContainer width="100%" height={360}>
              <ComposedChart data={monthly} margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="l" tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v: number, n: string) => [n === "Receita" ? money(Number(v)) : formatNumber(Number(v)), n]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="l" name="Público (rides)" dataKey="rides" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="l" name="Receita" dataKey="revenue" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                <Line yAxisId="r" name="Dias de campanha" dataKey="campaignDays" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                <Line yAxisId="r" name="Dias de evento" dataKey="eventDays" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle
            title="Eventos: campanhas, público e vendas"
            hint="Público e receita rateados pelos dias do evento (base mensal) · clique para ver as campanhas"
          />
          {loading ? (
            <ChartSkeleton />
          ) : impacts.length === 0 ? (
            <EmptyState title="Nenhum evento com data cadastrada" />
          ) : (
            <DataTable
              rows={impacts}
              rowKey={(r) => r.id}
              onRowClick={(r) => setOpenId(openId === r.id ? null : r.id)}
              isRowActive={(r) => r.id === openId}
              columns={[
                {
                  key: "ev",
                  header: "Evento",
                  render: (r: EventImpact) => (
                    <div className="min-w-[180px]">
                      <div className="truncate text-foreground">{r.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {fmtDate(r.start)} – {fmtDate(r.end)} · {r.days}d · {r.category ?? "—"}
                      </div>
                    </div>
                  ),
                },
                { key: "camp", header: "Campanhas", align: "right", render: (r: EventImpact) => String(r.campaigns.length) },
                { key: "int", header: "Interações", align: "right", render: (r: EventImpact) => formatNumber(r.campaignInteractions) },
                { key: "rides", header: "Público (rides)", align: "right", render: (r: EventImpact) => formatNumber(r.rides) },
                {
                  key: "rpd",
                  header: "Rides/dia",
                  align: "right",
                  render: (r: EventImpact) => formatNumber(Math.round(r.ridesPerDay)),
                },
                { key: "rev", header: "Receita", align: "right", render: (r: EventImpact) => money(r.revenue) },
                {
                  key: "rvd",
                  header: "Receita/dia",
                  align: "right",
                  render: (r: EventImpact) => money(r.revenuePerDay),
                },
              ]}
            />
          )}
          {open && (
            <div className="mt-4 rounded-xl border border-border bg-muted/50 p-3">
              <div className="text-xs font-medium text-foreground">Campanhas vinculadas · {open.title}</div>
              {open.campaigns.length === 0 ? (
                <p className="mt-2 text-[11px] text-muted-foreground">Nenhuma campanha veiculada até 30 dias antes deste evento.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(160, open.campaigns.length * 34 + 40)}>
                  <BarChart data={open.campaigns} layout="vertical" margin={{ left: 8, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => formatNumber(Number(v))} />
                    <Bar name="Interações" dataKey="interactions" fill="hsl(var(--chart-1))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            Público e receita vêm de bases mensais (rides por atração e vendas por canal); por isso são rateados pelos dias
            de cada evento. Correlação não implica causalidade.
          </p>
        </Card>
      </Section>
    </>
  );
}
