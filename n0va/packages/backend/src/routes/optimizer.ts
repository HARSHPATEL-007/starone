import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { budgetOptimizer } from "../services/BudgetOptimizer";
import { creativeOptimizer } from "../services/CreativeOptimizer";
import { ABTest } from "../models/ABTest";
import { EntityRecord } from "../models/EntityRecord";

const router = Router();

function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

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
      await EntityRecord.create({
        tenantId,
        entityType: "budget_recommendation",
        data: {
          strategy: strategy || "balanced",
          totalCurrentBudget: plan.totalCurrentBudget,
          totalRecommendedBudget: plan.totalRecommendedBudget,
          totalChangePercent: plan.totalChangePercent,
          expectedPortfolioRoas: plan.expectedPortfolioRoas,
          recommendations: plan.recommendations,
          createdAt: new Date().toISOString(),
        },
      });
    }

    res.json(plan);
  })
);

router.get(
  "/budget/mock",
  asyncHandler(async (_req: Request, res: Response) => {
    const campaigns = budgetOptimizer.generateMockCampaigns();
    const plans = {
      conservative: budgetOptimizer.optimize(campaigns, "conservative"),
      balanced: budgetOptimizer.optimize(campaigns, "balanced"),
      aggressive: budgetOptimizer.optimize(campaigns, "aggressive"),
    };
    res.json(plans);
  })
);

router.get(
  "/budget/history",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (isConnected()) {
      const history = await EntityRecord.find({ tenantId, entityType: "budget_recommendation" })
        .sort({ createdAt: -1 }).limit(50).lean();
      return res.json(history.map((r: any) => ({ _id: r._id.toString(), ...r.data })));
    }
    res.json([]);
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
      await EntityRecord.create({
        tenantId,
        entityType: "creative_fatigue_report",
        data: {
          fatiguedCount: analysis.filter((a: any) => a.isFatigued).length,
          analysis: analysis.filter((a: any) => a.recommendation !== "none").map((a: any) => ({
            creativeName: a.creativeName,
            recommendation: a.recommendation,
            urgency: a.urgency,
            fatigueScore: a.fatigueScore,
          })),
          createdAt: new Date().toISOString(),
        },
      });
    }

    res.json({
      creatives: data,
      analysis,
      fatiguedCount: analysis.filter((a: any) => a.isFatigued).length,
      recommendations: analysis.filter((a: any) => a.recommendation !== "none").map((a: any) => ({
        creativeName: a.creativeName,
        recommendation: a.recommendation,
        urgency: a.urgency,
        fatigueScore: a.fatigueScore,
      })),
    });
  })
);

router.get(
  "/creative/mock",
  asyncHandler(async (_req: Request, res: Response) => {
    const creatives = creativeOptimizer.generateMockCreatives();
    const analysis = creativeOptimizer.analyzeFatigue(creatives);
    res.json({ creatives, analysis });
  })
);

router.post(
  "/ab-test",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { testName, testType, variants } = req.body;
    if (!testName || !testType || !variants) {
      return res.status(400).json({ error: "testName, testType, and variants required" });
    }
    if (isConnected()) {
      const test = await ABTest.create({
        tenantId,
        testId: `test_${testType}_${Date.now()}`,
        testName,
        testType,
        status: "running",
        variants,
        startedAt: new Date(),
      });
      return res.status(201).json(test);
    }
    res.status(201).json({ testId: `test_${testType}_${Date.now()}`, testName, testType, status: "running", variants });
  })
);

router.get(
  "/ab-test/:type",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const type = req.params.type || "creative";
    if (isConnected()) {
      const tests = await ABTest.find({ tenantId, testType: type }).sort({ createdAt: -1 }).lean();
      if (tests.length > 0) return res.json(tests);
    }
    const result = generateMockABTest(type);
    res.json(result);
  })
);

router.get(
  "/ab-test",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (isConnected()) {
      const tests = await ABTest.find({ tenantId }).sort({ createdAt: -1 }).limit(50).lean();
      return res.json(tests);
    }
    res.json([]);
  })
);

router.patch(
  "/ab-test/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    if (isConnected()) {
      const updated = await ABTest.findOneAndUpdate(
        { _id: id, tenantId },
        { $set: req.body },
        { new: true }
      );
      if (!updated) return res.status(404).json({ error: "AB test not found" });
      return res.json(updated);
    }
    res.status(404).json({ error: "AB test not found" });
  })
);

function generateMockABTest(type: string) {
  const baseImp = 5000 + Math.floor(Math.random() * 5000);
  const variants = type === "creative"
    ? [
        { id: "var_a", name: "Control", multiplier: 1 },
        { id: "var_b", name: "Emotional Appeal", multiplier: 1.15 + Math.random() * 0.1 },
        { id: "var_c", name: "Social Proof", multiplier: 1.1 + Math.random() * 0.15 },
        { id: "var_d", name: "Urgency", multiplier: 0.95 + Math.random() * 0.1 },
      ]
    : [
        { id: "var_a", name: "Broad Targeting", multiplier: 1 },
        { id: "var_b", name: "Interest-based", multiplier: 1.1 + Math.random() * 0.1 },
        { id: "var_c", name: "Lookalike 1%", multiplier: 1.2 + Math.random() * 0.1 },
        { id: "var_d", name: "Retargeting", multiplier: 1.3 + Math.random() * 0.15 },
      ];

  const baseCvr = 0.02 + Math.random() * 0.02;
  const baseCtr = 0.01 + Math.random() * 0.02;

  const variantData = variants.map((v: any) => {
    const impressions = Math.round(baseImp * (0.85 + Math.random() * 0.3));
    const ctr = baseCtr * v.multiplier * (0.9 + Math.random() * 0.2);
    const clicks = Math.round(impressions * ctr);
    const cvr = baseCvr * v.multiplier * (0.85 + Math.random() * 0.3);
    const conversions = Math.round(clicks * cvr);
    const spend = Math.round(impressions * 0.005 * (0.8 + Math.random() * 0.4));
    const revenue = Math.round(conversions * 45 * (0.8 + Math.random() * 0.4));
    return {
      id: v.id,
      name: v.name,
      impressions,
      clicks,
      conversions,
      spend,
      revenue,
      ctr: parseFloat(ctr.toFixed(4)),
      cvr: parseFloat(cvr.toFixed(4)),
      roas: spend > 0 ? parseFloat((revenue / spend).toFixed(2)) : 0,
    };
  });

  const best = variantData.reduce((a: any, b: any) => (a.cvr > b.cvr ? a : b));
  const confidence = 0.85 + Math.random() * 0.14;

  const recommendation = best.cvr > variantData[0].cvr * 1.15
    ? `${best.name} outperforms the control by ${((best.cvr / variantData[0].cvr - 1) * 100).toFixed(1)}% in conversion rate. Recommend scaling ${best.name} to 70% of traffic and holding the remaining 30% for control.`
    : "No significant winner yet. Let the test continue until 95% confidence is reached or one variant achieves clear separation.";

  return [{
    testId: `test_${type}_${Date.now()}`,
    testName: type === "creative" ? "Creative Messaging Test" : "Audience Segmentation Test",
    status: "completed" as const,
    confidence: parseFloat(confidence.toFixed(2)),
    winner: best.id,
    variants: variantData,
    recommendation,
  }];
}

export default router;


