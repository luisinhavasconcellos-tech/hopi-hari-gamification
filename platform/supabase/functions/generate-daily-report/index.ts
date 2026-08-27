// Generates an AI-written daily executive narrative for the multi-platform PDF report.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json();
    const { metrics } = body as { metrics: Record<string, unknown> };
    if (!metrics) throw new Error("metrics payload missing");

    const prompt = `Você é um analista sênior de social media para o parque temático Hopi Hari. Gere um relatório executivo diário em português (formato JSON) com base nas métricas abaixo.

DADOS:
${JSON.stringify(metrics, null, 2)}

Responda APENAS com JSON válido nesta estrutura:
{
  "executive_summary": "2-3 parágrafos curtos cobrindo desempenho geral do dia/semana, destaques e alertas",
  "key_findings": ["3-5 bullets factuais com números"],
  "per_platform": {
    "instagram": "1 parágrafo análise breve",
    "tiktok": "1 parágrafo",
    "facebook": "1 parágrafo",
    "youtube": "1 parágrafo",
    "linkedin": "1 parágrafo"
  },
  "recommendations": ["3-5 ações concretas para amanhã"],
  "risks": ["1-3 riscos ou quedas que merecem atenção"]
}
Seja específico com números. Não invente dados que não estão na entrada. Se uma plataforma estiver sem dados, escreva "Sem dados suficientes hoje.".`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você produz relatórios executivos concisos em JSON." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      throw new Error(`AI gateway ${r.status}: ${t.slice(0, 200)}`);
    }

    const j = await r.json();
    const content = j.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { executive_summary: content };
    }

    return new Response(JSON.stringify({ success: true, report: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-daily-report error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
