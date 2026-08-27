import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

/**
 * Coleta de eventos comportamentais pseudonimizados.
 * Só grava se existir consentimento ativo com a finalidade "analytics".
 */

const BodySchema = z.object({
  pseudonym_id: z.string().length(64).optional(),
  session_id: z.string().min(6).max(64),
  event_name: z.string().min(1).max(64),
  page_path: z.string().max(255).optional(),
  utm_source: z.string().max(64).optional(),
  utm_medium: z.string().max(64).optional(),
  referrer: z.string().max(255).optional(),
  props: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

/** Classifica a origem da sessão em um canal comparável entre segmentos. */
function resolveChannel(input: {
  utm_source?: string;
  utm_medium?: string;
  referrer?: string;
}) {
  const src = (input.utm_source ?? "").toLowerCase();
  const med = (input.utm_medium ?? "").toLowerCase();
  const ref = (input.referrer ?? "").toLowerCase();

  if (med.includes("cpc") || med.includes("paid") || med.includes("ads")) return "midia paga";
  if (med.includes("email") || src.includes("newsletter") || src.includes("mail")) return "e-mail";
  const social = ["instagram", "facebook", "tiktok", "youtube", "linkedin", "whatsapp", "t.co", "twitter"];
  if (social.some((s) => src.includes(s) || ref.includes(s))) return "social";
  if (med.includes("social")) return "social";
  const search = ["google", "bing", "duckduckgo", "yahoo", "ecosia"];
  if (search.some((s) => src.includes(s) || ref.includes(s))) return med.includes("organic") || !med ? "busca" : "midia paga";
  if (src) return "referencia";
  if (ref) return "referencia";
  return "direto";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const body = parsed.data;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Sem identidade não há junção: evento anônimo de sessão não é gravado.
    if (!body.pseudonym_id) return json({ skipped: "sem identidade consentida" });

    const { data: consent } = await admin
      .from("identity_consents")
      .select("purposes, granted_at, revoked_at")
      .eq("pseudonym_id", body.pseudonym_id)
      .maybeSingle();

    const allowed =
      consent &&
      consent.granted_at &&
      !consent.revoked_at &&
      (consent.purposes ?? []).includes("analytics");

    if (!allowed) return json({ skipped: "sem consentimento ativo" });

    const { error } = await admin.from("behavior_events").insert({
      pseudonym_id: body.pseudonym_id,
      session_id: body.session_id,
      event_name: body.event_name,
      page_path: body.page_path ?? null,
      channel: resolveChannel(body),
      props: body.props ?? {},

    });
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
});
