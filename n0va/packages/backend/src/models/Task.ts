import mongoose, { Schema, Document } from "mongoose";

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
}

const TaskSchema = new Schema<ITask>(
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
  { timestamps: true }
);

export const Task = mongoose.model<ITask>("Task", TaskSchema);
