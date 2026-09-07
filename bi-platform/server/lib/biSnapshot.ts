import { fetchAllRows, getSupabase } from "../_core/supabase";
import { saoPauloDate } from "./dates";
import { fetchXSnapshot } from "./xApi";
import { getOperationalSummary } from "./operationalSummary";
import { listDriveCampaigns } from "./driveCampaignSync";
import { getLatestFacebookDemographics, getLatestInstagramDemographics, getLatestTiktokAudience, listFacebookDailyMetrics, listInstagramDailyMetrics, listTiktokDailyMetrics, listTiktokViewerSnapshots } from "../db";

type Row = Record<string, unknown>;

type SourceResult = {
  rows: Row[];
  error?: string;
};

const numeric = (value: unknown) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
};

const text = (value: unknown) => (typeof value === "string" ? value : "");

async function querySource(
  name: string,
  request: PromiseLike<{ data: unknown; error: { message?: string } | null }>,
): Promise<[string, SourceResult]> {
  try {
    const { data, error } = await request;
    if (error) return [name, { rows: [], error: error.message || "source_error" }];
    return [name, { rows: Array.isArray(data) ? (data as Row[]) : [] }];
  } catch (error) {
    return [name, { rows: [], error: error instanceof Error ? error.message : "source_error" }];
  }
}

/** Like querySource, but pages through every row (Supabase caps responses at 1000). */
async function queryAllRows(
  name: string,
  build: (from: number, to: number) => PromiseLike<{ data: Row[] | null; error: { message: string } | null }>,
  maxRows = 20_000,
): Promise<[string, SourceResult]> {
  try {
    const { rows, error } = await fetchAllRows<Row>(build, maxRows);
    return [name, error ? { rows: [], error } : { rows }];
  } catch (error) {
    return [name, { rows: [], error: error instanceof Error ? error.message : "source_error" }];
  }
}

function latestPeriod(rows: Row[], yearKey = "year", monthKey = "month") {
  return [...rows].sort((a, b) => {
    const left = numeric(a[yearKey]) * 100 + numeric(a[monthKey]);
    const right = numeric(b[yearKey]) * 100 + numeric(b[monthKey]);
    return right - left;
  })[0];
}

export type BiSnapshot = Awaited<ReturnType<typeof collectBiSnapshot>>;

export async function collectBiSnapshot() {
  const supabase = getSupabase();
  const operational = await getOperationalSummary().catch(error => ({
    revenue: null,
    attendance: null,
    audience: null,
    competitors: [],
    contentLinks: [],
    sources: [],
    error: error instanceof Error ? error.message : "operational_database_unavailable",
  }));
  const driveCampaignData = await listDriveCampaigns().catch(error => ({
    campaigns: [],
    sources: [],
    error: error instanceof Error ? error.message : "drive_campaign_database_unavailable",
  }));
  const facebookData = await Promise.all([listFacebookDailyMetrics(90), getLatestFacebookDemographics()])
    .then(([metrics, demographics]) => ({ metrics, demographics }))
    .catch(error => ({
      metrics: [],
      demographics: undefined,
      error: error instanceof Error ? error.message : "facebook_database_unavailable",
    }));
  const instagramData = await Promise.all([listInstagramDailyMetrics(90), getLatestInstagramDemographics()])
    .then(([metrics, demographics]) => ({ metrics, demographics }))
    .catch(error => ({
      metrics: [],
      demographics: undefined,
      error: error instanceof Error ? error.message : "instagram_database_unavailable",
    }));
  const tiktokData = await Promise.all([listTiktokDailyMetrics(90), listTiktokViewerSnapshots(90), getLatestTiktokAudience()])
    .then(([metrics, viewers, audience]) => ({ metrics, viewers, audience }))
    .catch(error => ({
      metrics: [],
      viewers: [],
      audience: undefined,
      error: error instanceof Error ? error.message : "tiktok_database_unavailable",
    }));
  const entries = await Promise.all([
    queryAllRows("sales", (from, to) =>
      supabase
        .from("sales_revenue_monthly")
        .select("channel,year,month,quantity,revenue")
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .order("channel", { ascending: true })
        .range(from, to),
    ),
    querySource(
      "attendance",
      supabase.from("park_public_monthly").select("year,month,visitors,open_days").limit(1000),
    ),
    querySource(
      "followers",
      supabase
        .from("follower_daily")
        .select("reading_date,total,instagram,tiktok,facebook,youtube,linkedin")
        .order("reading_date", { ascending: false })
        .limit(2),
    ),
    querySource(
      "instagram",
      supabase
        .from("instagram_posts")
        .select("timestamp,like_count,comments_count,share_count,view_count")
        .eq("scrape_status", "scraped")
        .order("timestamp", { ascending: false, nullsFirst: false })
        .limit(60),
    ),
    queryAllRows("crm", (from, to) =>
      supabase.from("crm_leads_geo").select("uf,city,leads").order("leads", { ascending: false }).order("city", { ascending: true }).range(from, to),
    ),
    queryAllRows("customerDemographics", (from, to) =>
      supabase
        .from("customer_demographics")
        .select("dimension,bucket_key,bucket_label,sort_order,customers")
        .order("sort_order", { ascending: true })
        .order("bucket_key", { ascending: true })
        .range(from, to),
    ),
    querySource(
      "cpfRegions",
      supabase.from("customer_cpf_regions").select("region_digit,region_label,registrations,registrations_2018_2019,registrations_pos_2023").order("registrations", { ascending: false }).limit(100),
    ),
    querySource(
      "reputation",
      supabase
        .from("reputation_reviews")
        .select("published_at,sentiment,rating")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(500),
    ),
    querySource(
      "campaigns",
      supabase.from("campaigns").select("name,brand,period_start,period_end,summary").limit(100),
    ),
    querySource(
      "websiteSales",
      supabase
        .from("website_sales_daily")
        .select("sale_date,revenue,orders")
        .order("sale_date", { ascending: false })
        .limit(31),
    ),
    queryAllRows("distributorSales", (from, to) =>
      supabase
        .from("distributor_sales_monthly")
        .select("year,month,quantity,revenue,goal_quantity")
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .range(from, to),
    ),
    querySource(
      "instagramGlobalReport",
      supabase
        .from("instagram_reports")
        .select("insights,created_at")
        .eq("scope", "global")
        .order("created_at", { ascending: false })
        .limit(1),
    ),
  ]);

  const sources = Object.fromEntries(entries) as Record<string, SourceResult>;
  const x = await fetchXSnapshot();
  const salesLatest = latestPeriod(sources.sales.rows);
  const attendanceLatest = latestPeriod(sources.attendance.rows);
  const latestYear = numeric(salesLatest?.year);
  const latestMonth = numeric(salesLatest?.month);
  const salesCurrent = sources.sales.rows.filter(
    row => numeric(row.year) === latestYear && numeric(row.month) === latestMonth,
  );
  const salesPreviousYear = sources.sales.rows.filter(
    row => numeric(row.year) === latestYear - 1 && numeric(row.month) === latestMonth,
  );
  const distributorCurrent = sources.distributorSales.rows.filter(
    row => numeric(row.year) === latestYear && numeric(row.month) === latestMonth,
  );
  const monthlyRevenue = salesCurrent.reduce((sum, row) => sum + numeric(row.revenue), 0);
  const monthlyQuantity = salesCurrent.reduce((sum, row) => sum + numeric(row.quantity), 0);
  const previousYearRevenue = salesPreviousYear.reduce((sum, row) => sum + numeric(row.revenue), 0);
  const previousYearQuantity = salesPreviousYear.reduce((sum, row) => sum + numeric(row.quantity), 0);
  const currentYearRows = sources.sales.rows.filter(row => numeric(row.year) === latestYear);
  const previousYearRows = sources.sales.rows.filter(row => numeric(row.year) === latestYear - 1);
  const comparableMonths = [...new Set(currentYearRows.map(row => numeric(row.month)).filter(month => month >= 1 && month <= 12))].sort((a, b) => a - b);
  const commercialMonthlySeries = comparableMonths.map(month => ({
    month,
    currentRevenue: currentYearRows.filter(row => numeric(row.month) === month).reduce((sum, row) => sum + numeric(row.revenue), 0),
    previousRevenue: previousYearRows.some(row => numeric(row.month) === month)
      ? previousYearRows.filter(row => numeric(row.month) === month).reduce((sum, row) => sum + numeric(row.revenue), 0)
      : null,
  }));
  const distributorRevenue = distributorCurrent.reduce((sum, row) => sum + numeric(row.revenue), 0);
  const distributorGoalRevenue = distributorCurrent.reduce((sum, row) => {
    const quantity = numeric(row.quantity);
    const averageTicket = quantity > 0 ? numeric(row.revenue) / quantity : 0;
    return sum + numeric(row.goal_quantity) * averageTicket;
  }, 0);
  const instagram = sources.instagram.rows;
  const reputation = sources.reputation.rows;
  const crmStates = new Map<string, number>();
  sources.crm.rows.forEach(row => {
    const state = text(row.uf) || "Não informado";
    crmStates.set(state, (crmStates.get(state) || 0) + numeric(row.leads));
  });
  const crmCities = new Map<string, number>();
  sources.crm.rows.forEach(row => {
    const city = text(row.city) || "Não informado";
    crmCities.set(city, (crmCities.get(city) || 0) + numeric(row.leads));
  });
  const demographicRows = sources.customerDemographics.rows;
  // Campaign windows are park-local calendar dates.
  const today = saoPauloDate();
  const campaigns = sources.campaigns.rows;
  const activeCampaigns = campaigns.filter(row => text(row.period_start) <= today && text(row.period_end) >= today);
  const follower = sources.followers.rows[0];
  const previousFollower = sources.followers.rows[1];
  const warnings = Object.entries(sources)
    .filter(([, value]) => value.error)
    .map(([name, value]) => `${name}: ${value.error}`);
  if (!x.available) warnings.push(`x: ${x.reason || "unavailable"}`);
  if ("error" in operational) warnings.push(`operations: ${operational.error}`);
  if ("error" in driveCampaignData) warnings.push(`driveCampaigns: ${driveCampaignData.error}`);
  if ("error" in facebookData) warnings.push(`facebook: ${facebookData.error}`);
  if ("error" in instagramData) warnings.push(`instagram: ${instagramData.error}`);
  if ("error" in tiktokData) warnings.push(`tiktok: ${tiktokData.error}`);
  let synchronizedAssets = 0;
  let synchronizedImages = 0;
  let synchronizedVideos = 0;
  for (const campaign of driveCampaignData.campaigns) {
    synchronizedAssets += campaign.assets;
    synchronizedImages += campaign.images;
    synchronizedVideos += campaign.videos;
  }

  return {
    asOf: new Date().toISOString(),
    sales: {
      period: operational.revenue
        ? `${operational.revenue.businessDate} ${String(operational.revenue.localHour).padStart(2, "0")}:00`
        : salesLatest ? `${latestYear}-${String(latestMonth).padStart(2, "0")}` : null,
      revenue: operational.revenue
        ? operational.revenue.grossRevenueCents / 100
        : salesCurrent.reduce((sum, row) => sum + numeric(row.revenue), 0),
      quantity: salesCurrent.reduce((sum, row) => sum + numeric(row.quantity), 0),
      previousYearRevenue,
      websiteLast31DaysRevenue: sources.websiteSales.rows.reduce((sum, row) => sum + numeric(row.revenue), 0),
      websiteLast31DaysOrders: sources.websiteSales.rows.reduce((sum, row) => sum + numeric(row.orders), 0),
      monthlyContext: {
        period: salesLatest ? `${latestYear}-${String(latestMonth).padStart(2, "0")}` : null,
        revenue: monthlyRevenue,
        quantity: monthlyQuantity,
        averageTicket: monthlyQuantity > 0 ? monthlyRevenue / monthlyQuantity : null,
        previousYearRevenue,
        previousYearQuantity,
        revenueYoyPct: previousYearRevenue > 0 ? ((monthlyRevenue - previousYearRevenue) / previousYearRevenue) * 100 : null,
        quantityYoyPct: previousYearQuantity > 0 ? ((monthlyQuantity - previousYearQuantity) / previousYearQuantity) * 100 : null,
        distributorRevenue,
        distributorGoalRevenue,
        distributorAttainmentPct: distributorGoalRevenue > 0 ? (distributorRevenue / distributorGoalRevenue) * 100 : null,
        currentYear: latestYear || null,
        previousYear: latestYear ? latestYear - 1 : null,
        series: commercialMonthlySeries,
      },
    },
    attendance: {
      period: operational.attendance
        ? `${operational.attendance.businessDate} ${String(operational.attendance.localHour).padStart(2, "0")}:00`
        : attendanceLatest
        ? `${numeric(attendanceLatest.year)}-${String(numeric(attendanceLatest.month)).padStart(2, "0")}`
        : null,
      visitors: operational.attendance?.publicCount ?? numeric(attendanceLatest?.visitors),
      openDays: operational.attendance ? 1 : numeric(attendanceLatest?.open_days),
    },
    audience: {
      date: operational.audience?.observedDate ?? (text(follower?.reading_date) || null),
      totalFollowers: operational.audience?.totalFollowers ?? numeric(follower?.total),
      // Without a previous reading there is no delta; `0` would otherwise be
      // reported as a gain equal to the whole follower base.
      followerChange:
        operational.audience?.followerChange ??
        (follower && previousFollower ? numeric(follower.total) - numeric(previousFollower.total) : null),
      instagram: operational.audience?.byPlatform.Instagram ?? numeric(follower?.instagram),
      tiktok: operational.audience?.byPlatform.TikTok ?? numeric(follower?.tiktok),
      facebook: operational.audience?.byPlatform.Facebook ?? numeric(follower?.facebook),
      youtube: operational.audience?.byPlatform.YouTube ?? numeric(follower?.youtube),
      linkedin: operational.audience?.byPlatform.LinkedIn ?? numeric(follower?.linkedin),
    },
    social: {
      instagramSampleSize: instagram.length,
      instagramLikes: instagram.reduce((sum, row) => sum + numeric(row.like_count), 0),
      instagramComments: instagram.reduce((sum, row) => sum + numeric(row.comments_count), 0),
      instagramShares: instagram.reduce((sum, row) => sum + numeric(row.share_count), 0),
      instagramViews: instagram.reduce((sum, row) => sum + numeric(row.view_count), 0),
      facebook: {
        date: facebookData.metrics[0]?.observedDate ?? null,
        followers: facebookData.metrics[0]?.followers ?? null,
        linkClicks: facebookData.metrics[0]?.linkClicks ?? null,
        interactions: facebookData.metrics[0]?.interactions ?? null,
        visits: facebookData.metrics[0]?.visits ?? null,
        views: facebookData.metrics[0]?.views ?? null,
        viewers: facebookData.metrics[0]?.viewers ?? null,
        demographicsDate: facebookData.demographics?.observedDate ?? null,
      },
      instagram: {
        date: instagramData.metrics[0]?.observedDate ?? null,
        followers: instagramData.metrics[0]?.followers ?? null,
        linkClicks: instagramData.metrics[0]?.linkClicks ?? null,
        interactions: instagramData.metrics[0]?.interactions ?? null,
        visits: instagramData.metrics[0]?.visits ?? null,
        reach: instagramData.metrics[0]?.reach ?? null,
        views: instagramData.metrics[0]?.views ?? null,
        demographicsDate: instagramData.demographics?.observedDate ?? null,
      },
      tiktok: {
        date: tiktokData.metrics[0]?.observedDate ?? null,
        followers: tiktokData.metrics[0]?.followers ?? null,
        videoViews: tiktokData.metrics[0]?.videoViews ?? null,
        profileViews: tiktokData.metrics[0]?.profileViews ?? null,
        likes: tiktokData.metrics[0]?.likes ?? null,
        comments: tiktokData.metrics[0]?.comments ?? null,
        shares: tiktokData.metrics[0]?.shares ?? null,
        viewers: tiktokData.viewers[0]?.totalViewers ?? null,
        newViewers: tiktokData.viewers[0]?.newViewers ?? null,
        returningViewers: tiktokData.viewers[0]?.returningViewers ?? null,
        audienceDate: tiktokData.audience?.observedDate ?? null,
      },
      x,
    },
    crm: {
      totalLeads: sources.crm.rows.reduce((sum, row) => sum + numeric(row.leads), 0),
      topStates: [...crmStates.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([state, leads]) => ({ state, leads })),
      topCities: [...crmCities.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([city, leads]) => ({ city, leads })),
      customerDemographics: {
        ageGroups: demographicRows
          .filter(row => text(row.dimension) === "age_group" && numeric(row.customers) > 0)
          .map(row => ({ label: text(row.bucket_label) || text(row.bucket_key), customers: numeric(row.customers), sortOrder: numeric(row.sort_order) }))
          .sort((a, b) => a.sortOrder - b.sortOrder),
        genders: demographicRows
          .filter(row => text(row.dimension) === "gender" && numeric(row.customers) > 0)
          .map(row => ({ label: text(row.bucket_label) || text(row.bucket_key), customers: numeric(row.customers) }))
          .sort((a, b) => b.customers - a.customers),
      },
      cpfRegions: sources.cpfRegions.rows
        .filter(row => numeric(row.registrations) > 0)
        .map(row => ({
          label: text(row.region_label),
          registrations: numeric(row.registrations),
          historical: numeric(row.registrations_2018_2019),
          recent: numeric(row.registrations_pos_2023),
        })),
    },
    reputation: {
      sampleSize: reputation.length,
      positive: reputation.filter(row => text(row.sentiment).toLowerCase() === "positivo").length,
      negative: reputation.filter(row => text(row.sentiment).toLowerCase() === "negativo").length,
      averageRating: (() => {
        // Unrated reviews must not count as zero stars.
        const ratings = reputation.map(row => Number(row.rating)).filter(value => Number.isFinite(value) && value > 0);
        return ratings.length > 0 ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : null;
      })(),
    },
    campaigns: {
      activeCount: activeCampaigns.length,
      active: activeCampaigns.slice(0, 8).map(row => ({
        name: text(row.name),
        brand: text(row.brand),
        endDate: text(row.period_end),
      })),
      synchronizedCount: driveCampaignData.campaigns.length,
      synchronizedAssets,
      synchronizedImages,
      synchronizedVideos,
      driveLastSyncedAt: driveCampaignData.sources[0]?.lastSyncedAt ?? null,
      driveStatus: driveCampaignData.sources[0]?.lastStatus ?? null,
      driveRootName: driveCampaignData.sources[0]?.rootFolderName ?? null,
      latestLibrary: driveCampaignData.campaigns.slice(0, 8).map(campaign => ({
        name: campaign.name,
        assets: campaign.assets,
        images: campaign.images,
        videos: campaign.videos,
      })),
    },
    strategy: {
      globalInstagramReport: sources.instagramGlobalReport.rows[0]?.insights ?? null,
      globalInstagramReportCreatedAt: text(sources.instagramGlobalReport.rows[0]?.created_at) || null,
      governanceNote: "Somente análises persistidas e sustentadas por dados processados entram no relatório executivo. Estratégias demonstrativas e estimativas simuladas de bots são excluídas.",
    },
    operations: operational,
    coverage: {
      readySources: Object.values(sources).filter(value => !value.error).length + (x.available ? 1 : 0) +
        ("error" in operational ? 0 : 1) + ("error" in driveCampaignData ? 0 : 1) + ("error" in facebookData ? 0 : 1) + ("error" in instagramData ? 0 : 1) + ("error" in tiktokData ? 0 : 1),
      totalSources: Object.keys(sources).length + 6,
      warnings,
    },
  };
}
