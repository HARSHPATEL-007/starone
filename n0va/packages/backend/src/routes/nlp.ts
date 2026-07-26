import { Router, Request, Response, NextFunction } from "express";
import { naturalLanguageInsightService } from "../services/NaturalLanguageInsightService";
import { sendSuccess } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.post(
  "/sentiment",
  asyncHandler(async (req: Request, res: Response) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "text is required" });
    const result = naturalLanguageInsightService.analyzeSentiment(text);
    sendSuccess(res, result);
  }),
);

router.post(
  "/keywords",
  asyncHandler(async (req: Request, res: Response) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "text is required" });
    const result = naturalLanguageInsightService.extractKeywords(text);
    sendSuccess(res, result);
  }),
);

router.post(
  "/readability",
  asyncHandler(async (req: Request, res: Response) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "text is required" });
    const result = naturalLanguageInsightService.computeReadability(text);
    sendSuccess(res, result);
  }),
);

router.post(
  "/tone",
  asyncHandler(async (req: Request, res: Response) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "text is required" });
    const result = naturalLanguageInsightService.analyzeTone(text);
    sendSuccess(res, result);
  }),
);

router.post(
  "/optimize",
  asyncHandler(async (req: Request, res: Response) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "text is required" });
    const result = naturalLanguageInsightService.optimizeCopy(text);
    sendSuccess(res, result);
  }),
);

export default router;
