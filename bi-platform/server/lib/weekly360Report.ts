import { type RowDataPacket } from "mysql2/promise";
import { getPool } from "../_core/mysqlPool";
import { collectBiSnapshot } from "./biSnapshot";
import { getSocialComparison } from "./socialComparison";
import { getCampaignSalesCorrelation } from "./campaignSalesCorrelation";
import { getHoraDoHorrorSignals } from "./horaDoHorrorSignals";
import { getFollowerSheetStatus } from "./followerSheetSync";
import { listCampaignArchiveImports } from "./campaignArchiveImports";
import {
  getLatestFacebookDemographics,
  getLatestInstagramDemographics,
  getLatestTiktokAudience,
  listDailyBriefings,
  listSocialFollowerHistory,
} from "../db";


const number = (value: unknown) => Number(value ?? 0);
const nullableNumber = (value: unknown) => value === null || value === undefined ? null : Number(value);
const text = (value: unknown) => String(value ?? "");

function addDays(date: string, amount: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function saoPauloDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const byType = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function parseJson(value: unknown): Record<string, unknown> | null {
  try {
    if (value && typeof value === "object") return value as Record<string, unknown>;
    const parsed = JSON.parse(String(value ?? ""));
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

type RevenueRow = RowDataPacket & {
  business_date: string;
  local_hour: number | string;
  internal_revenue_cents: number | string;
  external_revenue_cents: number | string;
  gross_revenue_cents: number | string;
  internal_per_capita_cents: number | string | null;
};

type AttendanceRow = RowDataPacket & {
  business_date: string;
  local_hour: number | string;
  public_count: number | string;
  paying_count: number | string;
  complimentary_count: number | string;
  currently_in_park: number | string;
};

async function getOperationalWeek(periodStart: string, periodEnd: string) {
  const db = getPool();
  const [revenueRows] = await db.query<RevenueRow[]>(
    `SELECT r.business_date, r.local_hour, r.internal_revenue_cents, r.external_revenue_cents,
      r.gross_revenue_cents, r.internal_per_capita_cents
     FROM revenue_snapshots r
     JOIN (
       SELECT business_date, MAX(observed_at) AS latest_observed_at
       FROM revenue_snapshots
       WHERE business_date BETWEEN ? AND ?
       GROUP BY business_date
     ) latest ON latest.business_date = r.business_date AND latest.latest_observed_at = r.observed_at
     ORDER BY r.business_date ASC`,
    [periodStart, periodEnd],
  );
  const [attendanceRows] = await db.query<AttendanceRow[]>(
    `SELECT a.business_date, a.local_hour, a.public_count, a.paying_count, a.complimentary_count, a.currently_in_park
     FROM attendance_snapshots a
     JOIN (
       SELECT business_date, MAX(observed_at) AS latest_observed_at
       FROM attendance_snapshots
       WHERE business_date BETWEEN ? AND ?
       GROUP BY business_date
     ) latest ON latest.business_date = a.business_date AND latest.latest_observed_at = a.observed_at
     ORDER BY a.business_date ASC`,
    [periodStart, periodEnd],
  );
  const [channelRows] = await db.query<RowDataPacket[]>(
    `SELECT c.code, c.business_group, c.classification, SUM(d.revenue_cents) AS revenue_cents
     FROM revenue_channel_snapshots d
     JOIN revenue_channels c ON c.id = d.channel_id
     JOIN revenue_snapshots r ON r.id = d.snapshot_id
     JOIN (
       SELECT business_date, MAX(observed_at) AS latest_observed_at
       FROM revenue_snapshots
       WHERE business_date BETWEEN ? AND ?
       GROUP BY business_date
     ) latest ON latest.business_date = r.business_date AND latest.latest_observed_at = r.observed_at
     GROUP BY c.id, c.code, c.business_group, c.classification
     ORDER BY revenue_cents DESC`,
    [periodStart, periodEnd],
  );
  return {
    revenue: revenueRows.map(row => ({
      date: text(row.business_date),
      localHour: number(row.local_hour),
      internalRevenueCents: number(row.internal_revenue_cents),
      externalRevenueCents: number(row.external_revenue_cents),
      grossRevenueCents: number(row.gross_revenue_cents),
      internalPerCapitaCents: nullableNumber(row.internal_per_capita_cents),
    })),
    attendance: attendanceRows.map(row => ({
      date: text(row.business_date),
      localHour: number(row.local_hour),
      publicCount: number(row.public_count),
      payingCount: number(row.paying_count),
      complimentaryCount: number(row.complimentary_count),
      currentlyInPark: number(row.currently_in_park),
    })),
    channels: channelRows.map(row => ({
      code: text(row.code),
      businessGroup: text(row.business_group),
      classification: text(row.classification),
      revenueCents: number(row.revenue_cents),
    })),
  };
}

export function summarizeFollowers(rows: Awaited<ReturnType<typeof listSocialFollowerHistory>>) {
  const byPlatform = new Map<string, Array<{ date: string; followers: number }>>();
  for (const row of rows) {
    const platform = String(row.platform);
    const list = byPlatform.get(platform) ?? [];
    list.push({ date: row.observedDate, followers: row.followerCount });
    byPlatform.set(platform, list);
  }
  const observedDates = [...new Set(rows.map(row => row.observedDate))].sort();
  const latestObservedDate = observedDates.at(-1) ?? null;
  const targetBaselineDate = latestObservedDate ? addDays(latestObservedDate, -7) : null;
  const platforms = ["Instagram", "TikTok", "Facebook", "YouTube", "LinkedIn"];
  const items = platforms.map(platform => {
    const series = (byPlatform.get(platform) ?? []).sort((a, b) => a.date.localeCompare(b.date));
    const latest = latestObservedDate ? [...series].reverse().find(row => row.date <= latestObservedDate) ?? null : null;
    const baseline = targetBaselineDate ? [...series].reverse().find(row => row.date <= targetBaselineDate) ?? null : null;
    return {
      platform,
      latestDate: latest?.date ?? null,
      followers: latest?.followers ?? null,
      baselineDate: baseline?.date ?? null,
      weeklyDelta: latest && baseline ? latest.followers - baseline.followers : null,
    };
  });
  const totalFollowers = items.reduce((sum, item) => sum + (item.followers ?? 0), 0);
  const completeWeeklyItems = items.filter(item => item.followers !== null && item.weeklyDelta !== null);
  const weeklyDelta = completeWeeklyItems.length === items.length
    ? completeWeeklyItems.reduce((sum, item) => sum + (item.weeklyDelta ?? 0), 0)
    : null;
  return {
    totalFollowers,
    weeklyDelta,
    latestObservedDate,
    targetBaselineDate,
    items,
    totalGoal: 4_000_000,
    instagramGoal: 3_000_000,
  };
}

function percentChange(current: number, previous: number) {
  return previous === 0 ? null : ((current - previous) / previous) * 100;
}

export type Weekly360Report = Awaited<ReturnType<typeof getWeekly360Report>>;

export async function getWeekly360Report() {
  const db = getPool();
  const [maxRows] = await db.query<RowDataPacket[]>(
    `SELECT GREATEST(
       COALESCE((SELECT MAX(business_date) FROM revenue_snapshots), '1900-01-01'),
       COALESCE((SELECT MAX(business_date) FROM attendance_snapshots), '1900-01-01')
     ) AS period_end`,
  );
  const observedEnd = text(maxRows[0]?.period_end);
  const periodEnd = observedEnd > "1900-01-01" ? observedEnd : saoPauloDate();
  const periodStart = addDays(periodEnd, -6);

  const [snapshot, operations, social, followerRows, followerStatus, campaignSales, horrorSignals, archiveImports, briefings, instagramDemo, facebookDemo, tiktokDemo] = await Promise.all([
    collectBiSnapshot(),
    getOperationalWeek(periodStart, periodEnd),
    getSocialComparison({ from: periodStart, to: periodEnd, platforms: ["facebook", "instagram", "tiktok"] }),
    listSocialFollowerHistory(),
    getFollowerSheetStatus(),
    getCampaignSalesCorrelation(),
    getHoraDoHorrorSignals(periodEnd),
    listCampaignArchiveImports(),
    listDailyBriefings(1),
    getLatestInstagramDemographics(),
    getLatestFacebookDemographics(),
    getLatestTiktokAudience(),
  ]);

  const followers = summarizeFollowers(followerRows);
  const revenueTotalCents = operations.revenue.reduce((sum, row) => sum + row.grossRevenueCents, 0);
  const internalRevenueCents = operations.revenue.reduce((sum, row) => sum + row.internalRevenueCents, 0);
  const externalRevenueCents = operations.revenue.reduce((sum, row) => sum + row.externalRevenueCents, 0);
  const visitors = operations.attendance.reduce((sum, row) => sum + row.publicCount, 0);
  const payingVisitors = operations.attendance.reduce((sum, row) => sum + row.payingCount, 0);
  const complimentaryVisitors = operations.attendance.reduce((sum, row) => sum + row.complimentaryCount, 0);
  const latestRevenue = operations.revenue.at(-1) ?? null;
  const previousRevenue = operations.revenue.at(-2) ?? null;
  const latestAttendance = operations.attendance.at(-1) ?? null;
  const previousAttendance = operations.attendance.at(-2) ?? null;
  const socialRows = social.platforms.map(platform => ({ platform, ...social.summary[platform] }));
  const topSocial = [...socialRows]
    .filter(row => row.totals.interactions !== null)
    .sort((a, b) => number(b.totals.interactions) - number(a.totals.interactions))[0] ?? null;
  const verifiedArchives = archiveImports.filter(row => row.verificationStatus === "verified_match");
  const risks: string[] = [];
  const actions: string[] = [];
  if (operations.revenue.length < 7) risks.push(`A janela semanal tem ${operations.revenue.length} dias de fechamento de receita observados; os totais não representam sete dias completos.`);
  if (operations.attendance.length < 7) risks.push(`A janela semanal tem ${operations.attendance.length} dias de público observados; tendências devem ser lidas como cobertura parcial.`);
  if (campaignSales.summary.campaignsWithPosts === 0) risks.push("Nenhuma campanha foi reconhecida com segurança nas legendas e hashtags dos posts disponíveis.");
  if (snapshot.coverage.warnings.length) risks.push(`${snapshot.coverage.warnings.length} fonte(s) reportaram indisponibilidade ou cobertura parcial.`);
  actions.push("Revisar as campanhas reconhecidas por posts e associar UTMs ou códigos promocionais antes de interpretar impacto em vendas.");
  actions.push("Completar os fechamentos operacionais faltantes da janela para permitir uma comparação semanal integral.");
  if (topSocial) actions.push(`Usar ${topSocial.platform} como referência de execução nesta janela, mantendo a comparação por intenção e não apenas por alcance.`);
  else actions.push("Completar a cobertura social diária antes de priorizar uma plataforma por desempenho semanal.");

  const latestBriefing = briefings[0] ? {
    reportDate: briefings[0].reportDate,
    title: briefings[0].title,
    executiveSummary: briefings[0].executiveSummary,
    status: briefings[0].status,
    generatedAt: briefings[0].generatedAt.toISOString(),
    audioReady: Boolean(briefings[0].audioUrl),
  } : null;

  return {
    report: {
      title: "Relatório Executivo Hopi Hari 360°",
      periodStart,
      periodEnd,
      generatedAt: new Date().toISOString(),
      timeZone: "America/Sao_Paulo",
      coverageStatus: operations.revenue.length >= 7 && operations.attendance.length >= 7 ? "complete" as const : "partial" as const,
      methodology: "Janela móvel de sete dias encerrada na data operacional mais recente. Fechamentos diários usam o último snapshot de cada data. Campanhas podem ser reconhecidas por nomes ou hashtags explícitos nos posts; análise comercial exige cobertura mínima e representa associação observada, não causalidade. Dados individuais de CPF não são exportados.",
    },
    executive: {
      thesis: `A leitura 360° combina ${operations.revenue.length} fechamento(s) de receita, ${operations.attendance.length} fechamento(s) de público, ${socialRows.reduce((sum, row) => sum + row.observedDays, 0)} observações sociais e ${followers.totalFollowers.toLocaleString("pt-BR")} seguidores monitorados. ${campaignSales.summary.campaignsWithPosts > 0 ? `${campaignSales.summary.campaignsWithPosts} campanha(s) foram reconhecidas por posts publicados.` : "Nenhuma campanha foi reconhecida com segurança nos posts disponíveis."}`,
      risks,
      actions,
    },
    operations: {
      observedRevenueDays: operations.revenue.length,
      observedAttendanceDays: operations.attendance.length,
      revenueTotalCents,
      internalRevenueCents,
      externalRevenueCents,
      visitors,
      payingVisitors,
      complimentaryVisitors,
      payingSharePct: visitors > 0 ? (payingVisitors / visitors) * 100 : null,
      complimentarySharePct: visitors > 0 ? (complimentaryVisitors / visitors) * 100 : null,
      grossRevenuePerVisitorCents: visitors > 0 ? revenueTotalCents / visitors : null,
      latestRevenueChangePct: latestRevenue && previousRevenue ? percentChange(latestRevenue.grossRevenueCents, previousRevenue.grossRevenueCents) : null,
      latestAttendanceChangePct: latestAttendance && previousAttendance ? percentChange(latestAttendance.publicCount, previousAttendance.publicCount) : null,
      revenueDaily: operations.revenue,
      attendanceDaily: operations.attendance,
      channels: operations.channels,
    },
    commercial: snapshot.sales.monthlyContext,
    followers,
    social,
    audience: {
      crm: snapshot.crm,
      reputation: snapshot.reputation,
      instagram: { observedDate: instagramDemo?.observedDate ?? null, demographics: parseJson(instagramDemo?.demographicsJson) },
      facebook: { observedDate: facebookDemo?.observedDate ?? null, demographics: parseJson(facebookDemo?.demographicsJson) },
      tiktok: { observedDate: tiktokDemo?.observedDate ?? null, demographics: parseJson(tiktokDemo?.demographicsJson) },
    },
    campaigns: {
      inventory: snapshot.campaigns,
      archiveImports,
      verifiedArchiveCount: verifiedArchives.length,
      verifiedArchiveAssets: verifiedArchives.reduce((sum, row) => sum + row.matchedAssetCount, 0),
      salesCorrelation: campaignSales,
      horaDoHorrorSignals: horrorSignals,
    },
    strategy: {
      latestBriefing,
      globalInstagramReport: snapshot.strategy.globalInstagramReport,
      globalInstagramReportCreatedAt: snapshot.strategy.globalInstagramReportCreatedAt,
      governanceNote: snapshot.strategy.governanceNote,
      recommendations: actions,
    },
    dataQuality: {
      sourceCoverage: snapshot.coverage,
      operationalSources: snapshot.operations.sources,
      followerSync: followerStatus,
      warnings: risks,
    },
  };
}
