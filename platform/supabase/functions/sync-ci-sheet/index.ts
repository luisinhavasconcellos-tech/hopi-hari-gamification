// Importa a planilha "Hopi Hari - Tracker Semanal Seguidores Concorrentes" (aba COLETA)
// para ci_weekly_input. Layout: uma linha por parque+plataforma, uma coluna por semana.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHEET_ID = "1t5PGAizug8ovvBB-QO3ygxJujHfnbDh6Bl7xf-KQgCc";
const TAB = "COLETA";
const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

function slugify(name: string): string | null {
  const n = name.toLowerCase();
  if (n.includes("beto carrero")) return "beto-carrero";
  if (n.includes("beach park")) return "beach-park";
  if (n.includes("hopi")) return "hopi-hari";
  if (n.includes("thermas")) return "thermas-laranjais";
  if (n.includes("hot park")) return "hot-park";
  if (n.includes("wet")) return "wet-n-wild";
  if (n.includes("cacau")) return "cacau-park";
  return null;
}

function platformKey(label: string): string | null {
  const p = label.trim().toLowerCase();
  if (p.startsWith("insta")) return "instagram";
  if (p.startsWith("tik")) return "tiktok";
  if (p.startsWith("face")) return "facebook";
  if (p.startsWith("you")) return "youtube";
  if (p.startsWith("linked")) return "linkedin";
  return null;
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s === "-" || s === "—") return null;
  const n = Number(s.replace(/[^0-9.-]/g, "").replace(/(?<=\d)[.](?=\d{3}\b)/g, ""));
  return Number.isFinite(n) ? Math.round(n) : null;
}

function toDate(v: unknown): string | null {
  const s = String(v ?? "").trim();
  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return s;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_SHEETS_API_KEY = Deno.env.get("GOOGLE_SHEETS_API_KEY");
    if (!LOVABLE_API_KEY || !GOOGLE_SHEETS_API_KEY) {
      throw new Error("Conexão com Google Sheets não configurada");
    }

    const res = await fetch(`${GATEWAY}/spreadsheets/${SHEET_ID}/values/${TAB}!A4:AD80`, {
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_SHEETS_API_KEY,
      },
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Sheets ${res.status}: ${body}`);
      return new Response(
        JSON.stringify({ ok: false, error: `Google Sheets ${res.status}`, details: body.slice(0, 400) }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const json = (await res.json()) as { values?: string[][] };
    const rows = json.values ?? [];
    const header = rows[0] ?? [];
    // Colunas de semana começam na coluna D (índice 3)
    const weekCols: { idx: number; week: string }[] = [];
    for (let c = 3; c < header.length; c++) {
      const w = toDate(header[c]);
      if (w) weekCols.push({ idx: c, week: w });
    }

    // week|slug -> record
    const map = new Map<string, Record<string, unknown>>();
    let skipped = 0;

    for (const r of rows.slice(1)) {
      const name = String(r[0] ?? "").trim();
      const slug = name ? slugify(name) : null;
      const platform = platformKey(String(r[1] ?? ""));
      if (!slug || !platform) {
        skipped++;
        continue;
      }
      for (const { idx, week } of weekCols) {
        const value = num(r[idx]);
        if (value == null) continue;
        const key = `${week}|${slug}`;
        const rec = map.get(key) ?? { week, slug, name };
        rec[platform] = value;
        map.set(key, rec);
      }
    }

    const records = [...map.values()].map((rec) => {
      const total = ["instagram", "tiktok", "facebook", "youtube", "linkedin"]
        .reduce((a, k) => a + (Number(rec[k]) || 0), 0);
      return { ...rec, total_followers: total };
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (records.length) {
      const { error } = await supabase
        .from("ci_weekly_input")
        .upsert(records, { onConflict: "week,slug" });
      if (error) throw new Error(error.message);
    }

    const weeks = [...new Set(records.map((r) => r.week as string))].sort();
    return new Response(
      JSON.stringify({ ok: true, imported: records.length, skipped, weeks }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("sync-ci-sheet error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
