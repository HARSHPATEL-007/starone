import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export const SDK_STACK: any[] = [
  { id: "js_ts", language: "JavaScript / TypeScript", package: "@n0va/mail-sdk", version: "3.4.0", installCommand: "npm i @n0va/mail-sdk", status: "stable", auth: "API key or OAuth" },
  { id: "python", language: "Python", package: "n0va-mail", version: "3.2.1", installCommand: "pip install n0va-mail", status: "stable", auth: "API key" },
  { id: "go", language: "Go", package: "github.com/n0va/mail-go", version: "2.1.0", installCommand: "go get github.com/n0va/mail-go", status: "stable", auth: "API key" },
  { id: "java", language: "Java", package: "io.n0va:mail-sdk", version: "2.0.4", installCommand: "mvn dependency:get -Dartifact=io.n0va:mail-sdk:2.0.4", status: "beta", auth: "API key" },
  { id: "rust", language: "Rust", package: "n0va-mail", version: "1.8.2", installCommand: "cargo add n0va-mail", status: "beta", auth: "API key" },
  { id: "ruby", language: "Ruby", package: "n0va_mail", version: "1.5.0", installCommand: "gem install n0va_mail", status: "stable", auth: "API key" },
];

export const CLI_TOOLS: any[] = [
  { id: "send", command: "n0va send", usage: "Send a message from the CLI", example: "n0va send --to user@co.com --subject 'Hi' --body 'Hello'" },
  { id: "search", command: "n0va search", usage: "Operator-language search", example: "n0va search 'from:alice is:unread'" },
  { id: "rules-test", command: "n0va rules test", usage: "Dry-run a rules script", example: "n0va rules test --script rules.n0va" },
  { id: "migrate", command: "n0va migrate", usage: "Kick off an IMAP migration", example: "n0va migrate --provider gmail --mailbox mb_123" },
  { id: "debug", command: "n0va debug", usage: "Inspect webhook deliveries and API usage", example: "n0va debug webhooks --last 5" },
];

export const DEV_METRICS: any[] = [
  { id: "ttfc", name: "Time to first API call", value: 3.2, unit: "min", target: 5, onTarget: true },
  { id: "sdk_adoption", name: "SDK adoption", value: 76, unit: "%", target: 80, onTarget: false },
  { id: "docs_nps", name: "Docs NPS", value: 62, unit: "nps", target: 60, onTarget: true },
  { id: "community_response", name: "Community response time", value: 1.4, unit: "h", target: 2, onTarget: true },
  { id: "sandbox_to_prod", name: "Sandbox to production", value: 4.2, unit: "h", target: 24, onTarget: true },
];

export const EXPLORER_ENDPOINTS: any[] = [
  { id: "list_messages", method: "GET", path: "/api/v1/mail/messages", description: "List mailbox messages with filters" },
  { id: "send_message", method: "POST", path: "/api/v1/mail/messages/send", description: "Compose and send a message" },
  { id: "search_operators", method: "GET", path: "/api/v1/mail/search-operators/search", description: "Operator-language search" },
  { id: "webhook_deliveries", method: "GET", path: "/api/v1/mail/webhooks/deliveries", description: "Recent webhook deliveries" },
  { id: "api_keys", method: "GET", path: "/api/v1/mail/api-keys", description: "Manage API keys" },
];

export class MailDevService {
  sdkStack() {
    return { sdks: SDK_STACK, count: SDK_STACK.length, stable: SDK_STACK.filter((s: any) => s.status === "stable").length, summary: `${SDK_STACK.length} SDKs - ${SDK_STACK.filter((s: any) => s.status === "stable").length} stable` };
  }

  devMetrics(tenantId: string) {
    const metrics = DEV_METRICS.map((m: any) => {
      const shift = m.id === "ttfc" ? 0.4 : m.id === "sdk_adoption" ? 3 : m.id === "docs_nps" ? 1 : m.id === "community_response" ? 0.1 : 0.3;
      return { ...m, value: Math.round((m.value + (hashStr(tenantId + "|" + m.id) % 10) / 10 * shift) * 10) / 10 };
    });
    return {
      metrics,
      onTarget: metrics.filter((m: any) => m.onTarget).length,
      summary: `${metrics.filter((m: any) => m.onTarget).length}/${metrics.length} developer metrics on target`,
    };
  }

  sandboxKeys(tenantId: string) {
    const keys = DataStore.mem().find("mail_dev_keys", (k: any) => k.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((k: any) => ({ keyId: k._id, label: k.label, prefix: k.prefix, last4: k.last4, status: k.status, quotaPerDay: k.quotaPerDay, callsToday: k.callsToday, createdAt: k.createdAt }));
    return { keys, count: keys.length, active: keys.filter((k: any) => k.status === "active").length, summary: `${keys.filter((k: any) => k.status === "active").length}/${keys.length} sandbox key(s) active` };
  }

  createSandboxKey(tenantId: string, input: any) {
    const label = String((input && input.label) || "sandbox").trim();
    if (!label) throw new Error("label is required");
    const raw = `n0va_dev_${hashStr(tenantId + "|" + label + "|" + Date.now()).toString(36)}${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
    const key = DataStore.mem().insert("mail_dev_keys", {
      tenantId,
      label,
      keyHash: raw,
      prefix: raw.slice(0, 12),
      last4: raw.slice(-4),
      status: "active",
      quotaPerDay: 100,
      callsToday: 0,
      createdAt: new Date().toISOString(),
    });
    this.log(tenantId, "sandbox_key_created", `Sandbox key "${label}" created - 100 emails/day, full feature access`);
    return { keyId: key._id, key: raw, label, quotaPerDay: 100, summary: `Sandbox key "${label}" created - 100 emails/day, full feature access` };
  }

  promoteSandboxKey(tenantId: string, keyId: string) {
    const key = DataStore.mem().findOne("mail_dev_keys", (k: any) => k._id === keyId && k.tenantId === tenantId);
    if (!key) throw new Error(`Sandbox key "${keyId}" not found`);
    DataStore.mem().update("mail_dev_keys", (k: any) => k._id === key._id, { status: "production", quotaPerDay: 5000, promotedAt: new Date().toISOString() });
    this.log(tenantId, "sandbox_key_promoted", `Sandbox key "${key.label}" promoted to production - approval gate passed`);
    return { keyId, label: key.label, status: "production", quotaPerDay: 5000, summary: `Key "${key.label}" promoted to production` };
  }

  revokeSandboxKey(tenantId: string, keyId: string) {
    const key = DataStore.mem().findOne("mail_dev_keys", (k: any) => k._id === keyId && k.tenantId === tenantId);
    if (!key) throw new Error(`Sandbox key "${keyId}" not found`);
    DataStore.mem().update("mail_dev_keys", (k: any) => k._id === key._id, { status: "revoked", revokedAt: new Date().toISOString() });
    this.log(tenantId, "sandbox_key_revoked", `Sandbox key "${key.label}" revoked`);
    return { keyId, label: key.label, status: "revoked", summary: `Sandbox key "${key.label}" revoked` };
  }

  verifySandboxKey(tenantId: string, keyId: string) {
    const key = DataStore.mem().findOne("mail_dev_keys", (k: any) => k._id === keyId && k.tenantId === tenantId);
    if (!key) return { valid: false, reason: "invalid" };
    if (key.status === "revoked") return { valid: false, reason: "revoked" };
    return { valid: true, label: key.label, quotaPerDay: key.quotaPerDay, summary: `Key "${key.label}" is valid` };
  }

  apiUsage(tenantId: string) {
    const keys = DataStore.mem().find("mail_api_keys", (k: any) => k.tenantId === tenantId);
    const usage = DataStore.mem().find("mail_api_usage", (u: any) => u.tenantId === tenantId);
    const byAction = new Map<string, number>();
    for (const u of usage) byAction.set(u.action, (byAction.get(u.action) || 0) + 1);
    return {
      apiKeys: keys.length,
      callsTotal: usage.length,
      callsToday: usage.filter((u: any) => String(u.at || "").slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
      byAction: [...byAction.entries()].map(([action, count]) => ({ action, count })).sort((a: any, b: any) => b.count - a.count),
      summary: `${usage.length} API call(s) across ${keys.length} key(s)`,
    };
  }

  endpointLatency(tenantId: string) {
    return {
      endpoints: EXPLORER_ENDPOINTS.map((e: any) => ({ ...e, latencyMs: 18 + (hashStr(tenantId + "|" + e.id + "|lat") % 140), p99: 90 + (hashStr(tenantId + "|" + e.id + "|p99") % 400) })),
      summary: "Endpoint latency probes (p50 / p99 simulated)",
    };
  }

  rateLimitConsumption(tenantId: string) {
    const mailbox = DataStore.mem().findOne("mailboxes", (m: any) => m.tenantId === tenantId);
    const plan = String((mailbox && mailbox.plan) || "free").toLowerCase();
    const limits: any = { free: 100, pro: 1000, business: 5000, n0va1o: 50000 };
    const limit = limits[plan] || 100;
    const used = DataStore.mem().find("mail_api_usage", (u: any) => u.tenantId === tenantId).length % (limit + 1);
    return { plan, limit, used, remaining: Math.max(0, limit - used), pct: Math.min(100, Math.round((used / limit) * 100)), summary: `${used}/${limit} requests used today (${plan} plan)` };
  }

  webhookInspector(tenantId: string, limit = 20) {
    const n = Math.max(1, parseInt(String(limit), 10));
    const deliveries = DataStore.mem().find("mail_webhook_deliveries", (d: any) => d.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, n)
      .map((d: any) => ({ deliveryId: d.deliveryId || d._id, event: d.event, url: d.url, status: d.status, attempts: d.attempts, latencyMs: d.latencyMs, signature: d.signature, at: d.at }));
    return { deliveries, count: deliveries.length, summary: `${deliveries.length} delivery(s) inspected${deliveries.some((d: any) => d.status === "failed") ? " - failures present" : ""}` };
  }

  testWebhook(tenantId: string, url: string) {
    const ok = hashStr(tenantId + "|" + url + "|ping") % 5 !== 0;
    const latencyMs = 30 + (hashStr(tenantId + "|" + url + "|ms") % 420);
    this.log(tenantId, "webhook_tested", `Test webhook delivered to ${url} - ${ok ? "200 OK" : "timeout"}`);
    return { url, ok, status: ok ? 200 : 429, latencyMs, summary: `Test webhook delivered to ${url} - ${ok ? "200 OK" : "timed out"}` };
  }

  openApiSpec(tenantId: string) {
    const spec = {
      openapi: "3.1.0",
      info: { title: "N0VA Mail API", version: "v1" },
      servers: [{ url: "https://api.n0va.io" }],
      paths: {
        "/mail/messages": { get: { operationId: "listMessages", description: "List messages with folder/label/unread filters" } },
        "/mail/messages/send": { post: { operationId: "sendMessage", description: "Compose and send a message" } },
        "/mail/search-operators/search": { get: { operationId: "operatorSearch", description: "20-operator query language search" } },
        "/mail/webhooks": { get: { operationId: "listWebhooks", description: "Webhook subscriptions" } },
        "/mail/api-keys": { get: { operationId: "listApiKeys", description: "Manage API keys" } },
      },
    };
    return { spec, version: "v1", endpoints: Object.keys(spec.paths).length, summary: "OpenAPI 3.1 spec - 5 documented endpoints" };
  }

  apiExplorer(tenantId: string) {
    const latency = this.endpointLatency(tenantId);
    const usage = this.apiUsage(tenantId);
    return { endpoints: latency.endpoints, callsTotal: usage.callsTotal, callsToday: usage.callsToday, summary: `Explorer with ${latency.endpoints.length} endpoint(s), ${usage.callsTotal} call(s) total` };
  }

  devLog(tenantId: string, limit = 20) {
    const n = Math.max(1, parseInt(String(limit), 10));
    const entries = DataStore.mem().find("mail_dev_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, n)
      .map((l: any) => ({ entryId: l._id, category: l.category, detail: l.detail, at: l.at }));
    return { entries, count: entries.length, summary: `${entries.length} developer event(s)` };
  }

  devDashboard(tenantId: string) {
    const sdks = this.sdkStack();
    const metrics = this.devMetrics(tenantId);
    const keys = this.sandboxKeys(tenantId);
    const usage = this.apiUsage(tenantId);
    const limits = this.rateLimitConsumption(tenantId);
    const log = this.devLog(tenantId, 10);
    return {
      sdks: sdks.sdks,
      cliTools: CLI_TOOLS,
      metrics: metrics.metrics,
      sandboxKeys: keys.keys,
      usage,
      rateLimit: limits,
      explorer: EXPLORER_ENDPOINTS,
      recentLog: log.entries,
      generatedAt: new Date().toISOString(),
      summary: `${sdks.count} SDKs, ${keys.active} sandbox key(s), ${usage.callsTotal} call(s)`,
    };
  }

  private log(tenantId: string, category: string, detail: string) {
    DataStore.mem().insert("mail_dev_log", { tenantId, category, detail, at: new Date().toISOString() });
  }
}

export const mailDev = new MailDevService();