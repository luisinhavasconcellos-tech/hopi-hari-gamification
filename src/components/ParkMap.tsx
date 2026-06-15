import type { ReactNode } from "react";
import parkmap from "../assets/map/parkmap.webp";
import { USER_POS, routeInfo } from "../data";

export interface MapMarker {
  id: string;
  x: number;
  y: number;
  label: string;
  color: string;
  done?: boolean;
  // glyph shown inside the pin (emoji or short text)
  glyph?: ReactNode;
}

// Shared GPS-style park map: real Hopi Hari aerial map, the visitor's live
// position, pins for rides/monsters, and a drawn walking route + directions
// card when a pin is selected.
export function ParkMap({
  variant = "day",
  markers,
  selectedId,
  onSelect,
  directions,
}: {
  variant?: "day" | "night";
  markers: MapMarker[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  // directions card content for the selected marker (rendered by parent)
  directions?: ReactNode;
}) {
  const selected = markers.find((m) => m.id === selectedId) ?? null;

  return (
    <div className={`parkmap ${variant}`}>
      <div className="parkmap-canvas" onClick={() => onSelect(null)}>
        <img src={parkmap} alt="Mapa do Hopi Hari" className="parkmap-img" draggable={false} />
        <span className="parkmap-tint" />

        {/* walking route from the visitor to the selected pin */}
        {selected && (
          <svg className="parkmap-route" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line
              x1={USER_POS.x}
              y1={USER_POS.y}
              x2={selected.x}
              y2={selected.y}
              stroke="#FFC72C"
              strokeWidth="0.9"
              strokeLinecap="round"
              strokeDasharray="2.4 1.8"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}

        {/* visitor location */}
        <span className="map-you" style={{ left: `${USER_POS.x}%`, top: `${USER_POS.y}%` }}>
          <span className="map-you-pulse" />
          <span className="map-you-dot" />
        </span>

        {markers.map((m) => {
          const active = m.id === selectedId;
          return (
            <button
              key={m.id}
              className={`map-pin ${m.done ? "done" : ""} ${active ? "active" : ""}`}
              style={{ left: `${m.x}%`, top: `${m.y}%`, ["--pin" as string]: m.color }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(active ? null : m.id);
              }}
              aria-label={m.label}
            >
              <span className="map-pin-body">{m.glyph ?? "★"}</span>
              {m.done && <span className="map-pin-check">✓</span>}
              {active && <span className="map-pin-label">{m.label}</span>}
            </button>
          );
        })}
      </div>

      {selected && directions && <div className="directions pop-in">{directions}</div>}
    </div>
  );
}

// Small reusable line of "x m · ~y min a pé" from the visitor to a point.
export function DirectionsMeta({ x, y }: { x: number; y: number }) {
  const { meters, minutes } = routeInfo(USER_POS, { x, y });
  return (
    <span className="directions-meta">
      📍 {meters} m · ~{minutes} min a pé
    </span>
  );
}
