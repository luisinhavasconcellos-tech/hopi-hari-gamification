import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BusinessPortfolioRow = {
  distributor_name: string;
  client_name: string;
  has_cnpj: boolean;
  city: string | null;
  segment: string | null;
};

export function useBusinessPortfolio() {
  const [rows, setRows] = useState<BusinessPortfolioRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const size = 1000;
      const all: BusinessPortfolioRow[] = [];
      for (let from = 0; ; from += size) {
        const { data, error } = await supabase
          .rpc("get_business_portfolio_safe")
          .order("distributor_name")
          .order("client_name")
          // a RPC não expõe id: completa a chave natural para paginação estável
          .order("city")
          .order("segment")
          .order("has_cnpj")
          .range(from, from + size - 1);

        if (error) break;
        const batch = (data ?? []) as BusinessPortfolioRow[];
        all.push(...batch);
        if (batch.length < size) break;
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
    const total = rows.length;

    const byDistributor = [...new Set(rows.map((r) => r.distributor_name))]
      .map((name) => {
        const list = rows.filter((r) => r.distributor_name === name);
        const segs = [...new Set(list.map((r) => r.segment ?? "Não informado"))]
          .map((s) => ({ segment: s, clients: list.filter((r) => (r.segment ?? "Não informado") === s).length }))
          .sort((a, b) => b.clients - a.clients);
        const cities = [...new Set(list.map((r) => r.city).filter(Boolean) as string[])]
          .map((c) => ({ city: c, clients: list.filter((r) => r.city === c).length }))
          .sort((a, b) => b.clients - a.clients);
        return {
          name,
          clients: list.length,
          withCnpj: list.filter((r) => r.has_cnpj).length,
          topSegment: segs[0]?.segment ?? "—",
          segments: segs.slice(0, 4),
          topClients: list.slice(0, 6).map((r) => r.client_name),
          cities: cities.slice(0, 4),
          share: total ? (list.length / total) * 100 : 0,
        };
      })
      .sort((a, b) => b.clients - a.clients);

    const bySegment = [...new Set(rows.map((r) => r.segment ?? "Não informado"))]
      .map((segment) => ({
        segment,
        clients: rows.filter((r) => (r.segment ?? "Não informado") === segment).length,
      }))
      .sort((a, b) => b.clients - a.clients);

    const byName = new Map(byDistributor.map((d) => [d.name.toUpperCase().trim(), d]));

    return {
      loading,
      hasData: rows.length > 0,
      rows,
      total,
      distributors: byDistributor.length,
      withCnpj: rows.filter((r) => r.has_cnpj).length,
      byDistributor,
      bySegment,
      byName,
    };
  }, [rows, loading]);
}
