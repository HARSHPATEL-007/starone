import { DataStore } from "./DataStore";

export interface CampaignTemplate {
  templateId: string;
  name: string;
  description: string;
  requiredInputs: { key: string; label: string; type: string }[];
  config: {
    objective: string;
    platforms: string[];
    audience: { type: string; description: string }[];
    budget: { pacing: string; allocation: string };
    bidding: { strategy: string; note: string };
    creative: { sizes: string[]; count: number };
    schedule: string;
    automation: string[];
  };
  timeToLive: string;
}

const TEMPLATES: CampaignTemplate[] = [
  {
    templateId: "black_friday",
    name: "Black Friday",
    description: "Flash-sale campaign with aggressive pacing, countdown creative, and remarketing stack",
    requiredInputs: [
      { key: "budget", label: "Total budget", type: "number" },
      { key: "creativeAssets", label: "Creative assets", type: "files" },
    ],
    config: {
      objective: "CONVERSIONS",
      platforms: ["meta", "google", "tiktok"],
      audience: [
        { type: "remarketing", description: "Past buyers + cart abandoners (30d)" },
        { type: "lookalike", description: "1% lookalike of high-LTV buyers" },
        { type: "broad", description: "Deal-seekers (interest targeting)" },
      ],
      budget: { pacing: "front-loaded 60/40 first 2 days", allocation: "Meta 40%, Google 40%, TikTok 20%" },
      bidding: { strategy: "maximize_conversions", note: "CPA floor guardrail at 1.5x historical" },
      creative: { sizes: ["1080x1080", "1080x1920", "1200x628"], count: 5 },
      schedule: "7 days with hour-of-day escalation on peak windows",
      automation: ["urgency countdown rotation", "daily budget reallocation", "auto-pause on ROAS < 1.0x"],
    },
    timeToLive: "10 min",
  },
  {
    templateId: "product_launch",
    name: "Product Launch",
    description: "Pre-launch tease → launch burst → nurture sequence",
    requiredInputs: [
      { key: "productUrl", label: "Product URL", type: "text" },
      { key: "launchDate", label: "Launch date", type: "date" },
      { key: "budget", label: "Total budget", type: "number" },
    ],
    config: {
      objective: "AWARENESS → CONVERSIONS",
      platforms: ["meta", "google", "tiktok", "linkedin"],
      audience: [
        { type: "tease", description: "Warm lookalike + engaged followers (pre-launch)" },
        { type: "launch", description: "All audience stack (launch week)" },
        { type: "nurture", description: "Engaged non-buyers (post-launch)" },
      ],
      budget: { pacing: "20% tease / 60% launch week / 20% nurture", allocation: "Meta 35%, Google 35%, TikTok 20%, LinkedIn 10%" },
      bidding: { strategy: "phased: tROAS tease → maximize_conversions launch", note: "Auto-switch on launch date" },
      creative: { sizes: ["1080x1080", "1080x1920", "1200x628", "720x720"], count: 6 },
      schedule: "Tease 7d before launch, 7d launch burst, 14d nurture",
      automation: ["phase switch on launch date", "waitlist retargeting", "press moment boosting"],
    },
    timeToLive: "15 min",
  },
  {
    templateId: "cart_abandonment",
    name: "Cart Abandonment",
    description: "Dynamic creative retargeting with discount logic and win-back windows",
    requiredInputs: [
      { key: "discount", label: "Discount %", type: "number" },
      { key: "duration", label: "Campaign duration", type: "number" },
    ],
    config: {
      objective: "CONVERSIONS",
      platforms: ["meta", "google"],
      audience: [
        { type: "cart_abandoners", description: "Added to cart, did not buy (14d)" },
        { type: "checkout_abandoners", description: "Started checkout, did not complete (7d)" },
      ],
      budget: { pacing: "steady with evening boost", allocation: "Meta 60%, Google 40%" },
      bidding: { strategy: "maximize_conversion_value", note: "Dynamic discount message in creative" },
      creative: { sizes: ["1080x1080", "1080x1920", "1200x628"], count: 3 },
      schedule: "Always-on while duration active",
      automation: ["dynamic discount personalization", "win-back at 24h/72h", "frequency cap 4/week"],
    },
    timeToLive: "5 min",
  },
  {
    templateId: "brand_awareness",
    name: "Brand Awareness",
    description: "Reach optimization with frequency capping and viewability targets",
    requiredInputs: [
      { key: "budget", label: "Total budget", type: "number" },
      { key: "creativeAssets", label: "Creative assets", type: "files" },
    ],
    config: {
      objective: "REACH",
      platforms: ["meta", "youtube", "tiktok", "linkedin"],
      audience: [
        { type: "broad", description: "Category interests + lookalikes of engagers" },
      ],
      budget: { pacing: "steady daily, 60% video / 40% display", allocation: "Meta 30%, YouTube 40%, TikTok 20%, LinkedIn 10%" },
      bidding: { strategy: "maximize_reach", note: "Frequency cap 3-4/week, viewability target 70%" },
      creative: { sizes: ["16x9 video", "9x16 video", "1080x1080", "1200x628"], count: 4 },
      schedule: "Always-on, quarterly refresh",
      automation: ["frequency capping", "viewability optimization", "creative rotation on decay"],
    },
    timeToLive: "10 min",
  },
  {
    templateId: "lead_generation",
    name: "Lead Generation",
    description: "Form ads with CRM sync, lead scoring, and nurture triggers",
    requiredInputs: [
      { key: "offer", label: "Offer", type: "text" },
      { key: "formFields", label: "Form fields", type: "list" },
      { key: "budget", label: "Total budget", type: "number" },
    ],
    config: {
      objective: "LEAD_GENERATION",
      platforms: ["meta", "linkedin", "google"],
      audience: [
        { type: "cold", description: "Job-title + industry targeting" },
        { type: "warm", description: "Website visitors (90d) not yet leads" },
        { type: "lookalike", description: "1-2% lookalike of existing customers" },
      ],
      budget: { pacing: "steady with lead-volume thresholds", allocation: "Meta 40%, LinkedIn 40%, Google 20%" },
      bidding: { strategy: "maximize_leads", note: "Lead quality guardrail: auto-pause segments with LTV score < 0.3" },
      creative: { sizes: ["1080x1080", "1200x628", "1.91:1 video"], count: 3 },
      schedule: "Always-on",
      automation: ["CRM sync on form fill", "lead scoring + routing", "nurture drip trigger"],
    },
    timeToLive: "10 min",
  },
  {
    templateId: "app_install",
    name: "App Install",
    description: "App store optimization, event tracking, and cohort analysis",
    requiredInputs: [
      { key: "appUrl", label: "App URL", type: "text" },
      { key: "targetCpi", label: "Target CPI", type: "number" },
      { key: "budget", label: "Total budget", type: "number" },
    ],
    config: {
      objective: "APP_INSTALLS",
      platforms: ["meta", "google", "tiktok"],
      audience: [
        { type: "broad", description: "App category interests + competitor app users" },
        { type: "retargeting", description: "Engaged non-installers (30d)" },
      ],
      budget: { pacing: "steady with CPI guardrail", allocation: "Meta 45%, Google 35%, TikTok 20%" },
      billing: { strategy: "maximize_installs", note: `CPI guardrail at ${"target"} — auto-pause placements above` },
      creative: { sizes: ["9x16 video", "1080x1920", "1080x1080"], count: 4 },
      schedule: "Always-on",
      automation: ["install event tracking", "cohort analysis weekly", "auto-pause high-CPI placements"],
    },
    timeToLive: "10 min",
  },
];

export class CampaignTemplateService {
  listTemplates(): { templates: { templateId: string; name: string; description: string; timeToLive: string; requiredInputs: number }[]; total: number } {
    return {
      templates: TEMPLATES.map(t => ({ templateId: t.templateId, name: t.name, description: t.description, timeToLive: t.timeToLive, requiredInputs: t.requiredInputs.length })),
      total: TEMPLATES.length,
    };
  }

  getTemplate(templateId: string): { template: CampaignTemplate | null } {
    const template = TEMPLATES.find(t => t.templateId === templateId) || null;
    return { template };
  }

  instantiateTemplate(templateId: string, inputs: Record<string, any>): { templateId: string; name: string; campaign: { name: string; objective: string; platforms: string[]; audience: { type: string; description: string }[]; budget: { pacing: string; allocation: string; total: number }; bidding: { strategy: string; note: string }; creative: { sizes: string[]; count: number }; schedule: string; automation: string[] }; missingInputs: string[]; ready: boolean } {
    const template = TEMPLATES.find(t => t.templateId === templateId);
    if (!template) throw new Error(`Template "${templateId}" not found`);
    const missingInputs = template.requiredInputs.filter(r => !inputs || inputs[r.key] === undefined || inputs[r.key] === "").map(r => r.key);
    const total = Number(inputs?.budget) || 0;
    return {
      templateId: template.templateId,
      name: template.name,
      campaign: {
        name: `${template.name} ${new Date().toISOString().split("T")[0]}`,
        objective: template.config.objective,
        platforms: template.config.platforms,
        audience: template.config.audience,
        budget: { ...template.config.budget, total },
        bidding: template.config.bidding,
        creative: template.config.creative,
        schedule: template.config.schedule,
        automation: template.config.automation,
      },
      missingInputs,
      ready: missingInputs.length === 0,
    };
  }

  launchTemplate(tenantId: string, templateId: string, inputs: Record<string, any>): { templateId: string; campaignId: string; campaignName: string; status: string; launchedAt: string; summary: string } {
    const instantiated = this.instantiateTemplate(templateId, inputs);
    if (!instantiated.ready) throw new Error(`Template "${templateId}" is missing required inputs: ${instantiated.missingInputs.join(", ")}`);
    const campaignId = `tmpl_${templateId}_${Date.now()}`;
    const launchedAt = new Date().toISOString();
    DataStore.mem().insert("campaigns", {
      _id: campaignId, tenantId,
      name: instantiated.campaign.name,
      status: "active",
      type: templateId,
      platforms: instantiated.campaign.platforms,
      budget: { daily: Math.round(instantiated.campaign.budget.total / 30 * 100) / 100, lifetime: instantiated.campaign.budget.total, spent: 0, remaining: instantiated.campaign.budget.total },
      startDate: launchedAt.split("T")[0],
      template: templateId,
      templateConfig: instantiated.campaign,
    });
    DataStore.mem().insert("launched_templates", { tenantId, campaignId, templateId, inputs, launchedAt });
    return {
      templateId, campaignId, campaignName: instantiated.campaign.name,
      status: "live", launchedAt,
      summary: `${instantiated.campaign.name} launched with ${instantiated.campaign.platforms.length} platforms and ${instantiated.campaign.automation.length} automations`,
    };
  }

  getLaunchHistory(tenantId: string): { launches: any[]; totals: { total: number; summary: string } } {
    const launches = DataStore.mem().find("launched_templates", (l: any) => l.tenantId === tenantId) as any[];
    return { launches: launches.slice().reverse(), totals: { total: launches.length, summary: `${launches.length} template launches` } };
  }
}

export const campaignTemplateService = new CampaignTemplateService();
