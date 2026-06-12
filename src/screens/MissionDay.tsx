import { useState } from "react";
import {
  ATTRACTION_BY_ID,
  MISSION_REWARD_COINS,
  TRACK_BY_ID,
  formatCoins,
} from "../data";
import { useGame } from "../state";
import {
  BoltIcon,
  CheckIcon,
  CoinIcon,
  CompassIcon,
  HeartIcon,
  StarIcon,
} from "../components/Icons";
import { RewardModal } from "../components/RewardModal";

const TRACK_ICONS = {
  bolt: BoltIcon,
  compass: CompassIcon,
  heart: HeartIcon,
} as const;

// The deck's hero screen: orange header, track card, 2/4 progress,
// checklist with green ticks, "Resgatar recompensa".
export function MissionDay() {
  const game = useGame();
  const [showReward, setShowReward] = useState(false);
  const track = game.track ? TRACK_BY_ID[game.track] : null;
  const { done, total, items } = game.missionProgress;
  const complete = done === total && total > 0;
  const Icon = track ? TRACK_ICONS[track.icon] : StarIcon;

  return (
    <div className="screen mission">
      <header className="mission-header">
        <div className="mission-header-top">
          <span className="app-brand">Hopi Hari</span>
          <span className="coin-chip">
            <CoinIcon size={15} /> {formatCoins(game.coins)}
          </span>
        </div>
        <h1>Missão do Dia</h1>
      </header>

      <div className="mission-body">
        <div className="mission-track-card">
          <span className="mission-track-icon">
            <Icon size={20} color="#1B1B47" />
          </span>
          <div>
            <strong>{track?.name ?? "Escolhe um perfil"}</strong>
            <small>{track?.missionTitle ?? "na entrada do parque"}</small>
          </div>
        </div>

        <div className="mission-progress">
          <div className="mission-progress-label">
            <span>Progresso</span>
            <strong>
              {done} / {total}
            </strong>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${total ? (done / total) * 100 : 0}%` }}
            />
          </div>
        </div>

        <ul className="mission-checklist">
          {items.map(({ id, done: isDone }) => {
            const a = ATTRACTION_BY_ID[id];
            return (
              <li key={id} className={isDone ? "done" : ""}>
                <span className="check-circle">
                  {isDone && <CheckIcon size={13} color="#fff" />}
                </span>
                <span className="check-name">{a.name}</span>
                <span className="check-points">+{a.points}</span>
              </li>
            );
          })}
        </ul>

        {game.missionRewardClaimed ? (
          <div className="mission-claimed">
            <CheckIcon size={14} color="#2DBE7E" /> Recompensa resgatada —{" "}
            {track?.reward}
          </div>
        ) : (
          <button
            className="btn-primary btn-block btn-cta"
            disabled={!complete}
            onClick={() => setShowReward(true)}
          >
            {complete
              ? "Resgatar recompensa →"
              : `Resgatar recompensa (faltam ${total - done})`}
          </button>
        )}

        <div className="xp-hint">
          <span className="xp-hint-title">Como ganhar mais pontos</span>
          <div className="xp-rows">
            <span>Andar numa atração</span>
            <strong>+50 XP</strong>
            <span>Ver um espetáculo</span>
            <strong>+30 XP</strong>
            <span>Foto em checkpoint</span>
            <strong>+20 XP</strong>
          </div>
        </div>
      </div>

      {showReward && track && (
        <RewardModal
          kicker="Missão do Dia completa"
          title={track.reward}
          lines={[
            `+${MISSION_REWARD_COINS} Hari Coins na tua conta`,
            "Badge digital “" + track.name + "” no teu perfil",
          ]}
          code="HOPI-2026-RADICAL"
          onClose={() => {
            game.claimMissionReward();
            setShowReward(false);
          }}
        />
      )}
    </div>
  );
}
