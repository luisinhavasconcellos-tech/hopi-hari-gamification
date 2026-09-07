import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Database,
  Loader2,
  Mic2,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  Square,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

type BriefingSection = {
  key: "sales" | "attendance" | "audience" | "social" | "crm" | "reputation" | "campaigns";
  title: string;
  status: "positive" | "attention" | "neutral" | "unavailable";
  narrative: string;
};

type BriefingPriority = {
  title: string;
  reason: string;
  ownerArea: string;
  urgency: "today" | "this_week" | "monitor";
};

type BriefingSnapshot = {
  sales?: { revenue?: number; quantity?: number; period?: string | null };
  attendance?: { visitors?: number; openDays?: number; period?: string | null };
  audience?: { totalFollowers?: number; followerChange?: number; date?: string | null };
  social?: {
    instagramViews?: number;
    instagramSampleSize?: number;
    x?: { available?: boolean; configured?: boolean; resultCount?: number; reason?: string };
  };
  crm?: { totalLeads?: number };
  reputation?: { averageRating?: number | null; sampleSize?: number };
  campaigns?: { activeCount?: number };
};

type Briefing = {
  id: number;
  reportDate: string;
  title: string;
  executiveSummary: string;
  narration: string;
  sections: BriefingSection[];
  priorities: BriefingPriority[];
  model: string;
  xStatus: string;
  generatedAt: string;
  audioUrl?: string | null;
  audioDurationSeconds?: number | null;
  audioGeneratedAt?: string | null;
  coverage?: { readySources?: number; totalSources?: number; warnings?: string[] };
  snapshot: BriefingSnapshot;
};

const formatNumber = (value: number | null | undefined) =>
  typeof value === "number" ? new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value) : "—";

const formatCurrency = (value: number | null | undefined) =>
  typeof value === "number"
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value)
    : "—";

const statusLabel: Record<BriefingSection["status"], string> = {
  positive: "Bom sinal",
  attention: "Atenção",
  neutral: "Monitorar",
  unavailable: "Fonte indisponível",
};

export default function DailyBriefingPage() {
  const { session, isAdmin } = useAuth();
  const { toast } = useToast();
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioObjectUrlRef = useRef<string | null>(null);

  const request = useCallback(
    async (path: string, init?: RequestInit) => {
      if (!session?.access_token) throw new Error("Sessão indisponível");
      const response = await fetch(path, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          ...(init?.headers ?? {}),
        },
      });
      const payload = (await response.json()) as { error?: string; briefings?: Briefing[]; briefing?: Briefing };
      if (!response.ok) throw new Error(payload.error || "Não foi possível carregar o briefing");
      return payload;
    },
    [session?.access_token],
  );

  const loadBriefings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await request("/api/briefings");
      const rows = payload.briefings ?? [];
      setBriefings(rows);
      setSelectedId(current => current ?? rows[0]?.id ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Falha ao carregar o briefing");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    if (session?.access_token) void loadBriefings();
  }, [loadBriefings, session?.access_token]);

  useEffect(() => () => {
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();
    if (audioObjectUrlRef.current) URL.revokeObjectURL(audioObjectUrlRef.current);
  }, []);

  const selected = useMemo(
    () => briefings.find(briefing => briefing.id === selectedId) ?? briefings[0] ?? null,
    [briefings, selectedId],
  );

  const indicators = selected
    ? [
        { label: "Receita do período", value: formatCurrency(selected.snapshot.sales?.revenue) },
        { label: "Público", value: formatNumber(selected.snapshot.attendance?.visitors) },
        { label: "Audiência", value: formatNumber(selected.snapshot.audience?.totalFollowers) },
        { label: "Leads CRM", value: formatNumber(selected.snapshot.crm?.totalLeads) },
        { label: "Campanhas ativas", value: formatNumber(selected.snapshot.campaigns?.activeCount) },
      ]
    : [];

  const stopVoice = () => {
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();
    audioRef.current = null;
    if (audioObjectUrlRef.current) URL.revokeObjectURL(audioObjectUrlRef.current);
    audioObjectUrlRef.current = null;
    utteranceRef.current = null;
    setSpeaking(false);
    setPaused(false);
  };

  const playBrowserVoice = (narration: string) => {
    if (!("speechSynthesis" in window)) throw new Error("Este navegador não oferece síntese de voz.");
    stopVoice();
    const utterance = new SpeechSynthesisUtterance(narration);
    utterance.lang = "pt-BR";
    utterance.rate = 0.94;
    utterance.pitch = 1.03;
    const voices = window.speechSynthesis.getVoices();
    const brazilianVoices = voices.filter(voice => voice.lang.toLowerCase() === "pt-br");
    const feminineVoice = brazilianVoices.find(voice =>
      /female|feminina|woman|mulher|luciana|fernanda|francisca|maria|vitoria|vitória/i.test(voice.name),
    );
    utterance.voice = feminineVoice ?? brazilianVoices[0] ?? null;
    utterance.onend = stopVoice;
    utterance.onerror = stopVoice;
    utteranceRef.current = utterance;
    setSpeaking(true);
    setPaused(false);
    window.speechSynthesis.speak(utterance);
  };

  const playVoice = async () => {
    if (!selected) return;
    if (speaking && paused) {
      if (audioRef.current) await audioRef.current.play();
      else window.speechSynthesis.resume();
      setPaused(false);
      return;
    }

    setVoiceLoading(true);
    try {
      if (selected.audioUrl && session?.access_token) {
        stopVoice();
        const response = await fetch(selected.audioUrl, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!response.ok) throw new Error("O áudio diário não pôde ser carregado.");
        const objectUrl = URL.createObjectURL(await response.blob());
        const audio = new Audio(objectUrl);
        audioObjectUrlRef.current = objectUrl;
        audioRef.current = audio;
        audio.onended = stopVoice;
        audio.onerror = stopVoice;
        setSpeaking(true);
        setPaused(false);
        await audio.play();
      } else {
        playBrowserVoice(selected.narration);
      }
    } catch (voiceError) {
      try {
        playBrowserVoice(selected.narration);
        toast({
          title: "Usando voz do navegador",
          description: voiceError instanceof Error ? voiceError.message : "O áudio diário está indisponível.",
        });
      } catch (fallbackError) {
        toast({
          title: "Voz não disponível",
          description: fallbackError instanceof Error ? fallbackError.message : "Não foi possível reproduzir a narração.",
          variant: "destructive",
        });
      }
    } finally {
      setVoiceLoading(false);
    }
  };

  const pauseVoice = () => {
    if (audioRef.current) audioRef.current.pause();
    else window.speechSynthesis.pause();
    setPaused(true);
  };

  const generateNow = async () => {
    setGenerating(true);
    try {
      const payload = await request("/api/briefings/generate", { method: "POST" });
      if (payload.briefing) {
        await loadBriefings();
        setSelectedId(payload.briefing.id);
      }
      toast({ title: "Briefing atualizado", description: "A leitura consolidada foi regenerada com os dados atuais." });
    } catch (generateError) {
      toast({
        title: "Não foi possível atualizar",
        description: generateError instanceof Error ? generateError.message : "Erro inesperado",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <Loader2 className="size-8 animate-spin text-primary" aria-label="Carregando briefing" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="relative overflow-hidden rounded-[1.75rem] bg-primary px-6 py-7 text-primary-foreground shadow-xl sm:px-8">
          <div className="absolute -right-14 -top-24 size-72 rounded-full bg-accent/25 blur-3xl" aria-hidden />
          <div className="absolute -bottom-32 left-1/3 size-72 rounded-full bg-success/20 blur-3xl" aria-hidden />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
                <Mic2 className="size-3.5" /> Agente IA · diário às 07:00
              </div>
              <h1 className="font-display text-3xl font-black tracking-tight sm:text-5xl">Briefing do Parque</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-primary-foreground/80 sm:text-base">
                Uma leitura executiva de vendas, público, audiência, social, CRM, reputação e campanhas — narrada para começar o dia com contexto.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                onClick={() => void playVoice()}
                disabled={!selected || voiceLoading}
              >
                {voiceLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Play className="mr-2 size-4" />}
                {voiceLoading ? "Preparando áudio" : "Ouvir briefing"}
              </Button>
              {isAdmin && (
                <Button
                  variant="outline"
                  className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  onClick={generateNow}
                  disabled={generating}
                >
                  {generating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
                  Atualizar agora
                </Button>
              )}
            </div>
          </div>
        </header>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex items-center gap-3 p-5 text-sm text-destructive">
              <AlertCircle className="size-5 shrink-0" />
              <span>{error}</span>
              <Button variant="outline" size="sm" className="ml-auto" onClick={loadBriefings}>Tentar novamente</Button>
            </CardContent>
          </Card>
        ) : !selected ? (
          <Card className="border-dashed">
            <CardContent className="grid min-h-64 place-items-center p-8 text-center">
              <div>
                <Sparkles className="mx-auto mb-3 size-9 text-primary" />
                <h2 className="font-display text-xl font-bold">O primeiro briefing será preparado às 07:00</h2>
                <p className="mt-2 text-sm text-muted-foreground">Administradores também podem gerar uma leitura agora.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {indicators.map(indicator => (
                <Card key={indicator.label} className="overflow-hidden border-border/70">
                  <div className="h-1 bg-primary" />
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{indicator.label}</p>
                    <p className="mt-2 font-display text-2xl font-bold text-foreground">{indicator.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="space-y-6">
                <Card className="overflow-hidden border-primary/20 shadow-lg">
                  <CardHeader className="border-b border-border/70 bg-card">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" /> {new Date(`${selected.reportDate}T12:00:00`).toLocaleDateString("pt-BR", { dateStyle: "long" })}</span>
                          <span>·</span>
                          <span>{selected.model}</span>
                        </div>
                        <CardTitle className="font-display text-2xl sm:text-3xl">{selected.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                        <Database className="size-3.5" /> {selected.coverage?.readySources ?? 0}/{selected.coverage?.totalSources ?? 0} fontes
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 p-6">
                    <p className="text-base leading-relaxed text-foreground sm:text-lg">{selected.executiveSummary}</p>
                    <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-foreground/12">
                          <Volume2 className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground/65">
                            Narração executiva · {selected.audioUrl ? "áudio IA diário" : "voz do navegador"}
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-primary-foreground/90">{selected.narration}</p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button size="icon" variant="secondary" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90" onClick={() => void playVoice()} aria-label={paused ? "Retomar narração" : "Reproduzir narração"}>
                            <Play className="size-4" />
                          </Button>
                          <Button size="icon" variant="outline" className="border-primary-foreground/25 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={pauseVoice} disabled={!speaking || paused} aria-label="Pausar narração">
                            <Pause className="size-4" />
                          </Button>
                          <Button size="icon" variant="outline" className="border-primary-foreground/25 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={stopVoice} disabled={!speaking} aria-label="Parar narração">
                            <Square className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2">
                  {selected.sections.map(section => (
                    <Card key={section.key} className="border-border/70">
                      <CardContent className="p-5">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h3 className="font-display text-lg font-bold">{section.title}</h3>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${section.status === "attention" || section.status === "unavailable" ? "bg-destructive/10 text-destructive" : section.status === "positive" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                            {statusLabel[section.status]}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground">{section.narrative}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {selected.priorities.length > 0 && (
                  <Card className="border-accent/40 bg-accent/5">
                    <CardHeader><CardTitle className="font-display text-xl">Prioridade sugerida</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {selected.priorities.map(priority => (
                        <div key={`${priority.title}-${priority.ownerArea}`} className="flex gap-3 rounded-xl border border-accent/25 bg-card p-4">
                          <Sparkles className="mt-0.5 size-5 shrink-0 text-accent" />
                          <div>
                            <p className="font-semibold text-foreground">{priority.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{priority.reason}</p>
                            <p className="mt-2 text-xs font-medium uppercase tracking-[0.1em] text-primary">{priority.ownerArea}</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              <aside className="space-y-4">
                <Card className="border-border/70">
                  <CardHeader><CardTitle className="font-display text-lg">Histórico diário</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {briefings.map(briefing => (
                      <button
                        key={briefing.id}
                        type="button"
                        onClick={() => { stopVoice(); setSelectedId(briefing.id); }}
                        className={`w-full rounded-xl border p-3 text-left transition-colors ${briefing.id === selected.id ? "border-primary/40 bg-primary/5" : "border-border bg-card hover:bg-muted/50"}`}
                      >
                        <span className="block text-sm font-semibold text-foreground">{new Date(`${briefing.reportDate}T12:00:00`).toLocaleDateString("pt-BR")}</span>
                        <span className="mt-1 block truncate text-xs text-muted-foreground">{briefing.title}</span>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-border/70">
                  <CardContent className="space-y-3 p-4 text-sm">
                    <div className="flex items-center gap-2 text-foreground">
                      {selected.xStatus === "ready" ? <CheckCircle2 className="size-4 text-success" /> : <AlertCircle className="size-4 text-accent" />}
                      <span className="font-medium">Integração X</span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {selected.xStatus === "ready" ? "Dados recentes do X incluídos neste briefing." : "Aguardando uma credencial X rotacionada para ativar a escuta ao vivo."}
                    </p>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
