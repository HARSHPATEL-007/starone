import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";
import { AppError } from "../middleware/errorHandler";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { stage } = req.query;
    const filter: Record<string, any> = { tenantId };
    if (stage) filter.stage = stage;
    const stages = await DataStore.findFunnelData(filter);
    const totals = stages.reduce(
      (acc: any, s: any) => {
        acc.totalCount += s.count || 0;
        acc.totalValue += s.value || 0;
        return acc;
      },
      { totalCount: 0, totalValue: 0 }
    );
    res.json({ stages, totals });
  })
);

router.get(
  "/summary",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const allData = await DataStore.findFunnelData({ tenantId });
    const stageMap: Record<string, { stage: string; totalCount: number; totalValue: number }> = {};
    for (const d of allData) {
      const st = d.stage || "unknown";
      if (!stageMap[st]) stageMap[st] = { stage: st, totalCount: 0, totalValue: 0 };
      stageMap[st].totalCount += d.count || 0;
      stageMap[st].totalValue += d.value || 0;
    }
    const stages = Object.values(stageMap);
    const stageOrder = ["awareness", "interest", "consideration", "intent", "conversion", "retention"];
    stages.sort((a: any, b: any) => {
      const ai = stageOrder.indexOf(a.stage.toLowerCase());
      const bi = stageOrder.indexOf(b.stage.toLowerCase());
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
    let previousCount = stages.length > 0 ? (stages[0] as any).totalCount : 0;
    const result = stages.map((s: any) => {
      const dropOff = previousCount > 0 ? ((previousCount - s.totalCount) / previousCount) * 100 : 0;
      previousCount = s.totalCount;
      return { ...s, dropOffPercentage: parseFloat(dropOff.toFixed(1)) };
    });
    res.json({ stages: result });
  })
);

export default router;
