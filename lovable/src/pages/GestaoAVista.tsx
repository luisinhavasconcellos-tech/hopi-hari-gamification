import { useEffect, useState } from 'react';
import '@/styles/dashboard.css';
import {
  DashState, brlM, compute, clearState, DEFAULTS, loadState, pct, persistState, sign,
} from '@/lib/dashboardData';
import Gauge from '@/components/dashboard/Gauge';
import Ticker from '@/components/dashboard/Ticker';
import RaceTrack from '@/components/dashboard/RaceTrack';
import MarketingSpotlight from '@/components/dashboard/MarketingSpotlight';
import MoversBoard from '@/components/dashboard/MoversBoard';
import InsightsBI from '@/components/dashboard/InsightsBI';
import UpdateDrawer from '@/components/dashboard/UpdateDrawer';

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  return String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
}

export default function GestaoAVista() {
  const [s, setS] = useState<DashState>(loadState);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const clock = useClock();
  const d = compute(s);

  const save = (next: DashState) => {
    setS(next);
    persistState(next);
    setDrawerOpen(false);
  };
  const reset = () => {
    clearState();
    setS({ ...DEFAULTS });
  };

  return (
    <div className="hh-dash">
      <header className="topbar">
        <div className="brand">
          <span className="mark">Hopi Hari</span>
          <span className="div" />
          <span className="title">Gestão à Vista · Vendas</span>
        </div>
        <div className="spacer" />
        <div className="stamp">
          <span className="live"><span className="dot" />AO VIVO</span>
          <span>{s.period} · DADOS ATÉ {s.refDate}</span>
          <span className="clock">{clock}</span>
        </div>
      </header>

      <Ticker s={s} d={d} />

      <main className="wrap">
        {/* HERO */}
        <section className="hero">
          <div className="panel hero-num">
            <div className="lbl">Realizado acumulado</div>
            <div className="big num"><small>R$</small> {Math.round(s.realizado).toLocaleString('pt-BR')}</div>
            <div className="chips">
              <span className={`chip ${d.yoyTotal >= 0 ? 'gr' : 'rd'}`}>
                {d.yoyTotal >= 0 ? '▲' : '▼'} {sign(d.yoyTotal)} vs 25 ({brlM(s.realizado - s.realizado25)})
              </span>
              <span className={`chip ${d.ritmo >= 100 ? 'gr' : 'am'}`}>
                ritmo {pct(d.ritmo)} do esperado até {s.refDate}
              </span>
            </div>
          </div>
          <RaceTrack s={s} d={d} />
        </section>

        {/* GAUGES */}
        <section className="gauges">
          <Gauge
            title="Meta Site"
            value={Math.min(d.pctSite, 300)} min={0} max={300} target={100}
            targetLabel="100%" minLabel="0%" maxLabel="300%"
            zones={[{ from: 0, to: 60, c: '#FF5A66' }, { from: 60, to: 100, c: '#FFB627' }, { from: 100, to: 300, c: '#2FD97B' }]}
            actual={pct(d.pctSite)} color="#2FD97B"
            caption={`realizado ${brlM(s.realizado)} vs meta ${brlM(s.metaSite)}`}
            flag={d.pctSite >= 100
              ? { cls: 'win', txt: `✓ Superada em ${brlM(s.realizado - s.metaSite)}` }
              : { cls: 'chase', txt: `Faltam ${brlM(s.metaSite - s.realizado)}` }}
          />
          <Gauge
            title="Meta Geral"
            value={d.pctGeral} min={0} max={100} target={s.parcialPct}
            targetLabel={`${s.parcialPct}%`} minLabel="0%" maxLabel="100%"
            zones={[{ from: 0, to: 50, c: '#FF5A66' }, { from: 50, to: s.parcialPct, c: '#FFB627' }, { from: s.parcialPct, to: 100, c: '#2FD97B' }]}
            actual={pct(d.pctGeral)} color={d.pctGeral >= 100 ? '#2FD97B' : '#FFB627'}
            caption={`realizado ${brlM(s.realizado)} vs meta ${brlM(s.metaGeral)}`}
            flag={d.pctGeral >= 100
              ? { cls: 'win', txt: '✓ Meta atingida' }
              : { cls: 'chase', txt: `Faltam ${brlM(d.faltaGeral)}` }}
          />
          <Gauge
            title="Ritmo do mês"
            value={d.ritmo} min={0} max={120} target={100}
            targetLabel="100%" minLabel="0%" maxLabel="120%"
            zones={[{ from: 0, to: 75, c: '#FF5A66' }, { from: 75, to: 100, c: '#FFB627' }, { from: 100, to: 120, c: '#2FD97B' }]}
            actual={pct(d.ritmo)} color={d.ritmo >= 100 ? '#2FD97B' : d.ritmo >= 75 ? '#FFB627' : '#FF5A66'}
            caption={`vs parcial esperada de ${brlM(d.parcial)} até ${s.refDate}`}
            flag={d.ritmo >= 100
              ? { cls: 'win', txt: '✓ No ritmo' }
              : { cls: d.ritmo >= 75 ? 'chase' : 'behind', txt: `Gap de ${brlM(d.parcial - s.realizado)} vs o esperado` }}
          />
        </section>

        <MarketingSpotlight s={s} d={d} />
        <MoversBoard s={s} />
        <InsightsBI d={d} />
      </main>

      <p className="foot">
        Fonte: acompanhamento de canais · atualizado diariamente por Carla · valores em R$ · YoY = vs mesmo
        período de 25 · ritmo = realizado ÷ parcial esperada até a data ({s.parcialPct}% da meta do mês)
      </p>

      <button
        className="gear"
        aria-expanded={drawerOpen}
        onClick={() => setDrawerOpen((o) => !o)}
      >
        ⚙ Atualizar números
      </button>
      <UpdateDrawer
        open={drawerOpen}
        state={s}
        onSave={save}
        onReset={reset}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
