import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" so the build works on any static host (GitHub Pages, Netlify, file://)
// assetsInlineLimit huge: inline ALL assets (incl. the monster .webp) as
// base64 data URIs so the single-file hopi-hari-demo.html works fully offline.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    assetsInlineLimit: 100 * 1024 * 1024,
  },
});
