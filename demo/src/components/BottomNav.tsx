import { useGame, type Tab } from "../state";
import {
  CameraIcon,
  CardsIcon,
  GhostIcon,
  MapIcon,
  TrophyIcon,
} from "../components/Icons";

const TABS: { id: Tab; label: string; Icon: typeof MapIcon }[] = [
  { id: "missao", label: "Missão", Icon: TrophyIcon },
  { id: "tesouro", label: "Mapa", Icon: MapIcon },
  { id: "album", label: "Álbum", Icon: CardsIcon },
  { id: "horror", label: "Horror", Icon: GhostIcon },
  { id: "foto", label: "Foto", Icon: CameraIcon },
];

export function BottomNav() {
  const game = useGame();
  return (
    <nav className="bottom-nav">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={game.tab === id ? "active" : ""}
          onClick={() => game.setTab(id)}
        >
          <Icon size={20} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
