import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { Sparkles, Loader2, Users, CalendarDays, TrendingDown, Megaphone } from "lucide-react";
import { PageHeader, Card, CardTitle, Kpi, EmptyState } from "@/components/dashboard/primitives";
import { Section, compact, tooltipStyle } from "@/components/audience/AudienceUI";
import { formatNumber } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Post = {
  plataforma?: string;
  formato?: string;
  horario?: string;
  tema?: string;
  roteiro?: string;
  legenda?: string;
  hashtags?: string[];
  cta?: string;
};
type Day = {
  data?: string;
  dia_semana?: string;
  publico_esperado?: number;
  nivel?: string;
  objetivo?: string;
  posts?: Post[];
};
type Plan = {
  resumo?: string;
  prioridades?: string[];
  dias?: Day[];
  campanhas_pagas?: string[];
  riscos?: string[];
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const levelColor = (n?: string) =>
  n === "baixo" ? "hsl(var(--destructive))" : n === "alto" ? "hsl(var(--chart-3))" : "hsl(var(--chart-1))";

export default function ContentPlanPage() {
  const { toast } = useToast();
  const [days, setDays] = useState(7);
  const [forecast, setForecast] = useState<{ date: string; visitors: number }[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("park_visitors_forecast")
        .select("date, visitors")
        .gte("date", today)
        .order("date")
        .limit(30);
      setForecast((data ?? []).map((r: any) => ({ date: r.date, visitors: Number(r.visitors) })));
    })();
  }, []);

  const window = useMemo(() => forecast.slice(0, days), [forecast, days]);

  const stats = useMemo(() => {
    const total = window.reduce((a, r) => a + r.visitors, 0);
    const sorted = [...window].sort((a, b) => a.visitors - b.visitors);
    return {
      total,
      avg: window.length ? Math.round(total / window.length) : 0,
      weakest: sorted[0] ?? null,
      strongest: sorted[sorted.length - 1] ?? null,
    };
  }, [window]);

  const chart = useMemo(() => {
    const levelOf = (v: number) =>
      stats.avg ? (v < stats.avg * 0.6 ? "baixo" : v > stats.avg * 1.4 ? "alto" : "medio") : "medio";
    return window.map((r) => {
      const d = new Date(`${r.date}T12:00:00`);
      return {
        label: `${WEEKDAYS[d.getDay()]} ${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`,
        visitors: r.visitors,
        nivel: levelOf(r.visitors),
      };
    });
  }, [window, stats.avg]);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("marketing-content-plan", { body: { days } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? "Falha ao gerar plano");
      setPlan(data.plan as Plan);
      toast({ title: "Plano gerado", description: `Sugestões de conteúdo para os próximos ${days} dias.` });
    } catch (e: any) {
      toast({ title: "Erro ao gerar plano", description: e?.message ?? "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-5 lg:px-8 py-6">
      <PageHeader
        eyebrow="Audience · Marketing"
        title="Plano Diário de Conteúdo"
        subtitle="O que postar em cada rede, dia a dia, para atrair mais público — a partir da previsão de visitantes e das visitas/vendas reais."
      />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {[7, 14, 21].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
              days === d
                ? "bg-primary/15 text-primary border-primary/30"
                : "border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            {d} dias
          </button>
        ))}
        <button
          onClick={generate}
          disabled={loading}
          className="ml-auto inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          {loading ? "Gerando plano…" : "Gerar plano com IA"}
        </button>
      </div>

      <div className="mt-6">
        <Section cols="grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
          <Kpi icon={<Users className="size-4" />} label="Público esperado no período" value={formatNumber(stats.total)} deltaLabel={`${window.length} dias de operação`} />
          <Kpi icon={<CalendarDays className="size-4" />} label="Média por dia" value={formatNumber(stats.avg)} accent="accent" deltaLabel="Base para classificar os dias" />
          <Kpi
            icon={<TrendingDown className="size-4" />}
            label="Dia mais fraco"
            value={stats.weakest ? formatNumber(stats.weakest.visitors) : "—"}
            deltaLabel={stats.weakest ? new Date(`${stats.weakest.date}T12:00:00`).toLocaleDateString("pt-BR") : undefined}
            accent="warning"
          />
          <Kpi
            icon={<Megaphone className="size-4" />}
            label="Dia mais forte"
            value={stats.strongest ? formatNumber(stats.strongest.visitors) : "—"}
            deltaLabel={stats.strongest ? new Date(`${stats.strongest.date}T12:00:00`).toLocaleDateString("pt-BR") : undefined}
            accent="success"
          />
        </Section>

        <Section cols="grid-cols-1">
          <Card>
            <CardTitle title="Público esperado por dia" hint="Vermelho: dia fraco (precisa de conversão) · Verde: dia cheio (prova social)" />
            {chart.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip {...tooltipStyle} separator=": " formatter={(v: number) => formatNumber(v)} />
                  <Bar dataKey="visitors" name="Visitantes" radius={[6, 6, 0, 0]}>
                    {chart.map((c) => (
                      <Cell key={c.label} fill={levelColor(c.nivel)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="Sem previsão de público" description="Importe o relatório de visitantes por dia para gerar o plano." />
            )}
          </Card>
        </Section>

        {plan ? (
          <>
            <Section cols="grid-cols-1 xl:grid-cols-3">
              <Card className="xl:col-span-2">
                <CardTitle title="Leitura da semana" hint="Gerado por IA com os dados reais da plataforma" />
                <p className="text-sm leading-relaxed text-muted-foreground">{plan.resumo}</p>
                {plan.prioridades?.length ? (
                  <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                    {plan.prioridades.map((p, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-primary">•</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Card>
              <Card>
                <CardTitle title="Mídia paga & riscos" />
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {(plan.campanhas_pagas ?? []).map((c, i) => (
                    <li key={i} className="flex gap-2">
                      <Megaphone className="size-3.5 mt-0.5 text-primary shrink-0" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
                {plan.riscos?.length ? (
                  <ul className="mt-4 space-y-2 text-sm text-destructive/90">
                    {plan.riscos.map((r, i) => (
                      <li key={i}>⚠ {r}</li>
                    ))}
                  </ul>
                ) : null}
              </Card>
            </Section>

            <div className="mt-6 space-y-4">
              {(plan.dias ?? []).map((d, i) => (
                <Card key={d.data ?? i}>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-sm font-semibold text-foreground">
                      {d.data ? new Date(`${d.data}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" }) : d.dia_semana}
                    </div>
                    <span className="text-xs rounded-full px-2 py-0.5 border border-border text-muted-foreground">
                      {formatNumber(d.publico_esperado ?? 0)} visitantes previstos
                    </span>
                    <span
                      className="text-xs rounded-full px-2 py-0.5 border"
                      style={{ color: levelColor(d.nivel), borderColor: levelColor(d.nivel) }}
                    >
                      público {d.nivel ?? "—"}
                    </span>
                    {d.objetivo ? (
                      <span className="text-xs text-muted-foreground">Objetivo: {d.objetivo}</span>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {(d.posts ?? []).map((p, j) => (
                      <div key={j} className="rounded-xl border border-border bg-muted/50 p-4">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-primary">
                          <span>{p.plataforma}</span>
                          <span className="text-muted-foreground">· {p.formato}</span>
                          {p.horario ? <span className="ml-auto text-muted-foreground">{p.horario}</span> : null}
                        </div>
                        <div className="mt-2 text-sm font-semibold text-foreground">{p.tema}</div>
                        {p.roteiro ? <p className="mt-1 text-xs text-muted-foreground">{p.roteiro}</p> : null}
                        {p.legenda ? (
                          <p className="mt-3 text-xs leading-relaxed text-foreground/90 whitespace-pre-line">{p.legenda}</p>
                        ) : null}
                        {p.hashtags?.length ? (
                          <div className="mt-2 text-[11px] text-primary/80">{p.hashtags.join(" ")}</div>
                        ) : null}
                        {p.cta ? <div className="mt-2 text-[11px] text-muted-foreground">CTA: {p.cta}</div> : null}
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-6">
            <Card>
              <EmptyState
                title="Nenhum plano gerado ainda"
                description="Clique em “Gerar plano com IA” para receber as sugestões de post por dia e por rede, calibradas pelo público esperado."
              />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
