import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { jsonResult, notAuthenticated, supabaseForUser, toolError } from "../supabase";

export default defineTool({
  name: "get_reputation_overview",
  title: "Reputação (ReclameAqui / TripAdvisor)",
  description:
    "Resumo das avaliações coletadas: volume, sentimento, nota média e principais reclamações por fonte em uma janela de dias.",
  inputSchema: {
    days: z.number().int().min(1).max(730).default(90).describe("Janela em dias (padrão 90)."),
    source: z.enum(["all", "reclameaqui", "tripadvisor"]).default("all").describe("Fonte das avaliações."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days, source }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const since = new Date(Date.now() - (days ?? 90) * 24 * 3600 * 1000).toISOString();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("reputation_reviews")
      .select("source,rating,sentiment,category,title,ai_summary,published_at,responded_at,resolved")
      .gte("published_at", since)
      .order("published_at", { ascending: false })
      .limit(500);
    if (source && source !== "all") query = query.eq("source", source);

    const { data, error } = await query;
    if (error) return toolError(error.message);
    const rows = data ?? [];
    if (rows.length === 0) return jsonResult({ since, reviews: 0, note: "Nenhuma avaliação no período." });

    const ratings = rows.map((r) => Number(r.rating)).filter((n) => Number.isFinite(n));
    const byCategory = new Map<string, number>();
    for (const r of rows) {
      const key = r.category ?? "sem categoria";
      byCategory.set(key, (byCategory.get(key) ?? 0) + 1);
    }

    return jsonResult({
      since,
      reviews: rows.length,
      avg_rating: ratings.length ? Number((ratings.reduce((s, n) => s + n, 0) / ratings.length).toFixed(2)) : null,
      negative: rows.filter((r) => r.sentiment === "negative").length,
      neutral: rows.filter((r) => r.sentiment === "neutral").length,
      positive: rows.filter((r) => r.sentiment === "positive").length,
      answered: rows.filter((r) => r.responded_at != null).length,
      resolved: rows.filter((r) => r.resolved).length,
      top_categories: [...byCategory]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([category, reviews]) => ({ category, reviews })),
      recent: rows.slice(0, 5).map((r) => ({
        source: r.source,
        published_at: r.published_at,
        rating: r.rating,
        sentiment: r.sentiment,
        title: r.title,
        summary: r.ai_summary,
      })),
    });
  },
});
