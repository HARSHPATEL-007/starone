import { Router, Request, Response, NextFunction } from "express";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const pricingTiers = [
  {
    tier: "starter",
    name: "Starter",
    price: 15,
    unit: "user/month",
    minUsers: 1,
    maxUsers: 25,
    features: ["3 platform connections", "5 active campaigns", "Basic analytics", "Community support", "1GB creative storage"],
    n0va1oApiCalls: "100/day",
    highlighted: false,
  },
  {
    tier: "growth",
    name: "Growth",
    price: 35,
    unit: "user/month",
    minUsers: 25,
    maxUsers: 250,
    features: ["10 platform connections", "Unlimited campaigns", "Full analytics", "Ani assistant (5K queries/day)", "Standard support (1h response)", "50GB creative storage", "A/B testing"],
    n0va1oApiCalls: "10K/day",
    highlighted: true,
  },
  {
    tier: "pro",
    name: "Pro",
    price: 65,
    unit: "user/month",
    minUsers: 250,
    maxUsers: 10000,
    features: ["All platforms", "Unlimited spend", "Advanced attribution", "Custom AI models", "24/7 dedicated support (15min response)", "500GB creative storage", "DCO", "Competitive intelligence", "Fraud prevention"],
    n0va1oApiCalls: "100K/day",
    highlighted: false,
  },
  {
    tier: "enterprise",
    name: "Enterprise",
    price: 95,
    unit: "user/month",
    minUsers: 10000,
    features: ["Everything in Pro", "Custom integrations", "Dedicated infrastructure", "White-label reporting", "On-site engineer", "Custom SLA", "2TB creative storage"],
    n0va1oApiCalls: "1M/day",
    highlighted: false,
  },
  {
    tier: "transcendent",
    name: "Transcendent",
    price: 400000,
    unit: "month (min)",
    minUsers: 0,
    features: ["Sovereign deployment", "Quantum-safe crypto", "Orbital edge nodes", "Custom AI training", "Dedicated GPU cluster", "Red team as a service", "Unlimited storage"],
    n0va1oApiCalls: "Unlimited with dedicated gateway",
    highlighted: false,
    custom: true,
  },
];

const bundleDiscounts = [
  { modules: "1-3", discount: 0, bonus: "Standard N0VA1O" },
  { modules: "4-6", discount: 15, bonus: "+50% N0VA1O API calls" },
  { modules: "7-10", discount: 20, bonus: "+100% N0VA1O API calls" },
  { modules: "11-15", discount: 25, bonus: "+200% N0VA1O API calls" },
  { modules: "16-20", discount: 30, bonus: "+500% N0VA1O API calls" },
  { modules: "21+", discount: 35, bonus: "Unlimited N0VA1O" },
];

const addOns = [
  { name: "Extra N0VA1O API Calls", description: "+100K API calls/day", price: 200 },
  { name: "Extra Platform Connections", description: "+5 platform connections", price: 50 },
  { name: "N0VA1O Recipe Compilation", description: "Turn Ani workflows into deterministic APIs", price: 500 },
  { name: "N0VA1O Multi-Account Pack", description: "+50 connected accounts", price: 300 },
  { name: "Advanced Attribution", description: "MMM + incrementality testing", price: 2000 },
  { name: "Competitive Intelligence", description: "+50 competitors tracked", price: 500 },
  { name: "Fraud Prevention Suite", description: "Advanced IVT + brand safety", price: 800 },
  { name: "Creative AI Generation", description: "+500 AI-generated creatives/month", price: 400 },
  { name: "Dedicated Support", description: "Priority phone + TAM", price: 5000 },
];

const tenantSettingsTemplate = {
  timezone: "UTC",
  currency: "USD",
  dateFormat: "YYYY-MM-DD",
  weekStartDay: "monday",
  attributionModel: "data_driven",
  attributionWindow: 30,
  defaultCpcCap: 5.0,
  budgetAlertThreshold: 80,
  autoPauseOnFraud: true,
  brandSafetyMinScore: 70,
  creativeFatigueThreshold: 20,
  notifications: {
    email: true,
    slack: false,
    webhook: false,
    inApp: true,
    fraudAlerts: true,
    budgetAlerts: true,
    campaignStatus: true,
    dailyDigest: true,
  },
  agentConfig: {
    budgetAgentEnabled: true,
    creativeAgentEnabled: true,
    audienceAgentEnabled: true,
    bidAgentEnabled: true,
    fraudAgentEnabled: true,
    maxBudgetShiftPercent: 30,
    hitlThreshold: 10000,
  },
};

router.get(
  "/pricing",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ tiers: pricingTiers, bundleDiscounts, addOns });
  })
);

router.get(
  "/tenant",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json(tenantSettingsTemplate);
  })
);

router.put(
  "/tenant",
  asyncHandler(async (req: Request, res: Response) => {
    const updates = req.body;
    Object.assign(tenantSettingsTemplate, updates);
    res.json(tenantSettingsTemplate);
  })
);

router.get(
  "/modules",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({
      total: 28,
      modules: [
        "Core Platform", "Identity", "Chat", "Calendar", "Contacts", "Drawings",
        "Mail", "Docs", "Sheets", "Meet", "Tasks", "CRM", "ERP", "Finance",
        "Ads & Marketing", "Ani", "N0VA1O", "Vault", "Sites", "Pics",
        "Cloud Storage", "Command Center", "Forms", "Sign", "Workflows",
        "Analytics", "Security Suite", "Voice",
      ],
    });
  })
);

export default router;
