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
    return Agent.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
    }).sort({ createdAt: -1 });
  }

  async updateStatus(id: string, tenantId: string, status: AgentStatus): Promise<IAgent | null> {
    return Agent.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        tenantId: new mongoose.Types.ObjectId(tenantId),
      },
      { status, updatedAt: new Date() },
      { new: true }
    );
  }

  async recordRun(id: string, tenantId: string, success: boolean, error?: string, actionsCount = 0) {
    const update: Record<string, unknown> = {
      $inc: {
        "metrics.runs": 1,
        "metrics.actionsTaken": actionsCount,
        "metrics.successes": success ? 1 : 0,
        "metrics.failures": success ? 0 : 1,
      },
      lastRun: new Date(),
    };

    if (error) update.lastError = error;

    return Agent.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        tenantId: new mongoose.Types.ObjectId(tenantId),
      },
      update,
      { new: true }
    );
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const result = await Agent.deleteOne({
      _id: new mongoose.Types.ObjectId(id),
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });
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
}

export const agentService = new AgentService();
