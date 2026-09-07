import type { Express } from "express";
import { resolveSupabaseUserAccess } from "../lib/supabaseAuth";
import { sendRouteError } from "../_core/httpErrors";

export function registerAuthAccessRoutes(app: Express) {
  app.get("/api/auth/access", async (req, res) => {
    try {
      const access = await resolveSupabaseUserAccess(req);
      res.json({
        status: access.status,
        roles: [access.role],
      });
    } catch (error) {
      sendRouteError(res, error, "Auth Access");
    }
  });
}
