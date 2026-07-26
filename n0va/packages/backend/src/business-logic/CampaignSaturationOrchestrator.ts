import { campaignSaturationService } from "../services/CampaignSaturationService";
import { decisionEngine } from "./DecisionEngine";

export interface CampaignSaturationSummary {
  portfolioSatScore: number;
  fatigueRiskScore: number;
  avgSaturation: number;
  campaignsAtRisk: { campaignId: string; campaignName: string; saturationScore: number; saturationLevel: string; fatigueSeverity: string; recommendation: string }[];
  earlyWarnings: { campaignId: string; campaignName: string; warningType: string; severity: string; message: string }[];
  saturationTrend: { direction: string; pctChange: number; improvingCount: number; worseningCount: number };
  healthBand: string;
}

export class CampaignSaturationOrchestrator {
  analyzePortfolio(tenantId: string): CampaignSaturationSummary {
    const result = campaignSaturationService.analyzeAll(tenantId);
    const analyses = result.analyses || [];

    const satScores = analyses.map(a => a.saturationScore);
    const fatigueScores: number[] = analyses.map(a =>
      a.fatigueMetrics.fatigueSeverity === "high" ? 90 : a.fatigueMetrics.fatigueSeverity === "medium" ? 60 : a.fatigueMetrics.fatigueSeverity === "low" ? 30 : 0
    );
    const portfolioSatScore = satScores.length > 0 ? Math.round(satScores.reduce((s, v) => s + v, 0) / satScores.length) : 0;
    const fatigueRiskScore = fatigueScores.length > 0 ? Math.round(fatigueScores.reduce((s, v) => s + v, 0) / fatigueScores.length) : 0;

    const campaignsAtRisk = analyses
      .filter(a => a.saturationLevel === "critical" || a.saturationLevel === "high" || a.fatigueMetrics.fatigueDetected)
      .map(a => ({
        campaignId: a.campaignId,
        campaignName: a.campaignName,
        saturationScore: a.saturationScore,
        saturationLevel: a.saturationLevel,
        fatigueSeverity: a.fatigueMetrics.fatigueSeverity,
        recommendation: a.recommendation,
      }));

    const earlyWarnings: { campaignId: string; campaignName: string; warningType: string; severity: string; message: string }[] = [];
    for (const a of analyses) {
      if (a.saturationLevel === "critical") {
        earlyWarnings.push({
          campaignId: a.campaignId, campaignName: a.campaignName,
          warningType: "saturation", severity: "critical",
          message: `Campaign deeply saturated (score ${a.saturationScore.toFixed(0)}). Immediate intervention required.`,
        });
      } else if (a.saturationLevel === "high") {
        earlyWarnings.push({
          campaignId: a.campaignId, campaignName: a.campaignName,
          warningType: "saturation", severity: "high",
          message: `High saturation detected (score ${a.saturationScore.toFixed(0)}). Consider capping spend or refreshing strategy.`,
        });
      }
      if (a.fatigueMetrics.fatigueSeverity === "high") {
        earlyWarnings.push({
          campaignId: a.campaignId, campaignName: a.campaignName,
          warningType: "fatigue", severity: "high",
          message: "Severe ad fatigue. Refresh creatives and review frequency capping.",
        });
      }
      if (a.budgetUtilizationAtSaturation > 80 && a.saturationLevel !== "none") {
        const wearoutDate = a.fatigueMetrics.estimatedWearoutDate;
        earlyWarnings.push({
          campaignId: a.campaignId, campaignName: a.campaignName,
          warningType: "wearout", severity: wearoutDate ? "high" : "medium",
          message: wearoutDate ? `Estimated wearout by ${wearoutDate}. Plan creative refresh.` : "Budget utilization high near saturation point. Monitor closely.",
        });
      }
    }

    const trend = this.computeSaturationTrend(analyses);
    const healthBand = decisionEngine.label(decisionEngine.band(100 - portfolioSatScore, { excellent: 80, good: 60, fair: 40, poor: 20 }));

    return { portfolioSatScore, fatigueRiskScore, avgSaturation: portfolioSatScore, campaignsAtRisk, earlyWarnings, saturationTrend: trend, healthBand };
  }

  private computeSaturationTrend(analyses: any[]): { direction: string; pctChange: number; improvingCount: number; worseningCount: number } {
    const improving = analyses.filter(a => a.saturationLevel === "none" || a.saturationLevel === "moderate").length;
    const worsening = analyses.filter(a => a.saturationLevel === "critical" || a.saturationLevel === "high").length;
    const total = analyses.length || 1;
    const pctChange = Math.round(((worsening - improving) / total) * 100);
    return {
      direction: pctChange > 10 ? "worsening" : pctChange < -10 ? "improving" : "stable",
      pctChange, improvingCount: improving, worseningCount: worsening,
    };
  }
}

export const campaignSaturationOrchestrator = new CampaignSaturationOrchestrator();
