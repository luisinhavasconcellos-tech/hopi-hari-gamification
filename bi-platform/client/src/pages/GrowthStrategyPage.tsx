import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { generateGrowthStrategy, detectBots } from "@/lib/aiAgent";
import { loadInstagramAccount } from "@/lib/realAccount";
import type { GrowthStrategy, BotDetectionResult } from "@/lib/aiAgent";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import HoraDoHorrorCorrelationPanel from "@/components/HoraDoHorrorCorrelationPanel";

const PRIORITY_CLASSES = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

const CONTENT_COLORS = ["hsl(25,95%,53%)", "hsl(330,80%,55%)", "hsl(260,60%,55%)", "hsl(187,80%,48%)"];

interface GlobalReport {
  overview: string;
  bestPerformers?: { shortcode: string; reason: string }[];
  worstPerformers?: { shortcode: string; reason: string }[];
  winningThemes: string[];
  losingThemes?: string[];
  contentMixRecommendation: string;
  postingCadenceRecommendation?: string;
  engagementInsights?: string;
  nextActions: string[];
}

interface PostMeta {
  shortcode: string;
  caption: string | null;
  post_url: string | null;
  timestamp: string | null;
  media_type: string | null;
  thumbnail_url: string | null;
}

function PerformerItem({ shortcode, reason, meta }: { shortcode: string; reason: string; meta?: PostMeta }) {
  const url = meta?.post_url ?? `https://www.instagram.com/p/${shortcode}/`;
  const raw = (meta?.caption ?? "").replace(/\s+/g, " ").trim();
  const title = raw ? (raw.length > 90 ? `${raw.slice(0, 90)}…` : raw) : "Post sem legenda";
  const date = meta?.timestamp ? new Date(meta.timestamp).toLocaleDateString("pt-BR") : null;

  return (
    <li className="text-sm">
      <a href={url} target="_blank" rel="noreferrer" className="text-primary font-medium hover:underline">
        {title}
      </a>
      <p className="text-[11px] text-muted-foreground mt-0.5">
        {[date, meta?.media_type, url].filter(Boolean).join(" · ")}
      </p>
      <p className="text-secondary-foreground mt-1">{reason}</p>
    </li>
  );
}


export default function GrowthStrategyPage() {
  const { toast } = useToast();
  const [strategy, setStrategy] = useState<GrowthStrategy | null>(null);
  const [botResult, setBotResult] = useState<BotDetectionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"global" | "strategy" | "horror" | "bots">("global");
  const [globalReport, setGlobalReport] = useState<GlobalReport | null>(null);
  const [generating, setGenerating] = useState(false);
  const [scrapedCount, setScrapedCount] = useState(0);
  const [postMeta, setPostMeta] = useState<Record<string, PostMeta>>({});

  useEffect(() => {
    (async () => {
      const { account, posts, insights, growth } = await loadInstagramAccount(30);
      const sample = posts.slice(0, 10);
      const avgEngagement = sample.length
        ? sample.reduce((s, p) => s + p.like_count + p.comments_count, 0) / sample.length
        : 0;
      const [strat, bots, countRes, lastReport] = await Promise.all([
        generateGrowthStrategy(account, posts, insights, growth),
        detectBots(account, avgEngagement),
        supabase.from("instagram_posts").select("id", { count: "exact", head: true }).eq("scrape_status", "scraped"),
        supabase.from("instagram_reports").select("insights").eq("scope", "global").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setStrategy(strat);
      setBotResult(bots);
      setScrapedCount(countRes.count ?? 0);
      if (lastReport.data?.insights) setGlobalReport(lastReport.data.insights as unknown as GlobalReport);
      setLoading(false);
    })();
  }, []);

  // Carrega título/legenda e link real dos posts citados no relatório
  useEffect(() => {
    const codes = [
      ...(globalReport?.bestPerformers ?? []),
      ...(globalReport?.worstPerformers ?? []),
    ].map((p) => p.shortcode).filter(Boolean);
    if (codes.length === 0) return;
    (async () => {
      const { data } = await supabase
        .from("instagram_posts")
        .select("shortcode,caption,post_url,timestamp,media_type,thumbnail_url")
        .in("shortcode", codes);
      const map: Record<string, PostMeta> = {};
      (data ?? []).forEach((p: any) => {
        if (p.shortcode) map[p.shortcode] = p;
      });
      setPostMeta(map);
    })();
  }, [globalReport]);



  const generateGlobalReport = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-posts", { body: { action: "global" } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? "Falha");
      setGlobalReport(data.insights);
      toast({ title: "Relatório gerado", description: `${data.postsAnalyzed} posts analisados` });
    } catch (e) {
      toast({ title: "Erro", description: e instanceof Error ? e.message : "Falha", variant: "destructive" });
    }
    setGenerating(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Carregando dados e exemplos ilustrativos...</p>
        <p className="text-muted-foreground/50 text-xs">Isso pode levar alguns segundos</p>
      </div>
    );
  }

  const contentMixData = strategy
    ? [
        { name: "Reels", value: strategy.contentMix.reels },
        { name: "Carrosséis", value: strategy.contentMix.carousels },
        { name: "Fotos", value: strategy.contentMix.photos },
        { name: "Stories", value: strategy.contentMix.stories },
      ]
    : [];

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 8v4l3 3"/></svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Estratégia de Crescimento IA</h1>
        </div>
        {strategy && <p className="text-muted-foreground text-sm italic">{strategy.headline}</p>}
      </div>

      <div className="flex gap-2 mb-6">
        {(["global", "strategy", "horror", "bots"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t ? "bg-primary/20 text-primary border border-primary/30" : "bg-card text-muted-foreground border border-border hover:text-foreground"}`}>
            {t === "global" ? "Relatório Global (IA)" : t === "strategy" ? "Estratégia" : t === "horror" ? "Hora do Horror" : "Detector de Bots"}
          </button>
        ))}
      </div>

      {tab === "global" && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-1">Análise consolidada de {scrapedCount} posts processados</h2>
              <p className="text-muted-foreground text-xs">A IA identifica padrões, melhores e piores performers, temas vencedores e ações práticas.</p>
            </div>
            <button
              onClick={generateGlobalReport}
              disabled={generating || scrapedCount === 0}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold gradient-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Analisando...
                </>
              ) : globalReport ? "Gerar novo relatório" : "Gerar relatório"}
            </button>
          </div>

          {scrapedCount === 0 && (
            <div className="bg-warning/10 border border-warning/30 rounded-2xl p-5 text-sm text-warning-foreground">
              Nenhum post processado ainda. Vá para <Link to="/posts" className="text-primary underline">Posts</Link> e inicie a coleta de dados primeiro.
            </div>
          )}

          {globalReport && (
            <>
              <div className="gradient-primary-bg border border-primary/20 rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Resumo Executivo</h2>
                <p className="text-secondary-foreground leading-relaxed whitespace-pre-line">{globalReport.overview}</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {globalReport.bestPerformers && globalReport.bestPerformers.length > 0 && (
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <h3 className="text-sm font-semibold text-success mb-4">Melhores Performers</h3>
                    <ul className="space-y-3">
                      {globalReport.bestPerformers.map((p, i) => (
                        <PerformerItem key={i} shortcode={p.shortcode} reason={p.reason} meta={postMeta[p.shortcode]} />
                      ))}

                    </ul>
                  </div>
                )}

                {globalReport.worstPerformers && globalReport.worstPerformers.length > 0 && (
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <h3 className="text-sm font-semibold text-destructive mb-4">Piores Performers</h3>
                    <ul className="space-y-3">
                      {globalReport.worstPerformers.map((p, i) => (
                        <PerformerItem key={i} shortcode={p.shortcode} reason={p.reason} meta={postMeta[p.shortcode]} />
                      ))}

                    </ul>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-success mb-4">Temas que Funcionam</h3>
                  <div className="flex flex-wrap gap-2">
                    {globalReport.winningThemes.map((t, i) => (
                      <span key={i} className="bg-success/10 text-success text-xs px-2.5 py-1 rounded-lg border border-success/20">{t}</span>
                    ))}
                  </div>
                </div>
                {globalReport.losingThemes && globalReport.losingThemes.length > 0 && (
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <h3 className="text-sm font-semibold text-destructive mb-4">Temas a Evitar</h3>
                    <div className="flex flex-wrap gap-2">
                      {globalReport.losingThemes.map((t, i) => (
                        <span key={i} className="bg-destructive/10 text-destructive text-xs px-2.5 py-1 rounded-lg border border-destructive/20">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Mix de Conteúdo</h3>
                  <p className="text-sm text-secondary-foreground leading-relaxed">{globalReport.contentMixRecommendation}</p>
                </div>
                {globalReport.postingCadenceRecommendation && (
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Cadência</h3>
                    <p className="text-sm text-secondary-foreground leading-relaxed">{globalReport.postingCadenceRecommendation}</p>
                  </div>
                )}
              </div>

              {globalReport.engagementInsights && (
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Insights de Engajamento</h3>
                  <p className="text-sm text-secondary-foreground leading-relaxed">{globalReport.engagementInsights}</p>
                </div>
              )}

              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">Próximas Ações</h3>
                <ol className="space-y-2.5">
                  {globalReport.nextActions.map((a, i) => (
                    <li key={i} className="flex gap-3 text-sm text-secondary-foreground">
                      <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "strategy" && strategy && (
        <div className="space-y-6">
          <div role="note" className="bg-warning/10 border border-warning/30 rounded-2xl p-4 text-sm text-warning-foreground">
            <strong>Conteúdo ilustrativo estático — não gerado a partir dos dados do Hopi Hari.</strong> Os números e recomendações abaixo são um exemplo fixo de demonstração.
          </div>
          <div className="gradient-primary-bg border border-primary/20 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Resumo Estratégico</h2>
            <p className="text-secondary-foreground leading-relaxed">{strategy.summary}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-destructive mb-4">Pontos Fracos</h2>
              <ul className="space-y-2">
                {strategy.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-secondary-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 shrink-0" />{w}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-success mb-4">Oportunidades</h2>
              <ul className="space-y-2">
                {strategy.opportunities.map((o, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-secondary-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-success mt-1.5 shrink-0" />{o}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">Plano de Ação</h2>
            <div className="space-y-3">
              {strategy.actionItems.map((item, i) => (
                <div key={i} className="border border-border rounded-xl p-4 hover:border-border/80 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${PRIORITY_CLASSES[item.priority]}`}>
                      {item.priority === "high" ? "Alta" : item.priority === "medium" ? "Média" : "Baixa"}
                    </span>
                    <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-2">{item.description}</p>
                  <p className="text-xs text-primary font-medium">→ {item.expectedImpact}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">Mix de Conteúdo Recomendado</h2>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={contentMixData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {contentMixData.map((_, index) => (
                      <Cell key={index} fill={CONTENT_COLORS[index % CONTENT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(0,0%,100%)", border: "1px solid hsl(0,0%,89%)", borderRadius: 8, fontSize: 12, color: "hsl(0,0%,9%)" }} formatter={(v: number) => [`${v}%`, ""]} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "hsl(0,0%,45%)" }} formatter={(value, _, index) => `${value} (${contentMixData[index].value}%)`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">⏰ Melhores Horários para Postar</h2>
              <div className="space-y-2">
                {strategy.bestPostingTimes.map((time, i) => (
                  <div key={i} className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-3">
                    <span className="text-primary font-bold text-lg">#{i + 1}</span>
                    <span className="text-foreground text-sm font-medium">{time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "horror" && <HoraDoHorrorCorrelationPanel />}

      {tab === "bots" && botResult && (
        <div className="space-y-6">
          <div role="note" className="bg-warning/10 border border-warning/30 rounded-2xl p-4 text-sm text-warning-foreground">
            <strong>Conteúdo ilustrativo estático — não gerado a partir dos dados do Hopi Hari.</strong> Os números e recomendações abaixo são um exemplo fixo de demonstração.
          </div>
          <div className={`rounded-2xl p-6 border ${
            botResult.riskLevel === "high" ? "bg-destructive/5 border-destructive/20" :
            botResult.riskLevel === "medium" ? "bg-warning/5 border-warning/20" : "bg-success/5 border-success/20"
          }`}>
            <div className="flex items-center gap-4">
              <div className={`text-4xl font-black ${
                botResult.riskLevel === "high" ? "text-destructive" :
                botResult.riskLevel === "medium" ? "text-warning" : "text-success"
              }`}>
                {botResult.botPercentage.toFixed(1)}%
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Seguidores Suspeitos de Serem Bots</p>
                <p className={`text-xs mt-1 ${
                  botResult.riskLevel === "high" ? "text-destructive" :
                  botResult.riskLevel === "medium" ? "text-warning" : "text-success"
                }`}>
                  Risco {botResult.riskLevel === "high" ? "ALTO" : botResult.riskLevel === "medium" ? "MÉDIO" : "BAIXO"} — ~{botResult.estimatedBots.toLocaleString("pt-BR")} contas suspeitas
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">Sinais Detectados</h2>
            <ul className="space-y-3">
              {botResult.signals.map((signal, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-secondary-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning mt-1.5 shrink-0" />{signal}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-foreground mb-3">Recomendações</h2>
            <ul className="space-y-2 text-sm text-secondary-foreground">
              <li className="flex items-start gap-2"><span className="text-primary">1.</span> Realize limpeza mensal de contas inativas usando ferramentas como IGAudit</li>
              <li className="flex items-start gap-2"><span className="text-primary">2.</span> Monitore picos anormais de novos seguidores — podem indicar bot attacks</li>
              <li className="flex items-start gap-2"><span className="text-primary">3.</span> Evite comprar seguidores — além de serem bots, prejudicam o alcance orgânico</li>
              <li className="flex items-start gap-2"><span className="text-primary">4.</span> Reporte contas suspeitas diretamente pelo Instagram</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
