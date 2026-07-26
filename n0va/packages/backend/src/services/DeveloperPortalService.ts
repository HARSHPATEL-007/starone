import { DataStore } from "./DataStore";
import crypto from "crypto";

interface ApiKey {
  id: string;
  tenantId: string;
  name: string;
  key: string;
  prefix: string;
  scopes: string[];
  lastUsed: string | null;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  usageCount?: number;
  lastIp?: string;
}

export class DeveloperPortalService {
  generateKey(tenantId: string, name: string, scopes: string[], expiresInDays?: number): ApiKey {
    const mem = DataStore["mem"]();
    const rawKey = crypto.randomBytes(32).toString("hex");
    const prefix = rawKey.substring(0, 8);
    const key = `n0va_${prefix}_${rawKey}`;
    const apiKey: ApiKey = {
      id: `apikey_${Date.now()}`,
      tenantId, name, key, prefix, scopes,
      lastUsed: null,
      expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86400000).toISOString() : null,
      active: true,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mem.insert("api_keys", apiKey);
    return apiKey;
  }

  listKeys(tenantId: string): Omit<ApiKey, "key">[] {
    const mem = DataStore["mem"]();
    return mem.find("api_keys", (k: any) => k.tenantId === tenantId).map((k: ApiKey) => {
      const { key, ...rest } = k;
      return { ...rest, keyPreview: `${k.prefix}...${k.key.slice(-8)}` };
    });
  }

  revokeKey(tenantId: string, id: string): boolean {
    const mem = DataStore["mem"]();
    const key = mem.findOne("api_keys", (k: any) => k.tenantId === tenantId && k.id === id);
    if (!key) return false;
    mem.update("api_keys", (k: any) => k.id === id, { active: false, updatedAt: new Date().toISOString() });
    return true;
  }

  deleteKey(tenantId: string, id: string): boolean {
    return DataStore["mem"]().delete("api_keys", (k: any) => k.tenantId === tenantId && k.id === id);
  }

  validateKey(key: string): { valid: boolean; tenantId?: string } {
    const mem = DataStore["mem"]();
    const apiKey = mem.findOne("api_keys", (k: any) => k.key === key && k.active === true);
    if (!apiKey) return { valid: false };
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) return { valid: false };
    mem.update("api_keys", (k: any) => k.id === apiKey.id, { lastUsed: new Date().toISOString(), updatedAt: new Date().toISOString(), usageCount: (apiKey.usageCount || 0) + 1 });
    return { valid: true, tenantId: apiKey.tenantId };
  }

  getAvailableScopes(): { key: string; label: string; description: string }[] {
    return [
      { key: "campaigns:read", label: "Read Campaigns", description: "View campaign data and metrics" },
      { key: "campaigns:write", label: "Write Campaigns", description: "Create and update campaigns" },
      { key: "creatives:read", label: "Read Creatives", description: "View creative assets" },
      { key: "creatives:write", label: "Write Creatives", description: "Create and update creatives" },
      { key: "audiences:read", label: "Read Audiences", description: "View audience data" },
      { key: "audiences:write", label: "Write Audiences", description: "Create and update audiences" },
      { key: "analytics:read", label: "Read Analytics", description: "View analytics and reports" },
      { key: "platforms:read", label: "Read Platforms", description: "View platform connections" },
      { key: "platforms:write", label: "Write Platforms", description: "Manage platform connections" },
      { key: "admin", label: "Admin", description: "Full administrative access" },
    ];
  }

  getWebhookLogs(tenantId: string): any[] {
    const mem = DataStore["mem"]();
    return mem.find("notifications", (n: any) => n.tenantId === tenantId && n.type === "webhook_delivery")
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);
  }

  getApiUsageStats(tenantId: string) {
    const mem = DataStore["mem"]();
    const keys = mem.find("api_keys", (k: any) => k.tenantId === tenantId);
    const totalRequests = keys.reduce((s: number, k: any) => s + (k.usageCount || 0), 0);
    const activeKeys = keys.filter((k: any) => k.active).length;
    return { totalKeys: keys.length, activeKeys, totalRequests, lastRequest: keys.filter((k: any) => k.lastUsed).sort((a: any, b: any) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())[0]?.lastUsed || null };
  }

  // ─── Key Rotation Recommendation ────────────────────────────────────

  getKeyRotationRecommendations(tenantId: string): { keyId: string; name: string; age: number; usageCount: number; rotationDue: boolean; risk: "low" | "medium" | "high"; recommendation: string }[] {
    const mem = DataStore["mem"]();
    const keys = mem.find("api_keys", (k: any) => k.tenantId === tenantId && k.active) as ApiKey[];

    return keys.map((k) => {
      const createdAt = new Date(k.createdAt).getTime();
      const age = (Date.now() - createdAt) / 86400000;
      const usageCount = k.usageCount || 0;
      const usageRate = age > 0 ? usageCount / age : 0;

      // Risk factors: age > 90 days, high usage, never rotated, has admin scope
      const ageRisk = age > 180 ? 0.4 : age > 90 ? 0.2 : 0;
      const usageRisk = usageCount > 10000 ? 0.3 : usageCount > 1000 ? 0.15 : 0;
      const scopeRisk = k.scopes.includes("admin") ? 0.3 : 0;
      const riskScore = ageRisk + usageRisk + scopeRisk;

      const risk: "low" | "medium" | "high" = riskScore > 0.7 ? "high" : riskScore > 0.3 ? "medium" : "low";
      const rotationDue = riskScore > 0.3;

      let recommendation: string;
      if (rotationDue && risk === "high") recommendation = `URGENT: Key "${k.name}" is ${Math.round(age)} days old with admin scope and ${usageCount.toLocaleString()} uses. Rotate immediately.`;
      else if (rotationDue) recommendation = `Key "${k.name}" is ${Math.round(age)} days old. Consider rotating as a security best practice.`;
      else recommendation = `Key "${k.name}" is recent (${Math.round(age)} days) with moderate usage. No rotation needed.`;

      return { keyId: k.id, name: k.name, age: Math.round(age * 10) / 10, usageCount, rotationDue, risk, recommendation };
    });
  }

  // ─── Usage Anomaly Detection ────────────────────────────────────────

  detectUsageAnomaly(tenantId: string): { keyId: string; name: string; averageDaily: number; recentDaily: number; zScore: number; flagged: boolean; severity: string }[] {
    const mem = DataStore["mem"]();
    const keys = mem.find("api_keys", (k: any) => k.tenantId === tenantId && k.active) as ApiKey[];
    const anomalies: any[] = [];

    for (const k of keys) {
      const age = Math.max(1, (Date.now() - new Date(k.createdAt).getTime()) / 86400000);
      const averageDaily = (k.usageCount || 0) / age;

      // Simulate recent usage tracking via lastUsed intervals
      const lastUsed = k.lastUsed ? new Date(k.lastUsed).getTime() : Date.now();
      const daysSinceLastUse = (Date.now() - lastUsed) / 86400000;
      const recentDaily = daysSinceLastUse > 0 && daysSinceLastUse < 7 ? (k.usageCount || 0) / Math.max(1, age - daysSinceLastUse + 1) : averageDaily;

      const std = Math.max(1, Math.sqrt(averageDaily));
      const zScore = std > 0 ? (recentDaily - averageDaily) / std : 0;

      anomalies.push({
        keyId: k.id,
        name: k.name,
        averageDaily: Math.round(averageDaily * 100) / 100,
        recentDaily: Math.round(recentDaily * 100) / 100,
        zScore: Math.round(zScore * 100) / 100,
        flagged: Math.abs(zScore) > 2.5,
        severity: Math.abs(zScore) > 3.5 ? "high" : Math.abs(zScore) > 2.5 ? "medium" : "low",
      });
    }

    return anomalies;
  }

  // ─── Permission Conflict Detection ──────────────────────────────────

  detectPermissionConflicts(tenantId: string): { conflicts: { scope1: string; scope2: string; description: string }[]; keysAtRisk: string[] } {
    const mem = DataStore["mem"]();
    const keys = mem.find("api_keys", (k: any) => k.tenantId === tenantId && k.active) as ApiKey[];

    const conflicts: { scope1: string; scope2: string; description: string }[] = [
      { scope1: "campaigns:write", scope2: "campaigns:read", description: "Write implies read. Redundant to grant both — write suffices." },
      { scope1: "admin", scope2: "campaigns:read", description: "Admin already includes all read/write scopes. Individual scope is unnecessary." },
      { scope1: "admin", scope2: "creatives:read", description: "Admin already includes all read/write scopes. Individual scope is unnecessary." },
      { scope1: "admin", scope2: "analytics:read", description: "Admin already includes all read/write scopes. Individual scope is unnecessary." },
    ];

    const keysAtRisk: string[] = [];
    for (const k of keys) {
      for (const c of conflicts) {
        if (k.scopes.includes(c.scope1) && k.scopes.includes(c.scope2)) {
          if (!keysAtRisk.includes(k.name)) keysAtRisk.push(k.name);
        }
      }
    }

    return { conflicts, keysAtRisk };
  }

  // ─── Rate Limit Forecasting ─────────────────────────────────────────

  forecastRateLimitHit(tenantId: string): { keyId: string; name: string; dailyAverage: number; projectedDaily: number; estimatedDaysToLimit: number; withinLimit: boolean }[] {
    const mem = DataStore["mem"]();
    const keys = mem.find("api_keys", (k: any) => k.tenantId === tenantId && k.active) as ApiKey[];
    const rateLimitPerKey = 10000;

    return keys.map((k) => {
      const age = Math.max(1, (Date.now() - new Date(k.createdAt).getTime()) / 86400000);
      const usagePerDay = (k.usageCount || 0) / age;

      // Project growth: assume 10% monthly growth
      const projectedDaily = usagePerDay * 1.0033;
      const estimatedDaysToLimit = projectedDaily > 0 ? (rateLimitPerKey - projectedDaily) / (projectedDaily - usagePerDay) : Infinity;
      const withinLimit = projectedDaily < rateLimitPerKey || estimatedDaysToLimit > 30;

      return {
        keyId: k.id, name: k.name,
        dailyAverage: Math.round(usagePerDay * 100) / 100,
        projectedDaily: Math.round(projectedDaily * 100) / 100,
        estimatedDaysToLimit: isFinite(estimatedDaysToLimit) ? Math.round(estimatedDaysToLimit) : -1,
        withinLimit,
      };
    });
  }
}

export const developerPortalService = new DeveloperPortalService();
