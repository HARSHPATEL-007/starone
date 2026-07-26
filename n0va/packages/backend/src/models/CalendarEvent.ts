import mongoose, { Schema, Document, Model } from "mongoose";

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
  // Virtuals
  durationHours: number;
  isOngoing: boolean;
  isPast: boolean;
  daysUntilStart: number;
}

export interface ICalendarEventModel extends Model<ICalendarEvent> {
  findUpcoming(tenantId: string, days?: number): Promise<ICalendarEvent[]>;
  findByCampaign(tenantId: string, campaignId: string): Promise<ICalendarEvent[]>;
  getTimeline(tenantId: string): Promise<{ month: string; count: number; types: Record<string, number> }[]>;
}

const CalendarEventSchema = new Schema<ICalendarEvent, ICalendarEventModel>(
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
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

CalendarEventSchema.virtual("durationHours").get(function (this: ICalendarEvent) {
  return Math.round((this.endDate.getTime() - this.startDate.getTime()) / 3600000);
});
CalendarEventSchema.virtual("isOngoing").get(function (this: ICalendarEvent) {
  return this.startDate.getTime() <= Date.now() && this.endDate.getTime() >= Date.now();
});
CalendarEventSchema.virtual("isPast").get(function (this: ICalendarEvent) {
  return this.endDate.getTime() < Date.now();
});
CalendarEventSchema.virtual("daysUntilStart").get(function (this: ICalendarEvent) {
  return Math.ceil((this.startDate.getTime() - Date.now()) / 86400000);
});

CalendarEventSchema.statics.findUpcoming = async function (tenantId: string, days = 30): Promise<ICalendarEvent[]> {
  const now = new Date(); const end = new Date(Date.now() + days * 86400000);
  return this.find({ tenantId, startDate: { $gte: now, $lte: end } }).sort({ startDate: 1 });
};
CalendarEventSchema.statics.findByCampaign = async function (tenantId: string, campaignId: string): Promise<ICalendarEvent[]> {
  return this.find({ tenantId, campaignId }).sort({ startDate: 1 });
};
CalendarEventSchema.statics.getTimeline = async function (tenantId: string) {
  const events = await this.find({ tenantId }).sort({ startDate: 1 });
  const byMonth: Record<string, { count: number; types: Record<string, number> }> = {};
  events.forEach(e => {
    const month = `${e.startDate.getFullYear()}-${String(e.startDate.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth[month]) byMonth[month] = { count: 0, types: {} };
    byMonth[month].count++; byMonth[month].types[e.type] = (byMonth[month].types[e.type] || 0) + 1;
  });
  return Object.entries(byMonth).map(([month, v]) => ({ month, count: v.count, types: v.types }));
};

export const CalendarEvent = mongoose.model<ICalendarEvent, ICalendarEventModel>("CalendarEvent", CalendarEventSchema);
