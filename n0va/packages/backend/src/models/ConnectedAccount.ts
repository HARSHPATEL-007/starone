import mongoose, { Schema, Document } from "mongoose";

export interface IConnectedAccount extends Document {
  tenantId: mongoose.Types.ObjectId;
  platform: string;
  label: string;
  status: "active" | "error" | "expired" | "pending";
  credentials: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    scopes: string[];
  };
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ConnectedAccountSchema = new Schema<IConnectedAccount>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    platform: { type: String, required: true },
    label: { type: String, required: true },
    status: {
      type: String,
      enum: ["active", "error", "expired", "pending"],
      default: "pending",
    },
    credentials: {
      accessToken: { type: String, required: true, select: false },
      refreshToken: { type: String, select: false },
      expiresAt: Date,
      scopes: [{ type: String }],
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

ConnectedAccountSchema.index({ tenantId: 1, platform: 1 });
ConnectedAccountSchema.index({ tenantId: 1, status: 1 });

export const ConnectedAccountModel = mongoose.model<IConnectedAccount>(
  "ConnectedAccount",
  ConnectedAccountSchema
);
