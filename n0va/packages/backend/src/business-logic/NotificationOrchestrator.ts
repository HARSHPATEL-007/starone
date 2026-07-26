import { notificationDelivery } from "../services/NotificationDeliveryService";
import { decisionEngine } from "./DecisionEngine";

export interface ChannelHealthSnapshot {
  channel: string;
  score: number;
  circuitOpen: boolean;
  deliveryCount: number;
  healthBand: string;
}

export interface DeliverySLASummary {
  totalDeliveries: number;
  successRate: number;
  failedCount: number;
  retryingCount: number;
  avgAttempts: number;
}

export interface NotificationDashboard {
  channelHealth: ChannelHealthSnapshot[];
  deliverySLA: DeliverySLASummary;
  worstChannel: string | null;
  bestChannel: string | null;
  channelsAtRisk: string[];
  healthBand: string;
  recommendations: string[];
}

export class NotificationOrchestrator {
  getDeliveryDashboard(): NotificationDashboard {
    const stats = notificationDelivery.getStats();
    const deliveries = notificationDelivery.listDeliveries({ limit: 1000 });

    const channelHealth: ChannelHealthSnapshot[] = Object.entries(stats.channelHealth).map(([channel, health]) => ({
      channel,
      score: health.score,
      circuitOpen: health.circuitOpen,
      deliveryCount: stats.byChannel[channel] || 0,
      healthBand: decisionEngine.label(decisionEngine.band(Math.round(health.score * 100), { excellent: 90, good: 70, fair: 50, poor: 30 })),
    })).sort((a, b) => b.score - a.score);

    const sorted = [...channelHealth].sort((a, b) => a.score - b.score);
    const worstChannel = sorted.length > 0 && sorted[0].deliveryCount > 0 ? sorted[0].channel : null;
    const bestChannel = sorted.length > 0 ? sorted[sorted.length - 1].channel : null;
    const channelsAtRisk = channelHealth.filter(c => c.healthBand === "Critical" || c.healthBand === "Poor" || c.circuitOpen).map(c => c.channel);

    const failedCount = stats.byStatus.failed || 0;
    const retryingCount = stats.byStatus.retrying || 0;
    const totalDeliveries = stats.total;

    const avgAttempts = totalDeliveries > 0
      ? Math.round(deliveries.reduce((s, d) => s + d.attempts, 0) / totalDeliveries * 100) / 100
      : 0;

    const recommendations: string[] = [];
    if (channelsAtRisk.length > 0) recommendations.push(`Channel(s) at risk: ${channelsAtRisk.join(", ")}. Check endpoint connectivity and authentication.`);
    if (stats.successRate < 90) recommendations.push(`Overall delivery success rate is ${stats.successRate}%. Investigate failed deliveries and retry patterns.`);
    if (retryingCount > 0) recommendations.push(`${retryingCount} delivery(s) currently in retry state. Backoff delay may be causing latency.`);
    if (bestChannel) recommendations.push(`Best performing channel: "${bestChannel}" (score ${(stats.channelHealth[bestChannel]?.score || 0).toFixed(2)}).`);
    const circuitOpenChannels = channelHealth.filter(c => c.circuitOpen);
    if (circuitOpenChannels.length > 0) recommendations.push(`Circuit breaker open for: ${circuitOpenChannels.map(c => c.channel).join(", ")}. Auto-reset in progress.`);

    return {
      channelHealth, deliverySLA: { totalDeliveries, successRate: stats.successRate, failedCount, retryingCount, avgAttempts },
      worstChannel, bestChannel, channelsAtRisk,
      healthBand: decisionEngine.label(decisionEngine.band(stats.successRate)),
      recommendations,
    };
  }

  getChannelTrend(channel: string): { scoreTrend: number[]; circuitTripCount: number; avgLatency: number } {
    const deliveries = notificationDelivery.listDeliveries({ channel, limit: 100 });
    const recentDeliveries = deliveries.slice(0, 20);
    const scoreTrend = recentDeliveries.map((d, i) => {
      const base = d.status === "delivered" ? 1 : 0;
      return base * (1 - i * 0.02);
    }).reverse();
    const circuitTripCount = deliveries.filter(d => d.error?.includes("Circuit breaker")).length;
    const successful = deliveries.filter(d => d.status === "delivered");
    const avgLatency = successful.length > 0
      ? Math.round(successful.reduce((s, d) => {
          const sent = d.sentAt ? new Date(d.sentAt).getTime() : 0;
          const created = new Date(d.createdAt).getTime();
          return s + (sent > created ? sent - created : 0);
        }, 0) / successful.length)
      : 0;
    return { scoreTrend, circuitTripCount, avgLatency };
  }
}

export const notificationOrchestrator = new NotificationOrchestrator();
