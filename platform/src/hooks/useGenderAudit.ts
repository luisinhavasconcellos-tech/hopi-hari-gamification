import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Gender = "F" | "M" | "ND";

export interface GenderSample {
  id: string;
  first_name: string;
  predicted_gender: Gender;
  occurrences: number;
  reviewed: boolean;
}

export interface GenderReview {
  id: string;
  sample_id: string;
  first_name: string;
  predicted_gender: Gender;
  actual_gender: Gender;
  is_correct: boolean;
  reviewer: string | null;
  notes: string | null;
  created_at: string;
}

export function useGenderAudit() {
  const [samples, setSamples] = useState<GenderSample[]>([]);
  const [reviews, setReviews] = useState<GenderReview[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, r] = await Promise.all([
      supabase
        .from("gender_audit_samples")
        .select("id, first_name, predicted_gender, occurrences, reviewed")
        .order("occurrences", { ascending: false })
        .limit(1000),
      supabase
        .from("gender_audit_reviews")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);
    setSamples((s.data ?? []) as GenderSample[]);
    setReviews((r.data ?? []) as GenderReview[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitReview = useCallback(
    async (sample: GenderSample, actual: Gender, reviewer: string, notes?: string) => {
      const { error } = await supabase.from("gender_audit_reviews").insert({
        sample_id: sample.id,
        first_name: sample.first_name,
        predicted_gender: sample.predicted_gender,
        actual_gender: actual,
        is_correct: actual === sample.predicted_gender,
        reviewer: reviewer || null,
        notes: notes || null,
      });
      if (error) throw error;
      await supabase.from("gender_audit_samples").update({ reviewed: true }).eq("id", sample.id);
      setSamples((prev) => prev.map((x) => (x.id === sample.id ? { ...x, reviewed: true } : x)));
      await load();
    },
    [load],
  );

  const metrics = useMemo(() => {
    // last review per sample wins
    const latest = new Map<string, GenderReview>();
    for (const r of [...reviews].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
      latest.set(r.sample_id, r);
    }
    const list = [...latest.values()];
    const total = list.length;
    const correct = list.filter((r) => r.is_correct).length;
    const weighted = list.reduce(
      (acc, r) => {
        const occ = samples.find((s) => s.id === r.sample_id)?.occurrences ?? 1;
        acc.total += occ;
        if (r.is_correct) acc.correct += occ;
        return acc;
      },
      { total: 0, correct: 0 },
    );

    const byPredicted = (["F", "M", "ND"] as Gender[]).map((g) => {
      const rows = list.filter((r) => r.predicted_gender === g);
      const ok = rows.filter((r) => r.is_correct).length;
      return {
        gender: g,
        reviewed: rows.length,
        correct: ok,
        accuracy: rows.length ? (ok / rows.length) * 100 : 0,
      };
    });

    const confusion = (["F", "M", "ND"] as Gender[]).map((p) => ({
      predicted: p,
      F: list.filter((r) => r.predicted_gender === p && r.actual_gender === "F").length,
      M: list.filter((r) => r.predicted_gender === p && r.actual_gender === "M").length,
      ND: list.filter((r) => r.predicted_gender === p && r.actual_gender === "ND").length,
    }));

    const errors = list
      .filter((r) => !r.is_correct)
      .map((r) => ({ ...r, occurrences: samples.find((s) => s.id === r.sample_id)?.occurrences ?? 0 }))
      .sort((a, b) => b.occurrences - a.occurrences);

    return {
      total,
      correct,
      accuracy: total ? (correct / total) * 100 : 0,
      weightedAccuracy: weighted.total ? (weighted.correct / weighted.total) * 100 : 0,
      coveredCustomers: weighted.total,
      byPredicted,
      confusion,
      errors,
      latest: list,
    };
  }, [reviews, samples]);

  return { loading, samples, reviews, metrics, submitReview, reload: load };
}
