// Velocímetro semicircular (220°) com zonas coloridas, tick de alvo e ponteiro.
export interface GaugeZone { from: number; to: number; c: string; }
export interface GaugeFlag { cls: 'win' | 'chase' | 'behind'; txt: string; }

interface GaugeProps {
  title: string;
  value: number;
  min: number;
  max: number;
  target: number;
  targetLabel: string;
  minLabel: string;
  maxLabel: string;
  zones: GaugeZone[];
  actual: string;
  caption: string;
  color: string;
  flag?: GaugeFlag;
}

const W = 364, H = 185, CX = W / 2, CY = 152, R = 112, THICK = 20;
const A0 = -200, A1 = 20; // graus (0° = leste), varre 220°

const rad = (a: number) => (a * Math.PI) / 180;
const pt = (a: number, r: number): [number, number] => [CX + r * Math.cos(rad(a)), CY + r * Math.sin(rad(a))];

function arcPath(from: number, to: number, r: number): string {
  const [x1, y1] = pt(from, r);
  const [x2, y2] = pt(to, r);
  const large = to - from > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

export default function Gauge(p: GaugeProps) {
  const ang = (v: number) => A0 + ((Math.min(Math.max(v, p.min), p.max) - p.min) / (p.max - p.min)) * (A1 - A0);

  const ta = ang(p.target);
  const [tx1, ty1] = pt(ta, R - THICK / 2 - 6);
  const [tx2, ty2] = pt(ta, R + THICK / 2 + 8);
  let [tlx, tly] = pt(ta, R + 27);
  const tcos = Math.cos(rad(ta));
  const tanchor = tcos > 0.35 ? 'start' : tcos < -0.35 ? 'end' : 'middle';
  if (tanchor === 'start') tlx = Math.min(tlx, W - 64);
  if (tanchor === 'end') tlx = Math.max(tlx, 64);

  const na = ang(p.value);
  const [nx, ny] = pt(na, R - THICK / 2 - 10);
  const [bx1, by1] = pt(na + 90, 7);
  const [bx2, by2] = pt(na - 90, 7);

  const [e1x, e1y] = pt(A0, R + 24);
  const [e2x, e2y] = pt(A1, R + 24);

  return (
    <div className="panel gauge">
      <div className="g-title">{p.title}</div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${p.title}: ${p.actual}`}>
        <path d={arcPath(A0, A1, R)} fill="none" stroke="#13233C" strokeWidth={THICK} />
        {p.zones.map((z, i) => (
          <path key={i} d={arcPath(ang(z.from), ang(z.to), R)} fill="none" stroke={z.c} strokeWidth={THICK} opacity={0.9} />
        ))}
        <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="#EAF1FB" strokeWidth={2.5} strokeDasharray="4 3" />
        <text x={tlx} y={tly} fill="#93A7C4" fontSize={11} fontFamily="IBM Plex Mono, monospace" textAnchor={tanchor}>
          alvo {p.targetLabel}
        </text>
        <polygon points={`${nx},${ny} ${bx1},${by1} ${bx2},${by2}`} fill="#EAF1FB" />
        <circle cx={CX} cy={CY} r={10} fill="#EAF1FB" />
        <circle cx={CX} cy={CY} r={4.5} fill="#0C1322" />
        <text x={e1x} y={e1y} fill="#5C7191" fontSize={11} fontFamily="IBM Plex Mono, monospace" textAnchor="middle">{p.minLabel}</text>
        <text x={e2x} y={e2y} fill="#5C7191" fontSize={11} fontFamily="IBM Plex Mono, monospace" textAnchor="middle">{p.maxLabel}</text>
      </svg>
      <div className="g-actual num" style={{ color: p.color }}>{p.actual}</div>
      <div className="g-caption num">{p.caption}</div>
      {p.flag && <div className={`status-flag ${p.flag.cls}`}>{p.flag.txt}</div>}
    </div>
  );
}
