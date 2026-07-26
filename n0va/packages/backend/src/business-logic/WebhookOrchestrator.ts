import { webhookService } from "../services/WebhookService";
import { decisionEngine } from "./DecisionEngine";

export interface WebhookReliabilityScore {
  webhookId: string;
  webhookName: string;
  url: string;
  eventCount: number;
  successRate: number;
  avgAttempts: number;
  reliabilityScore: number;
  band: string;
}

export interface DeliveryHealth {
  totalDeliveries: number;
  totalDelivered: number;
  totalFailed: number;
  totalRetrying: number;
  deliverySuccessRate: number;
  avgAttemptsPerDelivery: number;
}

export interface EventVolumeAnalysis {
  eventType: string;
  deliveryCount: number;
  successRate: number;
  volume: number;
}

export interface WebhookDashboard {
  reliabilityScores: WebhookReliabilityScore[];
  deliveryHealth: DeliveryHealth;
  eventVolumes: EventVolumeAnalysis[];
  failurePatterns: { pattern: string; count: number; topWebhookIds: string[] }[];
  overallHealthScore: number;
  healthBand: string;
  recommendations: string[];
}

export class WebhookOrchestrator {
  getDashboard(tenantId: string): WebhookDashboard {
    const webhooks = webhookService.listWebhooks(tenantId);

    const reliabilityScores: WebhookReliabilityScore[] = webhooks.map(w => {
      const deliveries = webhookService.getDeliveries(w.id);
      const eventCount = deliveries.length;
      const deliveredCount = deliveries.filter(d => d.status === "delivered").length;
      const successRate = eventCount > 0 ? Math.round((deliveredCount / eventCount) * 10000) / 100 : 0;
      const avgAttempts = eventCount > 0 ? Math.round(deliveries.reduce((s, d) => s + d.attempts, 0) / eventCount * 100) / 100 : 0;
      const reliabilityScore = Math.min(100, Math.round(successRate * 0.6 + (avgAttempts <= 1 ? 25 : avgAttempts <= 2 ? 15 : 5) + (w.enabled ? 15 : 0)));
      return {
        webhookId: w.id, webhookName: w.name, url: w.url,
        eventCount, successRate, avgAttempts, reliabilityScore,
        band: decisionEngine.label(decisionEngine.band(reliabilityScore)),
      };
    });

    const allDeliveries = webhooks.flatMap(w => webhookService.getDeliveries(w.id));
    const totalDelivered = allDeliveries.filter(d => d.status === "delivered").length;
    const totalFailed = allDeliveries.filter(d => d.status === "failed").length;
    const totalRetrying = allDeliveries.filter(d => d.status === "retrying").length;
    const deliverySuccessRate = allDeliveries.length > 0 ? Math.round((totalDelivered / allDeliveries.length) * 10000) / 100 : 0;
    const avgAttemptsPerDelivery = allDeliveries.length > 0 ? Math.round(allDeliveries.reduce((s, d) => s + d.attempts, 0) / allDeliveries.length * 100) / 100 : 0;

    const eventVolMap = new Map<string, { delivered: number; total: number }>();
    for (const d of allDeliveries) {
      const wh = webhooks.find(w => w.id === d.webhookId);
      const evType = wh?.events?.[0] || "unknown";
      if (!eventVolMap.has(evType)) eventVolMap.set(evType, { delivered: 0, total: 0 });
      const entry = eventVolMap.get(evType)!;
      entry.total++;
      if (d.status === "delivered") entry.delivered++;
    }
    const eventVolumes: EventVolumeAnalysis[] = Array.from(eventVolMap.entries()).map(([eventType, data]) => ({
      eventType,
      deliveryCount: data.total,
      successRate: data.total > 0 ? Math.round((data.delivered / data.total) * 10000) / 100 : 0,
      volume: data.total,
    })).sort((a, b) => b.volume - a.volume);

    const failurePatterns = this.detectFailurePatterns(allDeliveries, webhooks);
    const overallHealthScore = reliabilityScores.length > 0
      ? Math.round(reliabilityScores.reduce((s, r) => s + r.reliabilityScore, 0) / reliabilityScores.length)
      : 0;

    const recommendations: string[] = [];
    const failingHooks = reliabilityScores.filter(r => r.reliabilityScore < 50);
    if (failingHooks.length > 0) recommendations.push(`${failingHooks.length} webhook(s) have low reliability. Check endpoint availability and authentication.`);
    if (totalRetrying > 0) recommendations.push(`${totalRetrying} deliveries currently retrying. Network issues may be affecting delivery.`);
    if (failurePatterns.length > 0) recommendations.push(`Pattern detected: "${failurePatterns[0].pattern}" affecting ${failurePatterns[0].count} delivery(s).`);

    return {
      reliabilityScores, deliveryHealth: { totalDeliveries: allDeliveries.length, totalDelivered, totalFailed, totalRetrying, deliverySuccessRate, avgAttemptsPerDelivery },
      eventVolumes, failurePatterns, overallHealthScore,
      healthBand: decisionEngine.label(decisionEngine.band(overallHealthScore)),
      recommendations,
    };
  }

  private detectFailurePatterns(deliveries: any[], webhooks: any[]): { pattern: string; count: number; topWebhookIds: string[] }[] {
    const patterns: { pattern: string; count: number; webhooks: Set<string> }[] = [];
    const timeoutDels = deliveries.filter(d => d.error?.includes("timeout") || d.error?.includes("abort"));
    if (timeoutDels.length >= 2) patterns.push({ pattern: "timeout", count: timeoutDels.length, webhooks: new Set(timeoutDels.map((d: any) => d.webhookId)) });
    const authDels = deliveries.filter(d => d.statusCode === 401 || d.statusCode === 403);
    if (authDels.length >= 2) patterns.push({ pattern: "authentication_failure", count: authDels.length, webhooks: new Set(authDels.map((d: any) => d.webhookId)) });
    const serverErrDels = deliveries.filter(d => d.statusCode && d.statusCode >= 500);
    if (serverErrDels.length >= 2) patterns.push({ pattern: "server_error", count: serverErrDels.length, webhooks: new Set(serverErrDels.map((d: any) => d.webhookId)) });
    return patterns.map(p => ({ pattern: p.pattern, count: p.count, topWebhookIds: Array.from(p.webhooks).slice(0, 3) }));
  }
}

export const webhookOrchestrator = new WebhookOrchestrator();
