import { statisticalABTestService } from "../services/StatisticalABTestService";
import { DataStore } from "../services/DataStore";
import { decisionEngine } from "./DecisionEngine";

export interface TestScenarioResult {
  controlRate: number;
  variantRate: number;
  liftPercent: number;
  pValue: number;
  significant: boolean;
  power: number;
  recommendation: string;
  healthBand: string;
}

export interface TestDesignAdvisor {
  baselineRate: number;
  minimumDetectableEffect: number;
  requiredSampleSize: number;
  estimatedDuration: { days: number; weeks: number; recommendation: string };
  trafficFeasibility: string;
  confidence: string;
}

export interface TestDashboard {
  recentScenarios: { id: string; label: string; significant: boolean; liftPercent: number; pValue: number; recommendation: string }[];
  designAdvisor: TestDesignAdvisor | null;
  averagePower: number;
  significantRate: number;
  healthBand: string;
  recommendations: string[];
}

const SCENARIOS = [
  { id: "s1", label: "Headline A vs B", controlImpressions: 50000, controlConversions: 1250, variantImpressions: 48000, variantConversions: 1380 },
  { id: "s2", label: "CTA Button Color", controlImpressions: 35000, controlConversions: 700, variantImpressions: 36000, variantConversions: 648 },
  { id: "s3", label: "Landing Page Layout", controlImpressions: 22000, controlConversions: 440, variantImpressions: 21000, variantConversions: 472 },
  { id: "s4", label: "Ad Copy: Short vs Long", controlImpressions: 40000, controlConversions: 920, variantImpressions: 42000, variantConversions: 966 },
];

export class StatisticalABTestOrchestrator {
  getDashboard(baselineRate?: number, mde?: number, dailyVisitors?: number): TestDashboard {
    const results = SCENARIOS.map(s => {
      try {
        const r = statisticalABTestService.test(s);
        return { id: s.id, label: s.label, significant: r.significant, liftPercent: r.liftPercent, pValue: r.pValue, recommendation: r.recommendation };
      } catch {
        return { id: s.id, label: s.label, significant: false, liftPercent: 0, pValue: 1, recommendation: "Error running test" };
      }
    });

    const significantCount = results.filter(r => r.significant).length;
    const totalTests = results.length;
    const significantRate = totalTests > 0 ? Math.round((significantCount / totalTests) * 100) : 0;

    const powerValues = SCENARIOS.map(s => {
      try {
        const r = statisticalABTestService.test(s);
        return r.power;
      } catch { return 0; }
    });
    const averagePower = powerValues.length > 0
      ? Math.round(powerValues.reduce((s, v) => s + v, 0) / powerValues.length * 1000) / 1000
      : 0;

    let designAdvisor: TestDesignAdvisor | null = null;
    if (baselineRate && mde) {
      const required = statisticalABTestService.sampleSize({ baselineRate, minimumDetectableEffect: mde });
      const daily = dailyVisitors || 5000;
      const duration = statisticalABTestService.estimateDuration(daily, { baselineRate, minimumDetectableEffect: mde });

      const trafficFeasibility = duration.estimatedDays > 90 ? "Low" : duration.estimatedDays > 30 ? "Medium" : "High";
      const confidence = averagePower >= 0.8 ? "High" : averagePower >= 0.5 ? "Medium" : "Low";

      designAdvisor = { baselineRate, minimumDetectableEffect: mde, requiredSampleSize: required, estimatedDuration: { days: duration.estimatedDays, weeks: duration.weeks, recommendation: duration.recommendation }, trafficFeasibility, confidence };
    }

    const healthScore = Math.round(Math.max(0, Math.min(100, significantRate * 2 + averagePower * 40)));
    const healthBand = decisionEngine.label(decisionEngine.band(healthScore));

    const recommendations: string[] = [];
    if (averagePower < 0.8) recommendations.push(`Average statistical power is ${(averagePower * 100).toFixed(1)}%. Aim for 80%+ for reliable results. Increase sample sizes.`);
    if (significantRate < 25) recommendations.push(`Only ${significantCount}/${totalTests} tests show significance. Review test design and MDE targets.`);
    if (designAdvisor && designAdvisor.estimatedDuration.days > 30) recommendations.push(`Estimated test duration (${designAdvisor.estimatedDuration.days}d) exceeds 30-day window. Increase traffic allocation.`);
    const hasNegative = results.filter(r => r.liftPercent < 0 && r.significant);
    if (hasNegative.length > 0) recommendations.push(`${hasNegative.length} test(s) show significant negative lift. Review variant strategy for these: ${hasNegative.map(r => r.label).join(", ")}.`);

    return { recentScenarios: results, designAdvisor, averagePower, significantRate, healthBand, recommendations };
  }
}

export const statisticalABTestOrchestrator = new StatisticalABTestOrchestrator();
