import mongoose, { Schema, Document } from "mongoose";

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
}

const DocSchema = new Schema<IDoc>(
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
  { timestamps: true }
);

export const Doc = mongoose.model<IDoc>("Doc", DocSchema);
