import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useGame } from "../state";
import { USER_POS, ZONES, formatCoins } from "../data";
import parkmap from "../assets/map/parkmap.webp";
import { Confetti } from "../components/Confetti";
import { CameraIcon, CheckIcon, CoinIcon, StarIcon } from "../components/Icons";
import {
  HARI_ORB_IMG,
  THROW_QUALITY,
  TURMA,
  TURMA_BY_ID,
  TURMA_NEAR,
  TURMA_RARITY,
  catches,
  throwQuality,
  type ThrowQuality,
  type TurmaId,
  type TurmaMonster,
  type catchGain,
} from "./data";
import "./hunt.css";

// Caça à Turma (AR) — zoomed park map with the monsters around the visitor,
// then the camera scene: a target ring shrinks around the monster and the
// visitor taps the Hari Orb. The ring size at the tap decides the throw
// (Bom ×1, Ótimo ×1,5, Perfeito ×2). Épico/Lendário can break free on a
// "Bom" throw; the next throw at the same monster always catches.

type View = "mapa" | "camera" | "captura" | "result";
type Gain = ReturnType<typeof catchGain>;

// Zoomed map layer: the 2000x993 park map drawn 1400px wide, with the visitor
// centred horizontally and a little below the middle of the frame.
const MAP_W = 1400;
const MAP_H = (1400 * 993) / 2000;
const USER_TOP = 68; // % of the frame height
const FIG_SCALE = 0.58; // figure height on the zoomed map vs the 1536px board
const FAR: TurmaId[] = TURMA.filter((m) => !TURMA_NEAR.includes(m.id)).map((m) => m.id);

const FLIGHT_MS = 950; // orb in the air
const STAR_MS = [700, 1400, 2100]; // stars light up after each wobble
const ESCAPE_MS = 2100; // breaks free after 2 stars
const CATCH_MS = 2700; // locked after 3 stars

const reducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

const art = (m: TurmaMonster, upper = false) => (upper ? m.art.toUpperCase() : m.art);
const caughtWord = (m: TurmaMonster) => (m.art === "a" ? "apanhada" : "apanhado");
const orbsLabel = (n: number) =>
  n <= 0 ? "Sem Hari Orbs" : n === 1 ? "Resta 1 Hari Orb" : `Restam ${n} Hari Orbs`;

function firstUncaught(caught: TurmaId[], fallback: TurmaId): TurmaId {
  return (
    TURMA_NEAR.find((id) => !caught.includes(id)) ??
    TURMA.find((m) => !caught.includes(m.id))?.id ??
    fallback
  );
}

/** Current scale of the shrinking ring, read from the live CSS animation. */
function ringScaleNow(el: HTMLElement | null, t0: number, seconds: number): number {
  if (el) {
    const m = getComputedStyle(el).transform.match(/^matrix\(\s*([-\d.e]+)/);
    const a = m ? parseFloat(m[1]) : NaN;
    if (Number.isFinite(a) && a > 0) return a;
  }
  const dur = seconds * 1000;
  return 1 - 0.7 * (((performance.now() - t0) % dur) / dur);
}

export function TurmaHunt({
  onBack,
  startWith,
  onTakeHome,
}: {
  onBack: () => void;
  startWith?: TurmaId;
  onTakeHome: (id: TurmaId) => void;
}) {
  const game = useGame();
  const [view, setView] = useState<View>("mapa");
  const [sel, setSel] = useState<TurmaId>(() => startWith ?? firstUncaught(game.turmaCaught, "azuri"));
  const [throwing, setThrowing] = useState(false);
  const [quality, setQuality] = useState<ThrowQuality>("otimo");
  const [lit, setLit] = useState(0);
  const [locked, setLocked] = useState(false);
  const [toast, setToast] = useState<{ title: string; sub?: string } | null>(null);
  const [encounter, setEncounter] = useState(0); // remounts the ring + monster pop
  const [result, setResult] = useState<{ id: TurmaId; q: ThrowQuality; gain: Gain } | null>(null);

  const timers = useRef<number[]>([]);
  const busy = useRef(false); // an orb is on its way (guards double taps)
  const toastTimer = useRef<number | undefined>(undefined);
  const ringEl = useRef<HTMLSpanElement | null>(null);
  const ringT0 = useRef(0);
  const orbBtn = useRef<HTMLButtonElement | null>(null);
  const monEl = useRef<HTMLImageElement | null>(null);
  const cardEl = useRef<HTMLElement | null>(null);
  const farEl = useRef<HTMLElement | null>(null);
  const [throwDy, setThrowDy] = useState(-240);
  // Stable callback: runs only when a ring mounts (its animation starts then).
  const ringRef = useCallback((el: HTMLSpanElement | null) => {
    if (el) ringT0.current = performance.now();
    ringEl.current = el;
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current = timers.current.filter((t) => t !== id);
      fn();
    }, ms);
    timers.current.push(id);
  }, []);
  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    busy.current = false;
    window.clearTimeout(toastTimer.current);
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const showToast = useCallback((t: { title: string; sub?: string } | null) => {
    window.clearTimeout(toastTimer.current);
    setToast(t);
    if (t) toastTimer.current = window.setTimeout(() => setToast(null), 3800);
  }, []);

  const m = TURMA_BY_ID[sel];
  const r = TURMA_RARITY[m.rarity];
  const isCaught = game.turmaCaught.includes(sel);
  const orbs = game.orbs;

  // Keyboard/screen-reader users land on the orb whenever it is ready again.
  useEffect(() => {
    if (view === "camera" && !throwing) orbBtn.current?.focus({ preventScroll: true });
  }, [view, throwing]);

  // ---------------------------------------------------------------- actions
  const pick = (id: TurmaId, scroll = false) => {
    setSel(id);
    if (scroll) cardEl.current?.scrollIntoView({ block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
  };

  const openCamera = () => {
    if (isCaught) return;
    clearTimers();
    setThrowing(false);
    setLit(0);
    setLocked(false);
    setToast(null);
    setEncounter((e) => e + 1);
    setView("camera");
  };

  const flee = () => {
    if (throwing) return; // no running away with the orb in the air
    clearTimers();
    setToast(null);
    setView("mapa");
  };

  const throwOrb = () => {
    if (view !== "camera" || throwing || busy.current || orbs <= 0) return;
    const q = throwQuality(ringScaleNow(ringEl.current, ringT0.current, r.ringSeconds));
    if (!game.spendOrb()) return;
    busy.current = true;
    const id = sel;
    const caught = catches(id, q, game.turmaEscaped.includes(id));
    const orbsLeft = orbs - 1;

    // Fly from the orb button to the middle of the monster.
    const o = orbBtn.current?.getBoundingClientRect();
    const t = monEl.current?.getBoundingClientRect();
    if (o && t) setThrowDy(Math.round(t.top + t.height * 0.5 - (o.top + o.height / 2)));

    showToast(null);
    setQuality(q);
    setThrowing(true);
    later(() => {
      setLit(0);
      setLocked(false);
      setView("captura");
    }, FLIGHT_MS);
    STAR_MS.slice(0, caught ? 3 : 2).forEach((ms, i) => later(() => setLit(i + 1), FLIGHT_MS + ms));
    if (caught) {
      later(() => setLocked(true), FLIGHT_MS + STAR_MS[2]);
      later(() => {
        const gain = game.catchTurma(id, q);
        busy.current = false;
        setResult({ id, q, gain });
        setThrowing(false);
        setView("result");
      }, FLIGHT_MS + CATCH_MS);
    } else {
      later(() => {
        const mon = TURMA_BY_ID[id];
        game.markEscaped(id);
        busy.current = false;
        setThrowing(false);
        setEncounter((e) => e + 1);
        setView("camera");
        showToast({
          title: `${art(mon, true)} ${mon.name} escapou da Hari Orb!`,
          sub: orbsLeft > 0 ? "Tenta outra vez." : undefined,
        });
      }, FLIGHT_MS + ESCAPE_MS);
    }
  };

  const keepHunting = () => {
    clearTimers();
    const caught = result ? [...game.turmaCaught, result.id] : game.turmaCaught;
    setSel(firstUncaught(caught, sel));
    setResult(null);
    setThrowing(false);
    setView("mapa");
  };

  // ---------------------------------------------------------------- views
  if (view === "result" && result) {
    return (
      <HuntResult
        id={result.id}
        q={result.q}
        gain={result.gain}
        onTakeHome={() => onTakeHome(result.id)}
        onKeepHunting={keepHunting}
      />
    );
  }

  if (view === "camera" || view === "captura") {
    const q = THROW_QUALITY[quality];
    return (
      <div className="th-scene" style={{ ["--ring" as string]: r.ring }}>
        <ParkScene />

        {view === "camera" && (
          <>
            <div className="th-cam-shadow" aria-hidden="true" />
            <div className="th-cam-mon">
              <img
                key={encounter}
                ref={monEl}
                src={m.img}
                alt={m.alt}
                draggable={false}
                className={`th-mon ${throwing ? "shake" : encounter > 1 ? "back" : ""}`}
              />
            </div>
            {!throwing && orbs > 0 && (
              <div className="th-ring" aria-hidden="true" key={`ring-${encounter}`}>
                <span className="th-ring-base" />
                <span className="th-ring-sweet" />
                <span
                  className="th-ring-live"
                  ref={ringRef}
                  style={{ animationDuration: `${r.ringSeconds}s` }}
                />
              </div>
            )}
            {throwing && (
              <div className="th-qlabel" aria-live="assertive">
                <span className="th-outline">{q.label}!</span>
              </div>
            )}
            <div className="th-hint">
              <span>
                {orbs <= 0
                  ? "Sem Hari Orbs. Ganha mais nas missões."
                  : "Toca na Hari Orb quando o anel encolher"}
              </span>
            </div>
            <button
              ref={orbBtn}
              type="button"
              className={`th-orb-btn ${throwing ? "flying" : ""}`}
              style={{ ["--dy" as string]: `${throwDy}px` }}
              onClick={throwOrb}
              disabled={orbs <= 0 || throwing}
              aria-label={orbs <= 0 ? "Hari Orb indisponível: não tens Hari Orbs" : "Lançar a Hari Orb"}
            >
              <img src={HARI_ORB_IMG} alt="" draggable={false} />
            </button>
            <span className={`th-orb-count ${orbs <= 0 ? "empty" : ""}`}>{orbsLabel(orbs)}</span>
          </>
        )}

        {view === "captura" && (
          <div className="th-captura">
            <span className="th-flash" aria-hidden="true" />
            <div className="th-captura-head" role="status">
              <strong className="th-outline">{locked ? "Já está!" : "Segura firme…"}</strong>
              <span className="th-qchip">
                Lançamento {q.label} ×{q.multLabel}
              </span>
            </div>
            <div className="th-ground-shadow" aria-hidden="true" />
            <img
              className={`th-wobble ${locked ? "locked" : ""}`}
              src={HARI_ORB_IMG}
              alt={`Hari Orb com a bandeira do Hopi Hari a balançar no chão, com ${art(m)} ${m.name} lá dentro`}
              draggable={false}
            />
            {locked && <span className="th-lock-burst" aria-hidden="true" />}
            <div className="th-stars" aria-label={`${lit} de 3 estrelas`} role="img">
              {[0, 1, 2].map((i) => (
                <span key={i} className={`th-star ${lit > i ? "on" : ""}`}>
                  <StarIcon size={30} />
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="th-toast" role="status" aria-live="polite">
          {toast && view === "camera" && !throwing && (
            <span key={encounter}>
              <strong>{toast.title}</strong>
              {toast.sub && <small> {toast.sub}</small>}
            </span>
          )}
        </div>

        <div className="th-hud">
          {view === "camera" ? (
            <button
              type="button"
              className="th-flee"
              onClick={flee}
              disabled={throwing}
              aria-label="Fugir e voltar ao mapa"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          ) : (
            <span className="th-flee-ph" aria-hidden="true" />
          )}
          <div className="th-plate">
            <img src={m.img} alt="" style={{ background: m.colors.tint }} />
            <div>
              <strong>{m.name}</strong>
              <small>
                <i style={{ background: r.ring }} />
                {r.label} · {formatCoins(r.points)} pts
              </small>
            </div>
          </div>
          <span className="th-hud-orbs" aria-label={orbsLabel(orbs)}>
            <img src={HARI_ORB_IMG} alt="" />
            {orbs}
          </span>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- mapa
  const caughtCount = game.turmaCaught.length;
  const farLeft = FAR.filter((id) => !game.turmaCaught.includes(id)).length;
  const layer: CSSProperties = {
    width: MAP_W,
    height: MAP_H,
    left: `calc(50% - ${(USER_POS.x / 100) * MAP_W}px)`,
    top: `calc(${USER_TOP}% - ${(USER_POS.y / 100) * MAP_H}px)`,
  };

  return (
    <div className="screen th-map-screen">
      <div className="th-top">
        <button type="button" className="th-back" onClick={onBack} aria-label="Voltar à Turma">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <div className="th-top-chips">
          <span className="th-chip" aria-label={`${formatCoins(game.coins)} Hari Coins`}>
            <CoinIcon size={20} />
            {formatCoins(game.coins)}
          </span>
          <span className="th-chip" aria-label={orbsLabel(orbs)}>
            <img src={HARI_ORB_IMG} alt="" />
            {orbs}
          </span>
        </div>
      </div>

      <header className="th-head">
        <span className="screen-kicker">Caça à Turma · AR</span>
        <h1>Monstros por perto</h1>
        <p>
          Apanhados: <strong>{caughtCount} de {TURMA.length}</strong> · {orbsLabel(orbs)}
        </p>
      </header>

      <div className="th-map">
        <div className="th-map-layer" style={layer}>
          <img src={parkmap} alt="" className="th-map-img" draggable={false} />
          <span className="th-you" style={{ left: `${USER_POS.x}%`, top: `${USER_POS.y}%` }} aria-hidden="true">
            <span className="th-you-pulse" />
            <span className="th-you-dot" />
          </span>
          {TURMA_NEAR.map((id) => {
            const mm = TURMA_BY_ID[id];
            const rr = TURMA_RARITY[mm.rarity];
            const got = game.turmaCaught.includes(id);
            const active = id === sel;
            return (
              <button
                key={id}
                type="button"
                className={`th-fig ${got ? "got" : ""} ${active ? "sel" : ""}`}
                style={{
                  left: `${mm.map.x}%`,
                  top: `${mm.map.y}%`,
                  ["--ring" as string]: rr.ring,
                  ["--ring-bg" as string]: hexA(rr.ring, 0.3),
                  zIndex: Math.round(mm.map.y * 10),
                }}
                aria-pressed={active}
                aria-label={`${mm.name}, ${rr.label.toLowerCase()}, ${rr.points} pontos${got ? `, já ${caughtWord(mm)}` : ""}`}
                onClick={() => pick(id)}
              >
                <span className="th-fig-spot" />
                <img src={mm.img} alt="" draggable={false} style={{ height: Math.round(mm.map.h * FIG_SCALE) }} />
                {active && <span className="th-fig-name">{mm.name}</span>}
                {got && (
                  <span className="th-fig-check">
                    <CheckIcon size={12} color="#fff" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <span className="th-map-tint" aria-hidden="true" />
        <p className="th-sr">
          Mapa do parque aproximado à tua volta, entre Infantasia, Kaminda Mundi e Wild West.
        </p>
        {farLeft > 0 && (
          <button
            type="button"
            className="th-farchip"
            onClick={() => farEl.current?.scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" })}
          >
            <span>
              Mais {farLeft} {farLeft === 1 ? "monstro" : "monstros"} pelo parque
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
          </button>
        )}
        <div className="th-legend" aria-hidden="true">
          {(["comum", "raro", "epico", "lendario"] as const).map((k) => (
            <span key={k}>
              <i style={{ background: TURMA_RARITY[k].ring }} />
              {TURMA_RARITY[k].label}
            </span>
          ))}
        </div>
      </div>

      <section className="th-card" ref={cardEl} aria-live="polite" aria-label={`${m.name} selecionado`}>
        <div className="th-card-row">
          <img className="th-avatar" src={m.img} alt="" style={{ background: m.colors.tint, borderColor: r.ring }} />
          <div className="th-card-info">
            <div className="th-card-name">
              <strong>{m.name}</strong>
              <span className="th-pill" style={{ background: r.tint, color: r.ink }}>
                {r.label}
              </span>
            </div>
            <span className="th-card-where">
              {ZONES[m.zone].name} · {m.walk.meters} m
            </span>
          </div>
          <div className="th-card-pts">
            <strong>{formatCoins(r.points)}</strong>
            <small>pontos</small>
          </div>
        </div>
        <button
          type="button"
          className={`btn-primary btn-block th-cta ${isCaught ? "done" : ""}`}
          disabled={isCaught}
          onClick={openCamera}
          aria-label={isCaught ? `Abrir câmara e apanhar: indisponível, ${art(m)} ${m.name} já está na tua Turma` : undefined}
        >
          {isCaught ? <CheckIcon size={16} /> : <CameraIcon size={19} />}
          {isCaught ? `${art(m, true)} ${m.name} já está na tua Turma` : "Abrir câmara e apanhar"}
        </button>
      </section>

      <section className="th-far" ref={farEl} aria-labelledby="th-far-title">
        <div className="th-far-head">
          <h2 id="th-far-title">Pelo parque</h2>
          <small>Mais longe daqui, mas também se apanham</small>
        </div>
        <div className="th-far-list">
          {FAR.map((id) => {
            const mm = TURMA_BY_ID[id];
            const rr = TURMA_RARITY[mm.rarity];
            const got = game.turmaCaught.includes(id);
            return (
              <button
                key={id}
                type="button"
                className={`th-far-item ${id === sel ? "sel" : ""} ${got ? "got" : ""}`}
                aria-pressed={id === sel}
                aria-label={`${mm.name}, ${rr.label.toLowerCase()}, ${ZONES[mm.zone].name}, ${mm.walk.meters} metros${got ? `, já ${caughtWord(mm)}` : ""}`}
                onClick={() => pick(id, true)}
              >
                <span className="th-far-av" style={{ borderColor: rr.ring, background: mm.colors.tint }}>
                  <img src={mm.img} alt="" draggable={false} />
                  {got && (
                    <span className="th-far-check">
                      <CheckIcon size={10} color="#fff" />
                    </span>
                  )}
                </span>
                <strong>{mm.name}</strong>
                <small>{mm.walk.meters} m</small>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- result
function HuntResult({
  id,
  q,
  gain,
  onTakeHome,
  onKeepHunting,
}: {
  id: TurmaId;
  q: ThrowQuality;
  gain: Gain;
  onTakeHome: () => void;
  onKeepHunting: () => void;
}) {
  const game = useGame();
  const m = TURMA_BY_ID[id];
  const r = TURMA_RARITY[m.rarity];
  const tq = THROW_QUALITY[q];
  const coins = useCountUp(game.coins, game.coins - gain.total);
  const primary = useRef<HTMLButtonElement | null>(null);
  useEffect(() => primary.current?.focus({ preventScroll: true }), []);
  const otherPet = game.pet && game.pet.id !== id ? TURMA_BY_ID[game.pet.id] : null;

  return (
    <div className="th-result" style={{ ["--ring" as string]: r.ring }}>
      <span className="th-result-glow" aria-hidden="true" />
      <Confetti count={m.rarity === "lendario" ? 80 : 50} />
      <div className="th-result-body">
        <span className="th-result-kicker">{m.art === "a" ? "Apanhada!" : "Apanhado!"}</span>
        <div className="th-result-stage">
          <span className="th-result-plinth" aria-hidden="true" />
          <img className="th-result-mon" src={m.img} alt={m.alt} draggable={false} />
        </div>
        <h1>{m.name}</h1>
        <span className="th-pill big" style={{ background: r.tint, color: r.ink }}>
          Monstro {r.label.toLowerCase()}
        </span>

        <dl className="th-break">
          <div>
            <dt>Monstro {r.label.toLowerCase()}</dt>
            <dd>{formatCoins(gain.base)}</dd>
          </div>
          <div>
            <dt>
              Lançamento {tq.label} ×{tq.multLabel}
            </dt>
            <dd className="plus">+{formatCoins(gain.bonus)}</dd>
          </div>
          <div>
            <dt>Primeira captura</dt>
            <dd className="plus">+{formatCoins(gain.first)}</dd>
          </div>
          <div className="total">
            <dt>Total</dt>
            <dd>+{formatCoins(gain.total)} pontos</dd>
          </div>
        </dl>

        <p className="th-result-meta">
          <span>
            <CoinIcon size={15} /> Saldo: <strong>{formatCoins(coins)}</strong> Hari Coins
          </span>
          <span>
            Apanhados: <strong>{game.turmaCaught.length} de {TURMA.length}</strong>
          </span>
        </p>

        <div className="th-result-actions">
          <button ref={primary} type="button" className="btn-primary btn-block" onClick={onTakeHome}>
            Levar para casa
          </button>
          <button type="button" className="btn-ghost btn-block th-ghost-light" onClick={onKeepHunting}>
            Continuar a caçar
          </button>
          {otherPet && (
            <small className="th-result-note">
              Em casa só cabe um: {otherPet.art} {otherPet.name} volta para o parque.
            </small>
          )}
        </div>
      </div>
    </div>
  );
}

function useCountUp(target: number, from: number) {
  const start = useRef(from);
  const [v, setV] = useState(() => (reducedMotion() ? target : from));
  useEffect(() => {
    if (reducedMotion()) {
      setV(target);
      return;
    }
    const a = start.current;
    let raf = 0;
    let t0 = 0;
    const step = (t: number) => {
      if (!t0) t0 = t + 350; // let the card land first
      const k = Math.max(0, Math.min(1, (t - t0) / 900));
      setV(Math.round(a + (target - a) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

// ---------------------------------------------------------------- AR scene
// Stylised "camera feed": sky, blurred ferris wheel and coaster, ground with
// perspective lines and a vignette.
function ParkScene() {
  return (
    <div className="th-park" aria-hidden="true">
      <span className="th-cloud a" />
      <span className="th-cloud b" />
      <svg className="th-park-back" viewBox="0 0 390 200" preserveAspectRatio="xMidYMax meet">
        <path d="M0 150 Q 60 118 120 138 T 240 130 T 390 124 V200 H0 Z" fill="#A6CFB0" />
        <path d="M-10 172 C 20 58, 70 48, 96 122 S 150 196, 176 96 S 222 70, 244 156" fill="none" stroke="#8C5A3C" strokeWidth="4" />
        <path d="M20 200 V112 M44 200 V82 M70 200 V78 M96 200 V122 M122 200 V150 M150 200 V140 M176 200 V98 M204 200 V92 M228 200 V120" stroke="#8C5A3C" strokeWidth="2" opacity="0.6" />
        <g className="th-wheel">
          <path d="M305 95 L270 200 M305 95 L340 200" stroke="#3D5A80" strokeWidth="4" strokeLinecap="round" />
          <g className="th-wheel-spin">
            <circle cx="305" cy="95" r="70" fill="none" stroke="#3D5A80" strokeWidth="3" />
            <circle cx="305" cy="95" r="61" fill="none" stroke="#3D5A80" strokeWidth="1.5" opacity="0.7" />
            <path d="M305 25 V165 M235 95 H375 M255.5 45.5 L354.5 144.5 M354.5 45.5 L255.5 144.5" stroke="#3D5A80" strokeWidth="1.5" opacity="0.8" />
            <circle cx="305" cy="25" r="7" fill="#E84C8B" />
            <circle cx="354.5" cy="45.5" r="7" fill="#FFC72C" />
            <circle cx="375" cy="95" r="7" fill="#2DBE7E" />
            <circle cx="354.5" cy="144.5" r="7" fill="#2B57E0" />
            <circle cx="305" cy="165" r="7" fill="#E84C8B" />
            <circle cx="255.5" cy="144.5" r="7" fill="#FFC72C" />
            <circle cx="235" cy="95" r="7" fill="#2DBE7E" />
            <circle cx="255.5" cy="45.5" r="7" fill="#2B57E0" />
          </g>
          <circle cx="305" cy="95" r="7" fill="#3D5A80" />
        </g>
        <circle cx="12" cy="182" r="26" fill="#4F8F5E" />
        <circle cx="46" cy="190" r="22" fill="#3F7A4E" />
        <circle cx="196" cy="188" r="24" fill="#4F8F5E" />
        <circle cx="228" cy="192" r="19" fill="#3F7A4E" />
        <circle cx="384" cy="184" r="26" fill="#3F7A4E" />
      </svg>
      <svg className="th-park-ground" viewBox="0 0 390 447" preserveAspectRatio="none">
        <path d="M195 0 L-320 447 M195 0 L-80 447 M195 0 L110 447 M195 0 L280 447 M195 0 L470 447 M195 0 L710 447" stroke="rgba(110, 80, 40, 0.16)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <path d="M0 26 H390 M0 70 H390 M0 136 H390 M0 226 H390 M0 340 H390" stroke="rgba(110, 80, 40, 0.12)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="th-vignette" />
    </div>
  );
}
