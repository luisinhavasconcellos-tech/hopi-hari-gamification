import { useState } from "react";
import { TRACKS, type TrackId } from "../data";
import { useGame } from "../state";
import { BoltIcon, CompassIcon, HeartIcon, PadIcon } from "../components/Icons";

const TRACK_ICONS = {
  bolt: BoltIcon,
  compass: CompassIcon,
  heart: HeartIcon,
} as const;

export function Welcome() {
  const game = useGame();
  const [step, setStep] = useState<"intro" | "track">("intro");
  const [picked, setPicked] = useState<TrackId | null>(null);

  if (step === "intro") {
    return (
      <div className="screen welcome">
        <div className="welcome-deco a" />
        <div className="welcome-deco b" />
        <div className="welcome-body">
          <span className="welcome-kicker">Hopi Hari · Edição Especial</span>
          <h1 className="welcome-title">
            O parque
            <br />
            virou jogo.
          </h1>
          <p className="welcome-sub">
            Caça tesouros pelas 5 zonas, coleciona cartas das atrações e troca
            os teus pontos por recompensas reais. Hoje, tu és o protagonista.
          </p>
          <div className="welcome-bullets">
            <span>6 totens escondidos</span>
            <span>6 cartas colecionáveis</span>
            <span>Prémios reais</span>
          </div>
        </div>
        <div className="welcome-footer">
          <button className="btn-primary btn-block" onClick={() => setStep("track")}>
            Quero jogar
          </button>
          <p className="welcome-optout">Só vim pelas atrações? Sem problema — o jogo é opcional.</p>
          <div className="welcome-pad">
            <PadIcon size={26} color="rgba(255,255,255,0.4)" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen welcome">
      <div className="welcome-body tracks">
        <span className="welcome-kicker">Escolhe o teu perfil</span>
        <h2 className="track-title">Como queres jogar hoje?</h2>
        <div className="track-list">
          {TRACKS.map((t) => {
            const Icon = TRACK_ICONS[t.icon];
            const active = picked === t.id;
            return (
              <button
                key={t.id}
                className={`track-card ${active ? "active" : ""}`}
                onClick={() => setPicked(t.id)}
              >
                <span className="track-icon">
                  <Icon size={22} color={active ? "#1B1B47" : "#FFC72C"} />
                </span>
                <span className="track-text">
                  <strong>{t.name}</strong>
                  <small>{t.description}</small>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="welcome-footer">
        <button
          className="btn-primary btn-block"
          disabled={!picked}
          onClick={() => {
            if (!picked) return;
            game.chooseTrack(picked);
            game.start();
          }}
        >
          Começar a aventura
        </button>
      </div>
    </div>
  );
}
