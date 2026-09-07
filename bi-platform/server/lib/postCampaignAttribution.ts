import { getPool } from "../_core/mysqlPool";
import { type RowDataPacket } from "mysql2/promise";
import { fetchAllRows, getSupabase } from "../_core/supabase";

const PLATFORM_TABLES = [
  { table: "instagram_posts", platform: "Instagram" },
  { table: "tiktok_posts", platform: "TikTok" },
  { table: "facebook_posts", platform: "Facebook" },
  { table: "youtube_posts", platform: "YouTube" },
  { table: "linkedin_posts", platform: "LinkedIn" },
] as const;

const CURATED_ALIASES: Array<{ pattern: RegExp; aliases: string[] }> = [
  { pattern: /hora.*horror/i, aliases: ["hora do horror", "horadohorror", "hdh26"] },
  { pattern: /spoiler.*hdh|spoiler.*night/i, aliases: ["spoiler night", "spoilernight", "spoiler night hdh26"] },
  { pattern: /tikito/i, aliases: ["quinzena dos tikitos", "quinzenadostikitos", "tikitos"] },
  { pattern: /iara/i, aliases: ["invasao iara", "invasão iara", "iara"] },
  { pattern: /dia.*noite/i, aliases: ["hopi dia x noite", "hopidiaxnoite", "dia x noite"] },
  { pattern: /passaporti.*dobro/i, aliases: ["passaporti em dobro", "passaporto em dobro", "passaporti​emdobro"] },
  { pattern: /arraia/i, aliases: ["hopi arraia", "hopiarraia", "arraia"] },
  { pattern: /vai.*brasil/i, aliases: ["vai brasil", "vaibrasil"] },
];

const GENERIC_TOKENS = new Set([
  "hopi", "hari", "campanha", "criativos", "feriado", "feriadao", "fim", "semana",
  "diversao", "2024", "2025", "2026", "de", "do", "da", "dos", "das", "com", "para",
]);

type CampaignRow = RowDataPacket & {
  id: number;
  drive_folder_id: string;
  name: string;
};

export type SocialPostForCampaign = {
  platform: string;
  timestamp: string;
  caption: string;
  url: string;
  interactions: number;
  views: number;
};

export type CampaignPostEvidence = {
  campaignId: number;
  driveFolderId: string;
  campaignName: string;
  firstPostDate: string;
  lastPostDate: string;
  observedDays: number;
  posts: number;
  interactions: number;
  views: number;
  platforms: Array<{ platform: string; posts: number; interactions: number; views: number }>;
  matchBasis: "campaign_name_or_hashtag";
};


export function normalizeCampaignText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compact(value: unknown) {
  return normalizeCampaignText(value).replace(/\s+/g, "");
}

function campaignAliases(name: string) {
  const normalized = normalizeCampaignText(name);
  const values = new Set<string>();
  if (normalized.length >= 6) {
    values.add(normalized);
    values.add(compact(normalized));
  }
  for (const rule of CURATED_ALIASES) {
    if (rule.pattern.test(normalized)) rule.aliases.forEach(alias => values.add(normalizeCampaignText(alias)));
  }
  return [...values].filter(alias => alias.length >= 4);
}

function significantTokens(name: string) {
  return normalizeCampaignText(name)
    .split(" ")
    .filter(token => token.length >= 4 && !GENERIC_TOKENS.has(token));
}

function scorePostForCampaign(post: SocialPostForCampaign, campaignName: string) {
  const caption = normalizeCampaignText(post.caption);
  const dense = compact(post.caption);
  const aliases = campaignAliases(campaignName);
  let score = 0;
  for (const alias of aliases) {
    if (alias.includes(" ") && caption.includes(alias)) score = Math.max(score, 100 + alias.length);
    const aliasDense = compact(alias);
    if (aliasDense.length >= 6 && dense.includes(aliasDense)) score = Math.max(score, 90 + aliasDense.length);
  }
  const tokens = significantTokens(campaignName);
  if (tokens.length >= 2 && tokens.every(token => caption.split(" ").includes(token))) {
    score = Math.max(score, 70 + tokens.join("").length);
  }
  return score;
}

function latestCoherentPostCluster(posts: SocialPostForCampaign[], maximumGapDays = 45) {
  const ordered = [...posts].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  if (ordered.length < 2) return ordered;
  let clusterStart = ordered.length - 1;
  for (let index = ordered.length - 1; index > 0; index -= 1) {
    const current = new Date(ordered[index].timestamp).getTime();
    const previous = new Date(ordered[index - 1].timestamp).getTime();
    const gapDays = (current - previous) / 86_400_000;
    if (gapDays > maximumGapDays) break;
    clusterStart = index - 1;
  }
  return ordered.slice(clusterStart);
}

export function matchPostsToCampaigns(
  campaigns: Array<{ id: number; driveFolderId: string; name: string }>,
  posts: SocialPostForCampaign[],
) {
  const matched = new Map<number, SocialPostForCampaign[]>();
  for (const post of posts) {
    const candidates = campaigns
      .map(campaign => ({ campaign, score: scorePostForCampaign(post, campaign.name) }))
      .filter(candidate => candidate.score > 0)
      .sort((a, b) => b.score - a.score || b.campaign.name.length - a.campaign.name.length);
    const best = candidates[0];
    if (!best) continue;
    const list = matched.get(best.campaign.id) ?? [];
    list.push(post);
    matched.set(best.campaign.id, list);
  }

  return campaigns.flatMap<CampaignPostEvidence>(campaign => {
    const list = latestCoherentPostCluster(matched.get(campaign.id) ?? []);
    if (!list.length) return [];
    const dates = [...new Set(list.map(post => post.timestamp.slice(0, 10)))];
    const platforms = [...new Set(list.map(post => post.platform))].map(platform => {
      const rows = list.filter(post => post.platform === platform);
      return {
        platform,
        posts: rows.length,
        interactions: rows.reduce((sum, row) => sum + row.interactions, 0),
        views: rows.reduce((sum, row) => sum + row.views, 0),
      };
    }).sort((a, b) => b.posts - a.posts);
    return [{
      campaignId: campaign.id,
      driveFolderId: campaign.driveFolderId,
      campaignName: campaign.name,
      firstPostDate: dates[0],
      lastPostDate: dates.at(-1)!,
      observedDays: dates.length,
      posts: list.length,
      interactions: list.reduce((sum, row) => sum + row.interactions, 0),
      views: list.reduce((sum, row) => sum + row.views, 0),
      platforms,
      matchBasis: "campaign_name_or_hashtag" as const,
    }];
  }).sort((a, b) => b.posts - a.posts);
}

type SocialPostRow = {
  post_url: string | null;
  caption: string | null;
  timestamp: string;
  like_count: number | null;
  comments_count: number | null;
  share_count: number | null;
  view_count: number | null;
};

const MAX_POSTS_PER_PLATFORM = 5000;

async function listSocialPosts() {
  const supabase = getSupabase();
  const warnings: string[] = [];
  const rows = await Promise.all(PLATFORM_TABLES.map(async source => {
    // Supabase caps each response at 1000 rows; page to read the full window.
    const { rows: data, error } = await fetchAllRows<SocialPostRow>((from, to) =>
      supabase
        .from(source.table)
        .select("post_url,caption,timestamp,like_count,comments_count,share_count,view_count")
        .not("timestamp", "is", null)
        .order("timestamp", { ascending: false })
        .order("post_url", { ascending: true })
        .range(from, to),
    MAX_POSTS_PER_PLATFORM);
    // A failing platform must be visible, not silently counted as "no posts".
    if (error) warnings.push(`${source.platform}: ${error}`);
    return data.map(row => ({
      platform: source.platform,
      timestamp: String(row.timestamp),
      caption: String(row.caption ?? ""),
      url: String(row.post_url ?? ""),
      interactions: Number(row.like_count ?? 0) + Number(row.comments_count ?? 0) + Number(row.share_count ?? 0),
      views: Number(row.view_count ?? 0),
    } satisfies SocialPostForCampaign));
  }));
  return { posts: rows.flat(), warnings };
}

export async function getCampaignPostEvidence() {
  const [campaignRows, { posts, warnings }] = await Promise.all([
    getPool().query<CampaignRow[]>("SELECT id, drive_folder_id, name FROM drive_campaigns WHERE active = 1 ORDER BY name").then(([rows]) => rows),
    listSocialPosts(),
  ]);
  const campaigns = campaignRows.map(row => ({ id: Number(row.id), driveFolderId: String(row.drive_folder_id), name: String(row.name) }));
  const evidence = matchPostsToCampaigns(campaigns, posts);
  return {
    methodology: "Cada post é vinculado a uma única campanha pela melhor correspondência explícita de nome, hashtag compacta ou alias distintivo. Termos genéricos isolados não criam vínculo.",
    warnings,
    totalPostsRead: posts.length,
    matchedPosts: evidence.reduce((sum, item) => sum + item.posts, 0),
    campaignsWithPosts: evidence.length,
    evidence,
  };
}
