import path from "path";
import fs from "fs";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

export class FileStorageService {
  private files: Map<string, any> = new Map();

  constructor() {
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  saveFile(file: Express.Multer.File, tenantId: string, entityType?: string, entityId?: string): any {
    const id = `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const record = {
      _id: id,
      tenantId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      filename: file.filename,
      path: `/uploads/${file.filename}`,
      entityType: entityType || "general",
      entityId,
      uploadedAt: new Date().toISOString(),
    };
    this.files.set(id, record);
    return record;
  }

  list(tenantId: string, entityType?: string): any[] {
    const all = [...this.files.values()].filter((f) => f.tenantId === tenantId);
    if (entityType) return all.filter((f) => f.entityType === entityType);
    return all;
  }

  get(id: string): any | undefined {
    return this.files.get(id);
  }

  delete(id: string): boolean {
    const file = this.files.get(id);
    if (!file) return false;
    const fullPath = path.resolve(process.cwd(), file.path.replace(/^\//, ""));
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    this.files.delete(id);
    return true;
  }
}

export const fileStorage = new FileStorageService();
