import mongoose, { Schema, Document } from "mongoose";
import { CampaignStatus, CampaignType, BudgetAllocation } from "../types";

export interface ICampaign extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  description?: string;
  budget: BudgetAllocation;
  platforms: string[];
  audiences: mongoose.Types.ObjectId[];
  creatives: mongoose.Types.ObjectId[];
  startDate?: Date;
  endDate?: Date;
  goal?: string;
  kpis: Record<string, number>;
  tags: string[];
  hyperContext: {
    linkedTasks: mongoose.Types.ObjectId[];
    linkedDocs: mongoose.Types.ObjectId[];
    linkedSheets: mongoose.Types.ObjectId[];
    linkedCalendar: mongoose.Types.ObjectId[];
  };
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: Object.values(CampaignType),
      default: CampaignType.Performance,
    },
    status: {
      type: String,
      enum: Object.values(CampaignStatus),
      default: CampaignStatus.Draft,
    },
    description: String,
    budget: {
      daily: { type: Number, default: 0 },
      lifetime: { type: Number, default: 0 },
      currency: { type: String, default: "USD" },
      spent: { type: Number, default: 0 },
      remaining: { type: Number, default: 0 },
    },
    platforms: [{ type: String }],
    audiences: [{ type: Schema.Types.ObjectId, ref: "Audience" }],
    creatives: [{ type: Schema.Types.ObjectId, ref: "Creative" }],
    startDate: Date,
    endDate: Date,
    goal: String,
    kpis: { type: Schema.Types.Mixed, default: {} },
    tags: [{ type: String }],
    hyperContext: {
      linkedTasks: [{ type: Schema.Types.ObjectId, ref: "Task" }],
      linkedDocs: [{ type: Schema.Types.ObjectId, ref: "Doc" }],
      linkedSheets: [{ type: Schema.Types.ObjectId, ref: "Sheet" }],
      linkedCalendar: [{ type: Schema.Types.ObjectId, ref: "Calendar" }],
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

CampaignSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
CampaignSchema.index({ tenantId: 1, type: 1 });

export const Campaign = mongoose.model<ICampaign>("Campaign", CampaignSchema);
