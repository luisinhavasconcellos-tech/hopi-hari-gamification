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
  MISSION_REWARD_COINS,
  PHOTO_POINTS,
  STARTING_COINS,
  TRACK_BY_ID,
  type TrackId,
} from "./data";

export type Tab = "missao" | "tesouro" | "album" | "foto";

export type DemoPreset = "inicio" | "meio" | "quase" | "completo";

interface GameState {
  started: boolean;
  tab: Tab;
  track: TrackId | null;
  unlocked: string[];
  coins: number;
  photoSubmitted: boolean;
  missionRewardClaimed: boolean;
  albumRewardClaimed: boolean;
}

interface GameApi extends GameState {
  missionProgress: { done: number; total: number; items: { id: string; done: boolean }[] };
  albumComplete: boolean;
  scanTarget: string | null;
  revealTarget: string | null;
  start: () => void;
  chooseTrack: (id: TrackId) => void;
  setTab: (tab: Tab) => void;
  unlock: (id: string) => void;
  beginScan: (id: string) => void;
  finishScan: () => void;
  closeReveal: () => void;
  submitPhoto: () => void;
  claimMissionReward: () => void;
  claimAlbumReward: () => void;
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
  },
  quase: {
    started: true,
    tab: "album",
    track: "conquistador",
    unlocked: ["katapul", "montezum", "vurang", "riobravo", "toureiffel"],
    coins:
      STARTING_COINS +
      ["katapul", "montezum", "vurang", "riobravo", "toureiffel"].reduce(
        (s, id) => s + ATTRACTION_BY_ID[id].points,
        0
      ) +
      MISSION_REWARD_COINS,
    photoSubmitted: false,
    missionRewardClaimed: true,
    albumRewardClaimed: false,
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
      chooseTrack,
      setTab,
      unlock,
      beginScan,
      finishScan,
      closeReveal,
      submitPhoto,
      claimMissionReward,
      claimAlbumReward,
      reset,
      applyPreset,
    };
  }, [
    state,
    scanTarget,
    revealTarget,
    start,
    chooseTrack,
    setTab,
    unlock,
    beginScan,
    finishScan,
    closeReveal,
    submitPhoto,
    claimMissionReward,
    claimAlbumReward,
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
