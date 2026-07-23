import mongoose, { Schema, Document } from "mongoose";

export interface IAudience extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  type: "lookalike" | "retargeting" | "custom" | "saved";
  platform: string;
  size: number;
  criteria: Record<string, unknown>;
  performance: {
    impressions: number;
    conversions: number;
    spend: number;
    revenue: number;
    roas: number;
  };
  status: "active" | "paused" | "building";
  tags: string[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AudienceSchema = new Schema<IAudience>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    name: { type: String, required: true },
    description: String,
    type: {
      type: String,
      enum: ["lookalike", "retargeting", "custom", "saved"],
      required: true,
    },
    platform: { type: String, required: true },
    size: { type: Number, default: 0 },
    criteria: { type: Schema.Types.Mixed, default: {} },
    performance: {
      impressions: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
      spend: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 },
      roas: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ["active", "paused", "building"],
      default: "active",
    },
    tags: [{ type: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

AudienceSchema.index({ tenantId: 1, platform: 1 });
AudienceSchema.index({ tenantId: 1, type: 1, status: 1 });

export const Audience = mongoose.model<IAudience>("Audience", AudienceSchema);
