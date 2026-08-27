import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { jsonResult, notAuthenticated, supabaseForUser, toolError } from "../supabase";

export default defineTool({
  name: "get_sales_overview",
  title: "Vendas por canal",
  description:
    "Receita e quantidade vendida por canal em um ano, com evolução mensal e comparação com o ano anterior.",
  inputSchema: {
    year: z.number().int().min(2015).max(2100).describe("Ano a consultar, ex.: 2026."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ year }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("sales_revenue_monthly")
      .select("channel,year,month,quantity,revenue")
      .in("year", [year, year - 1])
      .limit(5000);
    if (error) return toolError(error.message);

    const rows = data ?? [];
    const summarize = (y: number) => {
      const subset = rows.filter((r) => r.year === y);
      const byChannel = new Map<string, { revenue: number; quantity: number }>();
      for (const r of subset) {
        const e = byChannel.get(r.channel) ?? { revenue: 0, quantity: 0 };
        e.revenue += Number(r.revenue) || 0;
        e.quantity += Number(r.quantity) || 0;
        byChannel.set(r.channel, e);
      }
      return {
        year: y,
        revenue: Number(subset.reduce((s, r) => s + (Number(r.revenue) || 0), 0).toFixed(2)),
        quantity: subset.reduce((s, r) => s + (Number(r.quantity) || 0), 0),
        by_channel: [...byChannel]
          .map(([channel, e]) => ({ channel, revenue: Number(e.revenue.toFixed(2)), quantity: e.quantity }))
          .sort((a, b) => b.revenue - a.revenue),
      };
    };

    const current = summarize(year);
    const previous = summarize(year - 1);
    const monthly = rows
      .filter((r) => r.year === year)
      .reduce((acc: Record<number, number>, r) => {
        acc[r.month] = (acc[r.month] ?? 0) + (Number(r.revenue) || 0);
        return acc;
      }, {});

    return jsonResult({
      current,
      previous,
      revenue_growth_pct: previous.revenue
        ? Number((((current.revenue - previous.revenue) / previous.revenue) * 100).toFixed(2))
        : null,
      monthly_revenue: Object.entries(monthly)
        .map(([month, revenue]) => ({ month: Number(month), revenue: Number(revenue.toFixed(2)) }))
        .sort((a, b) => a.month - b.month),
    });
  },
});
