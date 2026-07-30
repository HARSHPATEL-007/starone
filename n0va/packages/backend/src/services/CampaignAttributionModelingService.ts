function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
  return Math.abs(h);
}

function seededRandom(seed: string): () => number {
  let state = hashStr(seed);
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

interface Touchpoint {
  channel: string;
  timestamp: string;
  weight?: number;
  campaignId?: string;
}

interface AttributionResult {
  campaignId: string;
  model: string;
  allocations: { channel: string; conversions: number; share: number; value: number }[];
  totalConversions: number;
  totalValue: number;
}

interface ShapleyInput {
  channels: string[];
  conversionValue: (coalition: string[]) => number;
}

interface MarkovChainResult {
  campaignId: string;
  transitionMatrix: Record<string, Record<string, number>>;
  removalEffects: { channel: string; removalEffect: number; importance: string }[];
  allocations: { channel: string; conversions: number; share: number; value: number }[];
}

interface ModelComparison {
  models: string[];
  agreement: number;
  rankCorrelations: { modelA: string; modelB: string; spearmanRho: number }[];
  topChannelByModel: { model: string; topChannel: string; share: number }[];
  consensusTop3: string[];
  divergenceScore: number;
}

interface ChannelAttribution {
  campaignId: string;
  channels: { channel: string; firstTouch: number; lastTouch: number; linear: number; timeDecay: number; positionBased: number; shapley: number; markov: number; consensus: number; trend: "rising" | "declining" | "stable" }[];
}

interface AttributionInsight {
  insight: string;
  type: "channel" | "model" | "strategy" | "opportunity";
  severity: "info" | "warning" | "positive";
  detail: string;
  recommendedAction?: string;
}

interface CustomAttributionConfig {
  weights: { position: string; weight: number }[];
  decayFactor?: number;
}

interface ChannelContribution {
  channel: string;
  directConversions: number;
  assistedConversions: number;
  assistedValue: number;
  incrementalLift: number;
  synergyScore: number;
  role: "primary" | "assister" | "both" | "minor";
}

interface ROIDistribution {
  model: string;
  channels: { channel: string; conversions: number; spend: number; revenue: number; roas: number; share: number }[];
  totalROAS: number;
  concentration: number;
}

interface TimeToConvertAnalysis {
  channel: string;
  avgHoursToConvert: number;
  medianHoursToConvert: number;
  stdHours: number;
  touchpointCount: number;
  conversionWindow: { min: number; max: number };
  efficiency: number;
}

interface CrossCampaignAttribution {
  campaigns: { campaignId: string; channels: { channel: string; contribution: number; overlapWithOtherCampaigns: number }[] }[];
  overlappingChannels: { channel: string; campaigns: string[]; totalContribution: number; doubleCounted: boolean }[];
  deduplicatedTotal: number;
  rawTotal: number;
}

interface AttributionWhatIf {
  campaignId: string;
  scenarios: { name: string; reallocation: { channel: string; newShare: number }[]; projectedConversions: number; projectedRevenue: number; projectedROAS: number; changeFromCurrent: number; risk: "low" | "medium" | "high" }[];
  bestScenario: string;
}

export class CampaignAttributionModelingService {
  private getSeed(campaignId: string, tenantId: string): string {
    return `attr_${campaignId}_${tenantId}`;
  }

  private generateTouchpoints(campaignId: string, tenantId: string): Touchpoint[] {
    const seed = this.getSeed(campaignId, tenantId);
    const rng = seededRandom(seed + "_tps");
    const channels = ["Display", "Search", "Social", "Email", "Video", "Direct", "Referral", "Affiliate"];
    const convChannels = ["Search", "Direct", "Email", "Referral"];
    const touchpoints: Touchpoint[] = [];
    const numPaths = Math.floor(rng() * 5) + 5;
    const startTime = Date.now() - 7 * 86400000;
    for (let p = 0; p < numPaths; p++) {
      const pathLen = Math.floor(rng() * 4) + 1;
      const pathChannels = new Set<string>();
      for (let t = 0; t < pathLen; t++) {
        const ch = channels[Math.floor(rng() * channels.length)];
        pathChannels.add(ch);
        const ts = new Date(startTime + rng() * 7 * 86400000);
        touchpoints.push({ channel: ch, timestamp: ts.toISOString(), campaignId });
      }
      // Add a conversion
      const convCh = convChannels[Math.floor(rng() * convChannels.length)];
      pathChannels.add(convCh);
      const convTs = new Date(startTime + 7 * 86400000 + rng() * 86400000);
      touchpoints.push({ channel: convCh, timestamp: convTs.toISOString(), campaignId, weight: Math.round((rng() * 100 + 20) * 100) / 100 });
    }
    return touchpoints;
  }

  runAttribution(campaignId: string, tenantId: string, model: "first_touch" | "last_touch" | "linear" | "time_decay" | "position_based" = "linear"): AttributionResult {
    const touchpoints = this.generateTouchpoints(campaignId, tenantId);
    const conversions = touchpoints.filter(tp => tp.weight !== undefined);
    const channels = [...new Set(touchpoints.map(tp => tp.channel))];
    const channelAlloc: Record<string, number> = {};
    channels.forEach(ch => { channelAlloc[ch] = 0; });
    const totalConversions = conversions.length;
    const totalValue = conversions.reduce((s, tp) => s + (tp.weight || 0), 0);

    for (const conv of conversions) {
      const convTime = new Date(conv.timestamp).getTime();
      const pathTps = touchpoints.filter(tp => tp !== conv && new Date(tp.timestamp).getTime() <= convTime && tp.campaignId === campaignId);
      if (pathTps.length === 0) { channelAlloc[conv.channel] = (channelAlloc[conv.channel] || 0) + (conv.weight || 1); continue; }
      switch (model) {
        case "first_touch": {
          const first = pathTps.reduce((a, b) => new Date(a.timestamp).getTime() < new Date(b.timestamp).getTime() ? a : b);
          channelAlloc[first.channel] = (channelAlloc[first.channel] || 0) + (conv.weight || 1);
          break;
        }
        case "last_touch": {
          const last = pathTps.reduce((a, b) => new Date(a.timestamp).getTime() > new Date(b.timestamp).getTime() ? a : b);
          channelAlloc[last.channel] = (channelAlloc[last.channel] || 0) + (conv.weight || 1);
          break;
        }
        case "linear": {
          const share = (conv.weight || 1) / (pathTps.length + 1);
          pathTps.forEach(tp => { channelAlloc[tp.channel] = (channelAlloc[tp.channel] || 0) + share; });
          channelAlloc[conv.channel] = (channelAlloc[conv.channel] || 0) + share;
          break;
        }
        case "time_decay": {
          const now = convTime;
          const allTps = [...pathTps, conv];
          const totalDecay = allTps.reduce((s, tp) => s + Math.exp((new Date(tp.timestamp).getTime() - now) / 86400000), 0);
          allTps.forEach(tp => {
            const decay = Math.exp((new Date(tp.timestamp).getTime() - now) / 86400000);
            channelAlloc[tp.channel] = (channelAlloc[tp.channel] || 0) + (conv.weight || 1) * decay / totalDecay;
          });
          break;
        }
        case "position_based": {
          const first = pathTps.reduce((a, b) => new Date(a.timestamp).getTime() < new Date(b.timestamp).getTime() ? a : b);
          const last = conv;
          const middle = pathTps.filter(tp => tp !== first);
          const firstShare = (conv.weight || 1) * 0.4;
          const lastShare = (conv.weight || 1) * 0.4;
          const middleShare = (conv.weight || 1) * 0.2 / Math.max(middle.length, 1);
          channelAlloc[first.channel] = (channelAlloc[first.channel] || 0) + firstShare;
          channelAlloc[last.channel] = (channelAlloc[last.channel] || 0) + lastShare;
          middle.forEach(tp => { channelAlloc[tp.channel] = (channelAlloc[tp.channel] || 0) + middleShare; });
          break;
        }
      }
    }

    const allocations = channels.map(ch => ({
      channel: ch,
      conversions: Math.round(channelAlloc[ch] * 100) / 100,
      share: totalConversions > 0 ? Math.round((channelAlloc[ch] / Math.max(...channels.map(c => channelAlloc[c]))) * 100) / 100 : 0,
      value: Math.round(channelAlloc[ch] * totalValue / Math.max(totalConversions, 1) * 100) / 100,
    }));
    allocations.sort((a, b) => b.conversions - a.conversions);
    const maxConv = Math.max(...allocations.map(a => a.conversions), 1);
    allocations.forEach(a => { a.share = Math.round((a.conversions / maxConv) * 10000) / 100; });

    return { campaignId, model, allocations, totalConversions, totalValue: Math.round(totalValue * 100) / 100 };
  }

  shapleyValueAttribution(campaignId: string, tenantId: string): AttributionResult {
    const touchpoints = this.generateTouchpoints(campaignId, tenantId);
    const conversions = touchpoints.filter(tp => tp.weight !== undefined);
    const channels = [...new Set(touchpoints.map(tp => tp.channel))];
    const totalConversions = conversions.length;
    const totalValue = conversions.reduce((s, tp) => s + (tp.weight || 0), 0);

    const conversionValue = (coalition: string[]): number => {
      const set = new Set(coalition);
      return conversions.filter(conv => {
        const convTime = new Date(conv.timestamp).getTime();
        const pathChs = touchpoints
          .filter(tp => tp !== conv && new Date(tp.timestamp).getTime() <= convTime && tp.campaignId === campaignId)
          .map(tp => tp.channel);
        return pathChs.some(ch => set.has(ch));
      }).length;
    };

    const allValue = conversionValue(channels);
    const shapleyValues: Record<string, number> = {};
    for (const ch of channels) {
      let sv = 0;
      const others = channels.filter(c => c !== ch);
      for (let k = 0; k < 1 << others.length; k++) {
        const coalition: string[] = [];
        for (let j = 0; j < others.length; j++) {
          if (k & (1 << j)) coalition.push(others[j]);
        }
        const withCh = conversionValue([...coalition, ch]);
        const withoutCh = conversionValue(coalition);
        const marginal = withCh - withoutCh;
        const factorial = (n: number): number => n <= 1 ? 1 : n * factorial(n - 1);
        sv += marginal * factorial(coalition.length) * factorial(channels.length - coalition.length - 1) / factorial(channels.length);
      }
      shapleyValues[ch] = sv;
    }

    const svTotal = Object.values(shapleyValues).reduce((s, v) => s + v, 0) || 1;
    const maxSv = Math.max(...Object.values(shapleyValues), 1);
    const allocations = channels.map(ch => ({
      channel: ch,
      conversions: Math.round(shapleyValues[ch] * 100) / 100,
      share: Math.round((shapleyValues[ch] / maxSv) * 10000) / 100,
      value: Math.round((shapleyValues[ch] / svTotal) * totalValue * 100) / 100,
    }));
    allocations.sort((a, b) => b.conversions - a.conversions);

    return { campaignId, model: "shapley_value", allocations, totalConversions, totalValue: Math.round(totalValue * 100) / 100 };
  }

  markovChainAttribution(campaignId: string, tenantId: string): MarkovChainResult {
    const touchpoints = this.generateTouchpoints(campaignId, tenantId);
    const conversions = touchpoints.filter(tp => tp.weight !== undefined);
    const channels = ["START", ...new Set(touchpoints.map(tp => tp.channel)), "CONVERSION", "NULL"];
    const totalConversions = conversions.length;
    const totalValue = conversions.reduce((s, tp) => s + (tp.weight || 0), 0);
    const transitionMatrix: Record<string, Record<string, number>> = {};
    channels.forEach(ch => { transitionMatrix[ch] = {}; channels.forEach(ch2 => { transitionMatrix[ch][ch2] = 0; }); });

    const convTimestamps = conversions.map(c => new Date(c.timestamp).getTime());
    for (let i = 0; i < conversions.length; i++) {
      const conv = conversions[i];
      const convTime = new Date(conv.timestamp).getTime();
      const pathTps = touchpoints.filter(tp => tp !== conv && new Date(tp.timestamp).getTime() <= convTime && tp.campaignId === campaignId);
      const ordered = [...pathTps].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      let prev = "START";
      for (const tp of ordered) {
        transitionMatrix[prev][tp.channel] = (transitionMatrix[prev][tp.channel] || 0) + 1;
        prev = tp.channel;
      }
      transitionMatrix[prev]["CONVERSION"] = (transitionMatrix[prev]["CONVERSION"] || 0) + 1;
    }
    // Normalize each row
    channels.forEach(ch => {
      const row = transitionMatrix[ch];
      const total = Object.values(row).reduce((s, v) => s + v, 0);
      if (total > 0) {
        Object.keys(row).forEach(ch2 => { row[ch2] = Math.round((row[ch2] / total) * 10000) / 10000; });
      }
    });

    // Removal effects: remove each channel and recompute conversion probability
    const baseConvProb = this.markovConversionProbability(transitionMatrix, channels, "START", "CONVERSION");
    const removalEffects: MarkovChainResult["removalEffects"] = [];
    const attrChannels = channels.filter(ch => ch !== "START" && ch !== "CONVERSION" && ch !== "NULL");
    for (const ch of attrChannels) {
      const removedMatrix = JSON.parse(JSON.stringify(transitionMatrix));
      // Route all transitions TO ch to NULL instead
      channels.forEach(src => {
        if (removedMatrix[src][ch] > 0) {
          removedMatrix[src]["NULL"] = (removedMatrix[src]["NULL"] || 0) + removedMatrix[src][ch];
          removedMatrix[src][ch] = 0;
        }
      });
      const removedProb = this.markovConversionProbability(removedMatrix, channels, "START", "CONVERSION");
      const removalEffect = Math.round((baseConvProb - removedProb) * 10000) / 10000;
      const importance: "high" | "medium" | "low" = removalEffect > 0.3 ? "high" : removalEffect > 0.1 ? "medium" : "low";
      removalEffects.push({ channel: ch, removalEffect, importance });
    }
    removalEffects.sort((a, b) => b.removalEffect - a.removalEffect);

    const maxEffect = Math.max(...removalEffects.map(r => r.removalEffect), 0.01);
    const allocations = removalEffects.map(r => ({
      channel: r.channel,
      conversions: Math.round((r.removalEffect / maxEffect) * totalConversions * 100) / 100,
      share: Math.round((r.removalEffect / maxEffect) * 10000) / 100,
      value: Math.round((r.removalEffect / maxEffect) * totalValue * 100) / 100,
    }));

    return { campaignId, transitionMatrix, removalEffects, allocations };
  }

  private markovConversionProbability(matrix: Record<string, Record<string, number>>, states: string[], start: string, conversion: string): number {
    const n = states.length;
    const idx = (s: string) => states.indexOf(s);
    const convIdx = idx(conversion);
    const nullIdx = idx("NULL");
    // Solve linear system: prob[i] = sum_j P[i][j] * prob[j], with prob[conv] = 1, prob[null] = 0
    const prob = new Array(n).fill(0);
    prob[convIdx] = 1;
    prob[nullIdx] = 0;
    for (let iter = 0; iter < 50; iter++) {
      const newProb = [...prob];
      for (let i = 0; i < n; i++) {
        if (i === convIdx || i === nullIdx) continue;
        let sum = 0;
        for (let j = 0; j < n; j++) {
          sum += matrix[states[i]]?.[states[j]] * prob[j] || 0;
        }
        newProb[i] = sum;
      }
      prob.splice(0, n, ...newProb);
    }
    return prob[idx(start)];
  }

  compareAttributionModels(campaignId: string, tenantId: string): ModelComparison {
    const models = ["first_touch", "last_touch", "linear", "time_decay", "position_based"] as const;
    const results = models.map(m => this.runAttribution(campaignId, tenantId, m));
    // Rank correlation
    const rankCorrelations: ModelComparison["rankCorrelations"] = [];
    for (let i = 0; i < models.length; i++) {
      for (let j = i + 1; j < models.length; j++) {
        const chs = [...new Set([...results[i].allocations.map(a => a.channel), ...results[j].allocations.map(a => a.channel)])];
        const rankI = chs.map(ch => results[i].allocations.findIndex(a => a.channel === ch));
        const rankJ = chs.map(ch => results[j].allocations.findIndex(a => a.channel === ch));
        const n = chs.length;
        const dSq = rankI.reduce((s, ri, k) => s + (ri - rankJ[k]) ** 2, 0);
        const rho = n > 1 ? 1 - (6 * dSq) / (n * (n * n - 1)) : 0;
        rankCorrelations.push({ modelA: models[i], modelB: models[j], spearmanRho: Math.round(rho * 10000) / 10000 });
      }
    }
    const topByModel = models.map((m, i) => ({ model: m, topChannel: results[i].allocations[0]?.channel || "", share: results[i].allocations[0]?.share || 0 }));
    const topCounts: Record<string, number> = {};
    topByModel.forEach(t => { topCounts[t.topChannel] = (topCounts[t.topChannel] || 0) + 1; });
    const consensusTop3 = Object.entries(topCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([ch]) => ch);
    const avgRho = rankCorrelations.reduce((s, r) => s + Math.abs(r.spearmanRho), 0) / Math.max(rankCorrelations.length, 1);
    const divergenceScore = Math.round((1 - avgRho) * 100) / 100;

    return {
      models: [...models],
      agreement: Math.round(rankCorrelations.filter(r => r.spearmanRho > 0.7).length / Math.max(rankCorrelations.length, 1) * 100),
      rankCorrelations,
      topChannelByModel: topByModel,
      consensusTop3,
      divergenceScore,
    };
  }

  attributionByChannel(campaignId: string, tenantId: string): ChannelAttribution {
    const models = ["first_touch", "last_touch", "linear", "time_decay", "position_based"] as const;
    const results = models.map(m => this.runAttribution(campaignId, tenantId, m));
    const shapley = this.shapleyValueAttribution(campaignId, tenantId);
    const markov = this.markovChainAttribution(campaignId, tenantId);
    const allChannels = [...new Set(results.flatMap(r => r.allocations.map(a => a.channel)))];
    const rng = seededRandom(this.getSeed(campaignId, tenantId) + "_ch_trend");
    const channels = allChannels.map(ch => {
      const ft = results[0].allocations.find(a => a.channel === ch)?.share || 0;
      const lt = results[1].allocations.find(a => a.channel === ch)?.share || 0;
      const lin = results[2].allocations.find(a => a.channel === ch)?.share || 0;
      const td = results[3].allocations.find(a => a.channel === ch)?.share || 0;
      const pb = results[4].allocations.find(a => a.channel === ch)?.share || 0;
      const sv = shapley.allocations.find(a => a.channel === ch)?.share || 0;
      const mk = markov.allocations.find(a => a.channel === ch)?.share || 0;
      const consensus = Math.round((ft + lt + lin + td + pb + sv + mk) / 7 * 100) / 100;
      const trend: "rising" | "declining" | "stable" = rng() > 0.6 ? "rising" : rng() > 0.3 ? "declining" : "stable";
      return { channel: ch, firstTouch: ft, lastTouch: lt, linear: lin, timeDecay: td, positionBased: pb, shapley: sv, markov: mk, consensus, trend };
    });
    channels.sort((a, b) => b.consensus - a.consensus);
    return { campaignId, channels };
  }

  attributionInsights(campaignId: string, tenantId: string): AttributionInsight[] {
    const seed = this.getSeed(campaignId, tenantId);
    const comparison = this.compareAttributionModels(campaignId, tenantId);
    const channelAttr = this.attributionByChannel(campaignId, tenantId);
    const insights: AttributionInsight[] = [];
    if (comparison.divergenceScore > 0.3) {
      insights.push({
        insight: "High model divergence detected",
        type: "model", severity: "warning",
        detail: `Attribution models disagree significantly (divergence ${comparison.divergenceScore}). Consider channel-level path analysis.`,
        recommendedAction: "Review attribution model selection — choose model based on customer journey length",
      });
    }
    const topChannels = channelAttr.channels.slice(0, 3);
    if (topChannels.length > 0) {
      insights.push({
        insight: `${topChannels[0].channel} dominates attribution`,
        type: "channel", severity: "positive",
        detail: `${topChannels[0].channel} leads across ${comparison.agreement}% of models with ${topChannels[0].consensus}% average share.`,
        recommendedAction: topChannels[0].trend === "rising" ? "Increase investment in this channel" : "Monitor for saturation",
      });
    }
    const modelSpread = comparison.rankCorrelations.filter(r => r.spearmanRho < 0.5);
    if (modelSpread.length > 0) {
      insights.push({
        insight: "First-touch vs last-touch attribution gap",
        type: "strategy", severity: "info",
        detail: "First-touch and last-touch models show different top channels — indicates multi-step customer journey with different discovery vs conversion channels.",
        recommendedAction: "Use position-based or time-decay model for balanced credit assignment",
      });
    }
    const decliningCh = channelAttr.channels.find(ch => ch.trend === "declining" && ch.consensus > 10);
    if (decliningCh) {
      insights.push({
        insight: `${decliningCh.channel} attribution share declining`,
        type: "opportunity", severity: "warning",
        detail: `${decliningCh.channel} shows declining trend across attribution models. May need creative refresh or audience re-targeting.`,
        recommendedAction: `Audit ${decliningCh.channel} campaign creatives and audience targeting`,
      });
    }
    const risingCh = channelAttr.channels.find(ch => ch.trend === "rising" && ch.consensus > 10);
    if (risingCh) {
      insights.push({
        insight: `${risingCh.channel} attribution share rising`,
        type: "opportunity", severity: "positive",
        detail: `${risingCh.channel} gaining attribution share — consider scaling investment.`,
        recommendedAction: `Increase ${risingCh.channel} budget allocation by 15-20%`,
      });
    }
    if (comparison.consensusTop3.length > 0) {
      insights.push({
        insight: "Consensus top channels identified",
        type: "channel", severity: "info",
        detail: `${comparison.consensusTop3.join(", ")} are consistently top-ranked across attribution models.`,
        recommendedAction: "Focus optimization efforts on these channels",
      });
    }
    return insights;
  }

  attributionCustomModel(campaignId: string, tenantId: string, config: CustomAttributionConfig): AttributionResult {
    const touchpoints = this.generateTouchpoints(campaignId, tenantId);
    const conversions = touchpoints.filter(tp => tp.weight !== undefined);
    const channels = [...new Set(touchpoints.map(tp => tp.channel))];
    const totalConversions = conversions.length;
    const totalValue = conversions.reduce((s, tp) => s + (tp.weight || 0), 0);
    const channelAlloc: Record<string, number> = {};
    channels.forEach(ch => { channelAlloc[ch] = 0; });
    const decayFactor = config.decayFactor || 0.5;
    const weightMap: Record<string, number> = {};
    config.weights.forEach(w => { weightMap[w.position] = w.weight; });

    for (const conv of conversions) {
      const convTime = new Date(conv.timestamp).getTime();
      const pathTps = touchpoints.filter(tp => tp !== conv && new Date(tp.timestamp).getTime() <= convTime && tp.campaignId === campaignId);
      if (pathTps.length === 0) { channelAlloc[conv.channel] = (channelAlloc[conv.channel] || 0) + (conv.weight || 1); continue; }
      const sorted = [...pathTps, conv].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const totalWeight = sorted.reduce((s, tp, idx) => {
        const pos = idx === 0 ? "first" : idx === sorted.length - 1 ? "last" : "middle";
        const baseWeight = weightMap[pos] || 1;
        const decay = Math.exp(-(sorted.length - 1 - idx) * decayFactor);
        return s + baseWeight * decay;
      }, 0);
      sorted.forEach((tp, idx) => {
        const pos = idx === 0 ? "first" : idx === sorted.length - 1 ? "last" : "middle";
        const baseWeight = weightMap[pos] || 1;
        const decay = Math.exp(-(sorted.length - 1 - idx) * decayFactor);
        const alloc = totalWeight > 0 ? (conv.weight || 1) * baseWeight * decay / totalWeight : 0;
        channelAlloc[tp.channel] = (channelAlloc[tp.channel] || 0) + alloc;
      });
    }

    const maxConv = Math.max(...Object.values(channelAlloc), 1);
    const allocations = channels.map(ch => ({
      channel: ch,
      conversions: Math.round(channelAlloc[ch] * 100) / 100,
      share: Math.round((channelAlloc[ch] / maxConv) * 10000) / 100,
      value: totalConversions > 0 ? Math.round(channelAlloc[ch] / totalConversions * totalValue * 100) / 100 : 0,
    })).sort((a, b) => b.conversions - a.conversions);
    return { campaignId, model: "custom", allocations, totalConversions, totalValue: Math.round(totalValue * 100) / 100 };
  }

  attributionChannelContribution(campaignId: string, tenantId: string): ChannelContribution[] {
    const touchpoints = this.generateTouchpoints(campaignId, tenantId);
    const conversions = touchpoints.filter(tp => tp.weight !== undefined);
    const channels = [...new Set(touchpoints.map(tp => tp.channel))];
    const seed = hashStr(campaignId + tenantId);
    const rng = seededRandom(seed + "_cc");

    const ft = this.runAttribution(campaignId, tenantId, "first_touch");
    const lt = this.runAttribution(campaignId, tenantId, "last_touch");
    const lin = this.runAttribution(campaignId, tenantId, "linear");

    return channels.map(ch => {
      const ftVal = ft.allocations.find(a => a.channel === ch)?.conversions || 0;
      const ltVal = lt.allocations.find(a => a.channel === ch)?.conversions || 0;
      const linVal = lin.allocations.find(a => a.channel === ch)?.conversions || 0;
      const directConversions = Math.min(ftVal, ltVal);
      const assistedConversions = Math.max(0, linVal - directConversions);
      const assistedValue = Math.round(assistedConversions * (rng() * 20 + 10) * 100) / 100;
      const incrementalLift = Math.round((linVal / Math.max(ftVal || ltVal || 1, 1) - 1) * 10000) / 100;
      const synergyScore = Math.round(rng() * 100);
      const role: "primary" | "assister" | "both" | "minor" = directConversions > assistedConversions * 1.5 ? "primary" : assistedConversions > directConversions * 1.5 ? "assister" : directConversions > 0 ? "both" : "minor";
      return { channel: ch, directConversions: Math.round(directConversions * 100) / 100, assistedConversions: Math.round(assistedConversions * 100) / 100, assistedValue, incrementalLift, synergyScore, role };
    }).sort((a, b) => b.directConversions + b.assistedConversions - (a.directConversions + a.assistedConversions));
  }

  attributionROIDistribution(campaignId: string, tenantId: string): ROIDistribution[] {
    const models = ["first_touch", "last_touch", "linear", "time_decay", "position_based"] as const;
    const seed = hashStr(campaignId + tenantId);
    const rng = seededRandom(seed + "_roi");
    return models.map(model => {
      const result = this.runAttribution(campaignId, tenantId, model);
      const totalSpend = 5000 + rng() * 5000;
      const totalRevenue = result.totalValue || result.totalConversions * (rng() * 30 + 15);
      const channels = result.allocations.map(a => {
        const share = a.share / 100;
        const chSpend = totalSpend * share;
        const chRevenue = totalRevenue * share;
        return {
          channel: a.channel,
          conversions: Math.round(a.conversions * 100) / 100,
          spend: Math.round(chSpend * 100) / 100,
          revenue: Math.round(chRevenue * 100) / 100,
          roas: chSpend > 0 ? Math.round(chRevenue / chSpend * 100) / 100 : 0,
          share: a.share,
        };
      });
      const top3Share = channels.slice(0, 3).reduce((s, c) => s + c.share, 0);
      return {
        model,
        channels,
        totalROAS: totalSpend > 0 ? Math.round(totalRevenue / totalSpend * 100) / 100 : 0,
        concentration: Math.round(top3Share * 10) / 10,
      };
    });
  }

  attributionTimeToConvert(campaignId: string, tenantId: string): TimeToConvertAnalysis[] {
    const touchpoints = this.generateTouchpoints(campaignId, tenantId);
    const conversions = touchpoints.filter(tp => tp.weight !== undefined);
    const channels = [...new Set(touchpoints.map(tp => tp.channel))];
    const seed = hashStr(campaignId + tenantId);
    const rng = seededRandom(seed + "_ttc");

    return channels.map(ch => {
      const convs = conversions.filter(c => c.channel === ch);
      const convTimes = convs.map(c => {
        const convTime = new Date(c.timestamp).getTime();
        const pathTps = touchpoints.filter(tp => tp !== c && new Date(tp.timestamp).getTime() <= convTime && tp.campaignId === campaignId);
        const firstTp = pathTps.length > 0 ? new Date(pathTps[0].timestamp).getTime() : convTime;
        return (convTime - firstTp) / 3600000;
      });
      const avg = convTimes.length > 0 ? convTimes.reduce((s, v) => s + v, 0) / convTimes.length : rng() * 72 + 1;
      const sorted = [...convTimes].sort((a, b) => a - b);
      const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : avg;
      const variance = convTimes.length > 0 ? convTimes.reduce((s, v) => s + (v - avg) ** 2, 0) / convTimes.length : rng() * 100;
      return {
        channel: ch, avgHoursToConvert: Math.round(avg * 100) / 100,
        medianHoursToConvert: Math.round(median * 100) / 100,
        stdHours: Math.round(Math.sqrt(variance) * 100) / 100,
        touchpointCount: convs.length || 1,
        conversionWindow: { min: Math.round(Math.max(0, avg - Math.sqrt(variance)) * 100) / 100, max: Math.round((avg + Math.sqrt(variance)) * 100) / 100 },
        efficiency: convs.length > 0 ? Math.round((1 / Math.max(avg, 1)) * 10000) / 100 : 0,
      };
    });
  }

  attributionCrossCampaign(campaignIds: string[], tenantId: string): CrossCampaignAttribution {
    const allChannels = new Map<string, { campaigns: string[]; contributions: number[] }>();
    let rawTotal = 0;
    const campaignResults: CrossCampaignAttribution["campaigns"] = campaignIds.map(cid => {
      const result = this.runAttribution(cid, tenantId, "linear");
      rawTotal += result.totalConversions;
      const channels = result.allocations.map(a => {
        const existing = allChannels.get(a.channel) || { campaigns: [], contributions: [] };
        if (!existing.campaigns.includes(cid)) existing.campaigns.push(cid);
        existing.contributions.push(a.conversions);
        allChannels.set(a.channel, existing);
        return { channel: a.channel, contribution: a.conversions, overlapWithOtherCampaigns: 0 };
      });
      return { campaignId: cid, channels };
    });
    const overlappingChannels: CrossCampaignAttribution["overlappingChannels"] = [];
    let deduplicatedTotal = rawTotal;
    for (const [ch, data] of allChannels) {
      if (data.campaigns.length > 1) {
        const overlap = data.contributions.reduce((s, v) => s + v, 0) * 0.3;
        deduplicatedTotal -= overlap;
        overlappingChannels.push({ channel: ch, campaigns: [...data.campaigns], totalContribution: Math.round(data.contributions.reduce((s, v) => s + v, 0) * 100) / 100, doubleCounted: true });
        for (const c of campaignResults) {
          const chEntry = c.channels.find(c2 => c2.channel === ch);
          if (chEntry) chEntry.overlapWithOtherCampaigns = Math.round(overlap / data.campaigns.length * 100) / 100;
        }
      }
    }
    return { campaigns: campaignResults, overlappingChannels, deduplicatedTotal: Math.round(deduplicatedTotal * 100) / 100, rawTotal: Math.round(rawTotal * 100) / 100 };
  }

  attributionWhatIf(campaignId: string, tenantId: string): AttributionWhatIf {
    const current = this.runAttribution(campaignId, tenantId, "linear");
    const channels = current.allocations.map(a => a.channel);
    const seed = hashStr(campaignId + tenantId);
    const rng = seededRandom(seed + "_wi");
    const scenarios: AttributionWhatIf["scenarios"] = [
      { name: "First-Touch Heavy", reallocation: channels.map(ch => ({ channel: ch, newShare: ch === channels[0] ? 0.4 : 0.6 / (channels.length - 1) })) },
      { name: "Last-Touch Heavy", reallocation: channels.map(ch => ({ channel: ch, newShare: ch === channels[channels.length - 1] ? 0.4 : 0.6 / (channels.length - 1) })) },
      { name: "Even Distribution", reallocation: channels.map(ch => ({ channel: ch, newShare: 1 / channels.length })) },
      { name: "Top-Performer Focus", reallocation: channels.map(ch => ({ channel: ch, newShare: current.allocations.find(a => a.channel === ch)?.share || 0 })).map(a => { a.newShare = a.newShare > 20 ? a.newShare + 5 : Math.max(5, a.newShare - 3); return a; }) },
    ];
    const evaluated = scenarios.map(s => {
      const totalShare = s.reallocation.reduce((sum, r) => sum + r.newShare, 0);
      const normalized = s.reallocation.map(r => ({ ...r, newShare: r.newShare / totalShare }));
      let projectedConversions = 0;
      for (const r of normalized) {
        const currentConv = current.allocations.find(a => a.channel === r.channel)?.conversions || 0;
        projectedConversions += currentConv * (r.newShare / (current.allocations.find(a => a.channel === r.channel)?.share || 1) * 100) * (0.8 + rng() * 0.4);
      }
      projectedConversions = Math.round(projectedConversions * 100) / 100;
      const projectedRevenue = Math.round(projectedConversions * (current.totalValue / Math.max(current.totalConversions, 1)) * 100) / 100;
      const projectedROAS = current.totalValue > 0 ? Math.round((projectedRevenue / current.totalValue) * current.allocations.reduce((s, a) => s + a.share, 0) * 10) / 10 : 0;
      const changeFromCurrent = current.totalConversions > 0 ? Math.round((projectedConversions - current.totalConversions) / current.totalConversions * 10000) / 100 : 0;
      const risk: "low" | "medium" | "high" = Math.abs(changeFromCurrent) > 20 ? "high" : Math.abs(changeFromCurrent) > 10 ? "medium" : "low";
      return { name: s.name, reallocation: normalized, projectedConversions, projectedRevenue, projectedROAS, changeFromCurrent, risk };
    });
    const best = evaluated.reduce((a, b) => a.projectedROAS > b.projectedROAS ? a : b);
    return { campaignId, scenarios: evaluated, bestScenario: best.name };
  }
}

export const campaignAttributionModeling = new CampaignAttributionModelingService();
