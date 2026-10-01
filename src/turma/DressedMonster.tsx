import type { CSSProperties } from "react";
import { OUTFIT_INDEX, TURMA_BY_ID, WEAR_GRID, wearSprite, type TurmaId } from "./data";

/**
 * A Turma monster, optionally wearing one of the 50 shop outfits.
 * Outfits are pre-rendered per monster in two 10x5 sprite sheets: `back`
 * (capes, drawn behind the body) and `front` (clothes, shoes, hats, glasses).
 * The box is sized by `height`; width follows the cut-out's aspect ratio.
 */
export function DressedMonster({
  id,
  outfit,
  height,
  className,
  style,
  alt,
  imgStyle,
}: {
  id: TurmaId;
  outfit?: string | null;
  height: number;
  className?: string;
  style?: CSSProperties;
  alt?: string;
  /** Extra style for the body layers (e.g. a filter for wet/sick looks). */
  imgStyle?: CSSProperties;
}) {
  const m = TURMA_BY_ID[id];
  const idx = outfit != null ? OUTFIT_INDEX[outfit] : undefined;
  const front = wearSprite(id, "front");
  const back = wearSprite(id, "back");
  const dressed = idx !== undefined && !!front;
  const { cols, rows, px, pt, pb } = WEAR_GRID;
  const col = dressed ? idx % cols : 0;
  const row = dressed ? Math.floor(idx / cols) : 0;
  const win: CSSProperties = {
    position: "absolute",
    left: `${-px * 100}%`,
    top: `${-pt * 100}%`,
    width: `${(1 + 2 * px) * 100}%`,
    height: `${(1 + pt + pb) * 100}%`,
    overflow: "hidden",
    pointerEvents: "none",
  };
  const sheet: CSSProperties = {
    position: "absolute",
    left: `${-col * 100}%`,
    top: `${-row * 100}%`,
    width: `${cols * 100}%`,
    height: `${rows * 100}%`,
    maxWidth: "none",
  };
  return (
    <div
      className={className}
      style={{ position: "relative", height, width: Math.round(height * m.asp), flexShrink: 0, ...style }}
    >
      <div style={{ position: "absolute", inset: 0, ...imgStyle }}>
        {dressed && back && (
          <div style={win} aria-hidden="true">
            <img src={back} alt="" draggable={false} style={sheet} />
          </div>
        )}
        <img
          src={m.img}
          alt={alt ?? m.alt}
          draggable={false}
          style={{ position: "relative", display: "block", height: "100%", width: "100%" }}
        />
        {dressed && (
          <div style={win} aria-hidden="true">
            <img src={front!} alt="" draggable={false} style={sheet} />
          </div>
        )}
      </div>
    </div>
  );
}
