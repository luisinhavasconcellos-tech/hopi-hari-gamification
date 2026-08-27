import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getXProvider } from "../_shared/providers/index.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });


const DEFAULT_TERMS: { term: string; brand: string }[] = [
  { term: "Hopi Hari", brand: "hopi_hari" },
  { term: "hopihari", brand: "hopi_hari" },
  { term: "Beto Carrero", brand: "beto_carrero" },
  { term: "Thermas dos Laranjais", brand: "thermas" },
  { term: "Wet'n Wild", brand: "wet_n_wild" },
];

type Mention = {
  tweet_id: string;
  url: string | null;
  author_handle: string | null;
  author_name: string | null;
  author_followers: number | null;
  text: string | null;
  lang: string | null;
  keyword: string;
  brand: string;
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  views: number;
  published_at: string | null;
};

const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? Math.round(v) : 0);

async function runActor(token: string, input: Record<string, unknown>) {
  const url = `https://api.apify.com/v2/acts/apidojo~tweet-scraper/run-sync-get-dataset-items?token=${token}&timeout=120`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Apify [${res.status}]: ${body.slice(0, 300)}`);
  const items = JSON.parse(body) as Record<string, unknown>[];
  return items.filter((it) => !it.noResults);
}

async function scrapeTerm(token: string, term: string, brand: string, maxItems: number, days: number) {
  const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  const attempts: Record<string, unknown>[] = [
    { searchTerms: [term], maxItems, sort: "Latest", start: since },
    { searchTerms: [term], maxItems, sort: "Top" },
    { searchTerms: [`"${term}"`], maxItems, sort: "Latest" },
  ];

  let items: Record<string, unknown>[] = [];
  for (const input of attempts) {
    items = await runActor(token, input);
    console.log(`apify ${term} [${JSON.stringify(input).slice(0, 90)}]: ${items.length} items`);
    if (items.length) break;
  }
  if (items[0]) console.log(`apify sample ${term}:`, JSON.stringify(items[0]).slice(0, 500));


  const out: Mention[] = [];
  for (const it of items) {
    const author = (it.author ?? {}) as Record<string, unknown>;
    const id = String(it.id ?? it.id_str ?? it.tweetId ?? "");
    if (!id || id === "undefined") continue;
    const created = (it.createdAt ?? it.created_at) as string | undefined;
    const ts = created ? new Date(created) : null;
    out.push({
      tweet_id: id,
      url: (it.url ?? it.twitterUrl ?? null) as string | null,
      author_handle: (author.userName ?? author.screen_name ?? null) as string | null,
      author_name: (author.name ?? null) as string | null,
      author_followers: num(author.followers ?? author.followersCount),
      text: (it.text ?? it.fullText ?? null) as string | null,
      lang: (it.lang ?? null) as string | null,
      keyword: term,
      brand,
      likes: num(it.likeCount ?? it.favorite_count),
      retweets: num(it.retweetCount),
      replies: num(it.replyCount),
      quotes: num(it.quoteCount),
      views: num(it.viewCount),
      published_at: ts && !isNaN(ts.getTime()) ? ts.toISOString() : null,
    });
  }
  return out;
}

async function classify(mentions: Mention[]) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key || !mentions.length) return new Map<string, { sentiment: string; topic: string; ai_summary: string }>();

  const sample = mentions.slice(0, 60).map((m) => ({ id: m.tweet_id, text: (m.text ?? "").slice(0, 400) }));
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "Você analisa menções no X (Twitter) sobre parques de diversões brasileiros. Classifique cada post com sentimento (positivo, neutro, negativo), um tópico curto em português (ex.: filas, preço, atrações, atendimento, segurança, evento, humor/meme) e um resumo de no máximo 12 palavras.",
        },
        { role: "user", content: JSON.stringify(sample) },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "classify",
            parameters: {
              type: "object",
              properties: {
                results: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      sentiment: { type: "string", enum: ["positivo", "neutro", "negativo"] },
                      topic: { type: "string" },
                      summary: { type: "string" },
                    },
                    required: ["id", "sentiment", "topic", "summary"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["results"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "classify" } },
    }),
  });
  if (!res.ok) {
    console.error("AI classify failed", res.status, (await res.text()).slice(0, 300));
    return new Map<string, { sentiment: string; topic: string; ai_summary: string }>();
  }
  const data = await res.json();
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  const parsed = args ? JSON.parse(args) : { results: [] };
  const map = new Map<string, { sentiment: string; topic: string; ai_summary: string }>();
  for (const r of parsed.results ?? []) {
    map.set(String(r.id), { sentiment: r.sentiment, topic: r.topic, ai_summary: r.summary });
  }
  return map;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const provider = getXProvider();
    const token = Deno.env.get("APIFY_API_TOKEN") ?? Deno.env.get("APIFY_TOKEN");
    if (!provider && !token)
      return json(
        {
          success: false,
          error:
            "Nenhuma fonte configurada: defina TWITTERAPI_IO_KEY ou X_BEARER_TOKEN (X_PROVIDER) — ou APIFY_API_TOKEN.",
        },
        400,
      );

    let payload: Record<string, unknown> = {};
    try {
      payload = await req.json();
    } catch (_) {
      payload = {};
    }
    const maxItems = Math.min(Number(payload.maxItems ?? 40), 100);
    const days = Math.min(Number(payload.days ?? 14), 90);
    const terms =
      Array.isArray(payload.terms) && payload.terms.length
        ? (payload.terms as { term: string; brand?: string }[]).map((t) => ({
            term: String(t.term),
            brand: String(t.brand ?? "hopi_hari"),
          }))
        : DEFAULT_TERMS;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const fetchTerm = async (term: string, brand: string): Promise<Mention[]> => {
      if (provider) {
        try {
          const posts = await provider.search({ term, maxItems, days });
          if (posts.length || !token) {
            return posts.map((p) => ({
              tweet_id: p.tweet_id,
              url: p.url,
              author_handle: p.author.handle,
              author_name: p.author.name,
              author_followers: p.author.followers ?? 0,
              text: p.text,
              lang: p.lang,
              keyword: term,
              brand,
              likes: p.likes,
              retweets: p.retweets,
              replies: p.replies,
              quotes: p.quotes,
              views: p.views,
              published_at: p.published_at,
            }));
          }
        } catch (err) {
          console.error(`provider falhou para "${term}", usando Apify:`, String(err));
          if (!token) throw err;
        }
      }
      return scrapeTerm(token!, term, brand, maxItems, days);
    };

    const run = async () => {
      const all: Mention[] = [];
      const errors: string[] = [];
      const results = await Promise.allSettled(terms.map((t) => fetchTerm(t.term, t.brand)));
      results.forEach((r, i) => {
        if (r.status === "fulfilled") all.push(...r.value);
        else errors.push(`${terms[i].term}: ${String(r.reason)}`);
      });

      const unique = new Map<string, Mention>();
      for (const m of all) if (!unique.has(m.tweet_id)) unique.set(m.tweet_id, m);
      const mentions = [...unique.values()];

      const ai = await classify(mentions);
      const rows = mentions.map((m) => ({ ...m, ...(ai.get(m.tweet_id) ?? {}) }));

      let saved = 0;
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200);
        const { error } = await supabase.from("x_mentions").upsert(chunk, { onConflict: "tweet_id" });
        if (error) errors.push(error.message);
        else saved += chunk.length;
      }
      console.log(
        "x-listening done",
        JSON.stringify({ provider: provider?.id ?? "apify", scraped: mentions.length, saved, classified: ai.size, errors }),
      );
    };

    // @ts-ignore EdgeRuntime global
    EdgeRuntime.waitUntil(run());

    return json({ success: true, started: true, terms: terms.length, provider: provider?.id ?? "apify" });

  } catch (e) {
    return json({ success: false, error: (e as Error).message }, 500);
  }
});
