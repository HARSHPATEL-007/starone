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

import { schedulerService } from "./services/SchedulerService";
import { setRuleEngineIO } from "./services/RuleEngineService";

import authRoutes from "./routes/auth";
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
import schedulerRoutes from "./routes/scheduler";
import entityRoutes from "./routes/entities";
import insightsRoutes from "./routes/insights";
import platformServicesRoutes from "./routes/platform-services";
import costTrackerRoutes from "./routes/cost-tracker";
import funnelRoutes from "./routes/funnel";
import goalRoutes from "./routes/goals";
import keywordRoutes from "./routes/keywords";
import landingPageRoutes from "./routes/landing-pages";
import segmentationRoutes from "./routes/segmentation";
import utmBuilderRoutes from "./routes/utm-builder";
import mediaKitRoutes from "./routes/media-kit";
import searchRoutes from "./routes/search";
import competitiveIntelRoutes from "./routes/competitive-intel";
import contentLibraryRoutes from "./routes/content-library";
import marketingFormRoutes from "./routes/marketing-forms";
import customerJourneyRoutes from "./routes/customer-journey";
import abTestingRoutes from "./routes/ab-testing";
import comparisonRoutes from "./routes/comparison";
import forecastRoutes from "./routes/forecast";
import healthRoutes from "./routes/health";
import channelPerformanceRoutes from "./routes/channel-performance";
import automationRulesRoutes from "./routes/automation-rules";
import templateRoutes from "./routes/templates";
import approvalRoutes from "./routes/approvals";
import creativeAIRoutes from "./routes/creative-ai";
import snapshotRoutes from "./routes/snapshots";
import reportRoutes from "./routes/reports";
import notificationPrefRoutes from "./routes/notification-preferences";
import bulkImportRoutes from "./routes/bulk-import";
import uploadRoutes from "./routes/upload";
import userRoutes from "./routes/users";
import recommendationRoutes from "./routes/recommendations";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: config.corsOrigin, methods: ["GET", "POST"] },
});

setRuleEngineIO(io);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.corsOrigin }));
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static("uploads"));

let usingMemoryStore = false;

app.use("/api/v1/auth", authRoutes);

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
app.use("/api/v1/scheduler", authMiddleware, tenantMiddleware, schedulerRoutes);
app.use("/api/v1/entities", authMiddleware, tenantMiddleware, entityRoutes);
app.use("/api/v1/insights", authMiddleware, tenantMiddleware, insightsRoutes);
app.use("/api/v1/cost-tracker", authMiddleware, tenantMiddleware, costTrackerRoutes);
app.use("/api/v1/funnel", authMiddleware, tenantMiddleware, funnelRoutes);
app.use("/api/v1/goals", authMiddleware, tenantMiddleware, goalRoutes);
app.use("/api/v1/keywords", authMiddleware, tenantMiddleware, keywordRoutes);
app.use("/api/v1/landing-pages", authMiddleware, tenantMiddleware, landingPageRoutes);
app.use("/api/v1/segmentation", authMiddleware, tenantMiddleware, segmentationRoutes);
app.use("/api/v1/utm-builder", authMiddleware, tenantMiddleware, utmBuilderRoutes);
app.use("/api/v1/media-kit", authMiddleware, tenantMiddleware, mediaKitRoutes);
app.use("/api/v1/search", authMiddleware, tenantMiddleware, searchRoutes);
app.use("/api/v1/competitive-intel", authMiddleware, tenantMiddleware, competitiveIntelRoutes);
app.use("/api/v1/content-library", authMiddleware, tenantMiddleware, contentLibraryRoutes);
app.use("/api/v1/marketing-forms", authMiddleware, tenantMiddleware, marketingFormRoutes);
app.use("/api/v1/customer-journey", authMiddleware, tenantMiddleware, customerJourneyRoutes);
app.use("/api/v1/ab-testing", authMiddleware, tenantMiddleware, abTestingRoutes);
app.use("/api/v1/comparison", authMiddleware, tenantMiddleware, comparisonRoutes);
app.use("/api/v1/forecast", authMiddleware, tenantMiddleware, forecastRoutes);
app.use("/api/v1/health", authMiddleware, tenantMiddleware, healthRoutes);
app.use("/api/v1/channel-performance", authMiddleware, tenantMiddleware, channelPerformanceRoutes);
app.use("/api/v1/automation-rules", authMiddleware, tenantMiddleware, automationRulesRoutes);
app.use("/api/v1/templates", authMiddleware, tenantMiddleware, templateRoutes);
app.use("/api/v1/approvals", authMiddleware, tenantMiddleware, approvalRoutes);
app.use("/api/v1/creative-ai", authMiddleware, tenantMiddleware, creativeAIRoutes);
app.use("/api/v1/snapshots", authMiddleware, tenantMiddleware, snapshotRoutes);
app.use("/api/v1/reports", authMiddleware, tenantMiddleware, reportRoutes);
app.use("/api/v1/notification-preferences", authMiddleware, tenantMiddleware, notificationPrefRoutes);
app.use("/api/v1/bulk-import", authMiddleware, tenantMiddleware, bulkImportRoutes);
app.use("/api/v1/upload", authMiddleware, tenantMiddleware, uploadRoutes);
app.use("/api/v1/users", authMiddleware, tenantMiddleware, userRoutes);
app.use("/api/v1/recommendations", authMiddleware, tenantMiddleware, recommendationRoutes);
app.use("/api/v1", authMiddleware, tenantMiddleware, platformServicesRoutes);

app.use(errorHandler);

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);
  socket.on("subscribe:campaign", (id: string) => socket.join(`campaign:${id}`));
  socket.on("unsubscribe:campaign", (id: string) => socket.leave(`campaign:${id}`));
  socket.on("subscribe:fraud", () => socket.join("fraud_alerts"));
  socket.on("subscribe:budget", () => socket.join("budget_alerts"));
  socket.on("subscribe:tenant", (id: string) => { socket.join(`tenant:${id}`); console.log(`Client ${socket.id} joined tenant:${id}`); });
  socket.on("unsubscribe:tenant", (id: string) => socket.leave(`tenant:${id}`));
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

  schedulerService.start(30000);

  httpServer.listen(config.port, () => {
    console.log(`N0VA Ads & Marketing API running on port ${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
  });
}

export { app, httpServer, io, usingMemoryStore };
start();
