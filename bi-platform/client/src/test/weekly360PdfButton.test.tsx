import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refetch: vi.fn(),
  exportPdf: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    weekly360Report: {
      get: {
        useQuery: () => ({ refetch: mocks.refetch }),
      },
    },
  },
}));

vi.mock("@/lib/exportWeekly360Pdf", () => ({
  exportWeekly360Pdf: mocks.exportPdf,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

import Weekly360PdfButton from "@/components/Weekly360PdfButton";

describe("Weekly360PdfButton", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches the protected consolidated contract and exports one weekly report", async () => {
    const payload = { report: { periodStart: "2026-08-24", periodEnd: "2026-08-30" } };
    mocks.refetch.mockResolvedValue({ data: payload, error: null });
    mocks.exportPdf.mockResolvedValue("hopi-hari-relatorio-360-semana-2026-08-24-a-2026-08-30.pdf");
    render(<Weekly360PdfButton />);

    fireEvent.click(screen.getByRole("button", { name: /Exportar relatório executivo Hopi Hari 360 graus da semana/i }));
    expect(screen.getByRole("button", { name: /Gerando relatório executivo Hopi Hari 360 graus/i })).toBeDisabled();

    await waitFor(() => expect(mocks.exportPdf).toHaveBeenCalledWith(payload));
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Relatório 360° pronto" }));
  });

  it("surfaces a safe error and restores the control", async () => {
    mocks.refetch.mockResolvedValue({ data: undefined, error: new Error("Fonte consolidada indisponível") });
    render(<Weekly360PdfButton />);

    fireEvent.click(screen.getByRole("button", { name: /Exportar relatório executivo/i }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Não foi possível gerar o relatório 360°",
      variant: "destructive",
    })));
    expect(screen.getByRole("button", { name: /Exportar relatório executivo/i })).toBeEnabled();
  });
});
