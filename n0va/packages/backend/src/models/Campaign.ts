import mongoose, { Schema, Document, Model } from "mongoose";
import { CampaignStatus, CampaignType, BudgetAllocation } from "../types";

export interface ICampaign extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  description?: string;
  budget: BudgetAllocation;
  platforms: string[];
  audiences: mongoose.Types.ObjectId[];
  creatives: mongoose.Types.ObjectId[];
  startDate?: Date;
  endDate?: Date;
  goal?: string;
  kpis: Record<string, number>;
  tags: string[];
  hyperContext: { linkedTasks: mongoose.Types.ObjectId[]; linkedDocs: mongoose.Types.ObjectId[]; linkedSheets: mongoose.Types.ObjectId[]; linkedCalendar: mongoose.Types.ObjectId[] };
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  // Virtuals
  budgetUtilization: number;
  daysRemaining: number;
  isActive: boolean;
  isOverBudget: boolean;
  spendRate: number;
  // Methods
  updateBudgetSpend(amount: number): Promise<ICampaign>;
  computeHealthScore(): number;
  canActivate(): { allowed: boolean; reasons: string[] };
}

export interface ICampaignModel extends Model<ICampaign> {
  findActiveByTenant(tenantId: string): Promise<ICampaign[]>;
  getPortfolioSummary(tenantId: string): Promise<{ totalCampaigns: number; activeCount: number; totalBudget: number; totalSpent: number; utilization: number }>;
  findOverBudget(tenantId: string): Promise<ICampaign[]>;
  getBudgetForecast(tenantId: string): Promise<{ campaignId: string; name: string; projectedUtilization: number; willOverspend: boolean }[]>;
}

const CampaignSchema = new Schema<ICampaign, ICampaignModel>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, enum: Object.values(CampaignType), default: CampaignType.Performance },
    status: { type: String, enum: Object.values(CampaignStatus), default: CampaignStatus.Draft },
    description: String,
    budget: {
      daily: { type: Number, default: 0 },
      lifetime: { type: Number, default: 0 },
      currency: { type: String, default: "USD" },
      spent: { type: Number, default: 0 },
      remaining: { type: Number, default: 0 },
    },
    platforms: [{ type: String }],
    audiences: [{ type: Schema.Types.ObjectId, ref: "Audience" }],
    creatives: [{ type: Schema.Types.ObjectId, ref: "Creative" }],
    startDate: Date, endDate: Date, goal: String,
    kpis: { type: Schema.Types.Mixed, default: {} },
    tags: [{ type: String }],
    hyperContext: { linkedTasks: [{ type: Schema.Types.ObjectId, ref: "Task" }], linkedDocs: [{ type: Schema.Types.ObjectId, ref: "Doc" }], linkedSheets: [{ type: Schema.Types.ObjectId, ref: "Sheet" }], linkedCalendar: [{ type: Schema.Types.ObjectId, ref: "Calendar" }] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

CampaignSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
CampaignSchema.index({ tenantId: 1, type: 1 });

// ─── Virtuals ──────────────────────────────────────────────────────────

CampaignSchema.virtual("budgetUtilization").get(function (this: ICampaign) {
  return this.budget.lifetime > 0 ? Math.round((this.budget.spent / this.budget.lifetime) * 10000) / 100 : 0;
});

CampaignSchema.virtual("daysRemaining").get(function (this: ICampaign) {
  if (!this.endDate) return -1;
  const days = Math.ceil((new Date(this.endDate).getTime() - Date.now()) / 86400000);
  return Math.max(0, days);
});

CampaignSchema.virtual("isActive").get(function (this: ICampaign) {
  return this.status === CampaignStatus.Active;
});

CampaignSchema.virtual("isOverBudget").get(function (this: ICampaign) {
  return this.budget.spent > this.budget.lifetime;
});

CampaignSchema.virtual("spendRate").get(function (this: ICampaign) {
  const daysSinceStart = Math.max(1, (Date.now() - (this.startDate?.getTime() || Date.now())) / 86400000);
  return Math.round((this.budget.spent / daysSinceStart) * 100) / 100;
});

// ─── Pre-save Hook ─────────────────────────────────────────────────────

CampaignSchema.pre<ICampaign>("save", function (next) {
  this.budget.remaining = Math.max(0, this.budget.lifetime - this.budget.spent);
  next();
});

// ─── Instance Methods ──────────────────────────────────────────────────

CampaignSchema.methods.updateBudgetSpend = async function (amount: number): Promise<ICampaign> {
  this.budget.spent += amount;
  this.budget.remaining = Math.max(0, this.budget.lifetime - this.budget.spent);
  return this.save();
};

CampaignSchema.methods.computeHealthScore = function (): number {
  const util = this.budgetUtilization;
  const hasDates = !!this.startDate && !!this.endDate;
  const isActive = this.isActive;
  const hasPlatforms = (this.platforms || []).length > 0;
  const hasCreatives = (this.creatives || []).length > 0;

  let score = 50;
  if (isActive) score += 15;
  if (util > 10 && util < 90) score += 10;
  if (hasDates) score += 5;
  if (hasPlatforms) score += 10;
  if (hasCreatives) score += 10;
  return Math.min(100, Math.max(0, score));
};

CampaignSchema.methods.canActivate = function (): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!this.name || this.name.trim().length === 0) reasons.push("Campaign must have a name.");
  if ((this.platforms || []).length === 0) reasons.push("Campaign must have at least one platform.");
  if (this.budget.lifetime <= 0) reasons.push("Campaign must have a lifetime budget > 0.");
  if (!this.startDate) reasons.push("Campaign must have a start date.");
  if (!this.endDate) reasons.push("Campaign must have an end date.");
  if (this.endDate && this.startDate && this.endDate <= this.startDate) reasons.push("End date must be after start date.");
  return { allowed: reasons.length === 0, reasons };
};

// ─── Statics ───────────────────────────────────────────────────────────

CampaignSchema.statics.findActiveByTenant = async function (tenantId: string): Promise<ICampaign[]> {
  return this.find({ tenantId: new mongoose.Types.ObjectId(tenantId), status: CampaignStatus.Active }).sort({ createdAt: -1 });
};

CampaignSchema.statics.getPortfolioSummary = async function (tenantId: string) {
  const campaigns = await this.find({ tenantId: new mongoose.Types.ObjectId(tenantId) });
  return {
    totalCampaigns: campaigns.length,
    activeCount: campaigns.filter((c: ICampaign) => c.status === CampaignStatus.Active).length,
    totalBudget: campaigns.reduce((s: number, c: ICampaign) => s + c.budget.lifetime, 0),
    totalSpent: campaigns.reduce((s: number, c: ICampaign) => s + c.budget.spent, 0),
    utilization: campaigns.reduce((s: number, c: ICampaign) => s + c.budget.lifetime, 0) > 0
      ? Math.round((campaigns.reduce((s: number, c: ICampaign) => s + c.budget.spent, 0) / campaigns.reduce((s: number, c: ICampaign) => s + c.budget.lifetime, 0)) * 10000) / 100
      : 0,
  };
};

CampaignSchema.statics.findOverBudget = async function (tenantId: string): Promise<ICampaign[]> {
  return this.find({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    "budget.spent": { $gt: 0 },
    $expr: { $gt: ["$budget.spent", "$budget.lifetime"] },
  });
};

CampaignSchema.statics.getBudgetForecast = async function (tenantId: string) {
  const campaigns = await this.find({ tenantId: new mongoose.Types.ObjectId(tenantId), status: CampaignStatus.Active });
  return campaigns.map((c: ICampaign) => {
    const elapsed = Math.max(1, (Date.now() - (c.startDate?.getTime() || Date.now())) / 86400000);
    const dailyRate = c.budget.spent / elapsed;
    const remaining = (c.endDate ? Math.max(0, (new Date(c.endDate).getTime() - Date.now()) / 86400000) : 30);
    const projected = c.budget.spent + dailyRate * remaining;
    return { campaignId: c._id.toString(), name: c.name, projectedUtilization: Math.round((projected / c.budget.lifetime) * 10000) / 100, willOverspend: projected > c.budget.lifetime };
  });
};

export const Campaign = mongoose.model<ICampaign, ICampaignModel>("Campaign", CampaignSchema);
