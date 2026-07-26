import { Router, Request, Response, NextFunction } from "express";
import { creativeAI } from "../services/CreativeAIService";
import { sendSuccess } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.post(
  "/mab/select",
  asyncHandler(async (req: Request, res: Response) => {
    const { variants } = req.body;
    if (!variants || !Array.isArray(variants)) return res.status(400).json({ error: "variants array required" });
    const result = creativeAI.mabSelectVariant(variants);
    sendSuccess(res, result, { variantCount: variants.length });
  }),
);

router.post(
  "/mab/record",
  asyncHandler(async (req: Request, res: Response) => {
    const { variantKey, converted } = req.body;
    if (!variantKey) return res.status(400).json({ error: "variantKey required" });
    creativeAI.mabRecordResult(variantKey, !!converted);
    sendSuccess(res, { recorded: true });
  }),
);

router.get(
  "/mab/variants",
  asyncHandler(async (_req: Request, res: Response) => {
    const variants = creativeAI.mabGetAllVariants();
    sendSuccess(res, variants, { count: variants.length });
  }),
);

router.post(
  "/fatigue",
  asyncHandler(async (req: Request, res: Response) => {
    const { creativeHistory } = req.body;
    if (!creativeHistory || !Array.isArray(creativeHistory)) return res.status(400).json({ error: "creativeHistory array required" });
    const result = creativeAI.detectFatigue(creativeHistory);
    sendSuccess(res, result);
  }),
);

router.post(
  "/ab-test-simulate",
  asyncHandler(async (req: Request, res: Response) => {
    const { variants, visitorsPerDay, days } = req.body;
    if (!variants || !Array.isArray(variants)) return res.status(400).json({ error: "variants array required" });
    const result = creativeAI.simulateABTest(variants, visitorsPerDay || 1000, days || 14);
    sendSuccess(res, result, { variantCount: variants.length });
  }),
);

export default router;
