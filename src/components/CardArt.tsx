import type { Attraction } from "../data";
import { ZONES } from "../data";

// Stylized silhouette illustration per attraction, drawn on the card's
// gradient. Deliberate flat-poster look — no external images needed.
// withName overlays the attraction name + zone chip, as on the deck card.
export function CardArt({
  attraction,
  className,
  withName = false,
}: {
  attraction: Attraction;
  className?: string;
  withName?: boolean;
}) {
  const zone = ZONES[attraction.zone];
  return (
    <div
      className={className ?? "card-art"}
      style={{
        background: `linear-gradient(160deg, ${attraction.artFrom} 0%, ${attraction.artTo} 100%)`,
      }}
    >
      <svg viewBox="0 0 300 170" preserveAspectRatio="xMidYMax slice">
        <Silhouette id={attraction.id} />
      </svg>
      {withName && (
        <div className="card-art-row">
          <span className="card-art-name">{attraction.name.toUpperCase()}</span>
          <span className="zone-chip" style={{ background: zone.color }}>
            {zone.name}
          </span>
        </div>
      )}
    </div>
  );
}

function Silhouette({ id }: { id: string }) {
  const ink = "rgba(20, 12, 46, 0.55)";
  const inkSoft = "rgba(20, 12, 46, 0.3)";
  const glow = "rgba(255, 255, 255, 0.35)";

  switch (id) {
    case "katapul":
      // launch coaster: vertical spikes + loop + speed streaks
      return (
        <g>
          <circle cx="225" cy="55" r="34" fill="none" stroke={ink} strokeWidth="10" />
          <path d="M0 170 60 40l14 0L40 170Z" fill={ink} />
          <path d="M50 170 110 40l14 0L96 170Z" fill={inkSoft} />
          <path d="M0 150 C 90 130 190 130 300 150 L300 170 0 170Z" fill={ink} />
          <path d="M120 80h70M110 98h60M128 62h54" stroke={glow} strokeWidth="5" strokeLinecap="round" />
        </g>
      );
    case "montezum":
      // wooden coaster hills with lattice + sun
      return (
        <g>
          <circle cx="248" cy="42" r="22" fill={glow} />
          <path
            d="M0 170 0 120 Q 50 30 95 120 Q 135 60 175 125 Q 215 80 250 130 L300 110 300 170Z"
            fill={ink}
          />
          <path d="M20 170V130M45 170V112M70 170V118M105 170V120M140 170V112M170 170V128M205 170V118M240 170V134M270 170V124" stroke={inkSoft} strokeWidth="6" />
        </g>
      );
    case "vurang":
      // inverted loop under a moon, Mistieri night
      return (
        <g>
          <circle cx="60" cy="42" r="20" fill={glow} />
          <circle cx="68" cy="38" r="17" fill="rgba(59,29,120,0.9)" />
          <circle cx="190" cy="80" r="44" fill="none" stroke={ink} strokeWidth="11" />
          <path d="M0 140 C 80 120 130 124 146 80" fill="none" stroke={ink} strokeWidth="11" />
          <path d="M234 80 C 250 124 280 130 300 134" fill="none" stroke={ink} strokeWidth="11" />
          <path d="M0 170h300v-22c-110-16-190-16-300 0Z" fill={ink} />
        </g>
      );
    case "riobravo":
      // raft on rapids
      return (
        <g>
          <path d="M0 96 Q 40 70 80 96 T 160 96 T 240 96 T 320 96 V170 H0Z" fill={inkSoft} />
          <path d="M0 122 Q 40 98 80 122 T 160 122 T 240 122 T 320 122 V170 H0Z" fill={ink} />
          <ellipse cx="150" cy="92" rx="52" ry="16" fill={ink} />
          <circle cx="128" cy="72" r="11" fill={ink} />
          <circle cx="152" cy="68" r="11" fill={ink} />
          <circle cx="176" cy="72" r="11" fill={ink} />
          <path d="M70 60q14-8 26 0M210 54q14-8 26 0" stroke={glow} strokeWidth="5" fill="none" strokeLinecap="round" />
        </g>
      );
    case "toureiffel":
      // Eiffel tower at dusk
      return (
        <g>
          <circle cx="60" cy="50" r="16" fill={glow} />
          <path
            d="M150 8 158 60 178 116 212 158 232 170 68 170 88 158 122 116 142 60Z"
            fill={ink}
          />
          <path d="M118 122h64M134 78h32" stroke={glow} strokeWidth="5" />
          <path d="M150 122c-6 22-22 38-40 48M150 122c6 22 22 38 40 48" stroke={ink} strokeWidth="8" fill="none" />
          <path d="M0 170h300v-14c-120-10-180-10-300 0Z" fill={inkSoft} />
        </g>
      );
    case "giranda":
      // ferris wheel
      return (
        <g>
          <circle cx="150" cy="84" r="58" fill="none" stroke={ink} strokeWidth="9" />
          <circle cx="150" cy="84" r="8" fill={ink} />
          <path d="M150 26v116M92 84h116M109 43l82 82M191 43l-82 82" stroke={inkSoft} strokeWidth="5" />
          <circle cx="150" cy="26" r="10" fill={ink} />
          <circle cx="208" cy="84" r="10" fill={ink} />
          <circle cx="92" cy="84" r="10" fill={ink} />
          <circle cx="150" cy="142" r="10" fill={ink} />
          <circle cx="191" cy="43" r="9" fill={glow} />
          <path d="M150 84 118 170h64Z" fill={ink} />
          <path d="M0 170h300v-10c-120-8-180-8-300 0Z" fill={inkSoft} />
        </g>
      );
    default:
      return null;
  }
}
