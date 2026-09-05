import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// base: "./" so the build works on any static host (GitHub Pages, Netlify, file://,
// and the Android WebView asset origin).
// assetsInlineLimit huge: inline ALL assets (incl. the monster .webp and the
// Giralata SVGs) as base64 data URIs so single-file builds work fully offline.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    assetsInlineLimit: 100 * 1024 * 1024,
    chunkSizeWarningLimit: 4000,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
