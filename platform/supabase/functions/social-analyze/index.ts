// Hopi Hari — Social Intelligence analysis (KPI guide sections 07, 08, 09).
// Modes: daily | weekly | channel-deepdive
// Aggregates posts from Supabase, builds platform-aware prompts, calls Lovable AI Gateway.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Platform = "instagram" | "tiktok" | "facebook" | "youtube" | "linkedin";
type Mode = "daily" | "weekly" | "channel-deepdive" | "ask";

const TABLES: Record<Platform, string> = {
  instagram: "instagram_posts",
  tiktok: "tiktok_posts",
  facebook: "facebook_posts",
  youtube: "youtube_posts",
  linkedin: "linkedin_posts",
};

const ALL: Platform[] = ["instagram", "tiktok", "facebook", "youtube"];

const fmt = (n: number) => n.toLocaleString("pt-BR");
const interactions = (p: any) => (p.like_count ?? 0) + (p.comments_count ?? 0) + (p.share_count ?? 0);

function inWindow(posts: any[], hoursAgo: number, hoursAgoEnd = 0) {
  const now = Date.now();
  const start = now - hoursAgo * 3600_000;
  const end = now - hoursAgoEnd * 3600_000;
  return posts.filter((p) => {
    if (!p.timestamp) return false;
    const t = new Date(p.timestamp).getTime();
    return t >= start && t <= end;
  });
}

function snapshot(platform: Platform, posts: any[], followers: number) {
  const today = inWindow(posts, 24);
  const week = inWindow(posts, 168);
  const prev = inWindow(posts, 336, 168);
  const sumI = (arr: any[]) => arr.reduce((s, p) => s + interactions(p), 0);
  const sumV = (arr: any[]) => arr.reduce((s, p) => s + (p.view_count ?? 0), 0);
  const er = (arr: any[]) =>
    followers && arr.length ? ((sumI(arr) / arr.length) / followers) * 100 : null;
  const top = [...week]
    .sort((a, b) => interactions(b) - interactions(a))
    .slice(0, 3)
    .map((p) => ({
      caption: (p.caption ?? "").slice(0, 140),
      likes: p.like_count ?? 0,
      comments: p.comments_count ?? 0,
      shares: p.share_count ?? 0,
      views: p.view_count ?? 0,
      url: p.post_url,
      type: p.media_type,
    }));
  const sent = week.filter((p) => p.ai_analysis?.sentiment);
  const sentMix = {
    positive: sent.filter((p) => p.ai_analysis.sentiment === "positive").length,
    neutral: sent.filter((p) => p.ai_analysis.sentiment === "neutral").length,
    negative: sent.filter((p) => p.ai_analysis.sentiment === "negative").length,
    sample: sent.length,
  };
  return {
    platform,
    followers,
    posts24h: today.length,
    posts7d: week.length,
    postsPrev7d: prev.length,
    interactions7d: sumI(week),
    views7d: sumV(week),
    er7d: er(week),
    erPrev: er(prev),
    er24h: er(today),
    avgLikes: week.length ? Math.round(sumI(week) / week.length) : 0,
    topPosts: top,
    sentMix,
  };
}

const PLATFORM_FOCUS: Record<Platform, string> = {
  instagram: "Reels têm 2-3x mais alcance que feed; saves+shares pesam mais que likes; horários 18h-20h costumam performar melhor.",
  tiktok: "Watch time e re-watch são os KPIs que mais pesam no algoritmo. CTR de capa, viralidade por share/save e som usado importam.",
  facebook: "Compartilhamentos e clicks externos pesam muito. Reels têm prioridade. Foco em CTR para vendas/eventos.",
  youtube: "CTR da thumbnail × Average View Duration = saúde do canal. Inscritos via vídeo e watch time são prioridade.",
  linkedin: "Comentários valem ~5x likes. Dwell time e clicks no perfil. Posts texto+carrossel performam melhor que link externo.",
};

function buildDailyPrompt(snaps: ReturnType<typeof snapshot>[]) {
  const blocks = snaps.map((s) => {
    const erDelta = s.er7d != null && s.er24h != null && s.er7d > 0
      ? ((s.er24h - s.er7d) / s.er7d) * 100
      : 0;
    return `### ${s.platform.toUpperCase()}
- Seguidores: ${fmt(s.followers)}
- Posts (24h): ${s.posts24h} | Posts (7d): ${s.posts7d}
- ER 24h: ${s.er24h?.toFixed(2) ?? "n/d"}% | ER média 7d: ${s.er7d?.toFixed(2) ?? "n/d"}% (${erDelta >= 0 ? "+" : ""}${erDelta.toFixed(1)}% vs média)
- Interações 7d: ${fmt(s.interactions7d)} | Views 7d: ${fmt(s.views7d)}
- Sentimento (amostra ${s.sentMix.sample}): 😊 ${s.sentMix.positive} · 😐 ${s.sentMix.neutral} · 😟 ${s.sentMix.negative}`;
  }).join("\n\n");

  return `Você é o analista de social intelligence da Hopi Hari (parque de diversões, BR). Gere um SNAPSHOT DIÁRIO conciso para a equipe de marketing.

DADOS DAS ÚLTIMAS 24 HORAS:
${blocks}

ESTRUTURA OBRIGATÓRIA (markdown):
## 📊 Snapshot Diário — ${new Date().toLocaleDateString("pt-BR")}
### 🎯 Destaques (máx 3 bullets)
- canal específico + número + interpretação
### 🚨 Alertas
- só se houver desvio relevante (>50% vs média 7d, sentimento negativo, ausência de posts). Se nada, escreva "Nada crítico hoje."
### 💡 Ações para Hoje (máx 3)
- ações concretas e priorizadas, com canal específico

Seja direto, use números, máx 250 palavras totais.`;
}

function buildWeeklyPrompt(snaps: ReturnType<typeof snapshot>[]) {
  const blocks = snaps.map((s) => {
    const erDelta = s.er7d != null && s.erPrev != null && s.erPrev > 0
      ? ((s.er7d - s.erPrev) / s.erPrev) * 100
      : 0;
    const cadenceDelta = s.postsPrev7d > 0
      ? ((s.posts7d - s.postsPrev7d) / s.postsPrev7d) * 100
      : 0;
    return `### ${s.platform.toUpperCase()}
- Seguidores: ${fmt(s.followers)}
- Posts: ${s.posts7d} (${cadenceDelta >= 0 ? "+" : ""}${cadenceDelta.toFixed(0)}% WoW)
- ER médio: ${s.er7d?.toFixed(2) ?? "n/d"}% (${erDelta >= 0 ? "+" : ""}${erDelta.toFixed(1)}% WoW)
- Interações: ${fmt(s.interactions7d)} | Views: ${fmt(s.views7d)}
- Sentimento: ${s.sentMix.positive}+ / ${s.sentMix.neutral}= / ${s.sentMix.negative}-
- Top post: "${s.topPosts[0]?.caption ?? "—"}" (${fmt(s.topPosts[0]?.likes ?? 0)} likes)`;
  }).join("\n\n");

  return `Você é o analista de social intelligence da Hopi Hari. Gere o RELATÓRIO SEMANAL consolidado (Sun-Sat) com comparação WoW e recomendações estratégicas.

DADOS DA SEMANA POR CANAL:
${blocks}

ESTRUTURA OBRIGATÓRIA (markdown):
## 📈 Relatório Semanal — semana até ${new Date().toLocaleDateString("pt-BR")}
### 1. Resumo Executivo (3-4 linhas)
Tom narrativo. Qual canal puxou? Qual ficou para trás?
### 2. Performance por Canal
Tabela markdown com Canal | Posts | ER | Δ WoW | Status (🟢🟡🔴 vs benchmarks setor: IG ≥1.5%, TikTok ≥5%, FB ≥0.5%, YT ≥4%)
### 3. Conteúdo Vencedor
Identifique padrões nos top posts (formato, horário, tema, CTA).
### 4. Sentimento & Brand Health
Distribuição agregada + temas recorrentes (positivos/negativos) se identificáveis.
### 5. 🎯 5 Recomendações para a Próxima Semana
Numere de 1-5. Cada uma: **Canal** + ação específica + impacto esperado. Seja acionável.

REGRAS DE FORMATAÇÃO (obrigatórias):
- Markdown válido: cada título, item de lista e linha de tabela em sua PRÓPRIA linha.
- Linha em branco antes e depois de cada tabela e de cada lista.
- Tabelas no formato padrão: linha de cabeçalho, depois a linha de separadores (| --- | --- |), depois uma linha por canal.
- Nunca junte a tabela inteira num parágrafo só. Sem HTML.
- Frases curtas, sem blocos densos de texto.

Use números reais dos dados. Máx 600 palavras.`;
}

const COMPETITORS: Record<Platform, string> = {
  instagram: "Beto Carrero World (@betocarrerooficial), Hopi Hari histórico, Playcenter, Parque da Mônica, Universal/Disney BR. Compare cadência, formatos (Reels vs feed), tom e tipos de engajamento.",
  tiktok: "Beto Carrero, parques internacionais (Universal, Disney), criadores de adrenalina BR. Compare hooks, sons usados e watch time aparente.",
  facebook: "Beto Carrero, Parque da Mônica, eventos sazonais regionais. Compare shares e CTR para vendas.",
  youtube: "Beto Carrero, canais de vlog de parques, reviews de atrações. Compare thumbnails, retenção e tipo de conteúdo (vlog vs institucional).",
  linkedin: "Grupos de turismo/lazer, RH de grandes operadoras de parques, employer branding de Beto Carrero/Disney. Compare formato (carrossel/texto) e dwell.",
};

function buildDeepdivePrompt(s: ReturnType<typeof snapshot>) {
  const top = s.topPosts.map((p, i) =>
    `${i + 1}. "${p.caption}" — ${fmt(p.likes)} likes, ${fmt(p.comments)} coment., ${fmt(p.shares)} shares, ${fmt(p.views)} views (${p.type ?? "—"})`
  ).join("\n");

  return `Você é especialista em ${s.platform.toUpperCase()} para a Hopi Hari (parque de diversões, BR).

ESCOPO ESTRITO: esta análise é APENAS sobre o ${s.platform.toUpperCase()} da Hopi Hari e seus concorrentes diretos nessa MESMA plataforma. NÃO mencione, NÃO compare e NÃO traga dados de outros canais (TikTok, Facebook, YouTube, LinkedIn, etc.) — apenas ${s.platform.toUpperCase()}.

CONTEXTO DO ALGORITMO ${s.platform.toUpperCase()}:
${PLATFORM_FOCUS[s.platform]}

CONCORRENTES DE REFERÊNCIA NO ${s.platform.toUpperCase()} (use seu conhecimento público para comparar qualitativamente — não invente métricas):
${COMPETITORS[s.platform]}

DADOS DA SEMANA (Hopi Hari · ${s.platform.toUpperCase()}):
- Seguidores: ${fmt(s.followers)}
- Posts: ${s.posts7d} (semana anterior: ${s.postsPrev7d})
- ER médio: ${s.er7d?.toFixed(2) ?? "n/d"}%
- Interações totais: ${fmt(s.interactions7d)} | Views: ${fmt(s.views7d)}
- Likes médios/post: ${fmt(s.avgLikes)}
- Sentimento: ${s.sentMix.positive} pos / ${s.sentMix.neutral} neu / ${s.sentMix.negative} neg

TOP 3 POSTS DA SEMANA:
${top || "Sem dados suficientes"}

GERE UMA ANÁLISE PROFUNDA (markdown):
## 🔍 Deep-dive ${s.platform.toUpperCase()} — Semana
### 1. Diagnóstico
Como o ${s.platform.toUpperCase()} da Hopi Hari está performando vs benchmark da plataforma e vs si mesmo? (3-4 linhas)
### 2. O que funcionou
Padrões nos top posts. Formato, tema, CTA, horário.
### 3. O que NÃO funcionou
Posts fracos ou tendências negativas no ${s.platform.toUpperCase()}.
### 4. Benchmark vs Concorrentes no ${s.platform.toUpperCase()}
Compare cadência, formatos e tom da Hopi Hari com os concorrentes listados acima. Aponte 2-3 lacunas/oportunidades claras.
### 5. Algoritmo: o que estamos otimizando bem ou mal
Use o contexto do algoritmo acima.
### 6. 🎯 3 Ideias de Conteúdo para a Próxima Semana
Específicas para Hopi Hari no ${s.platform.toUpperCase()} (atrações, sazonalidade, público família+jovens). Cada uma com: tipo, hook, CTA esperado.

Máx 600 palavras. Não cite outras redes sociais.`;
}

function monthBlocks(
  postsByPlatform: Record<string, any[]>,
  followersMap: Map<string, number>,
) {
  return Object.entries(postsByPlatform).map(([pf, posts]) => {
    const followers = followersMap.get(pf) ?? 0;
    const inter = posts.reduce((s, p) => s + interactions(p), 0);
    const views = posts.reduce((s, p) => s + (p.view_count ?? 0), 0);
    const er = followers && posts.length ? ((inter / posts.length) / followers) * 100 : null;
    const sent = posts.filter((p) => p.ai_analysis?.sentiment);
    return `### ${pf.toUpperCase()}
- Seguidores (atual): ${fmt(followers)}
- Posts no mês: ${posts.length}
- Interações no mês: ${fmt(inter)} | Views no mês: ${fmt(views)}
- Interações médias/post: ${fmt(posts.length ? Math.round(inter / posts.length) : 0)} | ER médio: ${er?.toFixed(2) ?? "n/d"}%
- Sentimento (amostra ${sent.length}): ${sent.filter((p) => p.ai_analysis.sentiment === "positive").length} pos / ${sent.filter((p) => p.ai_analysis.sentiment === "neutral").length} neu / ${sent.filter((p) => p.ai_analysis.sentiment === "negative").length} neg`;
  }).join("\n\n");
}

function buildAskContext(
  snaps: ReturnType<typeof snapshot>[],
  postsByPlatform: Record<string, any[]>,
  periodLabel?: string,
  monthSummary?: string,
) {
  const blocks = monthSummary ?? snaps.map((s) => `### ${s.platform.toUpperCase()}
- Seguidores: ${fmt(s.followers)}
- Posts 24h: ${s.posts24h} | 7d: ${s.posts7d} | 7d anterior: ${s.postsPrev7d}
- ER 7d: ${s.er7d?.toFixed(2) ?? "n/d"}% | ER 7d anterior: ${s.erPrev?.toFixed(2) ?? "n/d"}%
- Interações 7d: ${fmt(s.interactions7d)} | Views 7d: ${fmt(s.views7d)} | Likes médios/post: ${fmt(s.avgLikes)}
- Sentimento (amostra ${s.sentMix.sample}): ${s.sentMix.positive} pos / ${s.sentMix.neutral} neu / ${s.sentMix.negative} neg`).join("\n\n");

  const postLines = Object.entries(postsByPlatform).flatMap(([pf, posts]) =>
    [...posts]
      .sort((a, b) => interactions(b) - interactions(a))
      .slice(0, periodLabel ? 40 : 25)
      .map((p) =>
        `- [${pf}] ${p.timestamp ? new Date(p.timestamp).toLocaleDateString("pt-BR") : "s/ data"} · ${p.media_type ?? "—"} · ${fmt(p.like_count ?? 0)} likes, ${fmt(p.comments_count ?? 0)} coment., ${fmt(p.share_count ?? 0)} shares, ${fmt(p.view_count ?? 0)} views${p.ai_analysis?.sentiment ? ` · sentimento ${p.ai_analysis.sentiment}` : ""} · "${(p.caption ?? "").replace(/\s+/g, " ").slice(0, 160)}" ${p.post_url ?? ""}`
      )
  ).join("\n");

  return `CONTEXTO DE DADOS REAIS (${periodLabel ?? "últimos 14 dias"}, base Hopi Hari):

RESUMO POR CANAL:
${blocks}

POSTS (top por interações, por canal):
${postLines || "Sem posts no período."}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { mode, platform, question, month, history = [], model = "google/gemini-3-flash-preview" } = await req.json() as {
      mode: Mode;
      platform?: Platform;
      question?: string;
      /** "YYYY-MM" — restringe o contexto do modo ask a um mês específico */
      month?: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
      model?: string;
    };

    if (!mode || !["daily", "weekly", "channel-deepdive", "ask"].includes(mode)) {
      throw new Error("mode must be daily | weekly | channel-deepdive | ask");
    }
    if (mode === "ask" && !question?.trim()) {
      throw new Error("question required for ask mode");
    }
    if (mode === "channel-deepdive" && !platform) {
      throw new Error("platform required for channel-deepdive");
    }

    // If a platform is passed (e.g. Instagram page), scope ALL modes to that channel only.
    const targets: Platform[] = platform ? [platform] : ALL;

    // Followers map
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("platform,follower_count");
    const followersMap = new Map<string, number>(
      (settings ?? []).map((s: any) => [s.platform, s.follower_count ?? 0]),
    );

    // Janela de dados: mês específico (modo ask) ou últimos 14 dias
    const monthMatch = mode === "ask" && month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : null;
    const [my, mm] = monthMatch ? monthMatch.split("-").map(Number) : [0, 0];
    const since = monthMatch
      ? new Date(Date.UTC(my, mm - 1, 1)).toISOString()
      : new Date(Date.now() - 14 * 86400_000).toISOString();
    const until = monthMatch ? new Date(Date.UTC(my, mm, 1)).toISOString() : null;
    const periodLabel = monthMatch
      ? `mês de ${new Date(Date.UTC(my, mm - 1, 1)).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })}`
      : undefined;
    const snaps: ReturnType<typeof snapshot>[] = [];
    const postsByPlatform: Record<string, any[]> = {};
    for (const pf of targets) {
      let query = supabase
        .from(TABLES[pf])
        .select("post_url,caption,media_type,like_count,comments_count,share_count,view_count,timestamp,ai_analysis")
        .in("scrape_status", ["scraped", "success", "completed"])
        .gte("timestamp", since);
      if (until) query = query.lt("timestamp", until);
      const { data: posts, error } = await query
        .order("timestamp", { ascending: false })
        .limit(monthMatch ? 500 : 200);
      if (error) console.error(`load ${pf}:`, error.message);
      postsByPlatform[pf] = posts ?? [];
      snaps.push(snapshot(pf, posts ?? [], followersMap.get(pf) ?? 0));
    }

    let prompt: string;
    if (mode === "daily") prompt = buildDailyPrompt(snaps);
    else if (mode === "weekly") prompt = buildWeeklyPrompt(snaps);
    else if (mode === "ask") {
      prompt = `${buildAskContext(snaps, postsByPlatform, periodLabel, monthMatch ? monthBlocks(postsByPlatform, followersMap) : undefined)}

PERGUNTA DO USUÁRIO:
${question!.trim()}

${periodLabel ? `O usuário filtrou o período: ${periodLabel}. Todos os números acima são desse mês — responda apenas sobre ele.\n` : ""}Responda com base APENAS nos dados acima. Cite números e, quando útil, o post específico (data + trecho da legenda + link). Se o dado necessário não estiver no contexto, diga claramente o que falta. Markdown curto e direto (máx 350 palavras).`;
    } else prompt = buildDeepdivePrompt(snaps[0]);

    const chatHistory = mode === "ask"
      ? history.filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string").slice(-8)
      : [];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "Você é analista sênior de social intelligence da Hopi Hari. Sempre responda em PT-BR, com markdown, números reais e ações específicas. Nunca invente métricas que não estejam nos dados fornecidos." },
          ...chatHistory,
          { role: "user", content: prompt },
        ],
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ success: false, error: "Limite de requisições atingido. Tente em alguns minutos." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ success: false, error: "Créditos do AI Gateway esgotados. Adicione créditos em Settings." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`AI gateway ${aiRes.status}: ${t.slice(0, 200)}`);
    }

    const data = await aiRes.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({
      success: true,
      mode,
      platform: platform ?? null,
      analysis: content,
      snapshots: snaps,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("social-analyze error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
