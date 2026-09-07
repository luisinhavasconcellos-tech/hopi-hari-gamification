import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { ENV, validateEnv } from "./env";
import { registerApiNotFound, registerErrorHandler, registerSecurity } from "./security";
import { serveStatic, setupVite } from "./vite";
import { registerBriefingRoutes } from "../routes/briefings";
import { registerAuthAccessRoutes } from "../routes/authAccess";
import { registerOperationalRoutes } from "../routes/operational";
import { registerCampaignRoutes } from "../routes/campaigns";
import { registerFollowerSheetRoutes } from "../routes/followerSheet";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  for (const warning of validateEnv()) console.warn(`[Config] ${warning}`);

  const app = express();
  const server = createServer(app);

  // Security headers, CORS/CSRF origin guard, rate limits, request ids.
  registerSecurity(app);

  // Body parsing: a small default limit, and a larger one only for the
  // scheduled narration-audio callback that legitimately posts base64 audio.
  app.use("/api/scheduled/daily-briefing/audio", express.json({ limit: "30mb" }));
  app.use(express.json({ limit: ENV.bodyLimit }));
  app.use(express.urlencoded({ limit: ENV.bodyLimit, extended: false }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerAuthAccessRoutes(app);
  registerBriefingRoutes(app);
  registerOperationalRoutes(app);
  registerCampaignRoutes(app);
  registerFollowerSheetRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: ({ error, path }) => {
        if (error.code === "INTERNAL_SERVER_ERROR") {
          console.error(`[tRPC] ${path ?? "<unknown>"} failed`, error.cause ?? error);
        }
      },
    })
  );
  // Unknown /api routes answer 404 JSON instead of the SPA shell.
  registerApiNotFound(app);

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  registerErrorHandler(app);

  const preferredPort = parseInt(process.env.PORT || "3000", 10);
  // Only development may hop to another port; in production the gateway
  // expects the configured one, so a busy port is a real error.
  const port = ENV.isProduction ? preferredPort : await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.on("error", error => {
    console.error("[Server] failed to start", error);
    process.exit(1);
  });
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(error => {
  console.error("[Server] fatal startup error", error);
  process.exit(1);
});
