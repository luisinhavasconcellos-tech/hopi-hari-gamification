import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DemoRow = {
  dimension: string;
  bucket_key: string;
  bucket_label: string;
  sort_order: number;
  customers: number;
};

export function useCustomerDemographics() {
  const [rows, setRows] = useState<DemoRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("customer_demographics")
        .select("dimension, bucket_key, bucket_label, sort_order, customers")
        .order("sort_order", { ascending: true });
      if (!alive) return;
      setRows((data ?? []) as DemoRow[]);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const by = (d: string) => rows.filter((r) => r.dimension === d);
  const ages = by("age");
  const groups = by("age_group");
  const months = by("birth_month");
  const domains = by("email_domain");
  const genders = by("gender");
  const genderAge = by("gender_age").map((r) => {
    const [gender, ageGroup] = r.bucket_key.split("|");
    return { gender, ageGroup, customers: r.customers, sort_order: r.sort_order };
  });



  const total = groups.reduce((s, r) => s + r.customers, 0);
  // a média usa a dimensão "age" — o guard precisa ser sobre ESSE denominador
  const agesTotal = ages.reduce((s, r) => s + r.customers, 0);
  const weighted = ages.reduce((s, r) => s + Number(r.bucket_key) * r.customers, 0);
  const avgAge = agesTotal ? weighted / agesTotal : 0;

  // mediana a partir da distribuição de idades
  let acc = 0;
  const half = agesTotal / 2;
  let medianAge = 0;
  for (const r of ages) {
    acc += r.customers;
    if (acc >= half) {
      medianAge = Number(r.bucket_key);
      break;
    }
  }

  const topGroup = groups.reduce(
    (a, b) => (b.customers > (a?.customers ?? 0) ? b : a),
    groups[0],
  );
  const share = (v: number) => (total ? (v / total) * 100 : 0);
  const adults = groups
    .filter((g) => ["18-24", "25-34", "35-44"].includes(g.bucket_key))
    .reduce((s, g) => s + g.customers, 0);

  return {
    loading,
    ages,
    groups,
    months,
    domains,
    genders,
    genderAge,

    total,

    avgAge,
    medianAge,
    topGroup,
    adults,
    share,
    hasData: rows.length > 0,
  };
}
