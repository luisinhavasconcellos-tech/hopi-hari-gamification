import { useState } from "react";
import { TURMA, type TurmaId } from "../turma/data";
import { useGame } from "../state";
import { TurmaMap } from "../turma/TurmaMap";
import { TurmaHunt } from "../turma/TurmaHunt";
import { TurmaHome } from "../turma/TurmaHome";
import "../turma/turma.css";

type View = "hub" | "mapa" | "caca" | "casa";

// A Turma — the nine Hopi Hari characters. Hub for the three monster games:
// Mapa da Turma (where each one lives), Caça à Turma (AR catch with the
// Hari Orb) and Turma em Casa (take one home and look after it).
export function Turma() {
  const game = useGame();
  const [view, setView] = useState<View>("hub");
  const [huntTarget, setHuntTarget] = useState<TurmaId | undefined>(undefined);

  if (view === "mapa")
    return <TurmaMap onBack={() => setView("hub")} onHunt={(id) => { setHuntTarget(id); setView("caca"); }} />;
  if (view === "caca")
    return <TurmaHunt onBack={() => setView("hub")} startWith={huntTarget} onTakeHome={(id) => { game.adoptPet(id); setView("casa"); }} />;
  if (view === "casa")
    return <TurmaHome onBack={() => setView("hub")} onHunt={() => { setHuntTarget(undefined); setView("caca"); }} />;

  const caught = game.turmaCaught.length;
  return (
    <div className="screen turma-hub">
      <header className="screen-header">
        <span className="screen-kicker">A Turma · 9 monstros</span>
        <h1>A Turma do Hopi Hari</h1>
        <p className="screen-sub">
          Nove monstros peludos vivem pelas 5 zonas do parque. Encontra-os, apanha-os com a
          Hari Orb e leva um para casa.
        </p>
      </header>
      <div className="turma-hub-cards">
        <button className="turma-card" onClick={() => setView("mapa")}>
          <strong>Mapa da Turma</strong>
          <small>Onde vive cada monstro</small>
        </button>
        <button className="turma-card" onClick={() => { setHuntTarget(undefined); setView("caca"); }}>
          <strong>Caça à Turma</strong>
          <small>{caught}/{TURMA.length} apanhados</small>
        </button>
        <button className="turma-card" onClick={() => setView("casa")}>
          <strong>Turma em Casa</strong>
          <small>{game.pet ? "O teu monstro espera por ti" : "Leva um monstro para casa"}</small>
        </button>
      </div>
    </div>
  );
}
