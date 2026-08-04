import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export const API_KEY_SCOPES = [
  { id: "send", label: "Send mail" },
  { id: "read", label: "Read messages" },
  { id: "webhook", label: "Manage webhooks" },
  { id: "campaigns", label: "Manage campaigns" },
];

function random32(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < 32; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export class MailApiKeyService {
  createApiKey(tenantId: string, input: any) {
    if (!input || !input.label) throw new Error("Key label is required");
    const scopes = input.scopes && Array.isArray(input.scopes) && input.scopes.length > 0
      ? input.scopes.filter((s: string) => API_KEY_SCOPES.some((x) => x.id === s))
      : ["send"];
    if (scopes.length === 0) throw new Error(`Scopes must include at least one of ${API_KEY_SCOPES.map((s) => s.id).join("/")}`);
    const key = `n0va_mk_${random32()}`;
    const row = DataStore.mem().insert("mail_api_keys", {
      tenantId,
      label: input.label,
      scopes,
      keyHash: hashStr(key),
      last4: key.slice(-4),
      prefix: key.slice(0, 10),
      status: "active",
      callsToday: 0,
      callsTotal: 0,
      lastUsedAt: null,
      createdAt: new Date().toISOString(),
    });
    return { apiKeyId: row._id, key, label: row.label, scopes, summary: `API key "${input.label}" created — copy it now, it won't be shown again` };
  }

  listApiKeys(tenantId: string) {
    const list = DataStore.mem().find("mail_api_keys", (k: any) => k.tenantId === tenantId)
      .sort((a: any, b: any) => (a.createdAt < b.createdAt ? 1 : -1));
    return { keys: list.map((k: any) => ({ apiKeyId: k._id, label: k.label, scopes: k.scopes, prefix: k.prefix, last4: k.last4, status: k.status, callsToday: k.callsToday, callsTotal: k.callsTotal, lastUsedAt: k.lastUsedAt, createdAt: k.createdAt })), total: list.length };
  }

  getApiKey(tenantId: string, apiKeyId: string) {
    const k = DataStore.mem().findOne("mail_api_keys", (x: any) => x._id === apiKeyId && x.tenantId === tenantId);
    if (!k) throw new Error(`API key "${apiKeyId}" not found`);
    return { apiKeyId: k._id, label: k.label, scopes: k.scopes, prefix: k.prefix, last4: k.last4, status: k.status, callsToday: k.callsToday, callsTotal: k.callsTotal, lastUsedAt: k.lastUsedAt, createdAt: k.createdAt };
  }

  revokeApiKey(tenantId: string, apiKeyId: string) {
    const k = this.getApiKey(tenantId, apiKeyId);
    DataStore.mem().update("mail_api_keys", (x: any) => x._id === apiKeyId && x.tenantId === tenantId, { status: "revoked", revokedAt: new Date().toISOString() });
    return { apiKeyId, status: "revoked", summary: `API key "${k.label}" revoked` };
  }

  verifyApiKey(tenantId: string, key: string) {
    if (!key) throw new Error("API key is required");
    const k = DataStore.mem().findOne("mail_api_keys", (x: any) => x.tenantId === tenantId && x.keyHash === hashStr(key));
    if (!k) return { valid: false, reason: "invalid" };
    if (k.status !== "active") return { valid: false, reason: "revoked" };
    return { valid: true, apiKeyId: k._id, scopes: k.scopes };
  }

  recordUsage(tenantId: string, apiKeyId: string, action: string) {
    const k = this.getApiKey(tenantId, apiKeyId);
    DataStore.mem().insert("mail_api_usage", { tenantId, apiKeyId, label: k.label, action, at: new Date().toISOString() });
    DataStore.mem().update("mail_api_keys", (x: any) => x._id === apiKeyId && x.tenantId === tenantId, {
      callsToday: k.callsToday + 1,
      callsTotal: k.callsTotal + 1,
      lastUsedAt: new Date().toISOString(),
    });
    return { recorded: true, action, summary: `${action} recorded for "${k.label}"` };
  }

  apiKeyUsage(tenantId: string, apiKeyId: string) {
    const k = this.getApiKey(tenantId, apiKeyId);
    const usage = DataStore.mem().find("mail_api_usage", (u: any) => u.tenantId === tenantId && u.apiKeyId === apiKeyId)
      .sort((a: any, b: any) => (a.at < b.at ? 1 : -1));
    const byAction: Record<string, number> = {};
    for (const u of usage) byAction[u.action] = (byAction[u.action] || 0) + 1;
    return { apiKeyId, label: k.label, status: k.status, callsToday: k.callsToday, callsTotal: k.callsTotal, byAction, recent: usage.slice(0, 10).map((u: any) => ({ usageId: u._id, ...u })) };
  }

  apiKeyDashboard(tenantId: string) {
    const keys = this.listApiKeys(tenantId);
    const usage = DataStore.mem().find("mail_api_usage", (u: any) => u.tenantId === tenantId);
    const callsToday = keys.keys.reduce((s: number, k: any) => s + (k.callsToday || 0), 0);
    const callsTotal = keys.keys.reduce((s: number, k: any) => s + (k.callsTotal || 0), 0);
    const byAction: Record<string, number> = {};
    for (const u of usage) byAction[u.action] = (byAction[u.action] || 0) + 1;
    return {
      keys: keys.total,
      active: keys.keys.filter((k: any) => k.status === "active").length,
      callsToday,
      callsTotal,
      byAction,
      lastUsed: usage.sort((a: any, b: any) => (a.at < b.at ? 1 : -1))[0] || null,
      summary: `${keys.total} key(s), ${callsToday} call(s) today, ${callsTotal} total`,
    };
  }
}

export const mailApiKey = new MailApiKeyService();
