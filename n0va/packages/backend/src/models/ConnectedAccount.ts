import mongoose, { Schema, Document, Model } from "mongoose";

export interface IConnectedAccount extends Document {
  tenantId: mongoose.Types.ObjectId;
  platform: string;
  label: string;
  status: "active" | "error" | "expired" | "pending";
  credentials: { accessToken: string; refreshToken?: string; expiresAt?: Date; scopes: string[] };
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  // Virtuals
  isExpired: boolean;
  daysUntilExpiry: number;
  needsRefresh: boolean;
  scopeCount: number;
  // Methods
  markError(error: string): Promise<IConnectedAccount>;
  markExpired(): Promise<IConnectedAccount>;
}

export interface IConnectedAccountModel extends Model<IConnectedAccount> {
  findActiveByPlatform(tenantId: string, platform: string): Promise<IConnectedAccount[]>;
  getPlatformSummary(tenantId: string): Promise<{ platform: string; total: number; active: number; error: number }[]>;
}

const ConnectedAccountSchema = new Schema<IConnectedAccount, IConnectedAccountModel>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    platform: { type: String, required: true },
    label: { type: String, required: true },
    status: { type: String, enum: ["active", "error", "expired", "pending"], default: "pending" },
    credentials: { accessToken: { type: String, required: true, select: false }, refreshToken: { type: String, select: false }, expiresAt: Date, scopes: [{ type: String }] },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

ConnectedAccountSchema.index({ tenantId: 1, platform: 1 });
ConnectedAccountSchema.index({ tenantId: 1, status: 1 });

ConnectedAccountSchema.virtual("isExpired").get(function (this: IConnectedAccount) {
  return !!this.credentials.expiresAt && new Date(this.credentials.expiresAt).getTime() < Date.now();
});
ConnectedAccountSchema.virtual("daysUntilExpiry").get(function (this: IConnectedAccount) {
  if (!this.credentials.expiresAt) return -1;
  return Math.ceil((new Date(this.credentials.expiresAt).getTime() - Date.now()) / 86400000);
});
ConnectedAccountSchema.virtual("needsRefresh").get(function (this: IConnectedAccount) {
  return this.daysUntilExpiry >= 0 && this.daysUntilExpiry <= 7;
});
ConnectedAccountSchema.virtual("scopeCount").get(function (this: IConnectedAccount) {
  return (this.credentials.scopes || []).length;
});

ConnectedAccountSchema.methods.markError = async function (error: string): Promise<IConnectedAccount> {
  this.status = "error";
  this.metadata = { ...this.metadata, lastError: error, errorAt: new Date().toISOString() };
  return this.save();
};
ConnectedAccountSchema.methods.markExpired = async function (): Promise<IConnectedAccount> {
  this.status = "expired";
  return this.save();
};

ConnectedAccountSchema.statics.findActiveByPlatform = async function (tenantId: string, platform: string): Promise<IConnectedAccount[]> {
  return this.find({ tenantId: new mongoose.Types.ObjectId(tenantId), platform, status: "active" });
};
ConnectedAccountSchema.statics.getPlatformSummary = async function (tenantId: string) {
  return this.aggregate<{ platform: string; total: number; active: number; error: number }>([
    { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
    { $group: { _id: "$platform", total: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } }, error: { $sum: { $cond: [{ $eq: ["$status", "error"] }, 1, 0] } } } },
    { $project: { _id: 0, platform: "$_id", total: 1, active: 1, error: 1 } },
    { $sort: { total: -1 } },
  ]);
};

export const ConnectedAccountModel = mongoose.model<IConnectedAccount, IConnectedAccountModel>("ConnectedAccount", ConnectedAccountSchema);
