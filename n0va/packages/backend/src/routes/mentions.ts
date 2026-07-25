import { Router, Request, Response, NextFunction } from "express";

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
      return res.status(400).json({ error: "entityType, entityId, and mentionedUsers required" });

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
    res.status(201).json({ mentions: records, count: records.length });
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
    res.json(result);
  })
);

router.get(
  "/unread-count",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const count = mentions.filter((m) => m.tenantId === tenantId && m.mentionedUser === userId && !m.read).length;
    res.json({ count });
  })
);

router.patch(
  "/:id/read",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const mention = mentions.find((m) => m.id === req.params.id && m.tenantId === tenantId && m.mentionedUser === userId);
    if (!mention) return res.status(404).json({ error: "Mention not found" });
    mention.read = true;
    res.json(mention);
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
    res.json({ markedRead: count });
  })
);

export default router;
