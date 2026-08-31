import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type ReactNode } from "react";
import { Botao, Campo } from "@/components/hp/chrome";
import { fnEntrarAdmin } from "@/lib/hopiplay.functions";

export const AREAS = {
  admin: "Painel de operação",
  config: "Configuração",
  simulador: "Simulador",
  visitante: "App do visitante",
} as const;

export type AreaId = keyof typeof AREAS;

export const EVENTO_ADMIN = "hp-admin-change";

const chave = (area: AreaId) => `hp_area_${area}`;

// Nome da sessão aberta numa área específica.
export function areaNome(area: AreaId): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(chave(area));
}

// Compatibilidade: qualquer área desbloqueada conta como sessão restrita ativa.
export function adminNome(): string | null {
  if (typeof window === "undefined") return null;
  for (const a of Object.keys(AREAS) as AreaId[]) {
    const n = areaNome(a);
    if (n) return n;
  }
  return null;
}

export function sairAdmin() {
  for (const a of Object.keys(AREAS) as AreaId[]) window.sessionStorage.removeItem(chave(a));
  window.dispatchEvent(new Event(EVENTO_ADMIN));
}

const ERROS: Record<string, string> = {
  PIN_INVALIDO: "PIN não reconhecido para esta área.",
  PIN_BLOQUEADO: "PIN bloqueado por tentativas erradas. Tenta mais tarde.",
  SEM_PERMISSAO: "Este PIN é de ponto de resgate. Usa o PIN desta área ou o de supervisão.",
  AREA_INVALIDA: "Área desconhecida.",
};

export function PortaoAdmin({ children, area }: { children: ReactNode; area: AreaId }) {
  const entrar = useServerFn(fnEntrarAdmin);
  const [pronto, setPronto] = useState(false);
  const [nome, setNome] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aVerificar, setAVerificar] = useState(false);

  useEffect(() => {
    setNome(areaNome(area));
    setPronto(true);
  }, [area]);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setAVerificar(true);
    setErro(null);
    try {
      const r = await entrar({ data: { pin, area } });
      if (r.ok) {
        window.sessionStorage.setItem(chave(area), r.nome);
        window.dispatchEvent(new Event(EVENTO_ADMIN));
        setNome(r.nome);
      } else {
        setErro(ERROS[r.erro] ?? "Não foi possível validar o PIN.");
      }
    } finally {
      setAVerificar(false);
    }
  }

  if (!pronto) return null;

  if (!nome) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-border bg-card p-6 shadow-bilhete">
        <p className="etiqueta text-primary/70">Área restrita · {AREAS[area]}</p>
        <h2 className="mt-2 text-2xl font-bold text-foreground">PIN desta área</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Cada área tem o seu PIN próprio. O PIN de supervisão abre todas as áreas; o PIN de ponto
          de resgate não abre nenhuma.
        </p>
        <form onSubmit={submeter} className="mt-5 space-y-4">
          <Campo
            rotulo={`PIN · ${AREAS[area]}`}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••••••"
          />
          {erro ? <p className="text-sm font-medium text-destructive">{erro}</p> : null}
          <Botao type="submit" className="w-full" disabled={aVerificar || !pin}>
            {aVerificar ? "A validar…" : "Desbloquear área"}
          </Botao>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
