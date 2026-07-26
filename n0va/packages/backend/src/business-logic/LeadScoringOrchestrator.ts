import { DataStore } from "../services/DataStore";
import { leadScoringService, LeadScoreModel, LeadScore } from "../services/LeadScoringService";
import { decisionEngine } from "./DecisionEngine";

export interface EnsembleLeadScore {
  leadId: string;
  leadName: string;
  ruleScore: number;
  mlProbability: number;
  mlClassification: "hot" | "warm" | "cold";
  ensembleScore: number;
  ensembleBand: string;
  factors: { name: string; value: number; impact: number }[];
  features: number[];
}

export interface SegmentProfile {
  segmentName: string;
  leadCount: number;
  avgScore: number;
  avgEnsemble: number;
  hotPct: number;
  warmPct: number;
  coldPct: number;
  topIndustries: string[];
  primarySource: string;
}

export interface MLModelSummary {
  name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  featureCount: number;
  trainingSize: number;
}

export interface LeadScoringReport {
  generatedAt: string;
  ensembleScores: EnsembleLeadScore[];
  segmentProfiles: SegmentProfile[];
  models: MLModelSummary[];
  distribution: { tier: string; count: number }[];
  avgEnsembleScore: number;
  hotLeadCount: number;
  warmLeadCount: number;
  coldLeadCount: number;
  recommendations: string[];
}

export class LeadScoringOrchestrator {
  async generateReport(tenantId: string): Promise<LeadScoringReport> {
    const model = leadScoringService.generateSampleModel();
    const trainingData = leadScoringService.generateTrainingData(50);
    const trainResult = leadScoringService.trainModel("ensemble_v1", trainingData, { epochs: 50, learningRate: 0.01, regularization: 0.001 });
    const modelSummary: MLModelSummary = {
      name: trainResult.model.name, accuracy: trainResult.accuracy, precision: trainResult.precision,
      recall: trainResult.recall, f1Score: trainResult.f1Score, featureCount: trainResult.featureCount, trainingSize: trainResult.trainingSize,
    };
    const audiences = await DataStore.findAudiences({ tenantId });
    const leads = Array.isArray(audiences) ? audiences.slice(0, 30) : [];
    const ruleScores = leads.map((lead: any) => leadScoringService.calculateScore(lead, model));
    const ensembleScores: EnsembleLeadScore[] = ruleScores.map((rs: LeadScore) => {
      const features = leadScoringService.extractFeatures(rs as any);
      let mlProbability = 0.5;
      try { mlProbability = leadScoringService.predictProbability("ensemble_v1", features); } catch { mlProbability = rs.score / 100; }
      const mlClass = mlProbability >= 0.7 ? "hot" : mlProbability >= 0.4 ? "warm" : "cold";
      const ensembleScore = Math.round((rs.score * 0.4 + mlProbability * 100 * 0.6));
      return {
        leadId: rs.leadId, leadName: rs.leadName, ruleScore: rs.score, mlProbability: Math.round(mlProbability * 10000) / 100,
        mlClassification: mlClass, ensembleScore, ensembleBand: decisionEngine.label(decisionEngine.band(ensembleScore)),
        factors: [
          { name: "Rule-based score", value: rs.score, impact: 0.4 },
          { name: "ML probability", value: Math.round(mlProbability * 100), impact: 0.6 },
        ],
        features,
      };
    });
    ensembleScores.sort((a, b) => b.ensembleScore - a.ensembleScore);
    const industries = ["Technology", "Finance", "Healthcare", "SaaS", "Fintech", "Retail", "Manufacturing", "Education"];
    const sources = ["linkedin", "website", "referral", "event", "cold_call"];
    const segmentProfiles: SegmentProfile[] = [
      { segmentName: "High-Value", leadCount: leads.length, avgScore: Math.round(ensembleScores.reduce((s, e) => s + e.ensembleScore, 0) / Math.max(1, ensembleScores.length)), avgEnsemble: 0, hotPct: 0, warmPct: 0, coldPct: 0, topIndustries: industries.slice(0, 3), primarySource: "referral" },
    ];
    if (ensembleScores.length > 0) {
      const hot = ensembleScores.filter(e => e.ensembleScore >= 70).length;
      const warm = ensembleScores.filter(e => e.ensembleScore >= 40 && e.ensembleScore < 70).length;
      const cold = ensembleScores.filter(e => e.ensembleScore < 40).length;
      const tot = ensembleScores.length;
      const avgEnsemble = Math.round(ensembleScores.reduce((s, e) => s + e.ensembleScore, 0) / tot);
      segmentProfiles[0] = { ...segmentProfiles[0], avgEnsemble, hotPct: Math.round(hot / tot * 100), warmPct: Math.round(warm / tot * 100), coldPct: Math.round(cold / tot * 100) };
    }
    const distribution = [
      { tier: "Hot (70+)", count: ensembleScores.filter(e => e.ensembleScore >= 70).length },
      { tier: "Warm (40-69)", count: ensembleScores.filter(e => e.ensembleScore >= 40 && e.ensembleScore < 70).length },
      { tier: "Cold (<40)", count: ensembleScores.filter(e => e.ensembleScore < 40).length },
    ];
    const hotCount = ensembleScores.filter(e => e.ensembleScore >= 70).length;
    const warmCount = ensembleScores.filter(e => e.ensembleScore >= 40 && e.ensembleScore < 70).length;
    const coldCount = ensembleScores.filter(e => e.ensembleScore < 40).length;
    const tot = ensembleScores.length;
    const recommendations: string[] = [];
    if (hotCount > 0) recommendations.push(`${hotCount} hot leads identified — prioritize for immediate outreach.`);
    if (warmCount > warmCount * 0.5) recommendations.push("Significant warm lead pool — run a targeted nurture campaign.");
    if (coldCount > tot * 0.4) recommendations.push("High cold lead volume — review scoring model or source quality.");
    if (modelSummary.accuracy > 0.8) recommendations.push(`ML model accuracy at ${(modelSummary.accuracy * 100).toFixed(0)}% — ensemble scoring is reliable.`);

    return {
      generatedAt: new Date().toISOString(), ensembleScores, segmentProfiles, models: [modelSummary],
      distribution, avgEnsembleScore: segmentProfiles[0]?.avgEnsemble || 0,
      hotLeadCount: hotCount, warmLeadCount: warmCount, coldLeadCount: coldCount, recommendations,
    };
  }
}

export const leadScoringOrchestrator = new LeadScoringOrchestrator();
