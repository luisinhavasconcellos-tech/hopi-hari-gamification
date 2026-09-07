import { describe, expect, it } from "vitest";
import {
  buildPageMetricsPdfFileName,
  exportPageMetricsPdf,
} from "@/lib/exportPagePdf";

describe("page metrics PDF export", () => {
  it("builds a safe, dated Portuguese report filename", () => {
    expect(
      buildPageMetricsPdfFileName(
        "Hopi Hari · Audience Visão Geral",
        new Date(2026, 7, 29, 12, 0, 0),
      ),
    ).toBe("hopi-hari-audience-visao-geral-2026-08-29.pdf");
  });

  it("fails clearly when the requested metric region is unavailable", async () => {
    await expect(
      exportPageMetricsPdf({
        targetId: "missing-report-target",
        reportTitle: "Relatório",
        fileNamePrefix: "hopi-hari-relatorio",
      }),
    ).rejects.toThrow("Área do relatório não encontrada.");
  });
});
