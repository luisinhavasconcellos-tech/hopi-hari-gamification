import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";

describe("campaign sales router", () => {
  it("keeps correlation and campaign-period mutations protected", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as never, res: {} as never });
    await expect(caller.campaignSales.correlation()).rejects.toMatchObject({ message: UNAUTHED_ERR_MSG });
    await expect(caller.campaignSales.savePeriod({ driveFolderId: "folder-1", periodStart: "2026-08-01", periodEnd: "2026-08-10" })).rejects.toMatchObject({ message: NOT_ADMIN_ERR_MSG });
    await expect(caller.campaignArchiveImports.list()).rejects.toMatchObject({ message: UNAUTHED_ERR_MSG });
  });
});
