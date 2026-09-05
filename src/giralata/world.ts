/**
 * GiralataWorld — autoridade de estado do minijogo.
 * Controla fases (intro/playing/paused/help/result), timer, entregas,
 * pontos, HopiCoins, Rodopio, moedas em órbita e a tampinha.
 * Não conhece Babylon nem React: a cena lê o mundo, a HUD lê o snapshot.
 */
import { CONFIG, type PortDef } from "./config";
import { add, launchFromDrag, len, lerp, normalize, scale, v2, type Vec2 } from "./math";
import { cloneCap, createCap, portPosition, stepCap, type CapBody, type CapEvent, type StepContext } from "./physics";

export type Phase = "intro" | "playing" | "paused" | "help" | "result";
export type CapState = "ready" | "aiming" | "moving" | "falling" | "resetting";
export type ResultReason = "complete" | "timeout";
export type ToastTone = "info" | "good" | "bad" | "max";
export type DemoName = "giralata" | "giralata-complete";

export interface AimState {
  /** arrasto limitado ao alcance (para desenhar) */
  drag: Vec2;
  /** direção do lançamento (oposta ao arrasto) */
  dir: Vec2;
  power: number;
  speed: number;
  valid: boolean;
}

export interface Toast {
  text: string;
  tone: ToastTone;
}

export interface ResultSnapshot {
  reason: ResultReason;
  points: number;
  coins: number;
  deliveries: number;
  istampiNew: boolean;
  istampiOwned: boolean;
  launches: number;
  bounces: number;
}

/** Snapshot tipado consumido pela HUD React. Objeto estável entre mudanças. */
export interface GiralataSnapshot {
  phase: Phase;
  capState: CapState;
  timeLeft: number;
  timeLabel: string;
  score: number;
  deliveries: number;
  coins: number;
  rodopio: number;
  rodopioMaxActive: boolean;
  rodopioMaxSeconds: number;
  requested: PortDef;
  sequence: PortDef[];
  toast: Toast | null;
  result: ResultSnapshot | null;
  aiming: boolean;
  aimValid: boolean;
  embedded: boolean;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface WorldOptions {
  demo?: string | null;
  embedded?: boolean;
  /** injeção para testes; por omissão usa localStorage quando existir */
  storage?: StorageLike | null;
}

const T = CONFIG.timings;
const PH = CONFIG.physics;

function defaultStorage(): StorageLike | null {
  try {
    const g = globalThis as { localStorage?: StorageLike };
    return g.localStorage ?? null;
  } catch {
    return null;
  }
}

export class GiralataWorld {
  // -------------------------------------------------------------- partida
  phase: Phase = "intro";
  capState: CapState = "ready";
  timeLeft = CONFIG.MATCH_SECONDS;
  score = 0;
  deliveries = 0;
  coins = 0;
  rodopio = 0;
  /** segundos restantes de Rodopio Máximo (0 = inativo) */
  maxWindow = 0;
  /** índice em CONFIG.sequence do porto solicitado */
  requested = 0;
  resultReason: ResultReason | null = null;
  istampiNew = false;
  istampiOwned = false;
  launches = 0;
  bounces = 0;
  lastDelivery: { points: number; coins: number } | null = null;

  // ------------------------------------------------------- mundo cinético
  /** tempo da arena: anéis, latas, portos e moedas giram sempre */
  arenaT = 0;
  cap: CapBody = createCap();
  aim: AimState | null = null;
  preview: Vec2[] = [];
  /** posição de partida do retorno ao centro (a cena interpola) */
  resetFrom: Vec2 = v2();
  resetT = 0;
  fallT = 0;
  /** altura visual da tampinha (negativa ao cair fora da lata) */
  capY = 0;
  coinCollectedAt: Array<number | null> = CONFIG.coins.map(() => null);
  /** relógio que só avança quando o mundo avança (pausa congela toasts) */
  clock = 0;

  readonly embedded: boolean;

  private phaseBeforeOverlay: Phase = "playing";
  private toastState: (Toast & { until: number }) | null = null;
  private accumulator = 0;
  private keyAim: Vec2 | null = null;
  private listeners = new Set<() => void>();
  private snapshot: GiralataSnapshot;
  private snapKey = "";
  private storage: StorageLike | null;

  constructor(opts: WorldOptions = {}) {
    this.embedded = opts.embedded ?? false;
    this.storage = opts.storage === undefined ? defaultStorage() : opts.storage;
    this.istampiOwned = this.readIstampi();
    if (opts.demo) this.applyDemo(opts.demo);
    this.snapshot = this.buildSnapshot();
    this.snapKey = this.computeKey();
  }

  // ============================================================ ciclo
  /** Avança o mundo por `dtSeconds` reais usando substeps fixos. */
  update(dtSeconds: number): void {
    if (this.phase !== "intro" && this.phase !== "playing") return;
    const dt = Math.min(Math.max(dtSeconds, 0), 0.25);
    this.clock += dt;
    this.accumulator += dt;
    let steps = 0;
    while (this.accumulator >= PH.STEP && steps < PH.MAX_SUBSTEPS) {
      this.accumulator -= PH.STEP;
      steps++;
      this.fixedStep(PH.STEP);
      if ((this.phase as Phase) === "result") {
        // sexto porto: interrompe os substeps restantes do mesmo quadro
        this.accumulator = 0;
        break;
      }
    }
    if (steps >= PH.MAX_SUBSTEPS) this.accumulator = 0;
    if (this.toastState && this.clock >= this.toastState.until) this.toastState = null;
    this.sync();
  }

  private fixedStep(dt: number): void {
    this.arenaT += dt;
    if (this.phase !== "playing") return;

    this.timeLeft -= dt;
    if (this.maxWindow > 0) {
      this.maxWindow -= dt;
      if (this.maxWindow <= 0) {
        this.maxWindow = 0;
        this.rodopio = 0;
        this.showToast("RODOPIO ENCERRADO", "info");
      }
    }
    for (let i = 0; i < this.coinCollectedAt.length; i++) {
      const at = this.coinCollectedAt[i];
      if (at !== null && this.arenaT - at >= T.COIN_RESPAWN) this.coinCollectedAt[i] = null;
    }

    switch (this.capState) {
      case "moving":
        this.applyEvents(stepCap(this.cap, this.stepContext(), dt));
        break;
      case "falling":
        this.cap.pos = add(this.cap.pos, scale(this.cap.vel, dt));
        this.fallT += dt;
        this.capY = -6 * this.fallT * this.fallT;
        if (this.fallT >= T.FALL_SECONDS) this.beginReset();
        break;
      case "resetting":
        this.resetT += dt;
        if (this.resetT >= T.RESET_SECONDS) {
          this.capState = "ready";
          this.cap = createCap();
          this.capY = 0;
        }
        break;
      default:
        break;
    }

    if (this.phase === "playing" && this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.finish("timeout");
    }
  }

  stepContext(): StepContext {
    const first = this.deliveries === 0;
    return {
      t: this.arenaT,
      magnetPort: this.requestedPortIndex(),
      magnetRadius: first ? CONFIG.magnet.FIRST_RADIUS : CONFIG.magnet.RADIUS,
      magnetStrength: first ? CONFIG.magnet.FIRST_STRENGTH : CONFIG.magnet.STRENGTH,
      coinActive: (i) => this.coinCollectedAt[i] === null,
    };
  }

  /** Índice (em CONFIG.ports) do porto solicitado. */
  requestedPortIndex(): number {
    const id = CONFIG.sequence[Math.min(this.requested, CONFIG.sequence.length - 1)];
    return CONFIG.ports.findIndex((p) => p.id === id);
  }

  requestedPort(): PortDef {
    return CONFIG.ports[this.requestedPortIndex()];
  }

  /** Aplica eventos da física às regras. Público para testes e demos. */
  applyEvents(events: CapEvent[]): void {
    for (const ev of events) {
      switch (ev.type) {
        case "bumper":
          this.bounces++;
          this.onCleanBounce();
          break;
        case "ring":
          // tabela silenciosa: o próprio ricochete é o feedback
          break;
        case "edge":
          if (ev.escaped) this.leaveArena();
          break;
        case "out":
          this.leaveArena();
          break;
        case "coin":
          if (this.coinCollectedAt[ev.index] === null) {
            this.coinCollectedAt[ev.index] = this.arenaT;
            this.coins += CONFIG.rewards.ARENA_COIN;
            this.showToast("+1 HOPICOIN EM ÓRBITA", "good");
          }
          break;
        case "port":
          if (ev.index === this.requestedPortIndex()) this.deliver();
          else this.wrongPort(ev.index);
          return;
        case "stopped":
          this.showToast("TAMPINHA PAROU · DE VOLTA AO CENTRO", "info");
          this.beginReset();
          return;
      }
      if (this.phase === "result" || this.capState !== "moving") return;
    }
  }

  private onCleanBounce(): void {
    const R = CONFIG.rodopio;
    if (this.maxWindow > 0) {
      this.showToast("RIKOCHE!", "max");
      return;
    }
    if (this.rodopio < R.MAX) this.rodopio++;
    if (this.rodopio >= R.MAX) {
      this.maxWindow = R.WINDOW_SECONDS;
      this.showToast("RODOPIO MÁXIMO · PONTOS ×1,5", "max");
    } else {
      this.showToast(`RIKOCHE! RODOPIO ${this.rodopio}/${R.MAX}`, "good");
    }
  }

  private deliver(): void {
    const RW = CONFIG.rewards;
    const secondsLeft = Math.max(0, Math.ceil(this.timeLeft));
    let points = RW.BASE_POINTS + RW.RODOPIO_POINTS * this.rodopio + RW.TIME_POINTS_PER_SECOND * secondsLeft;
    if (this.maxWindow > 0) points = Math.round(points * CONFIG.rodopio.MULTIPLIER);
    const coins = RW.BASE_COINS + RW.RODOPIO_COINS * this.rodopio;
    this.score += points;
    this.coins += coins;
    this.deliveries++;
    this.lastDelivery = { points, coins };
    if (this.maxWindow <= 0) this.rodopio = 0;
    this.showToast(`ENTREGA ${this.deliveries}/${CONFIG.DELIVERIES_TO_WIN} · +${points} PONTOS`, "good");
    if (this.deliveries >= CONFIG.DELIVERIES_TO_WIN) {
      this.finish("complete");
      return;
    }
    this.requested = this.deliveries;
    this.beginReset();
  }

  private wrongPort(index: number): void {
    this.rodopio = 0;
    this.showToast(`PORTO TROCADO · ERA O ${this.requestedPort().label}`, "bad");
    void index;
    this.beginReset();
  }

  private leaveArena(): void {
    if (this.capState !== "moving") return;
    this.rodopio = 0;
    this.capState = "falling";
    this.fallT = 0;
    this.showToast("FORA DA LATA", "bad");
  }

  private beginReset(): void {
    this.capState = "resetting";
    this.resetT = 0;
    this.resetFrom = { ...this.cap.pos };
    this.cap.vel = v2();
    this.aim = null;
    this.preview = [];
  }

  private finish(reason: ResultReason): void {
    this.resultReason = reason;
    this.cap.vel = v2();
    this.cap.pos = v2();
    this.capY = 0;
    this.capState = "ready";
    this.aim = null;
    this.preview = [];
    this.toastState = null;
    if (reason === "complete") {
      this.istampiOwned = this.readIstampi();
      this.istampiNew = !this.istampiOwned;
      if (this.istampiNew) this.writeIstampi();
      this.istampiOwned = true;
    }
    this.phase = "result";
    this.sync();
  }

  // ============================================================ fases
  private resetMatch(): void {
    this.timeLeft = CONFIG.MATCH_SECONDS;
    this.score = 0;
    this.deliveries = 0;
    this.coins = 0;
    this.rodopio = 0;
    this.maxWindow = 0;
    this.requested = 0;
    this.resultReason = null;
    this.istampiNew = false;
    this.launches = 0;
    this.bounces = 0;
    this.lastDelivery = null;
    this.cap = createCap();
    this.capState = "ready";
    this.capY = 0;
    this.aim = null;
    this.keyAim = null;
    this.preview = [];
    this.accumulator = 0;
    this.coinCollectedAt = CONFIG.coins.map(() => null);
    this.toastState = null;
  }

  /** ISTARTI · GIRAR */
  start(): void {
    this.resetMatch();
    this.phase = "playing";
    this.showToast("PUXE A TAMPINHA PARA MIRAR", "info", 2.6);
    this.sync();
  }

  restart(): void {
    this.start();
  }

  pause(): void {
    if (this.phase !== "playing") return;
    if (this.capState === "aiming") this.cancelAim();
    this.phaseBeforeOverlay = "playing";
    this.phase = "paused";
    this.sync();
  }

  resume(): void {
    if (this.phase !== "paused") return;
    this.phase = "playing";
    this.sync();
  }

  togglePause(): void {
    if (this.phase === "playing") this.pause();
    else if (this.phase === "paused") this.resume();
  }

  /** Pausa automática quando a aba/app perde visibilidade. */
  autoPause(): void {
    if (this.phase === "playing") this.pause();
  }

  openHelp(): void {
    if (this.phase === "help" || this.phase === "result") return;
    if (this.capState === "aiming") this.cancelAim();
    this.phaseBeforeOverlay = this.phase;
    this.phase = "help";
    this.sync();
  }

  /** Fecha a ajuda e devolve o estado exato anterior (o timer estava congelado). */
  closeHelp(): void {
    if (this.phase !== "help") return;
    this.phase = this.phaseBeforeOverlay;
    this.sync();
  }

  backToIntro(): void {
    this.resetMatch();
    this.phase = "intro";
    this.sync();
  }

  /**
   * Botão "voltar" do sistema (Android). Devolve true se o jogo tratou.
   * intro → não trata (o host decide sair).
   */
  back(): boolean {
    switch (this.phase) {
      case "playing":
        this.pause();
        return true;
      case "paused":
      case "result":
        this.backToIntro();
        return true;
      case "help":
        this.closeHelp();
        return true;
      default:
        return false;
    }
  }

  // ============================================================ mira
  canAim(): boolean {
    return this.phase === "playing" && this.capState === "ready";
  }

  beginAim(): void {
    if (!this.canAim()) return;
    this.capState = "aiming";
    this.aim = { drag: v2(), dir: v2(0, 1), power: 0, speed: 0, valid: false };
    this.preview = [];
    this.sync();
  }

  /** `drag` = posição atual do ponteiro menos a posição inicial do toque. */
  updateAim(drag: Vec2): void {
    if (this.capState !== "aiming" || !this.aim) return;
    const launch = launchFromDrag(drag);
    if (launch) {
      this.aim = { drag: launch.drag, dir: launch.dir, power: launch.power, speed: launch.speed, valid: true };
      this.preview = this.computePreview(launch.dir, launch.speed);
    } else {
      const l = len(drag);
      this.aim = {
        drag: { ...drag },
        dir: l > 1e-6 ? scale(drag, -1 / l) : v2(0, 1),
        power: 0,
        speed: 0,
        valid: false,
      };
      this.preview = [];
    }
    this.sync();
  }

  /** Solta: lança se a mira for válida, senão cancela. */
  release(): void {
    if (this.capState !== "aiming" || !this.aim) return;
    if (!this.aim.valid) {
      this.cancelAim();
      return;
    }
    this.cap = createCap(v2(), scale(this.aim.dir, this.aim.speed));
    this.capState = "moving";
    this.launches++;
    this.aim = null;
    this.keyAim = null;
    this.preview = [];
    this.sync();
  }

  cancelAim(): void {
    if (this.capState !== "aiming") return;
    this.capState = "ready";
    this.aim = null;
    this.keyAim = null;
    this.preview = [];
    this.sync();
  }

  /** Setas/WASD: ajustam incrementalmente o vetor de lançamento. */
  nudgeAim(dx: number, dz: number): void {
    if (this.phase !== "playing") return;
    if (this.capState === "ready") this.beginAim();
    if (this.capState !== "aiming") return;
    if (!this.keyAim) this.keyAim = this.defaultKeyAim();
    this.keyAim = add(this.keyAim, scale({ x: dx, z: dz }, CONFIG.launch.KEYBOARD_STEP));
    const l = len(this.keyAim);
    if (l > CONFIG.launch.MAX_DRAG) this.keyAim = scale(this.keyAim, CONFIG.launch.MAX_DRAG / l);
    this.updateAim(scale(this.keyAim, -1));
  }

  /** Enter/Espaço: prepara a mira de teclado ou lança a mira atual. */
  keyboardLaunch(): void {
    if (this.phase !== "playing") return;
    if (this.capState === "ready") {
      this.beginAim();
      this.keyAim = this.defaultKeyAim();
      this.updateAim(scale(this.keyAim, -1));
      return;
    }
    if (this.capState === "aiming") this.release();
  }

  private defaultKeyAim(): Vec2 {
    const L = CONFIG.launch;
    const dir = normalize(portPosition(this.requestedPortIndex(), this.arenaT));
    return scale(dir, L.MIN_DRAG + L.KEYBOARD_DEFAULT_POWER * (L.MAX_DRAG - L.MIN_DRAG));
  }

  /** Trajetória prevista com a mesma física (arena congelada em arenaT). */
  private computePreview(dir: Vec2, speed: number): Vec2[] {
    const L = CONFIG.launch;
    const ghost = createCap(v2(), scale(dir, speed));
    const ctx = this.stepContext();
    const totalSteps = Math.round(L.PREVIEW_SECONDS / PH.STEP);
    const stride = Math.max(1, Math.floor(totalSteps / L.PREVIEW_DOTS));
    const points: Vec2[] = [];
    for (let s = 1; s <= totalSteps; s++) {
      const events = stepCap(ghost, ctx);
      if (s % stride === 0) points.push({ ...ghost.pos });
      if (events.some((e) => e.type === "port" || e.type === "edge" || e.type === "out" || e.type === "stopped")) break;
      if (points.length >= L.PREVIEW_DOTS) break;
    }
    return points;
  }

  /** Posição exibida da tampinha (a cena usa isto, não `cap.pos` direto). */
  displayCapPosition(): Vec2 {
    switch (this.capState) {
      case "aiming":
        if (this.aim) {
          const pull = CONFIG.launch.PULL_BACK_VISUAL * Math.min(1, len(this.aim.drag) / CONFIG.launch.MAX_DRAG);
          return scale(this.aim.dir, -pull);
        }
        return v2();
      case "moving":
      case "falling":
        return this.cap.pos;
      case "resetting": {
        const t = Math.min(1, this.resetT / T.RESET_SECONDS);
        const e = 1 - Math.pow(1 - t, 3);
        return { x: lerp(this.resetFrom.x, 0, e), z: lerp(this.resetFrom.z, 0, e) };
      }
      default:
        return v2();
    }
  }

  // ============================================================ demos
  /** `?demo=giralata` e `?demo=giralata-complete` reproduzem estados fixos. */
  applyDemo(name: string): void {
    if (name === "giralata") {
      this.resetMatch();
      this.phase = "playing";
      this.arenaT = 17;
      this.timeLeft = 43;
      this.score = 3548;
      this.deliveries = 3;
      this.coins = 38;
      this.rodopio = 1;
      this.requested = 3;
      this.launches = 5;
      this.bounces = 4;
      this.showToast("RIKOCHE! RODOPIO 1/3", "good", 60);
    } else if (name === "giralata-complete") {
      this.resetMatch();
      this.arenaT = 17;
      this.timeLeft = 43;
      this.score = 6708;
      this.deliveries = 6;
      this.coins = 72;
      this.launches = 8;
      this.bounces = 9;
      this.requested = 5;
      this.resultReason = "complete";
      this.istampiNew = true;
      this.istampiOwned = true;
      this.phase = "result";
    }
  }

  // ============================================================ snapshot
  private showToast(text: string, tone: ToastTone, seconds: number = T.TOAST_SECONDS): void {
    this.toastState = { text, tone, until: this.clock + seconds };
  }

  get toast(): Toast | null {
    return this.toastState ? { text: this.toastState.text, tone: this.toastState.tone } : null;
  }

  private computeKey(): string {
    return [
      this.phase,
      this.capState,
      Math.ceil(this.timeLeft),
      this.score,
      this.deliveries,
      this.coins,
      this.rodopio,
      Math.ceil(this.maxWindow * 10),
      this.toastState ? `${this.toastState.tone}:${this.toastState.text}` : "",
      this.requested,
      this.resultReason ?? "",
      this.istampiNew,
      this.aim ? (this.aim.valid ? "v" : "i") : "-",
    ].join("|");
  }

  private buildSnapshot(): GiralataSnapshot {
    const s = Math.max(0, Math.ceil(this.timeLeft));
    const seq = CONFIG.sequence.map((id) => CONFIG.ports.find((p) => p.id === id)!);
    return {
      phase: this.phase,
      capState: this.capState,
      timeLeft: this.timeLeft,
      timeLabel: `00:${String(s).padStart(2, "0")}`,
      score: this.score,
      deliveries: this.deliveries,
      coins: this.coins,
      rodopio: this.rodopio,
      rodopioMaxActive: this.maxWindow > 0,
      rodopioMaxSeconds: Math.ceil(this.maxWindow),
      requested: this.requestedPort(),
      sequence: seq,
      toast: this.toast,
      result: this.resultReason
        ? {
            reason: this.resultReason,
            points: this.score,
            coins: this.coins,
            deliveries: this.deliveries,
            istampiNew: this.istampiNew,
            istampiOwned: this.istampiOwned,
            launches: this.launches,
            bounces: this.bounces,
          }
        : null,
      aiming: this.capState === "aiming",
      aimValid: !!this.aim?.valid,
      embedded: this.embedded,
    };
  }

  private sync(): void {
    const key = this.computeKey();
    if (key === this.snapKey) return;
    this.snapKey = key;
    this.snapshot = this.buildSnapshot();
    this.listeners.forEach((l) => l());
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): GiralataSnapshot => this.snapshot;

  /** Liberta ouvintes; a cena e o input são libertados pelos seus módulos. */
  dispose(): void {
    this.listeners.clear();
  }

  // ============================================================ istampi
  private readIstampi(): boolean {
    try {
      return this.storage?.getItem(CONFIG.ISTAMPI_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  }

  private writeIstampi(): void {
    try {
      this.storage?.setItem(CONFIG.ISTAMPI_STORAGE_KEY, "1");
    } catch {
      /* armazenamento indisponível: o Istampi continua válido nesta sessão */
    }
  }

  /** Utilitário para testes: simula um corpo já lançado. */
  debugLaunch(vel: Vec2, pos: Vec2 = v2()): void {
    this.cap = createCap(pos, vel);
    this.capState = "moving";
    this.launches++;
  }

  /** Cópia da tampinha para inspeção em testes. */
  debugCap(): CapBody {
    return cloneCap(this.cap);
  }
}
