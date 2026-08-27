import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SOURCE_URLS = [
  "https://www.hopihari.com.br/",
  "https://www.hopihari.com.br/eventos",
  "https://www.hopihari.com.br/atracoes",
];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);

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
  if (!res.ok) throw new Error(`Firecrawl [${res.status}]: ${body.slice(0, 400)}`);
  const data = JSON.parse(body);
  return (data.markdown ?? data.data?.markdown ?? "") as string;
}

type ExtractedEvent = {
  title: string;
  description?: string | null;
  category?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  url?: string | null;
  image_url?: string | null;
  highlight?: boolean;
};

async function extractEvents(markdown: string): Promise<ExtractedEvent[]> {
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
            "Você extrai eventos, festivais e temporadas temáticas do parque Hopi Hari a partir do conteúdo do site oficial. " +
            `Hoje é ${today}. Datas no formato YYYY-MM-DD. Ignore itens que não sejam eventos (menus, políticas, ingressos genéricos, atrações permanentes). ` +
            "Se a data não estiver clara, deixe null. Responda apenas com a função.",
        },
        { role: "user", content: markdown.slice(0, 25000) },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "save_events",
            description: "Salva os eventos encontrados",
            parameters: {
              type: "object",
              properties: {
                events: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      category: {
                        type: "string",
                        description: "ex: Halloween, Férias, Show, Infantil, Temporada",
                      },
                      start_date: { type: "string" },
                      end_date: { type: "string" },
                      url: { type: "string" },
                      image_url: { type: "string" },
                      highlight: { type: "boolean" },
                    },
                    required: ["title"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["events"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "save_events" } },
    }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`AI [${res.status}]: ${text.slice(0, 400)}`);
  const data = JSON.parse(text);
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return [];
  try {
    return (JSON.parse(args).events ?? []) as ExtractedEvent[];
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const urls: string[] = Array.isArray(body?.urls) && body.urls.length ? body.urls : SOURCE_URLS;
    const triggeredBy: string = typeof body?.triggered_by === "string" ? body.triggered_by : "manual";
    const withInsights = body?.insights !== false;

    const found: ExtractedEvent[] = [];
    const errors: string[] = [];

    for (const url of urls) {
      try {
        const markdown = await firecrawlScrape(url);
        if (!markdown) continue;
        const events = await extractEvents(markdown);
        events.forEach((e) => found.push({ ...e, url: e.url ?? url }));
      } catch (e) {
        errors.push(`${url}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const seen = new Set<string>();
    const rows = found
      .filter((e) => e.title?.trim())
      .map((e) => ({
        slug: slugify(e.title),
        title: e.title.trim(),
        description: e.description ?? null,
        category: e.category ?? null,
        start_date: /^\d{4}-\d{2}-\d{2}$/.test(String(e.start_date ?? "")) ? e.start_date : null,
        end_date: /^\d{4}-\d{2}-\d{2}$/.test(String(e.end_date ?? "")) ? e.end_date : null,
        url: e.url ?? null,
        image_url: e.image_url ?? null,
        highlight: e.highlight ?? false,
        source: "site",
        raw_data: e as unknown as Record<string, unknown>,
        last_seen_at: new Date().toISOString(),
      }))
      .filter((r) => r.slug && !seen.has(r.slug) && seen.add(r.slug));

    let saved = 0;
    let newEvents = 0;
    let updatedEvents = 0;
    let insightsGenerated = 0;
    const newSlugs: string[] = [];

    if (rows.length) {
      // eventos manuais nunca são sobrescritos
      const { data: existing } = await supabase
        .from("park_events")
        .select("slug, source, title, description, start_date, end_date, category");
      const bySlug = new Map(
        ((existing ?? []) as Array<Record<string, unknown>>).map((m) => [String(m.slug), m]),
      );
      const upsertable = rows.filter((r) => bySlug.get(r.slug)?.source !== "manual");

      for (const r of upsertable) {
        const prev = bySlug.get(r.slug);
        if (!prev) {
          newEvents++;
          newSlugs.push(r.slug);
        } else if (
          prev.title !== r.title ||
          prev.description !== r.description ||
          prev.start_date !== r.start_date ||
          prev.end_date !== r.end_date ||
          prev.category !== r.category
        ) {
          updatedEvents++;
          newSlugs.push(r.slug);
        }
      }

      if (upsertable.length) {
        const { error } = await supabase.from("park_events").upsert(upsertable, { onConflict: "slug" });
        if (error) throw new Error(error.message);
        saved = upsertable.length;
      }

      // limpa insights de eventos que mudaram para serem regerados
      if (updatedEvents && newSlugs.length) {
        await supabase
          .from("park_events")
          .update({ ai_insights: null, insights_generated_at: null })
          .in("slug", newSlugs);
      }
    }

    // gera insights para eventos ativos ainda sem análise
    if (withInsights) {
      try {
        const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-event-insights`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ limit: 10 }),
        });
        const out = await res.json().catch(() => ({}));
        insightsGenerated = Number(out?.generated ?? 0);
        if (Array.isArray(out?.errors)) errors.push(...out.errors);
      } catch (e) {
        errors.push(`insights: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const success = errors.length === 0;
    await supabase.from("park_event_sync_runs").insert({
      triggered_by: triggeredBy,
      scraped: rows.length,
      saved,
      new_events: newEvents,
      updated_events: updatedEvents,
      insights_generated: insightsGenerated,
      success,
      errors,
    });

    return json({
      success,
      scraped: rows.length,
      saved,
      new_events: newEvents,
      updated_events: updatedEvents,
      insights_generated: insightsGenerated,
      errors,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("sync-park-events:", message);
    return json({ success: false, error: message }, 500);
  }
});

