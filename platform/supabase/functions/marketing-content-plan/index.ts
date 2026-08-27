// Gera um plano diário de conteúdo para marketing com base no público esperado,
// visitas/vendas recentes, eventos do parque e desempenho das redes sociais.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const body = await req.json().catch(() => ({}));
    const days: number = Math.min(Math.max(Number(body?.days) || 7, 1), 21);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false } }
    );

    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const start = iso(today);
    const end = iso(new Date(today.getTime() + days * 86400000));
    const salesStart = iso(new Date(today.getTime() - 30 * 86400000));

    const [forecast, events, sales, kpis, followers] = await Promise.all([
      supabase
        .from("park_visitors_forecast")
        .select("date, visitors")
        .gte("date", start)
        .lte("date", end)
        .order("date"),
      supabase
        .from("park_events")
        .select("title, description, category, start_date, end_date, highlight")
        .eq("active", true)
        .order("start_date", { ascending: true })
        .limit(12),
      supabase
        .from("website_sales_daily")
        .select("sale_date, revenue, orders")
        .gte("sale_date", salesStart)
        .order("sale_date"),
      supabase.rpc("get_platform_kpis", { _start: salesStart, _end: start }),
      supabase
        .from("follower_daily")
        .select("reading_date, instagram, tiktok, facebook, youtube, linkedin, total")
        .order("reading_date", { ascending: false })
        .limit(8),
    ]);

    const forecastRows = (forecast.data ?? []).map((r: any) => ({
      date: r.date,
      weekday: WEEKDAYS[new Date(`${r.date}T12:00:00`).getDay()],
      expected_visitors: Number(r.visitors),
    }));

    const context = {
      hoje: start,
      publico_esperado_por_dia: forecastRows,
      total_publico_esperado: forecastRows.reduce((a, r) => a + r.expected_visitors, 0),
      eventos_ativos: events.data ?? [],
      vendas_site_ultimos_30_dias: sales.data ?? [],
      kpis_redes_ultimos_30_dias: kpis.data ?? [],
      seguidores_recentes: followers.data ?? [],
    };

    const prompt = `Você é o head de social media do parque Hopi Hari (Vinhedo/SP). Monte um PLANO DIÁRIO DE CONTEÚDO para os próximos ${days} dias, cujo objetivo é atrair mais público ao parque.

Use os dados reais abaixo. Dias com público esperado BAIXO precisam de conteúdo de conversão/oferta e urgência; dias com público esperado ALTO precisam de conteúdo de prova social, experiência e retenção (evitar filas, chegar cedo, combos). Considere eventos ativos, sazonalidade por dia da semana e o desempenho por rede.

DADOS:
${JSON.stringify(context, null, 2)}

Responda APENAS com JSON válido:
{
  "resumo": "2-3 frases com a leitura da semana e a prioridade de marketing",
  "prioridades": ["3-5 bullets objetivos, com números dos dados"],
  "dias": [
    {
      "data": "YYYY-MM-DD",
      "dia_semana": "segunda",
      "publico_esperado": 1234,
      "nivel": "baixo|medio|alto",
      "objetivo": "vender ingressos | encher fim de semana | prova social | ...",
      "posts": [
        {
          "plataforma": "instagram|tiktok|youtube|facebook|linkedin",
          "formato": "reels|carrossel|story|foto|short|post",
          "horario": "18h30",
          "tema": "título curto da ideia",
          "roteiro": "1-3 frases descrevendo o que gravar/mostrar",
          "legenda": "legenda pronta em português com CTA",
          "hashtags": ["#HopiHari"],
          "cta": "ação esperada"
        }
      ]
    }
  ],
  "campanhas_pagas": ["2-4 sugestões de impulsionamento com público e dia"],
  "riscos": ["1-3 alertas"]
}

Regras: 2 a 3 posts por dia; nunca invente números que não estejam nos dados; escreva tudo em português do Brasil; legendas prontas para publicar.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você planeja conteúdo de social media com base em dados e responde só em JSON." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (r.status === 429)
      throw new Error("Limite de requisições da IA atingido. Tente novamente em alguns minutos.");
    if (r.status === 402) throw new Error("Créditos de IA esgotados. Recarregue no workspace da Lovable.");
    if (!r.ok) throw new Error(`AI gateway ${r.status}: ${(await r.text()).slice(0, 200)}`);

    const j = await r.json();
    const content = j.choices?.[0]?.message?.content ?? "{}";
    let plan: unknown;
    try {
      plan = JSON.parse(content);
    } catch {
      plan = { resumo: content, dias: [] };
    }

    return new Response(JSON.stringify({ success: true, plan, context: { period: { start, end }, forecast: forecastRows } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("marketing-content-plan error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
