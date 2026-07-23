import mongoose, { Schema, Document } from "mongoose";
import { CreativeStatus } from "../types";

export interface ICreative extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  type: "image" | "video" | "carousel" | "text";
  status: CreativeStatus;
  platformVariants: Map<string, {
    url: string;
    dimensions: string;
    platform: string;
  }>;
  assetUrl?: string;
  headline?: string;
  body?: string;
  cta?: string;
  tags: string[];
  performance: {
    impressions: number;
    clicks: number;
    ctr: number;
  };
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CreativeSchema = new Schema<ICreative>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["image", "video", "carousel", "text"],
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(CreativeStatus),
      default: CreativeStatus.Draft,
    },
    platformVariants: { type: Map, of: Schema.Types.Mixed, default: new Map() },
    assetUrl: String,
    headline: String,
    body: String,
    cta: String,
    tags: [{ type: String }],
    performance: {
      impressions: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      ctr: { type: Number, default: 0 },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

CreativeSchema.index({ tenantId: 1, status: 1 });
CreativeSchema.index({ tenantId: 1, type: 1 });

export const Creative = mongoose.model<ICreative>("Creative", CreativeSchema);
