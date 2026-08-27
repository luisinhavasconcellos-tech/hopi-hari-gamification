// =====================================================================
// supabase/functions/gsc-sync/index.ts
// Puxa dados do Google Search Console e grava no Supabase.
//
// Deploy:  supabase functions deploy gsc-sync
// Testar:  curl -X POST https://<PROJECT>.supabase.co/functions/v1/gsc-sync \
//            -H "Authorization: Bearer <ANON_KEY>" \
//            -H "Content-Type: application/json" \
//            -d '{"days": 30}'
// =====================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---------------------------------------------------------------------
// Autenticação: service account → JWT assinado → access token
// ---------------------------------------------------------------------
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

function base64url(input: ArrayBuffer | string): string {
  const bytes =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : new Uint8Array(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\\n/g, "")
    .replace(/\s/g, "");
  const binary = atob(body);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}

async function getAccessToken(
  clientEmail: string,
  privateKeyPem: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: clientEmail,
    scope: SCOPE,
    aud: GOOGLE_TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(
    JSON.stringify(claim),
  )}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(privateKeyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );

  const assertion = `${unsigned}.${base64url(signature)}`;

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `Falha ao obter access token do Google: ${JSON.stringify(json)}`,
    );
  }
  return json.access_token as string;
}

// ---------------------------------------------------------------------
// Search Console API
// ---------------------------------------------------------------------
async function queryGSC(
  token: string,
  siteUrl: string,
  body: Record<string, unknown>,
) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl,
  )}/searchAnalytics/query`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Search Console respondeu ${res.status}: ${JSON.stringify(json)}`);
  }
  return (json.rows ?? []) as Array<{
    keys: string[];
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function chunkedUpsert(
  supabase: ReturnType<typeof createClient>,
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
) {
  const SIZE = 500;
  for (let i = 0; i < rows.length; i += SIZE) {
    const { error } = await supabase
      .from(table)
      .upsert(rows.slice(i, i + SIZE), { onConflict });
    if (error) throw new Error(`Upsert em ${table} falhou: ${error.message}`);
  }
}

// ---------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let siteUrl = Deno.env.get("GSC_SITE_URL") ?? "";
  let logId: number | null = null;

  try {
    const clientEmail = Deno.env.get("GSC_CLIENT_EMAIL");
    const privateKey = Deno.env.get("GSC_PRIVATE_KEY");
    if (!clientEmail || !privateKey) {
      throw new Error("Faltam secrets: GSC_CLIENT_EMAIL ou GSC_PRIVATE_KEY.");
    }

    // Termos de marca — tudo que contiver um destes conta como intenção de marca
    const brandTerms = (Deno.env.get("GSC_BRAND_TERMS") ?? "hopi,hopihari,hopy")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const payload = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const days = Math.min(Number(payload.days ?? 30), 480);

    // Modo diagnóstico: lista as propriedades visíveis para a service account
    if (payload.list_sites) {
      const tokenForList = await getAccessToken(clientEmail, privateKey);
      const res = await fetch("https://searchconsole.googleapis.com/webmasters/v3/sites", {
        headers: { Authorization: `Bearer ${tokenForList}` },
      });
      const body = await res.json();
      return new Response(JSON.stringify({ ok: res.ok, status: res.status, sites: body }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Resolve a propriedade verificada de fato acessível pela service account.
    {
      const tokenForList = await getAccessToken(clientEmail, privateKey);
      const res = await fetch("https://searchconsole.googleapis.com/webmasters/v3/sites", {
        headers: { Authorization: `Bearer ${tokenForList}` },
      });
      const body = await res.json();
      const entries: Array<{ siteUrl: string; permissionLevel?: string }> =
        (body?.siteEntry ?? []).filter(
          (e: { permissionLevel?: string }) => e.permissionLevel !== "siteUnverifiedUser",
        );
      if (!entries.length) {
        throw new Error(
          "A service account não tem nenhuma propriedade no Search Console. Adicione-a como usuário na propriedade.",
        );
      }
      if (!siteUrl || !entries.some((e) => e.siteUrl === siteUrl)) {
        siteUrl = entries[0].siteUrl;
      }
    }

    // O Search Console tem ~2 dias de atraso. Nunca pedir "hoje".
    const end = new Date();
    end.setUTCDate(end.getUTCDate() - 2);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - days + 1);
    const startDate = isoDate(start);
    const endDate = isoDate(end);

    const { data: logRow } = await supabase
      .from("gsc_sync_log")
      .insert({ site_url: siteUrl, days_range: `${startDate} → ${endDate}` })
      .select("id")
      .single();
    logId = logRow?.id ?? null;

    const token = await getAccessToken(clientEmail, privateKey);

    // --- 1. Totais por dia -------------------------------------------
    const totalRows = await queryGSC(token, siteUrl, {
      startDate,
      endDate,
      dimensions: ["date"],
      type: "web",
      rowLimit: 1000,
    });

    const totals = totalRows.map((r) => ({
      site_url: siteUrl,
      date: r.keys[0],
      clicks: Math.round(r.clicks),
      impressions: Math.round(r.impressions),
      ctr: Number(r.ctr.toFixed(4)),
      position: Number(r.position.toFixed(2)),
      fetched_at: new Date().toISOString(),
    }));

    await chunkedUpsert(supabase, "gsc_daily_totals", totals, "site_url,date");

    // --- 2. Queries por dia (paginado) -------------------------------
    const queries: Record<string, unknown>[] = [];
    let startRow = 0;
    const PAGE = 25000;

    while (true) {
      const rows = await queryGSC(token, siteUrl, {
        startDate,
        endDate,
        dimensions: ["date", "query"],
        type: "web",
        rowLimit: PAGE,
        startRow,
      });

      for (const r of rows) {
        const q = r.keys[1];
        const lower = q.toLowerCase();
        queries.push({
          site_url: siteUrl,
          date: r.keys[0],
          query: q,
          clicks: Math.round(r.clicks),
          impressions: Math.round(r.impressions),
          ctr: Number(r.ctr.toFixed(4)),
          position: Number(r.position.toFixed(2)),
          is_brand: brandTerms.some((t) => lower.includes(t)),
          fetched_at: new Date().toISOString(),
        });
      }

      if (rows.length < PAGE) break;
      startRow += PAGE;
      if (startRow >= 100000) break; // trava de segurança
    }

    await chunkedUpsert(
      supabase,
      "gsc_daily_queries",
      queries,
      "site_url,date,query",
    );

    if (logId) {
      await supabase
        .from("gsc_sync_log")
        .update({
          status: "success",
          finished_at: new Date().toISOString(),
          rows_totals: totals.length,
          rows_queries: queries.length,
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        site_url: siteUrl,
        range: { startDate, endDate },
        rows_totals: totals.length,
        rows_queries: queries.length,
      }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (logId) {
      await supabase
        .from("gsc_sync_log")
        .update({
          status: "error",
          finished_at: new Date().toISOString(),
          error_message: message,
        })
        .eq("id", logId);
    }

    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
