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
    const { status, type } = req.query;
    const filter: Record<string, any> = { tenantId };
    if (status) filter.status = status;
    if (type) filter.entityType = type;
    const approvals = DataStore.mem().find("approvals", (a: any) => {
      for (const [k, v] of Object.entries(filter)) if (a[k] !== v) return false;
      return true;
    }).reverse();
    res.json(approvals);
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { entityType, entityId, entityName, requestedBy, notes, requiredApprovers } = req.body;
    if (!entityType || !entityId) throw new AppError(400, "Missing required fields: entityType, entityId");
    const approval = DataStore.mem().insert("approvals", {
      tenantId,
      entityType,
      entityId,
      entityName: entityName || "",
      requestedBy: requestedBy || req.user!.userId,
      notes: notes || "",
      status: "pending",
      steps: (requiredApprovers || []).map((approver: any) => ({
        approver: typeof approver === "string" ? { name: approver, role: "" } : approver,
        status: "pending",
        comment: "",
        actedAt: null,
      })),
      createdBy: req.user!.userId,
    });
    res.status(201).json(approval);
  })
);

router.get(
  "/pending-count",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const pending = DataStore.mem().find("approvals", (a: any) => a.tenantId === tenantId && a.status === "pending");
    res.json({ count: pending.length });
  })
);

router.get(
  "/history",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const completed = DataStore.mem().find("approvals", (a: any) => a.tenantId === tenantId && (a.status === "approved" || a.status === "rejected"));
    completed.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    res.json(completed);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const approval = DataStore.mem().findOne("approvals", (a: any) => a._id === req.params.id && a.tenantId === tenantId);
    if (!approval) throw new AppError(404, "Approval not found");
    res.json(approval);
  })
);

router.patch(
  "/:id/act",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const approval = DataStore.mem().findOne("approvals", (a: any) => a._id === req.params.id && a.tenantId === tenantId);
    if (!approval) throw new AppError(404, "Approval not found");
    const { action, comment, approver } = req.body;
    if (!action || !["approve", "reject"].includes(action)) throw new AppError(400, "Invalid action. Must be 'approve' or 'reject'");
    if (!approver) throw new AppError(400, "Missing approver identifier");

    const steps = [...(approval.steps || [])];
    const stepIdx = steps.findIndex((s: any) => s.status === "pending" && (s.approver?.name === approver || s.approver?.role === approver));
    if (stepIdx === -1) throw new AppError(400, "No pending step found for this approver");

    steps[stepIdx] = {
      ...steps[stepIdx],
      status: action,
      comment: comment || "",
      actedAt: new Date().toISOString(),
    };

    const allDecided = steps.every((s: any) => s.status !== "pending");
    const anyRejected = steps.some((s: any) => s.status === "rejected");
    const overallStatus = allDecided ? (anyRejected ? "rejected" : "approved") : "pending";

    const updated = DataStore.mem().update("approvals", (a: any) => a._id === req.params.id && a.tenantId === tenantId, {
      steps,
      status: overallStatus,
      reviewedBy: approver,
      reviewedAt: new Date().toISOString(),
    });
    res.json(updated);
  })
);

export default router;
