interface CampaignData {
  id: string;
  name: string;
  status: string;
  type: string;
  platforms: string[];
  budget: { daily: number; lifetime: number; spent: number; remaining: number; currency: string };
  metrics?: { impressions: number; clicks: number; conversions: number; spend: number; revenue: number; ctr: number; cpc: number; roas: number; cvr: number };
  startDate?: string;
  endDate?: string;
  tags?: string[];
}

export interface Recommendation {
  id: string;
  type: "budget" | "creative" | "audience" | "platform" | "scheduling" | "cross_campaign" | "optimization";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
  campaignId?: string;
  campaignName?: string;
  action?: string;
  metric?: string;
  currentValue?: number;
  suggestedValue?: number;
  potentialGain?: string;
}

export class RecommendationEngineService {
  generateCampaignRecommendations(campaign: CampaignData): Recommendation[] {
    const recs: Recommendation[] = [];
    if (!campaign.metrics) return recs;

    const { metrics, budget } = campaign;

    if (budget.spent > 0 && budget.lifetime > 0) {
      const utilization = (budget.spent / budget.lifetime) * 100;
      if (utilization >= 85) {
        recs.push(this.makeRec("budget", "Campaign budget nearly exhausted", `${campaign.name} has used ${utilization.toFixed(0)}% of its budget. Consider increasing the lifetime budget or pausing low-performing ad sets.`, "high", "low", campaign.id, campaign.name, "increase_budget", "budget_utilization", utilization, 90));
      }
      if (utilization <= 30 && isNearEnd(campaign.endDate)) {
        recs.push(this.makeRec("budget", "Budget underutilized near end date", `${campaign.name} has only used ${utilization.toFixed(0)}% of budget but is ending soon. Increase spend or redistribute to other campaigns.`, "medium", "medium", campaign.id, campaign.name, "redistribute_budget", "budget_utilization", utilization, 70));
      }
    }

    if (metrics.roas < 2.0) {
      recs.push(this.makeRec("optimization", "Low ROAS — optimize targeting", `${campaign.name} ROAS is ${metrics.roas.toFixed(2)}x. Refine audience targeting, adjust bids, or pause underperforming platforms.`, "high", "medium", campaign.id, campaign.name, "optimize_targeting", "roas", metrics.roas, 3.0, `+${((3.0 / metrics.roas - 1) * 100).toFixed(0)}% revenue`));
    }

    if (metrics.cvr < 2.5) {
      recs.push(this.makeRec("optimization", "Low conversion rate — improve landing pages", `${campaign.name} CVR is ${metrics.cvr.toFixed(1)}%. Test landing page variants, simplify forms, or improve CTAs.`, "medium", "medium", campaign.id, campaign.name, "optimize_landing_pages", "cvr", metrics.cvr, 3.5));
    }

    if (metrics.ctr < 1.5) {
      recs.push(this.makeRec("creative", "Low CTR — refresh creatives", `${campaign.name} CTR is ${metrics.ctr.toFixed(2)}%. Test new headlines, visuals, or CTAs to improve engagement.`, "medium", "low", campaign.id, campaign.name, "refresh_creatives", "ctr", metrics.ctr, 2.5));
    }

    if (metrics.cpc > 1.5) {
      recs.push(this.makeRec("budget", "High CPC — review bidding strategy", `${campaign.name} CPC is $${metrics.cpc.toFixed(2)}. Consider switching bid strategies or narrowing audience targeting.`, "medium", "medium", campaign.id, campaign.name, "review_bidding", "cpc", metrics.cpc, 1.0));
    }

    const dailyBudget = budget.daily || budget.lifetime / 30;
    const dailySpend = metrics.spend / 30;
    if (dailySpend > 0 && dailySpend < dailyBudget * 0.5) {
      recs.push(this.makeRec("budget", "Under-spending — increase daily budget", `${campaign.name} spends $${dailySpend.toFixed(0)}/day vs $${dailyBudget.toFixed(0)} budget. Increase spend to capture more impressions.`, "medium", "low", campaign.id, campaign.name, "increase_daily_budget", "daily_spend", dailySpend, dailyBudget));
    }

    if (campaign.platforms.length === 1) {
      recs.push(this.makeRec("platform", "Single platform — consider expanding", `${campaign.name} only runs on ${campaign.platforms[0]}. Expanding to additional platforms could increase reach.`, "low", "high", campaign.id, campaign.name, "expand_platforms"));
    }

    return recs;
  }

  generateCrossCampaignRecommendations(campaigns: CampaignData[]): Recommendation[] {
    const recs: Recommendation[] = [];
    const active = campaigns.filter((c) => c.status === "active" && c.metrics);

    if (active.length < 2) return recs;

    const bestRoas = [...active].sort((a, b) => (b.metrics?.roas || 0) - (a.metrics?.roas || 0));
    const worstRoas = [...active].sort((a, b) => (a.metrics?.roas || Infinity) - (b.metrics?.roas || Infinity));

    if (bestRoas[0].metrics!.roas > worstRoas[0].metrics!.roas * 2) {
      const gain = ((bestRoas[0].metrics!.roas - worstRoas[0].metrics!.roas) / worstRoas[0].metrics!.roas * 100).toFixed(0);
      recs.push({
        id: `cross_roas_${Date.now()}`,
        type: "cross_campaign",
        title: "Shift budget from low to high ROAS campaigns",
        description: `${worstRoas[0].name} (ROAS ${worstRoas[0].metrics!.roas.toFixed(2)}x) is underperforming vs ${bestRoas[0].name} (ROAS ${bestRoas[0].metrics!.roas.toFixed(2)}x). Reallocate 20% budget for potential ${gain}% gain.`,
        impact: "high", effort: "medium",
        campaignId: worstRoas[0].id, campaignName: worstRoas[0].name,
        action: "shift_budget", metric: "roas",
        currentValue: worstRoas[0].metrics!.roas, suggestedValue: bestRoas[0].metrics!.roas,
        potentialGain: `+${gain}% ROAS`,
      });
    }

    const platformCount: Record<string, { campaigns: number; totalSpend: number; totalRevenue: number }> = {};
    active.forEach((c) => {
      c.platforms.forEach((p) => {
        if (!platformCount[p]) platformCount[p] = { campaigns: 0, totalSpend: 0, totalRevenue: 0 };
        platformCount[p].campaigns++;
        platformCount[p].totalSpend += c.metrics?.spend || 0;
        platformCount[p].totalRevenue += c.metrics?.revenue || 0;
      });
    });

    Object.entries(platformCount).forEach(([platform, data]) => {
      if (data.totalSpend > 0) {
        const roas = data.totalRevenue / data.totalSpend;
        const overall = active.reduce((s, c) => s + (c.metrics?.revenue || 0), 0) / active.reduce((s, c) => s + (c.metrics?.spend || 0), 1);
        if (roas < overall * 0.6) {
          recs.push({
            id: `platform_under_${platform}_${Date.now()}`,
            type: "platform",
            title: `${platform} underperforming across campaigns`,
            description: `${platform} ROAS (${roas.toFixed(2)}x) is 40%+ below the cross-campaign average (${overall.toFixed(2)}x) across ${data.campaigns} campaigns. Review ${platform}-specific strategy.`,
            impact: "high", effort: "medium",
            action: "review_platform_strategy", metric: "platform_roas",
            currentValue: roas, suggestedValue: overall,
          });
        }
      }
    });

    const lowestCvr = [...active].sort((a, b) => (a.metrics?.cvr || 0) - (b.metrics?.cvr || 0))[0];
    const highestCvr = [...active].sort((a, b) => (b.metrics?.cvr || 0) - (a.metrics?.cvr || 0))[0];
    if (lowestCvr && highestCvr && lowestCvr.metrics!.cvr < highestCvr.metrics!.cvr * 0.5) {
      recs.push({
        id: `cvr_insight_${Date.now()}`,
        type: "cross_campaign",
        title: "Conversion rate optimization opportunity",
        description: `${lowestCvr.name} CVR (${lowestCvr.metrics!.cvr.toFixed(1)}%) is less than half of ${highestCvr.name} (${highestCvr.metrics!.cvr.toFixed(1)}%). Apply ${highestCvr.name}'s audience/targeting strategy to ${lowestCvr.name}.`,
        impact: "medium", effort: "high",
        campaignId: lowestCvr.id, campaignName: lowestCvr.name,
        action: "apply_best_practices", metric: "cvr",
        currentValue: lowestCvr.metrics!.cvr, suggestedValue: highestCvr.metrics!.cvr,
      });
    }

    return recs;
  }

  private makeRec(
    type: Recommendation["type"], title: string, description: string,
    impact: Recommendation["impact"], effort: Recommendation["effort"],
    campaignId?: string, campaignName?: string, action?: string,
    metric?: string, currentValue?: number, suggestedValue?: number, potentialGain?: string,
  ): Recommendation {
    return { id: `rec_${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, type, title, description, impact, effort, campaignId, campaignName, action, metric, currentValue, suggestedValue, potentialGain };
  }

  // ─── Thompson Sampling Bandits ───────────────────────────────────────

  private thompsonBanditArms: Map<string, { alpha: number; beta: number; label: string }> = new Map();

  /**
   * Thompson sampling for Bernoulli bandits.
   * Each arm maintains a Beta(alpha, beta) posterior. Selection samples from each
   * posterior and picks the highest — naturally balancing exploration vs exploitation.
   */
  registerThompsonArm(armId: string, label: string, priorAlpha = 1, priorBeta = 1): void {
    if (!this.thompsonBanditArms.has(armId)) {
      this.thompsonBanditArms.set(armId, { alpha: priorAlpha, beta: priorBeta, label });
    }
  }

  selectThompsonArm(experimentId?: string): { armId: string; label: string; probability: number; posteriorAlpha: number; posteriorBeta: number } {
    const arms = experimentId
      ? Array.from(this.thompsonBanditArms.entries()).filter(([id]) => id.startsWith(experimentId))
      : Array.from(this.thompsonBanditArms.entries());

    if (arms.length === 0) throw new Error("No Thompson sampling arms registered");

    let best: { id: string; label: string; alpha: number; beta: number; sample: number } | null = null;
    for (const [id, arm] of arms) {
      const sample = this.sampleBetaTS(arm.alpha, arm.beta);
      if (!best || sample > best.sample) {
        best = { id, label: arm.label, alpha: arm.alpha, beta: arm.beta, sample };
      }
    }

    return {
      armId: best!.id, label: best!.label,
      probability: Math.round((best!.alpha / (best!.alpha + best!.beta)) * 10000) / 10000,
      posteriorAlpha: best!.alpha, posteriorBeta: best!.beta,
    };
  }

  rewardThompsonArm(armId: string, reward: 0 | 1): { posteriorAlpha: number; posteriorBeta: number; probability: number } {
    const arm = this.thompsonBanditArms.get(armId);
    if (!arm) throw new Error(`Thompson arm "${armId}" not found`);
    if (reward === 1) arm.alpha++; else arm.beta++;
    this.thompsonBanditArms.set(armId, arm);
    return {
      posteriorAlpha: arm.alpha, posteriorBeta: arm.beta,
      probability: Math.round((arm.alpha / (arm.alpha + arm.beta)) * 10000) / 10000,
    };
  }

  getThompsonState(): { armId: string; label: string; alpha: number; beta: number; probability: number }[] {
    return Array.from(this.thompsonBanditArms.entries()).map(([id, arm]) => ({
      armId: id, label: arm.label, alpha: arm.alpha, beta: arm.beta,
      probability: Math.round((arm.alpha / (arm.alpha + arm.beta)) * 10000) / 10000,
    }));
  }

  private sampleBetaTS(alpha: number, beta: number): number {
    const sampleGamma = (shape: number): number => {
      if (shape < 1) {
        const u = Math.random();
        return sampleGamma(1 + shape) * Math.pow(u, 1 / shape);
      }
      const d = shape - 1 / 3;
      const c = 1 / Math.sqrt(9 * d);
      while (true) {
        const x = this.sampleNormalTS() * c + 1;
        if (x <= 0) continue;
        const v = Math.pow(x, 3);
        const u = Math.random();
        if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
        if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
      }
    };
    const x = sampleGamma(alpha);
    const y = sampleGamma(beta);
    return x / (x + y);
  }

  private sampleNormalTS(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // ─── LinUCB Contextual Bandits ─────────────────────────────────────

  private linUCBModels: Map<string, {
    A: number[][]; b: number[]; theta: number[]; d: number; lastUpdated: string;
  }> = new Map();

  /**
   * LinUCB (li near upper confidence bound) — contextual bandit algorithm.
   * Uses ridge regression to estimate reward for each context vector and selects the
   * arm with the highest upper confidence bound: theta^T x + alpha * sqrt(x^T A^{-1} x).
   */
  initializeLinUCB(dispatcherId: string, contextDimension: number, alpha = 0.5): void {
    // A = I_d (identity), b = zero vector
    const A = Array.from({ length: contextDimension }, (_, i) =>
      Array.from({ length: contextDimension }, (_, j) => (i === j ? 1 : 0)),
    );
    const b = new Array(contextDimension).fill(0);
    this.linUCBModels.set(dispatcherId, {
      A, b, theta: new Array(contextDimension).fill(0), d: contextDimension, lastUpdated: new Date().toISOString(),
    });
  }

  selectLinUCBArm(
    dispatcherId: string,
    armContexts: { armId: string; context: number[] }[],
    alpha = 0.5,
  ): { armId: string; ucb: number; expectedReward: number; uncertainty: number } {
    const model = this.linUCBModels.get(dispatcherId);
    if (!model) throw new Error(`LinUCB dispatcher "${dispatcherId}" not initialized`);

    let bestArm = armContexts[0]?.armId || "";
    let bestUcb = -Infinity;
    let bestExpected = 0, bestUncertainty = 0;

    for (const ac of armContexts) {
      if (ac.context.length !== model.d) throw new Error(`Expected context dimension ${model.d}, got ${ac.context.length}`);

      // A^{-1} using Gaussian elimination (for small d)
      const Ainv = this.matrixInverse(model.A);
      // theta = A^{-1} b
      const theta = this.matrixVectorMultiply(Ainv, model.b);
      model.theta = theta;

      // Expected reward: theta^T x
      const expected = ac.context.reduce((s, xi, i) => s + xi * theta[i], 0);

      // Uncertainty: alpha * sqrt(x^T A^{-1} x)
      const Atx = this.matrixVectorMultiply(Ainv, ac.context);
      const variance = ac.context.reduce((s, xi, i) => s + xi * Atx[i], 0);
      const uncertainty = alpha * Math.sqrt(Math.max(0, variance));

      const ucb = expected + uncertainty;
      if (ucb > bestUcb) { bestUcb = ucb; bestArm = ac.armId; bestExpected = expected; bestUncertainty = uncertainty; }
    }

    return {
      armId: bestArm,
      ucb: Math.round(bestUcb * 10000) / 10000,
      expectedReward: Math.round(bestExpected * 10000) / 10000,
      uncertainty: Math.round(bestUncertainty * 10000) / 10000,
    };
  }

  rewardLinUCBArm(dispatcherId: string, armContext: number[], reward: number): { theta: number[]; aNorm: number } {
    const model = this.linUCBModels.get(dispatcherId);
    if (!model) throw new Error(`LinUCB dispatcher "${dispatcherId}" not initialized`);

    // A <- A + xx^T
    for (let i = 0; i < model.d; i++) {
      for (let j = 0; j < model.d; j++) {
        model.A[i][j] += armContext[i] * armContext[j];
      }
    }

    // b <- b + reward * x
    for (let i = 0; i < model.d; i++) model.b[i] += reward * armContext[i];

    model.lastUpdated = new Date().toISOString();

    const Ainv = this.matrixInverse(model.A);
    const theta = this.matrixVectorMultiply(Ainv, model.b);

    // A norm: sqrt(theta^T A theta)
    const Atheta = this.matrixVectorMultiply(model.A, theta);
    const aNorm = Math.sqrt(theta.reduce((s, ti, i) => s + ti * Atheta[i], 0));

    return { theta, aNorm: Math.round(aNorm * 10000) / 10000 };
  }

  getLinUCBState(dispatcherId: string): { d: number; lastUpdated: string; theta: number[]; aNorm: number } | null {
    const model = this.linUCBModels.get(dispatcherId);
    if (!model) return null;
    const Ainv = this.matrixInverse(model.A);
    const theta = this.matrixVectorMultiply(Ainv, model.b);
    const Atheta = this.matrixVectorMultiply(model.A, theta);
    const aNorm = Math.sqrt(theta.reduce((s, ti, i) => s + ti * Atheta[i], 0));
    return { d: model.d, lastUpdated: model.lastUpdated, theta, aNorm: Math.round(aNorm * 10000) / 10000 };
  }

  private matrixInverse(A: number[][]): number[][] {
    const n = A.length;
    // Augment with identity
    const aug = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);

    // Gaussian elimination with partial pivoting
    for (let col = 0; col < n; col++) {
      // Partial pivot
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
      }
      [aug[col], aug[maxRow]] = [aug[col], aug[maxRow]];

      const pivot = aug[col][col];
      if (Math.abs(pivot) < 1e-15) continue;

      // Scale row
      for (let j = col; j < 2 * n; j++) aug[col][j] /= pivot;

      // Eliminate other rows
      for (let row = 0; row < n; row++) {
        if (row !== col) {
          const factor = aug[row][col];
          for (let j = col; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
        }
      }
    }

    return aug.map((row) => row.slice(n));
  }

  private matrixVectorMultiply(M: number[][], v: number[]): number[] {
    const n = M.length;
    return M.map((row) => row.reduce((s, mij, j) => s + mij * v[j], 0));
  }

  // ─── Collaborative Filtering for Cross-Campaign ────────────────────

  /**
   * Collaborative filtering using user-campaign interaction matrix.
   * Predicts campaign performance for a target campaign based on similar campaigns.
   * Uses cosine similarity between campaign feature vectors.
   */
  collaborativeFilteringRecommendations(
    campaigns: CampaignData[],
    similarityMetric: "cosine" | "pearson" = "cosine",
    topK = 3,
  ): {
    campaignId: string; campaignName: string; similarCampaigns: { id: string; name: string; similarity: number }[];
    predictedMetrics: { roas: number; ctr: number; cvr: number };
  }[] {
    const valid = campaigns.filter((c) => c.metrics);
    if (valid.length < 3) return [];

    // Build feature vectors (normalized metrics)
    const extractVector = (c: CampaignData): number[] => {
      const m = c.metrics!;
      return [
        Math.log10(Math.max(1, m.impressions)),
        m.clicks / Math.max(m.impressions, 1) * 100, // CTR
        m.conversions / Math.max(m.clicks, 1) * 100, // CVR
        m.roas,
        m.spend / Math.max(m.impressions, 1) * 1000, // CPM
        m.revenue / Math.max(m.spend, 1), // ROAS alt
      ];
    };

    const results: {
      campaignId: string; campaignName: string; similarCampaigns: { id: string; name: string; similarity: number }[];
      predictedMetrics: { roas: number; ctr: number; cvr: number };
    }[] = [];

    for (const target of valid) {
      const targetVec = extractVector(target);
      const similarities: { id: string; name: string; similarity: number }[] = [];

      for (const other of valid) {
        if (other.id === target.id) continue;
        const otherVec = extractVector(other);
        const sim = similarityMetric === "cosine" ? this.cosineSimilarity(targetVec, otherVec) : this.pearsonSimilarity(targetVec, otherVec);
        similarities.push({ id: other.id, name: other.name, similarity: Math.round(sim * 10000) / 10000 });
      }

      similarities.sort((a, b) => b.similarity - a.similarity);
      const top = similarities.slice(0, topK).filter((s) => s.similarity > 0.3);

      // Predict metrics as similarity-weighted average of top-k
      let simSum = 0;
      let predRoas = 0, predCtr = 0, predCvr = 0;
      for (const s of top) {
        const match = valid.find((c) => c.id === s.id);
        if (match?.metrics) {
          simSum += s.similarity;
          predRoas += s.similarity * match.metrics.roas;
          predCtr += s.similarity * match.metrics.ctr;
          predCvr += s.similarity * match.metrics.cvr;
        }
      }

      results.push({
        campaignId: target.id,
        campaignName: target.name,
        similarCampaigns: top.length > 0 ? top : [{ id: "none", name: "No similar campaigns", similarity: 0 }],
        predictedMetrics: {
          roas: simSum > 0 ? Math.round((predRoas / simSum) * 100) / 100 : target.metrics?.roas || 0,
          ctr: simSum > 0 ? Math.round((predCtr / simSum) * 100) / 100 : target.metrics?.ctr || 0,
          cvr: simSum > 0 ? Math.round((predCvr / simSum) * 100) / 100 : target.metrics?.cvr || 0,
        },
      });
    }

    return results;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom > 0 ? dot / denom : 0;
  }

  private pearsonSimilarity(a: number[], b: number[]): number {
    const n = a.length;
    const ma = a.reduce((s, v) => s + v, 0) / n;
    const mb = b.reduce((s, v) => s + v, 0) / n;
    let num = 0, da = 0, db = 0;
    for (let i = 0; i < n; i++) {
      num += (a[i] - ma) * (b[i] - mb);
      da += (a[i] - ma) ** 2;
      db += (b[i] - mb) ** 2;
    }
    const den = Math.sqrt(da) * Math.sqrt(db);
    return den > 0 ? num / den : 0;
  }

  // ─── Multi-Armed Bandit ──────────────────────────────────────────────

  private banditArms: Map<string, BanditArm> = new Map();

  /**
   * Register or update a bandit arm (recommendation type/category).
   * Each arm tracks: plays (n), rewards sum, and reward history.
   */
  registerArm(armId: string, label: string): void {
    if (!this.banditArms.has(armId)) {
      this.banditArms.set(armId, { armId, label, plays: 0, rewardSum: 0, rewards: [], lastPlayed: null });
    }
  }

  /**
   * Select the best arm using ε-greedy or UCB1.
   */
  selectArm(strategy: "epsilon_greedy" | "ucb1" = "ucb1", epsilon = 0.1): { armId: string; label: string; expectedReward: number; method: string } {
    const arms = Array.from(this.banditArms.values());
    if (arms.length === 0) throw new Error("No bandit arms registered. Call registerArm first.");

    // Exploration
    if (strategy === "epsilon_greedy" && Math.random() < epsilon) {
      const chosen = arms[Math.floor(Math.random() * arms.length)];
      return { armId: chosen.armId, label: chosen.label, expectedReward: this.armAverage(chosen), method: "explore" };
    }

    // Exploitation
    const totalPlays = arms.reduce((s, a) => s + a.plays, 0);
    let best: { arm: BanditArm; value: number } | null = null;

    for (const arm of arms) {
      let value: number;
      if (strategy === "ucb1") {
        // UCB1: upper confidence bound
        const avg = this.armAverage(arm);
        const exploration = arm.plays > 0 ? Math.sqrt(2 * Math.log(Math.max(totalPlays, 1)) / arm.plays) : Infinity;
        value = avg + exploration;
      } else {
        // ε-greedy exploitation = expected value
        value = this.armAverage(arm);
      }
      if (!best || value > best.value) best = { arm, value };
    }

    return { armId: best!.arm.armId, label: best!.arm.label, expectedReward: Math.round(this.armAverage(best!.arm) * 10000) / 10000, method: strategy };
  }

  /**
   * Record a reward for a given arm.
   */
  rewardArm(armId: string, reward: number): void {
    const arm = this.banditArms.get(armId);
    if (!arm) throw new Error(`Arm "${armId}" not found`);
    arm.plays++;
    arm.rewardSum += reward;
    arm.rewards.push(reward);
    arm.lastPlayed = new Date().toISOString();
  }

  /**
   * Get bandit state for all arms.
   */
  banditState(): { arms: BanditArm[]; bestArm: { armId: string; expectedReward: number } | null; totalPlays: number } {
    const arms = Array.from(this.banditArms.values());
    const totalPlays = arms.reduce((s, a) => s + a.plays, 0);
    let best: BanditArm | null = null;
    let bestAvg = -Infinity;
    for (const arm of arms) {
      const avg = this.armAverage(arm);
      if (avg > bestAvg) { bestAvg = avg; best = arm; }
    }
    return {
      arms: arms.map((a) => ({ ...a, expectedReward: this.armAverage(a) })),
      bestArm: best ? { armId: best.armId, expectedReward: Math.round(bestAvg * 10000) / 10000 } : null,
      totalPlays,
    };
  }

  private armAverage(arm: BanditArm): number {
    return arm.plays > 0 ? arm.rewardSum / arm.plays : 0;
  }

  // ─── Adaptive Threshold Tuning ──────────────────────────────────────

  private thresholdHistory: Map<string, { threshold: number; successRate: number; hits: number; misses: number; lastAdjusted: string }> = new Map();

  /**
   * Adjusts a threshold based on observed hit/miss rate using multiplicative update.
   * If success rate is too high, the threshold is too easy — tighten it.
   * If success rate is too low, the threshold is too strict — loosen it.
   */
  tuneThreshold(
    thresholdId: string,
    currentValue: number,
    didHit: boolean,
    targetSuccessRate = 0.3,
    adjustmentFactor = 0.05,
    minValue = 0.1,
    maxValue = 100,
  ): { adjustedThreshold: number; successRate: number; direction: "tightened" | "loosened" | "unchanged" } {
    const state = this.thresholdHistory.get(thresholdId) || { threshold: currentValue, successRate: 0, hits: 0, misses: 0, lastAdjusted: "" };
    if (didHit) state.hits++; else state.misses++;
    const total = state.hits + state.misses;
    state.successRate = state.hits / Math.max(total, 1);

    let direction: "tightened" | "loosened" | "unchanged" = "unchanged";
    if (total >= 10) {
      const diff = state.successRate - targetSuccessRate;
      if (diff > 0.1) {
        // Too easy — tighten
        state.threshold = Math.min(maxValue, state.threshold * (1 + adjustmentFactor));
        direction = "tightened";
      } else if (diff < -0.1) {
        // Too strict — loosen
        state.threshold = Math.max(minValue, state.threshold * (1 - adjustmentFactor));
        direction = "loosened";
      }
      state.hits = 0;
      state.misses = 0;
      state.lastAdjusted = new Date().toISOString();
    }

    this.thresholdHistory.set(thresholdId, state);
    return { adjustedThreshold: Math.round(state.threshold * 100) / 100, successRate: Math.round(state.successRate * 100) / 100, direction };
  }

  getThresholdState(thresholdId: string): { threshold: number; successRate: number; hits: number; misses: number; lastAdjusted: string } | null {
    return this.thresholdHistory.get(thresholdId) || null;
  }

  /**
   * Generate recommendations using bandit-selected arms for adaptive suggestions.
   */
  generateBanditRecommendations(campaigns: CampaignData[]): { recommendations: Recommendation[]; banditSelection: { armId: string; label: string } } {
    // Register arms if not yet done
    const armDefs = [
      { id: "budget_realloc", label: "Budget Reallocation" },
      { id: "creative_refresh", label: "Creative Refresh" },
      { id: "audience_tune", label: "Audience Tuning" },
      { id: "platform_expand", label: "Platform Expansion" },
      { id: "bid_optimize", label: "Bid Optimization" },
    ];
    for (const arm of armDefs) this.registerArm(arm.id, arm.label);

    // Select best arm
    const selected = this.selectArm("ucb1");
    const baseRecs = this.generateCampaignRecommendations(campaigns[0] || { id: "", name: "", status: "", type: "", platforms: [], budget: { daily: 0, lifetime: 0, spent: 0, remaining: 0, currency: "USD" } });

    // Filter/rank recommendations based on selected arm type
    const armTypeMap: Record<string, string> = {
      budget_realloc: "budget",
      creative_refresh: "creative",
      audience_tune: "audience",
      platform_expand: "platform",
      bid_optimize: "optimization",
    };
    const preferredType = armTypeMap[selected.armId] || "optimization";
    const sorted = [...baseRecs].sort((a, b) => {
      const aMatch = a.type === preferredType ? 1 : 0;
      const bMatch = b.type === preferredType ? 1 : 0;
      return bMatch - aMatch || (b.impact === "high" ? 1 : 0) - (a.impact === "high" ? 1 : 0);
    });

    return { recommendations: sorted.slice(0, 5), banditSelection: { armId: selected.armId, label: selected.label } };
  }
}

interface BanditArm {
  armId: string;
  label: string;
  plays: number;
  rewardSum: number;
  rewards: number[];
  lastPlayed: string | null;
}

function isNearEnd(endDate?: string): boolean {
  if (!endDate) return false;
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const diffDays = (end - now) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 14;
}

export const recommendationEngine = new RecommendationEngineService();
