import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { jsonResult, notAuthenticated, supabaseForUser, toolError, windowDates } from "../supabase";

export default defineTool({
  name: "list_top_posts",
  title: "Melhores posts",
  description:
    "Lista os posts com melhor desempenho em uma rede social (ou em todas) dentro de uma janela de dias, com métricas e link.",
  inputSchema: {
    platform: z
      .enum(["all", "instagram", "tiktok", "facebook", "youtube", "linkedin"])
      .default("all")
      .describe("Rede social a consultar."),
    days: z.number().int().min(1).max(365).default(30).describe("Janela em dias (padrão 30)."),
    limit: z.number().int().min(1).max(25).default(5).describe("Quantidade de posts (padrão 5)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ platform, days, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const { start, end } = windowDates(days ?? 30);
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.rpc("get_top_posts", {
      _platform: platform === "all" ? null : platform,
      _start: start,
      _end: end,
      _limit: limit ?? 5,
    });
    if (error) return toolError(error.message);
    return jsonResult({ period: { start, end }, platform: platform ?? "all", posts: data ?? [] });
  },
});
