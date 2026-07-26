import { N0VA1OGateway } from "@n0va/n0va1o";
import { ConnectedAccountModel } from "../models/ConnectedAccount";
import mongoose from "mongoose";

export class N0VA1OService {
  private gateway: N0VA1OGateway;

  // ─── Platform Health Tracking ───────────────────────────────────────
  private platformHealth = new Map<string, { successes: number; failures: number; latencies: number[]; lastCheck: number; circuitOpen: boolean }>();
  private readonly circuitThreshold = 5;
  private readonly circuitResetTimeout = 30000;
  private readonly maxLatencySamples = 50;

  constructor() {
    this.gateway = new N0VA1OGateway();
  }

  // ─── Latency Profiling ──────────────────────────────────────────────
  private recordCall(platform: string, latency: number, success: boolean): void {
    let health = this.platformHealth.get(platform);
    if (!health) { health = { successes: 0, failures: 0, latencies: [], lastCheck: Date.now(), circuitOpen: false }; this.platformHealth.set(platform, health); }
    health.latencies.push(latency);
    if (health.latencies.length > this.maxLatencySamples) health.latencies.shift();
    if (success) health.successes++;
    else health.failures++;
    health.lastCheck = Date.now();

    if (!success) {
      health.failures++;
      if (health.failures >= this.circuitThreshold) health.circuitOpen = true;
    } else {
      health.failures = Math.max(0, health.failures - 1);
      if (health.failures === 0) health.circuitOpen = false;
    }
  }

  private isCircuitOpen(platform: string): boolean {
    const health = this.platformHealth.get(platform);
    if (!health || !health.circuitOpen) return false;
    if (Date.now() - health.lastCheck > this.circuitResetTimeout) {
      health.circuitOpen = false;
      return false;
    }
    return true;
  }

  // ─── Adaptive Backoff ──────────────────────────────────────────────
  private async adaptiveBackoff(platform: string, attempt: number): Promise<void> {
    const health = this.platformHealth.get(platform);
    const avgLatency = health && health.latencies.length > 0
      ? health.latencies.reduce((a, b) => a + b, 0) / health.latencies.length
      : 100;
    const base = Math.max(avgLatency, 100);
    const cap = 30000;
    const delay = Math.min(cap, base * Math.pow(2, attempt) * (0.5 + Math.random()));
    await new Promise((r) => setTimeout(r, delay));
  }

  async getPlatforms() {
    return this.gateway.getPlatforms();
  }

  async executeAction(tenantId: string, platform: string, action: string, params: Record<string, unknown>) {
    // Circuit breaker check
    if (this.isCircuitOpen(platform)) {
      throw new Error(`Circuit breaker open for platform "${platform}". Service degraded.`);
    }

    const account = await ConnectedAccountModel.findOne({ tenantId: new mongoose.Types.ObjectId(tenantId), platform, status: "active" });
    if (!account) throw new Error(`No active ${platform} account found for tenant`);

    const accountConfig = {
      id: account._id.toString(),
      tenantId: account.tenantId.toString(),
      platform: account.platform,
      label: account.label,
      status: account.status as any,
      credentials: {
        clientId: "", clientSecret: "",
        accessToken: account.credentials.accessToken,
        refreshToken: account.credentials.refreshToken,
        expiresAt: account.credentials.expiresAt,
        scopes: account.credentials.scopes,
      },
      metadata: account.metadata,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };

    // Execute with adaptive retry
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (attempt > 0) await this.adaptiveBackoff(platform, attempt);

      const start = Date.now();
      try {
        const result = await this.gateway.execute({ id: `${platform}_${Date.now()}`, accountId: account._id.toString(), action, params }, accountConfig);
        this.recordCall(platform, Date.now() - start, true);
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.recordCall(platform, Date.now() - start, false);
      }
    }

    throw lastError || new Error("Execution failed after all retries");
  }

  async connectAccount(tenantId: string, platform: string, label: string, credentials: { accessToken: string; scopes: string[] }) {
    const account = new ConnectedAccountModel({ tenantId: new mongoose.Types.ObjectId(tenantId), platform, label, status: "active", credentials });
    return account.save();
  }

  async compileRecipe(recipeId: string, steps: any[]): Promise<string> {
    const actions = (steps || []).map((s: any) => `${s.platform}:${s.action}`);
    return this.gateway.quickCompile(recipeId, actions);
  }

  getGatewayHealth() {
    return this.gateway.getHealth();
  }

  // ─── Platform Performance Dashboard ─────────────────────────────────

  getPlatformPerformance(): Record<string, { successRate: number; avgLatency: number; p95Latency: number; callCount: number; circuitOpen: boolean; healthScore: number }> {
    const result: Record<string, any> = {};

    for (const [platform, health] of this.platformHealth) {
      const totalCalls = health.successes + health.failures;
      const successRate = totalCalls > 0 ? (health.successes / totalCalls) * 100 : 100;

      const sorted = [...health.latencies].sort((a, b) => a - b);
      const avgLatency = sorted.length > 0 ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0;
      const p95Latency = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] : 0;

      const latencyScore = avgLatency > 0 ? Math.max(0, 100 - avgLatency / 20) : 100;
      const reliabilityScore = successRate;
      const healthScore = Math.round((latencyScore * 0.4 + reliabilityScore * 0.6) * 100) / 100;

      result[platform] = {
        successRate: Math.round(successRate * 100) / 100,
        avgLatency: Math.round(avgLatency),
        p95Latency: Math.round(p95Latency),
        callCount: totalCalls,
        circuitOpen: health.circuitOpen,
        healthScore: Math.round(Math.max(0, Math.min(100, healthScore))),
      };
    }

    return result;
  }
}
