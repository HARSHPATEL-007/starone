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
}

export const leadScoringService = new LeadScoringService();
