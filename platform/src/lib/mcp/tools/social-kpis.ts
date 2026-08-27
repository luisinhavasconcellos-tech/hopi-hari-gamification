import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { jsonResult, notAuthenticated, supabaseForUser, toolError, windowDates } from "../supabase";

export default defineTool({
  name: "get_social_kpis",
  title: "KPIs das redes sociais",
  description:
    "Retorna KPIs por rede social (posts, curtidas, comentários, compartilhamentos, views, seguidores e taxa de engajamento) em uma janela de dias.",
  inputSchema: {
    days: z.number().int().min(1).max(365).default(30).describe("Tamanho da janela em dias (padrão 30)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const { start, end } = windowDates(days ?? 30);
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.rpc("get_platform_kpis", { _start: start, _end: end });
    if (error) return toolError(error.message);
    return jsonResult({ period: { start, end }, platforms: data ?? [] });
  },
});
