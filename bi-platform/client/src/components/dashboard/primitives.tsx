import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Inbox } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  eyebrow = "Hopi AIP",
  actions,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 pb-4 border-b border-border/60 fade-up">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="h-4 w-1 rounded-full gradient-brand shrink-0" />
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {eyebrow}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight font-display break-words">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 md:justify-end md:shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}


export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div className={`glass rounded-2xl ${padded ? "p-5" : ""} ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({
  title,
  hint,
  right,
}: {
  title: string;
  hint?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <div className="text-sm font-medium leading-snug">{title}</div>
        {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}


type Accent = "primary" | "accent" | "success" | "warning";

export function Kpi({
  label,
  value,
  delta,
  deltaLabel,
  icon,
  accent = "primary",
}: {
  label: ReactNode;
  value: string;
  delta?: number;
  deltaLabel?: string;
  icon?: ReactNode;
  accent?: Accent;
}) {
  const positive = (delta ?? 0) >= 0;
  const accentMap: Record<Accent, string> = {
    primary: "from-primary/25 to-transparent",
    accent: "from-accent/25 to-transparent",
    success: "from-success/25 to-transparent",
    warning: "from-warning/25 to-transparent",
  };
  const valueSize =
    value.length > 22
      ? "text-lg sm:text-xl"
      : value.length > 14
        ? "text-xl sm:text-2xl"
        : "text-2xl sm:text-3xl";
  return (
    <div className="relative glass rounded-2xl p-4 sm:p-5 h-full flex flex-col overflow-hidden group hover:-translate-y-0.5 transition-transform fade-up">
      <div
        className={`absolute -top-16 -right-16 size-44 rounded-full blur-3xl opacity-70 bg-gradient-to-br ${accentMap[accent]}`}
      />
      <div className="relative flex items-start justify-between gap-2 min-h-[2.25rem]">
        <div className="text-xs leading-snug text-muted-foreground line-clamp-2">{label}</div>
        {icon && (
          <div className="size-8 shrink-0 grid place-items-center rounded-lg bg-muted/50 text-foreground/80">
            {icon}
          </div>
        )}
      </div>
      <div
        className={`relative mt-2 font-display ${valueSize} leading-tight tracking-tight tabular-nums break-words`}
        title={value}
      >
        {value}
      </div>

      {(typeof delta === "number" || deltaLabel) && (
        <div className="relative mt-auto pt-2 flex flex-wrap items-center gap-1 text-xs">
          {typeof delta === "number" && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md ${
                positive
                  ? "bg-success/15 text-success"
                  : "bg-destructive/15 text-destructive"
              }`}
            >
              {positive ? (
                <ArrowUpRight className="size-3" />
              ) : (
                <ArrowDownRight className="size-3" />
              )}
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          <span className="text-muted-foreground">
            {deltaLabel ?? "vs período anterior"}
          </span>
        </div>
      )}
    </div>
  );
}

type Tone = "muted" | "primary" | "accent" | "success" | "warning" | "danger";

export function Pill({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  const map: Record<Tone, string> = {
    muted: "bg-muted/60 text-muted-foreground border-border",
    primary: "bg-primary/15 text-primary border-primary/30",
    accent: "bg-accent/15 text-accent border-accent/30",
    success: "bg-success/15 text-success border-success/30",
    warning: "bg-warning/15 text-warning border-warning/30",
    danger: "bg-destructive/15 text-destructive border-destructive/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${map[tone]}`}
    >
      {children}
    </span>
  );
}

export function Bar({
  value,
  max = 100,
  tone = "primary",
}: {
  value: number;
  max?: number;
  tone?: "primary" | "accent" | "success" | "warning";
}) {
  const pct = Math.min(100, (value / max) * 100);
  const map: Record<string, string> = {
    primary: "gradient-primary",
    accent: "bg-accent",
    success: "bg-success",
    warning: "bg-warning",
  };
  return (
    <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
      <div className={`h-full ${map[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-md bg-muted/50 border border-border/60 ${className}`}
      aria-hidden
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-foreground/[0.06] to-transparent" />
    </div>
  );
}

export function KpiSkeleton() {
  return (
    <div className="relative glass rounded-2xl p-5 overflow-hidden">
      <div className="flex items-start justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="size-8 rounded-lg" />
      </div>
      <Skeleton className="mt-4 h-8 w-32" />
      <Skeleton className="mt-3 h-4 w-20" />
    </div>
  );
}

export function ChartSkeleton({ height = 320 }: { height?: number }) {
  return (
    <div className="w-full" style={{ height }}>
      <div className="flex h-full items-end gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-md"
            {...{ style: { height: `${30 + ((i * 37) % 65)}%` } }}
          />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({
  rows = 6,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className="h-9" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title = "Sem dados disponíveis",
  description = "Quando houver dados nesta seção, eles aparecerão aqui.",
  icon,
  action,
  className = "",
}: {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center gap-3 py-10 px-6 rounded-xl border border-dashed border-border bg-muted/50 ${className}`}
      role="status"
    >
      <div className="size-10 grid place-items-center rounded-full bg-muted/50 text-muted-foreground">
        {icon ?? <Inbox className="size-5" />}
      </div>
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground mt-1 max-w-sm">{description}</div>
      </div>
      {action}
    </div>
  );
}

/** Recharts tooltip style padronizado (uso opcional) */
export const chartTooltipStyle = {
  background: "hsl(211 46% 11% / 0.96)",
  border: "1px solid hsl(0 0% 100% / 0.10)",
  borderRadius: 12,
  color: "hsl(210 25% 97%)",
  fontSize: 12,
};
