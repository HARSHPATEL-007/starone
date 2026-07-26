import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess } from "./route-utils";

const router = Router();

let lastQuery = "";
let lastResultCount = 0;

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { q } = req.query;
    if (!q || typeof q !== "string") throw new AppError(400, "Missing required query param: q");
    const results = await DataStore.globalSearch(tenantId, q);
    lastQuery = q;
    lastResultCount = results.length;
    sendSuccess(res, { results, total: results.length });
  })
);

router.get(
  "/orchestrate/dashboard",
  asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, { lastQuery, resultCount: lastResultCount });
  })
);

export default router;
