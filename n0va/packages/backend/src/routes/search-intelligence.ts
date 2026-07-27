import { Router, Request, Response, NextFunction } from "express";
import { searchIntelligenceService } from "../services/SearchIntelligenceService";
import { sendSuccess } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.post(
  "/cluster",
  asyncHandler(async (req: Request, res: Response) => {
    const { keywords, nClusters } = req.body;
    if (!keywords || !Array.isArray(keywords)) return res.status(400).json({ error: "keywords array required" });
    const result = searchIntelligenceService.clusterKeywords(keywords, nClusters || 5);
    sendSuccess(res, result, { clusterCount: result.length });
  }),
);

router.post(
  "/quality-score",
  asyncHandler(async (req: Request, res: Response) => {
    const { keyword, history } = req.body;
    if (!keyword) return res.status(400).json({ error: "keyword required" });
    const result = searchIntelligenceService.predictQualityScore(keyword, history || []);
    sendSuccess(res, result);
  }),
);

router.post(
  "/auction-insights",
  asyncHandler(async (req: Request, res: Response) => {
    const { keyword, competitors } = req.body;
    if (!keyword || !competitors) return res.status(400).json({ error: "keyword and competitors required" });
    const result = searchIntelligenceService.analyzeAuctionInsights(keyword, competitors);
    sendSuccess(res, result, { competitorCount: result.length });
  }),
);

router.post(
  "/bid-recommendation",
  asyncHandler(async (req: Request, res: Response) => {
    const { keyword, currentBid, qualityScore, avgCPC, conversionRate, avgOrderValue, dailyBudget, strategy } = req.body;
    if (!keyword || currentBid === undefined) return res.status(400).json({ error: "keyword and currentBid required" });
    const result = searchIntelligenceService.recommendBid(keyword, currentBid, qualityScore || 5, avgCPC || 2, conversionRate || 0.03, avgOrderValue || 50, dailyBudget || 100, strategy || "balanced");
    sendSuccess(res, result);
  }),
);

router.post(
  "/tfidf",
  asyncHandler(async (req: Request, res: Response) => {
    const { documents } = req.body;
    if (!documents || !Array.isArray(documents)) return res.status(400).json({ error: "documents array required" });
    const result = searchIntelligenceService.computeTFIDF(documents);
    sendSuccess(res, result, { docCount: result.length });
  }),
);

router.get(
  "/sample-keywords",
  asyncHandler(async (_req: Request, res: Response) => {
    const keywords = searchIntelligenceService.generateSampleKeywords(20);
    sendSuccess(res, keywords, { count: keywords.length });
  }),
);

router.get(
  "/sample-competitors",
  asyncHandler(async (req: Request, res: Response) => {
    const keyword = (req.query.keyword as string) || "marketing automation";
    const competitors = searchIntelligenceService.generateSampleCompetitors(keyword);
    sendSuccess(res, competitors, { count: competitors.length });
  }),
);

router.get(
  "/sample-quality-history",
  asyncHandler(async (_req: Request, res: Response) => {
    const history = searchIntelligenceService.generateSampleQualityHistory();
    sendSuccess(res, history, { count: history.length });
  }),
);

export default router;
