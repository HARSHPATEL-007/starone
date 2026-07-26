import mongoose, { Schema, Document, Model } from "mongoose";
import { AgentType, AgentStatus } from "../types";

export interface IAgent extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  type: AgentType;
  status: AgentStatus;
  frequency: string;
  config: Record<string, unknown>;
  lastRun?: Date;
  lastError?: string;
  metrics: { runs: number; successes: number; failures: number; actionsTaken: number };
  hitlThreshold?: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  // Virtuals
  successRate: number;
  reliability: number;
  isHealthy: boolean;
  daysSinceLastRun: number;
  avgActionsPerRun: number;
  // Methods
  recordRun(success: boolean, actions?: number): Promise<IAgent>;
  recordError(error: string): Promise<IAgent>;
}

export interface IAgentModel extends Model<IAgent> {
  findActive(tenantId: string): Promise<IAgent[]>;
  getAgentHealthSummary(tenantId: string): Promise<{ total: number; healthy: number; unhealthy: number; avgSuccessRate: number }>;
}

const AgentSchema = new Schema<IAgent, IAgentModel>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, enum: Object.values(AgentType), required: true },
    status: { type: String, enum: Object.values(AgentStatus), default: AgentStatus.Idle },
    frequency: { type: String, default: "every_4_hours" },
    config: { type: Schema.Types.Mixed, default: {} },
    lastRun: Date, lastError: String,
    metrics: { runs: { type: Number, default: 0 }, successes: { type: Number, default: 0 }, failures: { type: Number, default: 0 }, actionsTaken: { type: Number, default: 0 } },
    hitlThreshold: Number,
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

AgentSchema.index({ tenantId: 1, type: 1 });

AgentSchema.virtual("successRate").get(function (this: IAgent) {
  return this.metrics.runs > 0 ? Math.round((this.metrics.successes / this.metrics.runs) * 10000) / 100 : 0;
});
AgentSchema.virtual("reliability").get(function (this: IAgent) {
  if (this.metrics.runs === 0) return 100;
  const sr = this.metrics.successes / this.metrics.runs;
  const penalty = Math.min(30, (this.metrics.failures / this.metrics.runs) * 50);
  return Math.round(Math.max(0, Math.min(100, sr * 100 - penalty)) * 100) / 100;
});
AgentSchema.virtual("isHealthy").get(function (this: IAgent) {
  return this.reliability >= 70 && this.metrics.failures <= this.metrics.successes;
});
AgentSchema.virtual("daysSinceLastRun").get(function (this: IAgent) {
  return this.lastRun ? Math.round((Date.now() - this.lastRun.getTime()) / 86400000) : -1;
});
AgentSchema.virtual("avgActionsPerRun").get(function (this: IAgent) {
  return this.metrics.runs > 0 ? Math.round((this.metrics.actionsTaken / this.metrics.runs) * 100) / 100 : 0;
});

AgentSchema.methods.recordRun = async function (success: boolean, actions = 0): Promise<IAgent> {
  this.metrics.runs++;
  if (success) this.metrics.successes++; else this.metrics.failures++;
  this.metrics.actionsTaken += actions;
  this.lastRun = new Date();
  this.lastError = success ? undefined : this.lastError;
  return this.save();
};
AgentSchema.methods.recordError = async function (error: string): Promise<IAgent> {
  this.lastError = error;
  return this.save();
};

AgentSchema.statics.findActive = async function (tenantId: string): Promise<IAgent[]> {
  return this.find({ tenantId: new mongoose.Types.ObjectId(tenantId),     status: { $in: [AgentStatus.Running, AgentStatus.Idle] } }).sort({ name: 1 });
};
AgentSchema.statics.getAgentHealthSummary = async function (tenantId: string) {
  const agents = await this.find({ tenantId: new mongoose.Types.ObjectId(tenantId) });
  const healthy = agents.filter((a: IAgent) => a.isHealthy);
  const sumRate = agents.reduce((s: number, a: IAgent) => s + a.successRate, 0);
  return { total: agents.length, healthy: healthy.length, unhealthy: agents.length - healthy.length, avgSuccessRate: agents.length > 0 ? Math.round((sumRate / agents.length) * 100) / 100 : 0 };
};

export const Agent = mongoose.model<IAgent, IAgentModel>("Agent", AgentSchema);
