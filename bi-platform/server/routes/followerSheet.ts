import type { Express, Request, Response } from "express";
import { sdk } from "../_core/sdk";
import { FOLLOWER_SHEET_CRON, getFollowerSheetSourceByTaskUid, syncFollowerSheet } from "../lib/followerSheetSync";
import { authenticateApprovedSupabaseUser } from "../lib/supabaseAuth";
import { sendCronError, sendRouteError } from "../_core/httpErrors";

const sendError = (res: Response, error: unknown) => sendRouteError(res, error, "Follower Sheet");

export function registerFollowerSheetRoutes(app: Express) {
  app.post("/api/social/followers/sync", async (req, res) => {
    try {
      const user = await authenticateApprovedSupabaseUser(req);
      if (user.role !== "admin") return res.status(403).json({ error: "Administrator access required" });
      return res.json({ ok: true, cron: FOLLOWER_SHEET_CRON, sync: await syncFollowerSheet() });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post("/api/scheduled/follower-sheet-sync", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
      const source = await getFollowerSheetSourceByTaskUid(user.taskUid);
      if (!source || Number(source.active) !== 1) return res.json({ ok: true, skipped: "orphan-or-disabled" });
      return res.json({ ok: true, sync: await syncFollowerSheet() });
    } catch (error) {
      return sendCronError(res, error, "Follower Sheet Cron", req.originalUrl);
    }
  });
}
