import mongoose, { Schema, Document } from "mongoose";

export type FraudSeverity = "low" | "medium" | "high" | "critical";
export type FraudCategory = "ivt" | "bot" | "click_fraud" | "impression_fraud" | "viewability" | "brand_safety" | "geo_anomaly" | "frequency_anomaly";

export interface IFraudFlag extends Document {
  tenantId: string;
  campaignId: string;
  platform: string;
  placementId?: string;
  category: FraudCategory;
  severity: FraudSeverity;
  score: number;
  description: string;
  details: Record<string, unknown>;
  detectedAt: Date;
  autoPaused: boolean;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FraudFlagSchema = new Schema<IFraudFlag>(
  {
    tenantId: { type: String, required: true, index: true },
    campaignId: { type: String, required: true, index: true },
    platform: { type: String, required: true },
    placementId: { type: String },
    category: { type: String, enum: ["ivt", "bot", "click_fraud", "impression_fraud", "viewability", "brand_safety", "geo_anomaly", "frequency_anomaly"], required: true },
    severity: { type: String, enum: ["low", "medium", "high", "critical"], required: true },
    score: { type: Number, default: 0 },
    description: { type: String, required: true },
    details: { type: Schema.Types.Mixed, default: {} },
    detectedAt: { type: Date, default: Date.now },
    autoPaused: { type: Boolean, default: false },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

FraudFlagSchema.index({ tenantId: 1, campaignId: 1, detectedAt: -1 });
FraudFlagSchema.index({ tenantId: 1, severity: 1 });

export const FraudFlag = mongoose.model<IFraudFlag>("FraudFlag", FraudFlagSchema);
