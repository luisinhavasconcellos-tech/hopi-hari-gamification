import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CampaignArchiveImportPanel from "@/components/CampaignArchiveImportPanel";

const queryMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/trpc", () => ({
  trpc: {
    campaignArchiveImports: {
      list: { useQuery: (...args: unknown[]) => queryMock(...args) },
    },
  },
}));

describe("CampaignArchiveImportPanel", () => {
  afterEach(() => vi.clearAllMocks());

  it("summarizes verified uploaded archives without claiming sales attribution", () => {
    queryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: [{ id: 1, archiveName: "HoraDoHorror2026.zip", campaignName: "Hora do Horror 2026", driveFolderId: "folder", totalFiles: 33, imageFiles: 12, videoFiles: 21, matchedAssetCount: 33, verificationStatus: "verified_match", importedAt: "2026-08-31T20:00:00.000Z" }],
    });
    render(<CampaignArchiveImportPanel />);
    expect(screen.getByText("Pacotes de campanha adicionados")).toBeInTheDocument();
    expect(screen.getByText("Hora do Horror 2026")).toBeInTheDocument();
    expect(screen.getByText("33")).toBeInTheDocument();
    expect(screen.getByText(/não determina o período oficial/)).toBeInTheDocument();
  });

  it("renders a safe error state", () => {
    queryMock.mockReturnValue({ isLoading: false, error: new Error("unavailable"), data: undefined });
    render(<CampaignArchiveImportPanel />);
    expect(screen.getByText("Não foi possível carregar a verificação dos arquivos de campanha.")).toBeInTheDocument();
  });
});
