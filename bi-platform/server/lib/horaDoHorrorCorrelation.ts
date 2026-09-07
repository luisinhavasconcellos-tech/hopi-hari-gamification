import { type RowDataPacket } from "mysql2/promise";
import { getPool } from "../_core/mysqlPool";
import {
  listFacebookDailyMetrics,
  listInstagramDailyMetrics,
  listTiktokDailyMetrics,
} from "../db";
import { listHoraDoHorrorRegistry, type HoraDoHorrorCampaignRecord } from "./horaDoHorrorRegistry";

const MINIMUM_SHARED_DAYS = 7;


type CorrelationPoint = {
  date: string;
  socialValue: number;
  revenueCents: number;
};

type CorrelationStatus = "ready" | "insufficient_sample" | "flat_series";

export type HoraDoHorrorCorrelation = {
  platform: "Facebook" | "Instagram" | "TikTok";
  socialMetric: string;
  status: CorrelationStatus;
  observedDays: number;
  minimumDays: number;
  coefficient: number | null;
  direction: "positive" | "negative" | "neutral" | null;
  latestSocialDate: string | null;
};

type RevenueClosingRow = RowDataPacket & {
  business_date: string;
  local_hour: number;
  gross_revenue_cents: number | string;
};

type AttendanceRow = RowDataPacket & {
  business_date: string;
  local_hour: number;
  public_count: number | string;
  paying_count: number | string;
  complimentary_count: number | string;
};

const number = (value: unknown) => Number(value ?? 0);
const nullableNumber = (value: unknown) => (value === null || value === undefined ? null : Number(value));

export function calculatePearsonCorrelation(points: CorrelationPoint[], minimumDays = MINIMUM_SHARED_DAYS) {
  if (points.length < minimumDays) return null;
  const xAverage = points.reduce((sum, point) => sum + point.socialValue, 0) / points.length;
  const yAverage = points.reduce((sum, point) => sum + point.revenueCents, 0) / points.length;
  const numerator = points.reduce(
    (sum, point) => sum + (point.socialValue - xAverage) * (point.revenueCents - yAverage),
    0,
  );
  const xVariance = points.reduce((sum, point) => sum + (point.socialValue - xAverage) ** 2, 0);
  const yVariance = points.reduce((sum, point) => sum + (point.revenueCents - yAverage) ** 2, 0);
  const denominator = Math.sqrt(xVariance * yVariance);
  if (!Number.isFinite(denominator) || denominator === 0) return null;
  return Math.max(-1, Math.min(1, numerator / denominator));
}

export function summarizeHoraDoHorrorCorrelation(
  platform: HoraDoHorrorCorrelation["platform"],
  socialMetric: string,
  points: CorrelationPoint[],
  latestSocialDate: string | null,
): HoraDoHorrorCorrelation {
  const coefficient = calculatePearsonCorrelation(points);
  const status: CorrelationStatus = points.length < MINIMUM_SHARED_DAYS
    ? "insufficient_sample"
    : coefficient === null
      ? "flat_series"
      : "ready";
  const direction = coefficient === null
    ? null
    : coefficient > 0.1
      ? "positive"
      : coefficient < -0.1
        ? "negative"
        : "neutral";

  return {
    platform,
    socialMetric,
    status,
    observedDays: points.length,
    minimumDays: MINIMUM_SHARED_DAYS,
    coefficient: coefficient === null ? null : Number(coefficient.toFixed(3)),
    direction,
    latestSocialDate,
  };
}

function pairWithRevenue(
  rows: Array<{ observedDate: string; value: number | null }>,
  revenueByDate: Map<string, number>,
  campaigns: HoraDoHorrorCampaignRecord[],
) {
  return rows.flatMap(row => {
    const revenueCents = revenueByDate.get(row.observedDate);
    const inOfficialWindow = campaigns.some(campaign => row.observedDate >= campaign.periodStart && row.observedDate <= campaign.periodEnd);
    if (row.value === null || revenueCents === undefined || !inOfficialWindow) return [];
    return [{ date: row.observedDate, socialValue: row.value, revenueCents }];
  });
}

export async function getHoraDoHorrorCorrelation() {
  const db = getPool();
  const [registry, [revenueRows], [attendanceRows], facebook, instagram, tiktok] = await Promise.all([
    listHoraDoHorrorRegistry(),
    db.query<RevenueClosingRow[]>(
      `SELECT r.business_date, r.local_hour, r.gross_revenue_cents
       FROM revenue_snapshots r
       JOIN (
         SELECT business_date, MAX(observed_at) AS latest_observed_at
         FROM revenue_snapshots
         GROUP BY business_date
       ) latest ON latest.business_date = r.business_date AND latest.latest_observed_at = r.observed_at
       ORDER BY r.business_date ASC`,
    ),
    db.query<AttendanceRow[]>(
      `SELECT business_date, local_hour, public_count, paying_count, complimentary_count
       FROM attendance_snapshots
       ORDER BY observed_at DESC
       LIMIT 1`,
    ),
    listFacebookDailyMetrics(365),
    listInstagramDailyMetrics(365),
    listTiktokDailyMetrics(365),
  ]);

  const closings = revenueRows.map(row => ({
    date: String(row.business_date),
    localHour: number(row.local_hour),
    grossRevenueCents: number(row.gross_revenue_cents),
  }));
  const revenueByDate = new Map(closings.map(row => [row.date, row.grossRevenueCents]));
  const correlations = [
    summarizeHoraDoHorrorCorrelation(
      "Facebook",
      "Cliques no link",
      pairWithRevenue(facebook.map(row => ({ observedDate: row.observedDate, value: nullableNumber(row.linkClicks) })), revenueByDate, registry),
      facebook[0]?.observedDate ?? null,
    ),
    summarizeHoraDoHorrorCorrelation(
      "Instagram",
      "Cliques no link",
      pairWithRevenue(instagram.map(row => ({ observedDate: row.observedDate, value: nullableNumber(row.linkClicks) })), revenueByDate, registry),
      instagram[0]?.observedDate ?? null,
    ),
    summarizeHoraDoHorrorCorrelation(
      "TikTok",
      "Visitas ao perfil",
      pairWithRevenue(tiktok.map(row => ({ observedDate: row.observedDate, value: nullableNumber(row.profileViews) })), revenueByDate, registry),
      tiktok[0]?.observedDate ?? null,
    ),
  ];
  const latestClosing = closings.at(-1) ?? null;
  const latestAttendance = attendanceRows[0]
    ? {
        businessDate: String(attendanceRows[0].business_date),
        localHour: number(attendanceRows[0].local_hour),
        publicCount: number(attendanceRows[0].public_count),
        payingCount: number(attendanceRows[0].paying_count),
        complimentaryCount: number(attendanceRows[0].complimentary_count),
      }
    : null;

  return {
    title: "Hora do Horror · correlação e estratégia social",
    methodology: "A correlação de Pearson compara a receita bruta de fechamento diário com o indicador social mais próximo de intenção por plataforma. Ela não prova causalidade.",
    correlations,
    officialCampaigns: registry.map(campaign => ({
      id: campaign.id,
      edition: campaign.edition,
      periodStart: campaign.periodStart,
      periodEnd: campaign.periodEnd,
      status: campaign.status,
      creativeCount: campaign.creativeCount,
    })),
    latestClosing,
    latestAttendance,
    strategy: [
      {
        title: "Instrumentar cada peça da Hora do Horror",
        detail: "Use UTM, plataforma, formato, pilar criativo e código de campanha em cada link para separar alcance de intenção e receita atribuível.",
      },
      {
        title: "Comparar períodos equivalentes",
        detail: "Marque dias de campanha e compare janelas equivalentes de operação, em vez de interpretar uma variação diária isolada como efeito do conteúdo.",
      },
      {
        title: "Priorizar sinais de intenção",
        detail: "Acompanhe cliques no link no Facebook e Instagram e visitas ao perfil no TikTok junto à receita diária; mantenha visualizações e interações como sinais de apoio.",
      },
      {
        title: "Publicar com hipótese mensurável",
        detail: "Para cada criativo, registre público, mensagem, CTA e janela de postagem; avalie o resultado apenas após acumular a cobertura mínima de dias compartilhados.",
      },
    ],
  };
}
