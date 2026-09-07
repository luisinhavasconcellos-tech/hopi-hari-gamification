import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./client/src/test/setup.ts"],
    include: ["client/src/**/*.{test,spec}.{ts,tsx}", "server/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./client/src"),
      "@shared": path.resolve(import.meta.dirname, "./shared"),
    },
  },
});
