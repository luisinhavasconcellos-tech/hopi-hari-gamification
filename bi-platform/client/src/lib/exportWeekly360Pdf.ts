import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Weekly360Report } from "../../../server/lib/weekly360Report";

const FRAUNCES_REGULAR_URL = "/manus-storage/Fraunces72pt-Regular_8be1c6a0.ttf";
const FRAUNCES_BOLD_URL = "/manus-storage/Fraunces72pt-Bold_df405678.ttf";
const COLORS = {
  green: [0, 107, 89] as [number, number, number],
  greenDark: [0, 71, 60] as [number, number, number],
  greenSoft: [226, 239, 234] as [number, number, number],
  cream: [243, 238, 224] as [number, number, number],
  paper: [252, 250, 244] as [number, number, number],
  gold: [217, 160, 43] as [number, number, number],
  goldSoft: [248, 237, 208] as [number, number, number],
  terra: [192, 68, 44] as [number, number, number],
  terraSoft: [249, 229, 223] as [number, number, number],
  ink: [29, 52, 47] as [number, number, number],
  muted: [99, 112, 106] as [number, number, number],
  line: [215, 211, 197] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const PT = 0.352778;
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;

function fmtInteger(value: number | null | undefined) {
  return value === null || value === undefined ? "Indisponível" : Math.round(value).toLocaleString("pt-BR");
}

function fmtSignedInteger(value: number | null | undefined) {
  if (value === null || value === undefined) return "Indisponível";
  return `${value >= 0 ? "+" : ""}${fmtInteger(value)}`;
}

function fmtMoneyFromCents(value: number | null | undefined, compact = false) {
  if (value === null || value === undefined) return "Indisponível";
  const amount = value / 100;
  if (compact && Math.abs(amount) >= 1_000_000) return `R$ ${(amount / 1_000_000).toFixed(2)} mi`;
  if (compact && Math.abs(amount) >= 1_000) return `R$ ${(amount / 1_000).toFixed(0)} mil`;
  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtMoney(value: number | null | undefined, compact = false) {
  return fmtMoneyFromCents(value === null || value === undefined ? value : value * 100, compact);
}

function fmtPct(value: number | null | undefined, digits = 1) {
  return value === null || value === undefined || !Number.isFinite(value) ? "Indisponível" : `${value.toFixed(digits).replace(".", ",")}%`;
}

function fmtDate(value: string | null | undefined) {
  if (!value) return "Indisponível";
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");
}

function safe(value: unknown, fallback = "Indisponível") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function sanitizeBriefingSummary(value: string) {
  return value
    .replace(/\(([^)]*previousYearRevenue[^)]*)\)/gi, "")
    .replace(/\bpreviousYearRevenue\b/gi, "ano anterior")
    .replace(/-?\d+\.\d{2,}/g, match => Number(match).toLocaleString("pt-BR", { maximumFractionDigits: 2 }))
    .replace(/\s{2,}/g, " ")
    .trim();
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

async function installFraunces(doc: jsPDF) {
  try {
    const [regular, bold] = await Promise.all([fetch(FRAUNCES_REGULAR_URL), fetch(FRAUNCES_BOLD_URL)]);
    if (!regular.ok || !bold.ok) return false;
    doc.addFileToVFS("Fraunces-Regular.ttf", arrayBufferToBase64(await regular.arrayBuffer()));
    doc.addFileToVFS("Fraunces-Bold.ttf", arrayBufferToBase64(await bold.arrayBuffer()));
    doc.addFont("Fraunces-Regular.ttf", "Fraunces", "normal");
    doc.addFont("Fraunces-Bold.ttf", "Fraunces", "bold");
    return true;
  } catch {
    return false;
  }
}

function displayFont(hasFraunces: boolean) {
  return hasFraunces ? "Fraunces" : "times";
}

function reportFileName(report: Weekly360Report) {
  return `hopi-hari-relatorio-360-semana-${report.report.periodStart}-a-${report.report.periodEnd}.pdf`;
}

function pageChrome(doc: jsPDF, report: Weekly360Report, chapter: string, hasFraunces: boolean) {
  doc.setFillColor(...COLORS.paper);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");
  doc.setFillColor(...COLORS.green);
  doc.rect(0, 0, PAGE_W, 18, "F");
  doc.setFillColor(...COLORS.gold);
  doc.rect(0, 18, PAGE_W, 1.4, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFont(displayFont(hasFraunces), "bold");
  doc.setFontSize(11);
  doc.text("HOPI HARI · INTELIGÊNCIA 360°", MARGIN, 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(chapter, MARGIN, 14);
  doc.text(`${fmtDate(report.report.periodStart)} — ${fmtDate(report.report.periodEnd)}`, PAGE_W - MARGIN, 14, { align: "right" });
}

function addPage(doc: jsPDF, report: Weekly360Report, chapter: string, hasFraunces: boolean) {
  doc.addPage();
  pageChrome(doc, report, chapter, hasFraunces);
  return 31;
}

function chapterTitle(doc: jsPDF, y: number, title: string, subtitle: string | undefined, hasFraunces: boolean) {
  doc.setFillColor(...COLORS.gold);
  doc.roundedRect(MARGIN, y - 4.5, 3.2, 12, 1.2, 1.2, "F");
  doc.setTextColor(...COLORS.ink);
  doc.setFont(displayFont(hasFraunces), "bold");
  doc.setFontSize(19);
  doc.text(title, MARGIN + 7, y + 2);
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.muted);
    doc.text(subtitle, MARGIN + 7, y + 8);
    return y + 15;
  }
  return y + 10;
}

function paragraph(doc: jsPDF, y: number, value: string, options: { width?: number; size?: number; color?: [number, number, number]; bold?: boolean; font?: string } = {}) {
  const width = options.width ?? CONTENT_W;
  const size = options.size ?? 9;
  doc.setFont(options.font ?? "helvetica", options.bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.setTextColor(...(options.color ?? COLORS.ink));
  const lines = doc.splitTextToSize(value, width);
  doc.text(lines, MARGIN, y);
  return y + lines.length * size * PT * 1.28;
}

function callout(doc: jsPDF, y: number, title: string, body: string, tone: "green" | "gold" | "terra" = "green") {
  const fill = tone === "green" ? COLORS.greenSoft : tone === "gold" ? COLORS.goldSoft : COLORS.terraSoft;
  const accent = tone === "green" ? COLORS.green : tone === "gold" ? COLORS.gold : COLORS.terra;
  const lines = doc.splitTextToSize(body, CONTENT_W - 12);
  const h = 15 + lines.length * 4;
  doc.setFillColor(...fill);
  doc.roundedRect(MARGIN, y, CONTENT_W, h, 2, 2, "F");
  doc.setFillColor(...accent);
  doc.roundedRect(MARGIN, y, 3, h, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.ink);
  doc.text(title.toUpperCase(), MARGIN + 7, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(lines, MARGIN + 7, y + 11);
  return y + h + 4;
}

function kpiCards(doc: jsPDF, y: number, items: Array<{ label: string; value: string; note?: string }>, columns = 4) {
  const gap = 3;
  const cellW = (CONTENT_W - gap * (columns - 1)) / columns;
  const cellH = 25;
  items.forEach((item, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = MARGIN + col * (cellW + gap);
    const yy = y + row * (cellH + gap);
    doc.setFillColor(...COLORS.white);
    doc.setDrawColor(...COLORS.line);
    doc.roundedRect(x, yy, cellW, cellH, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.7);
    doc.setTextColor(...COLORS.muted);
    doc.text(item.label.toUpperCase(), x + 3, yy + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(item.value.length > 18 ? 10 : 13);
    doc.setTextColor(...COLORS.greenDark);
    doc.text(item.value, x + 3, yy + 13);
    if (item.note) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(...COLORS.muted);
      doc.text(doc.splitTextToSize(item.note, cellW - 6).slice(0, 2), x + 3, yy + 18);
    }
  });
  return y + Math.ceil(items.length / columns) * (cellH + gap);
}

function bars(doc: jsPDF, y: number, items: Array<{ label: string; value: number; display: string }>, height = 54) {
  if (!items.length) return y;
  const max = Math.max(...items.map(item => Math.max(item.value, 0)), 1);
  const chartX = MARGIN + 28;
  const chartW = CONTENT_W - 48;
  const rowH = height / items.length;
  items.forEach((item, index) => {
    const yy = y + index * rowH;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(...COLORS.muted);
    doc.text(item.label, chartX - 3, yy + rowH * 0.63, { align: "right" });
    doc.setFillColor(...COLORS.greenSoft);
    doc.roundedRect(chartX, yy + 1.4, chartW, Math.max(rowH - 3, 2), 1, 1, "F");
    doc.setFillColor(...COLORS.green);
    doc.roundedRect(chartX, yy + 1.4, Math.max((chartW * item.value) / max, 1), Math.max(rowH - 3, 2), 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.ink);
    doc.text(item.display, chartX + chartW + 3, yy + rowH * 0.63);
  });
  return y + height + 3;
}

function dualLineChart(
  doc: jsPDF,
  y: number,
  items: Array<{ label: string; current: number | null; previous: number | null }>,
  labels: { current: string; previous: string },
  height = 60,
) {
  const values = items.flatMap(item => [item.current, item.previous]).filter((value): value is number => value !== null && Number.isFinite(value));
  if (items.length < 2 || !values.length) return y;
  const max = Math.max(...values, 1);
  const chartX = MARGIN + 20;
  const chartY = y + 8;
  const chartW = CONTENT_W - 26;
  const chartH = height - 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.6);
  doc.setTextColor(...COLORS.muted);
  [0, 0.5, 1].forEach(ratio => {
    const yy = chartY + chartH - chartH * ratio;
    doc.setDrawColor(...COLORS.line);
    doc.line(chartX, yy, chartX + chartW, yy);
    doc.text(fmtMoney(max * ratio, true), chartX - 3, yy + 1.5, { align: "right" });
  });
  const xOf = (index: number) => chartX + (chartW * index) / Math.max(items.length - 1, 1);
  const yOf = (value: number) => chartY + chartH - (chartH * value) / max;
  const draw = (key: "current" | "previous", color: [number, number, number]) => {
    doc.setDrawColor(...color);
    doc.setFillColor(...color);
    doc.setLineWidth(0.75);
    let previousPoint: { x: number; y: number } | null = null;
    items.forEach((item, index) => {
      const value = item[key];
      if (value === null) { previousPoint = null; return; }
      const point = { x: xOf(index), y: yOf(value) };
      if (previousPoint) doc.line(previousPoint.x, previousPoint.y, point.x, point.y);
      doc.circle(point.x, point.y, 1.15, "F");
      previousPoint = point;
    });
  };
  draw("previous", COLORS.gold);
  draw("current", COLORS.green);
  items.forEach((item, index) => doc.text(item.label, xOf(index), chartY + chartH + 5, { align: "center" }));
  doc.setFillColor(...COLORS.green);
  doc.rect(chartX, y, 4, 2, "F");
  doc.text(labels.current, chartX + 6, y + 2);
  doc.setFillColor(...COLORS.gold);
  doc.rect(chartX + 42, y, 4, 2, "F");
  doc.text(labels.previous, chartX + 48, y + 2);
  return y + height + 4;
}

function stackedAudienceBars(
  doc: jsPDF,
  y: number,
  items: Array<{ label: string; first: number; second: number }>,
  labels: { first: string; second: string },
  height = 48,
) {
  if (!items.length) return y;
  const chartX = MARGIN + 31;
  const chartW = CONTENT_W - 48;
  const rowH = height / items.length;
  items.forEach((item, index) => {
    const total = Math.max(item.first + item.second, 0.0001);
    const yy = y + 8 + index * rowH;
    const firstW = chartW * (item.first / total);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(item.label, chartX - 3, yy + rowH * 0.58, { align: "right" });
    doc.setFillColor(...COLORS.gold);
    doc.rect(chartX, yy + 1, firstW, Math.max(rowH - 3, 2), "F");
    doc.setFillColor(...COLORS.green);
    doc.rect(chartX + firstW, yy + 1, chartW - firstW, Math.max(rowH - 3, 2), "F");
    doc.setTextColor(...COLORS.ink);
    doc.text(fmtPct(item.first + item.second), chartX + chartW + 3, yy + rowH * 0.58);
  });
  doc.setFillColor(...COLORS.gold);
  doc.rect(chartX, y, 4, 2, "F");
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(6.6);
  doc.text(labels.first, chartX + 6, y + 2);
  doc.setFillColor(...COLORS.green);
  doc.rect(chartX + 38, y, 4, 2, "F");
  doc.text(labels.second, chartX + 44, y + 2);
  return y + height + 10;
}

function table(doc: jsPDF, y: number, head: string[], body: Array<Array<string | number>>, options: { widths?: Record<number, number>; fontSize?: number } = {}) {
  autoTable(doc, {
    startY: y,
    head: [head],
    body,
    theme: "plain",
    styles: { font: "helvetica", fontSize: options.fontSize ?? 7.4, cellPadding: 2.1, textColor: COLORS.ink, lineColor: COLORS.line, lineWidth: 0.2, valign: "middle" },
    headStyles: { fillColor: COLORS.green, textColor: COLORS.white, fontStyle: "bold", fontSize: options.fontSize ?? 7.4 },
    alternateRowStyles: { fillColor: COLORS.cream },
    margin: { left: MARGIN, right: MARGIN },
    columnStyles: Object.fromEntries(
      Object.entries(options.widths ?? {}).map(([column, cellWidth]) => [column, { cellWidth }]),
    ),
  });
  return ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 4;
}

function sectionLabel(doc: jsPDF, y: number, value: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.green);
  doc.text(value.toUpperCase(), MARGIN, y);
  doc.setDrawColor(...COLORS.gold);
  doc.line(MARGIN, y + 2, PAGE_W - MARGIN, y + 2);
  return y + 7;
}

function demographicsRows(value: Record<string, unknown> | null | undefined, key: string, limit = 8) {
  const rows = value?.[key];
  return Array.isArray(rows) ? rows.slice(0, limit) as Array<Record<string, unknown>> : [];
}

function addFooters(doc: jsPDF, report: Weekly360Report) {
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...COLORS.line);
    doc.line(MARGIN, PAGE_H - 12, PAGE_W - MARGIN, PAGE_H - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(...COLORS.muted);
    doc.text("Uso interno · Hopi Hari · dados consolidados com rastreabilidade de fonte", MARGIN, PAGE_H - 7);
    doc.text(`${page} / ${total}`, PAGE_W - MARGIN, PAGE_H - 7, { align: "right" });
  }
}

export async function exportWeekly360Pdf(report: Weekly360Report) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const hasFraunces = await installFraunces(doc);
  const titleFont = displayFont(hasFraunces);
  let chapterIndex = 0;
  const chapter = (title: string) => `${String(++chapterIndex).padStart(2, "0")} · ${title}`;

  // 1. Cover
  doc.setFillColor(...COLORS.greenDark);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");
  doc.setFillColor(...COLORS.green);
  doc.circle(PAGE_W - 18, 32, 42, "F");
  doc.setFillColor(...COLORS.gold);
  doc.circle(PAGE_W - 18, 32, 21, "F");
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.7);
  doc.line(MARGIN, 55, 58, 55);
  doc.setTextColor(...COLORS.white);
  doc.setFont(titleFont, "bold");
  doc.setFontSize(30);
  doc.text("Hopi Hari", MARGIN, 80);
  doc.setFontSize(25);
  doc.text("Relatório Executivo", MARGIN, 102);
  doc.setFontSize(34);
  doc.text("360°", MARGIN, 119);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("Tese semanal de operação, audiência, campanhas e crescimento", MARGIN, 134);
  doc.setFillColor(...COLORS.cream);
  doc.roundedRect(MARGIN, 166, 112, 38, 3, 3, "F");
  doc.setTextColor(...COLORS.greenDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("PERÍODO ANALISADO", MARGIN + 7, 176);
  doc.setFont(titleFont, "bold");
  doc.setFontSize(17);
  doc.text(`${fmtDate(report.report.periodStart)} — ${fmtDate(report.report.periodEnd)}`, MARGIN + 7, 188);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Cobertura ${report.report.coverageStatus === "complete" ? "completa" : "parcial"} · gerado em ${new Date(report.report.generatedAt).toLocaleString("pt-BR")}`, MARGIN + 7, 197);
  doc.setTextColor(220, 235, 229);
  doc.setFontSize(8.5);
  doc.text("Plataforma de Inteligência · documento confidencial para decisão executiva", MARGIN, PAGE_H - 21);

  // 2. Executive thesis
  let y = addPage(doc, report, chapter("Tese executiva"), hasFraunces);
  y = chapterTitle(doc, y, "A semana em uma tese", "Leitura integrada, com limites de evidência explícitos", hasFraunces);
  y = callout(doc, y, "Diagnóstico central", report.executive.thesis, report.report.coverageStatus === "complete" ? "green" : "gold");
  y = kpiCards(doc, y, [
    { label: "Receita observada", value: fmtMoneyFromCents(report.operations.revenueTotalCents, true), note: `${report.operations.observedRevenueDays} dias de fechamento` },
    { label: "Público observado", value: fmtInteger(report.operations.visitors), note: `${report.operations.observedAttendanceDays} dias com público` },
    { label: "Seguidores", value: fmtInteger(report.followers.totalFollowers), note: `${fmtSignedInteger(report.followers.weeklyDelta)} · ${fmtDate(report.followers.targetBaselineDate)} a ${fmtDate(report.followers.latestObservedDate)}` },
    { label: "Campanhas", value: fmtInteger(report.campaigns.inventory.synchronizedCount), note: `${fmtInteger(report.campaigns.inventory.synchronizedAssets)} ativos criativos` },
    { label: "Receita / visitante", value: fmtMoneyFromCents(report.operations.grossRevenuePerVisitorCents), note: "fechamentos observados" },
    { label: "Pagantes", value: fmtPct(report.operations.payingSharePct), note: "participação do público" },
    { label: "Fontes prontas", value: `${report.dataQuality.sourceCoverage.readySources}/${report.dataQuality.sourceCoverage.totalSources}`, note: "cobertura consolidada" },
    { label: "Posts vinculados", value: fmtInteger(report.campaigns.salesCorrelation.summary.matchedPosts), note: `${fmtInteger(report.campaigns.salesCorrelation.summary.campaignsWithPosts)} campanhas reconhecidas` },
  ]);
  y += 2;
  y = sectionLabel(doc, y, "Riscos prioritários");
  for (const risk of report.executive.risks.slice(0, 4)) y = callout(doc, y, "Atenção", risk, "terra");
  y = sectionLabel(doc, y, "Agenda executiva");
  report.executive.actions.slice(0, 3).forEach((action, index) => { y = callout(doc, y, `Prioridade ${index + 1}`, action, index === 0 ? "gold" : "green"); });

  // 3. Operations
  y = addPage(doc, report, chapter("Operação e faturamento"), hasFraunces);
  y = chapterTitle(doc, y, "Operação e faturamento", "Fechamentos observados no período", hasFraunces);
  y = kpiCards(doc, y, [
    { label: "Receita bruta", value: fmtMoneyFromCents(report.operations.revenueTotalCents, true) },
    { label: "Receita interna", value: fmtMoneyFromCents(report.operations.internalRevenueCents, true) },
    { label: "Receita externa", value: fmtMoneyFromCents(report.operations.externalRevenueCents, true) },
    { label: "Variação último dia", value: fmtPct(report.operations.latestRevenueChangePct), note: "vs. fechamento anterior" },
    { label: "Público", value: fmtInteger(report.operations.visitors) },
    { label: "Pagantes", value: fmtInteger(report.operations.payingVisitors) },
    { label: "Cortesias", value: fmtInteger(report.operations.complimentaryVisitors) },
    { label: "Variação de público", value: fmtPct(report.operations.latestAttendanceChangePct), note: "vs. fechamento anterior" },
  ]);
  y = sectionLabel(doc, y, "Fechamentos diários");
  const attendanceByDate = new Map(report.operations.attendanceDaily.map(row => [row.date, row]));
  y = table(doc, y, ["Data", "Receita bruta", "Interna", "Externa", "Público", "Pagantes", "Cortesias"], report.operations.revenueDaily.map(row => {
    const attendance = attendanceByDate.get(row.date);
    return [fmtDate(row.date), fmtMoneyFromCents(row.grossRevenueCents, true), fmtMoneyFromCents(row.internalRevenueCents, true), fmtMoneyFromCents(row.externalRevenueCents, true), fmtInteger(attendance?.publicCount), fmtInteger(attendance?.payingCount), fmtInteger(attendance?.complimentaryCount)];
  }), { fontSize: 7 });
  y = sectionLabel(doc, y, "Receita bruta por dia");
  bars(doc, y, report.operations.revenueDaily.map(row => ({ label: fmtDate(row.date).slice(0, 5), value: row.grossRevenueCents, display: fmtMoneyFromCents(row.grossRevenueCents, true) })), 50);

  // 4. Channels and commercial context
  y = addPage(doc, report, chapter("Canais e contexto comercial"), hasFraunces);
  y = chapterTitle(doc, y, "Canais e contexto comercial", "Composição operacional e referência mensal", hasFraunces);
  y = kpiCards(doc, y, [
    { label: "Mês comercial", value: safe(report.commercial.period) },
    { label: "Receita mensal", value: fmtMoney(report.commercial.revenue, true) },
    { label: "Volume mensal", value: fmtInteger(report.commercial.quantity) },
    { label: "Ticket médio", value: fmtMoney(report.commercial.averageTicket) },
    { label: "Receita YoY", value: fmtPct(report.commercial.revenueYoyPct) },
    { label: "Volume YoY", value: fmtPct(report.commercial.quantityYoyPct) },
    { label: "Receita distribuidores", value: fmtMoney(report.commercial.distributorRevenue, true) },
    { label: "Atingimento", value: fmtPct(report.commercial.distributorAttainmentPct) },
  ]);
  if (report.commercial.series.length >= 2) {
    y = sectionLabel(doc, y, "Faturamento / receita bruta mensal · ano contra ano");
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    y = dualLineChart(
      doc,
      y,
      report.commercial.series.map(item => ({
        label: months[item.month - 1] ?? String(item.month),
        current: item.currentRevenue,
        previous: item.previousRevenue,
      })),
      { current: String(report.commercial.currentYear), previous: String(report.commercial.previousYear) },
      66,
    );
  }
  y = sectionLabel(doc, y, "Ranking de canais na janela observada");
  y = table(doc, y, ["#", "Canal", "Grupo", "Classificação", "Receita"], report.operations.channels.slice(0, 10).map((row, index) => [index + 1, row.code, row.businessGroup, row.classification, fmtMoneyFromCents(row.revenueCents)]), { widths: { 0: 8, 1: 35, 4: 33 }, fontSize: 7.1 });
  y = callout(doc, Math.min(y, 255), "Nota de comparabilidade", "A linha anual usa somente meses já observados no ano atual; meses futuros não são convertidos em zero. Fechamentos operacionais diários permanecem separados porque não há série diária equivalente do ano anterior.", "gold");

  // 5. Social listening
  y = addPage(doc, report, chapter("Social listening"), hasFraunces);
  y = chapterTitle(doc, y, "Social listening", "Comparação semanal entre Facebook, Instagram e TikTok", hasFraunces);
  y = table(doc, y, ["Plataforma", "Dias", "Seguidores", "Views", "Interações", "Cliques", "Visitas", "Alcance / viewers"], report.social.platforms.map(platform => {
    const row = report.social.summary[platform];
    const reach = row.totals.reach ?? row.totals.viewers;
    return [platform === "facebook" ? "Facebook" : platform === "instagram" ? "Instagram" : "TikTok", row.observedDays, fmtInteger(row.latest.followers), fmtInteger(row.totals.views), fmtInteger(row.totals.interactions), fmtInteger(row.totals.linkClicks), fmtInteger(row.totals.visits ?? row.totals.profileViews), fmtInteger(reach)];
  }), { fontSize: 7 });
  y = sectionLabel(doc, y, "Interações observadas");
  y = bars(doc, y, report.social.platforms.map(platform => ({ label: platform === "facebook" ? "Facebook" : platform === "instagram" ? "Instagram" : "TikTok", value: report.social.summary[platform].totals.interactions ?? 0, display: fmtInteger(report.social.summary[platform].totals.interactions) })), 43);
  y = sectionLabel(doc, y, "Série diária disponível");
  y = table(doc, y, ["Data", "Facebook", "Instagram", "TikTok"], report.social.rows.slice(0, 7).reverse().map(row => [fmtDate(row.date), fmtInteger(row.facebook?.interactions), fmtInteger(row.instagram?.interactions), fmtInteger(row.tiktok?.interactions)]), { fontSize: 7.3 });
  y = callout(doc, y, "Leitura correta", "Métricas sociais são exibidas somente quando observadas. Totais permanecem indisponíveis quando há lacunas em uma série; a ausência não é convertida em zero.", "green");
  const horrorSignals = report.campaigns.horaDoHorrorSignals;
  if (horrorSignals.search.eligible) {
    y = sectionLabel(doc, y, "Hora do Horror · demanda de busca");
    y = kpiCards(doc, y, [
      { label: "Dias observados", value: fmtInteger(horrorSignals.search.observedDays) },
      { label: "Cliques", value: fmtInteger(horrorSignals.search.clicks) },
      { label: "Impressões", value: fmtInteger(horrorSignals.search.impressions) },
      { label: "Consultas", value: fmtInteger(horrorSignals.search.queryRows) },
    ]);
    y = bars(doc, y, horrorSignals.search.topQueries.slice(0, 5).map(item => ({
      label: item.query.slice(0, 22),
      value: item.impressions,
      display: fmtInteger(item.impressions),
    })), 38);
  }
  if (horrorSignals.social.eligible || horrorSignals.reputation.eligible) {
    y = sectionLabel(doc, y, "Hora do Horror · conversa e reputação");
    const items: Array<{ label: string; value: string; note?: string }> = [];
    if (horrorSignals.social.eligible) items.push({ label: "Menções sociais", value: fmtInteger(horrorSignals.social.mentions), note: `sentimento ${fmtPct(horrorSignals.social.score)}` });
    if (horrorSignals.reputation.eligible) items.push({ label: "Avaliações", value: fmtInteger(horrorSignals.reputation.reviews), note: `nota ${horrorSignals.reputation.averageRating?.toFixed(2).replace(".", ",") ?? "—"}` });
    y = kpiCards(doc, y, items, Math.min(items.length, 2));
  }

  // 6. Followers
  y = addPage(doc, report, chapter("Seguidores e metas"), hasFraunces);
  y = chapterTitle(doc, y, "Base de seguidores", "Composição, variação semanal e progresso de metas", hasFraunces);
  y = kpiCards(doc, y, [
    { label: "Base consolidada", value: fmtInteger(report.followers.totalFollowers) },
    { label: "Variação semanal", value: fmtSignedInteger(report.followers.weeklyDelta), note: `${fmtDate(report.followers.targetBaselineDate)} — ${fmtDate(report.followers.latestObservedDate)}` },
    { label: "Meta consolidada", value: fmtInteger(report.followers.totalGoal), note: fmtPct((report.followers.totalFollowers / report.followers.totalGoal) * 100) },
    { label: "Meta Instagram", value: fmtInteger(report.followers.instagramGoal), note: "fonte: log diário" },
  ]);
  y = table(doc, y, ["Plataforma", "Seguidores", "Var. semanal", "Data base", "Atualizado em"], report.followers.items.map(item => [item.platform, fmtInteger(item.followers), item.weeklyDelta === null ? "Indisponível" : `${item.weeklyDelta >= 0 ? "+" : ""}${fmtInteger(item.weeklyDelta)}`, fmtDate(item.baselineDate), fmtDate(item.latestDate)]), { fontSize: 7.5 });
  y = sectionLabel(doc, y, "Composição da base");
  y = bars(doc, y, report.followers.items.map(item => ({ label: item.platform, value: item.followers ?? 0, display: fmtInteger(item.followers) })), 67);
  callout(doc, y, "Sincronização", report.dataQuality.followerSync.lastRun?.status === "completed" ? `Google Sheet · Log Diário sincronizado. Última execução: ${new Date(report.dataQuality.followerSync.lastRun.completedAt).toLocaleString("pt-BR")}; ${fmtInteger(report.dataQuality.followerSync.lastRun.rowsSeen)} linhas vistas e ${fmtInteger(report.dataQuality.followerSync.lastRun.rowsRejected)} rejeitadas.` : "A sincronização periódica está configurada, mas a primeira execução concluída ainda não foi registrada.", "green");

  // 7. Audience composition
  y = addPage(doc, report, chapter("Audiência das plataformas"), hasFraunces);
  y = chapterTitle(doc, y, "Quem compõe a audiência social", "Composição visual das amostras demográficas disponíveis", hasFraunces);
  const igAge = demographicsRows(report.audience.instagram.demographics, "ageGender", 7);
  if (igAge.length) {
    y = sectionLabel(doc, y, "Instagram · idade e gênero");
    y = stackedAudienceBars(doc, y, igAge.map(row => ({
      label: safe(row.age),
      first: Number(row.womenPct ?? 0),
      second: Number(row.menPct ?? 0),
    })), { first: "Mulheres", second: "Homens" }, 48);
  }
  const cities = demographicsRows(report.audience.instagram.demographics, "cities", 6);
  if (cities.length) {
    y = sectionLabel(doc, y, "Instagram · principais cidades");
    y = bars(doc, y, cities.map(row => ({ label: safe(row.name).slice(0, 24), value: Number(row.sharePct ?? 0), display: fmtPct(Number(row.sharePct ?? 0)) })), 38);
  }
  const tkGender = demographicsRows(report.audience.tiktok.demographics, "gender", 4);
  const tkTerritory = demographicsRows(report.audience.tiktok.demographics, "territories", 6);
  if (tkGender.length) {
    y = sectionLabel(doc, y, "TikTok · gênero");
    y = bars(doc, y, tkGender.map(row => ({ label: safe(row.name), value: Number(row.sharePct ?? 0), display: fmtPct(Number(row.sharePct ?? 0)) })), 24);
  }
  if (tkTerritory.length) {
    y = sectionLabel(doc, y, "TikTok · territórios");
    bars(doc, y, tkTerritory.map(row => ({ label: safe(row.name).slice(0, 24), value: Number(row.sharePct ?? 0), display: fmtPct(Number(row.sharePct ?? 0)) })), 38);
  }

  y = addPage(doc, report, chapter("CRM e base cadastrada"), hasFraunces);
  y = chapterTitle(doc, y, "Audiência proprietária e demanda", "Somente agregados; nenhum CPF ou identificador individual", hasFraunces);
  const audienceKpis: Array<{ label: string; value: string; note?: string }> = [{ label: "Leads CRM", value: fmtInteger(report.audience.crm.totalLeads) }];
  if (report.audience.reputation.sampleSize >= 5) {
    audienceKpis.push(
      { label: "Avaliações", value: fmtInteger(report.audience.reputation.sampleSize) },
      { label: "Positivas", value: fmtInteger(report.audience.reputation.positive) },
      { label: "Nota média", value: report.audience.reputation.averageRating === null ? "Indisponível" : report.audience.reputation.averageRating.toFixed(2).replace(".", ",") },
    );
  }
  y = kpiCards(doc, y, audienceKpis, Math.min(audienceKpis.length, 4));
  const customerAges = report.audience.crm.customerDemographics.ageGroups.slice(0, 8);
  if (customerAges.length) {
    y = sectionLabel(doc, y, "Base cadastrada · faixas etárias");
    y = bars(doc, y, customerAges.map(item => ({ label: item.label, value: item.customers, display: fmtInteger(item.customers) })), 45);
  }
  const customerGenders = report.audience.crm.customerDemographics.genders.slice(0, 5);
  if (customerGenders.length) {
    y = sectionLabel(doc, y, "Base cadastrada · gênero");
    y = bars(doc, y, customerGenders.map(item => ({ label: item.label, value: item.customers, display: fmtInteger(item.customers) })), 30);
  }
  const states = report.audience.crm.topStates.slice(0, 6);
  if (states.length) {
    y = sectionLabel(doc, y, "Demanda CRM · estados");
    y = bars(doc, y, states.map(item => ({ label: item.state, value: item.leads, display: fmtInteger(item.leads) })), 36);
  }
  if (report.audience.crm.cpfRegions.length) {
    y = sectionLabel(doc, y, "Compradores online · regiões agregadas de CPF");
    bars(doc, y, report.audience.crm.cpfRegions.slice(0, 6).map(item => ({ label: item.label.slice(0, 24), value: item.registrations, display: fmtInteger(item.registrations) })), 36);
  }

  // 8. Campaigns
  y = addPage(doc, report, chapter("Campanhas e criativos"), hasFraunces);
  y = chapterTitle(doc, y, "Campanhas e criativos", "Biblioteca, proveniência e prontidão de mensuração", hasFraunces);
  y = kpiCards(doc, y, [
    { label: "Campanhas Drive", value: fmtInteger(report.campaigns.inventory.synchronizedCount) },
    { label: "Criativos", value: fmtInteger(report.campaigns.inventory.synchronizedAssets) },
    { label: "Imagens", value: fmtInteger(report.campaigns.inventory.synchronizedImages) },
    { label: "Vídeos", value: fmtInteger(report.campaigns.inventory.synchronizedVideos) },
    { label: "Arquivos verificados", value: fmtInteger(report.campaigns.verifiedArchiveCount) },
    { label: "Ativos correspondentes", value: fmtInteger(report.campaigns.verifiedArchiveAssets) },
    { label: "Reconhecidas em posts", value: fmtInteger(report.campaigns.salesCorrelation.summary.campaignsWithPosts) },
    { label: "Posts vinculados", value: fmtInteger(report.campaigns.salesCorrelation.summary.matchedPosts) },
  ]);
  y = sectionLabel(doc, y, "Biblioteca recente");
  y = table(doc, y, ["Campanha", "Criativos", "Imagens", "Vídeos"], report.campaigns.inventory.latestLibrary.map(item => [item.name, item.assets, item.images, item.videos]), { fontSize: 7.5 });
  y = sectionLabel(doc, y, "Pacotes enviados e verificados");
  y = table(doc, y, ["Campanha", "Arquivo", "Ativos", "Status"], report.campaigns.archiveImports.slice(0, 8).map(item => [item.campaignName, item.archiveName, item.matchedAssetCount, item.verificationStatus === "verified_match" ? "Correspondência verificada" : "Revisão necessária"]), { widths: { 0: 42, 1: 83, 2: 18 }, fontSize: 6.8 });
  callout(doc, y, "Regra de atribuição", "Campanhas são reconhecidas por nomes, hashtags e aliases distintivos nos posts. UTM, código promocional ou vínculo transacional continua necessário para atribuição direta de vendas.", "gold");

  const campaignsWithPosts = report.campaigns.salesCorrelation.campaigns.filter(item => item.postEvidence);
  if (campaignsWithPosts.length) {
    y = addPage(doc, report, chapter("Campanhas reconhecidas em posts"), hasFraunces);
    y = chapterTitle(doc, y, "Campanhas publicadas e vendas", "Conteúdo reconhecido; resultados comerciais somente com amostra suficiente", hasFraunces);
    y = table(doc, y, ["Campanha", "Posts", "Plataformas", "Janela observada", "Origem"], campaignsWithPosts.slice(0, 14).map(item => [
      item.name,
      item.postEvidence?.posts ?? 0,
      item.postEvidence?.platforms.join(", ") ?? "—",
      item.periodStart && item.periodEnd ? `${fmtDate(item.periodStart)} — ${fmtDate(item.periodEnd)}` : "—",
      item.periodSource === "official" ? "Oficial" : "Posts",
    ]), { widths: { 0: 48, 2: 43, 3: 46 }, fontSize: 6.7 });
    const readyCampaigns = report.campaigns.salesCorrelation.campaigns.filter(item => item.status === "ready" && item.deltas);
    if (readyCampaigns.length) {
      y = sectionLabel(doc, y, "Campanhas com evidência comercial suficiente");
      y = callout(doc, y, "Metodologia", report.campaigns.salesCorrelation.methodology, "green");
      y = table(doc, y, ["Campanha", "Período", "Var. receita", "Var. público", "Var. ingressos"], readyCampaigns.slice(0, 8).map(item => [
        item.name,
        `${fmtDate(item.periodStart)} — ${fmtDate(item.periodEnd)}`,
        fmtPct(item.deltas?.grossRevenuePct),
        fmtPct(item.deltas?.visitorsPct),
        fmtPct(item.deltas?.ticketRevenuePct),
      ]), { widths: { 0: 54, 1: 46 }, fontSize: 6.9 });
    }
  }

  // Grounded strategy and briefing
  y = addPage(doc, report, chapter("Estratégia e briefing"), hasFraunces);
  y = chapterTitle(doc, y, "Estratégia de crescimento", "Somente análises persistidas e sustentadas por dados processados", hasFraunces);
  if (report.strategy.latestBriefing) {
    y = callout(doc, y, `Briefing de ${fmtDate(report.strategy.latestBriefing.reportDate)}`, sanitizeBriefingSummary(report.strategy.latestBriefing.executiveSummary), "green");
    y = kpiCards(doc, y, [
      { label: "Status", value: report.strategy.latestBriefing.status },
      { label: "Áudio", value: report.strategy.latestBriefing.audioReady ? "Pronto" : "Pendente" },
      { label: "Gerado em", value: new Date(report.strategy.latestBriefing.generatedAt).toLocaleDateString("pt-BR") },
      { label: "Título", value: report.strategy.latestBriefing.title },
    ]);
  } else {
    y = callout(doc, y, "Briefing diário", "Nenhum briefing persistido está disponível para esta exportação.", "terra");
  }
  const globalStrategy = asRecord(report.strategy.globalInstagramReport);
  y = sectionLabel(doc, y + 2, "Relatório global de Instagram");
  if (globalStrategy) {
    y = callout(doc, y, "Visão consolidada", safe(globalStrategy.overview), "green");
    const winning = stringList(globalStrategy.winningThemes);
    const losing = stringList(globalStrategy.losingThemes);
    if (winning.length || losing.length) {
      y = table(doc, y, ["Temas que funcionam", "Temas a evitar"], Array.from({ length: Math.max(winning.length, losing.length, 1) }, (_, index) => [winning[index] ?? "—", losing[index] ?? "—"]), { fontSize: 7.2 });
    }
    if (typeof globalStrategy.contentMixRecommendation === "string") y = callout(doc, y, "Mix de conteúdo", globalStrategy.contentMixRecommendation, "gold");
    if (typeof globalStrategy.postingCadenceRecommendation === "string") y = callout(doc, y, "Cadência", globalStrategy.postingCadenceRecommendation, "green");
  } else {
    y = callout(doc, y, "Análise global", "Nenhum relatório global persistido está disponível. A exportação não gera conteúdo novo durante o download.", "terra");
  }

  // Executive action plan
  y = addPage(doc, report, chapter("Plano de ação"), hasFraunces);
  y = chapterTitle(doc, y, "Decisões para a próxima semana", "Prioridades, riscos e movimentos mensuráveis", hasFraunces);
  y = callout(doc, y, "Governança", report.strategy.governanceNote, "gold");
  if (globalStrategy && typeof globalStrategy.engagementInsights === "string") {
    y = callout(doc, y, "Insight de engajamento", globalStrategy.engagementInsights, "green");
  }
  y = sectionLabel(doc, y, "Recomendações priorizadas");
  y = table(doc, y, ["#", "Recomendação"], report.strategy.recommendations.slice(0, 10).map((item, index) => [index + 1, item]), { widths: { 0: 10 }, fontSize: 7.7 });
  y = sectionLabel(doc, y, "Riscos de leitura");
  y = table(doc, y, ["#", "Risco / limitação"], report.executive.risks.length ? report.executive.risks.map((item, index) => [index + 1, item]) : [[1, "Nenhum risco adicional registrado na consolidação."]], { widths: { 0: 10 }, fontSize: 7.7 });
  y = callout(doc, y, "Critério de sucesso", "A próxima exportação deve mostrar maior cobertura operacional, campanhas com períodos oficiais e sinais de intenção vinculados por UTM ou código promocional.", "green");

  // Sources
  y = addPage(doc, report, chapter("Fontes e metodologia"), hasFraunces);
  y = chapterTitle(doc, y, "Fontes, cobertura e método", "Transparência para leitura executiva", hasFraunces);
  y = callout(doc, y, "Método", report.report.methodology, "green");
  y = kpiCards(doc, y, [
    { label: "Fontes prontas", value: `${report.dataQuality.sourceCoverage.readySources}/${report.dataQuality.sourceCoverage.totalSources}` },
    { label: "Receita observada", value: `${report.operations.observedRevenueDays}/7 dias` },
    { label: "Público observado", value: `${report.operations.observedAttendanceDays}/7 dias` },
    { label: "Período", value: `${fmtDate(report.report.periodStart)} — ${fmtDate(report.report.periodEnd)}` },
  ]);
  y = sectionLabel(doc, y, "Fontes operacionais");
  y = table(doc, y, ["Fonte", "Status", "Linhas", "Rejeitadas", "Concluída em"], report.dataQuality.operationalSources.map(source => [source.name, source.status, source.rowsSeen, source.rowsRejected, source.completedAt ? new Date(source.completedAt).toLocaleString("pt-BR") : "Indisponível"]), { fontSize: 7 });
  y = sectionLabel(doc, y, "Avisos de cobertura");
  const warnings = [...report.dataQuality.warnings, ...report.dataQuality.sourceCoverage.warnings];
  if (warnings.length) [...new Set(warnings)].slice(0, 2).forEach(warning => { y = callout(doc, y, "Cobertura parcial", warning, "terra"); });
  else y = callout(doc, y, "Cobertura íntegra", "Nenhum aviso de fonte foi registrado na consolidação.", "green");
  callout(doc, Math.min(y, 240), "Nota final", "Este documento resume dados disponíveis na plataforma na data de geração. Valores indisponíveis não são tratados como zero. Recomendações distinguem fatos observados de hipóteses operacionais.", "gold");

  addFooters(doc, report);
  const fileName = reportFileName(report);
  doc.setProperties({ title: report.report.title, subject: `Relatório semanal ${report.report.periodStart} a ${report.report.periodEnd}`, author: "Hopi Hari · Plataforma de Inteligência", keywords: "Hopi Hari, BI, relatório semanal, 360" });
  doc.save(fileName);
  return fileName;
}

export { reportFileName as buildWeekly360PdfFileName };
