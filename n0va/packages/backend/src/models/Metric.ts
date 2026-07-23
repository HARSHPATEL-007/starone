import mongoose, { Schema, Document } from "mongoose";

export interface IMetric extends Document {
  tenantId: mongoose.Types.ObjectId;
  campaignId: mongoose.Types.ObjectId;
  platform: string;
  date: Date;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  ctr: number;
  cpc: number;
  roas: number;
  metadata: Record<string, unknown>;
}

const MetricSchema = new Schema<IMetric>({
  tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
  campaignId: { type: Schema.Types.ObjectId, ref: "Campaign", required: true, index: true },
  platform: { type: String, required: true },
  date: { type: Date, required: true },
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
  spend: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  ctr: { type: Number, default: 0 },
  cpc: { type: Number, default: 0 },
  roas: { type: Number, default: 0 },
  metadata: { type: Schema.Types.Mixed, default: {} },
});

MetricSchema.index({ tenantId: 1, campaignId: 1, date: -1 });
MetricSchema.index({ tenantId: 1, platform: 1, date: -1 });

export const Metric = mongoose.model<IMetric>("Metric", MetricSchema);
