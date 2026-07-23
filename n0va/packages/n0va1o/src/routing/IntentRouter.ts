interface IntentAction {
  action: string;
  platforms: string[];
  requiredScopes: string[];
  contextWindow: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
}

interface IntentMatch {
  confidence: number;
  actions: IntentAction[];
  context: string[];
  requiresHITL: boolean;
}

export class IntentRouter {
  private intentVectors = new Map<string, IntentAction[]>();
  private actionRegistry = new Map<string, IntentAction>();

  registerAction(
    intent: string,
    action: string,
    platforms: string[],
    requiredScopes: string[] = ["read"],
    riskLevel: "low" | "medium" | "high" | "critical" = "low"
  ): void {
    const entry: IntentAction = {
      action,
      platforms,
      requiredScopes,
      contextWindow: [],
      riskLevel,
    };

    const existing = this.intentVectors.get(intent) || [];
    existing.push(entry);
    this.intentVectors.set(intent, existing);
    this.actionRegistry.set(action, entry);
  }

  registerContextualAction(
    action: string,
    platforms: string[],
    contextTriggers: string[],
    riskLevel: "low" | "medium" | "high" | "critical" = "medium"
  ): void {
    const entry: IntentAction = {
      action,
      platforms,
      requiredScopes: ["read", "write"],
      contextWindow: contextTriggers,
      riskLevel,
    };
    this.actionRegistry.set(action, entry);

    for (const trigger of contextTriggers) {
      const existing = this.intentVectors.get(trigger) || [];
      existing.push(entry);
      this.intentVectors.set(trigger, existing);
    }
  }

  resolve(query: string, availableActions: string[]): IntentMatch {
    const matches: { action: IntentAction; score: number }[] = [];
    const queryLower = query.toLowerCase();

    for (const [intent, actions] of this.intentVectors) {
      const score = this.calculateSimilarity(queryLower, intent.toLowerCase());
      if (score > 0.3) {
        for (const action of actions) {
          if (availableActions.includes(action.action) || availableActions.includes("*")) {
            matches.push({ action, score });
          }
        }
      }
    }

    matches.sort((a, b) => b.score - a.score);
    const topMatches = matches.slice(0, 5);

    const hasHighRisk = topMatches.some((m) => m.action.riskLevel === "high" || m.action.riskLevel === "critical");

    return {
      confidence: topMatches.length > 0 ? topMatches[0].score : 0,
      actions: topMatches.map((m) => m.action),
      context: topMatches.flatMap((m) => m.action.contextWindow),
      requiresHITL: hasHighRisk,
    };
  }

  getMinimalContext(
    accountActions: string[],
    query: string
  ): { actions: IntentAction[]; contextWords: string[] } {
    const resolved = this.resolve(query, accountActions);

    if (resolved.confidence < 0.5) {
      return { actions: [], contextWords: [] };
    }

    const relevantActions = resolved.actions.slice(0, 3);
    const contextWords = [
      ...new Set(relevantActions.flatMap((a) => a.contextWindow)),
    ];

    return { actions: relevantActions, contextWords };
  }

  getActionMetadata(action: string): IntentAction | undefined {
    return this.actionRegistry.get(action);
  }

  getHighRiskActions(): IntentAction[] {
    return Array.from(this.actionRegistry.values()).filter(
      (a) => a.riskLevel === "high" || a.riskLevel === "critical"
    );
  }

  private calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.includes(b) || b.includes(a)) return 0.8;

    const tokensA = a.split(/[\s_]+/);
    const tokensB = b.split(/[\s_]+/);
    const intersection = tokensA.filter((t) => tokensB.includes(t));
    const union = [...new Set([...tokensA, ...tokensB])];

    if (union.length === 0) return 0;
    const jaccard = intersection.length / union.length;

    const bigramSim = this.bigramSimilarity(a, b);

    return jaccard * 0.6 + bigramSim * 0.4;
  }

  private bigramSimilarity(a: string, b: string): number {
    const bigrams = (s: string): Set<string> => {
      const result = new Set<string>();
      for (let i = 0; i < s.length - 1; i++) {
        result.add(s.substring(i, i + 2));
      }
      return result;
    };

    const bigramsA = bigrams(a);
    const bigramsB = bigrams(b);
    let intersection = 0;
    for (const bigram of bigramsA) {
      if (bigramsB.has(bigram)) intersection++;
    }
    const union = bigramsA.size + bigramsB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  async getHealth(): Promise<{ registeredIntents: number; registeredActions: number; highRiskActions: number }> {
    return {
      registeredIntents: this.intentVectors.size,
      registeredActions: this.actionRegistry.size,
      highRiskActions: this.getHighRiskActions().length,
    };
  }
}
