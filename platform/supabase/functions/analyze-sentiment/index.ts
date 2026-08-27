// Sentiment analysis for posts across all platforms.
// Body: { platform: "instagram" | "tiktok" | "facebook" | "linkedin", postIds?: string[], onlyMissing?: boolean, limit?: number }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TABLES: Record<string, string> = {
  instagram: "instagram_posts",
  tiktok: "tiktok_posts",
  facebook: "facebook_posts",
  linkedin: "linkedin_posts",
  youtube: "youtube_posts",
};

interface SentimentResult {
  id: string;
  sentiment: "positive" | "neutral" | "negative";
  score: number; // -1..1
  topics: string[];
  summary: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { platform, postIds, onlyMissing = true, limit = 30 } = await req.json().catch(() => ({}));
    if (!platform || !TABLES[platform]) throw new Error("invalid platform");
    const table = TABLES[platform];

    let q = supabase.from(table).select("id,caption,raw_data,ai_analysis,scrape_status").eq("scrape_status", "scraped");
    if (postIds?.length) q = q.in("id", postIds);
    else if (onlyMissing) q = q.is("ai_analysis", null);
    const { data: posts, error } = await q.limit(limit);
    if (error) throw error;
    if (!posts?.length) {
      return new Response(JSON.stringify({ success: true, analyzed: 0, message: "Nothing to analyze" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build payload (caption + up to 10 comment texts when available in raw_data)
    const payload = posts.map((p: any) => {
      const raw = p.raw_data ?? {};
      const comments: string[] = [];
      const candidates = [raw.latestComments, raw.comments, raw.topComments].filter(Array.isArray);
      for (const arr of candidates) {
        for (const c of arr.slice(0, 10)) {
          const t = typeof c === "string" ? c : c?.text ?? c?.message ?? c?.commentText;
          if (t) comments.push(String(t).slice(0, 240));
        }
        if (comments.length) break;
      }
      return {
        id: p.id,
        caption: (p.caption ?? "").slice(0, 600),
        comments: comments.slice(0, 10),
      };
    });

    const tools = [{
      type: "function",
      function: {
        name: "report_sentiment",
        description: "Return sentiment analysis for each post.",
        parameters: {
          type: "object",
          properties: {
            results: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
                  score: { type: "number", description: "-1 (very negative) to 1 (very positive)" },
                  topics: { type: "array", items: { type: "string" } },
                  summary: { type: "string", description: "1-sentence summary in Portuguese" },
                },
                required: ["id", "sentiment", "score", "topics", "summary"],
                additionalProperties: false,
              },
            },
          },
          required: ["results"],
          additionalProperties: false,
        },
      },
    }];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You analyze social media posts (caption + comments) for the Hopi Hari theme park brand. " +
              "Classify the OVERALL sentiment of each post considering both caption tone and audience reactions. " +
              "Topics: 2-4 short Portuguese keywords (e.g. 'Halloween', 'fila', 'experiência'). " +
              "Summary: 1 short sentence in Portuguese explaining sentiment.",
          },
          {
            role: "user",
            content:
              `Plataforma: ${platform}\nAnalise os posts a seguir e retorne via tool call:\n\n` +
              JSON.stringify(payload),
          },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "report_sentiment" } },
      }),
    });

    if (res.status === 429 || res.status === 402) {
      const msg = res.status === 429 ? "Rate limit excedido" : "Créditos esgotados na Lovable AI";
      return new Response(JSON.stringify({ success: false, error: msg }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`AI gateway ${res.status}: ${t.slice(0, 300)}`);
    }

    const data = await res.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("No tool call returned");
    const parsed = JSON.parse(args) as { results: SentimentResult[] };

    let updated = 0;
    for (const r of parsed.results) {
      // Preserve existing ai_analysis fields if any
      const existing = posts.find((p: any) => p.id === r.id)?.ai_analysis ?? {};
      const merged = {
        ...existing,
        sentiment: r.sentiment,
        sentiment_score: r.score,
        topics: r.topics,
        summary: r.summary,
        analyzed_at: new Date().toISOString(),
      };
      const { error: uErr } = await supabase.from(table).update({ ai_analysis: merged }).eq("id", r.id);
      if (!uErr) updated++;
    }

    return new Response(
      JSON.stringify({ success: true, requested: posts.length, analyzed: parsed.results.length, updated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("analyze-sentiment error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
