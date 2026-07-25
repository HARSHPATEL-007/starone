import { Router, Request, Response, NextFunction } from "express";
import { audienceInsightsService } from "../services/AudienceInsightsService";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/insights",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const audienceId = req.query.audienceId as string | undefined;
    const insights = audienceInsightsService.getInsights(tenantId, audienceId);
    res.json(insights);
  })
);

router.get(
  "/lookalike",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const insights = audienceInsightsService.getLookalikeInsights(tenantId);
    res.json(insights);
  })
);

export default router;
