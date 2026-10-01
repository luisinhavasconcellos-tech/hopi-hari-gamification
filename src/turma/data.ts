// A Turma — the nine Hopi Hari characters from the board deck
// ("Personagens Hopi Hari — Apresentação à Diretoria v3"). Shared data for
// the three Turma games: Mapa da Turma, Caça à Turma (AR) and Turma em Casa.
import type { ZoneId } from "../data";
import fagulito from "../assets/turma/fagulito.webp";
import nuvita from "../assets/turma/nuvita.webp";
import azuri from "../assets/turma/azuri.webp";
import pompita from "../assets/turma/pompita.webp";
import luneli from "../assets/turma/luneli.webp";
import zigui from "../assets/turma/zigui.webp";
import tutty from "../assets/turma/tutty.webp";
import mimora from "../assets/turma/mimora.webp";
import zupi from "../assets/turma/zupi.webp";
import orb from "../assets/turma/hopi-orb.webp";

export const HARI_ORB_IMG = orb;

export type TurmaId =
  | "fagulito" | "nuvita" | "azuri" | "pompita" | "luneli"
  | "zigui" | "tutty" | "mimora" | "zupi";

export type TurmaRarity = "comum" | "raro" | "epico" | "lendario";

export interface TurmaMonster {
  id: TurmaId;
  n: number;              // 1..9, deck order
  name: string;
  art: "o" | "a";         // grammatical gender for copy ("o Azuri", "a Luneli")
  role: string;
  traits: [string, string, string];
  line: string;           // deck one-liner
  zone: ZoneId;
  spot: string;           // attraction / meeting point in the zone
  img: string;
  asp: number;            // width / height of the cut-out (feet touch the bottom)
  alt: string;
  colors: { mid: string; deep: string; tint: string };
  rarity: TurmaRarity;
  // Feet position on the full park map (% of the 2000x993 map) and figure
  // height on the 1536px-wide reference board (px).
  map: { x: number; y: number; h: number };
  walk: { meters: number; minutes: number }; // from the visitor (USER_POS)
  talk: [string, string, string];            // Turma em Casa conversation lines
}

export const TURMA: TurmaMonster[] = [
  {
    id: "fagulito", n: 1, name: "Fagulito", art: "o", role: "O líder aventureiro",
    traits: ["Corajoso", "Entusiasmado", "Aventureiro"],
    line: "Dá início às aventuras e encoraja os amigos a vencer seus medos.",
    zone: "kaminda", spot: "Katapul", img: fagulito, asp: 0.932,
    alt: "Fagulito, monstro laranja e peludo de braços abertos",
    colors: { mid: "#E8641E", deep: "#8A3210", tint: "#FFE3D1" }, rarity: "epico",
    map: { x: 22.5, y: 56.0, h: 120 }, walk: { meters: 275, minutes: 4 },
    talk: ["Bora! Amanhã enfrentamos o Katapul outra vez?", "Coragem é só o medo a dar um passo em frente!", "Foste mesmo valente hoje!"],
  },
  {
    id: "nuvita", n: 2, name: "Nuvita", art: "a", role: "A sonhadora do grupo",
    traits: ["Tímida", "Imaginativa", "Sonhadora"],
    line: "Enxerga magia nas pequenas coisas e transforma passeios em histórias encantadas.",
    zone: "infantasia", spot: "Giranda Mundi", img: nuvita, asp: 0.85,
    alt: "Nuvita, monstro verde-água e peludo de orelhas longas",
    colors: { mid: "#3FBFA6", deep: "#17695C", tint: "#D6F5EC" }, rarity: "comum",
    map: { x: 46.5, y: 47.5, h: 112 }, walk: { meters: 135, minutes: 2 },
    talk: ["Sabias que as nuvens daqui parecem algodão-doce?", "Sonhei que a Giranda Mundi girava até à lua…", "Cada cantinho tem uma história escondida."],
  },
  {
    id: "azuri", n: 3, name: "Azuri", art: "o", role: "O guardião da turma",
    traits: ["Gentil", "Protetor", "Confiável"],
    line: "Grande por fora e delicado por dentro, faz todos se sentirem seguros e bem-vindos.",
    zone: "wildwest", spot: "Montezum", img: azuri, asp: 0.693,
    alt: "Azuri, monstro azul, grande e peludo, a acenar",
    colors: { mid: "#2F55D4", deep: "#172E86", tint: "#DCE5FF" }, rarity: "epico",
    map: { x: 39.5, y: 75.0, h: 150 }, walk: { meters: 140, minutes: 2 },
    talk: ["Podes contar comigo, está bem? Eu cuido de ti.", "Grandalhão por fora, fofinho por dentro!", "Aqui em casa estás seguro."],
  },
  {
    id: "pompita", n: 4, name: "Pompita", art: "a", role: "A comediante",
    traits: ["Brincalhona", "Dançarina", "Divertida"],
    line: "Transforma qualquer problema em brincadeira e inventa dancinhas.",
    zone: "aribabiba", spot: "Ponto de encontro", img: pompita, asp: 0.923,
    alt: "Pompita, monstro cor-de-rosa e peludo a dançar",
    colors: { mid: "#E84C8B", deep: "#8E1E50", tint: "#FFDDEA" }, rarity: "comum",
    map: { x: 82.5, y: 60.5, h: 108 }, walk: { meters: 405, minutes: 5 },
    talk: ["Olha a minha dancinha nova! Tchá-tchá-tchá!", "Se correr mal, rimo-nos e tentamos outra vez!", "Bora dançar antes do jantar?"],
  },
  {
    id: "luneli", n: 5, name: "Luneli", art: "a", role: "A pacificadora",
    traits: ["Calma", "Paciente", "Conselheira"],
    line: "Escuta os amigos com carinho e encontra soluções tranquilas para os desafios.",
    zone: "mistieri", spot: "Vurang", img: luneli, asp: 0.75,
    alt: "Luneli, monstro lilás e peludo de olhar sereno",
    colors: { mid: "#A99BEA", deep: "#4F418F", tint: "#E9E4FF" }, rarity: "raro",
    map: { x: 61.0, y: 36.0, h: 108 }, walk: { meters: 350, minutes: 5 },
    talk: ["Respira fundo… vai correr tudo bem.", "Que dia bonito tivemos, não foi?", "Queres contar-me como foi o teu dia?"],
  },
  {
    id: "zigui", n: 6, name: "Zigui", art: "o", role: "O explorador",
    traits: ["Elétrico", "Otimista", "Explorador"],
    line: "Quer experimentar todas as atrações e contagia o grupo com sua energia.",
    zone: "aribabiba", spot: "Rio Bravo", img: zigui, asp: 0.679,
    alt: "Zigui, monstro verde e peludo de barriga amarela e braços no ar",
    colors: { mid: "#7CC23A", deep: "#3D6B14", tint: "#E4F5D1" }, rarity: "raro",
    map: { x: 76.5, y: 48.0, h: 116 }, walk: { meters: 380, minutes: 5 },
    talk: ["E agora? Qual é a próxima aventura?!", "Quero andar em TODAS as atrações!", "Não consigo estar quieto, bora brincar!"],
  },
  {
    id: "tutty", n: 7, name: "Tutty", art: "a", role: "O coração da turma",
    traits: ["Carinhosa", "Sensível", "Acolhedora"],
    line: "Percebe quando alguém precisa de apoio e oferece os melhores abraços do parque.",
    zone: "infantasia", spot: "Ponto de encontro", img: tutty, asp: 0.627,
    alt: "Tutty, monstro azul-turquesa e peludo de barriga cor-de-rosa",
    colors: { mid: "#33B6CF", deep: "#146A7C", tint: "#D4F1F7" }, rarity: "comum",
    map: { x: 55.0, y: 50.5, h: 108 }, walk: { meters: 180, minutes: 2 },
    talk: ["Anda cá, ganha um abraço!", "Reparei que estás cansado. Descansa um bocadinho.", "És muito especial para mim."],
  },
  {
    id: "mimora", n: 8, name: "Mimora", art: "a", role: "A estrategista",
    traits: ["Inteligente", "Organizada", "Cuidadosa"],
    line: "Planeja aventuras, observa detalhes e ajuda a turma a encontrar o melhor caminho.",
    zone: "mistieri", spot: "Ponto de encontro", img: mimora, asp: 0.592,
    alt: "Mimora, monstro cor de ameixa e peludo com topete em espiral",
    colors: { mid: "#8E3F7A", deep: "#4D1C42", tint: "#F3DDEB" }, rarity: "raro",
    map: { x: 74.0, y: 42.0, h: 104 }, walk: { meters: 390, minutes: 5 },
    talk: ["Já planeei o nosso próximo passeio ao parque!", "Primeiro o Vurang, depois a Giranda. Anotado!", "Pormenor importante: não te esqueças do protetor solar."],
  },
  {
    id: "zupi", n: 9, name: "Zupi", art: "o", role: "O artista e inventor",
    traits: ["Criativo", "Curioso", "Inventor"],
    line: "Adora cores, música e ideias malucas e surpreende os amigos com novas soluções.",
    zone: "kaminda", spot: "Aero Venturi", img: zupi, asp: 0.75,
    alt: "Zupi, monstro peludo às riscas amarelas, roxas e azuis, a acenar",
    colors: { mid: "#F2B21C", deep: "#3E2390", tint: "#FFF1C7" }, rarity: "lendario",
    map: { x: 37.0, y: 49.0, h: 118 }, walk: { meters: 190, minutes: 3 },
    talk: ["Inventei um chapéu que toca música! Queres ver?", "Mistura azul com laranja… dá Zupi!", "Toda a ideia maluca começa com “e se…?”"],
  },
];

export const TURMA_BY_ID = Object.fromEntries(TURMA.map((m) => [m.id, m])) as Record<TurmaId, TurmaMonster>;

// Monsters within catching range of the visitor (visible on the zoomed AR map).
export const TURMA_NEAR: TurmaId[] = ["azuri", "nuvita", "tutty", "zupi"];

// ---------------------------------------------------------------- Caça à Turma
// Rarity colours follow the existing MONSTER_RARITY_META of the Hora do Horror hunt.
export const TURMA_RARITY: Record<TurmaRarity, {
  label: string; points: number; ringSeconds: number; ring: string; tint: string; ink: string;
}> = {
  comum:    { label: "Comum",    points: 150, ringSeconds: 2.2, ring: "#8FA66B", tint: "#EEF3E4", ink: "#4A5E2A" },
  raro:     { label: "Raro",     points: 300, ringSeconds: 1.8, ring: "#5BC0E8", tint: "#DFF3FB", ink: "#145E7C" },
  epico:    { label: "Épico",    points: 500, ringSeconds: 1.4, ring: "#C77DFF", tint: "#F3E6FF", ink: "#6A2BA0" },
  lendario: { label: "Lendário", points: 800, ringSeconds: 1.1, ring: "#FF8A1E", tint: "#FFEBD6", ink: "#8A4300" },
};

export type ThrowQuality = "bom" | "otimo" | "perfeito";
export const THROW_QUALITY: Record<ThrowQuality, { label: string; mult: number; multLabel: string }> = {
  bom:      { label: "Bom",      mult: 1,   multLabel: "1" },
  otimo:    { label: "Ótimo",    mult: 1.5, multLabel: "1,5" },
  perfeito: { label: "Perfeito", mult: 2,   multLabel: "2" },
};
export const FIRST_CATCH_BONUS = 100;
export const STARTING_ORBS = 10;

/** Ring scale at the moment of the throw (1 → 0.3) decides the quality. */
export function throwQuality(ringScale: number): ThrowQuality {
  return ringScale <= 0.45 ? "perfeito" : ringScale <= 0.7 ? "otimo" : "bom";
}

export function catchGain(id: TurmaId, q: ThrowQuality) {
  const base = TURMA_RARITY[TURMA_BY_ID[id].rarity].points;
  const withThrow = Math.round(base * THROW_QUALITY[q].mult);
  return { base, bonus: withThrow - base, first: FIRST_CATCH_BONUS, total: withThrow + FIRST_CATCH_BONUS };
}

/** Épico/Lendário can break free on a "Bom" throw; the next throw at the same monster always catches. */
export function catches(id: TurmaId, q: ThrowQuality, escapedBefore: boolean): boolean {
  const r = TURMA_BY_ID[id].rarity;
  return q !== "bom" || r === "comum" || r === "raro" || escapedBefore;
}

// ---------------------------------------------------------------- Turma em Casa
export const PET_CARE = {
  comer:     { coins: 10, gain: 30 },
  banho:     { coins: 15 },
  conversar: { coins: 5, gain: 20 },
  saudadePerAction: 20,
  weightPerSnack: 12,
};

export const SNACKS = [
  { id: "pipoca", name: "Pipoca", line: "Hmm, pipocas iguaizinhas às do parque!" },
  { id: "algodao", name: "Algodão-doce", line: "Algodão-doce! Lembra a Infantasia…" },
  { id: "churros", name: "Churros", line: "Churros quentinhos, que delícia!" },
  { id: "maca", name: "Maçã do amor", line: "Maçã do amor! A minha preferida!" },
] as const;
export type SnackId = (typeof SNACKS)[number]["id"];

/** Hari Coins → ticket discount: every 500 coins = 5 %, up to 20 %. */
export function ticketDiscountPct(coins: number): number {
  return Math.min(20, Math.floor(coins / 500) * 5);
}

// ---------------------------------------------------------------- Guarda-roupa (paid outfits)
export interface OutfitCollection { key: string; label: string; short: string; price: number }
export const OUTFIT_COLLECTIONS: OutfitCollection[] = [
  { key: "diaadia", label: "Dia a dia", short: "Dia a dia", price: 4.9 },
  { key: "parque", label: "Parque Hopi Hari", short: "Parque", price: 6.9 },
  { key: "festa", label: "Festa", short: "Festa", price: 6.9 },
  { key: "horror", label: "Hora do Horror", short: "Horror", price: 7.9 },
  { key: "lendarias", label: "Lendárias", short: "Lendárias", price: 12.9 },
];

// Order = sprite frame order (10 x 5 grid, row-major). Mirrors outfits.py.
export const OUTFITS: { id: string; name: string; coll: string }[] = [
  ["diaadia", "moletom-azul", "Moletom Azul"], ["diaadia", "jardineira", "Jardineira"], ["diaadia", "camiseta-amarela", "Camisola Amarela"],
  ["diaadia", "pijama", "Pijama de Estrelas"], ["diaadia", "inverno", "Inverno Quentinho"], ["diaadia", "jaqueta-jeans", "Casaco de Ganga"],
  ["diaadia", "marinheiro", "Marinheiro"], ["diaadia", "esportista", "Desportista"], ["diaadia", "capa-de-chuva", "Capa de Chuva"],
  ["diaadia", "estudioso", "Estudioso"],
  ["parque", "uniforme-hopi", "Uniforme Hopi"], ["parque", "fa-montezum", "Fã do Montezum"], ["parque", "explorador", "Explorador de Aribabiba"],
  ["parque", "xerife", "Xerife do Wild West"], ["parque", "rei-kaminda", "Rei de Kaminda"], ["parque", "mago-mistieri", "Mago de Mistieri"],
  ["parque", "princesa-infantasia", "Realeza de Infantasia"], ["parque", "bote-rio-bravo", "Bote do Rio Bravo"], ["parque", "torcedor-hopi", "Adepto Hopi"],
  ["parque", "guia-do-parque", "Guia do Parque"],
  ["festa", "festa-junina", "Festa Junina"], ["festa", "carnaval", "Carnaval"], ["festa", "aniversario", "Aniversário"],
  ["festa", "bailarina", "Bailarina"], ["festa", "gala", "Noite de Gala"], ["festa", "rockstar", "Rockstar"],
  ["festa", "discoteca", "Discoteca"], ["festa", "havai", "Luau"], ["festa", "confeiteiro", "Pasteleiro"],
  ["festa", "abelhinha", "Abelhinha"],
  ["horror", "vampiro", "Vampiro"], ["horror", "bruxinha", "Bruxinha"], ["horror", "mumia", "Múmia"],
  ["horror", "esqueleto", "Esqueleto"], ["horror", "abobora", "Abóbora"], ["horror", "fantasma", "Fantasma"],
  ["horror", "doutor-retalho", "Doutor Retalho"], ["horror", "madame-kiki", "Madame Kiki"], ["horror", "cacador", "Caçador de Fantasmas"],
  ["horror", "noiva-palida", "Noiva Pálida"],
  ["lendarias", "super-heroi", "Super-Herói"], ["lendarias", "astronauta", "Astronauta"], ["lendarias", "rei-dourado", "Rei Dourado"],
  ["lendarias", "cavaleiro", "Cavaleiro"], ["lendarias", "pirata", "Pirata"], ["lendarias", "mergulhador", "Mergulhador"],
  ["lendarias", "aviador", "Aviador"], ["lendarias", "magico", "Mágico"], ["lendarias", "realeza-hopi", "Realeza Hopi"],
  ["lendarias", "lenda-hopi", "Lenda Hopi"],
].map(([coll, id, name]) => ({ coll, id, name }));

export const OUTFIT_INDEX: Record<string, number> = Object.fromEntries(OUTFITS.map((o, i) => [o.id, i]));
export const OUTFIT_BY_ID = Object.fromEntries(OUTFITS.map((o) => [o.id, o]));
export const COLLECTION_BY_KEY = Object.fromEntries(OUTFIT_COLLECTIONS.map((c) => [c.key, c])) as Record<string, OutfitCollection>;

/** Outfit sprite geometry (see scratchpad wear/compose.py): each frame is the
 * monster box padded by PX on the sides, PT above (hats) and PB below. */
export const WEAR_GRID = { cols: 10, rows: 5, px: 0.12, pt: 0.36, pb: 0.02 };

// Sprites are optional per monster: only those already rendered ship.
const wearFiles = import.meta.glob("../assets/turma/wear/*.webp", { eager: true, import: "default" }) as Record<string, string>;
export function wearSprite(id: TurmaId, layer: "front" | "back"): string | null {
  return wearFiles[`../assets/turma/wear/${id}-${layer}.webp`] ?? null;
}

export function formatBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
