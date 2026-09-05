/**
 * Física própria e determinística de Giralata (plano XZ).
 * Passo fixo, integração de posição, arrasto suave, reflexão em círculos,
 * detecção contínua (swept) para portos e locks curtos por contato.
 * Nenhum plugin de física, nenhuma aleatoriedade.
 */
import { CONFIG, type BumperDef, type CoinDef } from "./config";
import {
  add,
  angleInArc,
  dot,
  len,
  normalizeAngle,
  polar,
  reflect,
  scale,
  segmentCircleHit,
  sub,
  v2,
  type Vec2,
} from "./math";

const P = CONFIG.physics;

export interface CapBody {
  pos: Vec2;
  vel: Vec2;
  /** saltou a borda: continua reto até o limite externo */
  escaping: boolean;
  /** relógio local do corpo (s) para os locks de contato */
  time: number;
  /** chave de contato → instante até o qual o evento fica mudo */
  locks: Record<string, number>;
}

export function createCap(pos: Vec2 = v2(), vel: Vec2 = v2()): CapBody {
  return { pos: { ...pos }, vel: { ...vel }, escaping: false, time: 0, locks: {} };
}

export function cloneCap(cap: CapBody): CapBody {
  return { pos: { ...cap.pos }, vel: { ...cap.vel }, escaping: cap.escaping, time: cap.time, locks: { ...cap.locks } };
}

export type CapEvent =
  | { type: "bumper"; index: number; speed: number }
  | { type: "ring"; ring: number }
  | { type: "edge"; escaped: boolean }
  | { type: "out" }
  | { type: "coin"; index: number }
  | { type: "port"; index: number }
  | { type: "stopped" };

export interface StepContext {
  /** tempo da arena (s): governa a rotação de anéis, latas, portos e moedas */
  t: number;
  /** porto que atrai a tampinha (o solicitado) ou null */
  magnetPort: number | null;
  magnetRadius: number;
  magnetStrength: number;
  coinActive: (index: number) => boolean;
}

// ---------------------------------------------------------------------------
// Posições cinéticas (funções puras de t)

export const ringAngle = (ring: number, t: number): number => CONFIG.rings[ring].omega * t;

export const bumperAngle = (b: BumperDef, t: number): number => b.angle + ringAngle(b.ring, t);
export const bumperPosition = (b: BumperDef, t: number): Vec2 => polar(b.orbitRadius, bumperAngle(b, t));

export const portAngle = (index: number, t: number): number => CONFIG.ports[index].angle + ringAngle(2, t);
export const portPosition = (index: number, t: number): Vec2 => polar(CONFIG.PORT_ORBIT, portAngle(index, t));

export const coinAngle = (c: CoinDef, t: number): number => c.phase + c.omega * t;
export const coinPosition = (c: CoinDef, t: number): Vec2 => polar(c.orbitRadius, coinAngle(c, t));

/** Velocidade tangencial de um ponto que orbita a `orbitRadius` com `omega`. */
export function surfaceVelocity(orbitRadius: number, angle: number, omega: number): Vec2 {
  return { x: -omega * orbitRadius * Math.sin(angle), z: omega * orbitRadius * Math.cos(angle) };
}

function unlocked(cap: CapBody, key: string): boolean {
  const until = cap.locks[key] ?? -Infinity;
  if (cap.time < until) return false;
  cap.locks[key] = cap.time + P.CONTACT_LOCK;
  return true;
}

// ---------------------------------------------------------------------------
// Passo de simulação

/**
 * Avança a tampinha um passo `dt` e devolve os eventos ocorridos.
 * Muta apenas `cap`; o mundo decide o que fazer com cada evento.
 */
export function stepCap(cap: CapBody, ctx: StepContext, dt: number = P.STEP): CapEvent[] {
  const events: CapEvent[] = [];
  cap.time += dt;

  // 1. magnetismo do porto solicitado (ajuda a leitura, não decide sozinho)
  if (ctx.magnetPort !== null && !cap.escaping) {
    const target = portPosition(ctx.magnetPort, ctx.t);
    const d = sub(target, cap.pos);
    const dd = len(d);
    if (dd > 1e-4 && dd < ctx.magnetRadius) {
      const k = ctx.magnetStrength * (1 - dd / ctx.magnetRadius);
      cap.vel = add(cap.vel, scale(d, (k * dt) / dd));
    }
  }

  // 2. amortecimento: arrasto linear + atrito de rolamento
  let speed = len(cap.vel);
  if (speed > 0) {
    let ns = speed * Math.max(0, 1 - P.LINEAR_DRAG * dt) - P.ROLLING_FRICTION * dt;
    if (ns < 0) ns = 0;
    cap.vel = scale(cap.vel, ns / speed);
    speed = ns;
  }

  // 3. integração
  const p0 = cap.pos;
  cap.pos = add(cap.pos, scale(cap.vel, dt));

  if (cap.escaping) {
    if (len(cap.pos) > P.OUT_RADIUS) events.push({ type: "out" });
    return events;
  }

  // 4. anéis contrarrotativos (arcos sólidos, aberturas passam)
  for (let r = 0; r < CONFIG.rings.length; r++) {
    const ring = CONFIG.rings[r];
    if (!ring.solid) continue;
    const d = len(cap.pos);
    const band = ring.tube + P.CAP_RADIUS;
    if (d < 1e-6 || Math.abs(d - ring.radius) >= band) continue;
    const theta = Math.atan2(cap.pos.z, cap.pos.x);
    const local = normalizeAngle(theta - ringAngle(r, ctx.t));
    if (!ring.arcs.some(([start, length]) => angleInArc(local, start, length))) continue;
    const radial = scale(cap.pos, 1 / d);
    const inside = d < ring.radius;
    const n = inside ? scale(radial, -1) : radial;
    let v = reflect(cap.vel, n, P.RING_RESTITUTION);
    v = add(v, scale(surfaceVelocity(ring.radius, theta, ring.omega), P.SURFACE_TRANSFER * 0.6));
    cap.vel = v;
    cap.pos = scale(radial, inside ? ring.radius - band - 0.01 : ring.radius + band + 0.01);
    if (unlocked(cap, `ring:${r}`)) events.push({ type: "ring", ring: r });
  }

  // 5. latas-bumper
  for (let i = 0; i < CONFIG.bumpers.length; i++) {
    const b = CONFIG.bumpers[i];
    const c = bumperPosition(b, ctx.t);
    const d = sub(cap.pos, c);
    const dd = len(d);
    const minDist = b.radius + P.CAP_RADIUS;
    if (dd >= minDist) continue;
    const n = dd > 1e-6 ? scale(d, 1 / dd) : v2(1, 0);
    let v = reflect(cap.vel, n, P.BUMPER_RESTITUTION);
    const sv = surfaceVelocity(b.orbitRadius, bumperAngle(b, ctx.t), CONFIG.rings[b.ring].omega);
    v = add(v, scale(sv, P.SURFACE_TRANSFER));
    const s = len(v);
    if (s < P.BUMPER_MIN_EXIT_SPEED) {
      v = s > 1e-6 ? scale(v, P.BUMPER_MIN_EXIT_SPEED / s) : scale(n, P.BUMPER_MIN_EXIT_SPEED);
    }
    cap.vel = v;
    cap.pos = add(c, scale(n, minDist + 0.01));
    if (unlocked(cap, `bumper:${i}`)) events.push({ type: "bumper", index: i, speed: len(v) });
  }

  // 6. borda da lata: ricocheteia, ou salta fora se vier rápido demais
  {
    const d = len(cap.pos);
    if (d > 1e-6 && d + P.CAP_RADIUS > P.EDGE_RADIUS) {
      const radial = scale(cap.pos, 1 / d);
      const outward = dot(cap.vel, radial) > 0;
      if (outward && len(cap.vel) >= P.ESCAPE_SPEED) {
        cap.escaping = true;
        events.push({ type: "edge", escaped: true });
        return events;
      }
      cap.vel = reflect(cap.vel, scale(radial, -1), P.EDGE_RESTITUTION);
      cap.pos = scale(radial, P.EDGE_RADIUS - P.CAP_RADIUS - 0.01);
      if (unlocked(cap, "edge")) events.push({ type: "edge", escaped: false });
    }
  }

  // 7. HopiCoins em órbita
  for (let i = 0; i < CONFIG.coins.length; i++) {
    if (!ctx.coinActive(i)) continue;
    const c = coinPosition(CONFIG.coins[i], ctx.t);
    if (len(sub(cap.pos, c)) < P.CAP_RADIUS + CONFIG.COIN_RADIUS) events.push({ type: "coin", index: i });
  }

  // 8. portos — cruzamento segmentado, não só a posição final do passo
  for (let i = 0; i < CONFIG.ports.length; i++) {
    if (segmentCircleHit(p0, cap.pos, portPosition(i, ctx.t), P.PORT_RADIUS)) {
      events.push({ type: "port", index: i });
      return events;
    }
  }

  // 9. parada
  if (len(cap.vel) < P.STOP_SPEED) events.push({ type: "stopped" });

  return events;
}
