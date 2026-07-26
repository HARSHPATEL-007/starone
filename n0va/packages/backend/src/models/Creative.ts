import mongoose, { Schema, Document, Model } from "mongoose";
import { CreativeStatus } from "../types";

export interface ICreative extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  type: "image" | "video" | "carousel" | "text";
  status: CreativeStatus;
  platformVariants: Map<string, { url: string; dimensions: string; platform: string }>;
  assetUrl?: string;
  headline?: string;
  body?: string;
  cta?: string;
  tags: string[];
  performance: { impressions: number; clicks: number; ctr: number };
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  // Virtuals
  performanceScore: number;
  conversionRate: number;
  hasHeadline: boolean;
  hasCta: boolean;
  // Methods
  updatePerformance(impressions: number, clicks: number): Promise<ICreative>;
  getFatigueScore(daysSinceLastUse: number): number;
}

export interface ICreativeModel extends Model<ICreative> {
  findTopPerforming(tenantId: string, limit?: number): Promise<ICreative[]>;
  getPerformanceDistribution(tenantId: string): Promise<{ type: string; count: number; avgCtr: number; avgImpressions: number }[]>;
}

const CreativeSchema = new Schema<ICreative, ICreativeModel>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, enum: ["image", "video", "carousel", "text"], required: true },
    status: { type: String, enum: Object.values(CreativeStatus), default: CreativeStatus.Draft },
    platformVariants: { type: Map, of: Schema.Types.Mixed, default: new Map() },
    assetUrl: String,
    headline: String, body: String, cta: String,
    tags: [{ type: String }],
    performance: { impressions: { type: Number, default: 0 }, clicks: { type: Number, default: 0 }, ctr: { type: Number, default: 0 } },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

CreativeSchema.index({ tenantId: 1, status: 1 });
CreativeSchema.index({ tenantId: 1, type: 1 });

// ─── Virtuals ──────────────────────────────────────────────────────────

CreativeSchema.virtual("performanceScore").get(function (this: ICreative) {
  const ctrScore = Math.min(100, (this.performance.ctr || 0) * 10000);
  const impressionScore = Math.min(100, Math.log10(Math.max(1, this.performance.impressions)) * 20);
  const completenessScore = (this.headline ? 15 : 0) + (this.body ? 10 : 0) + (this.cta ? 15 : 0);
  return Math.round((ctrScore * 0.5 + impressionScore * 0.2 + completenessScore * 0.3) * 100) / 100;
});

CreativeSchema.virtual("conversionRate").get(function (this: ICreative) {
  return this.performance.impressions > 0 ? (this.performance.clicks / this.performance.impressions) : 0;
});

CreativeSchema.virtual("hasHeadline").get(function (this: ICreative) {
  return !!this.headline && this.headline.trim().length > 0;
});

CreativeSchema.virtual("hasCta").get(function (this: ICreative) {
  return !!this.cta && this.cta.trim().length > 0;
});

// ─── Instance Methods ──────────────────────────────────────────────────

CreativeSchema.methods.updatePerformance = async function (impressions: number, clicks: number): Promise<ICreative> {
  this.performance.impressions += impressions;
  this.performance.clicks += clicks;
  this.performance.ctr = this.performance.impressions > 0
    ? Math.round((this.performance.clicks / this.performance.impressions) * 100000) / 100000
    : 0;
  return this.save();
};

CreativeSchema.methods.getFatigueScore = function (daysSinceLastUse: number): number {
  const baseFatigue = Math.max(0, 100 - (this.performance.ctr || 0) * 5000);
  const recencyBoost = Math.max(0, 30 - daysSinceLastUse) * 2;
  const impressionFatigue = Math.min(40, Math.log10(Math.max(1, this.performance.impressions)) * 8);
  return Math.round(Math.min(100, baseFatigue + recencyBoost + impressionFatigue));
};

// ─── Statics ───────────────────────────────────────────────────────────

CreativeSchema.statics.findTopPerforming = async function (tenantId: string, limit = 10): Promise<ICreative[]> {
  return this.find({ tenantId: new mongoose.Types.ObjectId(tenantId), "performance.impressions": { $gt: 100 } })
    .sort({ "performance.ctr": -1 })
    .limit(limit);
};

CreativeSchema.statics.getPerformanceDistribution = async function (tenantId: string) {
  const results = await this.aggregate<{ type: string; count: number; avgCtr: number; avgImpressions: number }>([
    { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
    { $group: { _id: "$type", count: { $sum: 1 }, avgCtr: { $avg: "$performance.ctr" }, avgImpressions: { $avg: "$performance.impressions" } } },
    { $project: { _id: 0, type: "$_id", count: 1, avgCtr: { $round: ["$avgCtr", 4] }, avgImpressions: { $round: ["$avgImpressions", 0] } } },
    { $sort: { count: -1 } },
  ]);
  return results;
};

export const Creative = mongoose.model<ICreative, ICreativeModel>("Creative", CreativeSchema);
