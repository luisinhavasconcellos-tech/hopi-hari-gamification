import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { UNAUTHED_ERR_MSG } from "@shared/const";

describe("social follower history router", () => {
  it("keeps the all-platform follower source protected", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as never, res: {} as never });
    await expect(caller.socialFollowers.history()).rejects.toMatchObject({ message: UNAUTHED_ERR_MSG });
  });
});
