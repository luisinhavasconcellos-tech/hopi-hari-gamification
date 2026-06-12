import { ATTRACTIONS, ZONES } from "../data";
import { useGame } from "../state";
import { CheckIcon, QrIcon } from "../components/Icons";

// Checkpoint list: tapping a totem fakes the QR scan (overlay rendered
// at app level), then reveals the lenda + collectible card.
export function TreasureHunt() {
  const game = useGame();
  const found = game.unlocked.length;

  return (
    <div className="screen hunt">
      <header className="screen-header">
        <span className="screen-kicker">Caça ao Tesouro</span>
        <h1>Encontre os tesouros escondidos</h1>
        <p className="screen-sub">
          Há um totem com QR code junto a cada atração. Encontra-o, faz scan e
          desbloqueia a lenda Hari — e a carta colecionável.
        </p>
        <div className="hunt-counter">
          <strong>{found}</strong> / {ATTRACTIONS.length} totens encontrados
        </div>
      </header>

      <ul className="checkpoint-list">
        {ATTRACTIONS.map((a) => {
          const isFound = game.unlocked.includes(a.id);
          const zone = ZONES[a.zone];
          return (
            <li key={a.id}>
              <button
                className={`checkpoint ${isFound ? "found" : ""}`}
                onClick={() => !isFound && game.beginScan(a.id)}
                disabled={isFound}
              >
                <span className="zone-dot" style={{ background: zone.color }} />
                <span className="checkpoint-text">
                  <strong>{a.name}</strong>
                  <small>{isFound ? `“${a.story}”` : a.clue}</small>
                </span>
                <span className={`checkpoint-state ${isFound ? "ok" : ""}`}>
                  {isFound ? (
                    <CheckIcon size={15} color="#1B1B47" />
                  ) : (
                    <QrIcon size={17} color="#FFC72C" />
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
