import mongoose, { Schema, Document, Model } from "mongoose";

export interface IABVariant {
  id: string;
  name: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  ctr: number;
  cvr: number;
  roas: number;
}

export interface IABTest extends Document {
  tenantId: string;
  testId: string;
  testName: string;
  testType: "creative" | "audience" | "landing_page" | "offer";
  status: "running" | "paused" | "completed";
  confidence: number;
  winner?: string;
  variants: IABVariant[];
  recommendation?: string;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Virtuals
  duration: number;
  totalImpressions: number;
  totalConversions: number;
  totalSpend: number;
  totalRevenue: number;
  // Methods
  computeSignificance(): number;
  determineWinner(): { winnerId: string | null; confidence: number };
  getLift(metric?: "cvr" | "roas" | "ctr"): { variantId: string; lift: number; cvr: number }[];
}

export interface IABTestModel extends Model<IABTest> {
  findRunningTests(tenantId: string): Promise<IABTest[]>;
  getTestSummary(tenantId: string): Promise<{ total: number; running: number; completed: number; withWinner: number }>;
  getTopVariants(tenantId: string, metric?: "cvr" | "roas", limit?: number): Promise<{ testName: string; variantName: string; cvr: number; roas: number; impressions: number }[]>;
}

const ABVariantSchema = new Schema<IABVariant>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
  spend: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  ctr: { type: Number, default: 0 },
  cvr: { type: Number, default: 0 },
  roas: { type: Number, default: 0 },
}, { _id: false });

const ABTestSchema = new Schema<IABTest, IABTestModel>(
  {
    tenantId: { type: String, required: true, index: true },
    testId: { type: String, required: true },
    testName: { type: String, required: true },
    testType: { type: String, enum: ["creative", "audience", "landing_page", "offer"], required: true },
    status: { type: String, enum: ["running", "paused", "completed"], default: "running" },
    confidence: { type: Number, default: 0 },
    winner: { type: String },
    variants: [ABVariantSchema],
    recommendation: { type: String },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

ABTestSchema.index({ tenantId: 1, status: 1 });
ABTestSchema.index({ tenantId: 1, testType: 1 });

// ─── Virtuals ──────────────────────────────────────────────────────────

ABTestSchema.virtual("duration").get(function (this: IABTest) {
  const end = this.completedAt || new Date();
  return Math.round((end.getTime() - this.startedAt.getTime()) / 86400000);
});

ABTestSchema.virtual("totalImpressions").get(function (this: IABTest) {
  return this.variants.reduce((s, v) => s + v.impressions, 0);
});

ABTestSchema.virtual("totalConversions").get(function (this: IABTest) {
  return this.variants.reduce((s, v) => s + v.conversions, 0);
});

ABTestSchema.virtual("totalSpend").get(function (this: IABTest) {
  return this.variants.reduce((s, v) => s + v.spend, 0);
});

ABTestSchema.virtual("totalRevenue").get(function (this: IABTest) {
  return this.variants.reduce((s, v) => s + v.revenue, 0);
});

// ─── Instance Methods ──────────────────────────────────────────────────

function normalCdf(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

ABTestSchema.methods.computeSignificance = function (): number {
  const variants = this.variants;
  if (variants.length < 2) return 0;
  const control = variants[0];
  const best = variants.slice(1).reduce((max, v) => v.cvr > max.cvr ? v : max, variants[0]);
  if (best.conversions === 0 || control.conversions === 0) return 0;
  const p1 = best.conversions / best.impressions;
  const p2 = control.conversions / control.impressions;
  const se = Math.sqrt(p1 * (1 - p1) / best.impressions + p2 * (1 - p2) / control.impressions);
  if (se === 0) return 0;
  const z = (p1 - p2) / se;
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));
  return Math.round((1 - pValue) * 10000) / 100;
};

ABTestSchema.methods.determineWinner = function (): { winnerId: string | null; confidence: number } {
  this.confidence = this.computeSignificance();
  if (this.confidence >= 95 && this.variants.length >= 2) {
    const best = this.variants.slice(1).reduce((max, v) => v.cvr > max.cvr ? v : max, this.variants[0]);
    this.winner = best.id;
    return { winnerId: best.id, confidence: this.confidence };
  }
  return { winnerId: null, confidence: this.confidence };
};

ABTestSchema.methods.getLift = function (metric: "cvr" | "roas" | "ctr" = "cvr") {
  const control = this.variants[0];
  if (!control) return [];
  const controlValue = metric === "cvr" ? control.cvr : metric === "roas" ? control.roas : control.ctr;
  if (controlValue === 0) return [];
  return this.variants.slice(1).map(v => ({
    variantId: v.id,
    lift: Math.round(((v.cvr - controlValue) / controlValue) * 10000) / 100,
    cvr: v.cvr,
  }));
};

// ─── Statics ───────────────────────────────────────────────────────────

ABTestSchema.statics.findRunningTests = async function (tenantId: string): Promise<IABTest[]> {
  return this.find({ tenantId, status: "running" }).sort({ createdAt: -1 });
};

ABTestSchema.statics.getTestSummary = async function (tenantId: string) {
  const all = await this.find({ tenantId });
  return {
    total: all.length,
    running: all.filter(t => t.status === "running").length,
    completed: all.filter(t => t.status === "completed").length,
    withWinner: all.filter(t => t.status === "completed" && !!t.winner).length,
  };
};

ABTestSchema.statics.getTopVariants = async function (tenantId: string, metric: "cvr" | "roas" = "cvr", limit = 10) {
  const tests = await this.find({ tenantId, status: "completed", winner: { $ne: null } }).sort({ updatedAt: -1 }).limit(50);
  const rows = tests.flatMap(t => {
    const winner = t.variants.find(v => v.id === t.winner);
    return winner ? [{ testName: t.testName, variantName: winner.name, cvr: winner.cvr, roas: winner.roas, impressions: winner.impressions }] : [];
  });
  rows.sort((a, b) => metric === "cvr" ? b.cvr - a.cvr : b.roas - a.roas);
  return rows.slice(0, limit);
};

export const ABTest = mongoose.model<IABTest, IABTestModel>("ABTest", ABTestSchema);
