import mongoose, { Schema, Document } from "mongoose";

export interface IABVariant {
  id: string;
  name: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  ctr: number;
  cvr: number;
  roas: number;
}

export interface IABTest extends Document {
  tenantId: string;
  testId: string;
  testName: string;
  testType: "creative" | "audience" | "landing_page" | "offer";
  status: "running" | "paused" | "completed";
  confidence: number;
  winner?: string;
  variants: IABVariant[];
  recommendation?: string;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ABVariantSchema = new Schema<IABVariant>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
  spend: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  ctr: { type: Number, default: 0 },
  cvr: { type: Number, default: 0 },
  roas: { type: Number, default: 0 },
}, { _id: false });

const ABTestSchema = new Schema<IABTest>(
  {
    tenantId: { type: String, required: true, index: true },
    testId: { type: String, required: true },
    testName: { type: String, required: true },
    testType: { type: String, enum: ["creative", "audience", "landing_page", "offer"], required: true },
    status: { type: String, enum: ["running", "paused", "completed"], default: "running" },
    confidence: { type: Number, default: 0 },
    winner: { type: String },
    variants: [ABVariantSchema],
    recommendation: { type: String },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

ABTestSchema.index({ tenantId: 1, status: 1 });
ABTestSchema.index({ tenantId: 1, testType: 1 });

export const ABTest = mongoose.model<IABTest>("ABTest", ABTestSchema);
