import { defineConfig } from "vite";
import type { Plugin, ViteDevServer } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { componentTagger } from "lovable-tagger";

function managedStorageProxy(): Plugin {
  return {
    name: "managed-storage-proxy",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/manus-storage", async (req, res) => {
        const key = req.url?.replace(/^\//, "");
        const forgeBaseUrl = (process.env.BUILT_IN_FORGE_API_URL || "").replace(/\/+$/, "");
        const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;

        if (!key || !forgeBaseUrl || !forgeKey) {
          res.writeHead(404);
          res.end();
          return;
        }

        try {
          const forgeUrl = new URL("v1/storage/presign/get", `${forgeBaseUrl}/`);
          forgeUrl.searchParams.set("path", key);
          const response = await fetch(forgeUrl, {
            headers: { Authorization: `Bearer ${forgeKey}` },
          });
          const payload = (await response.json()) as { url?: string };
          if (!response.ok || !payload.url) throw new Error("Storage lookup failed");
          res.writeHead(307, { Location: payload.url, "Cache-Control": "no-store" });
          res.end();
        } catch {
          res.writeHead(502);
          res.end();
        }
      });
    },
  };
}

/**
 * Standalone Hopi Hari BI deployment: clean root routes, managed static output,
 * and the original semantic design system under client/src/index.css.
 */
export default defineConfig({
  base: "/",
  root: path.resolve(import.meta.dirname, "client"),
  envDir: path.resolve(import.meta.dirname),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 3000,
    strictPort: false,
    hmr: { overlay: false },
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
  },
  plugins: [
    react(),
    managedStorageProxy(),
    process.env.NODE_ENV === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
});
