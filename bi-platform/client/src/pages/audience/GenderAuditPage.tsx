import { useMemo, useState } from "react";
import { CheckCircle2, CircleSlash, Target, Users, ShieldCheck, RefreshCw } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, Kpi, Card, CardTitle, ChartSkeleton, EmptyState } from "@/components/dashboard/primitives";
import { DataTable, Section, compact, tooltipStyle } from "@/components/audience/AudienceUI";
import { useGenderAudit, type Gender, type GenderSample } from "@/hooks/useGenderAudit";
import { toast } from "sonner";

const LABEL: Record<Gender, string> = { F: "Feminino", M: "Masculino", ND: "Não identificado" };

type Frequency = "todos" | "alta" | "media" | "baixa";

export function GenderAuditSection({ embedded = false }: { embedded?: boolean } = {}) {
  const { loading, samples, metrics, submitReview, reload } = useGenderAudit();
  const [reviewer, setReviewer] = useState("");
  const [notes, setNotes] = useState("");
  const [onlyPending, setOnlyPending] = useState(true);
  const [predFilter, setPredFilter] = useState<"todos" | Gender>("todos");
  const [freq, setFreq] = useState<Frequency>("todos");
  const [cursor, setCursor] = useState(0);
  const [saving, setSaving] = useState(false);

  const queue = useMemo(() => {
    return samples.filter((s) => {
      if (onlyPending && s.reviewed) return false;
      if (predFilter !== "todos" && s.predicted_gender !== predFilter) return false;
      if (freq === "alta" && s.occurrences < 500) return false;
      if (freq === "media" && (s.occurrences < 20 || s.occurrences >= 500)) return false;
      if (freq === "baixa" && s.occurrences >= 20) return false;
      return true;
    });
  }, [samples, onlyPending, predFilter, freq]);

  const current: GenderSample | undefined = queue[Math.min(cursor, Math.max(queue.length - 1, 0))];

  async function record(actual: Gender) {
    if (!current || saving) return;
    setSaving(true);
    try {
      await submitReview(current, actual, reviewer, notes);
      toast.success(
        actual === current.predicted_gender
          ? `“${current.first_name}” confirmado como ${LABEL[actual]}`
          : `“${current.first_name}” corrigido para ${LABEL[actual]}`,
      );
      setNotes("");
      setCursor((c) => (onlyPending ? c : c + 1));
    } catch (e) {
      toast.error("Não foi possível registrar a validação.");
    } finally {
      setSaving(false);
    }
  }

  const accuracyChart = metrics.byPredicted.map((r) => ({
    name: LABEL[r.gender],
    acuracia: Number(r.accuracy.toFixed(1)),
    revisados: r.reviewed,
  }));

  return (
    <div className={embedded ? "" : "px-5 lg:px-8 py-6"}>
      {!embedded && (
        <PageHeader
          eyebrow="Audience · Qualidade de Dados"
          title="Auditoria da Estimativa de Gênero"
          subtitle="Valide em amostras o gênero inferido a partir do primeiro nome e registre cada resultado como feedback para calibrar o modelo."
        />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi
          label="Amostras validadas"
          value={`${metrics.total} / ${samples.length}`}
          icon={<CheckCircle2 className="size-4 text-primary" />}
        />
        <Kpi
          label="Acurácia (por nome)"
          value={metrics.total ? `${metrics.accuracy.toFixed(1)}%` : "—"}
          icon={<Target className="size-4 text-success" />}
          accent="success"
        />
        <Kpi
          label="Acurácia ponderada por clientes"
          value={metrics.total ? `${metrics.weightedAccuracy.toFixed(1)}%` : "—"}
          icon={<Users className="size-4 text-primary" />}
        />
        <Kpi
          label="Clientes cobertos pela amostra"
          value={compact(metrics.coveredCustomers)}
          icon={<ShieldCheck className="size-4 text-muted-foreground" />}
        />
      </div>

      <Section cols="grid-cols-1">
        <div className="col-span-full -mb-1">
          <div className="text-sm font-medium">Fila de validação</div>
          <div className="text-xs text-muted-foreground">Cada decisão é gravada como feedback do modelo, com nome do revisor e observação.</div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <Card>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={predFilter}
                onChange={(e) => { setPredFilter(e.target.value as never); setCursor(0); }}
                className="rounded-md border border-border bg-background px-2 py-1.5"
              >
                <option value="todos">Todas as estimativas</option>
                <option value="F">Estimado Feminino</option>
                <option value="M">Estimado Masculino</option>
                <option value="ND">Não identificado</option>
              </select>
              <select
                value={freq}
                onChange={(e) => { setFreq(e.target.value as Frequency); setCursor(0); }}
                className="rounded-md border border-border bg-background px-2 py-1.5"
              >
                <option value="todos">Qualquer frequência</option>
                <option value="alta">Alta (500+ clientes)</option>
                <option value="media">Média (20–499)</option>
                <option value="baixa">Baixa (&lt;20)</option>
              </select>
              <label className="flex items-center gap-2 text-muted-foreground">
                <input type="checkbox" checked={onlyPending} onChange={(e) => { setOnlyPending(e.target.checked); setCursor(0); }} />
                somente pendentes
              </label>
              <button onClick={() => reload()} className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 hover:bg-muted/60">
                <RefreshCw className="size-3.5" /> atualizar
              </button>
            </div>

            {loading ? (
              <ChartSkeleton height={220} />
            ) : !current ? (
              <EmptyState
                title="Nada na fila"
                description="Não há amostras pendentes com os filtros atuais. Ajuste os filtros ou desmarque “somente pendentes”."
              />
            ) : (
              <div className="mt-4 rounded-xl border border-border bg-muted/50 p-6">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Amostra {Math.min(cursor + 1, queue.length)} de {queue.length}
                </div>
                <div className="mt-2 font-display text-3xl">{current.first_name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {compact(current.occurrences)} clientes com este primeiro nome · estimativa do modelo:{" "}
                  <span className="text-foreground">{LABEL[current.predicted_gender]}</span>
                  {current.reviewed && <span className="ml-2 text-success">já validado</span>}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  {(["F", "M", "ND"] as Gender[]).map((g) => (
                    <button
                      key={g}
                      disabled={saving}
                      onClick={() => record(g)}
                      className={`rounded-lg border px-3 py-2.5 text-sm transition hover:bg-muted/60 disabled:opacity-50 ${
                        g === current.predicted_gender ? "border-primary/50 text-primary" : "border-border"
                      }`}
                    >
                      {LABEL[g]}
                      {g === current.predicted_gender && <span className="block text-[10px] text-muted-foreground">confirmar</span>}
                    </button>
                  ))}
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <input
                    value={reviewer}
                    onChange={(e) => setReviewer(e.target.value)}
                    placeholder="Revisor (opcional)"
                    className="rounded-md border border-border bg-background px-3 py-2 text-xs"
                  />
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observação (opcional)"
                    className="rounded-md border border-border bg-background px-3 py-2 text-xs"
                  />
                </div>

                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <button onClick={() => setCursor((c) => Math.max(0, c - 1))} className="rounded-md border border-border px-2 py-1 hover:bg-muted/60">
                    anterior
                  </button>
                  <button onClick={() => setCursor((c) => Math.min(queue.length - 1, c + 1))} className="rounded-md border border-border px-2 py-1 hover:bg-muted/60">
                    pular
                  </button>
                  <span className="inline-flex items-center gap-1">
                    <CircleSlash className="size-3.5" /> pular não gera feedback
                  </span>
                </div>
              </div>
            )}
          </Card>

          <Card>
            <CardTitle title="Acurácia por estimativa" />
            {metrics.total === 0 ? (
              <EmptyState title="Sem feedback ainda" description="Valide algumas amostras para começar a medir a acurácia do modelo." />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={accuracyChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="acuracia" name="Acurácia %" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              {metrics.byPredicted.map((r) => (
                <div key={r.gender} className="flex justify-between">
                  <span>{LABEL[r.gender]}</span>
                  <span>
                    {r.correct}/{r.reviewed} corretos
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </Section>

      <Section cols="grid-cols-1">
        <div className="col-span-full -mb-1">
          <div className="text-sm font-medium">Matriz de confusão</div>
          <div className="text-xs text-muted-foreground">Estimado pelo modelo (linhas) x confirmado na auditoria (colunas).</div>
        </div>
        <Card>
          <DataTable
            rows={metrics.confusion}
            rowKey={(r) => r.predicted}
            columns={[
              { key: "predicted", header: "Estimado", render: (r) => LABEL[r.predicted] },
              { key: "F", header: "Real: Feminino", render: (r) => r.F },
              { key: "M", header: "Real: Masculino", render: (r) => r.M },
              { key: "ND", header: "Real: Não identificado", render: (r) => r.ND },
            ]}
          />
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <div className="col-span-full -mb-1">
          <div className="text-sm font-medium">Erros priorizados</div>
          <div className="text-xs text-muted-foreground">Nomes classificados errado, ordenados pelo impacto na base de clientes.</div>
        </div>
        <Card>
          {metrics.errors.length === 0 ? (
            <EmptyState title="Nenhum erro registrado" description="Todas as amostras validadas até agora bateram com a estimativa do modelo." />
          ) : (
            <DataTable
              rows={metrics.errors.slice(0, 50)}
              rowKey={(r) => r.id}
              columns={[
                { key: "first_name", header: "Nome", render: (r) => r.first_name },
                { key: "predicted_gender", header: "Estimado", render: (r) => LABEL[r.predicted_gender as Gender] },
                { key: "actual_gender", header: "Correto", render: (r) => LABEL[r.actual_gender as Gender] },
                { key: "occurrences", header: "Clientes", render: (r) => compact(r.occurrences) },
                { key: "reviewer", header: "Revisor", render: (r) => r.reviewer ?? "—" },
                { key: "notes", header: "Observação", render: (r) => r.notes ?? "—" },
              ]}
            />
          )}
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <div className="col-span-full -mb-1">
          <div className="text-sm font-medium">Histórico de feedback</div>
          <div className="text-xs text-muted-foreground">Últimas validações registradas.</div>
        </div>
        <Card>
          {metrics.latest.length === 0 ? (
            <EmptyState title="Sem histórico" description="Nenhuma validação registrada até o momento." />
          ) : (
            <DataTable
              rows={[...metrics.latest].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 50)}
              rowKey={(r) => r.id}
              columns={[
                { key: "created_at", header: "Data", render: (r) => new Date(r.created_at).toLocaleString("pt-BR") },
                { key: "first_name", header: "Nome", render: (r) => r.first_name },
                { key: "predicted_gender", header: "Estimado", render: (r) => LABEL[r.predicted_gender as Gender] },
                { key: "actual_gender", header: "Confirmado", render: (r) => LABEL[r.actual_gender as Gender] },
                { key: "is_correct", header: "Resultado", render: (r) => (r.is_correct ? "acerto" : "erro") },
                { key: "reviewer", header: "Revisor", render: (r) => r.reviewer ?? "—" },
              ]}
            />
          )}
        </Card>
      </Section>
    </div>
  );
}

export default function GenderAuditPage() {
  return <GenderAuditSection />;
}
