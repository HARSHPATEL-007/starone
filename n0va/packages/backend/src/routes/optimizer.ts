import { Router, Request, Response, NextFunction } from "express";
import { budgetOptimizer } from "../services/BudgetOptimizer";
import { creativeOptimizer } from "../services/CreativeOptimizer";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.post(
  "/budget",
  asyncHandler(async (req: Request, res: Response) => {
    const { campaigns, strategy } = req.body;
    const data = campaigns || budgetOptimizer.generateMockCampaigns();
    const plan = budgetOptimizer.optimize(data, strategy || "balanced");
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

router.post(
  "/creative/fatigue",
  asyncHandler(async (req: Request, res: Response) => {
    const { creatives } = req.body;
    const data = creatives || creativeOptimizer.generateMockCreatives();
    const analysis = creativeOptimizer.analyzeFatigue(data);
    res.json({
      creatives: data,
      analysis,
      fatiguedCount: analysis.filter((a) => a.isFatigued).length,
      recommendations: analysis.filter((a) => a.recommendation !== "none").map((a) => ({
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

  const variantData = variants.map((v) => {
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

  const best = variantData.reduce((a, b) => (a.cvr > b.cvr ? a : b));
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

router.get(
  "/ab-test/:type",
  asyncHandler(async (req: Request, res: Response) => {
    const type = req.params.type || "creative";
    const result = generateMockABTest(type);
    res.json(result);
  })
);

export default router;
