import { useState } from "react";
import { useGame, type DemoPreset } from "../state";

interface TourStep {
  caption: string;
  run: (game: ReturnType<typeof useGame>) => void;
}

// Scripted click-through for the meeting: the presenter only taps
// "Próximo" (plus the two "magic" taps the captions point at).
const TOUR: TourStep[] = [
  {
    caption: "1 · Entrada — o visitante faz opt-in e escolhe o seu perfil de jogo.",
    run: (g) => g.reset(),
  },
  {
    caption: "2 · Perfil escolhido: Conquistador Radical. A Missão do Dia é atribuída.",
    run: (g) => {
      g.chooseTrack("conquistador");
      g.start();
      g.setTab("missao");
    },
  },
  {
    caption: "3 · Caça ao tesouro — 6 totens com QR codes espalhados pelas 5 zonas.",
    run: (g) => g.setTab("tesouro"),
  },
  {
    caption: "4 · O scan do QR desbloqueia a lenda… e a carta colecionável. (Katapul)",
    run: (g) => g.beginScan("katapul"),
  },
  {
    caption: "5 · Cada carta entra no álbum. Vamos saltar para o fim do dia…",
    run: (g) => {
      g.closeReveal();
      g.applyPreset("completo");
      g.setTab("album");
    },
  },
  {
    caption: "6 · Álbum 100% = recompensa real. Toca no banner dourado para resgatar.",
    run: (g) => g.setTab("album"),
  },
  {
    caption: "7 · Missão do Dia completa — 4/4 radicais. Foi assim que o dia rendeu.",
    run: (g) => g.setTab("missao"),
  },
  {
    caption: "8 · Desafio fotográfico — a foto roda nos ecrãs do parque. Fim da demo!",
    run: (g) => g.setTab("foto"),
  },
];

const PRESETS: { id: DemoPreset; label: string }[] = [
  { id: "inicio", label: "Início" },
  { id: "meio", label: "Meio (2/4)" },
  { id: "quase", label: "Quase (5/6)" },
  { id: "completo", label: "Completo" },
];

export function DemoControls() {
  const game = useGame();
  const [open, setOpen] = useState(false);
  const [tourStep, setTourStep] = useState<number | null>(null);

  const advanceTour = () => {
    const next = tourStep === null ? 0 : tourStep + 1;
    if (next >= TOUR.length) {
      setTourStep(null);
      return;
    }
    TOUR[next].run(game);
    setTourStep(next);
  };

  return (
    <div className="demo-controls">
      {tourStep !== null && (
        <div className="tour-caption">{TOUR[tourStep].caption}</div>
      )}
      <div className="demo-bar">
        <button className="demo-toggle" onClick={() => setOpen((o) => !o)}>
          {open ? "× Fechar" : "⚙ Demo"}
        </button>
        <button
          className="demo-tour-btn"
          onClick={advanceTour}
        >
          {tourStep === null
            ? "▶ Tour guiado"
            : tourStep + 1 >= TOUR.length
              ? "■ Terminar tour"
              : `▶ Próximo (${tourStep + 1}/${TOUR.length})`}
        </button>
        {open && (
          <div className="demo-presets">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setTourStep(null);
                  game.applyPreset(p.id);
                }}
              >
                {p.label}
              </button>
            ))}
            <button
              className="demo-reset"
              onClick={() => {
                setTourStep(null);
                game.reset();
              }}
            >
              ↺ Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
