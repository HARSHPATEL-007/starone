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
    const { name } = req.query;
    const filter: Record<string, any> = { tenantId };
    if (name) filter.name = { $regex: name, $options: "i" };
    const journeys = await DataStore.findCustomerJourneys(filter);
    res.json(journeys);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const journeys = await DataStore.findCustomerJourneys({ tenantId, _id: id });
    const journey = Array.isArray(journeys) ? journeys[0] : null;
    if (!journey) throw new AppError(404, "Customer journey not found");
    res.json(journey);
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { name, stages } = req.body;
    if (!name || !stages || !Array.isArray(stages)) throw new AppError(400, "Missing required fields: name, stages");
    const journey = await DataStore.createCustomerJourney({
      tenantId,
      name,
      stages,
      createdBy: req.user!.userId,
    });
    res.status(201).json(journey);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const update = req.body;
    delete update.tenantId;
    delete update._id;
    const updated = await DataStore.updateCustomerJourney(id, tenantId, update);
    if (!updated) throw new AppError(404, "Customer journey not found");
    res.json(updated);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const deleted = await DataStore.deleteCustomerJourney(id, tenantId);
    if (!deleted) throw new AppError(404, "Customer journey not found");
    res.status(204).send();
  })
);

export default router;
