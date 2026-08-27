import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type Source = "reclame_aqui" | "tripadvisor";

const DEFAULT_URLS: Record<Source, string[]> = {
  reclame_aqui: [
    "https://www.reclameaqui.com.br/empresa/hopi-hari/",
    "https://www.reclameaqui.com.br/empresa/hopi-hari/lista-reclamacoes/",
  ],
  tripadvisor: [
    "https://www.tripadvisor.com/Attraction_Review-g675028-d735594-Reviews-Hopi_Hari-Vinhedo_State_of_Sao_Paulo.html",
  ],
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function firecrawlScrape(url: string) {
  const key = Deno.env.get("FIRECRAWL_API_KEY");
  if (!key) throw new Error("FIRECRAWL_API_KEY não configurada");

  const isGateway = key.startsWith("lovc_");
  const endpoint = isGateway
    ? "https://connector-gateway.lovable.dev/firecrawl/v2/scrape"
    : "https://api.firecrawl.dev/v2/scrape";

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (isGateway) {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY não configurada");
    headers.Authorization = `Bearer ${lovableKey}`;
    headers["X-Connection-Api-Key"] = key;
  } else {
    headers.Authorization = `Bearer ${key}`;
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, waitFor: 3000 }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Firecrawl [${res.status}]: ${body.slice(0, 500)}`);
  const data = JSON.parse(body);
  return (data.markdown ?? data.data?.markdown ?? "") as string;
}

async function extractReviews(source: Source, markdown: string) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) throw new Error("LOVABLE_API_KEY não configurada");

  const label = source === "reclame_aqui" ? "ReclameAqui" : "TripAdvisor";
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            `Você extrai avaliações/reclamações do ${label} sobre o parque Hopi Hari a partir de conteúdo em markdown. ` +
            "Responda apenas via a ferramenta. Use datas ISO 8601 quando possível. Não invente dados.",
        },
        { role: "user", content: markdown.slice(0, 60000) },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "salvar_avaliacoes",
            description: "Salva as avaliações extraídas",
            parameters: {
              type: "object",
              properties: {
                reviews: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      external_id: { type: "string" },
                      title: { type: "string" },
                      body: { type: "string" },
                      author: { type: "string" },
                      url: { type: "string" },
                      rating: { type: "number" },
                      status: { type: "string" },
                      category: { type: "string" },
                      location: { type: "string" },
                      sentiment: { type: "string", enum: ["positivo", "neutro", "negativo"] },
                      sentiment_score: { type: "number" },
                      ai_summary: { type: "string" },
                      published_at: { type: "string" },
                      responded_at: { type: "string" },
                      resolved: { type: "boolean" },
                    },
                    required: ["external_id", "title", "sentiment"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["reviews"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "salvar_avaliacoes" } },
    }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`AI gateway [${res.status}]: ${text.slice(0, 500)}`);
  const data = JSON.parse(text);
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return [];
  const parsed = JSON.parse(args);
  return Array.isArray(parsed.reviews) ? parsed.reviews : [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return json({ error: "Backend não configurado" }, 500);

    const payload = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const sources: Source[] = Array.isArray(payload.sources) && payload.sources.length
      ? payload.sources.filter((s: string): s is Source => s === "reclame_aqui" || s === "tripadvisor")
      : ["reclame_aqui", "tripadvisor"];

    const supabase = createClient(supabaseUrl, serviceKey);
    const results: Record<string, unknown>[] = [];

    for (const source of sources) {
      const override = payload.urls?.[source];
      const urls: string[] = Array.isArray(override)
        ? override
        : override
          ? [override]
          : DEFAULT_URLS[source];
      const url = urls[0];
      try {
        const parts: string[] = [];
        for (const u of urls) {
          try {
            parts.push(await firecrawlScrape(u));
          } catch (e) {
            console.error(`[${source}] scrape falhou em ${u}`, e);
          }
        }
        const markdown = parts.join("\n\n---\n\n");
        if (!markdown.trim()) throw new Error("Nenhum conteúdo obtido nas URLs");
        console.log(`[${source}] markdown length`, markdown.length);
        const reviews = await extractReviews(source, markdown);
        console.log(`[${source}] reviews extraídas`, reviews.length);

        const rows = reviews.map((r: Record<string, unknown>) => {
          const published = r.published_at ? new Date(String(r.published_at)) : null;
          const responded = r.responded_at ? new Date(String(r.responded_at)) : null;
          const validPublished = published && !isNaN(published.getTime()) ? published : null;
          const validResponded = responded && !isNaN(responded.getTime()) ? responded : null;
          const hours =
            validPublished && validResponded
              ? Math.max(0, (validResponded.getTime() - validPublished.getTime()) / 36e5)
              : null;
          return {
            source,
            external_id: String(r.external_id),
            url: (r.url as string) ?? url,
            title: r.title ?? null,
            body: r.body ?? null,
            author: r.author ?? null,
            rating: r.rating ?? null,
            status: r.status ?? null,
            category: r.category ?? null,
            location: r.location ?? null,
            sentiment: r.sentiment ?? null,
            sentiment_score: r.sentiment_score ?? null,
            ai_summary: r.ai_summary ?? null,
            published_at: validPublished?.toISOString() ?? null,
            responded_at: validResponded?.toISOString() ?? null,
            response_time_hours: hours,
            resolved: Boolean(r.resolved),
            raw_data: r,
          };
        });

        if (rows.length) {
          const { error } = await supabase
            .from("reputation_reviews")
            .upsert(rows, { onConflict: "source,external_id" });
          if (error) throw new Error(error.message);
        }
        results.push({ source, url, scraped: rows.length });
      } catch (e) {
        console.error(`[${source}] falhou`, e);
        results.push({ source, url, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return json({ success: true, results });
  } catch (e) {
    console.error("sync-reputation error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
