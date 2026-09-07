import { useMemo, useRef, useState } from "react";
import { Brain, CalendarRange, MessageSquare, Sparkles } from "lucide-react";
import AIMarkdown from "@/components/AIMarkdown";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Mode = "daily" | "weekly" | "channel-deepdive";
type Platform = "instagram" | "tiktok" | "facebook" | "youtube" | "linkedin";
type ChatMsg = { role: "user" | "assistant"; content: string };

interface Props {
  /** When omitted, panel offers daily + weekly. When provided, also offers a deep-dive for that channel. */
  platform?: Platform;
  /** Title override */
  title?: string;
}

const MODE_LABEL: Record<Mode, string> = {
  daily: "Diário",
  weekly: "Semanal",
  "channel-deepdive": "Deep-dive",
};

const SUGGESTIONS = [
  "Qual post teve melhor desempenho e por quê?",
  "O engajamento caiu esta semana?",
  "Que formato de conteúdo está performando melhor?",
  "O que devo postar amanhã?",
];

/** Últimos 12 meses + "últimos 14 dias" para o filtro do chat. */
function monthOptions() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const value = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" });
    return { value, label: label.replace(".", "") };
  });
}

export default function AIAnalysisPanel({ platform, title = "Análise IA — Hopi Hari" }: Props) {
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>(platform ? "channel-deepdive" : "daily");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string>("");

  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [month, setMonth] = useState<string>("");
  const months = useMemo(monthOptions, []);
  const monthLabel = months.find((m) => m.value === month)?.label;
  const chatEndRef = useRef<HTMLDivElement>(null);

  const run = async () => {
    setLoading(true);
    setAnalysis("");
    try {
      const { data, error } = await supabase.functions.invoke("social-analyze", {
        // When the panel is scoped to a single platform (ex: IG page), always pass it
        // so daily/weekly/deep-dive stay focused on that channel and its competitors.
        body: { mode, platform: platform ?? undefined },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? "Falha na análise");
      setAnalysis(data.analysis ?? "");
    } catch (e) {
      toast({
        title: "Erro na análise",
        description: e instanceof Error ? e.message : "Falha desconhecida",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const ask = async (raw?: string) => {
    const q = (raw ?? question).trim();
    if (!q || asking) return;
    setQuestion("");
    const history = chat.slice(-8);
    setChat((c) => [...c, { role: "user", content: q }]);
    setAsking(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-analyze", {
        body: {
          mode: "ask",
          platform: platform ?? undefined,
          question: q,
          month: month || undefined,
          history,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? "Falha ao responder");
      setChat((c) => [...c, { role: "assistant", content: data.analysis ?? "" }]);
      requestAnimationFrame(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }));
    } catch (e) {
      toast({
        title: "Erro na pergunta",
        description: e instanceof Error ? e.message : "Falha desconhecida",
        variant: "destructive",
      });
      setChat((c) => c.slice(0, -1));
      setQuestion(q);
    }
    setAsking(false);
  };

  const modes: Mode[] = platform ? ["channel-deepdive", "weekly", "daily"] : ["daily", "weekly"];

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Brain className="size-4 text-primary" />{title}</h2>
          <p className="text-[11px] text-muted-foreground">Powered by Lovable AI · usa dados reais do banco</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {modes.map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 text-xs rounded-md transition-all ${
                  mode === m ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>
          <button
            onClick={run}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold gradient-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Analisando...
              </>
            ) : (
              <><Sparkles className="size-3.5" />Gerar análise</>
            )}
          </button>
        </div>
      </div>

      {analysis ? (
        <div className="rounded-xl border border-border bg-background/40 p-5">
          <AIMarkdown>{analysis}</AIMarkdown>
        </div>
      ) : (
        <div className="text-center py-10 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
          Selecione o tipo de análise e clique em <strong className="text-foreground">Gerar análise</strong>.
          <br />
          <span className="text-[11px]">A IA vai consolidar os dados das últimas 2 semanas e gerar insights acionáveis.</span>
        </div>
      )}

      {/* Perguntas sobre os dados e posts */}
      <div className="mt-6 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="flex items-center gap-2 text-xs font-semibold text-foreground"><MessageSquare className="size-3.5 text-primary" />Pergunte sobre os dados e os posts</h3>
            <p className="text-[11px] text-muted-foreground">
              A IA responde usando os posts e métricas reais {month ? `de ${monthLabel}` : "dos últimos 14 dias"}
              {platform ? ` do ${platform}` : ""}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1.5 text-[11px] text-muted-foreground focus-within:ring-2 focus-within:ring-primary/40">
              <CalendarRange className="size-3.5 text-primary" />
              <span className="sr-only">Filtrar período do chat</span>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="bg-transparent text-[11px] text-foreground focus:outline-none"
              >
                <option value="">Últimos 14 dias</option>
                {months.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </label>
            {chat.length > 0 && (
            <button
              onClick={() => setChat([])}
              className="text-[11px] text-muted-foreground hover:text-foreground underline"
            >
              Limpar
            </button>
            )}
          </div>
        </div>

        {chat.length === 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                disabled={asking}
                className="px-3 py-1.5 rounded-full border border-border text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {chat.length > 0 && (
          <div className="space-y-3 mb-3 max-h-[420px] overflow-y-auto pr-1">
            {chat.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] rounded-xl bg-primary/10 border border-primary/20 px-3 py-2 text-xs text-foreground"
                    : "max-w-[95%] rounded-xl bg-muted/50 border border-border px-3 py-2"
                }
              >
                {m.role === "user" ? (
                  m.content
                ) : (
                  <AIMarkdown compact>{m.content}</AIMarkdown>

                )}
              </div>
            ))}
            {asking && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                Consultando os dados...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ask();
          }}
          className="flex gap-2"
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ex: qual post gerou mais compartilhamentos esta semana?"
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="submit"
            disabled={asking || !question.trim()}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50"
          >
            Perguntar
          </button>
        </form>
      </div>
    </div>
  );
}
