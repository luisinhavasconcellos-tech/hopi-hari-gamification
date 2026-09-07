import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import OperationalPulse from "@/components/OperationalPulse";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ session: { access_token: "test-access-token" } }),
}));

describe("OperationalPulse", () => {
  afterEach(() => vi.restoreAllMocks());

  it("loads protected normalized data and renders the latest park pulse", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          summary: {
            revenue: {
              businessDate: "2026-08-27",
              localHour: 20,
              grossRevenueCents: 93795835,
              internalRevenueCents: 36178298,
              externalRevenueCents: 57617537,
              internalPerCapitaCents: 7567,
            },
            attendance: {
              businessDate: "2026-08-27",
              localHour: 20,
              publicCount: 4772,
              payingCount: 4230,
              complimentaryCount: 542,
              currentlyInPark: 3769,
            },
            audience: {
              observedDate: "2026-08-24",
              totalFollowers: 3006848,
              followerChange: 703,
              targetFollowers: 4000000,
            },
            sources: [
              { status: "completed", rowsSeen: 527, rowsRejected: 0 },
              { status: "completed", rowsSeen: 36, rowsRejected: 0 },
              { status: "completed", rowsSeen: 421, rowsRejected: 0 },
              { status: "completed", rowsSeen: 51, rowsRejected: 0 },
            ],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(<OperationalPulse />);

    expect(await screen.findByText(/937\.958/)).toBeInTheDocument();
    expect(screen.getByText("4.772")).toBeInTheDocument();
    expect(screen.getByText(/3\.006\.848/)).toBeInTheDocument();
    expect(screen.getByText("4/4 fontes reconciliadas")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/operational/summary",
      expect.objectContaining({ headers: { Authorization: "Bearer test-access-token" } }),
    );
  });
});
