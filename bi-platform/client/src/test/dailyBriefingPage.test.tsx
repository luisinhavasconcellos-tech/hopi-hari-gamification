import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DailyBriefingPage from "@/pages/DailyBriefingPage";

const speak = vi.fn();
const cancel = vi.fn();
const audioPlay = vi.fn().mockResolvedValue(undefined);
const audioPause = vi.fn();

class MockUtterance {
  lang = "";
  rate = 1;
  pitch = 1;
  voice: SpeechSynthesisVoice | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public text: string) {}
}

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    session: { access_token: "approved-session" },
    isAdmin: false,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const briefing = {
  id: 1,
  reportDate: "2026-08-27",
  title: "Briefing diário",
  executiveSummary: "Resumo executivo validado.",
  narration: "Bom dia. Este é o briefing do parque.",
  sections: [
    { key: "sales", title: "Vendas", status: "neutral", narrative: "Leitura de vendas." },
    { key: "attendance", title: "Público", status: "neutral", narrative: "Leitura de público." },
    { key: "audience", title: "Audiência", status: "neutral", narrative: "Leitura de audiência." },
    { key: "social", title: "Social", status: "attention", narrative: "Leitura social." },
    { key: "crm", title: "CRM", status: "neutral", narrative: "Leitura de CRM." },
    { key: "reputation", title: "Reputação", status: "neutral", narrative: "Leitura de reputação." },
    { key: "campaigns", title: "Campanhas", status: "positive", narrative: "Leitura de campanhas." },
  ],
  priorities: [],
  model: "gpt-5-mini",
  xStatus: "credential_missing",
  generatedAt: "2026-08-27T10:00:00.000Z",
  coverage: { readySources: 8, totalSources: 9, warnings: ["x: credential_missing"] },
  snapshot: {
    sales: { revenue: 1200 },
    attendance: { visitors: 5000 },
    audience: { totalFollowers: 100000 },
    crm: { totalLeads: 45 },
    campaigns: { activeCount: 2 },
  },
};

describe("daily AI voice briefing", () => {
  beforeEach(() => {
    speak.mockReset();
    cancel.mockReset();
    vi.stubGlobal("SpeechSynthesisUtterance", MockUtterance);
    vi.stubGlobal(
      "Audio",
      class {
        onended: (() => void) | null = null;
        onerror: (() => void) | null = null;
        play = audioPlay;
        pause = audioPause;
        constructor(public src: string) {}
      },
    );
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:narration") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    vi.stubGlobal("speechSynthesis", {
      speak,
      cancel,
      pause: vi.fn(),
      resume: vi.fn(),
      getVoices: () => [
        { lang: "pt-BR", name: "Microsoft Daniel Online (Natural) - Portuguese (Brazil)" },
        { lang: "pt-BR", name: "Microsoft Francisca Online (Natural) - Portuguese (Brazil)" },
      ],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ briefings: [briefing] }),
      }),
    );
  });

  it("loads the report and speaks the narration in Brazilian Portuguese", async () => {
    render(<DailyBriefingPage />);
    expect(await screen.findByText("Resumo executivo validado.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ouvir briefing" }));
    await waitFor(() => expect(speak).toHaveBeenCalledTimes(1));
    const utterance = speak.mock.calls[0][0] as MockUtterance;
    expect(utterance.text).toBe(briefing.narration);
    expect(utterance.lang).toBe("pt-BR");
    expect(utterance.rate).toBe(0.94);
    expect(utterance.pitch).toBe(1.03);
    expect(utterance.voice?.name).toContain("Francisca");
  });

  it("retrieves persisted narration through the authenticated endpoint before playback", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ briefings: [{ ...briefing, audioUrl: "/api/briefings/1/audio" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(["audio"], { type: "audio/mpeg" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<DailyBriefingPage />);
    expect(await screen.findByText("áudio IA diário", { exact: false })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ouvir briefing" }));

    await waitFor(() => expect(audioPlay).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/briefings/1/audio",
      expect.objectContaining({
        headers: { Authorization: "Bearer approved-session" },
      }),
    );
    expect(speak).not.toHaveBeenCalled();
  });
});
