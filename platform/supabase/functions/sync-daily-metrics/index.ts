// Sync daily metrics from Google Sheets per-platform tabs into daily_metrics table.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHEET_ID = "1nRhIyjNC4Kg19LsJhU8TkB6UoF9MljVR8HUeL281xgI";
const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

// Per-platform tab name -> internal key. Data starts at row 5 (headers on row 4).
const PLATFORM_TABS: Record<string, string> = {
  Instagram: "instagram",
  TikTok: "tiktok",
  YouTube: "youtube",
  Facebook: "facebook",
  "Twitter-X": "twitter",
};

// Entrada Diária tab (consolidated input). Platform in col A, date col B.
const ENTRADA_TAB = "📋 Entrada Diária";
const ENTRADA_PLATFORM_MAP: Record<string, string> = {
  Instagram: "instagram",
  TikTok: "tiktok",
  YouTube: "youtube",
  Facebook: "facebook",
  "Twitter-X": "twitter",
  Twitter: "twitter",
  X: "twitter",
};

function parseDate(s: string): string | null {
  if (!s) return null;
  const t = s.trim();
  let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const dt = new Date(t);
  if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  return null;
}

// Parse numbers like "10,7k", "511k", "1.2M", "1,520,237", "8.196", "8,196"
function num(v: any): number {
  if (v == null || v === "") return 0;
  let s = String(v).trim().toLowerCase();
  if (!s) return 0;
  s = s.replace(/%/g, "").replace(/\s+/g, "");
  if (s.includes("/")) s = s.split("/")[0];
  let mult = 1;
  if (s.endsWith("k")) { mult = 1_000; s = s.slice(0, -1); }
  else if (s.endsWith("mm")) { mult = 1_000_000; s = s.slice(0, -2); }
  else if (s.endsWith("m")) { mult = 1_000_000; s = s.slice(0, -1); }
  else if (s.endsWith("mil")) { mult = 1_000; s = s.slice(0, -3); }
  if (mult > 1) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    if (s.includes(",") && s.includes(".")) {
      if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
        s = s.replace(/\./g, "").replace(",", ".");
      } else {
        s = s.replace(/,/g, "");
      }
    } else if (s.includes(",")) {
      const after = s.split(",")[1] ?? "";
      if (after.length === 3) s = s.replace(/,/g, "");
      else s = s.replace(",", ".");
    } else {
      if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, "");
    }
  }
  s = s.replace(/[^0-9.\-]/g, "");
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  return n * mult;
}

const truthy = (v: any): boolean => {
  if (!v) return false;
  const s = String(v).trim().toLowerCase();
  return ["sim", "yes", "true", "1", "✅", "x"].includes(s);
};

function mergeRecord(acc: any, rec: any) {
  for (const k of Object.keys(rec)) {
    const v = rec[k];
    if (v === null || v === undefined) continue;
    if (typeof v === "number" && v === 0 && acc[k]) continue;
    if (typeof v === "string" && v === "" && acc[k]) continue;
    acc[k] = v;
  }
  return acc;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_SHEETS_API_KEY = Deno.env.get("GOOGLE_SHEETS_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!GOOGLE_SHEETS_API_KEY) throw new Error("GOOGLE_SHEETS_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const headers = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GOOGLE_SHEETS_API_KEY,
    };

    const map = new Map<string, any>();

    // 1) Per-platform tabs (canonical historical series). Headers row 4, data row 5+.
    // Cols: A Data, B Dia, C Postou?, D Curtidas, E Comentários, F Compart., G Seguidores,
    //       H Novos Seg., I Alcance, J Views/dia, K Taxa Eng.%, L Impressões
    const ranges = Object.keys(PLATFORM_TABS)
      .map((t) => `ranges=${encodeURIComponent(`'${t}'!A5:L5000`)}`)
      .join("&");
    const batchUrl = `${GATEWAY}/spreadsheets/${SHEET_ID}/values:batchGet?${ranges}`;
    const br = await fetch(batchUrl, { headers });
    if (!br.ok) throw new Error(`Batch read failed: ${br.status} ${await br.text()}`);
    const bj = (await br.json()) as { valueRanges?: Array<{ range: string; values?: string[][] }> };

    const tabNames = Object.keys(PLATFORM_TABS);
    for (let i = 0; i < (bj.valueRanges ?? []).length; i++) {
      const tab = tabNames[i];
      const platform = PLATFORM_TABS[tab];
      const rows = bj.valueRanges?.[i]?.values ?? [];
      for (const row of rows) {
        // Prefer "Dia" (col B) as canonical date, fallback to "Data" (col A)
        const date = parseDate(row[1] ?? "") ?? parseDate(row[0] ?? "");
        if (!date) continue;
        const rec: any = {
          platform,
          date,
          posted: truthy(row[2]),
          likes: Math.round(num(row[3])),
          comments: Math.round(num(row[4])),
          shares: Math.round(num(row[5])),
          followers: Math.round(num(row[6])),
          new_followers: Math.round(num(row[7])),
          reach: Math.round(num(row[8])),
          views: Math.round(num(row[9])),
          engagement_rate: num(row[10]),
          impressions: Math.round(num(row[11])),
        };
        const hasAnyData =
          rec.posted || rec.likes || rec.comments || rec.shares ||
          rec.followers || rec.new_followers || rec.reach || rec.views ||
          rec.impressions || rec.engagement_rate;
        if (!hasAnyData) continue;
        const key = `${platform}|${date}`;
        map.set(key, mergeRecord(map.get(key) ?? {}, rec));
      }
    }

    // 2) Entrada Diária as additional source (overrides per-platform if more recent fields)
    try {
      const er = await fetch(
        `${GATEWAY}/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(`'${ENTRADA_TAB}'!A6:R5000`)}`,
        { headers }
      );
      if (er.ok) {
        const ej = (await er.json()) as { values?: string[][] };
        for (const row of ej.values ?? []) {
          const platformLabel = (row[0] ?? "").trim();
          const platform = ENTRADA_PLATFORM_MAP[platformLabel];
          if (!platform) continue;
          const date = parseDate(row[1] ?? "");
          if (!date) continue;
          const rec: any = {
            platform,
            date,
            posted: truthy(row[3]),
            likes: Math.round(num(row[4])),
            comments: Math.round(num(row[5])),
            shares: Math.round(num(row[6])),
            followers: Math.round(num(row[7])),
            new_followers: Math.round(num(row[8])),
            reach: Math.round(num(row[9])),
            views: Math.round(num(row[10])),
            engagement_rate: num(row[13]),
            impressions: Math.round(num(row[14])),
          };
          const hasAnyData =
            rec.posted || rec.likes || rec.comments || rec.shares ||
            rec.followers || rec.new_followers || rec.reach || rec.views ||
            rec.impressions || rec.engagement_rate;
          if (!hasAnyData) continue;
          const key = `${platform}|${date}`;
          map.set(key, mergeRecord(map.get(key) ?? {}, rec));
        }
      }
    } catch (e) {
      console.warn("Entrada Diária read skipped:", e);
    }

    const records = Array.from(map.values());
    const byPlatform: Record<string, { rows: number }> = {};
    for (const rec of records) {
      byPlatform[rec.platform] = byPlatform[rec.platform] ?? { rows: 0 };
      byPlatform[rec.platform].rows += 1;
    }

    if (records.length) {
      const { error } = await supabase
        .from("daily_metrics")
        .upsert(records, { onConflict: "platform,date" });
      if (error) throw new Error(error.message);
    }

    return new Response(
      JSON.stringify({ success: true, total: records.length, byPlatform }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("sync-daily-metrics error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
