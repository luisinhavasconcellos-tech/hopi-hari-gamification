import { useMemo, useState, type FormEvent } from "react";
import { Activity, CalendarRange, CircleDollarSign, Link2, Megaphone, ShieldCheck, Ticket, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";

const money = (cents: number | null) => cents === null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(cents / 100);
const number = (value: number | null) => value === null ? "—" : Math.round(value).toLocaleString("pt-BR");
const percentage = (value: number | null | undefined) => value === null || value === undefined ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

const statusLabels = {
  missing_dates: "Datas pendentes",
  no_sales_overlap: "Sem vendas no período",
  insufficient_campaign_days: "Poucos dias de campanha",
  insufficient_baseline_days: "Baseline insuficiente",
  ready: "Comparação disponível",
} as const;

export default function CampaignSalesCorrelationPanel() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const correlation = trpc.campaignSales.correlation.useQuery();
  const [form, setForm] = useState({ driveFolderId: "", periodStart: "", periodEnd: "", brand: "" });
  const savePeriod = trpc.campaignSales.savePeriod.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.campaignSales.correlation.invalidate()]);
      setForm(current => ({ ...current, periodStart: "", periodEnd: "" }));
      toast({ title: "Período oficial salvo", description: "A campanha será reavaliada com vendas, público e canais disponíveis." });
    },
    onError: error => toast({ title: "Não foi possível salvar o período", description: error.message, variant: "destructive" }),
  });

  const driveCampaigns = useMemo(() => correlation.data?.campaigns.filter(item => item.source === "google_drive") ?? [], [correlation.data]);
  const readyCampaigns = useMemo(() => correlation.data?.campaigns.filter(item => item.status === "ready") ?? [], [correlation.data]);
  const chartData = readyCampaigns.map(item => ({ name: item.name, receita: item.deltas?.grossRevenuePct ?? 0, ingressos: item.deltas?.ticketRevenuePct ?? 0 }));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    savePeriod.mutate(form);
  };

  if (correlation.isLoading) return <div className="mt-6 h-72 animate-pulse rounded-2xl border border-border bg-card" />;
  if (correlation.error || !correlation.data) return <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">Não foi possível carregar a correlação protegida entre campanhas e vendas.</div>;
  const data = correlation.data;

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-2xl border border-primary/25 bg-primary/5 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><CircleDollarSign className="size-4" /> Campanhas × vendas</div>
            <h2 className="mt-2 font-display text-2xl text-foreground">Impacto comercial por período oficial</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{data.methodology}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Cobertura de vendas</p>
            <p>{data.salesCoverage.firstDate ?? "—"} a {data.salesCoverage.lastDate ?? "—"}</p>
            <p>{data.salesCoverage.observedDays} dias observados</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-card p-4"><p className="text-xs text-muted-foreground">Campanhas catalogadas</p><p className="mt-2 font-display text-3xl text-foreground">{data.summary.totalCampaigns}</p></div>
          <div className="rounded-xl border border-border/70 bg-card p-4"><p className="text-xs text-muted-foreground">Com datas oficiais</p><p className="mt-2 font-display text-3xl text-foreground">{data.summary.campaignsWithDates}</p></div>
          <div className="rounded-xl border border-border/70 bg-card p-4"><p className="text-xs text-muted-foreground">Comparáveis</p><p className="mt-2 font-display text-3xl text-foreground">{data.summary.readyCampaigns}</p></div>
          <div className="rounded-xl border border-border/70 bg-card p-4"><p className="text-xs text-muted-foreground">Peças × receita</p><p className="mt-2 font-display text-3xl text-foreground">{data.summary.assetRevenueCorrelation === null ? "—" : data.summary.assetRevenueCorrelation.toFixed(2)}</p><p className="mt-1 text-[11px] text-muted-foreground">Disponível com 5+ campanhas comparáveis</p></div>
        </div>
      </section>

      {isAdmin && (
        <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /><h3 className="font-display text-xl text-card-foreground">Registrar período oficial da campanha</h3></div>
          <p className="mt-1 text-sm text-muted-foreground">As datas não são inferidas pelo nome da pasta. O período confirmado é obrigatório para evitar atribuição indevida.</p>
          <div className="mt-4 grid gap-3 lg:grid-cols-4">
            <label className="grid gap-1 text-xs font-medium text-muted-foreground lg:col-span-2">Campanha<select required value={form.driveFolderId} onChange={event => setForm(current => ({ ...current, driveFolderId: event.target.value }))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"><option value="" disabled>Selecione a pasta sincronizada</option>{driveCampaigns.map(item => <option key={item.driveFolderId} value={item.driveFolderId ?? ""}>{item.name}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">Início<input required type="date" value={form.periodStart} onChange={event => setForm(current => ({ ...current, periodStart: event.target.value }))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground" /></label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">Fim<input required type="date" min={form.periodStart || undefined} value={form.periodEnd} onChange={event => setForm(current => ({ ...current, periodEnd: event.target.value }))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground" /></label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground lg:col-span-3">Marca ou frente comercial (opcional)<input value={form.brand} onChange={event => setForm(current => ({ ...current, brand: event.target.value }))} placeholder="Ex.: Hora do Horror, férias, ingresso promocional" className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground" /></label>
            <button type="submit" disabled={savePeriod.isPending} className="h-10 self-end rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60">{savePeriod.isPending ? "Salvando…" : "Salvar período"}</button>
          </div>
        </form>
      )}

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div><h3 className="font-display text-xl text-card-foreground">Evidência por campanha</h3><p className="mt-1 text-sm text-muted-foreground">Mínimo: {data.minimumCampaignDays} dias no período e {data.minimumBaselineDays} dias anteriores.</p></div><span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning"><Link2 className="size-3.5" /> UTM/código necessário para atribuição direta</span></div>
        {readyCampaigns.length > 0 && <div className="mt-5 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ left: 8, right: 12 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-12} height={70} /><YAxis tickFormatter={value => `${value}%`} tick={{ fontSize: 11 }} /><Tooltip formatter={(value: number, name: string) => [`${Number(value).toFixed(1)}%`, name === "receita" ? "Receita bruta" : "Receita de ingressos"]} /><Bar dataKey="receita" fill="hsl(var(--primary))" radius={[5, 5, 0, 0]} /><Bar dataKey="ingressos" fill="hsl(var(--accent))" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>}
        <div className="mt-5 overflow-x-auto rounded-xl border border-border/70">
          <table className="w-full min-w-[980px] text-sm"><thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-3">Campanha</th><th className="px-3 py-3">Período</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Receita média</th><th className="px-3 py-3 text-right">Δ receita</th><th className="px-3 py-3 text-right">Δ ingressos</th><th className="px-3 py-3 text-right">Δ público</th><th className="px-3 py-3 text-right">Δ ticket</th></tr></thead><tbody className="divide-y divide-border/70">{data.campaigns.map(item => <tr key={item.id}><td className="px-3 py-3"><p className="font-medium text-foreground">{item.name}</p><p className="text-xs text-muted-foreground">{item.assets} peças · {item.source === "google_drive" ? "Drive" : "registro oficial"}</p></td><td className="px-3 py-3 text-muted-foreground">{item.periodStart && item.periodEnd ? `${item.periodStart} a ${item.periodEnd}` : "Não informado"}</td><td className="px-3 py-3"><span className={item.status === "ready" ? "rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success" : "rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"}>{statusLabels[item.status]}</span><p className="mt-1 text-[11px] text-muted-foreground">{item.campaign.observedDays} dias · baseline {item.baseline.observedDays}</p></td><td className="px-3 py-3 text-right tabular-nums">{money(item.campaign.averageGrossRevenueCents)}</td><td className="px-3 py-3 text-right tabular-nums">{percentage(item.deltas?.grossRevenuePct)}</td><td className="px-3 py-3 text-right tabular-nums">{percentage(item.deltas?.ticketRevenuePct)}</td><td className="px-3 py-3 text-right tabular-nums">{percentage(item.deltas?.visitorsPct)}</td><td className="px-3 py-3 text-right tabular-nums">{percentage(item.deltas?.averageTicketPct)}</td></tr>)}</tbody></table>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4"><Ticket className="size-4 text-primary" /><p className="mt-3 text-sm font-semibold text-foreground">Receita de ingressos</p><p className="mt-1 text-xs text-muted-foreground">Agrupa E-commerce, bilheteria, telemarketing, turismo, parceiros e AGVT.</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><Users className="size-4 text-primary" /><p className="mt-3 text-sm font-semibold text-foreground">Público e pagantes</p><p className="mt-1 text-xs text-muted-foreground">Compara médias do período com dias operacionais anteriores disponíveis.</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><Activity className="size-4 text-primary" /><p className="mt-3 text-sm font-semibold text-foreground">Defasagem D+7</p><p className="mt-1 text-xs text-muted-foreground">Mantém a janela pós-campanha visível sem incorporá-la automaticamente ao efeito principal.</p></div>
      </section>
    </div>
  );
}
