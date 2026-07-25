import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { attributionService } from "../services/AttributionService";
import { ConversionPath } from "../models/ConversionPath";
import { EntityRecord } from "../models/EntityRecord";

const router = Router();

function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/models",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
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
    const tenantId = req.user!.tenantId;
    const { paths: inputPaths, model, attributionWindow } = req.body;

    let paths = inputPaths;
    if (!paths || paths.length === 0) {
      if (isConnected()) {
        const saved = await ConversionPath.find({ tenantId }).sort({ conversionDate: -1 }).limit(100).lean();
        if (saved.length > 0) {
          paths = saved.map((p: any) => ({
            conversionId: p.conversionId,
            userId: p.userId,
            touchpoints: p.touchpoints,
            totalRevenue: p.totalRevenue,
            conversionDate: p.conversionDate,
          }));
        }
      }
      if (!paths || paths.length === 0) {
        paths = attributionService.generateSamplePaths(30);
      }
    }

    const result = attributionService.attribute(paths, model || "data_driven", attributionWindow || 30);

    if (isConnected() && !inputPaths) {
      await EntityRecord.create({
        tenantId,
        entityType: "attribution_report",
        data: {
          model: model || "data_driven",
          attributionWindow: attributionWindow || 30,
          result: {
            totalConversions: result.totalConversions,
            totalRevenue: result.totalRevenue,
            totalCost: result.totalCost,
            attributedRevenue: result.attributedRevenue,
            roas: result.roas,
          },
          pathsAnalyzed: paths.length,
          createdAt: new Date().toISOString(),
        },
      });
    }

    res.json(result);
  })
);

router.post(
  "/compare",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    let paths;
    if (isConnected()) {
      const saved = await ConversionPath.find({ tenantId }).sort({ conversionDate: -1 }).limit(100).lean();
      if (saved.length > 0) {
        paths = saved.map((p: any) => ({
          conversionId: p.conversionId,
          userId: p.userId,
          touchpoints: p.touchpoints,
          totalRevenue: p.totalRevenue,
          conversionDate: p.conversionDate,
        }));
      }
    }
    if (!paths) {
      paths = attributionService.generateSamplePaths(100);
    }
    const comparison = attributionService.compareModels(paths);
    res.json(comparison);
  })
);

router.post(
  "/paths",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { paths } = req.body;
    if (!paths || !Array.isArray(paths)) {
      return res.status(400).json({ error: "paths array required" });
    }
    if (isConnected()) {
      const docs = paths.map((p: any) => ({
        tenantId,
        conversionId: p.conversionId || `conv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        userId: p.userId,
        touchpoints: p.touchpoints,
        totalRevenue: p.totalRevenue || 0,
        conversionDate: p.conversionDate ? new Date(p.conversionDate) : new Date(),
      }));
      await ConversionPath.insertMany(docs);
    }
    res.status(201).json({ saved: paths.length });
  })
);

router.get(
  "/paths",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (isConnected()) {
      const paths = await ConversionPath.find({ tenantId }).sort({ conversionDate: -1 }).limit(200).lean();
      return res.json(paths);
    }
    res.json(attributionService.generateSamplePaths(20));
  })
);

router.get(
  "/reports",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (isConnected()) {
      const reports = await EntityRecord.find({ tenantId, entityType: "attribution_report" })
        .sort({ createdAt: -1 }).limit(50).lean();
      return res.json(reports.map((r: any) => ({ _id: r._id.toString(), ...r.data })));
    }
    res.json([]);
  })
);

export default router;


