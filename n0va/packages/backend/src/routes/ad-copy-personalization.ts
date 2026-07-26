import { Router, Request, Response, NextFunction } from "express";
import { adCopyPersonalizationService } from "../services/AdCopyPersonalizationService";
import { sendSuccess } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.post(
  "/score-element",
  asyncHandler(async (req: Request, res: Response) => {
    const { element, userContext } = req.body;
    if (!element || !userContext) return res.status(400).json({ error: "element and userContext required" });
    const score = adCopyPersonalizationService.scoreElement(element, userContext);
    sendSuccess(res, score);
  }),
);

router.post(
  "/personalize",
  asyncHandler(async (req: Request, res: Response) => {
    const { elements, userContext } = req.body;
    if (!elements || !userContext) return res.status(400).json({ error: "elements and userContext required" });
    const result = adCopyPersonalizationService.selectBestElements(elements, userContext);
    sendSuccess(res, result);
  }),
);

router.post(
  "/mvt",
  asyncHandler(async (req: Request, res: Response) => {
    const { variants, totalVisitors } = req.body;
    if (!variants || !Array.isArray(variants)) return res.status(400).json({ error: "variants array required" });
    const result = adCopyPersonalizationService.runMVTest(variants, totalVisitors || 10000);
    sendSuccess(res, result, { variantCount: variants.length });
  }),
);

router.get(
  "/sample-elements",
  asyncHandler(async (_req: Request, res: Response) => {
    const elements = adCopyPersonalizationService.generateSampleElements();
    sendSuccess(res, elements, { count: elements.length });
  }),
);

router.get(
  "/sample-user",
  asyncHandler(async (_req: Request, res: Response) => {
    const ctx = adCopyPersonalizationService.generateSampleUserContext();
    sendSuccess(res, ctx);
  }),
);

router.get(
  "/sample-mvt-variants",
  asyncHandler(async (_req: Request, res: Response) => {
    const variants = adCopyPersonalizationService.generateSampleMVTVariants();
    sendSuccess(res, variants, { count: variants.length });
  }),
);

export default router;
