import { Router, Request, Response, NextFunction } from "express";
import { campaignHealthService } from "../services/CampaignHealthService";
import { leadScoringService } from "../services/LeadScoringService";
import { leadScoringOrchestrator } from "../business-logic/LeadScoringOrchestrator";
import { roiCalculatorService } from "../services/ROICalculatorService";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/health",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const scores = await campaignHealthService.scoreAll(tenantId);
    const arr = Array.isArray(scores) ? scores : [];
    const avg = arr.length > 0 ? Math.round(arr.reduce((s: number, sc: any) => s + (sc.score || 0), 0) / arr.length * 100) / 100 : 0;
    sendSuccess(res, scores, { count: arr.length, averageScore: avg });
  })
);

router.get(
  "/health/:campaignId",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const score = await campaignHealthService.score(req.params.campaignId, tenantId);
    if (!score) throw new AppError(404, "Campaign not found");
    sendSuccess(res, score);
  })
);

router.get(
  "/health/sample",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const samples = await campaignHealthService.generateSampleScores(tenantId);
    sendSuccess(res, samples, { count: Array.isArray(samples) ? samples.length : 0 });
  })
);

router.get(
  "/lead-scoring/models/default",
  asyncHandler(async (_req: Request, res: Response) => {
    const model = leadScoringService.generateSampleModel();
    sendSuccess(res, model);
  })
);

router.post(
  "/lead-scoring/evaluate",
  asyncHandler(async (req: Request, res: Response) => {
    const { model, lead } = req.body;
    if (!model || !lead) throw new AppError(400, "Model and lead data required");
    const result = leadScoringService.calculateScore(lead, model);
    sendSuccess(res, result);
  })
);

router.get(
  "/lead-scoring/sample",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const model = leadScoringService.generateSampleModel();
    const results = leadScoringService.generateSampleLeads(model);
    sendSuccess(res, { model, results }, { leadCount: results.length });
  })
);

router.post(
  "/roi/calculate",
  asyncHandler(async (req: Request, res: Response) => {
    const input = req.body;
    if (!input.totalSpend || !input.totalRevenue) throw new AppError(400, "totalSpend and totalRevenue are required");
    const result = roiCalculatorService.calculate(input);
    sendSuccess(res, result);
  })
);

router.post(
  "/roi/compare",
  asyncHandler(async (req: Request, res: Response) => {
    const { scenarios } = req.body;
    if (!Array.isArray(scenarios) || scenarios.length === 0) throw new AppError(400, "Array of scenarios required");
    const results = roiCalculatorService.compare(scenarios);
    sendSuccess(res, results, { count: results.length });
  })
);

router.get(
  "/roi/sample",
  asyncHandler(async (_req: Request, res: Response) => {
    const scenarios = roiCalculatorService.generateComparisonScenarios();
    sendSuccess(res, scenarios, { count: scenarios.length });
  })
);

router.get("/orchestrate/lead-scoring", asyncHandler(async (req, res) => {
  const report = await leadScoringOrchestrator.generateReport(req.user!.tenantId);
  sendSuccess(res, report);
}));

export default router;
