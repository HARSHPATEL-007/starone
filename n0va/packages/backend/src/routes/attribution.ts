import { Router, Request, Response, NextFunction } from "express";
import { attributionService } from "../services/AttributionService";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/models",
  asyncHandler(async (_req: Request, res: Response) => {
    const paths = attributionService.generateSamplePaths(50);
    const results = attributionService.compareModels(paths);
    res.json({
      models: results,
      samplePaths: paths.slice(0, 3),
      totalPaths: paths.length,
    });
  })
);

router.post(
  "/analyze",
  asyncHandler(async (req: Request, res: Response) => {
    const { paths, model, attributionWindow } = req.body;
    if (!paths || paths.length === 0) {
      const samplePaths = attributionService.generateSamplePaths(30);
      const result = attributionService.attribute(samplePaths, model || "data_driven", attributionWindow || 30);
      res.json(result);
      return;
    }
    const result = attributionService.attribute(paths, model || "last_click", attributionWindow || 30);
    res.json(result);
  })
);

router.post(
  "/compare",
  asyncHandler(async (_req: Request, res: Response) => {
    const paths = attributionService.generateSamplePaths(100);
    const comparison = attributionService.compareModels(paths);
    res.json(comparison);
  })
);

export default router;
