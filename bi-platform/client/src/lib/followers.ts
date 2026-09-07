import { supabase } from "@/integrations/supabase/client";
import type { Platform } from "@/lib/kpis";

export const FOLLOWER_PLATFORMS: Platform[] = [
  "instagram",
  "tiktok",
  "facebook",
  "youtube",
  "linkedin",
];

export type FollowerCounts = {
  counts: Record<Platform, number>;
  total: number;
  /** Data da leitura diária usada como fonte canônica (null se veio só do cadastro manual) */
  readingDate: string | null;
  /** Plataformas cujo número veio do cadastro manual (sem leitura diária) */
  fallbackPlatforms: Platform[];
};

const EMPTY: Record<Platform, number> = {
  instagram: 0,
  tiktok: 0,
  facebook: 0,
  youtube: 0,
  linkedin: 0,
};

/**
 * Fonte única de seguidores da plataforma.
 * Prioriza o log diário (`follower_daily`, alimentado pela planilha oficial) e
 * só usa `platform_settings` (cadastro manual) quando a rede não tem leitura.
 */
export async function fetchFollowerCounts(): Promise<FollowerCounts> {
  const [{ data: daily }, { data: settings }] = await Promise.all([
    supabase
      .from("follower_daily")
      .select("reading_date,instagram,tiktok,facebook,youtube,linkedin")
      .order("reading_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("platform_settings").select("platform,follower_count"),
  ]);

  const manual = new Map<string, number>(
    (settings ?? []).map((s: { platform: string; follower_count: number | null }) => [
      s.platform,
      s.follower_count ?? 0,
    ]),
  );

  const counts = { ...EMPTY };
  const fallbackPlatforms: Platform[] = [];

  for (const p of FOLLOWER_PLATFORMS) {
    const fromDaily = daily ? Number((daily as Record<string, unknown>)[p] ?? 0) : 0;
    if (fromDaily > 0) {
      counts[p] = fromDaily;
    } else {
      counts[p] = manual.get(p) ?? 0;
      if (counts[p] > 0) fallbackPlatforms.push(p);
    }
  }

  return {
    counts,
    total: FOLLOWER_PLATFORMS.reduce((s, p) => s + counts[p], 0),
    readingDate: daily?.reading_date ?? null,
    fallbackPlatforms,
  };
}

export async function fetchFollowerCount(platform: Platform): Promise<number> {
  const { counts } = await fetchFollowerCounts();
  return counts[platform] ?? 0;
}
