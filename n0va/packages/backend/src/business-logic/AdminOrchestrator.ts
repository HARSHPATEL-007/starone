import { adminService } from "../services/AdminService";
import { DataStore } from "../services/DataStore";
import { decisionEngine } from "./DecisionEngine";

export interface TenantHealthDashboard {
  tenantId: string;
  name: string;
  plan: string;
  healthScore: number;
  utilization: number;
  churnRisk: number;
  recommendation: string;
  upgradeSuggestion: string | null;
  healthBand: string;
}

export interface RevenueAnalytics {
  monthlyRevenue: number;
  annualRunRate: number;
  perPlanRevenue: Record<string, number>;
  revenueConcentration: number;
  avgRevenuePerTenant: number;
  growthProjection: number;
}

export interface AdminDashboard {
  tenantHealth: TenantHealthDashboard[];
  revenue: RevenueAnalytics;
  cohortRetention: { month: string; signups: number; active: number; retentionRate: number; avgRevenue: number }[];
  resourceForecasts: { tenantId: string; name: string; daysToLimit: number | null; recommendation: string }[];
  topRisks: string[];
  topRecommendations: string[];
  healthBand: string;
}

export class AdminOrchestrator {
  getDashboard(): AdminDashboard {
    const health = adminService.getTenantHealth();
    const tenants = adminService.getTenants();
    const stats = adminService.getAdminStats();
    const cohorts = adminService.getCohortRetention();
    const auditLog = adminService.getAuditLog();

    const tenantHealth: TenantHealthDashboard[] = health.map(h => ({
      ...h,
      healthBand: decisionEngine.label(decisionEngine.band(h.healthScore)),
    }));

    const revenueByPlan: Record<string, number> = {};
    for (const t of tenants) {
      if (t.status === "active") {
        revenueByPlan[t.plan] = (revenueByPlan[t.plan] || 0) + t.monthlySpend;
      }
    }

    const activeRevenues = tenants.filter(t => t.status === "active").map(t => t.monthlySpend);
    const totalRevenue = activeRevenues.reduce((s, v) => s + v, 0);
    const revenueConcentration = activeRevenues.length > 0
      ? decisionEngine.hhi(activeRevenues)
      : 0;

    const avgRevenue = tenants.filter(t => t.status === "active").length > 0
      ? Math.round(totalRevenue / tenants.filter(t => t.status === "active").length)
      : 0;

    const forecastedRevenues = activeRevenues.length >= 2
      ? decisionEngine.forecastLinear(activeRevenues, 3)
      : null;
    const growthProjection = forecastedRevenues
      ? Math.round(((forecastedRevenues.values[forecastedRevenues.values.length - 1] - totalRevenue) / totalRevenue) * 100)
      : 0;

    const resourceForecasts: AdminDashboard["resourceForecasts"] = [];
    for (const t of tenants.filter(t => t.status === "active")) {
      try {
        const forecast = adminService.forecastResourceGrowth(t.id);
        resourceForecasts.push({
          tenantId: t.id, name: t.name,
          daysToLimit: forecast.peakDay ? Math.round((new Date(forecast.peakDay).getTime() - Date.now()) / 86400000) : null,
          recommendation: forecast.recommendation,
        });
      } catch {}
    }

    const topRisks: string[] = [];
    const critical = tenantHealth.filter(h => h.healthBand === "Critical");
    for (const c of critical) topRisks.push(`${c.name} (${c.plan}): health ${c.healthScore}, utilization ${c.utilization}% — ${c.recommendation}`);
    const highChurn = health.filter(h => h.churnRisk > 60).sort((a, b) => b.churnRisk - a.churnRisk).slice(0, 5);
    for (const hc of highChurn) {
      if (!topRisks.some(r => r.includes(hc.name))) topRisks.push(`${hc.name}: churn risk ${hc.churnRisk}%`);
    }

    const topRecommendations: string[] = [];
    if (critical.length > 0) topRecommendations.push(`${critical.length} tenant(s) in critical health. Immediate review: ${critical.map(c => c.name).join(", ")}.`);
    const upgradeSuggestions = health.filter(h => h.upgradeSuggestion);
    if (upgradeSuggestions.length > 0) topRecommendations.push(`Upgrade opportunities: ${upgradeSuggestions.slice(0, 3).map(s => `${s.name} (${s.plan})`).join(", ")}.`);
    if (revenueConcentration > 2500) topRecommendations.push(`Revenue concentration (HHI ${revenueConcentration.toFixed(0)}) is high. Diversify tenant base to reduce risk.`);
    if (growthProjection > 0) topRecommendations.push(`Projected revenue growth: +${growthProjection}% over 3 periods based on current trend.`);

    const avgHealth = tenantHealth.length > 0
      ? Math.round(tenantHealth.reduce((s, h) => s + h.healthScore, 0) / tenantHealth.length)
      : 0;
    const healthBand = decisionEngine.label(decisionEngine.band(avgHealth));

    return { tenantHealth, revenue: { monthlyRevenue: stats.monthlyRevenue, annualRunRate: stats.annualRunRate, perPlanRevenue: revenueByPlan, revenueConcentration, avgRevenuePerTenant: avgRevenue, growthProjection }, cohortRetention: cohorts, resourceForecasts, topRisks, topRecommendations, healthBand };
  }
}

export const adminOrchestrator = new AdminOrchestrator();
