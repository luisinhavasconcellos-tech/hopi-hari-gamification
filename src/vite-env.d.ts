/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `giralata` abre o minijogo Giralata como experiência padrão (bundle Android) */
  readonly VITE_DEFAULT_GAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.webp" {
  const src: string;
  export default src;
}
