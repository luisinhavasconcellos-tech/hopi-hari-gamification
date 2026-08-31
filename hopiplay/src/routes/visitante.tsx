import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Botao, Cartao, Pagina, Selo, Seletor, Titulo, horaCurta } from "@/components/hp/chrome";
import { AvisoJanelaUso } from "@/components/hp/aviso-janela";
import { fnAtingirMarco, fnCodigosJogador, fnJogadores } from "@/lib/hopiplay.functions";
import { PortaoAdmin } from "@/components/hp/portao-admin";

export const Route = createFileRoute("/visitante")({
  head: () => ({
    meta: [
      { title: "App do visitante · HopiPlay" },
      {
        name: "description",
        content:
          "Atinge um marco no álbum e revela o prémio: código único válido até ao fecho do parque, com o ponto de resgate indicado.",
      },
      { property: "og:title", content: "App do visitante · HopiPlay" },
      {
        property: "og:description",
        content: "Revela o prémio e recebe o código do dia, válido até ao fecho do parque.",
      },
    ],
  }),
  component: Visitante,
});

type Revelacao = Record<string, unknown> | null;

function Visitante() {
  const jogadoresFn = useServerFn(fnJogadores);
  const codigosFn = useServerFn(fnCodigosJogador);
  const marcoFn = useServerFn(fnAtingirMarco);
  const qc = useQueryClient();

  const [playerId, setPlayerId] = useState("");
  const [revelacao, setRevelacao] = useState<Revelacao>(null);

  const jogadores = useQuery({ queryKey: ["jogadores"], queryFn: () => jogadoresFn() });
  const atual = playerId || jogadores.data?.[0]?.id || "";

  const codigos = useQuery({
    queryKey: ["codigos", atual],
    queryFn: () => codigosFn({ data: { playerId: atual } }),
    enabled: !!atual,
  });

  const marco = useMutation({
    mutationFn: () => marcoFn({ data: { playerId: atual } }),
    onSuccess: (r) => {
      setRevelacao(r as Revelacao);
      qc.invalidateQueries({ queryKey: ["codigos", atual] });
      qc.invalidateQueries({ queryKey: ["jogadores"] });
    },
  });

  const jogador = jogadores.data?.find((j) => j.id === atual);

  return (
    <Pagina modulo="Visitante">
      <PortaoAdmin area="visitante">
        <Titulo
          sobre="Marco atingido"
          nota="Cada marco do álbum aciona a pilha de atribuição: concessão manual, regras de segmento, sorteio ponderado e, em último recurso, reconhecimento digital."
        >
          O teu prémio do dia
        </Titulo>

        {revelacao?.["aviso_janela"] ? (
          <div className="mb-6">
            <AvisoJanelaUso aviso={revelacao["aviso_janela"] as never} tom="visitante" />
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
          <div className="space-y-6">
            <Cartao titulo="Hariador">
              <Seletor
                rotulo="Perfil de demonstração"
                value={atual}
                onChange={(e) => {
                  setPlayerId(e.target.value);
                  setRevelacao(null);
                }}
              >
                {(jogadores.data ?? []).map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.nome} · {j.album_completo ? "álbum completo" : `${j.cartas} cartas`}
                  </option>
                ))}
              </Seletor>

              {jogador ? (
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  {[
                    ["Pontos", jogador.pontos.toLocaleString("pt-BR")],
                    ["Cartas", `${jogador.cartas}/6`],
                    ["Ranking do dia", jogador.posicao_ranking_dia ?? "—"],
                    ["Passe anual", jogador.passe_anual ? "Sim" : "Não"],
                  ].map(([k, v]) => (
                    <div
                      key={String(k)}
                      className="rounded-sm border border-border bg-secondary/50 px-3 py-2"
                    >
                      <dt className="etiqueta text-muted-foreground">{k}</dt>
                      <dd className="mt-1 font-display text-lg text-foreground">{v}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              <Botao
                variante="ficha"
                className="mt-5 w-full"
                disabled={!atual || marco.isPending}
                onClick={() => marco.mutate()}
              >
                {marco.isPending ? "A picar bilhete…" : "Atingir marco e revelar"}
              </Botao>
            </Cartao>

            <Cartao titulo="Códigos de hoje">
              {codigos.data?.length ? (
                <ul className="space-y-2">
                  {codigos.data.map((c) => (
                    <li
                      key={c.codigo}
                      className="flex flex-wrap items-center gap-3 rounded-sm border border-border px-3 py-2.5"
                    >
                      <span className="codigo-mono text-sm text-foreground">{c.codigo}</span>
                      <Selo estado={c.estado} />
                      <span className="ml-auto text-xs text-muted-foreground">
                        {c.ponto_label} · expira {horaCurta(c.expira_em)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Ainda sem códigos hoje.</p>
              )}
            </Cartao>
          </div>

          <Cartao titulo="Revelação">
            {!revelacao ? (
              <div className="grade-tecnica flex min-h-[22rem] flex-col items-center justify-center rounded-sm border-2 border-dashed border-border p-8 text-center">
                <span className="font-display text-5xl text-muted-foreground/40">?</span>
                <p className="mt-4 max-w-xs text-sm text-muted-foreground">
                  O prémio só aparece depois do marco. A classe fica camuflada até ao ponto de
                  resgate.
                </p>
              </div>
            ) : revelacao["via"] === "fallback_digital" ? (
              <div className="animar-picar rounded-sm border border-border bg-secondary/60 p-8 text-center">
                <p className="etiqueta text-muted-foreground">Sem código físico</p>
                <h3 className="mt-3 text-2xl font-bold text-foreground">
                  +{String(revelacao["pontos"])} pontos
                </h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  {String(revelacao["mensagem"])}
                </p>
              </div>
            ) : revelacao["erro"] ? (
              <p className="text-sm text-destructive">{String(revelacao["erro"])}</p>
            ) : (
              <div className="bilhete animar-picar mx-2 overflow-hidden">
                <div className="surface-navy px-6 py-5">
                  <p className="etiqueta text-accent">Prémio revelado</p>
                  <h3 className="mt-2 text-2xl leading-tight font-bold">
                    {String(revelacao["nome_revelado"] ?? revelacao["classe_id"])}
                  </h3>
                </div>
                <div className="picotado" />
                <div className="px-6 py-6 text-center">
                  <p className="etiqueta text-muted-foreground">Código único</p>
                  <p className="codigo-mono animar-selo mt-3 text-2xl text-foreground sm:text-3xl">
                    {String(revelacao["codigo"])}
                  </p>
                  <p className="mt-4 text-sm text-muted-foreground">
                    Resgata em{" "}
                    <strong className="text-foreground">{String(revelacao["ponto_label"])}</strong>
                    {" · "}válido até {horaCurta(String(revelacao["expira_em"]))}
                  </p>
                  <p className="mt-4 rounded-sm bg-secondary/70 px-3 py-2 text-xs text-muted-foreground">
                    Atribuído por: {String(revelacao["regra"] ?? revelacao["via"])}
                  </p>
                </div>
              </div>
            )}
          </Cartao>
        </div>
      </PortaoAdmin>
    </Pagina>
  );
}
