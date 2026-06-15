import { MONSTER_RARITY_META, type Monster } from "../data";
import { MONSTER_IMG } from "../monsterImages";

// Real Hora do Horror figure. The source renders sit on a white studio
// background; a `multiply` fog overlay tinted to the monster's rarity colour
// turns that white into atmospheric mist while keeping the figure intact —
// no fragile background removal needed.
export function MonsterArt({
  monster,
  size = 150,
  frame = true,
}: {
  monster: Monster;
  size?: number;
  frame?: boolean;
}) {
  const meta = MONSTER_RARITY_META[monster.rarity];
  return (
    <div
      className={`monster-art ${frame ? "framed" : ""}`}
      style={{
        width: size,
        height: size * 1.32,
        ["--glow" as string]: meta.glow,
        ["--edge" as string]: meta.color,
        ["--mon" as string]: monster.color,
      }}
    >
      <img src={MONSTER_IMG[monster.id]} alt={monster.name} draggable={false} />
      <span className="monster-fog" />
      <span className="monster-scan" />
    </div>
  );
}
