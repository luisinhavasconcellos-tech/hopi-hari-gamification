// Real monster art (Hora do Horror cyber-horror figures). Imported so Vite
// inlines them as base64 data URIs into the bundle — keeps the single-file
// build self-contained and offline.
import kiki from "./assets/monsters/kiki.webp";
import retalho from "./assets/monsters/retalho.webp";
import ceifador from "./assets/monsters/ceifador.webp";
import noiva from "./assets/monsters/noiva.webp";
import visceral from "./assets/monsters/visceral.webp";

export const MONSTER_IMG: Record<string, string> = {
  kiki,
  retalho,
  ceifador,
  noiva,
  visceral,
};
