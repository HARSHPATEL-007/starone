import { describe, it, expect, beforeAll } from "vitest";
import { BrandSafetyGuardianService } from "../services/BrandSafetyGuardianService";
import { AttributionReportService } from "../services/AttributionReportService";
import { CrossPlatformPerformanceService } from "../services/CrossPlatformPerformanceService";
import { DataStore } from "../services/DataStore";

const guardian = new BrandSafetyGuardianService();
const attribution = new AttributionReportService();
const crossPlatform = new CrossPlatformPerformanceService();
const T = "guardian-test";

beforeAll(() => {
  const mem = DataStore.mem();
  mem.insert("campaigns", { _id: "g-1", name: "Guardian 1", tenantId: T, status: "active", type: "search", platforms: ["meta", "google"], budget: { daily: 500, lifetime: 15000, spent: 12000, remaining: 3000 }, startDate: "2025-01-01", endDate: "2025-12-31" });
  mem.insert("campaigns", { _id: "g-2", name: "Guardian 2", tenantId: T, status: "active", type: "display", platforms: ["tiktok", "linkedin"], budget: { daily: 200, lifetime: 6000, spent: 1000, remaining: 5000 }, startDate: "2025-05-01", endDate: "2025-10-01" });
  for (let i = 0; i < 5; i++) {
    mem.insert("metrics", { campaignId: i % 2 === 0 ? "g-1" : "g-2", tenantId: T, date: `2025-07-${String(1 + i).padStart(2, "0")}`, impressions: 2000 + i * 100, clicks: 40 + i * 5, conversions: 2 + i, spend: 50 + i * 10, revenue: 120 + i * 30 });
  }
});

describe("BrandSafetyGuardianService", () => {
  it("reports fraud protection active with six capabilities", () => {
    const r = guardian.fraudProtectionStatus(T);
    expect(r.status).toBe("active");
    expect(r.autoConfigured).toBe(true);
    expect(r.capabilities.length).toBe(6);
    expect(r.capabilities.every((c: any) => c.enabled)).toBe(true);
    expect(r.summary).toContain("ACTIVE");
  });

  it("monitors placements and flags suspicious inventory", () => {
    const r = guardian.monitorPlacements(T);
    expect(r.totals.monitored).toBeGreaterThan(0);
    expect(r.placements.every((p: any) => p.placementId && p.platform && p.riskScore >= 0)).toBe(true);
    expect(r.totals.flagged + r.totals.suspicious).toBeGreaterThan(0);
    expect(r.totals.summary).toMatch(/placements monitored/);
  });

  it("auto-pauses suspicious inventory in under two seconds", () => {
    const r = guardian.autoPauseSuspicious(T);
    expect(r.totals.pausedCount).toBeGreaterThan(0);
    expect(r.totals.protectedSpend).toBeGreaterThan(0);
    expect(r.totals.summary).toContain("paused");
    const log = DataStore.mem().find("brand_safety_log", (l: any) => l.tenantId === T && l.type === "auto_pause");
    expect(log.length).toBe(r.totals.pausedCount);
  });

  it("provides crisis response with three resolution options", () => {
    const r = guardian.crisisResponse(T);
    expect(r.crisisId).toMatch(/^crisis_/);
    expect(r.options.length).toBe(3);
    expect(r.options[1].action).toBe("resume_safe");
    expect(r.flaggedCount).toBeGreaterThan(0);
    expect(r.summary).toContain("protected");
  });

  it("escalates to legal and resumes on safe inventory", () => {
    const crisis = guardian.crisisResponse(T);
    const esc = guardian.escalateToLegal(T, crisis.crisisId);
    expect(esc.taskCreated).toBe(true);
    expect(esc.complianceNotified).toBe(true);
    const resume = guardian.resumeOnSafeInventory(T, crisis.crisisId);
    expect(resume.alternativesFound).toBeGreaterThanOrEqual(3);
    const log = guardian.guardianLog(T);
    expect(log.totals.total).toBeGreaterThanOrEqual(3);
    const types = log.entries.map((e: any) => e.type);
    expect(types).toContain("escalation");
    expect(types).toContain("resume");
  });
});

describe("AttributionReportService", () => {
  it("generates a one-page attribution report with plain language", () => {
    const r = attribution.attributionReport(T);
    expect(r.channels.length).toBe(4);
    expect(r.channels[0].revenue).toBeGreaterThanOrEqual(r.channels[3].revenue);
    expect(r.executiveSummary).toContain("ROAS");
    expect(r.plainLanguage.length).toBeGreaterThanOrEqual(3);
    expect(r.plainLanguage[0].metric).toBe("Total ROAS");
    expect(r.topPaths.length).toBeGreaterThan(0);
    expect(r.topPaths[0].path).toContain("→");
  });

  it("answers natural language queries about channels", () => {
    const r = attribution.attributionQuery(T, "Which channel is best?");
    expect(r.intent).toBe("best_channel");
    expect(r.answer).toContain("best channel");
    expect(r.data.length).toBe(4);
  });

  it("answers queries about a specific platform", () => {
    const r = attribution.attributionQuery(T, "how did meta contribute to revenue?");
    expect(r.intent).toBe("channel_attribution");
    expect(r.answer).toContain("meta");
    expect(r.data.channel).toBe("meta");
  });

  it("explains attribution models and answers ROAS questions", () => {
    const m = attribution.attributionQuery(T, "what changes with a linear model?");
    expect(m.intent).toBe("model_explanation");
    expect(m.answer).toContain("linear");
    const r = attribution.attributionQuery(T, "what is my return on ad spend?");
    expect(r.intent).toBe("roas_summary");
    expect(() => attribution.attributionQuery(T, "")).toThrow(/question/);
  });
});

describe("CrossPlatformPerformanceService", () => {
  it("returns live per-platform performance with trends", () => {
    const r = crossPlatform.crossPlatformPerformance(T);
    expect(r.platforms.length).toBe(4);
    const meta = r.platforms.find(p => p.platform === "meta")!;
    expect(meta.spend).toBeGreaterThan(0);
    expect(meta.roas).toBeGreaterThan(0);
    expect(["up", "down", "flat"]).toContain(meta.trend);
    expect(r.platforms[0].spend).toBeGreaterThanOrEqual(r.platforms[r.platforms.length - 1].spend);
  });

  it("aggregates totals and share of spend", () => {
    const r = crossPlatform.crossPlatformPerformance(T);
    const shareSum = Math.round(r.platforms.reduce((s, p) => s + p.share, 0) * 10) / 10;
    expect(shareSum).toBe(100);
    expect(r.totals.revenue).toBeGreaterThan(0);
    expect(r.totals.roas).toBeGreaterThan(0);
    expect(r.totals.summary).toContain("platforms up");
  });
});
