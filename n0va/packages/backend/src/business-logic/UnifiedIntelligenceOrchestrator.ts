import { campaignSummaryOrchestrator } from "./CampaignSummaryOrchestrator";
import { audienceInsightsOrchestrator } from "./AudienceInsightsOrchestrator";
import { notificationOrchestrator } from "./NotificationOrchestrator";
import { developerPortalOrchestrator } from "./DeveloperPortalOrchestrator";
import { adminOrchestrator } from "./AdminOrchestrator";
import { fileStorageOrchestrator } from "./FileStorageOrchestrator";
import { landingPageOrchestrator } from "./LandingPageOrchestrator";
import { n0va1oOrchestrator } from "./N0VA1OOrchestrator";
import { decisionEngine } from "./DecisionEngine";

export interface DomainHealth {
  domain: string;
  score: number;
  band: string;
  status: string;
  summary: string;
}

export interface IntelligenceSnapshot {
  capturedAt: string;
  campaign: { totalCampaigns: number; activeCount: number; overallROAS: number; atRiskCampaigns: number; healthBand: string };
  budget: { budgetUtilization: number; pacingAlerts: number };
  creative: { totalCreatives: number; platformCount: number; topTone: string };
  audience: { totalAudiences: number; totalReach: number; overlapWarnings: number; topAudience: string };
  delivery: { successRate: number; totalDeliveries: number; channelsAtRisk: number };
  api: { totalKeys: number; activeKeys: number; keysDueRotation: number; usageAnomalies: number };
  tenant: { totalTenants: number; monthlyRevenue: number; churnRisk: number };
  storage: { totalFiles: number; optimizationScore: number; duplicatesFound: number };
  landingPage: { totalPages: number; averageConversion: number; pagesNeedingAttention: number };
  n0va1o: { platformCount: number; degradedPlatforms: number; overallHealthScore: number };
  domainHealth: DomainHealth[];
  overallHealthScore: number;
  overallBand: string;
  topRecommendations: string[];
  riskCount: number;
}

export class UnifiedIntelligenceOrchestrator {
  async capture(tenantId: string): Promise<IntelligenceSnapshot> {
    const portfolioPromise = campaignSummaryOrchestrator.getPortfolioSummary(tenantId).catch(() => null);

    const campaigns = await portfolioPromise;

    const campaignHealth = campaigns ? {
      totalCampaigns: campaigns.portfolio.totalCampaigns,
      activeCount: campaigns.portfolio.activeCount,
      overallROAS: campaigns.portfolio.overallROAS,
      atRiskCampaigns: campaigns.atRiskCampaigns.length,
      healthBand: campaigns.healthBand,
    } : { totalCampaigns: 0, activeCount: 0, overallROAS: 0, atRiskCampaigns: 0, healthBand: "Unknown" };

    const budget = { budgetUtilization: 0, pacingAlerts: 0 };

    const creative = { totalCreatives: 0, platformCount: 0, topTone: "N/A" };

    const audienceInfo = audienceInsightsOrchestrator.getDashboard(tenantId);
    const audience = {
      totalAudiences: audienceInfo.totalAudiences,
      totalReach: audienceInfo.totalReach,
      overlapWarnings: audienceInfo.overlapWarnings.length,
      topAudience: audienceInfo.topAudience,
    };

    const deliveryInfo = notificationOrchestrator.getDeliveryDashboard();
    const delivery = {
      successRate: deliveryInfo.deliverySLA.successRate,
      totalDeliveries: deliveryInfo.deliverySLA.totalDeliveries,
      channelsAtRisk: deliveryInfo.channelsAtRisk.length,
    };

    const apiInfo = developerPortalOrchestrator.getDashboard(tenantId);
    const api = {
      totalKeys: apiInfo.apiHealth.totalKeys,
      activeKeys: apiInfo.apiHealth.activeKeys,
      keysDueRotation: apiInfo.apiHealth.keysDueRotation,
      usageAnomalies: apiInfo.usageAnomalies.filter(a => a.flagged).length,
    };

    const tenantInfo = adminOrchestrator.getDashboard();
    const avgChurn = tenantInfo.tenantHealth.length > 0
      ? Math.round(tenantInfo.tenantHealth.reduce((s, h) => s + h.churnRisk, 0) / tenantInfo.tenantHealth.length)
      : 0;
    const tenant = {
      totalTenants: tenantInfo.tenantHealth.length,
      monthlyRevenue: tenantInfo.revenue.monthlyRevenue,
      churnRisk: avgChurn,
    };

    const storageInfo = fileStorageOrchestrator.getDashboard(tenantId);
    const storage = {
      totalFiles: storageInfo.totalFiles,
      optimizationScore: storageInfo.optimizationScore,
      duplicatesFound: storageInfo.duplicates.duplicates.length,
    };

    const landingInfo = landingPageOrchestrator.getDashboard(tenantId);
    const landingPage = {
      totalPages: landingInfo.totalPages,
      averageConversion: landingInfo.avgConversionPrediction,
      pagesNeedingAttention: landingInfo.pagesNeedingAttention.length,
    };

    const n0va1oInfo = n0va1oOrchestrator.getGatewayDashboard();
    const n0va1o = {
      platformCount: n0va1oInfo.platformCount,
      degradedPlatforms: n0va1oInfo.degradedPlatforms.length,
      overallHealthScore: n0va1oInfo.overallHealthScore,
    };

    const domainHealth: DomainHealth[] = [
      { domain: "Campaign", score: campaignHealth.totalCampaigns > 0 ? Math.round(campaignHealth.overallROAS * 25 + 10) : 0, band: campaignHealth.healthBand, status: campaignHealth.activeCount > 0 ? "Active" : "Inactive", summary: `${campaignHealth.activeCount} active, ${campaignHealth.atRiskCampaigns} at risk, ROAS ${campaignHealth.overallROAS.toFixed(1)}x` },
      {       domain: "Budget", score: 50, band: "Fair", status: "Nominal", summary: "Budget analysis available via /api/v1/optimizer" },
      { domain: "Creative", score: creative.totalCreatives > 0 ? Math.min(100, creative.totalCreatives * 3 + 20) : 0, band: creative.totalCreatives > 0 ? "Good" : "Critical", status: creative.totalCreatives > 0 ? "Active" : "Empty", summary: `${creative.totalCreatives} creatives across ${creative.platformCount} platforms` },
      { domain: "Audience", score: audience.totalAudiences > 0 ? Math.round(Math.max(0, 100 - audience.overlapWarnings * 15)) : 0, band: audience.overlapWarnings > 3 ? "Poor" : audience.totalAudiences > 0 ? "Good" : "Critical", status: audience.totalAudiences > 0 ? "Active" : "Empty", summary: `${audience.totalAudiences} audiences, ${(audience.totalReach / 1000000).toFixed(1)}M reach` },
      { domain: "Delivery", score: delivery.successRate, band: decisionEngine.label(decisionEngine.band(delivery.successRate)), status: delivery.channelsAtRisk > 0 ? "Degraded" : "Healthy", summary: `${delivery.successRate}% success, ${delivery.totalDeliveries} deliveries` },
      { domain: "API", score: api.totalKeys > 0 ? Math.round(Math.max(0, 100 - api.keysDueRotation * 15 - api.usageAnomalies * 20)) : 0, band: api.keysDueRotation > 2 ? "Poor" : api.totalKeys > 0 ? "Good" : "Critical", status: api.keysDueRotation > 0 ? "Rotation needed" : "Nominal", summary: `${api.activeKeys}/${api.totalKeys} active keys, ${api.keysDueRotation} due rotation` },
      { domain: "Tenant", score: tenant.totalTenants > 0 ? Math.round(Math.max(0, 100 - tenant.churnRisk * 0.5)) : 0, band: decisionEngine.label(decisionEngine.band(100 - tenant.churnRisk)), status: tenant.churnRisk > 40 ? "Risk elevated" : "Healthy", summary: `${tenant.totalTenants} tenants, $${(tenant.monthlyRevenue / 1000).toFixed(0)}K MRR` },
      { domain: "Storage", score: storage.optimizationScore, band: decisionEngine.label(decisionEngine.band(storage.optimizationScore)), status: storage.duplicatesFound > 0 ? "Duplicates found" : "Clean", summary: `${storage.totalFiles} files, ${storage.duplicatesFound} duplicates` },
      { domain: "Landing Pages", score: landingPage.totalPages > 0 ? Math.round(Math.max(0, landingPage.averageConversion * 10 + 30)) : 0, band: landingPage.pagesNeedingAttention > 3 ? "Poor" : landingPage.totalPages > 0 ? "Good" : "Critical", status: landingPage.pagesNeedingAttention > 0 ? "Needs attention" : "Good", summary: `${landingPage.totalPages} pages, ${landingPage.averageConversion}% avg CVR` },
      { domain: "N0VA1O Gateway", score: n0va1o.overallHealthScore, band: decisionEngine.label(decisionEngine.band(n0va1o.overallHealthScore)), status: n0va1o.degradedPlatforms > 0 ? "Degraded" : "Healthy", summary: `${n0va1o.platformCount} platforms, ${n0va1o.degradedPlatforms} degraded` },
    ];

    for (const d of domainHealth) d.band = decisionEngine.label(decisionEngine.band(d.score));

    const scores = domainHealth.map(d => d.score);
    const overallHealthScore = scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;
    const overallBand = decisionEngine.label(decisionEngine.band(overallHealthScore));

    const allRecommendations: string[] = [];
    const riskCounts: number[] = [];
    if (campaigns) { allRecommendations.push(...campaigns.topRecommendations); riskCounts.push(campaigns.atRiskCampaigns.length); }
    if (audienceInfo.recommendations) allRecommendations.push(...audienceInfo.recommendations);
    if (deliveryInfo.recommendations) allRecommendations.push(...deliveryInfo.recommendations);
    if (apiInfo.topRecommendations) allRecommendations.push(...apiInfo.topRecommendations);
    if (tenantInfo.topRecommendations) allRecommendations.push(...tenantInfo.topRecommendations);
    if (storageInfo.recommendations) allRecommendations.push(...storageInfo.recommendations);
    if (landingInfo.recommendations) allRecommendations.push(...landingInfo.recommendations);
    if (n0va1oInfo.recommendations) allRecommendations.push(...n0va1oInfo.recommendations);

    const topRecommendations = allRecommendations.slice(0, 15);
    const riskCount = riskCounts.reduce((s, v) => s + v, 0);

    return {
      capturedAt: new Date().toISOString(),
      campaign: campaignHealth,
      budget,
      creative,
      audience,
      delivery,
      api,
      tenant,
      storage,
      landingPage,
      n0va1o,
      domainHealth,
      overallHealthScore,
      overallBand,
      topRecommendations,
      riskCount,
    };
  }
}

export const unifiedIntelligenceOrchestrator = new UnifiedIntelligenceOrchestrator();
