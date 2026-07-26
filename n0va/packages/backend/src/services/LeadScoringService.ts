import { DataStore } from "./DataStore";

export interface LeadScoreRule {
  field: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "in";
  value: unknown;
  score: number;
}

export interface LeadScoreModel {
  id: string;
  name: string;
  rules: LeadScoreRule[];
  description?: string;
  minScore?: number;
  maxScore?: number;
}

export interface LeadScore {
  leadId: string;
  leadName: string;
  score: number;
  modelId: string;
  factors: { rule: string; score: number; matched: boolean }[];
  classification: "hot" | "warm" | "cold";
}

export class LeadScoringService {
  calculateScore(lead: Record<string, unknown>, model: LeadScoreModel): LeadScore {
    let totalScore = 0;
    const factors: LeadScore["factors"] = [];

    for (const rule of model.rules) {
      const leadValue = lead[rule.field];
      let matched = false;

      switch (rule.operator) {
        case "eq":
          matched = leadValue === rule.value;
          break;
        case "neq":
          matched = leadValue !== rule.value;
          break;
        case "gt":
          matched = typeof leadValue === "number" && typeof rule.value === "number" && leadValue > rule.value;
          break;
        case "gte":
          matched = typeof leadValue === "number" && typeof rule.value === "number" && leadValue >= rule.value;
          break;
        case "lt":
          matched = typeof leadValue === "number" && typeof rule.value === "number" && leadValue < rule.value;
          break;
        case "lte":
          matched = typeof leadValue === "number" && typeof rule.value === "number" && leadValue <= rule.value;
          break;
        case "contains":
          matched = String(leadValue).toLowerCase().includes(String(rule.value).toLowerCase());
          break;
        case "in":
          matched = Array.isArray(rule.value) && rule.value.includes(leadValue);
          break;
      }

      if (matched) totalScore += rule.score;
      factors.push({ rule: `${rule.field} ${rule.operator} ${rule.value}`, score: rule.score, matched });
    }

    const clampedScore = Math.max(0, Math.min(100, totalScore));
    const classification: "hot" | "warm" | "cold" =
      clampedScore >= 70 ? "hot" : clampedScore >= 40 ? "warm" : "cold";

    return {
      leadId: String(lead._id || lead.id || "unknown"),
      leadName: String(lead.name || lead.email || "Unknown"),
      score: clampedScore,
      modelId: model.id,
      factors,
      classification,
    };
  }

  scoreAllLeads(leads: Record<string, unknown>[], model: LeadScoreModel): LeadScore[] {
    return leads.map((lead) => this.calculateScore(lead, model));
  }

  async scoreCampaignLeads(campaignId: string, tenantId: string, model: LeadScoreModel): Promise<LeadScore[]> {
    const campaign = await DataStore.findCampaignById(campaignId, tenantId);
    if (!campaign) return [];

    const audiences = await DataStore.findAudiences({ tenantId });
    const leads = Array.isArray(audiences) ? audiences.slice(0, 50) : [];

    return leads.map((lead: any) =>
      this.calculateScore(
        {
          _id: lead._id,
          name: lead.name,
          email: `${lead.name?.toLowerCase().replace(/\s+/g, ".")}@example.com`,
          company: "Example Corp",
          industry: "Technology",
          revenue: Math.floor(Math.random() * 10000000),
          employees: Math.floor(Math.random() * 5000),
          engagement: Math.random(),
          source: ["linkedin", "website", "referral", "event"][Math.floor(Math.random() * 4)],
        },
        model
      )
    );
  }

  generateSampleModel(): LeadScoreModel {
    return {
      id: "model_default",
      name: "Default Scoring Model",
      description: "Standard lead scoring based on engagement, company fit, and behavior",
      rules: [
        { field: "engagement", operator: "gt", value: 0.7, score: 30 },
        { field: "industry", operator: "in", value: ["Technology", "SaaS", "Fintech"], score: 20 },
        { field: "revenue", operator: "gt", value: 1000000, score: 15 },
        { field: "employees", operator: "gte", value: 50, score: 10 },
        { field: "source", operator: "in", value: ["referral", "event"], score: 15 },
        { field: "engagement", operator: "lt", value: 0.3, score: -10 },
      ],
      minScore: 0,
      maxScore: 100,
    };
  }

  generateSampleLeads(model: LeadScoreModel): LeadScore[] {
    const names = [
      { name: "Acme Corp", industry: "Technology", revenue: 5000000, employees: 200, engagement: 0.85, source: "referral" },
      { name: "Globex Inc", industry: "Finance", revenue: 12000000, employees: 1500, engagement: 0.45, source: "website" },
      { name: "Initech", industry: "Manufacturing", revenue: 800000, employees: 30, engagement: 0.2, source: "linkedin" },
      { name: "Hooli", industry: "Technology", revenue: 50000000, employees: 3000, engagement: 0.9, source: "event" },
      { name: "Pied Piper", industry: "SaaS", revenue: 2000000, employees: 80, engagement: 0.7, source: "referral" },
      { name: "Massive Dynamic", industry: "Technology", revenue: 100000000, employees: 10000, engagement: 0.6, source: "website" },
      { name: "Umbrella Corp", industry: "Healthcare", revenue: 3000000, employees: 500, engagement: 0.35, source: "linkedin" },
      { name: "Stark Industries", industry: "Fintech", revenue: 50000000, employees: 5000, engagement: 0.75, source: "event" },
    ];
    return this.scoreAllLeads(names, model);
  }

  // ─── Logistic Regression with SGD ────────────────────────────────────

  private trainedModels: Map<string, LogisticRegressionModel> = new Map();

  trainModel(name: string, trainingData: { features: number[]; label: number }[], options?: { learningRate?: number; epochs?: number; regularization?: number }): {
    model: LogisticRegressionModel; accuracy: number; precision: number; recall: number; f1Score: number; featureCount: number; trainingSize: number;
  } {
    const lr = options?.learningRate ?? 0.01;
    const epochs = options?.epochs ?? 100;
    const lambda = options?.regularization ?? 0.001;
    const n = trainingData.length;
    const featureCount = trainingData[0]?.features.length ?? 0;
    if (n === 0 || featureCount === 0) throw new Error("Training data must have at least 1 sample with features");

    // Initialize weights (w0 = bias, w1..wn = feature weights)
    const weights = new Array(featureCount + 1).fill(0).map(() => (Math.random() - 0.5) * 0.1);

    // Stochastic Gradient Descent
    for (let epoch = 0; epoch < epochs; epoch++) {
      // Shuffle
      const shuffled = [...trainingData].sort(() => Math.random() - 0.5);
      for (const sample of shuffled) {
        const x = [1, ...sample.features]; // prepend bias term
        const pred = this.sigmoid(this.dot(weights, x));
        const error = pred - sample.label;
        // Weight update with L2 regularization
        for (let j = 0; j < weights.length; j++) {
          const reg = j === 0 ? 0 : (lambda / n) * weights[j]; // no reg on bias
          weights[j] -= lr * (error * x[j] + reg);
        }
      }
    }

    // Evaluate
    let tp = 0, fp = 0, fn = 0, tn = 0;
    for (const sample of trainingData) {
      const x = [1, ...sample.features];
      const pred = this.sigmoid(this.dot(weights, x)) >= 0.5 ? 1 : 0;
      if (pred === 1 && sample.label === 1) tp++;
      else if (pred === 1 && sample.label === 0) fp++;
      else if (pred === 0 && sample.label === 1) fn++;
      else tn++;
    }
    const accuracy = (tp + tn) / Math.max(n, 1);
    const precision = tp / Math.max(tp + fp, 1);
    const recall = tp / Math.max(tp + fn, 1);
    const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

    const model: LogisticRegressionModel = { name, weights: weights.slice(), featureCount, createdAt: new Date().toISOString() };
    this.trainedModels.set(name, model);

    return {
      model,
      accuracy: Math.round(accuracy * 10000) / 10000,
      precision: Math.round(precision * 10000) / 10000,
      recall: Math.round(recall * 10000) / 10000,
      f1Score: Math.round(f1Score * 10000) / 10000,
      featureCount,
      trainingSize: n,
    };
  }

  predictProbability(modelName: string, features: number[]): number {
    const model = this.trainedModels.get(modelName);
    if (!model) throw new Error(`Model "${modelName}" not found. Train it first.`);
    if (features.length !== model.featureCount) throw new Error(`Expected ${model.featureCount} features, got ${features.length}`);
    const x = [1, ...features];
    return this.sigmoid(this.dot(model.weights, x));
  }

  predictClass(modelName: string, features: number[], threshold = 0.5): { probability: number; classification: "hot" | "warm" | "cold"; score: number } {
    const probability = this.predictProbability(modelName, features);
    const score = Math.round(probability * 100);
    const classification: "hot" | "warm" | "cold" = score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";
    return { probability: Math.round(probability * 10000) / 10000, classification, score };
  }

  listModels(): { name: string; featureCount: number; createdAt: string }[] {
    return Array.from(this.trainedModels.entries()).map(([name, m]) => ({
      name, featureCount: m.featureCount, createdAt: m.createdAt,
    }));
  }

  getModel(name: string): LogisticRegressionModel | undefined {
    return this.trainedModels.get(name);
  }

  // ─── XGBoost (Gradient Boosted Trees) ────────────────────────────────

  private boostedModels: Map<string, XGBoostModel> = new Map();

  /**
   * Train an XGBoost-style gradient boosted tree ensemble.
   * Builds trees sequentially, each correcting the residuals of the previous.
   */
  trainXGBoost(
    name: string, trainingData: { features: number[]; label: number }[],
    options?: { learningRate?: number; nEstimators?: number; maxDepth?: number; minChildWeight?: number; subsample?: number; colsampleByTree?: number; regLambda?: number },
  ): {
    model: XGBoostModel; accuracy: number; precision: number; recall: number; f1Score: number; logLoss: number[];
  } {
    const lr = options?.learningRate ?? 0.3;
    const nEstimators = options?.nEstimators ?? 50;
    const maxDepth = options?.maxDepth ?? 4;
    const minChildWeight = options?.minChildWeight ?? 1;
    const subsample = options?.subsample ?? 0.8;
    const colsampleByTree = options?.colsampleByTree ?? 0.8;
    const regLambda = options?.regLambda ?? 1;
    const n = trainingData.length;
    const featureCount = trainingData[0]?.features.length ?? 0;
    if (n === 0 || featureCount === 0) throw new Error("Training data must have at least 1 sample with features");

    // Initialize predictions at 0 (base score)
    const baseScore = 0;
    const predictions = new Array(n).fill(baseScore);
    const logLoss: number[] = [];
    const trees: RegressionTreeNode[] = [];

    const nSamples = Math.floor(n * subsample);
    const nFeatures = Math.max(1, Math.floor(featureCount * colsampleByTree));

    for (let t = 0; t < nEstimators; t++) {
      // Compute residuals (negative gradient of logistic loss)
      const residuals = new Array(n);
      for (let i = 0; i < n; i++) {
        const p = this.sigmoid(predictions[i]);
        residuals[i] = trainingData[i].label - p;
      }

      // Bootstrap sample
      const indices: number[] = [];
      for (let i = 0; i < nSamples; i++) indices.push(Math.floor(Math.random() * n));

      // Random feature subspace
      const featIndices: number[] = [];
      const shuffled = Array.from({ length: featureCount }, (_, i) => i).sort(() => Math.random() - 0.5);
      for (let i = 0; i < nFeatures; i++) featIndices.push(shuffled[i]);

      // Build regression tree on residuals
      const tree = this.buildXGBoostTree(trainingData, residuals, indices, featIndices, 0, maxDepth, minChildWeight, regLambda);

      // Update predictions
      for (let i = 0; i < n; i++) {
        const leaf = this.traverseXGBoostTree(tree, trainingData[i].features);
        predictions[i] += lr * leaf;
      }
      trees.push(tree);

      // Log loss
      let ll = 0;
      for (let i = 0; i < n; i++) {
        const p = this.sigmoid(predictions[i]);
        const eps = 1e-15;
        ll -= trainingData[i].label * Math.log(Math.max(eps, p)) + (1 - trainingData[i].label) * Math.log(Math.max(eps, 1 - p));
      }
      logLoss.push(Math.round((ll / n) * 10000) / 10000);
    }

    // Evaluate
    let tp = 0, fp = 0, fn = 0, tn = 0;
    for (let i = 0; i < n; i++) {
      const p = this.sigmoid(predictions[i]);
      const pred = p >= 0.5 ? 1 : 0;
      if (pred === 1 && trainingData[i].label === 1) tp++;
      else if (pred === 1 && trainingData[i].label === 0) fp++;
      else if (pred === 0 && trainingData[i].label === 1) fn++;
      else tn++;
    }

    const accuracy = (tp + tn) / Math.max(n, 1);
    const precision = tp / Math.max(tp + fp, 1);
    const recall = tp / Math.max(tp + fn, 1);
    const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

    const model: XGBoostModel = {
      name, trees, learningRate: lr, nEstimators, maxDepth,
      featureCount, createdAt: new Date().toISOString(),
    };
    this.boostedModels.set(name, model);

    return {
      model,
      accuracy: Math.round(accuracy * 10000) / 10000,
      precision: Math.round(precision * 10000) / 10000,
      recall: Math.round(recall * 10000) / 10000,
      f1Score: Math.round(f1Score * 10000) / 10000,
      logLoss,
    };
  }

  private buildXGBoostTree(
    data: { features: number[]; label: number }[], residuals: number[], indices: number[],
    featureIndices: number[], depth: number, maxDepth: number, minChildWeight: number, regLambda: number,
  ): RegressionTreeNode {
    const sumGrad = indices.reduce((s, i) => s + residuals[i], 0);
    const sumHess = indices.length; // hessian of logistic loss = p*(1-p) ≈ 0.25 * n
    const baseWeight = -sumGrad / (sumHess + regLambda);

    if (depth >= maxDepth || indices.length < minChildWeight) {
      return { isLeaf: true, weight: baseWeight };
    }

    let bestGain = 0, bestFeature = -1, bestThreshold = 0;
    let bestLeft: number[] = [], bestRight: number[] = [];

    for (const f of featureIndices) {
      const values = [...new Set(indices.map((i) => data[i].features[f]))].sort((a, b) => a - b);
      for (const thresh of values) {
        const left = indices.filter((i) => data[i].features[f] <= thresh);
        const right = indices.filter((i) => data[i].features[f] > thresh);
        if (left.length < minChildWeight || right.length < minChildWeight) continue;

        const sumGLeft = left.reduce((s, i) => s + residuals[i], 0);
        const sumGRight = right.reduce((s, i) => s + residuals[i], 0);
        const gain = (sumGLeft * sumGLeft) / (left.length + regLambda) + (sumGRight * sumGRight) / (right.length + regLambda) - (sumGrad * sumGrad) / (indices.length + regLambda);
        if (gain > bestGain) { bestGain = gain; bestFeature = f; bestThreshold = thresh; bestLeft = left; bestRight = right; }
      }
    }

    if (bestFeature === -1 || bestGain <= 0) {
      return { isLeaf: true, weight: baseWeight };
    }

    return {
      isLeaf: false, featureIndex: bestFeature, threshold: bestThreshold,
      left: this.buildXGBoostTree(data, residuals, bestLeft, featureIndices, depth + 1, maxDepth, minChildWeight, regLambda),
      right: this.buildXGBoostTree(data, residuals, bestRight, featureIndices, depth + 1, maxDepth, minChildWeight, regLambda),
    };
  }

  private traverseXGBoostTree(node: RegressionTreeNode, features: number[]): number {
    if (node.isLeaf) return node.weight ?? 0;
    const val = features[node.featureIndex!];
    return val <= node.threshold! ? this.traverseXGBoostTree(node.left!, features) : this.traverseXGBoostTree(node.right!, features);
  }

  predictXGBoost(name: string, features: number[]): { probability: number; classification: "hot" | "warm" | "cold"; score: number } {
    const model = this.boostedModels.get(name);
    if (!model) throw new Error(`XGBoost model "${name}" not found`);
    if (features.length !== model.featureCount) throw new Error(`Expected ${model.featureCount} features, got ${features.length}`);

    let sum = 0;
    for (const tree of model.trees) sum += this.traverseXGBoostTree(tree, features);
    const probability = this.sigmoid(sum * model.learningRate);
    const score = Math.round(probability * 100);
    const classification: "hot" | "warm" | "cold" = score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";
    return { probability: Math.round(probability * 10000) / 10000, classification, score };
  }

  listXGBoostModels(): { name: string; featureCount: number; nTrees: number; createdAt: string }[] {
    return Array.from(this.boostedModels.entries()).map(([name, m]) => ({
      name, featureCount: m.featureCount, nTrees: m.trees.length, createdAt: m.createdAt,
    }));
  }

  // ─── Random Forest for Lead Scoring ─────────────────────────────────

  private leadForests: Map<string, LeadForest> = new Map();

  trainLeadRandomForest(
    name: string, trainingData: { features: number[]; label: number }[],
    options?: { nEstimators?: number; maxDepth?: number; minSamplesSplit?: number; maxFeatures?: string },
  ): {
    model: LeadForest; accuracy: number; precision: number; recall: number; f1Score: number; oobError: number;
  } {
    const nEstimators = options?.nEstimators ?? 50;
    const maxDepth = options?.maxDepth ?? 6;
    const minSamplesSplit = options?.minSamplesSplit ?? 2;
    const n = trainingData.length;
    const featureCount = trainingData[0]?.features.length ?? 0;
    if (n === 0 || featureCount === 0) throw new Error("Need samples with features");

    const mtry = options?.maxFeatures === "sqrt" ? Math.max(1, Math.floor(Math.sqrt(featureCount)))
      : options?.maxFeatures === "log2" ? Math.max(1, Math.floor(Math.log2(featureCount)))
      : Math.max(1, Math.floor(featureCount / 3));

    const oobPredictions = new Map<number, { sum: number; count: number }>();
    const trees: RegressionTreeNode[] = [];

    for (let t = 0; t < nEstimators; t++) {
      const bootstrap: { features: number[]; label: number }[] = [];
      const used = new Set<number>();
      for (let i = 0; i < n; i++) {
        const idx = Math.floor(Math.random() * n);
        bootstrap.push(trainingData[idx]);
        used.add(idx);
      }
      // OOB indices
      for (let i = 0; i < n; i++) if (!used.has(i)) {
        const idx = i;
        if (!oobPredictions.has(idx)) oobPredictions.set(idx, { sum: 0, count: 0 });
      }

      const featIndices = Array.from({ length: featureCount }, (_, i) => i).filter(() => Math.random() < mtry / featureCount);
      const finalFeats = featIndices.length > 0 ? featIndices : [Math.floor(Math.random() * featureCount)];

      // Use label as residual (classification RF)
      const residuals = bootstrap.map((s) => s.label);

      const tree = this.buildXGBoostTree(
        bootstrap, residuals, Array.from({ length: bootstrap.length }, (_, i) => i),
        finalFeats, 0, maxDepth, minSamplesSplit, 0,
      );
      trees.push(tree);

      // OOB prediction
      for (const oobIdx of oobPredictions.keys()) {
        if (!used.has(oobIdx)) {
          const pred = this.traverseXGBoostTree(tree, trainingData[oobIdx].features);
          const oob = oobPredictions.get(oobIdx)!;
          oob.sum += pred;
          oob.count++;
        }
      }
    }

    // Evaluate in-bag
    let tp = 0, fp = 0, fn = 0, tn = 0;
    let rfSum = 0;
    for (let i = 0; i < n; i++) {
      rfSum = 0;
      for (const tree of trees) rfSum += this.traverseXGBoostTree(tree, trainingData[i].features);
      const prob = this.sigmoid(rfSum / nEstimators);
      const pred = prob >= 0.5 ? 1 : 0;
      if (pred === 1 && trainingData[i].label === 1) tp++;
      else if (pred === 1 && trainingData[i].label === 0) fp++;
      else if (pred === 0 && trainingData[i].label === 1) fn++;
      else tn++;
    }

    // OOB error
    let oobError = 0;
    let oobN = 0;
    for (const [idx, oob] of oobPredictions) {
      const avg = oob.sum / oob.count;
      const prob = this.sigmoid(avg);
      const pred = prob >= 0.5 ? 1 : 0;
      if (pred !== trainingData[idx].label) oobError++;
      oobN++;
    }

    const accuracy = (tp + tn) / Math.max(n, 1);
    const precision = tp / Math.max(tp + fp, 1);
    const recall = tp / Math.max(tp + fn, 1);
    const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

    const model: LeadForest = { name, trees, nEstimators, maxDepth, featureCount, createdAt: new Date().toISOString() };
    this.leadForests.set(name, model);

    return {
      model,
      accuracy: Math.round(accuracy * 10000) / 10000,
      precision: Math.round(precision * 10000) / 10000,
      recall: Math.round(recall * 10000) / 10000,
      f1Score: Math.round(f1Score * 10000) / 10000,
      oobError: oobN > 0 ? Math.round((oobError / oobN) * 10000) / 10000 : 0,
    };
  }

  predictRandomForest(name: string, features: number[]): { probability: number; classification: "hot" | "warm" | "cold"; score: number } {
    const model = this.leadForests.get(name);
    if (!model) throw new Error(`Random Forest model "${name}" not found`);
    if (features.length !== model.featureCount) throw new Error(`Expected ${model.featureCount} features, got ${features.length}`);

    let sum = 0;
    for (const tree of model.trees) sum += this.traverseXGBoostTree(tree, features);
    const probability = this.sigmoid(sum / model.nEstimators);
    const score = Math.round(probability * 100);
    const classification: "hot" | "warm" | "cold" = score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";
    return { probability: Math.round(probability * 10000) / 10000, classification, score };
  }

  listRandomForestModels(): { name: string; featureCount: number; nTrees: number; createdAt: string }[] {
    return Array.from(this.leadForests.entries()).map(([name, m]) => ({
      name, featureCount: m.featureCount, nTrees: m.trees.length, createdAt: m.createdAt,
    }));
  }

  // ─── Ensemble Voting ────────────────────────────────────────────────

  /**
   * Weighted ensemble voting across Logistic Regression, Random Forest, and XGBoost.
   * Returns a consensus probability combining all trained models.
   */
  predictEnsemble(
    features: number[],
    weights?: { logisticRegression?: number; randomForest?: number; xgboost?: number },
  ): {
    probability: number; classification: "hot" | "warm" | "cold"; score: number;
    modelContributions: { model: string; probability: number; weight: number }[];
  } {
    const w = { logisticRegression: weights?.logisticRegression ?? 0.3, randomForest: weights?.randomForest ?? 0.35, xgboost: weights?.xgboost ?? 0.35 };
    const contributions: { model: string; probability: number; weight: number }[] = [];

    // Logistic Regression
    if (w.logisticRegression > 0) {
      const lrModels = Array.from(this.trainedModels.entries());
      if (lrModels.length > 0) {
        const prob = this.predictProbability(lrModels[0][0], features);
        contributions.push({ model: "logistic_regression", probability: Math.round(prob * 10000) / 10000, weight: w.logisticRegression });
      }
    }

    // Random Forest
    if (w.randomForest > 0) {
      const rfModels = Array.from(this.leadForests.entries());
      if (rfModels.length > 0) {
        const pred = this.predictRandomForest(rfModels[0][0], features);
        contributions.push({ model: "random_forest", probability: pred.probability, weight: w.randomForest });
      }
    }

    // XGBoost
    if (w.xgboost > 0) {
      const xgbModels = Array.from(this.boostedModels.entries());
      if (xgbModels.length > 0) {
        const pred = this.predictXGBoost(xgbModels[0][0], features);
        contributions.push({ model: "xgboost", probability: pred.probability, weight: w.xgboost });
      }
    }

    const totalWeight = contributions.reduce((s, c) => s + c.weight, 0);
    if (totalWeight === 0 || contributions.length === 0) {
      return { probability: 0, classification: "cold", score: 0, modelContributions: [] };
    }

    const probability = contributions.reduce((s, c) => s + c.probability * c.weight, 0) / totalWeight;
    const score = Math.round(probability * 100);
    const classification: "hot" | "warm" | "cold" = score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";
    return {
      probability: Math.round(probability * 10000) / 10000, classification, score,
      modelContributions: contributions.sort((a, b) => b.probability - a.probability),
    };
  }

  // ─── Hyperparameter Grid Search ─────────────────────────────────────

  /**
   * Run a grid search over specified hyperparameter ranges.
   * Trains a model for each combination and returns the best configuration.
   */
  runGridSearch(
    trainingData: { features: number[]; label: number }[],
    modelType: "logistic_regression" | "random_forest" | "xgboost",
    paramGrid: Record<string, number[]>,
    metric: "accuracy" | "f1" | "logloss" = "accuracy",
  ): {
    bestParams: Record<string, number>; bestScore: number; trials: number;
    topResults: { params: Record<string, number>; score: number }[];
  } {
    const keys = Object.keys(paramGrid);
    if (keys.length === 0) throw new Error("paramGrid must have at least one parameter");

    // Generate all combinations
    const combos = this.cartesianProduct(keys.map((k) => paramGrid[k]));
    const results: { params: Record<string, number>; score: number }[] = [];
    let bestScore = -Infinity;
    let bestParams: Record<string, number> = {};

    for (const combo of combos) {
      const params: Record<string, number> = {};
      keys.forEach((k, i) => { params[k] = combo[i]; });

      let score = 0;
      const name = `grid_search_${modelType}_${Date.now()}`;
      try {
        if (modelType === "logistic_regression") {
          const result = this.trainModel(name, trainingData, {
            learningRate: params.learningRate ?? 0.01,
            epochs: Math.floor(params.epochs ?? 100),
            regularization: params.regularization ?? 0.001,
          });
          score = metric === "f1" ? result.f1Score : result.accuracy;
        } else if (modelType === "random_forest") {
          const result = this.trainLeadRandomForest(name, trainingData, {
            nEstimators: Math.floor(params.nEstimators ?? 50),
            maxDepth: Math.floor(params.maxDepth ?? 6),
            minSamplesSplit: Math.floor(params.minSamplesSplit ?? 2),
            maxFeatures: params.nFeatures === 0 ? "sqrt" : "all",
          });
          score = metric === "f1" ? result.f1Score : result.accuracy;
        } else if (modelType === "xgboost") {
          const result = this.trainXGBoost(name, trainingData, {
            learningRate: params.learningRate ?? 0.3,
            nEstimators: Math.floor(params.nEstimators ?? 50),
            maxDepth: Math.floor(params.maxDepth ?? 4),
            minChildWeight: params.minChildWeight ?? 1,
            subsample: params.subsample ?? 0.8,
            colsampleByTree: params.colsampleByTree ?? 0.8,
            regLambda: params.regLambda ?? 1,
          });
          score = metric === "logloss" ? -result.logLoss[result.logLoss.length - 1] : metric === "f1" ? result.f1Score : result.accuracy;
        }
      } catch {
        score = -1;
      }

      results.push({ params, score });
      if (score > bestScore) { bestScore = score; bestParams = { ...params }; }
    }

    return {
      bestParams,
      bestScore: Math.round(bestScore * 10000) / 10000,
      trials: results.length,
      topResults: results.sort((a, b) => b.score - a.score).slice(0, 5),
    };
  }

  private cartesianProduct(arrays: number[][]): number[][] {
    if (arrays.length === 0) return [[]];
    const [first, ...rest] = arrays;
    const restProduct = this.cartesianProduct(rest);
    const result: number[][] = [];
    for (const f of first) for (const rp of restProduct) result.push([f, ...rp]);
    return result;
  }

  // ─── Automated Feature Engineering ──────────────────────────────────

  /**
   * Generate polynomial features and pairwise interactions up to specified degree.
   * E.g., degree=2 generates x1, x2, x1^2, x2^2, x1*x2.
   */
  generatePolynomialFeatures(features: number[], degree: number = 2): number[] {
    const result = [...features];
    if (degree < 2) return result;

    // Squared terms
    for (let i = 0; i < features.length; i++) result.push(features[i] * features[i]);

    // Interaction terms
    for (let i = 0; i < features.length; i++) {
      for (let j = i + 1; j < features.length; j++) {
        result.push(features[i] * features[j]);
      }
    }

    // Cube terms (degree >= 3)
    if (degree >= 3) {
      for (let i = 0; i < features.length; i++) result.push(features[i] * features[i] * features[i]);
    }

    return result;
  }

  /**
   * Generate enhanced training data with polynomial features.
   */
  generateEnhancedTrainingData(count: number = 100, polynomialDegree: number = 2): { features: number[]; label: number }[] {
    const base = this.generateTrainingData(count * 2); // generate extra, then filter
    const result: { features: number[]; label: number }[] = [];
    for (const sample of base.slice(0, count)) {
      result.push({ features: this.generatePolynomialFeatures(sample.features, polynomialDegree), label: sample.label });
    }
    return result;
  }

  // ─── Feature Engineering ───────────────────────────────────────────

  extractFeatures(lead: Record<string, unknown>): number[] {
    const features: number[] = [];
    // Revenue (log-scaled)
    const rev = Number(lead.revenue) || 0;
    features.push(rev > 0 ? Math.log10(rev) / 7 : 0);
    // Employees (log-scaled)
    const emp = Number(lead.employees) || 0;
    features.push(emp > 0 ? Math.log10(emp) / 4 : 0);
    // Engagement score
    features.push(Math.min(1, Math.max(0, Number(lead.engagement) || 0)));
    // Industry encoding (one-vs-rest for known industries)
    const ind = String(lead.industry || "");
    features.push(["Technology", "SaaS", "Fintech"].includes(ind) ? 1 : 0);
    features.push(ind === "Finance" ? 1 : 0);
    features.push(ind === "Healthcare" ? 1 : 0);
    // Source encoding
    const src = String(lead.source || "");
    features.push(src === "referral" ? 1 : 0);
    features.push(src === "event" ? 1 : 0);
    features.push(src === "linkedin" ? 1 : 0);
    // Page views / visits (if available)
    const visits = Number(lead.pageVisits || lead.visits || 0);
    features.push(Math.min(1, visits / 50));
    // Email engagement (if available)
    const emailOpen = Number(lead.emailOpenRate || lead.emailOpens || 0);
    features.push(Math.min(1, emailOpen / 10));
    // Time since last activity (days, inverted so higher = more recent)
    const lastActive = lead.lastActive ? Math.max(0, Math.min(365, (Date.now() - new Date(String(lead.lastActive)).getTime()) / 86400000)) : 180;
    features.push(Math.max(0, 1 - lastActive / 365));

    return features;
  }

  generateTrainingData(count: number = 100): { features: number[]; label: number }[] {
    const data: { features: number[]; label: number }[] = [];
    for (let i = 0; i < count; i++) {
      const rev = Math.random() * 100000000;
      const emp = Math.floor(Math.random() * 10000);
      const eng = Math.random();
      const industries = ["Technology", "Finance", "Healthcare", "Manufacturing", "SaaS", "Fintech", "Retail", "Education"];
      const sources = ["linkedin", "website", "referral", "event", "cold_call"];
      const ind = industries[Math.floor(Math.random() * industries.length)];
      const src = sources[Math.floor(Math.random() * sources.length)];
      const lead: Record<string, unknown> = { revenue: rev, employees: emp, engagement: eng, industry: ind, source: src, pageVisits: Math.floor(Math.random() * 100), emailOpenRate: Math.random() * 10 };
      const features = this.extractFeatures(lead);
      // Label: 1 if high-value lead (engagement > 0.6 AND (tech industry OR revenue > 1M))
      const label = (eng > 0.6 && (["Technology", "SaaS", "Fintech"].includes(ind) || rev > 1000000)) || (eng > 0.8 && src === "referral") ? 1 : 0;
      data.push({ features, label });
    }
    return data;
  }

  private sigmoid(z: number): number {
    return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, z))));
  }

  private dot(a: number[], b: number[]): number {
    return a.reduce((sum, ai, i) => sum + ai * (b[i] || 0), 0);
  }
}

interface LogisticRegressionModel {
  name: string;
  weights: number[];
  featureCount: number;
  createdAt: string;
}

interface RegressionTreeNode {
  isLeaf: boolean;
  weight?: number;
  featureIndex?: number;
  threshold?: number;
  left?: RegressionTreeNode;
  right?: RegressionTreeNode;
}

interface XGBoostModel {
  name: string;
  trees: RegressionTreeNode[];
  learningRate: number;
  nEstimators: number;
  maxDepth: number;
  featureCount: number;
  createdAt: string;
}

interface LeadForest {
  name: string;
  trees: RegressionTreeNode[];
  nEstimators: number;
  maxDepth: number;
  featureCount: number;
  createdAt: string;
}

export const leadScoringService = new LeadScoringService();
