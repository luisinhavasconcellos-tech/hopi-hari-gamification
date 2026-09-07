import express from "express";
import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  listCampaigns: vi.fn(),
}));

vi.mock("./lib/supabaseAuth", () => ({
  ApiAuthError: class ApiAuthError extends Error {
    constructor(public status: number, message: string) { super(message); }
  },
  authenticateApprovedSupabaseUser: mocks.authenticate,
}));
vi.mock("./lib/driveCampaignSync", () => ({
  getDriveCampaignSourceByTaskUid: vi.fn(),
  syncDriveCampaigns: vi.fn(),
  listDriveCampaigns: mocks.listCampaigns,
}));
vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: vi.fn() } }));

import { ApiAuthError } from "./lib/supabaseAuth";
import { registerCampaignRoutes } from "./routes/campaigns";

async function appUrl() {
  const app = express();
  app.use(express.json());
  registerCampaignRoutes(app);
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server did not bind");
  return { server, url: `http://127.0.0.1:${address.port}` };
}

describe("campaign routes", () => {
  let server: Server | null = null;
  afterEach(async () => {
    vi.clearAllMocks();
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    server = null;
  });

  it("rejects anonymous campaign reads before querying the database", async () => {
    mocks.authenticate.mockRejectedValueOnce(new ApiAuthError(401, "Authentication required"));
    const running = await appUrl();
    server = running.server;
    const response = await fetch(`${running.url}/api/campaigns`);
    expect(response.status).toBe(401);
    expect(mocks.listCampaigns).not.toHaveBeenCalled();
  });

  it("returns synchronized campaign metadata to an approved user", async () => {
    mocks.authenticate.mockResolvedValueOnce({ id: "approved", role: "user" });
    mocks.listCampaigns.mockResolvedValueOnce({ campaigns: [{ id: "folder-1", name: "Vai Brasil" }], sources: [] });
    const running = await appUrl();
    server = running.server;
    const response = await fetch(`${running.url}/api/campaigns`, { headers: { Authorization: "Bearer valid" } });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ campaigns: [{ id: "folder-1", name: "Vai Brasil" }] });
    expect(mocks.listCampaigns).toHaveBeenCalledTimes(1);
  });
});
