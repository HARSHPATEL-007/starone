import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  tenantId: string;
  email: string;
  passwordHash: string;
  name: string;
  role: "admin" | "manager" | "analyst" | "viewer";
  avatar?: string;
  preferences: Record<string, unknown>;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Virtuals
  isAdmin: boolean;
  accountAge: number;
  // Methods
  recordLogin(): Promise<IUser>;
  hasPermission(requiredRole: string): boolean;
}

export interface IUserModel extends Model<IUser> {
  findByTenant(tenantId: string): Promise<IUser[]>;
  getTenantUserSummary(tenantId: string): Promise<{ total: number; byRole: Record<string, number> }>;
}

const UserSchema = new Schema<IUser, IUserModel>(
  {
    tenantId: { type: String, required: true, index: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ["admin", "manager", "analyst", "viewer"], default: "viewer" },
    avatar: { type: String },
    preferences: { type: Schema.Types.Mixed, default: {} },
    lastLogin: { type: Date },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

UserSchema.index({ tenantId: 1, role: 1 });
const ROLE_HIERARCHY: Record<string, number> = { viewer: 1, analyst: 2, manager: 3, admin: 4 };

UserSchema.virtual("isAdmin").get(function (this: IUser) { return this.role === "admin"; });
UserSchema.virtual("accountAge").get(function (this: IUser) { return Math.round((Date.now() - this.createdAt.getTime()) / 86400000); });

UserSchema.methods.recordLogin = async function (): Promise<IUser> {
  this.lastLogin = new Date();
  return this.save();
};
UserSchema.methods.hasPermission = function (requiredRole: string): boolean {
  return ROLE_HIERARCHY[this.role] >= (ROLE_HIERARCHY[requiredRole] || 0);
};

UserSchema.statics.findByTenant = async function (tenantId: string): Promise<IUser[]> {
  return this.find({ tenantId }).sort({ name: 1 });
};
UserSchema.statics.getTenantUserSummary = async function (tenantId: string) {
  const users = await this.find({ tenantId });
  const byRole: Record<string, number> = {};
  users.forEach((u: IUser) => { byRole[u.role] = (byRole[u.role] || 0) + 1; });
  return { total: users.length, byRole };
};

export const User = mongoose.model<IUser, IUserModel>("User", UserSchema);
