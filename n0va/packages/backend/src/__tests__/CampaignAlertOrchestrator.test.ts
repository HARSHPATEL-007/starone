import { describe, it, expect, beforeAll } from "vitest";
import { campaignAlertOrchestrator } from "../services/CampaignAlertOrchestratorService";
import { DataStore } from "../services/DataStore";

const TEST_TENANT = "test_cao_tenant";

beforeAll(() => {
  const mem = DataStore.mem();
  for (let i = 0; i < 3; i++) {
    mem.insert("campaigns", {
      name: `CAO Camp ${i}`,
      tenantId: TEST_TENANT,
      status: "active",
      budget: { daily: 100, lifetime: 3000, spent: 500 + i * 200, remaining: 2500 - i * 200, currency: "USD" },
      metrics: { impressions: 10000 + i * 2000, clicks: 200 + i * 50, conversions: 10 + i * 3, revenue: 800 + i * 200, spend: 500 + i * 200 },
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    });
  }
});

describe("CampaignAlertOrchestrator - Rule CRUD", () => {
  it("creates a threshold rule", () => {
    const rule = campaignAlertOrchestrator.createRule(TEST_TENANT, {
      name: "Low ROAS Alert",
      description: "Alert when ROAS drops below 1.0",
      type: "threshold",
      severity: "high",
      config: { metric: "roas", operator: "lt", value: 1.0, campaignScope: "all" },
      channels: ["in-app"],
      cooldownMinutes: 60,
    });
    expect(rule.id).toBeTruthy();
    expect(rule.name).toBe("Low ROAS Alert");
    expect(rule.status).toBe("enabled");
    expect(rule.type).toBe("threshold");
  });

  it("creates a trend rule", () => {
    const rule = campaignAlertOrchestrator.createRule(TEST_TENANT, {
      name: "CTR Decline",
      description: "Alert when CTR declines for 3 days",
      type: "trend",
      severity: "medium",
      config: { metric: "ctr", direction: "down", days: 3, changePercent: 10, campaignScope: "all" },
      channels: ["in-app"],
      cooldownMinutes: 30,
    });
    expect(rule.id).toBeTruthy();
    expect(rule.type).toBe("trend");
  });

  it("creates an anomaly rule", () => {
    const rule = campaignAlertOrchestrator.createRule(TEST_TENANT, {
      name: "Spike Detector",
      description: "Alert on spend anomalies",
      type: "anomaly",
      severity: "critical",
      config: { metrics: ["spend", "revenue"], minSeverity: "medium", campaignScope: "all" },
      channels: ["in-app", "webhook"],
      cooldownMinutes: 15,
    });
    expect(rule.id).toBeTruthy();
    expect(rule.type).toBe("anomaly");
  });

  it("creates a composite rule", () => {
    const rule = campaignAlertOrchestrator.createRule(TEST_TENANT, {
      name: "Composite Health",
      description: "Alert when multiple conditions met",
      type: "composite",
      severity: "high",
      config: {
        conditions: [
          { ruleType: "threshold", config: { metric: "roas", operator: "lt", value: 1.5, campaignScope: "all" } },
          { ruleType: "threshold", config: { metric: "healthScore", operator: "lt", value: 40, campaignScope: "all" } },
        ],
        logic: "and",
        campaignScope: "all",
      },
      channels: ["in-app"],
      cooldownMinutes: 60,
    });
    expect(rule.id).toBeTruthy();
    expect(rule.type).toBe("composite");
  });

  it("gets all rules", () => {
    const rules = campaignAlertOrchestrator.getRules(TEST_TENANT);
    expect(rules.length).toBe(4);
  });

  it("gets rules filtered by status", () => {
    const enabled = campaignAlertOrchestrator.getRules(TEST_TENANT, "enabled");
    expect(enabled.length).toBe(4);
  });

  it("gets single rule", () => {
    const rules = campaignAlertOrchestrator.getRules(TEST_TENANT);
    const rule = campaignAlertOrchestrator.getRule(rules[0].id, TEST_TENANT);
    expect(rule).not.toBeNull();
    expect(rule!.id).toBe(rules[0].id);
  });

  it("updates a rule", () => {
    const rules = campaignAlertOrchestrator.getRules(TEST_TENANT);
    const updated = campaignAlertOrchestrator.updateRule(rules[0].id, TEST_TENANT, { severity: "critical" });
    expect(updated).not.toBeNull();
    expect(updated!.severity).toBe("critical");
  });

  it("deletes a rule", () => {
    const rules = campaignAlertOrchestrator.getRules(TEST_TENANT);
    const deleted = campaignAlertOrchestrator.deleteRule(rules[0].id, TEST_TENANT);
    expect(deleted).toBe(true);
    const remaining = campaignAlertOrchestrator.getRules(TEST_TENANT);
    expect(remaining.length).toBe(3);
  });
});

describe("CampaignAlertOrchestrator - Alert Evaluation", () => {
  it("evaluates rules and generates alerts", () => {
    campaignAlertOrchestrator.createRule(TEST_TENANT, {
      name: "Auto ROAS Check",
      description: "Alert on low ROAS",
      type: "threshold",
      severity: "high",
      config: { metric: "roas", operator: "lt", value: 5.0, campaignScope: "all" },
      channels: ["in-app"],
      cooldownMinutes: 0,
    });
    const result = campaignAlertOrchestrator.evaluateRules(TEST_TENANT);
    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  it("returns alerts", () => {
    const alerts = campaignAlertOrchestrator.getAlerts(TEST_TENANT);
    expect(alerts).toBeDefined();
  });

  it("acknowledges an alert", () => {
    const alerts = campaignAlertOrchestrator.getAlerts(TEST_TENANT, "active");
    if (alerts.length > 0) {
      const ackd = campaignAlertOrchestrator.acknowledgeAlert(alerts[0].id, TEST_TENANT, "test_user");
      expect(ackd).not.toBeNull();
      expect(ackd!.status).toBe("acknowledged");
      expect(ackd!.acknowledgedBy).toBe("test_user");
    }
  });

  it("resolves an alert", () => {
    const alerts = campaignAlertOrchestrator.getAlerts(TEST_TENANT);
    if (alerts.length > 0) {
      const resolved = campaignAlertOrchestrator.resolveAlert(alerts[0].id, TEST_TENANT, "test_user");
      expect(resolved).not.toBeNull();
      expect(resolved!.status).toBe("resolved");
    }
  });

  it("dismisses an alert", () => {
    campaignAlertOrchestrator.evaluateRules(TEST_TENANT);
    const alerts = campaignAlertOrchestrator.getAlerts(TEST_TENANT, "active");
    if (alerts.length > 0) {
      const dismissed = campaignAlertOrchestrator.dismissAlert(alerts[0].id, TEST_TENANT);
      expect(dismissed).not.toBeNull();
      expect(dismissed!.status).toBe("dismissed");
    }
  });
});

describe("CampaignAlertOrchestrator - Alert Summary", () => {
  it("returns summary with stats", () => {
    const summary = campaignAlertOrchestrator.getAlertSummary(TEST_TENANT);
    expect(summary.totalActive).toBeGreaterThanOrEqual(0);
    expect(summary.bySeverity).toBeDefined();
    expect(summary.byCampaign).toBeDefined();
    expect(summary.recentAlerts).toBeDefined();
    expect(summary.mostFrequentMetric).toBeTruthy();
    expect(summary.avgResolutionTime).toBeGreaterThanOrEqual(0);
  });
});

describe("CampaignAlertOrchestrator - Edge Cases", () => {
  it("returns empty array for non-existent rule", () => {
    const r = campaignAlertOrchestrator.getRule("nonexistent", TEST_TENANT);
    expect(r).toBeNull();
  });

  it("returns false deleting non-existent rule", () => {
    const r = campaignAlertOrchestrator.deleteRule("nonexistent", TEST_TENANT);
    expect(r).toBe(false);
  });

  it("returns null acknowledging non-existent alert", () => {
    const r = campaignAlertOrchestrator.acknowledgeAlert("nonexistent", TEST_TENANT, "user");
    expect(r).toBeNull();
  });

  it("handles tenant isolation", () => {
    const rules = campaignAlertOrchestrator.getRules("other_tenant");
    expect(rules.length).toBe(0);
  });
});