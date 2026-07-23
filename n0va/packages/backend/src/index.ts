import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";

import { config } from "./config";
import { authMiddleware, tenantMiddleware } from "./middleware/auth";
import { errorHandler } from "./middleware/errorHandler";

import campaignRoutes from "./routes/campaigns";
import agentRoutes from "./routes/agents";
import platformRoutes from "./routes/platforms";
import creativeRoutes from "./routes/creatives";
import audienceRoutes from "./routes/audiences";
import analyticsRoutes from "./routes/analytics";
import recipeRoutes from "./routes/recipes";
import attributionRoutes from "./routes/attribution";
import fraudRoutes from "./routes/fraud";
import optimizerRoutes from "./routes/optimizer";
import webhookRoutes from "./routes/webhooks";
import settingsRoutes from "./routes/settings";
import hyperContextRoutes from "./routes/hypercontext";
import notificationsRoutes from "./routes/notifications";
import activityRoutes from "./routes/activity";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: config.corsOrigin, methods: ["GET", "POST"] },
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.corsOrigin }));
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));

let usingMemoryStore = false;

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    mode: usingMemoryStore ? "memory" : "mongodb",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/v1/campaigns", authMiddleware, tenantMiddleware, campaignRoutes);
app.use("/api/v1/agents", authMiddleware, tenantMiddleware, agentRoutes);
app.use("/api/v1/platforms", authMiddleware, tenantMiddleware, platformRoutes);
app.use("/api/v1/creatives", authMiddleware, tenantMiddleware, creativeRoutes);
app.use("/api/v1/audiences", authMiddleware, tenantMiddleware, audienceRoutes);
app.use("/api/v1/analytics", authMiddleware, tenantMiddleware, analyticsRoutes);
app.use("/api/v1/recipes", authMiddleware, tenantMiddleware, recipeRoutes);
app.use("/api/v1/attribution", authMiddleware, tenantMiddleware, attributionRoutes);
app.use("/api/v1/fraud", authMiddleware, tenantMiddleware, fraudRoutes);
app.use("/api/v1/optimizer", authMiddleware, tenantMiddleware, optimizerRoutes);
app.use("/api/v1/webhooks", authMiddleware, tenantMiddleware, webhookRoutes);
app.use("/api/v1/settings", authMiddleware, tenantMiddleware, settingsRoutes);
app.use("/api/v1/hypercontext", authMiddleware, tenantMiddleware, hyperContextRoutes);
app.use("/api/v1/notifications", authMiddleware, tenantMiddleware, notificationsRoutes);
app.use("/api/v1/activity", authMiddleware, tenantMiddleware, activityRoutes);

app.use(errorHandler);

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);
  socket.on("subscribe:campaign", (id: string) => socket.join(`campaign:${id}`));
  socket.on("unsubscribe:campaign", (id: string) => socket.leave(`campaign:${id}`));
  socket.on("subscribe:fraud", () => socket.join("fraud_alerts"));
  socket.on("subscribe:budget", () => socket.join("budget_alerts"));
  socket.on("disconnect", () => console.log(`Client disconnected: ${socket.id}`));
});

async function start() {
  try {
    if (config.nodeEnv !== "production") {
      await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 3000 });
      console.log("Connected to MongoDB");
      usingMemoryStore = false;
    }
  } catch {
    console.log("MongoDB not available — using in-memory store with seed data");
    usingMemoryStore = true;
  }

  httpServer.listen(config.port, () => {
    console.log(`N0VA Ads & Marketing API running on port ${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
  });
}

export { app, httpServer, io, usingMemoryStore };
start();
