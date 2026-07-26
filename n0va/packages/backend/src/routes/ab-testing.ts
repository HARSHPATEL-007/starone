import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { MemoryStore } from "../services/MemoryStore";
import { AppError } from "../middleware/errorHandler";
import { ABTest } from "../models/ABTest";
import { ABTestService } from "../services/ABTestService";
import { sendSuccess, safeInt } from "./route-utils";
import { abTestAdvisorOrchestrator } from "../business-logic/ABTestAdvisorOrchestrator";

const router = Router();

function isConnected(): boolean { return mongoose.connection.readyState === 1; }
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}
function mem(): MemoryStore { return MemoryStore.getInstance(); }

router.post(
  "/design",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { testName, testType, variantCount } = req.body;
    if (!testName || !testType) throw new AppError(400, "testName and testType required");
    const advice = await abTestAdvisorOrchestrator.designTest(tenantId, testName, testType, variantCount || 2);
    sendSuccess(res, advice);
  })
);

router.get(
  "/analyze/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const result = await abTestAdvisorOrchestrator.analyzeTest(req.params.id, tenantId);
    if (!result) throw new AppError(404, "AB test not found");
    sendSuccess(res, result);
  })
);

router.get(
  "/portfolio/summary",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const summary = await abTestAdvisorOrchestrator.getPortfolioABTestSummary(tenantId);
    sendSuccess(res, summary);
  })
);

router.get(
  "/significance",
  asyncHandler(async (req: Request, res: Response) => {
    const { controlImpressions, controlConversions, variantImpressions, variantConversions } = req.query;
    if (!controlImpressions || !controlConversions || !variantImpressions || !variantConversions) {
      throw new AppError(400, "controlImpressions, controlConversions, variantImpressions, variantConversions are required");
    }
    const control = { impressions: Number(controlImpressions), conversions: Number(controlConversions) };
    const variant = { impressions: Number(variantImpressions), conversions: Number(variantConversions) };
    const pValue = ABTestService.chiSquaredPValue(control, variant);
    const confidence = parseFloat(((1 - pValue) * 100).toFixed(1));
    const bayesianProb = ABTestService.computeBayesianProbability(control, variant);
    const controlCvr = control.impressions > 0 ? control.conversions / control.impressions : 0;
    const variantCvr = variant.impressions > 0 ? variant.conversions / variant.impressions : 0;
    const uplift = controlCvr > 0 ? ((variantCvr - controlCvr) / controlCvr) * 100 : 0;
    let recommendation = "No significant difference detected.";
    if (confidence > 90 && uplift > 0) recommendation = `Variant shows ${uplift.toFixed(1)}% uplift with ${confidence.toFixed(1)}% confidence. Consider implementing the variant.`;
    else if (confidence > 90 && uplift < 0) recommendation = `Control outperforms variant by ${Math.abs(uplift).toFixed(1)}%. Stick with control.`;
    else recommendation = `Only ${confidence.toFixed(1)}% confidence. Continue test until 90%+ confidence is reached.`;
    sendSuccess(res, { pValue: parseFloat(pValue.toFixed(6)), confidence, bayesianProbability: parseFloat(bayesianProb.toFixed(4)), uplift: parseFloat(uplift.toFixed(2)), recommendation });
  })
);

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { type, status } = req.query;
    if (isConnected()) {
      const filter: Record<string, any> = { tenantId };
      if (type) filter.testType = type;
      if (status) filter.status = status;
      const tests = await ABTest.find(filter).sort({ createdAt: -1 }).lean();
      const totalImpressions = tests.reduce((s, t: any) => s + (t.variants || []).reduce((s2: number, v: any) => s2 + (v.impressions || 0), 0), 0);
      const withWinner = tests.filter((t: any) => !!t.winner).length;
      return sendSuccess(res, tests, { total: tests.length, totalImpressions, withWinner, running: tests.filter((t: any) => t.status === "running").length });
    }
    const all = mem().find("ab_tests", (t: any) => t.tenantId === tenantId);
    const filtered = all.filter((t: any) => { if (type && t.testType !== type) return false; if (status && t.status !== status) return false; return true; });
    const running = filtered.filter((t: any) => t.status === "running").length;
    sendSuccess(res, filtered, { total: filtered.length, running, withWinner: filtered.filter((t: any) => t.winner).length });
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { testName, testType, variants } = req.body;
    if (!testName || !testType || !variants || !Array.isArray(variants) || variants.length < 2) throw new AppError(400, "testName, testType, and variants array (min 2) required");
    const enrichedVariants = variants.map((v: any, i: number) => ({ id: v.id || `var_${v.name.toLowerCase().replace(/\s+/g, "_")}_${i + 1}`, name: v.name, impressions: v.impressions || 0, clicks: v.clicks || 0, conversions: v.conversions || 0, spend: v.spend || 0, revenue: v.revenue || 0, ctr: v.ctr || 0, cvr: v.cvr || 0, roas: v.roas || 0 }));
    const data = { tenantId, testId: `test_${testType}_${Date.now()}`, testName, testType, status: "running", confidence: 0, variants: enrichedVariants, recommendation: "", startedAt: new Date() };
    if (isConnected()) { const test = await ABTest.create(data); return sendSuccess(res, test, { action: "created" }); }
    const saved = mem().insert("ab_tests", data);
    sendSuccess(res, saved, { action: "created" });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    if (isConnected()) {
      const test = await ABTest.findOne({ _id: id, tenantId }).lean();
      if (!test) throw new AppError(404, "AB test not found");
      return sendSuccess(res, test);
    }
    const test = mem().findOne("ab_tests", (t: any) => (t._id === id || t.testId === id) && t.tenantId === tenantId);
    if (!test) throw new AppError(404, "AB test not found");
    const totalImp = (test.variants || []).reduce((s: number, v: any) => s + (v.impressions || 0), 0);
    const totalConv = (test.variants || []).reduce((s: number, v: any) => s + (v.conversions || 0), 0);
    sendSuccess(res, test, { totalImpressions: totalImp, totalConversions: totalConv, duration: test.completedAt ? Math.round((new Date(test.completedAt).getTime() - new Date(test.startedAt).getTime()) / 86400000) : Math.round((Date.now() - new Date(test.startedAt).getTime()) / 86400000) });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const updates = req.body;
    if (updates.status === "completed" || updates.variants) {
      let test: any;
      if (isConnected()) { test = await ABTest.findOne({ _id: id, tenantId }).lean(); }
      else { test = mem().findOne("ab_tests", (t: any) => (t._id === id || t.testId === id) && t.tenantId === tenantId); }
      if (!test) throw new AppError(404, "AB test not found");
      const variants = updates.variants || test.variants;
      if (variants && variants.length >= 2 && variants.every((v: any) => typeof v.impressions === "number" && typeof v.conversions === "number")) {
        const sig = ABTestService.computeSignificance(variants);
        const bayesianProb = ABTestService.computeBayesianProbability(variants[0], variants[1]);
        updates.confidence = sig.confidence; updates.winner = sig.winner; updates.recommendation = ABTestService.generateRecommendation(variants, sig.winner, sig.confidence);
        updates.bayesianProbability = parseFloat(bayesianProb.toFixed(4)); updates.uplift = sig.uplift;
        if (updates.status === "completed") updates.completedAt = new Date();
      }
    }
    if (isConnected()) {
      const updated = await ABTest.findOneAndUpdate({ _id: id, tenantId }, { $set: updates }, { new: true });
      if (!updated) throw new AppError(404, "AB test not found");
      return sendSuccess(res, updated);
    }
    const updated = mem().update("ab_tests", (t: any) => (t._id === id || t.testId === id) && t.tenantId === tenantId, updates);
    if (!updated) throw new AppError(404, "AB test not found");
    sendSuccess(res, updated);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    if (isConnected()) { const deleted = await ABTest.findOneAndDelete({ _id: id, tenantId }); if (!deleted) throw new AppError(404, "AB test not found"); return res.status(204).send(); }
    const ok = mem().delete("ab_tests", (t: any) => (t._id === id || t.testId === id) && t.tenantId === tenantId);
    if (!ok) throw new AppError(404, "AB test not found");
    res.status(204).send();
  })
);

router.post(
  "/:id/end",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    let test: any;
    if (isConnected()) {
      test = await ABTest.findOne({ _id: id, tenantId });
      if (!test) throw new AppError(404, "AB test not found");
      const variants = test.variants.map((v: any) => v.toObject ? v.toObject() : v);
      if (variants.length >= 2) {
        const sig = ABTestService.computeSignificance(variants);
        const bayesianProb = ABTestService.computeBayesianProbability(variants[0], variants[1]);
        test.status = "completed"; test.completedAt = new Date(); test.confidence = sig.confidence; test.winner = sig.winner;
        test.bayesianProbability = parseFloat(bayesianProb.toFixed(4)); test.pValues = sig.pValues; test.uplift = sig.uplift;
        test.recommendation = ABTestService.generateRecommendation(variants, sig.winner, sig.confidence);
        await test.save();
      } else { test.status = "completed"; test.completedAt = new Date(); await test.save(); }
      return sendSuccess(res, test);
    }
    test = mem().findOne("ab_tests", (t: any) => (t._id === id || t.testId === id) && t.tenantId === tenantId);
    if (!test) throw new AppError(404, "AB test not found");
    const variants = test.variants || [];
    const update: Record<string, any> = { status: "completed", completedAt: new Date() };
    if (variants.length >= 2) {
      const sig = ABTestService.computeSignificance(variants);
      const bayesianProb = ABTestService.computeBayesianProbability(variants[0], variants[1]);
      update.confidence = sig.confidence; update.winner = sig.winner; update.bayesianProbability = parseFloat(bayesianProb.toFixed(4));
      update.pValues = sig.pValues; update.uplift = sig.uplift; update.recommendation = ABTestService.generateRecommendation(variants, sig.winner, sig.confidence);
    }
    const updated = mem().update("ab_tests", (t: any) => (t._id === id || t.testId === id) && t.tenantId === tenantId, update);
    sendSuccess(res, updated);
  })
);

export default router;
