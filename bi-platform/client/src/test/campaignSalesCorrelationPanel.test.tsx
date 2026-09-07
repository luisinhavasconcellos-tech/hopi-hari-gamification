import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CampaignSalesCorrelationPanel from "@/components/CampaignSalesCorrelationPanel";

const queryMock = vi.hoisted(() => vi.fn());
const mutationMock = vi.hoisted(() => vi.fn(() => ({ mutate: vi.fn(), isPending: false })));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ isAdmin: false }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ campaignSales: { correlation: { invalidate: vi.fn() } } }),
    campaignSales: {
      correlation: { useQuery: (...args: unknown[]) => queryMock(...args) },
      savePeriod: { useMutation: () => mutationMock() },
    },
  },
}));

const payload = {
  methodology: "Compara o período oficial com dias operacionais anteriores. Não prova causalidade.",
  minimumCampaignDays: 3,
  minimumBaselineDays: 3,
  baselineLookbackDays: 14,
  lagWindowDays: 7,
  salesCoverage: { observedDays: 4, firstDate: "2026-08-27", lastDate: "2026-08-30" },
  summary: { totalCampaigns: 18, campaignsWithDates: 0, readyCampaigns: 0, assetRevenueCorrelation: null },
  campaigns: [{ id: "drive:1", driveFolderId: "folder-1", name: "Hora do Horror 2026", brand: null, source: "google_drive", periodStart: null, periodEnd: null, assets: 33, images: 12, videos: 21, status: "missing_dates", campaign: { observedDays: 0, averageGrossRevenueCents: null, averageInternalRevenueCents: null, averageExternalRevenueCents: null, averageTicketRevenueCents: null, averageVisitors: null, averagePayingVisitors: null, averageTicketCents: null }, baseline: { observedDays: 0 }, lag: { observedDays: 0 }, deltas: null }],
  attribution: { observedAssociation: "available", directAttribution: "requires_utm_or_campaign_code" },
};

describe("CampaignSalesCorrelationPanel", () => {
  afterEach(() => vi.clearAllMocks());

  it("renders sales coverage and keeps undated campaigns outside the calculation", () => {
    queryMock.mockReturnValue({ isLoading: false, error: null, data: payload });
    render(<CampaignSalesCorrelationPanel />);
    expect(screen.getByText("Campanhas × vendas")).toBeInTheDocument();
    expect(screen.getByText("2026-08-27 a 2026-08-30")).toBeInTheDocument();
    expect(screen.getByText("Hora do Horror 2026")).toBeInTheDocument();
    expect(screen.getByText("Datas pendentes")).toBeInTheDocument();
    expect(screen.getByText(/UTM\/código necessário/)).toBeInTheDocument();
  });

  it("renders a safe error message when the protected query fails", () => {
    queryMock.mockReturnValue({ isLoading: false, error: new Error("unauthorized"), data: undefined });
    render(<CampaignSalesCorrelationPanel />);
    expect(screen.getByText("Não foi possível carregar a correlação protegida entre campanhas e vendas.")).toBeInTheDocument();
  });
});
