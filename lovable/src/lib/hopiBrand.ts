// ============================================================
// HOPI HARI · Tokens de marca em TypeScript
// Use para estilos inline, bibliotecas de gráficos, ou para
// estender o tema do Tailwind (ver `hopiTailwindColors` abaixo).
// A fonte de verdade visual é src/styles/hopi-brand.css.
// ============================================================

export const hopiColors = {
  // Primárias
  blue: '#1c3eb8',        // azul royal — cor principal da marca
  blueBright: '#2b57e0',  // hovers, links, gradientes
  blueDeep: '#122a80',    // texto sobre amarelo, fundos profundos
  green: '#62bb46',       // verde Hopi — sucesso, progresso
  greenDeep: '#4a9e33',
  yellow: '#ffc72c',      // amarelo Hopi — CTAs, moedas, destaque
  yellowDeep: '#f0a800',
  red: '#e84b3c',         // alertas e urgência

  // Tinta (texto)
  ink: '#122456',
  inkDim: 'rgba(18, 36, 86, 0.66)',
  inkFaint: 'rgba(18, 36, 86, 0.42)',

  // Superfícies
  bg: '#f2f6ff',
  card: '#ffffff',
  line: 'rgba(18, 36, 86, 0.1)',

  // Hora do Horror (variante sazonal)
  horror: {
    bg: '#140c24',
    bgDeep: '#0f0a1e',
    panel: '#241634',
    purple: '#c77dff',
    gold: '#ffd86b',
    orange: '#ff8a1e',
  },
} as const;

export const hopiShape = {
  radius: '18px',
  radiusPill: '999px',
  shadow: '0 18px 50px rgba(18, 42, 128, 0.18)',
  shadowCard: '0 6px 22px rgba(18, 42, 128, 0.1)',
  shadowCta: '0 8px 22px rgba(240, 168, 0, 0.4)',
} as const;

export const hopiFonts = {
  sans: "'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Trebuchet MS', Roboto, 'Helvetica Neue', Arial, sans-serif",
  googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap',
} as const;

// Gradientes assinatura (mesmos do site e da demo de gamificação)
export const hopiGradients = {
  page: 'linear-gradient(180deg, #e8efff 0%, #f6f9ff 60%, #eaf6e4 100%)',
  cta: 'linear-gradient(180deg, #ffc72c, #f0a800)',
  heroBlue: 'linear-gradient(160deg, #2b57e0, #122a80)',
  progressGreen: 'linear-gradient(90deg, #62bb46, #8ed44f)',
  horrorPage: 'linear-gradient(180deg, #0f0a1e, #140c24)',
} as const;

// ── Extensão para tailwind.config (Lovable usa Tailwind) ──
// Em tailwind.config.{ts,js}:
//   import { hopiTailwindColors } from './src/lib/hopiBrand';
//   theme: { extend: { colors: hopiTailwindColors, borderRadius: { hopi: '18px' } } }
// Depois: bg-hopi-blue, text-hopi-ink, bg-hopi-yellow, rounded-hopi, etc.
export const hopiTailwindColors = {
  hopi: {
    blue: hopiColors.blue,
    'blue-bright': hopiColors.blueBright,
    'blue-deep': hopiColors.blueDeep,
    green: hopiColors.green,
    'green-deep': hopiColors.greenDeep,
    yellow: hopiColors.yellow,
    'yellow-deep': hopiColors.yellowDeep,
    red: hopiColors.red,
    ink: hopiColors.ink,
    bg: hopiColors.bg,
  },
} as const;

// ── Paleta categórica para gráficos (ordem fixa, nunca ciclar) ──
// Ordem pensada para separação de matiz entre séries vizinhas.
export const hopiChartPalette = [
  hopiColors.blue,
  hopiColors.yellowDeep,
  hopiColors.green,
  hopiColors.red,
  hopiColors.horror.purple,
] as const;
