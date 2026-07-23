import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  tenantId: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "analyst" | "viewer";
  avatar?: string;
  preferences: Record<string, unknown>;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    tenantId: { type: String, required: true, index: true },
    email: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ["admin", "manager", "analyst", "viewer"], default: "viewer" },
    avatar: { type: String },
    preferences: { type: Schema.Types.Mixed, default: {} },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", UserSchema);
