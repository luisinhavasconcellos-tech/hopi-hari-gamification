import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Target, TrendingUp, ShoppingCart, Percent, X } from "lucide-react";
import { Card, CardTitle, ChartSkeleton, Kpi } from "@/components/dashboard/primitives";
import { DataTable, Section, compact, tooltipStyle } from "@/components/audience/AudienceUI";
import { useSalesMeeting } from "@/hooks/useSalesMeeting";
import { formatNumber } from "@/lib/format";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brlCompact = (v: number) =>
  v >= 1_000_000 ? `R$ ${(v / 1_000_000).toFixed(1)} mi` : v >= 1_000 ? `R$ ${(v / 1_000).toFixed(0)} mil` : brl(v);
const pct = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`);
const signedBrl = (v: number) => `${v >= 0 ? "+" : "−"}${brl(Math.abs(v))}`;

const fmtDate = (d: string | null) =>
  d ? new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "";

/** Caixa base dos tooltips customizados (mesmo visual dos cards). */
function TipBox({ title, rows, footer }: { title: string; rows: { label: string; value: string; tone?: "success" | "destructive" | "muted" }[]; footer?: string }) {
  const tone = (t?: string) =>
    t === "success" ? "text-success" : t === "destructive" ? "text-destructive" : t === "muted" ? "text-muted-foreground" : "";
  return (
    <div className="rounded-lg border border-border bg-card/95 px-3 py-2 shadow-xl backdrop-blur">
      <div className="mb-1.5 text-xs font-semibold">{title}</div>
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-6 text-[11px]">
            <span className="text-muted-foreground">{r.label}</span>
            <span className={`tabular-nums font-medium ${tone(r.tone)}`}>{r.value}</span>
          </div>
        ))}
      </div>
      {footer && <div className="mt-1.5 border-t border-border pt-1.5 text-[10px] text-muted-foreground">{footer}</div>}
    </div>
  );
}

const growthTone = (v: number | null): "success" | "destructive" | "muted" =>
  v === null ? "muted" : v >= 0 ? "success" : "destructive";


function ChannelTooltip({ active, payload }: { active?: boolean; payload?: { payload: { channel: string; realizado: number; anterior: number; growth: number | null } }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const delta = d.realizado - d.anterior;
  return (
    <TipBox
      title={d.channel}
      rows={[
        { label: "Realizado 2026 (R$)", value: brl(d.realizado) },
        { label: "Realizado 2025 (R$)", value: brl(d.anterior) },
        { label: "Variação (R$)", value: signedBrl(delta), tone: delta >= 0 ? "success" : "destructive" },
        { label: "Variação YoY (%)", value: pct(d.growth), tone: growthTone(d.growth) },
      ]}
      footer="Mesmo período: 01 a 16 de agosto"
    />
  );
}

function FunnelTooltip({ active, payload, label }: { active?: boolean; payload?: { payload: { cur: number; prev: number; stepRateCur: number | null; stepRatePrev: number | null } }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const growth = d.prev ? ((d.cur - d.prev) / d.prev) * 100 : null;
  const rateDelta =
    d.stepRateCur !== null && d.stepRatePrev !== null ? d.stepRateCur - d.stepRatePrev : null;
  return (
    <TipBox
      title={String(label ?? "")}
      rows={[
        { label: "Volume 2026", value: `${formatNumber(d.cur)} sessões` },
        { label: "Volume 2025", value: `${formatNumber(d.prev)} sessões` },
        { label: "Variação YoY (%)", value: pct(growth), tone: growthTone(growth) },
        ...(d.stepRateCur !== null
          ? [
              { label: "Passagem 2026 (%)", value: `${d.stepRateCur.toFixed(1)}%` },
              { label: "Passagem 2025 (%)", value: d.stepRatePrev === null ? "—" : `${d.stepRatePrev.toFixed(1)}%` },
              {
                label: "Δ passagem (p.p.)",
                value: rateDelta === null ? "—" : `${rateDelta > 0 ? "+" : ""}${rateDelta.toFixed(1)} p.p.`,
                tone: growthTone(rateDelta),
              },
            ]
          : []),
      ]}
      footer="Passagem = conversão em relação à etapa anterior"
    />
  );
}

function GoalTooltip({ active, payload, label }: { active?: boolean; payload?: { payload: { meta: number; realizado: number; anterior: number; attainment: number | null; growth: number | null } }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const saldo = d.realizado - d.meta;
  return (
    <TipBox
      title={String(label ?? "")}
      rows={[
        { label: "Meta ago/26 (R$)", value: brl(d.meta) },
        { label: "Realizado 2026 (R$)", value: brl(d.realizado) },
        { label: "Realizado 2025 (R$)", value: brl(d.anterior) },
        {
          label: "Atingimento (%)",
          value: d.attainment === null ? "—" : `${d.attainment.toFixed(0)}%`,
          tone: (d.attainment ?? 0) >= 100 ? "success" : "destructive",
        },
        { label: "Saldo vs meta (R$)", value: signedBrl(saldo), tone: saldo >= 0 ? "success" : "destructive" },
        { label: "Variação YoY (%)", value: pct(d.growth), tone: growthTone(d.growth) },
      ]}
      footer="Acumulado de 01 a 16/08 · 100% = meta atingida"
    />
  );
}

function DrillTooltip({ active, payload }: { active?: boolean; payload?: { payload: { channel: string; cur: number; prev: number; delta: number; growth: number | null; share: number } }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <TipBox
      title={d.channel}
      rows={[
        { label: "2025 (R$)", value: brl(d.prev) },
        { label: "2026 (R$)", value: brl(d.cur) },
        { label: "Variação (R$)", value: signedBrl(d.delta), tone: d.delta >= 0 ? "success" : "destructive" },
        { label: "Variação YoY (%)", value: pct(d.growth), tone: growthTone(d.growth) },
        { label: "Peso na variação (%)", value: `${d.share.toFixed(0)}%` },
      ]}
      footer="Peso = participação no total absoluto das variações"
    />
  );
}


export default function SalesMeetingPanel() {
  const { channels, meta, funnelCompare, loading, hasData } = useSalesMeeting();
  const [selectedStep, setSelectedStep] = useState<string | null>(null);

  if (!loading && !hasData) return null;


  const detail = channels.filter((c) => c.scope !== "total");
  const chartData = detail
    .filter((c) => !["Externo", "Interno"].includes(c.channel))
    .map((c) => ({
      channel: c.channel,
      realizado: c.realized_current,
      anterior: c.realized_previous,
      meta: c.goal,
      growth: c.realized_previous ? ((c.realized_current - c.realized_previous) / c.realized_previous) * 100 : null,
    }));

  const goalCompare = chartData.map((c) => ({
    ...c,
    attainment: c.meta ? (c.realizado / c.meta) * 100 : null,
  }));

  const rate = (a: number, b: number) => (b ? (a / b) * 100 : null);
  const funnelTrend = (funnelCompare?.steps ?? []).map((s, i, arr) => ({
    label: s.label,
    cur: s.cur,
    prev: s.prev,
    stepRateCur: i === 0 ? null : rate(s.cur, arr[i - 1].cur),
    stepRatePrev: i === 0 ? null : rate(s.prev, arr[i - 1].prev),
  }));

  // Drill-down: contribuição de cada canal para a variação 2025 → 2026
  const step = funnelCompare?.steps.find((s) => s.label === selectedStep) ?? null;
  const contributions = chartData
    .map((c) => ({
      channel: c.channel,
      delta: c.realizado - c.anterior,
      cur: c.realizado,
      prev: c.anterior,
      growth: c.growth,
    }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const totalDelta = contributions.reduce((s, c) => s + c.delta, 0);
  const totalAbs = contributions.reduce((s, c) => s + Math.abs(c.delta), 0) || 1;
  const drill = contributions.map((c) => ({
    ...c,
    share: (Math.abs(c.delta) / totalAbs) * 100,
  }));


  return (
    <>
      <div className="mt-10 mb-4">
        <h2 className="text-lg font-semibold">Reunião de vendas — {fmtDate(meta.meetingDate)} 2026</h2>
        <p className="text-xs text-muted-foreground">
          Acompanhamento de metas até {fmtDate(meta.periodEnd)}, comparado ao mesmo período de 2025.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi
          label="Realizado no mês"
          value={meta.total ? brlCompact(meta.total.realized_current) : "—"}
          icon={<ShoppingCart className="size-4 text-primary" />}
        />
        <Kpi
          label="Atingimento da meta"
          value={meta.attainment === null ? "—" : `${meta.attainment.toFixed(1)}%`}
          icon={<Target className="size-4 text-accent" />}
          accent="accent"
        />
        <Kpi
          label="Crescimento YoY"
          value={pct(meta.growth)}
          icon={<TrendingUp className="size-4 text-success" />}
          accent={(meta.growth ?? 0) >= 0 ? "success" : undefined}
        />
        <Kpi
          label="Conversão e-commerce"
          value={funnelCompare?.cur.conversion_rate ? `${funnelCompare.cur.conversion_rate.toFixed(2)}%` : "—"}
          icon={<Percent className="size-4 text-muted-foreground" />}
        />
      </div>

      <Section cols="grid-cols-1 lg:grid-cols-2 items-start">
        <Card>
          <CardTitle title="Realizado por canal — 2025 x 2026" hint="Receita em R$, mesmo período (01 a 16/08) · rótulo = variação YoY" />
          {loading ? (
            <ChartSkeleton height={340} />
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 48, bottom: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v: number) => compact(v)}
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  label={{ value: "Receita (R$)", position: "insideBottom", offset: -8, fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis type="category" dataKey="channel" width={128} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip cursor={{ fill: "hsl(var(--muted)/0.3)" }} content={<ChannelTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar name="Realizado 2025 (R$)" dataKey="anterior" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} barSize={11} />
                <Bar name="Realizado 2026 (R$)" dataKey="realizado" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} barSize={11}>
                  <LabelList
                    dataKey="growth"
                    position="right"
                    fontSize={10}
                    formatter={(v: number | null) => (v === null ? "" : pct(v))}
                  />
                </Bar>

              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardTitle
            title="Funil de e-commerce"
            hint="Ago/2025 x Ago/2026 (01 a 16) — clique em uma etapa para ver os canais"
          />
          {loading || !funnelCompare ? (
            <ChartSkeleton height={340} />
          ) : (
            <div className="flex flex-col gap-3">
              {funnelCompare.steps.map((s) => {
                const width = (s.cur / funnelCompare.steps[0].cur) * 100;
                const active = selectedStep === s.label;
                return (
                  <button
                    type="button"
                    key={s.label}
                    onClick={() => setSelectedStep(active ? null : s.label)}
                    aria-pressed={active}
                    className={`w-full space-y-1 rounded-lg px-2 py-1.5 text-left transition-colors ${
                      active
                        ? "bg-primary/10 ring-1 ring-inset ring-primary/40"
                        : selectedStep
                          ? "opacity-60 hover:bg-muted/50"
                          : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-muted-foreground">{s.label}</span>
                      <span className="tabular-nums font-semibold">
                        {formatNumber(s.cur)}{" "}
                        <span className={(s.growth ?? 0) >= 0 ? "text-success" : "text-destructive"}>{pct(s.growth)}</span>
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(width, 2)}%` }} />
                    </div>
                    <div className="text-[10px] text-muted-foreground">2025: {formatNumber(s.prev)}</div>
                  </button>
                );
              })}

              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border text-xs">
                <div>
                  <div className="text-muted-foreground">Receita site</div>
                  <div className="font-semibold tabular-nums">{brlCompact(funnelCompare.cur.revenue)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Ticket médio</div>
                  <div className="font-semibold tabular-nums">
                    {funnelCompare.cur.avg_ticket ? brl(funnelCompare.cur.avg_ticket) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Conversão</div>
                  <div className="font-semibold tabular-nums">
                    {funnelCompare.cur.conversion_rate?.toFixed(2)}% <span className="text-success">vs {funnelCompare.prev.conversion_rate?.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </Section>

      {step && (
        <Section cols="grid-cols-1">
          <Card>
            <CardTitle
              title={`Quem explica a variação — ${step.label}`}
              hint={`${formatNumber(step.prev)} (2025) → ${formatNumber(step.cur)} (2026) · ${pct(step.growth)} · variação líquida de receita ${signedBrl(totalDelta)}`}
              right={
                <button
                  type="button"
                  onClick={() => setSelectedStep(null)}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" /> Fechar
                </button>
              }
            />
            <div className="grid gap-4 lg:grid-cols-2 items-start">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={drill} layout="vertical" margin={{ left: 8, right: 48, bottom: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v: number) => compact(v)}
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    label={{ value: "Variação de receita 2026 − 2025 (R$)", position: "insideBottom", offset: -8, fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis type="category" dataKey="channel" width={128} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip cursor={{ fill: "hsl(var(--muted)/0.3)" }} content={<DrillTooltip />} />

                  <ReferenceLine x={0} stroke="hsl(var(--border))" />
                  <Bar dataKey="delta" radius={[0, 4, 4, 0]} barSize={14}>
                    {drill.map((d) => (
                      <Cell key={d.channel} fill={d.delta >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"} />
                    ))}
                    <LabelList
                      dataKey="delta"
                      position="right"
                      fontSize={10}
                      formatter={(v: number) => signedBrl(v)}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <DataTable
                rows={drill}
                rowKey={(r) => r.channel}
                maxHeight="max-h-[300px]"
                columns={[
                  { key: "channel", header: "Canal", width: "w-[28%]", render: (r) => r.channel },
                  { key: "prev", header: "2025", align: "right", width: "w-[18%]", render: (r) => brlCompact(r.prev) },
                  { key: "cur", header: "2026", align: "right", width: "w-[18%]", render: (r) => brlCompact(r.cur) },
                  {
                    key: "delta",
                    header: "Variação",
                    align: "right",
                    width: "w-[18%]",
                    render: (r) => (
                      <span className={r.delta >= 0 ? "text-success" : "text-destructive"}>{signedBrl(r.delta)}</span>
                    ),
                  },
                  {
                    key: "share",
                    header: "Peso na variação",
                    align: "right",
                    width: "w-[18%]",
                    render: (r) => `${r.share.toFixed(0)}%`,
                  },
                ]}
              />
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              As etapas do funil (visitas, produto, carrinho) vêm apenas do e-commerce do site; a decomposição por canal
              usa a receita realizada de cada canal no mesmo período de 2025 e 2026, ordenada pelo tamanho da variação.
            </p>
          </Card>
        </Section>
      )}

      <Section cols="grid-cols-1 lg:grid-cols-2 items-start">
        <Card>
          <CardTitle
            title="Tendência do funil — Ago/2025 x Ago/2026"
            hint="Barras = volume de sessões (esq.) · linhas = taxa de passagem em % da etapa anterior (dir.)"
          />
          {loading || !funnelCompare ? (
            <ChartSkeleton height={320} />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={funnelTrend} margin={{ left: 12, right: 12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval={0} />
                <YAxis
                  yAxisId="l"
                  tickFormatter={(v: number) => compact(v)}
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  label={{ value: "Sessões", angle: -90, position: "insideLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  yAxisId="r"
                  orientation="right"
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  label={{ value: "Taxa de passagem", angle: 90, position: "insideRight", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip cursor={{ fill: "hsl(var(--muted)/0.3)" }} content={<FunnelTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="l" name="Volume 2025" dataKey="prev" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} barSize={22} />
                <Bar yAxisId="l" name="Volume 2026" dataKey="cur" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} barSize={22} />

                <Line
                  yAxisId="r"
                  name="Passagem 2026 (%)"
                  type="monotone"
                  dataKey="stepRateCur"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
                <Line
                  yAxisId="r"
                  name="Passagem 2025 (%)"
                  type="monotone"
                  dataKey="stepRatePrev"
                  stroke="hsl(var(--chart-4))"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3 }}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardTitle
            title="Meta x realizado — Ago/2026 vs Ago/2025"
            hint="Barras = receita em R$ (esq.) · linha = % de atingimento da meta (dir., 100% = meta batida)"
          />
          {loading ? (
            <ChartSkeleton height={320} />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={goalCompare} margin={{ left: 12, right: 12, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="channel"
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={54}
                />
                <YAxis
                  yAxisId="l"
                  tickFormatter={(v: number) => compact(v)}
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  label={{ value: "Receita (R$)", angle: -90, position: "insideLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  yAxisId="r"
                  orientation="right"
                  tickFormatter={(v: number) => `${v}%`}
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  label={{ value: "Atingimento", angle: 90, position: "insideRight", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip cursor={{ fill: "hsl(var(--muted)/0.3)" }} content={<GoalTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="l" name="Meta ago/26 (R$)" dataKey="meta" fill="hsl(var(--muted-foreground))" fillOpacity={0.35} radius={[4, 4, 0, 0]} barSize={16} />
                <Bar yAxisId="l" name="Realizado 2025 (R$)" dataKey="anterior" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} barSize={16} />
                <Bar yAxisId="l" name="Realizado 2026 (R$)" dataKey="realizado" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} barSize={16} />
                <ReferenceLine
                  yAxisId="r"
                  y={100}
                  stroke="hsl(var(--accent))"
                  strokeDasharray="4 4"
                  label={{ value: "Meta 100%", position: "right", fontSize: 9, fill: "hsl(var(--accent))" }}
                />
                <Line
                  yAxisId="r"
                  name="Atingimento da meta (%)"
                  type="monotone"
                  dataKey="attainment"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                >
                  <LabelList
                    dataKey="attainment"
                    position="top"
                    fontSize={9}
                    formatter={(v: number | null) => (v === null ? "" : `${v.toFixed(0)}%`)}
                  />
                </Line>

              </ComposedChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Meta x realizado por canal" hint="Saldo e atingimento até 16/08" />
          <DataTable
            rows={detail}
            rowKey={(r) => r.channel}
            columns={[
              {
                key: "channel",
                header: "Canal",
                width: "w-[22%]",
                render: (r) => (
                  <span className={["Externo", "Interno"].includes(r.channel) ? "font-semibold" : ""}>{r.channel}</span>
                ),
              },
              { key: "goal", header: "Meta ago/26", align: "right", width: "w-[16%]", render: (r) => brl(r.goal) },
              { key: "cur", header: "Realizado 26", align: "right", width: "w-[16%]", render: (r) => brl(r.realized_current) },
              { key: "prev", header: "Realizado 25", align: "right", width: "w-[16%]", render: (r) => brl(r.realized_previous) },
              {
                key: "att",
                header: "Atingimento",
                align: "right",
                width: "w-[14%]",
                render: (r) => (r.goal ? `${((r.realized_current / r.goal) * 100).toFixed(0)}%` : "—"),
              },
              {
                key: "yoy",
                header: "YoY",
                align: "right",
                width: "w-[16%]",
                render: (r) => {
                  const g = r.realized_previous
                    ? ((r.realized_current - r.realized_previous) / r.realized_previous) * 100
                    : null;
                  return <span className={(g ?? 0) >= 0 ? "text-success" : "text-destructive"}>{pct(g)}</span>;
                },
              },
            ]}
          />
        </Card>
      </Section>
    </>
  );
}
