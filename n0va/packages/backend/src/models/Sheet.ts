import mongoose, { Schema, Document } from "mongoose";

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
}

const SheetSchema = new Schema<ISheet>(
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
  { timestamps: true }
);

export const Sheet = mongoose.model<ISheet>("Sheet", SheetSchema);
