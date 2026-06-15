import { useState } from "react";
import {
  MONSTERS,
  MONSTER_BY_ID,
  MONSTER_RARITY_META,
  ZONES,
  formatCoins,
  type Monster,
} from "../data";
import { useGame } from "../state";
import { MonsterArt } from "../components/MonsterArt";
import { ParkMap, DirectionsMeta, type MapMarker } from "../components/ParkMap";
import { Confetti } from "../components/Confetti";
import { GhostIcon } from "../components/Icons";

type Phase = "aim" | "throwing" | "caught";

// "Pokémon Go" do Hopi Hari — mapa GPS com os monstros da Hora do Horror.
// Segue as direções até cada um e captura-o com a Hari Orb.
export function MonsterHunt({ onBack }: { onBack: () => void }) {
  const game = useGame();
  const [selected, setSelected] = useState<string | null>(null);
  const [target, setTarget] = useState<Monster | null>(null);
  const caught = game.caughtMonsters.length;

  const markers: MapMarker[] = MONSTERS.map((m) => ({
    id: m.id,
    x: m.x,
    y: m.y,
    label: m.name,
    color: m.color,
    done: game.caughtMonsters.includes(m.id),
    glyph: "👻",
  }));

  const sel = selected ? MONSTER_BY_ID[selected] : null;
  const selCaught = sel ? game.caughtMonsters.includes(sel.id) : false;

  return (
    <div className="horror-screen monster-hunt">
      <HorrorHeader
        onBack={onBack}
        kicker="Caça aos Monstros · GPS"
        title="Mapa do Parque"
        coins={game.coins}
      />

      <p className="horror-sub">
        Os monstros da Hora do Horror estão à solta. Toca num para ver as
        direções no mapa e segue até lá para o capturares.
      </p>

      <div className="hunt-counter horror">
        <GhostIcon size={15} color="#7CFC9A" />
        <strong>{caught}</strong> / {MONSTERS.length} monstros capturados
      </div>

      <ParkMap
        variant="night"
        markers={markers}
        selectedId={selected}
        onSelect={setSelected}
        directions={
          sel && (
            <>
              <div className="directions-head">
                <span className="dir-dot" style={{ background: sel.color }} />
                <div>
                  <strong>{sel.name}</strong>
                  <small>
                    {sel.house} · {ZONES[sel.zone].name}
                  </small>
                </div>
                <span
                  className="rarity-tag"
                  style={{ color: MONSTER_RARITY_META[sel.rarity].color }}
                >
                  {MONSTER_RARITY_META[sel.rarity].label}
                </span>
              </div>
              <DirectionsMeta x={sel.x} y={sel.y} />
              {selCaught ? (
                <div className="dir-done">✓ Já capturaste este monstro</div>
              ) : (
                <button className="btn-primary btn-block" onClick={() => setTarget(sel)}>
                  Seguir e capturar →
                </button>
              )}
            </>
          )
        }
      />

      <div className="legend">
        {(["RARO", "ÉPICO", "LENDÁRIO"] as const).map((r) => (
          <span key={r}>
            <i style={{ background: MONSTER_RARITY_META[r].color }} />
            {MONSTER_RARITY_META[r].label}
          </span>
        ))}
      </div>

      {target && (
        <CatchOverlay
          monster={target}
          onClose={() => {
            setTarget(null);
            setSelected(null);
          }}
          onCaught={() => game.catchMonster(target.id)}
        />
      )}
    </div>
  );
}

function CatchOverlay({
  monster,
  onClose,
  onCaught,
}: {
  monster: Monster;
  onClose: () => void;
  onCaught: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("aim");
  const meta = MONSTER_RARITY_META[monster.rarity];

  const doThrow = () => {
    setPhase("throwing");
    setTimeout(() => {
      onCaught();
      setPhase("caught");
    }, 1400);
  };

  return (
    <div className="overlay catch-overlay">
      <div className="catch-scene">
        {phase === "caught" && (
          <Confetti count={monster.rarity === "LENDÁRIO" ? 90 : 50} />
        )}
        <span className="catch-house" style={{ color: meta.color }}>
          {monster.house}
        </span>
        <div className={`catch-mon ${phase}`} style={{ ["--glow" as string]: meta.glow }}>
          <MonsterArt monster={monster} size={188} />
        </div>

        {phase !== "caught" ? (
          <>
            <div className={`hari-orb ${phase === "throwing" ? "throw" : ""}`}>
              <span className="orb-band" />
              <span className="orb-eye" />
            </div>
            {phase === "aim" && (
              <div className="catch-actions">
                <button className="btn-ghost catch-flee" onClick={onClose}>
                  Fugir
                </button>
                <button className="btn-primary" onClick={doThrow}>
                  Lançar Hari Orb
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="catch-result pop-in">
            <span className="catch-tag" style={{ color: meta.color }}>
              {meta.label} capturado!
            </span>
            <h2>{monster.name}</h2>
            <p className="catch-blurb">“{monster.blurb}”</p>
            <p className="catch-points">+{formatCoins(monster.points)} Hari Coins</p>
            <button className="btn-primary" onClick={onClose}>
              Continuar a caça
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Shared dark header for the Hora do Horror games.
export function HorrorHeader({
  onBack,
  kicker,
  title,
  coins,
}: {
  onBack: () => void;
  kicker: string;
  title: string;
  coins: number;
}) {
  return (
    <header className="horror-header">
      <button className="horror-back" onClick={onBack} aria-label="Voltar">
        ‹
      </button>
      <div className="horror-head-text">
        <span>{kicker}</span>
        <h1>{title}</h1>
      </div>
      <span className="coin-chip dark">🎃 {formatCoins(coins)}</span>
    </header>
  );
}
