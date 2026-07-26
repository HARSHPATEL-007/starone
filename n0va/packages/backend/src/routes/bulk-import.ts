import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess, sendCreated } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const SUPPORTED_ENTITY_TYPES = ["audiences", "creatives"];

const TEMPLATES: Record<string, any> = {
  audiences: {
    fields: ["name", "description", "type", "platform", "criteria", "tags"],
    example: { name: "High-Value Customers", description: "Customers with LTV > $10K", type: "custom", platform: "meta", criteria: { ltv: { $gt: 10000 } }, tags: ["high-value", "retargeting"] },
  },
  creatives: {
    fields: ["name", "type", "headline", "body", "cta", "assetUrl", "tags"],
    example: { name: "Summer Sale Banner", type: "image", headline: "Summer Sale - 50% Off", body: "Limited time offer on all products", cta: "Shop Now", assetUrl: "https://example.com/banner.jpg", tags: ["summer", "sale"] },
  },
};

router.get(
  "/templates/:entityType",
  asyncHandler(async (req: Request, res: Response) => {
    const { entityType } = req.params;
    if (!SUPPORTED_ENTITY_TYPES.includes(entityType)) {
      throw new AppError(400, `Unsupported entity type: ${entityType}. Supported: ${SUPPORTED_ENTITY_TYPES.join(", ")}`);
    }
    const tmpl = TEMPLATES[entityType];
    sendSuccess(res, { entityType, fields: tmpl.fields, example: tmpl.example, description: `Expected format for importing ${entityType}. Provide an array of objects with these fields.` });
  })
);

router.post(
  "/validate",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { entityType, data } = req.body;
    if (!entityType || !data) throw new AppError(400, "Missing required fields: entityType, data");
    if (!SUPPORTED_ENTITY_TYPES.includes(entityType)) {
      throw new AppError(400, `Unsupported entity type: ${entityType}. Supported: ${SUPPORTED_ENTITY_TYPES.join(", ")}`);
    }
    if (!Array.isArray(data)) throw new AppError(400, "data must be an array");
    const errors: any[] = [];
    for (let i = 0; i < data.length; i++) {
      if (!data[i].name) errors.push({ row: i, error: "Missing required field: name" });
    }
    sendSuccess(res, { valid: data.length - errors.length, invalid: errors.length, errors, preview: data.slice(0, 3) });
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { entityType, data, mapping } = req.body;
    if (!entityType || !data) throw new AppError(400, "Missing required fields: entityType, data");
    if (!SUPPORTED_ENTITY_TYPES.includes(entityType)) {
      throw new AppError(400, `Unsupported entity type: ${entityType}. Supported: ${SUPPORTED_ENTITY_TYPES.join(", ")}`);
    }
    if (!Array.isArray(data)) throw new AppError(400, "data must be an array");

    const imported: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < data.length; i++) {
      try {
        let row = data[i];
        if (mapping) {
          const mapped: Record<string, any> = {};
          for (const [targetKey, sourceKey] of Object.entries(mapping)) {
            mapped[targetKey] = row[sourceKey as string];
          }
          row = mapped;
        }
        if (!row.name) throw new Error("Missing required field: name");

        let result: any;
        if (entityType === "audiences") {
          result = await DataStore.createAudience({
            tenantId, name: row.name, description: row.description || "", type: row.type || "custom",
            platform: row.platform || "meta", criteria: row.criteria || {}, tags: row.tags || [],
            size: row.size || 0, status: row.status || "building",
            performance: { impressions: 0, conversions: 0, spend: 0, revenue: 0, roas: 0 },
            createdBy: req.user!.userId,
          });
        } else if (entityType === "creatives") {
          result = await DataStore.createCreative({
            tenantId, name: row.name, type: row.type || "image", status: row.status || "draft",
            headline: row.headline || "", body: row.body || "", cta: row.cta || "",
            assetUrl: row.assetUrl || "", tags: row.tags || [], platformVariants: {},
            performance: { impressions: 0, clicks: 0, ctr: 0 },
            createdBy: req.user!.userId,
          });
        }
        imported.push(result);
      } catch (e: any) {
        errors.push({ row: i, error: e.message });
      }
    }

    sendCreated(res, { imported: imported.length, failed: errors.length, errors, total: data.length, successRate: data.length > 0 ? Math.round((imported.length / data.length) * 10000) / 100 : 0 });
  })
);

export default router;
