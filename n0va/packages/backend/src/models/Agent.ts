import mongoose, { Schema, Document } from "mongoose";
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
  metrics: {
    runs: number;
    successes: number;
    failures: number;
    actionsTaken: number;
  };
  hitlThreshold?: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AgentSchema = new Schema<IAgent>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: Object.values(AgentType),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(AgentStatus),
      default: AgentStatus.Idle,
    },
    frequency: { type: String, default: "every_4_hours" },
    config: { type: Schema.Types.Mixed, default: {} },
    lastRun: Date,
    lastError: String,
    metrics: {
      runs: { type: Number, default: 0 },
      successes: { type: Number, default: 0 },
      failures: { type: Number, default: 0 },
      actionsTaken: { type: Number, default: 0 },
    },
    hitlThreshold: Number,
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

AgentSchema.index({ tenantId: 1, type: 1 });

export const Agent = mongoose.model<IAgent>("Agent", AgentSchema);
