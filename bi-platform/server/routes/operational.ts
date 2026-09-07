import type { Express, Response } from "express";
import { getOperationalSummary } from "../lib/operationalSummary";
import { authenticateApprovedSupabaseUser } from "../lib/supabaseAuth";
import { sendRouteError } from "../_core/httpErrors";

const sendError = (res: Response, error: unknown) => sendRouteError(res, error, "Operational Summary");

export function registerOperationalRoutes(app: Express) {
  app.get("/api/operational/summary", async (req, res) => {
    try {
      await authenticateApprovedSupabaseUser(req);
      return res.json({ summary: await getOperationalSummary() });
    } catch (error) {
      return sendError(res, error);
    }
  });
}
