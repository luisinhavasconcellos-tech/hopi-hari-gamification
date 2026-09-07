import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { buildChannelSnapshot, type Platform, type PostMetric } from "@/lib/kpis";
import { fetchFollowerCounts } from "@/lib/followers";
import { parseDateOnly, saoPauloToday } from "@/lib/dates";

const PLATFORMS: { key: Platform; table: string; label: string }[] = [
  { key: "instagram", table: "instagram_posts", label: "Instagram" },
  { key: "tiktok", table: "tiktok_posts", label: "TikTok" },
  { key: "facebook", table: "facebook_posts", label: "Facebook" },
  { key: "youtube", table: "youtube_posts", label: "YouTube" },
  { key: "linkedin", table: "linkedin_posts", label: "LinkedIn" },
];

const COLORS = {
  primary: [124, 58, 237] as [number, number, number],
  accent: [34, 211, 238] as [number, number, number],
  text: [22, 22, 32] as [number, number, number],
  muted: [110, 110, 130] as [number, number, number],
  rule: [225, 225, 235] as [number, number, number],
  surface: [248, 248, 252] as [number, number, number],
};

const fmt = (n: number) => n.toLocaleString("pt-BR");
const pct = (n: number | null | undefined, d = 2) => (n == null ? "—" : `${n.toFixed(d)}%`);

interface DailyMetric {
  platform: string;
  date: string;
  posted: boolean;
  likes: number;
  comments: number;
  shares: number;
  followers: number;
  new_followers: number;
  reach: number;
  views: number;
  engagement_rate: number;
  impressions: number;
}

interface AIReport {
  executive_summary?: string;
  key_findings?: string[];
  per_platform?: Record<string, string>;
  recommendations?: string[];
  risks?: string[];
}

/** Data de hoje no fuso do negócio (America/Sao_Paulo), YYYY-MM-DD. */
function todayISO() {
  return saoPauloToday();
}

/**
 * As fontes core do jsPDF (Helvetica) só cobrem WinAnsi/Latin-1: qualquer
 * caractere fora disso (emoji, CJK, símbolos) vira um glifo inválido no PDF.
 */
function latin1(text: string) {
  // eslint-disable-next-line no-control-regex -- deliberately keeps the Latin-1 range only
  return text.replace(/[^\u0000-\u00ff]/g, "");
}

async function fetchPlatformData() {
  const { counts: followersMap } = await fetchFollowerCounts();

  const result: Record<Platform, { posts: PostMetric[]; followers: number }> = {} as any;
  for (const p of PLATFORMS) {
    const { data } = await (supabase as any)
      .from(p.table)
      .select("timestamp,like_count,comments_count,share_count,view_count,caption,media_type,post_url,thumbnail_url")
      .order("timestamp", { ascending: false })
      .limit(500);
    result[p.key] = {
      posts: ((data ?? []) as unknown) as PostMetric[],
      followers: followersMap[p.key] ?? 0,
    };
  }
  return result;
}

async function fetchDailyMetrics(): Promise<DailyMetric[]> {
  const { data } = await supabase
    .from("daily_metrics")
    .select("*")
    .order("date", { ascending: false })
    .limit(200);
  return (data ?? []) as DailyMetric[];
}

function topPosts(posts: PostMetric[], n = 5) {
  return [...posts]
    .map((p) => ({
      ...p,
      _inter: (p.like_count ?? 0) + (p.comments_count ?? 0) + (p.share_count ?? 0),
    }))
    .sort((a, b) => b._inter - a._inter)
    .slice(0, n);
}

// ---------- PDF helpers ----------

function header(doc: jsPDF, title: string, subtitle?: string) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, w, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("HOPI HARI · AUDIENCE INTELLIGENCE", 14, 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(title, 14, 16);
  if (subtitle) {
    doc.text(subtitle, w - 14, 16, { align: "right" });
  }
}

function footer(doc: jsPDF, page: number, total: number) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...COLORS.rule);
  doc.line(14, h - 14, w - 14, h - 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text(`Relatório Diário · ${new Date().toLocaleDateString("pt-BR")}`, 14, h - 8);
  doc.text(`Página ${page} / ${total}`, w - 14, h - 8, { align: "right" });
}

function sectionTitle(doc: jsPDF, y: number, text: string, badge?: string) {
  doc.setFillColor(...COLORS.primary);
  doc.rect(14, y - 5, 3, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.text);
  doc.text(text, 20, y);
  if (badge) {
    const tw = doc.getTextWidth(badge) + 6;
    const x = doc.internal.pageSize.getWidth() - 14 - tw;
    doc.setFillColor(...COLORS.accent);
    doc.roundedRect(x, y - 5, tw, 7, 1.5, 1.5, "F");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(badge, x + 3, y);
  }
  return y + 6;
}

function writeParagraph(doc: jsPDF, y: number, text: string, opts: { size?: number; color?: [number, number, number]; bold?: boolean } = {}) {
  const { size = 9.5, color = COLORS.text, bold = false } = opts;
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.setTextColor(...color);
  const w = doc.internal.pageSize.getWidth() - 28;
  const lines = doc.splitTextToSize(text, w);
  doc.text(lines, 14, y);
  return y + lines.length * (size * 0.45);
}

function bullets(doc: jsPDF, y: number, items: string[]) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...COLORS.text);
  const w = doc.internal.pageSize.getWidth() - 32;
  for (const it of items) {
    const lines = doc.splitTextToSize(it, w);
    doc.setFillColor(...COLORS.primary);
    doc.circle(16, y - 1.6, 0.9, "F");
    doc.text(lines, 20, y);
    y += lines.length * 4.4 + 1.5;
  }
  return y + 2;
}

function ensureSpace(doc: jsPDF, y: number, needed: number, currentTitle: string): number {
  const h = doc.internal.pageSize.getHeight();
  if (y + needed > h - 18) {
    doc.addPage();
    header(doc, currentTitle);
    return 32;
  }
  return y;
}

function kpiGrid(doc: jsPDF, y: number, items: { label: string; value: string; sub?: string }[]): number {
  const w = doc.internal.pageSize.getWidth() - 28;
  const cols = 4;
  const cellW = w / cols;
  const cellH = 18;
  items.forEach((it, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 14 + col * cellW;
    const yy = y + row * (cellH + 2);
    doc.setFillColor(...COLORS.surface);
    doc.roundedRect(x + 1, yy, cellW - 2, cellH, 1.5, 1.5, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(it.label.toUpperCase(), x + 4, yy + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.text);
    doc.text(it.value, x + 4, yy + 11.5);
    if (it.sub) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.muted);
      doc.text(it.sub, x + 4, yy + 16);
    }
  });
  const rows = Math.ceil(items.length / cols);
  return y + rows * (cellH + 2) + 2;
}

// ---------- main ----------

export async function generateDailyReportPdf(opts: { withAi?: boolean } = {}) {
  const { withAi = true } = opts;
  const today = todayISO();

  const [platforms, daily] = await Promise.all([fetchPlatformData(), fetchDailyMetrics()]);

  const totalsAcrossPlatforms = {
    posts: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    views: 0,
    followers: 0,
  };

  const snapshots = PLATFORMS.map((p) => {
    const { posts, followers } = platforms[p.key];
    const snap = buildChannelSnapshot(p.key, posts, followers);
    totalsAcrossPlatforms.posts += posts.length;
    totalsAcrossPlatforms.followers += followers;
    posts.forEach((x) => {
      totalsAcrossPlatforms.likes += x.like_count ?? 0;
      totalsAcrossPlatforms.comments += x.comments_count ?? 0;
      totalsAcrossPlatforms.shares += x.share_count ?? 0;
      totalsAcrossPlatforms.views += x.view_count ?? 0;
    });
    const todayMetric = daily.find((d) => d.platform === p.key && d.date === today);
    return { ...p, snap, posts, followers, todayMetric };
  });

  // Build minimal payload for AI
  let aiReport: AIReport | null = null;
  if (withAi) {
    try {
      const aiPayload = {
        date: today,
        totals: totalsAcrossPlatforms,
        platforms: snapshots.map((s) => ({
          platform: s.key,
          followers: s.followers,
          window_days: s.snap.windowDays,
          posts_in_window: s.snap.postsLast7d,
          cadence_per_week: s.snap.cadencePerWeek,
          er_followers_pct: s.snap.erFollowers,
          er_views_pct: s.snap.erViews,
          reach_rate_pct: s.snap.reachRate,
          virality_pct: s.snap.virality,
          share_rate_pct: s.snap.shareRate,
          best_hour: s.snap.bestHour?.hour,
          today_sheet: s.todayMetric
            ? {
                posted: s.todayMetric.posted,
                likes: s.todayMetric.likes,
                comments: s.todayMetric.comments,
                shares: s.todayMetric.shares,
                reach: s.todayMetric.reach,
                views: s.todayMetric.views,
                new_followers: s.todayMetric.new_followers,
                engagement_rate: s.todayMetric.engagement_rate,
              }
            : null,
        })),
      };
      const { data, error } = await supabase.functions.invoke("generate-daily-report", {
        body: { metrics: aiPayload },
      });
      if (!error && data?.success) aiReport = data.report as AIReport;
    } catch (e) {
      console.error("AI report failed", e);
    }
  }

  // -------- Build PDF --------
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // Cover
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setFillColor(20, 20, 32);
  doc.rect(0, 0, w, h, "F");
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, h * 0.55, w, h * 0.05, "F");
  doc.setFillColor(...COLORS.accent);
  doc.rect(0, h * 0.6, w, h * 0.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("Relatório Diário", 14, 60);
  doc.setFontSize(28);
  doc.text("de Audiência", 14, 72);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("Hopi Hari · Multi-Plataforma", 14, 84);

  doc.setFontSize(10);
  doc.text(
    new Date().toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
    14,
    h * 0.65
  );
  doc.setFontSize(8);
  doc.text("Gerado automaticamente · dados consolidados de Instagram, TikTok, Facebook, YouTube e LinkedIn", 14, h * 0.65 + 6);

  // Page 2: Executive Summary
  doc.addPage();
  header(doc, "Sumário Executivo", new Date().toLocaleDateString("pt-BR"));
  let y = 32;
  y = sectionTitle(doc, y, "Visão Consolidada");
  y = kpiGrid(doc, y, [
    { label: "Posts (base)", value: fmt(totalsAcrossPlatforms.posts) },
    { label: "Seguidores totais", value: fmt(totalsAcrossPlatforms.followers) },
    { label: "Curtidas (acum.)", value: fmt(totalsAcrossPlatforms.likes) },
    { label: "Comentários", value: fmt(totalsAcrossPlatforms.comments) },
    { label: "Compartilhamentos", value: fmt(totalsAcrossPlatforms.shares) },
    { label: "Views", value: fmt(totalsAcrossPlatforms.views) },
    { label: "Plataformas", value: String(PLATFORMS.length) },
    { label: "Data", value: new Date().toLocaleDateString("pt-BR") },
  ]);

  y += 4;
  if (aiReport?.executive_summary) {
    y = sectionTitle(doc, y, "Análise da IA");
    y = writeParagraph(doc, y, aiReport.executive_summary, { size: 9.5 });
    y += 3;
  }

  if (aiReport?.key_findings?.length) {
    y = ensureSpace(doc, y, 30, "Sumário Executivo");
    y = sectionTitle(doc, y, "Principais Descobertas");
    y = bullets(doc, y, aiReport.key_findings);
  }

  if (aiReport?.recommendations?.length) {
    y = ensureSpace(doc, y, 30, "Sumário Executivo");
    y = sectionTitle(doc, y, "Recomendações para Amanhã");
    y = bullets(doc, y, aiReport.recommendations);
  }

  if (aiReport?.risks?.length) {
    y = ensureSpace(doc, y, 30, "Sumário Executivo");
    y = sectionTitle(doc, y, "Riscos & Atenção");
    y = bullets(doc, y, aiReport.risks);
  }

  // ----- Novos Seguidores · Últimos 7 dias (estilo dashboard) -----
  {
    const DAY = 24 * 60 * 60 * 1000;
    // Compute per-platform: last 7d new followers + last 1d, relative to that platform's latest entry
    const stats: Record<string, { newF: number; newDay: number; total: number; lastDate: string | null }> = {};
    for (const p of PLATFORMS) {
      const series = daily
        .filter((d) => d.platform === p.key)
        .slice()
        .sort((a, b) => (a.date < b.date ? -1 : 1));
      const withFollowers = series.filter((d) => (d.followers ?? 0) > 0);
      const last = withFollowers[withFollowers.length - 1];
      const total =
        last?.followers ?? snapshots.find((s) => s.key === p.key)?.followers ?? 0;
      const lastDate = last?.date ?? series[series.length - 1]?.date ?? null;
      const lastTs = lastDate ? parseDateOnly(lastDate).getTime() : Date.now();

      // Sum of new_followers over last 7 days relative to lastDate
      const cutoff7 = lastTs - 7 * DAY;
      const cutoff1 = lastTs - 1 * DAY;
      let sum7 = series
        .filter((d) => parseDateOnly(d.date).getTime() > cutoff7)
        .reduce((s, d) => s + (d.new_followers || 0), 0);
      let sum1 = series
        .filter((d) => parseDateOnly(d.date).getTime() > cutoff1)
        .reduce((s, d) => s + (d.new_followers || 0), 0);

      // Fallback: follower delta if new_followers absent
      if (sum7 === 0 && withFollowers.length >= 2) {
        const findOnOrBefore = (ts: number) => {
          let pick;
          for (const r of withFollowers) {
            if (parseDateOnly(r.date).getTime() <= ts) pick = r;
            else break;
          }
          return pick;
        };
        const w = findOnOrBefore(lastTs - 7 * DAY);
        if (w && last) sum7 = last.followers - w.followers;
        const y1 = findOnOrBefore(lastTs - 1 * DAY);
        if (y1 && last && sum1 === 0) sum1 = last.followers - y1.followers;
      }

      stats[p.key] = { newF: sum7, newDay: sum1, total, lastDate };
    }

    // most recent date across platforms for the section header
    const headerDate = Object.values(stats)
      .map((s) => s.lastDate)
      .filter(Boolean)
      .sort()
      .pop();
    const headerLabel = headerDate
      ? parseDateOnly(headerDate as string).toLocaleDateString("pt-BR")
      : new Date().toLocaleDateString("pt-BR");

    y = ensureSpace(doc, y + 4, 60, "Sumário Executivo");
    y = sectionTitle(doc, y, `Novos Seguidores · Últimos 7 dias · ${headerLabel}`);

    const palette: Record<string, [number, number, number]> = {
      instagram: [236, 72, 153],
      tiktok: [34, 211, 238],
      facebook: [37, 99, 235],
      youtube: [239, 68, 68],
      linkedin: [10, 102, 194],
    };
    const w2 = doc.internal.pageSize.getWidth() - 28;
    const cardW = w2 / PLATFORMS.length - 2;
    const cardH = 46;
    PLATFORMS.forEach((p, i) => {
      const x = 14 + i * (cardW + 2);
      const yy = y;
      const s = stats[p.key];
      const total = s.total;
      const newF = s.newF;
      const newDay = s.newDay;
      const pctGrowth = total ? (newF / total) * 100 : 0;
      const col = palette[p.key] ?? COLORS.primary;
      doc.setFillColor(15, 18, 32);
      doc.roundedRect(x, yy, cardW, cardH, 2, 2, "F");
      doc.setFillColor(...col);
      doc.rect(x, yy, cardW, 1.6, "F");
      // Label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(235, 235, 245);
      doc.text(p.label, x + 3, yy + 7);
      // Big +N (7d)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(...col);
      doc.text(`+${fmt(newF)}`, x + 3, yy + 20);
      // Sub
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(170, 170, 190);
      doc.text("novos · 7 dias", x + 3, yy + 24);
      // Daily delta line
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(74, 222, 128);
      doc.text(`Hoje: ${newDay >= 0 ? "+" : ""}${fmt(newDay)}`, x + 3, yy + 30);
      // Divider
      doc.setDrawColor(60, 60, 90);
      doc.line(x + 3, yy + 33, x + cardW - 3, yy + 33);
      // Total
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(210, 210, 225);
      doc.text(`Total: ${fmt(total)}`, x + 3, yy + 38);
      // Growth %
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(74, 222, 128);
      doc.text(`+${pctGrowth.toFixed(3)}% crescimento`, x + 3, yy + 43);
    });
    y += cardH + 4;
  }



  // ----- Crescimento Diário de Seguidores (por plataforma) -----
  {
    const DAY = 24 * 60 * 60 * 1000;
    const rowsBody = PLATFORMS.map((p) => {
      const series = daily
        .filter((d) => d.platform === p.key && (d.followers ?? 0) > 0)
        .slice()
        .sort((a, b) => (a.date < b.date ? -1 : 1));
      if (!series.length) return [p.label, "—", "—", "—", "—", "—", "—"];
      const last = series[series.length - 1];
      const lastTs = parseDateOnly(last.date).getTime();
      const findOnOrBefore = (ts: number) => {
        let pick: DailyMetric | undefined;
        for (const r of series) {
          if (parseDateOnly(r.date).getTime() <= ts) pick = r;
          else break;
        }
        return pick;
      };
      const y1 = findOnOrBefore(lastTs - DAY);
      const w1 = findOnOrBefore(lastTs - 7 * DAY);
      const m1 = findOnOrBefore(lastTs - 30 * DAY);
      const dDay = y1 ? last.followers - y1.followers : last.new_followers || 0;
      const dWeek = w1 ? last.followers - w1.followers : null;
      const dMonth = m1 ? last.followers - m1.followers : null;
      const pctDay = y1 && y1.followers ? (dDay / y1.followers) * 100 : null;
      const pctWeek = w1 && w1.followers && dWeek != null ? (dWeek / w1.followers) * 100 : null;
      const pctMonth = m1 && m1.followers && dMonth != null ? (dMonth / m1.followers) * 100 : null;
      const sig = (n: number) => (n >= 0 ? `+${fmt(n)}` : fmt(n));
      return [
        p.label,
        fmt(last.followers),
        `${sig(dDay)}${pctDay != null ? `  (${pctDay >= 0 ? "+" : ""}${pctDay.toFixed(2)}%)` : ""}`,
        dWeek != null ? `${sig(dWeek)}${pctWeek != null ? `  (${pctWeek >= 0 ? "+" : ""}${pctWeek.toFixed(2)}%)` : ""}` : "—",
        dMonth != null ? `${sig(dMonth)}${pctMonth != null ? `  (${pctMonth >= 0 ? "+" : ""}${pctMonth.toFixed(2)}%)` : ""}` : "—",
        parseDateOnly(last.date).toLocaleDateString("pt-BR"),
        String(series.length),
      ];
    });

    y = ensureSpace(doc, y + 4, 60, "Sumário Executivo");
    y = sectionTitle(doc, y, "Crescimento Diário de Seguidores");
    autoTable(doc, {
      startY: y + 2,
      head: [["Plataforma", "Total atual", "Var. diária", "Var. 7 dias", "Var. 30 dias", "Última atualização", "Dias c/ dado"]],
      body: rowsBody,
      headStyles: { fillColor: COLORS.primary, textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: COLORS.text },
      alternateRowStyles: { fillColor: COLORS.surface },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 4;
  }




  // Cross-platform comparison table
  doc.addPage();
  header(doc, "Comparativo Multi-Plataforma");
  sectionTitle(doc, 32, "Snapshot por Plataforma");
  autoTable(doc, {
    startY: 38,
    head: [["Plataforma", "Seguidores", "Posts (jan.)", "Cadência/sem", "ER %", "Reach %", "Virality %", "Share %"]],
    body: snapshots.map((s) => [
      s.label,
      fmt(s.followers),
      fmt(s.snap.postsLast7d),
      s.snap.cadencePerWeek.toFixed(1),
      pct(s.snap.erFollowers),
      pct(s.snap.reachRate, 1),
      pct(s.snap.virality),
      pct(s.snap.shareRate),
    ]),
    headStyles: { fillColor: COLORS.primary, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: COLORS.text },
    alternateRowStyles: { fillColor: COLORS.surface },
    margin: { left: 14, right: 14 },
  });

  // Daily metrics from spreadsheet (last 14 days per platform)
  const last14 = (() => {
    const out: Record<string, DailyMetric[]> = {};
    for (const p of PLATFORMS) {
      out[p.key] = daily.filter((d) => d.platform === p.key).slice(0, 14);
    }
    return out;
  })();
  const hasDaily = Object.values(last14).some((arr) => arr.length > 0);
  if (hasDaily) {
    let yy = (doc as any).lastAutoTable.finalY + 8;
    yy = sectionTitle(doc, yy, "Planilha Diária — Últimos 14 dias (totais)");
    autoTable(doc, {
      startY: yy + 2,
      head: [["Plataforma", "Dias c/ post", "Curtidas", "Comentários", "Shares", "Alcance", "Views", "Novos seg.", "ER médio %"]],
      body: PLATFORMS.map((p) => {
        const arr = last14[p.key];
        if (!arr.length) return [p.label, "—", "—", "—", "—", "—", "—", "—", "—"];
        const sum = (k: keyof DailyMetric) => arr.reduce((s, x) => s + (Number(x[k]) || 0), 0);
        const erAvg =
          arr.filter((x) => x.engagement_rate).reduce((s, x) => s + x.engagement_rate, 0) /
          Math.max(1, arr.filter((x) => x.engagement_rate).length);
        return [
          p.label,
          fmt(arr.filter((x) => x.posted).length),
          fmt(sum("likes")),
          fmt(sum("comments")),
          fmt(sum("shares")),
          fmt(sum("reach")),
          fmt(sum("views")),
          fmt(sum("new_followers")),
          erAvg ? erAvg.toFixed(2) : "—",
        ];
      }),
      headStyles: { fillColor: COLORS.accent, textColor: 0, fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: COLORS.text },
      alternateRowStyles: { fillColor: COLORS.surface },
      margin: { left: 14, right: 14 },
    });
  }

  // Per-platform deep dives
  for (const s of snapshots) {
    doc.addPage();
    header(doc, s.label, `${fmt(s.followers)} seguidores`);
    let py = 32;
    py = sectionTitle(doc, py, `${s.label} — KPIs (${s.snap.windowDays} dias)`);
    py = kpiGrid(doc, py, [
      { label: "ER (followers)", value: pct(s.snap.erFollowers), sub: `prev ${pct(s.snap.erFollowersPrev)}` },
      { label: "ER (views)", value: pct(s.snap.erViews) },
      { label: "Reach Rate", value: pct(s.snap.reachRate, 1) },
      { label: "Virality", value: pct(s.snap.virality) },
      { label: "Share Rate", value: pct(s.snap.shareRate) },
      { label: "Cadência/sem", value: s.snap.cadencePerWeek.toFixed(1) },
      { label: "Gap médio", value: s.snap.avgGapHours ? `${s.snap.avgGapHours.toFixed(1)}h` : "—" },
      { label: "Melhor horário", value: s.snap.bestHour ? `${s.snap.bestHour.hour}h` : "—" },
    ]);

    if (s.todayMetric) {
      py += 3;
      py = sectionTitle(doc, py, "Hoje (planilha)");
      py = kpiGrid(doc, py, [
        { label: "Postou?", value: s.todayMetric.posted ? "Sim" : "Não" },
        { label: "Curtidas", value: fmt(s.todayMetric.likes) },
        { label: "Comentários", value: fmt(s.todayMetric.comments) },
        { label: "Shares", value: fmt(s.todayMetric.shares) },
        { label: "Alcance", value: fmt(s.todayMetric.reach) },
        { label: "Views", value: fmt(s.todayMetric.views) },
        { label: "Novos seg.", value: fmt(s.todayMetric.new_followers) },
        { label: "ER %", value: s.todayMetric.engagement_rate ? s.todayMetric.engagement_rate.toFixed(2) : "—" },
      ]);
    }

    if (aiReport?.per_platform?.[s.key]) {
      py += 3;
      py = ensureSpace(doc, py, 30, s.label);
      py = sectionTitle(doc, py, "Análise IA");
      py = writeParagraph(doc, py, aiReport.per_platform[s.key]);
    }

    // Top posts
    const tops = topPosts(s.posts, 5);
    if (tops.length) {
      py += 3;
      py = ensureSpace(doc, py, 40, s.label);
      py = sectionTitle(doc, py, "Top 5 Posts (interações)");
      autoTable(doc, {
        startY: py + 2,
        head: [["#", "Data", "Tipo", "Curtidas", "Coment.", "Shares", "Views", "Legenda"]],
        body: tops.map((p, i) => [
          String(i + 1),
          p.timestamp ? new Date(p.timestamp).toLocaleDateString("pt-BR") : "—",
          p.media_type ?? "—",
          fmt(p.like_count ?? 0),
          fmt(p.comments_count ?? 0),
          fmt(p.share_count ?? 0),
          fmt(p.view_count ?? 0),
          latin1(p.caption ?? "").slice(0, 90) + (latin1(p.caption ?? "").length > 90 ? "..." : ""),
        ]),
        headStyles: { fillColor: COLORS.primary, textColor: 255, fontSize: 8.5 },
        bodyStyles: { fontSize: 8, textColor: COLORS.text },
        alternateRowStyles: { fillColor: COLORS.surface },
        columnStyles: { 7: { cellWidth: 60 } },
        margin: { left: 14, right: 14 },
      });
    }

    // Daily series (last 14 from sheet)
    const series = last14[s.key];
    if (series.length) {
      let yy = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : py + 6;
      yy = ensureSpace(doc, yy, 50, s.label);
      yy = sectionTitle(doc, yy, "Série Diária (planilha)");
      autoTable(doc, {
        startY: yy + 2,
        head: [["Data", "Postou?", "Curtidas", "Coment.", "Shares", "Alcance", "Views", "Novos seg.", "ER %"]],
        body: series
          .slice()
          .reverse()
          .map((d) => [
            parseDateOnly(d.date).toLocaleDateString("pt-BR"),
            d.posted ? "Sim" : "Não",
            fmt(d.likes),
            fmt(d.comments),
            fmt(d.shares),
            fmt(d.reach),
            fmt(d.views),
            fmt(d.new_followers),
            d.engagement_rate ? d.engagement_rate.toFixed(2) : "—",
          ]),
        headStyles: { fillColor: COLORS.accent, textColor: 0, fontSize: 8.5 },
        bodyStyles: { fontSize: 8, textColor: COLORS.text },
        alternateRowStyles: { fillColor: COLORS.surface },
        margin: { left: 14, right: 14 },
      });
    }
  }

  // Footers
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    if (i > 1) footer(doc, i, total);
  }

  const fileName = `hopi-hari-relatorio-${today}.pdf`;
  doc.save(fileName);
  return fileName;
}
