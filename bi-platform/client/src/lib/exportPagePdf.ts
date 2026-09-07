import jsPDF from "jspdf";

type PageMetricsPdfOptions = {
  targetId: string;
  reportTitle: string;
  fileNamePrefix: string;
};

const BRAND_GREEN: [number, number, number] = [0, 107, 89];
const BRAND_GOLD: [number, number, number] = [217, 160, 43];

function localDateStamp(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildPageMetricsPdfFileName(prefix: string, date = new Date()) {
  const safePrefix = prefix
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${safePrefix || "hopi-hari-relatorio"}-${localDateStamp(date)}.pdf`;
}

export async function exportPageMetricsPdf({
  targetId,
  reportTitle,
  fileNamePrefix,
}: PageMetricsPdfOptions) {
  const target = document.getElementById(targetId);
  if (!target) {
    throw new Error("Área do relatório não encontrada.");
  }

  const generatedAt = new Date();
  const fileName = buildPageMetricsPdfFileName(fileNamePrefix, generatedAt);
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  await doc.html(target, {
    x: 32,
    y: 64,
    width: pageWidth - 64,
    windowWidth: Math.max(target.scrollWidth, 1120),
    autoPaging: "text",
    margin: [64, 32, 44, 32],
    html2canvas: {
      backgroundColor: "#F3EEE0",
      logging: false,
      scale: 0.8,
      useCORS: true,
      ignoreElements: (element) =>
        element instanceof HTMLElement && element.dataset.pdfIgnore === "true",
    },
  });

  const totalPages = doc.getNumberOfPages();
  const generatedLabel = generatedAt.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setFillColor(...BRAND_GREEN);
    doc.rect(0, 0, pageWidth, 46, "F");
    doc.setFillColor(...BRAND_GOLD);
    doc.rect(0, 46, pageWidth, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("HOPI HARI · PLATAFORMA DE INTELIGÊNCIA", 32, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(reportTitle, 32, 35);
    doc.text(`Gerado em ${generatedLabel}`, pageWidth - 32, 35, { align: "right" });

    doc.setDrawColor(217, 160, 43);
    doc.line(32, pageHeight - 28, pageWidth - 32, pageHeight - 28);
    doc.setTextColor(80, 80, 74);
    doc.setFontSize(8);
    doc.text(`Página ${page} de ${totalPages}`, pageWidth - 32, pageHeight - 15, {
      align: "right",
    });
  }

  doc.save(fileName);
  return fileName;
}
