import { type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import { getPool } from "../_core/mysqlPool";
import { calculatePearsonCorrelation } from "./horaDoHorrorCorrelation";
import { getCampaignPostEvidence } from "./postCampaignAttribution";

export const MINIMUM_CAMPAIGN_DAYS = 3;
export const MINIMUM_BASELINE_DAYS = 3;
export const BASELINE_LOOKBACK_DAYS = 14;
export const LAG_WINDOW_DAYS = 7;

type CampaignRow = RowDataPacket & {
  id: number;
  drive_folder_id: string;
  name: string;
  brand: string | null;
  period_start: string | null;
  period_end: string | null;
  asset_count: number | string;
  image_count: number | string;
  video_count: number | string;
};

type OfficialCampaignRow = RowDataPacket & {
  id: number;
  edition: string;
  period_start: string;
  period_end: string;
  status: string;
};

type SalesRow = RowDataPacket & {
  business_date: string;
  gross_revenue_cents: number | string;
  internal_revenue_cents: number | string;
  external_revenue_cents: number | string;
  ticket_revenue_cents: number | string | null;
  public_count: number | string | null;
  paying_count: number | string | null;
};

export type SalesDay = {
  date: string;
  grossRevenueCents: number;
  internalRevenueCents: number;
  externalRevenueCents: number;
  ticketRevenueCents: number;
  visitors: number | null;
  payingVisitors: number | null;
  averageTicketCents: number | null;
};

export type CampaignDefinition = {
  id: string;
  driveFolderId: string | null;
  name: string;
  brand: string | null;
  source: "google_drive" | "official_registry";
  periodStart: string | null;
  periodEnd: string | null;
  periodSource: "official" | "post_activity" | null;
  assets: number;
  images: number;
  videos: number;
  postEvidence: {
    posts: number;
    observedDays: number;
    interactions: number;
    views: number;
    platforms: string[];
  } | null;
};

export type CampaignSalesStatus =
  | "missing_dates"
  | "no_sales_overlap"
  | "insufficient_campaign_days"
  | "insufficient_baseline_days"
  | "ready";


const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const deltaPct = (campaign: number | null, baseline: number | null) => campaign === null || baseline === null || baseline === 0
  ? null
  : Number((((campaign - baseline) / baseline) * 100).toFixed(1));

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function summarizeDays(days: SalesDay[]) {
  return {
    observedDays: days.length,
    averageGrossRevenueCents: average(days.map(day => day.grossRevenueCents)),
    averageInternalRevenueCents: average(days.map(day => day.internalRevenueCents)),
    averageExternalRevenueCents: average(days.map(day => day.externalRevenueCents)),
    averageTicketRevenueCents: average(days.map(day => day.ticketRevenueCents)),
    averageVisitors: average(days.flatMap(day => day.visitors === null ? [] : [day.visitors])),
    averagePayingVisitors: average(days.flatMap(day => day.payingVisitors === null ? [] : [day.payingVisitors])),
    averageTicketCents: average(days.flatMap(day => day.averageTicketCents === null ? [] : [day.averageTicketCents])),
  };
}

export function analyzeCampaignSales(
  campaign: CampaignDefinition,
  salesDays: SalesDay[],
  allCampaigns: CampaignDefinition[],
) {
  if (!campaign.periodStart || !campaign.periodEnd) {
    return { ...campaign, status: "missing_dates" as const, campaign: summarizeDays([]), baseline: summarizeDays([]), lag: summarizeDays([]), deltas: null };
  }

  const campaignDays = salesDays.filter(day => day.date >= campaign.periodStart! && day.date <= campaign.periodEnd!);
  const baselineStart = addDays(campaign.periodStart, -BASELINE_LOOKBACK_DAYS);
  const baselineEnd = addDays(campaign.periodStart, -1);
  const baselineDays = salesDays
    .filter(day => day.date >= baselineStart && day.date <= baselineEnd)
    .filter(day => !allCampaigns.some(other => other.id !== campaign.id && other.periodStart && other.periodEnd && day.date >= other.periodStart && day.date <= other.periodEnd))
    .slice(-7);
  const lagStart = addDays(campaign.periodEnd, 1);
  const lagEnd = addDays(campaign.periodEnd, LAG_WINDOW_DAYS);
  const lagDays = salesDays.filter(day => day.date >= lagStart && day.date <= lagEnd);
  const campaignSummary = summarizeDays(campaignDays);
  const baselineSummary = summarizeDays(baselineDays);

  const status: CampaignSalesStatus = campaignDays.length === 0
    ? "no_sales_overlap"
    : campaignDays.length < MINIMUM_CAMPAIGN_DAYS
      ? "insufficient_campaign_days"
      : baselineDays.length < MINIMUM_BASELINE_DAYS
        ? "insufficient_baseline_days"
        : "ready";
  const deltas = status === "ready" ? {
    grossRevenuePct: deltaPct(campaignSummary.averageGrossRevenueCents, baselineSummary.averageGrossRevenueCents),
    internalRevenuePct: deltaPct(campaignSummary.averageInternalRevenueCents, baselineSummary.averageInternalRevenueCents),
    externalRevenuePct: deltaPct(campaignSummary.averageExternalRevenueCents, baselineSummary.averageExternalRevenueCents),
    ticketRevenuePct: deltaPct(campaignSummary.averageTicketRevenueCents, baselineSummary.averageTicketRevenueCents),
    visitorsPct: deltaPct(campaignSummary.averageVisitors, baselineSummary.averageVisitors),
    payingVisitorsPct: deltaPct(campaignSummary.averagePayingVisitors, baselineSummary.averagePayingVisitors),
    averageTicketPct: deltaPct(campaignSummary.averageTicketCents, baselineSummary.averageTicketCents),
  } : null;

  return { ...campaign, status, campaign: campaignSummary, baseline: baselineSummary, lag: summarizeDays(lagDays), deltas };
}

export async function getCampaignSalesCorrelation() {
  const db = getPool();
  const [[driveRows], [officialRows], [salesRows], postEvidence] = await Promise.all([
    db.query<CampaignRow[]>(
      `SELECT id, drive_folder_id, name, brand, period_start, period_end, asset_count, image_count, video_count
       FROM drive_campaigns WHERE active = 1 ORDER BY name`,
    ),
    db.query<OfficialCampaignRow[]>(
      `SELECT id, edition, period_start, period_end, status
       FROM hora_do_horror_campaigns WHERE active = 1 ORDER BY period_start DESC`,
    ),
    db.query<SalesRow[]>(
      `WITH latest_revenue AS (
         SELECT id, business_date, gross_revenue_cents, internal_revenue_cents, external_revenue_cents,
           ROW_NUMBER() OVER (PARTITION BY business_date ORDER BY observed_at DESC) AS rn
         FROM revenue_snapshots
       ), latest_attendance AS (
         SELECT business_date, public_count, paying_count,
           ROW_NUMBER() OVER (PARTITION BY business_date ORDER BY observed_at DESC) AS rn
         FROM attendance_snapshots
       )
       SELECT r.business_date, r.gross_revenue_cents, r.internal_revenue_cents, r.external_revenue_cents,
         COALESCE(SUM(CASE WHEN c.business_group = 'Ingressos' THEN s.revenue_cents ELSE 0 END), 0) AS ticket_revenue_cents,
         a.public_count, a.paying_count
       FROM latest_revenue r
       LEFT JOIN revenue_channel_snapshots s ON s.snapshot_id = r.id
       LEFT JOIN revenue_channels c ON c.id = s.channel_id
       LEFT JOIN latest_attendance a ON a.business_date = r.business_date AND a.rn = 1
       WHERE r.rn = 1
       GROUP BY r.id, r.business_date, r.gross_revenue_cents, r.internal_revenue_cents, r.external_revenue_cents, a.public_count, a.paying_count
       ORDER BY r.business_date`,
    ),
    getCampaignPostEvidence(),
  ]);

  const evidenceByFolder = new Map(postEvidence.evidence.map(item => [item.driveFolderId, item]));

  const campaigns: CampaignDefinition[] = [
    ...driveRows.map(row => {
      const evidence = evidenceByFolder.get(String(row.drive_folder_id));
      const hasOfficialPeriod = Boolean(row.period_start && row.period_end);
      return {
        id: `drive:${row.id}`,
        driveFolderId: String(row.drive_folder_id),
        name: String(row.name),
        brand: row.brand ? String(row.brand) : null,
        source: "google_drive" as const,
        periodStart: row.period_start ? String(row.period_start) : evidence?.firstPostDate ?? null,
        periodEnd: row.period_end ? String(row.period_end) : evidence?.lastPostDate ?? null,
        periodSource: hasOfficialPeriod ? "official" as const : evidence ? "post_activity" as const : null,
        assets: Number(row.asset_count ?? 0),
        images: Number(row.image_count ?? 0),
        videos: Number(row.video_count ?? 0),
        postEvidence: evidence ? {
          posts: evidence.posts,
          observedDays: evidence.observedDays,
          interactions: evidence.interactions,
          views: evidence.views,
          platforms: evidence.platforms.map(item => item.platform),
        } : null,
      };
    }),
    ...officialRows.map(row => ({
      id: `official:${row.id}`,
      driveFolderId: null,
      name: String(row.edition),
      brand: "Hora do Horror",
      source: "official_registry" as const,
      periodStart: String(row.period_start),
      periodEnd: String(row.period_end),
      periodSource: "official" as const,
      assets: 0,
      images: 0,
      videos: 0,
      postEvidence: null,
    })),
  ];
  const salesDays: SalesDay[] = salesRows.map(row => {
    const payingVisitors = row.paying_count === null ? null : Number(row.paying_count);
    const ticketRevenueCents = Number(row.ticket_revenue_cents ?? 0);
    return {
      date: String(row.business_date),
      grossRevenueCents: Number(row.gross_revenue_cents),
      internalRevenueCents: Number(row.internal_revenue_cents),
      externalRevenueCents: Number(row.external_revenue_cents),
      ticketRevenueCents,
      visitors: row.public_count === null ? null : Number(row.public_count),
      payingVisitors,
      averageTicketCents: payingVisitors && payingVisitors > 0 ? ticketRevenueCents / payingVisitors : null,
    };
  });
  const results = campaigns.map(campaign => analyzeCampaignSales(campaign, salesDays, campaigns));
  const ready = results.filter(result => result.status === "ready" && result.deltas?.grossRevenuePct !== null);
  // Official-registry campaigns have no Drive assets (always 0); including
  // them would inject artificial x=0 points into the asset/revenue correlation.
  const readyWithAssets = ready.filter(result => result.source === "google_drive");
  const assetRevenueCorrelation = readyWithAssets.length >= 5
    ? calculatePearsonCorrelation(readyWithAssets.map(item => ({ date: item.id, socialValue: item.assets, revenueCents: item.deltas!.grossRevenuePct! })), 5)
    : null;

  return {
    methodology: "Reconhece campanhas por nomes, hashtags ou aliases explícitos nos posts. Quando não há período oficial, usa apenas a janela observada entre a primeira e a última publicação vinculada. Compara a média diária dessa janela com até sete dias operacionais anteriores, excluindo dias cobertos por outras campanhas. Exibe associação observada, não causalidade.",
    minimumCampaignDays: MINIMUM_CAMPAIGN_DAYS,
    minimumBaselineDays: MINIMUM_BASELINE_DAYS,
    baselineLookbackDays: BASELINE_LOOKBACK_DAYS,
    lagWindowDays: LAG_WINDOW_DAYS,
    salesCoverage: {
      observedDays: salesDays.length,
      firstDate: salesDays[0]?.date ?? null,
      lastDate: salesDays.at(-1)?.date ?? null,
    },
    summary: {
      totalCampaigns: results.length,
      campaignsWithDates: results.filter(item => item.periodStart && item.periodEnd).length,
      campaignsWithPosts: postEvidence.campaignsWithPosts,
      matchedPosts: postEvidence.matchedPosts,
      postInferredCampaigns: results.filter(item => item.periodSource === "post_activity").length,
      readyCampaigns: ready.length,
      assetRevenueCorrelation: assetRevenueCorrelation === null ? null : Number(assetRevenueCorrelation.toFixed(3)),
    },
    campaigns: results,
    attribution: {
      observedAssociation: "available" as const,
      directAttribution: "requires_utm_or_campaign_code" as const,
      postMatching: "campaign_name_or_hashtag" as const,
    },
  };
}

export async function saveDriveCampaignPeriod(input: { driveFolderId: string; periodStart: string; periodEnd: string; brand?: string | null }) {
  const [result] = await getPool().execute<ResultSetHeader>(
    `UPDATE drive_campaigns SET period_start = ?, period_end = ?, brand = COALESCE(NULLIF(?, ''), brand), updated_at = NOW()
     WHERE drive_folder_id = ? AND active = 1`,
    [input.periodStart, input.periodEnd, input.brand ?? null, input.driveFolderId],
  );
  if (result.affectedRows !== 1) throw new Error("Campaign was not found or is inactive");
  return { ok: true } as const;
}
