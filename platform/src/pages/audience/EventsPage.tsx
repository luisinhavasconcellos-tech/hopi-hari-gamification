import { useState } from "react";
import { Brain, CalendarDays, Clock, Globe, PlusCircle, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { PageHeader, Kpi, Card, CardTitle, EmptyState } from "@/components/dashboard/primitives";
import { DataTable, Section } from "@/components/audience/AudienceUI";
import { useParkEvents, type ParkEvent } from "@/hooks/useParkEvents";
import { useToast } from "@/hooks/use-toast";

const dateBR = (d: string | null) =>
  d ? new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const period = (e: ParkEvent) =>
  e.start_date && e.end_date && e.start_date !== e.end_date
    ? `${dateBR(e.start_date)} → ${dateBR(e.end_date)}`
    : dateBR(e.start_date ?? e.end_date);

const INSIGHT_LISTS = [
  ["demand_drivers", "Fatores de demanda"],
  ["content_angles", "Ângulos de conteúdo"],
  ["channels", "Canais recomendados"],
  ["risks", "Riscos e atenção"],
  ["actions", "Próximos passos"],
  ["kpis", "KPIs para acompanhar"],
] as const;

const input =
  "w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/60";

export default function EventsPage() {
  const { toast } = useToast();
  const ev = useParkEvents();
  const [form, setForm] = useState({ title: "", category: "", start_date: "", end_date: "", url: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const openEvent = ev.events.find((e) => e.id === openId) ?? null;

  const handleInsights = async (id: string) => {
    try {
      const res = await ev.generateInsights(id);
      setOpenId(id);
      toast({
        title: res?.success ? "Insights gerados" : "Não foi possível gerar",
        description: res?.errors?.length ? res.errors[0] : "Análise atualizada com IA",
        variant: res?.success ? undefined : "destructive",
      });
    } catch (e) {
      toast({
        title: "Erro ao gerar insights",
        description: e instanceof Error ? e.message : "Tente novamente",
        variant: "destructive",
      });
    }
  };

  const handleSync = async () => {
    try {
      const res = await ev.sync();
      toast({
        title: res?.success ? "Sincronizado com hopihari.com.br" : "Sincronização parcial",
        description: `${res?.new_events ?? 0} novo(s) · ${res?.updated_events ?? 0} atualizado(s) · ${res?.insights_generated ?? 0} insight(s)${res?.errors?.length ? ` · ${res.errors.length} erro(s)` : ""}`,
      });
    } catch (e) {
      toast({
        title: "Erro ao sincronizar",
        description: e instanceof Error ? e.message : "Tente novamente",
        variant: "destructive",
      });
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await ev.addManual(form);
      setForm({ title: "", category: "", start_date: "", end_date: "", url: "", description: "" });
      toast({ title: "Evento adicionado" });
    } catch (err) {
      toast({
        title: "Erro ao adicionar",
        description: err instanceof Error ? err.message : "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          eyebrow="Audience · Comercial"
          title="Eventos"
          subtitle="Eventos e temporadas capturados automaticamente do site oficial da Hopi Hari, mais os cadastrados manualmente."
        />
        <button
          onClick={handleSync}
          disabled={ev.syncing}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/50 disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${ev.syncing ? "animate-spin" : ""}`} />
          {ev.syncing ? "Sincronizando…" : "Sincronizar site"}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Kpi label="Em cartaz" value={String(ev.running.length)} icon={<Sparkles className="size-4 text-primary" />} />
        <Kpi label="Próximos" value={String(ev.upcoming.length)} icon={<CalendarDays className="size-4 text-accent" />} accent="accent" />
        <Kpi label="Do site oficial" value={String(ev.fromSite)} icon={<Globe className="size-4 text-success" />} accent="success" />
        <Kpi label="Cadastrados manualmente" value={String(ev.manual)} icon={<PlusCircle className="size-4 text-muted-foreground" />} />
        <Kpi label="Com insights de IA" value={String(ev.withInsights)} icon={<Brain className="size-4 text-primary" />} />
      </div>

      {ev.lastRun && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="size-3" />
          Última sincronização automática:{" "}
          {new Date(ev.lastRun.ran_at).toLocaleString("pt-BR")} · {ev.lastRun.new_events} novo(s) ·{" "}
          {ev.lastRun.updated_events} atualizado(s) · origem {ev.lastRun.triggered_by} · rotina a cada 6h
        </p>
      )}

      <Section cols="grid-cols-1 lg:grid-cols-3 items-start">
        <Card className="lg:col-span-2">
          <CardTitle title="Agenda de eventos" hint="Site oficial + cadastro manual" />
          {ev.loading ? (
            <div className="h-40 animate-pulse rounded-lg bg-muted/50" />
          ) : ev.events.length === 0 ? (
            <EmptyState title="Nenhum evento ainda — sincronize o site ou cadastre manualmente" />
          ) : (
            <DataTable
              rows={ev.events}
              rowKey={(r) => r.id}
              columns={[
                {
                  key: "title",
                  header: "Evento",
                  render: (r) => (
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">{r.title}</div>
                      {r.description && (
                        <div className="truncate text-[11px] text-muted-foreground">{r.description}</div>
                      )}
                    </div>
                  ),
                },
                { key: "category", header: "Categoria", render: (r) => r.category ?? "—" },
                { key: "period", header: "Período", render: (r) => period(r) },
                {
                  key: "source",
                  header: "Origem",
                  render: (r) => (
                    <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {r.source === "site" ? "site" : "manual"}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  header: "",
                  align: "right",
                  render: (r) => (
                    <div className="flex items-center justify-end gap-2">
                      {r.url && (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-primary hover:underline"
                        >
                          abrir
                        </a>
                      )}
                      <button
                        onClick={() => handleInsights(r.id)}
                        disabled={ev.analyzingId === r.id}
                        className="text-[11px] text-muted-foreground hover:text-primary disabled:opacity-50"
                      >
                        {ev.analyzingId === r.id ? "analisando…" : r.ai_insights ? "reanalisar" : "gerar IA"}
                      </button>
                      {r.ai_insights && (
                        <button
                          onClick={() => setOpenId(openId === r.id ? null : r.id)}
                          className="text-[11px] text-primary hover:underline"
                        >
                          {openId === r.id ? "ocultar" : "insights"}
                        </button>
                      )}
                      <button
                        onClick={() => ev.remove(r.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Remover ${r.title}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </Card>

        <Card>
          <CardTitle title="Adicionar evento manual" hint="Não é sobrescrito pela sincronização" />
          <form onSubmit={handleAdd} className="space-y-2.5">
            <input
              className={input}
              placeholder="Título do evento"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <input
              className={input}
              placeholder="Categoria (ex: Halloween)"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className={input}
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
              <input
                type="date"
                className={input}
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
            <input
              className={input}
              placeholder="Link (opcional)"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
            <textarea
              className={`${input} min-h-[70px] resize-y`}
              placeholder="Descrição (opcional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <PlusCircle className="size-3.5" />
              {saving ? "Salvando…" : "Adicionar evento"}
            </button>
          </form>

          {ev.categories.length > 0 && (
            <div className="mt-4 space-y-1.5 border-t border-border pt-3">
              {ev.categories.slice(0, 6).map((c) => (
                <div key={c.category} className="flex items-center justify-between text-[11px]">
                  <span className="truncate text-muted-foreground">{c.category}</span>
                  <span className="font-semibold tabular-nums text-foreground">{c.events}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </Section>

      {openEvent?.ai_insights && (
        <Section cols="grid-cols-1">
          <Card>
            <CardTitle
              title={`Insights de IA · ${openEvent.title}`}
              hint={
                openEvent.insights_generated_at
                  ? `Gerado em ${new Date(openEvent.insights_generated_at).toLocaleString("pt-BR")}`
                  : undefined
              }
            />
            <div className="space-y-4">
              {openEvent.ai_insights.summary && (
                <p className="text-sm text-foreground">{openEvent.ai_insights.summary}</p>
              )}
              <div className="flex flex-wrap gap-2 text-[11px]">
                {openEvent.ai_insights.expected_impact && (
                  <span className="rounded-md border border-border bg-muted/50 px-2 py-1">
                    Impacto esperado:{" "}
                    <strong className="text-foreground">{openEvent.ai_insights.expected_impact}</strong>
                  </span>
                )}
                {openEvent.ai_insights.audience && (
                  <span className="rounded-md border border-border bg-muted/50 px-2 py-1">
                    Público: <strong className="text-foreground">{openEvent.ai_insights.audience}</strong>
                  </span>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {INSIGHT_LISTS.map(([key, label]) => {
                  const items = openEvent.ai_insights?.[key];
                  if (!items?.length) return null;
                  return (
                    <div key={key} className="rounded-xl border border-border bg-muted/50 p-3">
                      <div className="text-xs font-medium text-foreground">{label}</div>
                      <ul className="mt-2 space-y-1.5">
                        {items.map((it, i) => (
                          <li key={i} className="text-[11px] leading-relaxed text-muted-foreground">
                            • {it}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </Section>
      )}

      {ev.runs.length > 0 && (
        <Section cols="grid-cols-1">
          <Card>
            <CardTitle title="Histórico de sincronização" hint="Rotina automática a cada 6 horas" />
            <DataTable
              rows={ev.runs}
              rowKey={(r) => r.id}
              columns={[
                { key: "ran_at", header: "Quando", render: (r) => new Date(r.ran_at).toLocaleString("pt-BR") },
                { key: "triggered_by", header: "Origem", render: (r) => r.triggered_by },
                { key: "scraped", header: "Encontrados", align: "right", render: (r) => String(r.scraped) },
                { key: "new_events", header: "Novos", align: "right", render: (r) => String(r.new_events) },
                { key: "updated_events", header: "Atualizados", align: "right", render: (r) => String(r.updated_events) },
                { key: "insights", header: "Insights", align: "right", render: (r) => String(r.insights_generated) },
                {
                  key: "success",
                  header: "Status",
                  align: "right",
                  render: (r) => (
                    <span className={r.success ? "text-success" : "text-destructive"}>
                      {r.success ? "ok" : "com erros"}
                    </span>
                  ),
                },
              ]}
            />
          </Card>
        </Section>
      )}
    </div>
  );
}
