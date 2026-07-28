import { DataStore } from "./DataStore";

type ExperimentType = "ab_test" | "geo_holdout" | "time_series" | "budget_split";
type ExperimentStatus = "draft" | "running" | "completed" | "cancelled";
type VariantType = "control" | "treatment";

interface Experiment {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  type: ExperimentType;
  status: ExperimentStatus;
  hypothesis: string;
  primaryMetric: string;
  confidenceLevel: number;
  variants: ExperimentVariant[];
  startDate: string | null;
  endDate: string | null;
  plannedEndDate: string | null;
  results: ExperimentResults | null;
  winner: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ExperimentVariant {
  id: string;
  name: string;
  type: VariantType;
  config: Record<string, any>;
  metrics: VariantMetrics[];
}

interface VariantMetrics {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
}

interface ExperimentResults {
  winner: string | null;
  confidence: number;
  significant: boolean;
  metric: string;
  controlAvg: number;
  treatmentAvg: number;
  lift: number;
  pValue: number;
  sampleSize: number;
  recommendedAction: string;
  details: {
    control: { mean: number; variance: number; stdDev: number; size: number; total: number };
    treatment: { mean: number; variance: number; stdDev: number; size: number; total: number };
    testStatistic: number;
    degreesOfFreedom: number;
    effectSize: number;
  };
}

interface ExperimentSummary {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  running: number;
  completed: number;
  significantResults: number;
  avgLift: number;
  recentExperiments: Experiment[];
}

let expCounter = 0;
let varCounter = 0;

export class CampaignExperimentationService {
  createExperiment(tenantId: string, data: Omit<Experiment, "id" | "tenantId" | "status" | "variants" | "results" | "winner" | "startDate" | "endDate" | "createdAt" | "updatedAt"> & { variants?: Omit<ExperimentVariant, "id" | "metrics">[] }): Experiment {
    const mem = DataStore.mem();
    const id = `exp_${++expCounter}`;
    const variants = (data.variants || []).map(v => ({ id: `var_${++varCounter}`, ...v, metrics: [] }));
    if (variants.length === 0) {
      variants.push({ id: `var_${++varCounter}`, name: "Control", type: "control", config: {}, metrics: [] });
      variants.push({ id: `var_${++varCounter}`, name: "Treatment", type: "treatment", config: {}, metrics: [] });
    }
    const exp: Experiment = {
      id, tenantId, status: "draft",
      variants, results: null, winner: null,
      startDate: null, endDate: null, plannedEndDate: null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      ...data,
    };
    mem.insert("experiments", exp);
    return exp;
  }

  updateExperiment(expId: string, tenantId: string, updates: Partial<Experiment>): Experiment | null {
    return DataStore.mem().update("experiments", (e: any) => e.id === expId && e.tenantId === tenantId, updates);
  }

  getExperiment(expId: string, tenantId: string): Experiment | null {
    return DataStore.mem().findOne("experiments", (e: any) => e.id === expId && e.tenantId === tenantId) || null;
  }

  listExperiments(tenantId: string, status?: ExperimentStatus): Experiment[] {
    const mem = DataStore.mem();
    const all = mem.find("experiments", (e: any) => e.tenantId === tenantId);
    return status ? all.filter((e: any) => e.status === status) : all;
  }

  deleteExperiment(expId: string, tenantId: string): boolean {
    return DataStore.mem().delete("experiments", (e: any) => e.id === expId && e.tenantId === tenantId);
  }

  startExperiment(expId: string, tenantId: string): Experiment | null {
    return DataStore.mem().update("experiments", (e: any) => e.id === expId && e.tenantId === tenantId && e.status === "draft", {
      status: "running", startDate: new Date().toISOString(),
    });
  }

  completeExperiment(expId: string, tenantId: string): Experiment | null {
    const mem = DataStore.mem();
    const exp = mem.findOne("experiments", (e: any) => e.id === expId && e.tenantId === tenantId);
    if (!exp || exp.status !== "running") return null;
    const results = this.computeResults(exp);
    return mem.update("experiments", (e: any) => e.id === expId, {
      status: "completed", endDate: new Date().toISOString(),
      results, winner: results.winner,
    });
  }

  recordMetrics(expId: string, tenantId: string, variantId: string, date: string, metrics: { impressions?: number; clicks?: number; conversions?: number; spend?: number; revenue?: number }): Experiment | null {
    const mem = DataStore.mem();
    const exp = mem.findOne("experiments", (e: any) => e.id === expId && e.tenantId === tenantId);
    if (!exp) return null;
    const vIdx = exp.variants.findIndex((v: any) => v.id === variantId);
    if (vIdx === -1) return null;
    const existing = exp.variants[vIdx].metrics.findIndex((m: any) => m.date === date);
    const entry = { date, impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0, ...metrics };
    if (existing >= 0) {
      exp.variants[vIdx].metrics[existing] = { ...exp.variants[vIdx].metrics[existing], ...entry };
    } else {
      exp.variants[vIdx].metrics.push(entry);
    }
    mem.update("experiments", (e: any) => e.id === expId, { variants: exp.variants });
    return exp;
  }

  getExperimentSummary(tenantId: string): ExperimentSummary {
    const mem = DataStore.mem();
    const all = mem.find("experiments", (e: any) => e.tenantId === tenantId);
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const e of all) {
      byType[e.type] = (byType[e.type] || 0) + 1;
      byStatus[e.status] = (byStatus[e.status] || 0) + 1;
    }
    const completed = all.filter((e: any) => e.status === "completed" && e.results);
    const sigResults = completed.filter((e: any) => e.results.significant);
    const avgLift = completed.length > 0 ? completed.reduce((s: number, e: any) => s + (e.results.lift || 0), 0) / completed.length : 0;
    return {
      total: all.length, byType, byStatus,
      running: all.filter((e: any) => e.status === "running").length,
      completed: completed.length,
      significantResults: sigResults.length,
      avgLift: Math.round(avgLift * 100) / 100,
      recentExperiments: all.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10),
    };
  }

  private computeResults(exp: Experiment): ExperimentResults {
    const control = exp.variants.find(v => v.type === "control");
    const treatments = exp.variants.filter(v => v.type === "treatment");
    if (!control || treatments.length === 0) {
      return {
        winner: null, confidence: 0, significant: false, metric: exp.primaryMetric,
        controlAvg: 0, treatmentAvg: 0, lift: 0, pValue: 1, sampleSize: 0,
        recommendedAction: "Insufficient data — add more variants or collect more data",
        details: null as any,
      };
    }
    const treatment = treatments[0];
    const cMetrics = this.aggregateMetrics(control.metrics);
    const tMetrics = this.aggregateMetrics(treatments.map(v => v.metrics).flat());
    const cTotal = cMetrics[exp.primaryMetric] || 0;
    const tTotal = tMetrics[exp.primaryMetric] || 0;
    const cSize = control.metrics.length;
    const tSize = treatment.metrics.length;
    const cMean = cSize > 0 ? cTotal / cSize : 0;
    const tMean = tSize > 0 ? tTotal / tSize : 0;
    const cVar = cSize > 1 ? control.metrics.reduce((s, m) => s + Math.pow((m[exp.primaryMetric as keyof typeof m] || 0) - cMean, 2), 0) / (cSize - 1) : 0;
    const tVar = tSize > 1 ? treatment.metrics.reduce((s, m) => s + Math.pow((m[exp.primaryMetric as keyof typeof m] || 0) - tMean, 2), 0) / (tSize - 1) : 0;
    const cStd = Math.sqrt(cVar);
    const tStd = Math.sqrt(tVar);
    const se = Math.sqrt(cVar / cSize + tVar / tSize);
    const tStat = se > 0 ? (tMean - cMean) / se : 0;
    const df = Math.max(1, cSize + tSize - 2);
    const pVal = this.approximatePValue(Math.abs(tStat), df);
    const lift = cMean > 0 ? ((tMean - cMean) / cMean) * 100 : 0;
    const significant = pVal < (1 - (exp.confidenceLevel || 0.95));
    const confidence = (1 - pVal) * 100;

    let winner: string | null = null;
    let recommendedAction = "No significant difference detected — continue running";
    if (significant) {
      winner = tMean > cMean ? treatment.id : control.id;
      recommendedAction = winner === treatment.id
        ? `Treatment variant outperforms control by ${Math.abs(lift).toFixed(1)}% (p=${pVal.toFixed(4)}). Recommend: adopt treatment.`
        : `Control variant outperforms treatment by ${Math.abs(lift).toFixed(1)}% (p=${pVal.toFixed(4)}). Recommend: keep control.`;
    }
    if (cSize < 3 || tSize < 3) {
      recommendedAction = "Sample size too small for statistically significant results — collect more data";
    }

    return {
      winner,
      confidence: Math.round(confidence * 100) / 100,
      significant,
      metric: exp.primaryMetric,
      controlAvg: Math.round(cMean * 100) / 100,
      treatmentAvg: Math.round(tMean * 100) / 100,
      lift: Math.round(lift * 100) / 100,
      pValue: Math.round(pVal * 10000) / 10000,
      sampleSize: cSize + tSize,
      recommendedAction,
      details: {
        control: { mean: cMean, variance: cVar, stdDev: cStd, size: cSize, total: cTotal },
        treatment: { mean: tMean, variance: tVar, stdDev: tStd, size: tSize, total: tTotal },
        testStatistic: Math.round(tStat * 100) / 100,
        degreesOfFreedom: df,
        effectSize: cStd > 0 ? Math.round((tMean - cMean) / cStd * 100) / 100 : 0,
      },
    };
  }

  private aggregateMetrics(metrics: any[]): Record<string, number> {
    const totals: Record<string, number> = { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 };
    for (const m of metrics) {
      totals.impressions += m.impressions || 0;
      totals.clicks += m.clicks || 0;
      totals.conversions += m.conversions || 0;
      totals.spend += m.spend || 0;
      totals.revenue += m.revenue || 0;
    }
    return totals;
  }

  private approximatePValue(t: number, df: number): number {
    if (df <= 0 || t === Infinity || isNaN(t)) return 1;
    const x = df / (df + t * t);
    let p = 1 - this.incompleteBeta(df / 2, 0.5, x);
    if (p < 0) p = 0;
    if (p > 1) p = 1;
    return p;
  }

  private incompleteBeta(a: number, b: number, x: number): number {
    if (x === 0 || x === 1) return 0;
    return Math.exp(this.logBeta(a, b) + a * Math.log(x) + b * Math.log(1 - x) - Math.log(a));
  }

  private logBeta(a: number, b: number): number {
    return this.lgamma(a) + this.lgamma(b) - this.lgamma(a + b);
  }

  private lgamma(z: number): number {
    if (z < 0.5) {
      return Math.log(Math.PI / Math.sin(Math.PI * z)) - this.lgamma(1 - z);
    }
    z -= 1;
    const g = 7;
    const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    let x = c[0];
    for (let i = 1; i < g + 2; i++) {
      x += c[i] / (z + i);
    }
    const t = z + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }
}

export const campaignExperimentation = new CampaignExperimentationService();