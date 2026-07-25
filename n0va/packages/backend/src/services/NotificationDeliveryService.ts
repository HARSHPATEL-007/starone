interface DeliveryRecord {
  id: string;
  notificationId: string;
  channel: "email" | "slack" | "sms" | "webhook" | "in_app";
  recipient: string;
  status: "pending" | "delivered" | "failed" | "retrying";
  attempts: number;
  maxAttempts: number;
  sentAt?: string;
  failedAt?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

interface DeliveryRequest {
  notificationId: string;
  title: string;
  message: string;
  channels: { channel: "email" | "slack" | "sms" | "webhook" | "in_app"; recipient: string }[];
  metadata?: Record<string, any>;
}

export class NotificationDeliveryService {
  private deliveries: Map<string, DeliveryRecord> = new Map();
  private channels = ["email", "slack", "sms", "webhook", "in_app"];

  async send(request: DeliveryRequest): Promise<DeliveryRecord[]> {
    const records: DeliveryRecord[] = [];
    for (const ch of request.channels) {
      const record = this.createRecord(request.notificationId, ch.channel, ch.recipient);
      const result = await this.deliver(record);
      records.push(result);
    }
    return records;
  }

  async retry(deliveryId: string): Promise<DeliveryRecord | null> {
    const record = this.deliveries.get(deliveryId);
    if (!record) return null;
    if (record.attempts >= record.maxAttempts) return null;
    return this.deliver({ ...record, status: "retrying" });
  }

  getDelivery(id: string): DeliveryRecord | undefined {
    return this.deliveries.get(id);
  }

  listDeliveries(filter?: { channel?: string; status?: string; limit?: number }): DeliveryRecord[] {
    let all = [...this.deliveries.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (filter?.channel) all = all.filter((d) => d.channel === filter.channel);
    if (filter?.status) all = all.filter((d) => d.status === filter.status);
    if (filter?.limit) all = all.slice(0, filter.limit);
    return all;
  }

  getStats(): { total: number; byChannel: Record<string, number>; byStatus: Record<string, number>; successRate: number } {
    const all = [...this.deliveries.values()];
    const byChannel: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    all.forEach((d) => {
      byChannel[d.channel] = (byChannel[d.channel] || 0) + 1;
      byStatus[d.status] = (byStatus[d.status] || 0) + 1;
    });
    const delivered = byStatus.delivered || 0;
    return { total: all.length, byChannel, byStatus, successRate: all.length > 0 ? (delivered / all.length) * 100 : 0 };
  }

  private createRecord(notificationId: string, channel: string, recipient: string): DeliveryRecord {
    return {
      id: `del_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      notificationId,
      channel: channel as DeliveryRecord["channel"],
      recipient,
      status: "pending",
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private async deliver(record: DeliveryRecord): Promise<DeliveryRecord> {
    record.attempts++;
    record.updatedAt = new Date().toISOString();

    const success = Math.random() > 0.15;
    await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));

    if (success) {
      record.status = "delivered";
      record.sentAt = new Date().toISOString();
    } else {
      if (record.attempts >= record.maxAttempts) {
        record.status = "failed";
        record.failedAt = new Date().toISOString();
        record.error = `Delivery failed after ${record.attempts} attempts (${record.channel})`;
      } else {
        record.status = "retrying";
      }
    }

    this.deliveries.set(record.id, record);
    return { ...record };
  }
}

export const notificationDelivery = new NotificationDeliveryService();
