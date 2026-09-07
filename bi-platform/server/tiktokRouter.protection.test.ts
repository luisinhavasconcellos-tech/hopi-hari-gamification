import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { UNAUTHED_ERR_MSG } from "@shared/const";

describe("TikTok procedures", () => {
  it("rejects anonymous access to every TikTok procedure", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as never, res: {} as never });
    await expect(caller.tiktok.dailyMetrics()).rejects.toMatchObject({ message: UNAUTHED_ERR_MSG });
    await expect(caller.tiktok.viewers()).rejects.toMatchObject({ message: UNAUTHED_ERR_MSG });
    await expect(caller.tiktok.audience()).rejects.toMatchObject({ message: UNAUTHED_ERR_MSG });
    await expect(caller.tiktok.followerActivity()).rejects.toMatchObject({ message: UNAUTHED_ERR_MSG });
  });
});
