// Sync the weekly/daily follower log spreadsheet into daily_metrics.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHEET_ID = "1vAZbigUr_iSzdWqhP79VnsEfwua6KPaIYud8hOfNecY";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

// Column order after the Data column
const PLATFORMS = ["instagram", "tiktok", "facebook", "youtube", "linkedin"];

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function parseDate(s: string): string | null {
  const m = (s || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function num(v: string): number | null {
  if (v == null) return null;
  const s = String(v).replace(/[^\d-]/g, "");
  if (!s || s === "-") return null;
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const res = await fetch(CSV_URL);
    if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
    const rows = parseCsv(await res.text());

    // find header row containing "Data"
    let headerIdx = rows.findIndex((r) => (r[0] || "").trim().toLowerCase() === "data");
    if (headerIdx < 0) headerIdx = 3;

    // date -> platform -> followers
    const series: Record<string, { date: string; followers: number }[]> = {};
    for (const p of PLATFORMS) series[p] = [];

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      const date = parseDate(r[0]);
      if (!date) continue;
      PLATFORMS.forEach((p, idx) => {
        const f = num(r[1 + idx]);
        if (f && f > 0) series[p].push({ date, followers: f });
      });
    }

    const records: any[] = [];
    for (const p of PLATFORMS) {
      const list = series[p];
      list.forEach((row, i) => {
        const prev = i > 0 ? list[i - 1].followers : null;
        records.push({
          platform: p,
          date: row.date,
          followers: row.followers,
          new_followers: prev == null ? 0 : row.followers - prev,
        });
      });
    }

    let upserted = 0;
    for (let i = 0; i < records.length; i += 500) {
      const chunk = records.slice(i, i + 500);
      const { error } = await supabase
        .from("daily_metrics")
        .upsert(chunk, { onConflict: "platform,date" });
      if (error) throw error;
      upserted += chunk.length;
    }

    return new Response(
      JSON.stringify({ success: true, upserted, platforms: PLATFORMS }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
