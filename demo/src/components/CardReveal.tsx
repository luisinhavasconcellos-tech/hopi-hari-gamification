import { useEffect, useState } from "react";
import type { Attraction } from "../data";
import { AttractionCard, CardBack } from "./AttractionCard";
import { Confetti } from "./Confetti";
import { SparkIcon } from "./Icons";

// "Carta desbloqueada!" moment: story panel → card flip → CTA.
export function CardReveal({
  attraction,
  onClose,
  onGoToAlbum,
}: {
  attraction: Attraction;
  onClose: () => void;
  onGoToAlbum: () => void;
}) {
  const [stage, setStage] = useState<"story" | "card">("story");
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (stage === "card") {
      const t = setTimeout(() => setFlipped(true), 350);
      return () => clearTimeout(t);
    }
  }, [stage]);

  return (
    <div className="overlay reveal-overlay">
      {stage === "story" ? (
        <div className="story-panel pop-in">
          <span className="story-kicker">
            <SparkIcon size={16} color="#62BB46" /> Pista desbloqueada
          </span>
          <h2>{attraction.name}</h2>
          <p className="story-text">“{attraction.story}”</p>
          <button className="btn-primary" onClick={() => setStage("card")}>
            Revelar a carta
          </button>
        </div>
      ) : (
        <div className="reveal-stage">
          {flipped && <Confetti count={attraction.rarity === "LENDÁRIA" ? 90 : 50} />}
          <div className={`flip-scene ${flipped ? "flipped" : ""}`}>
            <div className="flip-inner">
              <div className="flip-face flip-back">
                <CardBack />
              </div>
              <div className="flip-face flip-front">
                <AttractionCard attraction={attraction} />
              </div>
            </div>
          </div>
          <div className={`reveal-footer ${flipped ? "show" : ""}`}>
            <p className="reveal-unlocked">Carta desbloqueada!</p>
            <p className="reveal-points">+{attraction.points} pontos</p>
            <div className="reveal-actions">
              <button className="btn-ghost" onClick={onClose}>
                Continuar a caça
              </button>
              <button className="btn-primary" onClick={onGoToAlbum}>
                Ver no álbum
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
