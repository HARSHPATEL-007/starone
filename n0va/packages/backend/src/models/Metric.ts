import mongoose, { Schema, Document, Model } from "mongoose";

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
  // Virtuals
  cvr: number;
  cpa: number;
  // Methods
  isAnomalous(threshold?: number): { isAnomaly: boolean; reasons: string[] };
  computeDerivedFields(): void;
}

export interface IMetricModel extends Model<IMetric> {
  getDailyAggregate(campaignId: string, days?: number): Promise<{ date: string; impressions: number; clicks: number; conversions: number; spend: number; revenue: number }[]>;
  getTrend(campaignId: string, metricField: string, days?: number): Promise<{ date: string; value: number }[]>;
  getPlatformBreakdown(campaignId: string): Promise<{ platform: string; impressions: number; clicks: number; conversions: number; spend: number; revenue: number; roas: number }[]>;
}

const MetricSchema = new Schema<IMetric, IMetricModel>({
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
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

MetricSchema.index({ tenantId: 1, campaignId: 1, date: -1 });
MetricSchema.index({ tenantId: 1, platform: 1, date: -1 });

// ─── Virtuals ──────────────────────────────────────────────────────────

MetricSchema.virtual("cvr").get(function (this: IMetric) {
  return this.impressions > 0 ? Math.round((this.conversions / this.impressions) * 100000) / 100000 : 0;
});

MetricSchema.virtual("cpa").get(function (this: IMetric) {
  return this.conversions > 0 ? Math.round((this.spend / this.conversions) * 100) / 100 : 0;
});

// ─── Pre-save Hook ─────────────────────────────────────────────────────

MetricSchema.pre<IMetric>("save", function (next) {
  this.ctr = this.impressions > 0 ? Math.round((this.clicks / this.impressions) * 100000) / 100000 : 0;
  this.cpc = this.clicks > 0 ? Math.round((this.spend / this.clicks) * 100) / 100 : 0;
  this.roas = this.spend > 0 ? Math.round((this.revenue / this.spend) * 100) / 100 : 0;
  next();
});

// ─── Instance Methods ──────────────────────────────────────────────────

MetricSchema.methods.isAnomalous = function (threshold = 3): { isAnomaly: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (this.impressions > 0 && this.clicks > this.impressions) reasons.push(`Clicks (${this.clicks}) exceed impressions (${this.impressions}).`);
  if (this.conversions > this.clicks) reasons.push(`Conversions (${this.conversions}) exceed clicks (${this.clicks}).`);
  if (this.revenue < 0) reasons.push(`Negative revenue (${this.revenue}).`);
  if (this.ctr > 0.5) reasons.push(`CTR (${(this.ctr * 100).toFixed(1)}%) is > 50% (threshold ${threshold}).`);
  if (this.roas > 100) reasons.push(`ROAS (${this.roas.toFixed(1)}x) is extremely high (threshold ${threshold}).`);
  if (this.cpa > 0 && this.spend > 10000) reasons.push(`CPA $${this.cpa.toFixed(2)} with high spend $${this.spend.toFixed(2)}.`);
  return { isAnomaly: reasons.length > 0, reasons };
};

MetricSchema.methods.computeDerivedFields = function (): void {
  this.ctr = this.impressions > 0 ? Math.round((this.clicks / this.impressions) * 100000) / 100000 : 0;
  this.cpc = this.clicks > 0 ? Math.round((this.spend / this.clicks) * 100) / 100 : 0;
  this.roas = this.spend > 0 ? Math.round((this.revenue / this.spend) * 100) / 100 : 0;
};

// ─── Statics ───────────────────────────────────────────────────────────

MetricSchema.statics.getDailyAggregate = async function (campaignId: string, days = 30) {
  const since = new Date(Date.now() - days * 86400000);
  const results = await this.aggregate<{ date: string; impressions: number; clicks: number; conversions: number; spend: number; revenue: number }>([
    { $match: { campaignId: new mongoose.Types.ObjectId(campaignId), date: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, impressions: { $sum: "$impressions" }, clicks: { $sum: "$clicks" }, conversions: { $sum: "$conversions" }, spend: { $sum: "$spend" }, revenue: { $sum: "$revenue" } } },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: "$_id", impressions: 1, clicks: 1, conversions: 1, spend: 1, revenue: 1 } },
  ]);
  return results;
};

MetricSchema.statics.getTrend = async function (campaignId: string, metricField: string, days = 30) {
  const since = new Date(Date.now() - days * 86400000);
  const results = await this.aggregate<{ date: string; value: number }>([
    { $match: { campaignId: new mongoose.Types.ObjectId(campaignId), date: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, value: { $avg: `$${metricField}` } } },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: "$_id", value: { $round: ["$value", 4] } } },
  ]);
  return results;
};

MetricSchema.statics.getPlatformBreakdown = async function (campaignId: string) {
  const results = await this.aggregate<{ platform: string; impressions: number; clicks: number; conversions: number; spend: number; revenue: number; roas: number }>([
    { $match: { campaignId: new mongoose.Types.ObjectId(campaignId) } },
    { $group: { _id: "$platform", impressions: { $sum: "$impressions" }, clicks: { $sum: "$clicks" }, conversions: { $sum: "$conversions" }, spend: { $sum: "$spend" }, revenue: { $sum: "$revenue" } } },
    { $project: { _id: 0, platform: "$_id", impressions: 1, clicks: 1, conversions: 1, spend: 1, revenue: 1, roas: { $cond: [{ $gt: ["$spend", 0] }, { $round: [{ $divide: ["$revenue", "$spend"] }, 2] }, 0] } } },
    { $sort: { spend: -1 } },
  ]);
  return results;
};

export const Metric = mongoose.model<IMetric, IMetricModel>("Metric", MetricSchema);
