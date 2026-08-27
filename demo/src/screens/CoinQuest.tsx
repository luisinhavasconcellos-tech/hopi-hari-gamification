import { useEffect, useState } from "react";
import {
  COIN_RARITY_META,
  COIN_REWARDS,
  HORROR_COINS,
  coinValue,
  type HorrorCoin,
} from "../data";
import { useGame } from "../state";
import { MiniGame } from "../components/MiniGame";
import { Confetti } from "../components/Confetti";
import { CheckIcon } from "../components/Icons";
import { HorrorHeader } from "./MonsterHunt";

type Flow = "scan" | "minigame" | "story";

// As 25 Moedas — uma por cada ano da Hora do Horror. Escaneia uma moeda,
// joga o mini-jogo e desbloqueia a história do tema dessa edição.
export function CoinQuest({ onBack }: { onBack: () => void }) {
  const game = useGame();
  const [active, setActive] = useState<HorrorCoin | null>(null);
  const [flow, setFlow] = useState<Flow>("scan");
  const [reward, setReward] = useState(false);

  const collected = game.collectedCoins.length;
  const pct = Math.round((collected / HORROR_COINS.length) * 100);
  const complete = collected === HORROR_COINS.length;

  const open = (coin: HorrorCoin) => {
    setActive(coin);
    setFlow("scan");
  };

  return (
    <div className="horror-screen coin-quest">
      <HorrorHeader
        onBack={onBack}
        kicker="As 25 Moedas · 25 anos de medo"
        title="Caça às Moedas"
        coins={game.coins}
      />

      <p className="horror-sub">
        Uma moeda por cada ano da Hora do Horror, escondidas pelo parque. Cada
        uma traz o tema dessa edição. Escaneia, joga e desbloqueia a história.
      </p>

      <div className="coin-progress">
        <div className="progress-bar slim horror">
          <div className="progress-fill horror" style={{ width: `${pct}%` }} />
        </div>
        <span>
          {collected}/{HORROR_COINS.length} · {pct}%
        </span>
      </div>

      {complete ? (
        <div className="coin-reward-banner claimed">
          <span>🏆</span>
          <div>
            <strong>Mestre do Horror — 25/25</strong>
            <small>Recompensas VIP desbloqueadas</small>
          </div>
        </div>
      ) : (
        <button className="coin-reward-banner" onClick={() => setReward(true)}>
          <span>🎟️</span>
          <div>
            <strong>Recompensas VIP</strong>
            <small>Vê o que ganhas ao completar as 25 moedas</small>
          </div>
        </button>
      )}

      <div className="coin-grid">
        {HORROR_COINS.map((c) => {
          const isCollected = game.collectedCoins.includes(c.id);
          const meta = COIN_RARITY_META[c.rarity];
          return (
            <button
              key={c.id}
              className={`coin-slot ${isCollected ? "got" : ""}`}
              onClick={() => open(c)}
              style={{ ["--coin" as string]: meta.color }}
            >
              <span
                className="coin-disc"
                style={{ background: isCollected ? meta.gradient : undefined }}
              >
                {isCollected ? c.year % 100 : "?"}
              </span>
              <span className="coin-year">{isCollected ? c.theme : `Ano ${c.year}`}</span>
              {isCollected && (
                <span className="coin-check">
                  <CheckIcon size={10} color="#0F0A1E" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {active && (
        <CoinFlow
          coin={active}
          flow={flow}
          setFlow={setFlow}
          alreadyHave={game.collectedCoins.includes(active.id)}
          onCollect={() => game.collectCoin(active.id)}
          onClose={() => setActive(null)}
        />
      )}

      {reward && (
        <div className="overlay reveal-overlay" onClick={() => setReward(false)}>
          <div className="reward-panel horror pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="reward-icon">🎟️</div>
            <span className="story-kicker horror">Completa as 25 Moedas</span>
            <h2>Recompensas VIP</h2>
            <ul className="reward-lines">
              {COIN_REWARDS.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <button className="btn-primary" onClick={() => setReward(false)}>
              Voltar à caça
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CoinFlow({
  coin,
  flow,
  setFlow,
  alreadyHave,
  onCollect,
  onClose,
}: {
  coin: HorrorCoin;
  flow: Flow;
  setFlow: (f: Flow) => void;
  alreadyHave: boolean;
  onCollect: () => void;
  onClose: () => void;
}) {
  const meta = COIN_RARITY_META[coin.rarity];
  // ganha agora nesta sessão (vs. reabrir uma moeda já coleccionada)
  const [justWon, setJustWon] = useState(false);

  // se já está coleccionada, mostra direto a história (sem voltar a jogar)
  useEffect(() => {
    if (alreadyHave) setFlow("story");
  }, [alreadyHave, setFlow]);

  return (
    <div className="overlay reveal-overlay horror-overlay">
      {flow === "scan" && (
        <CoinScan coin={coin} onDone={() => setFlow("minigame")} />
      )}

      {flow === "minigame" && (
        <MiniGame
          theme={coin.theme}
          onDone={() => {
            onCollect();
            setJustWon(true);
            setFlow("story");
          }}
        />
      )}

      {flow === "story" && (
        <div className="coin-story pop-in">
          {justWon && <Confetti count={coin.rarity === "LENDÁRIA" ? 90 : 45} />}
          <div className="coin-big" style={{ background: meta.gradient }}>
            <span>{coin.year}</span>
          </div>
          <span className="story-kicker horror" style={{ color: meta.color }}>
            {coin.rarity} · +{coinValue(coin)} Hari Coins
          </span>
          <h2>{coin.theme}</h2>
          <p className="story-text">“{coin.story}”</p>
          <button className="btn-primary" onClick={onClose}>
            {justWon ? "Guardar no álbum" : "Fechar"}
          </button>
        </div>
      )}
    </div>
  );
}

function CoinScan({ coin, onDone }: { coin: HorrorCoin; onDone: () => void }) {
  const [found, setFound] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setFound(true), 1300);
    const t2 = setTimeout(onDone, 2100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div className="coin-scan">
      <p className="scan-hint">
        {found ? `Moeda de ${coin.year} encontrada!` : "A ler a moeda…"}
      </p>
      <div className={`coin-spin ${found ? "stop" : ""}`}>
        <span className="coin-spin-face">{found ? coin.year % 100 : "?"}</span>
      </div>
      <span className="coin-scan-theme">{found ? coin.theme : "Hora do Horror"}</span>
    </div>
  );
}
