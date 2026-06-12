import { useState } from "react";
import { ATTRACTIONS, RARITY_META, type Attraction } from "../data";
import { useGame } from "../state";
import { AttractionCard } from "../components/AttractionCard";
import { CardArt } from "../components/CardArt";
import { RewardModal } from "../components/RewardModal";
import { GiftIcon, LockIcon, StarIcon } from "../components/Icons";

export function Album() {
  const game = useGame();
  const [viewing, setViewing] = useState<Attraction | null>(null);
  const [showReward, setShowReward] = useState(false);

  const count = game.unlocked.length;
  const pct = Math.round((count / ATTRACTIONS.length) * 100);

  return (
    <div className="screen album">
      <header className="screen-header">
        <span className="screen-kicker">Cartas Colecionáveis</span>
        <h1>O teu álbum</h1>
        <div className="album-progress">
          <div className="progress-bar slim">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span>
            {count}/{ATTRACTIONS.length} · {pct}%
          </span>
        </div>
      </header>

      {game.albumComplete && !game.albumRewardClaimed && (
        <button className="album-reward-banner" onClick={() => setShowReward(true)}>
          <GiftIcon size={20} color="#1B1B47" />
          <span>
            <strong>Álbum 100% completo!</strong>
            <small>Toca para resgatar a tua recompensa</small>
          </span>
        </button>
      )}
      {game.albumRewardClaimed && (
        <div className="album-reward-banner claimed">
          <StarIcon size={18} color="#FFC72C" />
          <span>
            <strong>Colecionador Hópi</strong>
            <small>Fast Pass + 20% no merchandising resgatados</small>
          </span>
        </div>
      )}

      <div className="album-grid">
        {ATTRACTIONS.map((a) => {
          const isUnlocked = game.unlocked.includes(a.id);
          const rarity = RARITY_META[a.rarity];
          return isUnlocked ? (
            <button key={a.id} className="album-slot" onClick={() => setViewing(a)}>
              <span className="mini-banner" style={{ background: rarity.gradient }}>
                {a.rarity}
              </span>
              <CardArt attraction={a} className="card-art mini" />
              <span className="mini-meta">
                <strong>{a.name}</strong>
                <small>+{a.points} pts</small>
              </span>
            </button>
          ) : (
            <div key={a.id} className="album-slot locked">
              <LockIcon size={22} color="rgba(255,255,255,0.4)" />
              <span className="locked-name">???</span>
              <small>Encontra o totem {a.name}</small>
            </div>
          );
        })}
      </div>

      {viewing && (
        <div className="overlay reveal-overlay" onClick={() => setViewing(null)}>
          <div className="album-card-view pop-in" onClick={(e) => e.stopPropagation()}>
            <AttractionCard attraction={viewing} />
            <button className="btn-ghost" onClick={() => setViewing(null)}>
              Fechar
            </button>
          </div>
        </div>
      )}

      {showReward && (
        <RewardModal
          kicker="Álbum completo — 6 de 6 cartas"
          title="Fast Pass Hópi + 20% no merch"
          lines={[
            "Fast Pass para uma atração à escolha",
            "20% de desconto na loja Hopi Hari",
            "Entras no ranking dos Colecionadores do dia",
          ]}
          code="ALBUM-HOPI-100"
          onClose={() => {
            game.claimAlbumReward();
            setShowReward(false);
          }}
        />
      )}
    </div>
  );
}
