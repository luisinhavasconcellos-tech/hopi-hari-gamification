import { ATTRACTION_BY_ID } from "./data";
import { GameProvider, useGame } from "./state";
import { BottomNav } from "./components/BottomNav";
import { DemoControls } from "./components/DemoControls";
import { ScanOverlay } from "./components/ScanOverlay";
import { CardReveal } from "./components/CardReveal";
import { Welcome } from "./screens/Welcome";
import { MissionDay } from "./screens/MissionDay";
import { TreasureHunt } from "./screens/TreasureHunt";
import { Album } from "./screens/Album";
import { PhotoChallenge } from "./screens/PhotoChallenge";

function Phone() {
  const game = useGame();

  return (
    <div className="phone">
      <div className="phone-notch" />
      <div className="phone-screen">
        {!game.started ? (
          <Welcome />
        ) : (
          <>
            {game.tab === "missao" && <MissionDay />}
            {game.tab === "tesouro" && <TreasureHunt />}
            {game.tab === "album" && <Album />}
            {game.tab === "foto" && <PhotoChallenge />}
            <BottomNav />
          </>
        )}

        {game.scanTarget && (
          <ScanOverlay
            attraction={ATTRACTION_BY_ID[game.scanTarget]}
            onDone={game.finishScan}
          />
        )}
        {game.revealTarget && (
          <CardReveal
            attraction={ATTRACTION_BY_ID[game.revealTarget]}
            onClose={game.closeReveal}
            onGoToAlbum={() => {
              game.closeReveal();
              game.setTab("album");
            }}
          />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <div className="stage">
        <div className="stage-side">
          <span className="stage-kicker">Hopi Hari · Proposta de Gamificação</span>
          <h1 className="stage-title">O parque como videojogo</h1>
          <p className="stage-sub">
            Protótipo de demonstração — Fase 1 · Quick wins.
            <br />
            Caça ao tesouro, cartas colecionáveis e desafios fotográficos.
          </p>
        </div>
        <div className="stage-phone">
          <Phone />
          <DemoControls />
        </div>
      </div>
    </GameProvider>
  );
}
