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
      seed.forEach(s => {
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
      activeTenants: tenants.filter(t => t.status === "active").length,
      totalUsers: tenants.reduce((s, t) => s + t.users, 0),
      monthlyRevenue: totalRevenue,
      annualRunRate: totalRevenue * 12,
      byPlan: { starter: tenants.filter(t => t.plan === "starter").length, growth: tenants.filter(t => t.plan === "growth").length, enterprise: tenants.filter(t => t.plan === "enterprise").length },
      byStatus: { active: tenants.filter(t => t.status === "active").length, suspended: tenants.filter(t => t.status === "suspended").length, cancelled: tenants.filter(t => t.status === "cancelled").length },
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
}

export const adminService = new AdminService();
