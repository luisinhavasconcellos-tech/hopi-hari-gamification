import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { NOT_ADMIN_ERR_MSG } from "@shared/const";
import type { TrpcContext } from "./_core/context";

const viewer: NonNullable<TrpcContext["user"]> = {
  id: -1,
  openId: "supabase:viewer",
  email: "viewer@example.com",
  name: "Viewer",
  loginMethod: "supabase",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

describe("platform access router", () => {
  it("rejects anonymous and non-admin callers before touching the database", async () => {
    const anonymous = appRouter.createCaller({ user: null, req: {} as never, res: {} as never });
    await expect(anonymous.platformAccess.list()).rejects.toMatchObject({ message: NOT_ADMIN_ERR_MSG });

    const asViewer = appRouter.createCaller({ user: viewer, req: {} as never, res: {} as never });
    await expect(asViewer.platformAccess.list()).rejects.toMatchObject({ message: NOT_ADMIN_ERR_MSG });
    await expect(asViewer.platformAccess.setStatus({ id: 1, status: "approved" })).rejects.toMatchObject({ message: NOT_ADMIN_ERR_MSG });
    await expect(asViewer.platformAccess.setRole({ id: 1, role: "admin" })).rejects.toMatchObject({ message: NOT_ADMIN_ERR_MSG });
  });
});
