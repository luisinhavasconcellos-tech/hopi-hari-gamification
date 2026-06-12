import { useMemo } from "react";

const COLORS = ["#FFC72C", "#62BB46", "#2B57E0", "#E84B3C", "#FFFFFF", "#8ED44F"];

// Lightweight CSS confetti burst — no libraries, runs instantly offline.
export function Confetti({ count = 60 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2 + Math.random() * 1.6,
        size: 6 + Math.random() * 7,
        color: COLORS[i % COLORS.length],
        spin: Math.random() > 0.5 ? 1 : -1,
        round: Math.random() > 0.6,
      })),
    [count]
  );

  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 0.55,
            background: p.color,
            borderRadius: p.round ? "50%" : 2,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ["--spin" as string]: `${p.spin * (520 + Math.random() * 400)}deg`,
          }}
        />
      ))}
    </div>
  );
}
