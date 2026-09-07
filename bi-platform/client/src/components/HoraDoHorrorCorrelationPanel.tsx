import { BarChart3, CalendarRange, CircleAlert, Link2, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";

function formatCurrency(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return "Indisponível";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function statusLabel(status: "ready" | "insufficient_sample" | "flat_series") {
  if (status === "ready") return "Calculada";
  if (status === "flat_series") return "Série sem variação";
  return "Cobertura insuficiente";
}

export default function HoraDoHorrorCorrelationPanel() {
  const correlation = trpc.horaDoHorror.correlation.useQuery();
  const data = correlation.data;
  const allInsufficient = data?.correlations.every(item => item.status !== "ready") ?? false;
  const officialCampaigns = data?.officialCampaigns ?? [];

  if (correlation.isLoading) {
    return <div className="grid gap-4 md:grid-cols-3"><div className="h-40 animate-pulse rounded-2xl bg-muted" /><div className="h-40 animate-pulse rounded-2xl bg-muted" /><div className="h-40 animate-pulse rounded-2xl bg-muted" /></div>;
  }

  if (correlation.error || !data) {
    return <p className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">Não foi possível carregar a correlação protegida da Hora do Horror.</p>;
  }

  return (
    <section className="space-y-6" aria-labelledby="hora-do-horror-title">
      <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><TrendingUp className="size-4" /> Estratégia sazonal</div>
            <h2 id="hora-do-horror-title" className="mt-2 font-display text-2xl tracking-tight text-foreground">Hora do Horror · correlação e estratégia social</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{data.methodology}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card px-4 py-3 text-right">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Último fechamento disponível</div>
            <div className="mt-1 font-display text-xl text-foreground">{formatCurrency(data.latestClosing?.grossRevenueCents)}</div>
            <div className="mt-1 text-xs text-muted-foreground">{data.latestClosing ? `${data.latestClosing.date} · ${String(data.latestClosing.localHour).padStart(2, "0")}:00` : "Sem fechamento operacional"}</div>
          </div>
        </div>
      </div>

      {officialCampaigns.length === 0 ? (
        <div className="flex gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning-foreground"><CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" /><p><strong>Official campaign dates are not configured.</strong> Add the confirmed Hora do Horror window and creatives on the Dashboard before this analysis can include campaign-period observations.</p></div>
      ) : (
        <div className="rounded-2xl border border-border/70 bg-card p-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"><CalendarRange className="size-4 text-primary" /> Official campaign scope</div><div className="mt-3 flex flex-wrap gap-2">{officialCampaigns.map(campaign => <span key={campaign.id} className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-secondary-foreground"><strong className="text-foreground">{campaign.edition}</strong> · {campaign.periodStart} to {campaign.periodEnd} · {campaign.creativeCount} creative{campaign.creativeCount === 1 ? "" : "s"}</span>)}</div></div>
      )}

      {allInsufficient && (
        <div className="flex gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning-foreground">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          <p><strong>Correlação ainda não calculável.</strong> A base não contém uma janela de Hora do Horror rotulada com pelo menos sete dias compartilhados entre receita de fechamento e sinais sociais. O painel preserva essa lacuna, em vez de atribuir a variação diária a uma campanha sem evidência.</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {data.correlations.map(item => (
          <article key={item.platform} className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2"><h3 className="font-display text-lg text-card-foreground">{item.platform}</h3><span className={item.status === "ready" ? "rounded-full bg-success/10 px-2 py-1 text-[11px] font-medium text-success" : "rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground"}>{statusLabel(item.status)}</span></div>
            <p className="mt-1 text-xs text-muted-foreground">Sinal: {item.socialMetric}</p>
            <div className="mt-5 font-display text-3xl text-foreground">{item.coefficient === null ? "—" : item.coefficient.toFixed(3)}</div>
            <p className="mt-1 text-xs text-muted-foreground">Coeficiente de Pearson {item.direction ? `· relação ${item.direction === "positive" ? "positiva" : item.direction === "negative" ? "negativa" : "neutra"}` : ""}</p>
            <div className="mt-5 flex items-center justify-between border-t border-border/70 pt-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><CalendarRange className="size-3.5" /> {item.observedDays}/{item.minimumDays} dias</span><span>social: {item.latestSocialDate ?? "—"}</span></div>
          </article>
        ))}
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
        <div className="flex items-center gap-2"><Link2 className="size-4 text-primary" /><h3 className="font-display text-xl text-card-foreground">Plano de medição e conteúdo</h3></div>
        <p className="mt-1 text-sm text-muted-foreground">Recomendações operacionais para transformar a Hora do Horror em uma campanha mensurável, sem confundir correlação com causalidade.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {data.strategy.map((item, index) => (
            <article key={item.title} className="rounded-xl border border-border/70 bg-background/50 p-4">
              <div className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span><div><h4 className="text-sm font-semibold text-foreground">{item.title}</h4><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.detail}</p></div></div>
            </article>
          ))}
        </div>
        <p className="mt-5 flex items-start gap-2 border-t border-border/70 pt-4 text-xs leading-relaxed text-muted-foreground"><BarChart3 className="mt-0.5 size-3.5 shrink-0 text-primary" />O coeficiente será exibido somente quando a cobertura mínima for atingida; ele indica associação linear entre as séries e não demonstra que o conteúdo causou a receita.</p>
      </div>
    </section>
  );
}
