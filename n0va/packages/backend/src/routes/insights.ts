import { Router, Request, Response, NextFunction } from "express";
import { campaignHealthService } from "../services/CampaignHealthService";
import { leadScoringService } from "../services/LeadScoringService";
import { roiCalculatorService } from "../services/ROICalculatorService";
import { AppError } from "../middleware/errorHandler";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

/* ---- Campaign Health ---- */

router.get(
  "/health",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const scores = await campaignHealthService.scoreAll(tenantId);
    res.json(scores);
  })
);

router.get(
  "/health/:campaignId",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const score = await campaignHealthService.score(req.params.campaignId, tenantId);
    if (!score) throw new AppError(404, "Campaign not found");
    res.json(score);
  })
);

router.get(
  "/health/sample",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const samples = await campaignHealthService.generateSampleScores(tenantId);
    res.json(samples);
  })
);

/* ---- Lead Scoring ---- */

router.get(
  "/lead-scoring/models/default",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json(leadScoringService.generateSampleModel());
  })
);

router.post(
  "/lead-scoring/evaluate",
  asyncHandler(async (req: Request, res: Response) => {
    const { model, lead } = req.body;
    if (!model || !lead) throw new AppError(400, "Model and lead data required");
    const result = leadScoringService.calculateScore(lead, model);
    res.json(result);
  })
);

router.get(
  "/lead-scoring/sample",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const model = leadScoringService.generateSampleModel();
    const results = leadScoringService.generateSampleLeads(model);
    res.json({ model, results });
  })
);

/* ---- ROI Calculator ---- */

router.post(
  "/roi/calculate",
  asyncHandler(async (req: Request, res: Response) => {
    const input = req.body;
    if (!input.totalSpend || !input.totalRevenue) {
      throw new AppError(400, "totalSpend and totalRevenue are required");
    }
    const result = roiCalculatorService.calculate(input);
    res.json(result);
  })
);

router.post(
  "/roi/compare",
  asyncHandler(async (req: Request, res: Response) => {
    const { scenarios } = req.body;
    if (!Array.isArray(scenarios) || scenarios.length === 0) {
      throw new AppError(400, "Array of scenarios required");
    }
    const results = roiCalculatorService.compare(scenarios);
    res.json(results);
  })
);

router.get(
  "/roi/sample",
  asyncHandler(async (_req: Request, res: Response) => {
    const scenarios = roiCalculatorService.generateComparisonScenarios();
    res.json(scenarios);
  })
);

export default router;
