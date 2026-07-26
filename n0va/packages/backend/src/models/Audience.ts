import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAudience extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  type: "lookalike" | "retargeting" | "custom" | "saved";
  platform: string;
  size: number;
  criteria: Record<string, unknown>;
  performance: { impressions: number; conversions: number; spend: number; revenue: number; roas: number };
  status: "active" | "paused" | "building";
  tags: string[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  // Virtuals
  efficiency: number;
  costPerConversion: number;
  conversionRate: number;
  // Methods
  updatePerformanceMetrics(impressions: number, conversions: number, spend: number, revenue: number): Promise<IAudience>;
}

export interface IAudienceModel extends Model<IAudience> {
  findHighValue(tenantId: string, minRoas?: number): Promise<IAudience[]>;
  getAudienceMix(tenantId: string): Promise<{ type: string; total: number; totalSize: number; avgRoas: number }[]>;
  findByPlatform(tenantId: string, platform: string): Promise<IAudience[]>;
}

const AudienceSchema = new Schema<IAudience, IAudienceModel>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    name: { type: String, required: true },
    description: String,
    type: { type: String, enum: ["lookalike", "retargeting", "custom", "saved"], required: true },
    platform: { type: String, required: true },
    size: { type: Number, default: 0 },
    criteria: { type: Schema.Types.Mixed, default: {} },
    performance: { impressions: { type: Number, default: 0 }, conversions: { type: Number, default: 0 }, spend: { type: Number, default: 0 }, revenue: { type: Number, default: 0 }, roas: { type: Number, default: 0 } },
    status: { type: String, enum: ["active", "paused", "building"], default: "active" },
    tags: [{ type: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

AudienceSchema.index({ tenantId: 1, platform: 1 });
AudienceSchema.index({ tenantId: 1, type: 1, status: 1 });

// ─── Virtuals ──────────────────────────────────────────────────────────

AudienceSchema.virtual("efficiency").get(function (this: IAudience) {
  return this.performance.spend > 0 ? Math.round((this.performance.revenue / this.performance.spend) * 100) / 100 : 0;
});

AudienceSchema.virtual("costPerConversion").get(function (this: IAudience) {
  return this.performance.conversions > 0 ? Math.round((this.performance.spend / this.performance.conversions) * 100) / 100 : 0;
});

AudienceSchema.virtual("conversionRate").get(function (this: IAudience) {
  return this.performance.impressions > 0 ? Math.round((this.performance.conversions / this.performance.impressions) * 100000) / 100000 : 0;
});

// ─── Pre-save Hook ─────────────────────────────────────────────────────

AudienceSchema.pre<IAudience>("save", function (next) {
  this.performance.roas = this.performance.spend > 0 ? Math.round((this.performance.revenue / this.performance.spend) * 100) / 100 : 0;
  next();
});

// ─── Instance Methods ──────────────────────────────────────────────────

AudienceSchema.methods.updatePerformanceMetrics = async function (impressions: number, conversions: number, spend: number, revenue: number): Promise<IAudience> {
  this.performance.impressions += impressions;
  this.performance.conversions += conversions;
  this.performance.spend += spend;
  this.performance.revenue += revenue;
  this.performance.roas = this.performance.spend > 0 ? Math.round((this.performance.revenue / this.performance.spend) * 100) / 100 : 0;
  return this.save();
};

// ─── Statics ───────────────────────────────────────────────────────────

AudienceSchema.statics.findHighValue = async function (tenantId: string, minRoas = 3): Promise<IAudience[]> {
  return this.find({ tenantId: new mongoose.Types.ObjectId(tenantId), "performance.roas": { $gte: minRoas }, status: "active" }).sort({ "performance.roas": -1 });
};

AudienceSchema.statics.getAudienceMix = async function (tenantId: string) {
  const results = await this.aggregate<{ type: string; total: number; totalSize: number; avgRoas: number }>([
    { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
    { $group: { _id: "$type", total: { $sum: 1 }, totalSize: { $sum: "$size" }, avgRoas: { $avg: "$performance.roas" } } },
    { $project: { _id: 0, type: "$_id", total: 1, totalSize: 1, avgRoas: { $round: ["$avgRoas", 2] } } },
    { $sort: { totalSize: -1 } },
  ]);
  return results;
};

AudienceSchema.statics.findByPlatform = async function (tenantId: string, platform: string): Promise<IAudience[]> {
  return this.find({ tenantId: new mongoose.Types.ObjectId(tenantId), platform, status: "active" }).sort({ "performance.revenue": -1 });
};

export const Audience = mongoose.model<IAudience, IAudienceModel>("Audience", AudienceSchema);
