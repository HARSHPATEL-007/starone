interface CreativePerformance {
  id: string;
  name: string;
  type: string;
  platform: string;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  revenue: number;
  spend: number;
  roas: number;
  firstSeen: Date;
  lastSeen: Date;
  variantGroup?: string;
}

interface FatigueAnalysis {
  creativeId: string;
  creativeName: string;
  type: string;
  currentCtr: number;
  baselineCtr: number;
  ctrDropPercent: number;
  isFatigued: boolean;
  fatigueScore: number;
  daysSinceFirstRun: number;
  totalImpressions: number;
  recommendation: "none" | "refresh_creative" | "rotate_audience" | "pause_creative" | "generate_variants";
  urgency: "low" | "medium" | "high" | "critical";
}

export class CreativeOptimizer {
  private readonly fatigueThreshold = 20;
  private readonly minImpressionThreshold = 5000;
  private readonly maxImpressionsBeforeFatigue = 200000;

  analyzeFatigue(creatives: CreativePerformance[]): FatigueAnalysis[] {
    return creatives.map((c) => this.analyzeSingleCreative(c));
  }

  private analyzeSingleCreative(c: CreativePerformance): FatigueAnalysis {
    const daysSinceFirstRun = Math.max(1, (Date.now() - c.firstSeen.getTime()) / 86400000);
    const baselineCtr = this.estimateBaselineCtr(c);
    const ctrDrop = baselineCtr > 0 ? ((baselineCtr - c.ctr) / baselineCtr) * 100 : 0;
    const impressionRatio = Math.min(1, c.impressions / this.maxImpressionsBeforeFatigue);

    let fatigueScore = 0;
    fatigueScore += Math.max(0, ctrDrop) * 0.4;
    fatigueScore += impressionRatio * 25;
    fatigueScore += Math.min(20, daysSinceFirstRun * 2);
    fatigueScore += c.ctr < 0.5 ? 20 : c.ctr < 1.0 ? 10 : 0;

    const isFatigued = ctrDrop > this.fatigueThreshold || fatigueScore > 50;
    const recommendation = this.getRecommendation(isFatigued, ctrDrop, fatigueScore, c.impressions);
    const urgency = fatigueScore > 80 ? "critical" : fatigueScore > 60 ? "high" : fatigueScore > 40 ? "medium" : "low";

    return {
      creativeId: c.id,
      creativeName: c.name,
      type: c.type,
      currentCtr: parseFloat(c.ctr.toFixed(2)),
      baselineCtr: parseFloat(baselineCtr.toFixed(2)),
      ctrDropPercent: parseFloat(ctrDrop.toFixed(1)),
      isFatigued,
      fatigueScore: parseFloat(fatigueScore.toFixed(1)),
      daysSinceFirstRun: Math.round(daysSinceFirstRun),
      totalImpressions: c.impressions,
      recommendation,
      urgency,
    };
  }

  private estimateBaselineCtr(c: CreativePerformance): number {
    const typeBaselines: Record<string, number> = {
      image: 2.5,
      video: 3.0,
      carousel: 2.8,
      text: 1.5,
    };

    const platformBaselines: Record<string, number> = {
      meta: 2.0,
      google: 2.5,
      linkedin: 1.2,
      tiktok: 3.5,
      snapchat: 2.0,
      twitter: 1.5,
    };

    const typeBaseline = typeBaselines[c.type] || 2.0;
    const platformBaseline = platformBaselines[c.platform] || 2.0;
    const blended = (typeBaseline + platformBaseline) / 2;

    if (c.impressions < this.minImpressionThreshold) return blended;
    return c.ctr + c.ctr * 0.15;
  }

  private getRecommendation(
    isFatigued: boolean,
    ctrDrop: number,
    fatigueScore: number,
    impressions: number
  ): FatigueAnalysis["recommendation"] {
    if (!isFatigued) return "none";
    if (ctrDrop > 40 || fatigueScore > 80) return "pause_creative";
    if (impressions > this.maxImpressionsBeforeFatigue) return "refresh_creative";
    if (ctrDrop > 25) return "generate_variants";
    return "rotate_audience";
  }

  generateMockCreatives(): CreativePerformance[] {
    const now = Date.now();
    const day = 86400000;
    return [
      { id: "cr_1", name: "Enterprise Hero Image", type: "image", platform: "meta", impressions: 145000, clicks: 4200, ctr: 2.9, conversions: 45, revenue: 125000, spend: 15000, roas: 8.33, firstSeen: new Date(now - 45 * day), lastSeen: new Date(), variantGroup: "enterprise_v1" },
      { id: "cr_2", name: "Product Demo Video 30s", type: "video", platform: "google", impressions: 89000, clicks: 3100, ctr: 3.48, conversions: 23, revenue: 52000, spend: 8900, roas: 5.84, firstSeen: new Date(now - 30 * day), lastSeen: new Date(), variantGroup: "demo_v1" },
      { id: "cr_3", name: "Customer Success Carousel", type: "carousel", platform: "linkedin", impressions: 67000, clicks: 1900, ctr: 2.84, conversions: 12, revenue: 34000, spend: 6700, roas: 5.07, firstSeen: new Date(now - 60 * day), lastSeen: new Date(), variantGroup: "social_proof_v1" },
      { id: "cr_4", name: "Black Friday Offer", type: "image", platform: "meta", impressions: 12000, clicks: 180, ctr: 1.5, conversions: 2, revenue: 2000, spend: 3500, roas: 0.57, firstSeen: new Date(now - 5 * day), lastSeen: new Date(), variantGroup: "holiday_v1" },
      { id: "cr_5", name: "Whitepaper Download", type: "text", platform: "linkedin", impressions: 34000, clicks: 280, ctr: 0.82, conversions: 34, revenue: 85000, spend: 3400, roas: 25.0, firstSeen: new Date(now - 20 * day), lastSeen: new Date(), variantGroup: "whitepaper_v1" },
      { id: "cr_6", name: "Summer Sale Banner", type: "image", platform: "google", impressions: 98000, clicks: 980, ctr: 1.0, conversions: 8, revenue: 12000, spend: 4900, roas: 2.45, firstSeen: new Date(now - 50 * day), lastSeen: new Date(), variantGroup: "summer_v1" },
    ];
  }
}

export const creativeOptimizer = new CreativeOptimizer();
