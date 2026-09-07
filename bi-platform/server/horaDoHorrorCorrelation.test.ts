import { calculatePearsonCorrelation, summarizeHoraDoHorrorCorrelation } from "./lib/horaDoHorrorCorrelation";
import { appRouter } from "./routers";
import { UNAUTHED_ERR_MSG } from "@shared/const";

describe("Hora do Horror correlation", () => {
  it("only exposes a coefficient after the minimum shared daily coverage", () => {
    const shortSeries = [
      { date: "2026-08-27", socialValue: 10, revenueCents: 100 },
      { date: "2026-08-28", socialValue: 20, revenueCents: 200 },
    ];

    expect(calculatePearsonCorrelation(shortSeries)).toBeNull();
    expect(summarizeHoraDoHorrorCorrelation("Instagram", "Cliques no link", shortSeries, "2026-08-28")).toMatchObject({
      status: "insufficient_sample",
      observedDays: 2,
      coefficient: null,
    });
  });

  it("returns a bounded Pearson coefficient only for a variable seven-day series", () => {
    const points = Array.from({ length: 7 }, (_, index) => ({
      date: `2026-08-${String(index + 1).padStart(2, "0")}`,
      socialValue: index + 1,
      revenueCents: (index + 1) * 100,
    }));

    expect(calculatePearsonCorrelation(points)).toBe(1);
    expect(summarizeHoraDoHorrorCorrelation("Facebook", "Cliques no link", points, "2026-08-07")).toMatchObject({
      status: "ready",
      coefficient: 1,
      direction: "positive",
    });
  });

  it("refuses a correlation when one of the compared series has no variation", () => {
    const points = Array.from({ length: 7 }, (_, index) => ({
      date: `2026-08-${String(index + 1).padStart(2, "0")}`,
      socialValue: 100,
      revenueCents: (index + 1) * 100,
    }));

    expect(summarizeHoraDoHorrorCorrelation("TikTok", "Visitas ao perfil", points, "2026-08-07")).toMatchObject({
      status: "flat_series",
      coefficient: null,
      direction: null,
    });
  });

  it("rejects anonymous access to the protected correlation procedure", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as never, res: {} as never });

    await expect(caller.horaDoHorror.correlation()).rejects.toMatchObject({ message: UNAUTHED_ERR_MSG });
  });
});
