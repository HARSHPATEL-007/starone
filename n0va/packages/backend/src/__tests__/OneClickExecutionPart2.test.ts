import { describe, it, expect, beforeAll } from "vitest";
import { CampaignLaunchWizardService } from "../services/CampaignLaunchWizardService";
import { CreativeAutoRefreshService } from "../services/CreativeAutoRefreshService";
import { QuickFixService } from "../services/QuickFixService";
import { CrossModuleWorkflowService } from "../services/CrossModuleWorkflowService";
import { DataStore } from "../services/DataStore";

const launchWizard = new CampaignLaunchWizardService();
const creativeAutoRefresh = new CreativeAutoRefreshService();
const quickFix = new QuickFixService();
const workflow = new CrossModuleWorkflowService();
const T = "one-click-p2";

beforeAll(() => {
  const mem = DataStore.mem();
  mem.insert("campaigns", { _id: "p2-1", name: "Part 2 Campaign", tenantId: T, status: "active", type: "search", platforms: ["meta"], budget: { daily: 500, lifetime: 15000, spent: 12000, remaining: 3000 }, startDate: "2025-01-01", endDate: "2025-12-31" });
  for (let i = 0; i < 4; i++) {
    mem.insert("metrics", { campaignId: "p2-1", tenantId: T, date: `2025-07-${String(1 + i).padStart(2, "0")}`, impressions: 1000 + i * 100, clicks: 50 - i * 12, conversions: 2 + i, spend: 50 + i * 10, revenue: 120 + i * 30 });
  }
});

describe("CampaignLaunchWizardService", () => {
  it("launches a campaign in 3 clicks with all steps done", () => {
    const r = launchWizard.launchWizard(T, { templateId: "black_friday", name: "BFCM Blitz", budget: 30000 });
    expect(r.campaignId).toMatch(/^wiz_/);
    expect(r.steps.every((s: any) => s.status === "done")).toBe(true);
    expect(r.readiness).toBe("ready");
    const stored = DataStore.mem().findOne("campaigns", (c: any) => c._id === r.campaignId && c.tenantId === T);
    expect(stored).toBeTruthy();
    expect(stored.viaWizard).toBe(true);
    expect(stored.platforms.length).toBeGreaterThan(0);
  });

  it("throws when wizard inputs are invalid", () => {
    expect(() => launchWizard.launchWizard(T, { templateId: "", name: "X", budget: 100 })).toThrow(/templateId/);
    expect(() => launchWizard.launchWizard(T, { templateId: "x", name: "X", budget: 0 })).toThrow(/positive budget/);
  });

  it("duplicates a campaign paused with copy suffix", () => {
    const r = launchWizard.duplicateCampaign(T, "p2-1");
    expect(r.status).toBe("paused");
    expect(r.name).toContain("(Copy)");
    const dup = DataStore.mem().findOne("campaigns", (c: any) => c._id === r.newCampaignId && c.tenantId === T);
    expect(dup.duplicatedFrom).toBe("p2-1");
    expect(dup.budget.spent).toBe(0);
  });

  it("mirrors a campaign to additional platforms", () => {
    const r = launchWizard.mirrorCampaign(T, "p2-1", ["google", "tiktok"]);
    expect(r.platforms.every((p: any) => p.status === "live")).toBe(true);
    const updated = DataStore.mem().findOne("campaigns", (c: any) => c._id === "p2-1" && c.tenantId === T);
    expect(updated.platforms).toContain("google");
    expect(updated.mirroredPlatforms.length).toBe(2);
  });

  it("reports launch readiness checklist", () => {
    const ready = launchWizard.launchWizard(T, { templateId: "lead_generation", name: "Readiness Check", budget: 5000 });
    const r = launchWizard.launchReadiness(T, ready.campaignId);
    expect(r.checklist.length).toBe(3);
    expect(r.checklist[0].item).toBe("Budget configured");
    expect(r.checklist[0].met).toBe(true);
    expect(() => launchWizard.launchReadiness(T, "nope")).toThrow(/not found/);
  });
});

describe("CreativeAutoRefreshService", () => {
  it("generates creative variants from a description", () => {
    const r = creativeAutoRefresh.generateCreative(T, "Summer sale banner", 3);
    expect(r.variants.length).toBe(3);
    expect(r.variants.every((v: any) => v.headline && v.cta && v.predictedPerformance > 0)).toBe(true);
    const stored = DataStore.mem().find("creatives", (c: any) => c.tenantId === T && c.via === "ani");
    expect(stored.length).toBe(3);
    expect(() => creativeAutoRefresh.generateCreative(T, "", 1)).toThrow(/Describe/);
  });

  it("detects fatigue when CTR drops >20% from peak", () => {
    const r = creativeAutoRefresh.detectFatigue(T);
    expect(r.totals.scanned).toBeGreaterThanOrEqual(1);
    const fatigued = r.campaigns.filter(c => c.fatigued);
    expect(fatigued.length).toBeGreaterThan(0);
    expect(fatigued[0].dropPercent).toBeGreaterThan(20);
  });

  it("runs auto-refresh: generates variants and submits for approval", () => {
    const r = creativeAutoRefresh.runAutoRefresh(T);
    expect(r.totals.fatiguedDetected).toBeGreaterThan(0);
    expect(r.totals.variantsGenerated).toBe(3 * r.refreshed.length);
    const pending = DataStore.mem().find("approval_decisions", (d: any) => d.tenantId === T && d.type === "creative_refresh" && d.decision === "pending");
    expect(pending.length).toBe(r.totals.variantsGenerated);
    expect(r.refreshed[0].status).toBe("awaiting_approval");
  });

  it("uploads an asset with auto-tags, resize and dedup check", () => {
    const r = creativeAutoRefresh.uploadAsset(T, { name: "beach-summer-20.jpg", type: "image", sizeBytes: 204800 });
    expect(r.aiTags.length).toBeGreaterThan(0);
    expect(r.brandSafety).toMatch(/clear|flagged/);
    expect(r.resizedFor.length).toBe(4);
    expect(r.resizedFor[0].dimensions).toBe("1080x1080");
    const dup = creativeAutoRefresh.uploadAsset(T, { name: "beach-summer-20.jpg", type: "image", sizeBytes: 204800 });
    expect(dup.duplicateOf).toBeTruthy();
  });

  it("summarizes asset library status", () => {
    const r = creativeAutoRefresh.assetLibraryStatus(T);
    expect(r.total).toBeGreaterThanOrEqual(2);
    expect(r.summary).toMatch(/assets in library/);
    expect(r.avgPrediction).toBeGreaterThan(0);
  });
});

describe("QuickFixService", () => {
  it("lists the seven one-click fixes with detections", () => {
    const r = quickFix.quickFixes(T);
    expect(r.fixes.length).toBe(7);
    expect(r.fixes.every((f: any) => f.fix && f.time && f.detection)).toBe(true);
    expect(r.totals.detected).toBeGreaterThan(0);
  });

  it("applies a single fix and logs it", () => {
    const r = quickFix.applyQuickFix(T, "not_spending");
    expect(r.status).toBe("executed");
    expect(r.action).toContain("Increase bids 20%");
    const log = DataStore.mem().find("triage_logs", (l: any) => l.tenantId === T && l.alertType === "quick_fix");
    expect(log.length).toBeGreaterThan(0);
    expect(() => quickFix.applyQuickFix(T, "unknown_fix")).toThrow(/Unknown fix/);
  });

  it("applies all detected fixes in one click", () => {
    const r = quickFix.fixAll(T);
    expect(r.totals.applied).toBeGreaterThan(0);
    expect(r.totals.summary).toContain("fixes applied");
  });
});

describe("CrossModuleWorkflowService", () => {
  it("triggers eight cross-module automations on campaign creation", () => {
    const r = workflow.campaignCreationWorkflow(T, "p2-1");
    expect(r.automations.length).toBe(8);
    const modules = r.automations.map((a: any) => a.module);
    expect(modules).toContain("Tasks");
    expect(modules).toContain("Calendar");
    expect(modules).toContain("Docs");
    expect(modules).toContain("Vault");
    expect(r.automations.every((a: any) => a.status === "created" || a.status === "scheduled" || a.status === "logged")).toBe(true);
    expect(() => workflow.campaignCreationWorkflow(T, "nope")).toThrow(/not found/);
  });

  it("logs workflows and returns history", () => {
    const r = workflow.workflowLog(T);
    expect(r.totals.total).toBeGreaterThanOrEqual(1);
    expect(r.entries[0].moduleCount).toBe(8);
    const sorted = r.entries.every((e: any, i: number, arr: any[]) => i === 0 || String(arr[i - 1].triggeredAt) >= String(e.triggeredAt));
    expect(sorted).toBe(true);
  });
});
