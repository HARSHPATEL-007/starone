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
}

export class DeveloperPortalService {
  generateKey(tenantId: string, name: string, scopes: string[], expiresInDays?: number): ApiKey {
    const mem = DataStore["mem"]();
    const rawKey = crypto.randomBytes(32).toString("hex");
    const prefix = rawKey.substring(0, 8);
    const key = `n0va_${prefix}_${rawKey}`;
    const apiKey: ApiKey = {
      id: `apikey_${Date.now()}`,
      tenantId,
      name,
      key,
      prefix,
      scopes,
      lastUsed: null,
      expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86400000).toISOString() : null,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mem.insert("api_keys", apiKey);
    return apiKey;
  }

  listKeys(tenantId: string): Omit<ApiKey, "key">[] {
    const mem = DataStore["mem"]();
    return mem.find("api_keys", (k: any) => k.tenantId === tenantId)
      .map((k: ApiKey) => {
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
    const mem = DataStore["mem"]();
    return mem.delete("api_keys", (k: any) => k.tenantId === tenantId && k.id === id);
  }

  validateKey(key: string): { valid: boolean; tenantId?: string } {
    const mem = DataStore["mem"]();
    const apiKey = mem.findOne("api_keys", (k: any) => k.key === key && k.active === true);
    if (!apiKey) return { valid: false };
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) return { valid: false };
    mem.update("api_keys", (k: any) => k.id === apiKey.id, { lastUsed: new Date().toISOString() });
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
}

export const developerPortalService = new DeveloperPortalService();
