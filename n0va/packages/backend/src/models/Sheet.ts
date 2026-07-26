import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISheet extends Document {
  tenantId: string;
  campaignId?: string;
  title: string;
  type: "budget" | "performance" | "forecast" | "custom";
  rows: number;
  columns: number;
  source: "n0va" | "external";
  externalUrl?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  // Virtuals
  cellCount: number;
  isLarge: boolean;
  isEmpty: boolean;
}

export interface ISheetModel extends Model<ISheet> {
  findByCampaign(tenantId: string, campaignId: string): Promise<ISheet[]>;
  getTypeBreakdown(tenantId: string): Promise<{ type: string; count: number; totalRows: number }[]>;
}

const SheetSchema = new Schema<ISheet, ISheetModel>(
  {
    tenantId: { type: String, required: true, index: true },
    campaignId: { type: String, index: true },
    title: { type: String, required: true },
    type: { type: String, enum: ["budget", "performance", "forecast", "custom"], default: "custom" },
    rows: { type: Number, default: 0 },
    columns: { type: Number, default: 0 },
    source: { type: String, enum: ["n0va", "external"], default: "n0va" },
    externalUrl: { type: String },
    createdBy: { type: String, required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

SheetSchema.virtual("cellCount").get(function (this: ISheet) { return this.rows * this.columns; });
SheetSchema.virtual("isLarge").get(function (this: ISheet) { return this.cellCount > 10000; });
SheetSchema.virtual("isEmpty").get(function (this: ISheet) { return this.rows === 0 || this.columns === 0; });

SheetSchema.statics.findByCampaign = async function (tenantId: string, campaignId: string): Promise<ISheet[]> {
  return this.find({ tenantId, campaignId }).sort({ updatedAt: -1 });
};
SheetSchema.statics.getTypeBreakdown = async function (tenantId: string) {
  return this.aggregate<{ type: string; count: number; totalRows: number }>([
    { $match: { tenantId } }, { $group: { _id: "$type", count: { $sum: 1 }, totalRows: { $sum: "$rows" } } },
    { $project: { _id: 0, type: "$_id", count: 1, totalRows: 1 } }, { $sort: { count: -1 } },
  ]);
};

export const Sheet = mongoose.model<ISheet, ISheetModel>("Sheet", SheetSchema);
