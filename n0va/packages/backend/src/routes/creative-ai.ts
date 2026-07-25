import { Router, Request, Response, NextFunction } from "express";
import { creativeAI } from "../services/CreativeAIService";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.post(
  "/generate",
  asyncHandler(async (req: Request, res: Response) => {
    const { productDescription, targetAudience, tone, platform, count } = req.body;
    if (!productDescription) return res.status(400).json({ error: "productDescription is required" });
    const variants = creativeAI.generateVariants({
      productDescription,
      targetAudience: targetAudience || "general audience",
      tone: tone || "professional",
      platform: platform || "meta",
      count: Math.min(count || 3, 8),
    });
    res.json({ variants, generatedAt: new Date().toISOString() });
  })
);

router.post(
  "/headlines",
  asyncHandler(async (req: Request, res: Response) => {
    const { productDescription, targetAudience, count } = req.body;
    if (!productDescription) return res.status(400).json({ error: "productDescription is required" });
    const headlines = creativeAI.generateHeadlines(productDescription, targetAudience || "general audience", count);
    res.json({ headlines });
  })
);

router.post(
  "/body",
  asyncHandler(async (req: Request, res: Response) => {
    const { productDescription, targetAudience, tone, count } = req.body;
    if (!productDescription) return res.status(400).json({ error: "productDescription is required" });
    const bodies = creativeAI.generateBody(productDescription, targetAudience || "general audience", tone || "professional", count);
    res.json({ bodies });
  })
);

router.post(
  "/suggest-tone",
  asyncHandler(async (req: Request, res: Response) => {
    const { productDescription, platform } = req.body;
    if (!productDescription) return res.status(400).json({ error: "productDescription is required" });
    const tone = creativeAI.suggestTone(productDescription, platform || "meta");
    res.json({ suggestedTone: tone });
  })
);

router.post(
  "/expand",
  asyncHandler(async (req: Request, res: Response) => {
    const { headline } = req.body;
    if (!headline) return res.status(400).json({ error: "headline is required" });
    const expanded = creativeAI.expandHeadline(headline);
    res.json({ expanded });
  })
);

export default router;
