import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDoc extends Document {
  tenantId: string;
  campaignId?: string;
  title: string;
  content?: string;
  type: "brief" | "report" | "strategy" | "analysis" | "other";
  source: "n0va" | "external";
  externalUrl?: string;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  // Virtuals
  contentLength: number;
  hasContent: boolean;
  tagCount: number;
}

export interface IDocModel extends Model<IDoc> {
  findByCampaign(tenantId: string, campaignId: string): Promise<IDoc[]>;
  findByTag(tenantId: string, tag: string): Promise<IDoc[]>;
  getTypeBreakdown(tenantId: string): Promise<{ type: string; count: number; avgLength: number }[]>;
}

const DocSchema = new Schema<IDoc, IDocModel>(
  {
    tenantId: { type: String, required: true, index: true },
    campaignId: { type: String, index: true },
    title: { type: String, required: true },
    content: { type: String },
    type: { type: String, enum: ["brief", "report", "strategy", "analysis", "other"], default: "other" },
    source: { type: String, enum: ["n0va", "external"], default: "n0va" },
    externalUrl: { type: String },
    tags: [{ type: String }],
    createdBy: { type: String, required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

DocSchema.virtual("contentLength").get(function (this: IDoc) { return (this.content || "").length; });
DocSchema.virtual("hasContent").get(function (this: IDoc) { return !!this.content && this.content.trim().length > 0; });
DocSchema.virtual("tagCount").get(function (this: IDoc) { return (this.tags || []).length; });

DocSchema.statics.findByCampaign = async function (tenantId: string, campaignId: string): Promise<IDoc[]> {
  return this.find({ tenantId, campaignId }).sort({ updatedAt: -1 });
};
DocSchema.statics.findByTag = async function (tenantId: string, tag: string): Promise<IDoc[]> {
  return this.find({ tenantId, tags: tag }).sort({ updatedAt: -1 });
};
DocSchema.statics.getTypeBreakdown = async function (tenantId: string) {
  return this.aggregate<{ type: string; count: number; avgLength: number }>([
    { $match: { tenantId } }, { $group: { _id: "$type", count: { $sum: 1 }, avgLength: { $avg: { $strLenCP: { $ifNull: ["$content", ""] } } } } },
    { $project: { _id: 0, type: "$_id", count: 1, avgLength: { $round: ["$avgLength", 0] } } }, { $sort: { count: -1 } },
  ]);
};

export const Doc = mongoose.model<IDoc, IDocModel>("Doc", DocSchema);
