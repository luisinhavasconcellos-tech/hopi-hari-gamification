import { RefreshCw, ScrollText } from "lucide-react";
import { DataTable } from "@/components/audience/AudienceUI";
import { Card, CardTitle, EmptyState } from "@/components/dashboard/primitives";
import { AUDIT_ACTION_LABELS, useAuditLogs, type AuditLog } from "@/hooks/useAuditLogs";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

const summarize = (log: AuditLog) => {
  const d = log.details ?? {};
  const parts = Object.entries(d)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`);
  return parts.length ? parts.join(" · ") : "—";
};

export default function AuditLogPanel() {
  const { logs, loading, reload } = useAuditLogs(100);

  return (
    <Card className="mt-6">
      <CardTitle
        title="Logs de auditoria"
        hint="Registro imutável de consentimentos, mudanças de política e expurgos automáticos. Retenção de 24 meses."
        right={
          <button
            onClick={() => void reload()}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted/60"
          >
            <RefreshCw className="size-3.5" /> Atualizar
          </button>
        }
      />
      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando registros…</div>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="size-5" />}
          title="Nenhum evento auditado ainda"
          description="Consentimentos, alterações de retenção e expurgos aparecerão aqui automaticamente."
        />
      ) : (
        <DataTable
          rows={logs}
          rowKey={(r) => r.id}
          columns={[
            { key: "when", header: "Data", render: (r) => fmtDate(r.created_at) },
            {
              key: "action",
              header: "Ação",
              render: (r) => AUDIT_ACTION_LABELS[r.action] ?? r.action,
            },
            { key: "area", header: "Área", render: (r) => r.area },
            { key: "ref", header: "Registro", render: (r) => r.record_ref ?? "—" },
            {
              key: "actor",
              header: "Origem",
              render: (r) => (r.actor_kind === "user" ? "Usuário autenticado" : "Sistema"),
            },
            {
              key: "details",
              header: "Detalhes",
              render: (r) => <span className="text-muted-foreground">{summarize(r)}</span>,
            },
          ]}
        />
      )}
    </Card>
  );
}
