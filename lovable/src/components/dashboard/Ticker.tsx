import { DashState, Derived, sign } from '@/lib/dashboardData';

// Fita de cotações estilo pregão: canal + variação YoY.
export default function Ticker({ s, d }: { s: DashState; d: Derived }) {
  const items = [
    { n: 'TOTAL PARQUE', v: d.yoyTotal },
    { n: 'EXTERNO', v: s.externoYoy },
    { n: 'INTERNO', v: s.internoYoy },
    ...s.canais.map((c) => ({ n: c.n.toUpperCase(), v: c.yoy })),
  ];
  return (
    <div className="ticker" aria-label="Variação anual por canal">
      <div className="ticker-track">
        {items.map((t, i) => (
          <span className="tk" key={i}>
            <b>{t.n}</b>
            <span className={`v ${t.v >= 0 ? 'up' : 'down'}`}>
              {t.v >= 0 ? '▲' : '▼'} {sign(t.v)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
