import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HoraDoHorrorCorrelationPanel from "@/components/HoraDoHorrorCorrelationPanel";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/trpc", () => ({
  trpc: {
    horaDoHorror: {
      correlation: { useQuery: (...args: unknown[]) => queryMock(...args) },
    },
  },
}));

const correlationData = {
  methodology: "A correlação de Pearson compara a receita bruta de fechamento diário com o indicador social mais próximo de intenção por plataforma. Ela não prova causalidade.",
  latestClosing: { date: "2026-08-29", localHour: 11, grossRevenueCents: 18_664_988 },
  officialCampaigns: [],
  correlations: [
    { platform: "Facebook", socialMetric: "Cliques no link", status: "insufficient_sample" as const, observedDays: 2, minimumDays: 7, coefficient: null, direction: null, latestSocialDate: "2026-08-28" },
    { platform: "Instagram", socialMetric: "Cliques no link", status: "insufficient_sample" as const, observedDays: 2, minimumDays: 7, coefficient: null, direction: null, latestSocialDate: "2026-08-28" },
    { platform: "TikTok", socialMetric: "Visitas ao perfil", status: "insufficient_sample" as const, observedDays: 1, minimumDays: 7, coefficient: null, direction: null, latestSocialDate: "2026-08-27" },
  ],
  strategy: [
    { title: "Instrumentar cada peça da Hora do Horror", detail: "Use UTM, plataforma, formato, pilar criativo e código de campanha." },
    { title: "Comparar períodos equivalentes", detail: "Marque dias de campanha e compare janelas equivalentes de operação." },
    { title: "Priorizar sinais de intenção", detail: "Acompanhe cliques no link e visitas ao perfil junto à receita diária." },
    { title: "Publicar com hipótese mensurável", detail: "Registre público, mensagem, CTA e janela de postagem." },
  ],
};

describe("HoraDoHorrorCorrelationPanel", () => {
  afterEach(() => vi.clearAllMocks());

  it("shows the evidence gap explicitly instead of attributing daily variation to the campaign", () => {
    queryMock.mockReturnValue({ isLoading: false, error: null, data: correlationData });

    render(<HoraDoHorrorCorrelationPanel />);

    expect(screen.getByText("Hora do Horror · correlação e estratégia social")).toBeInTheDocument();
    expect(screen.getByText(/Correlação ainda não calculável/)).toBeInTheDocument();
    expect(screen.getAllByText("Cobertura insuficiente")).toHaveLength(3);
    expect(screen.getAllByText(/2\/7 dias/).length).toBe(2);
    expect(screen.getByText("Instrumentar cada peça da Hora do Horror")).toBeInTheDocument();
  });

  it("renders a loading placeholder while the protected query is pending", () => {
    queryMock.mockReturnValue({ isLoading: true, error: null, data: undefined });

    render(<HoraDoHorrorCorrelationPanel />);

    expect(document.querySelectorAll(".animate-pulse")).toHaveLength(3);
  });

  it("renders a safe error state when protected correlation data cannot load", () => {
    queryMock.mockReturnValue({ isLoading: false, error: new Error("unauthorized"), data: undefined });

    render(<HoraDoHorrorCorrelationPanel />);

    expect(screen.getByText("Não foi possível carregar a correlação protegida da Hora do Horror.")).toBeInTheDocument();
  });
});
