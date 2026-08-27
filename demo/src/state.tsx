import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ATTRACTIONS,
  ATTRACTION_BY_ID,
  COIN_BY_ID,
  MISSION_REWARD_COINS,
  MONSTER_BY_ID,
  PHOTO_POINTS,
  STARTING_COINS,
  TRACK_BY_ID,
  coinValue,
  type TrackId,
} from "./data";

export type Tab = "missao" | "tesouro" | "album" | "foto" | "horror";

export type DemoPreset = "inicio" | "meio" | "quase" | "completo" | "horror";

interface GameState {
  started: boolean;
  tab: Tab;
  track: TrackId | null;
  unlocked: string[];
  coins: number;
  photoSubmitted: boolean;
  missionRewardClaimed: boolean;
  albumRewardClaimed: boolean;
  caughtMonsters: string[];
  collectedCoins: string[];
}

interface GameApi extends GameState {
  missionProgress: { done: number; total: number; items: { id: string; done: boolean }[] };
  albumComplete: boolean;
  scanTarget: string | null;
  revealTarget: string | null;
  start: () => void;
  goHome: () => void;
  chooseTrack: (id: TrackId) => void;
  setTab: (tab: Tab) => void;
  unlock: (id: string) => void;
  beginScan: (id: string) => void;
  finishScan: () => void;
  closeReveal: () => void;
  submitPhoto: () => void;
  claimMissionReward: () => void;
  claimAlbumReward: () => void;
  catchMonster: (id: string) => void;
  collectCoin: (id: string) => void;
  reset: () => void;
  applyPreset: (preset: DemoPreset) => void;
}

const initialState: GameState = {
  started: false,
  tab: "missao",
  track: null,
  unlocked: [],
  coins: STARTING_COINS,
  photoSubmitted: false,
  missionRewardClaimed: false,
  albumRewardClaimed: false,
  caughtMonsters: [],
  collectedCoins: [],
};

const PRESETS: Record<DemoPreset, GameState> = {
  inicio: initialState,
  // matches the deck's "Missão do Dia" screen: 2/4, Katapul + Montezum done
  meio: {
    started: true,
    tab: "missao",
    track: "conquistador",
    unlocked: ["katapul", "montezum"],
    coins:
      STARTING_COINS +
      ATTRACTION_BY_ID.katapul.points +
      ATTRACTION_BY_ID.montezum.points,
    photoSubmitted: false,
    missionRewardClaimed: false,
    albumRewardClaimed: false,
    caughtMonsters: [],
    collectedCoins: [],
  },
  quase: {
    started: true,
    tab: "album",
    track: "conquistador",
    unlocked: ["katapul", "montezum", "vurang", "riobravo", "aeroventuri"],
    coins:
      STARTING_COINS +
      ["katapul", "montezum", "vurang", "riobravo", "aeroventuri"].reduce(
        (s, id) => s + ATTRACTION_BY_ID[id].points,
        0
      ) +
      MISSION_REWARD_COINS,
    photoSubmitted: false,
    missionRewardClaimed: true,
    albumRewardClaimed: false,
    caughtMonsters: [],
    collectedCoins: [],
  },
  completo: {
    started: true,
    tab: "missao",
    track: "conquistador",
    unlocked: ATTRACTIONS.map((a) => a.id),
    coins:
      STARTING_COINS +
      ATTRACTIONS.reduce((s, a) => s + a.points, 0) +
      MISSION_REWARD_COINS +
      PHOTO_POINTS,
    photoSubmitted: true,
    missionRewardClaimed: true,
    albumRewardClaimed: false,
    caughtMonsters: [],
    collectedCoins: [],
  },
  // Hora do Horror em curso: 5 monstros já capturados, 8 moedas colecionadas
  horror: {
    started: true,
    tab: "horror",
    track: "explorador",
    unlocked: ["katapul", "montezum", "vurang"],
    coins: STARTING_COINS + 2400,
    photoSubmitted: false,
    missionRewardClaimed: false,
    albumRewardClaimed: false,
    caughtMonsters: ["retalho", "noiva", "visceral"],
    collectedCoins: ["c02", "c04", "c06", "c09", "c12", "c13", "c16", "c18"],
  },
};

const GameContext = createContext<GameApi | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(initialState);
  // Scan/reveal overlays live here (not in a screen) so the guided tour
  // and demo presets can trigger the same animations as a real tap.
  const [scanTarget, setScanTarget] = useState<string | null>(null);
  const [revealTarget, setRevealTarget] = useState<string | null>(null);

  const start = useCallback(() => {
    setState((s) => ({ ...s, started: true }));
  }, []);

  // Back to the home/welcome page without losing progress.
  const goHome = useCallback(() => {
    setScanTarget(null);
    setRevealTarget(null);
    setState((s) => ({ ...s, started: false, tab: "missao" }));
  }, []);

  const chooseTrack = useCallback((id: TrackId) => {
    setState((s) => ({ ...s, track: id }));
  }, []);

  const setTab = useCallback((tab: Tab) => {
    setState((s) => ({ ...s, tab }));
  }, []);

  const unlock = useCallback((id: string) => {
    setState((s) => {
      if (s.unlocked.includes(id)) return s;
      return {
        ...s,
        unlocked: [...s.unlocked, id],
        coins: s.coins + ATTRACTION_BY_ID[id].points,
      };
    });
  }, []);

  const beginScan = useCallback((id: string) => {
    setScanTarget(id);
  }, []);

  const finishScan = useCallback(() => {
    setScanTarget((id) => {
      if (id) {
        unlock(id);
        setRevealTarget(id);
      }
      return null;
    });
  }, [unlock]);

  const closeReveal = useCallback(() => setRevealTarget(null), []);

  const submitPhoto = useCallback(() => {
    setState((s) =>
      s.photoSubmitted ? s : { ...s, photoSubmitted: true, coins: s.coins + PHOTO_POINTS }
    );
  }, []);

  const claimMissionReward = useCallback(() => {
    setState((s) =>
      s.missionRewardClaimed
        ? s
        : { ...s, missionRewardClaimed: true, coins: s.coins + MISSION_REWARD_COINS }
    );
  }, []);

  const claimAlbumReward = useCallback(() => {
    setState((s) => ({ ...s, albumRewardClaimed: true }));
  }, []);

  const catchMonster = useCallback((id: string) => {
    setState((s) => {
      if (s.caughtMonsters.includes(id)) return s;
      return {
        ...s,
        caughtMonsters: [...s.caughtMonsters, id],
        coins: s.coins + MONSTER_BY_ID[id].points,
      };
    });
  }, []);

  const collectCoin = useCallback((id: string) => {
    setState((s) => {
      if (s.collectedCoins.includes(id)) return s;
      return {
        ...s,
        collectedCoins: [...s.collectedCoins, id],
        coins: s.coins + coinValue(COIN_BY_ID[id]),
      };
    });
  }, []);

  const reset = useCallback(() => {
    setScanTarget(null);
    setRevealTarget(null);
    setState(initialState);
  }, []);

  const applyPreset = useCallback((preset: DemoPreset) => {
    setScanTarget(null);
    setRevealTarget(null);
    setState(PRESETS[preset]);
  }, []);

  const api = useMemo<GameApi>(() => {
    const track = state.track ? TRACK_BY_ID[state.track] : null;
    const items = (track?.missionItems ?? []).map((id) => ({
      id,
      done: state.unlocked.includes(id),
    }));
    return {
      ...state,
      missionProgress: {
        done: items.filter((i) => i.done).length,
        total: items.length || 4,
        items,
      },
      albumComplete: state.unlocked.length === ATTRACTIONS.length,
      scanTarget,
      revealTarget,
      start,
      goHome,
      chooseTrack,
      setTab,
      unlock,
      beginScan,
      finishScan,
      closeReveal,
      submitPhoto,
      claimMissionReward,
      claimAlbumReward,
      catchMonster,
      collectCoin,
      reset,
      applyPreset,
    };
  }, [
    state,
    scanTarget,
    revealTarget,
    start,
    goHome,
    chooseTrack,
    setTab,
    unlock,
    beginScan,
    finishScan,
    closeReveal,
    submitPhoto,
    claimMissionReward,
    claimAlbumReward,
    catchMonster,
    collectCoin,
    reset,
    applyPreset,
  ]);

  return <GameContext.Provider value={api}>{children}</GameContext.Provider>;
}

export function useGame(): GameApi {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside GameProvider");
  return ctx;
}
