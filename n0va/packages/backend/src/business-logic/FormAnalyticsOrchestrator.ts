import { DataStore } from "../services/DataStore";
import { decisionEngine } from "./DecisionEngine";

export interface FormPerformance {
  formId: string;
  formName: string;
  formType: string;
  status: string;
  submissions: number;
  conversionRate: number;
  fields: number;
  healthScore: number;
}

export interface SubmissionTrend {
  date: string;
  count: number;
  converted: number;
  conversionRate: number;
}

export interface FormTypeBenchmark {
  formType: string;
  formCount: number;
  avgSubmissions: number;
  avgConversionRate: number;
  bestConversionRate: number;
}

export interface FormConversionFunnel {
  stage: string;
  count: number;
  dropOff: number;
}

export interface FormAnalyticsDashboard {
  generatedAt: string;
  totalForms: number;
  activeForms: number;
  totalSubmissions: number;
  overallConversionRate: number;
  formPerformance: FormPerformance[];
  submissionTrend: SubmissionTrend[];
  typeBenchmarks: FormTypeBenchmark[];
  bestForm: { name: string; conversionRate: number } | null;
  worstForm: { name: string; conversionRate: number } | null;
  conversionFunnel: FormConversionFunnel[];
  healthScore: number;
  healthBand: string;
  recommendations: string[];
}

export class FormAnalyticsOrchestrator {
  async analyze(tenantId: string): Promise<FormAnalyticsDashboard> {
    const forms = await DataStore.findMarketingForms({ tenantId });
    const submissions = await DataStore.findFormSubmissions({ tenantId });

    const activeForms = forms.filter((f) => f.status === "active");
    const totalSubmissions = submissions.length;

    const formPerformance: FormPerformance[] = forms.map((f) => {
      const fSubmissions = submissions.filter((s) => s.formId === f._id).length;
      const convRate = f.submissions > 0 ? (fSubmissions / Math.max(1, f.submissions)) * 100 : 0;
      const fields = f.fields ? f.fields.length : 0;
      const submissionScore = Math.min(40, (f.submissions / 100) * 40);
      const rateScore = f.conversionRate ? Math.min(60, f.conversionRate * 4) : 0;
      const healthScore = Math.round(Math.max(0, Math.min(100, submissionScore + rateScore)));

      return {
        formId: f._id, formName: f.name, formType: f.type, status: f.status,
        submissions: f.submissions || 0, conversionRate: f.conversionRate || 0,
        fields, healthScore,
      };
    });

    const dateMap = new Map<string, { count: number; converted: number }>();
    for (const s of submissions) {
      const d = s.submittedAt ? new Date(s.submittedAt).toISOString().split("T")[0] : "unknown";
      if (!dateMap.has(d)) dateMap.set(d, { count: 0, converted: 0 });
      const entry = dateMap.get(d)!;
      entry.count++;
      if (s.converted) entry.converted++;
    }
    const submissionTrend: SubmissionTrend[] = Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date, count: data.count, converted: data.converted,
        conversionRate: data.count > 0 ? Math.round((data.converted / data.count) * 10000) / 100 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const typeMap = new Map<string, { count: number; submissions: number[]; rates: number[] }>();
    for (const f of forms) {
      if (!typeMap.has(f.type)) typeMap.set(f.type, { count: 0, submissions: [], rates: [] });
      const entry = typeMap.get(f.type)!;
      entry.count++;
      entry.submissions.push(f.submissions || 0);
      entry.rates.push(f.conversionRate || 0);
    }
    const typeBenchmarks: FormTypeBenchmark[] = Array.from(typeMap.entries()).map(([type, data]) => ({
      formType: type, formCount: data.count,
      avgSubmissions: Math.round(data.submissions.reduce((s, v) => s + v, 0) / data.count),
      avgConversionRate: Math.round((data.rates.reduce((s, v) => s + v, 0) / data.count) * 100) / 100,
      bestConversionRate: Math.round(Math.max(...data.rates) * 100) / 100,
    }));

    const sortedByRate = [...formPerformance].sort((a, b) => b.conversionRate - a.conversionRate);
    const bestForm = sortedByRate.length > 0 && sortedByRate[0].conversionRate > 0 ? { name: sortedByRate[0].formName, conversionRate: sortedByRate[0].conversionRate } : null;
    const worstForm = sortedByRate.length > 0 ? { name: sortedByRate[sortedByRate.length - 1].formName, conversionRate: sortedByRate[sortedByRate.length - 1].conversionRate } : null;

    const funnelStages = ["impression", "view", "started", "submitted", "converted"];
    const conversionFunnel: FormConversionFunnel[] = [];
    let prevCount = totalSubmissions * 10;
    for (const stage of funnelStages) {
      const ratio = stage === "submitted" ? 1 : stage === "converted" ? submissions.filter((s) => s.converted).length / Math.max(1, totalSubmissions) : 0.8;
      const count = Math.round(prevCount * ratio);
      const dropOff = prevCount > 0 ? Math.round(((prevCount - count) / prevCount) * 100) : 0;
      conversionFunnel.push({ stage, count, dropOff: stage === "impression" ? 0 : dropOff });
      prevCount = count;
    }

    const overallConversionRate = totalSubmissions > 0 ? Math.round((submissions.filter((s) => s.converted).length / totalSubmissions) * 10000) / 100 : 0;
    const avgHealth = formPerformance.length > 0 ? formPerformance.reduce((s, f) => s + f.healthScore, 0) / formPerformance.length : 0;
    const healthScore = Math.round(avgHealth);
    const healthBand = decisionEngine.label(decisionEngine.band(healthScore));

    const recommendations: string[] = [];
    const lowRate = formPerformance.filter((f) => f.conversionRate < 5 && f.status === "active");
    if (lowRate.length > 0) recommendations.push(`${lowRate.length} active form(s) below 5% conversion. Optimize form fields and CTAs.`);
    const highFields = formPerformance.filter((f) => f.fields > 5);
    if (highFields.length > 0) recommendations.push(`${highFields.length} form(s) have ${highFields[0].fields}+ fields. Reducing to 3-4 fields can improve conversion by 30-50%.`);
    if (typeBenchmarks.length > 0) {
      const bestType = typeBenchmarks.reduce((best, t) => t.avgConversionRate > best.avgConversionRate ? t : best);
      recommendations.push(`${bestType.formType} forms have highest avg conversion (${bestType.avgConversionRate}%). Consider converting other forms to this type.`);
    }
    if (forms.length === 0) recommendations.push("No forms found. Create a form to start collecting submissions.");

    return {
      generatedAt: new Date().toISOString(), totalForms: forms.length, activeForms: activeForms.length,
      totalSubmissions, overallConversionRate, formPerformance, submissionTrend, typeBenchmarks,
      bestForm, worstForm, conversionFunnel, healthScore, healthBand, recommendations,
    };
  }
}

export const formAnalyticsOrchestrator = new FormAnalyticsOrchestrator();
