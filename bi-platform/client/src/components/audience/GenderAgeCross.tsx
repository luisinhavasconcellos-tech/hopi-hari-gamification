import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Users, Filter } from "lucide-react";
import { Card, CardTitle, EmptyState, Kpi } from "@/components/dashboard/primitives";
import { DataTable, Section, compact, tooltipStyle } from "@/components/audience/AudienceUI";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber } from "@/lib/format";

export type GenderAgeRow = {
  gender: string;
  ageGroup: string;
  customers: number;
  sort_order: number;
};

const AGE_ORDER = ["Até 17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
const GENDER_LABEL: Record<string, string> = {
  F: "Feminino",
  M: "Masculino",
  ND: "Não identificado",
};
const GENDER_COLOR: Record<string, string> = {
  F: "hsl(var(--chart-2))",
  M: "hsl(var(--chart-1))",
  ND: "hsl(var(--muted-foreground))",
};

export default function GenderAgeCross({ rows }: { rows: GenderAgeRow[] }) {
  const [gender, setGender] = useState<string>("all");
  const [age, setAge] = useState<string>("all");
  const [mode, setMode] = useState<"abs" | "pct">("abs");
  const [includeND, setIncludeND] = useState<string>("no");

  const base = useMemo(
    () => rows.filter((r) => (includeND === "yes" ? true : r.gender !== "ND")),
    [rows, includeND],
  );

  const filtered = useMemo(
    () =>
      base.filter(
        (r) => (gender === "all" || r.gender === gender) && (age === "all" || r.ageGroup === age),
      ),
    [base, gender, age],
  );

  const genderKeys = useMemo(() => {
    const keys = Array.from(new Set(base.map((r) => r.gender)));
    return keys.sort((a, b) => ["F", "M", "ND"].indexOf(a) - ["F", "M", "ND"].indexOf(b));
  }, [base]);

  const stacked = useMemo(() => {
    const ages = AGE_ORDER.filter((a) => (age === "all" ? true : a === age));
    return ages.map((a) => {
      const entry: Record<string, number | string> = { ageGroup: a };
      let total = 0;
      genderKeys.forEach((g) => {
        const v = filtered
          .filter((r) => r.ageGroup === a && r.gender === g)
          .reduce((s, r) => s + r.customers, 0);
        entry[g] = v;
        total += v;
      });
      if (mode === "pct" && total > 0) {
        genderKeys.forEach((g) => {
          entry[g] = Number((((entry[g] as number) / total) * 100).toFixed(1));
        });
      }
      entry.total = total;
      return entry;
    });
  }, [filtered, genderKeys, age, mode]);

  const byGender = useMemo(
    () =>
      genderKeys.map((g) => ({
        gender: g,
        label: GENDER_LABEL[g] ?? g,
        customers: filtered.filter((r) => r.gender === g).reduce((s, r) => s + r.customers, 0),
      })),
    [filtered, genderKeys],
  );

  const total = filtered.reduce((s, r) => s + r.customers, 0);
  const share = (v: number) => (total ? (v / total) * 100 : 0);

  const topCell = filtered.reduce<GenderAgeRow | null>(
    (a, b) => (b.customers > (a?.customers ?? 0) ? b : a),
    null,
  );

  // idade média ponderada usando o ponto médio de cada faixa
  const MID: Record<string, number> = {
    "Até 17": 15,
    "18-24": 21,
    "25-34": 29.5,
    "35-44": 39.5,
    "45-54": 49.5,
    "55-64": 59.5,
    "65+": 70,
  };
  const avgAge = total
    ? filtered.reduce((s, r) => s + (MID[r.ageGroup] ?? 0) * r.customers, 0) / total
    : 0;

  if (rows.length === 0) {
    return (
      <Card className="mt-6">
        <CardTitle title="Gênero × faixa etária" />
        <EmptyState
          title="Sem cruzamento disponível"
          description="Importe a base de clientes com data de nascimento e nome."
        />
      </Card>
    );
  }

  return (
    <div className="mt-6">
      <Card>
        <CardTitle
          title="Filtros do cruzamento"
          hint="Combine gênero e faixa etária para recortar a base"
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Gênero</label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {genderKeys.map((g) => (
                  <SelectItem key={g} value={g}>
                    {GENDER_LABEL[g] ?? g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Faixa etária</label>
            <Select value={age} onValueChange={setAge}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {AGE_ORDER.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Visualização</label>
            <Select value={mode} onValueChange={(v) => setMode(v as "abs" | "pct")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="abs">Clientes (absoluto)</SelectItem>
                <SelectItem value="pct">% dentro da faixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Não identificados</label>
            <Select value={includeND} onValueChange={setIncludeND}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">Excluir</SelectItem>
                <SelectItem value="yes">Incluir</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi
          label="Clientes no recorte"
          value={formatNumber(total)}
          icon={<Filter className="size-4 text-primary" />}
        />
        <Kpi
          label="Idade média do recorte"
          value={total ? `${avgAge.toFixed(1)} anos` : "—"}
          icon={<Users className="size-4 text-accent" />}
          accent="accent"
        />
        <Kpi
          label="Célula dominante"
          value={
            topCell
              ? `${GENDER_LABEL[topCell.gender] ?? topCell.gender} ${topCell.ageGroup}`
              : "—"
          }
          icon={<Users className="size-4 text-success" />}
          accent="success"
        />
        <Kpi
          label="Share da célula dominante"
          value={topCell ? `${share(topCell.customers).toFixed(1)}%` : "—"}
          icon={<Users className="size-4 text-muted-foreground" />}
        />
      </div>

      <Section>
        <Card>
          <CardTitle
            title="Faixa etária por gênero"
            hint={mode === "pct" ? "Composição percentual dentro de cada faixa" : "Clientes por faixa e gênero"}
          />
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={stacked}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="ageGroup" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis
                tickFormatter={(v) => (mode === "pct" ? `${v}%` : compact(v as number))}
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(v: number, name: string) => [
                  mode === "pct" ? `${v}%` : formatNumber(v),
                  GENDER_LABEL[name] ?? name,
                ]}
              />
              <Legend formatter={(v: string) => GENDER_LABEL[v] ?? v} />
              {genderKeys.map((g) => (
                <Bar
                  key={g}
                  dataKey={g}
                  stackId="g"
                  fill={GENDER_COLOR[g] ?? "hsl(var(--chart-3))"}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardTitle title="Distribuição de gênero no recorte" />
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={byGender}
                dataKey="customers"
                nameKey="label"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={3}
              >
                {byGender.map((g) => (
                  <Cell key={g.gender} fill={GENDER_COLOR[g.gender] ?? "hsl(var(--chart-3))"} />
                ))}
              </Pie>
              <Tooltip
                {...tooltipStyle}
                formatter={(v: number) => [`${formatNumber(v)} (${share(v).toFixed(1)}%)`, "Clientes"]}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Matriz gênero × faixa etária" hint="Valores absolutos e share do recorte" />
          <DataTable
            rows={[...filtered].sort((a, b) => a.sort_order - b.sort_order)}
            rowKey={(r) => `${r.gender}-${r.ageGroup}`}
            columns={[
              { key: "g", header: "Gênero", render: (r) => GENDER_LABEL[r.gender] ?? r.gender },
              { key: "a", header: "Faixa etária", render: (r) => r.ageGroup },
              { key: "c", header: "Clientes", align: "right", render: (r) => formatNumber(r.customers) },
              {
                key: "s",
                header: "% do recorte",
                align: "right",
                render: (r) => `${share(r.customers).toFixed(1)}%`,
              },
            ]}
          />
        </Card>
      </Section>
    </div>
  );
}
