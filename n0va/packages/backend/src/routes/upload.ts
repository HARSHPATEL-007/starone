import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileStorage } from "../services/FileStorageService";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg|mp4|pdf|doc|docx|xls|xlsx|csv|json|txt|zip/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype.split("/")[1] || "");
    cb(null, ext || mime);
  },
});

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ error: "No file provided" });
    const tenantId = req.user!.tenantId;
    const { entityType, entityId } = req.body;
    const record = fileStorage.saveFile(req.file, tenantId, entityType, entityId);
    res.json({ file: record });
  })
);

router.post(
  "/multiple",
  upload.array("files", 10),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.files || !(req.files as Express.Multer.File[]).length)
      return res.status(400).json({ error: "No files provided" });
    const tenantId = req.user!.tenantId;
    const { entityType, entityId } = req.body;
    const records = (req.files as Express.Multer.File[]).map((f) =>
      fileStorage.saveFile(f, tenantId, entityType, entityId)
    );
    res.json({ files: records });
  })
);

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { entityType } = req.query;
    const files = fileStorage.list(tenantId, entityType as string);
    res.json(files);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const file = fileStorage.get(req.params.id);
    if (!file) return res.status(404).json({ error: "File not found" });
    res.json(file);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const ok = fileStorage.delete(req.params.id);
    if (!ok) return res.status(404).json({ error: "File not found" });
    res.json({ success: true });
  })
);

export default router;
