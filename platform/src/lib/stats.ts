/**
 * Utilitários estatísticos para reduzir conclusões falsas com amostra pequena.
 * Tudo aqui é cálculo puro — sem dependências externas.
 */

export type Interval = { low: number; high: number };

export type CorrelationTest = {
  /** coeficiente de Pearson (null quando n < 3 ou variância zero) */
  r: number | null;
  /** número de pares usados */
  n: number;
  /** IC 95% via transformação z de Fisher */
  ci: Interval | null;
  /** p-valor bicaudal (teste t com n-2 g.l.) */
  p: number | null;
  /** true quando p < 0.05 e o IC não cruza zero */
  significant: boolean;
  /** rótulo pronto para UI */
  label: string;
};

export type ProportionTest = {
  rate: number;
  n: number;
  successes: number;
  /** IC 95% de Wilson (robusto para n pequeno) */
  ci: Interval;
  /** p-valor bicaudal do teste de duas proporções contra a taxa de referência */
  p: number | null;
  significant: boolean;
  /** true quando a amostra é pequena demais para conclusão (n < 10 ou IC muito largo) */
  lowSample: boolean;
};

/** Função erro (Abramowitz & Stegun 7.1.26) — precisão ~1e-7. */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

/** P(Z > |z|) * 2 — p-valor bicaudal da normal padrão. */
export function normalTwoTailed(z: number): number {
  return Math.max(0, Math.min(1, 1 - erf(Math.abs(z) / Math.SQRT2)));
}

function logGamma(x: number): number {
  const c = [
    76.18009172947146, -86.50532032941678, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2,
    -0.5395239384953e-5,
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.0000000001900149;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log((2.5066282746310002 * ser) / x);
}

/** Fração contínua da beta incompleta (Numerical Recipes). */
function betacf(a: number, b: number, x: number): number {
  const FPMIN = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-7) break;
  }
  return h;
}

function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** p-valor bicaudal de uma estatística t com df graus de liberdade. */
export function tTwoTailed(t: number, df: number): number {
  if (df <= 0) return 1;
  return betai(df / 2, 0.5, df / (df + t * t));
}

/** Pearson com IC de Fisher e teste t. */
export function correlationTest(a: number[], b: number[], minN = 4): CorrelationTest {
  const n = Math.min(a.length, b.length);
  const base = { r: null, n, ci: null, p: null, significant: false };
  if (n < 3) return { ...base, label: `amostra insuficiente (n=${n})` };

  const ma = a.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const mb = b.slice(0, n).reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma;
    const y = b[i] - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  if (!da || !db) return { ...base, label: "variância nula" };

  const r = Math.max(-0.999999, Math.min(0.999999, num / Math.sqrt(da * db)));
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const p = tTwoTailed(t, n - 2);

  let ci: Interval | null = null;
  if (n > 3) {
    const z = 0.5 * Math.log((1 + r) / (1 - r));
    const se = 1 / Math.sqrt(n - 3);
    const lo = z - 1.959964 * se;
    const hi = z + 1.959964 * se;
    ci = { low: Math.tanh(lo), high: Math.tanh(hi) };
  }

  const significant = n >= minN && p < 0.05 && !!ci && ci.low * ci.high > 0;
  const label = significant
    ? `significativa (p=${p < 0.001 ? "<0,001" : p.toFixed(3).replace(".", ",")})`
    : n < minN
      ? `amostra pequena (n=${n})`
      : `não significativa (p=${p.toFixed(2).replace(".", ",")})`;

  return { r, n, ci, p, significant, label };
}

/** IC 95% de Wilson para uma proporção (0–1). */
export function wilsonInterval(successes: number, n: number, z = 1.959964): Interval {
  if (n <= 0) return { low: 0, high: 0 };
  const phat = successes / n;
  const denom = 1 + (z * z) / n;
  const center = phat + (z * z) / (2 * n);
  const margin = z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * n)) / n);
  return { low: Math.max(0, (center - margin) / denom), high: Math.min(1, (center + margin) / denom) };
}

/**
 * Testa a proporção observada contra uma taxa de referência (ex.: taxa média
 * de negativas de toda a base) com teste z de uma proporção.
 */
export function proportionTest(successes: number, n: number, baselineRate: number): ProportionTest {
  const rate = n ? successes / n : 0;
  const ci = wilsonInterval(successes, n);
  let p: number | null = null;
  if (n > 0 && baselineRate > 0 && baselineRate < 1) {
    const se = Math.sqrt((baselineRate * (1 - baselineRate)) / n);
    p = se > 0 ? normalTwoTailed((rate - baselineRate) / se) : null;
  }
  const width = ci.high - ci.low;
  const lowSample = n < 10 || width > 0.4;
  return {
    rate,
    n,
    successes,
    ci,
    p,
    significant: p != null && p < 0.05 && !lowSample,
    lowSample,
  };
}

/** Formata um intervalo 0–1 como percentual pt-BR. */
export const formatCiPct = (ci: Interval | null, digits = 0) =>
  ci ? `${(ci.low * 100).toFixed(digits)}–${(ci.high * 100).toFixed(digits)}%` : "—";

/** Formata um intervalo de correlação (-1 a 1). */
export const formatCiR = (ci: Interval | null) =>
  ci ? `${ci.low.toFixed(2).replace(".", ",")} a ${ci.high.toFixed(2).replace(".", ",")}` : "—";
