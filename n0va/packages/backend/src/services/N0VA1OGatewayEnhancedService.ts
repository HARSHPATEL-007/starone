import { MemoryStore } from "./MemoryStore";
import crypto from "crypto";

export interface JITAuthSession {
  sessionId: string;
  tenantId: string;
  platform: string;
  scopes: string[];
  provisionedAt: string;
  expiresAt: string;
  status: "active" | "expired" | "revoked";
}

export interface SandboxExecution {
  sandboxId: string;
  script: string;
  runtime: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: string;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

export interface IntentRoute {
  intent: string;
  platforms: string[];
  actions: string[];
  priority: number;
}

export interface WebhookListener {
  id: string;
  tenantId: string;
  source: string;
  eventType: string;
  callbackUrl: string;
  secret: string;
  status: "active" | "paused";
  lastTriggered?: string;
}

const PLATFORM_INTENTS: Record<string, string[]> = {
  meta_ads: ["campaign_create", "audience_sync", "creative_upload", "bid_adjust", "performance_read"],
  google_ads: ["campaign_create", "keyword_extract", "bid_adjust", "performance_read", "budget_update"],
  linkedin_ads: ["campaign_create", "audience_sync", "lead_gen", "performance_read"],
  tiktok_ads: ["campaign_create", "creative_upload", "audience_sync", "performance_read"],
};

export class N0VA1OGatewayEnhancedService {
  private jitSessions: JITAuthSession[] = [];
  private sandboxExecutions: SandboxExecution[] = [];
  private webhookListeners: WebhookListener[] = [];
  private sandboxCounter = 0;

  private mem(): MemoryStore { return MemoryStore.getInstance(); }

  // ─── JIT Auth ────────────────────────────────────────────────────────

  provisionJITAuth(tenantId: string, platform: string, requestedScopes: string[]): JITAuthSession {
    const sessionId = `jit_${crypto.randomBytes(8).toString("hex")}`;
    const scopes = this.pruneScopes(platform, requestedScopes);
    const session: JITAuthSession = {
      sessionId, tenantId, platform, scopes,
      provisionedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      status: "active",
    };
    this.jitSessions.push(session);
    this.mem().insert("jit_auth_sessions", { ...session, tenantId });
    return session;
  }

  validateJITSession(sessionId: string): JITAuthSession | null {
    const session = this.jitSessions.find((s) => s.sessionId === sessionId);
    if (!session || session.status !== "active") return null;
    if (new Date(session.expiresAt) < new Date()) {
      session.status = "expired";
      return null;
    }
    return session;
  }

  revokeJITSession(sessionId: string): boolean {
    const session = this.jitSessions.find((s) => s.sessionId === sessionId);
    if (!session) return false;
    session.status = "revoked";
    return true;
  }

  getActiveSessions(tenantId: string): JITAuthSession[] {
    return this.jitSessions.filter((s) => s.tenantId === tenantId && s.status === "active");
  }

  private pruneScopes(platform: string, requested: string[]): string[] {
    const allowed = PLATFORM_INTENTS[platform] || [];
    return requested.filter((r) => allowed.some((a) => r.startsWith(a.split("_")[0])));
  }

  // ─── Ephemeral Sandboxes ─────────────────────────────────────────────

  createSandbox(script: string, runtime: string): SandboxExecution {
    const sandboxId = `sbx_${++this.sandboxCounter}`;
    const execution: SandboxExecution = {
      sandboxId, script, runtime,
      status: "running",
      startedAt: new Date().toISOString(),
    };

    try {
      execution.result = this.executeSandboxScript(script, runtime);
      execution.status = "completed";
    } catch (err) {
      execution.error = err instanceof Error ? err.message : String(err);
      execution.status = "failed";
    }
    execution.completedAt = new Date().toISOString();

    this.sandboxExecutions.push(execution);
    return execution;
  }

  getSandbox(sandboxId: string): SandboxExecution | undefined {
    return this.sandboxExecutions.find((s) => s.sandboxId === sandboxId);
  }

  private executeSandboxScript(script: string, runtime: string): string {
    if (script.startsWith("data:")) return `Processed ${Buffer.byteLength(script, "utf-8")} bytes of data`;
    return `Simulated ${runtime} execution completed`;
  }

  // ─── Intent-Driven Routing ───────────────────────────────────────────

  resolveIntent(intent: string, tenantPlatforms: string[]): IntentRoute | null {
    const matched: string[] = [];
    for (const [platform, intents] of Object.entries(PLATFORM_INTENTS)) {
      if (tenantPlatforms.includes(platform) && intents.includes(intent)) {
        matched.push(platform);
      }
    }
    if (matched.length === 0) return null;

    const intentActionMap: Record<string, string[]> = {
      campaign_create: ["create_campaign", "set_budget", "define_audience"],
      audience_sync: ["sync_segment", "create_lookalike"],
      creative_upload: ["upload_creative", "resize_assets"],
      bid_adjust: ["read_performance", "adjust_bid"],
      performance_read: ["read_metrics", "generate_report"],
      keyword_extract: ["extract_keywords", "apply_negative"],
      budget_update: ["read_budget", "update_daily_cap"],
      lead_gen: ["read_leads", "sync_to_crm"],
    };

    return {
      intent,
      platforms: matched,
      actions: intentActionMap[intent] || [intent],
      priority: matched.length > 2 ? 1 : 2,
    };
  }

  getAvailableIntents(platform: string): string[] {
    return PLATFORM_INTENTS[platform] || [];
  }

  // ─── Multi-Account Management ────────────────────────────────────────

  getAccounts(tenantId: string, platform?: string): any[] {
    const accounts = this.mem().find("connected_accounts", (a: any) => a.tenantId === tenantId);
    return platform ? accounts.filter((a: any) => a.platform === platform) : accounts;
  }

  switchAccount(tenantId: string, fromAccountId: string, toAccountId: string): boolean {
    const from = this.mem().findOne("connected_accounts", (a: any) => a._id === fromAccountId && a.tenantId === tenantId);
    const to = this.mem().findOne("connected_accounts", (a: any) => a._id === toAccountId && a.tenantId === tenantId);
    if (!from || !to) return false;
    return true;
  }

  // ─── Bidirectional Triggers / Webhook Listeners ──────────────────────

  registerWebhook(tenantId: string, source: string, eventType: string, callbackUrl: string): WebhookListener {
    const id = `wh_${crypto.randomBytes(6).toString("hex")}`;
    const listener: WebhookListener = {
      id, tenantId, source, eventType, callbackUrl,
      secret: crypto.randomBytes(16).toString("hex"),
      status: "active",
    };
    this.webhookListeners.push(listener);
    this.mem().insert("webhook_listeners", listener);
    return listener;
  }

  unregisterWebhook(id: string): boolean {
    const idx = this.webhookListeners.findIndex((w) => w.id === id);
    if (idx === -1) return false;
    this.webhookListeners[idx].status = "paused";
    return true;
  }

  triggerWebhook(source: string, eventType: string, payload: Record<string, unknown>): WebhookListener[] {
    const matched = this.webhookListeners.filter((w) => w.source === source && w.eventType === eventType && w.status === "active");
    for (const m of matched) {
      m.lastTriggered = new Date().toISOString();
    }
    return matched;
  }

  getWebhooks(tenantId: string): WebhookListener[] {
    return this.webhookListeners.filter((w) => w.tenantId === tenantId);
  }

  // ─── Platform Integration Catalog ────────────────────────────────────

  getIntegrationCatalog(): Record<string, { count: number; examples: string[] }> {
    return {
      social_advertising: { count: 25, examples: ["Meta Ads", "TikTok Ads", "Snapchat Ads", "LinkedIn Ads", "Twitter/X Ads"] },
      search_programmatic: { count: 30, examples: ["Google Ads", "Microsoft Ads", "Amazon Ads", "DV360", "The Trade Desk"] },
      creative_design: { count: 40, examples: ["Canva", "Figma", "Adobe CC", "Cloudinary", "Remove.bg"] },
      analytics_attribution: { count: 50, examples: ["GA4", "Mixpanel", "Segment", "Snowflake", "Triple Whale"] },
      crm_sales: { count: 45, examples: ["Salesforce", "HubSpot", "Pipedrive", "Zoho", "Apollo"] },
      email_marketing: { count: 60, examples: ["Mailchimp", "Klaviyo", "Iterable", "Brevo", "Customer.io"] },
      ecommerce: { count: 35, examples: ["Shopify", "WooCommerce", "BigCommerce", "Magento", "Stripe"] },
      influencer_affiliate: { count: 20, examples: ["AspireIQ", "Grin", "Impact", "Tapfiliate", "PartnerStack"] },
      fraud_brand_safety: { count: 15, examples: ["DoubleVerify", "IAS", "Moat", "HUMAN", "Cheq"] },
      data_enrichment: { count: 40, examples: ["Clearbit", "ZoomInfo", "Apollo", "6sense", "Bombora"] },
    };
  }
}

export const n0va1oGatewayEnhancedService = new N0VA1OGatewayEnhancedService();
