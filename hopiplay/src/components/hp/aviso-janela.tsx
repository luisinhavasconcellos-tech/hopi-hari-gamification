type Fechada = {
  classe_id: string;
  nome: string;
  janela_fim: string | null;
  motivo?: string | null;
  motivo_label?: string | null;
  detalhe?: string | null;
};

type AvisoJanela = {
  fechadas: Fechada[];
  alternativas: {
    classe_id: string;
    nome: string;
    ponto_label: string | null;
    janela_fim: string | null;
    categoria?: string | null;
  }[];
};

function descreve(f: Fechada) {
  const rotulo = f.motivo_label ?? "Fora de janela";
  const extra =
    f.motivo === "fora_janela" || !f.motivo ? (f.janela_fim ? ` até ${f.janela_fim}` : "") : "";
  return `${f.nome} — ${rotulo}${extra}`;
}

export function AvisoJanelaUso({
  aviso,
  tom = "visitante",
}: {
  aviso: AvisoJanela | null | undefined;
  tom?: "visitante" | "operacao";
}) {
  if (!aviso || !aviso.fechadas.length) return null;
  const alt = aviso.alternativas.slice(0, 4);
  const soJanela = aviso.fechadas.every((f) => !f.motivo || f.motivo === "fora_janela");
  return (
    <div className="rounded-lg border border-accent/50 bg-accent/10 p-4">
      <p className="etiqueta text-accent">
        {soJanela ? "Fora de janela · aviso de fim de dia" : "Indisponível · substituição sugerida"}
      </p>
      <p className="mt-2 text-sm text-foreground">
        {tom === "visitante"
          ? "Algumas recompensas já não estão disponíveis hoje:"
          : "Recompensas fechadas neste momento:"}{" "}
        <span className="font-medium">{aviso.fechadas.map(descreve).join(", ")}</span>.
      </p>
      {alt.length ? (
        <>
          <p className="mt-3 text-sm text-muted-foreground">
            {tom === "visitante"
              ? "Substituições parecidas que dá para usar hoje:"
              : "Substituições abertas agora:"}
          </p>
          <ul className="mt-2 space-y-1.5">
            {alt.map((a) => (
              <li key={a.classe_id} className="flex flex-wrap items-baseline gap-2 text-sm">
                <span className="font-medium text-foreground">{a.nome}</span>
                {a.categoria ? (
                  <span className="text-xs text-muted-foreground">· {a.categoria}</span>
                ) : null}
                {a.ponto_label ? (
                  <span className="text-xs text-muted-foreground">· {a.ponto_label}</span>
                ) : null}
                {a.janela_fim ? (
                  <span className="text-xs text-muted-foreground">· até {a.janela_fim}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Sem substituições físicas abertas — o marco converte-se em pontos e reconhecimento no app.
        </p>
      )}
    </div>
  );
}
