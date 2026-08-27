import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { chatWithAgent } from "@/lib/aiAgent";
import { proxyImage } from "@/lib/imageProxy";
import { useToast } from "@/hooks/use-toast";

interface PostRow {
  id: string;
  post_url: string;
  shortcode: string | null;
  media_type: string | null;
  caption: string | null;
  thumbnail_url: string | null;
  media_url: string | null;
  like_count: number;
  comments_count: number;
  view_count: number | null;
  timestamp: string | null;
  owner_username: string | null;
  scrape_status: string;
  ai_analysis: PostAnalysisData | null;
}

interface PostAnalysisData {
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore?: number;
  performanceVsAverage: "above" | "at" | "below";
  performanceSummary?: string;
  topTopics: string[];
  summary?: string;
  behaviorAnalysis?: string;
  strategyAnalysis?: string;
  audienceReactions?: string;
  strengths?: string[];
  weaknesses?: string[];
  recommendation: string;
  nextSteps?: string[];
  bestTimeToPost?: string;
  contentPillar?: string;
  analyzed_at?: string;
}

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [post, setPost] = useState<PostRow | null>(null);
  const [analysis, setAnalysis] = useState<PostAnalysisData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data, error } = await supabase.from("instagram_posts").select("*").eq("id", id).maybeSingle();
      if (error || !data) {
        toast({ title: "Post não encontrado", variant: "destructive" });
        return;
      }
      setPost(data as unknown as PostRow);
      const initial = (data.ai_analysis ?? null) as unknown as PostAnalysisData | null;
      if (initial) setAnalysis(initial);
      setMessages([{
        role: "assistant",
        content: data.scrape_status === "scraped"
          ? `Olá! Este post foi publicado em **${data.timestamp ? new Date(data.timestamp).toLocaleDateString("pt-BR") : "data desconhecida"}** e tem ${data.like_count} curtidas e ${data.comments_count} comentários.${initial?.recommendation ? `\n\n${initial.recommendation}` : "\n\nGerando análise estratégica em profundidade..."}`
          : "Este post ainda não foi processado. Vá para a página Posts e inicie a coleta de dados.",
      }]);

      // Auto-trigger deep analysis if missing or if it's the old shallow format
      if (data.scrape_status === "scraped" && !initial?.behaviorAnalysis) {
        runAnalysis(data.id);
      }
    })();
  }, [id, toast]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const runAnalysis = async (overrideId?: string) => {
    const targetId = overrideId ?? post?.id;
    if (!targetId) return;
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-posts", {
        body: { action: "post", postId: targetId, platform: "instagram" },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? "Falha");
      setAnalysis(data.analysis);
      toast({ title: "Análise concluída" });
    } catch (e) {
      toast({ title: "Erro", description: e instanceof Error ? e.message : "Falha na análise", variant: "destructive" });
    }
    setAnalyzing(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || chatLoading || !post) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);

    const fakeAccount = { username: "hopihari", name: "Hopi Hari", followers_count: 0, follows_count: 0, media_count: 0 } as never;
    const reply = await chatWithAgent(
      [...messages, { role: "user", content: userMsg }],
      { account: fakeAccount, recentPosts: [] }
    );
    setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    setChatLoading(false);
  };

  const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</p>
      {children}
    </div>
  );

  if (!post) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sentimentColor =
    analysis?.sentiment === "positive" ? "text-success" :
    analysis?.sentiment === "negative" ? "text-destructive" : "text-warning";

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <Link to="/posts" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors">
        ← Voltar para Posts
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div className="rounded-2xl overflow-hidden border border-border aspect-square bg-card flex items-center justify-center">
            {post.thumbnail_url ? (
              <img src={proxyImage(post.thumbnail_url)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div className="text-center p-8">
                <p className="text-muted-foreground text-sm mb-2">Sem thumbnail (post não processado)</p>
                <a href={post.post_url} target="_blank" rel="noreferrer" className="text-primary text-xs underline">Abrir no Instagram →</a>
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Legenda</p>
              <a href={post.post_url} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline">@{post.owner_username ?? "hopihari"} →</a>
            </div>
            <p className="text-secondary-foreground text-sm leading-relaxed whitespace-pre-line">{post.caption ?? "(sem dados — post pendente)"}</p>
            <div className="flex gap-4 mt-4 pt-4 border-t border-border text-sm">
              <span className="text-muted-foreground"><span className="text-foreground font-semibold">{(post.like_count ?? 0).toLocaleString("pt-BR")}</span></span>
              <span className="text-muted-foreground"><span className="text-foreground font-semibold">{(post.comments_count ?? 0).toLocaleString("pt-BR")}</span></span>
              {post.view_count ? <span className="text-muted-foreground"><span className="text-foreground font-semibold">{post.view_count.toLocaleString("pt-BR")}</span></span> : null}
              <span className="text-muted-foreground ml-auto text-xs">
                {post.timestamp ? new Date(post.timestamp).toLocaleDateString("pt-BR", { dateStyle: "full" }) : "—"}
              </span>
            </div>
          </div>

          {post.scrape_status === "scraped" && (
            <button
              onClick={() => runAnalysis()}
              disabled={analyzing}
              className="w-full px-4 py-3 rounded-xl text-sm font-semibold gradient-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {analyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Analisando em profundidade...
                </>
              ) : analysis ? "Reanalisar com IA" : "Analisar com IA"}
            </button>
          )}

        </div>

        <div className="flex flex-col">
          <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col" style={{ minHeight: 600 }}>
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Agente de Crescimento IA</p>
                <p className="text-xs text-success">● Ativo</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ maxHeight: 450 }}>
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary/20 text-foreground border border-primary/30"
                      : "bg-secondary text-secondary-foreground"
                  }`}>
                    {msg.content.split("\n").map((line, j) => (
                      <p key={j} className={j > 0 ? "mt-1" : ""}>{line}</p>
                    ))}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-secondary rounded-2xl px-4 py-3 flex gap-1.5 items-center">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Pergunte sobre este post..."
                  className="flex-1 bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
                />
                <button
                  onClick={sendMessage}
                  disabled={chatLoading || !input.trim()}
                  className="gradient-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  Enviar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {analysis && (
        <div className="mt-6 bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold text-foreground">Análise IA Profunda</h3>
              {analysis.contentPillar && (
                <p className="text-xs text-muted-foreground mt-0.5">Pilar: {analysis.contentPillar}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`text-xs font-semibold uppercase ${sentimentColor}`}>
                {analysis.sentiment === "positive" ? "Positivo" : analysis.sentiment === "negative" ? "Negativo" : "Neutro"}
                {typeof analysis.sentimentScore === "number" && (
                  <span className="ml-1 text-muted-foreground font-normal">({analysis.sentimentScore.toFixed(2)})</span>
                )}
              </span>
              <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border ${
                analysis.performanceVsAverage === "above" ? "text-success border-success/30 bg-success/10" :
                analysis.performanceVsAverage === "below" ? "text-destructive border-destructive/30 bg-destructive/10" :
                "text-warning border-warning/30 bg-warning/10"
              }`}>
                {analysis.performanceVsAverage === "above" ? "Acima da média" : analysis.performanceVsAverage === "below" ? "Abaixo da média" : "Na média"}
              </span>
            </div>
          </div>

          {analysis.summary && (
            <div className="text-sm text-secondary-foreground leading-relaxed italic border-l-2 border-primary/40 pl-3 mb-6">
              {analysis.summary}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            {analysis.performanceSummary && (
              <Section label="Performance">
                <p className="text-sm text-secondary-foreground leading-relaxed">{analysis.performanceSummary}</p>
              </Section>
            )}
            {analysis.behaviorAnalysis && (
              <Section label="Comportamento da Audiência">
                <p className="text-sm text-secondary-foreground leading-relaxed">{analysis.behaviorAnalysis}</p>
              </Section>
            )}
            {analysis.strategyAnalysis && (
              <Section label="Estratégia de Conteúdo">
                <p className="text-sm text-secondary-foreground leading-relaxed">{analysis.strategyAnalysis}</p>
              </Section>
            )}
            {analysis.audienceReactions && (
              <Section label="Reações nos Comentários">
                <p className="text-sm text-secondary-foreground leading-relaxed">{analysis.audienceReactions}</p>
              </Section>
            )}
          </div>

          {(analysis.strengths?.length || analysis.weaknesses?.length) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
              {analysis.strengths?.length ? (
                <div className="rounded-xl border border-success/20 bg-success/5 p-3">
                  <p className="text-xs font-semibold text-success mb-2">Pontos fortes</p>
                  <ul className="space-y-1">
                    {analysis.strengths.map((s, i) => (
                      <li key={i} className="text-xs text-secondary-foreground leading-snug">• {s}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {analysis.weaknesses?.length ? (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
                  <p className="text-xs font-semibold text-destructive mb-2">Oportunidades</p>
                  <ul className="space-y-1">
                    {analysis.weaknesses.map((w, i) => (
                      <li key={i} className="text-xs text-secondary-foreground leading-snug">• {w}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {analysis.topTopics?.length ? (
            <div className="mt-5">
              <Section label="Tópicos">
                <div className="flex flex-wrap gap-2">
                  {analysis.topTopics.map((t) => (
                    <span key={t} className="bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-lg border border-primary/20">{t}</span>
                  ))}
                </div>
              </Section>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 mt-5">
            <Section label="Recomendação Principal">
              <p className="text-sm text-foreground leading-relaxed font-medium">{analysis.recommendation}</p>
            </Section>
            {analysis.nextSteps?.length ? (
              <Section label="Próximos Passos">
                <ol className="space-y-1.5">
                  {analysis.nextSteps.map((step, i) => (
                    <li key={i} className="text-sm text-secondary-foreground leading-relaxed flex gap-2">
                      <span className="text-primary font-semibold shrink-0">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </Section>
            ) : null}
            {analysis.bestTimeToPost && (
              <Section label="Melhor Horário">
                <p className="text-sm text-foreground font-medium">{analysis.bestTimeToPost}</p>
              </Section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
