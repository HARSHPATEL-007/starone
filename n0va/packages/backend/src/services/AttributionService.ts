export type AttributionModel = "first_click" | "last_click" | "linear" | "time_decay" | "position_based" | "data_driven";

interface Touchpoint {
  id: string;
  campaignId: string;
  campaignName: string;
  platform: string;
  channel: string;
  timestamp: Date;
  type: "impression" | "click" | "view_through" | "engagement" | "conversion";
  weight: number;
  cost: number;
  revenue: number;
}

interface AttributionResult {
  touchpoints: Touchpoint[];
  model: AttributionModel;
  totalConversions: number;
  totalRevenue: number;
  totalCost: number;
  attributedRevenue: number;
  roas: number;
  platformBreakdown: Record<string, {
    cost: number;
    revenue: number;
    conversions: number;
    attributedRevenue: number;
    roas: number;
    weight: number;
  }>;
  campaignBreakdown: Record<string, {
    cost: number;
    revenue: number;
    conversions: number;
    attributedRevenue: number;
    roas: number;
  }>;
  attributionWindow: number;
}

interface ConversionPath {
  conversionId: string;
  userId: string;
  touchpoints: Touchpoint[];
  totalRevenue: number;
  conversionDate: Date;
}

export class AttributionService {
  private readonly defaultWindow = 30;

  attribute(
    paths: ConversionPath[],
    model: AttributionModel = "last_click",
    attributionWindow: number = this.defaultWindow
  ): AttributionResult {
    const touchpoints = paths.flatMap((p) => p.touchpoints);

    switch (model) {
      case "first_click":
        this.applyFirstClick(paths);
        break;
      case "last_click":
        this.applyLastClick(paths);
        break;
      case "linear":
        this.applyLinear(paths);
        break;
      case "time_decay":
        this.applyTimeDecay(paths);
        break;
      case "position_based":
        this.applyPositionBased(paths);
        break;
      case "data_driven":
        this.applyDataDriven(paths);
        break;
    }

    return this.buildResult(paths, model, attributionWindow);
  }

  private applyFirstClick(paths: ConversionPath[]): void {
    for (const path of paths) {
      const sorted = [...path.touchpoints].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      if (sorted.length > 0) {
        sorted[0].weight = 1;
        for (let i = 1; i < sorted.length; i++) {
          sorted[i].weight = 0;
        }
      }
    }
  }

  private applyLastClick(paths: ConversionPath[]): void {
    for (const path of paths) {
      const sorted = [...path.touchpoints].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      if (sorted.length > 0) {
        sorted[0].weight = 1;
        for (let i = 1; i < sorted.length; i++) {
          sorted[i].weight = 0;
        }
      }
    }
  }

  private applyLinear(paths: ConversionPath[]): void {
    for (const path of paths) {
      const count = path.touchpoints.length;
      if (count > 0) {
        const weight = 1 / count;
        for (const tp of path.touchpoints) {
          tp.weight = weight;
        }
      }
    }
  }

  private applyTimeDecay(paths: ConversionPath[]): void {
    for (const path of paths) {
      const sorted = [...path.touchpoints].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const total = sorted.length;
      if (total > 0) {
        const totalWeight = sorted.reduce((sum, _, i) => sum + (i + 1), 0);
        for (let i = 0; i < total; i++) {
          sorted[i].weight = (i + 1) / totalWeight;
        }
      }
    }
  }

  private applyPositionBased(paths: ConversionPath[]): void {
    for (const path of paths) {
      const sorted = [...path.touchpoints].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const total = sorted.length;
      if (total === 1) {
        sorted[0].weight = 1;
      } else if (total === 2) {
        sorted[0].weight = 0.5;
        sorted[1].weight = 0.5;
      } else if (total >= 3) {
        const firstWeight = 0.3;
        const lastWeight = 0.4;
        const middleWeight = 0.3 / (total - 2);
        sorted[0].weight = firstWeight;
        sorted[total - 1].weight = lastWeight;
        for (let i = 1; i < total - 1; i++) {
          sorted[i].weight = middleWeight;
        }
      }
    }
  }

  private applyDataDriven(paths: ConversionPath[]): void {
    for (const path of paths) {
      const sorted = [...path.touchpoints].sort((a, t) => a.timestamp.getTime() - t.timestamp.getTime());
      const total = sorted.length;
      if (total === 0) continue;

      const platformMultipliers: Record<string, number> = {
        linkedin: 1.3,
        google: 1.2,
        meta: 1.1,
        tiktok: 0.9,
        snapchat: 0.8,
        twitter: 0.85,
      };

      const engagementMultipliers: Record<string, number> = {
        click: 1.0,
        engagement: 0.8,
        conversion: 1.2,
        view_through: 0.3,
        impression: 0.1,
      };

      const scored = sorted.map((tp) => {
        const platformScore = platformMultipliers[tp.platform.toLowerCase()] || 1.0;
        const engagementScore = engagementMultipliers[tp.type] || 0.5;
        const recencyScore = 1 - (path.conversionDate.getTime() - tp.timestamp.getTime()) / (this.defaultWindow * 86400000);
        return { tp, score: platformScore * engagementScore * Math.max(0.1, recencyScore) };
      });

      const totalScore = scored.reduce((s, x) => s + x.score, 0);
      for (const s of scored) {
        s.tp.weight = totalScore > 0 ? s.score / totalScore : 0;
      }
    }
  }

  private buildResult(
    paths: ConversionPath[],
    model: AttributionModel,
    attributionWindow: number
  ): AttributionResult {
    const allTps = paths.flatMap((p) => p.touchpoints);
    const totalRevenue = paths.reduce((s, p) => s + p.totalRevenue, 0);
    const totalCost = allTps.reduce((s, tp) => s + tp.cost, 0);
    const totalConversions = paths.length;

    const platformBreakdown: Record<string, { cost: number; revenue: number; conversions: number; attributedRevenue: number; roas: number; weight: number }> = {};
    const campaignBreakdown: Record<string, { cost: number; revenue: number; conversions: number; attributedRevenue: number; roas: number }> = {};

    for (const path of paths) {
      for (const tp of path.touchpoints) {
        const attributedRev = tp.weight * path.totalRevenue;

        if (!platformBreakdown[tp.platform]) {
          platformBreakdown[tp.platform] = { cost: 0, revenue: 0, conversions: 0, attributedRevenue: 0, roas: 0, weight: 0 };
        }
        platformBreakdown[tp.platform].cost += tp.cost;
        platformBreakdown[tp.platform].revenue += tp.revenue;
        platformBreakdown[tp.platform].conversions += path.totalRevenue > 0 ? tp.weight : 0;
        platformBreakdown[tp.platform].attributedRevenue += attributedRev;
        platformBreakdown[tp.platform].weight += tp.weight;

        if (!campaignBreakdown[tp.campaignId]) {
          campaignBreakdown[tp.campaignId] = { cost: 0, revenue: 0, conversions: 0, attributedRevenue: 0, roas: 0 };
        }
        campaignBreakdown[tp.campaignId].cost += tp.cost;
        campaignBreakdown[tp.campaignId].revenue += tp.revenue;
        campaignBreakdown[tp.campaignId].conversions += path.totalRevenue > 0 ? tp.weight : 0;
        campaignBreakdown[tp.campaignId].attributedRevenue += attributedRev;
      }
    }

    for (const key of Object.keys(platformBreakdown)) {
      const p = platformBreakdown[key];
      p.roas = p.cost > 0 ? p.attributedRevenue / p.cost : 0;
    }
    for (const key of Object.keys(campaignBreakdown)) {
      const c = campaignBreakdown[key];
      c.roas = c.cost > 0 ? c.attributedRevenue / c.cost : 0;
    }

    return {
      touchpoints: allTps,
      model,
      totalConversions,
      totalRevenue,
      totalCost,
      attributedRevenue: totalRevenue,
      roas: totalCost > 0 ? totalRevenue / totalCost : 0,
      platformBreakdown,
      campaignBreakdown,
      attributionWindow,
    };
  }

  compareModels(paths: ConversionPath[]): Record<AttributionModel, AttributionResult> {
    const models: AttributionModel[] = ["first_click", "last_click", "linear", "time_decay", "position_based", "data_driven"];
    const results: Record<string, AttributionResult> = {};
    for (const model of models) {
      results[model] = this.attribute(paths, model);
    }
    return results;
  }

  // ─── Shapley Value Attribution ────────────────────────────────────────
  shapleyValue(paths: ConversionPath[]): AttributionResult {
    // Aggregate channels across all paths
    const channelSet = new Set<string>();
    const pathChannels: { channels: string[]; revenue: number }[] = [];

    for (const path of paths) {
      const channels = [...new Set(path.touchpoints.map((tp) => tp.platform))];
      channels.forEach((c) => channelSet.add(c));
      pathChannels.push({ channels, revenue: path.totalRevenue });
    }

    const channels = Array.from(channelSet);
    const n = channels.length;
    const shapleyScores: Record<string, number> = {};
    channels.forEach((c) => (shapleyScores[c] = 0));

    // Compute Shapley value: φ_i = Σ_{S ⊆ N\{i}} (|S|! (n-|S|-1)!) / n! * (v(S∪{i}) - v(S))
    for (const channel of channels) {
      const others = channels.filter((c) => c !== channel);
      let totalScore = 0;

      // Iterate over all subsets of other channels (2^(n-1) subsets)
      for (let mask = 0; mask < (1 << others.length); mask++) {
        const subset = new Set<string>();
        for (let j = 0; j < others.length; j++) {
          if (mask & (1 << j)) subset.add(others[j]);
        }

        const s = subset.size;
        const weight = this.factorial(s) * this.factorial(n - s - 1) / this.factorial(n);

        const valWith = this.coalitionValue(pathChannels, new Set([...subset, channel]));
        const valWithout = this.coalitionValue(pathChannels, subset);

        totalScore += weight * (valWith - valWithout);
      }

      shapleyScores[channel] = Math.max(0, totalScore);
    }

    const totalShapley = Object.values(shapleyScores).reduce((a, b) => a + b, 0) || 1;

    // Map Shapley weights back to individual touchpoints
    for (const path of paths) {
      const platformGroups: Record<string, Touchpoint[]> = {};
      for (const tp of path.touchpoints) {
        if (!platformGroups[tp.platform]) platformGroups[tp.platform] = [];
        platformGroups[tp.platform].push(tp);
      }

      for (const [platform, tps] of Object.entries(platformGroups)) {
        const platformShare = shapleyScores[platform] / totalShapley;
        const perTpWeight = platformShare / tps.length;
        for (const tp of tps) {
          tp.weight = perTpWeight;
        }
      }
    }

    return this.buildResult(paths, "shapley_value" as any, 30);
  }

  // ─── Markov Chain Attribution with Removal Effects ─────────────────────

  markovChainAttribution(paths: ConversionPath[]): AttributionResult & { removalEffects: Record<string, number>; transitionMatrix: Record<string, Record<string, number>> } {
    // Extract unique channels + START + CONVERSION + NULL states
    const channels = new Set<string>();
    for (const path of paths) {
      for (const tp of path.touchpoints) channels.add(tp.platform);
    }
    const states = ["(start)", "(conversion)", "(null)", ...Array.from(channels)];

    // Initialize transition counts
    const transitions: Record<string, Record<string, number>> = {};
    states.forEach((s) => {
      transitions[s] = {};
      states.forEach((t) => (transitions[s][t] = 0));
    });

    // Count transitions from conversion paths
    let totalConversions = 0;
    let totalNull = 0;

    for (const path of paths) {
      const sorted = [...path.touchpoints].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      let prev = "(start)";
      for (const tp of sorted) {
        if (tp.type === "conversion") {
          transitions[prev]["(conversion)"]++;
          totalConversions++;
        } else {
          transitions[prev][tp.platform]++;
          prev = tp.platform;
        }
      }
      if (prev !== "(start)" && prev !== "(conversion)") {
        transitions[prev]["(null)"]++;
        totalNull++;
      }
    }

    // Convert to probabilities
    const transitionProbs: Record<string, Record<string, number>> = {};
    states.forEach((s) => {
      transitionProbs[s] = {};
      const total = Object.values(transitions[s]).reduce((a, b) => a + b, 0);
      if (total === 0) {
        states.forEach((t) => (transitionProbs[s][t] = t === "(null)" ? 1 : 0));
      } else {
        states.forEach((t) => (transitionProbs[s][t] = transitions[s][t] / total));
      }
    });

    // Compute conversion probability given all channels
    const allConvProb = this.markovConversionProb(transitionProbs, states);

    // Removal effects: remove each channel and recompute
    const removalEffects: Record<string, number> = {};
    for (const ch of channels) {
      const reducedStates = states.filter((s) => s !== ch);
      const reducedProbs: Record<string, Record<string, number>> = {};
      reducedStates.forEach((s) => {
        reducedProbs[s] = {};
        reducedStates.forEach((t) => {
          if (s === ch || t === ch) {
            reducedProbs[s][t] = 0;
          } else {
            reducedProbs[s][t] = transitionProbs[s][t];
          }
        });
        // Redirect transitions that went through ch
        if (s !== ch && s !== "(conversion)" && s !== "(null)") {
          const removedWeight = transitionProbs[s][ch] || 0;
          if (removedWeight > 0) {
            const remaining = Object.entries(transitionProbs[s])
              .filter(([k]) => k !== s && k !== ch)
              .reduce((a, [, v]) => a + v, 0);
            if (remaining > 0) {
              const scale = (1 - removedWeight) / remaining;
              reducedStates.forEach((t) => {
                if (t !== s && t !== ch) {
                  reducedProbs[s][t] = (transitionProbs[s][t] || 0) * scale;
                }
              });
            } else {
              reducedProbs[s]["(null)"] = 1;
            }
          }
        }
      });

      const convProb = this.markovConversionProb(reducedProbs, reducedStates);
      removalEffects[ch] = Math.max(0, 1 - convProb / Math.max(allConvProb, 0.001));
    }

    // Normalize removal effects to get attribution weights
    const totalRemoval = Object.values(removalEffects).reduce((a, b) => a + b, 0) || 1;

    // Apply Markov weights to touchpoints
    for (const path of paths) {
      const platformGroups: Record<string, Touchpoint[]> = {};
      for (const tp of path.touchpoints) {
        if (!platformGroups[tp.platform]) platformGroups[tp.platform] = [];
        platformGroups[tp.platform].push(tp);
      }
      for (const [platform, tps] of Object.entries(platformGroups)) {
        const weight = (removalEffects[platform] || 0) / totalRemoval;
        for (const tp of tps) tp.weight = weight / tps.length;
      }
    }

    return {
      ...this.buildResult(paths, "markov_chain" as any, 30),
      removalEffects,
      transitionMatrix: transitionProbs,
    };
  }

  private factorial(n: number): number {
    if (n <= 1) return 1;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  private coalitionValue(paths: { channels: string[]; revenue: number }[], coalition: Set<string>): number {
    return paths
      .filter((p) => p.channels.some((c) => coalition.has(c)))
      .reduce((s, p) => s + p.revenue, 0);
  }

  private markovConversionProb(probs: Record<string, Record<string, number>>, states: string[]): number {
    // Solve linear system: P(conversion from state i) using iterative method
    const probsFrom: Record<string, number> = {};
    states.forEach((s) => (probsFrom[s] = 0));
    probsFrom["(conversion)"] = 1;
    probsFrom["(null)"] = 0;

    // Iterate until convergence (value iteration)
    for (let iter = 0; iter < 100; iter++) {
      let maxDiff = 0;
      for (const s of states) {
        if (s === "(conversion)" || s === "(null)") continue;
        let newProb = 0;
        for (const t of states) {
          newProb += (probs[s][t] || 0) * probsFrom[t];
        }
        const diff = Math.abs(newProb - probsFrom[s]);
        if (diff > maxDiff) maxDiff = diff;
        probsFrom[s] = newProb;
      }
      if (maxDiff < 0.0001) break;
    }

    return probsFrom["(start)"] || 0;
  }

  generateSamplePaths(
    count: number = 100,
    campaigns: { id: string; name: string; platform: string }[] = []
  ): ConversionPath[] {
    let activeCampaigns = campaigns;
    const paths: ConversionPath[] = [];
    if (activeCampaigns.length === 0) {
      activeCampaigns = [
        { id: "camp_1", name: "Q3 Enterprise SaaS Push", platform: "meta" },
        { id: "camp_2", name: "Brand Awareness", platform: "google" },
        { id: "camp_3", name: "Retargeting", platform: "linkedin" },
        { id: "camp_4", name: "Prospecting", platform: "tiktok" },
      ];
    }

    for (let i = 0; i < count; i++) {
      const numTps = Math.floor(Math.random() * 5) + 1;
      const conversionDate = new Date(Date.now() - Math.floor(Math.random() * 30 * 86400000));
      const touchpoints: Touchpoint[] = [];
      let totalRevenue = Math.floor(Math.random() * 500) + 50;

      for (let j = 0; j < numTps; j++) {
        const campaign = activeCampaigns[Math.floor(Math.random() * activeCampaigns.length)];
        const daysBefore = Math.floor(Math.random() * 30);
        const tp: Touchpoint = {
          id: `tp_${i}_${j}`,
          campaignId: campaign.id,
          campaignName: campaign.name,
          platform: campaign.platform,
          channel: ["social", "search", "display", "email", "video"][Math.floor(Math.random() * 5)],
          timestamp: new Date(conversionDate.getTime() - daysBefore * 86400000),
          type: ["impression", "click", "view_through", "engagement", "conversion"][Math.floor(Math.random() * 5)] as Touchpoint["type"],
          weight: 0,
          cost: Math.floor(Math.random() * 50) + 1,
          revenue: totalRevenue / numTps,
        };
        touchpoints.push(tp);
      }

      paths.push({
        conversionId: `conv_${i}`,
        userId: `user_${Math.floor(Math.random() * 1000)}`,
        touchpoints,
        totalRevenue,
        conversionDate,
      });
    }

    return paths;
  }
}

export const attributionService = new AttributionService();
