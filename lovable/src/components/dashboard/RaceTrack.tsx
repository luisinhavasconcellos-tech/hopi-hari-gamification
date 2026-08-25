import { DashState, Derived, brlM, pct } from '@/lib/dashboardData';

// Corrida da meta: barra de realizado com marcações Meta Site → Meta Geral.
export default function RaceTrack({ s, d }: { s: DashState; d: Derived }) {
  const span = s.metaGeral * 1.04; // 4% de respiro à direita
  const px = (v: number) => Math.min(100, (v / span) * 100);

  const scaleLabels = Array.from({ length: 5 }, (_, i) => {
    const v = (span * i) / 4;
    return i === 0 ? 'R$ 0' : brlM(v);
  });

  return (
    <div className="panel track-panel">
      <div className="track-head">
        <div className="kicker">Corrida da meta — onde estamos</div>
        <div className="pct num">
          {pct(d.pctSite)} da Meta Site · {pct(d.pctGeral)} da Meta Geral
        </div>
      </div>
      <div className="track">
        <div className="track-rail" />
        <div className="track-fill" style={{ width: `${px(s.realizado)}%` }} />
        <div className={`goal site${d.beaten ? ' beaten' : ''}`} style={{ left: `${px(s.metaSite)}%` }}>
          <span className="tag num">{d.beaten ? '✓ ' : ''}Meta Site · {brlM(s.metaSite)}</span>
        </div>
        <div className="goal last" style={{ left: `${px(s.metaGeral)}%` }}>
          <span className="tag num">Meta Geral · {brlM(s.metaGeral)}</span>
        </div>
      </div>
      <div className="scale">
        {scaleLabels.map((l, i) => <span key={i}>{l}</span>)}
      </div>
      <p className="track-note">
        {d.beaten ? (
          <>Realizado já passou a Meta Site em <b>{brlM(s.realizado - s.metaSite)}</b>. Faltam <b>{brlM(d.faltaGeral)}</b> para a Meta Geral.</>
        ) : (
          <>Faltam <b>{brlM(s.metaSite - s.realizado)}</b> para a Meta Site e <b>{brlM(d.faltaGeral)}</b> para a Meta Geral.</>
        )}
      </p>
    </div>
  );
}
