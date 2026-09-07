import fs from "node:fs";
import path from "node:path";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  exportPdf: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/lib/exportPagePdf", () => ({
  exportPageMetricsPdf: mocks.exportPdf,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

import PageMetricPdfButton from "@/components/PageMetricPdfButton";

describe("PageMetricPdfButton", () => {
  it("shows progress and exports the configured page report", async () => {
    let finish!: (value: string) => void;
    mocks.exportPdf.mockReturnValueOnce(
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
    );

    render(
      <PageMetricPdfButton
        targetId="dashboard-metrics-report"
        reportTitle="Dashboard principal · Métricas consolidadas"
        fileNamePrefix="hopi-hari-dashboard-metricas"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Exportar PDF" }));
    expect(screen.getByRole("button", { name: "Gerando PDF…" })).toBeDisabled();
    expect(mocks.exportPdf).toHaveBeenCalledWith({
      targetId: "dashboard-metrics-report",
      reportTitle: "Dashboard principal · Métricas consolidadas",
      fileNamePrefix: "hopi-hari-dashboard-metricas",
    });

    finish("hopi-hari-dashboard-metricas-2026-08-29.pdf");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Exportar PDF" })).toBeEnabled();
    });
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "PDF pronto" }),
    );
  });

  it("has been replaced by the unified weekly 360 report on both protected pages", () => {
    const dashboard = fs.readFileSync(
      path.resolve(process.cwd(), "client/src/pages/DashboardPage.tsx"),
      "utf8",
    );
    const audience = fs.readFileSync(
      path.resolve(process.cwd(), "client/src/pages/AudienceIntelligencePage.tsx"),
      "utf8",
    );

    expect(dashboard).toContain('id="dashboard-metrics-report"');
    expect(dashboard).toContain("<Weekly360PdfButton />");
    expect(dashboard).not.toContain('targetId="dashboard-metrics-report"');
    expect(audience).toContain('id="audience-overview-report"');
    expect(audience).toContain("<Weekly360PdfButton />");
    expect(audience).not.toContain('targetId="audience-overview-report"');
  });
});
