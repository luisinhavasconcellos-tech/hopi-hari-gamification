import { DashState, Derived, brl, brlM, pct, sign } from '@/lib/dashboardData';

// Painel de destaque da entrega do Marketing (canal site).
export default function MarketingSpotlight({ s, d }: { s: DashState; d: Derived }) {
  const stats = [
    {
      k: 'Crescimento vs 25', v: sign(d.yoySite),
      det: '+' + brlM(s.site - s.site25) + ' · maior alta entre os grandes canais',
      c: d.yoySite >= 0 ? 'var(--green)' : 'var(--red)',
    },
    { k: 'Peso nas vendas externas', v: pct(d.shareExterno), det: 'de tudo que é vendido fora do parque', c: 'var(--cyan)' },
    { k: 'Peso no realizado total', v: pct(d.shareTotal), det: 'de toda a receita do período', c: 'var(--cyan)' },
    {
      k: 'Ritmo do canal', v: pct(d.ritmoSite),
      det: 'vs parcial · média do parque: ' + pct(d.ritmo),
      c: d.ritmoSite >= 100 ? 'var(--green)' : 'var(--amber)',
    },
  ];

  return (
    <section className="panel spot">
      <div className="spot-grid">
        <div>
          <div className="kicker">Entrega do Marketing · Canal Site</div>
          <div className="big num">{brl(s.site)}</div>
          <div className="sub-lbl">vendas pelo site no período</div>
          <div className="mini-track">
            <div className="mini-rail" />
            <div className="mini-fill" style={{ width: `${Math.min(96, (d.pctCanalSite / 100) * 96)}%` }} />
            <div className="mini-goal" style={{ left: '96%' }}>
              <span className="t">meta do canal {brlM(s.metaSite)}</span>
            </div>
          </div>
          <div className="mini-meta">
            <span>R$ 0</span>
            <span>{pct(d.pctCanalSite)} da meta do canal</span>
          </div>
        </div>
        <div className="spot-stats">
          {stats.map((st) => (
            <div className="sstat" key={st.k}>
              <div className="k">{st.k}</div>
              <div className="v num" style={{ color: st.c }}>{st.v}</div>
              <div className="d">{st.det}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
