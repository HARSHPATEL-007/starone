import { describe, it, expect, beforeAll } from "vitest";
import { CampaignAudienceBuilderService } from "../services/CampaignAudienceBuilderService";
import { BudgetAutopilotService } from "../services/BudgetAutopilotService";
import { WeeklyMonthlyRoutinesService } from "../services/WeeklyMonthlyRoutinesService";
import { DataStore } from "../services/DataStore";

const audienceBuilder = new CampaignAudienceBuilderService();
const autopilot = new BudgetAutopilotService();
const routines = new WeeklyMonthlyRoutinesService();
const T = "set-forget-test";

beforeAll(() => {
  const mem = DataStore.mem();
  mem.insert("campaigns", { _id: "sf-1", name: "Set Forget 1", tenantId: T, status: "active", type: "search", platforms: ["meta"], budget: { daily: 500, lifetime: 15000, spent: 12000, remaining: 3000 }, startDate: "2025-01-01", endDate: "2025-12-31" });
  mem.insert("campaigns", { _id: "sf-2", name: "Set Forget 2", tenantId: T, status: "active", type: "display", platforms: ["google", "meta"], budget: { daily: 200, lifetime: 6000, spent: 1000, remaining: 5000 }, startDate: "2025-05-01", endDate: "2025-10-01" });
  for (let i = 0; i < 5; i++) {
    mem.insert("metrics", { campaignId: i % 2 === 0 ? "sf-1" : "sf-2", tenantId: T, date: `2025-07-${String(1 + i).padStart(2, "0")}`, impressions: 2000 + i * 100, clicks: 40 + i * 5, conversions: 2 + i, spend: 50 + i * 10, revenue: 120 + i * 30 });
  }
  mem.insert("audiences", { _id: "aud_lowq", tenantId: T, name: "Expired Coupon List", segments: [{ type: "cart_abandonment", windowDays: 7 }], platforms: ["meta"], estimatedSize: 500, syncedTo: [{ platform: "meta", status: "synced", syncedAt: "2025-07-01T00:00:00.000Z" }], qualityScore: 12 });
});

describe("CampaignAudienceBuilderService", () => {
  it("builds a visual audience and persists it with sync rules", () => {
    const r = audienceBuilder.buildAudience(T, "VIP Customers", [
      { type: "purchase", windowDays: 90, minValue: 100 },
      { type: "high_lifetime_value", windowDays: 365 },
    ], { lookalikePercent: 5, platforms: ["meta", "google"] });
    expect(r.audienceId).toMatch(/^aud_/);
    expect(r.platforms).toEqual(["meta", "google"]);
    expect(r.estimatedSize).toBeGreaterThan(0);
    expect(r.syncRules.length).toBe(3);
    const stored = DataStore.mem().findOne("audiences", (a: any) => a._id === r.audienceId && a.tenantId === T);
    expect(stored).toBeTruthy();
    expect(stored.segments.length).toBe(2);
  });

  it("throws on audience without segments", () => {
    expect(() => audienceBuilder.buildAudience(T, "Empty", [])).toThrow(/at least one segment/);
  });

  it("syncs audience to platforms and updates status", () => {
    const aud = audienceBuilder.buildAudience(T, "Cart Abandoners", [{ type: "cart_abandonment", windowDays: 7 }]);
    const r = audienceBuilder.syncAudienceToPlatforms(T, aud.audienceId);
    expect(r.platforms.every((p: any) => p.status === "synced")).toBe(true);
    expect(r.summary).toContain("synced to");
    const status = audienceBuilder.audienceSyncStatus(T);
    expect(status.totals.fullySynced).toBeGreaterThan(0);
    expect(status.totals.summary).toMatch(/fully synced/);
  });

  it("scores audience quality and suggests auto-pause", () => {
    const r = audienceBuilder.audienceQualityScoring(T);
    expect(r.totals.scored).toBeGreaterThanOrEqual(2);
    expect(r.audiences.every((a: any) => ["healthy", "watch", "low_quality"].includes(a.status))).toBe(true);
    expect(r.totals.summary).toMatch(/healthy, .* watch/);
  });

  it("ranks audiences by LTV and flags auto-expand / auto-pause", () => {
    const r = audienceBuilder.audienceLtvRanking(T);
    expect(r.ranked.length).toBeGreaterThanOrEqual(2);
    expect(r.ranked[0].rank).toBe(1);
    expect(r.ranked.every((a: any, i: number, arr: any[]) => i === 0 || arr[i - 1].roas >= a.roas)).toBe(true);
    expect(r.ranked.every((a: any) => ["auto_expand", "auto_paused", "maintain", "review"].includes(a.status))).toBe(true);
  });

  it("applies auto actions and logs them", () => {
    const r = audienceBuilder.applyAudienceAutoActions(T);
    expect(r.totals.evaluated).toBeGreaterThanOrEqual(2);
    expect(r.applied.some((a: any) => a.audienceId === "aud_lowq" && a.status === "auto_paused")).toBe(true);
    const log = DataStore.mem().find("audience_actions", (a: any) => a.tenantId === T);
    expect(log.length).toBe(r.applied.length);
    const status = audienceBuilder.audienceSyncStatus(T);
    expect(status.audiences.some((a: any) => a.autoStatus !== null)).toBe(true);
  });

  it("tolerates audience records without a platforms field in sync status", () => {
    DataStore.mem().insert("audiences", { _id: "aud_legacy", tenantId: T, name: "Legacy Segment", segments: [], estimatedSize: 100, qualityScore: 40 });
    const status = audienceBuilder.audienceSyncStatus(T);
    const legacy = status.audiences.find((a: any) => a.audienceId === "aud_legacy");
    expect(legacy).toBeTruthy();
    expect(legacy.syncedCount).toBe(0);
    expect(status.totals.total).toBeGreaterThanOrEqual(3);
    expect(status.totals.summary).toMatch(/fully synced/);
  });
});

describe("BudgetAutopilotService", () => {
  it("enables autopilot with allocation across platforms", () => {
    const r = autopilot.enableAutopilot(T, { monthlyBudget: 50000, targetRoas: 3 });
    expect(r.status).toBe("enabled");
    expect(r.initialAllocation.length).toBe(4);
    const total = r.initialAllocation.reduce((s, a) => s + a.monthly, 0);
    expect(total).toBe(50000);
    expect(r.summary).toContain("$50,000");
  });

  it("reports disabled status when not configured", () => {
    const r = autopilot.autopilotStatus("no-such-tenant");
    expect(r.enabled).toBe(false);
    expect(r.summary).toContain("not enabled");
  });

  it("runs a cycle that shifts budget away from underperformers", () => {
    const r = autopilot.runAutopilotCycle(T);
    expect(r.cycle).toBe(1);
    expect(Array.isArray(r.changes)).toBe(true);
    const allocTotal = r.allocationAfter.reduce((s, a) => s + a.monthly, 0);
    expect(allocTotal).toBe(50000);
    expect(r.summary).toContain("Cycle 1");
    const status = autopilot.autopilotStatus(T);
    expect(status.cyclesRun).toBe(1);
  });

  it("throws when autopilot not enabled", () => {
    expect(() => autopilot.runAutopilotCycle("no-such-tenant")).toThrow(/not enabled/);
  });

  it("generates proactive spend alerts with recommendations", () => {
    const r = autopilot.spendAlerts(T);
    expect(r.totals.count).toBeGreaterThanOrEqual(1);
    expect(r.alerts.every((a: any) => a.message && a.recommendation && a.severity)).toBe(true);
  });

  it("summarizes daily autopilot activity", () => {
    const r = autopilot.autopilotDailySummary(T);
    expect(r.cycles).toBeGreaterThanOrEqual(1);
    expect(r.totalChanges).toBeGreaterThanOrEqual(0);
    expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("WeeklyMonthlyRoutinesService", () => {
  it("generates a weekly review with six sections", () => {
    const r = routines.weeklyReview(T);
    expect(r.sections.length).toBe(6);
    const titles = r.sections.map((s: any) => s.title);
    expect(titles).toContain("Performance summary");
    expect(titles).toContain("Creative performance ranking");
    expect(titles).toContain("Budget forecast");
    expect(r.recommendations.length).toBeGreaterThanOrEqual(1);
  });

  it("includes autopilot and audience insights in weekly review", () => {
    const r = routines.weeklyReview(T);
    const aiLog = r.sections.find((s: any) => s.title === "AI optimization log");
    expect(aiLog.content.cycles).toBeGreaterThanOrEqual(1);
    const audience = r.sections.find((s: any) => s.title === "Audience quality scorecard");
    expect(audience.content.total).toBeGreaterThanOrEqual(2);
  });

  it("generates a monthly strategy deck with channel deep-dive", () => {
    const r = routines.monthlyStrategyDeck(T);
    expect(r.sections.length).toBe(5);
    const channels = r.sections.find((s: any) => s.title === "Channel performance deep-dive");
    expect(Object.keys(channels.content).length).toBeGreaterThanOrEqual(1);
    expect(channels.content.meta).toBeTruthy();
    expect(r.executiveSummary).toContain("ROAS");
  });

  it("merges all AI action logs into one optimization timeline", () => {
    const r = routines.aiOptimizationLog(T);
    expect(r.totals.total).toBeGreaterThanOrEqual(1);
    const sources = Object.keys(r.totals.sources);
    expect(sources).toContain("autopilot");
    expect(sources).toContain("audiences");
    const sorted = r.entries.every((e: any, i: number, arr: any[]) => i === 0 || String(arr[i - 1].timestamp) >= String(e.timestamp));
    expect(sorted).toBe(true);
  });
});
