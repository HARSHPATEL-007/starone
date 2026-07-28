import { autonomousCampaignManager } from "./AutonomousCampaignManagerService";

interface ROIFactor {
  name: string;
  contribution: number;
  contributionPercent: number;
  direction: "positive" | "negative" | "neutral";
  description: string;
}

interface ROIDecomposition {
  campaignId: string;
  campaignName: string;
  totalROAS: number;
  totalROI: number;
  generatedAt: string;
  factors: ROIFactor[];
  summary: {
    primaryDriver: ROIFactor | null;
    primaryDrag: ROIFactor | null;
    diversification: number;
    recommendation: string;
  };
}

interface FactorAttribution {
  campaignId: string;
  campaignName: string;
  totalChange: number;
  periodComparison: string;
  attributions: { factor: string; changeContribution: number; percentOfTotal: number; description: string }[];
}

interface MarginalReturnPoint {
  spend: number;
  marginalROAS: number;
  marginalRevenue: number;
  cumulativeROAS: number;
}

interface MarginalReturnAnalysis {
  campaignId: string;
  campaignName: string;
  currentSpend: number;
  currentROAS: number;
  points: MarginalReturnPoint[];
  optimalSpend: number;
  optimalROAS: number;
  overspendAmount: number;
  underspendAmount: number;
}

interface ROISensitivityVariable {
  variable: string;
  currentValue: number;
  change: number;
  roasImpact: number;
  roiImpact: number;
  elasticity: number;
}

interface ROISensitivity {
  campaignId: string;
  campaignName: string;
  generatedAt: string;
  baseROAS: number;
  baseROI: number;
  variables: ROISensitivityVariable[];
  mostSensitiveVariable: string;
  leastSensitiveVariable: string;
}

interface ROIByFactorForecast {
  campaignId: string;
  campaignName: string;
  baselineROAS: number;
  forecastPeriod: string;
  factorForecasts: {
    factor: string;
    currentContribution: number;
    projectedContribution: number;
    growthRate: number;
    confidence: number;
  }[];
  totalProjectedROAS: number;
  totalProjectedROI: number;
}

interface DecompositionTrend {
  campaignId: string;
  campaignName: string;
  periods: {
    date: string;
    totalROAS: number;
    factors: { name: string; contribution: number }[];
  }[];
  trend: {
    improving: string[];
    declining: string[];
    stable: string[];
  };
}

export class CampaignROIDecompositionService {
  decomposeROI(campaignId: string, tenantId: string): ROIDecomposition | null {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const a = portfolio.analyses.find((c: any) => c.campaignId === campaignId);
    if (!a) return null;
    const p = a.performance;
    const roas = p.roas || 1;
    const rev = p.revenue || 0;
    const spd = p.spend || 1;
    const conv = p.conversions || 1;
    const imps = p.impressions || 1;
    const clks = p.clicks || 1;
    const avgOrderValue = rev / conv;
    const cpc = spd / clks;
    const cpm = spd / imps * 1000;
    const cvr = p.cvr || 1;
    const ctr = p.ctr || 1;
    const benchmarkAOV = avgOrderValue * 1.15;
    const benchmarkCPC = cpc * 0.8;
    const benchmarkCTR = ctr * 1.3;
    const benchmarkCVR = cvr * 1.2;

    const factors: ROIFactor[] = [];
    const aovEffect = (avgOrderValue - benchmarkAOV) / benchmarkAOV;
    factors.push({
      name: "Average Order Value", contribution: aovEffect,
      contributionPercent: Math.round(Math.abs(aovEffect) / (Math.abs(aovEffect) + 0.5) * 100),
      direction: aovEffect > 0 ? "positive" : aovEffect < 0 ? "negative" : "neutral",
      description: aovEffect > 0 ? `AOV of $${avgOrderValue.toFixed(2)} exceeds benchmark by ${(aovEffect * 100).toFixed(1)}%` : `AOV of $${avgOrderValue.toFixed(2)} trails benchmark by ${(Math.abs(aovEffect) * 100).toFixed(1)}%`,
    });
    const cpcEffect = (benchmarkCPC - cpc) / benchmarkCPC;
    factors.push({
      name: "Cost per Click", contribution: cpcEffect,
      contributionPercent: Math.round(Math.abs(cpcEffect) / (Math.abs(cpcEffect) + 0.5) * 100),
      direction: cpcEffect > 0 ? "positive" : cpcEffect < 0 ? "negative" : "neutral",
      description: cpcEffect > 0 ? `CPC of $${cpc.toFixed(2)} is ${(cpcEffect * 100).toFixed(1)}% below benchmark — efficient buying` : `CPC of $${cpc.toFixed(2)} is ${(Math.abs(cpcEffect) * 100).toFixed(1)}% above benchmark — expensive auction`,
    });
    const cvrEffect = (cvr - benchmarkCVR) / benchmarkCVR;
    factors.push({
      name: "Conversion Rate", contribution: cvrEffect,
      contributionPercent: Math.round(Math.abs(cvrEffect) / (Math.abs(cvrEffect) + 0.5) * 100),
      direction: cvrEffect > 0 ? "positive" : cvrEffect < 0 ? "negative" : "neutral",
      description: cvrEffect > 0 ? `CVR of ${cvr.toFixed(2)}% exceeds benchmark by ${(cvrEffect * 100).toFixed(1)}%` : `CVR of ${cvr.toFixed(2)}% trails benchmark by ${(Math.abs(cvrEffect) * 100).toFixed(1)}%`,
    });
    const ctrEffect = (ctr - benchmarkCTR) / benchmarkCTR;
    factors.push({
      name: "Click-Through Rate", contribution: ctrEffect,
      contributionPercent: Math.round(Math.abs(ctrEffect) / (Math.abs(ctrEffect) + 0.5) * 100),
      direction: ctrEffect > 0 ? "positive" : ctrEffect < 0 ? "negative" : "neutral",
      description: ctrEffect > 0 ? `CTR of ${ctr.toFixed(2)}% exceeds benchmark by ${(ctrEffect * 100).toFixed(1)}%` : `CTR of ${ctr.toFixed(2)}% trails benchmark by ${(Math.abs(ctrEffect) * 100).toFixed(1)}%`,
    });
    const cpmEffect = roas / (spd / imps * 1000 / 1000 * 100);
    const volEffect = conv / (imps * ctr * cvr / 10000) - 1;
    factors.push({
      name: "Conversion Volume", contribution: volEffect,
      contributionPercent: Math.round(Math.abs(volEffect) / (Math.abs(volEffect) + 0.5) * 100),
      direction: volEffect > 0 ? "positive" : volEffect < 0 ? "negative" : "neutral",
      description: volEffect > 0 ? `Conversion volume exceeds expectations by ${(volEffect * 100).toFixed(1)}%` : `Conversion volume is ${(Math.abs(volEffect) * 100).toFixed(1)}% below expectations`,
    });
    const factorsSorted = [...factors].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
    const primaryDriver = factorsSorted.find(f => f.contribution > 0) || null;
    const primaryDrag = factorsSorted.find(f => f.contribution < 0) || null;
    const totalAbs = factors.reduce((s, f) => s + Math.abs(f.contribution), 0);
    const hhi = factors.reduce((s, f) => s + (Math.abs(f.contribution) / totalAbs) ** 2, 0);
    const diversification = Math.round((1 - hhi) * 100);
    const posCount = factors.filter(f => f.direction === "positive").length;
    const negCount = factors.filter(f => f.direction === "negative").length;
    let recommendation = "";
    if (negCount === 0) recommendation = "All factors positive — campaign is well-optimized. Focus on scaling spend while monitoring for diminishing returns.";
    else if (posCount > negCount) recommendation = `Campaign is performing well. Primary opportunity: address ${primaryDrag?.name || "underperforming factors"} to unlock additional ROI.`;
    else if (primaryDriver) recommendation = `Campaign needs attention. Leverage strength in ${primaryDriver.name} while addressing ${primaryDrag?.name || "key drag factors"}. Consider pausing underperforming channels.`;
    else recommendation = "Campaign needs restructuring. Multiple negative factors detected. Review targeting, creative, and bidding strategy.";
    return { campaignId, campaignName: a.campaignName, totalROAS: Math.round(roas * 100) / 100, totalROI: Math.round((rev - spd) / spd * 10000) / 100, generatedAt: new Date().toISOString(), factors: factorsSorted, summary: { primaryDriver, primaryDrag, diversification, recommendation } };
  }

  attributeFactors(campaignId: string, tenantId: string): FactorAttribution | null {
    const report = this.decomposeROI(campaignId, tenantId);
    if (!report) return null;
    const totalAbs = report.factors.reduce((s, f) => s + Math.abs(f.contribution), 0) || 1;
    return {
      campaignId, campaignName: report.campaignName,
      totalChange: report.totalROAS,
      periodComparison: "Current vs benchmark",
      attributions: report.factors.map(f => ({
        factor: f.name,
        changeContribution: Math.round(f.contribution * 100) / 100,
        percentOfTotal: Math.round(Math.abs(f.contribution) / totalAbs * 10000) / 100,
        description: f.description,
      })),
    };
  }

  analyzeMarginalReturns(campaignId: string, tenantId: string): MarginalReturnAnalysis | null {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const a = portfolio.analyses.find((c: any) => c.campaignId === campaignId);
    if (!a) return null;
    const p = a.performance;
    const currentSpend = p.spend || 1000;
    const roas = p.roas || 2;
    const decayRate = 0.15 + Math.random() * 0.1;
    const spendSteps = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
    const points: MarginalReturnPoint[] = spendSteps.map(mult => {
      const sp = currentSpend * mult;
      const decay = Math.exp(-decayRate * (mult - 1));
      const marginalROAS = Math.max(0.1, roas * (mult <= 1 ? 1 + (1 - mult) * 0.2 : decay));
      const marginalRev = sp * marginalROAS;
      return { spend: Math.round(sp), marginalROAS: Math.round(marginalROAS * 100) / 100, marginalRevenue: Math.round(marginalRev), cumulativeROAS: Math.round(marginalROAS * 100) / 100 };
    });
    const optimum = points.reduce((best, pnt) => pnt.marginalROAS > best.marginalROAS ? pnt : best, points[0]);
    const currentPoint = points[3];
    const overspend = currentPoint.marginalROAS < optimum.marginalROAS ? Math.round(currentSpend * 0.3) : 0;
    const underspend = currentPoint.marginalROAS > 1.5 && currentPoint.marginalROAS > points[4]?.marginalROAS ? Math.round(currentSpend * 0.25) : 0;
    return { campaignId, campaignName: a.campaignName, currentSpend, currentROAS: roas, points, optimalSpend: Math.round(optimum.spend), optimalROAS: optimum.marginalROAS, overspendAmount: overspend, underspendAmount: underspend };
  }

  analyzeSensitivity(campaignId: string, tenantId: string): ROISensitivity | null {
    const report = this.decomposeROI(campaignId, tenantId);
    if (!report) return null;
    const baseROAS = report.totalROAS;
    const baseROI = report.totalROI;
    const variables: ROISensitivityVariable[] = [];
    const changes = [-0.2, -0.1, 0.1, 0.2];
    const varConfigs = [
      { name: "Click-Through Rate", base: 2 },
      { name: "Conversion Rate", base: 4 },
      { name: "Average Order Value", base: 50 },
      { name: "Cost per Click", base: 0.5 },
      { name: "Impressions", base: 100000 },
    ];
    for (const vc of varConfigs) {
      for (const chg of changes) {
        const impact = chg * (1 + Math.random() * 0.3);
        const elasticity = impact / chg;
        variables.push({ variable: vc.name, currentValue: vc.base, change: chg, roasImpact: Math.round(baseROAS * (1 + impact) * 100) / 100, roiImpact: Math.round(baseROI * (1 + impact) * 100) / 100, elasticity: Math.round(elasticity * 100) / 100 });
      }
    }
    const byVar: Record<string, number> = {};
    for (const v of variables) { byVar[v.variable] = (byVar[v.variable] || 0) + Math.abs(v.roasImpact - baseROAS); }
    const sorted = Object.entries(byVar).sort((a, b) => b[1] - a[1]);
    return { campaignId, campaignName: report.campaignName, generatedAt: report.generatedAt, baseROAS, baseROI, variables, mostSensitiveVariable: sorted[0]?.[0] || "", leastSensitiveVariable: sorted[sorted.length - 1]?.[0] || "" };
  }

  forecastByFactor(campaignId: string, tenantId: string): ROIByFactorForecast | null {
    const report = this.decomposeROI(campaignId, tenantId);
    if (!report) return null;
    return {
      campaignId, campaignName: report.campaignName,
      baselineROAS: report.totalROAS,
      forecastPeriod: "next 30 days",
      factorForecasts: report.factors.map(f => ({
        factor: f.name,
        currentContribution: Math.round(f.contribution * 100) / 100,
        projectedContribution: Math.round(f.contribution * (1 + (Math.random() * 0.2 - 0.1)) * 100) / 100,
        growthRate: Math.round((Math.random() * 0.4 - 0.2) * 100) / 100,
        confidence: Math.round(60 + Math.random() * 30),
      })),
      totalProjectedROAS: Math.round(report.totalROAS * (1 + (Math.random() * 0.2 - 0.1)) * 100) / 100,
      totalProjectedROI: Math.round(report.totalROI * (1 + (Math.random() * 0.2 - 0.1)) * 100) / 100,
    };
  }

  decompositionTrends(tenantId: string): DecompositionTrend[] {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    return portfolio.analyses.map((a: any) => {
      const periods: DecompositionTrend["periods"] = [];
      const p = a.performance;
      for (let i = 4; i >= 0; i--) {
        const date = new Date(Date.now() - i * 7 * 86400000);
        const roas = p.roas * (1 + (Math.random() * 0.3 - 0.15));
        periods.push({
          date: date.toISOString().split("T")[0],
          totalROAS: Math.round(roas * 100) / 100,
          factors: [
            { name: "AOV", contribution: Math.round((Math.random() * 0.4 - 0.2) * 100) / 100 },
            { name: "CPC", contribution: Math.round((Math.random() * 0.4 - 0.2) * 100) / 100 },
            { name: "CVR", contribution: Math.round((Math.random() * 0.4 - 0.2) * 100) / 100 },
            { name: "CTR", contribution: Math.round((Math.random() * 0.4 - 0.2) * 100) / 100 },
          ],
        });
      }
      const improving: string[] = [];
      const declining: string[] = [];
      const stable: string[] = [];
      const contribs = ["AOV", "CPC", "CVR", "CTR"];
      for (const name of contribs) {
        const values = periods.map(p => p.factors.find(f => f.name === name)!.contribution);
        const trend = values[values.length - 1] - values[0];
        if (trend > 0.05) improving.push(name);
        else if (trend < -0.05) declining.push(name);
        else stable.push(name);
      }
      return { campaignId: a.campaignId, campaignName: a.campaignName, periods, trend: { improving, declining, stable } };
    });
  }
}

export const campaignROIDecomposition = new CampaignROIDecompositionService();