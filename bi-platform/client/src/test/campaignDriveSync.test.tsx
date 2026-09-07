import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CampaignsPage from "@/pages/audience/CampaignsPage";

vi.mock("@/hooks/useCampaigns", () => ({
  driveThumb: (id: string) => `https://drive.google.com/thumbnail?id=${id}`,
  LAGS: [1, 3, 7],
  useCampaigns: () => ({
    loading: false,
    hasData: true,
    campaigns: [{
      id: "folder-vai-brasil", slug: "vai-brasil", name: "Vai Brasil", brand: null,
      period_start: null, period_end: null, source: "Google Drive",
      summary: {
        drive_folder_id: "folder-vai-brasil", folder_url: "https://drive.google.com/drive/folders/folder-vai-brasil",
        assets: { total: 12, images: 12, videos: 0 }, formats: ["png", "1080x1080"], subfolders: [],
        previews: [{ id: "asset-1", name: "Meta 1080x1080.png" }],
      },
      interactions: 0, views: 0, engagementPerPost: 0, viewRate: null, posts: 0, byPlatform: [], topPosts: [],
      followerStart: null, followerEnd: null, followerGain: null, followerGainPerDay: null,
      lagGainPerDay: { 1: null, 3: null, 7: null }, airEnd: null, followerDays: [], window: { start: null, end: null },
    }],
    totalCampaigns: 18,
    totalAssets: 435,
    totalVideos: 112,
    totalInteractions: 0,
    byInteractions: [],
    correlations: [],
    correlationSample: [],
    baselineGainPerDay: null,
    campaignGainPerDay: null,
    lagAnalysis: [],
    lagSample: [],
    bestLag: null,
    driveSources: [{
      name: "Hopi Hari campaign Drive", rootFolderId: "root", rootFolderName: "Hopi Hari.Monks",
      cronExpression: "0 0 4,10,16,22 * * *", lastSyncedAt: "2026-08-28T18:57:53.000Z",
      lastStatus: "completed", lastRejected: 0,
    }],
  }),
}));

vi.mock("@/components/CampaignArchiveImportPanel", () => ({
  default: () => <div data-testid="campaign-archive-import-panel" />,
}));

describe("Drive campaign dashboard", () => {
  it("renders synchronized campaign inventory and six-hour freshness", () => {
    render(<CampaignsPage />);
    expect(screen.getByText("Google Drive sincronizado")).toBeInTheDocument();
    expect(screen.getByText("ciclo automático de 6 horas")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("435")).toBeInTheDocument();
    expect(screen.getByText("Vai Brasil")).toBeInTheDocument();
  });
});
