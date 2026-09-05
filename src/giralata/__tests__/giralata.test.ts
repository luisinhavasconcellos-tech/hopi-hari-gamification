import { describe, expect, it } from "vitest";
import { CONFIG } from "../config";
import { launchFromDrag, reflect, segmentCircleHit, v2 } from "../math";
import { createCap, portPosition, stepCap, type StepContext } from "../physics";
import { GiralataWorld } from "../world";

const ctx = (t = 0): StepContext => ({
  t,
  magnetPort: null,
  magnetRadius: 0,
  magnetStrength: 0,
  coinActive: () => false,
});

describe("mira: direção e potência", () => {
  it("lança na direção oposta ao arrasto, dentro da faixa de velocidade", () => {
    const l = launchFromDrag(v2(0, -2));
    expect(l).not.toBeNull();
    expect(l!.dir.x).toBeCloseTo(0);
    expect(l!.dir.z).toBeCloseTo(1);
    expect(l!.speed).toBeGreaterThanOrEqual(CONFIG.launch.MIN_SPEED);
    expect(l!.speed).toBeLessThanOrEqual(CONFIG.launch.MAX_SPEED);
  });

  it("ignora arrastos curtos e satura no alcance máximo", () => {
    expect(launchFromDrag(v2(0.2, 0.1))).toBeNull();
    const max = launchFromDrag(v2(9, 0));
    expect(max!.speed).toBeCloseTo(CONFIG.launch.MAX_SPEED);
    expect(max!.power).toBeCloseTo(1);
    const min = launchFromDrag(v2(CONFIG.launch.MIN_DRAG, 0));
    expect(min!.speed).toBeCloseTo(CONFIG.launch.MIN_SPEED);
  });
});

describe("cruzamento rápido de porto (swept)", () => {
  it("regista o porto mesmo quando a tampinha atravessa em um único passo", () => {
    const port = portPosition(0, 0);
    // começa antes do porto e termina depois dele: nenhuma das pontas está dentro
    const p0 = v2(port.x, port.z - 2);
    const p1 = v2(port.x, port.z + 2);
    expect(segmentCircleHit(p0, p1, port, CONFIG.physics.PORT_RADIUS)).toBe(true);
    expect(segmentCircleHit(v2(port.x + 3, port.z - 2), v2(port.x + 3, port.z + 2), port, CONFIG.physics.PORT_RADIUS)).toBe(false);

    const cap = createCap(p0, v2(0, 40));
    const events = stepCap(cap, ctx(0), 0.1); // desloca 4 u num passo grande
    expect(events.some((e) => e.type === "port" && e.index === 0)).toBe(true);
  });
});

describe("reflexão", () => {
  it("inverte a componente normal com a restituição pedida", () => {
    const r = reflect(v2(3, -4), v2(0, 1), 1);
    expect(r.x).toBeCloseTo(3);
    expect(r.z).toBeCloseTo(4);
    const damped = reflect(v2(3, -4), v2(0, 1), 0.5);
    expect(damped.z).toBeCloseTo(2);
    // já se afasta: não altera
    const away = reflect(v2(1, 2), v2(0, 1), 0.9);
    expect(away).toEqual({ x: 1, z: 2 });
  });

  it("uma lata-bumper devolve a tampinha com energia mínima", () => {
    const t = 0;
    const b = CONFIG.bumpers[0];
    const angle = b.angle;
    const center = { x: b.orbitRadius * Math.cos(angle), z: b.orbitRadius * Math.sin(angle) };
    // tampinha encostada por dentro da órbita, indo para o centro da lata
    const dir = { x: Math.cos(angle), z: Math.sin(angle) };
    const start = { x: center.x - dir.x * (b.radius + CONFIG.physics.CAP_RADIUS + 0.05), z: center.z - dir.z * (b.radius + CONFIG.physics.CAP_RADIUS + 0.05) };
    const cap = createCap(start, { x: dir.x * 8, z: dir.z * 8 });
    const events = stepCap(cap, ctx(t));
    expect(events.some((e) => e.type === "bumper")).toBe(true);
    const speed = Math.hypot(cap.vel.x, cap.vel.z);
    expect(speed).toBeGreaterThanOrEqual(CONFIG.physics.BUMPER_MIN_EXIT_SPEED - 1e-6);
    // afastou-se da lata
    expect(cap.vel.x * dir.x + cap.vel.z * dir.z).toBeLessThan(0);
  });
});

describe("Rodopio", () => {
  it("satura em três segmentos e ativa a janela de Rodopio Máximo", () => {
    const w = new GiralataWorld({ storage: null });
    w.start();
    w.debugLaunch(v2(0, 10));
    for (let i = 0; i < 5; i++) w.applyEvents([{ type: "bumper", index: i % 3, speed: 9 }]);
    expect(w.rodopio).toBe(CONFIG.rodopio.MAX);
    expect(w.maxWindow).toBeCloseTo(CONFIG.rodopio.WINDOW_SECONDS);
    // porto trocado zera o Rodopio
    w.maxWindow = 0;
    w.debugLaunch(v2(0, 10));
    const wrong = (w.requestedPortIndex() + 1) % CONFIG.ports.length;
    w.applyEvents([{ type: "port", index: wrong }]);
    expect(w.rodopio).toBe(0);
    expect(w.deliveries).toBe(0);
    expect(w.capState).toBe("resetting");
  });
});

describe("pontos vs HopiCoins", () => {
  const deliverWith = (maxActive: boolean) => {
    const w = new GiralataWorld({ storage: null });
    w.start();
    w.timeLeft = 50;
    w.rodopio = 2;
    w.maxWindow = maxActive ? 4 : 0;
    w.debugLaunch(v2(0, 10));
    w.applyEvents([{ type: "port", index: w.requestedPortIndex() }]);
    return w;
  };

  it("o multiplicador de Rodopio Máximo afeta pontos, nunca HopiCoins", () => {
    const normal = deliverWith(false);
    const boosted = deliverWith(true);
    const RW = CONFIG.rewards;
    const base = RW.BASE_POINTS + RW.RODOPIO_POINTS * 2 + RW.TIME_POINTS_PER_SECOND * 50;
    expect(normal.score).toBe(base);
    expect(boosted.score).toBe(Math.round(base * CONFIG.rodopio.MULTIPLIER));
    expect(normal.coins).toBe(RW.BASE_COINS + RW.RODOPIO_COINS * 2);
    expect(boosted.coins).toBe(normal.coins);
    expect(normal.deliveries).toBe(1);
    expect(normal.requestedPort().id).toBe(CONFIG.sequence[1]);
  });

  it("a sexta entrega congela a partida em 6/6 e concede o Istampi uma vez", () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    const w = new GiralataWorld({ storage });
    w.start();
    for (let i = 0; i < CONFIG.DELIVERIES_TO_WIN; i++) {
      w.debugLaunch(v2(0, 10));
      w.applyEvents([{ type: "port", index: w.requestedPortIndex() }]);
    }
    expect(w.phase).toBe("result");
    expect(w.deliveries).toBe(6);
    expect(w.getSnapshot().result?.istampiNew).toBe(true);
    // avança o mundo: nada muda depois do resultado
    w.update(0.5);
    expect(w.deliveries).toBe(6);
    expect(w.debugCap().vel).toEqual({ x: 0, z: 0 });

    const again = new GiralataWorld({ storage });
    again.start();
    for (let i = 0; i < CONFIG.DELIVERIES_TO_WIN; i++) {
      again.debugLaunch(v2(0, 10));
      again.applyEvents([{ type: "port", index: again.requestedPortIndex() }]);
    }
    expect(again.getSnapshot().result?.istampiNew).toBe(false);
    expect(again.getSnapshot().result?.istampiOwned).toBe(true);
  });
});
