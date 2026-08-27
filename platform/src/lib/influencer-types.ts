export type Platform = "instagram" | "tiktok" | "youtube";

export type NicheCategory =
  | "maternity"
  | "adults"
  | "teenage"
  | "kids"
  | "tourism"
  | "theme_park"
  | "foodies"
  | "lifestyle"
  | "fashion_beauty"
  | "pop_culture"
  | "lgbt_pride"
  | "religious";

export const NICHE_ORDER: NicheCategory[] = [
  "maternity", "kids", "teenage", "adults",
  "tourism", "theme_park", "foodies",
  "lifestyle", "fashion_beauty", "pop_culture",
  "lgbt_pride", "religious",
];

export const PLATFORMS: Platform[] = ["instagram", "tiktok", "youtube"];

export const isPlatform = (v: string | undefined): v is Platform =>
  !!v && (PLATFORMS as string[]).includes(v);

export const isNicheCategory = (v: string | undefined): v is NicheCategory =>
  !!v && (NICHE_ORDER as string[]).includes(v);

export interface Influencer {
  id: string;
  name: string;
  handle: string;
  platform: Platform;
  followers: number;
  engagementRate: number;
  location: string;
  niche: string[];
  nicheCategory: NicheCategory;
  profileUrl: string;
  avatarInitials: string;
  avatarUrl?: string;
  verified: boolean;
  avgLikes: number;
  avgComments: number;
  bio: string;
  contactEmail?: string;
  score: number;
  lastPostDaysAgo?: number;
  following?: number;
  postsCount?: number;
  /** 0–100 — likelihood the audience/engagement is genuine */
  authenticity: number;
  /** human-readable reasons the authenticity score was reduced */
  authenticityFlags: string[];
  /** true when ER was computed from real multi-post data (not a single post) */
  erVerified: boolean;
}

export const NICHE_META: Record<NicheCategory, { label: string; emoji: string; color: string }> = {
  maternity:      { label: "Maternidade",          emoji: "🤱", color: "#f472b6" },
  adults:         { label: "Adultos",              emoji: "🎯", color: "#a78bfa" },
  teenage:        { label: "Adolescentes",         emoji: "🎧", color: "#38bdf8" },
  kids:           { label: "Kids",                 emoji: "🧸", color: "#fbbf24" },
  tourism:        { label: "Turismo",              emoji: "✈️", color: "#34d399" },
  theme_park:     { label: "Parques Temáticos",    emoji: "🎢", color: "#f97316" },
  foodies:        { label: "Foodies",              emoji: "🍕", color: "#fb7185" },
  lifestyle:      { label: "Lifestyle",            emoji: "🌿", color: "#a3e635" },
  fashion_beauty: { label: "Moda & Beleza",        emoji: "💄", color: "#e879f9" },
  pop_culture:    { label: "Cultura Pop",          emoji: "🎬", color: "#60a5fa" },
  lgbt_pride:     { label: "LGBT+ / Pride",        emoji: "🏳️‍🌈", color: "#f43f5e" },
  religious:      { label: "Religioso",            emoji: "⛪", color: "#c084fc" },
};

export const NICHE_API_KEYWORDS: Record<NicheCategory, string[]> = {
  maternity:      ["mãe", "maternidade", "gestante", "bebê", "mamãe", "motherhood", "pregnancy"],
  kids:           ["criança", "infantil", "kids", "brinquedo", "brincadeira", "cartoon"],
  teenage:        ["teen", "adolescente", "jovem", "gamer", "escola", "geração z"],
  adults:         ["casal", "happy hour", "humor", "comédia", "stand-up", "noite"],
  tourism:        ["viagem", "travel", "turismo", "turista", "destino", "mochileiro", "aventura"],
  theme_park:     ["parque", "montanha russa", "diversão", "adrenalina", "parque temático", "hopi hari"],
  foodies:        ["comida", "food", "gastronomia", "receita", "culinária", "chef", "restaurante"],
  lifestyle:      ["lifestyle", "rotina", "bem-estar", "fitness", "yoga", "wellness", "saúde"],
  fashion_beauty: ["moda", "fashion", "beleza", "beauty", "makeup", "maquiagem", "skincare"],
  pop_culture:    ["cinema", "filme", "série", "anime", "música", "pop", "geek", "cosplay"],
  lgbt_pride:     ["lgbt", "lgbtq", "pride", "orgulho", "drag", "queer", "diversidade", "arco-íris", "rainbow"],
  religious:      ["igreja", "deus", "cristão", "evangélico", "católico", "fé", "gospel", "pastor", "oração", "bíblia"],
};

export const platformColor: Record<Platform, string> = {
  instagram: "#E1306C",
  tiktok: "#69C9D0",
  youtube: "#FF0000",
};

export const platformLabel: Record<Platform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

export const platformIcon: Record<Platform, string> = {
  instagram: "📸",
  tiktok: "🎵",
  youtube: "▶️",
};
