import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HoraDoHorrorRegistryPanel from "@/components/HoraDoHorrorRegistryPanel";

const listQuery = vi.hoisted(() => vi.fn());
const saveCampaign = vi.hoisted(() => vi.fn());
const saveCreative = vi.hoisted(() => vi.fn());
const authMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => vi.fn());
const invalidateMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      horaDoHorrorRegistry: { list: { invalidate: invalidateMock } },
      horaDoHorror: { correlation: { invalidate: invalidateMock } },
    }),
    horaDoHorrorRegistry: {
      list: { useQuery: () => listQuery() },
      saveCampaign: { useMutation: () => ({ mutate: saveCampaign, isPending: false }) },
      saveCreative: { useMutation: () => ({ mutate: saveCreative, isPending: false }) },
    },
  },
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => authMock() }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastMock }) }));

describe("HoraDoHorrorRegistryPanel", () => {
  afterEach(() => vi.clearAllMocks());

  const renderPanel = () => render(<MemoryRouter><HoraDoHorrorRegistryPanel /></MemoryRouter>);

  it("shows official registry context but not admin forms to a viewer", () => {
    authMock.mockReturnValue({ isAdmin: false });
    listQuery.mockReturnValue({ isLoading: false, error: null, data: [{ id: 7, edition: "Hora do Horror 2026", periodStart: "2026-08-27", periodEnd: "2026-09-30", status: "scheduled", notes: null, sourceLabel: "Registro oficial · Dashboard", creativeCount: 1, creatives: [{ id: 1, campaignId: 7, creativeName: "Teaser oficial", platform: "instagram", creativeFormat: "Reel", publishedDate: "2026-08-27", targetUrl: null, utmCampaign: "hdo_2026", callToAction: null, status: "published", notes: null, sourceLabel: "Registro oficial · Dashboard" }] }] });

    renderPanel();

    expect(screen.getByText("Hora do Horror dates and creatives")).toBeInTheDocument();
    expect(screen.getByText("Hora do Horror 2026")).toBeInTheDocument();
    expect(screen.getByText("Teaser oficial")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Save official dates/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Only platform administrators/)).toBeInTheDocument();
  });

  it("allows an administrator to submit a validated official campaign window", () => {
    authMock.mockReturnValue({ isAdmin: true });
    listQuery.mockReturnValue({ isLoading: false, error: null, data: [] });

    renderPanel();
    fireEvent.change(screen.getByLabelText("Edition"), { target: { value: "Hora do Horror 2026" } });
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-08-27" } });
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-09-30" } });
    fireEvent.click(screen.getByRole("button", { name: "Save official dates" }));

    expect(saveCampaign).toHaveBeenCalledWith({ edition: "Hora do Horror 2026", periodStart: "2026-08-27", periodEnd: "2026-09-30", status: "scheduled", notes: "" });
    expect(screen.getByText("Register creative")).toBeInTheDocument();
  });

  it("renders a safe error when the protected registry cannot load", () => {
    authMock.mockReturnValue({ isAdmin: false });
    listQuery.mockReturnValue({ isLoading: false, error: new Error("unauthorized"), data: undefined });

    renderPanel();

    expect(screen.getByText("The protected Hora do Horror registry could not be loaded.")).toBeInTheDocument();
  });
});
