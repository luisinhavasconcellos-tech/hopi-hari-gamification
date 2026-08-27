// Gera insights de IA por evento do parque (público-alvo, mídia, riscos, ações).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type EventRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  start_date: string | null;
  end_date: string | null;
  source: string;
  ai_insights: unknown | null;
};

const SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "Resumo executivo do evento em 1-2 frases" },
    audience: { type: "string", description: "Público-alvo principal e faixa etária provável" },
    expected_impact: {
      type: "string",
      enum: ["alto", "medio", "baixo"],
      description: "Impacto esperado em visitação e engajamento",
    },
    demand_drivers: { type: "array", items: { type: "string" }, description: "Fatores que puxam demanda" },
    content_angles: { type: "array", items: { type: "string" }, description: "Ângulos de conteúdo para redes sociais" },
    channels: { type: "array", items: { type: "string" }, description: "Canais recomendados de divulgação" },
    risks: { type: "array", items: { type: "string" }, description: "Riscos e pontos de atenção" },
    actions: { type: "array", items: { type: "string" }, description: "Próximos passos acionáveis" },
    kpis: { type: "array", items: { type: "string" }, description: "Indicadores para acompanhar o evento" },
  },
  required: ["summary", "audience", "expected_impact", "content_angles", "actions"],
  additionalProperties: false,
} as const;

async function analyze(e: EventRow) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) throw new Error("LOVABLE_API_KEY não configurada");

  const today = new Date().toISOString().slice(0, 10);
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "Você é analista de marketing e inteligência de audiência do parque Hopi Hari (Vinhedo/SP, Brasil). " +
            `Hoje é ${today}. Analise o evento e produza insights práticos em português do Brasil, ` +
            "considerando sazonalidade, férias escolares, concorrentes (Beto Carrero, Wet'n Wild) e canais B2B (escolas e empresas). " +
            "Seja específico e evite generalidades. Responda apenas com a função.",
        },
        {
          role: "user",
          content: JSON.stringify({
            titulo: e.title,
            categoria: e.category,
            inicio: e.start_date,
            fim: e.end_date,
            descricao: e.description,
            origem: e.source,
          }),
        },
      ],
      tools: [
        {
          type: "function",
          function: { name: "save_insights", description: "Salva os insights do evento", parameters: SCHEMA },
        },
      ],
      tool_choice: { type: "function", function: { name: "save_insights" } },
    }),
  });

  const text = await res.text();
  if (res.status === 429) throw new Error("Limite de requisições da IA atingido, tente mais tarde");
  if (res.status === 402) throw new Error("Créditos de IA esgotados");
  if (!res.ok) throw new Error(`AI [${res.status}]: ${text.slice(0, 300)}`);
  const data = JSON.parse(text);
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("IA não retornou insights");
  return JSON.parse(args) as Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const eventId: string | undefined = typeof body?.eventId === "string" ? body.eventId : undefined;
    const force = body?.force === true;
    const limit = Math.min(Number(body?.limit ?? 10) || 10, 25);

    let query = supabase
      .from("park_events")
      .select("id, slug, title, description, category, start_date, end_date, source, ai_insights")
      .eq("active", true)
      .order("start_date", { ascending: false, nullsFirst: false })
      .limit(eventId ? 1 : limit);

    if (eventId) query = query.eq("id", eventId);
    else if (!force) query = query.is("ai_insights", null);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const events = (data ?? []) as EventRow[];
    let generated = 0;
    const errors: string[] = [];

    for (const e of events) {
      try {
        const insights = await analyze(e);
        const { error: upErr } = await supabase
          .from("park_events")
          .update({ ai_insights: insights, insights_generated_at: new Date().toISOString() })
          .eq("id", e.id);
        if (upErr) throw new Error(upErr.message);
        generated++;
      } catch (err) {
        errors.push(`${e.title}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return json({ success: errors.length === 0, candidates: events.length, generated, errors });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("generate-event-insights:", message);
    return json({ success: false, error: message }, 500);
  }
});
