import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SocialComparisonPanel from "@/components/SocialComparisonPanel";

const queryMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/trpc", () => ({
  trpc: {
    socialComparison: { useQuery: (...args: unknown[]) => queryMock(...args) },
  },
}));

describe("SocialComparisonPanel", () => {
  afterEach(() => vi.clearAllMocks());

  it("sends the shared date/platform filter and renders unavailable values explicitly", () => {
    queryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        summary: {
          facebook: { latestDate: "2026-08-28", observedDays: 2, latest: { followers: 100, views: null }, totals: {} },
          instagram: { latestDate: "2026-08-28", observedDays: 2, latest: { followers: 200, views: 30 }, totals: {} },
          tiktok: { latestDate: "2026-08-28", observedDays: 2, latest: { followers: 300, views: 40 }, totals: {} },
        },
        rows: [],
      },
    });

    render(<SocialComparisonPanel />);

    expect(screen.getByText("Comparativo social")).toBeInTheDocument();
    expect(screen.getAllByText("2026-08-28").length).toBe(3);
    expect(screen.getAllByText("Indisponível").length).toBeGreaterThan(0);
    expect(queryMock).toHaveBeenCalledWith(
      { from: "2025-01-01", to: "2026-12-31", platforms: ["facebook", "instagram", "tiktok"] },
      expect.objectContaining({ enabled: true }),
    );
  });

  it("renders a protected loading state while comparison data is pending", () => {
    queryMock.mockReturnValue({ isLoading: true, error: null, data: undefined });
    render(<SocialComparisonPanel />);
    expect(screen.getByText("Comparativo social")).toBeInTheDocument();
    expect(document.querySelectorAll(".animate-pulse").length).toBe(3);
    expect(queryMock).toHaveBeenCalledWith(
      { from: "2025-01-01", to: "2026-12-31", platforms: ["facebook", "instagram", "tiktok"] },
      expect.objectContaining({ enabled: true }),
    );
  });

  it("renders a safe error state when the protected comparison query fails", () => {
    queryMock.mockReturnValue({ isLoading: false, error: new Error("unauthorized"), data: undefined });
    render(<SocialComparisonPanel />);
    expect(screen.getByText("Não foi possível carregar o comparativo social protegido.")).toBeInTheDocument();
  });

  it("updates date filters and platform selection without losing protected query behavior", () => {
    queryMock.mockReturnValue({ isLoading: false, error: null, data: { summary: {}, rows: [] } });
    render(<SocialComparisonPanel />);

    fireEvent.change(screen.getByLabelText("De"), { target: { value: "2026-08-01" } });
    fireEvent.change(screen.getByLabelText("Até"), { target: { value: "2026-08-28" } });
    fireEvent.click(screen.getByRole("button", { name: /TikTok/ }));

    const latestInput = queryMock.mock.calls.at(-1)?.[0];
    expect(latestInput).toEqual({ from: "2026-08-01", to: "2026-08-28", platforms: ["facebook", "instagram"] });
  });
});
