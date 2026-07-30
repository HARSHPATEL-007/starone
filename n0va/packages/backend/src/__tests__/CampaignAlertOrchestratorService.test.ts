import { describe, it, expect } from "vitest";
import { CampaignAlertOrchestratorService } from "../services/CampaignAlertOrchestratorService";

const service = new CampaignAlertOrchestratorService();
const T = "alert-test-tenant";

describe("CampaignAlertOrchestrator - suggestAlertRules", () => {
  it("returns auto-suggested alert rules", () => {
    const r = service.suggestAlertRules(T);
    expect(Array.isArray(r)).toBe(true);
    for (const s of r) {
      expect(s).toHaveProperty("name");
      expect(s).toHaveProperty("description");
      expect(s).toHaveProperty("severity");
      expect(s).toHaveProperty("suggestedConfig");
      expect(s).toHaveProperty("confidence");
      expect(s).toHaveProperty("reason");
      expect(Array.isArray(s.campaignIds)).toBe(true);
    }
  });
});

describe("CampaignAlertOrchestrator - batchAlertAction", () => {
  it("returns batch result", () => {
    const r = service.batchAlertAction(["nonexistent-1", "nonexistent-2"], T, "acknowledge", "test-user");
    expect(typeof r.acknowledged).toBe("number");
    expect(typeof r.resolved).toBe("number");
    expect(typeof r.dismissed).toBe("number");
    expect(r.skipped).toBe(2);
    expect(Array.isArray(r.errors)).toBe(true);
  });
});

describe("CampaignAlertOrchestrator - getAlertPriorityInbox", () => {
  it("returns prioritized alert inbox", () => {
    const r = service.getAlertPriorityInbox(T);
    expect(Array.isArray(r)).toBe(true);
    for (const item of r) {
      expect(item).toHaveProperty("alert");
      expect(typeof item.priority).toBe("number");
      expect(["critical_now", "important_today", "review_soon", "monitor"]).toContain(item.label);
      expect(typeof item.timeSinceTriggered).toBe("string");
      expect(typeof item.campaignHealthImpact).toBe("string");
      expect(typeof item.suggestedAction).toBe("string");
    }
  });
});

describe("CampaignAlertOrchestrator - smartMuteNoisyAlerts", () => {
  it("returns auto-mute rules for noisy patterns", () => {
    const r = service.smartMuteNoisyAlerts(T);
    expect(Array.isArray(r)).toBe(true);
    for (const m of r) {
      expect(m).toHaveProperty("tenantId");
      expect(m).toHaveProperty("pattern");
      expect(m).toHaveProperty("muteUntil");
      expect(m).toHaveProperty("reason");
    }
  });
});

describe("CampaignAlertOrchestrator - escalateUnresolvedAlerts", () => {
  it("returns escalation entries for critical unresolved alerts", () => {
    const r = service.escalateUnresolvedAlerts(T, "manager@test.com");
    expect(Array.isArray(r)).toBe(true);
    for (const e of r) {
      expect(e).toHaveProperty("alertId");
      expect(e).toHaveProperty("severity");
      expect(e).toHaveProperty("escalatedTo");
      expect(e).toHaveProperty("status");
      expect(["pending", "acknowledged", "resolved", "overdue"]).toContain(e.status);
    }
  });
});

describe("CampaignAlertOrchestrator - getAlertDailyDigest", () => {
  it("returns daily digest with stats and recommendations", () => {
    const r = service.getAlertDailyDigest(T);
    expect(r.tenantId).toBe(T);
    expect(typeof r.totalActive).toBe("number");
    expect(typeof r.newAlerts).toBe("number");
    expect(typeof r.resolvedAlerts).toBe("number");
    expect(r.topSeverity).toBeTruthy();
    expect(Array.isArray(r.byCampaign)).toBe(true);
    expect(Array.isArray(r.criticalUnresolved)).toBe(true);
    expect(Array.isArray(r.recommendations)).toBe(true);
    expect(typeof r.estimatedReviewTime).toBe("string");
  });
});
