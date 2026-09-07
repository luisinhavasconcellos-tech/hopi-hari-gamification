import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CrmGeoRow, CrmDimRow } from "@/hooks/useCrmLeads";
import { fetchFollowerCount } from "@/lib/followers";
import { DDD_TO_UF, dddUf } from "@/lib/ddd-uf";

export type IgAudienceRow = {
  id: string;
  level: "uf" | "city";
  uf: string;
  city: string | null;
  share_pct: number;
  followers: number | null;
  period_label: string | null;
};

export type OverlapRow = {
  key: string;
  label: string;
  uf: string;
  leads: number;
  leadsShare: number; // %
  igShare: number; // %
  igFollowers: number; // estimado
  index: number; // igShare / leadsShare * 100
  overlap: number; // min(leadsShare, igShare)
};

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** DDD → UF (mapa oficial Anatel) — reexportado do módulo compartilhado. */
export const DDD_UF = DDD_TO_UF;

export type OverlapResult = {
  loading: boolean;
  hasIgGeo: boolean;
  igRows: IgAudienceRow[];
  igFollowers: number;
  period: string | null;
  /** UFs com dados dos dois lados + os exclusivos de cada base */
  ufRows: OverlapRow[];
  cityRows: OverlapRow[];
  /** Sobreposição total = Σ min(share leads, share IG) — 0 a 100% */
  overlapScore: number;
  /** % dos leads que estão em UFs onde o Instagram tem audiência declarada */
  leadsCoveredPct: number;
  /** % da audiência do IG em UFs onde existe pelo menos um lead */
  igCoveredPct: number;
  /** leads com telefone em UFs cobertas pelo IG (via DDD) */
  phoneCoveredPct: number;
  ufsOnlyLeads: string[];
  ufsOnlyIg: string[];
  reload: () => Promise<void>;
};

/**
 * Sobreposição entre a cobertura da base de leads do CRM (geo + DDD)
 * e a audiência do Instagram por localização.
 *
 * A audiência do Instagram por localização não vem da API pública — ela é
 * importada do Meta Business Suite (Público → Principais localizações) e
 * guardada em `instagram_audience_geo`.
 */
export function useCrmInstagramOverlap(geo: CrmGeoRow[], ufs: CrmDimRow[], ddds: CrmDimRow[]): OverlapResult {
  const [igRows, setIgRows] = useState<IgAudienceRow[]>([]);
  const [igFollowers, setIgFollowers] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [a, s] = await Promise.all([
      supabase
        .from("instagram_audience_geo")
        .select("id, level, uf, city, share_pct, followers, period_label")
        .order("share_pct", { ascending: false }),
      fetchFollowerCount("instagram"),
    ]);
    setIgRows((a.data ?? []) as IgAudienceRow[]);
    setIgFollowers(s);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const igUf = igRows.filter((r) => r.level === "uf");
  const igCity = igRows.filter((r) => r.level === "city");
  const hasIgGeo = igUf.length > 0 || igCity.length > 0;

  // --- lado CRM -------------------------------------------------------------
  const leadUf = new Map<string, number>();
  ufs
    .filter((u) => u.bucket_key !== "ND")
    .forEach((u) => leadUf.set(u.bucket_key, (leadUf.get(u.bucket_key) ?? 0) + u.leads));
  const leadsTotal = [...leadUf.values()].reduce((s, v) => s + v, 0) || 1;

  const phoneUf = new Map<string, number>();
  ddds.forEach((d) => {
    const uf = dddUf(d.bucket_key);
    if (!uf) return;
    phoneUf.set(uf, (phoneUf.get(uf) ?? 0) + d.leads);
  });
  const phoneTotal = [...phoneUf.values()].reduce((s, v) => s + v, 0) || 1;

  // --- lado Instagram -------------------------------------------------------
  const igUfShare = new Map<string, number>();
  igUf.forEach((r) => igUfShare.set(r.uf, (igUfShare.get(r.uf) ?? 0) + Number(r.share_pct)));
  const igShareTotal = [...igUfShare.values()].reduce((s, v) => s + v, 0) || 1;

  const allUfs = new Set<string>([...leadUf.keys(), ...igUfShare.keys()]);
  const ufRows: OverlapRow[] = [...allUfs]
    .map((uf) => {
      const leads = leadUf.get(uf) ?? 0;
      const leadsShare = (leads / leadsTotal) * 100;
      // normaliza o share do IG para 100% (o Meta lista só as principais)
      const igShare = ((igUfShare.get(uf) ?? 0) / igShareTotal) * 100;
      return {
        key: uf,
        label: uf,
        uf,
        leads,
        leadsShare,
        igShare,
        igFollowers: Math.round((igShare / 100) * igFollowers),
        index: leadsShare > 0 ? (igShare / leadsShare) * 100 : igShare > 0 ? Infinity : 0,
        overlap: Math.min(leadsShare, igShare),
      };
    })
    .sort((a, b) => b.leadsShare + b.igShare - (a.leadsShare + a.igShare));

  // --- cidades --------------------------------------------------------------
  const cityLeads = new Map<string, { label: string; uf: string; leads: number }>();
  geo.forEach((r) => {
    const k = `${r.uf}|${norm(r.city)}`;
    const cur = cityLeads.get(k);
    cityLeads.set(k, { label: r.city, uf: r.uf, leads: (cur?.leads ?? 0) + r.leads });
  });
  const cityLeadsTotal = [...cityLeads.values()].reduce((s, v) => s + v.leads, 0) || 1;
  const igCityShareTotal = igCity.reduce((s, r) => s + Number(r.share_pct), 0) || 1;

  const cityRows: OverlapRow[] = igCity
    .map((r) => {
      const k = `${r.uf}|${norm(r.city ?? "")}`;
      const leads = cityLeads.get(k)?.leads ?? 0;
      const leadsShare = (leads / cityLeadsTotal) * 100;
      const igShare = (Number(r.share_pct) / igCityShareTotal) * 100;
      return {
        key: k,
        label: r.city ?? r.uf,
        uf: r.uf,
        leads,
        leadsShare,
        igShare,
        igFollowers: Math.round((igShare / 100) * igFollowers),
        index: leadsShare > 0 ? (igShare / leadsShare) * 100 : igShare > 0 ? Infinity : 0,
        overlap: Math.min(leadsShare, igShare),
      };
    })
    .sort((a, b) => b.igShare - a.igShare);

  const overlapScore = ufRows.reduce((s, r) => s + r.overlap, 0);
  const leadsCoveredPct = ufRows.filter((r) => r.igShare > 0).reduce((s, r) => s + r.leadsShare, 0);
  const igCoveredPct = ufRows.filter((r) => r.leads > 0).reduce((s, r) => s + r.igShare, 0);
  const phoneCoveredPct =
    ([...igUfShare.keys()].reduce((s, uf) => s + (phoneUf.get(uf) ?? 0), 0) / phoneTotal) * 100;

  return {
    loading,
    hasIgGeo,
    igRows,
    igFollowers,
    period: igRows.find((r) => r.period_label)?.period_label ?? null,
    ufRows,
    cityRows,
    overlapScore,
    leadsCoveredPct,
    igCoveredPct,
    phoneCoveredPct: hasIgGeo ? phoneCoveredPct : 0,
    ufsOnlyLeads: ufRows.filter((r) => r.leads > 0 && r.igShare === 0).map((r) => r.uf),
    ufsOnlyIg: ufRows.filter((r) => r.leads === 0 && r.igShare > 0).map((r) => r.uf),
    reload: load,
  };
}
