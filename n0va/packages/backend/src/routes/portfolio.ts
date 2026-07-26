import { Router, Request, Response, NextFunction } from "express";
import { portfolioHealthOrchestrator } from "../business-logic/PortfolioHealthOrchestrator";
import { portfolioAdviceOrchestrator } from "../business-logic/PortfolioAdviceOrchestrator";
import { budgetAlertOrchestrator } from "../business-logic/BudgetAlertOrchestrator";
import { sendSuccess } from "./route-utils";

const router = Router();
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/health",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const report = await portfolioHealthOrchestrator.generatePortfolioReport(tenantId);
    sendSuccess(res, report);
  })
);

router.get(
  "/advice",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const advice = await portfolioAdviceOrchestrator.generateAdvice(tenantId);
    sendSuccess(res, advice);
  })
);

router.get(
  "/budget/alerts",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const alerts = await budgetAlertOrchestrator.monitor(tenantId);
    sendSuccess(res, alerts);
  })
);

router.get(
  "/budget/alerts/critical",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const alerts = await budgetAlertOrchestrator.getCriticalAlerts(tenantId);
    sendSuccess(res, alerts, { count: alerts.length });
  })
);

export default router;
