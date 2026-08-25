import { Canal, DashState, brlM, pct, sign } from '@/lib/dashboardData';

// Quadro de altas e quedas YoY por canal, com barra de alcance da meta.
function ChannelRow({ c }: { c: Canal }) {
  const alc = Math.min(100, (c.r / c.m) * 100);
  const col = c.r >= c.m ? 'var(--green)' : c.n === 'Site' ? 'var(--cyan)' : 'var(--amber)';
  return (
    <div className="row">
      <span className={`name num${c.n === 'Site' ? ' site' : ''}`}>
        {c.n} <span className="yoyof">{pct(alc)}</span>
      </span>
      <span className="bar"><i style={{ width: `${alc}%`, background: col }} /></span>
      <span className="amt num">{brlM(c.r)}</span>
      <span className={`yoy num ${c.yoy >= 0 ? 'up' : 'down'}`}>
        {c.yoy >= 0 ? '▲' : '▼'} {sign(c.yoy)}
      </span>
    </div>
  );
}

const Head = () => (
  <div className="board-head">
    <span>Canal</span><span>Alcance da meta</span><span>Realizado</span><span>YoY</span>
  </div>
);

export default function MoversBoard({ s }: { s: DashState }) {
  const gainers = s.canais.filter((c) => c.yoy >= 0).sort((a, b) => b.yoy - a.yoy).slice(0, 6);
  const losers = s.canais.filter((c) => c.yoy < 0).sort((a, b) => a.yoy - b.yoy).slice(0, 6);

  return (
    <section className="board">
      <div className="panel">
        <div className="kicker up">▲ Maiores altas · crescimento vs 25</div>
        <Head />
        <div className="rows">{gainers.map((c) => <ChannelRow c={c} key={c.n} />)}</div>
      </div>
      <div className="panel">
        <div className="kicker down">▼ Pontos de atenção · queda vs 25</div>
        <Head />
        <div className="rows">{losers.map((c) => <ChannelRow c={c} key={c.n} />)}</div>
      </div>
    </section>
  );
}
