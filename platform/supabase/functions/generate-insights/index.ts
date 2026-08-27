// generate-insights — resumo executivo semanal (PT-BR) de inteligência
// competitiva, gerado com a Lovable AI a partir do ranking e do Google Trends.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const MODEL = "google/gemini-2.5-flash";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { data: ranking, error: rErr } = await supabase.from("ci_weekly_ranking").select("*");
    if (rErr) throw rErr;
    if (!ranking?.length) throw new Error("Sem ranking disponível — rode as coletas primeiro.");

    const { data: trends, error: tErr } = await supabase
      .from("ci_trend_scores")
      .select("date, score, ci_competitors(slug)")
      .gte("date", new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10))
      .order("date");
    if (tErr) throw tErr;

    const prompt = `Você é o analista de inteligência competitiva do Hopi Hari.
Semana fechada na terça-feira. Gere o resumo executivo para a reunião de diretoria.

RANKING NACIONAL (composto 57% menções/busca + 43% engajamento):
${JSON.stringify(ranking, null, 2)}

GOOGLE TRENDS ÚLTIMOS 14 DIAS (0-100, BR, âncora Hopi Hari):
${JSON.stringify((trends ?? []).slice(-200), null, 2)}

Responda APENAS com JSON válido, sem markdown:
{
  "headline": "uma frase de impacto em PT-BR",
  "body_ptbr": "3 parágrafos: 1) posição do Hopi Hari e variação semanal; 2) movimento mais relevante de concorrente e hipótese de causa; 3) recomendação acionável para a próxima semana. Tom executivo, números concretos."
}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (res.status === 429) throw new Error("Limite de requisições de IA atingido. Tente novamente em instantes.");
    if (res.status === 402) throw new Error("Créditos de IA insuficientes no workspace.");
    if (!res.ok) throw new Error(`Lovable AI ${res.status}: ${await res.text()}`);

    const data = await res.json();
    const text = String(data?.choices?.[0]?.message?.content ?? "")
      .replace(/```json|```/g, "")
      .trim();
    const insight = JSON.parse(text);

    // week_ending = terça-feira mais recente
    const now = new Date();
    const back = (now.getUTCDay() - 2 + 7) % 7;
    const weekEnding = new Date(now.getTime() - back * 864e5).toISOString().slice(0, 10);

    const { error: insErr } = await supabase.from("ci_insights").insert({
      week_ending: weekEnding,
      headline: insight.headline,
      body_ptbr: insight.body_ptbr,
      ranking,
      model: MODEL,
    });
    if (insErr) throw insErr;

    return json({ ok: true, week_ending: weekEnding, headline: insight.headline });
  } catch (e) {
    console.error("generate-insights", e);
    return json({ ok: false, error: String(e) }, 500);
  }
});
