// collect-trends — Google Trends (SerpApi, geo=BR) com Hopi Hari como âncora.
// O Trends compara no máximo 5 termos por requisição e os scores são relativos
// dentro de cada batch; rodamos 2 batches com a âncora e reescalamos o batch B.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const ANCHOR_SLUG = "hopi-hari";

interface TrendPoint {
  date: string;
  values: Record<string, number>;
}

async function fetchTrendsBatch(queries: string[]): Promise<TrendPoint[]> {
  const params = new URLSearchParams({
    engine: "google_trends",
    q: queries.join(","),
    geo: "BR",
    data_type: "TIMESERIES",
    date: "today 3-m",
    api_key: Deno.env.get("SERPAPI_KEY")!,
  });

  const res = await fetch(`https://serpapi.com/search.json?${params}`);
  if (!res.ok) throw new Error(`SerpApi ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json?.error) throw new Error(`SerpApi: ${json.error}`);

  const timeline = json?.interest_over_time?.timeline_data ?? [];
  return timeline.map((t: any) => {
    const values: Record<string, number> = {};
    for (const v of t.values ?? []) values[v.query] = Number(v.extracted_value ?? 0);
    const d = t.timestamp ? new Date(Number(t.timestamp) * 1000) : new Date(t.date);
    return { date: d.toISOString().slice(0, 10), values };
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    if (!Deno.env.get("SERPAPI_KEY")) throw new Error("SERPAPI_KEY não configurada");

    const { data: competitors, error } = await supabase
      .from("ci_competitors")
      .select("id, slug, trends_query")
      .eq("active", true);
    if (error) throw error;

    const anchor = competitors!.find((c) => c.slug === ANCHOR_SLUG);
    if (!anchor) throw new Error("Concorrente âncora (Hopi Hari) não encontrado");
    const others = competitors!.filter((c) => c.slug !== ANCHOR_SLUG);

    const batchA = [anchor, ...others.slice(0, 4)];
    const batchB = others.length > 4 ? [anchor, ...others.slice(4)] : [];

    const pointsA = await fetchTrendsBatch(batchA.map((c) => c.trends_query));
    const pointsB = batchB.length ? await fetchTrendsBatch(batchB.map((c) => c.trends_query)) : [];

    const mean = (pts: TrendPoint[], q: string) => {
      const vals = pts.map((p) => p.values[q] ?? 0);
      return vals.reduce((a, b) => a + b, 0) / Math.max(vals.length, 1);
    };
    const anchorMeanA = mean(pointsA, anchor.trends_query);
    const anchorMeanB = pointsB.length ? mean(pointsB, anchor.trends_query) : 0;
    const scale = anchorMeanB > 0 ? anchorMeanA / anchorMeanB : 1;

    const rows: any[] = [];
    const push = (
      comp: { id: string; trends_query: string },
      pts: TrendPoint[],
      batch: "A" | "B",
      factor: number,
    ) => {
      for (const p of pts) {
        const raw = p.values[comp.trends_query];
        if (raw === undefined) continue;
        rows.push({
          competitor_id: comp.id,
          date: p.date,
          raw_score: raw,
          score: Math.round(raw * factor * 10) / 10,
          batch,
        });
      }
    };

    for (const c of batchA) push(c, pointsA, "A", 1);
    for (const c of batchB) {
      if (c.slug === ANCHOR_SLUG) continue;
      push(c, pointsB, "B", scale);
    }

    if (rows.length) {
      const { error: upsertErr } = await supabase
        .from("ci_trend_scores")
        .upsert(rows, { onConflict: "competitor_id,date" });
      if (upsertErr) throw upsertErr;
    }

    return json({ ok: true, rows: rows.length, rescale_factor: Number(scale.toFixed(3)) });
  } catch (e) {
    console.error("collect-trends", e);
    return json({ ok: false, error: String(e) }, 500);
  }
});
