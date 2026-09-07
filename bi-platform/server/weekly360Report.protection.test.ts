import { appRouter } from "./routers";
import { UNAUTHED_ERR_MSG } from "@shared/const";

describe("weekly 360 report router", () => {
  it("keeps the consolidated executive report protected", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as never, res: {} as never });
    await expect(caller.weekly360Report.get()).rejects.toMatchObject({ message: UNAUTHED_ERR_MSG });
  });
});
