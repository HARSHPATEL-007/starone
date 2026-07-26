import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess, sendPaginated, computePagination, safeInt } from "./route-utils";
import { funnelAnalysisOrchestrator } from "../business-logic/FunnelAnalysisOrchestrator";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { stage } = req.query;
    const page = safeInt(req.query.page, 1);
    const limit = safeInt(req.query.limit, 20);
    const filter: Record<string, any> = { tenantId };
    if (stage) filter.stage = stage;
    const stages = await DataStore.findFunnelData(filter);
    const totals = stages.reduce(
      (acc: any, s: any) => {
        acc.totalCount += s.count || 0;
        acc.totalValue += s.value || 0;
        return acc;
      },
      { totalCount: 0, totalValue: 0 }
    );
    const arr = Array.isArray(stages) ? stages : [];
    const paginated = arr.slice((page - 1) * limit, page * limit);
    const stageNames = arr.map((s: any) => s.stage).filter(Boolean);
    const uniqueCount = new Set(stageNames).size;
    const meta: Record<string, unknown> = { ...totals, stageCount: uniqueCount };
    sendPaginated(res, paginated, computePagination(page, limit, arr.length), meta);
  })
);

router.get(
  "/orchestrate/:campaignId",
  asyncHandler(async (req: Request, res: Response) => {
    const { campaignId } = req.params;
    const report = await funnelAnalysisOrchestrator.analyzeCampaignFunnel(campaignId, req.user!.tenantId);
    sendSuccess(res, report);
  })
);

router.get(
  "/orchestrate/portfolio",
  asyncHandler(async (req: Request, res: Response) => {
    const report = await funnelAnalysisOrchestrator.analyzePortfolioFunnel(req.user!.tenantId);
    sendSuccess(res, report);
  })
);

export default router;
