import { useCallback, useEffect, useRef, useState } from "react";

const GAME_MS = 8000;
const GLYPHS = ["👻", "💀", "🦇", "🕷️", "🎃", "🧟"];

interface Target {
  key: number;
  x: number;
  y: number;
  glyph: string;
}

// "Quebra a Maldição" — mini-jogo de reflexos. Aparecem alvos durante 8s;
// toca no maior número possível. Reutilizável para qualquer moeda/tema.
export function MiniGame({
  theme,
  onDone,
}: {
  theme: string;
  onDone: (score: number) => void;
}) {
  const [phase, setPhase] = useState<"ready" | "playing" | "done">("ready");
  const [targets, setTargets] = useState<Target[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_MS);
  const keyRef = useRef(0);

  const start = useCallback(() => {
    setScore(0);
    setTimeLeft(GAME_MS);
    setPhase("playing");
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    const spawn = setInterval(() => {
      const key = keyRef.current++;
      const t: Target = {
        key,
        x: 8 + Math.random() * 76,
        y: 14 + Math.random() * 64,
        glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
      };
      setTargets((ts) => [...ts, t]);
      setTimeout(
        () => setTargets((ts) => ts.filter((x) => x.key !== key)),
        1100
      );
    }, 560);

    const tick = setInterval(() => setTimeLeft((t) => Math.max(0, t - 100)), 100);
    const end = setTimeout(() => {
      setPhase("done");
    }, GAME_MS);

    return () => {
      clearInterval(spawn);
      clearInterval(tick);
      clearTimeout(end);
    };
  }, [phase]);

  useEffect(() => {
    if (phase === "done") setTargets([]);
  }, [phase]);

  const hit = (key: number) => {
    setTargets((ts) => ts.filter((x) => x.key !== key));
    setScore((s) => s + 1);
  };

  if (phase === "ready") {
    return (
      <div className="minigame ready">
        <span className="mini-kicker">Mini-jogo · {theme}</span>
        <h3>Quebra a Maldição</h3>
        <p>
          Toca em todos os espíritos que aparecerem antes que desapareçam. Tens
          8 segundos para enfraquecer a maldição da moeda.
        </p>
        <button className="btn-primary" onClick={start}>
          Começar
        </button>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="minigame done pop-in">
        <span className="mini-kicker">Maldição quebrada!</span>
        <div className="mini-score">{score}</div>
        <p>espíritos derrotados</p>
        <button className="btn-primary" onClick={() => onDone(score)}>
          Reclamar a moeda →
        </button>
      </div>
    );
  }

  return (
    <div className="minigame playing">
      <div className="mini-hud">
        <span>👻 {score}</span>
        <span className="mini-timebar">
          <span style={{ width: `${(timeLeft / GAME_MS) * 100}%` }} />
        </span>
      </div>
      <div className="mini-board">
        {targets.map((t) => (
          <button
            key={t.key}
            className="mini-target"
            style={{ left: `${t.x}%`, top: `${t.y}%` }}
            onClick={() => hit(t.key)}
          >
            {t.glyph}
          </button>
        ))}
      </div>
    </div>
  );
}
