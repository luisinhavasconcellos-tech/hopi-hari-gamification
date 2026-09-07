import { useEffect, useState } from "react";
import { Clock3, Database, Ticket, UsersRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type Summary = {
  revenue: null | {
    businessDate: string;
    localHour: number;
    grossRevenueCents: number;
    internalRevenueCents: number;
    externalRevenueCents: number;
    internalPerCapitaCents: number | null;
  };
  attendance: null | {
    businessDate: string;
    localHour: number;
    publicCount: number;
    payingCount: number;
    complimentaryCount: number;
    currentlyInPark: number;
  };
  audience: null | {
    observedDate: string;
    totalFollowers: number;
    followerChange: number;
    targetFollowers: number;
  };
  sources: Array<{ status: string; rowsSeen: number; rowsRejected: number }>;
};

const currency = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(cents / 100);

const number = (value: number) => new Intl.NumberFormat("pt-BR").format(value);

function PulseCard({ icon: Icon, label, value, detail }: {
  icon: typeof Database;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-transform duration-200 active:scale-[0.99]">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
        <span className="rounded-full bg-primary/10 p-2 text-primary"><Icon className="size-4" /></span>
      </div>
      <p className="font-display text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </article>
  );
}

export default function OperationalPulse() {
  const { session } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!session?.access_token) return;
    const controller = new AbortController();
    fetch("/api/operational/summary", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      signal: controller.signal,
    })
      .then(async response => {
        const payload = await response.json() as { summary?: Summary };
        if (!response.ok || !payload.summary) throw new Error("operational_summary_unavailable");
        setSummary(payload.summary);
      })
      .catch(fetchError => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setError(true);
      });
    return () => controller.abort();
  }, [session?.access_token]);

  if (!summary && !error) {
    return <div className="h-36 animate-pulse rounded-2xl border border-border bg-muted/40" aria-label="Carregando pulso operacional" />;
  }
  if (!summary) {
    return <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">Pulso operacional temporariamente indisponível.</div>;
  }

  const healthySources = summary.sources.filter(source => source.status === "completed" && source.rowsRejected === 0).length;
  return (
    <section className="mb-8" aria-labelledby="operational-pulse-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Base operacional</p>
          <h2 id="operational-pulse-title" className="font-display text-xl font-semibold text-foreground">Pulso do parque</h2>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
          <Database className="size-3.5" /> {healthySources}/{summary.sources.length} fontes reconciliadas
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PulseCard
          icon={Ticket}
          label="Faturamento bruto"
          value={summary.revenue ? currency(summary.revenue.grossRevenueCents) : "—"}
          detail={summary.revenue ? `${summary.revenue.businessDate} · ${summary.revenue.localHour}:00` : "Sem leitura"}
        />
        <PulseCard
          icon={UsersRound}
          label="Público"
          value={summary.attendance ? number(summary.attendance.publicCount) : "—"}
          detail={summary.attendance ? `${number(summary.attendance.currentlyInPark)} no parque` : "Sem leitura"}
        />
        <PulseCard
          icon={Clock3}
          label="Per capita interno"
          value={summary.revenue?.internalPerCapitaCents != null ? currency(summary.revenue.internalPerCapitaCents) : "—"}
          detail={summary.revenue ? `${currency(summary.revenue.internalRevenueCents)} de receita interna` : "Sem leitura"}
        />
        <PulseCard
          icon={Database}
          label="Audiência própria"
          value={summary.audience ? number(summary.audience.totalFollowers) : "—"}
          detail={summary.audience ? `${summary.audience.followerChange >= 0 ? "+" : ""}${number(summary.audience.followerChange)} no último dia` : "Sem leitura"}
        />
      </div>
    </section>
  );
}
