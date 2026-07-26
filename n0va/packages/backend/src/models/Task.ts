import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITask extends Document {
  tenantId: string;
  campaignId?: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  assignee?: string;
  dueDate?: Date;
  source: "n0va" | "external";
  externalUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  // Virtuals
  isOverdue: boolean;
  dueIn: number;
  priorityScore: number;
  isComplete: boolean;
  // Methods
  complete(): Promise<ITask>;
}

export interface ITaskModel extends Model<ITask> {
  findOverdue(tenantId: string): Promise<ITask[]>;
  getCampaignTaskSummary(campaignId: string): Promise<{ total: number; done: number; inProgress: number; todo: number; cancelled: number }>;
  getPriorityBreakdown(tenantId: string): Promise<{ priority: string; count: number }[]>;
}

const PRIORITY_ORDER: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };

const TaskSchema = new Schema<ITask, ITaskModel>(
  {
    tenantId: { type: String, required: true, index: true },
    campaignId: { type: String, index: true },
    title: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ["todo", "in_progress", "done", "cancelled"], default: "todo" },
    priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    assignee: { type: String },
    dueDate: { type: Date },
    source: { type: String, enum: ["n0va", "external"], default: "n0va" },
    externalUrl: { type: String },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

TaskSchema.virtual("isOverdue").get(function (this: ITask) {
  return !!this.dueDate && new Date(this.dueDate).getTime() < Date.now() && this.status !== "done" && this.status !== "cancelled";
});
TaskSchema.virtual("dueIn").get(function (this: ITask) {
  if (!this.dueDate) return -1;
  return Math.ceil((new Date(this.dueDate).getTime() - Date.now()) / 86400000);
});
TaskSchema.virtual("priorityScore").get(function (this: ITask) { return PRIORITY_ORDER[this.priority] ?? 0; });
TaskSchema.virtual("isComplete").get(function (this: ITask) { return this.status === "done" || this.status === "cancelled"; });

TaskSchema.methods.complete = async function (): Promise<ITask> {
  this.status = "done";
  return this.save();
};

TaskSchema.statics.findOverdue = async function (tenantId: string): Promise<ITask[]> {
  return this.find({ tenantId, dueDate: { $lt: new Date() }, status: { $nin: ["done", "cancelled"] } }).sort({ dueDate: 1 });
};
TaskSchema.statics.getCampaignTaskSummary = async function (campaignId: string) {
  const tasks = await this.find({ campaignId });
  return { total: tasks.length, done: tasks.filter((t: ITask) => t.status === "done").length, inProgress: tasks.filter((t: ITask) => t.status === "in_progress").length, todo: tasks.filter((t: ITask) => t.status === "todo").length, cancelled: tasks.filter((t: ITask) => t.status === "cancelled").length };
};
TaskSchema.statics.getPriorityBreakdown = async function (tenantId: string) {
  return this.aggregate<{ priority: string; count: number }>([{ $match: { tenantId } }, { $group: { _id: "$priority", count: { $sum: 1 } } }, { $project: { _id: 0, priority: "$_id", count: 1 } }, { $sort: { count: -1 } }]);
};

export const Task = mongoose.model<ITask, ITaskModel>("Task", TaskSchema);
