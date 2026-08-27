import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Users, Mail, Phone, Award, TrendingUp, MapPin, Info } from "lucide-react";

import {
  PageHeader,
  Kpi,
  Card,
  CardTitle,
  KpiSkeleton,
  ChartSkeleton,
  EmptyState,
} from "@/components/dashboard/primitives";
import { CHART_COLORS, DataTable, Section, compact, tooltipStyle } from "@/components/audience/AudienceUI";
import { useCrmLeads } from "@/hooks/useCrmLeads";
import { useCustomerRegistrations } from "@/hooks/useCustomerRegistrations";
import { useCustomerDemographics } from "@/hooks/useCustomerDemographics";
import { formatNumber } from "@/lib/mock-data";

const pct = (v: number, d = 1) => `${v.toFixed(d)}%`;

export default function LoyaltyPage() {
  const crm = useCrmLeads();
  const reg = useCustomerRegistrations();
  const demo = useCustomerDemographics();

  const loading = crm.loading || reg.loading;

  /** Coortes por ano de cadastro — base de clientes (CPFs). */
  const cohorts = useMemo(() => {
    const total = reg.total || 1;
    let acc = 0;
    return reg.byYear.map((y) => {
      acc += y.registrations;
      return {
        year: y.year,
        registrations: y.registrations,
        share: (y.registrations / total) * 100,
        cumulative: acc,
        cumulativeShare: (acc / total) * 100,
      };
    });
  }, [reg.byYear, reg.total]);

  const activeCohorts = cohorts.filter((c) => Number(c.year) >= new Date().getFullYear() - 2);
  const recentShare = activeCohorts.reduce((s, c) => s + c.share, 0);
  const legacyShare = 100 - recentShare;

  /** Contactabilidade da base CRM — proxy de capacidade de reativação. */
  const contactRate = crm.total ? (crm.withPhone / crm.total) * 100 : 0;
  const geoRate = crm.total ? (crm.withGeo / crm.total) * 100 : 0;
  const crmVsBase = reg.total ? (crm.total / reg.total) * 100 : 0;

  const contactability = [
    { label: "E-mail", value: crm.total, color: CHART_COLORS[0] },
    { label: "Telefone", value: crm.withPhone, color: CHART_COLORS[1] },
    { label: "Localização", value: crm.withGeo, color: CHART_COLORS[2] },
  ];

  /** Estados com maior potencial de relacionamento (leads CRM). */
  const topUfs = crm.ufs.filter((u) => u.bucket_key !== "ND").slice(0, 10);

  /** Cidades e canais de contato — base para campanhas de reativação. */
  const reactivationCities = crm.geo.slice(0, 20);
  const topDomains = crm.domains.slice(0, 6);
  const topDdds = crm.ddds.slice(0, 8);

  /** Faixas etárias da base — quem sustenta o relacionamento. */
  const ageGroups = demo.groups
    .filter((g) => g.bucket_key !== "nao informado")
    .map((g) => ({ label: g.bucket_label, customers: g.customers }));

  return (
    <div className="px-5 lg:px-8 py-6">
      <PageHeader
        eyebrow="Audience · Público"
        title="Fidelidade"
        subtitle="Coortes de cadastro, contactabilidade da base CRM e potencial de reativação."
      />

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <Kpi
              label="Base cadastrada (CPFs)"
              value={formatNumber(reg.total)}
              icon={<Users className="size-4 text-primary" />}
            />
            <Kpi
              label={`Leads no CRM · ${pct(crmVsBase)} da base`}
              value={formatNumber(crm.total)}
              icon={<Mail className="size-4 text-accent" />}
              accent="accent"
            />
            <Kpi
              label={`Contactáveis por telefone · ${formatNumber(crm.withPhone)}`}
              value={pct(contactRate)}
              icon={<Phone className="size-4 text-success" />}
              accent="success"
            />
            <Kpi
              label={`Coortes recentes · ${pct(legacyShare)} anteriores`}
              value={pct(recentShare)}
              icon={<Award className="size-4 text-warning" />}
              accent="warning"
            />
          </>
        )}
      </div>

      <Section cols="grid-cols-1 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card>
            <CardTitle
              title="Coortes por ano de cadastro"
              hint="Novos cadastros e base acumulada — quanto do relacionamento é recente"
            />
            {reg.loading ? (
              <ChartSkeleton height={300} />
            ) : cohorts.length === 0 ? (
              <EmptyState title="Sem cadastros" description="Nenhum cadastro carregado." />
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer>
                  <AreaChart data={cohorts}>
                    <defs>
                      <linearGradient id="loy-cum" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="loy-new" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 6" stroke="hsl(0 0% 100% / 0.06)" />
                    <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={compact} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatNumber(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" name="Base acumulada" dataKey="cumulative" stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#loy-cum)" />
                    <Area type="monotone" name="Novos cadastros" dataKey="registrations" stroke="hsl(var(--chart-2))" strokeWidth={2} fill="url(#loy-new)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        <Card>
          <CardTitle title="Contactabilidade" hint="Canais disponíveis para reativação (CRM)" />
          {crm.loading ? (
            <ChartSkeleton height={300} />
          ) : (
            <>
              <div className="h-[220px]">
                <ResponsiveContainer>
                  <BarChart data={contactability} layout="vertical" margin={{ left: 12 }}>
                    <CartesianGrid strokeDasharray="3 6" stroke="hsl(0 0% 100% / 0.06)" horizontal={false} />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={compact} />
                    <YAxis type="category" dataKey="label" width={90} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatNumber(v)} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {contactability.map((c) => (
                        <Cell key={c.label} fill={c.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-3 flex gap-2 text-[11px] leading-snug text-muted-foreground">
                <Info className="size-3.5 shrink-0" />
                {pct(geoRate)} dos leads têm localização e {pct(contactRate)} têm telefone — teto prático
                para campanhas de retenção segmentadas.
              </p>
            </>
          )}
        </Card>
      </Section>

      <Section cols="grid-cols-1 xl:grid-cols-2">
        <Card>
          <CardTitle title="Coortes em detalhe" hint="Participação de cada safra na base atual" />
          {reg.loading ? (
            <ChartSkeleton height={280} />
          ) : (
            <DataTable
              rows={[...cohorts].reverse()}
              rowKey={(r) => r.year}
              maxHeight="max-h-[320px]"
              columns={[
                { key: "year", header: "Safra", width: "w-[22%]", render: (r) => <span className="font-medium">{r.year}</span> },
                { key: "reg", header: "Cadastros", align: "right", render: (r) => formatNumber(r.registrations) },
                { key: "share", header: "% da base", align: "right", render: (r) => pct(r.share) },
                { key: "cum", header: "Acumulado", align: "right", render: (r) => formatNumber(r.cumulative) },
              ]}
            />
          )}
        </Card>

        <Card>
          <CardTitle title="Potencial de relacionamento por estado" hint="Leads CRM com localização informada" />
          {crm.loading ? (
            <ChartSkeleton height={280} />
          ) : topUfs.length === 0 ? (
            <EmptyState title="Sem geolocalização" description="Nenhum lead com UF informada." icon={<MapPin className="size-5" />} />
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer>
                <BarChart data={topUfs}>
                  <CartesianGrid strokeDasharray="3 6" stroke="hsl(0 0% 100% / 0.06)" vertical={false} />
                  <XAxis dataKey="bucket_label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={compact} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatNumber(v)} />
                  <Bar dataKey="leads" name="Leads" fill="hsl(var(--chart-3))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </Section>

      <Section cols="grid-cols-1 xl:grid-cols-2">
        <Card>
          <CardTitle
            title="Cidades prioritárias para reativação"
            hint="Maior volume de leads CRM — foco de campanhas de relacionamento"
          />
          {crm.loading ? (
            <ChartSkeleton height={280} />
          ) : reactivationCities.length === 0 ? (
            <EmptyState title="Sem cidades" description="Nenhum lead com cidade informada." icon={<MapPin className="size-5" />} />
          ) : (
            <DataTable
              rows={reactivationCities}
              rowKey={(r) => `${r.uf}-${r.city}`}
              maxHeight="max-h-[320px]"
              columns={[
                { key: "city", header: "Cidade", width: "w-[50%]", render: (r) => <span className="font-medium">{r.city}</span> },
                { key: "uf", header: "UF", render: (r) => r.uf },
                { key: "leads", header: "Leads", align: "right", render: (r) => formatNumber(r.leads) },
                { key: "share", header: "% CRM", align: "right", render: (r) => pct((r.leads / (crm.total || 1)) * 100, 2) },
              ]}
            />
          )}
        </Card>

        <Card>
          <CardTitle
            title="Canais de contato da base CRM"
            hint="Provedores de e-mail e DDDs com telefone — onde o relacionamento é alcançável"
          />
          {crm.loading ? (
            <ChartSkeleton height={280} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="h-[260px]">
                <ResponsiveContainer>
                  <BarChart data={topDomains} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 6" stroke="hsl(0 0% 100% / 0.06)" horizontal={false} />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={compact} />
                    <YAxis type="category" dataKey="bucket_label" width={80} stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatNumber(v)} />
                    <Bar dataKey="leads" name="Leads" fill="hsl(var(--chart-1))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="h-[260px]">
                <ResponsiveContainer>
                  <BarChart data={topDdds} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 6" stroke="hsl(0 0% 100% / 0.06)" horizontal={false} />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={compact} />
                    <YAxis type="category" dataKey="bucket_label" width={54} stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatNumber(v)} />
                    <Bar dataKey="leads" name="Leads com telefone" fill="hsl(var(--chart-2))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </Card>
      </Section>


      <Section cols="grid-cols-1 xl:grid-cols-2">
        <Card>
          <CardTitle title="Faixas etárias da base" hint="Quem sustenta o relacionamento de longo prazo" />
          {demo.loading ? (
            <ChartSkeleton height={280} />
          ) : ageGroups.length === 0 ? (
            <EmptyState title="Sem dados demográficos" description="Base sem faixa etária calculada." />
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer>
                <BarChart data={ageGroups}>
                  <CartesianGrid strokeDasharray="3 6" stroke="hsl(0 0% 100% / 0.06)" vertical={false} />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={compact} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatNumber(v)} />
                  <Bar dataKey="customers" name="Clientes" fill="hsl(var(--chart-4))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle title="Leitura de fidelidade" hint="O que os dados atuais permitem afirmar" />
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <TrendingUp className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                <strong className="text-foreground">{pct(recentShare)}</strong> da base cadastrada entrou
                nas safras dos últimos 3 anos — relacionamento jovem, com espaço para construir recorrência.
              </span>
            </li>
            <li className="flex gap-2">
              <Phone className="mt-0.5 size-4 shrink-0 text-success" />
              <span>
                <strong className="text-foreground">{formatNumber(crm.withPhone)}</strong> leads com telefone
                e <strong className="text-foreground">{formatNumber(crm.cities)}</strong> cidades cobertas
                permitem campanhas de reativação segmentadas por região.
              </span>
            </li>
            <li className="flex gap-2">
              <Info className="mt-0.5 size-4 shrink-0 text-warning" />
              <span>
                Churn, LTV e recompra exigem histórico transacional por cliente (ingressos por CPF).
                Hoje a plataforma trabalha apenas com agregados — sem esse dado, esses indicadores não são
                calculáveis de forma honesta.
              </span>
            </li>
          </ul>
        </Card>
      </Section>
    </div>
  );
}
