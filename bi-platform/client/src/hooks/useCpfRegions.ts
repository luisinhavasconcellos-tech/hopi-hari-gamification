import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CpfRegion = {
  region_digit: number;
  region_label: string;
  states: string[];
  registrations: number;
  registrations_2018_2019: number;
  registrations_pos_2023: number;
};

/**
 * Perfil geográfico dos consumidores derivado do 9º dígito do CPF
 * (região fiscal de emissão na Receita Federal).
 */
export function useCpfRegions() {
  const [regions, setRegions] = useState<CpfRegion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("customer_cpf_regions")
        .select("region_digit, region_label, states, registrations, registrations_2018_2019, registrations_pos_2023")
        .order("registrations", { ascending: false });
      if (!alive) return;
      setRegions((data ?? []) as CpfRegion[]);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const total = regions.reduce((s, r) => s + r.registrations, 0);
  const top = regions[0] ?? null;
  const sp = regions.find((r) => r.region_digit === 8) ?? null;
  const foraSp = total - (sp?.registrations ?? 0);
  const sudeste = regions
    .filter((r) => [8, 7, 6].includes(r.region_digit))
    .reduce((s, r) => s + r.registrations, 0);

  const share = (v: number) => (total > 0 ? (v / total) * 100 : 0);

  return {
    loading,
    regions,
    total,
    top,
    sp,
    foraSp,
    sudeste,
    share,
    hasData: regions.length > 0,
  };
}
