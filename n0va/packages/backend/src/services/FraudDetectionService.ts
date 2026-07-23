export type FraudSeverity = "low" | "medium" | "high" | "critical";
export type FraudCategory = "ivt" | "bot" | "click_fraud" | "impression_fraud" | "viewability" | "brand_safety" | "geo_anomaly" | "frequency_anomaly";

interface FraudFlag {
  id: string;
  campaignId: string;
  platform: string;
  placementId?: string;
  category: FraudCategory;
  severity: FraudSeverity;
  score: number;
  description: string;
  details: Record<string, unknown>;
  detectedAt: Date;
  autoPaused: boolean;
  resolvedAt?: Date;
}

interface PlacementRisk {
  placementId: string;
  platform: string;
  ivtScore: number;
  viewabilityScore: number;
  brandSafetyScore: number;
  overallRisk: number;
  flags: FraudFlag[];
}

interface FraudHealthSummary {
  totalFlags: number;
  activeFlags: number;
  autoPaused: number;
  criticalFlags: number;
  highFlags: number;
  mediumFlags: number;
  lowFlags: number;
  topCategories: { category: string; count: number }[];
  riskByPlatform: Record<string, { avgIvt: number; avgViewability: number; avgBrandSafety: number; overallRisk: number }>;
}

export class FraudDetectionService {
  private flags = new Map<string, FraudFlag[]>();
  private placements = new Map<string, PlacementRisk>();

  evaluatePlacement(
    placementId: string,
    platform: string,
    metrics: {
      ivtPercent?: number;
      viewabilityPercent?: number;
      brandSafetyScore?: number;
      botProbability?: number;
      clickVelocity?: number;
      impressionFrequency?: number;
      geoDistribution?: string[];
    },
    campaignId: string = "unknown"
  ): PlacementRisk {
    const flags: FraudFlag[] = [];
    const tenantFlags = this.flags.get(campaignId) || [];

    if (metrics.ivtPercent !== undefined && metrics.ivtPercent > 30) {
      const severity = metrics.ivtPercent > 90 ? "critical" : metrics.ivtPercent > 70 ? "high" : metrics.ivtPercent > 50 ? "medium" : "low";
      flags.push({
        id: `flag_ivt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        campaignId,
        platform,
        placementId,
        category: "ivt",
        severity,
        score: metrics.ivtPercent,
        description: `Invalid traffic detected at ${metrics.ivtPercent.toFixed(1)}%`,
        details: { ivtPercent: metrics.ivtPercent },
        detectedAt: new Date(),
        autoPaused: metrics.ivtPercent > 90,
      });
    }

    if (metrics.viewabilityPercent !== undefined && metrics.viewabilityPercent < 50) {
      flags.push({
        id: `flag_view_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        campaignId,
        platform,
        placementId,
        category: "viewability",
        severity: metrics.viewabilityPercent < 30 ? "high" : "medium",
        score: 100 - metrics.viewabilityPercent,
        description: `Low viewability: ${metrics.viewabilityPercent.toFixed(1)}%`,
        details: { viewabilityPercent: metrics.viewabilityPercent },
        detectedAt: new Date(),
        autoPaused: metrics.viewabilityPercent < 20,
      });
    }

    if (metrics.brandSafetyScore !== undefined && metrics.brandSafetyScore < 70) {
      const severity = metrics.brandSafetyScore < 40 ? "critical" : metrics.brandSafetyScore < 55 ? "high" : "medium";
      flags.push({
        id: `flag_bs_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        campaignId,
        platform,
        placementId,
        category: "brand_safety",
        severity,
        score: 100 - metrics.brandSafetyScore,
        description: `Brand safety risk: score ${metrics.brandSafetyScore.toFixed(0)}/100`,
        details: { brandSafetyScore: metrics.brandSafetyScore },
        detectedAt: new Date(),
        autoPaused: metrics.brandSafetyScore < 35,
      });
    }

    if (metrics.botProbability !== undefined && metrics.botProbability > 0.5) {
      flags.push({
        id: `flag_bot_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        campaignId,
        platform,
        placementId,
        category: "bot",
        severity: metrics.botProbability > 0.8 ? "critical" : "high",
        score: metrics.botProbability * 100,
        description: `Bot traffic detected (probability: ${(metrics.botProbability * 100).toFixed(0)}%)`,
        details: { botProbability: metrics.botProbability },
        detectedAt: new Date(),
        autoPaused: metrics.botProbability > 0.8,
      });
    }

    if (metrics.clickVelocity !== undefined && metrics.clickVelocity > 20) {
      flags.push({
        id: `flag_cf_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        campaignId,
        platform,
        placementId,
        category: "click_fraud",
        severity: metrics.clickVelocity > 50 ? "critical" : "high",
        score: metrics.clickVelocity,
        description: `Abnormal click velocity: ${metrics.clickVelocity.toFixed(0)} clicks/minute`,
        details: { clickVelocity: metrics.clickVelocity },
        detectedAt: new Date(),
        autoPaused: metrics.clickVelocity > 50,
      });
    }

    if (flags.length > 0) {
      tenantFlags.push(...flags);
      this.flags.set(campaignId, tenantFlags);
    }

    const ivtScore = metrics.ivtPercent || 0;
    const viewabilityScore = metrics.viewabilityPercent || 100;
    const brandSafetyScore = metrics.brandSafetyScore || 100;
    const overallRisk = Math.max(
      ivtScore,
      100 - viewabilityScore,
      100 - brandSafetyScore,
      (metrics.botProbability || 0) * 100,
      Math.min(100, (metrics.clickVelocity || 0) * 2)
    );

    const risk: PlacementRisk = {
      placementId,
      platform,
      ivtScore,
      viewabilityScore,
      brandSafetyScore,
      overallRisk: Math.min(100, overallRisk),
      flags,
    };

    this.placements.set(placementId, risk);
    return risk;
  }

  getPlacementRisk(placementId: string): PlacementRisk | undefined {
    return this.placements.get(placementId);
  }

  getCampaignFlags(campaignId: string): FraudFlag[] {
    return this.flags.get(campaignId) || [];
  }

  resolveFlag(flagId: string): boolean {
    for (const [, flags] of this.flags) {
      const flag = flags.find((f) => f.id === flagId);
      if (flag) {
        flag.resolvedAt = new Date();
        return true;
      }
    }
    return false;
  }

  getHealthSummary(): FraudHealthSummary {
    let totalFlags = 0;
    let activeFlags = 0;
    let autoPaused = 0;
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;
    const categoryCount: Record<string, number> = {};
    const platformRisk: Record<string, { ivt: number[]; viewability: number[]; brandSafety: number[] }> = {};

    for (const [, flags] of this.flags) {
      for (const flag of flags) {
        totalFlags++;
        if (!flag.resolvedAt) activeFlags++;
        if (flag.autoPaused) autoPaused++;
        if (flag.severity === "critical") critical++;
        else if (flag.severity === "high") high++;
        else if (flag.severity === "medium") medium++;
        else low++;
        categoryCount[flag.category] = (categoryCount[flag.category] || 0) + 1;
      }
    }

    for (const [, placement] of this.placements) {
      if (!platformRisk[placement.platform]) {
        platformRisk[placement.platform] = { ivt: [], viewability: [], brandSafety: [] };
      }
      platformRisk[placement.platform].ivt.push(placement.ivtScore);
      platformRisk[placement.platform].viewability.push(placement.viewabilityScore);
      platformRisk[placement.platform].brandSafety.push(placement.brandSafetyScore);
    }

    const riskByPlatform: Record<string, { avgIvt: number; avgViewability: number; avgBrandSafety: number; overallRisk: number }> = {};
    for (const [platform, risks] of Object.entries(platformRisk)) {
      const avgIvt = risks.ivt.reduce((s, v) => s + v, 0) / Math.max(1, risks.ivt.length);
      const avgViewability = risks.viewability.reduce((s, v) => s + v, 0) / Math.max(1, risks.viewability.length);
      const avgBrandSafety = risks.brandSafety.reduce((s, v) => s + v, 0) / Math.max(1, risks.brandSafety.length);
      riskByPlatform[platform] = {
        avgIvt,
        avgViewability,
        avgBrandSafety,
        overallRisk: Math.max(avgIvt, 100 - avgViewability, 100 - avgBrandSafety),
      };
    }

    return {
      totalFlags,
      activeFlags,
      autoPaused,
      criticalFlags: critical,
      highFlags: high,
      mediumFlags: medium,
      lowFlags: low,
      topCategories: Object.entries(categoryCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([category, count]) => ({ category, count })),
      riskByPlatform,
    };
  }

  generateSampleAlert(campaignId: string = "camp_001"): FraudFlag {
    const flag: FraudFlag = {
      id: `flag_sample_${Date.now()}`,
      campaignId,
      platform: ["meta", "google", "linkedin", "tiktok"][Math.floor(Math.random() * 4)],
      placementId: `pl_${Math.random().toString(36).substr(2, 8)}`,
      category: ["ivt", "bot", "viewability", "brand_safety"][Math.floor(Math.random() * 4)] as FraudCategory,
      severity: ["low", "medium", "high", "critical"][Math.floor(Math.random() * 4)] as FraudSeverity,
      score: Math.floor(Math.random() * 100),
      description: "Sample fraud alert for testing",
      details: {},
      detectedAt: new Date(),
      autoPaused: Math.random() > 0.7,
    };
    const tenantFlags = this.flags.get(campaignId) || [];
    tenantFlags.push(flag);
    this.flags.set(campaignId, tenantFlags);
    return flag;
  }
}

export const fraudDetectionService = new FraudDetectionService();
