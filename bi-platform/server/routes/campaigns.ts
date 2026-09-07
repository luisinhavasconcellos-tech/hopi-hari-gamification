import type { Express, Request, Response } from "express";
import { sdk } from "../_core/sdk";
import {
  getDriveCampaignSourceByTaskUid,
  listDriveCampaigns,
  syncDriveCampaigns,
} from "../lib/driveCampaignSync";
import { authenticateApprovedSupabaseUser } from "../lib/supabaseAuth";
import { sendCronError, sendRouteError } from "../_core/httpErrors";

const sendError = (res: Response, error: unknown) => sendRouteError(res, error, "Drive Campaigns");

export function registerCampaignRoutes(app: Express) {
  app.get("/api/campaigns", async (req, res) => {
    try {
      await authenticateApprovedSupabaseUser(req);
      return res.json(await listDriveCampaigns());
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post("/api/campaigns/sync", async (req, res) => {
    try {
      const user = await authenticateApprovedSupabaseUser(req);
      if (user.role !== "admin") return res.status(403).json({ error: "Administrator access required" });
      return res.json({ ok: true, sync: await syncDriveCampaigns() });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post("/api/scheduled/campaign-drive-sync", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
      const source = await getDriveCampaignSourceByTaskUid(user.taskUid);
      if (!source || source.enabled !== 1) return res.json({ ok: true, skipped: "orphan-or-disabled" });
      return res.json({ ok: true, sync: await syncDriveCampaigns(source.root_folder_id) });
    } catch (error) {
      return sendCronError(res, error, "Drive Campaign Cron", req.originalUrl);
    }
  });
}
