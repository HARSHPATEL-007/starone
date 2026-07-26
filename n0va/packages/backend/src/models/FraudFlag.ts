import mongoose, { Schema, Document, Model } from "mongoose";

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
  // Virtuals
  severityLevel: number;
  isResolved: boolean;
  daysSinceDetection: number;
  // Methods
  resolve(): Promise<IFraudFlag>;
}

export interface IFraudFlagModel extends Model<IFraudFlag> {
  findActive(tenantId: string): Promise<IFraudFlag[]>;
  getCampaignFraudSummary(campaignId: string): Promise<{ total: number; critical: number; high: number; medium: number; low: number; topCategory: string }>;
  getFraudTrend(tenantId: string, days?: number): Promise<{ date: string; count: number; avgScore: number }[]>;
}

const SEVERITY_ORDER: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };

const FraudFlagSchema = new Schema<IFraudFlag, IFraudFlagModel>(
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
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

FraudFlagSchema.index({ tenantId: 1, campaignId: 1, detectedAt: -1 });
FraudFlagSchema.index({ tenantId: 1, severity: 1 });

FraudFlagSchema.virtual("severityLevel").get(function (this: IFraudFlag) { return SEVERITY_ORDER[this.severity] ?? 0; });
FraudFlagSchema.virtual("isResolved").get(function (this: IFraudFlag) { return !!this.resolvedAt; });
FraudFlagSchema.virtual("daysSinceDetection").get(function (this: IFraudFlag) { return Math.round((Date.now() - this.detectedAt.getTime()) / 86400000); });

FraudFlagSchema.methods.resolve = async function (): Promise<IFraudFlag> {
  this.resolvedAt = new Date();
  return this.save();
};

FraudFlagSchema.statics.findActive = async function (tenantId: string): Promise<IFraudFlag[]> {
  return this.find({ tenantId, resolvedAt: null }).sort({ severity: -1, detectedAt: -1 });
};

FraudFlagSchema.statics.getCampaignFraudSummary = async function (campaignId: string) {
  const flags = await this.find({ campaignId });
  const catCounts: Record<string, number> = {};
  let critical = 0, high = 0, medium = 0, low = 0;
  flags.forEach((f: IFraudFlag) => {
    if (f.severity === "critical") critical++;
    else if (f.severity === "high") high++;
    else if (f.severity === "medium") medium++;
    else low++;
    catCounts[f.category] = (catCounts[f.category] || 0) + 1;
  });
  const topCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "none";
  return { total: flags.length, critical, high, medium, low, topCategory };
};

FraudFlagSchema.statics.getFraudTrend = async function (tenantId: string, days = 30) {
  const since = new Date(Date.now() - days * 86400000);
  return this.aggregate<{ date: string; count: number; avgScore: number }>([
    { $match: { tenantId, detectedAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$detectedAt" } }, count: { $sum: 1 }, avgScore: { $avg: "$score" } } },
    { $project: { _id: 0, date: "$_id", count: 1, avgScore: { $round: ["$avgScore", 2] } } },
    { $sort: { date: 1 } },
  ]);
};

export const FraudFlag = mongoose.model<IFraudFlag, IFraudFlagModel>("FraudFlag", FraudFlagSchema);
