interface DeliveryRecord {
  id: string;
  notificationId: string;
  channel: "email" | "slack" | "sms" | "webhook" | "in_app";
  recipient: string;
  status: "pending" | "delivered" | "failed" | "retrying";
  attempts: number;
  maxAttempts: number;
  priority: number;
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
  priority?: number;
  channels: { channel: "email" | "slack" | "sms" | "webhook" | "in_app"; recipient: string }[];
  metadata?: Record<string, any>;
}

export class NotificationDeliveryService {
  private deliveries = new Map<string, DeliveryRecord>();
  private channels = ["email", "slack", "sms", "webhook", "in_app"];

  // ─── Token Bucket Rate Limiter ──────────────────────────────────────
  private tokenBuckets = new Map<string, { tokens: number; lastRefill: number }>();
  private readonly maxTokens = 10;
  private readonly refillRate = 2; // tokens per second

  private acquireToken(channel: string): boolean {
    const now = Date.now() / 1000;
    const key = channel;
    let bucket = this.tokenBuckets.get(key);
    if (!bucket) { bucket = { tokens: this.maxTokens, lastRefill: now }; this.tokenBuckets.set(key, bucket); }
    const elapsed = now - bucket.lastRefill;
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + elapsed * this.refillRate);
    bucket.lastRefill = now;
    if (bucket.tokens < 1) return false;
    bucket.tokens -= 1;
    return true;
  }

  // ─── Circuit Breaker ────────────────────────────────────────────────
  private circuitStates = new Map<string, { failures: number; lastFailure: number; open: boolean }>();
  private readonly failureThreshold = 5;
  private readonly resetTimeout = 30000; // 30 seconds

  private isCircuitOpen(channel: string): boolean {
    const state = this.circuitStates.get(channel);
    if (!state) return false;
    if (!state.open) return false;
    if (Date.now() - state.lastFailure > this.resetTimeout) {
      state.open = false;
      state.failures = 0;
      return false;
    }
    return true;
  }

  private recordFailure(channel: string): void {
    let state = this.circuitStates.get(channel);
    if (!state) { state = { failures: 0, lastFailure: 0, open: false }; this.circuitStates.set(channel, state); }
    state.failures++;
    state.lastFailure = Date.now();
    if (state.failures >= this.failureThreshold) state.open = true;
  }

  private recordSuccess(channel: string): void {
    const state = this.circuitStates.get(channel);
    if (state) { state.failures = Math.max(0, state.failures - 1); if (state.failures === 0) state.open = false; }
  }

  // ─── Exponential Backoff with Full Jitter ───────────────────────────

  private backoffDelay(attempt: number, maxAttempts: number): number {
    if (attempt >= maxAttempts) return 0;
    const base = 1000; // 1 second
    const cap = 30000; // 30 seconds
    const exp = Math.min(cap, base * Math.pow(2, attempt));
    return Math.random() * exp;
  }

  // ─── Smart Channel Routing ──────────────────────────────────────────

  private channelScores = new Map<string, { successes: number; failures: number; totalLatency: number; count: number }>();

  private getChannelScore(channel: string): number {
    const stats = this.channelScores.get(channel);
    if (!stats || stats.count < 5) return 0.5;
    const successRate = stats.successes / Math.max(stats.count, 1);
    const avgLatency = stats.totalLatency / stats.count;
    const latencyScore = avgLatency > 0 ? Math.min(1, 1000 / avgLatency) : 0.5;
    return 0.7 * successRate + 0.3 * latencyScore;
  }

  private recordDelivery(channel: string, latency: number, success: boolean): void {
    let stats = this.channelScores.get(channel);
    if (!stats) { stats = { successes: 0, failures: 0, totalLatency: 0, count: 0 }; this.channelScores.set(channel, stats); }
    stats.count++;
    stats.totalLatency += latency;
    if (success) stats.successes++;
    else stats.failures++;
  }

  // ─── Priority Queue ─────────────────────────────────────────────────

  private priorityQueue: { record: DeliveryRecord; resolve: (r: DeliveryRecord) => void }[] = [];
  private processing = false;

  private enqueue(record: DeliveryRecord): Promise<DeliveryRecord> {
    return new Promise((resolve) => {
      this.priorityQueue.push({ record, resolve });
      this.priorityQueue.sort((a, b) => b.record.priority - a.record.priority);
      if (!this.processing) this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    this.processing = true;
    while (this.priorityQueue.length > 0) {
      const item = this.priorityQueue.shift()!;
      const result = await this.deliver(item.record);
      item.resolve(result);
    }
    this.processing = false;
  }

  // ─── Main Send ──────────────────────────────────────────────────────

  async send(request: DeliveryRequest): Promise<DeliveryRecord[]> {
    const records: DeliveryRecord[] = [];
    const priority = request.priority ?? 5;

    for (const ch of request.channels) {
      // Smart channel routing: skip if score is too low and alternative exists
      const score = this.getChannelScore(ch.channel);
      if (score < 0.2 && this.channelScores.get(ch.channel)?.count && request.channels.length > 1) {
        const altChannel = request.channels.find((c) => c.channel !== ch.channel && this.getChannelScore(c.channel) > 0.3);
        if (altChannel) continue; // skip low-performing channel if alternative available
      }

      // Rate limiting
      if (!this.acquireToken(ch.channel)) {
        const record = this.createRecord(request.notificationId, ch.channel, ch.recipient, priority);
        record.status = "failed";
        record.error = "Rate limit exceeded";
        record.failedAt = new Date().toISOString();
        this.deliveries.set(record.id, record);
        records.push(record);
        continue;
      }

      // Circuit breaker
      if (this.isCircuitOpen(ch.channel)) {
        const record = this.createRecord(request.notificationId, ch.channel, ch.recipient, priority);
        record.status = "failed";
        record.error = `Circuit breaker open for ${ch.channel}`;
        record.failedAt = new Date().toISOString();
        this.deliveries.set(record.id, record);
        records.push(record);
        continue;
      }

      const record = this.createRecord(request.notificationId, ch.channel, ch.recipient, priority);
      const result = await this.enqueue(record);
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
    let all = [...this.deliveries.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (filter?.channel) all = all.filter((d) => d.channel === filter.channel);
    if (filter?.status) all = all.filter((d) => d.status === filter.status);
    if (filter?.limit) all = all.slice(0, filter.limit);
    return all;
  }

  getStats(): { total: number; byChannel: Record<string, number>; byStatus: Record<string, number>; successRate: number; channelHealth: Record<string, { score: number; circuitOpen: boolean }> } {
    const all = [...this.deliveries.values()];
    const byChannel: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    all.forEach((d) => {
      byChannel[d.channel] = (byChannel[d.channel] || 0) + 1;
      byStatus[d.status] = (byStatus[d.status] || 0) + 1;
    });
    const delivered = byStatus.delivered || 0;
    const channelHealth: Record<string, { score: number; circuitOpen: boolean }> = {};
    this.channels.forEach((ch) => {
      channelHealth[ch] = { score: Math.round(this.getChannelScore(ch) * 100) / 100, circuitOpen: this.isCircuitOpen(ch) };
    });
    return { total: all.length, byChannel, byStatus, successRate: all.length > 0 ? Math.round((delivered / all.length) * 10000) / 100 : 0, channelHealth };
  }

  private createRecord(notificationId: string, channel: string, recipient: string, priority = 5): DeliveryRecord {
    return {
      id: `del_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      notificationId,
      channel: channel as DeliveryRecord["channel"],
      recipient,
      status: "pending",
      attempts: 0,
      maxAttempts: 3,
      priority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private async deliver(record: DeliveryRecord): Promise<DeliveryRecord> {
    record.attempts++;
    record.updatedAt = new Date().toISOString();
    const start = Date.now();

    // Apply exponential backoff delay before delivery attempt
    if (record.attempts > 1) {
      const delay = this.backoffDelay(record.attempts - 1, record.maxAttempts);
      await new Promise((r) => setTimeout(r, delay));
    }

    // Simulate delivery with realistic success rates per channel
    const channelSuccessRates: Record<string, number> = { email: 0.95, slack: 0.98, sms: 0.92, webhook: 0.88, in_app: 0.97 };
    const successRate = channelSuccessRates[record.channel] || 0.9;
    // Circuit breaker reduces success rate when open (half-open state)
    const effectiveRate = this.circuitStates.get(record.channel)?.open ? 0.3 : successRate;
    const success = Math.random() < effectiveRate;
    const latency = Date.now() - start;

    this.recordDelivery(record.channel, latency, success);

    if (success) {
      record.status = "delivered";
      record.sentAt = new Date().toISOString();
      this.recordSuccess(record.channel);
    } else {
      this.recordFailure(record.channel);
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
