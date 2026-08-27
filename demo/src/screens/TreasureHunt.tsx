import { useState } from "react";
import { ATTRACTIONS, ATTRACTION_BY_ID, ATTRACTION_POS, ZONES } from "../data";
import { useGame } from "../state";
import { ParkMap, DirectionsMeta, type MapMarker } from "../components/ParkMap";

// Caça ao Tesouro com mapa GPS: o visitante vê os brinquedos no mapa, recebe
// direções até cada totem e faz o scan do QR para desbloquear lenda + carta.
export function TreasureHunt() {
  const game = useGame();
  const [selected, setSelected] = useState<string | null>(null);
  const found = game.unlocked.length;

  const markers: MapMarker[] = ATTRACTIONS.map((a) => ({
    id: a.id,
    x: ATTRACTION_POS[a.id].x,
    y: ATTRACTION_POS[a.id].y,
    label: a.name,
    color: ZONES[a.zone].color,
    done: game.unlocked.includes(a.id),
    glyph: "🎢",
  }));

  const sel = selected ? ATTRACTION_BY_ID[selected] : null;
  const selFound = sel ? game.unlocked.includes(sel.id) : false;

  return (
    <div className="screen hunt">
      <header className="screen-header">
        <span className="screen-kicker">Caça ao Tesouro · GPS</span>
        <h1>Mapa do parque</h1>
        <p className="screen-sub">
          Cada brinquedo tem um totem com QR code. Toca num ponto para ver as
          direções e faz o scan quando lá chegares.
        </p>
        <div className="hunt-counter">
          <strong>{found}</strong> / {ATTRACTIONS.length} totens encontrados
        </div>
      </header>

      <ParkMap
        variant="day"
        markers={markers}
        selectedId={selected}
        onSelect={setSelected}
        directions={
          sel && (
            <>
              <div className="directions-head">
                <span className="dir-dot" style={{ background: ZONES[sel.zone].color }} />
                <div>
                  <strong>{sel.name}</strong>
                  <small>
                    {ZONES[sel.zone].name} · {sel.category}
                  </small>
                </div>
              </div>
              <p className="dir-clue">
                {selFound ? `“${sel.story}”` : sel.clue}
              </p>
              <DirectionsMeta x={ATTRACTION_POS[sel.id].x} y={ATTRACTION_POS[sel.id].y} />
              {selFound ? (
                <div className="dir-done">✓ Totem já encontrado</div>
              ) : (
                <button
                  className="btn-primary btn-block"
                  onClick={() => {
                    game.beginScan(sel.id);
                    setSelected(null);
                  }}
                >
                  Cheguei — fazer scan do totem
                </button>
              )}
            </>
          )
        }
      />
    </div>
  );
}
