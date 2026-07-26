export interface BidState {
  platformId: string;
  campaignId: string;
  currentBid: number;
  remainingBudget: number;
  impressionsRemaining: number;
  hourInDay: number;
  dayOfWeek: number;
}

export interface BidAction {
  bidMultiplier: number;
  label: string;
}

export interface QLearningConfig {
  learningRate: number;
  discountFactor: number;
  explorationRate: number;
  explorationDecay: number;
  minExplorationRate: number;
  stateBins: number;
}

export interface BidRecommendation {
  platformId: string;
  campaignId: string;
  recommendedBid: number;
  currentBid: number;
  action: string;
  qValue: number;
  confidence: number;
  expectedClicks: number;
  expectedConversions: number;
  expectedCost: number;
}

export class PredictiveBiddingService {
  private qTables: Map<string, Map<string, number[]>> = new Map();
  private actionHistory: Map<string, { state: string; action: number; reward: number }[]> = new Map();
  private readonly defaultConfig: QLearningConfig = {
    learningRate: 0.1,
    discountFactor: 0.9,
    explorationRate: 0.3,
    explorationDecay: 0.995,
    minExplorationRate: 0.01,
    stateBins: 5,
  };

  readonly actions: BidAction[] = [
    { bidMultiplier: 0.5, label: "aggressive_reduce" },
    { bidMultiplier: 0.75, label: "moderate_reduce" },
    { bidMultiplier: 0.9, label: "slight_reduce" },
    { bidMultiplier: 1.0, label: "maintain" },
    { bidMultiplier: 1.1, label: "slight_increase" },
    { bidMultiplier: 1.25, label: "moderate_increase" },
    { bidMultiplier: 1.5, label: "aggressive_increase" },
    { bidMultiplier: 2.0, label: "double_bid" },
  ];

  getConfig(): QLearningConfig {
    return { ...this.defaultConfig };
  }

  private discretizeState(state: BidState): string {
    const b = this.defaultConfig.stateBins;

    // Normalize continuous values to bins
    const bidBin = Math.min(b - 1, Math.floor((state.currentBid / 10) * b));
    const budgetBin = Math.min(b - 1, Math.floor((state.remainingBudget / 10000) * b));
    const impBin = Math.min(b - 1, Math.floor((state.impressionsRemaining / 100000) * b));
    const hourBin = Math.min(b - 1, Math.floor((state.hourInDay / 24) * b));
    const dayBin = Math.min(b - 1, Math.floor((state.dayOfWeek / 7) * b));

    return `${bidBin}_${budgetBin}_${impBin}_${hourBin}_${dayBin}_${state.platformId}`;
  }

  private getQTable(campaignId: string): Map<string, number[]> {
    if (!this.qTables.has(campaignId)) {
      this.qTables.set(campaignId, new Map());
    }
    return this.qTables.get(campaignId)!;
  }

  private getQValues(qTable: Map<string, number[]>, state: string): number[] {
    if (!qTable.has(state)) {
      qTable.set(state, new Array(this.actions.length).fill(0));
    }
    return qTable.get(state)!;
  }

  private selectAction(state: string, qTable: Map<string, number[]>, explore: boolean): number {
    const qValues = this.getQValues(qTable, state);

    if (explore && Math.random() < this.defaultConfig.explorationRate) {
      return Math.floor(Math.random() * this.actions.length);
    }

    // Epsilon-greedy: pick best action, tie-break with random
    const maxQ = Math.max(...qValues);
    const bestActions = qValues.map((v, i) => ({ v, i })).filter((x) => x.v === maxQ).map((x) => x.i);
    return bestActions[Math.floor(Math.random() * bestActions.length)];
  }

  recommendBid(state: BidState, campaignId?: string): BidRecommendation {
    const cid = campaignId || state.campaignId;
    const qTable = this.getQTable(cid);
    const s = this.discretizeState(state);
    const actionIdx = this.selectAction(s, qTable, false);
    const action = this.actions[actionIdx];
    const qValues = this.getQValues(qTable, s);
    const qValue = qValues[actionIdx];

    const recommendedBid = Math.round(state.currentBid * action.bidMultiplier * 100) / 100;
    const topQ = Math.max(...qValues);
    const confidence = topQ > 0 ? Math.min(1, qValue / topQ) : 0.5;

    const expectedClicks = Math.round(state.impressionsRemaining * 0.025 * (1 + (action.bidMultiplier - 1) * 0.3));
    const expectedConversions = Math.round(expectedClicks * 0.05);
    const expectedCost = Math.round(recommendedBid * expectedClicks * 100) / 100;

    return {
      platformId: state.platformId,
      campaignId: cid,
      recommendedBid,
      currentBid: state.currentBid,
      action: action.label,
      qValue: Math.round(qValue * 10000) / 10000,
      confidence: Math.round(confidence * 10000) / 10000,
      expectedClicks,
      expectedConversions,
      expectedCost,
    };
  }

  applyReward(
    campaignId: string,
    state: BidState,
    actionIndex: number,
    reward: number,
  ): {
    qValue: number; temporalDifference: number; updatedQ: number; learningRate: number; discountFactor: number;
  } {
    const qTable = this.getQTable(campaignId);
    const s = this.discretizeState(state);
    const qValues = this.getQValues(qTable, s);
    const currentQ = qValues[actionIndex];

    // Bellman update: Q(s,a) += lr * (reward + gamma * max Q(s',a') - Q(s,a))
    const maxNextQ = qValues.length > 0 ? Math.max(...qValues) : 0;
    const td = reward + this.defaultConfig.discountFactor * maxNextQ - currentQ;
    const updatedQ = currentQ + this.defaultConfig.learningRate * td;
    qValues[actionIndex] = updatedQ;
    qTable.set(s, qValues);
    this.qTables.set(campaignId, qTable);

    // Decay exploration
    this.defaultConfig.explorationRate = Math.max(
      this.defaultConfig.minExplorationRate,
      this.defaultConfig.explorationRate * this.defaultConfig.explorationDecay,
    );

    // Log history
    if (!this.actionHistory.has(campaignId)) this.actionHistory.set(campaignId, []);
    this.actionHistory.get(campaignId)!.push({ state: s, action: actionIndex, reward });

    return {
      qValue: Math.round(currentQ * 10000) / 10000,
      temporalDifference: Math.round(td * 10000) / 10000,
      updatedQ: Math.round(updatedQ * 10000) / 10000,
      learningRate: this.defaultConfig.learningRate,
      discountFactor: this.defaultConfig.discountFactor,
    };
  }

  simulateEpisode(campaignId: string, initialState: BidState, steps: number): {
    episodeReward: number; steps: { action: string; state: string; reward: number }[];
    learnedStrategy: string;
  } {
    const history: { action: string; state: string; reward: number }[] = [];
    let totalReward = 0;
    let currentState = { ...initialState };

    for (let step = 0; step < steps; step++) {
      const s = this.discretizeState(currentState);
      const qTable = this.getQTable(campaignId);

      // Explore early, exploit later
      const explore = Math.random() < (0.5 * (1 - step / steps));
      const actionIdx = this.selectAction(s, qTable, explore);
      const action = this.actions[actionIdx];

      // Simulate outcome
      const bidMultiplier = action.bidMultiplier;
      const simulatedClicks = Math.round(currentState.impressionsRemaining * 0.02 * bidMultiplier);
      const simulatedConversions = Math.round(simulatedClicks * 0.04 * bidMultiplier);
      const simulatedRevenue = simulatedConversions * 50;
      const simulatedCost = currentState.currentBid * bidMultiplier * simulatedClicks;
      const reward = simulatedRevenue - simulatedCost;

      // Apply reward
      this.applyReward(campaignId, currentState, actionIdx, reward);
      totalReward += reward;

      history.push({ action: action.label, state: s, reward: Math.round(reward * 100) / 100 });

      // Update state for next step
      currentState.currentBid *= bidMultiplier;
      currentState.remainingBudget -= simulatedCost;
      currentState.impressionsRemaining -= simulatedClicks;
      currentState.hourInDay = (currentState.hourInDay + 1) % 24;
      if (currentState.hourInDay === 0) currentState.dayOfWeek = (currentState.dayOfWeek + 1) % 7;
    }

    const qTable = this.getQTable(campaignId);
    let totalQ = 0, countQ = 0;
    for (const [, qValues] of qTable) {
      totalQ += Math.max(...qValues);
      countQ++;
    }
    const avgMaxQ = countQ > 0 ? totalQ / countQ : 0;
    const learnedStrategy = avgMaxQ > 0.5 ? "aggressive" : avgMaxQ > 0 ? "moderate" : "conservative";

    return {
      episodeReward: Math.round(totalReward * 100) / 100,
      steps: history,
      learnedStrategy,
    };
  }

  getQTableSnapshot(campaignId: string): { state: string; qValues: number[]; bestAction: string }[] {
    const qTable = this.qTables.get(campaignId);
    if (!qTable) return [];

    return Array.from(qTable.entries()).map(([state, qValues]) => {
      const bestIdx = qValues.indexOf(Math.max(...qValues));
      return { state, qValues: qValues.map((v) => Math.round(v * 10000) / 10000), bestAction: this.actions[bestIdx]?.label || "unknown" };
    });
  }

  getActionHistory(campaignId: string): { state: string; action: number; reward: number }[] {
    return this.actionHistory.get(campaignId) || [];
  }

  generateSampleBidState(platformId?: string): BidState {
    return {
      platformId: platformId || ["meta", "google", "linkedin", "tiktok"][Math.floor(Math.random() * 4)],
      campaignId: `camp_${Date.now()}`,
      currentBid: Math.round((Math.random() * 5 + 0.5) * 100) / 100,
      remainingBudget: Math.round(Math.random() * 50000 * 100) / 100,
      impressionsRemaining: Math.floor(Math.random() * 500000),
      hourInDay: Math.floor(Math.random() * 24),
      dayOfWeek: Math.floor(Math.random() * 7),
    };
  }
}

export const predictiveBiddingService = new PredictiveBiddingService();
