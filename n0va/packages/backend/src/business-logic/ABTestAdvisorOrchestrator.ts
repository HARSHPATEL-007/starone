import { ABTest } from "../models/ABTest";
import { ABTestService } from "../services/ABTestService";
import { Metric } from "../models/Metric";
import { decisionEngine } from "./DecisionEngine";

export interface TestDesignAdvice {
  testName: string;
  testType: string;
  minimumSampleSize: number;
  recommendedDurationDays: number;
  variants: { id: string; name: string; trafficShare: number }[];
  expectedMde: number;
  baselineCvr: number;
}

export interface TestResult {
  testId: string;
  testName: string;
  status: string;
  winner: string | null;
  confidence: number;
  bayesianProbability: number;
  uplift: number;
  duration: number;
  recommendation: string;
  variantPerformance: { id: string; name: string; cvr: number; roas: number; impressions: number; conversions: number; isWinner: boolean }[];
}

export class ABTestAdvisorOrchestrator {
  async designTest(tenantId: string, testName: string, testType: "creative" | "audience" | "landing_page" | "offer", variantCount = 2): Promise<TestDesignAdvice> {
    const recentMetrics = await Metric.find({ tenantId: new (require("mongoose").Types.ObjectId)(tenantId) }).sort({ date: -1 }).limit(1000).lean();
    let baselineCvr = 0.02;
    if (recentMetrics.length > 0) {
      const totalConv = (recentMetrics as any[]).reduce((s: number, m: any) => s + (m.conversions || 0), 0);
      const totalImp = (recentMetrics as any[]).reduce((s: number, m: any) => s + (m.impressions || 0), 0);
      baselineCvr = totalImp > 0 ? totalConv / totalImp : 0.02;
    }
    const mde = 0.2;
    const zAlpha = 1.96, zBeta = 0.84;
    const minSampleSize = Math.ceil((Math.pow(zAlpha + zBeta, 2) * (baselineCvr * (1 - baselineCvr) * 2)) / Math.pow(baselineCvr * mde, 2));
    const recommendedDurationDays = Math.max(7, Math.ceil(minSampleSize / Math.max(1, (recentMetrics.length / 30)) / 1000));

    const names: Record<string, string[]> = {
      creative: ["Control", "Emotional Appeal", "Social Proof", "Urgency"],
      audience: ["Broad", "Interest-based", "Lookalike", "Retargeting"],
      landing_page: ["Current Page", "Long-form", "Video Hero", "Minimalist"],
      offer: ["Standard Offer", "Discount", "Free Shipping", "BOGO"],
    };
    const variantNames = names[testType] || ["Control", "Variant A", "Variant B", "Variant C"];
    const trafficPerVariant = Math.round(100 / variantCount);

    return {
      testName, testType, minimumSampleSize: minSampleSize, recommendedDurationDays,
      variants: Array.from({ length: variantCount }, (_, i) => ({ id: `var_${String.fromCharCode(97 + i)}`, name: variantNames[i] || `Variant ${String.fromCharCode(65 + i)}`, trafficShare: trafficPerVariant })),
      expectedMde: mde * 100, baselineCvr: Math.round(baselineCvr * 10000) / 100,
    };
  }

  async analyzeTest(testId: string, tenantId: string): Promise<TestResult | null> {
    const mongoose = require("mongoose");
    const test = await ABTest.findOne({ _id: new mongoose.Types.ObjectId(testId), tenantId }).lean();
    if (!test) return null;

    const variants = (test as any).variants || [];
    const duration = (test as any).completedAt
      ? Math.round((new Date((test as any).completedAt).getTime() - new Date((test as any).startedAt).getTime()) / 86400000)
      : Math.round((Date.now() - new Date((test as any).startedAt).getTime()) / 86400000);

    if (variants.length >= 2) {
      const sig = ABTestService.computeSignificance(variants);
      const bayesianProb = ABTestService.computeBayesianProbability(variants[0], variants[1]);
      const variantPerf = variants.map((v: any) => ({
        id: v.id, name: v.name, cvr: v.impressions > 0 ? Math.round((v.conversions / v.impressions) * 10000) / 10000 : 0,
        roas: v.spend > 0 ? Math.round((v.revenue / v.spend) * 100) / 100 : 0,
        impressions: v.impressions || 0, conversions: v.conversions || 0,
        isWinner: v.id === sig.winner,
      }));
      const control = variantPerf[0];
      const best = variantPerf.reduce((max: any, v: any) => v.cvr > max.cvr ? v : max, variantPerf[0]);
      const uplift = control.cvr > 0 ? Math.round(((best.cvr - control.cvr) / control.cvr) * 10000) / 100 : 0;

      return {
        testId: (test as any)._id?.toString() || testId, testName: (test as any).testName, status: (test as any).status,
        winner: sig.winner, confidence: sig.confidence, bayesianProbability: parseFloat(bayesianProb.toFixed(4)), uplift,
        duration, recommendation: (test as any).recommendation || ABTestService.generateRecommendation(variants, sig.winner, sig.confidence),
        variantPerformance: variantPerf,
      };
    }

    return {
      testId: (test as any)._id?.toString() || testId, testName: (test as any).testName, status: (test as any).status,
      winner: null, confidence: 0, bayesianProbability: 0, uplift: 0, duration,
      recommendation: "Not enough variants to compute significance.", variantPerformance: variants.map((v: any) => ({ id: v.id, name: v.name, cvr: v.impressions > 0 ? v.conversions / v.impressions : 0, roas: v.spend > 0 ? v.revenue / v.spend : 0, impressions: v.impressions || 0, conversions: v.conversions || 0, isWinner: false })),
    };
  }

  async getPortfolioABTestSummary(tenantId: string): Promise<{ total: number; running: number; completed: number; withWinner: number; avgConfidence: number; topTests: TestResult[] }> {
    const tests = await ABTest.find({ tenantId: new (require("mongoose").Types.ObjectId)(tenantId) }).sort({ createdAt: -1 }).limit(50).lean() as any[];
    const running = tests.filter(t => t.status === "running").length;
    const completed = tests.filter(t => t.status === "completed").length;
    const withWinner = tests.filter(t => !!t.winner).length;
    const avgConfidence = tests.length > 0 ? Math.round(tests.reduce((s, t) => s + (t.confidence || 0), 0) / tests.length * 100) / 100 : 0;
    const topResults: TestResult[] = [];
    for (const t of tests.filter(t => t.status === "completed" && t.variants?.length >= 2).slice(0, 5)) {
      const r = await this.analyzeTest(t._id.toString(), tenantId);
      if (r) topResults.push(r);
    }
    return { total: tests.length, running, completed, withWinner, avgConfidence, topTests: topResults };
  }
}

export const abTestAdvisorOrchestrator = new ABTestAdvisorOrchestrator();
