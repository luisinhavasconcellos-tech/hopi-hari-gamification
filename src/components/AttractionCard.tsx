import { RARITY_META, type Attraction } from "../data";
import { CardArt } from "./CardArt";
import { StarIcon } from "./Icons";

// Full collectible card, matching the deck's anatomy:
// rarity banner → attraction art (name + zone) → stats row → challenge text.
export function AttractionCard({ attraction }: { attraction: Attraction }) {
  const rarity = RARITY_META[attraction.rarity];

  return (
    <div className="big-card" data-rarity={attraction.rarity}>
      <div className="big-card-banner" style={{ background: rarity.gradient }}>
        <span>{attraction.rarity}</span>
        <span className="big-card-stars">
          {Array.from({ length: 3 }).map((_, i) => (
            <StarIcon
              key={i}
              size={13}
              color={i < rarity.stars ? "#122A80" : "rgba(18,42,128,0.25)"}
            />
          ))}
        </span>
      </div>

      <CardArt attraction={attraction} withName />

      <div className="big-card-body">
        <div className="big-card-stats">
          <div className="stat">
            <span className="stat-label">Intensidade</span>
            <span className="stat-value">
              {attraction.intensity}
              <small>/10</small>
            </span>
            <span className="stat-bar">
              <span
                className="stat-bar-fill"
                style={{ width: `${attraction.intensity * 10}%` }}
              />
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Pontos</span>
            <span className="stat-value accent">+{attraction.points}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Raridade</span>
            <span className="stat-value" style={{ color: rarity.color }}>
              {rarity.label}
            </span>
          </div>
        </div>

        <div className="big-card-challenge">
          <span className="challenge-label">Desafio</span>
          <p>{attraction.challenge}</p>
        </div>
      </div>
    </div>
  );
}

// Navy card back with monogram, used in the flip reveal and locked slots.
export function CardBack() {
  return (
    <div className="card-back">
      <div className="card-back-ring">
        <span>HH</span>
      </div>
      <span className="card-back-text">HOPI HARI · COLECIONÁVEL</span>
    </div>
  );
}
