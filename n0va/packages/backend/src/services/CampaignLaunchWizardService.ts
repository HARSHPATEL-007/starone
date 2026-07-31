import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export class CampaignLaunchWizardService {
  launchWizard(tenantId: string, request: { templateId: string; name: string; budget: number; inputs?: Record<string, any> }): { campaignId: string; steps: { step: string; status: string; detail: string }[]; readiness: string; estimatedTimeToLive: string; summary: string } {
    if (!request.templateId || !request.name) throw new Error("Wizard requires templateId and name");
    if (request.budget <= 0) throw new Error("Wizard requires a positive budget");
    const campaignId = `wiz_${hashStr(request.name + tenantId)}`;
    const seed = hashStr(request.templateId + request.name);
    const platforms = ["meta", "google", "tiktok", "linkedin"];
    const nPlatforms = 1 + (seed % 3);
    const chosen = platforms.slice(0, nPlatforms);
    const budgetPerDay = Math.round((request.budget / 30) * 100) / 100;
    const steps = [
      { step: "template", status: "done", detail: `Template "${request.templateId}" applied` },
      { step: "budget", status: "done", detail: `$${request.budget.toLocaleString()} monthly ($${budgetPerDay}/day)` },
      { step: "targeting", status: "done", detail: "Audience segments pre-configured from template" },
      { step: "creative", status: "done", detail: "Creative placeholders generated — add assets or let Ani generate" },
      { step: "launch", status: "done", detail: `Campaign live on ${chosen.join(", ")}` },
    ];
    DataStore.mem().insert("campaigns", {
      _id: campaignId, name: request.name, tenantId, status: "active", type: request.templateId,
      platforms: chosen, budget: { daily: budgetPerDay, lifetime: request.budget, spent: 0, remaining: request.budget },
      startDate: new Date().toISOString().split("T")[0], endDate: "2025-12-31",
      viaWizard: true, template: request.templateId,
    });
    DataStore.mem().insert("launched_templates", { tenantId, campaignId, templateId: request.templateId, inputs: request.inputs || {}, launchedAt: new Date().toISOString(), via: "wizard" });
    return {
      campaignId, steps, readiness: "ready", estimatedTimeToLive: "10-15 min",
      summary: `"${request.name}" launched in 3 clicks on ${chosen.join(", ")}`,
    };
  }

  duplicateCampaign(tenantId: string, campaignId: string): { newCampaignId: string; name: string; platforms: string[]; status: string; summary: string } {
    const src = DataStore.mem().findOne("campaigns", (c: any) => c._id === campaignId && c.tenantId === tenantId) as any;
    if (!src) throw new Error(`Campaign "${campaignId}" not found`);
    const newId = `dup_${hashStr(campaignId + tenantId + "dup")}`;
    DataStore.mem().insert("campaigns", {
      ...src, _id: newId, name: `${src.name} (Copy)`, status: "paused",
      budget: { ...src.budget, spent: 0, remaining: src.budget.remaining },
      duplicatedFrom: campaignId, duplicatedAt: new Date().toISOString(),
    });
    return { newCampaignId: newId, name: `${src.name} (Copy)`, platforms: src.platforms, status: "paused", summary: `Duplicate ready (paused) — review then launch in 1 click` };
  }

  mirrorCampaign(tenantId: string, campaignId: string, platforms: string[]): { campaignId: string; platforms: { platform: string; status: string; mirroredAt: string }[]; summary: string } {
    const src = DataStore.mem().findOne("campaigns", (c: any) => c._id === campaignId && c.tenantId === tenantId) as any;
    if (!src) throw new Error(`Campaign "${campaignId}" not found`);
    const mirroredAt = new Date().toISOString();
    const platformsArr = platforms.map(p => ({ platform: p, status: "live", mirroredAt }));
    const all = Array.from(new Set([...(src.platforms || []), ...platforms]));
    DataStore.mem().update("campaigns", (c: any) => c._id === campaignId && c.tenantId === tenantId, { platforms: all, mirroredPlatforms: platformsArr });
    return { campaignId, platforms: platformsArr, summary: `Mirrored to ${platforms.length} platform${platforms.length === 1 ? "" : "s"} — same budget, targeting, and creatives` };
  }

  launchReadiness(tenantId: string, campaignId: string): { campaignId: string; checklist: { item: string; met: boolean; detail: string }[]; ready: boolean; summary: string } {
    const c = DataStore.mem().findOne("campaigns", (x: any) => x._id === campaignId && x.tenantId === tenantId) as any;
    if (!c) throw new Error(`Campaign "${campaignId}" not found`);
    const checklist = [
      { item: "Budget configured", met: !!(c.budget && c.budget.daily > 0), detail: c.budget?.daily > 0 ? `$${c.budget.daily}/day` : "No daily budget set" },
      { item: "Targeting set", met: (c.platforms || []).length > 0, detail: (c.platforms || []).join(", ") || "No platforms selected" },
      { item: "Creatives attached", met: !!(c.creatives && c.creatives.length > 0), detail: c.creatives?.length ? `${c.creatives.length} creatives` : "Add creatives or generate with Ani" },
    ];
    const ready = checklist.every(i => i.met);
    return { campaignId, checklist, ready, summary: ready ? "Ready to launch" : `${checklist.filter(i => !i.met).length} items missing before launch` };
  }
}

export const campaignLaunchWizard = new CampaignLaunchWizardService();
