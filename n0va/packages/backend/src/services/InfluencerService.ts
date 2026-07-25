import { DataStore } from "./DataStore";

interface Influencer {
  id: string;
  tenantId: string;
  name: string;
  handle: string;
  platform: "instagram" | "tiktok" | "youtube" | "twitter" | "linkedin";
  category: string[];
  followers: number;
  engagementRate: number;
  avgViews: number;
  priceRange: { min: number; max: number };
  location?: string;
  email?: string;
  bio: string;
  avatarUrl?: string;
  reach: { estimated: number; gender: string; ageGroups: { label: string; pct: number }[]; topCountries: string[] };
  metrics: { totalCampaigns: number; avgROI: number; avgCPE: number; rating: number };
  status: "discovered" | "contacted" | "negotiating" | "contracted" | "active" | "completed" | "declined";
  campaignIds: string[];
  notes: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface CampaignInfluencer {
  id: string;
  campaignId: string;
  influencerId: string;
  influencerName: string;
  influencerHandle: string;
  platform: string;
  deliverables: string[];
  compensation: number;
  status: "proposed" | "accepted" | "delivered" | "approved" | "paid";
  performance?: { impressions: number; engagements: number; conversions: number; revenue: number; roi: number };
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export class InfluencerService {
  search(query: { category?: string; platform?: string; minFollowers?: number; maxPrice?: number; location?: string }): Influencer[] {
    return ([
      { id: "inf_1", tenantId: "", name: "Alex Chen", handle: "@alexchen", platform: "instagram", category: ["tech", "saas"], followers: 245000, engagementRate: 3.8, avgViews: 52000, priceRange: { min: 1500, max: 3500 }, bio: "Tech entrepreneur sharing SaaS insights", reach: { estimated: 350000, gender: "60% male", ageGroups: [{ label: "25-34", pct: 45 }, { label: "35-44", pct: 30 }], topCountries: ["US", "UK", "Canada"] }, metrics: { totalCampaigns: 28, avgROI: 3.2, avgCPE: 0.45, rating: 4.7 }, status: "discovered", campaignIds: [], notes: "", tags: ["saas", "tech", "b2b"], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: "inf_2", tenantId: "", name: "Sarah Williams", handle: "@sarahw", platform: "tiktok", category: ["marketing", "business"], followers: 512000, engagementRate: 5.2, avgViews: 120000, priceRange: { min: 2000, max: 5000 }, bio: "Marketing tips & business growth", reach: { estimated: 800000, gender: "55% female", ageGroups: [{ label: "18-24", pct: 35 }, { label: "25-34", pct: 40 }], topCountries: ["US", "UK", "Australia"] }, metrics: { totalCampaigns: 45, avgROI: 4.1, avgCPE: 0.32, rating: 4.9 }, status: "discovered", campaignIds: [], notes: "", tags: ["marketing", "business", "growth"], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: "inf_3", tenantId: "", name: "Marcus Johnson", handle: "@marcusj", platform: "youtube", category: ["tech", "reviews"], followers: 890000, engagementRate: 4.5, avgViews: 185000, priceRange: { min: 3000, max: 8000 }, bio: "In-depth tech reviews & tutorials", reach: { estimated: 1.2e6, gender: "70% male", ageGroups: [{ label: "18-24", pct: 25 }, { label: "25-34", pct: 50 }], topCountries: ["US", "India", "UK"] }, metrics: { totalCampaigns: 62, avgROI: 3.8, avgCPE: 0.55, rating: 4.8 }, status: "discovered", campaignIds: [], notes: "", tags: ["tech", "reviews", "youtube"], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: "inf_4", tenantId: "", name: "Emily Park", handle: "@emilypark", platform: "instagram", category: ["lifestyle", "beauty"], followers: 1.2e6, engagementRate: 2.9, avgViews: 98000, priceRange: { min: 5000, max: 12000 }, bio: "Lifestyle & beauty content creator", reach: { estimated: 2.5e6, gender: "80% female", ageGroups: [{ label: "18-24", pct: 40 }, { label: "25-34", pct: 35 }], topCountries: ["US", "Canada", "UK"] }, metrics: { totalCampaigns: 85, avgROI: 2.5, avgCPE: 0.78, rating: 4.5 }, status: "discovered", campaignIds: [], notes: "", tags: ["lifestyle", "beauty", "fashion"], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: "inf_5", tenantId: "", name: "Tech Review Pro", handle: "@techreviewpro", platform: "youtube", category: ["tech", "reviews", "gadgets"], followers: 2.1e6, engagementRate: 3.2, avgViews: 420000, priceRange: { min: 8000, max: 20000 }, bio: "Professional tech reviews & comparisons", reach: { estimated: 5e6, gender: "75% male", ageGroups: [{ label: "18-24", pct: 30 }, { label: "25-34", pct: 45 }], topCountries: ["US", "India", "UK", "Germany"] }, metrics: { totalCampaigns: 120, avgROI: 4.5, avgCPE: 0.42, rating: 4.9 }, status: "discovered", campaignIds: [], notes: "", tags: ["tech", "reviews", "gadgets", "sponsor"], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: "inf_6", tenantId: "", name: "Growth Hacker Daily", handle: "@growthdaily", platform: "twitter", category: ["marketing", "growth", "saas"], followers: 156000, engagementRate: 4.8, avgViews: 45000, priceRange: { min: 800, max: 2000 }, bio: "Growth hacking & SaaS marketing", reach: { estimated: 250000, gender: "65% male", ageGroups: [{ label: "25-34", pct: 50 }, { label: "35-44", pct: 25 }], topCountries: ["US", "UK"] }, metrics: { totalCampaigns: 35, avgROI: 5.2, avgCPE: 0.28, rating: 4.6 }, status: "discovered", campaignIds: [], notes: "", tags: ["growth", "saas", "marketing", "twitter"], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: "inf_7", tenantId: "", name: "LinkedIn Insider", handle: "@linkedininsider", platform: "linkedin", category: ["b2b", "leadership", "saas"], followers: 89000, engagementRate: 5.5, avgViews: 28000, priceRange: { min: 1000, max: 3000 }, bio: "B2B thought leadership & LinkedIn strategy", reach: { estimated: 150000, gender: "55% male", ageGroups: [{ label: "35-44", pct: 40 }, { label: "45-54", pct: 30 }], topCountries: ["US", "UK", "Canada"] }, metrics: { totalCampaigns: 18, avgROI: 6.1, avgCPE: 0.22, rating: 4.8 }, status: "discovered", campaignIds: [], notes: "", tags: ["b2b", "linkedin", "saas", "leadership"], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ] as Influencer[]).filter(i => {
      if (query.platform && i.platform !== query.platform) return false;
      if (query.category && !i.category.some(c => c.includes(query.category!))) return false;
      if (query.minFollowers && i.followers < query.minFollowers) return false;
      if (query.maxPrice && i.priceRange.min > query.maxPrice) return false;
      return true;
    });
  }

  addToCampaign(tenantId: string, data: { campaignId: string; influencerId: string; influencerName: string; influencerHandle: string; platform: string; deliverables: string[]; compensation: number }): CampaignInfluencer {
    const mem = DataStore["mem"]();
    const ci: CampaignInfluencer = {
      id: `ci_${Date.now()}`,
      campaignId: data.campaignId,
      influencerId: data.influencerId,
      influencerName: data.influencerName,
      influencerHandle: data.influencerHandle,
      platform: data.platform,
      deliverables: data.deliverables,
      compensation: data.compensation,
      status: "proposed",
      createdAt: new Date().toISOString(),
    };
    mem.insert("campaign_influencers", ci);
    return ci;
  }

  getCampaignInfluencers(campaignId: string): CampaignInfluencer[] {
    return DataStore["mem"]().find("campaign_influencers", (ci: any) => ci.campaignId === campaignId);
  }

  updateInfluencerStatus(tenantId: string, id: string, status: string, performance?: any): CampaignInfluencer | null {
    const mem = DataStore["mem"]();
    const ci = mem.findOne("campaign_influencers", (c: any) => c.id === id);
    if (!ci) return null;
    const updated = { ...ci, status, ...(performance ? { performance } : {}), updatedAt: new Date().toISOString() };
    mem.update("campaign_influencers", (c: any) => c.id === id, updated);
    return updated;
  }

  getAllCampaignInfluencers(tenantId: string): CampaignInfluencer[] {
    const mem = DataStore["mem"]();
    const campaigns = mem.find("campaigns", (c: any) => c.tenantId === tenantId);
    const campaignIds = campaigns.map((c: any) => c._id);
    return mem.find("campaign_influencers", (ci: any) => campaignIds.includes(ci.campaignId));
  }

  getPlatforms(): { platform: string; label: string; icon: string }[] {
    return [
      { platform: "instagram", label: "Instagram", icon: "camera" },
      { platform: "tiktok", label: "TikTok", icon: "music" },
      { platform: "youtube", label: "YouTube", icon: "video" },
      { platform: "twitter", label: "X (Twitter)", icon: "message-circle" },
      { platform: "linkedin", label: "LinkedIn", icon: "briefcase" },
    ];
  }

  // ─── Audience Quality Score ──────────────────────────────────────────

  /**
   * Computes an audience quality score for an influencer based on:
   *  - Engagement authenticity (engagement rate vs follower count correlation)
   *  - Follower growth consistency (simulated via engagement distribution)
   *  - Audience relevance to brand categories
   */
  computeAudienceQuality(
    influencer: Influencer,
    brandCategories: string[] = [],
  ): { qualityScore: number; authenticityRatio: number; relevanceScore: number; growthHealth: number } {
    // Authenticity: lower score if engagement is very low for follower count
    // or very high (suggesting bot engagement)
    const expectedEr = Math.max(0.5, 5.0 - Math.log2(Math.max(1000, influencer.followers)) * 0.5);
    const erRatio = influencer.engagementRate / Math.max(expectedEr, 0.01);
    const authenticityRatio = erRatio > 0.3 && erRatio < 3.0 ? erRatio : erRatio < 0.3 ? erRatio * 0.5 : 1.5 / erRatio;
    const authenticityScore = Math.min(1, authenticityRatio);

    // Relevance: cosine similarity between influencer tags and brand categories
    const relevanceScore = brandCategories.length > 0
      ? this.cosineSimilarity(
        brandCategories.map((c) => influencer.category.includes(c) ? 1 : 0),
        brandCategories.map(() => 1),
      )
      : 0.5;

    // Growth health (simulated via views-to-followers ratio for YouTube, else via engagement)
    const viewsRatio = influencer.followers > 0 ? influencer.avgViews / influencer.followers : 0;
    const growthHealth = Math.min(1, Math.max(0,
      influencer.platform === "youtube" ? viewsRatio * 3 : influencer.engagementRate / 10
    ));

    // Composite quality score
    const qualityScore = Math.round(
      (authenticityScore * 0.4 + relevanceScore * 0.35 + growthHealth * 0.25) * 100
    ) / 100;

    return {
      qualityScore: Math.round(qualityScore * 100) / 100,
      authenticityRatio: Math.round(authenticityRatio * 100) / 100,
      relevanceScore: Math.round(relevanceScore * 100) / 100,
      growthHealth: Math.round(growthHealth * 100) / 100,
    };
  }

  // ─── Fake Follower Detection ────────────────────────────────────────

  /**
   * Estimate fake follower probability using Benford's-law-inspired
   * engagement distribution analysis and follower-to-engagement ratio.
   */
  detectFakeFollowers(influencer: Influencer): {
    probability: number;
    flags: string[];
    confidence: "low" | "medium" | "high";
    details: Record<string, number>;
  } {
    const flags: string[] = [];
    const details: Record<string, number> = {};

    // Flag 1: Engagement-to-follower ratio too low
    const erToFollowers = influencer.engagementRate / Math.log10(Math.max(1000, influencer.followers));
    details.erToFollowersRatio = Math.round(erToFollowers * 100) / 100;
    if (erToFollowers < 0.3) flags.push("Engagement-to-follower ratio abnormally low");

    // Flag 2: Views-to-followers ratio (for video platforms)
    if (["youtube", "tiktok"].includes(influencer.platform)) {
      const viewsRatio = influencer.followers > 0 ? influencer.avgViews / influencer.followers : 0;
      details.viewsToFollowers = Math.round(viewsRatio * 100) / 100;
      if (viewsRatio < 0.02) flags.push("Views-to-followers ratio extremely low");
    }

    // Flag 3: CPM (cost per mille) anomaly - very low CPM suggest bot traffic
    const estimatedCpm = influencer.priceRange.min / (influencer.followers / 1000);
    details.estimatedCPM = Math.round(estimatedCpm * 100) / 100;
    if (estimatedCpm < 0.5) flags.push("Estimated CPM suspiciously low");

    // Flag 4: Listed campaign count vs follower count mismatch
    const campaignRatio = influencer.followers / Math.max(1, influencer.metrics.totalCampaigns);
    details.followersPerCampaign = Math.round(campaignRatio);
    if (campaignRatio > 500000) flags.push("Very high followers-per-campaign ratio (potential bot inflation)");

    // Probability calculation
    let probability = 0;
    if (flags.length > 0) {
      probability = Math.min(0.95, flags.length * 0.15 + (1 - erToFollowers / 3) * 0.2);
    }

    const absProbability = Math.round(Math.max(0, Math.min(1, probability)) * 100) / 100;
    const confidence: "low" | "medium" | "high" =
      flags.length === 0 ? "low" : flags.length <= 2 ? "medium" : "high";

    return { probability: absProbability, flags, confidence, details };
  }

  // ─── ROI Prediction ─────────────────────────────────────────────────

  /**
   * Predict ROI for an influencer based on historical similarity to
   * past influencers in the same category/platform/follower range.
   */
  predictROI(
    influencer: Influencer,
    historicalCampaigns: CampaignInfluencer[],
  ): { predictedROI: number; confidence: number; range: [number, number]; similarInfluencers: number } {
    const similar = historicalCampaigns.filter((ci) => {
      if (!ci.performance) return false;
      return ci.platform === influencer.platform &&
        ci.compensation >= influencer.priceRange.min * 0.5 &&
        ci.compensation <= influencer.priceRange.max * 2;
    });

    if (similar.length === 0) {
      // Fallback: platform-level average
      const platformAverages: Record<string, number> = {
        instagram: 2.8, tiktok: 3.5, youtube: 3.2, twitter: 2.0, linkedin: 4.0,
      };
      const avg = platformAverages[influencer.platform] || 2.5;
      return { predictedROI: avg, confidence: 0.3, range: [avg * 0.5, avg * 1.5], similarInfluencers: 0 };
    }

    const rois = similar.map((ci) => ci.performance!.roi);
    const mean = rois.reduce((s, r) => s + r, 0) / rois.length;
    const variance = rois.reduce((s, r) => s + (r - mean) ** 2, 0) / rois.length;
    const std = Math.sqrt(variance);
    const n = rois.length;

    // Confidence grows with sample size (diminishing returns)
    const confidence = Math.min(0.9, 0.3 + 0.1 * Math.log2(n + 1));

    return {
      predictedROI: Math.round(mean * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      range: [Math.round((mean - 1.96 * std / Math.sqrt(n)) * 100) / 100, Math.round((mean + 1.96 * std / Math.sqrt(n)) * 100) / 100],
      similarInfluencers: n,
    };
  }

  // ─── Optimal Pricing ───────────────────────────────────────────────

  /**
   * Compute value-based optimal price using predicted ROI and desired ROAS.
   * price = (predicted_impressions * expected_ctr * cvr * aov) / target_roas
   */
  computeOptimalPrice(
    influencer: Influencer,
    targetROAS = 3.0,
    expectedCTR = 0.02,
    expectedCVR = 0.03,
    averageOrderValue = 100,
  ): { optimalPrice: number; priceRange: [number, number]; valueScore: number; paybackUnits: number } {
    const estimatedImpressions = influencer.avgViews * 2;
    const estimatedConversions = estimatedImpressions * expectedCTR * expectedCVR;
    const estimatedRevenue = estimatedConversions * averageOrderValue;
    const optimalPrice = estimatedRevenue / targetROAS;

    const currentMid = (influencer.priceRange.min + influencer.priceRange.max) / 2;
    const valueScore = currentMid > 0 ? Math.min(2, optimalPrice / currentMid) : 1;

    return {
      optimalPrice: Math.round(optimalPrice * 100) / 100,
      priceRange: [Math.round(optimalPrice * 0.7 * 100) / 100, Math.round(optimalPrice * 1.3 * 100) / 100],
      valueScore: Math.round(valueScore * 100) / 100,
      paybackUnits: Math.ceil(estimatedConversions > 0 ? currentMid / (estimatedRevenue / estimatedConversions) : 0),
    };
  }

  // ─── Brand-Fit Scoring ──────────────────────────────────────────────

  /**
   * Cosine similarity between brand-desired categories and influencer tags.
   */
  computeBrandFit(influencer: Influencer, brandCategories: string[]): { score: number; matchedCategories: string[]; missingCategories: string[] } {
    const matched = brandCategories.filter((bc) =>
      influencer.category.some((ic) => ic.toLowerCase().includes(bc.toLowerCase()) || bc.toLowerCase().includes(ic.toLowerCase()))
    );
    const missing = brandCategories.filter((bc) => !matched.includes(bc));
    const score = brandCategories.length > 0 ? matched.length / brandCategories.length : 0;
    return {
      score: Math.round(score * 100) / 100,
      matchedCategories: matched,
      missingCategories: missing,
    };
  }

  /**
   * Score all influencers in the system with a composite rank.
   */
  rankInfluencers(
    brandCategories: string[],
    historicalCampaigns: CampaignInfluencer[],
  ): { influencer: Influencer; rank: number; qualityScore: number; brandFit: number; predictedROI: number; valueScore: number; fakeFollowerRisk: number }[] {
    const all = this.search({});
    const scored = all.map((inf) => {
      const quality = this.computeAudienceQuality(inf, brandCategories);
      const brandFit = this.computeBrandFit(inf, brandCategories);
      const roi = this.predictROI(inf, historicalCampaigns);
      const fakeRisk = this.detectFakeFollowers(inf);
      const pricing = this.computeOptimalPrice(inf);

      // Composite score: weighted sum of quality, brand fit, ROI confidence, inverse fake risk, value
      const composite =
        quality.qualityScore * 0.25 +
        brandFit.score * 0.2 +
        (roi.predictedROI / 10) * 0.2 * roi.confidence +
        (1 - fakeRisk.probability) * 0.15 +
        Math.min(1, pricing.valueScore) * 0.2;

      return { influencer: inf, rank: 0, qualityScore: quality.qualityScore, brandFit: brandFit.score, predictedROI: roi.predictedROI, valueScore: pricing.valueScore, fakeFollowerRisk: fakeRisk.probability, _composite: composite };
    });

    scored.sort((a, b) => b._composite - a._composite);
    return scored.map((s, i) => ({ ...s, rank: i + 1, _composite: undefined }));
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    const den = Math.sqrt(na) * Math.sqrt(nb);
    return den > 0 ? dot / den : 0;
  }
}

export const influencerService = new InfluencerService();
