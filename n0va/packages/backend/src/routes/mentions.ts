import { Router, Request, Response, NextFunction } from "express";
import { sendSuccess, sendCreated } from "./route-utils";
import { AppError } from "../middleware/errorHandler";

const router = Router();

interface MentionRecord {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  mentionedBy: string;
  mentionedUser: string;
  context: string;
  read: boolean;
  createdAt: string;
}

const mentions: MentionRecord[] = [];

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { entityType, entityId, mentionedUsers, context } = req.body;
    if (!entityType || !entityId || !mentionedUsers?.length)
      throw new AppError(400, "entityType, entityId, and mentionedUsers required");

    const records = mentionedUsers.map((userId: string) => ({
      id: `men_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId,
      entityType,
      entityId,
      mentionedBy: req.user!.userId,
      mentionedUser: userId,
      context: context || "",
      read: false,
      createdAt: new Date().toISOString(),
    }));

    mentions.push(...records);
    sendCreated(res, { mentions: records, count: records.length });
  })
);

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const { unreadOnly } = req.query;
    let result = mentions.filter((m) => m.tenantId === tenantId && m.mentionedUser === userId);
    if (unreadOnly === "true") result = result.filter((m) => !m.read);
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    sendSuccess(res, result, { count: result.length, unreadCount: result.filter((m) => !m.read).length });
  })
);

router.get(
  "/unread-count",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const count = mentions.filter((m) => m.tenantId === tenantId && m.mentionedUser === userId && !m.read).length;
    sendSuccess(res, { count });
  })
);

router.patch(
  "/:id/read",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const mention = mentions.find((m) => m.id === req.params.id && m.tenantId === tenantId && m.mentionedUser === userId);
    if (!mention) throw new AppError(404, "Mention not found");
    mention.read = true;
    sendSuccess(res, mention);
  })
);

router.post(
  "/read-all",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    let count = 0;
    mentions.forEach((m) => {
      if (m.tenantId === tenantId && m.mentionedUser === userId && !m.read) {
        m.read = true;
        count++;
      }
    });
    sendSuccess(res, { markedRead: count });
  })
);

router.get(
  "/orchestrate/dashboard",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userMentions = mentions.filter((m) => m.tenantId === tenantId);
    const unreadMentions = userMentions.filter((m) => !m.read).length;
    const uniqueEntityTypes = [...new Set(userMentions.map((m) => m.entityType))];
    sendSuccess(res, { totalMentions: userMentions.length, unreadMentions, uniqueEntityTypes });
  })
);

export default router;
