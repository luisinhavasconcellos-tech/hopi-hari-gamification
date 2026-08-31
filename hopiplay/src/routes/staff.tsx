import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Botao,
  Campo,
  Cartao,
  PONTOS,
  Pagina,
  Seletor,
  Titulo,
  horaCurta,
} from "@/components/hp/chrome";
import { fnResgatar, fnSyncOffline, fnVerificar } from "@/lib/hopiplay.functions";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "Consola de staff · HopiPlay" },
      {
        name: "description",
        content:
          "Verifica e resgata códigos no ponto certo: PIN do operador, transição atómica e folha de contingência offline.",
      },
      { property: "og:title", content: "Consola de staff · HopiPlay" },
      {
        property: "og:description",
        content:
          "Verificação e resgate de códigos com PIN do operador e lançamento de contingência.",
      },
    ],
  }),
  component: Staff,
});

type Resp = Record<string, unknown> | null;

// Os valores vêm da base de dados (nomes de jogadores, rótulos) — escapamos
// tudo o que entra no HTML do voucher.
function escHtml(v: unknown) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Gera o HTML do voucher (usado na pré-visualização e na impressão).
function voucherHtml(r: Resp) {
  const codigo = escHtml(r?.["codigo"]);
  const nome = escHtml(r?.["nome_revelado"] ?? "—");
  const hariador = escHtml((r?.["hariador"] as { nome?: string } | undefined)?.nome ?? "—");
  const ponto = escHtml(r?.["ponto_label"] ?? r?.["ponto"] ?? "—");
  const emitido = r?.["emitido_em"] ? escHtml(horaCurta(String(r["emitido_em"]))) : "—";
  const expira = r?.["expira_em"] ? escHtml(horaCurta(String(r["expira_em"]))) : "—";
  const resgatado = r?.["resgatado_em"] ? escHtml(horaCurta(String(r["resgatado_em"]))) : null;
  const operador = r?.["staff_nome"] ? escHtml(r["staff_nome"]) : null;
  const jaResgatado = !!r?.["resgatado_em"] || r?.["estado"] === "RESGATADO";
  const hoje = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const linhas = [
    ["Hariador", hariador],
    ["Ponto de resgate", ponto],
    ["Emitido", emitido],
    ["Expira", expira],
    ...(resgatado ? [["Resgatado", resgatado]] : []),
    ...(operador ? [["Operador", operador]] : []),
  ]
    .map(([k, v]) => `<tr><td class="k">${k}</td><td class="v">${v}</td></tr>`)
    .join("");

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/>
  <title>Voucher · ${codigo}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Montserrat',Arial,sans-serif; background:#f4f4f4; padding:40px; color:#111; }
    .voucher { max-width:480px; margin:0 auto; border:2px dashed #16a34a; border-radius:12px; overflow:hidden; background:#fff; }
    .topo { background:#16a34a; color:#fff; padding:18px 24px; text-align:center; }
    .topo h1 { font-size:22px; letter-spacing:1px; text-transform:uppercase; }
    .topo p { font-size:12px; opacity:.9; margin-top:4px; }
    .corpo { padding:24px; }
    .codigo { font-family:'Courier New',monospace; font-size:30px; font-weight:700; text-align:center; color:#16a34a; letter-spacing:3px; margin:8px 0 18px; }
    .recompensa { text-align:center; font-size:20px; font-weight:700; margin-bottom:8px; }
    .estado { text-align:center; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:${jaResgatado ? "#16a34a" : "#b45309"}; margin-bottom:18px; }
    table { width:100%; border-collapse:collapse; font-size:13px; }
    td { padding:7px 0; border-bottom:1px solid #eee; }
    td.k { color:#666; width:40%; }
    td.v { font-weight:600; }
    .rodape { text-align:center; font-size:11px; color:#888; padding:14px 24px; border-top:1px solid #eee; }
    @media print { body { background:#fff; padding:0; } @page { margin:12mm; } }
  </style></head>
  <body><div class="voucher">
    <div class="topo"><h1>HopiPlay</h1><p>Voucher de recompensa · ${hoje}</p></div>
    <div class="corpo">
      <div class="codigo">${codigo}</div>
      <div class="recompensa">${nome}</div>
      <div class="estado">${jaResgatado ? "Resgatado" : `Válido · expira ${expira}`}</div>
      <table>${linhas}</table>
    </div>
    <div class="rodape">Apresente este voucher no ponto de resgate. Válido apenas na data indicada.</div>
  </div>
  </body></html>`;
}

type AlertaJanela = {
  nome: string;
  mensagem: string;
  janela_fim: string | null;
  motivo?: string | null;
  motivo_label?: string | null;
  alternativas: {
    classe_id: string;
    nome: string;
    ponto_label: string | null;
    janela_fim: string | null;
    categoria?: string | null;
  }[];
};

// Alerta no momento do resgate: avisa o operador e sugere o que oferecer em troca.
function notificarJanela(r: Resp) {
  const a = (r?.["alerta_janela"] ?? null) as AlertaJanela | null;
  if (!a) return;
  const alt = a.alternativas
    .slice(0, 3)
    .map((x) => `${x.nome}${x.ponto_label ? ` (${x.ponto_label})` : ""}`)
    .join(" · ");
  toast.warning(`${a.motivo_label ?? "Fora de janela"}: ${a.nome}`, {
    description: alt
      ? `Substitui por: ${alt}`
      : "Sem substituições abertas — oferece reconhecimento digital.",
    duration: 12000,
  });
}

function Staff() {
  const verificarFn = useServerFn(fnVerificar);
  const resgatarFn = useServerFn(fnResgatar);
  const syncFn = useServerFn(fnSyncOffline);

  const [codigo, setCodigo] = useState("");
  const [pin, setPin] = useState("");
  const [ponto, setPonto] = useState<string>(PONTOS[0].id);
  const [resp, setResp] = useState<Resp>(null);
  const [folha, setFolha] = useState("");
  const [previa, setPrevia] = useState<string | null>(null);
  const previaRef = useRef<HTMLIFrameElement | null>(null);

  // O voucher aparece assim que um código válido é lido — verificação ou resgate.
  const aoLerCodigo = (r: Resp) => {
    setResp(r);
    notificarJanela(r);
    setPrevia(r?.["codigo"] ? voucherHtml(r) : null);
  };

  const verificar = useMutation({
    mutationFn: () => verificarFn({ data: { codigo, pontoId: ponto } }),
    onSuccess: aoLerCodigo,
  });
  const resgatar = useMutation({
    mutationFn: () =>
      resgatarFn({
        data: {
          codigo,
          pin,
          pontoId: ponto,
          idempotencyKey: `${codigo}:${ponto}:${new Date().toISOString().slice(0, 13)}`,
        },
      }),
    onSuccess: aoLerCodigo,
  });
  const sync = useMutation({
    mutationFn: () =>
      syncFn({
        data: {
          linhas: folha
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
            .map((l) => {
              const [cod, staffId, hora] = l.split(/[;,]\s*/);
              return {
                codigo: cod,
                staff_id: staffId || undefined,
                ponto_id: ponto,
                hora: hora || undefined,
              };
            }),
        },
      }),
  });

  const ok = resp?.["ok"] === true;
  const alerta = (resp?.["alerta_janela"] ?? null) as AlertaJanela | null;
  const temVoucher = !!resp?.["codigo"];

  // Imprime a partir do iframe da pré-visualização — sem janelas novas, sem
  // bloqueador de pop-ups. Se a pré-visualização não estiver aberta, abre-a antes.
  const imprimir = () => {
    const w = previaRef.current?.contentWindow;
    if (!w) {
      toast.error("Abre a pré-visualização do voucher antes de imprimir.");
      return;
    }
    w.focus();
    w.print();
  };

  return (
    <Pagina modulo="Staff">
      <Titulo
        sobre="Ponto de resgate"
        nota="O código só é picado uma vez. Recusas explicam-se em linguagem de gente — e o código continua válido quando o ponto está errado."
      >
        Consola de validação
      </Titulo>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Cartao titulo="Leitura">
          <div className="space-y-4">
            <Seletor rotulo="Ponto" value={ponto} onChange={(e) => setPonto(e.target.value)}>
              {PONTOS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} ({p.id})
                </option>
              ))}
            </Seletor>
            <Campo
              rotulo="Código"
              placeholder="H25-XXXXX-X"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              className="codigo-mono uppercase"
            />
            <Campo
              rotulo="PIN do operador"
              type="password"
              inputMode="numeric"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="codigo-mono"
            />
            <div className="flex flex-wrap gap-3">
              <Botao
                variante="linha"
                disabled={!codigo || verificar.isPending}
                onClick={() => verificar.mutate()}
              >
                Verificar
              </Botao>
              <Botao
                variante="ficha"
                className="flex-1"
                disabled={!codigo || !pin || resgatar.isPending}
                onClick={() => resgatar.mutate()}
              >
                {resgatar.isPending ? "A picar…" : "Resgatar"}
              </Botao>
            </div>
            <p className="text-xs text-muted-foreground">
              PINs de demonstração: <span className="codigo-mono">4114</span> (Carlos M., Atração),{" "}
              <span className="codigo-mono">4201</span> (Rafa L., F&amp;B),{" "}
              <span className="codigo-mono">4402</span> (Diego F., foto) e{" "}
              <span className="codigo-mono">9001</span> (Paula R., supervisora — valida em qualquer
              ponto).
            </p>
          </div>
        </Cartao>

        <Cartao titulo="Resultado">
          {!resp ? (
            <p className="text-sm text-muted-foreground">Sem leitura ainda.</p>
          ) : (
            <div
              className={`animar-picar rounded-sm border-l-4 p-5 ${
                ok ? "border-success bg-success/8" : "border-destructive bg-destructive/8"
              }`}
            >
              <p className="etiqueta text-muted-foreground">
                {ok
                  ? resp["estado"] === "RESGATADO"
                    ? "Resgatado"
                    : "Válido"
                  : String(resp["erro"])}
              </p>
              <h3 className="mt-2 text-xl font-bold text-foreground">
                {String(resp["nome_revelado"] ?? resp["mensagem"] ?? "—")}
              </h3>
              {resp["mensagem"] && resp["nome_revelado"] ? (
                <p className="mt-2 text-sm text-muted-foreground">{String(resp["mensagem"])}</p>
              ) : null}
              <dl className="mt-4 space-y-1.5 text-sm">
                {[
                  ["Hariador", (resp["hariador"] as { nome?: string } | undefined)?.nome],
                  ["Ponto", resp["ponto_label"] ?? resp["ponto"]],
                  ["Emitido", resp["emitido_em"] ? horaCurta(String(resp["emitido_em"])) : null],
                  ["Expira", resp["expira_em"] ? horaCurta(String(resp["expira_em"])) : null],
                  [
                    "Resgatado",
                    resp["resgatado_em"] ? horaCurta(String(resp["resgatado_em"])) : null,
                  ],
                  ["Operador", resp["staff_nome"]],
                ]
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={String(k)} className="flex gap-3">
                      <dt className="w-24 shrink-0 text-muted-foreground">{String(k)}</dt>
                      <dd className="font-medium text-foreground">{String(v)}</dd>
                    </div>
                  ))}
              </dl>
              {alerta ? (
                <div className="mt-5 rounded-sm border-l-4 border-warning bg-warning/12 p-4">
                  <p className="etiqueta text-warning">
                    {alerta.motivo_label ?? "Fora de janela"} · substituição
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">{alerta.mensagem}</p>
                  {alerta.alternativas.length ? (
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {alerta.alternativas.slice(0, 5).map((a) => (
                        <li key={a.classe_id} className="flex flex-wrap gap-x-2">
                          <span className="font-medium text-foreground">{a.nome}</span>
                          <span className="text-muted-foreground">
                            {a.categoria ? `${a.categoria} · ` : ""}
                            {a.ponto_label ?? "—"}
                            {a.janela_fim ? ` · até ${a.janela_fim}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Sem substituições configuradas para hoje — oferece reconhecimento digital.
                    </p>
                  )}
                </div>
              ) : null}
              {temVoucher ? (
                <button
                  onClick={() => setPrevia(voucherHtml(resp))}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-success px-4 py-3 font-display text-sm font-bold uppercase tracking-wide text-success-foreground shadow-bilhete transition-all hover:bg-success/90 active:translate-y-px"
                >
                  🖨️{" "}
                  {resp["resgatado_em"] || resp["estado"] === "RESGATADO"
                    ? "Reimprimir voucher"
                    : "Imprimir voucher"}
                </button>
              ) : null}
            </div>
          )}
        </Cartao>
      </div>

      {previa ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pré-visualização do voucher"
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4"
          onClick={() => setPrevia(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-md border border-border bg-card shadow-bilhete"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="etiqueta text-muted-foreground">Pré-visualização do voucher</p>
              <button
                onClick={() => setPrevia(null)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Fechar
              </button>
            </div>
            <iframe
              ref={previaRef}
              title="Pré-visualização do voucher"
              srcDoc={previa}
              className="h-[52vh] w-full border-0 bg-paper"
            />
            <div className="flex flex-wrap gap-3 border-t border-border p-4">
              <button
                onClick={imprimir}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-success px-4 py-3 font-display text-sm font-bold uppercase tracking-wide text-success-foreground shadow-bilhete transition-all hover:bg-success/90 active:translate-y-px"
              >
                🖨️ Imprimir voucher
              </button>
              <Botao variante="linha" onClick={() => setPrevia(null)}>
                Fechar
              </Botao>
            </div>
          </div>
        </div>
      ) : null}

      <Cartao titulo="Folha de contingência (offline)" className="mt-6">
        <p className="mb-3 text-sm text-muted-foreground">
          Uma linha por resgate manual: <span className="codigo-mono">CÓDIGO; STAFF_ID; HH:MM</span>
          . O lançamento sinaliza duplicados e classes que não correspondem ao ponto.
        </p>
        <textarea
          rows={4}
          value={folha}
          onChange={(e) => setFolha(e.target.value.toUpperCase())}
          placeholder="H25-A1B2C-D; ST-001; 15:42"
          className="codigo-mono w-full rounded-sm border border-input bg-paper p-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
        <div className="mt-3 flex items-center gap-3">
          <Botao
            variante="primario"
            disabled={!folha.trim() || sync.isPending}
            onClick={() => sync.mutate()}
          >
            Lançar folha
          </Botao>
          {sync.data ? (
            <span className="text-sm text-muted-foreground">
              {sync.data.lancados} lançados ·{" "}
              {sync.data.sinalizacoes.filter((s) => s.sinal !== "OK").length} sinalizações
            </span>
          ) : null}
        </div>
        {sync.data?.sinalizacoes.length ? (
          <ul className="mt-3 space-y-1.5 text-sm">
            {sync.data.sinalizacoes.map((s, i) => (
              <li key={`${s.codigo}-${i}`} className="rounded-sm border border-border px-3 py-2">
                <span className="codigo-mono">{s.codigo}</span>{" "}
                <span className={s.sinal === "OK" ? "text-success" : "text-destructive"}>
                  {s.sinal}
                </span>
                {s.acao ? <span className="text-muted-foreground"> · {s.acao}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </Cartao>
    </Pagina>
  );
}
