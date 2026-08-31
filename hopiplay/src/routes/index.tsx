import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Cabecalho } from "@/components/hp/chrome";
import {
  AREAS,
  EVENTO_ADMIN,
  adminNome,
  areaNome,
  type AreaId,
} from "@/components/hp/portao-admin";
import heroBgAsset from "@/assets/hopiplay-hero-pattern.png.asset.json";
import giftAsset from "@/assets/hopiplay-gift.png.asset.json";
import flagAsset from "@/assets/hopihari-flag.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HopiPlay · Plataforma de recompensas do parque" },
      {
        name: "description",
        content:
          "Emissão de códigos únicos, cifra diária, tetos de capacidade e validação por staff — a plataforma de recompensas HopiPlay.",
      },
      { property: "og:title", content: "HopiPlay · Plataforma de recompensas do parque" },
      {
        property: "og:description",
        content:
          "Emissão de códigos únicos, cifra diária, tetos de capacidade e validação por staff no parque.",
      },
    ],
  }),
  component: Hub,
});

const MODULOS = [
  {
    to: "/visitante" as const,
    numero: "01",
    nome: "App do visitante",
    desc: "Atinge um marco, revela o prémio e recebe o código do dia com validade até ao fecho.",
    area: "visitante",
  },
  {
    to: "/staff" as const,
    numero: "02",
    nome: "Consola de staff",
    desc: "Leitura do código, PIN do operador e resgate atómico — com recusas em linguagem de gente.",
    area: null,
  },
  {
    to: "/admin" as const,
    numero: "03",
    nome: "Painel de operação",
    desc: "Tetos, quotas por faixa horária, orçamento gasto, cifra do dia, regras e concessões manuais.",
    area: "admin",
  },
  {
    to: "/simulador" as const,
    numero: "04",
    nome: "Simulador",
    desc: "Projeta emissões e custo do dia mexendo em afluência, adesão, tetos e pesos de sorteio.",
    area: "simulador",
  },
];

function Hub() {
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
  const modulosVisiveis = MODULOS.filter((m) => !m.area || areas[m.area]);
  return (
    <div className="min-h-screen bg-background">
      <Cabecalho modulo="Hub" />

      <section className="surface-navy relative overflow-hidden border-b border-primary/40">
        <div
          aria-hidden
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage: `url(${heroBgAsset.url})`,
            backgroundRepeat: "repeat",
            backgroundSize: "760px auto",
            backgroundPosition: "center top",
            imageRendering: "auto",
          }}
        />

        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(115deg, oklch(0.32 0.06 225 / 88%) 0%, oklch(0.32 0.06 225 / 55%) 60%, oklch(0.32 0.06 225 / 80%) 100%)",
          }}
        />
        <div className="relative mx-auto max-w-[1400px] px-4 py-16 sm:py-24">
          <p className="etiqueta text-accent">Temporada H25 · Hopi Hari</p>
          <h1 className="mt-4 max-w-3xl text-4xl leading-[1.05] font-bold sm:text-6xl">
            Um prémio só existe quando o bilhete é picado.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-white/80">
            Plataforma de recompensas do parque: código único por Hariador, cifra diária que camufla
            a classe, tetos de capacidade e orçamento em tempo real, e um resgate que só acontece
            uma vez.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {areas["visitante"] ? (
              <Link
                to="/visitante"
                className="inline-flex items-center rounded-sm border border-white/30 px-5 py-3 font-display text-sm tracking-wide uppercase text-white transition-colors hover:bg-white/10"
              >
                Abrir app do visitante
              </Link>
            ) : null}
            <Link
              to="/staff"
              className="inline-flex items-center rounded-sm border border-white/30 px-5 py-3 font-display text-sm tracking-wide uppercase text-white transition-colors hover:bg-white/10"
            >
              Abrir consola de staff
            </Link>
            <img
              src={giftAsset.url}
              alt="Caixa de prémio Hopi Play"
              className="h-20 w-20 shrink-0 object-contain drop-shadow-lg sm:h-24 sm:w-24"
              loading="lazy"
            />
            {areas["admin"] ? (
              <Link
                to="/admin"
                className="inline-flex items-center rounded-sm border border-white/30 px-5 py-3 font-display text-sm tracking-wide uppercase text-white transition-colors hover:bg-white/10"
              >
                Ver operação ao vivo
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1400px] px-4 py-12">
        {/* Staff console card with the Hopi Hari flag right beside it */}
        {(() => {
          const staff = MODULOS.find((m) => m.to === "/staff");
          if (!staff) return null;
          return (
            <div className="mb-6 flex flex-col items-center gap-5 md:flex-row md:items-stretch">
              <Link
                to="/staff"
                className="group flex flex-1 flex-col rounded-lg border border-border bg-card p-6 shadow-bilhete transition-all hover:-translate-y-0.5 hover:border-accent"
              >
                <div className="flex items-baseline gap-3">
                  <span className="codigo-mono text-xs text-accent-foreground/60">
                    {staff.numero}
                  </span>
                  <h2 className="text-xl font-bold text-foreground">{staff.nome}</h2>
                </div>
                <div className="picotado my-4" />
                <p className="text-sm leading-relaxed text-muted-foreground">{staff.desc}</p>
                <span className="etiqueta mt-4 inline-block text-primary group-hover:underline">
                  Entrar →
                </span>
              </Link>
              <img
                src={flagAsset.url}
                alt="Bandeira Hopi Hari"
                className="h-44 w-auto shrink-0 self-center object-contain drop-shadow-lg sm:h-60"
                loading="lazy"
              />
            </div>
          );
        })()}

        {(() => {
          const outros = modulosVisiveis.filter((m) => m.to !== "/staff");
          if (outros.length === 0) return null;
          return (
            <div className="mb-6 grid gap-4 md:grid-cols-2">
              {outros.map((m) => (
                <Link
                  key={m.to}
                  to={m.to}
                  className="group rounded-lg border border-border bg-card p-6 shadow-bilhete transition-all hover:-translate-y-0.5 hover:border-accent"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="codigo-mono text-xs text-accent-foreground/60">
                      {m.numero}
                    </span>
                    <h2 className="text-xl font-bold text-foreground">{m.nome}</h2>
                  </div>
                  <div className="picotado my-4" />
                  <p className="text-sm leading-relaxed text-muted-foreground">{m.desc}</p>
                  <span className="etiqueta mt-4 inline-block text-primary group-hover:underline">
                    Entrar →
                  </span>
                </Link>
              ))}
            </div>
          );
        })()}

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            [
              "Código único",
              "Crockford Base32 sem I/L/O/U — série retirada de circulação após resgate.",
            ],
            [
              "Cifra do dia",
              "Letra-chave rotativa por classe, colada à série, sem separador visível.",
            ],
            [
              "Tetos vivos",
              "Quota por faixa horária, teto diário e teto de orçamento reservados atomicamente.",
            ],
          ].map(([t, d]) => (
            <div key={t} className="rounded-lg border border-border bg-secondary/60 p-5">
              <h3 className="font-display text-base text-foreground">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
