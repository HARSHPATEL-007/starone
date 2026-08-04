import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export const BRAND_PRESETS: any[] = [
  { id: "ocean", name: "Ocean", primary: "#0ea5e9", accent: "#0f172a", font: "Inter", demo: { nav: "N0VA Mail", loginTitle: "Secure enterprise mail" } },
  { id: "ember", name: "Ember", primary: "#f97316", accent: "#1c1917", font: "Manrope", demo: { nav: "Horizon Mail", loginTitle: "Reliable business messaging" } },
  { id: "violet", name: "Violet", primary: "#8b5cf6", accent: "#2e1065", font: "Sora", demo: { nav: "Vero Mail", loginTitle: "AI-first communication" } },
];

export const BRAND_FEATURES: any[] = [
  { id: "nav_name", name: "Custom product name", tiers: ["standard", "pro", "business", "custom"] },
  { id: "logo", name: "Custom logo upload", tiers: ["standard", "pro", "business", "custom"] },
  { id: "color_preset", name: "Pre-set color themes", tiers: ["standard", "pro", "business", "custom"] },
  { id: "custom_colors", name: "Custom brand colors", tiers: ["pro", "business", "custom"] },
  { id: "login_branding", name: "White-labeled login page", tiers: ["pro", "business", "custom"] },
  { id: "dark_mode", name: "Dark mode support", tiers: ["business", "custom"] },
  { id: "custom_css", name: "Custom CSS injection", tiers: ["business", "custom"] },
  { id: "custom_domain", name: "Custom mail domain in-app", tiers: ["business", "custom"] },
  { id: "custom_emails", name: "Custom notification email domain", tiers: ["business", "custom"] },
  { id: "remove_branding", name: "Remove N0VA references", tiers: ["custom"] },
  { id: "sso_saml", name: "SSO / SAML branding", tiers: ["custom"] },
];

export const DEPLOYMENT_MODELS: any[] = [
  { id: "shared", name: "Shared Infrastructure", description: "Multi-tenant core engine, AI models and security stack shared with cost pooling", pricing: "6-20 USD/user/mo", slaGuarantee: "99.9%", isolation: "logical" },
  { id: "dedicated", name: "Dedicated Instance", description: "Single-tenant isolated Kubernetes cluster per tenant with reserved capacity", pricing: "50k USD/mo base", slaGuarantee: "99.99%", isolation: "cluster" },
  { id: "on_prem", name: "On-Premises / Air-Gapped", description: "Fully air-gapped deployment inside customer VPC with no external data paths", pricing: "500k USD/yr", slaGuarantee: "99.995%", isolation: "physical" },
  { id: "hybrid", name: "Hybrid (Edge + Cloud)", description: "Edge cache tier for low-latency access with cloud orchestration and sync", pricing: "custom", slaGuarantee: "99.95%", isolation: "hybrid" },
];

export class MailWhiteLabelService {
  private brandingRecord(tenantId: string): any {
    const existing = DataStore.mem().findOne("mail_branding", (b: any) => b.tenantId === tenantId);
    if (existing) return existing;
    const preset = BRAND_PRESETS[0];
    const created = DataStore.mem().insert("mail_branding", {
      tenantId,
      navName: "N0VA Mail",
      colorPreset: preset.id,
      primary: preset.primary,
      accent: preset.accent,
      font: preset.font,
      logoUrl: null,
      darkMode: false,
      customCss: null,
      customMailDomain: null,
      customEmailDomain: null,
      removeBranding: false,
      ssoEnabled: false,
      planLevel: 1,
      updatedAt: new Date().toISOString(),
    });
    return created;
  }

  brandPresets() {
    return { presets: BRAND_PRESETS, features: BRAND_FEATURES, count: BRAND_PRESETS.length, summary: `${BRAND_PRESETS.length} brand presets, ${BRAND_FEATURES.length} white-label features` };
  }

  getBranding(tenantId: string) {
    const b = this.brandingRecord(tenantId);
    return {
      navName: b.navName,
      colorPreset: b.colorPreset,
      primary: b.primary,
      accent: b.accent,
      font: b.font,
      logoUrl: b.logoUrl,
      darkMode: b.darkMode,
      customCss: b.customCss,
      customMailDomain: b.customMailDomain,
      customEmailDomain: b.customEmailDomain,
      removeBranding: b.removeBranding,
      ssoEnabled: b.ssoEnabled,
      availableFeatures: this.availableFeatures(tenantId),
      summary: `Brand "${b.navName}" (${b.colorPreset} preset)`,
    };
  }

  updateBranding(tenantId: string, patch: any) {
    const b = this.brandingRecord(tenantId);
    const planLevel = this.planLevel(tenantId);
    const next: any = { navName: b.navName, colorPreset: b.colorPreset, primary: b.primary, accent: b.accent, font: b.font, logoUrl: b.logoUrl, darkMode: b.darkMode, customCss: b.customCss, customMailDomain: b.customMailDomain, customEmailDomain: b.customEmailDomain, removeBranding: b.removeBranding, ssoEnabled: b.ssoEnabled };
    if (patch && patch.navName !== undefined) next.navName = String(patch.navName);
    if (patch && patch.colorPreset !== undefined) {
      const preset = BRAND_PRESETS.find((p: any) => p.id === patch.colorPreset);
      if (!preset) throw new Error(`Unknown brand preset "${patch.colorPreset}"`);
      next.colorPreset = preset.id;
      next.primary = preset.primary;
      next.accent = preset.accent;
      next.font = preset.font;
    }
    if (patch && patch.primary !== undefined) {
      if (planLevel < 2) throw new Error("Custom colors require Pro plan or higher");
      next.primary = String(patch.primary);
    }
    if (patch && patch.accent !== undefined) {
      if (planLevel < 2) throw new Error("Custom colors require Pro plan or higher");
      next.accent = String(patch.accent);
    }
    if (patch && patch.logoUrl !== undefined) next.logoUrl = String(patch.logoUrl);
    if (patch && patch.darkMode !== undefined) {
      if (planLevel < 3) throw new Error("Dark mode requires Business plan or higher");
      next.darkMode = !!patch.darkMode;
    }
    if (patch && patch.customCss !== undefined) {
      if (planLevel < 3) throw new Error("Custom CSS requires Business plan or higher");
      next.customCss = String(patch.customCss);
    }
    if (patch && patch.customMailDomain !== undefined) next.customMailDomain = patch.customMailDomain;
    if (patch && patch.customEmailDomain !== undefined) next.customEmailDomain = patch.customEmailDomain;
    next.planLevel = planLevel;
    next.updatedAt = new Date().toISOString();
    DataStore.mem().update("mail_branding", (x: any) => x._id === b._id, next);
    this.log(tenantId, "branding_updated", `Brand updated - ${next.navName} (${next.colorPreset} preset)`);
    return { ...this.getBranding(tenantId), summary: `Brand updated - ${next.navName} (${next.colorPreset} preset)` };
  }

  deploymentModels() {
    return { models: DEPLOYMENT_MODELS, count: DEPLOYMENT_MODELS.length, summary: `${DEPLOYMENT_MODELS.length} white-label deployment model(s)` };
  }

  selectDeployment(tenantId: string, modelId: string) {
    const model = DEPLOYMENT_MODELS.find((m) => m.id === modelId);
    if (!model) throw new Error(`Unknown deployment model "${modelId}"`);
    const b = this.brandingRecord(tenantId);
    DataStore.mem().update("mail_branding", (x: any) => x._id === b._id, { deploymentModel: model.id, updatedAt: new Date().toISOString() });
    this.log(tenantId, "deployment_selected", `${model.name} deployment selected`); 
    return { deploymentModel: model.id, ...model, summary: `${model.name} deployment selected - ${model.pricing}` };
  }

  deploymentStatus(tenantId: string) {
    const b = this.brandingRecord(tenantId);
    const model = DEPLOYMENT_MODELS.find((m: any) => m.id === b.deploymentModel) || DEPLOYMENT_MODELS[0];
    return {
      deploymentModel: model.id,
      modelName: model.name,
      isolation: model.isolation,
      slaGuarantee: model.slaGuarantee,
      regions: new Set(["us", "eu", "uk"]).size,
      status: model.id === "on_prem" ? "air_gapped" : "operational",
      summary: `${model.name} deployment - ${model.isolation} isolation, ${model.slaGuarantee} SLA`,
    };
  }

  customSla(tenantId: string) {
    const b = this.brandingRecord(tenantId);
    return { slaPct: b.slaPct || 99.9, slaString: `${b.slaPct || 99.9}%`, summary: `Custom SLA at ${b.slaPct || 99.9}%` };
  }

  setCustomSla(tenantId: string, slaPct: number, penalty?: number) {
    const planLevel = this.planLevel(tenantId);
    if (planLevel < 3) throw new Error("Custom SLA requires Business plan or higher");
    const value = parseFloat(String(slaPct));
    if (isNaN(value) || value < 99 || value > 99.99999) throw new Error("SLA must be between 99 and 99.99999");
    const b = this.brandingRecord(tenantId);
    DataStore.mem().update("mail_branding", (x: any) => x._id === b._id, { slaPct: value, slaPenalty: penalty !== undefined ? Number(penalty) : 0.05, updatedAt: new Date().toISOString() });
    this.log(tenantId, "sla_set", `Custom SLA set to ${value}%`);
    return { slaPct: value, slaString: `${value}%`, penalty: penalty !== undefined ? Number(penalty) : 0.05, summary: `Custom SLA set to ${value}%` };
  }

  candidateDomains(tenantId: string) {
    const domains = DataStore.mem().find("mail_domains", (d: any) => d.tenantId === tenantId && d.status === "verified");
    return { domains: domains.map((d: any) => ({ domainId: d._id, name: d.domain || d.name, recordsVerified: 6 })), count: domains.length, summary: `${domains.length} verified domain(s) available for outbound binding` };
  }

  bindOutboundDomain(tenantId: string, domainId: string) {
    const domain = DataStore.mem().findOne("mail_domains", (d: any) => d._id === domainId && d.tenantId === tenantId && d.status === "verified");
    if (!domain) throw new Error(`Verified domain "${domainId}" not found`);
    const b = this.brandingRecord(tenantId);
    DataStore.mem().update("mail_branding", (x: any) => x._id === b._id, { customMailDomain: domain.domain || domain.name, updatedAt: new Date().toISOString() });
    this.log(tenantId, "domain_bound", `Outbound domain bound: ${domain.domain || domain.name}`);
    return { domainId, domain: domain.domain || domain.name, summary: `Outbound mail now branded from ${domain.domain || domain.name}` };
  }

  private planLevel(tenantId: string): number {
    const mailbox = DataStore.mem().findOne("mailboxes", (m: any) => m.tenantId === tenantId);
    const plan = String((mailbox && mailbox.plan) || "free").toLowerCase();
    const map: any = { free: 1, pro: 2, business: 3, n0va1o: 4 };
    return map[plan] || 1;
  }

  private availableFeatures(tenantId: string): string[] {
    const level = this.planLevel(tenantId);
    const tiers = ["", "standard", "pro", "business", "custom"];
    const available: string[] = [];
    for (const f of BRAND_FEATURES) if (tiers.indexOf(f.tiers[0]) <= level) available.push(f.id);
    return available;
  }

  whiteLabelStatus(tenantId: string) {
    const level = this.planLevel(tenantId);
    return {
      planAntecedent: level,
      planName: level === 4 ? "N0VA1O" : level === 3 ? "Business" : level === 2 ? "Pro" : "Free",
      branding: this.getBranding(tenantId),
      availableFeatures: this.availableFeatures(tenantId),
      featureCount: this.availableFeatures(tenantId).length,
      deployment: this.deploymentStatus(tenantId),
      sla: this.customSla(tenantId),
      suggestion: level < 4 ? "Upgrade to Enterprise for full white-label including remove-branding" : "White-label is fully unlocked",
      summary: `White-label on ${level === 4 ? "N0VA1O" : level === 3 ? "Business" : level === 2 ? "Pro" : "Free"} plan - ${this.availableFeatures(tenantId).length} feature(s) available`,
    };
  }

  whiteLabelLog(tenantId: string, limit = 20) {
    const n = Math.max(1, parseInt(String(limit), 10));
    const entries = DataStore.mem().find("mail_white_label_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, n)
      .map((l: any) => ({ entryId: l._id, category: l.category, detail: l.detail, at: l.at }));
    return { entries, count: entries.length, summary: `${entries.length} white-label event(s)` };
  }

  whiteLabelDashboard(tenantId: string) {
    const status = this.whiteLabelStatus(tenantId);
    const branding = this.getBranding(tenantId);
    const log = this.whiteLabelLog(tenantId, 10);
    return {
      ...status,
      presets: BRAND_PRESETS,
      models: DEPLOYMENT_MODELS,
      recentLog: log.entries,
      demos: BRAND_PRESETS.map((p: any) => ({ id: p.id, name: p.name, nav: p.demo.nav, loginTitle: p.demo.loginTitle })),
      generatedAt: new Date().toISOString(),
      summary: `Brand "${branding.navName}" - ${status.deployment.modelName} deployment`,
    };
  }

  private log(tenantId: string, category: string, detail: string) {
    DataStore.mem().insert("mail_white_label_log", { tenantId, category, detail, at: new Date().toISOString() });
  }
}

export const mailWhiteLabel = new MailWhiteLabelService();