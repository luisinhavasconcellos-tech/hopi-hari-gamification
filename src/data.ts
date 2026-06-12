export type ZoneId =
  | "kaminda"
  | "infantasia"
  | "mistieri"
  | "aribabiba"
  | "wildwest";

export interface Zone {
  id: ZoneId;
  name: string;
  color: string;
}

export const ZONES: Record<ZoneId, Zone> = {
  kaminda: { id: "kaminda", name: "Kaminda Mundi", color: "#E04646" },
  infantasia: { id: "infantasia", name: "Infantasia", color: "#F59B2D" },
  mistieri: { id: "mistieri", name: "Mistieri", color: "#8B5CF6" },
  aribabiba: { id: "aribabiba", name: "Aribabiba", color: "#2DBE7E" },
  wildwest: { id: "wildwest", name: "Wild West", color: "#C08A2D" },
};

export type Rarity = "COMUM" | "RARA" | "LENDÁRIA";

export const RARITY_META: Record<
  Rarity,
  { label: string; stars: number; color: string; gradient: string }
> = {
  COMUM: {
    label: "Comum",
    stars: 1,
    color: "#7C8DB5",
    gradient: "linear-gradient(90deg, #5C6E96, #7C8DB5)",
  },
  RARA: {
    label: "Rara",
    stars: 2,
    color: "#FFC72C",
    gradient: "linear-gradient(90deg, #E8A20C, #FFC72C)",
  },
  LENDÁRIA: {
    label: "Lendária",
    stars: 3,
    color: "#C77DFF",
    gradient: "linear-gradient(90deg, #7B2FBE, #C77DFF)",
  },
};

export interface Attraction {
  id: string;
  name: string;
  zone: ZoneId;
  category: string;
  intensity: number; // 0–10
  points: number;
  rarity: Rarity;
  clue: string; // treasure-hunt clue, shown before unlock
  story: string; // lenda Hari, revealed at the checkpoint
  challenge: string; // card challenge text
  artFrom: string;
  artTo: string;
}

export const ATTRACTIONS: Attraction[] = [
  {
    id: "katapul",
    name: "Katapul",
    zone: "kaminda",
    category: "RADICAL",
    intensity: 9,
    points: 500,
    rarity: "RARA",
    clue: "Procura a máquina que lança hóspedes ao céu de Kaminda Mundi — para a frente e para trás.",
    story:
      "Dizem que o Katapul foi construído para treinar os mensageiros voadores de Hopi Hari. Só os mais corajosos completam a viagem de olhos abertos.",
    challenge:
      "Enfrenta o lançamento duplo do Katapul e mantém os braços no ar na primeira descida.",
    artFrom: "#FF5E7E",
    artTo: "#C81E4E",
  },
  {
    id: "montezum",
    name: "Montezum",
    zone: "wildwest",
    category: "RADICAL",
    intensity: 10,
    points: 750,
    rarity: "LENDÁRIA",
    clue: "No Wild West dorme um gigante de madeira. Segue o som dos trilhos a rugir.",
    story:
      "O Montezum é o guardião mais antigo do parque — uma montanha de madeira que guarda o tesouro do velho oeste de Hopi Hari há gerações.",
    challenge:
      "Sobrevive às 5 quedas do gigante de madeira sem fechar os olhos. Lenda é lenda.",
    artFrom: "#F2A65A",
    artTo: "#8C4A1F",
  },
  {
    id: "vurang",
    name: "Vurang",
    zone: "mistieri",
    category: "RADICAL",
    intensity: 8,
    points: 450,
    rarity: "RARA",
    clue: "Em Mistieri, algo gira de cabeça para baixo quando a lua aparece. Encontra o morcego de aço.",
    story:
      "Reza a lenda que o Vurang acorda à noite e troca o céu pelo chão. Quem completa o loop ganha a proteção dos mistérios de Mistieri.",
    challenge:
      "Completa o loop do Vurang e descobre o símbolo escondido no topo da estrutura.",
    artFrom: "#9D6BFF",
    artTo: "#3B1D78",
  },
  {
    id: "riobravo",
    name: "Rio Bravo",
    zone: "aribabiba",
    category: "AQUÁTICA",
    intensity: 7,
    points: 350,
    rarity: "COMUM",
    clue: "As águas de Aribabiba escondem uma corrente brava. Quem entra seco, sai herói (e molhado).",
    story:
      "O Rio Bravo nasce nas montanhas secretas de Aribabiba. Cada gota carrega uma história dos exploradores que desceram as corredeiras.",
    challenge:
      "Desce as corredeiras do Rio Bravo e sai do bote com o sorriso intacto.",
    artFrom: "#3ED6A0",
    artTo: "#0E6E5C",
  },
  {
    id: "toureiffel",
    name: "La Tour Eiffel",
    zone: "kaminda",
    category: "PANORÂMICA",
    intensity: 5,
    points: 300,
    rarity: "COMUM",
    clue: "Há um pedaço de Paris em Kaminda Mundi. Sobe até onde o parque inteiro cabe nos teus olhos.",
    story:
      "Do topo da Tour Eiffel, os primeiros habitantes de Hopi Hari desenharam o mapa do parque. É lá que todas as caças ao tesouro começam.",
    challenge:
      "Sobe ao topo da Tour Eiffel e encontra as 5 zonas do parque no horizonte.",
    artFrom: "#6E8BFF",
    artTo: "#2A2E7A",
  },
  {
    id: "giranda",
    name: "Giranda Mundi",
    zone: "infantasia",
    category: "FAMÍLIA",
    intensity: 3,
    points: 150,
    rarity: "COMUM",
    clue: "Em Infantasia, o mundo gira devagarinho. Procura a roda que mostra o parque a sorrir.",
    story:
      "A Giranda Mundi gira desde o primeiro dia de Hopi Hari. Dizem que cada volta completa realiza um desejo pequenino.",
    challenge:
      "Dá uma volta completa na Giranda Mundi e acena para alguém lá em baixo.",
    artFrom: "#FFB45E",
    artTo: "#D9542B",
  },
];

export const ATTRACTION_BY_ID: Record<string, Attraction> = Object.fromEntries(
  ATTRACTIONS.map((a) => [a.id, a])
);

export type TrackId = "conquistador" | "explorador" | "familia";

export interface Track {
  id: TrackId;
  name: string;
  subtitle: string;
  description: string;
  icon: "bolt" | "compass" | "heart";
  missionTitle: string;
  missionItems: string[]; // attraction ids
  reward: string;
}

export const TRACKS: Track[] = [
  {
    id: "conquistador",
    name: "Conquistador Radical",
    subtitle: "Enfrenta as 4 radicais",
    description:
      "Para quem veio sentir o estômago na garganta. Adrenalina em estado puro.",
    icon: "bolt",
    missionTitle: "Enfrenta as 4 radicais",
    missionItems: ["katapul", "montezum", "vurang", "riobravo"],
    reward: "Fast Pass Hópi numa atração radical",
  },
  {
    id: "explorador",
    name: "Explorador de Mistério",
    subtitle: "Decifra as 4 lendas",
    description:
      "Para quem quer descobrir os segredos e as lendas escondidas nas 5 zonas.",
    icon: "compass",
    missionTitle: "Decifra as 4 lendas",
    missionItems: ["vurang", "toureiffel", "montezum", "katapul"],
    reward: "Carta lendária surpresa + 300 Hari Coins",
  },
  {
    id: "familia",
    name: "Família Aventureira",
    subtitle: "Completa as 4 em equipa",
    description:
      "Para tribos de todas as idades. Diversão garantida do mais pequeno ao maior.",
    icon: "heart",
    missionTitle: "Completa as 4 em equipa",
    missionItems: ["giranda", "toureiffel", "riobravo", "katapul"],
    reward: "Foto de família profissional grátis",
  },
];

export const TRACK_BY_ID: Record<TrackId, Track> = Object.fromEntries(
  TRACKS.map((t) => [t.id, t])
) as Record<TrackId, Track>;

export const STARTING_COINS = 1250;
export const MISSION_REWARD_COINS = 500;
export const PHOTO_POINTS = 200;

export const PHOTO_MISSION = {
  title: "Pose radical na Montezum",
  description:
    "Tira uma foto com a tua melhor pose de coragem em frente ao gigante de madeira do Wild West.",
  hashtag: "#HopiHariEmJogo",
};

export function formatCoins(n: number): string {
  return n.toLocaleString("pt-BR");
}
