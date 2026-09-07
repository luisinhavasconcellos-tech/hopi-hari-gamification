import type { Platform, Influencer, NicheCategory } from "./influencer-types";
import { NICHE_META } from "./influencer-types";

// ─── Formatters ───────────────────────────────────────────────────────────────

export const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1000 ? `${(n / 1000).toFixed(1)}K`
  : String(n);

export const initials = (name: string) =>
  name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

// ─── Location check ──────────────────────────────────────────────────────────

const SP_KEYWORDS = [
  "são paulo", "sao paulo", " sp ", "sp,", ",sp",
  "grande sp", "guarulhos", "campinas", "vinhedo",
  "osasco", "abc paulista", "santo andré", "mauá", "sorocaba",
];

export const isSpBased = (bio: string, location?: string) => {
  const text = `${bio ?? ""} ${location ?? ""}`.toLowerCase();
  return SP_KEYWORDS.some((kw) => text.includes(kw));
};

// ─── Niche Classification ─────────────────────────────────────────────────────

const ADULT_BLOCK_KEYWORDS = [
  "onlyfans", "18+", "nsfw", "sexy", "sensual", "erótic", "erotic",
  "adult content", "conteúdo adulto", "nude", "lingerie model",
];

const NICHE_KEYWORDS: Record<NicheCategory, string[]> = {
  maternity: [
    "mãe", "mae", "maternidade", "gestante", "grávida", "gravida",
    "bebê", "bebe", "mamãe", "mamae", "motherhood", "mom", "pregnancy",
    "recém-nascido", "amamentação", "enxoval",
  ],
  kids: [
    "criança", "criancas", "infantil", "kids", "children", "brinquedo",
    "brincar", "brincadeira", "parquinho", "lúdico", "ludico",
    "desenho animado", "cartoon",
  ],
  teenage: [
    "teen", "adolescente", "jovem", "geração z", "geracao z", "genz",
    "escola", "faculdade", "universitário", "universitario", "college",
    "skateboard", "gamer", "gaming", "esports",
  ],
  adults: [
    "adulto", "casal", "couple", "happy hour", "night", "noite",
    "balada", "bar", "cerveja", "vinho", "cocktail", "comédia", "comedia",
    "humor", "stand-up", "standup",
  ],
  tourism: [
    "viagem", "travel", "turismo", "tourism", "turista", "roteiro",
    "destino", "destination", "mochileiro", "backpack", "hotel",
    "resort", "explorar", "aventura", "adventure",
  ],
  theme_park: [
    "parque", "park", "montanha russa", "roller coaster", "theme park",
    "parque temático", "parque tematico", "diversão", "diversao",
    "adrenalina", "brinquedo radical", "atração", "atracao",
    "hopi hari", "disney", "six flags", "beto carrero",
  ],
  foodies: [
    "comida", "food", "gastronomia", "receita", "recipe", "culinária",
    "culinaria", "chef", "cozinha", "restaurante", "gourmet",
    "foodie", "comer", "delícia", "delicia", "sabor",
  ],
  lifestyle: [
    "lifestyle", "estilo de vida", "rotina", "dia a dia", "cotidiano",
    "wellness", "bem-estar", "bem estar", "saúde", "saude",
    "fitness", "yoga", "meditação", "meditacao", "self care",
  ],
  fashion_beauty: [
    "moda", "fashion", "beleza", "beauty", "makeup", "maquiagem",
    "skincare", "roupa", "look", "outfit", "estilo", "style",
    "tendência", "tendencia", "cosmético", "cosmetico",
  ],
  pop_culture: [
    "cinema", "filme", "movie", "série", "serie", "anime", "manga",
    "música", "musica", "music", "pop", "k-pop", "kpop", "cultura pop",
    "nerd", "geek", "marvel", "dc", "cosplay", "streamer",
  ],
};

export function classifyNiche(bio: string, name: string): NicheCategory {
  const text = `${bio} ${name}`.toLowerCase();

  // Block adult/sexual content — classify but filter later
  if (ADULT_BLOCK_KEYWORDS.some((kw) => text.includes(kw))) {
    return "adults"; // will be filtered out
  }

  let bestCategory: NicheCategory = "lifestyle"; // default
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(NICHE_KEYWORDS) as [NicheCategory, string[]][]) {
    if (category === "adults") continue; // skip adults in normal scoring
    const score = keywords.filter((kw) => text.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

export function isBlockedAdultContent(bio: string, name: string): boolean {
  const text = `${bio} ${name}`.toLowerCase();
  return ADULT_BLOCK_KEYWORDS.some((kw) => text.includes(kw));
}

// ─── Hopi Hari Fit Score (trained from real performance data) ─────────────────
//
// Trained on 2 real influencer sheets:
//   - Influs_por_mes_Marco.pdf: actual visit ratings (1-5★)
//   - Influencers_aeroventuri.pdf: fit assessments (EXCELENTE → MÉDIO)
//
// Key findings:
//   • ER 4%+ strongly correlates with top ratings (5★ / EXCELENTE)
//   • Sweet spot: 50K–3M followers. >5M often = lower fit. <20K = "poucos seguidores"
//   • High-value niches: família, humor, turismo SP, parque, aventura, cotidiano, casal
//   • SP-based creators consistently rated higher
//   • Content delivery (stories, reels, posts) correlates with high ratings

// Tier 1: Core theme-park / family / adventure keywords (highest weight)
const NICHE_T1 = [
  "parque", "park", "montanha russa", "roller coaster", "hopi hari",
  "família", "familia", "family", "aventura", "adventure", "adrenalina",
  "diversão", "diversao", "criança", "criancas", "kids",
];

// Tier 2: Highly relevant content niches from training data
const NICHE_T2 = [
  "humor", "comédia", "comedia", "stand-up", "standup", "casal", "couple",
  "turismo", "tourism", "viagem", "travel", "roteiro",
  "entretenimento", "entertainment", "lazer", "vlog",
  "cotidiano", "rotina", "dia a dia", "lifestyle",
  "maternidade", "mãe", "mae", "mamãe", "mamae",
];

// Tier 3: Moderate relevance
const NICHE_T3 = [
  "moda", "fashion", "beleza", "beauty", "fitness", "bem-estar",
  "música", "musica", "music", "arte", "culture", "cultura",
  "gastronomia", "food", "comida", "chef",
];

export const hopiScore = (inf: Influencer): number => {
  const bio = `${inf.bio} ${inf.name}`.toLowerCase();

  // ── Engagement Rate (0–30 pts) ──────────────────────────────────────────────
  let engPts: number;
  if (inf.engagementRate >= 6) engPts = 30;
  else if (inf.engagementRate >= 4) engPts = 24;
  else if (inf.engagementRate >= 3) engPts = 17;
  else if (inf.engagementRate >= 2) engPts = 10;
  else if (inf.engagementRate >= 1) engPts = 5;
  else engPts = 2;

  // ── Follower Tier (0–20 pts) ────────────────────────────────────────────────
  let fPts: number;
  if (inf.followers >= 5_000_000) fPts = 8;
  else if (inf.followers >= 1_000_000) fPts = 16;
  else if (inf.followers >= 100_000) fPts = 20;
  else if (inf.followers >= 50_000) fPts = 16;
  else fPts = 4;

  // ── Niche Relevance (0–20 pts) ──────────────────────────────────────────────
  const t1Hits = NICHE_T1.filter((kw) => bio.includes(kw)).length;
  const t2Hits = NICHE_T2.filter((kw) => bio.includes(kw)).length;
  const t3Hits = NICHE_T3.filter((kw) => bio.includes(kw)).length;
  const nichePts = Math.min(t1Hits * 4 + t2Hits * 2.5 + t3Hits * 1.5, 20);

  // ── Location SP (0–10 pts) ──────────────────────────────────────────────────
  const locPts = isSpBased(inf.bio, inf.location) ? 10 : 0;

  // ── Recency / Activity (0–20 pts) ───────────────────────────────────────────
  // Strongly prioritize accounts that posted recently
  let recencyPts = 0;
  if (inf.lastPostDaysAgo !== undefined && inf.lastPostDaysAgo !== null) {
    if (inf.lastPostDaysAgo <= 3) recencyPts = 20;        // posted in last 3 days
    else if (inf.lastPostDaysAgo <= 7) recencyPts = 17;    // last week
    else if (inf.lastPostDaysAgo <= 14) recencyPts = 14;   // last 2 weeks
    else if (inf.lastPostDaysAgo <= 30) recencyPts = 10;   // last month
    else if (inf.lastPostDaysAgo <= 60) recencyPts = 5;    // last 2 months
    else recencyPts = 1;                                    // inactive
  } else {
    recencyPts = 8; // unknown = neutral
  }

  return Math.round(Math.min(engPts + fPts + nichePts + locPts + recencyPts, 100));
};

export const scoreColor = (s: number) =>
  s >= 80 ? "#22c55e" : s >= 60 ? "#f59e0b" : "#ef4444";

// ─── Authenticity (fake-follower heuristics) ──────────────────────────────────
//
// Heuristic red flags for bought followers / engagement pods, applied to
// scraped public data. Not a substitute for a fraud-detection API (HypeAuditor,
// Modash), but catches the obvious fakes:
//   • following ≈ followers (follow-for-follow farming)
//   • huge audience with almost no posts (bought account)
//   • implausibly high ER for the follower tier (pods / fake likes)
//   • unnaturally uniform like counts across posts (purchased engagement)
//   • ER far below organic floor (dead/bot audience)

interface AuthenticityInput {
  followers: number;
  following?: number;
  postsCount?: number;
  engagementRate: number;
  erVerified: boolean;
  likeCv?: number | null;
  verified: boolean;
  bio: string;
  hasAvatar: boolean;
}

export function authenticityScore(a: AuthenticityInput): { score: number; flags: string[] } {
  let score = 100;
  const flags: string[] = [];

  if (a.following && a.followers > 0) {
    const ratio = a.followers / a.following;
    if (a.following > a.followers) {
      score -= 40;
      flags.push("Segue mais contas do que tem seguidores");
    } else if (ratio < 5 && a.following > 2000) {
      score -= 20;
      flags.push("Proporção seguidores/seguindo baixa");
    }
  }

  if (a.postsCount !== undefined && a.postsCount > 0 && a.postsCount < 30 && a.followers >= 50_000) {
    score -= 30;
    flags.push("Muitos seguidores com pouquíssimos posts");
  }

  if (a.erVerified) {
    const maxPlausible = a.followers >= 1_000_000 ? 15 : a.followers >= 100_000 ? 20 : 30;
    if (a.engagementRate > maxPlausible) {
      score -= 25;
      flags.push(`ER de ${a.engagementRate}% implausível para o porte da conta`);
    }
    if (a.engagementRate < 0.3) {
      score -= 35;
      flags.push("ER abaixo de 0,3% — audiência possivelmente inativa/bot");
    }
  }

  if (a.likeCv !== null && a.likeCv !== undefined && a.likeCv < 0.05) {
    score -= 25;
    flags.push("Curtidas idênticas em todos os posts (padrão de engajamento comprado)");
  }

  if (!a.hasAvatar) {
    score -= 10;
    flags.push("Sem foto de perfil");
  }
  if (!a.bio.trim()) {
    score -= 10;
    flags.push("Bio vazia");
  }

  if (a.verified) score = Math.min(100, score + 15);

  return { score: Math.max(0, score), flags };
}

export const MIN_AUTHENTICITY = 50;

// ─── Profile URL ──────────────────────────────────────────────────────────────

export function buildProfileUrl(platform: Platform, handle: string) {
  const h = handle.replace(/^@/, "");
  return platform === "instagram" ? `https://instagram.com/${h}`
    : platform === "tiktok" ? `https://tiktok.com/@${h}`
    : `https://youtube.com/@${h}`;
}

// ─── Display Niche Tags ───────────────────────────────────────────────────────

export function extractNiches(bio: string, name?: string): string[] {
  const b = bio.toLowerCase();
  const map: Record<string, string> = {
    família: "Família", familia: "Família", parque: "Parques",
    aventura: "Aventura", vlog: "Vlogs", viagem: "Viagem",
    criança: "Infantil", kids: "Infantil", lifestyle: "Lifestyle",
    entretenimento: "Entretenimento", lazer: "Lazer",
    adrenalina: "Adrenalina", diversão: "Diversão", diversao: "Diversão",
    mãe: "Maternidade", mae: "Maternidade", mamãe: "Maternidade",
    mamae: "Maternidade", maternidade: "Maternidade", gestante: "Maternidade",
    bebê: "Maternidade", bebe: "Maternidade", grávida: "Maternidade",
    moda: "Moda & Beleza", fashion: "Moda & Beleza", beleza: "Moda & Beleza",
    beauty: "Moda & Beleza", makeup: "Moda & Beleza", skincare: "Moda & Beleza",
    comida: "Foodies", food: "Foodies", gastronomia: "Foodies",
    receita: "Foodies", chef: "Foodies", restaurante: "Foodies",
    turismo: "Turismo", travel: "Turismo", tourism: "Turismo",
    humor: "Humor", comédia: "Humor", comedia: "Humor",
    teen: "Teen", adolescente: "Teen", gamer: "Gaming",
    cinema: "Cultura Pop", anime: "Cultura Pop", geek: "Cultura Pop",
    nerd: "Cultura Pop", cosplay: "Cultura Pop",
    fitness: "Fitness", yoga: "Fitness", treino: "Fitness",
  };
  const found = new Set<string>();
  for (const [key, label] of Object.entries(map)) {
    if (b.includes(key)) found.add(label);
  }

  // Fallback: use classifyNiche to get at least one relevant tag
  if (found.size === 0 && name) {
    const category = classifyNiche(bio, name);
    const meta = NICHE_META[category];
    if (meta) found.add(meta.label);
  }

  return found.size > 0 ? [...found].slice(0, 4) : ["Entretenimento"];
}

// ─── API ──────────────────────────────────────────────────────────────────────

// Defensive numeric parse: APIs sometimes return counts as strings ("12.3k" excluded — only plain numerics)
const num = (v: unknown): number => {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
};

export const MIN_FOLLOWERS = 50_000;
export const MIN_ENGAGEMENT = 3; // %

export async function discoverPlatform(
  platform: Platform,
  nicheKeywords?: string[],
  niche?: NicheCategory,
): Promise<Influencer[]> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: responseData, error } = await supabase.functions.invoke("discover-influencers", {
      body: { platform, keywords: nicheKeywords, niche },
    });

    if (error) {
      console.warn(`Edge function error for ${platform}`);
      return [];
    }

    if (responseData?.error) {
      console.warn(`API error for ${platform}: ${responseData.error}`);
      return [];
    }

    type RawProfile = Record<string, unknown> & { picture?: string | null };
    type RawAccount = { user_id?: string; profile?: RawProfile };

    const accounts: RawAccount[] = responseData?.accounts ?? [];
    if (!accounts.length) return [];

    const { proxyImage } = await import("@/lib/imageProxy");

    const mapped = accounts
      .map((account): Influencer => {
        const profile: RawProfile = account.profile ?? {};
        const followers     = num(profile.followers);
        const engagement    = num(profile.engagement_percent);
        const avgLikes      = num(profile.average_likes ?? profile.avg_likes);
        const avgComments   = num(profile.average_comments ?? profile.avg_comments);
        const bio           = String(profile.bio ?? profile.description ?? profile.biography ?? "");
        const handle        = String(profile.username ?? account.user_id ?? "");
        const name          = String(profile.full_name ?? handle);
        const location      = String(profile.location ?? profile.city ?? "");

        const lastPostTs = num(profile.last_post_timestamp) || null;
        let lastPostDaysAgo: number | undefined;
        if (lastPostTs) {
          const nowSec = Date.now() / 1000;
          lastPostDaysAgo = Math.max(0, Math.round((nowSec - lastPostTs) / 86400));
        }

        const following = num(profile.following) || undefined;
        const postsCount = num(profile.posts_count) || undefined;
        const erVerified = Boolean(profile.er_verified);
        const likeCv = profile.like_cv === null || profile.like_cv === undefined
          ? null
          : num(profile.like_cv);

        const auth = authenticityScore({
          followers,
          following,
          postsCount,
          engagementRate: engagement,
          erVerified,
          likeCv,
          verified: Boolean(profile.is_verified),
          bio,
          hasAvatar: Boolean(profile.picture),
        });

        const inf: Influencer = {
          id: String(account.user_id ?? handle),
          name,
          handle: handle.startsWith("@") ? handle : `@${handle}`,
          platform,
          followers,
          engagementRate: parseFloat(engagement.toFixed(1)),
          // Unknown stays unknown: a fabricated "São Paulo, SP" would also
          // earn the SP-based bonus in hopiScore.
          location: location || "",
          niche: extractNiches(bio, name),
          nicheCategory: classifyNiche(bio, name),
          profileUrl: buildProfileUrl(platform, handle),
          avatarInitials: initials(name),
          // Instagram/TikTok CDNs block hotlinking — route through image proxy
          avatarUrl: proxyImage(profile.picture) ?? undefined,
          verified: Boolean(profile.is_verified),
          avgLikes,
          avgComments,
          bio,
          contactEmail:
            typeof profile.email === "string" ? profile.email
            : typeof profile.contact_email === "string" ? profile.contact_email
            : undefined,
          score: 0,
          lastPostDaysAgo,
          following,
          postsCount,
          authenticity: auth.score,
          authenticityFlags: auth.flags,
          erVerified,
        };
        inf.score = hopiScore(inf);
        return inf;
      })
      .filter((inf) => inf.followers >= MIN_FOLLOWERS)
      // Enforce 3%+ ER. Exception: YouTube search results often lack
      // subscriber/ER data entirely — allow ER-unknown there only.
      .filter((inf) =>
        inf.engagementRate >= MIN_ENGAGEMENT ||
        (platform === "youtube" && inf.engagementRate === 0)
      )
      .filter((inf) => inf.authenticity >= MIN_AUTHENTICITY)
      .filter((inf) => !isBlockedAdultContent(inf.bio, inf.name));

    // Put creators matching the requested niche first, then by fit score
    if (niche) {
      mapped.sort((a, b) => {
        const aMatch = a.nicheCategory === niche ? 1 : 0;
        const bMatch = b.nicheCategory === niche ? 1 : 0;
        return bMatch - aMatch || b.score - a.score;
      });
    }
    return mapped;

  } catch (err) {
    console.error("influencers.club fetch error:", err);
    return [];
  }
}
