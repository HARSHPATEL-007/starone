import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";
import { campaignHealthOrchestrator } from "../business-logic/CampaignHealthOrchestrator";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const HEALTH_BASELINES = { roas: 2.0, ctr: 0.02, cvr: 0.03 };
const WEIGHTS = { budget: 0.25, performance: 0.35, efficiency: 0.20, engagement: 0.20 };

function computeHealthScore(campaign: any, metrics: any[]): { score: number; dimensions: Record<string, number>; issues: string[] } {
  const totalBudget = campaign.budget?.lifetime || 0;
  const spent = campaign.budget?.spent || 0;
  const remaining = campaign.budget?.remaining || (totalBudget - spent);
  const totalImpressions = metrics.reduce((s, m) => s + (m.impressions || 0), 0);
  const totalClicks = metrics.reduce((s, m) => s + (m.clicks || 0), 0);
  const totalConversions = metrics.reduce((s, m) => s + (m.conversions || 0), 0);
  const totalSpend = metrics.reduce((s, m) => s + (m.spend || 0), 0);
  const totalRevenue = metrics.reduce((s, m) => s + (m.revenue || 0), 0);
  const budgetScore = totalBudget > 0 ? Math.min(100, (remaining / totalBudget) * 100) : 50;
  const currentRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const performanceScore = Math.min(100, (currentRoas / HEALTH_BASELINES.roas) * 100);
  const currentCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const efficiencyScore = Math.min(100, (currentCtr / HEALTH_BASELINES.ctr) * 100);
  const currentCvr = totalClicks > 0 ? totalConversions / totalClicks : 0;
  const engagementScore = Math.min(100, (currentCvr / HEALTH_BASELINES.cvr) * 100);
  const score = Math.round(budgetScore * WEIGHTS.budget + performanceScore * WEIGHTS.performance + efficiencyScore * WEIGHTS.efficiency + engagementScore * WEIGHTS.engagement);
  const issues: string[] = [];
  if (budgetScore < 30) issues.push("Budget nearly exhausted");
  if (performanceScore < 40) issues.push(`ROAS (${currentRoas.toFixed(2)}) below ${HEALTH_BASELINES.roas}x target`);
  if (efficiencyScore < 40) issues.push(`CTR (${(currentCtr * 100).toFixed(2)}%) below ${(HEALTH_BASELINES.ctr * 100).toFixed(2)}% baseline`);
  if (engagementScore < 40) issues.push(`CVR (${(currentCvr * 100).toFixed(2)}%) below ${(HEALTH_BASELINES.cvr * 100).toFixed(2)}% baseline`);
  if (!campaign.status || campaign.status === "draft") issues.push("Campaign not active");
  if (totalImpressions === 0) issues.push("No impressions recorded");
  return { score, dimensions: { budget: Math.round(budgetScore), performance: Math.round(performanceScore), efficiency: Math.round(efficiencyScore), engagement: Math.round(engagementScore) }, issues };
}

function categorize(score: number): "healthy" | "warning" | "critical" {
  if (score >= 80) return "healthy";
  if (score >= 50) return "warning";
  return "critical";
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const result = await DataStore.findCampaigns({ tenantId });
    const campaigns = result.campaigns;
    const healthReports: any[] = [];
    for (const c of campaigns) {
      const metrics = await DataStore.findMetrics({ campaignId: c._id, tenantId });
      const { score, dimensions, issues } = computeHealthScore(c, metrics);
      healthReports.push({ campaignId: c._id, campaignName: c.name, score, status: categorize(score), dimensions, issues });
    }
    const avgScore = healthReports.length > 0 ? Math.round(healthReports.reduce((s: number, h: any) => s + h.score, 0) / healthReports.length * 100) / 100 : 0;
    sendSuccess(res, healthReports, { count: healthReports.length, averageScore: avgScore });
  })
);

router.get(
  "/trends",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const result = await DataStore.findCampaigns({ tenantId });
    const campaigns = result.campaigns;
    const healthReports: any[] = [];
    const allIssues: string[] = [];
    let totalScore = 0;
    const counts = { healthy: 0, warning: 0, critical: 0 };
    for (const c of campaigns) {
      const metrics = await DataStore.findMetrics({ campaignId: c._id, tenantId });
      const { score, dimensions, issues } = computeHealthScore(c, metrics);
      const status = categorize(score);
      totalScore += score;
      counts[status]++;
      allIssues.push(...issues);
      healthReports.push({ campaignId: c._id, campaignName: c.name, score, status, dimensions, issues });
    }
    const n = campaigns.length || 1;
    const issueFrequency: Record<string, number> = {};
    for (const issue of allIssues) issueFrequency[issue] = (issueFrequency[issue] || 0) + 1;
    const topIssues = Object.entries(issueFrequency).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([issue, count]) => ({ issue, count }));
    sendSuccess(res, { averageScore: parseFloat((totalScore / n).toFixed(1)), counts, totalCampaigns: campaigns.length, topIssues, campaigns: healthReports });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const campaign = await DataStore.findCampaignById(id, tenantId);
    if (!campaign) throw new AppError(404, "Campaign not found");
    const metrics = await DataStore.findMetrics({ campaignId: id, tenantId });
    const { score, dimensions, issues } = computeHealthScore(campaign, metrics);
    const dailyMetrics = await DataStore.findDailyMetrics(tenantId, 30);
    const campaignDaily = dailyMetrics.filter((d: any) => String(d.campaignId) === id).slice(-12);
    let trend: { date: string; score: number }[];
    if (campaignDaily.length >= 2) {
      trend = campaignDaily.map((d: any) => {
        const imp = d.impressions || 0; const clicks = d.clicks || 0; const conv = d.conversions || 0; const spend = d.spend || 0; const rev = d.revenue || 0;
        const dailyCtr = imp > 0 ? clicks / imp : 0; const dailyCvr = clicks > 0 ? conv / clicks : 0; const dailyRoas = spend > 0 ? rev / spend : 0;
        const dayScore = Math.round(
          (spend > 0 ? Math.min(100, ((campaign.budget?.lifetime || 1) - spend) / (campaign.budget?.lifetime || 1) * 100) : 50) * WEIGHTS.budget +
          Math.min(100, (dailyRoas / HEALTH_BASELINES.roas) * 100) * WEIGHTS.performance +
          Math.min(100, (dailyCtr / HEALTH_BASELINES.ctr) * 100) * WEIGHTS.efficiency +
          Math.min(100, (dailyCvr / HEALTH_BASELINES.cvr) * 100) * WEIGHTS.engagement
        );
        return { date: d.date ? new Date(d.date).toISOString().split("T")[0] : "unknown", score: dayScore };
      });
    } else {
      trend = []; const now = new Date();
      for (let i = 11; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); trend.push({ date: d.toISOString().split("T")[0], score }); }
    }
    sendSuccess(res, { campaignId: id, campaignName: campaign.name, score, status: categorize(score), dimensions, issues, trend });
  })
);

router.get("/dashboard/portfolio", asyncHandler(async (req: Request, res: Response) => {
  const dashboard = await campaignHealthOrchestrator.getPortfolioDashboard(req.user!.tenantId);
  sendSuccess(res, dashboard);
}));

export default router;
