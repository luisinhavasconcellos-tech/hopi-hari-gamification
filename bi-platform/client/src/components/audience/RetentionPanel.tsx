import { useState } from "react";
import { Timer, RefreshCw } from "lucide-react";
import { Card, CardTitle } from "@/components/dashboard/primitives";
import { DataTable } from "@/components/audience/AudienceUI";
import { useRetention } from "@/hooks/useRetention";
import { toast } from "sonner";

const MONTH_OPTIONS = [3, 6, 12, 18, 24];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/** Governança de retenção: prazos por tipo de dado e histórico de expurgos automáticos. */
export default function RetentionPanel() {
  const { loading, policies, runs, lastRun, purging, updateMonths, runPurge } = useRetention();
  const [saving, setSaving] = useState<string | null>(null);

  const handleChange = async (key: string, months: number) => {
    setSaving(key);
    await updateMonths(key, months);
    setSaving(null);
    toast.success(`Retenção atualizada para ${months} meses`);
  };

  const handlePurge = async () => {
    const { deleted, error } = await runPurge();
    if (error) toast.error(error);
    else toast.success(`Expurgo executado — ${deleted} eventos apagados`);
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CardTitle
          title="Retenção e exclusão automática"
          hint="Rotina diária às 03:00 UTC apaga eventos vencidos e junções pseudonimizadas sem consentimento ativo"
        />
        <button
          onClick={handlePurge}
          disabled={purging}
          className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${purging ? "animate-spin" : ""}`} /> Executar agora
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {policies.map((p) => (
          <div key={p.key} className="rounded-lg border border-border bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Timer className="size-3.5" /> {p.description}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <select
                value={p.retention_months}
                disabled={saving === p.key}
                onChange={(e) => handleChange(p.key, Number(e.target.value))}
                className="rounded-md border border-border bg-background px-2 py-1 text-sm"
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m} meses
                  </option>
                ))}
              </select>
              <span className={`text-[11px] ${p.enabled ? "text-success" : "text-muted-foreground"}`}>
                {p.enabled ? "ativa" : "pausada"}
              </span>
            </div>
          </div>
        ))}
        {!loading && policies.length === 0 && (
          <p className="text-xs text-muted-foreground">Políticas visíveis apenas para administradores.</p>
        )}
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        Última execução:{" "}
        {lastRun
          ? `${fmtDate(lastRun.ran_at)} · ${lastRun.events_deleted} eventos, ${lastRun.segments_deleted} junções, ${lastRun.consents_deleted} consentimentos apagados`
          : "ainda não executada"}
      </p>

      {runs.length > 0 && (
        <div className="mt-4">
          <DataTable
            rows={runs}
            rowKey={(r) => r.id}
            columns={[
              { key: "ran_at", header: "Execução", render: (r) => fmtDate(r.ran_at) },
              { key: "triggered_by", header: "Origem", render: (r) => r.triggered_by },
              { key: "events", header: "Eventos", align: "right", render: (r) => r.events_deleted },
              { key: "segments", header: "Junções", align: "right", render: (r) => r.segments_deleted },
              { key: "consents", header: "Consentimentos", align: "right", render: (r) => r.consents_deleted },
            ]}
          />
        </div>
      )}
    </Card>
  );
}
