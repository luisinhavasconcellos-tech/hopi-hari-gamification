// ─────────────────────────────────────────────────────────────
// Dados do painel de Gestão à Vista · Vendas
// Carla: tudo que muda no dia a dia vive em DEFAULTS (ou no
// painel "⚙ Atualizar números" dentro do app). O resto é calculado.
// ─────────────────────────────────────────────────────────────

export interface Canal {
  n: string;   // nome
  r: number;   // realizado 26 (R$)
  m: number;   // meta (R$)
  yoy: number; // % crescimento vs 25
}

export interface DashState {
  refDate: string;
  period: string;
  realizado: number;
  metaGeral: number;
  realizado25: number;
  site: number;
  metaSite: number;
  site25: number;
  parcialPct: number;
  canais: Canal[];
  externo: number;
  externoYoy: number;
  internoYoy: number;
}

export const DEFAULTS: DashState = {
  refDate: '24/08',
  period: 'AGO/26',
  realizado: 19_725_556,
  metaGeral: 31_486_781,
  realizado25: 16_755_868,
  site: 5_283_016,
  metaSite: 7_314_446,
  site25: 3_457_202,
  parcialPct: 80,
  canais: [
    { n: 'Parceiros',         r: 26_176,    m: 34_866,     yoy: 404 },
    { n: 'AGVT',              r: 151_685,   m: 94_138,     yoy: 234 },
    { n: 'Escola Particular', r: 292_487,   m: 690_345,    yoy: 166 },
    { n: 'Eventos/Hopi Niver',r: 859_105,   m: 536_498,    yoy: 107 },
    { n: 'Site',              r: 5_283_016, m: 7_314_446,  yoy: 53 },
    { n: 'Estacionamento',    r: 1_282_270, m: 1_813_756,  yoy: 47 },
    { n: 'Mercadorias',       r: 922_511,   m: 1_362_309,  yoy: 26 },
    { n: 'A&B',               r: 6_328_121, m: 10_110_111, yoy: 17 },
    { n: 'Serviços',          r: 1_983_711, m: 3_087_388,  yoy: -8 },
    { n: 'Escola Pública',    r: 726_296,   m: 1_408_583,  yoy: -20 },
    { n: 'Telemarketing',     r: 841_739,   m: 1_503_058,  yoy: -24 },
    { n: 'Bilheteria',        r: 487_465,   m: 1_040_374,  yoy: -47 },
    { n: 'Turismo',           r: 250_474,   m: 955_326,    yoy: -53 },
  ],
  externo: 9_208_944,
  externoYoy: 22,
  internoYoy: 14,
};

const LS_KEY = 'hh-gestao-vista-v2';

export function loadState(): DashState {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    return { ...DEFAULTS, ...saved };
  } catch {
    return { ...DEFAULTS };
  }
}

export function persistState(s: DashState): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch { /* modo privado etc. */ }
}

export function clearState(): void {
  try { localStorage.removeItem(LS_KEY); } catch { /* noop */ }
}

// ── Formatadores ──
export const brl = (v: number) => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
export const brlM = (v: number) => {
  const m = v / 1e6;
  return 'R$ ' + (Math.abs(m) >= 10 ? m.toFixed(1) : m.toFixed(2)).replace('.', ',') + ' mi';
};
export const pct = (v: number) => Math.round(v) + '%';
export const sign = (v: number) => (v > 0 ? '+' : '') + Math.round(v) + '%';

// ── Derivados (uma fonte de verdade para todos os componentes) ──
export interface Derived {
  pctSite: number;        // leitura do briefing: realizado TOTAL vs Meta Site
  pctGeral: number;
  faltaGeral: number;
  yoyTotal: number;
  parcial: number;
  ritmo: number;
  pctCanalSite: number;   // realizado do canal site vs meta do canal
  yoySite: number;
  shareTotal: number;
  shareExterno: number;
  ritmoSite: number;
  beaten: boolean;
}

export function compute(s: DashState): Derived {
  const parcial = (s.metaGeral * s.parcialPct) / 100;
  return {
    pctSite: (s.realizado / s.metaSite) * 100,
    pctGeral: (s.realizado / s.metaGeral) * 100,
    faltaGeral: Math.max(0, s.metaGeral - s.realizado),
    yoyTotal: (s.realizado / s.realizado25 - 1) * 100,
    parcial,
    ritmo: (s.realizado / parcial) * 100,
    pctCanalSite: (s.site / s.metaSite) * 100,
    yoySite: (s.site / s.site25 - 1) * 100,
    shareTotal: (s.site / s.realizado) * 100,
    shareExterno: (s.site / s.externo) * 100,
    ritmoSite: s.site / ((s.metaSite * s.parcialPct) / 100) * 100,
    beaten: s.realizado >= s.metaSite,
  };
}
