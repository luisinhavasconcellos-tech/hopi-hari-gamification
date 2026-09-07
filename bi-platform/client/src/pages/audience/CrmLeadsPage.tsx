import { useMemo, useState } from "react";
import { PageHeader, Card, CardTitle, Kpi } from "@/components/dashboard/primitives";
import { DataTable, Section, CHART_COLORS, tooltipStyle, compact } from "@/components/audience/AudienceUI";
import { useCrmLeads } from "@/hooks/useCrmLeads";
import { formatNumber } from "@/lib/format";
import { dddUf } from "@/lib/ddd-uf";
import CrmFilters, { EMPTY_CRM_FILTERS, type CrmFilterState } from "@/components/audience/CrmFilters";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Users, MapPin, Phone, Building2 } from "lucide-react";
import BrazilLeadsMap from "@/components/audience/BrazilLeadsMap";
import CrmInstagramOverlap from "@/components/audience/CrmInstagramOverlap";

const norm = (s: string) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export default function CrmLeadsPage() {
  const { loading, hasData, total, withGeo, withPhone, cities, sp, ufs, domains, ddds, geo } =
    useCrmLeads();

  const [filters, setFilters] = useState<CrmFilterState>(EMPTY_CRM_FILTERS);

  const filtered = useMemo(() => {
    const dddUfSel = filters.ddd !== "all" ? dddUf(filters.ddd) : null;
    const ufSel = filters.uf !== "all" ? filters.uf : dddUfSel;
    const cityQ = norm(filters.city);

    const fGeo = geo.filter(
      (r) =>
        (!ufSel || r.uf === ufSel) &&
        (!cityQ || norm(r.city).includes(cityQ)),
    );

    const fUfs = ufs.filter((u) => u.bucket_key !== "ND" && (!ufSel || u.bucket_key === ufSel));

    const fDdds = ddds.filter((d) => {
      if (filters.ddd !== "all") return d.bucket_key === filters.ddd;
      if (filters.uf !== "all") return dddUf(d.bucket_key) === filters.uf;
      return true;
    });

    const fDomains = domains.filter(
      (d) => filters.domain === "all" || d.bucket_key === filters.domain,
    );

    // Base geográfica do recorte
    const geoLeads = fGeo.reduce((s, r) => s + r.leads, 0);
    const hasGeoFilter = Boolean(ufSel) || Boolean(cityQ);
    let scope = hasGeoFilter ? geoLeads : total;

    // Domínio de e-mail é uma dimensão independente → aplicamos a participação proporcional
    let estimated = false;
    if (filters.domain !== "all") {
      const domLeads = fDomains.reduce((s, d) => s + d.leads, 0);
      if (hasGeoFilter) {
        scope = Math.round(scope * (total > 0 ? domLeads / total : 0));
        estimated = true;
      } else {
        scope = domLeads;
      }
    }

    const phoneLeads =
      filters.ddd !== "all" || filters.uf !== "all"
        ? fDdds.reduce((s, d) => s + d.leads, 0)
        : withPhone;

    return { fGeo, fUfs, fDdds, fDomains, scope, estimated, phoneLeads, ufSel };
  }, [filters, geo, ufs, ddds, domains, total, withPhone]);

  const pct = (v: number) => (total > 0 ? ((v / total) * 100).toFixed(1) : "0");

  const topUfs = filtered.fUfs.slice(0, 12);
  const topCities = filtered.fGeo.slice(0, 25);
  const topDomains = filtered.fDomains.slice(0, 8);
  const topDdds = filtered.fDdds.slice(0, 12);

  const isFiltered =
    filters.uf !== "all" || filters.ddd !== "all" || filters.domain !== "all" || !!filters.city.trim();

  return (
    <div className="px-5 lg:px-8 py-6">
      <PageHeader
        eyebrow="Audience · CRM"
        title="Base de Leads"
        subtitle="Leads captados no site (RD Station). Exibimos apenas agregados — nomes, e-mails e telefones não são armazenados na plataforma."
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando base de leads…</p>
      ) : !hasData ? (
        <p className="text-sm text-muted-foreground">Nenhum dado de CRM importado.</p>
      ) : (
        <>
          <CrmFilters
            value={filters}
            onChange={setFilters}
            ufOptions={ufs
              .filter((u) => u.bucket_key !== "ND")
              .map((u) => ({ value: u.bucket_key, label: `${u.bucket_label} · ${formatNumber(u.leads)}` }))}
            dddOptions={ddds.map((d) => ({
              value: d.bucket_key,
              label: `${d.bucket_label}${dddUf(d.bucket_key) ? ` (${dddUf(d.bucket_key)})` : ""} · ${formatNumber(d.leads)}`,
            }))}
            domainOptions={domains.map((d) => ({
              value: d.bucket_key,
              label: `${d.bucket_label} · ${formatNumber(d.leads)}`,
            }))}
          />

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 mt-4">
            <Kpi
              label={
                isFiltered
                  ? `Leads no recorte · ${pct(filtered.scope)}%${filtered.estimated ? " (est.)" : ""}`
                  : "Leads totais"
              }
              value={formatNumber(filtered.scope)}
              icon={<Users className="size-4" />}
            />
            <Kpi
              label={isFiltered ? `Com localização · ${filtered.fGeo.length} cidades` : "Com localização"}
              value={`${formatNumber(isFiltered ? filtered.fGeo.reduce((s, r) => s + r.leads, 0) : withGeo)}`}
              icon={<MapPin className="size-4" />}
              accent="accent"
            />
            <Kpi
              label={`Com telefone · ${filtered.fDdds.length} DDD(s)`}
              value={formatNumber(filtered.phoneLeads)}
              icon={<Phone className="size-4" />}
              accent="success"
            />
            <Kpi
              label="Cidades alcançadas"
              value={formatNumber(isFiltered ? filtered.fGeo.length : cities)}
              icon={<Building2 className="size-4" />}
              accent="warning"
            />
          </div>

          <Section>
            <Card>
              <CardTitle
                title="Leads por estado"
                hint={
                  filtered.ufSel
                    ? `Recorte: ${filtered.ufSel}`
                    : `São Paulo concentra ${pct(sp)}% da base`
                }
              />
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={topUfs} margin={{ left: 4, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="bucket_label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => formatNumber(v)} />
                  <Bar dataKey="leads" name="Leads" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <CardTitle
                title="Provedores de e-mail"
                hint={filters.domain !== "all" ? "Domínio selecionado" : "Top domínios da base"}
              />
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={topDomains}
                    dataKey="leads"
                    nameKey="bucket_label"
                    innerRadius={60}
                    outerRadius={110}
                    paddingAngle={2}
                  >
                    {topDomains.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v: number) => formatNumber(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Section>

          <Section cols="grid-cols-1">
            <Card>
              <CardTitle
                title="Mapa de calor de cobertura"
                hint="Concentração de leads por município e densidade por DDD · círculo proporcional ao volume"
              />
              <BrazilLeadsMap cities={filtered.fGeo} ddds={filtered.fDdds} total={filtered.scope || total} />
            </Card>
          </Section>

          <CrmInstagramOverlap
            geo={filtered.fGeo}
            ufs={filtered.fUfs}
            ddds={filtered.fDdds}
            totalLeads={filtered.scope || total}
          />

          <Section>
            <Card>
              <CardTitle
                title="Top cidades"
                hint={
                  isFiltered
                    ? `${formatNumber(filtered.fGeo.length)} cidades no recorte`
                    : "Cidades com maior volume de leads"
                }
              />
              <DataTable
                rows={topCities}
                rowKey={(r) => `${r.uf}-${r.city}`}
                maxHeight="max-h-[420px]"
                columns={[
                  { key: "city", header: "Cidade", width: "w-[55%]", render: (r) => r.city },
                  { key: "uf", header: "UF", render: (r) => r.uf },
                  {
                    key: "leads",
                    header: "Leads",
                    align: "right",
                    render: (r) => formatNumber(r.leads),
                  },
                  {
                    key: "share",
                    header: "%",
                    align: "right",
                    render: (r) => `${pct(r.leads)}%`,
                  },
                ]}
              />
            </Card>

            <Card>
              <CardTitle title="DDDs mais frequentes" hint="Baseado nos leads com telefone" />
              <ResponsiveContainer width="100%" height={420}>
                <BarChart data={topDdds} layout="vertical" margin={{ left: 24, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    type="category"
                    dataKey="bucket_label"
                    width={70}
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => formatNumber(v)} />
                  <Bar dataKey="leads" name="Leads" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Section>
        </>
      )}
    </div>
  );
}
