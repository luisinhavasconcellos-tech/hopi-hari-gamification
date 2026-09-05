/**
 * Giralata — rota isolada `/giralata`.
 * React controla HUD e modais; Babylon controla a arena (scene.ts).
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { COLORS, CONFIG } from "./config";
import { createGiralataScene, type GiralataScene } from "./scene";
import { attachGiralataInput } from "./input";
import { GiralataWorld, type GiralataSnapshot } from "./world";
import emblemUrl from "./assets/emblema.svg";
import tampinhaUrl from "./assets/tampinha.svg";
import bumperUrl from "./assets/bumper.svg";
import portoUrl from "./assets/porto.svg";
import moedaUrl from "./assets/moeda.svg";
import arenaUrl from "./assets/arena.svg";
import "./giralata.css";

export interface GiralataProps {
  /** dentro do APK: VOLTAR regressa à intro em vez de navegar */
  embedded?: boolean;
  /** `giralata` | `giralata-complete` */
  demo?: string | null;
}

declare global {
  interface Window {
    giralataBack?: () => boolean;
    HopiPlayAndroid?: { exit: () => void };
  }
}

const fmt = (n: number): string => n.toLocaleString("pt-BR");

export function Giralata({ embedded = false, demo = null }: GiralataProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<GiralataWorld | null>(null);
  if (!worldRef.current) worldRef.current = new GiralataWorld({ demo, embedded });
  const world = worldRef.current;

  const snap = useSyncExternalStore(world.subscribe, world.getSnapshot, world.getSnapshot);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let sceneApi: GiralataScene | null = null;
    let detach: () => void = () => undefined;
    try {
      sceneApi = createGiralataScene(canvas, world, { onReady: () => setReady(true) });
      detach = attachGiralataInput(canvas, world, sceneApi.screenToWorld);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    const onVisibility = (): void => {
      if (document.hidden) world.autoPause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.giralataBack = () => {
      if (world.back()) return true;
      if (window.HopiPlayAndroid) {
        window.HopiPlayAndroid.exit();
        return true;
      }
      return false;
    };
    return () => {
      detach();
      sceneApi?.dispose();
      document.removeEventListener("visibilitychange", onVisibility);
      delete window.giralataBack;
    };
  }, [world]);

  useEffect(() => () => world.dispose(), [world]);

  const leave = (): void => {
    if (window.HopiPlayAndroid) {
      world.backToIntro();
      return;
    }
    if (embedded) {
      world.backToIntro();
      return;
    }
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.pathname = url.pathname.replace(/giralata\/?$/, "");
    window.location.assign(url.toString());
  };

  return (
    <div className={`gl-root gl-phase-${snap.phase}`} data-testid="giralata">
      <canvas ref={canvasRef} className="gl-canvas" aria-label="Arena Giralata" tabIndex={0} />

      {!ready && !error && <div className="gl-loading">Preparando a arena…</div>}
      {error && (
        <div className="gl-overlay">
          <div className="gl-modal">
            <span className="gl-kicker">APREZENTA</span>
            <h2>WebGL indisponível</h2>
            <p className="gl-body">Este aparelho não conseguiu abrir a arena 3D. {error}</p>
          </div>
        </div>
      )}

      <Hud snap={snap} />

      {snap.toast && <div className={`gl-toast gl-toast-${snap.toast.tone}`}>{snap.toast.text}</div>}

      {snap.phase === "playing" && (
        <div className="gl-cta gl-card">
          <strong>PUXE · MIRE · SOLTE</strong>
          <span>
            PORTO <i className="gl-dot" style={{ background: snap.requested.color }} /> {snap.requested.label}
          </span>
        </div>
      )}

      {(snap.phase === "playing" || snap.phase === "paused") && (
        <div className="gl-fabs">
          <button className="gl-fab" onClick={() => world.openHelp()} aria-label="Ajuda">
            ?
          </button>
          <button
            className="gl-fab"
            onClick={() => world.togglePause()}
            aria-label={snap.phase === "paused" ? "Retomar" : "Pausar"}
          >
            {snap.phase === "paused" ? "▶" : "⏸"}
          </button>
        </div>
      )}

      {snap.phase === "intro" && (
        <div className="gl-overlay gl-overlay-intro">
          <div className="gl-modal gl-modal-intro">
            <img className="gl-intro-strip" src={arenaUrl} alt="" />
            <div className="gl-intro-head">
              <img className="gl-emblem" src={emblemUrl} alt="Emblema Giralata" />
              <div>
                <span className="gl-kicker">HOPIPLAY APREZENTA</span>
                <h1>GIRALATA</h1>
                <p className="gl-tagline">Tampinhas em Órbita</p>
              </div>
            </div>
            <p className="gl-body">
              As latas enlouqueceram e a praça de Aribabiba virou um brinquedo orbital. Puxe a tampinha, leia o giro das
              latas e entregue seis cores em 60 segundos.
            </p>
            <ul className="gl-rules">
              <li>
                <img src={tampinhaUrl} alt="" /> Um dedo: <b>puxe, mire e solte</b>.
              </li>
              <li>
                <img src={portoUrl} alt="" /> Entregue no <b>porto da cor pedida</b>. Seis entregas liberam o Istampi.
              </li>
              <li>
                <img src={bumperUrl} alt="" /> Rikoche nas latas constrói <b>Rodopio</b>: 3/3 = 6 s de pontos ×1,5.
              </li>
              <li>
                <img src={moedaUrl} alt="" /> HopiCoins em órbita valem 1 cada. Nunca se perdem.
              </li>
            </ul>
            <p className="gl-note">A câmera nunca gira. Só o mundo gira.</p>
            <button className="gl-btn gl-btn-primary" onClick={() => world.start()} autoFocus>
              ISTARTI · GIRAR
            </button>
            {!embedded && (
              <button className="gl-btn gl-btn-ghost" onClick={leave}>
                VOLTAR
              </button>
            )}
          </div>
        </div>
      )}

      {snap.phase === "paused" && (
        <div className="gl-overlay">
          <div className="gl-modal">
            <span className="gl-kicker">PARTIDA CONGELADA</span>
            <h2>PAUSA</h2>
            <p className="gl-body">O tempo e as órbitas só voltam quando você mandar.</p>
            <button className="gl-btn gl-btn-primary" onClick={() => world.resume()} autoFocus>
              RETOMAR
            </button>
            <button className="gl-btn gl-btn-ghost" onClick={() => world.openHelp()}>
              AJUDA
            </button>
            <button className="gl-btn gl-btn-ghost" onClick={() => world.restart()}>
              REINICIAR
            </button>
            <button className="gl-btn gl-btn-ghost" onClick={leave}>
              VOLTAR
            </button>
          </div>
        </div>
      )}

      {snap.phase === "help" && (
        <div className="gl-overlay">
          <div className="gl-modal">
            <span className="gl-kicker">COMO JOGAR</span>
            <h2>PUXE · MIRE · SOLTE</h2>
            <ul className="gl-rules">
              <li>
                <img src={tampinhaUrl} alt="" /> Toque na tampinha do centro, <b>arraste para trás</b> e solte. A linha
                pontilhada mostra a trajetória.
              </li>
              <li>
                <img src={portoUrl} alt="" /> O HUD e o halo verde-lima mostram o <b>porto pedido</b>. Porto trocado ou
                fora da lata: a tampinha volta ao centro, moedas e entregas ficam.
              </li>
              <li>
                <img src={bumperUrl} alt="" /> Cada rikoche limpo numa lata soma <b>Rodopio</b> (até 3). Rodopio Máximo
                multiplica pontos por 1,5 durante 6 s. HopiCoins nunca multiplicam.
              </li>
              <li>
                <img src={moedaUrl} alt="" /> Os anéis giram em sentidos opostos e as aberturas passam. Leia o giro antes
                de soltar.
              </li>
            </ul>
            <p className="gl-note">
              Teclado: setas/WASD miram · Enter/Espaço lançam · Esc cancela ou pausa · P pausa · R reinicia.
              <br />A câmera permanece fixa; apenas o mundo gira.
            </p>
            <button className="gl-btn gl-btn-primary" onClick={() => world.closeHelp()} autoFocus>
              FECHAR
            </button>
          </div>
        </div>
      )}

      {snap.phase === "result" && snap.result && (
        <div className="gl-overlay">
          <div className="gl-modal gl-modal-result">
            <img className="gl-emblem" src={emblemUrl} alt="Emblema Giralata" />
            <span className="gl-kicker">{snap.result.reason === "complete" ? "KONGRATULARIS!" : "TEMPO ESGOTADO"}</span>
            <h2>{snap.result.reason === "complete" ? "SEIS ÓRBITAS VIRARAM FESTA" : "AS LATAS AINDA GIRAM"}</h2>
            <div className="gl-stats">
              <div className="gl-stat">
                <span>PONTOS</span>
                <strong>{fmt(snap.result.points)}</strong>
              </div>
              <div className="gl-stat">
                <span>HOPICOINS</span>
                <strong>{fmt(snap.result.coins)}</strong>
              </div>
              <div className="gl-stat">
                <span>PORTOS</span>
                <strong>
                  {snap.result.deliveries}/{CONFIG.DELIVERIES_TO_WIN}
                </strong>
              </div>
            </div>
            {snap.result.reason === "complete" &&
              (snap.result.istampiNew ? (
                <div className="gl-istampi gl-istampi-new">NOVO ISTAMPI GIRALATA</div>
              ) : (
                <div className="gl-istampi">ISTAMPI GIRALATA JÁ NO PASSAPORTI</div>
              ))}
            <button className="gl-btn gl-btn-primary" onClick={() => world.restart()} autoFocus>
              GIRAR DE NOVO
            </button>
            <button className="gl-btn gl-btn-ghost" onClick={leave}>
              VOLTAR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Hud({ snap }: { snap: GiralataSnapshot }) {
  const showHud = snap.phase !== "intro";
  if (!showHud) return null;
  return (
    <div className="gl-hud">
      <div className="gl-card gl-card-stat">
        <span className="gl-label">TEMPO</span>
        <strong className={snap.timeLeft <= 10 && snap.phase === "playing" ? "gl-urgent" : ""}>{snap.timeLabel}</strong>
      </div>
      <div className="gl-card gl-card-stat">
        <span className="gl-label">PONTOS</span>
        <strong>{fmt(snap.score)}</strong>
      </div>
      <div className="gl-card gl-card-wide">
        <span className="gl-label">ENTREGAS</span>
        <div className="gl-pills">
          {snap.sequence.map((p, i) => (
            <span
              key={p.id}
              className={`gl-pill ${i < snap.deliveries ? "is-done" : ""} ${i === snap.deliveries && snap.phase === "playing" ? "is-next" : ""}`}
              style={i < snap.deliveries ? { background: p.color, borderColor: COLORS.navy } : undefined}
              title={p.label}
            />
          ))}
        </div>
      </div>
      <div className="gl-card gl-card-stat gl-card-coins">
        <span className="gl-label">HOPICOINS</span>
        <strong>{fmt(snap.coins)}</strong>
      </div>
      <div className={`gl-card gl-card-stat gl-card-rodopio ${snap.rodopioMaxActive ? "is-max" : ""}`}>
        <span className="gl-label">{snap.rodopioMaxActive ? `RODOPIO MÁX ×1,5 · ${snap.rodopioMaxSeconds}s` : "RODOPIO"}</span>
        <div className="gl-segments">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`gl-segment ${i < snap.rodopio ? "is-on" : ""}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Giralata;
