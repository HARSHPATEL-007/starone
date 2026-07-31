import { describe, it, expect, beforeAll } from "vitest";
import { CampaignAutoApproveService } from "../services/CampaignAutoApproveService";
import { CampaignTriageService } from "../services/CampaignTriageService";
import { CampaignTemplateService } from "../services/CampaignTemplateService";
import { CommandCenterService } from "../services/CommandCenterService";
import { DataStore } from "../services/DataStore";

const autoApprove = new CampaignAutoApproveService();
const triage = new CampaignTriageService();
const templates = new CampaignTemplateService();
const commandCenter = new CommandCenterService();
const T = "one-click-test";

beforeAll(() => {
  const mem = DataStore.mem();
  mem.insert("campaigns", { _id: "oc-1", name: "One Click 1", tenantId: T, status: "active", type: "search", platforms: ["meta"], budget: { daily: 500, lifetime: 15000, spent: 12000, remaining: 3000 }, startDate: "2025-01-01", endDate: "2025-12-31" });
  mem.insert("campaigns", { _id: "oc-2", name: "One Click 2", tenantId: T, status: "active", type: "display", platforms: ["google"], budget: { daily: 200, lifetime: 6000, spent: 1000, remaining: 5000 }, startDate: "2025-05-01", endDate: "2025-10-01" });
  for (let i = 0; i < 5; i++) {
    mem.insert("metrics", { campaignId: i % 2 === 0 ? "oc-1" : "oc-2", tenantId: T, date: `2025-07-${String(1 + i).padStart(2, "0")}`, impressions: 2000 + i * 100, clicks: 40 + i * 5, conversions: 2 + i, spend: 50 + i * 10, revenue: 120 + i * 30 });
  }
});

describe("CampaignAutoApproveService", () => {
  it("auto-approves small budget shifts and holds large ones", () => {
    const small = autoApprove.evaluateAction(T, { actionId: "a1", type: "budget_shift", description: "Shift $5K to Google", amount: 5000 });
    const large = autoApprove.evaluateAction(T, { actionId: "a2", type: "budget_shift", description: "Shift $50K to Google", amount: 50000 });
    expect(small.decision).toBe("auto_approve");
    expect(large.decision).toBe("requires_click");
    expect(large.thresholdDetails.amount).toBe(50000);
    expect(typeof small.reason).toBe("string");
  });

  it("respects bid change and audience pause thresholds", () => {
    const bid = autoApprove.evaluateAction(T, { actionId: "a3", type: "bid_change", changePercent: 20 });
    const bidBig = autoApprove.evaluateAction(T, { actionId: "a4", type: "bid_change", changePercent: 60 });
    const aud = autoApprove.evaluateAction(T, { actionId: "a5", type: "audience_pause", recordsAffected: 1000 });
    const audBig = autoApprove.evaluateAction(T, { actionId: "a6", type: "audience_pause", recordsAffected: 100000 });
    expect(bid.decision).toBe("auto_approve");
    expect(bidBig.decision).toBe("requires_click");
    expect(aud.decision).toBe("auto_approve");
    expect(audBig.decision).toBe("requires_click");
  });

  it("approveAll splits auto vs human and logs decisions", () => {
    const r = autoApprove.approveAll(T, [
      { actionId: "b1", type: "budget_shift", description: "Shift $2K", amount: 2000 },
      { actionId: "b2", type: "brand_safety", description: "Pause flagged placements" },
      { actionId: "b3", type: "budget_shift", description: "Shift $20K", amount: 20000 },
    ]);
    expect(r.totals.approved).toBe(2);
    expect(r.totals.pending).toBe(1);
    expect(r.totals.summary).toContain("Approved 2");
    const log = autoApprove.getDecisionLog(T);
    expect(log.totals.total).toBeGreaterThan(0);
  });

  it("updates settings and reflects changes", () => {
    autoApprove.updateApprovalSettings(T, { budgetShiftAutoLimit: 25000 });
    const r = autoApprove.evaluateAction(T, { actionId: "c1", type: "budget_shift", amount: 20000 });
    expect(r.decision).toBe("auto_approve");
    autoApprove.updateApprovalSettings(T, { budgetShiftAutoLimit: 10000 });
  });
});

describe("CampaignTriageService", () => {
  it("maps all six alert types to one-click actions", () => {
    const r = triage.triageBatch([
      { alertId: "t1", alertType: "budget_over_pacing", platform: "Meta", value: 82 },
      { alertId: "t2", alertType: "creative_fatigue", campaignName: "Summer_Sale_v2", value: 18 },
      { alertId: "t3", alertType: "roas_drop", platform: "Google", value: 15 },
      { alertId: "t4", alertType: "brand_safety", platform: "Meta", value: 3 },
      { alertId: "t5", alertType: "audience_quality", campaignName: "Lookalike 1%", value: 30 },
      { alertId: "t6", alertType: "bid_anomaly", campaignName: "Keyword X", value: 200 },
    ]);
    expect(r.totals.scanned).toBe(6);
    expect(r.totals.resolvable).toBe(6);
    expect(r.totals.manual).toBe(0);
    const actions = r.triaged.map(x => x.action);
    expect(actions).toContain("reduce_pacing");
    expect(actions).toContain("generate_variants");
    expect(actions).toContain("investigate");
    expect(actions).toContain("pause_inventory");
    expect(actions).toContain("pause_segment");
    expect(actions).toContain("reset_bid");
  });

  it("executes triage and records history", () => {
    const r = triage.executeTriage(T, { alertId: "t1", alertType: "budget_over_pacing", platform: "Meta", value: 82 });
    expect(r.status).toBe("executed");
    expect(r.action).toBe("reduce_pacing");
    expect(r.payload.percentage).toBe(20);
    const h = triage.getTriageHistory(T);
    expect(h.totals.total).toBe(1);
    expect(h.totals.byAction.reduce_pacing).toBe(1);
  });

  it("falls back to manual review for unknown alert types", () => {
    const r = triage.triageAlert({ alertId: "t9", alertType: "mystery", platform: "X" });
    expect(r.action).toBe("manual_review");
  });
});

describe("CampaignTemplateService", () => {
  it("lists all six templates", () => {
    const r = templates.listTemplates();
    expect(r.total).toBe(6);
    const ids = r.templates.map(t => t.templateId);
    expect(ids).toContain("black_friday");
    expect(ids).toContain("product_launch");
    expect(ids).toContain("cart_abandonment");
    expect(ids).toContain("brand_awareness");
    expect(ids).toContain("lead_generation");
    expect(ids).toContain("app_install");
  });

  it("instantiates with missing inputs flagged", () => {
    const r = templates.instantiateTemplate("cart_abandonment", { discount: 20 });
    expect(r.ready).toBe(false);
    expect(r.missingInputs).toContain("duration");
    const full = templates.instantiateTemplate("cart_abandonment", { discount: 20, duration: 30 });
    expect(full.ready).toBe(true);
    expect(full.campaign.budget.total).toBe(0);
  });

  it("launches a template into the campaign store", () => {
    const r = templates.launchTemplate(T, "cart_abandonment", { discount: 20, duration: 30, budget: 10000 });
    expect(r.status).toBe("live");
    expect(typeof r.campaignId).toBe("string");
    const stored = DataStore.mem().findOne("campaigns", (c: any) => c._id === r.campaignId && c.tenantId === T) as any;
    expect(stored).toBeDefined();
    expect(stored.template).toBe("cart_abandonment");
    expect(stored.budget.lifetime).toBe(10000);
    const hist = templates.getLaunchHistory(T);
    expect(hist.totals.total).toBe(1);
  });

  it("throws when launching with missing inputs", () => {
    expect(() => templates.launchTemplate(T, "black_friday", { budget: 5000 })).toThrow();
  });
});

describe("CommandCenterService", () => {
  it("returns the four command center cards", () => {
    const r = commandCenter.commandCenterSummary(T);
    expect(typeof r.cards.roas.value).toBe("number");
    expect(typeof r.cards.roas.changePercent).toBe("number");
    expect(["up", "down", "flat"]).toContain(r.cards.roas.direction);
    expect(typeof r.cards.budgetPacing.percent).toBe("number");
    expect(typeof r.cards.budgetPacing.dailyBudget).toBe("number");
    expect(typeof r.cards.alerts.count).toBe("number");
    expect(Array.isArray(r.cards.alerts.top)).toBe(true);
    expect(typeof r.cards.aiSuggestions.count).toBe("number");
    expect(Array.isArray(r.cards.aiSuggestions.top)).toBe(true);
  });

  it("generates a narrative daily briefing", () => {
    const r = commandCenter.dailyBriefing(T);
    expect(typeof r.briefing).toBe("string");
    expect(r.briefing).toContain("Good morning");
    expect(Array.isArray(r.sections)).toBe(true);
    expect(r.sections.length).toBeGreaterThan(0);
  });

  it("parses voice commands", () => {
    const pause = commandCenter.parseVoiceCommand("Pause all Meta campaigns");
    expect(pause.intent).toBe("pause_platform");
    expect(pause.params.platform).toBe("meta");
    const shift = commandCenter.parseVoiceCommand("Shift $10K to Google");
    expect(shift.intent).toBe("shift_budget");
    expect(shift.params.amount).toBe(10000);
    const roas = commandCenter.parseVoiceCommand("How's my ROAS today?");
    expect(roas.intent).toBe("query_metric");
    expect(roas.params.metric).toBe("roas");
    const fatigue = commandCenter.parseVoiceCommand("Show me fatigued creatives");
    expect(fatigue.intent).toBe("show_fatigued");
    const unknown = commandCenter.parseVoiceCommand("banana");
    expect(unknown.intent).toBe("unknown");
  });

  it("returns quick actions with live counts", () => {
    const r = commandCenter.quickActions(T);
    expect(Array.isArray(r.actions)).toBe(true);
    expect(r.actions.length).toBeGreaterThanOrEqual(6);
    for (const a of r.actions) {
      expect(a).toHaveProperty("id");
      expect(a).toHaveProperty("label");
      expect(a).toHaveProperty("endpoint");
      expect(a).toHaveProperty("method");
    }
  });
});
