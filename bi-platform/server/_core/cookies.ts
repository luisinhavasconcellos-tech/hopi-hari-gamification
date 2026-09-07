import type { CookieOptions, Request } from "express";
import { ENV } from "./env";

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

/**
 * Options for the OAuth session cookie.
 *
 * `SameSite=Lax` (default) keeps the cookie off cross-site POSTs, which is the
 * CSRF protection for the cookie-based session. Deployments that must run
 * inside a third-party iframe can set SESSION_COOKIE_SAME_SITE=none; browsers
 * then require `Secure`, which is forced here.
 */
export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const sameSite = ENV.sessionCookieSameSite;
  return {
    httpOnly: true,
    path: "/",
    sameSite,
    secure: sameSite === "none" ? true : isSecureRequest(req),
  };
}
