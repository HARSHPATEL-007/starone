import { Router, Request, Response, NextFunction } from "express";
import { orchestratorRegistry } from "../business-logic/OrchestratorRegistry";
import { sendSuccess } from "./route-utils";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  const all = orchestratorRegistry.getAll();
  const health = orchestratorRegistry.getHealth();
  sendSuccess(res, { orchestrators: all, health });
});

router.get("/health", (_req: Request, res: Response) => {
  sendSuccess(res, orchestratorRegistry.getHealth());
});

router.get("/domain/:domain", (req: Request, res: Response) => {
  const entries = orchestratorRegistry.getByDomain(req.params.domain);
  sendSuccess(res, entries);
});

export default router;
