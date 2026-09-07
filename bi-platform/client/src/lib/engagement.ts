// Engagement rate calculations

export type ERMode = "auto" | "followers" | "views";

export interface ERInputs {
  likes: number;
  comments: number;
  shares?: number | null;
  views?: number | null;
  followers?: number | null;
  mediaType?: string | null;
}

// Video-like media types across platforms
const VIDEO_TYPES = new Set([
  "VIDEO", "REEL", "REELS", "SHORT", "SHORTS", "TIKTOK", "YOUTUBE_VIDEO",
]);

export function isVideoLike(mediaType?: string | null): boolean {
  if (!mediaType) return false;
  return VIDEO_TYPES.has(mediaType.toUpperCase());
}

/**
 * Resolve which denominator to use given the mode and post context.
 * - "auto": views for video posts (when view_count exists), followers otherwise
 * - "views"/"followers": forced
 */
export function resolveERMode(mode: ERMode, p: ERInputs): "views" | "followers" {
  if (mode !== "auto") return mode;
  const hasViews = (p.views ?? 0) > 0;
  if (isVideoLike(p.mediaType) && hasViews) return "views";
  return "followers";
}

export function engagementRate(mode: ERMode, p: ERInputs): number | null {
  const interactions = (p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0);
  const effective = resolveERMode(mode, p);
  if (effective === "followers") {
    if (!p.followers || p.followers <= 0) return null;
    return (interactions / p.followers) * 100;
  }
  if (!p.views || p.views <= 0) return null;
  return (interactions / p.views) * 100;
}

export function formatER(value: number | null): string {
  if (value == null) return "—";
  if (value >= 100) return `${value.toFixed(0)}%`;
  if (value >= 10) return `${value.toFixed(1)}%`;
  return `${value.toFixed(2)}%`;
}

export const sentimentEmoji = (s?: string | null) =>
  s === "positive" ? "😊" : s === "negative" ? "😟" : s === "neutral" ? "😐" : "";

export const sentimentColor = (s?: string | null) =>
  s === "positive"
    ? "bg-success/15 text-success border-success/30"
    : s === "negative"
    ? "bg-destructive/15 text-destructive border-destructive/30"
    : s === "neutral"
    ? "bg-muted text-muted-foreground border-border"
    : "bg-muted text-muted-foreground border-border";
