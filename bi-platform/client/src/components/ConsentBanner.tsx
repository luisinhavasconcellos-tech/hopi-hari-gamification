import { useEffect, useState } from "react";
import { Cookie, ShieldCheck, X } from "lucide-react";
import {
  POLICY_VERSION,
  readConsent,
  saveConsent,
  type ConsentPurpose,
} from "@/lib/consent";

const PURPOSE_LABELS: { key: ConsentPurpose; label: string; desc: string }[] = [
  {
    key: "analytics",
    label: "Análise de uso",
    desc: "Medir páginas e interações para melhorar a experiência.",
  },
  {
    key: "personalization",
    label: "Personalização",
    desc: "Adaptar ofertas e conteúdo ao seu perfil.",
  },
  {
    key: "marketing",
    label: "Marketing",
    desc: "Mensurar campanhas e audiências publicitárias.",
  },
];

/**
 * Banner de consentimento (LGPD). Nada é coletado antes do opt-in.
 * O CPF é opcional e só serve para gerar, no servidor, um identificador
 * pseudonimizado — ele não fica no navegador.
 */
export default function ConsentBanner() {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(false);
  const [cpf, setCpf] = useState("");
  const [purposes, setPurposes] = useState<ConsentPurpose[]>(["analytics"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOpen(readConsent() === null);
  }, []);

  if (!open) return null;

  const toggle = (p: ConsentPurpose) =>
    setPurposes((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const decide = async (granted: boolean, chosen: ConsentPurpose[]) => {
    setBusy(true);
    setError(null);
    try {
      await saveConsent({
        granted,
        purposes: chosen,
        cpf: granted && cpf.replace(/\D/g, "").length === 11 ? cpf : undefined,
      });
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível registrar sua escolha.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-5">
      <div className="mx-auto max-w-3xl rounded-2xl glass border border-border p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/15 border border-primary/30 p-2">
            <Cookie className="size-4 text-primary" />
          </div>
          <div className="flex-1">
            <div className="font-display font-semibold">Privacidade e cookies</div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Usamos cookies para entender o uso do site. Se você autorizar e informar seu CPF,
              ele é convertido no servidor em um código irreversível — o CPF não é armazenado
              nem enviado a terceiros, e você pode revogar a qualquer momento.
            </p>
          </div>
          <button
            onClick={() => decide(false, [])}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Recusar e fechar"
          >
            <X className="size-4" />
          </button>
        </div>

        {detail && (
          <div className="mt-4 space-y-3">
            {PURPOSE_LABELS.map((p) => (
              <label
                key={p.key}
                className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={purposes.includes(p.key)}
                  onChange={() => toggle(p.key)}
                  className="mt-0.5 accent-[hsl(var(--primary))]"
                />
                <span>
                  <span className="block text-sm">{p.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{p.desc}</span>
                </span>
              </label>
            ))}

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                CPF (opcional — unifica seu cadastro com sua navegação)
              </label>
              <input
                value={cpf}
                onChange={(e) => setCpf(e.target.value.slice(0, 14))}
                inputMode="numeric"
                placeholder="000.000.000-00"
                autoComplete="off"
                className="w-full rounded-lg bg-muted/50 border border-border px-3 py-2 text-sm outline-none focus:border-primary/50"
              />
            </div>
          </div>
        )}

        {error && <div className="mt-3 text-xs text-destructive">{error}</div>}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            disabled={busy}
            onClick={() => decide(true, detail ? purposes : ["analytics"])}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {detail ? "Salvar escolhas" : "Aceitar análise de uso"}
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false, [])}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            Recusar
          </button>
          {!detail && (
            <button
              onClick={() => setDetail(true)}
              className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              Personalizar
            </button>
          )}
          <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3.5 text-success" />
            LGPD · política {POLICY_VERSION}
          </span>
        </div>
      </div>
    </div>
  );
}
