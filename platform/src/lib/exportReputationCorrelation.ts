import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AreaSignal, ClusterSignal, ThemeSignal } from "@/hooks/useReputationCorrelation";
import type { CorrelationTest } from "@/lib/stats";
import { formatCiPct, formatCiR } from "@/lib/stats";

/** Paleta oficial Hopi Hari (documento impresso, fundo claro). */
const BRAND = {
  blue: [0, 100, 180] as [number, number, number],
  orange: [255, 100, 0] as [number, number, number],
  text: [22, 26, 34] as [number, number, number],
  muted: [110, 116, 130] as [number, number, number],
  rule: [225, 228, 235] as [number, number, number],
};

export type CorrelationExport = {
  periodLabel: string;
  segment: string;
  coverage: {
    total: number;
    areaCoverage: number;
    themeCoverage: number;
    baselineNegRate: number;
    minSegmentN: number;
    lowSample: boolean;
  };
  volumeComplaintTest: CorrelationTest;
  volumeNegativeTest: CorrelationTest;
  comparison: {
    current: { reviews: number; negativeRate: number; correlation: number | null };
    previous: { reviews: number; negativeRate: number; correlation: number | null };
    correlationDelta: number | null;
    negativeRateDelta: number | null;
    reviewsDelta: number | null;
    comparable: boolean;
  };
  areaSignals: AreaSignal[];
  themeSignals: ThemeSignal[];
  clusterSignals: ClusterSignal[];
};

const num = (v: number, d = 1) => v.toFixed(d).replace(".", ",");
const pct = (v: number, d = 1) => `${num(v, d)}%`;
const rTxt = (v: number | null) => (v == null ? "—" : num(v, 2));
const sig = (t: { lowSample: boolean; significant: boolean }) =>
  t.lowSample ? "não conclusivo" : t.significant ? "significativo (p<0,05)" : "sem diferença";

const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** CSV único com as três seções, separador ";" e BOM para abrir certo no Excel pt-BR. */
export function exportCorrelationCsv(d: CorrelationExport) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows: string[] = [];

  rows.push(esc("Correlação reputação × parque × clusters"));
  rows.push([esc("Período"), esc(d.periodLabel)].join(";"));
  rows.push([esc("Segmento"), esc(d.segment === "all" ? "Todos" : d.segment)].join(";"));
  rows.push([esc("Avaliações no recorte"), esc(d.coverage.total)].join(";"));
  rows.push([esc("Taxa base de negativas"), esc(pct(d.coverage.baselineNegRate * 100))].join(";"));
  rows.push(
    [
      esc("Correlação volume × menções"),
      esc(rTxt(d.volumeComplaintTest.r)),
      esc(`IC95% ${formatCiR(d.volumeComplaintTest.ci)}`),
      esc(d.volumeComplaintTest.label),
    ].join(";"),
  );
  rows.push(
    [
      esc("Correlação volume × % negativas"),
      esc(rTxt(d.volumeNegativeTest.r)),
      esc(`IC95% ${formatCiR(d.volumeNegativeTest.ci)}`),
      esc(d.volumeNegativeTest.label),
    ].join(";"),
  );
  rows.push(
    [
      esc("Período anterior"),
      esc(`avaliações ${d.comparison.previous.reviews}`),
      esc(`correlação ${rTxt(d.comparison.previous.correlation)}`),
      esc(`% negativas ${pct(d.comparison.previous.negativeRate)}`),
    ].join(";"),
  );
  rows.push("");

  rows.push(esc("RANKING DE ÁREAS"));
  rows.push(
    ["Área", "Rides", "Share rides %", "Menções", "Share menções %", "Gap p.p.", "% negativas", "IC95%", "Significância"]
      .map(esc)
      .join(";"),
  );
  for (const a of [...d.areaSignals].sort((x, y) => y.gap - x.gap)) {
    rows.push(
      [
        a.area,
        a.rides,
        num(a.ridesShare),
        a.mentions,
        num(a.mentionShare),
        num(a.gap),
        num(a.negativeRate),
        formatCiPct(a.negTest.ci),
        sig(a.negTest),
      ]
        .map(esc)
        .join(";"),
    );
  }
  rows.push("");

  rows.push(esc("RANKING DE TEMAS"));
  rows.push(["Tema", "Menções", "Negativas", "% negativas", "IC95%", "Share menções %", "Significância"].map(esc).join(";"));
  for (const t of d.themeSignals) {
    rows.push(
      [t.theme, t.mentions, t.negatives, num(t.negativeRate), formatCiPct(t.negTest.ci), num(t.share), sig(t.negTest)]
        .map(esc)
        .join(";"),
    );
  }
  rows.push("");

  rows.push(esc("RANKING DE CLUSTERS"));
  rows.push(["Cluster", "Avaliações", "Negativas", "% negativas", "IC95%", "Nota média", "Principal dor", "Significância"].map(esc).join(";"));
  for (const c of d.clusterSignals) {
    rows.push(
      [
        c.cluster,
        c.reviews,
        c.negatives,
        num(c.negativeRate),
        formatCiPct(c.negTest.ci),
        c.avgRating == null ? "—" : num(c.avgRating),
        c.topTheme ?? "—",
        sig(c.negTest),
      ]
        .map(esc)
        .join(";"),
    );
  }

  download(
    new Blob(["\uFEFF" + rows.join("\r\n")], { type: "text/csv;charset=utf-8" }),
    `correlacao-reputacao_${slug(d.periodLabel)}_${slug(d.segment)}_${stamp()}.csv`,
  );
}

/** PDF A4 com KPIs, comparação de período e os três rankings. */
export function exportCorrelationPdf(d: CorrelationExport) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;

  doc.setFillColor(...BRAND.blue);
  doc.rect(0, 0, W, 76, "F");
  doc.setFillColor(...BRAND.orange);
  doc.rect(0, 72, W, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold").setFontSize(16);
  doc.text("Correlacao reputacao x parque x clusters", M, 34);
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(
    `Hopi Hari - Audience Intelligence  |  Periodo: ${d.periodLabel}  |  Segmento: ${
      d.segment === "all" ? "Todos" : d.segment
    }  |  ${new Date().toLocaleString("pt-BR")}`,
    M,
    54,
  );

  let y = 104;
  doc.setTextColor(...BRAND.text);
  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text("Resumo estatistico", M, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 5, textColor: BRAND.text, lineColor: BRAND.rule },
    headStyles: { fillColor: BRAND.blue, textColor: 255, fontStyle: "bold" },
    head: [["Indicador", "Valor", "IC 95%", "Leitura"]],
    body: [
      [
        "Correlacao volume x mencoes",
        rTxt(d.volumeComplaintTest.r),
        formatCiR(d.volumeComplaintTest.ci),
        d.volumeComplaintTest.label,
      ],
      [
        "Correlacao volume x % negativas",
        rTxt(d.volumeNegativeTest.r),
        formatCiR(d.volumeNegativeTest.ci),
        d.volumeNegativeTest.label,
      ],
      ["Avaliacoes no recorte", String(d.coverage.total), "-", d.coverage.lowSample ? "amostra pequena (<30)" : "amostra adequada"],
      ["Taxa base de negativas", pct(d.coverage.baselineNegRate * 100), "-", "referencia dos testes por segmento"],
      [
        "Cobertura de classificacao",
        `area ${pct(d.coverage.areaCoverage, 0)} / tema ${pct(d.coverage.themeCoverage, 0)}`,
        "-",
        "share de avaliacoes com area/tema identificados",
      ],
    ],
    margin: { left: M, right: M },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 22;
  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text(`Comparacao com o periodo anterior (${d.periodLabel})`, M, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 5, textColor: BRAND.text, lineColor: BRAND.rule },
    headStyles: { fillColor: BRAND.orange, textColor: 255, fontStyle: "bold" },
    head: [["Metrica", "Periodo atual", "Periodo anterior", "Variacao"]],
    body: [
      [
        "Correlacao volume x mencoes",
        rTxt(d.comparison.current.correlation),
        rTxt(d.comparison.previous.correlation),
        d.comparison.correlationDelta == null ? "sem base" : num(d.comparison.correlationDelta, 2),
      ],
      [
        "% negativas",
        pct(d.comparison.current.negativeRate),
        pct(d.comparison.previous.negativeRate),
        d.comparison.negativeRateDelta == null ? "sem base" : `${num(d.comparison.negativeRateDelta)} p.p.`,
      ],
      [
        "Avaliacoes",
        String(d.comparison.current.reviews),
        String(d.comparison.previous.reviews),
        d.comparison.reviewsDelta == null ? "sem base" : String(d.comparison.reviewsDelta),
      ],
    ],
    margin: { left: M, right: M },
  });

  const section = (title: string, head: string[][], body: (string | number)[][]) => {
    let ny = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 22;
    if (ny > doc.internal.pageSize.getHeight() - 140) {
      doc.addPage();
      ny = 60;
    }
    doc.setTextColor(...BRAND.text);
    doc.setFont("helvetica", "bold").setFontSize(11);
    doc.text(title, M, ny);
    autoTable(doc, {
      startY: ny + 8,
      theme: "striped",
      styles: { fontSize: 8.5, cellPadding: 4, textColor: BRAND.text, lineColor: BRAND.rule },
      headStyles: { fillColor: BRAND.blue, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [246, 248, 251] },
      head,
      body,
      margin: { left: M, right: M },
    });
  };

  section(
    "Ranking de areas (ordenado por gap mencoes - rides)",
    [["#", "Area", "Share rides", "Share mencoes", "Gap", "% negativas", "IC 95%", "Leitura"]],
    [...d.areaSignals]
      .sort((a, b) => b.gap - a.gap)
      .map((a, i) => [
        i + 1,
        a.area,
        pct(a.ridesShare),
        pct(a.mentionShare),
        `${a.gap > 0 ? "+" : ""}${num(a.gap)} p.p.`,
        a.mentions ? pct(a.negativeRate, 0) : "-",
        a.mentions ? formatCiPct(a.negTest.ci) : "-",
        a.mentions ? sig(a.negTest) : "sem mencoes",
      ]),
  );

  section(
    "Ranking de temas (ordenado por negativas)",
    [["#", "Tema", "Mencoes", "Negativas", "% negativas", "IC 95%", "Leitura"]],
    d.themeSignals.map((t, i) => [
      i + 1,
      t.theme,
      t.mentions,
      t.negatives,
      pct(t.negativeRate, 0),
      formatCiPct(t.negTest.ci),
      sig(t.negTest),
    ]),
  );

  section(
    "Ranking de clusters de consumidor",
    [["#", "Cluster", "Avaliacoes", "% negativas", "IC 95%", "Nota", "Principal dor", "Leitura"]],
    d.clusterSignals.map((c, i) => [
      i + 1,
      c.cluster,
      c.reviews,
      pct(c.negativeRate, 0),
      formatCiPct(c.negTest.ci),
      c.avgRating == null ? "-" : num(c.avgRating),
      c.topTheme ?? "-",
      sig(c.negTest),
    ]),
  );

  let ny = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  if (ny > doc.internal.pageSize.getHeight() - 90) {
    doc.addPage();
    ny = 60;
  }
  doc.setTextColor(...BRAND.muted);
  doc.setFont("helvetica", "normal").setFontSize(8);
  const notes = doc.splitTextToSize(
    `Metodo: areas, temas e clusters sao inferidos do texto das avaliacoes (ReclameAqui e TripAdvisor); o cluster e um proxy, nao identidade. Taxas usam IC 95% de Wilson e teste z de uma proporcao contra a taxa base de ${pct(
      d.coverage.baselineNegRate * 100,
    )}. Correlacoes usam Pearson com IC 95% (z de Fisher) e p-valor por teste t. Segmentos com n < ${
      d.coverage.minSegmentN
    } sao marcados como nao conclusivos.`,
    W - M * 2,
  );
  doc.text(notes, M, ny);

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setTextColor(...BRAND.muted);
    doc.setFontSize(8);
    doc.text(`Hopi Hari - Audience Intelligence  |  pagina ${i} de ${pages}`, M, doc.internal.pageSize.getHeight() - 24);
  }

  doc.save(`correlacao-reputacao_${slug(d.periodLabel)}_${slug(d.segment)}_${stamp()}.pdf`);
}
