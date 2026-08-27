import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CrmGeoRow = { uf: string; city: string; leads: number };
export type CrmDimRow = {
  dimension: string;
  bucket_key: string;
  bucket_label: string;
  leads: number;
  sort_order: number;
};

/**
 * Base de leads do CRM (RD Station) — apenas agregados.
 * Nenhum dado pessoal (nome, e-mail, telefone) é armazenado na plataforma.
 */
export function useCrmLeads() {
  const [geo, setGeo] = useState<CrmGeoRow[]>([]);
  const [dims, setDims] = useState<CrmDimRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [g, d] = await Promise.all([
        supabase
          .from("crm_leads_geo")
          .select("uf, city, leads")
          .order("leads", { ascending: false }),
        supabase
          .from("crm_lead_dimensions")
          .select("dimension, bucket_key, bucket_label, leads, sort_order")
          .order("sort_order", { ascending: true }),
      ]);
      if (!alive) return;
      setGeo((g.data ?? []) as CrmGeoRow[]);
      setDims((d.data ?? []) as CrmDimRow[]);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const byDim = (dimension: string) =>
    dims.filter((d) => d.dimension === dimension).sort((a, b) => b.leads - a.leads);

  const totalOf = (key: string) =>
    dims.find((d) => d.dimension === "total" && d.bucket_key === key)?.leads ?? 0;

  const ufs = byDim("uf");
  const domains = byDim("email_domain");
  const ddds = byDim("ddd");
  const genders = byDim("gender");


  const total = totalOf("leads");
  const withGeo = totalOf("with_geo");
  const withPhone = totalOf("with_phone");
  const cities = totalOf("cities");
  const sp = ufs.find((u) => u.bucket_key === "SP")?.leads ?? 0;

  const cityRows = geo.filter((r) => r.city !== "Não informado" && r.uf !== "ND");

  return {
    loading,
    hasData: total > 0,
    total,
    withGeo,
    withPhone,
    cities,
    sp,
    ufs,
    domains,
    ddds,
    genders,
    geo: cityRows,

  };
}
