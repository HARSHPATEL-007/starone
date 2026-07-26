import { Router, Request, Response, NextFunction } from "express";
import { customerLifetimeValueService } from "../services/CustomerLifetimeValueService";
import { sendSuccess } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.post(
  "/predict",
  asyncHandler(async (req: Request, res: Response) => {
    const { customer, forecastPeriodDays } = req.body;
    if (!customer) return res.status(400).json({ error: "customer is required" });
    const prediction = customerLifetimeValueService.predictCLV(customer, forecastPeriodDays || 365);
    sendSuccess(res, prediction);
  }),
);

router.post(
  "/batch-predict",
  asyncHandler(async (req: Request, res: Response) => {
    const { customers, forecastPeriodDays } = req.body;
    if (!customers || !Array.isArray(customers)) return res.status(400).json({ error: "customers array required" });
    const predictions = customerLifetimeValueService.batchPredictCLV(customers, forecastPeriodDays || 365);
    sendSuccess(res, predictions, { count: predictions.length });
  }),
);

router.post(
  "/cohort-analysis",
  asyncHandler(async (req: Request, res: Response) => {
    const { customers } = req.body;
    if (!customers || !Array.isArray(customers)) return res.status(400).json({ error: "customers array required" });
    const cohorts = customerLifetimeValueService.cohortAnalysis(customers);
    sendSuccess(res, cohorts, { cohortCount: cohorts.length });
  }),
);

router.post(
  "/segment",
  asyncHandler(async (req: Request, res: Response) => {
    const { customers } = req.body;
    if (!customers || !Array.isArray(customers)) return res.status(400).json({ error: "customers array required" });
    const segments = customerLifetimeValueService.segmentCustomers(customers);
    sendSuccess(res, segments, { segmentCount: segments.length });
  }),
);

router.get(
  "/sample-customers",
  asyncHandler(async (req: Request, res: Response) => {
    const count = parseInt(req.query.count as string) || 20;
    const customers = customerLifetimeValueService.generateSampleCustomers(count);
    sendSuccess(res, customers, { count: customers.length });
  }),
);

export default router;
