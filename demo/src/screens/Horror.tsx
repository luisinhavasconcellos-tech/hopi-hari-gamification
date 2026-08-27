import { useState } from "react";
import { HORROR_COINS, MONSTERS } from "../data";
import { useGame } from "../state";
import { MonsterHunt } from "./MonsterHunt";
import { CoinQuest } from "./CoinQuest";

type View = "hub" | "monstros" | "moedas";

// Hora do Horror — hub sazonal que reúne os dois jogos novos:
// caça aos monstros (estilo Pokémon Go) e a caça às 25 Moedas.
export function Horror() {
  const game = useGame();
  const [view, setView] = useState<View>("hub");

  if (view === "monstros") return <MonsterHunt onBack={() => setView("hub")} />;
  if (view === "moedas") return <CoinQuest onBack={() => setView("hub")} />;

  const caught = game.caughtMonsters.length;
  const coins = game.collectedCoins.length;

  return (
    <div className="horror-screen horror-hub">
      <div className="horror-hero">
        <span className="horror-hero-bats">🦇</span>
        <span className="horror-kicker">Edição Especial · 25 anos</span>
        <h1>
          Hora do
          <br />
          Horror
        </h1>
        <p>
          O parque cai a noite e o medo toma conta. Dois jogos só para os mais
          corajosos — se te atreveres.
        </p>
      </div>

      <button className="hh-game-card monsters" onClick={() => setView("monstros")}>
        <div className="hh-game-glyph">👻</div>
        <div className="hh-game-text">
          <strong>Caça aos Monstros</strong>
          <small>
            Estilo Pokémon Go: mapa GPS, direções e captura dos monstros da Hora
            do Horror.
          </small>
          <span className="hh-game-meta">
            {caught}/{MONSTERS.length} capturados
          </span>
        </div>
        <span className="hh-go">▶</span>
      </button>

      <button className="hh-game-card coins" onClick={() => setView("moedas")}>
        <div className="hh-game-glyph">🪙</div>
        <div className="hh-game-text">
          <strong>As 25 Moedas</strong>
          <small>
            Uma moeda por cada ano de horror. Escaneia, joga o mini-jogo e
            desvenda a história.
          </small>
          <span className="hh-game-meta">
            {coins}/{HORROR_COINS.length} colecionadas
          </span>
        </div>
        <span className="hh-go">▶</span>
      </button>

      <p className="hh-footnote">
        🎃 Jogos disponíveis durante a temporada da Hora do Horror.
      </p>
    </div>
  );
}
