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
import deliveryRoutes from "./routes/delivery";
import annotationRoutes from "./routes/annotations";
import pacingRoutes from "./routes/pacing";
import creativeVersionRoutes from "./routes/creative-versions";
import summaryRoutes from "./routes/summaries";
import exportDataRoutes from "./routes/export-data";
import shareRoutes from "./routes/shares";
import mentionRoutes from "./routes/mentions";
import oauthRoutes from "./routes/oauth";
import optimizerV2Routes from "./routes/optimizer-v2";
import reportBuilderRoutes from "./routes/report-builder";
import audienceInsightsRoutes from "./routes/audience-insights";
import developerPortalRoutes from "./routes/developer-portal";
import playbookExecutionRoutes from "./routes/playbook-execution";
import landingPageBuilderRoutes from "./routes/landing-page-builder";
import influencerRoutes from "./routes/influencer";
import campaignIssueRoutes from "./routes/campaign-issues";
import competitiveBenchmarkingRoutes from "./routes/competitive-benchmarking";
import cdpRoutes from "./routes/cdp";
import workflowBuilderRoutes from "./routes/workflow-builder";
import campaignScorecardRoutes from "./routes/campaign-scorecard";
import adminRoutes from "./routes/admin";
import predictiveForecastingRoutes from "./routes/predictive-forecasting";
import abTestStatisticsRoutes from "./routes/ab-test-statistics";
import anomalyDetectionRoutes from "./routes/anomaly-detection";
import portfolioBudgetOptimizerRoutes from "./routes/portfolio-budget-optimizer";
import campaignSaturationRoutes from "./routes/campaign-saturation";
import autonomousCampaignManagerRoutes from "./routes/autonomous-campaign-manager";
import channelMixOptimizerRoutes from "./routes/channel-mix-optimizer";
import keywordInsightsRoutes from "./routes/keyword-insights";
import portfolioRoutes from "./routes/portfolio";
import formAnalyticsRoutes from "./routes/form-analytics";
import orchestratorRegistryRoutes from "./routes/orchestrator-registry";
import swarmRoutes from "./routes/swarm";
import n0va1oGatewayRoutes from "./routes/n0va1o-gateway";
import marketingIntelligenceRoutes from "./routes/marketing-intelligence";
import agentIntelligenceRoutes from "./routes/agent-intelligence";
import predictiveBiddingRoutes from "./routes/predictive-bidding";
import clvRoutes from "./routes/clv";
import nlpRoutes from "./routes/nlp";
import marketingMixModelRoutes from "./routes/marketing-mix-model";
import campaignSimulationRoutes from "./routes/campaign-simulation";
import realTimeBiddingRoutes from "./routes/real-time-bidding";
import creativeAIEnhancedRoutes from "./routes/creative-ai-enhanced";
import audienceInsightsEnhancedRoutes from "./routes/audience-insights-enhanced";
import adCopyPersonalizationRoutes from "./routes/ad-copy-personalization";
import campaignHealthPredictorRoutes from "./routes/campaign-health-predictor";
import dsAlgorithmRoutes from "./routes/ds-algorithms";
import predictiveForecastingEnhancedRoutes from "./routes/predictive-forecasting-enhanced";
import incrementalityTestingRoutes from "./routes/incrementality-testing";
import searchIntelligenceRoutes from "./routes/search-intelligence";
import anomalyDetectionEnhancedRoutes from "./routes/anomaly-detection-enhanced";
import unifiedAdsPipelineRoutes from "./routes/unified-ads-pipeline";
import adsMarketingModuleRoutes from "./routes/ads-marketing-module";
import agentSwarmRoutes from "./routes/agent-swarm";
import budgetOptimizerServiceRoutes from "./routes/budget-optimizer-service";
import crossModuleIntegrationRoutes from "./routes/cross-module-integration";
import enhancedAgentRoutes from "./routes/enhanced-agent";
import enhancedAttributionRoutes from "./routes/enhanced-attribution";
import n0va1oGatewayEnhancedRoutes from "./routes/n0va1o-gateway-enhanced";
import recipeCompilationRoutes from "./routes/recipe-compilation";
import securityModifierRoutes from "./routes/security-modifier";
import campaignAlertOrchestratorRoutes from "./routes/campaign-alert-orchestrator";
import campaignExperimentationRoutes from "./routes/campaign-experimentation";
import campaignBudgetSimulatorRoutes from "./routes/campaign-budget-simulator";
import campaignInsightsEngineRoutes from "./routes/campaign-insights-engine";
import campaignPerformanceDiagnosticsRoutes from "./routes/campaign-performance-diagnostics";
import campaignDaypartingOptimizerRoutes from "./routes/campaign-dayparting-optimizer";
import campaignROIDecompositionRoutes from "./routes/campaign-roi-decomposition";
import campaignAdQualityAnalyzerRoutes from "./routes/campaign-ad-quality-analyzer";
import campaignAudienceExpansionRoutes from "./routes/campaign-audience-expansion";
import campaignCrossDeviceAnalyzerRoutes from "./routes/campaign-cross-device-analyzer";
import campaignGeoPerformanceAnalyzerRoutes from "./routes/campaign-geo-performance-analyzer";
import campaignFrequencyAnalyzerRoutes from "./routes/campaign-frequency-analyzer";
import campaignSegmentDiscoveryRoutes from "./routes/campaign-segment-discovery";
import campaignGoalTrackerRoutes from "./routes/campaign-goal-tracker";

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
app.use("/api/v1/delivery", authMiddleware, tenantMiddleware, deliveryRoutes);
app.use("/api/v1/annotations", authMiddleware, tenantMiddleware, annotationRoutes);
app.use("/api/v1/pacing", authMiddleware, tenantMiddleware, pacingRoutes);
app.use("/api/v1/creative-versions", authMiddleware, tenantMiddleware, creativeVersionRoutes);
app.use("/api/v1/summaries", authMiddleware, tenantMiddleware, summaryRoutes);
app.use("/api/v1/export-data", authMiddleware, tenantMiddleware, exportDataRoutes);
app.use("/api/v1/shares", authMiddleware, tenantMiddleware, shareRoutes);
app.use("/api/v1/mentions", authMiddleware, tenantMiddleware, mentionRoutes);
app.use("/api/v1/oauth", authMiddleware, tenantMiddleware, oauthRoutes);
app.use("/api/v1/optimizer-v2", authMiddleware, tenantMiddleware, optimizerV2Routes);
app.use("/api/v1/report-builder", authMiddleware, tenantMiddleware, reportBuilderRoutes);
app.use("/api/v1/audience-insights", authMiddleware, tenantMiddleware, audienceInsightsRoutes);
app.use("/api/v1/developer-portal", authMiddleware, tenantMiddleware, developerPortalRoutes);
app.use("/api/v1/playbook-execution", authMiddleware, tenantMiddleware, playbookExecutionRoutes);
app.use("/api/v1/landing-page-builder", authMiddleware, tenantMiddleware, landingPageBuilderRoutes);
app.use("/api/v1/influencers", authMiddleware, tenantMiddleware, influencerRoutes);
app.use("/api/v1/campaign-issues", authMiddleware, tenantMiddleware, campaignIssueRoutes);
app.use("/api/v1/campaign-alert-orchestrator", authMiddleware, tenantMiddleware, campaignAlertOrchestratorRoutes);
app.use("/api/v1/competitive-benchmarking", authMiddleware, tenantMiddleware, competitiveBenchmarkingRoutes);
app.use("/api/v1/cdp", authMiddleware, tenantMiddleware, cdpRoutes);
app.use("/api/v1/workflow-builder", authMiddleware, tenantMiddleware, workflowBuilderRoutes);
app.use("/api/v1/campaign-scorecard", authMiddleware, tenantMiddleware, campaignScorecardRoutes);
app.use("/api/v1/admin", authMiddleware, tenantMiddleware, adminRoutes);
app.use("/api/v1/predictive-forecasting", authMiddleware, tenantMiddleware, predictiveForecastingRoutes);
app.use("/api/v1/ab-test-statistics", authMiddleware, tenantMiddleware, abTestStatisticsRoutes);
app.use("/api/v1/anomaly-detection", authMiddleware, tenantMiddleware, anomalyDetectionRoutes);
app.use("/api/v1/portfolio-budget-optimizer", authMiddleware, tenantMiddleware, portfolioBudgetOptimizerRoutes);
app.use("/api/v1/campaign-saturation", authMiddleware, tenantMiddleware, campaignSaturationRoutes);
app.use("/api/v1/campaign-experimentation", authMiddleware, tenantMiddleware, campaignExperimentationRoutes);
app.use("/api/v1/campaign-budget-simulator", authMiddleware, tenantMiddleware, campaignBudgetSimulatorRoutes);
app.use("/api/v1/campaign-insights-engine", authMiddleware, tenantMiddleware, campaignInsightsEngineRoutes);
app.use("/api/v1/campaign-performance-diagnostics", authMiddleware, tenantMiddleware, campaignPerformanceDiagnosticsRoutes);
app.use("/api/v1/campaign-dayparting-optimizer", authMiddleware, tenantMiddleware, campaignDaypartingOptimizerRoutes);
app.use("/api/v1/campaign-roi-decomposition", authMiddleware, tenantMiddleware, campaignROIDecompositionRoutes);
app.use("/api/v1/campaign-ad-quality-analyzer", authMiddleware, tenantMiddleware, campaignAdQualityAnalyzerRoutes);
app.use("/api/v1/campaign-audience-expansion", authMiddleware, tenantMiddleware, campaignAudienceExpansionRoutes);
app.use("/api/v1/campaign-cross-device-analyzer", authMiddleware, tenantMiddleware, campaignCrossDeviceAnalyzerRoutes);
app.use("/api/v1/campaign-geo-performance-analyzer", authMiddleware, tenantMiddleware, campaignGeoPerformanceAnalyzerRoutes);
app.use("/api/v1/campaign-frequency-analyzer", authMiddleware, tenantMiddleware, campaignFrequencyAnalyzerRoutes);
app.use("/api/v1/campaign-segment-discovery", authMiddleware, tenantMiddleware, campaignSegmentDiscoveryRoutes);
app.use("/api/v1/campaign-goal-tracker", authMiddleware, tenantMiddleware, campaignGoalTrackerRoutes);
app.use("/api/v1/autonomous-campaign-manager", authMiddleware, tenantMiddleware, autonomousCampaignManagerRoutes);
app.use("/api/v1/channel-mix-optimizer", authMiddleware, tenantMiddleware, channelMixOptimizerRoutes);
app.use("/api/v1/keyword-insights", authMiddleware, tenantMiddleware, keywordInsightsRoutes);
app.use("/api/v1/form-analytics", authMiddleware, tenantMiddleware, formAnalyticsRoutes);
app.use("/api/v1/swarm", authMiddleware, tenantMiddleware, swarmRoutes);
app.use("/api/v1/portfolio", authMiddleware, tenantMiddleware, portfolioRoutes);
app.use("/api/v1/n0va1o", authMiddleware, tenantMiddleware, n0va1oGatewayRoutes);
app.use("/api/v1/marketing-intelligence", authMiddleware, tenantMiddleware, marketingIntelligenceRoutes);
app.use("/api/v1/agent-intelligence", authMiddleware, tenantMiddleware, agentIntelligenceRoutes);
app.use("/api/v1/predictive-bidding", authMiddleware, tenantMiddleware, predictiveBiddingRoutes);
app.use("/api/v1/clv", authMiddleware, tenantMiddleware, clvRoutes);
app.use("/api/v1/nlp", authMiddleware, tenantMiddleware, nlpRoutes);
app.use("/api/v1/marketing-mix-model", authMiddleware, tenantMiddleware, marketingMixModelRoutes);
app.use("/api/v1/campaign-simulation", authMiddleware, tenantMiddleware, campaignSimulationRoutes);
app.use("/api/v1/real-time-bidding", authMiddleware, tenantMiddleware, realTimeBiddingRoutes);
app.use("/api/v1/creative-ai/enhanced", authMiddleware, tenantMiddleware, creativeAIEnhancedRoutes);
app.use("/api/v1/audience-insights/enhanced", authMiddleware, tenantMiddleware, audienceInsightsEnhancedRoutes);
app.use("/api/v1/ad-copy-personalization", authMiddleware, tenantMiddleware, adCopyPersonalizationRoutes);
app.use("/api/v1/campaign-health-predictor", authMiddleware, tenantMiddleware, campaignHealthPredictorRoutes);
app.use("/api/v1/ds-algorithms", authMiddleware, tenantMiddleware, dsAlgorithmRoutes);
app.use("/api/v1/predictive-forecasting/enhanced", authMiddleware, tenantMiddleware, predictiveForecastingEnhancedRoutes);
app.use("/api/v1/incrementality-testing", authMiddleware, tenantMiddleware, incrementalityTestingRoutes);
app.use("/api/v1/search-intelligence", authMiddleware, tenantMiddleware, searchIntelligenceRoutes);
app.use("/api/v1/anomaly-detection/enhanced", authMiddleware, tenantMiddleware, anomalyDetectionEnhancedRoutes);
app.use("/api/v1/unified-ads-pipeline", authMiddleware, tenantMiddleware, unifiedAdsPipelineRoutes);
app.use("/api/v1/ads-marketing-module", authMiddleware, tenantMiddleware, adsMarketingModuleRoutes);
app.use("/api/v1/agent-swarm", authMiddleware, tenantMiddleware, agentSwarmRoutes);
app.use("/api/v1/budget-optimizer-service", authMiddleware, tenantMiddleware, budgetOptimizerServiceRoutes);
app.use("/api/v1/cross-module-integration", authMiddleware, tenantMiddleware, crossModuleIntegrationRoutes);
app.use("/api/v1/enhanced-agent", authMiddleware, tenantMiddleware, enhancedAgentRoutes);
app.use("/api/v1/enhanced-attribution", authMiddleware, tenantMiddleware, enhancedAttributionRoutes);
app.use("/api/v1/n0va1o-gateway-enhanced", authMiddleware, tenantMiddleware, n0va1oGatewayEnhancedRoutes);
app.use("/api/v1/recipe-compilation", authMiddleware, tenantMiddleware, recipeCompilationRoutes);
app.use("/api/v1/security-modifier", authMiddleware, tenantMiddleware, securityModifierRoutes);
app.use("/api/v1/orchestrator-registry", authMiddleware, orchestratorRegistryRoutes);
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
