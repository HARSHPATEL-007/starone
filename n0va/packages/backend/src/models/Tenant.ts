import mongoose, { Schema, Document } from "mongoose";

export interface ITenant extends Document {
  name: string;
  slug: string;
  tier: "starter" | "growth" | "pro" | "enterprise" | "transcendent";
  features: string[];
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    tier: {
      type: String,
      enum: ["starter", "growth", "pro", "enterprise", "transcendent"],
      default: "starter",
    },
    features: [{ type: String }],
    settings: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const Tenant = mongoose.model<ITenant>("Tenant", TenantSchema);
