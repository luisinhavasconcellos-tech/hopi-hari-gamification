import { supabase } from "@/integrations/supabase/client";

/**
 * Camada de identidade pseudonimizada no cliente.
 *
 * Regras:
 * - o CPF nunca é gravado em cookie/localStorage nem enviado a terceiros;
 * - o navegador guarda apenas o pseudônimo (hash irreversível) devolvido pelo servidor;
 * - nada é coletado antes do opt-in explícito.
 */

export const CONSENT_STORAGE_KEY = "hopi_consent_v1";
export const SESSION_STORAGE_KEY = "hopi_session_id";
export const POLICY_VERSION = "v1";

export type ConsentPurpose = "analytics" | "personalization" | "marketing";

export type ConsentState = {
  granted: boolean;
  purposes: ConsentPurpose[];
  pseudonymId: string | null;
  decidedAt: string;
  policyVersion: string;
};

const PURPOSES: readonly ConsentPurpose[] = ["analytics", "personalization", "marketing"];

/** Valida o formato gravado — registro adulterado/legado vira "sem consentimento". */
function isConsentState(value: unknown): value is ConsentState {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.granted === "boolean" &&
    Array.isArray(v.purposes) &&
    v.purposes.every((p) => typeof p === "string" && (PURPOSES as readonly string[]).includes(p)) &&
    (v.pseudonymId === null || typeof v.pseudonymId === "string") &&
    typeof v.decidedAt === "string" &&
    typeof v.policyVersion === "string"
  );
}

export function readConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isConsentState(parsed)) return null;
    if (parsed.policyVersion !== POLICY_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeConsent(state: ConsentState) {
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("hopi-consent-change"));
}

export function clearConsent() {
  localStorage.removeItem(CONSENT_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("hopi-consent-change"));
}

export function getSessionId() {
  let id = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_STORAGE_KEY, id);
  }
  return id;
}

/**
 * Registra a decisão de consentimento. O CPF (opcional) é enviado uma única vez
 * ao servidor, que devolve apenas o pseudônimo — o CPF não é persistido.
 */
export async function saveConsent(opts: {
  granted: boolean;
  purposes: ConsentPurpose[];
  cpf?: string;
  segments?: { age_group?: string; cpf_region_label?: string; cohort?: string };
}): Promise<ConsentState> {
  const existing = readConsent();
  // Sem opt-in o CPF não sai do navegador — nem para gerar pseudônimo.
  const cpf = opts.granted ? opts.cpf : undefined;
  const payload = {
    granted: opts.granted,
    purposes: opts.granted ? opts.purposes : [],
    policy_version: POLICY_VERSION,
    source: "web",
    ...(cpf ? { cpf } : {}),
    ...(!cpf && existing?.pseudonymId ? { pseudonym_id: existing.pseudonymId } : {}),
    ...(opts.segments ? { segments: opts.segments } : {}),
  };

  let pseudonymId = existing?.pseudonymId ?? null;

  if (cpf || existing?.pseudonymId) {
    const { data, error } = await supabase.functions.invoke("identity-consent", {
      body: payload,
    });
    if (error) throw error;
    if (data?.error) throw new Error(String(data.error));
    pseudonymId = data?.pseudonym_id ?? pseudonymId;
  }

  const state: ConsentState = {
    granted: opts.granted,
    purposes: opts.granted ? opts.purposes : [],
    pseudonymId: opts.granted ? pseudonymId : null,
    decidedAt: new Date().toISOString(),
    policyVersion: POLICY_VERSION,
  };
  writeConsent(state);
  return state;
}

/** Revoga o consentimento e apaga o histórico comportamental no servidor. */
export async function revokeConsent() {
  const existing = readConsent();
  if (existing?.pseudonymId) {
    await supabase.functions.invoke("identity-consent", {
      body: {
        pseudonym_id: existing.pseudonymId,
        granted: false,
        purposes: [],
        policy_version: POLICY_VERSION,
      },
    });
  }
  clearConsent();
}

/** Envia um evento — silenciosamente ignorado sem consentimento de analytics. */
export async function track(
  eventName: string,
  props?: Record<string, string | number | boolean>,
) {
  const consent = readConsent();
  if (!consent?.granted || !consent.purposes.includes("analytics") || !consent.pseudonymId) {
    return;
  }
  try {
    const params = new URLSearchParams(window.location.search);
    await supabase.functions.invoke("track-behavior", {
      body: {
        pseudonym_id: consent.pseudonymId,
        session_id: getSessionId(),
        event_name: eventName.slice(0, 64),
        page_path: window.location.pathname.slice(0, 255),
        utm_source: params.get("utm_source")?.slice(0, 64) ?? undefined,
        utm_medium: params.get("utm_medium")?.slice(0, 64) ?? undefined,
        referrer: document.referrer ? document.referrer.slice(0, 255) : undefined,
        props: props ?? {},
      },
    });

  } catch {
    /* telemetria nunca quebra a navegação */
  }
}
