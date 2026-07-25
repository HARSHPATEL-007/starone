import { DataStore } from "./DataStore";

export class AudienceInsightsService {
  getInsights(tenantId: string, audienceId?: string) {
    const mem = DataStore["mem"]();
    const audiences = audienceId
      ? [mem.findOne("audiences", (a: any) => a._id === audienceId)].filter(Boolean)
      : mem.find("audiences", (a: any) => a.tenantId === tenantId);

    const campaigns = mem.find("campaigns", (c: any) => c.tenantId === tenantId);

    const demographics = {
      ageGroups: [
        { label: "18-24", percentage: 22, size: 45000, ctr: 2.8, cvr: 3.2 },
        { label: "25-34", percentage: 35, size: 72000, ctr: 3.4, cvr: 4.1 },
        { label: "35-44", percentage: 24, size: 49000, ctr: 2.9, cvr: 3.8 },
        { label: "45-54", percentage: 13, size: 27000, ctr: 2.1, cvr: 2.5 },
        { label: "55+", percentage: 6, size: 12000, ctr: 1.5, cvr: 1.8 },
      ],
      genders: [
        { label: "Male", percentage: 48, ctr: 2.9, cvr: 3.1 },
        { label: "Female", percentage: 50, ctr: 3.2, cvr: 3.9 },
        { label: "Other", percentage: 2, ctr: 2.5, cvr: 2.8 },
      ],
      income: [
        { label: "< $25K", percentage: 12, size: 18000 },
        { label: "$25K - $50K", percentage: 28, size: 42000 },
        { label: "$50K - $75K", percentage: 32, size: 48000 },
        { label: "$75K - $100K", percentage: 18, size: 27000 },
        { label: "$100K+", percentage: 10, size: 15000 },
      ],
    };

    const geoDistribution = [
      { region: "North America", percentage: 42, impressions: 320000, conversions: 4800 },
      { region: "Europe", percentage: 28, impressions: 210000, conversions: 2900 },
      { region: "Asia Pacific", percentage: 18, impressions: 135000, conversions: 1600 },
      { region: "Latin America", percentage: 8, impressions: 60000, conversions: 700 },
      { region: "Middle East & Africa", percentage: 4, impressions: 30000, conversions: 300 },
    ];

    const deviceBreakdown = [
      { device: "Mobile", percentage: 62, ctr: 3.5, cvr: 4.2 },
      { device: "Desktop", percentage: 28, ctr: 2.8, cvr: 3.5 },
      { device: "Tablet", percentage: 10, ctr: 2.2, cvr: 2.8 },
    ];

    const interests = [
      { category: "Technology", affinity: 85, reach: 95000 },
      { category: "Business & Finance", affinity: 72, reach: 82000 },
      { category: "Software Development", affinity: 68, reach: 74000 },
      { category: "Digital Marketing", affinity: 65, reach: 71000 },
      { category: "SaaS", affinity: 60, reach: 65000 },
      { category: "AI & Machine Learning", affinity: 55, reach: 58000 },
      { category: "eCommerce", affinity: 48, reach: 52000 },
      { category: "Startups", affinity: 45, reach: 48000 },
    ];

    const lookalikeSuggestions = [
      { id: "la_1", name: "High-Value Converters Lookalike", sourceAudience: "Top 10% Converters", estimatedReach: 85000, matchRate: 88, similarity: 0.92 },
      { id: "la_2", name: "Engaged Users Expansion", sourceAudience: "Last 30 Day Engagers", estimatedReach: 120000, matchRate: 76, similarity: 0.84 },
      { id: "la_3", name: "Cart Abandoners LAL", sourceAudience: "Cart Abandoners", estimatedReach: 65000, matchRate: 82, similarity: 0.88 },
      { id: "la_4", name: "Newsletter Subscribers Lookalike", sourceAudience: "Email Subscribers", estimatedReach: 95000, matchRate: 79, similarity: 0.86 },
    ];

    const audiencePerformance = audiences.map((aud: any) => {
      const campMatch = campaigns.filter((c: any) => c._id === aud.campaignId || (aud.tags || []).some((t: string) => (c.tags || []).includes(t)));
      const totalSpend = campMatch.reduce((s: number, c: any) => s + (c.budget?.spent || 0), 0);
      return {
        id: aud._id,
        name: aud.name,
        type: aud.type || "custom",
        size: aud.size || Math.floor(Math.random() * 50000) + 10000,
        reach: Math.floor((aud.size || 50000) * 0.7),
        engagement: (Math.random() * 5 + 2).toFixed(1),
        conversionRate: (Math.random() * 4 + 1).toFixed(1),
        cpa: Math.floor(Math.random() * 40) + 15,
        spend: totalSpend,
        campaigns: campMatch.length,
      };
    });

    // Run k-means clustering on audience performance data
    const segments = this.kMeansClustering(audiencePerformance, 3);

    // Compute overlap scores between all audience pairs
    const overlaps = this.computeSegmentOverlap(audiences);

    // Compute propensity scores for each audience
    const propensities = audiences.map((aud: any) => this.computePropensityScore(aud, campaigns));

    return {
      demographics,
      geoDistribution,
      deviceBreakdown,
      interests,
      lookalikeSuggestions,
      audiencePerformance,
      totalAudiences: audiences.length,
      totalReach: audiences.reduce((s: number, a: any) => s + (a.size || 0), 0),
      topAudience: audiences.sort((a: any, b: any) => (b.size || 0) - (a.size || 0))[0]?.name || "None",
      _clusters: segments,
      _overlaps: overlaps,
      _propensities: propensities,
    };
  }

  getLookalikeInsights(tenantId: string) {
    const insights = this.getInsights(tenantId);
    return {
      suggestions: insights.lookalikeSuggestions,
      recommendation: "Create a lookalike audience from your top 10% of converters to reach new users with similar behavior patterns. Expected match rate: 82-88%.",
    };
  }

  // ─── K-Means Clustering ─────────────────────────────────────────────

  /**
   * Segment audiences into k clusters based on engagement, conversion rate, CPA, and spend.
   * Uses k-means++ initialization for better centroid seeding.
   */
  kMeansClustering(
    audiences: any[],
    k: number,
    maxIterations = 50,
  ): { clusters: number[]; centroids: number[][]; inertia: number; silhouetteScore: number } {
    if (audiences.length < k) {
      return { clusters: audiences.map(() => 0), centroids: [], inertia: 0, silhouetteScore: 0 };
    }

    // Normalize features: [engagement, conversionRate, inverse(1/cpa), spend/1000]
    const raw = audiences.map((a) => [
      parseFloat(a.engagement) || 0,
      parseFloat(a.conversionRate) || 0,
      1 / Math.max(1, a.cpa || 1),
      (a.spend || 0) / 1000,
    ]);

    const n = raw.length;
    const dim = raw[0].length;

    // Min-max normalize
    const mins = Array(dim).fill(Infinity);
    const maxs = Array(dim).fill(-Infinity);
    for (const row of raw) {
      for (let j = 0; j < dim; j++) {
        if (row[j] < mins[j]) mins[j] = row[j];
        if (row[j] > maxs[j]) maxs[j] = row[j];
      }
    }
    const data = raw.map((row) => row.map((v, j) => (maxs[j] > mins[j] ? (v - mins[j]) / (maxs[j] - mins[j]) : 0)));

    // k-means++ initialization
    const centroids: number[][] = [];
    const firstIdx = Math.floor(Math.random() * n);
    centroids.push([...data[firstIdx]]);

    for (let c = 1; c < k; c++) {
      const dists = data.map((point) => {
        const minDist = centroids.reduce((minD, cent) => {
          const d = this.euclidean(point, cent);
          return Math.min(minD, d);
        }, Infinity);
        return minDist * minDist;
      });
      const totalDist = dists.reduce((s, d) => s + d, 0);
      let r = Math.random() * totalDist;
      let idx = 0;
      for (; idx < dists.length; idx++) {
        r -= dists[idx];
        if (r <= 0) break;
      }
      centroids.push([...data[Math.min(idx, n - 1)]]);
    }

    // Iterate
    const assignments = Array(n).fill(0);
    for (let iter = 0; iter < maxIterations; iter++) {
      // Assign
      let changed = false;
      for (let i = 0; i < n; i++) {
        let bestDist = Infinity;
        let bestC = 0;
        for (let c = 0; c < k; c++) {
          const d = this.euclidean(data[i], centroids[c]);
          if (d < bestDist) { bestDist = d; bestC = c; }
        }
        if (assignments[i] !== bestC) changed = true;
        assignments[i] = bestC;
      }
      if (!changed) break;

      // Recompute centroids
      for (let c = 0; c < k; c++) {
        const members = data.filter((_, i) => assignments[i] === c);
        if (members.length > 0) {
          for (let j = 0; j < dim; j++) {
            centroids[c][j] = members.reduce((s, m) => s + m[j], 0) / members.length;
          }
        }
      }
    }

    // Inertia (within-cluster sum of squares)
    let inertia = 0;
    for (let i = 0; i < n; i++) {
      inertia += this.euclidean(data[i], centroids[assignments[i]]) ** 2;
    }

    // Silhouette score (sampled for performance)
    const sampleSize = Math.min(n, 100);
    let silhouetteSum = 0;
    for (let ii = 0; ii < sampleSize; ii++) {
      const i = Math.floor(Math.random() * n);
      const cluster = assignments[i];
      const sameCluster = data.filter((_, idx) => assignments[idx] === cluster && idx !== i);
      const otherClusters: number[][] = [];
      for (let c = 0; c < k; c++) {
        if (c === cluster) continue;
        otherClusters.push(...data.filter((_, idx) => assignments[idx] === c));
      }
      const a = sameCluster.length > 0
        ? sameCluster.reduce((s, p) => s + this.euclidean(data[i], p), 0) / sameCluster.length
        : 0;
      const b = otherClusters.length > 0
        ? otherClusters.reduce((s, p) => s + this.euclidean(data[i], p), 0) / otherClusters.length
        : 0;
      silhouetteSum += (b - a) / Math.max(a, b, 0.001);
    }
    const silhouetteScore = silhouetteSum / sampleSize;

    return {
      clusters: assignments,
      centroids,
      inertia: Math.round(inertia * 1000) / 1000,
      silhouetteScore: Math.round(silhouetteScore * 1000) / 1000,
    };
  }

  // ─── Segment Overlap Analysis ───────────────────────────────────────

  /**
   * Jaccard similarity between every pair of audiences based on tag overlap.
   */
  computeSegmentOverlap(audiences: any[]): { pair: [string, string]; jaccard: number; overlapSize: number; unionSize: number }[] {
    const results: { pair: [string, string]; jaccard: number; overlapSize: number; unionSize: number }[] = [];
    for (let i = 0; i < audiences.length; i++) {
      for (let j = i + 1; j < audiences.length; j++) {
        const tagsA = new Set(audiences[i].tags || []);
        const tagsB = new Set(audiences[j].tags || []);
        const intersection = new Set([...tagsA].filter((t) => tagsB.has(t)));
        const union = new Set([...tagsA, ...tagsB]);
        const jaccard = union.size > 0 ? intersection.size / union.size : 0;
        if (jaccard > 0) {
          results.push({
            pair: [audiences[i].name || audiences[i]._id, audiences[j].name || audiences[j]._id],
            jaccard: Math.round(jaccard * 1000) / 1000,
            overlapSize: intersection.size,
            unionSize: union.size,
          });
        }
      }
    }
    return results.sort((a, b) => b.jaccard - a.jaccard);
  }

  // ─── Propensity Scoring ─────────────────────────────────────────────

  /**
   * Compute a conversion propensity score for an audience based on
   * past campaign performance with similar tags. Uses Bayesian
   * shrinkage for small-sample reliability.
   */
  computePropensityScore(
    audience: any,
    campaigns: any[],
  ): { audienceId: string; name: string; propensity: number; confidence: number; similarCampaigns: number; factorBreakdown: { tag: string; contribution: number }[] } {
    const tags = audience.tags || [];
    const factors: { tag: string; contribution: number }[] = [];

    let weightedScore = 0;
    let totalWeight = 0;

    for (const tag of tags) {
      const matching = campaigns.filter((c: any) =>
        (c.tags || []).includes(tag) ||
        (c.name || "").toLowerCase().includes(tag.toLowerCase())
      );
      const count = matching.length;
      if (count === 0) continue;
      const avgCvr = matching.reduce((s: number, c: any) => {
        const metrics = c.metrics || {};
        const clicks = metrics.clicks || 0;
        const conv = metrics.conversions || 0;
        return s + (clicks > 0 ? conv / clicks : 0);
      }, 0) / count;
      const weight = Math.log2(count + 1);
      // Bayesian shrinkage toward global mean
      const globalMean = 0.03;
      const shrinkage = count / (count + 5);
      const posterior = shrinkage * avgCvr + (1 - shrinkage) * globalMean;
      weightedScore += posterior * weight;
      totalWeight += weight;
      factors.push({ tag, contribution: Math.round(posterior * 10000) / 100 });
    }

    const propensity = totalWeight > 0 ? weightedScore / totalWeight : 0.03;
    const confidence = Math.min(1, campaigns.length / 20);

    return {
      audienceId: audience._id || "unknown",
      name: audience.name || "Unknown",
      propensity: Math.round(propensity * 10000) / 100,
      confidence: Math.round(confidence * 100) / 100,
      similarCampaigns: factors.length,
      factorBreakdown: factors,
    };
  }

  // ─── Euclidean Distance ─────────────────────────────────────────────

  private euclidean(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
    return Math.sqrt(sum);
  }
}

export const audienceInsightsService = new AudienceInsightsService();
