import { Metric } from "../models/Metric";
import { Campaign } from "../models/Campaign";
import { decisionEngine } from "./DecisionEngine";

export interface ForecastScenario {
  label: string;
  projectedValues: number[];
  totalProjected: number;
  confidence: number;
  assumptions: string[];
}

export interface CampaignForecast {
  campaignId: string;
  campaignName: string;
  historical: { date: string; spend: number; revenue: number; roas: number }[];
  scenarios: ForecastScenario[];
  saturationDetected: boolean;
  saturationScore: number;
  dataQuality: "high" | "medium" | "low";
}

export interface PortfolioForecast {
  generatedAt: string;
  totalCampaigns: number;
  forecastableCount: number;
  portfolioProjections: { metric: string; baseline: number; optimistic: number; pessimistic: number }[];
  saturationWarnings: { campaignId: string; campaignName: string; saturationScore: number }[];
  recommendations: string[];
}

export class PredictiveForecastOrchestrator {
  async forecastCampaign(campaignId: string, tenantId: string): Promise<CampaignForecast> {
    const mongoose = require("mongoose");
    const campaign = await Campaign.findById(new mongoose.Types.ObjectId(campaignId)).lean() as any;
    if (!campaign || campaign.tenantId?.toString() !== tenantId) throw new Error("Campaign not found");

    const metrics = await Metric.find({ campaignId: new mongoose.Types.ObjectId(campaignId), tenantId: new mongoose.Types.ObjectId(tenantId) }).sort({ date: 1 }).lean() as any[];
    const daily: Record<string, { spend: number; revenue: number }> = {};
    for (const m of metrics) {
      const d = m.date ? new Date(m.date).toISOString().slice(0, 10) : "unknown";
      if (!daily[d]) daily[d] = { spend: 0, revenue: 0 };
      daily[d].spend += m.spend || 0;
      daily[d].revenue += m.revenue || 0;
    }
    const sortedDates = Object.keys(daily).sort();
    const historical = sortedDates.map(d => ({ date: d, ...daily[d], roas: daily[d].spend > 0 ? Math.round((daily[d].revenue / daily[d].spend) * 100) / 100 : 0 }));
    const dailyRevenue = sortedDates.map(d => daily[d].revenue);
    const dailySpend = sortedDates.map(d => daily[d].spend);

    const dataQuality: "high" | "medium" | "low" = dailyRevenue.length >= 14 ? "high" : dailyRevenue.length >= 7 ? "medium" : "low";

    const revForecast = dailyRevenue.length >= 3 ? decisionEngine.forecastLinear(dailyRevenue, 14) : { values: Array(14).fill(dailyRevenue.reduce((s, v) => s + v, 0) / Math.max(1, dailyRevenue.length)), slope: 0, intercept: 0, rSquared: 0 };
    const spendForecast = dailySpend.length >= 3 ? decisionEngine.forecastLinear(dailySpend, 14) : { values: Array(14).fill(dailySpend.reduce((s, v) => s + v, 0) / Math.max(1, dailySpend.length)), slope: 0, intercept: 0, rSquared: 0 };

    const firstHalf = dailyRevenue.slice(0, Math.floor(dailyRevenue.length / 2));
    const secondHalf = dailyRevenue.slice(Math.floor(dailyRevenue.length / 2));
    const firstAvg = firstHalf.reduce((s, v) => s + v, 0) / Math.max(1, firstHalf.length);
    const secondAvg = secondHalf.reduce((s, v) => s + v, 0) / Math.max(1, secondHalf.length);
    const growthIndicator = firstAvg > 0 ? secondAvg / firstAvg : 1;
    const saturationScore = growthIndicator < 0.85 ? Math.round((1 - growthIndicator) * 200) : Math.round(Math.max(0, 1 - growthIndicator) * 100);

    const avgSpend = dailySpend.reduce((s, v) => s + v, 0) / Math.max(1, dailySpend.length);

    const baselineValues = dailyRevenue.length > 0
      ? revForecast.values.map((v: number) => Math.max(0, v))
      : Array(14).fill(0);
    const baselineTotal = baselineValues.reduce((s: number, v: number) => s + v, 0);

    const optimisticAssumptions: string[] = [];
    const optimisticValues = baselineValues.map((v: number) => Math.round(v * (1 + revForecast.rSquared * 1.5 + 0.05) * 100) / 100);
    if (revForecast.rSquared > 0.5) optimisticAssumptions.push(`Strong historical trend (R²=${revForecast.rSquared})`);
    optimisticAssumptions.push("Assumes 5-15% growth continuation");

    const pessimisticValues = baselineValues.map((v: number) => Math.round(v * (1 - Math.min(0.3, revForecast.rSquared * 0.8)) * 100) / 100);
    const pessimisticAssumptions: string[] = [];
    pessimisticAssumptions.push("Accounts for 0-30% downside variance");
    if (saturationScore > 50) pessimisticAssumptions.push("Saturation risk factored in");

    const trendStrength = dataQuality === "high" ? 0.8 : dataQuality === "medium" ? 0.6 : 0.4;

    return {
      campaignId, campaignName: campaign.name || campaignId,
      historical: historical.slice(-30),
      scenarios: [
        { label: "Optimistic", projectedValues: optimisticValues, totalProjected: Math.round(optimisticValues.reduce((s, v) => s + v, 0) * 100) / 100, confidence: Math.round(Math.min(95, trendStrength * 100 * 0.85)), assumptions: optimisticAssumptions },
        { label: "Baseline", projectedValues: baselineValues, totalProjected: Math.round(baselineTotal * 100) / 100, confidence: Math.round(trendStrength * 100), assumptions: [`Linear forecast (R²=${revForecast.rSquared})`, `${dailyRevenue.length} data points`, `Avg daily revenue: $${Math.round((dailyRevenue.reduce((s, v) => s + v, 0) / Math.max(1, dailyRevenue.length)) * 100) / 100}`] },
        { label: "Pessimistic", projectedValues: pessimisticValues, totalProjected: Math.round(pessimisticValues.reduce((s, v) => s + v, 0) * 100) / 100, confidence: Math.round(trendStrength * 100 * 0.9), assumptions: pessimisticAssumptions },
      ],
      saturationDetected: saturationScore > 50,
      saturationScore,
      dataQuality,
    };
  }

  async forecastPortfolio(tenantId: string): Promise<PortfolioForecast> {
    const mongoose = require("mongoose");
    const campaigns = await Campaign.find({ tenantId: new mongoose.Types.ObjectId(tenantId) }).lean() as any[];
    const campaignIds = campaigns.map(c => c._id.toString());

    const results = await Promise.allSettled(campaignIds.map(id => this.forecastCampaign(id, tenantId)));
    const forecasts = results.filter((r): r is PromiseFulfilledResult<CampaignForecast> => r.status === "fulfilled").map(r => r.value);

    const totalBaseline = forecasts.reduce((s, f) => s + f.scenarios[1].totalProjected, 0);
    const totalOptimistic = forecasts.reduce((s, f) => s + f.scenarios[0].totalProjected, 0);
    const totalPessimistic = forecasts.reduce((s, f) => s + f.scenarios[2].totalProjected, 0);

    const avgConfidence = forecasts.length > 0 ? Math.round(forecasts.reduce((s, f) => s + f.scenarios[1].confidence, 0) / forecasts.length) : 0;

    const saturationWarnings = forecasts.filter(f => f.saturationDetected).map(f => ({ campaignId: f.campaignId, campaignName: f.campaignName, saturationScore: f.saturationScore }));

    const recommendations: string[] = [];
    if (saturationWarnings.length > 0) recommendations.push(`${saturationWarnings.length} campaign(s) showing saturation (avg score ${Math.round(saturationWarnings.reduce((s, w) => s + w.saturationScore, 0) / saturationWarnings.length)}). Review budget allocation.`);
    if (totalOptimistic > totalBaseline * 1.15) recommendations.push("Optimistic scenario suggests strong growth potential — consider increasing investment in top performers.");
    if (totalPessimistic < totalBaseline * 0.8) recommendations.push("Pessimistic scenario shows >20% downside risk. Build contingency plans.");
    const lowQuality = forecasts.filter(f => f.dataQuality === "low");
    if (lowQuality.length > 0) recommendations.push(`${lowQuality.length} campaign(s) have insufficient data (<7 days). Improve tracking before relying on forecasts.`);
    recommendations.push(`Portfolio confidence score: ${avgConfidence}/100 — ${avgConfidence >= 70 ? "Reliable" : avgConfidence >= 50 ? "Moderate" : "Low"} confidence.`);

    return {
      generatedAt: new Date().toISOString(), totalCampaigns: campaigns.length, forecastableCount: forecasts.length,
      portfolioProjections: [
        { metric: "Revenue (14d)", baseline: Math.round(totalBaseline * 100) / 100, optimistic: Math.round(totalOptimistic * 100) / 100, pessimistic: Math.round(totalPessimistic * 100) / 100 },
      ],
      saturationWarnings, recommendations,
    };
  }
}

export const predictiveForecastOrchestrator = new PredictiveForecastOrchestrator();
