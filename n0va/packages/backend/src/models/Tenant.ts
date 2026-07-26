import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITenant extends Document {
  name: string;
  slug: string;
  tier: "starter" | "growth" | "pro" | "enterprise" | "transcendent";
  features: string[];
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  // Virtuals
  tierLevel: number;
  isEnterprise: boolean;
  // Methods
  hasFeature(feature: string): boolean;
  setFeature(feature: string): Promise<ITenant>;
}

export interface ITenantModel extends Model<ITenant> {
  findBySlug(slug: string): Promise<ITenant | null>;
  getTierSummary(): Promise<{ tier: string; count: number }[]>;
}

const TIER_LEVELS: Record<string, number> = { starter: 0, growth: 1, pro: 2, enterprise: 3, transcendent: 4 };

const TenantSchema = new Schema<ITenant, ITenantModel>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    tier: { type: String, enum: ["starter", "growth", "pro", "enterprise", "transcendent"], default: "starter" },
    features: [{ type: String }],
    settings: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

TenantSchema.virtual("tierLevel").get(function (this: ITenant) { return TIER_LEVELS[this.tier] ?? 0; });
TenantSchema.virtual("isEnterprise").get(function (this: ITenant) { return this.tier === "enterprise" || this.tier === "transcendent"; });

TenantSchema.methods.hasFeature = function (feature: string): boolean {
  return (this.features || []).includes(feature);
};
TenantSchema.methods.setFeature = async function (feature: string) {
  if (!this.features.includes(feature)) { this.features.push(feature); await this.save(); }
  return this;
};

TenantSchema.statics.findBySlug = async function (slug: string): Promise<ITenant | null> {
  return this.findOne({ slug });
};
TenantSchema.statics.getTierSummary = async function () {
  return this.aggregate<{ tier: string; count: number }>([{ $group: { _id: "$tier", count: { $sum: 1 } } }, { $project: { _id: 0, tier: "$_id", count: 1 } }, { $sort: { count: -1 } }]);
};

export const Tenant = mongoose.model<ITenant, ITenantModel>("Tenant", TenantSchema);
