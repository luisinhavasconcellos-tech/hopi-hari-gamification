// In-depth AI analysis per post across all platforms.
// Body for per-post: { action: "post", postId, platform? }
// Body for global: { action: "global" }  (Instagram only, kept for backwards compat)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-pro";

const TABLES: Record<string, string> = {
  instagram: "instagram_posts",
  tiktok: "tiktok_posts",
  facebook: "facebook_posts",
  linkedin: "linkedin_posts",
  youtube: "youtube_posts",
};

async function callAI(messages: unknown[], tools?: unknown[], toolChoice?: unknown) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const body: Record<string, unknown> = { model: MODEL, messages };
  if (tools) body.tools = tools;
  if (toolChoice) body.tool_choice = toolChoice;
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new Error("Rate limit excedido. Tente novamente em instantes.");
  if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione em Workspace → Usage.");
  if (!res.ok) throw new Error(`AI error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return await res.json();
}

const POST_SCHEMA = {
  type: "object",
  properties: {
    sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
    sentimentScore: { type: "number", description: "-1 (muito negativo) a 1 (muito positivo)" },
    performanceVsAverage: { type: "string", enum: ["above", "at", "below"] },
    performanceSummary: { type: "string", description: "1 frase comparando este post com a média (likes, comentários, views)." },
    topTopics: { type: "array", items: { type: "string" }, maxItems: 6, description: "2-5 palavras-chave em PT" },
    summary: { type: "string", description: "1-2 frases resumindo o post (PT)" },
    behaviorAnalysis: { type: "string", description: "Análise do comportamento da audiência: como reagiram, padrões de comentários, engajamento por tipo de mídia. 2-4 frases em PT." },
    strategyAnalysis: { type: "string", description: "Análise da estratégia de conteúdo deste post: formato, copy, gancho, CTA, alinhamento de marca. 2-4 frases em PT." },
    audienceReactions: { type: "string", description: "O que a audiência expressou nos comentários (sentimentos, dúvidas, elogios, reclamações). 1-3 frases em PT." },
    strengths: { type: "array", items: { type: "string" }, maxItems: 5, description: "Pontos fortes do post" },
    weaknesses: { type: "array", items: { type: "string" }, maxItems: 5, description: "Pontos fracos / oportunidades perdidas" },
    recommendation: { type: "string", description: "Recomendação principal acionável (1-2 frases PT)" },
    nextSteps: { type: "array", items: { type: "string" }, maxItems: 5, description: "3-5 próximos passos concretos para evoluir o conteúdo" },
    bestTimeToPost: { type: "string", description: "Melhor horário sugerido (opcional)" },
    contentPillar: { type: "string", description: "Pilar de conteúdo identificado (ex: 'Halloween', 'experiência de família', 'bastidores')" },
  },
  required: [
    "sentiment", "sentimentScore", "performanceVsAverage", "performanceSummary",
    "topTopics", "summary", "behaviorAnalysis", "strategyAnalysis",
    "audienceReactions", "strengths", "weaknesses", "recommendation", "nextSteps",
  ],
  additionalProperties: false,
};

const GLOBAL_SCHEMA = {
  type: "object",
  properties: {
    overview: { type: "string" },
    bestPerformers: { type: "array", items: { type: "object", properties: { shortcode: { type: "string" }, reason: { type: "string" } }, required: ["shortcode", "reason"] } },
    worstPerformers: { type: "array", items: { type: "object", properties: { shortcode: { type: "string" }, reason: { type: "string" } }, required: ["shortcode", "reason"] } },
    winningThemes: { type: "array", items: { type: "string" } },
    losingThemes: { type: "array", items: { type: "string" } },
    contentMixRecommendation: { type: "string" },
    postingCadenceRecommendation: { type: "string" },
    engagementInsights: { type: "string" },
    nextActions: { type: "array", items: { type: "string" }, maxItems: 6 },
  },
  required: ["overview", "winningThemes", "contentMixRecommendation", "nextActions"],
  additionalProperties: false,
};

function extractComments(raw: any): string[] {
  const out: string[] = [];
  const candidates = [raw?.latestComments, raw?.comments, raw?.topComments, raw?.commentsList].filter(Array.isArray);
  for (const arr of candidates) {
    for (const c of arr.slice(0, 20)) {
      const t = typeof c === "string" ? c : c?.text ?? c?.message ?? c?.commentText ?? c?.content;
      if (t) out.push(String(t).slice(0, 240));
    }
    if (out.length) break;
  }
  return out.slice(0, 15);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const action: string = body.action ?? "global";

    if (action === "post") {
      const postId: string = body.postId;
      const platform: string = body.platform ?? "instagram";
      if (!postId) throw new Error("postId required");
      const table = TABLES[platform];
      if (!table) throw new Error(`Plataforma inválida: ${platform}`);

      const { data: post, error } = await supabase
        .from(table).select("*").eq("id", postId).maybeSingle();
      if (error) throw error;
      if (!post) throw new Error("Post não encontrado");

      const { data: avgs } = await supabase
        .from(table)
        .select("like_count, comments_count, view_count")
        .eq("scrape_status", "scraped");
      const n = avgs?.length ?? 0;
      const avgLikes = n ? avgs!.reduce((s, p) => s + (p.like_count ?? 0), 0) / n : 0;
      const avgComments = n ? avgs!.reduce((s, p) => s + (p.comments_count ?? 0), 0) / n : 0;
      const avgViews = n ? avgs!.reduce((s, p) => s + (p.view_count ?? 0), 0) / n : 0;

      const comments = extractComments(post.raw_data);
      const commentsBlock = comments.length
        ? `\n\nComentários da audiência (amostra):\n${comments.map((c, i) => `${i + 1}. ${c}`).join("\n")}`
        : "\n\n(sem comentários disponíveis na coleta)";

      const ai = await callAI([
        {
          role: "system",
          content:
            "Você é um estrategista sênior de social media para o parque temático brasileiro Hopi Hari (@hopihari). " +
            "Faça uma análise PROFUNDA, ESPECÍFICA e ACIONÁVEL de cada post: comportamento da audiência, estratégia de conteúdo, " +
            "sentimento, pontos fortes/fracos e próximos passos. Seja concreto, evite generalidades. " +
            "Responda SEMPRE em português brasileiro, tom profissional e direto.",
        },
        {
          role: "user",
          content:
            `Plataforma: ${platform}\n` +
            `Tipo de mídia: ${post.media_type ?? "n/a"}\n` +
            `Data: ${post.timestamp ?? "n/a"}\n` +
            `URL: ${post.post_url}\n\n` +
            `Legenda:\n${post.caption ?? "(sem legenda)"}\n\n` +
            `Métricas deste post:\n` +
            `- Curtidas: ${post.like_count ?? 0} (média da plataforma: ${Math.round(avgLikes)})\n` +
            `- Comentários: ${post.comments_count ?? 0} (média: ${Math.round(avgComments)})\n` +
            `- Visualizações: ${post.view_count ?? "n/a"}${avgViews ? ` (média: ${Math.round(avgViews)})` : ""}\n` +
            `- Compartilhamentos: ${(post as any).share_count ?? "n/a"}` +
            commentsBlock +
            `\n\nRetorne a análise estruturada via tool call. Use os comentários reais para inferir o sentimento e as reações da audiência.`,
        },
      ], [{
        type: "function",
        function: { name: "analyze_post", description: "Análise profunda de um post", parameters: POST_SCHEMA },
      }], { type: "function", function: { name: "analyze_post" } });

      const args = ai.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      const analysis = args ? JSON.parse(args) : null;

      if (analysis) {
        analysis.analyzed_at = new Date().toISOString();
        await supabase.from(table).update({ ai_analysis: analysis }).eq("id", postId);
      }
      return new Response(JSON.stringify({ success: true, analysis }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "global") {
      const { data: posts, error } = await supabase
        .from("instagram_posts")
        .select("shortcode, media_type, caption, like_count, comments_count, view_count, timestamp")
        .eq("scrape_status", "scraped")
        .order("timestamp", { ascending: false });
      if (error) throw error;
      if (!posts?.length) throw new Error("Nenhum post processado para analisar.");

      const summary = posts.map((p) => `- [${p.shortcode}] ${p.media_type} | ${p.like_count} curtidas, ${p.comments_count} comentários${p.view_count ? `, ${p.view_count} views` : ""} | ${(p.caption ?? "").slice(0, 140)}`).join("\n");

      const ai = await callAI([
        { role: "system", content: "Você é um estrategista sênior de Instagram. Analise o histórico do perfil @hopihari (parque temático brasileiro) e gere um relatório acionável em português brasileiro." },
        { role: "user", content: `Aqui estão ${posts.length} posts recentes do @hopihari:\n\n${summary}\n\nGere um relatório completo de performance e estratégia.` },
      ], [{
        type: "function",
        function: { name: "global_report", description: "Relatório global de estratégia", parameters: GLOBAL_SCHEMA },
      }], { type: "function", function: { name: "global_report" } });

      const args = ai.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      const insights = args ? JSON.parse(args) : null;

      if (insights) {
        await supabase.from("instagram_reports").insert({ scope: "global", summary: insights.overview, insights });
      }
      return new Response(JSON.stringify({ success: true, insights, postsAnalyzed: posts.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "batch") {
      // Analyze N pending posts on a given platform that don't yet have a deep analysis.
      const platform: string = body.platform ?? "instagram";
      const limit: number = Math.min(body.limit ?? 5, 10);
      const table = TABLES[platform];
      if (!table) throw new Error(`Plataforma inválida: ${platform}`);

      const { data: list } = await supabase
        .from(table)
        .select("id, ai_analysis")
        .eq("scrape_status", "scraped")
        .limit(200);
      const todo = (list ?? [])
        .filter((p: any) => !p.ai_analysis?.behaviorAnalysis)
        .slice(0, limit);

      let updated = 0;
      for (const p of todo) {
        try {
          const r = await fetch(new URL(req.url).origin + "/functions/v1/analyze-posts", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: req.headers.get("Authorization") ?? "" },
            body: JSON.stringify({ action: "post", postId: p.id, platform }),
          });
          if (r.ok) updated++;
        } catch (_) { /* continue */ }
      }
      return new Response(JSON.stringify({ success: true, requested: todo.length, updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e) {
    console.error("analyze-posts error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
