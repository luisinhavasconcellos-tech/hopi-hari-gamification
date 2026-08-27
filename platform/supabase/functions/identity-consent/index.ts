import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

/**
 * Identidade pseudonimizada + registro de consentimento (LGPD).
 *
 * O CPF NUNCA é armazenado. Ele é transformado, no servidor, em um hash
 * irreversível (HMAC-SHA256 com salt secreto). Só o hash volta ao navegador
 * e só ele é usado como chave de junção entre cadastro e comportamento.
 */

const PURPOSES = ["analytics", "personalization", "marketing"] as const;

const BodySchema = z.object({
  cpf: z.string().min(11).max(20).optional(),
  pseudonym_id: z.string().length(64).optional(),
  granted: z.boolean(),
  purposes: z.array(z.enum(PURPOSES)).max(3).default([]),
  policy_version: z.string().min(1).max(32).default("v1"),
  source: z.string().min(1).max(32).default("web"),
  segments: z
    .object({
      age_group: z.string().max(32).optional(),
      cpf_region_label: z.string().max(64).optional(),
      cohort: z.string().max(64).optional(),
    })
    .optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
}

function validCpf(cpf: string) {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const d = (sum * 10) % 11;
    return d === 10 ? 0 : d;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

/** Região fiscal do CPF (9º dígito) — mesma tabela usada na base de clientes. */
const CPF_REGIONS: Record<string, string> = {
  "0": "Rio Grande do Sul",
  "1": "Centro-Oeste e Tocantins",
  "2": "Norte (AC, AM, AP, PA, RO, RR)",
  "3": "Ceará, Maranhão e Piauí",
  "4": "Nordeste (AL, PB, PE, RN)",
  "5": "Bahia e Sergipe",
  "6": "Minas Gerais",
  "7": "Rio de Janeiro e Espírito Santo",
  "8": "São Paulo",
  "9": "Paraná e Santa Catarina",
};

async function pseudonymize(cpf: string, salt: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(salt),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(cpf));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: parsed.error.flatten().fieldErrors }, 400);
    }
    const body = parsed.data;

    const salt = Deno.env.get("IDENTITY_HASH_SALT");
    if (!salt) return json({ error: "IDENTITY_HASH_SALT ausente" }, 500);

    let pseudonymId = body.pseudonym_id ?? null;
    // Região derivada no servidor a partir do CPF (nunca enviada pelo cliente).
    let regionFromCpf: string | null = null;

    if (!pseudonymId) {
      if (!body.cpf) return json({ error: "Informe cpf ou pseudonym_id" }, 400);
      const cpf = onlyDigits(body.cpf);
      if (!validCpf(cpf)) return json({ error: "CPF inválido" }, 400);
      regionFromCpf = CPF_REGIONS[cpf[8]] ?? null;
      pseudonymId = await pseudonymize(cpf, salt);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date().toISOString();
    const { error } = await admin.from("identity_consents").upsert(
      {
        pseudonym_id: pseudonymId,
        purposes: body.granted ? body.purposes : [],
        policy_version: body.policy_version,
        source: body.source,
        granted_at: body.granted ? now : null,
        revoked_at: body.granted ? null : now,
        updated_at: now,
      },
      { onConflict: "pseudonym_id" },
    );
    if (error) return json({ error: error.message }, 500);

    const segments = {
      age_group: body.segments?.age_group ?? null,
      cpf_region_label: regionFromCpf ?? body.segments?.cpf_region_label ?? null,
      cohort: body.segments?.cohort ?? null,
    };

    if (body.granted && (segments.age_group || segments.cpf_region_label || segments.cohort)) {
      await admin.from("identity_segments").upsert(
        { pseudonym_id: pseudonymId, ...segments, updated_at: now },
        { onConflict: "pseudonym_id" },
      );
    }


    // Consentimento revogado: apaga o histórico comportamental da pessoa.
    if (!body.granted) {
      await admin.from("behavior_events").delete().eq("pseudonym_id", pseudonymId);
      await admin.from("identity_segments").delete().eq("pseudonym_id", pseudonymId);
    }

    return json({
      pseudonym_id: pseudonymId,
      granted: body.granted,
      purposes: body.granted ? body.purposes : [],
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
});
