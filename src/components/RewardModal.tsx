import { Confetti } from "./Confetti";
import { GiftIcon } from "./Icons";

export function RewardModal({
  kicker,
  title,
  lines,
  code,
  onClose,
}: {
  kicker: string;
  title: string;
  lines: string[];
  code: string;
  onClose: () => void;
}) {
  return (
    <div className="overlay reveal-overlay">
      <Confetti count={90} />
      <div className="reward-panel pop-in">
        <div className="reward-icon">
          <GiftIcon size={34} color="#1B1B47" />
        </div>
        <span className="story-kicker">{kicker}</span>
        <h2>{title}</h2>
        <ul className="reward-lines">
          {lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <div className="reward-code">
          <span>Apresenta este código</span>
          <strong>{code}</strong>
        </div>
        <button className="btn-primary" onClick={onClose}>
          Hóóóóópi! Continuar
        </button>
      </div>
    </div>
  );
}
