import type { DailyBriefing } from "../../drizzle/schema";
import type { Express, Request, Response } from "express";
import {
  getBriefingScheduleByTaskUid,
  getDailyBriefingById,
  getDailyBriefingByDate,
  listDailyBriefings,
  saveDailyBriefingAudio,
} from "../db";
import { sdk } from "../_core/sdk";
import { generateDailyBriefing, reportDateInSaoPaulo } from "../lib/dailyBriefing";
import { authenticateApprovedSupabaseUser } from "../lib/supabaseAuth";
import { sendCronError, sendRouteError } from "../_core/httpErrors";
import { storageGetSignedUrl, storagePut } from "../storage";

function serializeBriefing(row: DailyBriefing) {
  const parsed = JSON.parse(row.sectionsJson) as { sections: unknown[]; priorities: unknown[] };
  const snapshot = JSON.parse(row.sourceSnapshotJson) as Record<string, unknown> & {
    coverage?: unknown;
    social?: Record<string, unknown> & { x?: Record<string, unknown> };
  };
  const x = snapshot.social?.x;
  const safeX = x ? Object.fromEntries(Object.entries(x).filter(([key]) => key !== "posts")) : null;
  const safeSnapshot = {
    ...snapshot,
    social: snapshot.social ? { ...snapshot.social, x: safeX } : undefined,
  };
  return {
    id: row.id,
    reportDate: row.reportDate,
    title: row.title,
    executiveSummary: row.executiveSummary,
    narration: row.narration,
    sections: parsed.sections,
    priorities: parsed.priorities,
    model: row.model,
    xStatus: row.xStatus,
    status: row.status,
    generatedAt: row.generatedAt,
    audioUrl: row.audioKey ? `/api/briefings/${row.id}/audio` : null,
    audioDurationSeconds: row.audioDurationSeconds,
    audioGeneratedAt: row.audioGeneratedAt,
    coverage: snapshot.coverage ?? null,
    snapshot: safeSnapshot,
  };
}

const sendError = (res: Response, error: unknown) => sendRouteError(res, error, "Daily Briefing");

export function registerBriefingRoutes(app: Express) {
  app.get("/api/briefings/:id/audio", async (req, res) => {
    try {
      await authenticateApprovedSupabaseUser(req);
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Invalid briefing id" });
      const report = await getDailyBriefingById(id);
      if (!report?.audioKey) return res.status(404).json({ error: "Narration audio not available" });
      const signedUrl = await storageGetSignedUrl(report.audioKey);
      return res.redirect(307, signedUrl);
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get("/api/briefings", async (req, res) => {
    try {
      await authenticateApprovedSupabaseUser(req);
      const rows = await listDailyBriefings(14);
      return res.json({ briefings: rows.map(serializeBriefing) });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post("/api/briefings/generate", async (req, res) => {
    try {
      const user = await authenticateApprovedSupabaseUser(req);
      if (user.role !== "admin") return res.status(403).json({ error: "Administrator access required" });
      const report = await generateDailyBriefing({ force: true });
      return res.json({ briefing: report ? serializeBriefing(report) : null });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post("/api/scheduled/daily-briefing", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
      const schedule = await getBriefingScheduleByTaskUid(user.taskUid);
      if (!schedule || schedule.enabled !== 1) return res.json({ ok: true, skipped: "orphan-or-disabled" });
      const report = await generateDailyBriefing();
      return res.json({
        ok: true,
        reportDate: report?.reportDate ?? null,
        narration: report?.narration ?? null,
        audioReady: Boolean(report?.audioKey),
      });
    } catch (error) {
      return sendCronError(res, error, "Daily Briefing Cron", req.originalUrl);
    }
  });

  app.post("/api/scheduled/daily-briefing/audio", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
      const schedule = await getBriefingScheduleByTaskUid(user.taskUid);
      if (!schedule || schedule.enabled !== 1) return res.json({ ok: true, skipped: "orphan-or-disabled" });

      const { audioBase64, mimeType, durationSeconds } = req.body as {
        audioBase64?: string;
        mimeType?: string;
        durationSeconds?: number;
      };
      if (typeof audioBase64 !== "string" || !audioBase64 || audioBase64.length > 20_000_000) {
        return res.status(400).json({ error: "Invalid narration audio payload" });
      }
      if (!/^[A-Za-z0-9+/=\r\n]+$/.test(audioBase64)) {
        return res.status(400).json({ error: "Invalid narration audio payload" });
      }
      const allowedMimeTypes = new Set(["audio/mpeg", "audio/wav", "audio/mp4"]);
      if (!mimeType || !allowedMimeTypes.has(mimeType)) {
        return res.status(400).json({ error: "Unsupported narration audio format" });
      }

      const reportDate = reportDateInSaoPaulo();
      const report = await getDailyBriefingByDate(reportDate);
      if (!report) return res.status(404).json({ error: "Daily briefing not found" });
      const extension = mimeType === "audio/wav" ? "wav" : mimeType === "audio/mp4" ? "m4a" : "mp3";
      const bytes = Buffer.from(audioBase64, "base64");
      if (bytes.length === 0 || bytes.length > 14_000_000) {
        return res.status(400).json({ error: "Narration audio size is invalid" });
      }
      const stored = await storagePut(`daily-briefings/${reportDate}/narration.${extension}`, bytes, mimeType);
      const updated = await saveDailyBriefingAudio(reportDate, {
        ...stored,
        durationSeconds:
          typeof durationSeconds === "number" && Number.isFinite(durationSeconds)
            ? Math.max(1, Math.round(durationSeconds))
            : undefined,
      });
      return res.json({ ok: true, reportDate, audioReady: Boolean(updated?.audioKey) });
    } catch (error) {
      return sendCronError(res, error, "Daily Briefing Audio Cron", req.originalUrl);
    }
  });
}
