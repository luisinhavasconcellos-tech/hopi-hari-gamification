import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Botao, Campo, Cartao, Pagina, Seletor, Titulo } from "@/components/hp/chrome";
import {
  fnAlternarAlternativa,
  fnAlternativasAuto,
  fnConfigAlternativas,
  fnGuardarAlternativa,
  fnDefinirPinArea,
  fnRemoverAlternativa,
} from "@/lib/hopiplay.functions";
import { AREAS, PortaoAdmin, type AreaId } from "@/components/hp/portao-admin";
import { toast } from "sonner";

// Gestão de permissões: um PIN por área, alterável só com PIN de supervisão.
function PinsPorArea() {
  const definir = useServerFn(fnDefinirPinArea);
  const [area, setArea] = useState<AreaId>("admin");
  const [pinNovo, setPinNovo] = useState("");
  const [pinSupervisor, setPinSupervisor] = useState("");
  const guardar = useMutation({
    mutationFn: () => definir({ data: { area, pinNovo, pinSupervisor } }),
    onSuccess: (r) => {
      if (r.ok) {
        toast.success(`PIN da área "${r.label}" atualizado.`);
        setPinNovo("");
        setPinSupervisor("");
      } else {
        const msgs: Record<string, string> = {
          SEM_PERMISSAO: "PIN de supervisão inválido.",
          PIN_FRACO: "O PIN novo tem de ter 4 a 12 dígitos.",
          AREA_INVALIDA: "Área desconhecida.",
        };
        toast.error(msgs[r.erro] ?? "Não foi possível atualizar o PIN.");
      }
    },
  });
  return (
    <Cartao titulo="Permissões por área (PIN)">
      <p className="text-sm text-muted-foreground">
        Cada área restrita tem o seu PIN. O PIN de supervisão do staff funciona como chave-mestra e
        é exigido para alterar qualquer PIN de área.
      </p>
      <div className="mt-4 space-y-4">
        <Seletor rotulo="Área" value={area} onChange={(e) => setArea(e.target.value as AreaId)}>
          {(Object.keys(AREAS) as AreaId[]).map((a) => (
            <option key={a} value={a}>
              {AREAS[a]}
            </option>
          ))}
        </Seletor>
        <Campo
          rotulo="PIN novo da área"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pinNovo}
          onChange={(e) => setPinNovo(e.target.value)}
          placeholder="4 a 12 dígitos"
        />
        <Campo
          rotulo="PIN de supervisão (autoriza)"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pinSupervisor}
          onChange={(e) => setPinSupervisor(e.target.value)}
          placeholder="••••"
        />
        <Botao
          className="w-full"
          disabled={guardar.isPending || pinNovo.length < 4 || !pinSupervisor}
          onClick={() => guardar.mutate()}
        >
          {guardar.isPending ? "A guardar…" : "Atualizar PIN da área"}
        </Botao>
      </div>
    </Cartao>
  );
}

export const Route = createFileRoute("/config")({
  head: () => ({
    meta: [
      { title: "Alternativas fora de janela · HopiPlay" },
      {
        name: "description",
        content:
          "Define, por classe fechada, quais recompensas alternativas ficam disponíveis no fim do dia: prioridade, ativação e modo automático.",
      },
      { property: "og:title", content: "Alternativas fora de janela · HopiPlay" },
      {
        property: "og:description",
        content:
          "Configura as recompensas alternativas oferecidas quando uma classe sai da janela de uso.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Config,
});

function Config() {
  const configFn = useServerFn(fnConfigAlternativas);
  const guardarFn = useServerFn(fnGuardarAlternativa);
  const alternarFn = useServerFn(fnAlternarAlternativa);
  const removerFn = useServerFn(fnRemoverAlternativa);
  const autoFn = useServerFn(fnAlternativasAuto);
  const qc = useQueryClient();

  const [fechada, setFechada] = useState("");
  const [alternativa, setAlternativa] = useState("");
  const [prioridade, setPrioridade] = useState("1");

  const cfg = useQuery({ queryKey: ["config-alternativas"], queryFn: () => configFn() });
  const recarregar = () => {
    qc.invalidateQueries({ queryKey: ["config-alternativas"] });
    qc.invalidateQueries({ queryKey: ["painel"] });
  };

  const guardar = useMutation({
    mutationFn: () =>
      guardarFn({
        data: {
          classeFechada: fechada || (cfg.data?.classes[0]?.id ?? ""),
          classeAlternativa: alternativa,
          prioridade: Number(prioridade) || 1,
        },
      }),
    onSuccess: recarregar,
  });
  const alternar = useMutation({
    mutationFn: (v: { id: number; ativo: boolean }) => alternarFn({ data: v }),
    onSuccess: recarregar,
  });
  const remover = useMutation({
    mutationFn: (id: number) => removerFn({ data: { id } }),
    onSuccess: recarregar,
  });
  const auto = useMutation({
    mutationFn: (v: boolean) => autoFn({ data: { auto: v } }),
    onSuccess: recarregar,
  });

  const d = cfg.data;
  const nome = (id: string) => d?.classes.find((c) => c.id === id)?.nome ?? id;
  const fechadaAtual = fechada || d?.classes[0]?.id || "";

  return (
    <Pagina modulo="Configuração">
      <PortaoAdmin area="config">
        <Titulo
          sobre="Janelas de uso"
          nota="Quando uma classe sai da janela (atração fechada, por exemplo), o motor só oferece as alternativas listadas aqui. Sem mapeamento, aplica-se o modo automático."
        >
          Alternativas fora de janela
        </Titulo>

        {!d ? (
          <p className="text-sm text-muted-foreground">A carregar configuração…</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
            <div className="space-y-6">
              <Cartao titulo="Modo automático">
                <p className="text-sm text-muted-foreground">
                  Com o modo automático ligado, uma classe fechada sem alternativas configuradas
                  oferece todas as recompensas ainda dentro da janela. Desligado, o marco escorrega
                  direto para reconhecimento digital.
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <span
                    className={`etiqueta rounded-full px-2.5 py-1 ${
                      d.auto
                        ? "border border-accent/50 bg-accent/15 text-accent"
                        : "border border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    {d.auto ? "Ligado" : "Desligado"}
                  </span>
                  <Botao
                    variante="ficha"
                    disabled={auto.isPending}
                    onClick={() => auto.mutate(!d.auto)}
                  >
                    {d.auto ? "Desligar automático" : "Ligar automático"}
                  </Botao>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Margem de segurança da janela: {d.margem_min} min antes do fecho.
                </p>
              </Cartao>

              <Cartao titulo="Nova alternativa">
                <Seletor
                  rotulo="Quando esta classe estiver fora de janela"
                  value={fechadaAtual}
                  onChange={(e) => setFechada(e.target.value)}
                >
                  {d.classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} {c.janela_fim ? `· até ${c.janela_fim}` : ""}
                    </option>
                  ))}
                </Seletor>

                <div className="mt-4">
                  <Seletor
                    rotulo="Oferecer esta alternativa"
                    value={alternativa}
                    onChange={(e) => setAlternativa(e.target.value)}
                  >
                    <option value="">Escolher classe…</option>
                    {d.classes
                      .filter((c) => c.id !== fechadaAtual)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome} · {c.ponto_label}
                          {c.janela_fim ? ` · até ${c.janela_fim}` : ""}
                        </option>
                      ))}
                  </Seletor>
                </div>

                <div className="mt-4">
                  <Campo
                    rotulo="Prioridade (1 = primeira sugestão)"
                    value={prioridade}
                    onChange={(e) => setPrioridade(e.target.value)}
                  />
                </div>

                <Botao
                  variante="ficha"
                  className="mt-5 w-full"
                  disabled={!alternativa || guardar.isPending}
                  onClick={() => guardar.mutate()}
                >
                  {guardar.isPending ? "A guardar…" : "Guardar alternativa"}
                </Botao>
                {guardar.data && "erro" in guardar.data && guardar.data.erro ? (
                  <p className="mt-3 text-sm text-destructive">{String(guardar.data.erro)}</p>
                ) : null}
              </Cartao>
            </div>

            <div className="space-y-4">
              {d.classes.map((c) => {
                const linhas = d.mapeamentos.filter((m) => m.classe_fechada === c.id);
                return (
                  <div
                    key={c.id}
                    className="rounded-lg border border-border bg-card p-4 shadow-bilhete"
                  >
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="font-display text-base text-foreground">{c.nome}</h3>
                      <span className="text-xs text-muted-foreground">
                        nível {c.nivel} · {c.janela_fim ? `usa até ${c.janela_fim}` : "sem janela"}
                      </span>
                      <span
                        className={`etiqueta ml-auto rounded-full px-2 py-1 ${
                          c.janela_aberta
                            ? "border border-border bg-secondary/60 text-muted-foreground"
                            : "border border-accent/50 bg-accent/15 text-accent"
                        }`}
                      >
                        {c.janela_aberta ? "Em janela" : "Fora de janela"}
                      </span>
                    </div>

                    <div className="picotado my-3" />

                    {linhas.length ? (
                      <ul className="space-y-2">
                        {linhas.map((m) => (
                          <li
                            key={m.id}
                            className="flex flex-wrap items-center gap-3 rounded-sm border border-border px-3 py-2 text-sm"
                          >
                            <span className="codigo-mono text-xs text-muted-foreground">
                              #{m.prioridade}
                            </span>
                            <span className="text-foreground">{nome(m.classe_alternativa)}</span>
                            <span
                              className={`etiqueta rounded-full px-2 py-0.5 ${
                                m.ativo
                                  ? "border border-accent/50 bg-accent/15 text-accent"
                                  : "border border-border bg-muted text-muted-foreground"
                              }`}
                            >
                              {m.ativo ? "Ativa" : "Inativa"}
                            </span>
                            <div className="ml-auto flex gap-2">
                              <button
                                className="text-xs text-muted-foreground underline hover:text-foreground"
                                onClick={() => alternar.mutate({ id: m.id, ativo: !m.ativo })}
                              >
                                {m.ativo ? "Desativar" : "Ativar"}
                              </button>
                              <button
                                className="text-xs text-destructive underline"
                                onClick={() => remover.mutate(m.id)}
                              >
                                Remover
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Sem alternativas próprias —{" "}
                        {d.auto
                          ? "usa todas as classes ainda abertas"
                          : "vai para reconhecimento digital"}
                        .
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="mt-6 max-w-md">
          <PinsPorArea />
        </div>
      </PortaoAdmin>
    </Pagina>
  );
}
