import { describe, it, expect } from "vitest";
import { DataStore } from "../services/DataStore";

// ── Service imports ──────────────────────────────────────────────
import { adminService } from "../services/AdminService";
import { developerPortalService } from "../services/DeveloperPortalService";
import { exportService } from "../services/ExportService";
import { notificationDelivery } from "../services/NotificationDeliveryService";
import { webhookService } from "../services/WebhookService";
import { workflowBuilderService } from "../services/WorkflowBuilderService";
import { fileStorage } from "../services/FileStorageService";
import { ruleEngine } from "../services/RuleEngineService";
import { agentService } from "../services/AgentService";
import { entityStore } from "../services/EntityStore";
import { schedulerService } from "../services/SchedulerService";
import { N0VA1OService } from "../services/N0VA1OService";

const TEST_TENANT = "untested_svc_tenant";

// ═══════════════════════════════════════════════════════════════════
// AdminService
// ═══════════════════════════════════════════════════════════════════
describe("AdminService", () => {
  it("returns admin stats", () => {
    const stats = adminService.getAdminStats();
    expect(stats).toHaveProperty("totalTenants");
    expect(stats).toHaveProperty("activeTenants");
    expect(stats).toHaveProperty("totalUsers");
    expect(stats).toHaveProperty("monthlyRevenue");
    expect(typeof stats.totalTenants).toBe("number");
  });

  it("returns available features", () => {
    const features = adminService.getAvailableFeatures();
    expect(Array.isArray(features)).toBe(true);
    expect(features.length).toBeGreaterThan(0);
  });

  it("returns audit log", () => {
    const log = adminService.getAuditLog(5);
    expect(Array.isArray(log)).toBe(true);
  });

  it("returns tenant health", () => {
    const health = adminService.getTenantHealth();
    expect(Array.isArray(health)).toBe(true);
  });

  it("returns cohort retention", () => {
    const cohort = adminService.getCohortRetention();
    expect(Array.isArray(cohort)).toBe(true);
  });

  it("forecasts resource growth for a tenant", () => {
    const tenants = adminService.getTenants();
    const tenantId = tenants.length > 0 ? tenants[0].id : "tenant_001";
    const forecast = adminService.forecastResourceGrowth(tenantId);
    expect(forecast).toHaveProperty("current");
    expect(forecast).toHaveProperty("projected30Days");
    expect(forecast).toHaveProperty("recommendation");
  });

  it("manages tenant CRUD", () => {
    const tenants = adminService.getTenants();
    expect(Array.isArray(tenants)).toBe(true);
    if (tenants.length > 0) {
      const t = adminService.getTenant(tenants[0].id);
      expect(t).toBeDefined();
    }
  });

  it("updates a tenant", () => {
    const tenants = adminService.getTenants();
    if (tenants.length > 0) {
      const updated = adminService.updateTenant(tenants[0].id, { name: "Updated Tenant" });
      expect(updated).not.toBeNull();
      expect(updated!.name).toBe("Updated Tenant");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// DeveloperPortalService
// ═══════════════════════════════════════════════════════════════════
describe("DeveloperPortalService", () => {
  it("generates and lists API keys", () => {
    const key = developerPortalService.generateKey(TEST_TENANT, "Test Key", ["read:campaigns"]);
    expect(key).toHaveProperty("id");
    expect(key).toHaveProperty("key");
    expect(key.key).toContain("n0va_");
    expect(key.scopes).toEqual(["read:campaigns"]);
    expect(key.active).toBe(true);

    const keys = developerPortalService.listKeys(TEST_TENANT);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys[0]).toHaveProperty("keyPreview");
  });

  it("returns available scopes", () => {
    const scopes = developerPortalService.getAvailableScopes();
    expect(Array.isArray(scopes)).toBe(true);
    expect(scopes.length).toBeGreaterThan(0);
    expect(scopes[0]).toHaveProperty("key");
    expect(scopes[0]).toHaveProperty("label");
  });

  it("validates a key", () => {
    const key = developerPortalService.generateKey(TEST_TENANT, "Validate Key", ["read:campaigns"]);
    const validation = developerPortalService.validateKey(key.key);
    expect(validation.valid).toBe(true);
    expect(validation.tenantId).toBe(TEST_TENANT);

    const badValidation = developerPortalService.validateKey("invalid_key");
    expect(badValidation.valid).toBe(false);
  });

  it("returns webhook logs", () => {
    const logs = developerPortalService.getWebhookLogs(TEST_TENANT);
    expect(Array.isArray(logs)).toBe(true);
  });

  it("returns API usage stats", () => {
    const stats = developerPortalService.getApiUsageStats(TEST_TENANT);
    expect(stats).toHaveProperty("totalKeys");
    expect(stats).toHaveProperty("activeKeys");
  });

  it("detects usage anomalies", () => {
    const anomalies = developerPortalService.detectUsageAnomaly(TEST_TENANT);
    expect(Array.isArray(anomalies)).toBe(true);
  });

  it("detects permission conflicts", () => {
    const result = developerPortalService.detectPermissionConflicts(TEST_TENANT);
    expect(result).toHaveProperty("conflicts");
    expect(result).toHaveProperty("keysAtRisk");
  });

  it("forecasts rate limit hits", () => {
    const forecast = developerPortalService.forecastRateLimitHit(TEST_TENANT);
    expect(Array.isArray(forecast)).toBe(true);
  });

  it("gets key rotation recommendations", () => {
    const recs = developerPortalService.getKeyRotationRecommendations(TEST_TENANT);
    expect(Array.isArray(recs)).toBe(true);
  });

  it("revokes and deletes keys", () => {
    const key = developerPortalService.generateKey(TEST_TENANT, "Delete Key", ["read:campaigns"]);
    const revoked = developerPortalService.revokeKey(TEST_TENANT, key.id);
    expect(revoked).toBe(true);

    const deleted = developerPortalService.deleteKey(TEST_TENANT, key.id);
    expect(deleted).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// NotificationDeliveryService
// ═══════════════════════════════════════════════════════════════════
describe("NotificationDeliveryService", () => {
  it("sends a delivery request", async () => {
    const records = await notificationDelivery.send({
      notificationId: "notif_001",
      title: "Test Alert",
      message: "This is a test",
      priority: "high",
      channels: [
        { channel: "email", recipient: "user@test.com" },
        { channel: "sms", recipient: "+1234567890" },
      ],
    });
    expect(Array.isArray(records)).toBe(true);
    expect(records.length).toBeGreaterThan(0);
    expect(records[0]).toHaveProperty("id");
    expect(records[0]).toHaveProperty("status");
  });

  it("retrieves delivery records", async () => {
    const records = await notificationDelivery.send({
      notificationId: "notif_002",
      title: "Get Test",
      message: "Test",
      channels: [{ channel: "email", recipient: "a@b.com" }],
    });
    const id = records[0].id;
    const retrieved = notificationDelivery.getDelivery(id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(id);
  });

  it("lists deliveries with filters", async () => {
    await notificationDelivery.send({
      notificationId: "notif_003",
      title: "List Test",
      message: "Test",
      channels: [{ channel: "email", recipient: "a@b.com" }],
    });
    const list = notificationDelivery.listDeliveries({ channel: "email" });
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  it("retries a failed delivery", async () => {
    const records = await notificationDelivery.send({
      notificationId: "notif_retry",
      title: "Retry Test",
      message: "Test",
      channels: [{ channel: "email", recipient: "retry@test.com" }],
    });
    const retried = await notificationDelivery.retry(records[0].id);
    expect(retried).not.toBeNull();
  });

  it("returns delivery stats", () => {
    const stats = notificationDelivery.getStats();
    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("byChannel");
    expect(stats).toHaveProperty("byStatus");
    expect(stats).toHaveProperty("successRate");
    expect(stats).toHaveProperty("channelHealth");
  });
});

// ═══════════════════════════════════════════════════════════════════
// WebhookService
// ═══════════════════════════════════════════════════════════════════
describe("WebhookService", () => {
  it("registers a webhook", () => {
    const config = webhookService.registerWebhook({
      tenantId: TEST_TENANT,
      name: "Test Webhook",
      url: "https://example.com/webhook",
      events: ["campaign.created"],
      retryCount: 3,
      timeout: 5000,
      enabled: true,
    });
    expect(config).toHaveProperty("id");
    expect(config.name).toBe("Test Webhook");
    expect(config.events).toEqual(["campaign.created"]);
    expect(config.enabled).toBe(true);
  });

  it("lists webhooks for a tenant", () => {
    const list = webhookService.listWebhooks(TEST_TENANT);
    expect(list.length).toBeGreaterThan(0);
  });

  it("gets a webhook by id", () => {
    const config = webhookService.registerWebhook({
      tenantId: TEST_TENANT,
      name: "Get Webhook",
      url: "https://example.com/get",
      events: ["campaign.updated"],
      retryCount: 3,
      timeout: 5000,
      enabled: true,
    });
    const retrieved = webhookService.getWebhook(config.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(config.id);
  });

  it("updates a webhook", () => {
    const config = webhookService.registerWebhook({
      tenantId: TEST_TENANT,
      name: "Update Webhook",
      url: "https://example.com/update",
      events: ["campaign.created"],
      retryCount: 3,
      timeout: 5000,
      enabled: true,
    });
    const updated = webhookService.updateWebhook(config.id, { name: "Updated Webhook" });
    expect(updated).toBeDefined();
    expect(updated!.name).toBe("Updated Webhook");
  });

  it("returns deliveries for a webhook", () => {
    const config = webhookService.registerWebhook({
      tenantId: TEST_TENANT,
      name: "Delivery Webhook",
      url: "https://example.com/delivery",
      events: ["campaign.created"],
      retryCount: 3,
      timeout: 5000,
      enabled: true,
    });
    const deliveries = webhookService.getDeliveries(config.id);
    expect(Array.isArray(deliveries)).toBe(true);
  });

  it("generates a sample config", () => {
    const sample = webhookService.generateSampleConfig();
    expect(sample).toHaveProperty("name");
    expect(sample).toHaveProperty("url");
    expect(sample).toHaveProperty("events");
  });

  it("deletes a webhook", () => {
    const config = webhookService.registerWebhook({
      tenantId: TEST_TENANT,
      name: "Delete Webhook",
      url: "https://example.com/delete",
      events: ["campaign.created"],
      retryCount: 3,
      timeout: 5000,
      enabled: true,
    });
    const deleted = webhookService.deleteWebhook(config.id);
    expect(deleted).toBe(true);
    expect(webhookService.getWebhook(config.id)).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
// WorkflowBuilderService
// ═══════════════════════════════════════════════════════════════════
describe("WorkflowBuilderService", () => {
  it("returns node types", () => {
    const types = workflowBuilderService.getNodeTypes();
    expect(Array.isArray(types)).toBe(true);
    expect(types.length).toBeGreaterThan(0);
    expect(types[0]).toHaveProperty("type");
    expect(types[0]).toHaveProperty("label");
  });

  it("returns categories", () => {
    const cats = workflowBuilderService.getCategories();
    expect(Array.isArray(cats)).toBe(true);
    expect(cats.length).toBeGreaterThan(0);
  });

  it("saves and retrieves a workflow", () => {
    const saved = workflowBuilderService.saveWorkflow(TEST_TENANT, {
      name: "Test Workflow",
      description: "A test workflow",
      category: "Automation",
    });
    expect(saved).toHaveProperty("id");
    expect(saved.name).toBe("Test Workflow");
    expect(saved.status).toBe("draft");

    const retrieved = workflowBuilderService.getWorkflow(TEST_TENANT, saved.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(saved.id);
  });

  it("lists workflows", () => {
    workflowBuilderService.saveWorkflow(TEST_TENANT, { name: "List Test", description: "Test" });
    const list = workflowBuilderService.listWorkflows(TEST_TENANT);
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  it("updates a workflow", () => {
    const saved = workflowBuilderService.saveWorkflow(TEST_TENANT, { name: "Update Test", description: "Test" });
    const updated = workflowBuilderService.updateWorkflow(TEST_TENANT, saved.id, { name: "Updated Workflow" });
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe("Updated Workflow");
  });

  it("activates and deactivates a workflow", () => {
    const saved = workflowBuilderService.saveWorkflow(TEST_TENANT, { name: "Activate Test", description: "Test" });
    const activated = workflowBuilderService.activateWorkflow(TEST_TENANT, saved.id);
    expect(activated).not.toBeNull();
    expect(activated!.status).toBe("active");

    const deactivated = workflowBuilderService.deactivateWorkflow(TEST_TENANT, saved.id);
    expect(deactivated).not.toBeNull();
    expect(["draft", "paused"]).toContain(deactivated!.status);
  });

  it("executes a workflow", async () => {
    const saved = workflowBuilderService.saveWorkflow(TEST_TENANT, { name: "Execute Test", description: "Test" });
    const result = await workflowBuilderService.executeWorkflow(TEST_TENANT, saved.id, { test: true });
    expect(result).toHaveProperty("execution");
    expect(result).toHaveProperty("log");
  });

  it("runs a test", async () => {
    const saved = workflowBuilderService.saveWorkflow(TEST_TENANT, { name: "Test Run", description: "Test" });
    const result = await workflowBuilderService.testRun(TEST_TENANT, saved.id);
    expect(result).toHaveProperty("execution");
  });

  it("returns executions", () => {
    const execs = workflowBuilderService.getExecutions(TEST_TENANT);
    expect(Array.isArray(execs)).toBe(true);
  });

  it("deletes a workflow", () => {
    const saved = workflowBuilderService.saveWorkflow(TEST_TENANT, { name: "Delete Test", description: "Test" });
    const deleted = workflowBuilderService.deleteWorkflow(TEST_TENANT, saved.id);
    expect(deleted).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ExportService
// ═══════════════════════════════════════════════════════════════════
describe("ExportService", () => {
  it("exports data as JSON", async () => {
    const result = await exportService.exportData({
      entityType: "campaigns",
      tenantId: TEST_TENANT,
      format: "json",
    });
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("filename");
    expect(result).toHaveProperty("contentType");
    expect(result.contentType).toContain("json");
  });

  it("exports data as CSV", async () => {
    const result = await exportService.exportData({
      entityType: "campaigns",
      tenantId: TEST_TENANT,
      format: "csv",
    });
    expect(result.contentType).toContain("csv");
    expect(result.data).toBeTruthy();
  });

  it("assesses data quality", async () => {
    const report = await exportService.assessDataQuality("campaigns", TEST_TENANT);
    expect(report).toHaveProperty("entityType");
    expect(report).toHaveProperty("totalRecords");
    expect(report).toHaveProperty("overallQuality");
  });

  it("generates statistical summary", async () => {
    const summary = await exportService.generateStatisticalSummary("campaigns", TEST_TENANT);
    expect(summary).toHaveProperty("entityType");
    expect(summary).toHaveProperty("recordCount");
    expect(summary).toHaveProperty("numericFields");
    expect(summary).toHaveProperty("categoricalFields");
  });
});

// ═══════════════════════════════════════════════════════════════════
// FileStorageService
// ═══════════════════════════════════════════════════════════════════
describe("FileStorageService", () => {
  it("lists files for a tenant", () => {
    const files = fileStorage.list(TEST_TENANT);
    expect(Array.isArray(files)).toBe(true);
  });

  it("forecasts storage growth", () => {
    const forecast = fileStorage.forecastStorageGrowth(TEST_TENANT);
    expect(forecast).toHaveProperty("currentUsage");
    expect(forecast).toHaveProperty("dailyGrowthRate");
    expect(forecast).toHaveProperty("projected30Days");
    expect(forecast).toHaveProperty("recommendation");
  });

  it("returns file distribution", () => {
    const dist = fileStorage.getFileDistribution(TEST_TENANT);
    expect(dist).toHaveProperty("totalFiles");
    expect(dist).toHaveProperty("totalSize");
    expect(dist).toHaveProperty("byType");
    expect(dist).toHaveProperty("byEntity");
  });

  it("detects duplicates", () => {
    const result = fileStorage.detectDuplicates(TEST_TENANT);
    expect(result).toHaveProperty("duplicates");
    expect(result).toHaveProperty("wastedBytes");
  });

  it("returns optimization score", () => {
    const score = fileStorage.getStorageOptimizationScore(TEST_TENANT);
    expect(score).toHaveProperty("score");
    expect(score).toHaveProperty("totalFiles");
    expect(score).toHaveProperty("recommendations");
    expect(Array.isArray(score.recommendations)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// RuleEngineService
// ═══════════════════════════════════════════════════════════════════
describe("RuleEngineService", () => {
  it("evaluates a basic rule", async () => {
    const result = await ruleEngine.evaluateRule({
      name: "Test Rule",
      trigger: "roas_drop",
      conditions: { threshold: 0.5, window: 7 },
      action: "send_notification",
      actionParams: { message: "ROAS dropped" },
      cooldownMinutes: 60,
    }, TEST_TENANT);
    expect(result).toHaveProperty("triggered");
    expect(result).toHaveProperty("actions");
    expect(typeof result.triggered).toBe("boolean");
  });

  it("evaluates all rules for tenant", async () => {
    const executions = await ruleEngine.evaluateAllRules(TEST_TENANT);
    expect(Array.isArray(executions)).toBe(true);
  });

  it("returns execution history", () => {
    const history = ruleEngine.getExecutionHistory(TEST_TENANT, 10);
    expect(Array.isArray(history)).toBe(true);
  });

  it("handles budget exceeded trigger", async () => {
    const result = await ruleEngine.evaluateRule({
      name: "Budget Rule",
      trigger: "budget_exceeded",
      conditions: { threshold: 0.8 },
      action: "send_notification",
      actionParams: { message: "Budget exceeded" },
      cooldownMinutes: 30,
    }, TEST_TENANT);
    expect(result).toHaveProperty("triggered");
  });

  it("handles CTR drop trigger", async () => {
    const result = await ruleEngine.evaluateRule({
      name: "CTR Rule",
      trigger: "ctr_drop",
      conditions: { threshold: 0.3, window: 7 },
      action: "pause_campaign",
      actionParams: {},
      cooldownMinutes: 60,
    }, TEST_TENANT);
    expect(result).toHaveProperty("triggered");
  });
});

// ═══════════════════════════════════════════════════════════════════
// AgentService (Mongoose-dependent)
// ═══════════════════════════════════════════════════════════════════
describe("AgentService", () => {
  it("returns default agents list", () => {
    const defaults = agentService.getDefaultAgents();
    expect(Array.isArray(defaults)).toBe(true);
    expect(defaults.length).toBeGreaterThan(0);
    expect(defaults[0]).toHaveProperty("name");
    expect(defaults[0]).toHaveProperty("type");
  });
});

// ═══════════════════════════════════════════════════════════════════
// N0VA1OService
// ═══════════════════════════════════════════════════════════════════
describe("N0VA1OService", () => {
  it("can be instantiated", () => {
    const instance = new N0VA1OService();
    expect(instance).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
// EntityStore
// ═══════════════════════════════════════════════════════════════════
describe("EntityStore", () => {
  it("can be imported", () => {
    expect(entityStore).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
// SchedulerService
// ═══════════════════════════════════════════════════════════════════
describe("SchedulerService", () => {
  it("schedules and retrieves actions", () => {
    const action = schedulerService.schedule({
      tenantId: TEST_TENANT,
      campaignId: "camp_test",
      type: "adjust_budget",
      executeAt: new Date(Date.now() + 86400000).toISOString(),
      createdBy: "test",
    });
    expect(action).toHaveProperty("id");
    expect(action.executed).toBe(false);

    const retrieved = schedulerService.get(action.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(action.id);
  });

  it("lists scheduled actions", () => {
    const list = schedulerService.list(TEST_TENANT);
    expect(Array.isArray(list)).toBe(true);
  });

  it("cancels a scheduled action", () => {
    const action = schedulerService.schedule({
      tenantId: TEST_TENANT,
      campaignId: "camp_cancel",
      type: "pause_campaign",
      executeAt: new Date(Date.now() + 86400000).toISOString(),
      createdBy: "test",
    });
    const cancelled = schedulerService.cancel(action.id);
    expect(cancelled).toBe(true);
  });

  it("manages recurring schedules", () => {
    const recurring = schedulerService.createRecurring({
      tenantId: TEST_TENANT,
      campaignId: "camp_recur",
      type: "report",
      cronExpression: "0 9 * * 1",
      createdBy: "test",
    });
    expect(recurring).toHaveProperty("id");
    expect(recurring.enabled).toBe(true);

    const toggled = schedulerService.toggleRecurring(recurring.id);
    expect(toggled).not.toBeNull();
    expect(toggled!.enabled).toBe(false);

    const list = schedulerService.listRecurring(TEST_TENANT);
    expect(Array.isArray(list)).toBe(true);
  });

  it("manages dependencies", () => {
    const a1 = schedulerService.schedule({
      tenantId: TEST_TENANT,
      campaignId: "camp_dep",
      type: "adjust_budget",
      executeAt: new Date(Date.now() + 86400000).toISOString(),
      createdBy: "test",
    });
    const a2 = schedulerService.schedule({
      tenantId: TEST_TENANT,
      campaignId: "camp_dep",
      type: "send_notification",
      executeAt: new Date(Date.now() + 90000000).toISOString(),
      createdBy: "test",
    });

    const dep = schedulerService.addDependency({ actionId: a2.id, dependsOn: [a1.id] });
    expect(dep).toHaveProperty("id");
    expect(dep.dependsOn).toEqual([a1.id]);

    const deps = schedulerService.listDependencies(a2.id);
    expect(deps.length).toBeGreaterThan(0);

    const criticalPath = schedulerService.getCriticalPath(a2.id);
    expect(criticalPath).toHaveProperty("path");
    expect(criticalPath).toHaveProperty("totalActions");

    const removed = schedulerService.removeDependency(dep.id);
    expect(removed).toBe(true);
  });

  it("detects conflicts", () => {
    const result = schedulerService.detectConflicts(TEST_TENANT, "camp_conflict", new Date(Date.now() + 86400000));
    expect(result).toHaveProperty("hasConflict");
    expect(result).toHaveProperty("conflicts");
  });

  it("resets execution state", () => {
    schedulerService.resetExecutionState();
    expect(typeof schedulerService.getReadyActions).toBe("function");
  });
});
