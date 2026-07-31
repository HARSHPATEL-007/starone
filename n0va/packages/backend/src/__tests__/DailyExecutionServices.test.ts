import { describe, it, expect, beforeAll } from "vitest";
import { CampaignRealTimeMonitorService } from "../services/CampaignRealTimeMonitorService";
import { CampaignPerformanceDiagnosticsService } from "../services/CampaignPerformanceDiagnosticsService";
import { CampaignConversionFunnelAnalyzerService } from "../services/CampaignConversionFunnelAnalyzerService";
import { CampaignHealthPredictorService } from "../services/CampaignHealthPredictorService";
import { DataStore } from "../services/DataStore";

const realTimeMonitor = new CampaignRealTimeMonitorService();
const diagnostics = new CampaignPerformanceDiagnosticsService();
const funnelAnalyzer = new CampaignConversionFunnelAnalyzerService();
const healthPredictor = new CampaignHealthPredictorService();
const T = "daily-exec-test";

beforeAll(() => {
  const mem = DataStore.mem();
  mem.insert("campaigns", { _id: "dex-1", name: "Exec 1", tenantId: T, status: "active", type: "search", platforms: ["meta"], budget: { daily: 500, lifetime: 15000, spent: 12000, remaining: 3000 }, startDate: "2025-01-01", endDate: "2025-12-31" });
  mem.insert("campaigns", { _id: "dex-2", name: "Exec 2", tenantId: T, status: "active", type: "display", platforms: ["google"], budget: { daily: 200, lifetime: 6000, spent: 1000, remaining: 5000 }, startDate: "2025-05-01", endDate: "2025-10-01" });
  for (let i = 0; i < 5; i++) {
    mem.insert("metrics", { campaignId: i % 2 === 0 ? "dex-1" : "dex-2", tenantId: T, date: `2025-07-${String(1 + i).padStart(2, "0")}`, impressions: 2000 + i * 100, clicks: 40 + i * 5, conversions: 2 + i, spend: 50 + i * 10, revenue: 120 + i * 30 });
  }
});

describe("CampaignRealTimeMonitorService - portfolioRealTimeSummary", () => {
  it("returns cross-campaign real-time summary", () => {
    const r = realTimeMonitor.portfolioRealTimeSummary(T);
    expect(typeof r.totalCampaigns).toBe("number");
    expect(typeof r.alertsActive).toBe("number");
    expect(typeof r.campaignsWithAnomalies).toBe("number");
    expect(typeof r.budgetPacingIssues).toBe("number");
    expect(Array.isArray(r.topConcerns)).toBe(true);
    expect(typeof r.summary).toBe("string");
  });
});

describe("CampaignRealTimeMonitorService - batchResolveAlerts", () => {
  it("processes batch alert actions", () => {
    const alerts = realTimeMonitor.generateLiveAlerts("dex-1", T);
    const ids = alerts.slice(0, 2).map(a => a.id);
    const r = realTimeMonitor.batchResolveAlerts("dex-1", T, ids, "resolve");
    expect(r.processed).toBeGreaterThanOrEqual(0);
    expect(r.campaignId).toBe("dex-1");
    expect(r.action).toBe("resolve");
  });
});

describe("CampaignPerformanceDiagnosticsService - diagnosticsPriorityList", () => {
  it("returns campaigns sorted by severity", () => {
    const r = diagnostics.diagnosticsPriorityList(T);
    expect(Array.isArray(r.campaigns)).toBe(true);
    expect(typeof r.totals.campaignsScanned).toBe("number");
    expect(typeof r.totals.criticalFindings).toBe("number");
    expect(typeof r.totals.highFindings).toBe("number");
    expect(typeof r.totals.campaignsNeedingAttention).toBe("number");
    expect(typeof r.generatedAt).toBe("string");
    for (const c of r.campaigns) {
      expect(c).toHaveProperty("campaignId");
      expect(c).toHaveProperty("score");
      expect(c).toHaveProperty("grade");
      expect(c).toHaveProperty("critical");
    }
  });
});

describe("CampaignConversionFunnelAnalyzerService - funnelPortfolioHealth", () => {
  it("returns cross-campaign funnel health", () => {
    const r = funnelAnalyzer.funnelPortfolioHealth(T);
    expect(Array.isArray(r.campaigns)).toBe(true);
    expect(typeof r.totals.scanned).toBe("number");
    expect(typeof r.totals.averageScore).toBe("number");
    expect(typeof r.totals.campaignsNeedingAttention).toBe("number");
    expect(typeof r.totals.topBottleneckStage).toBe("string");
    for (const c of r.campaigns) {
      expect(c).toHaveProperty("campaignId");
      expect(c).toHaveProperty("score");
      expect(c).toHaveProperty("grade");
      expect(Array.isArray(c.criticalBottlenecks)).toBe(true);
    }
  });
});

describe("CampaignHealthPredictorService - healthPredictorQuickView", () => {
  it("returns quick health view across campaigns", () => {
    const metrics = healthPredictor.generateSampleMetrics(20);
    const r = healthPredictor.healthPredictorQuickView([
      { campaignId: "dex-1", campaignName: "Exec 1", metrics },
      { campaignId: "dex-2", campaignName: "Exec 2", metrics: metrics.map(m => ({ ...m, spend: m.spend * 2, revenue: m.revenue * 0.5 })) },
    ]);
    expect(Array.isArray(r.campaigns)).toBe(true);
    expect(r.campaigns.length).toBe(2);
    expect(typeof r.totals.scanned).toBe("number");
    expect(typeof r.totals.averageHealth).toBe("number");
    expect(typeof r.totals.atRisk).toBe("number");
    expect(typeof r.totals.earlyWarnings).toBe("number");
    expect(typeof r.totals.summary).toBe("string");
    for (const c of r.campaigns) {
      expect(c).toHaveProperty("overall");
      expect(c).toHaveProperty("category");
      expect(c).toHaveProperty("riskLevel");
      expect(c).toHaveProperty("predictedRemainingDays");
    }
  });
});
