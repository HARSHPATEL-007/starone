import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { budgetOptimizer } from "../services/BudgetOptimizer";
import { creativeOptimizer } from "../services/CreativeOptimizer";
import { ABTest } from "../models/ABTest";
import { EntityRecord } from "../models/EntityRecord";
import { sendSuccess, safeInt } from "./route-utils";
import { AppError } from "../middleware/errorHandler";
import { budgetOptimizationOrchestrator } from "../business-logic/BudgetOptimizationOrchestrator";
import { roasDecompositionOrchestrator } from "../business-logic/ROASDecompositionOrchestrator";

const router = Router();

function isConnected(): boolean { return mongoose.connection.readyState === 1; }
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.post(
  "/budget",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { campaigns, strategy } = req.body;
    const data = campaigns || budgetOptimizer.generateMockCampaigns();
    const plan = budgetOptimizer.optimize(data, strategy || "balanced");
    if (isConnected()) {
      await EntityRecord.create({ tenantId, entityType: "budget_recommendation", data: { strategy: strategy || "balanced", totalCurrentBudget: plan.totalCurrentBudget, totalRecommendedBudget: plan.totalRecommendedBudget, totalChangePercent: plan.totalChangePercent, expectedPortfolioRoas: plan.expectedPortfolioRoas, recommendations: plan.recommendations, createdAt: new Date().toISOString() } });
    }
    const reallocation = plan.recommendations ? plan.recommendations.reduce((acc: any, r: any) => { const dir = (r.recommendedBudget || 0) > (r.currentBudget || 0) ? "increase" : "decrease"; acc[dir] = (acc[dir] || 0) + 1; return acc; }, { increase: 0, decrease: 0 }) : { increase: 0, decrease: 0 };
    sendSuccess(res, plan, { strategy: strategy || "balanced", reallocation, impact: plan.expectedPortfolioRoas ? `Expected portfolio ROAS: ${plan.expectedPortfolioRoas.toFixed(2)}x` : null });
  })
);

router.get(
  "/budget/mock",
  asyncHandler(async (_req: Request, res: Response) => {
    const campaigns = budgetOptimizer.generateMockCampaigns();
    const plans = { conservative: budgetOptimizer.optimize(campaigns, "conservative"), balanced: budgetOptimizer.optimize(campaigns, "balanced"), aggressive: budgetOptimizer.optimize(campaigns, "aggressive") };
    sendSuccess(res, plans, { campaignCount: campaigns.length, strategies: ["conservative", "balanced", "aggressive"] });
  })
);

router.get(
  "/budget/history",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (isConnected()) {
      const history = await EntityRecord.find({ tenantId, entityType: "budget_recommendation" }).sort({ createdAt: -1 }).limit(50).lean();
      return sendSuccess(res, history.map((r: any) => ({ _id: r._id.toString(), ...r.data })), { count: history.length });
    }
    sendSuccess(res, []);
  })
);

router.post(
  "/creative/fatigue",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { creatives } = req.body;
    const data = creatives || creativeOptimizer.generateMockCreatives();
    const analysis = creativeOptimizer.analyzeFatigue(data);
    if (isConnected()) {
      await EntityRecord.create({ tenantId, entityType: "creative_fatigue_report", data: { fatiguedCount: analysis.filter((a: any) => a.isFatigued).length, analysis: analysis.filter((a: any) => a.recommendation !== "none").map((a: any) => ({ creativeName: a.creativeName, recommendation: a.recommendation, urgency: a.urgency, fatigueScore: a.fatigueScore })), createdAt: new Date().toISOString() } });
    }
    const avgFatigue = analysis.length > 0 ? parseFloat((analysis.reduce((s: number, a: any) => s + (a.fatigueScore || 0), 0) / analysis.length).toFixed(1)) : 0;
    const urgentCount = analysis.filter((a: any) => a.urgency === "high" || a.urgency === "critical").length;
    sendSuccess(res, { creatives: data, analysis, fatiguedCount: analysis.filter((a: any) => a.isFatigued).length, avgFatigue, urgentCount, recommendations: analysis.filter((a: any) => a.recommendation !== "none").map((a: any) => ({ creativeName: a.creativeName, recommendation: a.recommendation, urgency: a.urgency, fatigueScore: a.fatigueScore })) });
  })
);

router.get(
  "/creative/mock",
  asyncHandler(async (_req: Request, res: Response) => {
    const creatives = creativeOptimizer.generateMockCreatives();
    const analysis = creativeOptimizer.analyzeFatigue(creatives);
    const avgFatigue = analysis.length > 0 ? parseFloat((analysis.reduce((s: number, a: any) => s + (a.fatigueScore || 0), 0) / analysis.length).toFixed(1)) : 0;
    sendSuccess(res, { creatives, analysis }, { fatiguedCount: analysis.filter((a: any) => a.isFatigued).length, avgFatigue });
  })
);

router.post(
  "/ab-test",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { testName, testType, variants } = req.body;
    if (!testName || !testType || !variants) return res.status(400).json({ error: "testName, testType, and variants required" });
    if (isConnected()) { const test = await ABTest.create({ tenantId, testId: `test_${testType}_${Date.now()}`, testName, testType, status: "running", variants, startedAt: new Date() }); return sendSuccess(res, test, { action: "created" }); }
    sendSuccess(res, { testId: `test_${testType}_${Date.now()}`, testName, testType, status: "running", variants }, { action: "created" });
  })
);

router.get(
  "/ab-test/:type",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const type = req.params.type || "creative";
    if (isConnected()) { const tests = await ABTest.find({ tenantId, testType: type }).sort({ createdAt: -1 }).lean(); if (tests.length > 0) return sendSuccess(res, tests, { type, count: tests.length }); }
    const result = generateMockABTest(type);
    sendSuccess(res, result, { type, count: result.length, generated: true });
  })
);

router.get(
  "/ab-test",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (isConnected()) { const tests = await ABTest.find({ tenantId }).sort({ createdAt: -1 }).limit(50).lean(); return sendSuccess(res, tests, { count: tests.length }); }
    sendSuccess(res, []);
  })
);

router.patch(
  "/ab-test/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    if (isConnected()) { const updated = await ABTest.findOneAndUpdate({ _id: id, tenantId }, { $set: req.body }, { new: true }); if (!updated) return res.status(404).json({ error: "AB test not found" }); return sendSuccess(res, updated); }
    res.status(404).json({ error: "AB test not found" });
  })
);

function generateMockABTest(type: string) {
  const baseImp = 5000 + Math.floor(Math.random() * 5000);
  const variants = type === "creative"
    ? [{ id: "var_a", name: "Control", multiplier: 1 }, { id: "var_b", name: "Emotional Appeal", multiplier: 1.15 + Math.random() * 0.1 }, { id: "var_c", name: "Social Proof", multiplier: 1.1 + Math.random() * 0.15 }, { id: "var_d", name: "Urgency", multiplier: 0.95 + Math.random() * 0.1 }]
    : [{ id: "var_a", name: "Broad Targeting", multiplier: 1 }, { id: "var_b", name: "Interest-based", multiplier: 1.1 + Math.random() * 0.1 }, { id: "var_c", name: "Lookalike 1%", multiplier: 1.2 + Math.random() * 0.1 }, { id: "var_d", name: "Retargeting", multiplier: 1.3 + Math.random() * 0.15 }];
  const baseCvr = 0.02 + Math.random() * 0.02;
  const baseCtr = 0.01 + Math.random() * 0.02;
  const variantData = variants.map((v: any) => { const impressions = Math.round(baseImp * (0.85 + Math.random() * 0.3)); const ctr = baseCtr * v.multiplier * (0.9 + Math.random() * 0.2); const clicks = Math.round(impressions * ctr); const cvr = baseCvr * v.multiplier * (0.85 + Math.random() * 0.3); const conversions = Math.round(clicks * cvr); const spend = Math.round(impressions * 0.005 * (0.8 + Math.random() * 0.4)); const revenue = Math.round(conversions * 45 * (0.8 + Math.random() * 0.4)); return { id: v.id, name: v.name, impressions, clicks, conversions, spend, revenue, ctr: parseFloat(ctr.toFixed(4)), cvr: parseFloat(cvr.toFixed(4)), roas: spend > 0 ? parseFloat((revenue / spend).toFixed(2)) : 0 }; });
  const best = variantData.reduce((a: any, b: any) => (a.cvr > b.cvr ? a : b));
  const confidence = 0.85 + Math.random() * 0.14;
  const recommendation = best.cvr > variantData[0].cvr * 1.15 ? `${best.name} outperforms the control by ${((best.cvr / variantData[0].cvr - 1) * 100).toFixed(1)}% in conversion rate. Recommend scaling ${best.name} to 70% of traffic.` : "No significant winner yet. Continue testing.";
  return [{ testId: `test_${type}_${Date.now()}`, testName: type === "creative" ? "Creative Messaging Test" : "Audience Segmentation Test", status: "completed" as const, confidence: parseFloat(confidence.toFixed(2)), winner: best.id, variants: variantData, recommendation }];
}

router.get(
  "/optimize/portfolio",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const totalBudget = safeInt(req.query.totalBudget, 0);
      const report = await budgetOptimizationOrchestrator.optimize(req.user!.tenantId, totalBudget > 0 ? totalBudget : undefined);
      sendSuccess(res, report);
    } catch (e: any) {
      throw new AppError(400, e.message);
    }
  })
);

router.get(
  "/roas/decompose/:id",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const decomposition = await roasDecompositionOrchestrator.decompose(req.params.id, req.user!.tenantId);
      sendSuccess(res, decomposition);
    } catch (e: any) {
      throw new AppError(404, e.message);
    }
  })
);

export default router;
