import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  AREAS,
  EVENTO_ADMIN,
  adminNome,
  areaNome,
  sairAdmin,
  type AreaId,
} from "@/components/hp/portao-admin";
import logoAsset from "@/assets/hopiplay-logo.png.asset.json";

export const PONTOS = [
  { id: "ATR", label: "Atração" },
  { id: "ATR_PAGA", label: "Atração paga" },
  { id: "FOTO", label: "Ponto de foto" },
  { id: "FNB", label: "Quiosque F&B" },
  { id: "LOJA", label: "Loja" },
  { id: "BALCAO_JOGOS", label: "Balcão dos jogos" },
  { id: "SUPERVISAO", label: "Supervisão" },
] as const;

const NAV = [
  { to: "/", label: "Hub", area: null },
  { to: "/staff", label: "Staff", area: null },
  { to: "/visitante", label: "Visitante", area: "visitante" },
  { to: "/admin", label: "Operação", area: "admin" },
  { to: "/simulador", label: "Simulador", area: "simulador" },
  { to: "/config", label: "Configuração", area: "config" },
] as const;

export function Cabecalho({ modulo }: { modulo: string }) {
  const [admin, setAdmin] = useState<string | null>(null);
  const [areas, setAreas] = useState<Record<string, string | null>>({});
  useEffect(() => {
    const atualizar = () => {
      setAdmin(adminNome());
      setAreas(Object.fromEntries((Object.keys(AREAS) as AreaId[]).map((a) => [a, areaNome(a)])));
    };
    atualizar();
    window.addEventListener(EVENTO_ADMIN, atualizar);
    return () => window.removeEventListener(EVENTO_ADMIN, atualizar);
  }, []);
  return (
    <header className="surface-navy sticky top-0 z-30 border-b border-primary/40">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src={logoAsset.url}
            alt="HopiPlay"
            className="size-8 rounded-sm object-cover"
            loading="eager"
          />
          <span className="font-display text-lg leading-none tracking-tight">HopiPlay</span>
        </Link>
        <span className="etiqueta rounded-full border border-current/30 px-2.5 py-1 opacity-80">
          {modulo}
        </span>
        <nav className="ml-auto flex flex-wrap items-center gap-1">
          {NAV.filter((n) => !n.area || areas[n.area]).map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="rounded-sm px-2.5 py-1.5 text-sm font-medium opacity-70 transition-colors hover:bg-white/10 hover:opacity-100"
              activeProps={{ className: "bg-white/15 opacity-100" }}
            >
              {n.label}
            </Link>
          ))}
          {admin ? (
            <button
              type="button"
              onClick={sairAdmin}
              title={`Sessão de supervisão: ${admin}`}
              className="ml-1 rounded-sm border border-white/25 px-2.5 py-1.5 text-sm font-medium opacity-80 transition-colors hover:bg-white/10 hover:opacity-100"
            >
              Sair ({admin})
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}

export function Pagina({ modulo, children }: { modulo: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Cabecalho modulo={modulo} />
      <main className="mx-auto max-w-[1400px] px-4 py-8">{children}</main>
    </div>
  );
}

export function Titulo({
  sobre,
  children,
  nota,
}: {
  sobre: string;
  children: ReactNode;
  nota?: string;
}) {
  return (
    <div className="mb-6">
      <p className="etiqueta text-primary/70">{sobre}</p>
      <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">{children}</h1>
      {nota ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{nota}</p> : null}
    </div>
  );
}

export function Cartao({
  titulo,
  acao,
  children,
  className = "",
}: {
  titulo?: string;
  acao?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-border bg-card shadow-bilhete ${className}`}>
      {titulo ? (
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <h2 className="etiqueta text-muted-foreground">{titulo}</h2>
          <div className="ml-auto">{acao}</div>
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Botao({
  variante = "primario",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "primario" | "ficha" | "linha" | "perigo";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2.5 font-display text-sm tracking-wide uppercase transition-all disabled:opacity-45 disabled:pointer-events-none active:translate-y-px";
  const v = {
    primario: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-bilhete",
    ficha: "surface-ficha hover:brightness-105 shadow-bilhete",
    linha: "border border-border bg-transparent text-foreground hover:bg-secondary",
    perigo: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  }[variante];
  return <button className={`${base} ${v} ${className}`} {...props} />;
}

export function Campo({
  rotulo,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { rotulo: string }) {
  return (
    <label className="block">
      <span className="etiqueta text-muted-foreground">{rotulo}</span>
      <input
        className={`mt-1.5 w-full rounded-sm border border-input bg-paper px-3 py-2.5 text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/30 ${className}`}
        {...props}
      />
    </label>
  );
}

export function Seletor({
  rotulo,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { rotulo: string }) {
  return (
    <label className="block">
      <span className="etiqueta text-muted-foreground">{rotulo}</span>
      <select
        className="mt-1.5 w-full rounded-sm border border-input bg-paper px-3 py-2.5 text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

const ESTADOS: Record<string, string> = {
  EMITIDO: "bg-accent/25 text-accent-foreground border-accent/50",
  RESGATADO: "bg-success/15 text-success border-success/40",
  EXPIRADO: "bg-muted text-muted-foreground border-border",
  ANULADO: "bg-destructive/12 text-destructive border-destructive/40",
  PENDENTE_SYNC: "bg-warning/20 text-warning-foreground border-warning/50",
};

export function Selo({ estado }: { estado: string }) {
  return (
    <span
      className={`etiqueta inline-block rounded-full border px-2 py-1 ${ESTADOS[estado] ?? ESTADOS["EXPIRADO"]}`}
    >
      {estado.replace("_", " ")}
    </span>
  );
}

export function Barra({ valor, teto }: { valor: number; teto: number | null }) {
  const pct = teto ? Math.min(100, Math.round((valor / teto) * 100)) : 0;
  const cor = pct >= 95 ? "bg-destructive" : pct >= 75 ? "bg-warning" : "bg-primary";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className={`h-full rounded-full transition-[width] ${cor}`}
        style={{ width: `${teto ? pct : 4}%` }}
      />
    </div>
  );
}

export function horaCurta(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function eur(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
