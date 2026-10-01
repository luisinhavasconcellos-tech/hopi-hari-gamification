import { useState } from "react";
import { HARI_ORB_IMG, TURMA, TURMA_BY_ID, type TurmaId } from "../turma/data";
import { useGame, type PetState } from "../state";
import { TurmaMap } from "../turma/TurmaMap";
import { TurmaHunt } from "../turma/TurmaHunt";
import { TurmaHome } from "../turma/TurmaHome";
import { DressedMonster } from "../turma/DressedMonster";
import parkmap from "../assets/map/parkmap.webp";
import "../turma/turma.css";

type View = "hub" | "mapa" | "caca" | "casa";

// Group photo on the hub: back row (smaller, higher) and front row, x = centre
// in % of the stage, y = feet from the stage bottom (px), h = figure height.
const GROUP: { id: TurmaId; x: number; y: number; h: number }[] = [
  { id: "zigui", x: 14, y: 52, h: 92 },
  { id: "luneli", x: 35, y: 58, h: 88 },
  { id: "azuri", x: 58, y: 56, h: 122 },
  { id: "mimora", x: 83, y: 62, h: 86 },
  { id: "tutty", x: 9, y: 14, h: 96 },
  { id: "nuvita", x: 29, y: 10, h: 100 },
  { id: "fagulito", x: 50, y: 6, h: 108 },
  { id: "zupi", x: 71, y: 10, h: 104 },
  { id: "pompita", x: 90, y: 14, h: 96 },
];

const PET_METERS: { key: keyof PetState; label: string; color: string }[] = [
  { key: "fome", label: "Barriga", color: "#F59B2D" },
  { key: "banho", label: "Banho", color: "#2B8FE0" },
  { key: "alegria", label: "Alegria", color: "#E84C8B" },
];

/** One short line about how the adopted monster is doing. */
function petMood(p: PetState): { text: string; tone: "ok" | "warn" | "sad" } {
  const m = TURMA_BY_ID[p.id];
  const who = `${m.art === "a" ? "A" : "O"} ${m.name}`;
  const pron = m.art === "a" ? "ela" : "ele";
  if (p.morto) return { text: `${who} precisa de ti para recomeçar`, tone: "sad" };
  if (p.saude < 45) return { text: `${who} está doente — cuida d${pron}!`, tone: "sad" };
  if (p.saudade >= 100) return { text: `${who} tem saudades do parque`, tone: "warn" };
  if (p.fome < 40) return { text: `${who} está com fome`, tone: "warn" };
  if (p.banho < 40) return { text: `${who} precisa de um banho`, tone: "warn" };
  if (p.alegria < 40) return { text: `${who} quer conversar contigo`, tone: "warn" };
  if (p.molhado > 50) return { text: `${who} ainda está molhadinh${m.art}`, tone: "ok" };
  return { text: `${who} está feliz em casa`, tone: "ok" };
}

// A Turma — the nine Hopi Hari characters. Hub for the three monster games:
// Mapa da Turma (where each one lives), Caça à Turma (AR catch with the
// Hari Orb) and Turma em Casa (take one home and look after it).
export function Turma() {
  const game = useGame();
  const [view, setView] = useState<View>("hub");
  const [huntTarget, setHuntTarget] = useState<TurmaId | undefined>(undefined);
  const [mapFocus, setMapFocus] = useState<TurmaId | undefined>(undefined);

  if (view === "mapa")
    return (
      <TurmaMap
        focus={mapFocus}
        onBack={() => setView("hub")}
        onHunt={(id) => { setHuntTarget(id); setView("caca"); }}
      />
    );
  if (view === "caca")
    return <TurmaHunt onBack={() => setView("hub")} startWith={huntTarget} onTakeHome={(id) => { game.adoptPet(id); setView("casa"); }} />;
  if (view === "casa")
    return <TurmaHome onBack={() => setView("hub")} onHunt={() => { setHuntTarget(undefined); setView("caca"); }} />;

  const caught = game.turmaCaught.length;
  const pet = game.pet;
  const petMon = pet ? TURMA_BY_ID[pet.id] : null;
  const mood = pet ? petMood(pet) : null;
  const openMap = (id?: TurmaId) => { setMapFocus(id); setView("mapa"); };

  return (
    <div className="screen thub">
      <header className="screen-header thub-header">
        <span className="screen-kicker">A Turma · 9 monstros</span>
        <h1>A Turma do Hopi Hari</h1>
        <p className="screen-sub">Encontra-os, apanha-os e leva um para casa.</p>
      </header>

      <div className="thub-hero" role="img" aria-label="Fotografia de grupo dos nove monstros da Turma do Hopi Hari">
        <span className="thub-hero-sun" aria-hidden="true" />
        <span className="thub-hero-floor" aria-hidden="true" />
        <span className="thub-spark s1" aria-hidden="true" />
        <span className="thub-spark s2" aria-hidden="true" />
        <span className="thub-spark s3" aria-hidden="true" />
        <span className="thub-spark s4" aria-hidden="true" />
        {GROUP.map((g, i) => {
          const m = TURMA_BY_ID[g.id];
          return (
            <span
              key={g.id}
              className="thub-fig"
              style={{
                left: `${g.x}%`,
                bottom: g.y,
                zIndex: g.y > 30 ? 1 : 2,
                animationDelay: `${(i % 5) * -0.55}s`,
              }}
              aria-hidden="true"
            >
              <img src={m.img} alt="" draggable={false} style={{ height: g.h, width: Math.round(g.h * m.asp) }} />
            </span>
          );
        })}
        <span className="thub-hero-hi" aria-hidden="true">Olá!</span>
      </div>

      <div className="thub-cards">
        <button className="thub-card map" onClick={() => openMap()}>
          <span className="thub-glyph map" aria-hidden="true">
            <img className="thub-glyph-map" src={parkmap} alt="" />
            <img className="thub-glyph-peek" src={TURMA_BY_ID.zupi.img} alt="" />
          </span>
          <span className="thub-card-text">
            <strong>Mapa da Turma</strong>
            <small>Onde vive cada monstro</small>
            <span className="thub-meta">5 zonas · 9 monstros · direções a pé</span>
          </span>
          <span className="thub-go" aria-hidden="true">›</span>
        </button>

        <button className="thub-card hunt" onClick={() => { setHuntTarget(undefined); setView("caca"); }}>
          <span className="thub-glyph hunt" aria-hidden="true">
            <img src={HARI_ORB_IMG} alt="" />
          </span>
          <span className="thub-card-text">
            <strong>
              Caça à Turma <em className="thub-ar">AR</em>
            </strong>
            <small>Aponta a câmara e lança a Hari Orb no momento certo</small>
            <span className="thub-meta">
              <span className="thub-pill">
                <span>
                  <b>{caught}</b>/{TURMA.length} apanhados
                </span>
              </span>
              <span className="thub-pill orb">
                <img src={HARI_ORB_IMG} alt="" />
                {game.orbs} {game.orbs === 1 ? "orb" : "orbs"}
              </span>
            </span>
          </span>
          <span className="thub-go" aria-hidden="true">›</span>
        </button>

        <button className="thub-card home" onClick={() => setView("casa")}>
          <span
            className={`thub-glyph home${pet ? " has-pet" : ""}${pet?.morto ? " gone" : ""}`}
            style={petMon ? { background: petMon.colors.tint } : undefined}
            aria-hidden="true"
          >
            {pet ? (
              <DressedMonster id={pet.id} outfit={game.petOutfit} height={58} alt="" className="thub-pet" />
            ) : (
              <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3 2.5 11h2.7v9h5.3v-5.5h3V20h5.3v-9h2.7L12 3Z" />
              </svg>
            )}
          </span>
          <span className="thub-card-text">
            <strong>Turma em Casa</strong>
            {pet && mood ? (
              <>
                <small className={`thub-mood ${mood.tone}`}>{mood.text}</small>
                {!pet.morto && (
                  <span className="thub-meters">
                    {PET_METERS.map((mt) => {
                      const v = Math.round(pet[mt.key] as number);
                      return (
                        <span key={mt.key} className="thub-meter" aria-label={`${mt.label}: ${v}%`}>
                          <small>{mt.label}</small>
                          <span>
                            <i style={{ width: `${v}%`, background: mt.color }} />
                          </span>
                        </span>
                      );
                    })}
                  </span>
                )}
              </>
            ) : (
              <>
                <small>Leva um monstro para casa</small>
                <span className="thub-meta">Dá-lhe comida, banho e carinho</span>
              </>
            )}
          </span>
          <span className="thub-go" aria-hidden="true">›</span>
        </button>
      </div>

      <section className="thub-collection" aria-label="A tua coleção">
        <div className="thub-collection-head">
          <h2>A tua coleção</h2>
          <span>
            <strong>{caught}</strong> de {TURMA.length}
          </span>
        </div>
        <div className="progress-bar slim thub-progress">
          <div className="progress-fill" style={{ width: `${(caught / TURMA.length) * 100}%` }} />
        </div>
        <ul className="thub-strip">
          {TURMA.map((m) => {
            const got = game.turmaCaught.includes(m.id);
            return (
              <li key={m.id}>
                <button
                  className={`thub-slot${got ? " got" : ""}`}
                  style={got ? { background: m.colors.tint } : undefined}
                  onClick={() => openMap(m.id)}
                  aria-label={got ? `${m.name}, apanhado. Ver no mapa` : `Monstro ${m.n}, ainda não apanhado. Ver onde está no mapa`}
                >
                  <span className="thub-slot-n" style={got ? { color: m.colors.deep } : undefined}>
                    {String(m.n).padStart(2, "0")}
                  </span>
                  <img src={m.img} alt="" draggable={false} style={{ height: 64, width: Math.round(64 * m.asp) }} />
                  <span className="thub-slot-name">{got ? m.name : "???"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
