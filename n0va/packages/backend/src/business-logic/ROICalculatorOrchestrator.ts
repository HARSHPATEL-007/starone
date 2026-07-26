import { roiCalculatorService, ROIInput } from "../services/ROICalculatorService";
import { decisionEngine } from "./DecisionEngine";

export interface ScenarioComparisonResult {
  scenarioName: string;
  roi: number;
  roas: number;
  netProfit: number;
  cpa: number;
  isProfitable: boolean;
}

export interface RiskAssessment {
  probabilityProfit: number;
  meanRoi: number;
  medianRoi: number;
  stdRoi: number;
  percentile10: number;
  percentile90: number;
  riskLevel: string;
  riskBand: string;
}

export interface BreakevenInsight {
  breakevenRevenue: number;
  currentMargin: number;
  revenueDeficit: number;
  isProfitable: boolean;
  marginOfSafety: number;
  daysToBreakeven: number;
  healthBand: string;
}

export interface SensitivityDriver {
  variable: string;
  impact: string;
  range: number;
  recommendation: string;
}

export interface ROIDashboard {
  scenarios: ScenarioComparisonResult[];
  risk: RiskAssessment;
  breakeven: BreakevenInsight;
  sensitivity: SensitivityDriver[];
  bestScenario: string | null;
  worstScenario: string | null;
  recommendations: string[];
}

export class ROICalculatorOrchestrator {
  getDashboard(input: ROIInput): ROIDashboard {
    const scenarios = roiCalculatorService.generateComparisonScenarios();
    const baseResult = roiCalculatorService.calculate(input);
    const monteCarlo = roiCalculatorService.monteCarlo(input, 1000, 0.15);
    const breakevenResult = roiCalculatorService.breakeven(input);
    const sensitivity = roiCalculatorService.sensitivityAnalysis(input, 20);

    const scenarioResults: ScenarioComparisonResult[] = [
      { scenarioName: baseResult.campaignName, roi: baseResult.roi, roas: baseResult.roas, netProfit: baseResult.netProfit, cpa: baseResult.cpa, isProfitable: baseResult.isProfitable },
      ...scenarios.map(s => ({ scenarioName: s.campaignName, roi: s.roi, roas: s.roas, netProfit: s.netProfit, cpa: s.cpa, isProfitable: s.isProfitable })),
    ];

    const riskLevel = monteCarlo.probabilityProfit >= 90 ? "low" : monteCarlo.probabilityProfit >= 70 ? "moderate" : monteCarlo.probabilityProfit >= 40 ? "high" : "severe";
    const riskBand = decisionEngine.label(
      decisionEngine.band(monteCarlo.probabilityProfit, { excellent: 90, good: 75, fair: 50, poor: 30 })
    );

    const breakevenInsight: BreakevenInsight = {
      ...breakevenResult,
      healthBand: decisionEngine.label(
        decisionEngine.band(breakevenResult.isProfitable ? 80 + Math.round(breakevenResult.marginOfSafety) : 30, { excellent: 90, good: 70, fair: 50, poor: 25 })
      ),
    };

    const sensitivityDrivers: SensitivityDriver[] = sensitivity.map(s => {
      let recommendation = "";
      if (s.impact === "high" && s.variable.toLowerCase().includes("revenue")) {
        recommendation = `Revenue is a key driver (range ${s.range}). Focus on conversion optimization.`;
      } else if (s.impact === "high" && (s.variable.toLowerCase().includes("spend") || s.variable.toLowerCase().includes("cost"))) {
        recommendation = `${s.variable} has high impact (range ${s.range}). Look for cost reduction opportunities.`;
      } else {
        recommendation = `${s.variable} has ${s.impact} impact. Monitor but deprioritize vs. high-impact drivers.`;
      }
      return { variable: s.variable, impact: s.impact, range: s.range, recommendation };
    });

    const sortedScenarios = [...scenarioResults].sort((a, b) => b.roi - a.roi);
    const bestScenario = sortedScenarios.length > 0 ? sortedScenarios[0].scenarioName : null;
    const worstScenario = sortedScenarios.length > 0 ? sortedScenarios[sortedScenarios.length - 1].scenarioName : null;

    const recommendations: string[] = [];
    if (bestScenario && bestScenario !== input.campaignName) recommendations.push(`Best scenario: "${bestScenario}" (ROI ${sortedScenarios[0].roi}%). Consider reallocating budget toward this strategy.`);
    if (monteCarlo.probabilityProfit < 70) recommendations.push(`Profit probability is ${monteCarlo.probabilityProfit}%. High risk — consider reducing spend or pausing until metrics improve.`);
    else if (monteCarlo.probabilityProfit >= 90) recommendations.push(`Profit probability ${monteCarlo.probabilityProfit}%. Low risk — comfortable to scale.`);
    if (!breakevenResult.isProfitable) recommendations.push(`Not yet at breakeven. Need $${breakevenResult.breakevenRevenue.toLocaleString()} revenue (deficit: $${breakevenResult.revenueDeficit.toLocaleString()}).`);
    const highDrivers = sensitivityDrivers.filter(d => d.impact === "high");
    if (highDrivers.length > 0) recommendations.push(`Key sensitivity drivers: ${highDrivers.map(d => d.variable).join(", ")}. Focus optimization efforts here.`);

    return {
      scenarios: scenarioResults, risk: { ...monteCarlo, riskLevel, riskBand },
      breakeven: breakevenInsight, sensitivity: sensitivityDrivers,
      bestScenario, worstScenario, recommendations,
    };
  }
}

export const roiCalculatorOrchestrator = new ROICalculatorOrchestrator();
