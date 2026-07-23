import crypto from "crypto";

interface WebhookConfig {
  id: string;
  tenantId: string;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  headers?: Record<string, string>;
  retryCount: number;
  timeout: number;
  enabled: boolean;
  createdAt: Date;
}

interface WebhookEvent {
  id: string;
  type: string;
  tenantId: string;
  source: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventId: string;
  url: string;
  status: "pending" | "delivered" | "failed" | "retrying";
  statusCode?: number;
  responseBody?: string;
  attempts: number;
  maxRetries: number;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

type EventHandler = (event: WebhookEvent) => Promise<void>;

export class WebhookService {
  private webhooks = new Map<string, WebhookConfig>();
  private deliveries = new Map<string, WebhookDelivery[]>();
  private handlers = new Map<string, EventHandler[]>();
  private deliveryQueue: WebhookDelivery[] = [];

  registerWebhook(config: Omit<WebhookConfig, "id" | "createdAt">): WebhookConfig {
    const webhook: WebhookConfig = {
      ...config,
      id: `wh_${crypto.randomBytes(8).toString("hex")}`,
      createdAt: new Date(),
    };
    this.webhooks.set(webhook.id, webhook);
    return webhook;
  }

  on(eventType: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) || [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
  }

  async emit(event: Omit<WebhookEvent, "id" | "timestamp">): Promise<void> {
    const webhookEvent: WebhookEvent = {
      ...event,
      id: `evt_${crypto.randomBytes(12).toString("hex")}`,
      timestamp: new Date(),
    };

    const matchingWebhooks = Array.from(this.webhooks.values()).filter(
      (w) => w.enabled && w.events.includes(event.type)
    );

    for (const webhook of matchingWebhooks) {
      this.queueDelivery(webhook, webhookEvent);
    }

    const eventHandlers = this.handlers.get(event.type) || [];
    await Promise.allSettled(eventHandlers.map((h) => h(webhookEvent)));
  }

  private queueDelivery(webhook: WebhookConfig, event: WebhookEvent): void {
    const delivery: WebhookDelivery = {
      id: `del_${crypto.randomBytes(8).toString("hex")}`,
      webhookId: webhook.id,
      eventId: event.id,
      url: webhook.url,
      status: "pending",
      attempts: 0,
      maxRetries: webhook.retryCount,
      createdAt: new Date(),
    };

    const deliveries = this.deliveries.get(webhook.id) || [];
    deliveries.push(delivery);
    this.deliveries.set(webhook.id, deliveries);
    this.deliveryQueue.push(delivery);

    this.processDelivery(delivery, webhook, event);
  }

  private async processDelivery(
    delivery: WebhookDelivery,
    webhook: WebhookConfig,
    event: WebhookEvent
  ): Promise<void> {
    try {
      const signature = webhook.secret
        ? crypto.createHmac("sha256", webhook.secret).update(JSON.stringify(event.payload)).digest("hex")
        : undefined;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "N0VA1O-Webhook/3.0",
        "X-N0VA-Event": event.type,
        "X-N0VA-Delivery": delivery.id,
        ...(signature ? { "X-N0VA-Signature": signature } : {}),
        ...webhook.headers,
      };

      const response = await fetch(webhook.url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          event: event.type,
          id: event.id,
          timestamp: event.timestamp.toISOString(),
          tenantId: event.tenantId,
          source: event.source,
          payload: event.payload,
        }),
        signal: AbortSignal.timeout(webhook.timeout),
      });

      delivery.statusCode = response.status;
      delivery.responseBody = await response.text();
      delivery.status = response.ok ? "delivered" : "failed";
      delivery.completedAt = new Date();
    } catch (error) {
      delivery.attempts++;
      delivery.error = error instanceof Error ? error.message : "Delivery failed";

      if (delivery.attempts < delivery.maxRetries) {
        delivery.status = "retrying";
        const delay = Math.min(30000, Math.pow(2, delivery.attempts) * 1000);
        setTimeout(() => this.processDelivery(delivery, webhook, event), delay);
      } else {
        delivery.status = "failed";
        delivery.completedAt = new Date();
      }
    }
  }

  getWebhook(id: string): WebhookConfig | undefined {
    return this.webhooks.get(id);
  }

  listWebhooks(tenantId: string): WebhookConfig[] {
    return Array.from(this.webhooks.values()).filter((w) => w.tenantId === tenantId);
  }

  getDeliveries(webhookId: string): WebhookDelivery[] {
    return this.deliveries.get(webhookId) || [];
  }

  deleteWebhook(id: string): boolean {
    return this.webhooks.delete(id);
  }

  registerInternalEvents(): void {
    this.on("campaign.created", async (event) => {
      console.log(`[Webhook] Campaign created: ${event.payload.name}`);
    });
    this.on("campaign.launched", async (event) => {
      console.log(`[Webhook] Campaign launched: ${event.payload.name}`);
    });
    this.on("budget.alert", async (event) => {
      console.log(`[Webhook] Budget alert: ${event.payload.message}`);
    });
    this.on("fraud.detected", async (event) => {
      console.log(`[Webhook] Fraud detected: ${event.payload.description}`);
    });
    this.on("creative.fatigue", async (event) => {
      console.log(`[Webhook] Creative fatigue: ${event.payload.creativeName}`);
    });
    this.on("audience.updated", async (event) => {
      console.log(`[Webhook] Audience updated: ${event.payload.name}`);
    });
  }

  generateSampleConfig(): WebhookConfig {
    return {
      id: "wh_sample",
      tenantId: "tenant_001",
      name: "Sample Webhook",
      url: "https://hooks.example.com/n0va-events",
      events: ["campaign.created", "campaign.launched", "fraud.detected"],
      secret: "whsec_sample_secret",
      retryCount: 3,
      timeout: 10000,
      enabled: true,
      createdAt: new Date(),
    };
  }
}

export const webhookService = new WebhookService();
webhookService.registerInternalEvents();
