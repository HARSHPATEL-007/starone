import mongoose from "mongoose";
import { Agent, IAgent } from "../models/Agent";
import { AgentType, AgentStatus } from "../types";

interface CreateAgentInput {
  tenantId: string;
  name: string;
  type: AgentType;
  frequency: string;
  config: Record<string, unknown>;
  hitlThreshold?: number;
  createdBy: string;
}

interface AgentHealth {
  agentId: string;
  name: string;
  type: string;
  status: string;
  healthScore: number;
  successRate: number;
  actionEfficiency: number;
  reliability: number;
  recommendation: string;
}

interface OptimalSchedule {
  currentFrequency: string;
  recommendedFrequency: string;
  confidence: number;
  rationale: string;
}

export class AgentService {
  async create(input: CreateAgentInput): Promise<IAgent> {
    const agent = new Agent({
      tenantId: new mongoose.Types.ObjectId(input.tenantId),
      name: input.name,
      type: input.type,
      status: AgentStatus.Idle,
      frequency: input.frequency,
      config: input.config,
      hitlThreshold: input.hitlThreshold,
      metrics: { runs: 0, successes: 0, failures: 0, actionsTaken: 0 },
      createdBy: new mongoose.Types.ObjectId(input.createdBy),
    });
    return agent.save();
  }

  async findByTenant(tenantId: string): Promise<IAgent[]> {
    return Agent.find({ tenantId: new mongoose.Types.ObjectId(tenantId) }).sort({ createdAt: -1 });
  }

  async update(id: string, tenantId: string, data: Record<string, unknown>): Promise<IAgent | null> {
    return Agent.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(id), tenantId: new mongoose.Types.ObjectId(tenantId) }, { ...data, updatedAt: new Date() }, { new: true });
  }

  async updateStatus(id: string, tenantId: string, status: AgentStatus): Promise<IAgent | null> {
    return Agent.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(id), tenantId: new mongoose.Types.ObjectId(tenantId) }, { status, updatedAt: new Date() }, { new: true });
  }

  async recordRun(id: string, tenantId: string, success: boolean, error?: string, actionsCount = 0) {
    const update: Record<string, unknown> = { $inc: { "metrics.runs": 1, "metrics.actionsTaken": actionsCount, "metrics.successes": success ? 1 : 0, "metrics.failures": success ? 0 : 1 }, lastRun: new Date() };
    if (error) update.lastError = error;
    return Agent.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(id), tenantId: new mongoose.Types.ObjectId(tenantId) }, update, { new: true });
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const result = await Agent.deleteOne({ _id: new mongoose.Types.ObjectId(id), tenantId: new mongoose.Types.ObjectId(tenantId) });
    return result.deletedCount > 0;
  }

  getDefaultAgents(): { name: string; type: AgentType; frequency: string; description: string }[] {
    return [
      { name: "Budget Agent", type: AgentType.Budget, frequency: "every_4_hours", description: "Monitors spend pacing and reallocates budget across platforms" },
      { name: "Creative Agent", type: AgentType.Creative, frequency: "every_6_hours", description: "Detects creative fatigue and generates new variants" },
      { name: "Audience Agent", type: AgentType.Audience, frequency: "daily", description: "Analyzes segment performance and expands lookalikes" },
      { name: "Bid Agent", type: AgentType.Bid, frequency: "every_2_hours", description: "Optimizes bids per platform and adjusts for seasonality" },
      { name: "Fraud Agent", type: AgentType.Fraud, frequency: "realtime", description: "Monitors invalid traffic and auto-pauses suspicious placements" },
    ];
  }

  // ─── Agent Health Scoring ────────────────────────────────────────────

  async getHealthScores(tenantId: string): Promise<AgentHealth[]> {
    const agents = await this.findByTenant(tenantId);
    return agents.map((a) => {
      const m = a.metrics || { runs: 0, successes: 0, failures: 0, actionsTaken: 0 };
      const totalRuns = m.runs || 0;
      const successRate = totalRuns > 0 ? m.successes / totalRuns : 0.5;
      const actionEfficiency = totalRuns > 0 ? (m.actionsTaken || 0) / totalRuns : 0;
      const reliability = 1 - (1 - successRate) * (1 + Math.exp(-totalRuns / 10));

      const recencyBonus = a.lastRun
        ? Math.max(0, 1 - (Date.now() - new Date(a.lastRun).getTime()) / (7 * 86400000))
        : 0;
      const healthScore = Math.round((successRate * 50 + reliability * 30 + recencyBonus * 20) * 100) / 100;

      let recommendation: string;
      if (healthScore < 0.4) recommendation = "Agent performance critically low. Review configuration and investigate failures.";
      else if (healthScore < 0.6) recommendation = "Agent underperforming. Consider adjusting frequency or checking error logs.";
      else if (healthScore < 0.8) recommendation = "Agent performing adequately. Monitor for degradation.";
      else recommendation = "Agent healthy. No action needed.";

      return {
        agentId: a._id.toString(), name: a.name, type: a.type, status: a.status,
        healthScore: Math.round(healthScore * 100), successRate: Math.round(successRate * 10000) / 100,
        actionEfficiency: Math.round(actionEfficiency * 100) / 100,
        reliability: Math.round(reliability * 10000) / 100,
        recommendation,
      };
    });
  }

  // ─── Optimal Schedule Recommendation ─────────────────────────────────

  async getOptimalSchedule(agentId: string): Promise<OptimalSchedule | null> {
    const agent = await Agent.findById(new mongoose.Types.ObjectId(agentId));
    if (!agent) return null;

    const m = agent.metrics || { runs: 0, successes: 0, failures: 0, actionsTaken: 0 };
    const totalRuns = m.runs || 0;
    const successRate = totalRuns > 0 ? m.successes / totalRuns : 0.5;

    const frequencies = ["every_30_minutes", "every_hour", "every_2_hours", "every_4_hours", "every_6_hours", "every_12_hours", "daily", "weekly"];
    const currentIdx = frequencies.indexOf(agent.frequency);
    const freqHours = [0.5, 1, 2, 4, 6, 12, 24, 168];

    // Compute optimal frequency based on success rate and action efficiency
    // High success + high action value -> more frequent; low success -> less frequent
    const actionsPerRun = totalRuns > 0 ? (m.actionsTaken || 0) / totalRuns : 0;
    const valueRatio = successRate * actionsPerRun;

    let optimalIdx: number;
    if (valueRatio > 0.8) optimalIdx = Math.max(0, currentIdx - 1);
    else if (valueRatio > 0.5) optimalIdx = currentIdx;
    else if (valueRatio > 0.2) optimalIdx = Math.min(frequencies.length - 1, currentIdx + 1);
    else optimalIdx = frequencies.length - 2;

    const recommended = frequencies[optimalIdx];
    const current = frequencies[currentIdx] || agent.frequency;
    const confidence = Math.round(Math.min(0.9, 0.3 + totalRuns * 0.02 + successRate * 0.3) * 100) / 100;

    let rationale: string;
    if (current === recommended) rationale = `Current frequency (${current}) is optimal given ${successRate * 100}% success rate and ${actionsPerRun.toFixed(1)} avg actions per run.`;
    else if (optimalIdx < currentIdx) rationale = `High success rate (${(successRate * 100).toFixed(0)}%) and action efficiency suggest increasing frequency from ${current} to ${recommended}.`;
    else rationale = `Moderate performance suggests reducing frequency from ${current} to ${recommended} to reduce resource consumption.`;

    return { currentFrequency: current, recommendedFrequency: recommended, confidence, rationale };
  }

  // ─── Redundancy Detection ────────────────────────────────────────────

  async detectRedundancy(tenantId: string): Promise<{ agent1: string; agent2: string; similarity: number; overlapDescription: string }[]> {
    const agents = await this.findByTenant(tenantId);
    const redundancies: { agent1: string; agent2: string; similarity: number; overlapDescription: string }[] = [];

    // Group agents by type and check for overlap
    const byType = new Map<string, typeof agents>();
    for (const a of agents) {
      const arr = byType.get(a.type) || [];
      arr.push(a);
      byType.set(a.type, arr);
    }

    const freqOrder = ["realtime", "every_30_minutes", "every_hour", "every_2_hours", "every_4_hours", "every_6_hours", "every_12_hours", "daily", "weekly", "monthly"];

    for (const [, group] of byType) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i], b = group[j];
          const freqA = freqOrder.indexOf(a.frequency);
          const freqB = freqOrder.indexOf(b.frequency);
          const freqDiff = freqA >= 0 && freqB >= 0 ? Math.abs(freqA - freqB) : 2;

          const m1 = a.metrics || { runs: 0, successes: 0, failures: 0 };
          const m2 = b.metrics || { runs: 0, successes: 0, failures: 0 };
          const sr1 = m1.runs > 0 ? m1.successes / m1.runs : 0;
          const sr2 = m2.runs > 0 ? m2.successes / m2.runs : 0;
          const srDiff = Math.abs(sr1 - sr2);

          const similarity = Math.round((1 - freqDiff / freqOrder.length) * (1 - srDiff) * 100);
          if (similarity > 60) {
            redundancies.push({
              agent1: a.name, agent2: b.name, similarity,
              overlapDescription: `Both ${a.type} agents run at similar frequencies (${a.frequency} vs ${b.frequency}) with similar success rates. Consider consolidating.`,
            });
          }
        }
      }
    }

    return redundancies.sort((a, b) => b.similarity - a.similarity);
  }

  // ─── Performance Forecasting ────────────────────────────────────────

  async forecastPerformance(agentId: string, horizonRuns = 10): Promise<{ expectedSuccesses: number; expectedFailures: number; expectedActions: number; confidence: number; trend: "improving" | "declining" | "stable" }> {
    const agent = await Agent.findById(new mongoose.Types.ObjectId(agentId));
    if (!agent) return { expectedSuccesses: 0, expectedFailures: 0, expectedActions: 0, confidence: 0, trend: "stable" };

    const m = agent.metrics || { runs: 0, successes: 0, failures: 0, actionsTaken: 0 };
    const totalRuns = m.runs || 0;
    if (totalRuns < 3) {
      const expectedSR = totalRuns > 0 ? m.successes / totalRuns : 0.5;
      const expectedAR = totalRuns > 0 ? (m.actionsTaken || 0) / totalRuns : 2;
      return {
        expectedSuccesses: Math.round(expectedSR * horizonRuns),
        expectedFailures: Math.round((1 - expectedSR) * horizonRuns),
        expectedActions: Math.round(expectedAR * horizonRuns),
        confidence: 0.3,
        trend: "stable",
      };
    }

    const sr = m.successes / totalRuns;
    const ar = (m.actionsTaken || 0) / totalRuns;
    const recentBias = agent.lastRun
      ? Math.max(0.5, 1 - (Date.now() - new Date(agent.lastRun).getTime()) / (30 * 86400000))
      : 0.5;
    const adjustedSR = sr * 0.7 + recentBias * 0.3;

    const trend: "improving" | "declining" | "stable" = totalRuns > 10
      ? sr > 0.8 ? "improving" : sr < 0.4 ? "declining" : "stable"
      : "stable";

    return {
      expectedSuccesses: Math.round(adjustedSR * horizonRuns),
      expectedFailures: Math.round((1 - adjustedSR) * horizonRuns),
      expectedActions: Math.round(ar * horizonRuns),
      confidence: Math.round(Math.min(0.9, 0.3 + totalRuns * 0.01) * 100) / 100,
      trend,
    };
  }
}

export const agentService = new AgentService();
