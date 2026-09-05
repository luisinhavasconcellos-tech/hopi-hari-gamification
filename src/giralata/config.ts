/**
 * Giralata — Tampinhas em Órbita · configuração central.
 *
 * Tudo o que afeta equilíbrio vive aqui: duração, raios, velocidades dos
 * anéis, força de lançamento, amortecimento, restituições e recompensas.
 * Unidades: metros de arena (1 u ≈ 1 m), segundos e radianos.
 * Nenhum valor é aleatório: a partida é determinística por construção.
 */

export type PortId = "amarelo" | "turquesa" | "lima" | "coral" | "lilas" | "laranja";

export interface PortDef {
  id: PortId;
  label: string;
  color: string;
  /** ângulo inicial na órbita externa (rad); gira com o anel externo */
  angle: number;
}

export interface RingDef {
  name: string;
  radius: number;
  /** raio do tubo do anel */
  tube: number;
  /** velocidade angular (rad/s); sinais alternados = anéis contrarrotativos */
  omega: number;
  color: string;
  /** anel sólido colide com a tampinha; anel decorativo é só trilho */
  solid: boolean;
  /** arcos sólidos [início, comprimento] em rad, no referencial do anel */
  arcs: Array<[start: number, length: number]>;
}

export interface BumperDef {
  orbitRadius: number;
  /** ângulo inicial (rad) — gira junto com o anel indicado */
  angle: number;
  radius: number;
  ring: 0 | 1 | 2;
  color: "amarelo" | "turquesa";
}

export interface CoinDef {
  orbitRadius: number;
  phase: number;
  omega: number;
}

export const COLORS = {
  ceu: "#22B8E8",
  creme: "#FFF3D6",
  cremeEscuro: "#F3E2B8",
  navy: "#14204A",
  coral: "#FF6F61",
  rosa: "#FF7D9C",
  amarelo: "#FFD23F",
  amareloEscuro: "#F5B400",
  turquesa: "#3FD3E4",
  azul: "#2F7BEA",
  cobalto: "#1F4FC9",
  lima: "#B8E63C",
  laranja: "#FF9B2F",
  lilas: "#D6B4F7",
  branco: "#FFFFFF",
  areia: "#EBD9AE",
  grama: "#8CD46B",
  verdeEscuro: "#4FA84A",
  tronco: "#9A6B3F",
  vermelho: "#E8453C",
} as const;

const deg = (d: number): number => (d * Math.PI) / 180;

export const CONFIG = {
  MATCH_SECONDS: 60,
  DELIVERIES_TO_WIN: 6,

  physics: {
    /** passo fixo de simulação (s) */
    STEP: 1 / 120,
    /** limite de substeps por quadro (evita espiral da morte) */
    MAX_SUBSTEPS: 8,
    CAP_RADIUS: 0.34,
    PORT_RADIUS: 0.85,
    /** arrasto linear proporcional à velocidade (1/s) */
    LINEAR_DRAG: 0.42,
    /** atrito de rolamento constante (u/s²) */
    ROLLING_FRICTION: 1.1,
    /** abaixo disto a tampinha "parou" e volta ao centro */
    STOP_SPEED: 0.55,
    BUMPER_RESTITUTION: 0.92,
    RING_RESTITUTION: 0.8,
    EDGE_RESTITUTION: 0.86,
    /** raio da borda da lata (ricocheteia) */
    EDGE_RADIUS: 5.95,
    /** limite externo: além disto é "fora da lata" */
    OUT_RADIUS: 6.4,
    /** velocidade a partir da qual a tampinha salta a borda em vez de ricochetear */
    ESCAPE_SPEED: 12.6,
    /** fração da velocidade de superfície do obstáculo transferida no contato */
    SURFACE_TRANSFER: 0.45,
    /** latas-bumper devolvem pelo menos esta velocidade (feel de pinball) */
    BUMPER_MIN_EXIT_SPEED: 6.5,
    /** lock por contato para não duplicar eventos no mesmo toque (s) */
    CONTACT_LOCK: 0.12,
  },

  launch: {
    /** arrastos menores não disparam (evita lançamento acidental) */
    MIN_DRAG: 0.55,
    /** alcance visual máximo de mira */
    MAX_DRAG: 3.2,
    MIN_SPEED: 7.2,
    MAX_SPEED: 16.8,
    /** distância do centro em que um toque começa a mirar */
    GRAB_RADIUS: 1.7,
    /** incremento de mira por tecla */
    KEYBOARD_STEP: 0.22,
    /** potência inicial da mira de teclado (0..1) */
    KEYBOARD_DEFAULT_POWER: 0.55,
    /** previsão de trajetória (linha pontilhada) */
    PREVIEW_SECONDS: 1.15,
    PREVIEW_DOTS: 16,
    /** quanto a tampinha recua visualmente ao puxar */
    PULL_BACK_VISUAL: 0.9,
  },

  magnet: {
    /** a primeira entrega usa magnetismo maior */
    FIRST_RADIUS: 1.9,
    FIRST_STRENGTH: 26,
    RADIUS: 1.25,
    STRENGTH: 14,
  },

  rodopio: {
    MAX: 3,
    WINDOW_SECONDS: 6,
    /** multiplicador de PONTOS durante Rodopio Máximo (nunca de HopiCoins) */
    MULTIPLIER: 1.5,
  },

  rewards: {
    BASE_POINTS: 640,
    RODOPIO_POINTS: 150,
    TIME_POINTS_PER_SECOND: 4,
    BASE_COINS: 8,
    RODOPIO_COINS: 2,
    ARENA_COIN: 1,
  },

  timings: {
    RESET_SECONDS: 0.55,
    FALL_SECONDS: 0.7,
    TOAST_SECONDS: 1.7,
    COIN_RESPAWN: 9,
  },

  PORT_ORBIT: 5.05,
  COIN_RADIUS: 0.28,

  rings: [
    {
      name: "interno",
      radius: 1.75,
      tube: 0.15,
      omega: 0.55,
      color: COLORS.coral,
      solid: true,
      arcs: [
        [0.0, deg(72)],
        [deg(120), deg(72)],
        [deg(240), deg(72)],
      ],
    },
    {
      name: "intermediário",
      radius: 3.5,
      tube: 0.15,
      omega: -0.42,
      color: COLORS.amarelo,
      solid: true,
      arcs: [
        [deg(17), deg(57)],
        [deg(107), deg(57)],
        [deg(197), deg(57)],
        [deg(287), deg(57)],
      ],
    },
    {
      name: "externo",
      radius: 5.05,
      tube: 0.15,
      omega: 0.3,
      color: COLORS.azul,
      solid: false,
      arcs: [[0, Math.PI * 2]],
    },
  ] as RingDef[],

  bumpers: [
    { orbitRadius: 2.7, angle: 0.35, radius: 0.62, ring: 1, color: "amarelo" },
    { orbitRadius: 2.7, angle: 2.45, radius: 0.62, ring: 1, color: "turquesa" },
    { orbitRadius: 2.7, angle: 4.55, radius: 0.62, ring: 1, color: "amarelo" },
    { orbitRadius: 4.3, angle: 1.0, radius: 0.62, ring: 2, color: "turquesa" },
    { orbitRadius: 4.3, angle: 4.14, radius: 0.62, ring: 2, color: "amarelo" },
  ] as BumperDef[],

  ports: [
    { id: "amarelo", label: "AMARELO", color: COLORS.amarelo, angle: deg(-90) },
    { id: "turquesa", label: "TURQUESA", color: COLORS.turquesa, angle: deg(-30) },
    { id: "lima", label: "LIMA", color: COLORS.lima, angle: deg(30) },
    { id: "coral", label: "CORAL", color: COLORS.coral, angle: deg(90) },
    { id: "lilas", label: "LILÁS", color: COLORS.lilas, angle: deg(150) },
    { id: "laranja", label: "LARANJA", color: COLORS.laranja, angle: deg(210) },
  ] as PortDef[],

  coins: [
    { orbitRadius: 2.6, phase: 0.0, omega: 0.5 },
    { orbitRadius: 2.6, phase: Math.PI, omega: 0.5 },
    { orbitRadius: 4.3, phase: 1.2, omega: -0.28 },
    { orbitRadius: 4.3, phase: 3.3, omega: -0.28 },
    { orbitRadius: 4.3, phase: 5.4, omega: -0.28 },
    { orbitRadius: 1.2, phase: 0.6, omega: 0.9 },
    { orbitRadius: 3.9, phase: 2.0, omega: 0.22 },
    { orbitRadius: 3.9, phase: 5.1, omega: 0.22 },
  ] as CoinDef[],

  /** sequência determinística de portos (onboarding, QA e comparação) */
  sequence: ["amarelo", "turquesa", "lima", "coral", "lilas", "laranja"] as PortId[],

  ISTAMPI_STORAGE_KEY: "hopiplay.istampi.giralata",
};

export type GiralataConfig = typeof CONFIG;

export const PORT_INDEX_BY_ID: Record<PortId, number> = CONFIG.ports.reduce(
  (acc, p, i) => {
    acc[p.id] = i;
    return acc;
  },
  {} as Record<PortId, number>
);
