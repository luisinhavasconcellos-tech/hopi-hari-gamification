import { useCustomerDemographics } from "@/hooks/useCustomerDemographics";
import { useCpfRegions } from "@/hooks/useCpfRegions";
import { useBehaviorIntelligence } from "@/hooks/useBehaviorIntelligence";

export type SegmentRow = {
  label: string;
  /** pessoas na base cadastral (quando a dimensão existir no cadastro) */
  customers: number;
  /** participação da base, em % */
  baseShare: number;
  events: number;
  sessions: number;
  identities: number;
  /** eventos por sessão identificada */
  intensity: number;
  /** participação dos eventos, em % */
  eventShare: number;
};

function build(
  base: { label: string; customers: number }[],
  behavior: { label: string; events: number; sessions: number; identities: number }[],
): SegmentRow[] {
  const totalCustomers = base.reduce((s, b) => s + b.customers, 0);
  const totalEvents = behavior.reduce((s, b) => s + b.events, 0);
  const labels = new Set<string>([...base.map((b) => b.label), ...behavior.map((b) => b.label)]);

  return [...labels]
    .map((label) => {
      const b = base.find((x) => x.label === label);
      const e = behavior.find((x) => x.label === label);
      const customers = b?.customers ?? 0;
      const events = e?.events ?? 0;
      const sessions = e?.sessions ?? 0;
      return {
        label,
        customers,
        baseShare: totalCustomers ? (customers / totalCustomers) * 100 : 0,
        events,
        sessions,
        identities: e?.identities ?? 0,
        intensity: sessions ? events / sessions : 0,
        eventShare: totalEvents ? (events / totalEvents) * 100 : 0,
      };
    })
    .sort((a, b) => b.customers - a.customers || b.events - a.events);
}

/**
 * Relatório por segmento: cruza a base cadastral (faixa etária e região do CPF)
 * com o comportamento agregado consentido (eventos, sessões, canal).
 * Nenhum dado individual é lido — só agregados.
 */
export function useSegmentReport(days = 30) {
  const demo = useCustomerDemographics();
  const geo = useCpfRegions();
  const behavior = useBehaviorIntelligence(days);

  const byAge = build(
    demo.groups.map((g) => ({ label: g.bucket_label, customers: g.customers })),
    behavior.byAge,
  );

  const byRegion = build(
    geo.regions.map((r) => ({ label: r.region_label, customers: r.registrations })),
    behavior.byRegion,
  );

  const byChannel = build([], behavior.byChannel);

  const topAge = byAge[0] ?? null;
  const topRegion = byRegion[0] ?? null;
  const topChannel = [...byChannel].sort((a, b) => b.events - a.events)[0] ?? null;
  const coverage =
    demo.total > 0 ? (Number(behavior.summary?.active_consents ?? 0) / demo.total) * 100 : 0;

  return {
    loading: demo.loading || geo.loading || behavior.loading,
    days,
    byAge,
    byRegion,
    byChannel,
    byDay: behavior.byDay,
    rows: behavior.rows,
    totalCustomers: demo.total,
    totalRegistrations: geo.total,
    totalEvents: behavior.totalEvents,
    identifiedSessions: behavior.identifiedSessions,
    activeConsents: Number(behavior.summary?.active_consents ?? 0),
    coverage,
    topAge,
    topRegion,
    topChannel,
    hasBase: demo.hasData || geo.hasData,
    hasBehavior: behavior.hasData,
  };
}

export function segmentsToCsv(sections: { name: string; rows: SegmentRow[] }[]) {
  const head = [
    "dimensao",
    "segmento",
    "clientes_base",
    "share_base_pct",
    "eventos",
    "sessoes",
    "identidades",
    "eventos_por_sessao",
    "share_eventos_pct",
  ].join(",");

  const body = sections.flatMap((s) =>
    s.rows.map((r) =>
      [
        s.name,
        `"${r.label.replace(/"/g, "'")}"`,
        r.customers,
        r.baseShare.toFixed(2),
        r.events,
        r.sessions,
        r.identities,
        r.intensity.toFixed(2),
        r.eventShare.toFixed(2),
      ].join(","),
    ),
  );

  return [head, ...body].join("\n");
}
