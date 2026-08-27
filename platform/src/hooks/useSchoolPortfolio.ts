import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SchoolPortfolioRow = {
  distributor_name: string | null;
  uf: string;
  municipality: string;
  network: string;
  schools: number;
};

export type SchoolGroup = "Pública (estadual/federal)" | "Municipal" | "Particular";

export function groupOfNetwork(network: string): SchoolGroup | null {
  if (/municipal/i.test(network)) return "Municipal";
  if (/estadual|federal/i.test(network)) return "Pública (estadual/federal)";
  if (/particular|privada|comunit|filantr/i.test(network)) return "Particular";
  return null;
}

export const SCHOOL_GROUPS: SchoolGroup[] = [
  "Municipal",
  "Pública (estadual/federal)",
  "Particular",
];

export function useSchoolPortfolio() {
  const [rows, setRows] = useState<SchoolPortfolioRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const all: SchoolPortfolioRow[] = [];
      const size = 1000;
      for (let from = 0; ; from += size) {
        const { data, error } = await supabase
          .from("school_portfolio")
          .select("distributor_name, uf, municipality, network, schools")
          .order("id")
          .range(from, from + size - 1);

        if (error || !data?.length) break;
        all.push(
          ...(data as SchoolPortfolioRow[]).map((r) => {
            const name = (r.distributor_name ?? "").trim();
            const isPlaceholder = !name || name === "\\N" || /^(null|n\/a|-)$/i.test(name);
            return { ...r, distributor_name: isPlaceholder ? null : name };
          }),
        );
        if (data.length < size) break;
      }
      if (!alive) return;
      setRows(all);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);


  return useMemo(() => {
    const total = rows.reduce((s, r) => s + r.schools, 0);

    const byState = [...new Set(rows.map((r) => r.uf))]
      .map((uf) => {
        const list = rows.filter((r) => r.uf === uf);
        return {
          uf,
          schools: list.reduce((s, r) => s + r.schools, 0),
          municipalities: new Set(list.map((r) => r.municipality)).size,
        };
      })
      .sort((a, b) => b.schools - a.schools);

    const byNetwork = [...new Set(rows.map((r) => r.network))]
      .map((network) => ({
        network,
        schools: rows.filter((r) => r.network === network).reduce((s, r) => s + r.schools, 0),
      }))
      .sort((a, b) => b.schools - a.schools);

    const assigned = rows.filter((r) => r.distributor_name);
    const byDistributor = [...new Set(assigned.map((r) => r.distributor_name as string))]
      .map((name) => {
        const list = assigned.filter((r) => r.distributor_name === name);
        const schools = list.reduce((s, r) => s + r.schools, 0);
        const nets = [...new Set(list.map((r) => r.network))]
          .map((n) => ({ network: n, schools: list.filter((r) => r.network === n).reduce((s, r) => s + r.schools, 0) }))
          .sort((a, b) => b.schools - a.schools);
        const municipalitiesList = [...new Set(list.map((r) => r.municipality))]
          .map((m) => ({ municipality: m, schools: list.filter((r) => r.municipality === m).reduce((s, r) => s + r.schools, 0) }))
          .sort((a, b) => b.schools - a.schools);
        return {
          name,
          schools,
          municipalities: municipalitiesList.length,
          topMunicipalities: municipalitiesList.slice(0, 5),
          networks: nets.slice(0, 4),
          topNetwork: nets[0]?.network ?? "—",
          privatePct: schools
            ? (100 * (nets.find((n) => /particular|privada/i.test(n.network))?.schools ?? 0)) / schools
            : 0,
          share: total ? (schools / total) * 100 : 0,
          groupSchools: Object.fromEntries(
            SCHOOL_GROUPS.map((g) => [
              g,
              list.filter((r) => groupOfNetwork(r.network) === g).reduce((s, r) => s + r.schools, 0),
            ]),
          ) as Record<SchoolGroup, number>,
        };
      })
      .sort((a, b) => b.schools - a.schools);

    const byName = new Map(byDistributor.map((d) => [d.name.toUpperCase().trim(), d]));

    const coveredByDistributor = assigned.reduce((s, r) => s + r.schools, 0);

    const byGroup = SCHOOL_GROUPS.map((group) => {
      const schools = rows
        .filter((r) => groupOfNetwork(r.network) === group)
        .reduce((s, r) => s + r.schools, 0);
      return { group, schools, share: total ? (schools / total) * 100 : 0 };
    });

    return {
      loading,
      hasData: rows.length > 0,
      total,
      byState,
      byNetwork,
      byGroup,
      byDistributor,
      byName,

      coveredByDistributor,
      uncovered: total - coveredByDistributor,
      municipalities: new Set(rows.map((r) => `${r.uf}-${r.municipality}`)).size,
    };
  }, [rows, loading]);
}
