// AI Agent — stub implementations for demo mode
// Will be replaced with Lovable AI edge functions for production
import type { IGMedia, IGInsights, IGAccountMetrics } from "./instagram";

export interface PostAnalysis {
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore: number;
  topTopics: string[];
  audienceType: string;
  performanceVsAverage: "above" | "at" | "below";
  recommendation: string;
  bestTimeToPost?: string;
}

export interface GrowthStrategy {
  headline: string;
  summary: string;
  weaknesses: string[];
  opportunities: string[];
  actionItems: Array<{
    priority: "high" | "medium" | "low";
    title: string;
    description: string;
    expectedImpact: string;
  }>;
  contentMix: {
    reels: number;
    carousels: number;
    photos: number;
    stories: number;
  };
  bestPostingTimes: string[];
}

export interface BotDetectionResult {
  totalFollowers: number;
  estimatedBots: number;
  botPercentage: number;
  riskLevel: "low" | "medium" | "high";
  signals: string[];
}

// Demo stub — returns realistic static analysis
export async function analyzePost(
  post: IGMedia,
  insights: IGInsights,
  avgEngagement: number
): Promise<PostAnalysis> {
  await new Promise((r) => setTimeout(r, 1200));
  const perf = insights.engagement > avgEngagement ? "above" : insights.engagement < avgEngagement * 0.7 ? "below" : "at";
  return {
    sentiment: post.like_count > 10000 ? "positive" : "neutral",
    sentimentScore: post.like_count > 10000 ? 0.78 : 0.42,
    topTopics: ["parque temático", "diversão", "família", "adrenalina"],
    audienceType: "Famílias com filhos e jovens adultos (18-35) interessados em lazer",
    performanceVsAverage: perf,
    recommendation: perf === "above"
      ? "Excelente performance! Replique o formato e horário de postagem. Considere impulsionar este post."
      : "Teste variações de caption com CTAs mais fortes e publique entre 18h-20h para maximizar alcance.",
    bestTimeToPost: "Terça-feira e Quinta-feira, 18h30-19h30",
  };
}

export async function generateGrowthStrategy(
  _account: IGAccountMetrics,
  _recentPosts: IGMedia[],
  _accountInsights: Record<string, number>,
  _followerGrowthTrend: Array<{ date: string; count: number }>
): Promise<GrowthStrategy> {
  await new Promise((r) => setTimeout(r, 2000));
  return {
    headline: "Acelerar crescimento com Reels e UGC — potencial de +40% em 90 dias",
    summary: "A Hopi Hari tem uma base sólida de 1.2M seguidores, mas o engajamento está abaixo do benchmark do setor. A estratégia foca em aumentar Reels (de 18% para 40% do mix), implementar campanhas de UGC, e otimizar horários de postagem para maximizar alcance orgânico.",
    weaknesses: [
      "Frequência de postagem inconsistente — varia de 2 a 15 posts por semana",
      "Apenas 18% do conteúdo são Reels, formato com maior alcance orgânico",
      "Baixa taxa de resposta a comentários (estimada em 35%)",
      "Pouca diversidade de CTAs — maioria dos posts não tem call-to-action claro",
      "Horários de postagem não otimizados para o público principal",
    ],
    opportunities: [
      "Aumentar Reels para 40% do mix — potencial de +85% no alcance",
      "Parcerias com micro-influenciadores locais (10K-50K seguidores)",
      "Série semanal de conteúdo: 'Bastidores do Parque' para gerar conexão",
      "Campanhas de UGC com hashtag #MeuHopiHari para aumentar compartilhamentos",
      "Cross-posting estratégico com TikTok para captar público jovem",
    ],
    actionItems: [
      {
        priority: "high",
        title: "Implementar calendário editorial fixo",
        description: "Definir 5 posts/semana com mix de 40% Reels, 30% Carrosséis, 20% Fotos, 10% Stories. Usar ferramenta de agendamento.",
        expectedImpact: "+25% consistência, +15% alcance em 30 dias",
      },
      {
        priority: "high",
        title: "Lançar campanha #MeuHopiHari",
        description: "Incentivar visitantes a postar com a hashtag. Repostar os melhores no feed oficial. Premiar semanalmente.",
        expectedImpact: "+200% em conteúdo gerado por usuários, +30% engajamento",
      },
      {
        priority: "medium",
        title: "Otimizar horários de postagem",
        description: "Publicar entre 18h-20h em dias úteis e 10h-12h nos fins de semana, baseado em dados de audiência.",
        expectedImpact: "+20% impressões por post",
      },
      {
        priority: "medium",
        title: "Programa de micro-influenciadores",
        description: "Convidar 10 criadores locais (10K-50K) para experiências no parque em troca de conteúdo autêntico.",
        expectedImpact: "Alcance incremental de 500K-1M por campanha",
      },
      {
        priority: "low",
        title: "Responder 80%+ dos comentários",
        description: "Implementar rotina de community management com respostas personalizadas em até 2 horas.",
        expectedImpact: "+40% taxa de comentários, melhor posicionamento no algoritmo",
      },
    ],
    contentMix: { reels: 40, carousels: 30, photos: 20, stories: 10 },
    bestPostingTimes: [
      "Terça-feira, 18h30",
      "Quinta-feira, 19h00",
      "Sábado, 10h30",
      "Domingo, 11h00",
      "Quarta-feira, 18h00",
    ],
  };
}

export async function detectBots(
  account: IGAccountMetrics,
  _avgEngagement: number
): Promise<BotDetectionResult> {
  await new Promise((r) => setTimeout(r, 1500));
  return {
    totalFollowers: account.followers_count,
    estimatedBots: Math.floor(account.followers_count * 0.032),
    botPercentage: 3.2,
    riskLevel: "medium",
    signals: [
      "~3.2% de seguidores com padrão de follow/unfollow repetitivo",
      "Pico anormal de 2.400 novos seguidores em 12/Mar sem correlação com conteúdo",
      "~0.8% dos likes originam de contas sem foto de perfil e sem posts",
      "Cluster de 340 contas seguindo perfis idênticos (padrão de bot farm)",
      "Taxa de comentários genéricos ('🔥', '👏', 'nice') acima da média do setor",
    ],
  };
}

// Demo chat — returns pre-built responses
export async function chatWithAgent(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  _context: { account?: IGAccountMetrics; recentPosts?: IGMedia[] }
): Promise<string> {
  await new Promise((r) => setTimeout(r, 1000));
  const lastMsg = messages.filter((m) => m.role === "user").at(-1)?.content.toLowerCase() ?? "";

  if (lastMsg.includes("reel") || lastMsg.includes("vídeo")) {
    return "📹 **Estratégia de Reels para Hopi Hari:**\n\n1. **POV de atrações** — filme a perspectiva do visitante nas montanhas-russas. Esses vídeos geram 3x mais engajamento.\n\n2. **Reações de visitantes** — capture momentos genuínos de emoção e surpresa.\n\n3. **Transformações** — antes/depois de uma reforma de atração ou decoração sazonal.\n\n4. Use áudios trending e mantenha os vídeos entre 15-30 segundos para máximo alcance.\n\nQuer que eu detalhe algum desses formatos?";
  }
  if (lastMsg.includes("hashtag") || lastMsg.includes("tag")) {
    return "🏷️ **Estratégia de Hashtags:**\n\n**Hashtags principais (sempre usar):**\n- #HopiHari #ParqueDesDiversões #Vinhedo\n\n**Hashtags de engajamento:**\n- #MeuHopiHari #AventuraNoParque #DiversãoEmFamília\n\n**Hashtags sazonais (rotacionar):**\n- #VerãoNoParque #HalloweenHopiHari #NatalMágico\n\nUse 8-12 hashtags por post. Coloque no primeiro comentário, não na legenda.";
  }
  if (lastMsg.includes("crescer") || lastMsg.includes("seguidores") || lastMsg.includes("growth")) {
    return "📈 **Top 5 ações para crescer seguidores agora:**\n\n1. **Reels diários** — o algoritmo prioriza Reels sobre fotos. Publique pelo menos 1 por dia.\n\n2. **Collabs com criadores** — use a feature de Collab Post para aparecer no feed de outros perfis.\n\n3. **Giveaways estratégicos** — sorteio de ingressos com mecânica 'marque 3 amigos + siga'.\n\n4. **Cross-posting TikTok→Reels** — adapte conteúdos virais do TikTok para Reels.\n\n5. **Responda TODOS os comentários** — isso aumenta o sinal de engajamento pro algoritmo.\n\nEstimativa: +15K-25K seguidores/mês com execução consistente.";
  }

  return "Essa é uma ótima pergunta! Com base nos dados da Hopi Hari, eu recomendaria focar em 3 pilares:\n\n1. **Consistência** — manter uma frequência regular de 5+ posts por semana\n2. **Diversidade de formato** — mix de Reels (40%), Carrosséis (30%) e Fotos (30%)\n3. **Engajamento ativo** — responder comentários e interagir com seguidores\n\nQuer que eu elabore algum desses pontos em mais detalhes?";
}
