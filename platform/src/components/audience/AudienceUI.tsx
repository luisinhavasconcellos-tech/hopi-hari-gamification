import type { ReactNode } from "react";
import { chartTooltipStyle } from "@/components/dashboard/primitives";

export const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export const tooltipStyle = chartTooltipStyle;

export const compact = (v: number) =>
  v >= 1_000_000
    ? `${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
      ? `${(v / 1_000).toFixed(0)}k`
      : `${v}`;

export type Column<T> = {
  key: string;
  align?: "left" | "right";
  header: ReactNode;
  /** Tailwind width class applied to the column, e.g. "w-[45%]" */
  width?: string;
  /** Clamp long text to 2 lines */
  clamp?: boolean;
  render: (row: T) => ReactNode;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  maxHeight,
  onRowClick,
  isRowActive,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, i: number) => string;
  /** e.g. "max-h-[420px]" — makes the body scroll and keeps cards aligned */
  maxHeight?: string;
  /** Makes rows clickable (selection / drill-down) */
  onRowClick?: (row: T, i: number) => void;
  /** Highlights the selected row */
  isRowActive?: (row: T, i: number) => boolean;
}) {
  const hasSelection = Boolean(isRowActive && rows.some((r, i) => isRowActive(r, i)));
  return (
    <div className={`overflow-x-auto overflow-y-auto -mx-1 ${maxHeight ?? ""}`}>
      <table
        className="w-full text-sm table-fixed"
        style={{ minWidth: columns.length > 3 ? columns.length * 110 : undefined }}
      >
        <thead className="sticky top-0 z-10 bg-card">
          <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-3 py-2 font-medium align-bottom ${c.width ?? ""} ${
                  c.align === "right" ? "text-right" : "text-left"
                }`}
              >
                <span
                  className="block truncate leading-snug"
                  title={typeof c.header === "string" ? c.header : undefined}
                >
                  {c.header}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, i) => {
            const active = isRowActive?.(row, i) ?? false;
            return (
            <tr
              key={rowKey(row, i)}
              onClick={onRowClick ? () => onRowClick(row, i) : undefined}
              className={`border-t border-border/60 transition-colors ${
                onRowClick ? "cursor-pointer" : ""
              } ${
                active
                  ? "bg-primary/10 ring-1 ring-inset ring-primary/40"
                  : hasSelection
                    ? "opacity-50 hover:bg-muted/50"
                    : "hover:bg-muted/50"
              }`}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-3 py-2.5 align-middle ${c.width ?? ""} ${
                    c.align === "right" ? "text-right tabular-nums whitespace-nowrap" : ""
                  }`}
                >
                  {c.clamp ? (
                    <span className="line-clamp-2 leading-snug">{c.render(row)}</span>
                  ) : (
                    c.render(row)
                  )}
                </td>
              ))}
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


export function Section({
  children,
  cols = "grid-cols-1 lg:grid-cols-2",
}: {
  children: ReactNode;
  cols?: string;
}) {
  return <div className={`mt-6 grid gap-4 ${cols}`}>{children}</div>;
}

/**
 * Página/bloco sem dados reais disponíveis.
 * Usado nas áreas do Audience Intelligence que ainda dependem de integração
 * com os sistemas do parque (PDV, e-commerce, CRM, mídia paga, etc.).
 */
export function AwaitingData({
  title = "Sem dados — aguardando integração",
  sources,
  description,
}: {
  title?: string;
  sources?: string[];
  description?: string;
}) {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/50 px-6 py-12 text-center">
      <div className="text-sm font-medium">{title}</div>
      <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground">
        {description ??
          "Esta seção não exibe números estimados. Os indicadores aparecem assim que a fonte de dados for conectada ao backend."}
      </p>
      {sources && sources.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {sources.map((s) => (
            <span
              key={s}
              className="rounded-md border border-border bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground"
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

