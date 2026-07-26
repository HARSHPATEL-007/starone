import { landingPageBuilderService } from "../services/LandingPageBuilderService";
import { DataStore } from "../services/DataStore";
import { decisionEngine } from "./DecisionEngine";

export interface TemplateUsageStat {
  template: string;
  pageCount: number;
  avgPredictedCvr: number;
  avgSeoScore: number;
  publishRate: number;
}

export interface PageHealthReport {
  pageId: string;
  pageName: string;
  status: string;
  predictedCvr: number;
  seoScore: number;
  optimizationScore: number;
  healthBand: string;
}

export interface LandingPageDashboard {
  totalPages: number;
  publishedCount: number;
  templateUsage: TemplateUsageStat[];
  pageHealth: PageHealthReport[];
  pagesNeedingAttention: string[];
  topPerformer: string | null;
  avgConversionPrediction: number;
  avgSeoScore: number;
  recommendations: string[];
}

export class LandingPageOrchestrator {
  getDashboard(tenantId: string): LandingPageDashboard {
    const pages = landingPageBuilderService.getPages(tenantId);

    const templateMap = new Map<string, { count: number; cvrSum: number; seoSum: number; published: number }>();
    const pageHealth: PageHealthReport[] = [];

    for (const page of pages) {
      const conv = landingPageBuilderService.predictConversion(page);
      const seo = landingPageBuilderService.seoScore(page);
      const opts = landingPageBuilderService.optimizeElements(page);

      if (!templateMap.has(page.template)) {
        templateMap.set(page.template, { count: 0, cvrSum: 0, seoSum: 0, published: 0 });
      }
      const entry = templateMap.get(page.template)!;
      entry.count++;
      entry.cvrSum += conv.predictedCvr;
      entry.seoSum += seo.overallScore;
      if (page.status === "published") entry.published++;

      pageHealth.push({
        pageId: page.id, pageName: page.name, status: page.status,
        predictedCvr: conv.predictedCvr, seoScore: seo.overallScore,
        optimizationScore: opts.overallOptimizationScore,
        healthBand: decisionEngine.label(decisionEngine.band(Math.round((seo.overallScore * 0.5 + conv.predictedCvr * 0.3 + opts.overallOptimizationScore * 0.2)))),
      });
    }

    const templateUsage: TemplateUsageStat[] = Array.from(templateMap.entries()).map(([template, data]) => ({
      template, pageCount: data.count,
      avgPredictedCvr: data.count > 0 ? Math.round(data.cvrSum / data.count * 100) / 100 : 0,
      avgSeoScore: data.count > 0 ? Math.round(data.seoSum / data.count) : 0,
      publishRate: data.count > 0 ? Math.round((data.published / data.count) * 10000) / 100 : 0,
    })).sort((a, b) => b.pageCount - a.pageCount);

    const pagesNeedingAttention = pageHealth.filter(p => p.healthBand === "Critical" || p.healthBand === "Poor").map(p => p.pageName);
    const sorted = [...pageHealth].sort((a, b) => (b.predictedCvr + b.seoScore) - (a.predictedCvr + a.seoScore));
    const topPerformer = sorted.length > 0 ? sorted[0].pageName : null;
    const avgConversionPrediction = pages.length > 0 ? Math.round(pageHealth.reduce((s, p) => s + p.predictedCvr, 0) / pages.length * 100) / 100 : 0;
    const avgSeoScore = pages.length > 0 ? Math.round(pageHealth.reduce((s, p) => s + p.seoScore, 0) / pages.length) : 0;

    const recommendations: string[] = [];
    if (pagesNeedingAttention.length > 0) recommendations.push(`${pagesNeedingAttention.length} page(s) need optimization: "${pagesNeedingAttention.join(", ")}".`);
    if (avgSeoScore < 50) recommendations.push(`Average SEO score (${avgSeoScore}/100) is low. Review meta tags and content depth across all pages.`);
    if (avgConversionPrediction < 3) recommendations.push(`Average predicted CVR (${avgConversionPrediction}%) is below 3% target. Focus on hero section quality and CTA clarity.`);
    const lowPubRate = templateUsage.filter(t => t.publishRate < 50 && t.pageCount >= 2);
    if (lowPubRate.length > 0) recommendations.push(`${lowPubRate.map(t => t.template).join(", ")} template(s) have low publish rate — review draft pages and either publish or archive.`);

    return { totalPages: pages.length, publishedCount: pages.filter(p => p.status === "published").length, templateUsage, pageHealth, pagesNeedingAttention, topPerformer, avgConversionPrediction, avgSeoScore, recommendations };
  }
}

export const landingPageOrchestrator = new LandingPageOrchestrator();
