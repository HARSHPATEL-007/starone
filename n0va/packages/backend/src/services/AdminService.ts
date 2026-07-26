import { DataStore } from "./DataStore";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: "starter" | "growth" | "enterprise";
  status: "active" | "suspended" | "cancelled";
  users: number;
  storageUsed: number;
  apiCalls: number;
  monthlySpend: number;
  features: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface TenantHealth {
  tenantId: string;
  name: string;
  plan: string;
  healthScore: number;
  utilization: number;
  churnRisk: number;
  recommendation: string;
  upgradeSuggestion: string | null;
}

interface CohortRetention {
  month: string;
  signups: number;
  active: number;
  retentionRate: number;
  avgRevenue: number;
}

export class AdminService {
  getTenants(): Tenant[] {
    const mem = DataStore["mem"]();
    let tenants = mem.find("tenants", () => true) as Tenant[];
    if (!tenants.length) {
      const seed: Partial<Tenant>[] = [
        { name: "Acme Corp", slug: "acme", plan: "enterprise", status: "active", users: 24, storageUsed: 256, apiCalls: 45000, monthlySpend: 2999, features: ["campaigns", "analytics", "automation", "cdp", "api", "team", "reports", "influencers"], createdBy: "admin" },
        { name: "Startup IO", slug: "startupio", plan: "growth", status: "active", users: 8, storageUsed: 64, apiCalls: 12000, monthlySpend: 999, features: ["campaigns", "analytics", "automation", "api"], createdBy: "admin" },
        { name: "RetailCo", slug: "retailco", plan: "enterprise", status: "active", users: 35, storageUsed: 512, apiCalls: 89000, monthlySpend: 4999, features: ["campaigns", "analytics", "automation", "cdp", "api", "team", "reports", "influencers", "white_label"], createdBy: "admin" },
        { name: "Agency Co", slug: "agency", plan: "growth", status: "active", users: 15, storageUsed: 128, apiCalls: 32000, monthlySpend: 1499, features: ["campaigns", "analytics", "team", "reports", "influencers"], createdBy: "admin" },
        { name: "Dev Shop", slug: "devshop", plan: "starter", status: "active", users: 3, storageUsed: 8, apiCalls: 2000, monthlySpend: 299, features: ["campaigns", "analytics"], createdBy: "admin" },
        { name: "Edu University", slug: "edu", plan: "starter", status: "suspended", users: 2, storageUsed: 4, apiCalls: 500, monthlySpend: 0, features: ["campaigns"], createdBy: "admin" },
        { name: "Finance Inc", slug: "finance", plan: "enterprise", status: "active", users: 42, storageUsed: 768, apiCalls: 120000, monthlySpend: 7999, features: ["campaigns", "analytics", "automation", "cdp", "api", "team", "reports", "influencers", "white_label", "dedicated"], createdBy: "admin" },
      ];
      seed.forEach((s) => {
        const t: Tenant = { id: `tenant_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, ...s as any, createdAt: new Date(Date.now() - Math.random() * 365 * 86400000).toISOString(), updatedAt: new Date().toISOString() };
        mem.insert("tenants", t);
      });
      tenants = mem.find("tenants", () => true);
    }
    return tenants;
  }

  getTenant(id: string): Tenant | undefined {
    return DataStore["mem"]().findOne("tenants", (t: any) => t.id === id);
  }

  updateTenant(id: string, data: Partial<Tenant>): Tenant | null {
    const mem = DataStore["mem"]();
    const existing = mem.findOne("tenants", (t: any) => t.id === id);
    if (!existing) return null;
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    mem.update("tenants", (t: any) => t.id === id, updated);
    return updated;
  }

  getAdminStats() {
    const tenants = this.getTenants();
    const totalRevenue = tenants.reduce((s, t) => s + (t.status === "active" ? t.monthlySpend : 0), 0);
    return {
      totalTenants: tenants.length,
      activeTenants: tenants.filter((t) => t.status === "active").length,
      totalUsers: tenants.reduce((s, t) => s + t.users, 0),
      monthlyRevenue: totalRevenue,
      annualRunRate: totalRevenue * 12,
      byPlan: { starter: tenants.filter((t) => t.plan === "starter").length, growth: tenants.filter((t) => t.plan === "growth").length, enterprise: tenants.filter((t) => t.plan === "enterprise").length },
      byStatus: { active: tenants.filter((t) => t.status === "active").length, suspended: tenants.filter((t) => t.status === "suspended").length, cancelled: tenants.filter((t) => t.status === "cancelled").length },
      totalStorage: tenants.reduce((s, t) => s + t.storageUsed, 0),
      totalApiCalls: tenants.reduce((s, t) => s + t.apiCalls, 0),
    };
  }

  getAvailableFeatures(): string[] {
    return ["campaigns", "analytics", "automation", "cdp", "api", "team", "reports", "influencers", "white_label", "dedicated", "multi_platform", "advanced_segments", "custom_reports", "priority_support"];
  }

  getAuditLog(limit = 50): any[] {
    const mem = DataStore["mem"]();
    return mem.find("admin_audit", () => true).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  }

  logAudit(action: string, tenantId: string, userId: string, details: Record<string, any>) {
    DataStore["mem"]().insert("admin_audit", { action, tenantId, userId, details, timestamp: new Date().toISOString() });
  }

  // ─── Tenant Health Scoring ──────────────────────────────────────────

  getTenantHealth(): TenantHealth[] {
    const tenants = this.getTenants().filter((t) => t.status === "active");
    const planLimits: Record<string, { maxUsers: number; maxStorage: number; maxApiCalls: number }> = {
      starter: { maxUsers: 5, maxStorage: 32, maxApiCalls: 5000 },
      growth: { maxUsers: 20, maxStorage: 256, maxApiCalls: 50000 },
      enterprise: { maxUsers: 100, maxStorage: 2048, maxApiCalls: 500000 },
    };

    return tenants.map((t) => {
      const limits = planLimits[t.plan] || planLimits.starter;
      const userUtil = limits.maxUsers > 0 ? t.users / limits.maxUsers : 0;
      const storageUtil = limits.maxStorage > 0 ? t.storageUsed / limits.maxStorage : 0;
      const apiUtil = limits.maxApiCalls > 0 ? t.apiCalls / limits.maxApiCalls : 0;
      const utilization = Math.min(1, (userUtil * 0.3 + storageUtil * 0.3 + apiUtil * 0.4));
      const healthScore = Math.round((1 - utilization) * 100);

      // Churn risk: combining low engagement + over-limit + low spend
      const lowEngagement = t.apiCalls < limits.maxApiCalls * 0.1 ? 0.3 : 0;
      const overLimit = utilization > 0.8 ? 0.4 : utilization > 0.6 ? 0.2 : 0;
      const lowSpend = t.monthlySpend < 100 ? 0.3 : 0;
      const churnRisk = Math.round(Math.min(1, lowEngagement + overLimit + lowSpend) * 100);

      let recommendation: string;
      if (healthScore < 30) recommendation = "Critical: tenant is near or over plan limits. Immediate review needed.";
      else if (healthScore < 50) recommendation = "Warning: tenant approaching plan limits. Consider upgrade or optimization.";
      else if (healthScore < 70) recommendation = "Monitor: tenant has moderate headroom.";
      else recommendation = "Healthy: tenant has ample capacity remaining.";

      // Upgrade suggestion
      const plans = ["starter", "growth", "enterprise"];
      const currentIdx = plans.indexOf(t.plan);
      let upgradeSuggestion: string | null = null;
      if (currentIdx < plans.length - 1 && utilization > 0.7) {
        upgradeSuggestion = `Recommend upgrading from ${t.plan} to ${plans[currentIdx + 1]} (${Math.round((1 - utilization) * 100)}% headroom remaining).`;
      } else if (t.plan === "starter" && t.monthlySpend > 200) {
        upgradeSuggestion = "Tenant's monthly spend exceeds typical starter cap. Consider growth plan.";
      }

      return { tenantId: t.id, name: t.name, plan: t.plan, healthScore, utilization: Math.round(utilization * 100), churnRisk, recommendation, upgradeSuggestion };
    });
  }

  // ─── Cohort Retention Analysis ──────────────────────────────────────

  getCohortRetention(): CohortRetention[] {
    const tenants = this.getTenants();
    const cohorts = new Map<string, { signups: number; active: number; totalSpend: number }>();

    for (const t of tenants) {
      const month = t.createdAt.substring(0, 7);
      if (!cohorts.has(month)) cohorts.set(month, { signups: 0, active: 0, totalSpend: 0 });
      const c = cohorts.get(month)!;
      c.signups++;
      if (t.status === "active") c.active++;
      c.totalSpend += t.monthlySpend;
    }

    return Array.from(cohorts.entries())
      .map(([month, data]) => ({
        month,
        signups: data.signups,
        active: data.active,
        retentionRate: Math.round((data.active / data.signups) * 10000) / 100,
        avgRevenue: Math.round((data.totalSpend / data.active) * 100) / 100,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  // ─── Resource Utilization Forecasting ───────────────────────────────

  forecastResourceGrowth(tenantId: string): { current: { storage: number; apiCalls: number }; projected30Days: { storage: number; apiCalls: number }; growthRate: number; peakDay: string | null; recommendation: string } {
    const tenant = this.getTenant(tenantId);
    if (!tenant) throw new Error("Tenant not found");
    const limits = { starter: { maxStorage: 32, maxApiCalls: 5000 }, growth: { maxStorage: 256, maxApiCalls: 50000 }, enterprise: { maxStorage: 2048, maxApiCalls: 500000 } }[tenant.plan] || { maxStorage: 32, maxApiCalls: 5000 };

    // Simple daily growth estimation based on total / days
    const daysSinceCreation = Math.max(1, (Date.now() - new Date(tenant.createdAt).getTime()) / 86400000);
    const dailyStorageGrowth = tenant.storageUsed / daysSinceCreation;
    const dailyApiGrowth = tenant.apiCalls / daysSinceCreation;

    const projectedStorage = tenant.storageUsed + dailyStorageGrowth * 30;
    const projectedApi = tenant.apiCalls + dailyApiGrowth * 30;
    const growthRate = Math.round((dailyStorageGrowth / Math.max(1, tenant.storageUsed / daysSinceCreation)) * 100) / 100;

    // Estimate peak day (when limits will be hit)
    const daysToStorageLimit = dailyStorageGrowth > 0 ? (limits.maxStorage - tenant.storageUsed) / dailyStorageGrowth : Infinity;
    const daysToApiLimit = dailyApiGrowth > 0 ? (limits.maxApiCalls - tenant.apiCalls) / dailyApiGrowth : Infinity;
    const daysToLimit = Math.min(daysToStorageLimit, daysToApiLimit);

    let recommendation: string;
    if (daysToLimit < 30) recommendation = `CRITICAL: Will hit plan limits in ${Math.round(daysToLimit)} days. Upgrade immediately.`;
    else if (daysToLimit < 90) recommendation = `Warning: Will hit limits in ~${Math.round(daysToLimit)} days. Plan upgrade recommended.`;
    else recommendation = `Sufficient capacity for >${Math.round(daysToLimit)} days. No immediate action needed.`;

    const peakDay = isFinite(daysToLimit) && daysToLimit < 365
      ? new Date(Date.now() + daysToLimit * 86400000).toISOString().split("T")[0]
      : null;

    return {
      current: { storage: tenant.storageUsed, apiCalls: tenant.apiCalls },
      projected30Days: { storage: Math.round(projectedStorage * 100) / 100, apiCalls: Math.round(projectedApi) },
      growthRate,
      peakDay,
      recommendation,
    };
  }
}

export const adminService = new AdminService();
