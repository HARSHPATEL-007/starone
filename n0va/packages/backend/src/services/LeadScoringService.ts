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

export const leadScoringService = new LeadScoringService();
