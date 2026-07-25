import mongoose, { Schema, Document } from "mongoose";

export interface IEntityRecord extends Document {
  tenantId: string;
  entityType: string;
  data: Record<string, unknown>;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EntityRecordSchema = new Schema<IEntityRecord>(
  {
    tenantId: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    data: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: String },
  },
  { timestamps: true }
);

EntityRecordSchema.index({ tenantId: 1, entityType: 1, createdAt: -1 });
EntityRecordSchema.index({ tenantId: 1, entityType: 1, "data.status": 1 });

export const EntityRecord = mongoose.model<IEntityRecord>("EntityRecord", EntityRecordSchema);
