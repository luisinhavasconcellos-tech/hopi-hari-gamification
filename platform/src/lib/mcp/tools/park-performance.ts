import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { jsonResult, notAuthenticated, supabaseForUser, toolError } from "../supabase";

export default defineTool({
  name: "get_park_performance",
  title: "Público e consumo no parque",
  description:
    "Público mensal do parque e receita per capita por categoria (A&B, Mercadorias, Jogos) para um ano, com dias de operação.",
  inputSchema: {
    year: z.number().int().min(1999).max(2100).describe("Ano a consultar, ex.: 2026."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ year }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const [publicRes, perCapitaRes] = await Promise.all([
      supabase
        .from("park_public_monthly")
        .select("year,month,visitors,open_days")
        .eq("year", year)
        .order("month"),
      supabase
        .from("park_percapita_daily")
        .select("date,category,public,revenue,penetration_pct")
        .gte("date", `${year}-01-01`)
        .lte("date", `${year}-12-31`)
        .limit(5000),
    ]);
    if (publicRes.error) return toolError(publicRes.error.message);
    if (perCapitaRes.error) return toolError(perCapitaRes.error.message);

    const agg = new Map<string, { revenue: number; publicSum: number; days: number }>();
    for (const r of perCapitaRes.data ?? []) {
      const e = agg.get(r.category) ?? { revenue: 0, publicSum: 0, days: 0 };
      e.revenue += Number(r.revenue) || 0;
      e.publicSum += Number(r.public) || 0;
      e.days += 1;
      agg.set(r.category, e);
    }

    const months = publicRes.data ?? [];
    return jsonResult({
      year,
      total_visitors: months.reduce((s, m) => s + (Number(m.visitors) || 0), 0),
      monthly_visitors: months,
      per_capita_by_category: [...agg].map(([category, e]) => ({
        category,
        revenue: Number(e.revenue.toFixed(2)),
        days_with_data: e.days,
        per_capita: e.publicSum ? Number((e.revenue / e.publicSum).toFixed(2)) : null,
      })),
    });
  },
});
