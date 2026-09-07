import type { Response } from "express";
import { HttpError } from "@shared/_core/errors";
import { ApiAuthError } from "../lib/supabaseAuth";

const GENERIC_MESSAGE = "Internal server error";

function isZodLikeError(error: unknown): error is { issues: unknown[] } {
  return Boolean(error) && typeof error === "object" && Array.isArray((error as { issues?: unknown }).issues);
}

/**
 * Sends an error response for the REST routes without leaking internals.
 *
 * - Authentication / authorization errors keep their status and message.
 * - Explicit `HttpError`s (4xx) keep their status and message.
 * - Validation errors become 400.
 * - Everything else is logged with the given label and answered with a
 *   generic 500, so stack traces, SQL and upstream URLs never reach clients.
 */
export function sendRouteError(res: Response, error: unknown, label: string) {
  if (error instanceof ApiAuthError) {
    return res.status(error.status).json({ error: error.message });
  }
  if (error instanceof HttpError && error.statusCode >= 400 && error.statusCode < 500) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  if (isZodLikeError(error)) {
    return res.status(400).json({ error: "Invalid request payload" });
  }
  console.error(`[${label}]`, error);
  return res.status(500).json({ error: GENERIC_MESSAGE });
}

/**
 * Cron callbacks are authenticated machine clients, but their error payloads
 * still travel through the scheduler's logs, so keep them generic as well.
 */
export function sendCronError(res: Response, error: unknown, label: string, url: string) {
  if (error instanceof ApiAuthError || error instanceof HttpError) {
    const status = error instanceof ApiAuthError ? error.status : error.statusCode;
    return res.status(status).json({ error: error.message });
  }
  console.error(`[${label}]`, error);
  return res.status(500).json({
    error: GENERIC_MESSAGE,
    context: { url },
    timestamp: new Date().toISOString(),
  });
}
