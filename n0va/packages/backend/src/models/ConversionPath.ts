import mongoose, { Schema, Document } from "mongoose";

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
}

const TouchpointSchema = new Schema<ITouchpoint>({
  id: { type: String, required: true },
  campaignId: { type: String, required: true },
  campaignName: { type: String, required: true },
  platform: { type: String, required: true },
  channel: { type: String, required: true },
  timestamp: { type: Date, required: true },
  type: { type: String, enum: ["impression", "click", "view_through", "engagement", "conversion"], required: true },
  weight: { type: Number, default: 0 },
  cost: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
}, { _id: false });

const ConversionPathSchema = new Schema<IConversionPath>(
  {
    tenantId: { type: String, required: true, index: true },
    conversionId: { type: String, required: true },
    userId: { type: String, required: true },
    touchpoints: [TouchpointSchema],
    totalRevenue: { type: Number, default: 0 },
    conversionDate: { type: Date, required: true },
  },
  { timestamps: true }
);

ConversionPathSchema.index({ tenantId: 1, conversionDate: -1 });
ConversionPathSchema.index({ tenantId: 1, campaignId: 1 });

export const ConversionPath = mongoose.model<IConversionPath>("ConversionPath", ConversionPathSchema);
