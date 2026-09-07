// Hopi Hari — Alert engine (KPI guide section 10)
// Pure rule evaluator. Returns triggered alerts based on post metrics & channel snapshots.
import {
  type PostMetric,
  type Platform,
  interactions,
  last24h,
  last7d,
  engagementByFollowers,
  engagementByViews,
} from "./kpis";

export type AlertSeverity = "critical" | "warning" | "positive" | "info";

export interface Alert {
  id: string;
  platform: Platform;
  severity: AlertSeverity;
  icon: string;
  title: string;
  description: string;
  metric?: string;
  context?: Record<string, unknown>;
}

interface PostWithSentiment extends PostMetric {
  ai_analysis?: { sentiment?: string } | null;
  id?: string;
  caption?: string | null;
}

const SEV_WEIGHT: Record<AlertSeverity, number> = { critical: 0, warning: 1, positive: 2, info: 3 };

export function evaluateAlerts(
  platform: Platform,
  posts: PostWithSentiment[],
  followers: number,
): Alert[] {
  const alerts: Alert[] = [];
  const today = last24h(posts);
  const week = last7d(posts);

  // 1. ER drop — today's ER < 50% of 7-day average.
  const erWeek = engagementByFollowers(week, followers) ?? engagementByViews(week);
  const erToday = engagementByFollowers(today, followers) ?? engagementByViews(today);
  if (erWeek != null && erToday != null && erWeek > 0 && erToday < erWeek * 0.5) {
    alerts.push({
      id: `${platform}-er-drop`,
      platform,
      severity: "critical",
      icon: "⚠️",
      title: "Queda forte de engajamento",
      description: `ER de hoje (${erToday.toFixed(2)}%) está mais de 50% abaixo da média 7d (${erWeek.toFixed(2)}%).`,
      metric: "engagement_rate",
      context: { erToday, erWeek },
    });
  }

  // 2. No posts in 48h.
  const lastTs = posts
    .map((p) => p.timestamp && new Date(p.timestamp).getTime())
    .filter((t): t is number => !!t)
    .sort((a, b) => b - a)[0];
  if (lastTs) {
    const hours = (Date.now() - lastTs) / 3600000;
    if (hours > 48) {
      alerts.push({
        id: `${platform}-no-posts`,
        platform,
        severity: "warning",
        icon: "📭",
        title: "Sem posts há mais de 48h",
        description: `Último post publicado há ${Math.round(hours)}h. Cadência ideal: posts regulares para manter alcance.`,
        metric: "cadence",
        context: { hoursSinceLast: Math.round(hours) },
      });
    }
  }

  // 3. Viral post — ER > 3× channel average.
  if (week.length > 2) {
    const avgEr = week.reduce((s, p) => {
      if (p.view_count) return s + (interactions(p) / p.view_count) * 100;
      if (followers) return s + (interactions(p) / followers) * 100;
      return s;
    }, 0) / week.length;
    const viral = week.find((p) => {
      const er = p.view_count
        ? (interactions(p) / p.view_count) * 100
        : followers
        ? (interactions(p) / followers) * 100
        : 0;
      return er > avgEr * 3 && interactions(p) > 50;
    });
    if (viral && avgEr > 0) {
      const er = viral.view_count
        ? (interactions(viral) / viral.view_count) * 100
        : (interactions(viral) / followers) * 100;
      alerts.push({
        id: `${platform}-viral`,
        platform,
        severity: "positive",
        icon: "🚀",
        title: "Post viralizando",
        description: `Um post está com ER ${er.toFixed(1)}%, ${(er / avgEr).toFixed(1)}× a média do canal. Considere impulsionar.`,
        metric: "virality",
        context: { er, avgEr, caption: viral.caption?.slice(0, 80) },
      });
    }
  }

  // 4. Negative sentiment surge in last 24h.
  const todayWithSent = (today as PostWithSentiment[]).filter((p) => p.ai_analysis?.sentiment);
  if (todayWithSent.length >= 3) {
    const negative = todayWithSent.filter((p) => p.ai_analysis?.sentiment === "negative").length;
    const negPct = (negative / todayWithSent.length) * 100;
    if (negPct > 30) {
      alerts.push({
        id: `${platform}-neg-sentiment`,
        platform,
        severity: "critical",
        icon: "🔻",
        title: "Pico de sentimento negativo",
        description: `${negPct.toFixed(0)}% dos posts analisados nas últimas 24h estão com sentimento negativo. Possível crise.`,
        metric: "sentiment",
        context: { negPct, sample: todayWithSent.length },
      });
    }
  }

  // 5. Cadence collapse — < 50% of previous week.
  const prev = posts.filter((p) => {
    if (!p.timestamp) return false;
    const t = new Date(p.timestamp).getTime();
    return t < Date.now() - 7 * 86400000 && t >= Date.now() - 14 * 86400000;
  });
  if (prev.length >= 3 && week.length < prev.length * 0.5) {
    alerts.push({
      id: `${platform}-cadence-drop`,
      platform,
      severity: "warning",
      icon: "📉",
      title: "Cadência caiu pela metade",
      description: `Esta semana: ${week.length} posts vs ${prev.length} na anterior. Risco de perder algoritmo.`,
      metric: "cadence",
      context: { week: week.length, prev: prev.length },
    });
  }

  return alerts.sort((a, b) => SEV_WEIGHT[a.severity] - SEV_WEIGHT[b.severity]);
}

export const SEVERITY_STYLE: Record<AlertSeverity, string> = {
  critical: "bg-destructive/10 border-destructive/40 text-destructive",
  warning: "bg-warning/10 border-warning/40 text-warning",
  positive: "bg-success/10 border-success/40 text-success",
  info: "bg-muted border-border text-foreground",
};
