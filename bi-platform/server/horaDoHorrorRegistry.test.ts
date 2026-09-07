import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { sourceLabelOrDefault } from "./lib/horaDoHorrorRegistry";

const now = new Date();
const viewer = {
  id: 1,
  openId: "viewer-user",
  name: "Viewer User",
  email: "viewer@example.com",
  loginMethod: "supabase",
  role: "user" as const,
  createdAt: now,
  updatedAt: now,
  lastSignedIn: now,
};

describe("Hora do Horror registry router", () => {
  it("preserves trusted import provenance while retaining the dashboard source default", () => {
    expect(sourceLabelOrDefault("  Google Sheets · cronograma_minisserie_horror  ")).toBe("Google Sheets · cronograma_minisserie_horror");
    expect(sourceLabelOrDefault("   ")).toBe("Registro oficial · Dashboard");
  });

  it("keeps the registry list behind the protected access boundary", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as never, res: {} as never });

    await expect(caller.horaDoHorrorRegistry.list()).rejects.toMatchObject({ message: UNAUTHED_ERR_MSG });
  });

  it("rejects official campaign writes from non-administrators before touching the database", async () => {
    const caller = appRouter.createCaller({ user: viewer, req: {} as never, res: {} as never });

    await expect(caller.horaDoHorrorRegistry.saveCampaign({
      edition: "Hora do Horror 2026",
      periodStart: "2026-08-27",
      periodEnd: "2026-09-30",
      status: "scheduled",
    })).rejects.toMatchObject({ message: NOT_ADMIN_ERR_MSG });
  });

  it("rejects an inverted official campaign window before running its mutation", async () => {
    const caller = appRouter.createCaller({
      user: { ...viewer, openId: "admin-user", role: "admin" },
      req: {} as never,
      res: {} as never,
    });

    await expect(caller.horaDoHorrorRegistry.saveCampaign({
      edition: "Hora do Horror 2026",
      periodStart: "2026-09-30",
      periodEnd: "2026-08-27",
      status: "scheduled",
    })).rejects.toThrow("periodStart must be before or equal to periodEnd");
  });
});
