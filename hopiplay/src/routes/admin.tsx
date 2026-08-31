import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Barra,
  Botao,
  Campo,
  Cartao,
  Pagina,
  Selo,
  Seletor,
  Titulo,
  eur,
  horaCurta,
} from "@/components/hp/chrome";
import { AvisoJanelaUso } from "@/components/hp/aviso-janela";
import {
  fnAnular,
  fnConcessao,
  fnPainel,
  fnPausar,
  fnRegenerarCifra,
  fnRelatorioDiario,
  fnHistoricoJanela,
} from "@/lib/hopiplay.functions";
import { PortaoAdmin } from "@/components/hp/portao-admin";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel de operação · HopiPlay" },
      {
        name: "description",
        content:
          "Tetos diários, quotas por faixa horária, orçamento gasto, cifra do dia, regras de atribuição e concessões manuais.",
      },
      { property: "og:title", content: "Painel de operação · HopiPlay" },
      {
        property: "og:description",
        content: "Capacidade, orçamento, cifra do dia e regras de atribuição em tempo real.",
      },
    ],
  }),
  component: Admin,
});

function Admin() {
  const painelFn = useServerFn(fnPainel);
  const pausarFn = useServerFn(fnPausar);
  const cifraFn = useServerFn(fnRegenerarCifra);
  const anularFn = useServerFn(fnAnular);
  const concessaoFn = useServerFn(fnConcessao);
  const qc = useQueryClient();

  const relatorioFn = useServerFn(fnRelatorioDiario);
  const historicoFn = useServerFn(fnHistoricoJanela);
  const [aba, setAba] = useState<
    "capacidade" | "codigos" | "cifra" | "regras" | "historico" | "log"
  >("capacidade");
  const [diasHistorico, setDiasHistorico] = useState(14);
  const [novaConcessao, setNovaConcessao] = useState({ playerId: "", classeId: "", motivo: "" });

  const historico = useQuery({
    queryKey: ["historico-janela", diasHistorico],
    queryFn: () => historicoFn({ data: { dias: diasHistorico } }),
    enabled: aba === "historico",
  });

  const painel = useQuery({
    queryKey: ["painel"],
    queryFn: () => painelFn({ data: {} }),
    refetchInterval: 15000,
  });
  const recarregar = () => qc.invalidateQueries({ queryKey: ["painel"] });

  const pausar = useMutation({
    mutationFn: (v: { classeId: string; pausado: boolean }) =>
      pausarFn({ data: { data: painel.data!.data, ...v } }),
    onSuccess: recarregar,
  });
  const regenerar = useMutation({
    mutationFn: () => cifraFn({ data: { data: painel.data!.data } }),
    onSuccess: recarregar,
  });
  const anular = useMutation({
    mutationFn: (codigo: string) =>
      anularFn({ data: { codigo, motivo: "anulado no painel", autorizadoPor: "operacao" } }),
    onSuccess: recarregar,
  });
  const concessao = useMutation({
    mutationFn: () =>
      concessaoFn({
        data: {
          playerId: novaConcessao.playerId,
          classeId: novaConcessao.classeId,
          motivo: novaConcessao.motivo || "cortesia de operação",
          autorizadoPor: "supervisor",
        },
      }),
    onSuccess: () => {
      setNovaConcessao({ playerId: "", classeId: "", motivo: "" });
      recarregar();
    },
  });

  const relatorio = useMutation({
    mutationFn: () => relatorioFn({ data: painel.data ? { data: painel.data.data } : {} }),
    onSuccess: (r) => {
      const blob = new Blob([`\uFEFF${r.csv}`], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = r.ficheiro;
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  const d = painel.data;
  const totalEmitidos = d?.linhas.reduce((s, l) => s + l.emitidos, 0) ?? 0;
  const totalResgatados = d?.linhas.reduce((s, l) => s + l.resgatados, 0) ?? 0;
  const totalGasto = d?.linhas.reduce((s, l) => s + l.gasto_orcamento, 0) ?? 0;

  const ABAS = [
    ["capacidade", "Capacidade"],
    ["codigos", "Códigos"],
    ["cifra", "Cifra do dia"],
    ["regras", "Regras"],
    ["historico", "Histórico de janelas"],
    ["log", "Log"],
  ] as const;

  return (
    <Pagina modulo="Operação">
      <PortaoAdmin area="admin">
        <Titulo sobre={d ? `Dia ${d.data}` : "A carregar"} nota="Atualiza a cada 15 segundos.">
          Painel de operação
        </Titulo>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Botao
            variante="ficha"
            disabled={!d || relatorio.isPending}
            onClick={() => relatorio.mutate()}
          >
            {relatorio.isPending ? "A gerar…" : "Exportar relatório do dia (CSV)"}
          </Botao>
          <span className="text-xs text-muted-foreground">
            Emitidos, resgatados, expirados, anulados, fora de janela e alternativas usadas por
            classe.
          </span>
          {relatorio.data ? (
            <span className="text-xs text-muted-foreground">
              Último: {relatorio.data.totais.resgatados} resgates ·{" "}
              {relatorio.data.totais.fora_janela} fora de janela · {relatorio.data.totais.esgotado}{" "}
              esgotados/pausados · {relatorio.data.totais.alternativas} substituições
            </span>
          ) : null}
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          {[
            ["Emitidos hoje", String(totalEmitidos)],
            ["Resgatados", String(totalResgatados)],
            [
              "Taxa de resgate",
              totalEmitidos ? `${Math.round((totalResgatados / totalEmitidos) * 100)}%` : "—",
            ],
            ["Custo acumulado", eur(totalGasto)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-border bg-card p-4 shadow-bilhete">
              <p className="etiqueta text-muted-foreground">{k}</p>
              <p className="mt-2 font-display text-2xl text-foreground">{v}</p>
            </div>
          ))}
        </div>

        {d?.aviso_janela ? (
          <div className="mb-6">
            <AvisoJanelaUso aviso={d.aviso_janela} tom="operacao" />
          </div>
        ) : null}

        <div className="mb-4 flex flex-wrap gap-1 border-b border-border">
          {ABAS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={`-mb-px border-b-2 px-4 py-2.5 font-display text-sm tracking-wide uppercase transition-colors ${
                aba === id
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {!d ? (
          <p className="text-sm text-muted-foreground">A carregar o dia…</p>
        ) : aba === "capacidade" ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {d.linhas.map((l) => (
              <div
                key={l.classe_id}
                className="rounded-lg border border-border bg-card p-4 shadow-bilhete"
              >
                <div className="flex items-start gap-2">
                  <div>
                    <h3 className="font-display text-base leading-tight text-foreground">
                      {l.nome_revelado}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {l.ponto_label} · nível {l.nivel} · {l.categoria}
                      {l.janela_fim ? <> · usa até {l.janela_fim}</> : null}
                    </p>
                  </div>
                  {l.motivo_label ? (
                    <span
                      className={`etiqueta ml-auto rounded-full px-2 py-1 ${
                        l.motivo === "fora_janela"
                          ? "border border-border bg-muted text-muted-foreground"
                          : "border border-destructive/40 bg-destructive/10 text-destructive"
                      }`}
                      title={l.motivo_detalhe ?? undefined}
                    >
                      {l.motivo_label}
                    </span>
                  ) : null}
                </div>

                <div className="picotado my-3" />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Emitidos</span>
                    <span className="codigo-mono">
                      {l.emitidos}
                      {l.teto ? ` / ${l.teto}` : " / ∞"}
                    </span>
                  </div>
                  <Barra valor={l.emitidos} teto={l.teto} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Quota liberada agora</span>
                    <span className="codigo-mono">{l.quota_agora ?? "∞"}</span>
                  </div>
                  {l.teto_orcamento ? (
                    <>
                      <div className="mt-2 flex justify-between">
                        <span className="text-muted-foreground">Orçamento</span>
                        <span className="codigo-mono">
                          {eur(l.gasto_orcamento)} / {eur(Number(l.teto_orcamento))}
                        </span>
                      </div>
                      <Barra valor={l.gasto_orcamento} teto={Number(l.teto_orcamento)} />
                    </>
                  ) : null}
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Resgatados</span>
                    <span className="codigo-mono">{l.resgatados}</span>
                  </div>
                </div>

                <Botao
                  variante={l.pausado ? "primario" : "linha"}
                  className="mt-4 w-full"
                  onClick={() => pausar.mutate({ classeId: l.classe_id, pausado: !l.pausado })}
                >
                  {l.pausado ? "Retomar emissão" : "Pausar emissão"}
                </Botao>
              </div>
            ))}
          </div>
        ) : aba === "codigos" ? (
          <Cartao titulo="Últimos códigos do dia">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    {["Código", "Hariador", "Classe", "Estado", "Emitido", "Resgate", ""].map(
                      (h) => (
                        <th key={h} className="etiqueta px-2 py-2 text-muted-foreground">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {d.codigos.map((c) => (
                    <tr key={c.codigo} className="border-b border-border/60">
                      <td className="codigo-mono px-2 py-2.5 text-xs">{c.codigo}</td>
                      <td className="px-2 py-2.5">{c.jogador_nome}</td>
                      <td className="px-2 py-2.5 text-muted-foreground">{c.classe_id}</td>
                      <td className="px-2 py-2.5">
                        <Selo estado={c.estado} />
                      </td>
                      <td className="px-2 py-2.5 text-muted-foreground">
                        {horaCurta(c.emitido_em)}
                      </td>
                      <td className="px-2 py-2.5 text-muted-foreground">
                        {c.resgatado_em
                          ? `${horaCurta(c.resgatado_em)} · ${c.ponto_id ?? ""}`
                          : "—"}
                      </td>
                      <td className="px-2 py-2.5">
                        {c.estado === "EMITIDO" ? (
                          <button
                            onClick={() => anular.mutate(c.codigo)}
                            className="etiqueta text-destructive hover:underline"
                          >
                            Anular
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Cartao>
        ) : aba === "cifra" ? (
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <Cartao
              titulo={`Cifra ativa · geração ${d.cifra[0]?.geracao ?? "—"}`}
              acao={
                <Botao variante="perigo" onClick={() => regenerar.mutate()}>
                  Regenerar
                </Botao>
              }
            >
              <p className="mb-4 text-sm text-muted-foreground">
                A letra-chave identifica a classe e cola-se à série sem separador. Regenerar
                invalida a leitura visual dos códigos já emitidos apenas para staff — os códigos
                continuam válidos.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {d.cifra.map((c) => (
                  <div
                    key={c.classe_id}
                    className="flex items-center gap-3 rounded-sm border border-border px-3 py-2.5"
                  >
                    <span className="surface-ficha codigo-mono grid size-9 place-items-center rounded-sm text-base">
                      {c.letra_chave}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {c.nome_revelado}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.ponto_resgate_label} · dígito {c.digito_dia}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Cartao>

            <Cartao titulo="Concessão manual">
              <div className="space-y-3">
                <Seletor
                  rotulo="Hariador"
                  value={novaConcessao.playerId}
                  onChange={(e) => setNovaConcessao((s) => ({ ...s, playerId: e.target.value }))}
                >
                  <option value="">Escolher…</option>
                  {d.jogadores.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.nome}
                    </option>
                  ))}
                </Seletor>
                <Seletor
                  rotulo="Classe"
                  value={novaConcessao.classeId}
                  onChange={(e) => setNovaConcessao((s) => ({ ...s, classeId: e.target.value }))}
                >
                  <option value="">Escolher…</option>
                  {d.linhas.map((l) => (
                    <option key={l.classe_id} value={l.classe_id}>
                      {l.nome_revelado}
                    </option>
                  ))}
                </Seletor>
                <Campo
                  rotulo="Motivo"
                  placeholder="cortesia por incidente"
                  value={novaConcessao.motivo}
                  onChange={(e) => setNovaConcessao((s) => ({ ...s, motivo: e.target.value }))}
                />
                <Botao
                  variante="primario"
                  className="w-full"
                  disabled={
                    !novaConcessao.playerId || !novaConcessao.classeId || concessao.isPending
                  }
                  onClick={() => concessao.mutate()}
                >
                  Criar concessão
                </Botao>
              </div>

              <div className="picotado my-4" />
              <ul className="space-y-2 text-sm">
                {d.concessoes.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-2 rounded-sm border border-border px-3 py-2"
                  >
                    <span className="font-medium text-foreground">{c.player_id}</span>
                    <span className="text-muted-foreground">{c.classe_id}</span>
                    <span className="etiqueta ml-auto text-muted-foreground">
                      {c.consumida ? "consumida" : "pendente"}
                    </span>
                  </li>
                ))}
                {!d.concessoes.length ? (
                  <li className="text-muted-foreground">Sem concessões.</li>
                ) : null}
              </ul>
            </Cartao>
          </div>
        ) : aba === "regras" ? (
          <Cartao titulo="Pilha de atribuição">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    {["Prio", "Regra", "Modo", "Classe", "Peso", "Condição"].map((h) => (
                      <th key={h} className="etiqueta px-2 py-2 text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.regras.map((r) => (
                    <tr key={r.id} className="border-b border-border/60">
                      <td className="codigo-mono px-2 py-2.5">{r.prioridade}</td>
                      <td className="px-2 py-2.5 font-medium text-foreground">{r.nome}</td>
                      <td className="px-2 py-2.5">
                        <span className="etiqueta rounded-full border border-border px-2 py-1 text-muted-foreground">
                          {r.modo}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-muted-foreground">{r.classe_id}</td>
                      <td className="codigo-mono px-2 py-2.5">{r.peso}</td>
                      <td className="px-2 py-2.5 text-xs text-muted-foreground">
                        {JSON.stringify(r.condicao_json)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Cartao>
        ) : aba === "historico" ? (
          <Cartao titulo="Histórico de fora de janela e alternativas">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="etiqueta text-muted-foreground">Período</span>
              {[7, 14, 30].map((n) => (
                <button
                  key={n}
                  onClick={() => setDiasHistorico(n)}
                  className={`rounded-sm border px-3 py-1.5 text-xs transition-colors ${
                    diasHistorico === n
                      ? "border-accent bg-accent/10 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {n} dias
                </button>
              ))}
            </div>

            {historico.isLoading ? (
              <p className="text-sm text-muted-foreground">A carregar histórico…</p>
            ) : !historico.data?.historico.length ? (
              <p className="text-sm text-muted-foreground">
                Sem registos de fora de janela nos últimos {diasHistorico} dias.
              </p>
            ) : (
              <ul className="space-y-3">
                {historico.data.historico.map((dia) => (
                  <li key={dia.data} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="codigo-mono text-sm text-foreground">{dia.data}</span>
                      <span className="etiqueta rounded-full border border-border bg-muted px-2 py-1 text-muted-foreground">
                        {dia.total_fechadas} fora de janela
                      </span>
                      {dia.total_esgotadas ? (
                        <span className="etiqueta rounded-full border border-destructive/40 bg-destructive/10 px-2 py-1 text-destructive">
                          {dia.total_esgotadas} esgotados/pausados
                        </span>
                      ) : null}
                      <span className="etiqueta rounded-full border border-border bg-muted px-2 py-1 text-muted-foreground">
                        {dia.total_alternativas} substituições
                      </span>
                      {dia.fallback_digital ? (
                        <span className="etiqueta rounded-full border border-border bg-muted px-2 py-1 text-muted-foreground">
                          {dia.fallback_digital} reconhecimento digital
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="etiqueta text-muted-foreground">Recompensas fechadas</p>
                        <ul className="mt-1.5 space-y-1 text-sm">
                          {dia.fechadas.length ? (
                            dia.fechadas.map((f) => (
                              <li key={f.classe_id} className="flex items-center gap-2">
                                <span className="text-foreground">{f.nome}</span>
                                {f.janela_fim ? (
                                  <span className="text-xs text-muted-foreground">
                                    até {f.janela_fim}
                                  </span>
                                ) : null}
                                <span className="codigo-mono ml-auto text-xs">
                                  ×{f.ocorrencias}
                                </span>
                              </li>
                            ))
                          ) : (
                            <li className="text-muted-foreground">—</li>
                          )}
                          {dia.esgotadas.map((f) => (
                            <li key={`esg-${f.classe_id}`} className="flex items-center gap-2">
                              <span className="text-foreground">{f.nome}</span>
                              <span className="text-xs text-destructive">esgotado/pausado</span>
                              <span className="codigo-mono ml-auto text-xs">×{f.ocorrencias}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="etiqueta text-muted-foreground">Substituições oferecidas</p>
                        <ul className="mt-1.5 space-y-1 text-sm">
                          {dia.alternativas.length ? (
                            dia.alternativas.map((a) => (
                              <li key={a.classe_id} className="flex items-center gap-2">
                                <span className="text-foreground">{a.nome}</span>
                                <span className="codigo-mono ml-auto text-xs">
                                  ×{a.ocorrencias}
                                </span>
                              </li>
                            ))
                          ) : (
                            <li className="text-muted-foreground">—</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
        ) : (
          <Cartao titulo="Log de eventos">
            <ul className="space-y-1.5 text-sm">
              {d.log.map((l) => (
                <li
                  key={l.id}
                  className="flex flex-wrap items-center gap-2 rounded-sm border border-border px-3 py-2"
                >
                  <span className="etiqueta text-muted-foreground">{horaCurta(l.ts_servidor)}</span>
                  <span className="font-medium text-foreground">{l.acao}</span>
                  {l.codigo ? <span className="codigo-mono text-xs">{l.codigo}</span> : null}
                  <span className="text-muted-foreground">{l.resultado}</span>
                  {l.detalhe ? (
                    <span className="text-xs text-muted-foreground">· {l.detalhe}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </Cartao>
        )}
      </PortaoAdmin>
    </Pagina>
  );
}
