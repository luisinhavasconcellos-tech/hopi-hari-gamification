import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { jsonResult, notAuthenticated, supabaseForUser, toolError } from "../supabase";

export default defineTool({
  name: "list_park_events",
  title: "Eventos do parque",
  description:
    "Lista os eventos do Hopi Hari (site oficial + cadastro manual) com datas, categoria, destaque e link, opcionalmente só os ativos.",
  inputSchema: {
    only_active: z.boolean().default(true).describe("Retornar apenas eventos ativos."),
    limit: z.number().int().min(1).max(50).default(20).describe("Quantidade máxima de eventos."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ only_active, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("park_events")
      .select("slug,title,description,category,start_date,end_date,highlight,active,url,last_seen_at")
      .order("start_date", { ascending: true, nullsFirst: false })
      .limit(limit ?? 20);
    if (only_active !== false) query = query.eq("active", true);

    const { data, error } = await query;
    if (error) return toolError(error.message);
    return jsonResult({ events: data ?? [], count: (data ?? []).length });
  },
});
