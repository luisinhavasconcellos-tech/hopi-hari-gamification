import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Barra, Botao, Cartao, Pagina, Titulo, eur } from "@/components/hp/chrome";
import { fnSimular } from "@/lib/hopiplay.functions";
import { PortaoAdmin } from "@/components/hp/portao-admin";

export const Route = createFileRoute("/simulador")({
  head: () => ({
    meta: [
      { title: "Simulador de emissões · HopiPlay" },
      {
        name: "description",
        content:
          "Projeta emissões, cobertura de prémios e custo do dia mexendo na afluência, na adesão ao álbum e na taxa de conclusão.",
      },
      { property: "og:title", content: "Simulador de emissões · HopiPlay" },
      {
        property: "og:description",
        content: "Projeção de emissões e custo do dia por classe de recompensa.",
      },
    ],
  }),
  component: Simulador,
});

function Deslizante({
  rotulo,
  valor,
  min,
  max,
  passo,
  sufixo,
  onChange,
}: {
  rotulo: string;
  valor: number;
  min: number;
  max: number;
  passo: number;
  sufixo: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between">
        <span className="etiqueta text-muted-foreground">{rotulo}</span>
        <span className="codigo-mono text-sm text-foreground">
          {valor.toLocaleString("pt-BR")}
          {sufixo}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={passo}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
      />
    </label>
  );
}

function Simulador() {
  const simularFn = useServerFn(fnSimular);
  const [visitantes, setVisitantes] = useState(12000);
  const [adesao, setAdesao] = useState(35);
  const [conclusao, setConclusao] = useState(18);

  const sim = useMutation({
    mutationFn: () =>
      simularFn({
        data: {
          visitantes,
          taxa_adesao: adesao / 100,
          taxa_conclusao: conclusao / 100,
        },
      }),
  });
  const r = sim.data;

  return (
    <Pagina modulo="Simulador">
      <PortaoAdmin area="simulador">
        <Titulo
          sobre="Projeção do dia"
          nota="Corre a mesma pilha de atribuição do motor real, com tetos e orçamentos por classe, sem escrever nada na base."
        >
          Simulador de emissões
        </Titulo>

        <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
          <Cartao titulo="Parâmetros">
            <div className="space-y-6">
              <Deslizante
                rotulo="Visitantes no dia"
                valor={visitantes}
                min={1000}
                max={40000}
                passo={500}
                sufixo=""
                onChange={setVisitantes}
              />
              <Deslizante
                rotulo="Adesão ao jogo"
                valor={adesao}
                min={5}
                max={90}
                passo={1}
                sufixo="%"
                onChange={setAdesao}
              />
              <Deslizante
                rotulo="Concluem o álbum"
                valor={conclusao}
                min={1}
                max={80}
                passo={1}
                sufixo="%"
                onChange={setConclusao}
              />
              <Botao
                variante="ficha"
                className="w-full"
                disabled={sim.isPending}
                onClick={() => sim.mutate()}
              >
                {sim.isPending ? "A projetar…" : "Correr simulação"}
              </Botao>
            </div>
          </Cartao>

          <div className="space-y-6">
            {!r ? (
              <Cartao>
                <p className="text-sm text-muted-foreground">
                  Ajusta os parâmetros e corre a simulação para ver emissões, cobertura e custo por
                  classe.
                </p>
              </Cartao>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-4">
                  {[
                    ["Jogadores", r.jogadores.toLocaleString("pt-BR")],
                    ["Concluem álbum", r.completam_album.toLocaleString("pt-BR")],
                    ["Com prémio físico", `${r.pct_jogadores_com_premio}%`],
                    ["Custo do dia", eur(r.custo_total_dia)],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className="rounded-lg border border-border bg-card p-4 shadow-bilhete"
                    >
                      <p className="etiqueta text-muted-foreground">{k}</p>
                      <p className="mt-2 font-display text-2xl text-foreground">{v}</p>
                    </div>
                  ))}
                </div>

                <Cartao titulo="Por classe">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left">
                          {["Classe", "Emitidos", "Ocupação", "Custo", "Resultado"].map((h) => (
                            <th key={h} className="etiqueta px-2 py-2 text-muted-foreground">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {r.classes.map((c) => (
                          <tr key={c.classe} className="border-b border-border/60">
                            <td className="px-2 py-3">
                              <p className="font-medium text-foreground">{c.nome}</p>
                              <p className="text-xs text-muted-foreground">{c.classe}</p>
                            </td>
                            <td className="codigo-mono px-2 py-3">
                              {c.emitidos}
                              {c.teto ? ` / ${c.teto}` : " / ∞"}
                            </td>
                            <td className="w-40 px-2 py-3">
                              <Barra valor={c.emitidos} teto={c.teto ?? null} />
                            </td>
                            <td className="codigo-mono px-2 py-3">{eur(c.custo)}</td>
                            <td className="px-2 py-3">
                              <span
                                className={`etiqueta rounded-full border px-2 py-1 ${
                                  c.resultado === "Cabe"
                                    ? "border-success/40 bg-success/12 text-success"
                                    : "border-warning/50 bg-warning/20 text-warning-foreground"
                                }`}
                              >
                                {c.resultado}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    Sem prémio físico: {r.sem_premio_fisico.toLocaleString("pt-BR")} jogadores
                    recebem reconhecimento digital. Top-X sugerido para fura-fila:{" "}
                    {r.top_x_sugerido}.
                  </p>
                </Cartao>
              </>
            )}
          </div>
        </div>
      </PortaoAdmin>
    </Pagina>
  );
}
