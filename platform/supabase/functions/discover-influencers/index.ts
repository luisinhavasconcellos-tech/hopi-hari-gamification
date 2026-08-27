import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NICHE_SEARCH: Record<string, Record<string, string[]>> = {
  instagram: {
    maternity: ["maternidadereal", "maedesaopaulo", "vidademae", "maternidade", "mamaesp", "gravidasp", "enxovaldebebe", "mamaedeprimeiraviagem"],
    kids: ["mundoinfantil", "kidssp", "criancasfelizes", "brincadeirassp", "educacaoinfantil", "mamaecoruja", "filhos"],
    teenage: [
      "teensp", "geracaoz", "adolescentebrasileiro", "influencerteen", "jovembrasileiro",
      "gamerbrasil", "influencerjovem", "vidadeadolescente", "rotinadeestudante",
      "escolabrasileira", "faculdadebrasil", "universitariosp", "jovensbrasileiros",
      "tiktokerteen", "influenciadorjovem", "modateen", "studygrambrasil",
      "esportsbrasil", "skatebrasil", "dancabrasil", "kpopbrasil",
    ],
    adults: ["humorbrasileiro", "standupbrasil", "comediasp", "nightlifesp", "happyhoursp", "casalbrasileiro"],
    tourism: ["turismosp", "viagembrasil", "turismobrasil", "destinosp", "visitesaopaulo", "roteirodeviagem", "mochilao"],
    theme_park: ["hopihari", "parquedediversoes", "montanharussa", "diversaosp", "parquesp", "betocarrero", "parquetematico"],
    foodies: ["foodiesp", "gastronomiasp", "comidaboa", "restaurantesp", "receitasfaceis", "chefbrasileiro", "foodporn"],
    lifestyle: ["lifestylesp", "rotinasaudavel", "vidasaudavel", "bemestarsp", "fitnessbrasil", "selfcare", "yogabrasil"],
    fashion_beauty: [
      "modabrasileira", "fashionsp", "belezabrasileira", "makeupbrasil", "skincarebrasil",
      "lookdodia", "tendenciademoda", "maquiagem", "blogueirademoda", "fashionista",
      "beautyinfluencer", "cuidadoscomapele", "modafeminina", "ootd", "produtosdebeleza",
      "unhasdecoradas", "haircare", "modamasculina", "streetstyle", "cosmeticos",
    ],
    pop_culture: ["culturapop", "nerdbrasileiro", "geekbrasil", "cinemabrasil", "animebrasileiro", "kpopbrasil"],
    lgbt_pride: ["lgbtbrasil", "orgulholgbt", "pridebrasil", "diversidadesp", "draqueenbrasil", "lgbtqia", "arcoiris"],
    religious: ["igrejabrasil", "gospelbrasil", "louvorbrasil", "pastorbrasil", "cristaobrasileiro", "devocionaldiario", "cultoaovivo", "jesuscristo"],
  },
  tiktok: {
    maternity: ["maternidade", "vidademae", "maesaopaulo", "mamaedeprimeiraviagem"],
    kids: ["brincadeiras", "criancafeliz", "kidsbrasileiro", "mundoinfantil"],
    teenage: ["teenbrasil", "geracaoz", "adolescente", "gamerbrasil", "jovembrasileiro", "dancabrasil", "influencerteen", "esportsbrasil"],
    adults: ["humorbrasileiro", "standup", "comedia", "casalbrasileiro"],
    tourism: ["turismosaopaulo", "viagembrasil", "destinos", "roteirodeviagem"],
    theme_park: ["hopihari", "parquedediversoes", "montanharussa", "parquetematico"],
    foodies: ["comidabrasileira", "gastronomia", "receitasfaceis", "foodie", "foodporn"],
    lifestyle: ["lifestyle", "rotina", "fitnessbrasil", "selfcare"],
    fashion_beauty: [
      "modabrasileira", "makeup", "beleza", "lookdodia", "skincare",
      "maquiagem", "fashionista", "tendencia", "produtosdebeleza", "ootd",
    ],
    pop_culture: ["culturapop", "nerd", "animebrasil", "kpopbrasil"],
    lgbt_pride: ["lgbtbrasil", "orgulholgbt", "pridebrasil", "diversidade", "lgbtqia"],
    religious: ["gospelbrasil", "louvorbrasil", "igrejabrasil", "cristao", "devocional", "culto"],
  },
  youtube: {
    maternity: ["maternidade sao paulo", "vida de mae", "dicas mamae", "enxoval bebe"],
    kids: ["canal infantil brasil", "brincadeiras criancas", "mundo infantil"],
    teenage: ["adolescente brasileiro", "teen vlog", "gamer brasil", "jovem influencer", "danca brasil", "estudante vlog"],
    adults: ["humor brasileiro", "stand up", "comedia brasil"],
    tourism: ["turismo sao paulo", "viagem brasil", "roteiro viagem", "destinos brasil"],
    theme_park: ["hopi hari", "parque diversoes", "montanha russa", "parque tematico"],
    foodies: ["gastronomia brasileira", "receitas caseiras", "comida brasileira"],
    lifestyle: ["rotina saudavel", "lifestyle brasil", "bem estar", "self care"],
    fashion_beauty: [
      "moda brasileira", "tutorial makeup", "skincare rotina",
      "look do dia", "tendencia moda", "blogueira moda", "beauty brasil",
    ],
    pop_culture: ["cultura pop brasil", "nerdologia", "anime review", "kpop brasil"],
    lgbt_pride: ["lgbt brasil", "orgulho lgbt", "pride brasil", "diversidade brasil", "lgbtqia"],
    religious: ["gospel brasil", "louvor brasileiro", "igreja evangelica", "pastor brasileiro", "devocional cristao"],
  },
};

const ACTORS: Record<string, string> = {
  instagram: "apify~instagram-hashtag-scraper",
  tiktok: "clockworks~free-tiktok-scraper",
  youtube: "bernardo~youtube-scraper",
};

const MIN_FOLLOWERS = 50_000;
const MIN_ENGAGEMENT = 3; // %

function detectNiche(keywords: string[]): string {
  const kw = keywords.join(" ").toLowerCase();
  const map: Record<string, string[]> = {
    maternity: ["mãe", "mae", "maternidade", "gestante", "bebê", "bebe", "mamãe", "mamae", "motherhood", "pregnancy"],
    kids: ["criança", "criancas", "infantil", "kids", "brinquedo", "brincadeira"],
    teenage: ["teen", "adolescente", "jovem", "gamer", "escola", "geração z"],
    adults: ["casal", "happy hour", "humor", "comédia", "stand-up", "noite"],
    tourism: ["viagem", "travel", "turismo", "turista", "destino", "aventura"],
    theme_park: ["parque", "montanha russa", "diversão", "adrenalina", "hopi hari"],
    foodies: ["comida", "food", "gastronomia", "receita", "culinária", "chef", "restaurante"],
    lifestyle: ["lifestyle", "rotina", "bem-estar", "fitness", "yoga", "wellness"],
    fashion_beauty: ["moda", "fashion", "beleza", "beauty", "makeup", "maquiagem", "skincare"],
    pop_culture: ["cinema", "filme", "série", "anime", "música", "pop", "geek", "cosplay"],
    lgbt_pride: ["lgbt", "lgbtq", "pride", "orgulho", "drag", "queer", "diversidade"],
    religious: ["igreja", "deus", "cristão", "evangélico", "católico", "gospel", "pastor", "louvor", "fé"],
  };
  for (const [niche, terms] of Object.entries(map)) {
    if (terms.some((t) => kw.includes(t))) return niche;
  }
  return "lifestyle";
}

interface MappedAccount {
  user_id: string;
  profile: {
    username: string;
    full_name: string;
    bio: string;
    followers: number;
    following: number;
    posts_count: number;
    engagement_percent: number;
    average_likes: number;
    average_comments: number;
    picture: string | null;
    is_verified: boolean;
    is_private: boolean;
    location: string;
    last_post_timestamp: number | null;
    // discovery-quality signals
    term_hits: number;        // how many distinct niche hashtags this account appeared under
    like_cv: number | null;   // coefficient of variation of recent post likes (null = unknown)
    er_verified: boolean;     // true when ER was computed from real multi-post data
  };
}

function parseTimestamp(item: any, platform: string): number | null {
  if (platform === "instagram") {
    const ts = item.timestamp || item.takenAtTimestamp || item.taken_at_timestamp;
    if (ts) return typeof ts === "string" ? new Date(ts).getTime() / 1000 : ts;
  } else if (platform === "tiktok") {
    const ts = item.createTime || item.createTimeISO;
    if (ts) return typeof ts === "string" ? new Date(ts).getTime() / 1000 : ts;
  } else {
    const d = item.date || item.uploadDate || item.publishedAt;
    if (d) return new Date(d).getTime() / 1000;
  }
  return null;
}

function coefficientOfVariation(values: number[]): number | null {
  const vals = values.filter((v) => v > 0);
  if (vals.length < 3) return null;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  if (mean === 0) return null;
  const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
  return parseFloat((Math.sqrt(variance) / mean).toFixed(2));
}

function extractUniqueProfiles(items: any[], platform: string): MappedAccount[] {
  const seen = new Map<string, MappedAccount>();
  const latestTimestamp = new Map<string, number>();
  // Track which search terms each account surfaced under — appearing across
  // multiple niche hashtags is a strong on-niche signal, one viral post is not.
  const termsByUser = new Map<string, Set<string>>();

  for (const item of items) {
    if (item.error) continue;
    const ts = parseTimestamp(item, platform);
    const sourceTerm = String(
      item.hashtag || item.queryTag || item.searchQuery || item.searchHashtag || item.query || item.searchKeyword || ""
    ).toLowerCase();

    if (platform === "instagram") {
      const username = item.ownerUsername || item.username || "";
      if (!username) continue;

      if (sourceTerm) {
        if (!termsByUser.has(username)) termsByUser.set(username, new Set());
        termsByUser.get(username)!.add(sourceTerm);
      }

      if (ts && (!latestTimestamp.has(username) || ts > latestTimestamp.get(username)!)) {
        latestTimestamp.set(username, ts);
      }

      if (seen.has(username)) {
        const existing = seen.get(username)!;
        const likes = item.likesCount || 0;
        const comments = item.commentsCount || 0;
        existing.profile.average_likes = Math.round((existing.profile.average_likes + likes) / 2);
        existing.profile.average_comments = Math.round((existing.profile.average_comments + comments) / 2);
        continue;
      }

      const followers = item.ownerFollowerCount || item.followersCount || 0;
      const likes = item.likesCount || 0;
      const comments = item.commentsCount || 0;

      seen.set(username, {
        user_id: item.ownerId || item.id || username,
        profile: {
          username,
          full_name: item.ownerFullName || item.fullName || username,
          bio: item.ownerBiography || item.caption || "",
          followers,
          following: 0,
          posts_count: 0,
          engagement_percent: 0,
          average_likes: likes,
          average_comments: comments,
          picture: item.ownerProfilePicUrl || item.profilePicUrl || null,
          is_verified: item.ownerIsVerified || false,
          is_private: false,
          location: item.locationName || "",
          last_post_timestamp: ts,
          term_hits: 1,
          like_cv: null,
          er_verified: false,
        },
      });
    } else if (platform === "tiktok") {
      const username = item.authorMeta?.name || item.author?.uniqueId || item.uniqueId || "";
      if (!username) continue;

      if (sourceTerm) {
        if (!termsByUser.has(username)) termsByUser.set(username, new Set());
        termsByUser.get(username)!.add(sourceTerm);
      }
      if (seen.has(username)) continue;

      const meta = item.authorMeta || item.author || {};
      const followers = meta.fans || 0;
      const following = meta.following || 0;
      const totalHearts = meta.heart || meta.heartCount || 0;
      const videoCount = meta.video || meta.videoCount || 0;

      // Account-level ER: lifetime avg likes per video vs followers.
      // Far more robust than the single scraped video's stats.
      let engRate = 0;
      let erVerified = false;
      if (followers > 0 && totalHearts > 0 && videoCount > 0) {
        engRate = parseFloat((((totalHearts / videoCount) / followers) * 100).toFixed(1));
        erVerified = true;
      } else if (followers > 0) {
        const likes = item.diggCount || item.likes || 0;
        const comments = item.commentCount || item.comments || 0;
        engRate = parseFloat((((likes + comments) / followers) * 100).toFixed(1));
      }

      seen.set(username, {
        user_id: meta.id || username,
        profile: {
          username,
          full_name: meta.nickName || meta.nickname || username,
          bio: meta.signature || "",
          followers,
          following,
          posts_count: videoCount,
          engagement_percent: engRate,
          average_likes: videoCount > 0 ? Math.round(totalHearts / videoCount) : (item.diggCount || 0),
          average_comments: item.commentCount || item.comments || 0,
          picture: meta.avatar || meta.avatarLarger || null,
          is_verified: meta.verified || false,
          is_private: meta.privateAccount || false,
          location: "",
          last_post_timestamp: ts,
          term_hits: 1,
          like_cv: null,
          er_verified: erVerified,
        },
      });
    } else {
      const channelName = item.channelName || item.channelTitle || item.author || "";
      const channelId = item.channelId || channelName;
      if (!channelId) continue;

      if (sourceTerm) {
        if (!termsByUser.has(channelId)) termsByUser.set(channelId, new Set());
        termsByUser.get(channelId)!.add(sourceTerm);
      }
      if (seen.has(channelId)) continue;

      const ytSubs = item.subscriberCount || item.channelSubscribers || 0;
      const ytLikes = item.likes || item.likeCount || 0;
      const ytComments = item.commentsCount || item.commentCount || 0;
      const ytEngRate = ytSubs > 0
        ? parseFloat((((ytLikes + ytComments) / ytSubs) * 100).toFixed(1))
        : 0;

      seen.set(channelId, {
        user_id: channelId,
        profile: {
          username: channelName,
          full_name: channelName,
          bio: item.channelDescription || item.description || item.text || "",
          followers: ytSubs,
          following: 0,
          posts_count: item.channelTotalVideos || item.numberOfVideos || 0,
          engagement_percent: ytEngRate,
          average_likes: ytLikes,
          average_comments: ytComments,
          picture: item.channelAvatar || item.thumbnailUrl || null,
          is_verified: item.channelVerified || false,
          is_private: false,
          location: "",
          last_post_timestamp: ts,
          term_hits: 1,
          like_cv: null,
          er_verified: false,
        },
      });
    }
  }

  for (const [key, account] of seen) {
    const lt = latestTimestamp.get(key);
    if (lt && (!account.profile.last_post_timestamp || lt > account.profile.last_post_timestamp)) {
      account.profile.last_post_timestamp = lt;
    }
    account.profile.term_hits = termsByUser.get(key)?.size ?? 1;
  }

  return Array.from(seen.values());
}

async function enrichBatch(
  usernames: string[],
  apiToken: string
): Promise<any[]> {
  const actorId = "apify~instagram-profile-scraper";
  const runUrl = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${apiToken}&timeout=60`;
  const res = await fetch(runUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernames }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`Batch enrichment failed (${res.status}): ${errText.substring(0, 150)}`);
    return [];
  }
  return await res.json();
}

async function enrichInstagramProfiles(
  usernames: string[],
  apiToken: string
): Promise<Map<string, any>> {
  const enriched = new Map<string, any>();
  if (usernames.length === 0) return enriched;

  const BATCH_SIZE = 25;
  const MAX_PROFILES = 200;
  const toEnrich = usernames.slice(0, MAX_PROFILES);
  const batches: string[][] = [];
  for (let i = 0; i < toEnrich.length; i += BATCH_SIZE) {
    batches.push(toEnrich.slice(i, i + BATCH_SIZE));
  }

  console.log(`Enriching ${toEnrich.length} profiles in ${batches.length} batches of ~${BATCH_SIZE}...`);

  const allProfiles: any[] = [];
  const results = await Promise.allSettled(
    batches.map((batch) => enrichBatch(batch, apiToken))
  );
  for (const r of results) {
    if (r.status === "fulfilled") allProfiles.push(...r.value);
    else console.error("Batch failed:", r.reason);
  }

  console.log(`Enrichment returned ${allProfiles.length} profiles total`);

  for (const p of allProfiles) {
    const username = p.username || "";
    if (!username) continue;
    const fCount = p.followersCount || p.followers || 0;
    const posts: any[] = Array.isArray(p.latestPosts) ? p.latestPosts : [];
    const likeSeries = posts.map((post: any) => post.likesCount || 0);
    const avgLikes = posts.length > 0
      ? likeSeries.reduce((s: number, v: number) => s + v, 0) / posts.length
      : (p.likesReceivedAvg || 0);
    const avgComments = posts.length > 0
      ? posts.reduce((s: number, post: any) => s + (post.commentsCount || 0), 0) / posts.length
      : (p.commentsReceivedAvg || 0);
    const engPct = fCount > 0
      ? parseFloat((((avgLikes + avgComments) / fCount) * 100).toFixed(1))
      : 0;

    enriched.set(username, {
      followers: fCount,
      following: p.followsCount || p.following || 0,
      posts_count: p.postsCount || p.mediaCount || posts.length,
      bio: p.biography || p.bio || "",
      full_name: p.fullName || p.full_name || username,
      picture: p.profilePicUrl || p.profilePicUrlHD || null,
      is_verified: p.verified || p.isVerified || false,
      is_private: p.private || p.isPrivate || false,
      location: "",
      engagement_percent: engPct,
      average_likes: Math.round(avgLikes),
      average_comments: Math.round(avgComments),
      like_cv: coefficientOfVariation(likeSeries),
      er_verified: posts.length >= 3,
    });
  }

  return enriched;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const API_TOKEN = Deno.env.get("APIFY_API_TOKEN") ?? Deno.env.get("APIFY_TOKEN");
  if (!API_TOKEN) {
    return new Response(JSON.stringify({ error: "Apify API token not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { platform, keywords, niche: requestedNiche } = await req.json();

    if (!platform || !["instagram", "tiktok", "youtube"].includes(platform)) {
      return new Response(JSON.stringify({ error: "Invalid platform" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchKeywords: string[] = Array.isArray(keywords) && keywords.length > 0
      ? keywords
      : ["lifestyle"];

    const niche: string =
      typeof requestedNiche === "string" && NICHE_SEARCH[platform]?.[requestedNiche]
        ? requestedNiche
        : detectNiche(searchKeywords);
    const allTerms = NICHE_SEARCH[platform]?.[niche] ?? [];

    if (allTerms.length === 0) {
      return new Response(JSON.stringify({ accounts: [], total: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const shuffled = [...allTerms].sort(() => Math.random() - 0.5);
    const searchTerms = shuffled.slice(0, Math.min(8, shuffled.length));

    console.log(`Searching ${platform}/${niche}: ${searchTerms.join(", ")}`);

    const actorId = ACTORS[platform];
    let actorInput: Record<string, unknown>;

    if (platform === "instagram") {
      actorInput = {
        hashtags: searchTerms,
        resultsLimit: 300,
        resultsType: "posts",
      };
    } else if (platform === "tiktok") {
      actorInput = {
        searchQueries: searchTerms,
        resultsPerPage: 150,
        shouldDownloadCovers: false,
      };
    } else {
      actorInput = {
        searchKeywords: searchTerms,
        maxResults: 300,
      };
    }

    const runUrl = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${API_TOKEN}&timeout=300`;
    const res = await fetch(runUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actorInput),
    });

    console.log(`Apify status: ${res.status}`);

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Apify error ${res.status}:`, errText.substring(0, 500));
      return new Response(JSON.stringify({ error: `Apify error ${res.status}`, detail: errText.substring(0, 300) }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const items: any[] = await res.json();
    console.log(`Apify returned ${items.length} raw items`);

    let accounts = extractUniqueProfiles(items, platform);
    console.log(`Extracted ${accounts.length} unique profiles`);

    if (platform === "instagram") {
      // Prioritize enrichment: multi-hashtag accounts first (strongest on-niche
      // signal), then by follower count.
      accounts.sort((a, b) =>
        b.profile.term_hits - a.profile.term_hits || b.profile.followers - a.profile.followers
      );
      const usernames = accounts.map((a) => a.profile.username);
      const enrichmentData = await enrichInstagramProfiles(usernames, API_TOKEN);

      for (const account of accounts) {
        const data = enrichmentData.get(account.profile.username);
        if (data) {
          if (data.followers > 0) account.profile.followers = data.followers;
          account.profile.following = data.following;
          account.profile.posts_count = data.posts_count;
          account.profile.bio = data.bio || account.profile.bio;
          account.profile.full_name = data.full_name || account.profile.full_name;
          account.profile.picture = data.picture || account.profile.picture;
          account.profile.is_verified = data.is_verified || account.profile.is_verified;
          account.profile.is_private = data.is_private;
          account.profile.like_cv = data.like_cv;
          account.profile.er_verified = data.er_verified;
          if (data.engagement_percent > 0) {
            account.profile.engagement_percent = data.engagement_percent;
            account.profile.average_likes = data.average_likes;
            account.profile.average_comments = data.average_comments;
          }
        }
      }

      console.log(`Enriched ${enrichmentData.size} profiles with full data`);

      // Instagram: enrichment is our source of truth. Unenriched accounts have
      // unverifiable follower/ER data — drop them rather than pass junk through.
      accounts = accounts.filter((a) => enrichmentData.has(a.profile.username));
    }

    accounts = accounts.filter((a) => !a.profile.is_private);
    accounts = accounts.filter((a) => a.profile.followers >= MIN_FOLLOWERS);

    // Enforce ER floor server-side when we have verified multi-post ER.
    // YouTube search results often lack subscriber data → leave to client.
    accounts = accounts.filter((a) =>
      !a.profile.er_verified || a.profile.engagement_percent >= MIN_ENGAGEMENT
    );

    console.log(`Final: ${accounts.length} profiles with ${MIN_FOLLOWERS / 1000}K+ followers`);

    return new Response(JSON.stringify({ accounts, total: accounts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
