import { useEffect, useState } from "react";
import type { Attraction } from "../data";
import { ZONES } from "../data";
import { CheckIcon, QrIcon } from "./Icons";

// Fakes a QR scan: viewfinder + sweeping line for ~1.6s, then success tick.
export function ScanOverlay({
  attraction,
  onDone,
}: {
  attraction: Attraction;
  onDone: () => void;
}) {
  const [found, setFound] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFound(true), 1600);
    const t2 = setTimeout(onDone, 2500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div className="overlay scan-overlay">
      <p className="scan-hint">
        {found ? "Totem encontrado!" : "A procurar o QR code do totem…"}
      </p>
      <div className={`scan-frame ${found ? "scan-found" : ""}`}>
        <span className="scan-corner tl" />
        <span className="scan-corner tr" />
        <span className="scan-corner bl" />
        <span className="scan-corner br" />
        {found ? (
          <div className="scan-success">
            <CheckIcon size={42} color="#1B1B47" />
          </div>
        ) : (
          <>
            <QrIcon size={88} color="rgba(255,255,255,0.25)" />
            <span className="scan-line" />
          </>
        )}
      </div>
      <div className="scan-target">
        <span
          className="zone-dot"
          style={{ background: ZONES[attraction.zone].color }}
        />
        Totem {attraction.name} · {ZONES[attraction.zone].name}
      </div>
    </div>
  );
}
