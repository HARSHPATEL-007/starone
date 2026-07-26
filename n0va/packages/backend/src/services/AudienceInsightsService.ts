import { DataStore } from "./DataStore";

export interface RFMScore {
  customerId: string;
  recency: number;
  frequency: number;
  monetary: number;
  rScore: number;
  fScore: number;
  mScore: number;
  rfmSegment: string;
  compositeScore: number;
}

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

  // ─── PCA Dimensionality Reduction ──────────────────────────────────────

  pca(
    data: number[][],
    nComponents: number = 2,
  ): { projected: number[][]; explainedVariance: number[]; loadings: number[][]; mean: number[] } {
    const n = data.length;
    const dim = data[0].length;
    const mean = Array(dim).fill(0);
    for (let j = 0; j < dim; j++) {
      for (let i = 0; i < n; i++) mean[j] += data[i][j];
      mean[j] /= n;
    }
    const centered = data.map((row) => row.map((v, j) => v - mean[j]));
    const cov: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));
    for (let i = 0; i < dim; i++) {
      for (let j = i; j < dim; j++) {
        let s = 0;
        for (let k = 0; k < n; k++) s += centered[k][i] * centered[k][j];
        cov[i][j] = s / (n - 1);
        cov[j][i] = cov[i][j];
      }
    }
    const eig = this.powerIteration(cov, nComponents);
    const projected = data.map((row) => {
      const proj: number[] = [];
      for (let c = 0; c < nComponents; c++) {
        let val = 0;
        for (let j = 0; j < dim; j++) val += (row[j] - mean[j]) * (eig.vectors[c]?.[j] ?? 0);
        proj.push(Math.round(val * 10000) / 10000);
      }
      return proj;
    });
    return { projected, explainedVariance: eig.values.map((v) => Math.round(v * 10000) / 100), loadings: eig.vectors, mean };
  }

  private powerIteration(matrix: number[][], k: number): { values: number[]; vectors: number[][] } {
    const n = matrix.length;
    const values: number[] = [];
    const vectors: number[][] = [];
    let residual = matrix.map((row) => [...row]);
    for (let comp = 0; comp < k; comp++) {
      let v = Array(n).fill(0).map(() => Math.random() * 2 - 1);
      let prevLambda = 0;
      for (let iter = 0; iter < 100; iter++) {
        const vNew = Array(n).fill(0);
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) vNew[i] += residual[i][j] * v[j];
        }
        const norm = Math.sqrt(vNew.reduce((s, x) => s + x * x, 0));
        if (norm > 1e-10) for (let i = 0; i < n; i++) v[i] = vNew[i] / norm;
        const lambda = vNew.reduce((s, x, i) => s + x * v[i], 0);
        if (Math.abs(lambda - prevLambda) < 1e-8) break;
        prevLambda = lambda;
      }
      const eigenvalue = v.reduce((s, x, i) => s + x * residual[0].reduce((ss, _, j) => ss + residual[i][j] * v[j], 0), 0);
      values.push(Math.abs(eigenvalue));
      vectors.push([...v]);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          residual[i][j] -= eigenvalue * v[i] * v[j];
        }
      }
    }
    return { values, vectors };
  }

  // ─── GMM Clustering ────────────────────────────────────────────────────

  gmmClustering(
    data: number[][],
    k: number,
    maxIterations: number = 100,
  ): { assignments: number[]; means: number[][]; covariances: number[][][]; weights: number[]; logLikelihood: number; bic: number } {
    const n = data.length;
    const dim = data[0].length;
    const kmeansInit = this.kMeansClustering(data.map((_, i) => ({ size: 1, _id: `p_${i}`, name: "", engagement: data[i][0], conversionRate: data[i][1], cpa: data[i][2] || 10, spend: (data[i][3] || 0) * 1000 })), k);
    const means: number[][] = Array.from({ length: k }, () => Array(dim).fill(0));
    for (let c = 0; c < k; c++) {
      const clusterPoints = data.filter((_, i) => kmeansInit.clusters[i] === c);
      if (clusterPoints.length > 0) {
        for (let j = 0; j < dim; j++) {
          means[c][j] = clusterPoints.reduce((s, p) => s + p[j], 0) / clusterPoints.length;
        }
      } else {
        means[c] = data[Math.floor(Math.random() * n)].map((v) => v);
      }
    }
    const covariances: number[][][] = Array.from({ length: k }, () => Array.from({ length: dim }, () => Array(dim).fill(0)));
    for (let c = 0; c < k; c++) {
      for (let i = 0; i < dim; i++) covariances[c][i][i] = 1;
    }
    const weights: number[] = Array(k).fill(1 / k);
    const responsibilities: number[][] = Array.from({ length: n }, () => Array(k).fill(0));

    for (let iter = 0; iter < maxIterations; iter++) {
      for (let i = 0; i < n; i++) {
        let totalResp = 0;
        for (let c = 0; c < k; c++) {
          const prob = this.gaussianPDF(data[i], means[c], covariances[c]);
          responsibilities[i][c] = weights[c] * prob;
          totalResp += responsibilities[i][c];
        }
        if (totalResp > 0) {
          for (let c = 0; c < k; c++) responsibilities[i][c] /= totalResp;
        }
      }
      for (let c = 0; c < k; c++) {
        let nC = 0;
        for (let i = 0; i < n; i++) nC += responsibilities[i][c];
        weights[c] = nC / n;
        if (nC < 1e-10) continue;
        for (let j = 0; j < dim; j++) {
          let sum = 0;
          for (let i = 0; i < n; i++) sum += responsibilities[i][c] * data[i][j];
          means[c][j] = sum / nC;
        }
        for (let i2 = 0; i2 < dim; i2++) {
          for (let j2 = 0; j2 < dim; j2++) {
            let sum = 0;
            for (let i = 0; i < n; i++) {
              sum += responsibilities[i][c] * (data[i][i2] - means[c][i2]) * (data[i][j2] - means[c][j2]);
            }
            covariances[c][i2][j2] = sum / nC + 1e-6;
          }
        }
      }
    }

    const assignments = data.map((_, i) => {
      let maxResp = -1;
      let bestC = 0;
      for (let c = 0; c < k; c++) {
        if (responsibilities[i][c] > maxResp) { maxResp = responsibilities[i][c]; bestC = c; }
      }
      return bestC;
    });

    let logLikelihood = 0;
    for (let i = 0; i < n; i++) {
      let total = 0;
      for (let c = 0; c < k; c++) {
        total += weights[c] * this.gaussianPDF(data[i], means[c], covariances[c]);
      }
      logLikelihood += Math.log(Math.max(total, 1e-300));
    }
    const numParams = k * dim + k * dim * dim + k - 1;
    const bic = -2 * logLikelihood + numParams * Math.log(n);

    return { assignments, means, covariances, weights, logLikelihood: Math.round(logLikelihood * 100) / 100, bic: Math.round(bic * 100) / 100 };
  }

  private gaussianPDF(x: number[], mean: number[], cov: number[][]): number {
    const dim = x.length;
    const diff = x.map((v, i) => v - mean[i]);
    let det = 1;
    const L: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = 0;
        for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
        if (i === j) L[i][j] = Math.sqrt(Math.max(cov[i][i] - sum, 1e-10));
        else L[i][j] = (cov[i][j] - sum) / L[j][j];
      }
    }
    for (let i = 0; i < dim; i++) det *= L[i][i];
    det = det * det;
    const inv: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) {
        let sum = 0;
        for (let k = 0; k < Math.min(i, j); k++) sum += L[j][k] * inv[i][k];
        inv[i][j] = (i === j ? 1 : 0) - sum;
      }
    }
    for (let i = dim - 1; i >= 0; i--) {
      for (let j = dim - 1; j >= 0; j--) {
        let sum = 0;
        for (let k = i + 1; k < dim; k++) sum += L[k][i] * inv[k][j];
        inv[i][j] = (inv[i][j] - sum) / L[i][i];
      }
    }
    let exponent = 0;
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) {
        exponent += diff[i] * inv[i][j] * diff[j];
      }
    }
    const coef = 1 / Math.sqrt(Math.pow(2 * Math.PI, dim) * Math.max(det, 1e-10));
    return coef * Math.exp(-0.5 * exponent);
  }

  // ─── RFM Scoring ───────────────────────────────────────────────────────

  computeRFM(
    customers: { id: string; daysSinceLastPurchase: number; purchaseCount: number; totalSpent: number }[],
  ): RFMScore[] {
    const rVals = customers.map((c) => c.daysSinceLastPurchase);
    const fVals = customers.map((c) => c.purchaseCount);
    const mVals = customers.map((c) => c.totalSpent);

    const rQuintiles = this.quintileBreakpoints(rVals, true);
    const fQuintiles = this.quintileBreakpoints(fVals);
    const mQuintiles = this.quintileBreakpoints(mVals);

    return customers.map((c) => {
      const rScore = this.scoreQuintile(c.daysSinceLastPurchase, rQuintiles, true);
      const fScore = this.scoreQuintile(c.purchaseCount, fQuintiles);
      const mScore = this.scoreQuintile(c.totalSpent, mQuintiles);
      const composite = rScore + fScore + mScore;

      let rfmSegment: string;
      if (composite >= 13) rfmSegment = "Champions";
      else if (composite >= 10) rfmSegment = "Loyal";
      else if (composite >= 7) rfmSegment = "Potential";
      else if (composite >= 4) rfmSegment = "Needs Attention";
      else rfmSegment = "At Risk";

      return {
        customerId: c.id, recency: c.daysSinceLastPurchase, frequency: c.purchaseCount,
        monetary: c.totalSpent, rScore, fScore, mScore, rfmSegment, compositeScore: composite,
      };
    });
  }

  private quintileBreakpoints(values: number[], reversed: boolean = false): number[] {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const breaks: number[] = [];
    for (let q = 1; q <= 4; q++) {
      const idx = Math.floor((q / 5) * n);
      breaks.push(sorted[Math.min(idx, n - 1)]);
    }
    return reversed ? breaks.reverse() : breaks;
  }

  private scoreQuintile(value: number, breakpoints: number[], reversed: boolean = false): number {
    for (let i = 0; i < breakpoints.length; i++) {
      if (reversed) {
        if (value <= breakpoints[i]) return 5 - i;
      } else {
        if (value <= breakpoints[i]) return i + 1;
      }
    }
    return reversed ? 1 : 5;
  }

  // ─── Automated Lookalike Expansion ─────────────────────────────────────

  generateLookalike(
    seedAudience: { id: string; features: Record<string, number> }[],
    candidatePool: { id: string; features: Record<string, number> }[],
    targetSize: number,
  ): { candidates: { id: string; similarity: number; matchedFeatures: string[] }[]; seedProfile: Record<string, number> } {
    const dims = new Set<string>();
    for (const s of seedAudience) for (const k of Object.keys(s.features)) dims.add(k);
    for (const c of candidatePool) for (const k of Object.keys(c.features)) dims.add(k);
    const allDims = Array.from(dims);

    const seedProfile: Record<string, number> = {};
    for (const d of allDims) {
      seedProfile[d] = seedAudience.reduce((s, a) => s + (a.features[d] || 0), 0) / seedAudience.length;
    }

    const candidates = candidatePool.map((c) => {
      let dot = 0, normA = 0, normB = 0;
      for (const d of allDims) {
        const a = seedProfile[d] || 0;
        const b = c.features[d] || 0;
        dot += a * b;
        normA += a * a;
        normB += b * b;
      }
      const similarity = normA > 0 && normB > 0 ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
      const matchedFeatures = allDims.filter((d) => (seedProfile[d] || 0) > 0 && (c.features[d] || 0) > 0);
      return { id: c.id, similarity: Math.round(similarity * 10000) / 100, matchedFeatures };
    });

    candidates.sort((a, b) => b.similarity - a.similarity);
    return { candidates: candidates.slice(0, targetSize), seedProfile };
  }
}

export const audienceInsightsService = new AudienceInsightsService();
