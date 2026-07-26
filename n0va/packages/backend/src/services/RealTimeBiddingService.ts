export interface AuctionContext {
  publisherId: string;
  adFormat: string;
  deviceType: string;
  hour: number;
  dayOfWeek: number;
  cpm: number;
  impressionCount: number;
  winCount: number;
}

export interface BidRequest {
  auctionId: string;
  publisherId: string;
  adFormat: string;
  deviceType: string;
  floorPrice: number;
  hour: number;
  dayOfWeek: number;
  userSegments: string[];
  pageCategory: string;
}

export interface BidResponse {
  auctionId: string;
  bidAmount: number;
  bidCpm: number;
  winProbability: number;
  expectedValue: number;
  shadingFactor: number;
  strategy: string;
}

export interface WinRateModel {
  coefficients: number[];
  intercept: number;
  trainingSamples: number;
  accuracy: number;
}

export interface PublisherScore {
  publisherId: string;
  viewabilityRate: number;
  brandSafetyScore: number;
  clickThroughRate: number;
  conversionRate: number;
  historicalWinRate: number;
  avgCpm: number;
  qualityScore: number;
  recommendation: string;
}

export interface AuctionResult {
  auctionId: string;
  won: boolean;
  bidAmount: number;
  winPrice: number;
  revenue: number;
  latency: number;
}

export class RealTimeBiddingService {
  private winHistory: Map<string, { bid: number; won: boolean; context: number[] }[]> = new Map();
  private publisherStats: Map<string, { impressions: number; wins: number; revenue: number; spend: number }> = new Map();
  private model: WinRateModel | null = null;

  private featureVector(ctx: AuctionContext): number[] {
    const deviceMap: Record<string, number> = { mobile: 0, desktop: 1, tablet: 2, connected_tv: 3 };
    const formatMap: Record<string, number> = { banner: 0, video: 1, native: 2, interstitial: 3, rewarded: 4 };
    return [
      1,
      ctx.cpm / 100,
      Math.sin((2 * Math.PI * ctx.hour) / 24),
      Math.cos((2 * Math.PI * ctx.hour) / 24),
      ctx.dayOfWeek / 6,
      deviceMap[ctx.deviceType] ?? 0,
      formatMap[ctx.adFormat] ?? 0,
    ];
  }

  private sigmoid(z: number): number {
    return 1 / (1 + Math.exp(-Math.max(-50, Math.min(50, z))));
  }

  private predictWinProbability(context: number[]): number {
    if (!this.model) return 0.5;
    const logit = this.model.intercept + context.reduce((s, v, i) => s + v * (this.model!.coefficients[i] ?? 0), 0);
    return this.sigmoid(logit);
  }

  private updateModel(): void {
    const allSamples: { features: number[]; won: boolean }[] = [];
    for (const samples of this.winHistory.values()) {
      for (const s of samples) {
        allSamples.push({ features: s.context, won: s.won });
      }
    }
    if (allSamples.length < 10) return;

    const n = allSamples.length;
    const p = allSamples[0].features.length;
    const XtX: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
    const Xty: number[] = new Array(p).fill(0);

    for (const sample of allSamples) {
      const y = sample.won ? 1 : 0;
      for (let i = 0; i < p; i++) {
        Xty[i] += sample.features[i] * y;
        for (let j = 0; j < p; j++) {
          XtX[i][j] += sample.features[i] * sample.features[j];
        }
      }
    }

    for (let i = 0; i < p; i++) XtX[i][i] += 1e-6;
    const coefficients = this.choleskySolve(XtX, Xty);
    const intercept = coefficients[0];
    const coeffs = coefficients.slice(1);

    let correct = 0;
    for (const sample of allSamples) {
      const logit = intercept + sample.features.reduce((s, v, i) => s + v * (coeffs[i] ?? 0), 0);
      const pred = this.sigmoid(logit) > 0.5 ? 1 : 0;
      if (pred === (sample.won ? 1 : 0)) correct++;
    }

    this.model = {
      coefficients: coeffs,
      intercept,
      trainingSamples: n,
      accuracy: Math.round((correct / n) * 10000) / 100,
    };
  }

  private choleskySolve(A: number[][], b: number[]): number[] {
    const n = A.length;
    const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = 0;
        for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
        if (i === j) L[i][j] = Math.sqrt(Math.max(A[i][i] - sum, 1e-10));
        else L[i][j] = (A[i][j] - sum) / L[j][j];
      }
    }
    const y: number[] = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let k = 0; k < i; k++) sum += L[i][k] * y[k];
      y[i] = (b[i] - sum) / L[i][i];
    }
    const x: number[] = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = 0;
      for (let k = i + 1; k < n; k++) sum += L[k][i] * x[k];
      x[i] = (y[i] - sum) / L[i][i];
    }
    return x;
  }

  getWinRateModel(): WinRateModel | null {
    return this.model;
  }

  evaluateBid(request: BidRequest, targetCPA: number): BidResponse {
    const context = this.featureVector({
      publisherId: request.publisherId,
      adFormat: request.adFormat,
      deviceType: request.deviceType,
      hour: request.hour,
      dayOfWeek: request.dayOfWeek,
      cpm: request.floorPrice,
      impressionCount: 0,
      winCount: 0,
    });

    const pubStats = this.publisherStats.get(request.publisherId);
    const historicalWinRate = pubStats && pubStats.impressions > 0 ? pubStats.wins / pubStats.impressions : 0.5;
    const estimatedFloor = request.floorPrice;
    const targetBidCpm = Math.max(estimatedFloor, targetCPA * 0.5);

    const rawWinProb = this.predictWinProbability(context);
    const adjustedWinProb = rawWinProb * 0.7 + historicalWinRate * 0.3;

    const shadingBase = 0.85;
    const shadingFloor = 1.01;
    const competitionFactor = Math.min(1, adjustedWinProb * 1.5);
    const shadingFactor = shadingBase + (1 - competitionFactor) * (1 - shadingFloor);
    const shadedBid = targetBidCpm * Math.max(shadingFloor, shadingFactor);

    const winProb = this.sigmoid((shadedBid - estimatedFloor) * 0.01);
    const expectedValue = shadedBid * targetCPA * winProb;
    const finalBid = Math.min(shadedBid, targetCPA * 2);

    let strategy: string;
    if (adjustedWinProb > 0.7) strategy = "aggressive";
    else if (adjustedWinProb > 0.4) strategy = "balanced";
    else if (adjustedWinProb > 0.2) strategy = "conservative";
    else strategy = "exploratory";

    return {
      auctionId: request.auctionId,
      bidAmount: Math.round(finalBid * 100) / 100,
      bidCpm: Math.round(finalBid * 1000) / 1000,
      winProbability: Math.round(winProb * 10000) / 100,
      expectedValue: Math.round(expectedValue * 100) / 100,
      shadingFactor: Math.round(shadingFactor * 1000) / 1000,
      strategy,
    };
  }

  recordAuctionResult(result: AuctionResult): void {
    const context: number[] = [1, result.bidAmount / 100, 0, 0, 0, 0, 0];
    const campaignKey = "global";

    if (!this.winHistory.has(campaignKey)) {
      this.winHistory.set(campaignKey, []);
    }
    this.winHistory.get(campaignKey)!.push({ bid: result.bidAmount, won: result.won, context });

    const publisherId = result.auctionId.split("_")[0] || "unknown";
    const stats = this.publisherStats.get(publisherId) || { impressions: 0, wins: 0, revenue: 0, spend: 0 };
    stats.impressions++;
    if (result.won) {
      stats.wins++;
      stats.revenue += result.revenue || 0;
    }
    stats.spend += result.winPrice || result.bidAmount;
    this.publisherStats.set(publisherId, stats);

    if (this.winHistory.get(campaignKey)!.length % 50 === 0) {
      this.updateModel();
    }
  }

  getPublisherScore(publisherId: string): PublisherScore {
    const stats = this.publisherStats.get(publisherId) || { impressions: 0, wins: 0, revenue: 0, spend: 0 };
    const viewabilityRate = 0.65 + Math.random() * 0.3;
    const brandSafetyScore = 0.7 + Math.random() * 0.25;
    const clickThroughRate = 0.001 + Math.random() * 0.01;
    const conversionRate = 0.01 + Math.random() * 0.05;
    const historicalWinRate = stats.impressions > 0 ? stats.wins / stats.impressions : 0.5;
    const avgCpm = stats.impressions > 0 ? (stats.spend / stats.impressions) * 1000 : 5.0;

    const qualityScore = Math.round(
      (viewabilityRate * 0.25 + brandSafetyScore * 0.25 + Math.min(1, clickThroughRate * 100) * 0.2 +
        Math.min(1, conversionRate * 20) * 0.15 + historicalWinRate * 0.15) * 1000,
    ) / 10;

    let recommendation: string;
    if (qualityScore >= 80) recommendation = "highly_recommended";
    else if (qualityScore >= 60) recommendation = "recommended";
    else if (qualityScore >= 40) recommendation = "caution";
    else recommendation = "block";

    return {
      publisherId,
      viewabilityRate: Math.round(viewabilityRate * 1000) / 10,
      brandSafetyScore: Math.round(brandSafetyScore * 1000) / 10,
      clickThroughRate: Math.round(clickThroughRate * 10000) / 100,
      conversionRate: Math.round(conversionRate * 10000) / 100,
      historicalWinRate: Math.round(historicalWinRate * 10000) / 100,
      avgCpm: Math.round(avgCpm * 100) / 100,
      qualityScore,
      recommendation,
    };
  }

  simulateAuction(bids: { bidderId: string; bidAmount: number }[], secondPrice: boolean = true): {
    winner: string; winPrice: number; allBids: { bidderId: string; bidAmount: number; rank: number }[];
  } {
    const sorted = [...bids].sort((a, b) => b.bidAmount - a.bidAmount);
    const winner = sorted[0]?.bidderId ?? "none";
    const winPrice = secondPrice ? (sorted[1]?.bidAmount ?? sorted[0]?.bidAmount ?? 0) : sorted[0]?.bidAmount ?? 0;

    return {
      winner,
      winPrice,
      allBids: sorted.map((b, i) => ({ ...b, rank: i + 1 })),
    };
  }

  generateSampleRequest(): BidRequest {
    const publishers = ["pub_001", "pub_002", "pub_003", "pub_004", "pub_005"];
    const formats = ["banner", "video", "native", "interstitial"];
    const devices = ["mobile", "desktop", "tablet", "connected_tv"];
    const categories = ["automotive", "finance", "health", "technology", "lifestyle", "entertainment", "education"];
    const segments = ["high_intent", "retargeting", "lookalike", "prospecting", "loyal", "new_user"];

    return {
      auctionId: `auction_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      publisherId: publishers[Math.floor(Math.random() * publishers.length)],
      adFormat: formats[Math.floor(Math.random() * formats.length)],
      deviceType: devices[Math.floor(Math.random() * devices.length)],
      floorPrice: Math.round((1 + Math.random() * 15) * 100) / 100,
      hour: Math.floor(Math.random() * 24),
      dayOfWeek: Math.floor(Math.random() * 7),
      userSegments: [segments[Math.floor(Math.random() * segments.length)]],
      pageCategory: categories[Math.floor(Math.random() * categories.length)],
    };
  }

  generateSampleContext(): AuctionContext {
    const publishers = ["pub_001", "pub_002", "pub_003"];
    const formats = ["banner", "video", "native"];
    const devices = ["mobile", "desktop", "tablet"];
    return {
      publisherId: publishers[Math.floor(Math.random() * publishers.length)],
      adFormat: formats[Math.floor(Math.random() * formats.length)],
      deviceType: devices[Math.floor(Math.random() * devices.length)],
      hour: Math.floor(Math.random() * 24),
      dayOfWeek: Math.floor(Math.random() * 7),
      cpm: Math.round((2 + Math.random() * 20) * 100) / 100,
      impressionCount: Math.floor(Math.random() * 1000),
      winCount: Math.floor(Math.random() * 500),
    };
  }
}

export const realTimeBiddingService = new RealTimeBiddingService();
