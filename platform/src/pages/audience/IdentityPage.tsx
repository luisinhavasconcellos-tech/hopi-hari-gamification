import { Fingerprint, ShieldCheck, Activity, Trash2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, Kpi, Card, CardTitle, ChartSkeleton, EmptyState } from "@/components/dashboard/primitives";
import { DataTable, Section, compact, tooltipStyle } from "@/components/audience/AudienceUI";
import { formatNumber } from "@/lib/mock-data";
import { useBehaviorIntelligence } from "@/hooks/useBehaviorIntelligence";
import { readConsent, revokeConsent } from "@/lib/consent";
import RetentionPanel from "@/components/audience/RetentionPanel";
import AuditLogPanel from "@/components/audience/AuditLogPanel";

import { useState } from "react";

export default function IdentityPage() {
  const { loading, summary, rows, totalEvents, identifiedSessions, byDay, byAge, byRegion, byEvent, hasData } =
    useBehaviorIntelligence(30);
  const [myConsent, setMyConsent] = useState(readConsent());

  return (
    <div className="px-5 lg:px-8 py-6">
      <PageHeader
        eyebrow="Audience · Identidade"
        title="Identidade & Consentimento"
        subtitle="Junção entre cadastro e navegação usando identificador pseudonimizado, com consentimento explícito e retenção de 12 meses."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi
          label="Identidades registradas"
          value={formatNumber(Number(summary?.total_identities ?? 0))}
          icon={<Fingerprint className="size-4 text-primary" />}
        />
        <Kpi
          label="Consentimentos ativos"
          value={formatNumber(Number(summary?.active_consents ?? 0))}
          icon={<ShieldCheck className="size-4 text-success" />}
          accent="success"
        />
        <Kpi
          label="Consentimentos revogados"
          value={formatNumber(Number(summary?.revoked_consents ?? 0))}
          icon={<Trash2 className="size-4 text-muted-foreground" />}
        />
        <Kpi
          label="Eventos (30 dias)"
          value={formatNumber(totalEvents)}
          icon={<Activity className="size-4 text-primary" />}
        />
      </div>

      {!hasData && Number(summary?.total_identities ?? 0) === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-warning/30 bg-warning/5 p-5">
          <div className="text-sm font-medium">Coleta comportamental ainda não iniciada</div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Os números acima estão em zero porque nenhuma identidade deu opt-in e nenhum evento foi registrado até
            agora — não é queda de desempenho. Os indicadores passam a ser preenchidos assim que os visitantes
            aceitarem o banner de cookies e o rastreamento pseudonimizado começar a receber eventos.
          </p>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-border bg-muted/50 p-5">
        <div className="text-sm font-medium">Como funciona</div>
        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
          <li>• O CPF é convertido no servidor em um hash irreversível (HMAC com salt secreto) — o CPF nunca é gravado nem chega ao navegador.</li>
          <li>• Só esse identificador pseudonimizado liga cadastro e navegação, e apenas depois do opt-in no banner de cookies.</li>
          <li>• Esta tela mostra somente números agregados por segmento; eventos individuais não são expostos à aplicação.</li>
          <li>• Retenção automática de 12 meses. Ao revogar, todo o histórico comportamental daquela identidade é apagado.</li>
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
          <span className="text-muted-foreground">
            Seu consentimento neste navegador:{" "}
            <span className={myConsent?.granted ? "text-success" : "text-foreground"}>
              {myConsent?.granted ? `ativo (${myConsent.purposes.join(", ")})` : "não concedido"}
            </span>
          </span>
          {myConsent?.granted && (
            <button
              onClick={async () => {
                await revokeConsent();
                setMyConsent(null);
              }}
              className="rounded-lg border border-border px-3 py-1.5 hover:text-foreground text-muted-foreground"
            >
              Revogar e apagar meus dados
            </button>
          )}
        </div>
      </div>

      <Section cols="grid-cols-1">
        <RetentionPanel />
        <AuditLogPanel />
      </Section>

      <Section cols="grid-cols-1">

        <Card>
          <CardTitle title="Eventos por dia (30 dias)" />
          {loading ? (
            <ChartSkeleton />
          ) : !hasData ? (
            <EmptyState title="Nenhum evento consentido ainda" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={byDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="events" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>

      <Section>
        <Card>
          <CardTitle title="Eventos por faixa etária" />
          {loading ? (
            <ChartSkeleton />
          ) : byAge.length === 0 ? (
            <EmptyState title="Sem dados" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byAge}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="events" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardTitle title="Eventos por região (CPF)" />
          {loading ? (
            <ChartSkeleton />
          ) : byRegion.length === 0 ? (
            <EmptyState title="Sem dados" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byRegion}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="events" fill="hsl(var(--chart-3))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle
            title="Detalhe agregado por segmento"
            hint={`${formatNumber(identifiedSessions)} sessões identificadas nos últimos 30 dias`}
          />
          {loading ? (
            <ChartSkeleton />
          ) : !hasData ? (
            <EmptyState title="Sem eventos agregados" />
          ) : (
            <DataTable
              rows={rows.slice(0, 60)}
              rowKey={(r, i) => `${r.day}-${r.event_name}-${i}`}
              columns={[
                { key: "day", header: "Dia", render: (r) => r.day },
                { key: "event", header: "Evento", render: (r) => r.event_name },
                { key: "age", header: "Faixa", render: (r) => r.age_group },
                { key: "region", header: "Região", render: (r) => r.region },
                { key: "sessions", header: "Sessões", align: "right", render: (r) => formatNumber(Number(r.sessions)) },
                { key: "identities", header: "Identidades", align: "right", render: (r) => formatNumber(Number(r.identities)) },
                { key: "events", header: "Eventos", align: "right", render: (r) => formatNumber(Number(r.events)) },
              ]}
            />
          )}
        </Card>
      </Section>

      {byEvent.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {byEvent.slice(0, 8).map((e) => (
            <span
              key={e.label}
              className="rounded-md border border-border bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground"
            >
              {e.label} · {formatNumber(e.events)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
