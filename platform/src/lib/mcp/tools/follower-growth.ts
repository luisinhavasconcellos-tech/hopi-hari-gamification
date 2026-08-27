import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { jsonResult, notAuthenticated, supabaseForUser, toolError } from "../supabase";

const NETS = ["instagram", "tiktok", "facebook", "youtube", "linkedin"] as const;

export default defineTool({
  name: "get_follower_growth",
  title: "Crescimento de seguidores",
  description:
    "Retorna o número atual de seguidores por rede, o total agregado e o crescimento no período pedido, usando o log diário oficial.",
  inputSchema: {
    days: z.number().int().min(1).max(365).default(30).describe("Janela de comparação em dias (padrão 30)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("follower_daily")
      .select("reading_date,instagram,tiktok,facebook,youtube,linkedin,total")
      .order("reading_date", { ascending: false })
      .limit(400);
    if (error) return toolError(error.message);
    const rows = data ?? [];
    if (rows.length === 0) return toolError("Nenhuma leitura de seguidores registrada.");

    const latest = rows[0];
    const cutoff = new Date(Date.now() - (days ?? 30) * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const baseline = rows.find((r) => r.reading_date <= cutoff) ?? rows[rows.length - 1];

    const sum = (r: typeof latest) => NETS.reduce((s, n) => s + (Number(r[n]) || 0), 0);
    const byNetwork = NETS.map((n) => {
      const current = Number(latest[n]) || 0;
      const before = Number(baseline[n]) || 0;
      return {
        network: n,
        followers: current,
        gained: current - before,
        growth_pct: before ? Number((((current - before) / before) * 100).toFixed(2)) : null,
      };
    });

    return jsonResult({
      latest_reading: latest.reading_date,
      baseline_reading: baseline.reading_date,
      total_followers: sum(latest),
      total_gained: sum(latest) - sum(baseline),
      by_network: byNetwork,
    });
  },
});
