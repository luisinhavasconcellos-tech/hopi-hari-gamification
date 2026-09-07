import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import FollowerGrowth from "@/components/FollowerGrowth";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/trpc", () => ({
  trpc: { socialFollowers: { history: { useQuery: (...args: unknown[]) => queryMock(...args) } } },
}));

describe("FollowerGrowth", () => {
  afterEach(() => vi.clearAllMocks());

  it.each([
    ["instagram", "1.521.200"],
    ["tiktok", "404.500"],
    ["youtube", "57.300"],
    ["linkedin", "17.100"],
  ] as const)("uses the normalized follower history for %s", (platform, expected) => {
    queryMock.mockReturnValue({
      isLoading: false,
      isFetching: false,
      data: [
        { platform: platform[0].toUpperCase() + platform.slice(1), observedDate: "2026-07-31", followerCount: Number(expected.replace(/\./g, "")) - 100, sourceSheet: "Log Diário", sourceRow: 62 },
        { platform: platform[0].toUpperCase() + platform.slice(1), observedDate: "2026-08-01", followerCount: Number(expected.replace(/\./g, "")), sourceSheet: "Log Diário", sourceRow: 63 },
      ],
    });

    render(<FollowerGrowth platform={platform} />);

    expect(screen.getByText("Crescimento de seguidores")).toBeInTheDocument();
    expect(screen.getByText(expected)).toBeInTheDocument();
    expect(screen.getByText(/Base: Google Sheet/)).toBeInTheDocument();
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("shows the official empty state when a platform has no imported rows", () => {
    queryMock.mockReturnValue({ isLoading: false, isFetching: false, data: [] });
    render(<FollowerGrowth platform="youtube" />);
    expect(screen.getByText(/Sem dados de seguidores diários/)).toBeInTheDocument();
  });
});
