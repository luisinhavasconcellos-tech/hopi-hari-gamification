import { MapPin, Users, Fingerprint, Globe2, Cake, Mail, ShieldAlert, GraduationCap, Car, Wallet } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader, Kpi, Card, CardTitle, EmptyState, ChartSkeleton } from "@/components/dashboard/primitives";
import { DataTable, Section, compact, tooltipStyle, CHART_COLORS } from "@/components/audience/AudienceUI";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatNumber } from "@/lib/format";
import { useCpfRegions } from "@/hooks/useCpfRegions";
import { useCustomerRegistrations } from "@/hooks/useCustomerRegistrations";
import { useCustomerDemographics } from "@/hooks/useCustomerDemographics";
import { useCrmLeads } from "@/hooks/useCrmLeads";
import GenderAgeCross from "@/components/audience/GenderAgeCross";



/**
 * O CPF codifica apenas a região fiscal de emissão (9º dígito) e dígitos
 * verificadores. Classe social, escolaridade e posse de veículo NÃO são
 * deriváveis do número — dependem de fontes externas declaradas.
 */
const NOT_DERIVABLE = [
  {
    icon: Wallet,
    label: "Classe social / renda",
    why: "Não existe no CPF. Só pode vir de dados declarados, ticket médio de compra ou enriquecimento por CEP (IBGE/Censo).",
    sources: ["CRM", "Bilheteria / ticket médio", "CEP + Censo IBGE"],
  },
  {
    icon: GraduationCap,
    label: "Nível de educação",
    why: "Não existe no CPF. Requer campo declarado no cadastro ou pesquisa com a base.",
    sources: ["Formulário de cadastro", "Pesquisa com clientes"],
  },
  {
    icon: Car,
    label: "Carteira de habilitação / transporte",
    why: "Não existe no CPF e o Denatran não é uma base pública consultável. Pode ser inferido por pesquisa de meio de chegada ao parque.",
    sources: ["Pesquisa de satisfação", "Dados de estacionamento", "Parceria de mobilidade"],
  },
];


const GENDER_COLORS: Record<string, string> = {
  F: "hsl(var(--chart-2))",
  M: "hsl(var(--chart-1))",
  ND: "hsl(var(--muted-foreground))",
};

export default function ProfilePage() {
  const { loading, regions, total, sp, foraSp, sudeste, share, hasData } = useCpfRegions();
  const { total: totalCadastros } = useCustomerRegistrations();
  const demo = useCustomerDemographics();
  const crm = useCrmLeads();

  const genderTotal = demo.genders.reduce((s, g) => s + g.customers, 0);
  const genderIdentified = demo.genders
    .filter((g) => g.bucket_key !== "ND")
    .reduce((s, g) => s + g.customers, 0);
  const genderShare = (v: number) => (genderIdentified ? (v / genderIdentified) * 100 : 0);
  const femaleBase = demo.genders.find((g) => g.bucket_key === "F")?.customers ?? 0;
  const maleBase = demo.genders.find((g) => g.bucket_key === "M")?.customers ?? 0;

  const crmGenderIdentified = crm.genders
    .filter((g) => g.bucket_key !== "ND")
    .reduce((s, g) => s + g.leads, 0);
  const crmShare = (v: number) => (crmGenderIdentified ? (v / crmGenderIdentified) * 100 : 0);


  const chartData = regions.map((r) => ({
    label: r.states.length <= 2 ? r.states.join("/") : r.region_label.split(" ")[0],
    registrations: r.registrations,
  }));

  const pieData = [
    { name: "São Paulo", value: sp?.registrations ?? 0 },
    { name: "Outros estados", value: foraSp },
  ];

  const topDomain = demo.domains[0] ?? null;

  return (
    <div className="px-5 lg:px-8 py-6">
      <PageHeader
        eyebrow="Audience · Público"
        title="Perfil dos Consumidores"
        subtitle="Retrato da base de clientes a partir do que os dados de cadastro realmente permitem derivar: região fiscal do CPF, idade, ciclo de aniversário e perfil digital."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi
          label="CPFs analisados"
          value={formatNumber(total)}
          icon={<Fingerprint className="size-4 text-primary" />}
        />
        <Kpi
          label="Clientes com idade"
          value={formatNumber(demo.total)}
          icon={<Cake className="size-4 text-accent" />}
          accent="accent"
        />
        <Kpi
          label="Origem São Paulo"
          value={`${share(sp?.registrations ?? 0).toFixed(1)}%`}
          icon={<MapPin className="size-4 text-success" />}
          accent="success"
        />
        <Kpi
          label="Idade média"
          value={demo.total ? `${demo.avgAge.toFixed(1)} anos` : "—"}
          icon={<Users className="size-4 text-muted-foreground" />}
        />
      </div>

      <Tabs defaultValue="geografia" className="mt-6">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="geografia">Geografia</TabsTrigger>
          <TabsTrigger value="idade">Idade &amp; ciclo</TabsTrigger>
          <TabsTrigger value="genero">Gênero</TabsTrigger>
          <TabsTrigger value="digital">Perfil digital</TabsTrigger>

          <TabsTrigger value="limites">O que o CPF não revela</TabsTrigger>
        </TabsList>

        {/* ---------------- Geografia ---------------- */}
        <TabsContent value="geografia">
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Kpi label="Total de CPFs" value={formatNumber(total)} icon={<Fingerprint className="size-4 text-primary" />} />
            <Kpi
              label="CPFs únicos"
              value={formatNumber(totalCadastros ? Math.min(total, totalCadastros) : total)}
              icon={<Users className="size-4 text-accent" />}
              accent="accent"
            />
            <Kpi label="Origem Sudeste" value={`${share(sudeste).toFixed(1)}%`} icon={<Globe2 className="size-4 text-success" />} accent="success" />
            <Kpi label="Fora de SP" value={formatNumber(foraSp)} icon={<MapPin className="size-4 text-muted-foreground" />} />
          </div>

          <Section>
            <Card>
              <CardTitle title="Origem por região fiscal" hint="Derivada do 9º dígito do CPF" />
              {loading ? (
                <ChartSkeleton />
              ) : !hasData ? (
                <EmptyState title="Sem CPFs carregados" description="Importe a base de clientes." />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(v: number) => [
                        `${formatNumber(v)} (${share(v).toFixed(1)}%)`,
                        "CPFs",
                      ]}
                    />
                    <Bar dataKey="registrations" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card>
              <CardTitle title="São Paulo vs outros estados" hint="Concentração da base" />
              {loading ? (
                <ChartSkeleton />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={3}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [formatNumber(v), "CPFs"]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </Section>

          <Section cols="grid-cols-1">
            <Card>
              <CardTitle title="Detalhe por região" hint="Comparativo entre a base 2018-2019 e a base pós-2023" />
              <DataTable
                rows={regions}
                rowKey={(r) => String(r.region_digit)}
                columns={[
                  { key: "reg", header: "Região", render: (r) => r.region_label },
                  { key: "uf", header: "UFs", render: (r) => r.states.join(", ") },
                  { key: "t", header: "CPFs", align: "right", render: (r) => formatNumber(r.registrations) },
                  { key: "s", header: "% do total", align: "right", render: (r) => `${share(r.registrations).toFixed(1)}%` },
                  { key: "a", header: "2018-2019", align: "right", render: (r) => formatNumber(r.registrations_2018_2019) },
                  { key: "b", header: "Pós-2023", align: "right", render: (r) => formatNumber(r.registrations_pos_2023) },
                ]}
              />
            </Card>
          </Section>
        </TabsContent>

        {/* ---------------- Idade ---------------- */}
        <TabsContent value="idade">
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Kpi label="Clientes com idade" value={formatNumber(demo.total)} icon={<Users className="size-4 text-primary" />} />
            <Kpi label="Idade média" value={demo.total ? `${demo.avgAge.toFixed(1)} anos` : "—"} icon={<Cake className="size-4 text-accent" />} accent="accent" />
            <Kpi label="Idade mediana" value={demo.total ? `${demo.medianAge} anos` : "—"} icon={<Cake className="size-4 text-success" />} accent="success" />
            <Kpi
              label="Faixa dominante"
              value={demo.topGroup ? `${demo.topGroup.bucket_label} (${demo.share(demo.topGroup.customers).toFixed(0)}%)` : "—"}
              icon={<Users className="size-4 text-muted-foreground" />}
            />
          </div>

          <Section>
            <Card>
              <CardTitle title="Distribuição por faixa etária" />
              {demo.loading ? (
                <ChartSkeleton />
              ) : !demo.hasData ? (
                <EmptyState title="Sem datas de nascimento na base" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={demo.groups}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="bucket_label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [formatNumber(v), "Clientes"]} />
                    <Bar dataKey="customers" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card>
              <CardTitle title="Curva de idade" hint="Clientes por idade exata" />
              {demo.loading ? (
                <ChartSkeleton />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={demo.ages}>
                    <defs>
                      <linearGradient id="ageGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="bucket_key" tick={{ fontSize: 10 }} interval={4} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [formatNumber(v), "Clientes"]} labelFormatter={(l) => `${l} anos`} />
                    <Area type="monotone" dataKey="customers" stroke="hsl(var(--chart-4))" strokeWidth={2} fill="url(#ageGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Card>
          </Section>

          <Section cols="grid-cols-1">
            <Card>
              <CardTitle title="Aniversários por mês" hint="Oportunidades de campanha de aniversário" />
              {demo.loading ? (
                <ChartSkeleton />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={demo.months}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="bucket_label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [formatNumber(v), "Aniversariantes"]} />
                    <Bar dataKey="customers" fill="hsl(var(--chart-5))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </Section>
        </TabsContent>

        {/* ---------------- Gênero ---------------- */}
        <TabsContent value="genero">
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Kpi
              label="Feminino (base)"
              value={genderIdentified ? `${genderShare(femaleBase).toFixed(1)}%` : "—"}
              icon={<Users className="size-4 text-accent" />}
              accent="accent"
            />
            <Kpi
              label="Masculino (base)"
              value={genderIdentified ? `${genderShare(maleBase).toFixed(1)}%` : "—"}
              icon={<Users className="size-4 text-primary" />}
            />
            <Kpi
              label="Clientes classificados"
              value={formatNumber(genderIdentified)}
              icon={<Fingerprint className="size-4 text-success" />}
              accent="success"
            />
            <Kpi
              label="Cobertura da classificação"
              value={genderTotal ? `${((genderIdentified / genderTotal) * 100).toFixed(1)}%` : "—"}
              icon={<ShieldAlert className="size-4 text-muted-foreground" />}
            />
          </div>

          <Section>
            <Card>
              <CardTitle
                title="Gênero da base de clientes"
                hint="Estimado pelo primeiro nome do cadastro · nomes não são armazenados"
              />
              {demo.genders.length === 0 ? (
                <EmptyState title="Sem dados de gênero" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={demo.genders}
                      dataKey="customers"
                      nameKey="bucket_label"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={3}
                    >
                      {demo.genders.map((g) => (
                        <Cell key={g.bucket_key} fill={GENDER_COLORS[g.bucket_key] ?? CHART_COLORS[0]} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [formatNumber(v), "Clientes"]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card>
              <CardTitle title="Gênero dos leads do CRM" hint="Base RD Station · mesma estimativa por nome" />
              {crm.genders.length === 0 ? (
                <EmptyState title="Sem dados de gênero no CRM" />
              ) : (
                <DataTable
                  rows={crm.genders}
                  rowKey={(r) => r.bucket_key}
                  columns={[
                    { key: "g", header: "Gênero", render: (r) => r.bucket_label },
                    { key: "l", header: "Leads", align: "right", render: (r) => formatNumber(r.leads) },
                    {
                      key: "s",
                      header: "% dos classificados",
                      align: "right",
                      render: (r) =>
                        r.bucket_key === "ND" ? "—" : `${crmShare(r.leads).toFixed(1)}%`,
                    },
                  ]}
                />
              )}
            </Card>
          </Section>

          <GenderAgeCross rows={demo.genderAge} />

          <Card className="mt-6">

            <div className="flex items-start gap-3">
              <ShieldAlert className="size-4 shrink-0 text-primary" />
              <p className="text-sm text-muted-foreground">
                O gênero não vem do CPF: é estimado a partir do primeiro nome informado no cadastro e no CRM, usando um
                dicionário de nomes brasileiros. Registros sem nome ou com nome ambíguo ficam como “Não identificado”.
                Apenas os totais agregados são armazenados na plataforma.
              </p>
            </div>
          </Card>
        </TabsContent>


        {/* ---------------- Digital ---------------- */}
        <TabsContent value="digital">
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
            <Kpi
              label="Provedor dominante"
              value={topDomain ? topDomain.bucket_label : "—"}
              icon={<Mail className="size-4 text-primary" />}
            />
            <Kpi
              label="Share do provedor líder"
              value={topDomain ? `${demo.share(topDomain.customers).toFixed(1)}%` : "—"}
              icon={<Mail className="size-4 text-accent" />}
              accent="accent"
            />
            <Kpi label="Domínios mapeados" value={formatNumber(demo.domains.length)} icon={<Globe2 className="size-4 text-muted-foreground" />} />
          </div>

          <Section>
            <Card>
              <CardTitle title="Provedores de e-mail" hint="Top domínios da base" />
              {demo.domains.length === 0 ? (
                <EmptyState title="Sem domínios mapeados" />
              ) : (
                <DataTable
                  rows={demo.domains}
                  rowKey={(r) => r.bucket_key}
                  columns={[
                    { key: "d", header: "Domínio", render: (r) => r.bucket_label },
                    { key: "c", header: "Clientes", align: "right", render: (r) => formatNumber(r.customers) },
                    { key: "s", header: "% do total", align: "right", render: (r) => `${demo.share(r.customers).toFixed(1)}%` },
                  ]}
                />
              )}
            </Card>

            <Card>
              <CardTitle title="Distribuição de provedores" />
              {demo.domains.length === 0 ? (
                <EmptyState title="Sem dados" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={demo.domains.slice(0, 6)}
                      dataKey="customers"
                      nameKey="bucket_label"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={3}
                    >
                      {demo.domains.slice(0, 6).map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [formatNumber(v), "Clientes"]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </Section>
        </TabsContent>

        {/* ---------------- Limites do CPF ---------------- */}
        <TabsContent value="limites">
          <Card className="mt-4">
            <CardTitle
              title="O que o CPF realmente contém"
              hint="Importante para calibrar expectativas de segmentação"
            />
            <p className="text-sm text-muted-foreground">
              O CPF é composto por 8 dígitos sequenciais, 1 dígito de região fiscal (o 9º) e 2 dígitos verificadores. A
              única informação de perfil que ele carrega é a <strong>região fiscal onde o documento foi emitido</strong>{" "}
              — usada nesta plataforma para a aba Geografia. Idade, aniversário e provedor de e-mail vêm dos campos de
              cadastro, não do CPF. Nenhuma outra característica pessoal pode ser extraída do número.
            </p>
          </Card>

          <Section>
            {NOT_DERIVABLE.map((item) => (
              <Card key={item.label}>
                <div className="flex items-start gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted/50">
                    <item.icon className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.why}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.sources.map((s) => (
                        <span
                          key={s}
                          className="rounded-md border border-border bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </Section>

          <Card className="mt-6">
            <div className="flex items-start gap-3">
              <ShieldAlert className="size-4 shrink-0 text-primary" />
              <p className="text-sm text-muted-foreground">
                Consultas a bases externas para inferir renda, escolaridade ou posse de veículo a partir do CPF exigem
                base legal específica e, na maioria dos casos, consentimento do titular. Os detalhes de finalidade e
                retenção estão na página de Transparência de Dados.
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
