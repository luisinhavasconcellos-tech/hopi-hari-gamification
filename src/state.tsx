import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  PET_CARE,
  STARTING_ORBS,
  catchGain,
  ticketDiscountPct,
  type ThrowQuality,
  type TurmaId,
} from "./turma/data";
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

export type Tab = "missao" | "tesouro" | "album" | "foto" | "horror" | "turma";

export type DemoPreset = "inicio" | "meio" | "quase" | "completo" | "horror" | "turma";

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
  // ---- A Turma (monster games)
  turmaCaught: TurmaId[];
  turmaEscaped: TurmaId[];
  orbs: number;
  pet: PetState | null;
  ownedOutfits: string[];
  petOutfit: string | null;
  ticket: TicketOrder | null;
}

/** Turma em Casa — the monster the visitor took home. All meters 0..100. */
export interface PetState {
  id: TurmaId;
  fome: number;      // barriga (100 = cheia)
  banho: number;
  alegria: number;
  saudade: number;   // saudade do parque/da Turma; 100 = pede para voltar
  saude: number;
  peso: number;      // 50 = normal, 100 = gordinho, 0 = magrinho
  molhado: number;   // 100 right after the shower, dries over time
  morto: boolean;
  active: boolean;   // the life clock starts on the first interaction
}

export interface TicketOrder {
  date: number;
  adults: number;
  kids: number;
  coinsSpent: number;
  discountPct: number;
}

export type PetCare = "comer" | "banho" | "conversar";

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
  // ---- A Turma
  /** Spends one Hari Orb; false when none are left. */
  spendOrb: () => boolean;
  /** Registers a catch and pays the points; returns the gain breakdown. */
  catchTurma: (id: TurmaId, q: ThrowQuality) => ReturnType<typeof catchGain>;
  markEscaped: (id: TurmaId) => void;
  adoptPet: (id: TurmaId) => void;
  /** Applies a finished care action (call it when the animation ends). */
  carePet: (kind: PetCare) => void;
  /** Low-level pet update for UI-only fields. */
  updatePet: (patch: Partial<PetState>) => void;
  revivePet: () => void;
  buyOutfit: (id: string) => void;
  wearOutfit: (id: string | null) => void;
  /** Buys park tickets, spending Hari Coins as a discount when useCoins. */
  buyTickets: (order: { date: number; adults: number; kids: number; useCoins: boolean }) => TicketOrder;
}

export const PET_TICK_MS = 2500;

export function newPet(id: TurmaId): PetState {
  return { id, fome: 35, banho: 40, alegria: 55, saudade: 40, saude: 100, peso: 50, molhado: 0, morto: false, active: false };
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));

/** One step of the pet's life (also used by tests/demo). */
export function petTick(p: PetState): PetState {
  if (p.morto || !p.active) return p;
  const fome = clamp(p.fome - 3);
  const banho = clamp(p.banho - 2);
  const alegria = clamp(p.alegria - 2.5);
  const peso = clamp(p.peso - (fome < 25 ? 3 : 0.6));
  const molhado = clamp(p.molhado - 12);
  const lows = (fome < 15 ? 1 : 0) + (banho < 15 ? 1 : 0) + (alegria < 15 ? 1 : 0) + (peso < 12 ? 1 : 0);
  const saude = clamp(lows ? p.saude - lows * 4 : p.saude + 2);
  return { ...p, fome, banho, alegria, peso, molhado, saude, morto: saude <= 0 };
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
  turmaCaught: [],
  turmaEscaped: [],
  orbs: STARTING_ORBS,
  pet: null,
  ownedOutfits: [],
  petOutfit: null,
  ticket: null,
};

const TURMA_DEFAULTS = {
  turmaCaught: [] as TurmaId[],
  turmaEscaped: [] as TurmaId[],
  orbs: STARTING_ORBS,
  pet: null,
  ownedOutfits: [] as string[],
  petOutfit: null,
  ticket: null,
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
    ...TURMA_DEFAULTS,
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
    ...TURMA_DEFAULTS,
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
    ...TURMA_DEFAULTS,
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
    ...TURMA_DEFAULTS,
  },
  // A Turma: three monsters already caught in AR, Fagulito came home
  turma: {
    started: true,
    tab: "turma",
    track: "familia",
    unlocked: ["giranda", "aeroventuri"],
    coins: STARTING_COINS + 1450,
    photoSubmitted: false,
    missionRewardClaimed: false,
    albumRewardClaimed: false,
    caughtMonsters: [],
    collectedCoins: [],
    ...TURMA_DEFAULTS,
    turmaCaught: ["azuri", "fagulito", "nuvita"],
    orbs: 7,
    pet: newPet("fagulito"),
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

  // ---------------------------------------------------------------- A Turma
  // Latest state for actions that must answer synchronously.
  const stateRef = useRef(state);
  stateRef.current = state;

  const spendOrb = useCallback((): boolean => {
    if (stateRef.current.orbs <= 0) return false;
    stateRef.current = { ...stateRef.current, orbs: stateRef.current.orbs - 1 };
    setState((s) => ({ ...s, orbs: Math.max(0, s.orbs - 1) }));
    return true;
  }, []);

  const catchTurma = useCallback((id: TurmaId, q: ThrowQuality) => {
    const gain = catchGain(id, q);
    setState((s) => {
      if (s.turmaCaught.includes(id)) return s;
      return { ...s, turmaCaught: [...s.turmaCaught, id], coins: s.coins + gain.total };
    });
    return gain;
  }, []);

  const markEscaped = useCallback((id: TurmaId) => {
    setState((s) => (s.turmaEscaped.includes(id) ? s : { ...s, turmaEscaped: [...s.turmaEscaped, id] }));
  }, []);

  const adoptPet = useCallback((id: TurmaId) => {
    setState((s) => (s.pet?.id === id ? s : { ...s, pet: newPet(id) }));
  }, []);

  const carePet = useCallback((kind: PetCare) => {
    setState((s) => {
      const p = s.pet;
      if (!p || p.morto) return s;
      const next: PetState = { ...p, active: true, saudade: clamp(p.saudade + PET_CARE.saudadePerAction) };
      let coins = s.coins;
      if (kind === "comer") {
        next.fome = clamp(p.fome + PET_CARE.comer.gain);
        next.peso = clamp(p.peso + PET_CARE.weightPerSnack);
        coins += PET_CARE.comer.coins;
      } else if (kind === "banho") {
        next.banho = 100;
        next.molhado = 100;
        coins += PET_CARE.banho.coins;
      } else {
        next.alegria = clamp(p.alegria + PET_CARE.conversar.gain);
        coins += PET_CARE.conversar.coins;
      }
      return { ...s, coins, pet: next };
    });
  }, []);

  const updatePet = useCallback((patch: Partial<PetState>) => {
    setState((s) => (s.pet ? { ...s, pet: { ...s.pet, ...patch } } : s));
  }, []);

  const revivePet = useCallback(() => {
    setState((s) => (s.pet ? { ...s, pet: { ...newPet(s.pet.id), active: true } } : s));
  }, []);

  const buyOutfit = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      ownedOutfits: s.ownedOutfits.includes(id) ? s.ownedOutfits : [...s.ownedOutfits, id],
      petOutfit: id,
    }));
  }, []);

  const wearOutfit = useCallback((id: string | null) => {
    setState((s) => (id && !s.ownedOutfits.includes(id) ? s : { ...s, petOutfit: id }));
  }, []);

  const buyTickets = useCallback(
    (o: { date: number; adults: number; kids: number; useCoins: boolean }): TicketOrder => {
      const pct = o.useCoins ? ticketDiscountPct(stateRef.current.coins) : 0;
      const spent = (pct / 5) * 500;
      const order: TicketOrder = { date: o.date, adults: o.adults, kids: o.kids, coinsSpent: spent, discountPct: pct };
      setState((s) => {
        return {
          ...s,
          coins: s.coins - spent,
          ticket: order,
          pet: s.pet ? { ...s.pet, saudade: 0 } : s.pet,
        };
      });
      return order;
    },
    []
  );

  // The pet's life clock: runs once the visitor has interacted with it.
  const petLive = !!state.pet && state.pet.active && !state.pet.morto;
  useEffect(() => {
    if (!petLive) return;
    const t = setInterval(() => {
      setState((s) => (s.pet ? { ...s, pet: petTick(s.pet) } : s));
    }, PET_TICK_MS);
    return () => clearInterval(t);
  }, [petLive]);

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
      spendOrb,
      catchTurma,
      markEscaped,
      adoptPet,
      carePet,
      updatePet,
      revivePet,
      buyOutfit,
      wearOutfit,
      buyTickets,
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
    spendOrb,
    catchTurma,
    markEscaped,
    adoptPet,
    carePet,
    updatePet,
    revivePet,
    buyOutfit,
    wearOutfit,
    buyTickets,
  ]);

  return <GameContext.Provider value={api}>{children}</GameContext.Provider>;
}

export function useGame(): GameApi {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside GameProvider");
  return ctx;
}
