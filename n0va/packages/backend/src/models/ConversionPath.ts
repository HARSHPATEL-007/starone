import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITouchpoint {
  id: string;
  campaignId: string;
  campaignName: string;
  platform: string;
  channel: string;
  timestamp: Date;
  type: "impression" | "click" | "view_through" | "engagement" | "conversion";
  weight: number;
  cost: number;
  revenue: number;
}

export interface IConversionPath extends Document {
  tenantId: string;
  conversionId: string;
  userId: string;
  touchpoints: ITouchpoint[];
  totalRevenue: number;
  conversionDate: Date;
  createdAt: Date;
  updatedAt: Date;
  // Virtuals
  touchpointCount: number;
  pathLength: number;
  totalCost: number;
  topCampaigns: string[];
  conversionEfficiency: number;
  // Methods
  computeAttribution(method: "first" | "last" | "linear" | "position"): { campaignId: string; campaignName: string; attributedRevenue: number }[];
  addTouchpoint(tp: ITouchpoint): Promise<IConversionPath>;
}

export interface IConversionPathModel extends Model<IConversionPath> {
  findByUser(tenantId: string, userId: string): Promise<IConversionPath[]>;
  getAttributionSummary(tenantId: string, campaignId: string): Promise<{ totalConversions: number; totalRevenue: number; avgPathLength: number; touchpoints: number }>;
  getPlatformMix(tenantId: string): Promise<{ platform: string; touchpoints: number; totalRevenue: number }[]>;
}

const TouchpointSchema = new Schema<ITouchpoint>({
  id: { type: String, required: true }, campaignId: { type: String, required: true }, campaignName: { type: String, required: true },
  platform: { type: String, required: true }, channel: { type: String, required: true }, timestamp: { type: Date, required: true },
  type: { type: String, enum: ["impression", "click", "view_through", "engagement", "conversion"], required: true },
  weight: { type: Number, default: 0 }, cost: { type: Number, default: 0 }, revenue: { type: Number, default: 0 },
}, { _id: false });

const ConversionPathSchema = new Schema<IConversionPath, IConversionPathModel>(
  {
    tenantId: { type: String, required: true, index: true },
    conversionId: { type: String, required: true }, userId: { type: String, required: true },
    touchpoints: [TouchpointSchema], totalRevenue: { type: Number, default: 0 }, conversionDate: { type: Date, required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

ConversionPathSchema.index({ tenantId: 1, conversionDate: -1 });
ConversionPathSchema.index({ tenantId: 1, campaignId: 1 });

ConversionPathSchema.virtual("touchpointCount").get(function (this: IConversionPath) { return this.touchpoints.length; });
ConversionPathSchema.virtual("pathLength").get(function (this: IConversionPath) {
  return this.touchpoints.length >= 2 ? Math.ceil((this.touchpoints[this.touchpoints.length - 1].timestamp.getTime() - this.touchpoints[0].timestamp.getTime()) / 86400000) : 0;
});
ConversionPathSchema.virtual("totalCost").get(function (this: IConversionPath) { return this.touchpoints.reduce((s, t) => s + t.cost, 0); });
ConversionPathSchema.virtual("topCampaigns").get(function (this: IConversionPath) {
  const counts: Record<string, number> = {};
  this.touchpoints.forEach(t => { counts[t.campaignName] = (counts[t.campaignName] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
});
ConversionPathSchema.virtual("conversionEfficiency").get(function (this: IConversionPath) {
  return this.totalCost > 0 ? Math.round((this.totalRevenue / this.totalCost) * 100) / 100 : 0;
});

ConversionPathSchema.methods.computeAttribution = function (method: "first" | "last" | "linear" | "position") {
  const tps = this.touchpoints;
  if (tps.length === 0) return [];
  const grouped: Record<string, { id: string; name: string; tps: ITouchpoint[] }> = {};
  tps.forEach(t => {
    if (!grouped[t.campaignId]) grouped[t.campaignId] = { id: t.campaignId, name: t.campaignName, tps: [] };
    grouped[t.campaignId].tps.push(t);
  });
  return Object.values(grouped).map(g => {
    let attributedRevenue = 0;
    if (method === "first") attributedRevenue = g.tps === tps[0] ? this.totalRevenue : 0;
    else if (method === "last") { const last = tps[tps.length - 1]; attributedRevenue = g.tps.includes(last) ? this.totalRevenue : 0; }
    else if (method === "linear") attributedRevenue = this.totalRevenue * (g.tps.length / tps.length);
    else if (method === "position") { const first = tps[0]; const last = tps[tps.length - 1]; const middle = tps.slice(1, -1); let share = 0; if (g.tps.includes(first)) share += 0.4; if (g.tps.includes(last)) share += 0.4; share += 0.2 * (g.tps.filter(t => middle.includes(t)).length / Math.max(1, middle.length)); attributedRevenue = this.totalRevenue * share; }
    return { campaignId: g.id, campaignName: g.name, attributedRevenue: Math.round(attributedRevenue * 100) / 100 };
  });
};

ConversionPathSchema.methods.addTouchpoint = async function (tp: ITouchpoint): Promise<IConversionPath> {
  this.touchpoints.push(tp);
  return this.save();
};

ConversionPathSchema.statics.findByUser = async function (tenantId: string, userId: string): Promise<IConversionPath[]> {
  return this.find({ tenantId, userId }).sort({ conversionDate: -1 });
};

ConversionPathSchema.statics.getAttributionSummary = async function (tenantId: string, campaignId: string) {
  const paths = await this.find({ tenantId });
  const relevant = paths.filter(p => p.touchpoints.some(t => t.campaignId === campaignId));
  const avgPathLength = relevant.length > 0 ? Math.round(relevant.reduce((s, p) => s + p.pathLength, 0) / relevant.length) : 0;
  const touchpoints = relevant.reduce((s, p) => s + p.touchpoints.length, 0);
  return { totalConversions: relevant.length, totalRevenue: relevant.reduce((s, p) => s + p.totalRevenue, 0), avgPathLength, touchpoints };
};

ConversionPathSchema.statics.getPlatformMix = async function (tenantId: string) {
  const paths = await this.find({ tenantId });
  const mix: Record<string, { touchpoints: number; revenue: number }> = {};
  paths.forEach(p => p.touchpoints.forEach(t => {
    if (!mix[t.platform]) mix[t.platform] = { touchpoints: 0, revenue: 0 };
    mix[t.platform].touchpoints++;
    mix[t.platform].revenue += t.revenue;
  }));
  return Object.entries(mix).map(([platform, v]) => ({ platform, touchpoints: v.touchpoints, totalRevenue: Math.round(v.revenue * 100) / 100 })).sort((a, b) => b.touchpoints - a.touchpoints);
};

export const ConversionPath = mongoose.model<IConversionPath, IConversionPathModel>("ConversionPath", ConversionPathSchema);
