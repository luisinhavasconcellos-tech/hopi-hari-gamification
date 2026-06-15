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
    color: "#5C6E96",
    gradient: "linear-gradient(90deg, #8FA3C8, #B9C6E0)",
  },
  RARA: {
    label: "Rara",
    stars: 2,
    color: "#E8970A",
    gradient: "linear-gradient(90deg, #F0A800, #FFC72C)",
  },
  LENDÁRIA: {
    label: "Lendária",
    stars: 3,
    color: "#8E3FD4",
    gradient: "linear-gradient(90deg, #9B50DC, #C77DFF)",
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
    id: "aeroventuri",
    name: "Aero Venturi",
    zone: "kaminda",
    category: "RADICAL",
    intensity: 8,
    points: 400,
    rarity: "RARA",
    clue: "A estrela mais nova de Kaminda Mundi gira a 40 metros do chão. Olha para cima e segue os gritos!",
    story:
      "O Aero Venturi é o mais novo guardião dos céus de Hopi Hari — 12 braços voadores que giram a 40 metros e veem o parque inteiro.",
    challenge:
      "Voa no Aero Venturi e tenta avistar o Montezum lá do alto, a 40 metros de altura.",
    artFrom: "#5EC8F8",
    artTo: "#1B3FA0",
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
    missionItems: ["vurang", "aeroventuri", "montezum", "katapul"],
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
    missionItems: ["giranda", "aeroventuri", "riobravo", "katapul"],
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

// Pseudo-GPS: converte a distância em % do mapa para metros e minutos a pé.
// O parque tem ~1,2 km de ponta a ponta, daí o fator de escala.
export function routeInfo(
  from: { x: number; y: number },
  to: { x: number; y: number }
): { meters: number; minutes: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const pct = Math.sqrt(dx * dx + dy * dy);
  const meters = Math.round((pct * 11) / 5) * 5; // arredonda a 5 m
  const minutes = Math.max(1, Math.round(meters / 75));
  return { meters, minutes };
}

/* ============================================================
   HORA DO HORROR — edição especial (jogos sazonais)
   ============================================================ */

export type MonsterRarity = "COMUM" | "RARO" | "ÉPICO" | "LENDÁRIO";

export const MONSTER_RARITY_META: Record<
  MonsterRarity,
  { label: string; color: string; glow: string }
> = {
  COMUM: { label: "Comum", color: "#8FA66B", glow: "rgba(143,166,107,0.5)" },
  RARO: { label: "Raro", color: "#5BC0E8", glow: "rgba(91,192,232,0.55)" },
  ÉPICO: { label: "Épico", color: "#C77DFF", glow: "rgba(199,125,255,0.6)" },
  LENDÁRIO: { label: "Lendário", color: "#FF8A1E", glow: "rgba(255,138,30,0.7)" },
};

export interface Monster {
  id: string;
  name: string;
  house: string; // a casa / atração da Hora do Horror
  zone: ZoneId;
  rarity: MonsterRarity;
  points: number;
  color: string;
  blurb: string;
  // posição no mapa GPS do parque (% do contentor)
  x: number;
  y: number;
}

// "Pokémon Go" do Hopi Hari — os monstros da Hora do Horror espalhados
// pelo parque. Mesma mecânica: vê no mapa GPS, segue as direções e captura.
export const MONSTERS: Monster[] = [
  {
    id: "kiki",
    name: "Madame Kiki",
    house: "A Vidente",
    zone: "mistieri",
    rarity: "LENDÁRIO",
    points: 800,
    color: "#C32FB0",
    blurb: "A mãe de todos os medos do Hopi Hari. Vê o teu futuro… e o teu fim.",
    x: 57,
    y: 46,
  },
  {
    id: "retalho",
    name: "Doutor Retalho",
    house: "A Clínica",
    zone: "kaminda",
    rarity: "ÉPICO",
    points: 550,
    color: "#5BC06E",
    blurb: "A consulta é grátis. A saída é que custa caro. Ele diz que te falta uma peça.",
    x: 44,
    y: 40,
  },
  {
    id: "ceifador",
    name: "O Ceifador de Aço",
    house: "Cemitério Cibernético",
    zone: "wildwest",
    rarity: "ÉPICO",
    points: 500,
    color: "#E07A2E",
    blurb: "Metade homem, metade caveira, metade máquina. As contas não fecham — e é por isso que mete medo.",
    x: 28,
    y: 58,
  },
  {
    id: "noiva",
    name: "A Noiva Pálida",
    house: "Mansão Mal-Assombrada",
    zone: "mistieri",
    rarity: "RARO",
    points: 350,
    color: "#7FA8D0",
    blurb: "Esperou 100 anos no altar. Os fios soltos são as promessas que ninguém cumpriu.",
    x: 67,
    y: 51,
  },
  {
    id: "visceral",
    name: "O Visceral",
    house: "O Açougue",
    zone: "wildwest",
    rarity: "RARO",
    points: 320,
    color: "#E0344B",
    blurb: "Tantos olhos para te ver, tantos fios para te alcançar. O corte do dia és tu.",
    x: 40,
    y: 66,
  },
];

// Onde está o visitante no mapa (entrada / praça central).
export const USER_POS = { x: 46, y: 64 };

// Posição de cada atração no mapa GPS do parque (% do contentor).
export const ATTRACTION_POS: Record<string, { x: number; y: number }> = {
  montezum: { x: 30, y: 30 },
  aeroventuri: { x: 39, y: 45 },
  katapul: { x: 26, y: 47 },
  giranda: { x: 49, y: 50 },
  vurang: { x: 72, y: 42 },
  riobravo: { x: 75, y: 57 },
};

export const MONSTER_BY_ID: Record<string, Monster> = Object.fromEntries(
  MONSTERS.map((m) => [m.id, m])
);

export type CoinRarity = "COMUM" | "RARA" | "ÉPICA" | "LENDÁRIA";

export const COIN_RARITY_META: Record<
  CoinRarity,
  { value: number; color: string; gradient: string }
> = {
  COMUM: { value: 50, color: "#B98A3E", gradient: "linear-gradient(145deg,#D9A94E,#9C6E2A)" },
  RARA: { value: 120, color: "#C0C6D6", gradient: "linear-gradient(145deg,#E6EBF5,#9AA4BC)" },
  ÉPICA: { value: 250, color: "#C77DFF", gradient: "linear-gradient(145deg,#D9A6FF,#8E3FD4)" },
  LENDÁRIA: { value: 600, color: "#FFC72C", gradient: "linear-gradient(145deg,#FFE08A,#E8970A)" },
};

export interface HorrorCoin {
  id: string;
  year: number; // edição/ano da Hora do Horror
  theme: string;
  rarity: CoinRarity;
  story: string;
}

// As 25 Moedas — uma por cada ano da Hora do Horror, cada uma com o tema
// dessa edição. Escaneia, joga o mini-jogo e desbloqueia a história.
export const HORROR_COINS: HorrorCoin[] = [
  { id: "c01", year: 2001, theme: "A Maldição Original", rarity: "ÉPICA", story: "A primeira noite de horror do Hopi Hari. Dizem que as luzes nunca mais se apagaram por completo." },
  { id: "c02", year: 2002, theme: "Cemitério Maldito", rarity: "COMUM", story: "As campas abriram-se numa só noite. Quem entra conta as lápides; quem sai, não consegue parar." },
  { id: "c03", year: 2003, theme: "A Mansão", rarity: "RARA", story: "Cada quarto guarda um hóspede que nunca fez o check-out." },
  { id: "c04", year: 2004, theme: "O Hospício", rarity: "COMUM", story: "Os médicos foram-se embora há décadas. Os pacientes… ficaram a tratar uns dos outros." },
  { id: "c05", year: 2005, theme: "Circo do Medo", rarity: "RARA", story: "O espetáculo nunca acaba. O palhaço insiste que ainda faltas tu no número final." },
  { id: "c06", year: 2006, theme: "O Açougue", rarity: "COMUM", story: "O carniceiro afia a faca ao ritmo do teu coração. Quanto mais corres, mais depressa ele afia." },
  { id: "c07", year: 2007, theme: "A Mina dos Mortos", rarity: "RARA", story: "Os mineiros desceram à procura de ouro. Encontraram outra coisa — e trouxeram-na de volta." },
  { id: "c08", year: 2008, theme: "Vodu", rarity: "ÉPICA", story: "Uma boneca com o teu nome cosido no peito. Cada alfinete é um arrepio teu." },
  { id: "c09", year: 2009, theme: "Floresta Maldita", rarity: "COMUM", story: "As árvores movem-se quando não olhas. O caminho de saída muda de sítio todas as noites." },
  { id: "c10", year: 2010, theme: "A Clínica", rarity: "RARA", story: "O Doutor Retalho diz que tens uma peça a mais. Ele faz questão de a remover." },
  { id: "c11", year: 2011, theme: "Lobisomens", rarity: "ÉPICA", story: "A lua cheia sobre Kaminda Mundi. Conta os uivos — se passarem de sete, corre." },
  { id: "c12", year: 2012, theme: "O Fim do Mundo", rarity: "COMUM", story: "Profetizaram o apocalipse. No Hopi Hari, ele chegou mesmo — e ficou para o ano seguinte." },
  { id: "c13", year: 2013, theme: "Os Esgotos", rarity: "COMUM", story: "Algo desceu pelos ralos e cresceu no escuro. Agora tem fome e conhece o caminho de volta." },
  { id: "c14", year: 2014, theme: "Vampiros", rarity: "RARA", story: "O baile nunca termina antes do amanhecer — e o amanhecer nunca chega aqui dentro." },
  { id: "c15", year: 2015, theme: "Bonecos Assassinos", rarity: "ÉPICA", story: "Brinquedos que aprenderam a brincar de volta. O teu favorito está mesmo atrás de ti." },
  { id: "c16", year: 2016, theme: "Múmias", rarity: "COMUM", story: "Despertaram da tumba à procura do ladrão do amuleto. Acham que és tu." },
  { id: "c17", year: 2017, theme: "Bruxaria", rarity: "RARA", story: "O caldeirão ferve com algo teu lá dentro. O feitiço só precisa de um último ingrediente." },
  { id: "c18", year: 2018, theme: "A Quarentena", rarity: "COMUM", story: "Selaram a ala para conter o surto. Selaram-te lá dentro também." },
  { id: "c19", year: 2019, theme: "O Manicômio", rarity: "RARA", story: "Ala 13, leito vazio à tua espera. A enfermeira já tem a tua ficha preenchida." },
  { id: "c20", year: 2020, theme: "Almas Penadas", rarity: "ÉPICA", story: "O ano em que o parque ficou em silêncio — e os espíritos tiveram o lugar só para eles." },
  { id: "c21", year: 2021, theme: "O Retorno", rarity: "RARA", story: "Os portões reabriram. Tudo o que tinha adormecido acordou esfomeado." },
  { id: "c22", year: 2022, theme: "Demônios", rarity: "ÉPICA", story: "O contrato já está assinado com o teu nome. Vieste só buscar a tua cópia." },
  { id: "c23", year: 2023, theme: "Lua de Sangue", rarity: "RARA", story: "O céu ficou vermelho sobre o parque. Tudo o que ela toca ganha vontade própria." },
  { id: "c24", year: 2024, theme: "O Apocalipse Hári", rarity: "ÉPICA", story: "Todas as casas, todos os monstros, uma só noite. A maior edição de sempre — até agora." },
  { id: "c25", year: 2025, theme: "25 Anos de Medo · Madame Kiki", rarity: "LENDÁRIA", story: "A moeda mestra. Madame Kiki reúne 25 anos de pesadelos numa só lenda. Tê-la é dominar o horror." },
];

export const COIN_BY_ID: Record<string, HorrorCoin> = Object.fromEntries(
  HORROR_COINS.map((c) => [c.id, c])
);

export function coinValue(c: HorrorCoin): number {
  return COIN_RARITY_META[c.rarity].value;
}

// Recompensas VIP da Caça às 25 Moedas (do deck).
export const COIN_REWARDS = [
  "Fura-fila num brinquedo radical",
  "Maquilhagem da Hora do Horror cortesia",
  "VIP pass pelo resto do dia",
  "Passaporti extra",
  "Karpis Rédi — serviço VIP exclusivo",
];
