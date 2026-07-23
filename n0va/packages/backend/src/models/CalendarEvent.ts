import mongoose, { Schema, Document } from "mongoose";

export interface ICalendarEvent extends Document {
  tenantId: string;
  campaignId?: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  type: "review" | "launch" | "meeting" | "deadline" | "milestone" | "other";
  source: "n0va" | "external";
  externalUrl?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const CalendarEventSchema = new Schema<ICalendarEvent>(
  {
    tenantId: { type: String, required: true, index: true },
    campaignId: { type: String, index: true },
    title: { type: String, required: true },
    description: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    type: { type: String, enum: ["review", "launch", "meeting", "deadline", "milestone", "other"], default: "other" },
    source: { type: String, enum: ["n0va", "external"], default: "n0va" },
    externalUrl: { type: String },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

export const CalendarEvent = mongoose.model<ICalendarEvent>("CalendarEvent", CalendarEventSchema);
