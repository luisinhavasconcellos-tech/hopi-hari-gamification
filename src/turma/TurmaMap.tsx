import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import parkmap from "../assets/map/parkmap.webp";
import { USER_POS, ZONES, type ZoneId } from "../data";
import { useGame } from "../state";
import { HARI_ORB_IMG, TURMA, TURMA_BY_ID, TURMA_RARITY, type TurmaId } from "./data";

// Mapa da Turma — the illustrated park map with the nine monsters standing in
// their zones. The map is landscape, so it is drawn at the phone's height and
// panned sideways (touch scroll, mouse drag or the arrow buttons).
const MAP_H = 420;
const MAP_W = Math.round((MAP_H * 2000) / 993); // 846
// TURMA[].map.h is the figure height on the 1536px-wide reference board.
const FIG_SCALE = MAP_W / 1536;
const ZONE_ORDER: ZoneId[] = ["kaminda", "infantasia", "mistieri", "aribabiba", "wildwest"];
// Draw back-to-front so monsters lower on the map overlap the ones behind.
const BY_DEPTH = [...TURMA].sort((a, b) => a.map.y - b.map.y);

const zoneCentre = (z: ZoneId) => {
  const ms = TURMA.filter((m) => m.zone === z);
  return ms.reduce((s, m) => s + m.map.x, 0) / ms.length;
};

export function TurmaMap({
  onBack,
  onHunt,
  focus,
}: {
  onBack: () => void;
  onHunt: (id: TurmaId) => void;
  /** Opens the map already centred on this monster with its card open. */
  focus?: TurmaId;
}) {
  const game = useGame();
  const [selected, setSelected] = useState<TurmaId | null>(focus ?? null);
  const [panned, setPanned] = useState(false);
  const [edges, setEdges] = useState({ left: false, right: true });
  const screenRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean; id: number } | null>(null);
  const suppressClick = useRef(false);

  const reduceMotion =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const centreOn = (pct: number, smooth = true) => {
    const v = viewRef.current;
    if (!v) return;
    const left = Math.max(0, Math.min(MAP_W - v.clientWidth, (pct / 100) * MAP_W - v.clientWidth / 2));
    v.scrollTo({ left, behavior: smooth && !reduceMotion ? "smooth" : "auto" });
  };

  // Start centred on the park (or on the focused monster).
  useLayoutEffect(() => {
    centreOn(focus ? TURMA_BY_ID[focus].map.x : 50, false);
    updateEdges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the selected monster (and its name tag) visible above the bottom card.
  useEffect(() => {
    if (!selected) return;
    const raf = requestAnimationFrame(() => {
      const screen = screenRef.current;
      const tag = screen?.querySelector<HTMLElement>(`.tm-tag[data-id="${selected}"]`);
      const card = screen?.parentElement?.querySelector<HTMLElement>(".tm-card");
      if (!screen || !tag || !card) return;
      const fig = TURMA_BY_ID[selected];
      const tagRect = tag.getBoundingClientRect();
      const top = tagRect.top - Math.round(fig.map.h * FIG_SCALE * 1.14) - 12;
      // offsetTop ignores the card's pop-in transform
      const host = card.offsetParent as HTMLElement | null;
      const cardTop = (host?.getBoundingClientRect().top ?? 0) + card.offsetTop;
      const overlap = tagRect.bottom + 12 - cardTop;
      const above = screen.getBoundingClientRect().top + 8 - top;
      if (overlap > 0) screen.scrollBy({ top: overlap, behavior: reduceMotion ? "auto" : "smooth" });
      else if (above > 0) screen.scrollBy({ top: -above, behavior: reduceMotion ? "auto" : "smooth" });
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const updateEdges = () => {
    const v = viewRef.current;
    if (!v) return;
    const left = v.scrollLeft > 4;
    const right = v.scrollLeft < v.scrollWidth - v.clientWidth - 4;
    setEdges((e) => (e.left === left && e.right === right ? e : { left, right }));
  };

  const select = (id: TurmaId) => {
    setSelected(id);
    centreOn(TURMA_BY_ID[id].map.x);
  };

  // Mouse drag-to-pan (touch already scrolls natively).
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || !viewRef.current) return;
    drag.current = { x: e.clientX, left: viewRef.current.scrollLeft, moved: false, id: e.pointerId };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const v = viewRef.current;
    if (!d || !v) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 5) {
      d.moved = true;
      v.setPointerCapture(d.id);
      v.classList.add("dragging");
    }
    if (d.moved) {
      v.scrollLeft = d.left - dx;
      if (!panned) setPanned(true);
    }
  };
  const endDrag = () => {
    const d = drag.current;
    drag.current = null;
    viewRef.current?.classList.remove("dragging");
    if (d?.moved) {
      suppressClick.current = true;
      setTimeout(() => (suppressClick.current = false), 0);
    }
  };

  const nudge = (dir: -1 | 1) => {
    const v = viewRef.current;
    if (!v) return;
    setPanned(true);
    v.scrollBy({ left: dir * v.clientWidth * 0.7, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const sel = selected ? TURMA_BY_ID[selected] : null;
  const caughtCount = game.turmaCaught.length;

  return (
    <>
      <div className="screen tm-screen" ref={screenRef}>
        <header className="tm-head">
          <button className="tm-back" onClick={onBack} aria-label="Voltar à Turma">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="tm-head-text">
            <span>Mapa da Turma</span>
            <h1>Onde vive cada monstro</h1>
          </div>
        </header>
        <p className="tm-sub">Toca num monstro para saberes como lá chegar.</p>

        <div className="tm-frame">
          <div
            className="tm-view"
            ref={viewRef}
            onScroll={updateEdges}
            onWheel={() => !panned && setPanned(true)}
            onTouchStart={() => !panned && setPanned(true)}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onClickCapture={(e) => {
              if (suppressClick.current) {
                e.stopPropagation();
                e.preventDefault();
              }
            }}
            onClick={() => setSelected(null)}
          >
            <div className="tm-world" style={{ width: MAP_W, height: MAP_H }}>
              <img
                src={parkmap}
                className="tm-map-img"
                alt="Mapa ilustrado do Hopi Hari com as cinco zonas à volta do lago"
                draggable={false}
              />

              {sel && (
                <svg className="tm-route" viewBox={`0 0 ${MAP_W} ${MAP_H}`} aria-hidden="true">
                  <line
                    x1={(USER_POS.x / 100) * MAP_W}
                    y1={(USER_POS.y / 100) * MAP_H}
                    x2={(sel.map.x / 100) * MAP_W}
                    y2={(sel.map.y / 100) * MAP_H}
                  />
                </svg>
              )}

              <span className="tm-you" style={{ left: `${USER_POS.x}%`, top: `${USER_POS.y}%` }}>
                <span className="map-you-pulse" />
                <span className="map-you-dot" />
                <span className="tm-you-tag">Tu</span>
              </span>

              {BY_DEPTH.map((m) => {
                const h = Math.round(m.map.h * FIG_SCALE);
                const caught = game.turmaCaught.includes(m.id);
                const active = m.id === selected;
                return (
                  <button
                    key={m.id}
                    className={`tm-mon${active ? " active" : ""}${selected && !active ? " dim" : ""}`}
                    style={{
                      left: `${m.map.x}%`,
                      top: `${m.map.y}%`,
                      ["--zone" as string]: ZONES[m.zone].color,
                      ["--h" as string]: `${h}px`,
                    }}
                    aria-label={`${m.name}, ${ZONES[m.zone].name}, ${m.spot}${caught ? ", já apanhado" : ""}`}
                    aria-pressed={active}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (active) setSelected(null);
                      else select(m.id);
                    }}
                  >
                    <span className="tm-mon-ring" aria-hidden="true" />
                    <span className="tm-mon-shadow" aria-hidden="true" />
                    <img src={m.img} alt="" draggable={false} style={{ height: h, width: Math.round(h * m.asp) }} />
                  </button>
                );
              })}

              {/* name tags on their own layer so they always read on top */}
              {TURMA.map((m) => {
                const caught = game.turmaCaught.includes(m.id);
                return (
                  <span
                    key={m.id}
                    className={`tm-tag${m.id === selected ? " active" : ""}`}
                    data-id={m.id}
                    style={{ left: `${m.map.x}%`, top: `${m.map.y}%`, ["--zone" as string]: ZONES[m.zone].color }}
                    aria-hidden="true"
                  >
                    <i />
                    {m.name}
                    {caught && <b>✓</b>}
                  </span>
                );
              })}
            </div>
          </div>

          <span className={`tm-fade left${edges.left ? " on" : ""}`} aria-hidden="true" />
          <span className={`tm-fade right${edges.right ? " on" : ""}`} aria-hidden="true" />
          <button
            className="tm-arrow left"
            onClick={() => nudge(-1)}
            disabled={!edges.left}
            aria-label="Ver a parte esquerda do mapa"
          >
            ‹
          </button>
          <button
            className="tm-arrow right"
            onClick={() => nudge(1)}
            disabled={!edges.right}
            aria-label="Ver a parte direita do mapa"
          >
            ›
          </button>
          {!panned && !selected && (
            <span className="tm-hint" aria-hidden="true">
              <span>↔</span> Arrasta para explorar o parque
            </span>
          )}
        </div>

        <div className="tm-legend" role="group" aria-label="Zonas do parque">
          {ZONE_ORDER.map((z) => (
            <button key={z} onClick={() => centreOn(zoneCentre(z))} aria-label={`Ver ${ZONES[z].name} no mapa`}>
              <span>
                <i style={{ background: ZONES[z].color }} />
                {ZONES[z].name}
              </span>
            </button>
          ))}
        </div>

        <section className="tm-zones" aria-label="Quem vive em cada zona">
          <div className="tm-zones-head">
            <h2>Quem vive onde</h2>
            <span>
              <strong>{caughtCount}</strong>/{TURMA.length} apanhados
            </span>
          </div>
          {ZONE_ORDER.map((z) => (
            <div key={z} className="tm-zone" style={{ ["--zone" as string]: ZONES[z].color }}>
              <span className="tm-zone-name">
                <i />
                {ZONES[z].name}
              </span>
              <div className="tm-zone-list">
                {TURMA.filter((m) => m.zone === z).map((m) => {
                  const caught = game.turmaCaught.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      className="tm-zone-mon"
                      onClick={() => {
                        screenRef.current?.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
                        select(m.id);
                      }}
                      aria-label={`Ver ${m.name} no mapa${caught ? ", já apanhado" : ""}`}
                    >
                      <span className="tm-ava" style={{ background: m.colors.tint }}>
                        <img src={m.img} alt="" />
                      </span>
                      <span className="tm-zone-mon-text">
                        <strong>
                          {m.name}
                          {caught && <b aria-hidden="true">✓</b>}
                        </strong>
                        <small>{m.spot}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      </div>

      {sel && (
        <MonsterCard
          key={sel.id}
          id={sel.id}
          caught={game.turmaCaught.includes(sel.id)}
          atHome={game.pet?.id === sel.id}
          onClose={() => setSelected(null)}
          onHunt={() => onHunt(sel.id)}
        />
      )}
    </>
  );
}

function MonsterCard({
  id,
  caught,
  atHome,
  onClose,
  onHunt,
}: {
  id: TurmaId;
  caught: boolean;
  atHome: boolean;
  onClose: () => void;
  onHunt: () => void;
}) {
  const m = TURMA_BY_ID[id];
  const r = TURMA_RARITY[m.rarity];
  const zone = ZONES[m.zone];
  return (
    <div className="tm-card pop-in" role="dialog" aria-label={`${m.name}, ${m.role}`}>
      <button className="tm-card-close" onClick={onClose} aria-label="Fechar">
        ×
      </button>
      <div className="tm-card-top">
        <span className="tm-card-ava" style={{ background: m.colors.tint }}>
          <img src={m.img} alt={m.alt} />
        </span>
        <div className="tm-card-id">
          <span className="tm-rarity" style={{ background: r.tint, color: r.ink, borderColor: r.ring }}>
            {r.label}
          </span>
          <h2>{m.name}</h2>
          <small>{m.role}</small>
        </div>
      </div>

      <ul className="tm-card-facts">
        <li>
          <i style={{ background: zone.color }} aria-hidden="true" />
          <span>
            <strong>{zone.name}</strong> · {m.spot}
          </span>
        </li>
        <li>
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"
            />
          </svg>
          <span>
            <strong>{m.walk.meters} m</strong> · ~{m.walk.minutes} min a pé
          </span>
        </li>
        <li className={caught ? "ok" : ""}>
          {caught ? (
            <>
              <span className="tm-state ok" aria-hidden="true">✓</span>
              <span>{atHome ? "Na tua coleção · vive contigo em casa" : "Já está na tua coleção"}</span>
            </>
          ) : (
            <>
              <span className="tm-state" aria-hidden="true">?</span>
              <span>Ainda não apanhado · {r.points} pts</span>
            </>
          )}
        </li>
      </ul>

      <button className="btn-primary btn-block tm-hunt" onClick={onHunt} disabled={caught}>
        {caught ? (
          <>
            <span aria-hidden="true">✓</span> Já apanhado
          </>
        ) : (
          <>
            <img src={HARI_ORB_IMG} alt="" width={22} height={22} />
            Caçar em AR
          </>
        )}
      </button>
    </div>
  );
}
