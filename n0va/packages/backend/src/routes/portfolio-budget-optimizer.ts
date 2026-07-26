import { Router, Request, Response, NextFunction } from "express";
import { portfolioBudgetOptimizerService } from "../services/PortfolioBudgetOptimizerService";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess } from "./route-utils";

const router = Router();
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.post("/allocate", asyncHandler(async (req, res) => {
  const { totalBudget, campaigns, objective } = req.body;
  if (!totalBudget || !campaigns?.length) throw new AppError(400, "totalBudget and campaigns required");
  sendSuccess(res, portfolioBudgetOptimizerService.allocate({ totalBudget, campaigns, objective }));
}));

router.post("/efficient-frontier", asyncHandler(async (req, res) => {
  const { totalBudget, campaigns, objective } = req.body;
  if (!totalBudget || !campaigns?.length) throw new AppError(400, "totalBudget and campaigns required");
  sendSuccess(res, portfolioBudgetOptimizerService.efficientFrontier({ totalBudget, campaigns, objective }));
}));

router.get("/orchestrate/dashboard", asyncHandler(async (_req, res) => {
  sendSuccess(res, { serviceAvailable: true });
}));

export default router;
