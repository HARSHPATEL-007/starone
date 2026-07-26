export type FraudSeverity = "low" | "medium" | "high" | "critical";
export type FraudCategory = "ivt" | "bot" | "click_fraud" | "impression_fraud" | "viewability" | "brand_safety" | "geo_anomaly" | "frequency_anomaly" | "cusum_changepoint" | "benford_anomaly" | "poisson_anomaly" | "entropy_anomaly";

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
  ensembleScore: number;
  signalBreakdown: { signal: string; score: number; weight: number }[];
}

interface DecisionTreeNode {
  isLeaf: boolean;
  prediction?: number;
  probability?: number;
  featureIndex?: number;
  threshold?: number;
  left?: DecisionTreeNode;
  right?: DecisionTreeNode;
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
  private clickHistory = new Map<string, number[]>();
  private spendHistory = new Map<string, number[]>();

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
      spendAmounts?: number[];
      clickTimestamps?: number[];
    },
    campaignId: string = "unknown"
  ): PlacementRisk {
    const flags: FraudFlag[] = [];
    const tenantFlags = this.flags.get(campaignId) || [];
    const signals: { signal: string; score: number; weight: number }[] = [];

    // ── Original threshold checks ─────────────────────────────────────
    if (metrics.ivtPercent !== undefined && metrics.ivtPercent > 30) {
      const severity = metrics.ivtPercent > 90 ? "critical" : metrics.ivtPercent > 70 ? "high" : metrics.ivtPercent > 50 ? "medium" : "low";
      flags.push(this.makeFlag("ivt", campaignId, platform, placementId, severity, metrics.ivtPercent, `Invalid traffic detected at ${metrics.ivtPercent.toFixed(1)}%`, { ivtPercent: metrics.ivtPercent }, metrics.ivtPercent > 90));
      signals.push({ signal: "IVT", score: Math.min(100, metrics.ivtPercent), weight: 0.2 });
    }

    if (metrics.viewabilityPercent !== undefined && metrics.viewabilityPercent < 50) {
      flags.push(this.makeFlag("viewability", campaignId, platform, placementId, metrics.viewabilityPercent < 30 ? "high" : "medium", 100 - metrics.viewabilityPercent, `Low viewability: ${metrics.viewabilityPercent.toFixed(1)}%`, { viewabilityPercent: metrics.viewabilityPercent }, metrics.viewabilityPercent < 20));
      signals.push({ signal: "Viewability", score: 100 - metrics.viewabilityPercent, weight: 0.1 });
    }

    if (metrics.brandSafetyScore !== undefined && metrics.brandSafetyScore < 70) {
      const severity = metrics.brandSafetyScore < 40 ? "critical" : metrics.brandSafetyScore < 55 ? "high" : "medium";
      flags.push(this.makeFlag("brand_safety", campaignId, platform, placementId, severity, 100 - metrics.brandSafetyScore, `Brand safety risk: score ${metrics.brandSafetyScore.toFixed(0)}/100`, { brandSafetyScore: metrics.brandSafetyScore }, metrics.brandSafetyScore < 35));
      signals.push({ signal: "Brand Safety", score: 100 - metrics.brandSafetyScore, weight: 0.1 });
    }

    if (metrics.botProbability !== undefined && metrics.botProbability > 0.5) {
      const severity = metrics.botProbability > 0.8 ? "critical" : "high";
      flags.push(this.makeFlag("bot", campaignId, platform, placementId, severity, metrics.botProbability * 100, `Bot traffic detected (probability: ${(metrics.botProbability * 100).toFixed(0)}%)`, { botProbability: metrics.botProbability }, metrics.botProbability > 0.8));
      signals.push({ signal: "Bot Probability", score: metrics.botProbability * 100, weight: 0.15 });
    }

    if (metrics.clickVelocity !== undefined && metrics.clickVelocity > 20) {
      const severity = metrics.clickVelocity > 50 ? "critical" : "high";
      flags.push(this.makeFlag("click_fraud", campaignId, platform, placementId, severity, metrics.clickVelocity, `Abnormal click velocity: ${metrics.clickVelocity.toFixed(0)} clicks/minute`, { clickVelocity: metrics.clickVelocity }, metrics.clickVelocity > 50));
      signals.push({ signal: "Click Velocity", score: Math.min(100, metrics.clickVelocity * 2), weight: 0.15 });
    }

    // ── CUSUM changepoint detection for click velocity & spend ────────
    if (metrics.clickTimestamps && metrics.clickTimestamps.length >= 10) {
      const cusumResult = this.cusumChangepoint(metrics.clickTimestamps);
      if (cusumResult.detected) {
        flags.push(this.makeFlag("cusum_changepoint", campaignId, platform, placementId, cusumResult.severity, cusumResult.score, `CUSUM detected click rate shift at index ${cusumResult.changepoint}`, { changepoint: cusumResult.changepoint, meanBefore: cusumResult.meanBefore, meanAfter: cusumResult.meanAfter }, cusumResult.severity === "critical"));
        signals.push({ signal: "CUSUM Changepoint", score: cusumResult.score, weight: 0.1 });
      }
    }

    // ── Benford's law conformity test for spend amounts ────────────────
    if (metrics.spendAmounts && metrics.spendAmounts.length >= 20) {
      const benfordResult = this.benfordTest(metrics.spendAmounts);
      if (benfordResult.anomalous) {
        flags.push(this.makeFlag("benford_anomaly", campaignId, platform, placementId, benfordResult.severity, benfordResult.score, `Benford's law deviation: MAD=${benfordResult.mad.toFixed(3)}`, { mad: benfordResult.mad, leadingDigitDistribution: benfordResult.observedDistribution }, benfordResult.severity === "critical"));
        signals.push({ signal: "Benford Anomaly", score: benfordResult.score, weight: 0.1 });
      }
    }

    // ── Poisson process arrival rate anomaly ──────────────────────────
    if (metrics.clickTimestamps && metrics.clickTimestamps.length >= 10) {
      const poissonResult = this.poissonAnomaly(metrics.clickTimestamps, campaignId);
      if (poissonResult.anomalous) {
        flags.push(this.makeFlag("poisson_anomaly", campaignId, platform, placementId, poissonResult.severity, poissonResult.score, `Poisson arrival rate anomaly: λ=${poissonResult.lambda.toFixed(2)}, p=${poissonResult.pValue.toFixed(4)}`, { lambda: poissonResult.lambda, pValue: poissonResult.pValue, expectedRate: poissonResult.expectedRate }, false));
        signals.push({ signal: "Poisson Anomaly", score: poissonResult.score, weight: 0.1 });
      }
    }

    // ── Entropy-based geo-distribution analysis ───────────────────────
    if (metrics.geoDistribution && metrics.geoDistribution.length >= 5) {
      const entropyResult = this.entropyAnomaly(metrics.geoDistribution);
      if (entropyResult.anomalous) {
        flags.push(this.makeFlag("entropy_anomaly", campaignId, platform, placementId, entropyResult.severity, entropyResult.score, `Geo-distribution entropy anomaly: H=${entropyResult.entropy.toFixed(2)} vs expected ${entropyResult.expectedEntropy.toFixed(2)}`, { entropy: entropyResult.entropy, expectedEntropy: entropyResult.expectedEntropy, distribution: entropyResult.distribution }, false));
        signals.push({ signal: "Geo Entropy", score: entropyResult.score, weight: 0.1 });
      }
    }

    // ── Save flags ────────────────────────────────────────────────────
    if (flags.length > 0) {
      tenantFlags.push(...flags);
      this.flags.set(campaignId, tenantFlags);
    }

    // ── Ensemble fraud score ──────────────────────────────────────────
    const totalWeight = signals.reduce((s, x) => s + x.weight, 0);
    const ensembleScore = totalWeight > 0
      ? signals.reduce((s, x) => s + x.score * x.weight, 0) / totalWeight
      : 0;

    const ivtScore = metrics.ivtPercent || 0;
    const viewabilityScore = metrics.viewabilityPercent || 100;
    const brandSafetyScore = metrics.brandSafetyScore || 100;
    const overallRisk = Math.max(
      ivtScore, 100 - viewabilityScore, 100 - brandSafetyScore,
      (metrics.botProbability || 0) * 100,
      Math.min(100, (metrics.clickVelocity || 0) * 2),
      ensembleScore,
    );

    const risk: PlacementRisk = {
      placementId, platform, ivtScore, viewabilityScore, brandSafetyScore,
      overallRisk: Math.min(100, overallRisk),
      flags, ensembleScore: Math.round(ensembleScore * 100) / 100, signalBreakdown: signals,
    };

    this.placements.set(placementId, risk);
    return risk;
  }

  // ─── CUSUM Change-Point Detection ─────────────────────────────────--
  /**
   * Detects a shift in the mean of a time series using cumulative sum (CUSUM).
   * Returns the changepoint index, means before/after, and severity.
   */
  cusumChangepoint(data: number[]): { detected: boolean; changepoint: number; meanBefore: number; meanAfter: number; score: number; severity: FraudSeverity } {
    const n = data.length;
    if (n < 5) return { detected: false, changepoint: -1, meanBefore: 0, meanAfter: 0, score: 0, severity: "low" };

    const overallMean = data.reduce((a, b) => a + b, 0) / n;
    const cumsum = new Array(n).fill(0);
    let s = 0;
    let maxS = 0;
    let changepoint = -1;
    for (let i = 0; i < n; i++) {
      s += data[i] - overallMean;
      cumsum[i] = s;
      if (Math.abs(s) > Math.abs(maxS)) { maxS = s; changepoint = i; }
    }

    if (changepoint < 2 || changepoint >= n - 2) {
      return { detected: false, changepoint: -1, meanBefore: 0, meanAfter: 0, score: 0, severity: "low" };
    }

    const before = data.slice(0, changepoint + 1);
    const after = data.slice(changepoint + 1);
    const meanBefore = before.reduce((a, b) => a + b, 0) / before.length;
    const meanAfter = after.reduce((a, b) => a + b, 0) / after.length;
    const diff = Math.abs(meanAfter - meanBefore);
    const relativeShift = overallMean > 0 ? diff / overallMean : diff;

    const detected = relativeShift > 0.5;
    const score = Math.min(100, relativeShift * 100);
    const severity: FraudSeverity = relativeShift > 2 ? "critical" : relativeShift > 1.2 ? "high" : relativeShift > 0.5 ? "medium" : "low";

    return { detected, changepoint, meanBefore, meanAfter, score: Math.round(score * 100) / 100, severity };
  }

  // ─── Benford's Law Test ─────────────────────────────────────────────
  /**
   * Tests whether the leading digits of spend amounts follow Benford's law.
   * Uses the mean absolute deviation (MAD) from the expected distribution.
   * MAD > 0.015 indicates anomalous (non-conforming) data.
   */
  benfordTest(amounts: number[]): { anomalous: boolean; mad: number; observedDistribution: number[]; score: number; severity: FraudSeverity } {
    const benfordExpected = [0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046];
    const leadingDigits = amounts.map((a) => {
      const s = Math.abs(a).toFixed(0);
      return parseInt(s.charAt(0), 10);
    }).filter((d) => d >= 1 && d <= 9);

    const n = leadingDigits.length;
    if (n < 20) return { anomalous: false, mad: 0, observedDistribution: benfordExpected, score: 0, severity: "low" };

    const observed = new Array(9).fill(0);
    for (const d of leadingDigits) observed[d - 1]++;

    const observedFreq = observed.map((c) => c / n);
    let mad = 0;
    for (let i = 0; i < 9; i++) mad += Math.abs(observedFreq[i] - benfordExpected[i]);
    mad /= 9;

    const anomalous = mad > 0.015;
    const score = Math.min(100, Math.round(mad * 1000));
    const severity: FraudSeverity = mad > 0.03 ? "critical" : mad > 0.025 ? "high" : mad > 0.015 ? "medium" : "low";

    return { anomalous, mad: Math.round(mad * 10000) / 10000, observedDistribution: observedFreq.map((v) => Math.round(v * 10000) / 10000), score, severity };
  }

  // ─── Poisson Process Arrival Rate Anomaly ───────────────────────────
  /**
   * Models click inter-arrival times as a Poisson process.
   * Flags if the observed rate deviates significantly from the historical baseline.
   */
  poissonAnomaly(timestamps: number[], campaignId: string): { anomalous: boolean; lambda: number; expectedRate: number; pValue: number; score: number; severity: FraudSeverity } {
    if (timestamps.length < 5) return { anomalous: false, lambda: 0, expectedRate: 0, pValue: 1, score: 0, severity: "low" };

    const sorted = [...timestamps].sort((a, b) => a - b);
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] > sorted[i - 1]) intervals.push(sorted[i] - sorted[i - 1]);
    }
    if (intervals.length < 4) return { anomalous: false, lambda: 0, expectedRate: 0, pValue: 1, score: 0, severity: "low" };

    const lambda = intervals.length / intervals.reduce((a, b) => a + b, 0);

    const key = `${campaignId}_${this.clickHistory.size}`;
    const history = this.clickHistory.get(key) || [];
    history.push(...intervals);
    const recentHistory = history.slice(-100);
    this.clickHistory.set(key, recentHistory);

    const expectedRate = recentHistory.length > 0
      ? recentHistory.length / recentHistory.reduce((a, b) => a + b, 0)
      : lambda;

    const rateRatio = expectedRate > 0 ? lambda / expectedRate : 1;
    const pValue = Math.exp(-Math.abs(rateRatio - 1) * 10);
    const anomalous = pValue < 0.05 && Math.abs(rateRatio - 1) > 0.5;
    const score = Math.min(100, Math.round(Math.abs(rateRatio - 1) * 100));
    const severity: FraudSeverity = Math.abs(rateRatio - 1) > 2 ? "critical" : Math.abs(rateRatio - 1) > 1 ? "high" : Math.abs(rateRatio - 1) > 0.5 ? "medium" : "low";

    return { anomalous, lambda: Math.round(lambda * 10000) / 10000, expectedRate: Math.round(expectedRate * 10000) / 10000, pValue: Math.round(pValue * 10000) / 10000, score, severity };
  }

  // ─── Entropy-based Geo-Distribution Analysis ────────────────────────
  /**
   * Computes the Shannon entropy of the geo distribution.
   * Low entropy (too concentrated) or high entropy (too uniform) can indicate fraud.
   */
  entropyAnomaly(geoDistribution: string[]): { anomalous: boolean; entropy: number; expectedEntropy: number; distribution: Record<string, number>; score: number; severity: FraudSeverity } {
    const n = geoDistribution.length;
    if (n < 5) return { anomalous: false, entropy: 0, expectedEntropy: 0, distribution: {}, score: 0, severity: "low" };

    const counts: Record<string, number> = {};
    for (const g of geoDistribution) counts[g] = (counts[g] || 0) + 1;

    const probs = Object.values(counts).map((c) => c / n);
    const entropy = -probs.reduce((s, p) => s + (p > 0 ? p * Math.log2(p) : 0), 0);

    const k = Object.keys(counts).length;
    const maxEntropy = k > 1 ? Math.log2(k) : 1;
    const expectedEntropy = maxEntropy * 0.7;
    const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;

    // Too concentrated (low entropy) or too uniform (high entropy) both suspicious
    const anomalous = normalizedEntropy < 0.3 || normalizedEntropy > 0.95;
    const deviation = Math.abs(normalizedEntropy - 0.7);
    const score = Math.min(100, Math.round(deviation * 150));
    const severity: FraudSeverity = deviation > 0.5 ? "critical" : deviation > 0.3 ? "high" : deviation > 0.15 ? "medium" : "low";

    return {
      anomalous, entropy: Math.round(entropy * 100) / 100,
      expectedEntropy: Math.round(expectedEntropy * 100) / 100,
      distribution: Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, Math.round(v / n * 10000) / 100])),
      score, severity,
    };
  }

  // ─── Random Forest Ensemble ─────────────────────────────────────────

  private forestTrees: DecisionTreeNode[] = [];
  private readonly forestSize = 20;
  private readonly maxDepth = 6;
  private readonly minSamplesSplit = 5;
  private isForestTrained = false;

  /**
   * Train a Random Forest classifier on labeled fraud samples.
   * Each tree is trained on a bootstrap sample using random feature subspaces.
   */
  trainRandomForest(trainingData: { features: number[]; label: number }[]): {
    treeCount: number; accuracy: number; precision: number; recall: number; f1Score: number; oobEstimate: number;
  } {
    const n = trainingData.length;
    const featureCount = trainingData[0]?.features.length ?? 0;
    if (n < 10 || featureCount === 0) throw new Error("Need at least 10 samples with features");

    const sqrtFeatures = Math.max(1, Math.floor(Math.sqrt(featureCount)));
    this.forestTrees = [];
    let tp = 0, fp = 0, fn = 0, tn = 0;
    const oobPredictions = new Map<number, { sum: number; count: number }>();

    for (let t = 0; t < this.forestSize; t++) {
      // Bootstrap sample
      const bootstrap: { features: number[]; label: number }[] = [];
      const oobIndices = new Set<number>();
      for (let i = 0; i < n; i++) {
        const idx = Math.floor(Math.random() * n);
        bootstrap.push(trainingData[idx]);
      }
      for (let i = 0; i < n; i++) if (!bootstrap.some((s) => s === trainingData[i])) oobIndices.add(i);

      // Build tree
      const tree = this.buildTree(bootstrap, 0, new Set(Array.from({ length: featureCount }, (_, i) => i)), sqrtFeatures);

      // Evaluate OOB
      for (const idx of oobIndices) {
        const pred = this.treePredict(tree, trainingData[idx].features);
        if (!oobPredictions.has(idx)) oobPredictions.set(idx, { sum: 0, count: 0 });
        const oob = oobPredictions.get(idx)!;
        oob.sum += pred;
        oob.count++;
      }

      this.forestTrees.push(tree);
    }

    // Full evaluation
    for (const sample of trainingData) {
      const pred = this.forestPredict(sample.features);
      if (pred === 1 && sample.label === 1) tp++;
      else if (pred === 1 && sample.label === 0) fp++;
      else if (pred === 0 && sample.label === 1) fn++;
      else tn++;
    }

    // OOB estimate
    let oobCorrect = 0, oobTotal = 0;
    for (const [idx, data] of oobPredictions) {
      const avg = data.sum / data.count;
      const pred = avg >= 0.5 ? 1 : 0;
      if (pred === trainingData[idx].label) oobCorrect++;
      oobTotal++;
    }

    this.isForestTrained = true;
    const accuracy = (tp + tn) / Math.max(n, 1);
    const precision = tp / Math.max(tp + fp, 1);
    const recall = tp / Math.max(tp + fn, 1);
    const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

    return {
      treeCount: this.forestSize,
      accuracy: Math.round(accuracy * 10000) / 10000,
      precision: Math.round(precision * 10000) / 10000,
      recall: Math.round(recall * 10000) / 10000,
      f1Score: Math.round(f1Score * 10000) / 10000,
      oobEstimate: oobTotal > 0 ? Math.round((oobCorrect / oobTotal) * 10000) / 10000 : 0,
    };
  }

  private buildTree(
    data: { features: number[]; label: number }[], depth: number,
    featureIndices: Set<number>, maxFeatures: number,
  ): DecisionTreeNode {
    if (depth >= this.maxDepth || data.length < this.minSamplesSplit || data.every((d) => d.label === data[0].label)) {
      const avgLabel = data.reduce((s, d) => s + d.label, 0) / data.length;
      return { isLeaf: true, prediction: avgLabel >= 0.5 ? 1 : 0, probability: avgLabel };
    }

    const nFeatures = data[0].features.length;
    const candidateFeatures: number[] = [];
    const featureArr = Array.from(featureIndices).filter((i) => i < nFeatures);
    const shuffled = [...featureArr].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(maxFeatures, shuffled.length); i++) candidateFeatures.push(shuffled[i]);

    let bestFeature = -1, bestThreshold = 0, bestGini = Infinity;
    let bestLeft: { features: number[]; label: number }[] = [];
    let bestRight: { features: number[]; label: number }[] = [];

    for (const f of candidateFeatures) {
      const values = [...new Set(data.map((d) => d.features[f]))].sort((a, b) => a - b);
      for (const threshold of values) {
        const left = data.filter((d) => d.features[f] <= threshold);
        const right = data.filter((d) => d.features[f] > threshold);
        if (left.length === 0 || right.length === 0) continue;
        const gini = this.giniImpurity(left, right);
        if (gini < bestGini) {
          bestGini = gini; bestFeature = f; bestThreshold = threshold;
          bestLeft = left; bestRight = right;
        }
      }
    }

    if (bestFeature === -1) {
      const avgLabel = data.reduce((s, d) => s + d.label, 0) / data.length;
      return { isLeaf: true, prediction: avgLabel >= 0.5 ? 1 : 0, probability: avgLabel };
    }

    return {
      isLeaf: false, featureIndex: bestFeature, threshold: bestThreshold,
      left: this.buildTree(bestLeft, depth + 1, featureIndices, maxFeatures),
      right: this.buildTree(bestRight, depth + 1, featureIndices, maxFeatures),
    };
  }

  private giniImpurity(left: { label: number }[], right: { label: number }[]): number {
    const total = left.length + right.length;
    const gini = (set: { label: number }[]): number => {
      if (set.length === 0) return 0;
      const p = set.filter((s) => s.label === 1).length / set.length;
      return 1 - p * p - (1 - p) * (1 - p);
    };
    return (left.length / total) * gini(left) + (right.length / total) * gini(right);
  }

  private treePredict(node: DecisionTreeNode, features: number[]): number {
    if (node.isLeaf) return node.prediction ?? 0;
    const val = features[node.featureIndex!];
    return val <= node.threshold! ? this.treePredict(node.left!, features) : this.treePredict(node.right!, features);
  }

  forestPredict(features: number[]): number {
    if (!this.isForestTrained || this.forestTrees.length === 0) return 0;
    let sum = 0;
    for (const tree of this.forestTrees) sum += this.treePredict(tree, features);
    return sum / this.forestTrees.length >= 0.5 ? 1 : 0;
  }

  forestPredictProbability(features: number[]): { probability: number; classification: "fraud" | "legitimate"; confidence: number } {
    if (!this.isForestTrained || this.forestTrees.length === 0) return { probability: 0, classification: "legitimate", confidence: 0 };
    let sum = 0;
    for (const tree of this.forestTrees) sum += this.treePredict(tree, features);
    const probability = sum / this.forestTrees.length;
    const confidence = Math.abs(probability - 0.5) * 2;
    return {
      probability: Math.round(probability * 10000) / 10000,
      classification: probability >= 0.5 ? "fraud" : "legitimate",
      confidence: Math.round(confidence * 10000) / 10000,
    };
  }

  generateTrainingData(count: number = 100): { features: number[]; label: number }[] {
    const data: { features: number[]; label: number }[] = [];
    for (let i = 0; i < count; i++) {
      const ivt = Math.random() * 100;
      const viewability = 100 - Math.random() * 60;
      const brandSafety = Math.random() * 100;
      const botProb = Math.random();
      const clickVel = Math.random() * 60;
      const geoEntropy = 0.2 + Math.random() * 0.8;

      const features = [ivt, viewability, brandSafety, botProb * 100, clickVel, geoEntropy * 100];
      // Label: fraud if high IVT, high bot prob, or anomalous geo + click velocity
      const label = (ivt > 60 || botProb > 0.7 || (geoEntropy < 0.3 && clickVel > 30)) ? 1 : 0;
      data.push({ features, label });
    }
    return data;
  }

  // ─── Online Learning / Adaptive Thresholds ─────────────────────────

  private adaptiveThresholdHistory: Map<string, { hits: number; misses: number; threshold: number; lastAdjustment: string }> = new Map();

  /**
   * Adapt a threshold based on observed performance using multiplicative update with momentum.
   * Responds faster to sudden changes while maintaining stability.
   */
  adaptThreshold(thresholdId: string, currentThreshold: number, wasCorrect: boolean, learningRate = 0.1): {
    adjustedThreshold: number; direction: "tightened" | "loosened" | "unchanged"; momentum: number;
  } {
    const state = this.adaptiveThresholdHistory.get(thresholdId) || {
      hits: 0, misses: 0, threshold: currentThreshold, lastAdjustment: new Date().toISOString(),
    };

    if (wasCorrect) state.hits++; else state.misses++;
    const total = state.hits + state.misses;
    const accuracy = total > 0 ? state.hits / total : 0;
    const momentum = Math.min(0.9, total * 0.01);

    let direction: "tightened" | "loosened" | "unchanged" = "unchanged";
    if (total >= 10) {
      const target = 0.8;
      const gap = target - accuracy;
      if (Math.abs(gap) > 0.05) {
        const adjustedLR = learningRate * (1 + momentum);
        if (gap > 0) {
          // Accuracy too low — loosen threshold
          state.threshold *= (1 + adjustedLR * gap);
          direction = "loosened";
        } else {
          // Accuracy high — can tighten
          state.threshold *= (1 - adjustedLR * Math.abs(gap) * 0.5);
          direction = "tightened";
        }
        state.hits = Math.floor(state.hits * 0.5);
        state.misses = Math.floor(state.misses * 0.5);
        state.lastAdjustment = new Date().toISOString();
      }
    }

    this.adaptiveThresholdHistory.set(thresholdId, state);
    return {
      adjustedThreshold: Math.round(state.threshold * 100) / 100,
      direction,
      momentum: Math.round(momentum * 100) / 100,
    };
  }

  getAdaptiveThresholdState(thresholdId: string): { threshold: number; hits: number; misses: number; accuracy: number; lastAdjustment: string } | null {
    const state = this.adaptiveThresholdHistory.get(thresholdId);
    if (!state) return null;
    const total = state.hits + state.misses;
    return {
      threshold: Math.round(state.threshold * 100) / 100,
      hits: state.hits, misses: state.misses,
      accuracy: total > 0 ? Math.round((state.hits / total) * 10000) / 100 : 0,
      lastAdjustment: state.lastAdjustment,
    };
  }

  // ─── Real-Time Threat Scoring ──────────────────────────────────────

  /**
   * Compute a real-time threat score using weighted signal fusion with time decay.
   * Recent signals weighted higher via exponential forgetting factor.
   */
  computeRealTimeThreatScore(
    signals: { name: string; score: number; weight: number; timestamp: number }[],
    decayHalfLifeMs = 300000,
  ): { overallScore: number; severity: FraudSeverity; dominantSignal: string; signalBreakdown: { name: string; weightedScore: number }[] } {
    if (signals.length === 0) return { overallScore: 0, severity: "low", dominantSignal: "none", signalBreakdown: [] };

    const now = Date.now();
    let totalWeight = 0;
    const breakdown: { name: string; weightedScore: number }[] = [];

    for (const s of signals) {
      const age = Math.max(0, now - s.timestamp);
      const decayFactor = Math.exp(-Math.LN2 * age / decayHalfLifeMs);
      const effectiveWeight = s.weight * decayFactor;
      breakdown.push({ name: s.name, weightedScore: Math.round(s.score * effectiveWeight * 100) / 100 });
      totalWeight += effectiveWeight;
    }

    const overallScore = totalWeight > 0
      ? breakdown.reduce((s, b) => s + b.weightedScore, 0) / totalWeight
      : 0;
    const dominantSignal = breakdown.sort((a, b) => b.weightedScore - a.weightedScore)[0]?.name || "none";
    const severity: FraudSeverity = overallScore > 80 ? "critical" : overallScore > 60 ? "high" : overallScore > 40 ? "medium" : "low";

    return {
      overallScore: Math.round(overallScore * 100) / 100, severity, dominantSignal,
      signalBreakdown: breakdown.sort((a, b) => b.weightedScore - a.weightedScore).slice(0, 5),
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────
  private makeFlag(category: FraudCategory, campaignId: string, platform: string, placementId: string | undefined, severity: FraudSeverity, score: number, description: string, details: Record<string, unknown>, autoPaused: boolean): FraudFlag {
    return {
      id: `flag_${category}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      campaignId, platform, placementId, category, severity, score,
      description, details, detectedAt: new Date(), autoPaused,
    };
  }

  getPlacementRisk(placementId: string): PlacementRisk | undefined {
    return this.placements.get(placementId);
  }

  getCampaignFlags(campaignId: string): FraudFlag[] {
    return this.flags.get(campaignId) || [];
  }

  resolveFlag(flagId: string): boolean {
    for (const [, f] of this.flags) {
      const flag = f.find((fl) => fl.id === flagId);
      if (flag) { flag.resolvedAt = new Date(); return true; }
    }
    return false;
  }

  getHealthSummary(): FraudHealthSummary {
    let totalFlags = 0, activeFlags = 0, autoPaused = 0, critical = 0, high = 0, medium = 0, low = 0;
    const categoryCount: Record<string, number> = {};
    const platformRisk: Record<string, { ivt: number[]; viewability: number[]; brandSafety: number[] }> = {};

    for (const [, f] of this.flags) {
      for (const flag of f) {
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
    for (const [p, risks] of Object.entries(platformRisk)) {
      const avgIvt = risks.ivt.reduce((s, v) => s + v, 0) / Math.max(1, risks.ivt.length);
      const avgView = risks.viewability.reduce((s, v) => s + v, 0) / Math.max(1, risks.viewability.length);
      const avgBs = risks.brandSafety.reduce((s, v) => s + v, 0) / Math.max(1, risks.brandSafety.length);
      riskByPlatform[p] = { avgIvt, avgViewability: avgView, avgBrandSafety: avgBs, overallRisk: Math.max(avgIvt, 100 - avgView, 100 - avgBs) };
    }

    return {
      totalFlags, activeFlags, autoPaused,
      criticalFlags: critical, highFlags: high, mediumFlags: medium, lowFlags: low,
      topCategories: Object.entries(categoryCount).sort(([, a], [, b]) => b - a).slice(0, 5).map(([category, count]) => ({ category, count })),
      riskByPlatform,
    };
  }

  generateSampleAlert(campaignId: string = "camp_001"): FraudFlag {
    const flag: FraudFlag = {
      id: `flag_sample_${Date.now()}`,
      campaignId,
      platform: ["meta", "google", "linkedin", "tiktok"][Math.floor(Math.random() * 4)],
      placementId: `pl_${Math.random().toString(36).substr(2, 8)}`,
      category: ["ivt", "bot", "viewability", "brand_safety", "cusum_changepoint", "benford_anomaly"][Math.floor(Math.random() * 6)] as FraudCategory,
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
