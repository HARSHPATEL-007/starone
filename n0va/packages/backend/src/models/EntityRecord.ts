import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEntityRecord extends Document {
  tenantId: string;
  entityType: string;
  data: Record<string, unknown>;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  // Virtuals
  dataFieldCount: number;
  hasStatusField: boolean;
  statusValue: string | null;
}

export interface IEntityRecordModel extends Model<IEntityRecord> {
  findByType(tenantId: string, entityType: string): Promise<IEntityRecord[]>;
  getTypeSummary(tenantId: string): Promise<{ entityType: string; count: number; lastCreated: Date }[]>;
}

const EntityRecordSchema = new Schema<IEntityRecord, IEntityRecordModel>(
  {
    tenantId: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    data: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: String },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

EntityRecordSchema.index({ tenantId: 1, entityType: 1, createdAt: -1 });
EntityRecordSchema.index({ tenantId: 1, entityType: 1, "data.status": 1 });

EntityRecordSchema.virtual("dataFieldCount").get(function (this: IEntityRecord) { return Object.keys(this.data || {}).length; });
EntityRecordSchema.virtual("hasStatusField").get(function (this: IEntityRecord) { return typeof (this.data as Record<string, unknown>)?.status === "string"; });
EntityRecordSchema.virtual("statusValue").get(function (this: IEntityRecord) { return (this.data as Record<string, unknown>)?.status as string ?? null; });

EntityRecordSchema.statics.findByType = async function (tenantId: string, entityType: string): Promise<IEntityRecord[]> {
  return this.find({ tenantId, entityType }).sort({ createdAt: -1 });
};
EntityRecordSchema.statics.getTypeSummary = async function (tenantId: string) {
  return this.aggregate<{ entityType: string; count: number; lastCreated: Date }>([
    { $match: { tenantId } }, { $group: { _id: "$entityType", count: { $sum: 1 }, lastCreated: { $max: "$createdAt" } } },
    { $project: { _id: 0, entityType: "$_id", count: 1, lastCreated: 1 } }, { $sort: { count: -1 } },
  ]);
};

export const EntityRecord = mongoose.model<IEntityRecord, IEntityRecordModel>("EntityRecord", EntityRecordSchema);
