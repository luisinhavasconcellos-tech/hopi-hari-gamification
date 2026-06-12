import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" so the build works on any static host (GitHub Pages, Netlify, file://)
export default defineConfig({
  plugins: [react()],
  base: "./",
});
