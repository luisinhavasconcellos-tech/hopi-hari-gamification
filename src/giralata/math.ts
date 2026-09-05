/** Vetores 2D no plano XZ da arena e utilidades geométricas determinísticas. */
import { CONFIG } from "./config";

export interface Vec2 {
  x: number;
  z: number;
}

export const v2 = (x = 0, z = 0): Vec2 => ({ x, z });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, z: a.z + b.z });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, z: a.z - b.z });
export const scale = (a: Vec2, k: number): Vec2 => ({ x: a.x * k, z: a.z * k });
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.z * b.z;
export const len = (a: Vec2): number => Math.hypot(a.x, a.z);
export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.z - b.z);
export const polar = (r: number, angle: number): Vec2 => ({ x: r * Math.cos(angle), z: r * Math.sin(angle) });
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function normalize(a: Vec2): Vec2 {
  const l = len(a);
  return l > 1e-9 ? { x: a.x / l, z: a.z / l } : { x: 0, z: 1 };
}

/** Normaliza para [0, 2π). */
export function normalizeAngle(a: number): number {
  const tau = Math.PI * 2;
  let r = a % tau;
  if (r < 0) r += tau;
  return r;
}

/** `theta` cai dentro do arco que começa em `start` e mede `length` rad? */
export function angleInArc(theta: number, start: number, length: number): boolean {
  return normalizeAngle(theta - start) <= length;
}

/**
 * Reflexão de `v` contra uma superfície de normal unitária `n`
 * (apontando da superfície para o corpo). Se o corpo já se afasta, não altera.
 */
export function reflect(v: Vec2, n: Vec2, restitution: number): Vec2 {
  const vn = dot(v, n);
  if (vn >= 0) return { x: v.x, z: v.z };
  const k = (1 + restitution) * vn;
  return { x: v.x - k * n.x, z: v.z - k * n.z };
}

/**
 * Integração swept: o segmento p0→p1 chega a menos de `r` do centro `c`?
 * Garante que uma tampinha rápida não atravesse um porto sem registro.
 */
export function segmentCircleHit(p0: Vec2, p1: Vec2, c: Vec2, r: number): boolean {
  const d = sub(p1, p0);
  const f = sub(p0, c);
  const dd = dot(d, d);
  let t = 0;
  if (dd > 1e-12) t = Math.min(1, Math.max(0, -dot(f, d) / dd));
  const closest = add(p0, scale(d, t));
  return dist(closest, c) <= r;
}

export interface Launch {
  /** direção unitária do lançamento (oposta ao arrasto) */
  dir: Vec2;
  speed: number;
  /** 0..1 */
  power: number;
  /** arrasto limitado ao alcance máximo (para desenhar a mira) */
  drag: Vec2;
}

/** Converte o vetor de arrasto em lançamento invertido, com potência limitada. */
export function launchFromDrag(drag: Vec2, cfg = CONFIG.launch): Launch | null {
  const d = len(drag);
  if (d < cfg.MIN_DRAG) return null;
  const clamped = Math.min(d, cfg.MAX_DRAG);
  const power = (clamped - cfg.MIN_DRAG) / (cfg.MAX_DRAG - cfg.MIN_DRAG);
  const speed = cfg.MIN_SPEED + power * (cfg.MAX_SPEED - cfg.MIN_SPEED);
  return { dir: scale(drag, -1 / d), speed, power, drag: scale(drag, clamped / d) };
}
