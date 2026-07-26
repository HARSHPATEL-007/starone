import { describe, it, expect, beforeAll } from "vitest";
import { N0VA1OGatewayEnhancedService } from "../services/N0VA1OGatewayEnhancedService";
import { EnhancedAttributionService } from "../services/EnhancedAttributionService";
import { BudgetOptimizerService } from "../services/BudgetOptimizerService";
import { EnhancedAgentService } from "../services/EnhancedAgentService";
import { CrossModuleIntegrationService } from "../services/CrossModuleIntegrationService";
import { SecurityModifierService } from "../services/SecurityModifierService";
import { N0VA1OGatewayOrchestrator } from "../business-logic/N0VA1OGatewayOrchestrator";
import { EnhancedAttributionOrchestrator } from "../business-logic/EnhancedAttributionOrchestrator";
import { BudgetOptimizerOrchestrator } from "../business-logic/BudgetOptimizerOrchestrator";
import { EnhancedAgentOrchestrator } from "../business-logic/EnhancedAgentOrchestrator";
import { CrossModuleIntegrationOrchestrator } from "../business-logic/CrossModuleIntegrationOrchestrator";
import { SecurityModifierOrchestrator } from "../business-logic/SecurityModifierOrchestrator";
import { MemoryStore } from "../services/MemoryStore";

const TENANT_ID = "tenant_enhanced_001";

describe("N0VA1OGatewayEnhancedService", () => {
  const service = new N0VA1OGatewayEnhancedService();
  const orchestrator = new N0VA1OGatewayOrchestrator();

  beforeAll(() => { MemoryStore.getInstance(); });

  it("provisions JIT auth session", () => {
    const session = service.provisionJITAuth(TENANT_ID, "meta_ads", ["campaign_create", "audience_sync"]);
    expect(session).toHaveProperty("sessionId");
    expect(session.platform).toBe("meta_ads");
    expect(session.scopes).toEqual(["campaign_create", "audience_sync"]);
    expect(session.status).toBe("active");
    expect(session.expiresAt).toBeTruthy();
  });

  it("prunes invalid scopes during JIT provisioning", () => {
    const session = service.provisionJITAuth(TENANT_ID, "meta_ads", ["invalid_scope", "campaign_create"]);
    expect(session.scopes).toContain("campaign_create");
    expect(session.scopes).not.toContain("invalid_scope");
  });

  it("validates active JIT session", () => {
    const session = service.provisionJITAuth(TENANT_ID, "google_ads", ["performance_read"]);
    const validated = service.validateJITSession(session.sessionId);
    expect(validated).not.toBeNull();
    expect(validated!.sessionId).toBe(session.sessionId);
  });

  it("returns null for invalid JIT session", () => {
    const validated = service.validateJITSession("jit_nonexistent");
    expect(validated).toBeNull();
  });

  it("revokes JIT session", () => {
    const session = service.provisionJITAuth(TENANT_ID, "linkedin_ads", ["lead_gen"]);
    const revoked = service.revokeJITSession(session.sessionId);
    expect(revoked).toBe(true);
    const validated = service.validateJITSession(session.sessionId);
    expect(validated).toBeNull();
  });

  it("gets active sessions for tenant", () => {
    const active = service.getActiveSessions(TENANT_ID);
    expect(Array.isArray(active)).toBe(true);
    for (const s of active) expect(s.status).toBe("active");
  });

  it("creates sandbox and runs script", () => {
    const sandbox = service.createSandbox("data:test_data", "python");
    expect(sandbox).toHaveProperty("sandboxId");
    expect(sandbox.status).toBe("completed");
    expect(sandbox.result).toContain("bytes");
  });

  it("creates sandbox with simulated execution", () => {
    const sandbox = service.createSandbox("print('hello')", "python");
    expect(sandbox.status).toBe("completed");
    expect(sandbox.result).toBe("Simulated python execution completed");
  });

  it("gets sandbox by id", () => {
    const sandbox = service.createSandbox("data:test", "r");
    const found = service.getSandbox(sandbox.sandboxId);
    expect(found).toBeDefined();
    expect(found!.sandboxId).toBe(sandbox.sandboxId);
  });

  it("resolves intent to platforms", () => {
    const route = service.resolveIntent("campaign_create", ["meta_ads", "google_ads"]);
    expect(route).not.toBeNull();
    expect(route!.platforms).toContain("meta_ads");
    expect(route!.platforms).toContain("google_ads");
    expect(route!.actions.length).toBeGreaterThan(0);
  });

  it("returns null for unresolvable intent", () => {
    const route = service.resolveIntent("nonexistent_intent", ["meta_ads"]);
    expect(route).toBeNull();
  });

  it("gets available intents for a platform", () => {
    const intents = service.getAvailableIntents("tiktok_ads");
    expect(intents).toContain("creative_upload");
    expect(intents).toContain("audience_sync");
  });

  it("returns empty intents for unknown platform", () => {
    const intents = service.getAvailableIntents("unknown_platform");
    expect(intents).toEqual([]);
  });

  it("registers webhook listener", () => {
    const webhook = service.registerWebhook(TENANT_ID, "meta_ads", "campaign_created", "https://hooks.test.com/callback");
    expect(webhook).toHaveProperty("id");
    expect(webhook.status).toBe("active");
    expect(webhook.secret).toBeTruthy();
    expect(webhook.source).toBe("meta_ads");
  });

  it("unregisters webhook listener", () => {
    const webhook = service.registerWebhook(TENANT_ID, "google_ads", "budget_updated", "https://hooks.test.com/budget");
    const unregistered = service.unregisterWebhook(webhook.id);
    expect(unregistered).toBe(true);
    expect(webhook.status).toBe("paused");
  });

  it("triggers webhooks matching source and event", () => {
    service.registerWebhook(TENANT_ID, "test_source", "test_event", "https://hooks.test.com/trigger");
    const triggered = service.triggerWebhook("test_source", "test_event", { data: "test" });
    expect(triggered.length).toBeGreaterThan(0);
    for (const w of triggered) expect(w.lastTriggered).toBeTruthy();
  });

  it("gets webhooks for tenant", () => {
    const webhooks = service.getWebhooks(TENANT_ID);
    expect(Array.isArray(webhooks)).toBe(true);
  });

  it("provides integration catalog", () => {
    const catalog = service.getIntegrationCatalog();
    expect(catalog).toHaveProperty("social_advertising");
    expect(catalog).toHaveProperty("analytics_attribution");
    expect(catalog).toHaveProperty("crm_sales");
    expect(Object.keys(catalog).length).toBeGreaterThanOrEqual(10);
  });

  it("orchestrator getDashboard returns catalog", async () => {
    const dash = await orchestrator.getDashboard();
    expect(dash).toHaveProperty("integrationCatalog");
    expect(dash).toHaveProperty("totalCategories");
    expect(dash.totalCategories).toBeGreaterThanOrEqual(10);
  });

  it("orchestrator provisions JIT via orchestration layer", async () => {
    const session = await orchestrator.provisionJIT(TENANT_ID, "google_ads", ["budget_update"]);
    expect(session).toHaveProperty("sessionId");
    expect(session.status).toBe("active");
  });

  it("orchestrator resolves intent", async () => {
    const route = await orchestrator.resolveIntent("bid_adjust", ["google_ads", "meta_ads"]);
    expect(route).not.toBeNull();
    expect(route!.platforms).toContain("google_ads");
  });
});

describe("EnhancedAttributionService", () => {
  const service = new EnhancedAttributionService();
  const orchestrator = new EnhancedAttributionOrchestrator();

  const touchpoints = [
    { channel: "Google Ads", campaignId: "cmp_1", timestamp: "2026-07-01T10:00:00Z", cost: 50, type: "click", weight: 0 },
    { channel: "Meta Ads", campaignId: "cmp_2", timestamp: "2026-07-02T10:00:00Z", cost: 30, type: "view", weight: 0 },
    { channel: "LinkedIn Ads", campaignId: "cmp_3", timestamp: "2026-07-03T10:00:00Z", cost: 20, type: "click", weight: 0 },
  ];

  it("creates attribution path with last_click model", () => {
    const path = service.createPath("conv_001", ["cmp_1", "cmp_2", "cmp_3"], touchpoints, 1000, "last_click");
    expect(path).toHaveProperty("pathId");
    expect(path.model).toBe("last_click");
    expect(path.conversionValue).toBe(1000);
    expect(path.touchpoints[2].weight).toBe(1);
    expect(path.touchpoints[0].weight).toBe(0);
  });

  it("creates attribution path with first_click model", () => {
    const path = service.createPath("conv_002", ["cmp_1"], touchpoints, 500, "first_click");
    expect(path.touchpoints[0].weight).toBe(1);
  });

  it("creates attribution path with linear model", () => {
    const path = service.createPath("conv_003", ["cmp_1", "cmp_2"], touchpoints, 900, "linear");
    for (const t of path.touchpoints) expect(t.weight).toBeCloseTo(1 / 3, 2);
  });

  it("creates attribution path with time_decay model", () => {
    const path = service.createPath("conv_004", ["cmp_1"], touchpoints, 800, "time_decay");
    const weights = path.touchpoints.map((t) => t.weight);
    expect(weights[2]).toBeGreaterThan(weights[0]);
  });

  it("creates attribution path with position_based model", () => {
    const path = service.createPath("conv_005", ["cmp_1"], touchpoints, 700, "position_based");
    expect(path.touchpoints[0].weight).toBeCloseTo(0.4, 1);
    expect(path.touchpoints[2].weight).toBeCloseTo(0.4, 1);
    expect(path.touchpoints[1].weight).toBeCloseTo(0.2, 1);
  });

  it("creates attribution path with data_driven model", () => {
    const path = service.createPath("conv_006", ["cmp_1"], touchpoints, 1000, "data_driven");
    expect(path.model).toBe("data_driven");
    expect(path.attributedValue).toBeGreaterThan(0);
  });

  it("gets channel dashboard", () => {
    const dash = service.getChannelDashboard(TENANT_ID, "last_click");
    expect(dash).toHaveProperty("model");
    expect(dash).toHaveProperty("totalConversions");
    expect(dash).toHaveProperty("totalRevenue");
    expect(dash).toHaveProperty("overallROAS");
    expect(dash).toHaveProperty("channelCredits");
    expect(dash).toHaveProperty("windowSettings");
  });

  it("returns channel credits sorted by revenue descending", () => {
    const dash = service.getChannelDashboard(TENANT_ID, "linear");
    for (let i = 1; i < dash.channelCredits.length; i++) {
      expect(dash.channelCredits[i - 1].attributedRevenue)
        .toBeGreaterThanOrEqual(dash.channelCredits[i].attributedRevenue);
    }
  });

  it("compares models side by side", () => {
    const comparison = service.getModelComparison(TENANT_ID);
    expect(comparison).toHaveProperty("first_click");
    expect(comparison).toHaveProperty("last_click");
    expect(comparison).toHaveProperty("linear");
    expect(comparison).toHaveProperty("time_decay");
    expect(comparison).toHaveProperty("position_based");
  });

  it("simulates incrementality test", () => {
    const result = service.simulateIncrementalityTest(TENANT_ID, "cmp_1", 30);
    expect(result).toHaveProperty("campaignId");
    expect(result).toHaveProperty("testDays", 30);
    expect(result).toHaveProperty("controlRevenue");
    expect(result).toHaveProperty("exposedRevenue");
    expect(result).toHaveProperty("incrementalRevenue");
    expect(result).toHaveProperty("liftPercent");
    expect(result).toHaveProperty("significance");
  });

  it("orchestrator creates path", async () => {
    const path = await orchestrator.createPath("conv_orch_001", ["cmp_1"], touchpoints, 500, "first_click");
    expect(path).toHaveProperty("pathId");
    expect(path.model).toBe("first_click");
  });

  it("orchestrator gets dashboard", async () => {
    const dash = await orchestrator.getDashboard(TENANT_ID, "last_click");
    expect(dash).toHaveProperty("channelCredits");
  });

  it("orchestrator gets model comparison", async () => {
    const cmp = await orchestrator.getModelComparison(TENANT_ID);
    expect(Object.keys(cmp).length).toBeGreaterThanOrEqual(4);
  });

  it("orchestrator gets channel credits", async () => {
    const credits = await orchestrator.getChannelCredits(TENANT_ID, "linear");
    expect(Array.isArray(credits)).toBe(true);
  });

  it("orchestrator simulates incrementality", async () => {
    const result = await orchestrator.simulateIncrementality(TENANT_ID, "cmp_1", 30);
    expect(result).toHaveProperty("liftPercent");
  });
});

describe("BudgetOptimizerService", () => {
  const service = new BudgetOptimizerService();
  const orchestrator = new BudgetOptimizerOrchestrator();

  it("predicts ROAS for known platform", () => {
    const prediction = service.predictROAS("google_ads");
    expect(prediction.platform).toBe("google_ads");
    expect(prediction.predictedROAS).toBeGreaterThan(0);
    expect(prediction.historicalROAS).toBe(4.2);
    expect(prediction).toHaveProperty("lowerBound");
    expect(prediction).toHaveProperty("upperBound");
    expect(prediction).toHaveProperty("trend");
  });

  it("predicts ROAS for unknown platform with default", () => {
    const prediction = service.predictROAS("unknown_platform");
    expect(prediction.historicalROAS).toBe(2.5);
    expect(prediction.seasonalityFactor).toBe(1.0);
  });

  it("predicts ROAS with recent data override", () => {
    const prediction = service.predictROAS("meta_ads", 5.0);
    expect(prediction.predictedROAS).toBeGreaterThan(0);
  });

  it("optimizes budget across platforms", () => {
    const platforms = [
      { name: "google_ads", currentBudget: 5000 },
      { name: "meta_ads", currentBudget: 3000 },
      { name: "linkedin_ads", currentBudget: 2000 },
    ];
    const allocations = service.optimizeBudget(platforms, 10000);
    expect(allocations).toHaveLength(3);
    for (const a of allocations) {
      expect(a).toHaveProperty("platform");
      expect(a).toHaveProperty("allocated");
      expect(a).toHaveProperty("recommended");
      expect(a).toHaveProperty("predictedROAS");
      expect(a).toHaveProperty("confidence");
      expect(a).toHaveProperty("rationale");
    }
  });

  it("scales allocations down when total exceeds budget", () => {
    const platforms = [
      { name: "google_ads", currentBudget: 1000 },
      { name: "meta_ads", currentBudget: 1000 },
    ];
    const allocations = service.optimizeBudget(platforms, 500);
    const totalRecommended = allocations.reduce((s, a) => s + a.recommended, 0);
    expect(totalRecommended).toBeLessThanOrEqual(500);
  });

  it("returns allocations within total budget regardless of urgency", () => {
    const platforms = [{ name: "google_ads", currentBudget: 1000 }, { name: "meta_ads", currentBudget: 1000 }];
    const normal = service.optimizeBudget(platforms, 50000);
    const aggressive = service.optimizeBudget(platforms, 50000, "aggressive");
    const conservative = service.optimizeBudget(platforms, 50000, "conservative");
    for (const alloc of [normal, aggressive, conservative]) {
      const total = alloc.reduce((s, a) => s + a.recommended, 0);
      expect(total).toBeLessThanOrEqual(50000);
    }
  });

  it("applies urgency multiplier conservative", () => {
    const platforms = [{ name: "google_ads", currentBudget: 1000 }];
    const normal = service.optimizeBudget(platforms, 1000);
    const conservative = service.optimizeBudget(platforms, 1000, "conservative");
    expect(conservative[0].recommended).toBeLessThan(normal[0].recommended);
  });

  it("gets spend pacing", () => {
    const dailyBudgets = { google_ads: 500, meta_ads: 300 };
    const pacing = service.getSpendPacing(TENANT_ID, dailyBudgets);
    expect(Array.isArray(pacing)).toBe(true);
    for (const p of pacing) {
      expect(p).toHaveProperty("platform");
      expect(p).toHaveProperty("dailyBudget");
      expect(p).toHaveProperty("paceRatio");
      expect(["ahead", "on_track", "behind"]).toContain(p.status);
    }
  });

  it("gets optimization advice", () => {
    const platforms = [
      { name: "google_ads", currentBudget: 5000 },
      { name: "meta_ads", currentBudget: 3000 },
    ];
    const advice = service.getOptimizationAdvice(TENANT_ID, platforms, 8000);
    expect(Array.isArray(advice)).toBe(true);
    for (const a of advice) {
      expect(a).toHaveProperty("priority");
      expect(a).toHaveProperty("expectedConversions");
      expect(["critical", "high", "medium", "low"]).toContain(a.priority);
    }
  });

  it("gets budget forecast", () => {
    const forecast = service.getBudgetForecast(TENANT_ID, ["google_ads", "meta_ads"], 10000, 30);
    expect(forecast).toHaveProperty("dailyBudget");
    expect(forecast).toHaveProperty("avgPredictedROAS");
    expect(forecast).toHaveProperty("expectedRevenue");
    expect(forecast).toHaveProperty("expectedROI");
    expect(forecast).toHaveProperty("projectedAt");
    expect(forecast.days).toBe(30);
  });

  it("orchestrator predicts ROAS", async () => {
    const pred = await orchestrator.predictROAS("tiktok_ads");
    expect(pred.platform).toBe("tiktok_ads");
  });

  it("orchestrator optimizes budget", async () => {
    const platforms = [{ name: "snapchat_ads", currentBudget: 2000 }];
    const alloc = await orchestrator.optimizeBudget(platforms, 2000);
    expect(alloc).toHaveLength(1);
  });

  it("orchestrator gets dashboard", async () => {
    const dash = await orchestrator.getDashboard(TENANT_ID);
    expect(dash).toHaveProperty("message");
  });

  it("orchestrator gets forecast", async () => {
    const forecast = await orchestrator.getForecast(TENANT_ID, ["google_ads"], 5000, 15);
    expect(forecast).toHaveProperty("dailyBudget");
  });
});

describe("EnhancedAgentService", () => {
  const service = new EnhancedAgentService();
  const orchestrator = new EnhancedAgentOrchestrator();

  it("returns all 5 agent definitions", () => {
    const defs = service.getAgentDefinitions();
    expect(defs).toHaveLength(5);
    const types = defs.map((d) => d.agentType);
    expect(types).toContain("budget");
    expect(types).toContain("creative");
    expect(types).toContain("audience");
    expect(types).toContain("bid");
    expect(types).toContain("fraud");
  });

  it("returns agent definition by type", () => {
    const budget = service.getAgentDefinition("budget");
    expect(budget).toBeDefined();
    expect(budget!.agentName).toBe("Budget Agent");
    expect(budget!.hitlThresholdValue).toBe(10000);
    expect(budget!.actions.length).toBeGreaterThan(0);
    expect(budget!.crossModuleOutput).toContain("Sheets budget tracker update");
  });

  it("returns undefined for unknown agent type", () => {
    const unknown = service.getAgentDefinition("unknown_type");
    expect(unknown).toBeUndefined();
  });

  it("returns creative agent with correct frequency", () => {
    const creative = service.getAgentDefinition("creative");
    expect(creative!.frequency).toBe("every_6_hours");
    expect(creative!.hitlThreshold).toBe("New brand asset upload");
  });

  it("returns fraud agent with realtime frequency", () => {
    const fraud = service.getAgentDefinition("fraud");
    expect(fraud!.frequency).toBe("realtime");
    expect(fraud!.hitlThresholdValue).toBe(5);
  });

  it("computes schedules with overdue detection", () => {
    const schedules = service.computeSchedules(TENANT_ID);
    expect(schedules).toHaveLength(5);
    for (const s of schedules) {
      expect(s).toHaveProperty("agentType");
      expect(s).toHaveProperty("frequencyHours");
      expect(s).toHaveProperty("overdueMinutes");
      expect(s).toHaveProperty("nextRun");
    }
  });

  it("computes schedules with reactive nextRun when no lastRun", () => {
    const schedules = service.computeSchedules(TENANT_ID);
    for (const s of schedules) expect(s.lastRun).toBeNull();
  });

  it("returns detailed status for all agents", () => {
    const statuses = service.getDetailedStatus(TENANT_ID);
    expect(statuses).toHaveLength(5);
    for (const s of statuses) {
      expect(s).toHaveProperty("name");
      expect(s).toHaveProperty("type");
      expect(s).toHaveProperty("health");
      expect(s).toHaveProperty("successRate");
      expect(["excellent", "good", "fair", "critical"]).toContain(s.health);
    }
  });

  it("returns compliance status for all agents", () => {
    const compliance = service.getComplianceStatus(TENANT_ID);
    expect(compliance).toHaveLength(5);
    for (const c of compliance) {
      expect(c).toHaveProperty("agentName");
      expect(c).toHaveProperty("hitlEnabled");
      expect(c).toHaveProperty("auditTrailCount");
      expect(c).toHaveProperty("lastComplianceCheck");
    }
  });

  it("orchestrator returns definitions", async () => {
    const defs = await orchestrator.getDefinitions();
    expect(defs).toHaveLength(5);
  });

  it("orchestrator returns definition by type", async () => {
    const def = await orchestrator.getDefinition("bid");
    expect(def).toBeDefined();
    expect(def!.agentType).toBe("bid");
  });

  it("orchestrator returns schedules", async () => {
    const schedules = await orchestrator.getSchedules(TENANT_ID);
    expect(schedules).toHaveLength(5);
  });

  it("orchestrator returns detailed status", async () => {
    const statuses = await orchestrator.getDetailedStatus(TENANT_ID);
    expect(statuses).toHaveLength(5);
  });

  it("orchestrator returns compliance", async () => {
    const compliance = await orchestrator.getCompliance(TENANT_ID);
    expect(compliance).toHaveLength(5);
  });

  it("orchestrator returns dashboard with health breakdown", async () => {
    const dash = await orchestrator.getDashboard(TENANT_ID);
    expect(dash).toHaveProperty("totalAgents", 5);
    expect(dash).toHaveProperty("healthBreakdown");
    expect(dash).toHaveProperty("agentDefinitions");
    expect(dash).toHaveProperty("schedules");
  });
});

describe("CrossModuleIntegrationService", () => {
  const service = new CrossModuleIntegrationService();
  const orchestrator = new CrossModuleIntegrationOrchestrator();

  it("returns full integration matrix (19 links)", () => {
    const matrix = service.getIntegrationMatrix();
    expect(matrix).toHaveLength(19);
  });

  it("filters matrix by action", () => {
    const links = service.getIntegrationMatrix("campaign_created");
    expect(links.length).toBeGreaterThanOrEqual(3);
    for (const l of links) expect(l.sourceAction).toBe("campaign_created");
  });

  it("returns empty array for unknown action", () => {
    const links = service.getIntegrationMatrix("unknown_action");
    expect(links).toEqual([]);
  });

  it("gets actions for a module", () => {
    const actions = service.getActionsForModule("tasks");
    expect(actions.length).toBeGreaterThanOrEqual(2);
    expect(actions).toContain("campaign_created");
    expect(actions).toContain("lead_converted");
  });

  it("gets targets for an action", () => {
    const targets = service.getTargetsForAction("budget_allocated");
    expect(targets.length).toBeGreaterThanOrEqual(2);
    const modules = targets.map((t) => t.module);
    expect(modules).toContain("sheets");
    expect(modules).toContain("finance");
  });

  it("executes action and logs it", () => {
    const log = service.executeAction(TENANT_ID, "campaign_created", "cmp_001");
    expect(log).toHaveProperty("actionId");
    expect(log.sourceAction).toBe("campaign_created");
    expect(log.affectedModules.length).toBeGreaterThan(0);
    expect(log.tenantId).toBe(TENANT_ID);
  });

  it("executeAction inserts cross_module_integrations records", () => {
    service.executeAction(TENANT_ID, "brand_safety_risk", "cmp_002");
    const history = service.getActionHistory(TENANT_ID);
    expect(history.length).toBeGreaterThanOrEqual(2);
  });

  it("gets action history for tenant", () => {
    const history = service.getActionHistory(TENANT_ID);
    expect(Array.isArray(history)).toBe(true);
    for (const h of history) expect(h.tenantId).toBe(TENANT_ID);
  });

  it("returns empty history for unknown tenant", () => {
    const history = service.getActionHistory("unknown_tenant");
    expect(history).toEqual([]);
  });

  it("gets dashboard with matrix summary", () => {
    const dash = service.getDashboard(TENANT_ID);
    expect(dash).toHaveProperty("totalIntegrations", 19);
    expect(dash.uniqueActions).toBe(8);
    expect(dash.uniqueModules).toBe(14);
    expect(dash).toHaveProperty("matrix");
    expect(dash).toHaveProperty("recentActions");
  });

  it("summarizes impact of an action", () => {
    const summary = service.summarizeImpact("campaign_created");
    expect(summary).not.toBeNull();
    expect(summary!.action).toBe("campaign_created");
    expect(summary!.triggers).toBeGreaterThan(0);
    expect(summary!.modules.length).toBeGreaterThan(0);
  });

  it("returns null for unknown action summary", () => {
    const summary = service.summarizeImpact("unknown_action");
    expect(summary).toBeNull();
  });

  it("orchestrator returns full matrix", async () => {
    const matrix = await orchestrator.getMatrix();
    expect(matrix).toHaveLength(19);
  });

  it("orchestrator executes action", async () => {
    const log = await orchestrator.executeAction(TENANT_ID, "performance_alert", "cmp_003");
    expect(log).toHaveProperty("actionId");
  });

  it("orchestrator returns history", async () => {
    const history = await orchestrator.getHistory(TENANT_ID);
    expect(Array.isArray(history)).toBe(true);
  });

  it("orchestrator returns dashboard", async () => {
    const dash = await orchestrator.getDashboard(TENANT_ID);
    expect(dash).toHaveProperty("totalIntegrations");
  });

  it("orchestrator summarizes action", async () => {
    const summary = await orchestrator.summarize("budget_allocated");
    expect(summary).not.toBeNull();
    expect(summary!.action).toBe("budget_allocated");
  });
});

describe("SecurityModifierService", () => {
  const service = new SecurityModifierService();
  const orchestrator = new SecurityModifierOrchestrator();

  it("redacts dangerous fields via schema modifier", () => {
    const result = service.applySchemaModifier("delete", { delete_campaign: true, budget_increase: 100 });
    expect(result.modified).toBe(true);
    expect(result.params.delete_campaign).toBeUndefined();
    expect(result.warnings.some((w) => w.includes("redacted"))).toBe(true);
  });

  it("caps budget increase at 50%", () => {
    const result = service.applySchemaModifier("update_budget", { budget_increase: 200 });
    expect(result.params.budget_increase).toBe(50);
    expect(result.warnings.some((w) => w.includes("capped"))).toBe(true);
  });

  it("allows budget increase under cap", () => {
    const result = service.applySchemaModifier("update_budget", { budget_increase: 30 });
    expect(result.params.budget_increase).toBe(30);
  });

  it("caps bid increase at 100%", () => {
    const result = service.applySchemaModifier("update_bid", { bid_increase: 500 });
    expect(result.params.bid_increase).toBe(100);
    expect(result.warnings.some((w) => w.includes("capped"))).toBe(true);
  });

  it("warns on non-whitelisted platform", () => {
    const result = service.applySchemaModifier("create_campaign", { platform: "scam_ads" });
    expect(result.warnings.some((w) => w.includes("whitelist"))).toBe(true);
  });

  it("passes through safe params without modification", () => {
    const result = service.applySchemaModifier("read_performance", { campaign_id: "123" });
    expect(result.modified).toBe(false);
    expect(result.warnings).toEqual([]);
  });

  it("creates before execution hook", () => {
    const hook = service.createBeforeExecutionHook("Test Hook", ["max_budget"], true, true);
    expect(hook.hookId).toBeTruthy();
    expect(hook.enforceBrandSafety).toBe(true);
    expect(hook.injectUtmParams).toBe(true);
  });

  it("applies before execution with brand safety check", () => {
    const hook = service.createBeforeExecutionHook("Brand Gate", ["max_cpc"], true, false);
    const result = service.applyBeforeExecution(hook, "update_campaign", { brandSafetyWhitelist: ["brand_1"] });
    expect(result.allowed).toBe(true);
    expect(result.reasons.length).toBeGreaterThanOrEqual(0);
  });

  it("injects UTM parameters when configured", () => {
    const hook = service.createBeforeExecutionHook("UTM Hook", [], false, true);
    const result = service.applyBeforeExecution(hook, "create_campaign", {});
    expect(result.params.utm_source).toBe("n0va");
    expect(result.params.utm_medium).toBe("ads");
    expect(result.params.utm_campaign).toBe("default");
  });

  it("offloads large payload after execution", () => {
    const result = service.createAfterExecutionResponse({ data: "x".repeat(2000) }, 100);
    expect(result.truncated).toBe(true);
    expect(result.pointer).toContain("sandbox://");
  });

  it("keeps small payload inline", () => {
    const result = service.createAfterExecutionResponse({ data: "small" }, 5000);
    expect(result.truncated).toBe(false);
    expect(result.pointer).toBe("inline");
  });

  it("creates HITL interrogation", () => {
    const record = service.createHITLInterrogation("action_1", "Budget shift $60K", 60000, 50000);
    expect(record.id).toBeTruthy();
    expect(record.status).toBe("pending");
    expect(record.approverRole).toBe("compliance_officer");
  });

  it("resolves HITL interrogation approved", () => {
    const record = service.createHITLInterrogation("action_2", "Test approval", 1000, 500);
    const resolved = service.resolveHITLInterrogation(record.id, true, "sig_admin_001");
    expect(resolved).not.toBeNull();
    expect(resolved!.status).toBe("approved");
    expect(resolved!.digitalSignature).toBe("sig_admin_001");
  });

  it("resolves HITL interrogation rejected", () => {
    const record = service.createHITLInterrogation("action_3", "Test rejection", 1000, 500);
    const resolved = service.resolveHITLInterrogation(record.id, false, "sig_admin_002");
    expect(resolved!.status).toBe("rejected");
  });

  it("escalates HITL interrogation", () => {
    const record = service.createHITLInterrogation("action_4", "Test escalation", 100000, 25000);
    const escalated = service.escalateHITLInterrogation(record.id);
    expect(escalated).not.toBeNull();
    expect(escalated!.status).toBe("escalated");
    expect(escalated!.approverRole).toBe("chief_compliance_officer");
  });

  it("gets pending interrogations", () => {
    const pending = service.getPendingInterrogations();
    expect(Array.isArray(pending)).toBe(true);
    for (const p of pending) expect(p.status).toBe("pending");
  });

  it("returns all security modifiers", () => {
    const modifiers = service.getSecurityModifiers();
    expect(modifiers.length).toBeGreaterThanOrEqual(6);
    const types = modifiers.map((m) => m.type);
    expect(types).toContain("schema");
    expect(types).toContain("before_execution");
    expect(types).toContain("after_execution");
    expect(types).toContain("hitl_interrogation");
  });

  it("orchestrator returns modifiers", async () => {
    const mods = await orchestrator.getModifiers();
    expect(mods.length).toBeGreaterThanOrEqual(6);
  });

  it("orchestrator validates action", async () => {
    const result = await orchestrator.validateAction("update_budget", { budget_increase: 200 });
    expect(result.warnings.some((w) => w.includes("capped"))).toBe(true);
  });

  it("orchestrator creates and resolves interrogation", async () => {
    const rec = await orchestrator.createInterrogation("a1", "Large transfer", 100000, 50000);
    expect(rec.status).toBe("pending");
    const resolved = await orchestrator.resolveInterrogation(rec.id, true, "sig_orch");
    expect(resolved!.status).toBe("approved");
  });

  it("orchestrator gets pending interrogations", async () => {
    const pending = await orchestrator.getPendingInterrogations();
    expect(Array.isArray(pending)).toBe(true);
  });

  it("orchestrator returns dashboard", async () => {
    const dash = await orchestrator.getDashboard();
    expect(dash).toHaveProperty("totalModifiers");
    expect(dash).toHaveProperty("byType");
    expect(dash).toHaveProperty("modifiers");
  });
});
