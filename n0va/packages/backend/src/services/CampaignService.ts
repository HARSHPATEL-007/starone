import mongoose from "mongoose";
import { Campaign, ICampaign } from "../models/Campaign";
import { Metric } from "../models/Metric";
import { CampaignStatus } from "../types";

interface CreateCampaignInput {
  tenantId: string;
  name: string;
  type: string;
  budget: { daily: number; lifetime: number; currency: string };
  platforms: string[];
  goal?: string;
  startDate?: string;
  endDate?: string;
  createdBy: string;
}

interface CampaignFilters {
  tenantId: string;
  status?: string;
  type?: string;
  search?: string;
  page: number;
  limit: number;
}

interface PerformanceInsight {
  campaignId: string;
  name: string;
  overallHealth: number;
  dimensions: { name: string; score: number; zScore: number; trend: "up" | "down" | "stable" }[];
  anomalies: { metric: string; zScore: number; severity: string }[];
  percentile: number;
  recommendation: string;
}

interface BudgetPrediction {
  campaignId: string;
  currentBurnRate: number;
  projectedEndSpend: number;
  projectedUtilization: number;
  daysRemaining: number;
  willOverspend: boolean;
  willUnderutilize: boolean;
  recommendedDailyCap: number;
  confidence: number;
  dailyProjections: { day: number; predicted: number; lower: number; upper: number }[];
}

interface PortfolioConcentration {
  hhi: number;
  giniCoefficient: number;
  effectiveCampaignCount: number;
  budgetShare: { name: string; share: number }[];
  concentrationLabel: string;
}

export class CampaignService {
  async create(input: CreateCampaignInput): Promise<ICampaign> {
    const budget = {
      ...input.budget,
      spent: 0,
      remaining: input.budget.lifetime,
    };
    const campaign = new Campaign({
      tenantId: new mongoose.Types.ObjectId(input.tenantId),
      name: input.name,
      type: input.type,
      status: CampaignStatus.Draft,
      budget,
      platforms: input.platforms,
      goal: input.goal,
      startDate: input.startDate,
      endDate: input.endDate,
      createdBy: new mongoose.Types.ObjectId(input.createdBy),
      hyperContext: { linkedTasks: [], linkedDocs: [], linkedSheets: [], linkedCalendar: [] },
    });
    return campaign.save();
  }

  async findById(id: string, tenantId: string): Promise<ICampaign | null> {
    return Campaign.findOne({ _id: new mongoose.Types.ObjectId(id), tenantId: new mongoose.Types.ObjectId(tenantId) }).populate("audiences creatives");
  }

  async find(filters: CampaignFilters) {
    const query: Record<string, unknown> = { tenantId: new mongoose.Types.ObjectId(filters.tenantId) };
    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.search) query.name = { $regex: filters.search, $options: "i" };
    const skip = (filters.page - 1) * filters.limit;
    const [campaigns, total] = await Promise.all([
      Campaign.find(query).sort({ createdAt: -1 }).skip(skip).limit(filters.limit).populate("audiences creatives"),
      Campaign.countDocuments(query),
    ]);
    return { campaigns, total, page: filters.page, limit: filters.limit };
  }

  async updateStatus(id: string, tenantId: string, status: CampaignStatus): Promise<ICampaign | null> {
    return Campaign.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id), tenantId: new mongoose.Types.ObjectId(tenantId) },
      { status, updatedAt: new Date() },
      { new: true }
    );
  }

  async updateBudget(id: string, tenantId: string, budget: { daily: number; lifetime: number }): Promise<ICampaign | null> {
    const campaign = await Campaign.findOne({ _id: new mongoose.Types.ObjectId(id), tenantId: new mongoose.Types.ObjectId(tenantId) });
    if (!campaign) return null;
    campaign.budget.daily = budget.daily;
    campaign.budget.lifetime = budget.lifetime;
    campaign.budget.remaining = budget.lifetime - campaign.budget.spent;
    campaign.markModified("budget");
    return campaign.save();
  }

  async getDashboardMetrics(tenantId: string) {
    const campaigns = await Campaign.find({ tenantId: new mongoose.Types.ObjectId(tenantId) });
    const totalBudget = campaigns.reduce((s, c) => s + c.budget.lifetime, 0);
    const totalSpent = campaigns.reduce((s, c) => s + c.budget.spent, 0);
    const activeCampaigns = campaigns.filter((c) => c.status === CampaignStatus.Active).length;
    const recentMetrics = await Metric.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: null, totalImpressions: { $sum: "$impressions" }, totalClicks: { $sum: "$clicks" }, totalConversions: { $sum: "$conversions" }, totalSpend: { $sum: "$spend" }, totalRevenue: { $sum: "$revenue" }, avgCtr: { $avg: "$ctr" }, avgRoas: { $avg: "$roas" } } },
    ]);
    return {
      totalCampaigns: campaigns.length,
      activeCampaigns,
      totalBudget,
      totalSpent,
      remaining: totalBudget - totalSpent,
      metrics: recentMetrics[0] || { totalImpressions: 0, totalClicks: 0, totalConversions: 0, totalSpend: 0, totalRevenue: 0, avgCtr: 0, avgRoas: 0 },
    };
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const result = await Campaign.deleteOne({ _id: new mongoose.Types.ObjectId(id), tenantId: new mongoose.Types.ObjectId(tenantId) });
    return result.deletedCount > 0;
  }

  // ─── Performance Insights with Multi-Dimensional Scoring ──────────────

  async getPerformanceInsights(tenantId: string): Promise<PerformanceInsight[]> {
    const campaigns = await Campaign.find({ tenantId: new mongoose.Types.ObjectId(tenantId) });
    const metrics = await Metric.find({ tenantId: new mongoose.Types.ObjectId(tenantId) }).sort({ date: -1 }).limit(1000);

    const campaignMetrics = new Map<string, { ctr: number[]; cvr: number[]; roas: number[]; cpa: number[]; spend: number[] }>();
    for (const m of metrics) {
      const cid = m.campaignId?.toString() || "unknown";
      if (!campaignMetrics.has(cid)) campaignMetrics.set(cid, { ctr: [], cvr: [], roas: [], cpa: [], spend: [] });
      const d = campaignMetrics.get(cid)!;
      if (m.impressions > 0) d.ctr.push((m.clicks || 0) / m.impressions);
      if (m.clicks > 0) d.cvr.push((m.conversions || 0) / m.clicks);
      if (m.spend > 0) d.roas.push((m.revenue || 0) / m.spend);
      if (m.conversions > 0) d.cpa.push((m.spend || 0) / m.conversions);
      d.spend.push(m.spend || 0);
    }

    const allCtr = Array.from(campaignMetrics.values()).flatMap((d) => d.ctr);
    const allCvr = Array.from(campaignMetrics.values()).flatMap((d) => d.cvr);
    const allRoas = Array.from(campaignMetrics.values()).flatMap((d) => d.roas);
    const allCpa = Array.from(campaignMetrics.values()).flatMap((d) => d.cpa);
    const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / Math.max(a.length, 1);
    const std = (a: number[]) => { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(a.length, 1)); };
    const portfolio = { ctrMean: mean(allCtr), ctrStd: std(allCtr) || 0.01, cvrMean: mean(allCvr), cvrStd: std(allCvr) || 0.01, roasMean: mean(allRoas), roasStd: std(allRoas) || 1, cpaMean: mean(allCpa), cpaStd: std(allCpa) || 1 };
    const z = (v: number, m: number, s: number) => s > 0 ? (v - m) / s : 0;

    const insights: PerformanceInsight[] = campaigns.map((c) => {
      const cid = c._id.toString();
      const d = campaignMetrics.get(cid);
      const avgCtr = d && d.ctr.length > 0 ? d.ctr.reduce((a, b) => a + b, 0) / d.ctr.length : 0;
      const avgCvr = d && d.cvr.length > 0 ? d.cvr.reduce((a, b) => a + b, 0) / d.cvr.length : 0;
      const avgRoas = d && d.roas.length > 0 ? d.roas.reduce((a, b) => a + b, 0) / d.roas.length : 0;
      const avgCpa = d && d.cpa.length > 0 ? d.cpa.reduce((a, b) => a + b, 0) / d.cpa.length : 0;

      const zCtr = z(avgCtr, portfolio.ctrMean, portfolio.ctrStd);
      const zCvr = z(avgCvr, portfolio.cvrMean, portfolio.cvrStd);
      const zRoas = z(avgRoas, portfolio.roasMean, portfolio.roasStd);
      const zCpa = -z(avgCpa, portfolio.cpaMean, portfolio.cpaStd);

      const dims = [
        { name: "CTR", score: this.zToScore(zCtr, 10), zScore: Math.round(zCtr * 100) / 100, trend: "stable" as const },
        { name: "CVR", score: this.zToScore(zCvr, 10), zScore: Math.round(zCvr * 100) / 100, trend: "stable" as const },
        { name: "ROAS", score: this.zToScore(zRoas, 10), zScore: Math.round(zRoas * 100) / 100, trend: "stable" as const },
        { name: "CPA Efficiency", score: this.zToScore(zCpa, 10), zScore: Math.round(zCpa * 100) / 100, trend: "stable" as const },
      ];

      const overallHealth = Math.round(dims.reduce((s, d) => s + d.score, 0) / dims.length);
      const anomalies: { metric: string; zScore: number; severity: string }[] = [];
      if (Math.abs(zCtr) > 2.5) anomalies.push({ metric: "CTR", zScore: Math.round(zCtr * 100) / 100, severity: Math.abs(zCtr) > 3.5 ? "high" : "medium" });
      if (Math.abs(zCvr) > 2.5) anomalies.push({ metric: "CVR", zScore: Math.round(zCvr * 100) / 100, severity: Math.abs(zCvr) > 3.5 ? "high" : "medium" });
      if (Math.abs(zRoas) > 2.5) anomalies.push({ metric: "ROAS", zScore: Math.round(zRoas * 100) / 100, severity: Math.abs(zRoas) > 3.5 ? "high" : "medium" });

      const percentile = Math.round(this.normalCdf(overallHealth / 15) * 100);
      const recommendation = anomalies.length > 0
        ? `${anomalies.length} metric(s) deviating from portfolio norm. Review ${anomalies.map((a) => a.metric).join(", ")}.`
        : overallHealth > 60 ? "Campaign performing above portfolio average." : "Campaign performing below average — consider optimization actions.";

      return { campaignId: cid, name: c.name, overallHealth, dimensions: dims, anomalies, percentile, recommendation };
    });

    return insights.sort((a, b) => b.overallHealth - a.overallHealth);
  }

  // ─── Budget Burn Rate Prediction ──────────────────────────────────────

  async getBudgetPrediction(campaignId: string): Promise<BudgetPrediction | null> {
    const campaign = await Campaign.findById(new mongoose.Types.ObjectId(campaignId));
    if (!campaign) return null;

    const metrics = await Metric.find({ campaignId: new mongoose.Types.ObjectId(campaignId) }).sort({ date: 1 });
    if (metrics.length < 3) return this.defaultPrediction(campaign);

    const dailySpends: number[] = [];
    const dateMap = new Map<string, number>();
    for (const m of metrics) {
      const day = m.date ? new Date(m.date).toISOString().split("T")[0] : "";
      if (day) dateMap.set(day, (dateMap.get(day) || 0) + (m.spend || 0));
    }
    for (const [, s] of dateMap) dailySpends.push(s);

    const n = dailySpends.length;
    const alpha = 0.3;
    let level = dailySpends[0];
    for (let i = 1; i < n; i++) level = alpha * dailySpends[i] + (1 - alpha) * level;
    const residuals = dailySpends.map((v, i) => i === 0 ? 0 : v - level);
    const rmse = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / n);

    const startDate = campaign.startDate ? new Date(campaign.startDate) : new Date();
    const endDate = campaign.endDate ? new Date(campaign.endDate) : new Date(Date.now() + 30 * 86400000);
    const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000));
    const elapsedDays = n;
    const remainingDays = Math.max(0, totalDays - elapsedDays);
    const spentSoFar = campaign.budget.spent;

    let projectedTotal = spentSoFar;
    const dailyProjections: { day: number; predicted: number; lower: number; upper: number }[] = [];
    for (let day = 1; day <= remainingDays; day++) {
      const pred = Math.max(0, level + (day > 7 ? level * 0.02 * Math.floor(day / 7) : 0));
      projectedTotal += pred;
      dailyProjections.push({
        day: elapsedDays + day,
        predicted: Math.round(pred * 100) / 100,
        lower: Math.max(0, Math.round((pred - 1.96 * rmse) * 100) / 100),
        upper: Math.round((pred + 1.96 * rmse) * 100) / 100,
      });
    }

    const projectedUtilization = Math.round((projectedTotal / campaign.budget.lifetime) * 10000) / 100;
    const willOverspend = projectedTotal > campaign.budget.lifetime;
    const willUnderutilize = projectedTotal < campaign.budget.lifetime * 0.7;
    const recommendedDailyCap = remainingDays > 0
      ? Math.round(((campaign.budget.lifetime - spentSoFar) / remainingDays) * 100) / 100
      : 0;

    return {
      campaignId,
      currentBurnRate: Math.round(level * 100) / 100,
      projectedEndSpend: Math.round(projectedTotal * 100) / 100,
      projectedUtilization,
      daysRemaining: remainingDays,
      willOverspend,
      willUnderutilize,
      recommendedDailyCap,
      confidence: Math.round((1 - rmse / Math.max(level, 0.01)) * 100) / 100,
      dailyProjections,
    };
  }

  private defaultPrediction(campaign: ICampaign): BudgetPrediction {
    const spent = campaign.budget.spent;
    const lifetime = campaign.budget.lifetime;
    const start = campaign.startDate ? new Date(campaign.startDate) : new Date();
    const end = campaign.endDate ? new Date(campaign.endDate) : new Date(Date.now() + 30 * 86400000);
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    const elapsedDays = Math.max(1, (Date.now() - start.getTime()) / 86400000);
    const remainingDays = Math.max(0, totalDays - elapsedDays);
    const dailyRate = spent / elapsedDays;
    const projected = spent + dailyRate * remainingDays;

    return {
      campaignId: campaign._id.toString(),
      currentBurnRate: Math.round(dailyRate * 100) / 100,
      projectedEndSpend: Math.round(projected * 100) / 100,
      projectedUtilization: Math.round((projected / lifetime) * 10000) / 100,
      daysRemaining: Math.round(remainingDays),
      willOverspend: projected > lifetime,
      willUnderutilize: projected < lifetime * 0.7,
      recommendedDailyCap: remainingDays > 0 ? Math.round(((lifetime - spent) / remainingDays) * 100) / 100 : 0,
      confidence: 0.5,
      dailyProjections: [],
    };
  }

  // ─── Portfolio Concentration Analysis ─────────────────────────────────

  async getPortfolioConcentration(tenantId: string): Promise<PortfolioConcentration> {
    const campaigns = await Campaign.find({ tenantId: new mongoose.Types.ObjectId(tenantId) });
    const totalBudget = campaigns.reduce((s, c) => s + c.budget.lifetime, 0);
    if (totalBudget === 0 || campaigns.length === 0) {
      return { hhi: 0, giniCoefficient: 0, effectiveCampaignCount: 0, budgetShare: [], concentrationLabel: "none" };
    }

    const shares = campaigns.map((c) => ({ name: c.name, share: c.budget.lifetime / totalBudget }));
    const sortedShares = [...shares].sort((a, b) => b.share - a.share);

    const hhi = Math.round(sortedShares.reduce((s, c) => s + c.share * c.share * 10000, 0));
    const effectiveCampaignCount = hhi > 0 ? Math.round(10000 / hhi * 100) / 100 : 0;

    const n = sortedShares.length;
    const sorted = sortedShares.map((s) => s.share).sort((a, b) => a - b);
    let gini = 0;
    for (let i = 0; i < n; i++) {
      gini += (2 * i - n + 1) * sorted[i];
    }
    gini = n > 1 ? Math.round((gini / (n * sorted.reduce((s, v) => s + v, 0))) * 10000) / 100 : 0;

    const concentrationLabel = hhi >= 2500 ? "highly concentrated" : hhi >= 1500 ? "moderately concentrated" : "diversified";

    return { hhi, giniCoefficient: gini, effectiveCampaignCount, budgetShare: sortedShares, concentrationLabel };
  }

  // ─── Campaign Similarity via Cosine Distance ──────────────────────────

  async getSimilarCampaigns(campaignId: string, tenantId: string, topN = 5): Promise<{ id: string; name: string; similarity: number }[]> {
    const campaigns = await Campaign.find({ tenantId: new mongoose.Types.ObjectId(tenantId) });
    const target = campaigns.find((c) => c._id.toString() === campaignId);
    if (!target) return [];

    const allMetrics = await Metric.find({ tenantId: new mongoose.Types.ObjectId(tenantId) });
    const profileMap = new Map<string, number[]>();
    for (const c of campaigns) {
      const cid = c._id.toString();
      const cm = allMetrics.filter((m) => m.campaignId?.toString() === cid);
      const imp = cm.reduce((s, m) => s + (m.impressions || 0), 0);
      const clicks = cm.reduce((s, m) => s + (m.clicks || 0), 0);
      const conv = cm.reduce((s, m) => s + (m.conversions || 0), 0);
      const spend = cm.reduce((s, m) => s + (m.spend || 0), 0);
      const rev = cm.reduce((s, m) => s + (m.revenue || 0), 0);
      profileMap.set(cid, [
        imp > 0 ? clicks / imp : 0,
        clicks > 0 ? conv / clicks : 0,
        spend > 0 ? rev / spend : 0,
        Math.log10(Math.max(1, spend)),
        Math.log10(Math.max(1, imp)),
      ]);
    }

    const targetProfile = profileMap.get(campaignId);
    if (!targetProfile) return [];

    const similarities: { id: string; name: string; similarity: number }[] = [];
    for (const c of campaigns) {
      const cid = c._id.toString();
      if (cid === campaignId) continue;
      const profile = profileMap.get(cid);
      if (!profile) continue;
      const dot = targetProfile.reduce((s, v, i) => s + v * profile[i], 0);
      const normA = Math.sqrt(targetProfile.reduce((s, v) => s + v * v, 0));
      const normB = Math.sqrt(profile.reduce((s, v) => s + v * v, 0));
      const similarity = normA > 0 && normB > 0 ? Math.round((dot / (normA * normB)) * 10000) / 100 : 0;
      similarities.push({ id: cid, name: c.name, similarity });
    }

    return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, topN);
  }

  // ─── Performance Anomaly Detection ────────────────────────────────────

  async getPerformanceAnomalies(tenantId: string): Promise<{ campaignId: string; name: string; metric: string; value: number; zScore: number; severity: string }[]> {
    const insights = await this.getPerformanceInsights(tenantId);
    const anomalies: { campaignId: string; name: string; metric: string; value: number; zScore: number; severity: string }[] = [];
    for (const i of insights) {
      for (const a of i.anomalies) {
        anomalies.push({ campaignId: i.campaignId, name: i.name, metric: a.metric, value: 0, zScore: a.zScore, severity: a.severity });
      }
    }
    return anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
  }

  // ─── Day-to-Day Execution: Batch Operations & Daily Overview ──────────

  async batchUpdateStatus(tenantId: string, updates: { id: string; status: CampaignStatus }[]): Promise<{ success: number; failed: number; errors: { id: string; error: string }[] }> {
    const tenantOid = new mongoose.Types.ObjectId(tenantId);
    let success = 0;
    let failed = 0;
    const errors: { id: string; error: string }[] = [];
    for (const u of updates) {
      try {
        const result = await Campaign.findOneAndUpdate(
          { _id: new mongoose.Types.ObjectId(u.id), tenantId: tenantOid },
          { status: u.status, updatedAt: new Date() },
          { new: true }
        );
        if (result) success++; else { failed++; errors.push({ id: u.id, error: "Campaign not found" }); }
      } catch (e: any) {
        failed++; errors.push({ id: u.id, error: e.message || "Update failed" });
      }
    }
    return { success, failed, errors };
  }

  async batchUpdateBudget(tenantId: string, updates: { id: string; daily?: number; lifetime?: number }[]): Promise<{ success: number; failed: number; errors: { id: string; error: string }[] }> {
    let success = 0;
    let failed = 0;
    const errors: { id: string; error: string }[] = [];
    for (const u of updates) {
      try {
        const campaign = await Campaign.findOne({ _id: new mongoose.Types.ObjectId(u.id), tenantId: new mongoose.Types.ObjectId(tenantId) });
        if (!campaign) { failed++; errors.push({ id: u.id, error: "Campaign not found" }); continue; }
        if (u.daily !== undefined) campaign.budget.daily = u.daily;
        if (u.lifetime !== undefined) { campaign.budget.lifetime = u.lifetime; campaign.budget.remaining = u.lifetime - campaign.budget.spent; }
        campaign.markModified("budget");
        await campaign.save();
        success++;
      } catch (e: any) {
        failed++; errors.push({ id: u.id, error: e.message || "Update failed" });
      }
    }
    return { success, failed, errors };
  }

  async getDailyOpsOverview(tenantId: string) {
    const campaigns = await Campaign.find({ tenantId: new mongoose.Types.ObjectId(tenantId) });
    const total = campaigns.length;
    const active = campaigns.filter(c => c.status === CampaignStatus.Active).length;
    const paused = campaigns.filter(c => c.status === CampaignStatus.Paused).length;
    const draft = campaigns.filter(c => c.status === CampaignStatus.Draft).length;
    const ended = campaigns.filter(c => c.status === CampaignStatus.Ended).length;
    const totalBudget = campaigns.reduce((s, c) => s + c.budget.lifetime, 0);
    const totalSpent = campaigns.reduce((s, c) => s + c.budget.spent, 0);
    const atRiskBudget = campaigns.filter(c => c.budget.spent > c.budget.lifetime * 0.9).length;
    const nearEnd = campaigns.filter(c => {
      if (!c.endDate) return false;
      const daysLeft = (new Date(c.endDate).getTime() - Date.now()) / 86400000;
      return daysLeft > 0 && daysLeft < 7;
    }).length;
    const budgetUtilization = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 10000) / 100 : 0;
    return {
      generatedAt: new Date().toISOString(),
      totalCampaigns: total,
      byStatus: { active, paused, draft, ended },
      budget: { totalBudget, totalSpent, remaining: totalBudget - totalSpent, utilizationPercent: budgetUtilization },
      flags: { atRiskBudget: { count: atRiskBudget, label: "Campaigns >90% budget used" }, nearEndDate: { count: nearEnd, label: "Campaigns ending within 7 days" } },
      needsAttention: atRiskBudget + nearEnd,
    };
  }

  // ─── Utilities ────────────────────────────────────────────────────────

  private zToScore(z: number, scale: number): number {
    const capped = Math.max(-3, Math.min(3, z));
    return Math.max(0, Math.min(100, 50 + capped * scale));
  }

  private normalCdf(x: number): number {
    return 0.5 * (1 + this.erf(x / Math.SQRT2));
  }

  private erf(x: number): number {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    const t = 1 / (1 + p * x);
    return sign * (1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));
  }
}

export const campaignService = new CampaignService();
