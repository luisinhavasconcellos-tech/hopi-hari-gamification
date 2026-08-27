// =====================================================================
// src/components/SearchDemandSection.tsx
// Seção "Demanda de Busca" do Hopi AIP.
// Lê as tabelas gsc_daily_totals e gsc_daily_queries.
// =====================================================================

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

// --- tokens -----------------------------------------------------------
const C = {
  bg: "#F1EDDF",
  card: "#FAF7EE",
  cardHi: "#F1ECDD",
  border: "#D8D2C0",
  text: "#1B2E28",
  muted: "#5C6B60",
  brand: "#006B59", // verde Hopi
  nonBrand: "#D9A02B", // dourado — descoberta de categoria
  good: "#2E7D4F",
  bad: "#C0442C",
};

type TotalRow = {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type QueryRow = {
  date: string;
  query: string;
  clicks: number;
  impressions: number;
  position: number;
  is_brand: boolean;
};

type Point = {
  date: string;
  label: string;
  clicks: number;
  impressions: number;
  position: number;
  brandImpr: number;
  nonBrandImpr: number;
  clicks7d: number | null;
};

const WINDOW_OPTIONS = [
  { label: "28 dias", days: 28 },
  { label: "90 dias", days: 90 },
  { label: "12 meses", days: 365 },
];

function fmt(n: number) {
  return new Intl.NumberFormat("pt-BR").format(Math.round(n));
}

function shortDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export default function SearchDemandSection() {
  const [days, setDays] = useState(90);
  const [totals, setTotals] = useState<TotalRow[]>([]);
  const [queries, setQueries] = useState<QueryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceIso = since.toISOString().slice(0, 10);

      const [t, q] = await Promise.all([
        supabase
          .from("gsc_daily_totals")
          .select("date, clicks, impressions, ctr, position")
          .gte("date", sinceIso)
          .order("date", { ascending: true }),
        supabase
          .from("gsc_daily_queries")
          .select("date, query, clicks, impressions, position, is_brand")
          .gte("date", sinceIso),
      ]);

      if (cancelled) return;

      if (t.error || q.error) {
        setError(
          t.error?.message ??
            q.error?.message ??
            "Não foi possível carregar os dados de busca.",
        );
        setLoading(false);
        return;
      }

      setTotals((t.data ?? []) as TotalRow[]);
      setQueries((q.data ?? []) as QueryRow[]);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [days]);

  // --- série combinada -----------------------------------------------
  const series: Point[] = useMemo(() => {
    const brandByDate = new Map<string, { b: number; nb: number }>();
    for (const r of queries) {
      const cur = brandByDate.get(r.date) ?? { b: 0, nb: 0 };
      if (r.is_brand) cur.b += r.impressions;
      else cur.nb += r.impressions;
      brandByDate.set(r.date, cur);
    }

    return totals.map((row, i) => {
      const split = brandByDate.get(row.date) ?? { b: 0, nb: 0 };
      const window = totals.slice(Math.max(0, i - 6), i + 1);
      const avg =
        i >= 6
          ? window.reduce((s, r) => s + r.clicks, 0) / window.length
          : null;

      return {
        date: row.date,
        label: shortDate(row.date),
        clicks: row.clicks,
        impressions: row.impressions,
        position: row.position,
        brandImpr: split.b,
        nonBrandImpr: split.nb,
        clicks7d: avg === null ? null : Math.round(avg),
      };
    });
  }, [totals, queries]);

  // --- KPIs: período atual vs. período anterior ------------------------
  const kpis = useMemo(() => {
    if (series.length === 0) return null;
    const half = Math.floor(series.length / 2);
    const prev = series.slice(0, half);
    const cur = series.slice(half);

    const sum = (arr: Point[], k: keyof Point) =>
      arr.reduce((s, r) => s + (Number(r[k]) || 0), 0);

    const curClicks = sum(cur, "clicks");
    const prevClicks = sum(prev, "clicks");
    const curImpr = sum(cur, "impressions");
    const prevImpr = sum(prev, "impressions");
    const curBrand = sum(cur, "brandImpr");
    const curNonBrand = sum(cur, "nonBrandImpr");
    const prevBrand = sum(prev, "brandImpr");
    const curPos =
      cur.reduce((s, r) => s + r.position, 0) / Math.max(cur.length, 1);
    const prevPos =
      prev.reduce((s, r) => s + r.position, 0) / Math.max(prev.length, 1);

    const delta = (a: number, b: number) =>
      b === 0 ? null : ((a - b) / b) * 100;

    return [
      {
        label: "Cliques",
        value: fmt(curClicks),
        delta: delta(curClicks, prevClicks),
        hint: "Visitas vindas da busca orgânica",
      },
      {
        label: "Impressões",
        value: fmt(curImpr),
        delta: delta(curImpr, prevImpr),
        hint: "Quantas vezes o Hopi apareceu na busca",
      },
      {
        label: "Busca de marca",
        value: fmt(curBrand),
        delta: delta(curBrand, prevBrand),
        hint: "Impressões de quem já procura o Hopi pelo nome",
      },
      {
        label: "Posição média",
        value: curPos.toFixed(1),
        delta: delta(prevPos, curPos), // invertido: subir de posição é bom
        hint: "Menor é melhor",
      },
      {
        label: "Share de marca",
        value: `${(
          (100 * curBrand) / Math.max(curBrand + curNonBrand, 1)
        ).toFixed(0)}%`,
        delta: null,
        hint: "Marca sobre o total de impressões",
      },
    ];
  }, [series]);

  // --- top termos ------------------------------------------------------
  const topQueries = useMemo(() => {
    const agg = new Map<
      string,
      { clicks: number; impressions: number; pos: number; n: number; brand: boolean }
    >();
    for (const r of queries) {
      const cur =
        agg.get(r.query) ?? {
          clicks: 0,
          impressions: 0,
          pos: 0,
          n: 0,
          brand: r.is_brand,
        };
      cur.clicks += r.clicks;
      cur.impressions += r.impressions;
      cur.pos += r.position;
      cur.n += 1;
      agg.set(r.query, cur);
    }
    return [...agg.entries()]
      .map(([query, v]) => ({
        query,
        clicks: v.clicks,
        impressions: v.impressions,
        position: v.pos / v.n,
        brand: v.brand,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 12);
  }, [queries]);

  const lastDate = series.at(-1)?.date;

  // --- render ----------------------------------------------------------
  return (
    <section
      style={{
        background: C.bg,
        color: C.text,
        padding: "28px 24px",
        borderRadius: 16,
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* cabeçalho */}
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: C.muted,
            }}
          >
            Hopi AIP · Camada de intenção
          </p>
          <h2 style={{ margin: "6px 0 4px", fontSize: 26, fontWeight: 600 }}>
            Demanda de Busca
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
            {lastDate
              ? `Dados até ${shortDate(lastDate)} · o Search Console tem 2 dias de atraso`
              : "Aguardando a primeira sincronização"}
          </p>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          {WINDOW_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => setDays(opt.days)}
              style={{
                background: days === opt.days ? C.brand : C.card,
                color: days === opt.days ? "#04121B" : C.muted,
                border: `1px solid ${days === opt.days ? C.brand : C.border}`,
                borderRadius: 8,
                padding: "7px 14px",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div
          style={{
            background: "#2A1618",
            border: `1px solid ${C.bad}`,
            borderRadius: 10,
            padding: 16,
            marginBottom: 20,
            fontSize: 14,
          }}
        >
          {error} — confira se a função <code>gsc-sync</code> já rodou pelo menos
          uma vez.
        </div>
      )}

      {loading && (
        <p style={{ color: C.muted, fontSize: 14 }}>Carregando dados de busca…</p>
      )}

      {!loading && !error && series.length === 0 && (
        <div
          style={{
            background: C.card,
            border: `1px dashed ${C.border}`,
            borderRadius: 12,
            padding: 32,
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontSize: 15 }}>Ainda não há dados de busca.</p>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: C.muted }}>
            Rode a função <code>gsc-sync</code> uma vez com{" "}
            <code>{"{ \"days\": 480 }"}</code> para carregar o histórico.
          </p>
        </div>
      )}

      {!loading && !error && series.length > 0 && (
        <>
          {/* KPIs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 12,
              marginBottom: 24,
            }}
          >
            {kpis?.map((k) => (
              <div
                key={k.label}
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "16px 18px",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: C.muted,
                  }}
                >
                  {k.label}
                </p>
                <p
                  style={{
                    margin: "8px 0 4px",
                    fontSize: 28,
                    fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {k.value}
                </p>
                {k.delta !== null && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      fontWeight: 500,
                      color: k.delta >= 0 ? C.good : C.bad,
                    }}
                  >
                    {k.delta >= 0 ? "▲" : "▼"} {Math.abs(k.delta).toFixed(1)}% vs.
                    período anterior
                  </p>
                )}
                <p style={{ margin: "6px 0 0", fontSize: 11, color: C.muted }}>
                  {k.hint}
                </p>
              </div>
            ))}
          </div>

          {/* gráfico principal */}
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: "20px 16px 8px",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                padding: "0 6px 14px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
                Marca vs. descoberta de categoria
              </h3>
              <div style={{ display: "flex", gap: 14, fontSize: 12, color: C.muted }}>
                <Legend color={C.brand} label="Marca" />
                <Legend color={C.nonBrand} label="Não-marca" />
                <Legend color={C.text} label="Cliques (méd. 7d)" />
              </div>
            </div>

            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={series} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gBrand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.brand} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={C.brand} stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="gNonBrand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.nonBrand} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={C.nonBrand} stopOpacity={0.03} />
                  </linearGradient>
                </defs>

                <CartesianGrid stroke={C.border} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: C.muted, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: C.border }}
                  minTickGap={28}
                />
                <YAxis
                  yAxisId="impr"
                  tick={{ fill: C.muted, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : `${v}`)}
                />
                <YAxis yAxisId="clicks" orientation="right" hide />
                <Tooltip
                  contentStyle={{
                    background: C.cardHi,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    color: C.text,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: C.muted }}
                  formatter={(v: number, name: string) => [fmt(v), name]}
                />

                <Area
                  yAxisId="impr"
                  type="monotone"
                  dataKey="brandImpr"
                  name="Marca"
                  stackId="1"
                  stroke={C.brand}
                  strokeWidth={1.5}
                  fill="url(#gBrand)"
                />
                <Area
                  yAxisId="impr"
                  type="monotone"
                  dataKey="nonBrandImpr"
                  name="Não-marca"
                  stackId="1"
                  stroke={C.nonBrand}
                  strokeWidth={1.5}
                  fill="url(#gNonBrand)"
                />
                <Line
                  yAxisId="clicks"
                  type="monotone"
                  dataKey="clicks7d"
                  name="Cliques (méd. 7d)"
                  stroke={C.text}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* top termos */}
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: "20px 22px",
            }}
          >
            <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600 }}>
              Termos que mais trazem visitas
            </h3>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <thead>
                <tr style={{ color: C.muted, textAlign: "left" }}>
                  <th style={th}>Termo</th>
                  <th style={{ ...th, textAlign: "right" }}>Cliques</th>
                  <th style={{ ...th, textAlign: "right" }}>Impressões</th>
                  <th style={{ ...th, textAlign: "right" }}>Posição</th>
                </tr>
              </thead>
              <tbody>
                {topQueries.map((r) => (
                  <tr key={r.query} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={td}>
                      <span
                        style={{
                          display: "inline-block",
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          marginRight: 10,
                          background: r.brand ? C.brand : C.nonBrand,
                        }}
                      />
                      {r.query}
                    </td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>
                      {fmt(r.clicks)}
                    </td>
                    <td style={{ ...td, textAlign: "right", color: C.muted }}>
                      {fmt(r.impressions)}
                    </td>
                    <td style={{ ...td, textAlign: "right", color: C.muted }}>
                      {r.position.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

const th: React.CSSProperties = {
  padding: "0 8px 10px",
  fontWeight: 500,
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const td: React.CSSProperties = { padding: "11px 8px" };

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 10,
          height: 3,
          borderRadius: 2,
          background: color,
          display: "inline-block",
        }}
      />
      {label}
    </span>
  );
}
