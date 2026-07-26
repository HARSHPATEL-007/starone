import path from "path";
import fs from "fs";
import crypto from "crypto";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

interface FileRecord {
  _id: string;
  tenantId: string;
  originalName: string;
  mimeType: string;
  size: number;
  filename: string;
  path: string;
  entityType: string;
  entityId?: string;
  contentHash?: string;
  uploadedAt: string;
}

export class FileStorageService {
  private files: Map<string, any> = new Map();

  constructor() {
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  saveFile(file: Express.Multer.File, tenantId: string, entityType?: string, entityId?: string): any {
    const id = `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const contentHash = this.computeHash(file.buffer || fs.readFileSync(file.path));
    const record = {
      _id: id, tenantId, originalName: file.originalname, mimeType: file.mimetype, size: file.size,
      filename: file.filename, path: `/uploads/${file.filename}`,
      entityType: entityType || "general", entityId, contentHash,
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

  private computeHash(buffer: Buffer): string {
    return crypto.createHash("sha256").update(buffer).digest("hex").substring(0, 16);
  }

  // ─── Storage Growth Forecasting ─────────────────────────────────────

  forecastStorageGrowth(tenantId: string): { currentUsage: number; dailyGrowthRate: number; projected30Days: number; projected90Days: number; daysUntilLimit: number | null; recommendation: string } {
    const tenantFiles = this.list(tenantId) as FileRecord[];
    const totalBytes = tenantFiles.reduce((s, f) => s + (f.size || 0), 0);

    if (tenantFiles.length < 2) {
      return { currentUsage: totalBytes, dailyGrowthRate: 0, projected30Days: totalBytes, projected90Days: totalBytes, daysUntilLimit: null, recommendation: "Not enough data for forecast. Upload more files." };
    }

    const sorted = tenantFiles.sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());
    const firstDate = new Date(sorted[0].uploadedAt).getTime();
    const daysElapsed = Math.max(1, (Date.now() - firstDate) / 86400000);
    const dailyGrowthRate = totalBytes / daysElapsed;

    const projected30Days = totalBytes + dailyGrowthRate * 30;
    const projected90Days = totalBytes + dailyGrowthRate * 90;

    const storageLimit = 1073741824; // 1 GB default limit
    const daysUntilLimit = dailyGrowthRate > 0 ? (storageLimit - totalBytes) / dailyGrowthRate : null;

    let recommendation: string;
    if (daysUntilLimit !== null && daysUntilLimit < 30) recommendation = `CRITICAL: Storage will exceed limit in ${Math.round(daysUntilLimit)} days. Clean up or upgrade.`;
    else if (daysUntilLimit !== null && daysUntilLimit < 90) recommendation = `Warning: Storage projected to hit limit in ~${Math.round(daysUntilLimit)} days. Plan cleanup.`;
    else recommendation = `Storage is healthy. ${dailyGrowthRate > 0 ? `Growing at ${this.formatBytes(dailyGrowthRate)}/day.` : "No active growth."}`;

    return {
      currentUsage: totalBytes,
      dailyGrowthRate: Math.round(dailyGrowthRate * 100) / 100,
      projected30Days: Math.round(projected30Days),
      projected90Days: Math.round(projected90Days),
      daysUntilLimit: daysUntilLimit !== null ? Math.round(daysUntilLimit) : null,
      recommendation,
    };
  }

  // ─── File Type Distribution Analytics ───────────────────────────────

  getFileDistribution(tenantId: string): { totalFiles: number; totalSize: number; byType: Record<string, { count: number; totalSize: number; avgSize: number }>; byEntity: Record<string, { count: number; totalSize: number }> } {
    const tenantFiles = this.list(tenantId) as FileRecord[];
    const byType: Record<string, { count: number; totalSize: number; avgSize: number }> = {};
    const byEntity: Record<string, { count: number; totalSize: number }> = {};

    for (const f of tenantFiles) {
      const type = f.mimeType || "unknown";
      if (!byType[type]) byType[type] = { count: 0, totalSize: 0, avgSize: 0 };
      byType[type].count++;
      byType[type].totalSize += f.size;

      const entity = f.entityType || "general";
      if (!byEntity[entity]) byEntity[entity] = { count: 0, totalSize: 0 };
      byEntity[entity].count++;
      byEntity[entity].totalSize += f.size;
    }

    for (const key of Object.keys(byType)) {
      byType[key].avgSize = Math.round(byType[key].totalSize / byType[key].count);
    }

    return {
      totalFiles: tenantFiles.length,
      totalSize: tenantFiles.reduce((s, f) => s + f.size, 0),
      byType,
      byEntity,
    };
  }

  // ─── Duplicate Detection ────────────────────────────────────────────

  detectDuplicates(tenantId: string): { duplicates: { original: string; duplicate: string; hash: string; size: number }[]; wastedBytes: number } {
    const tenantFiles = this.list(tenantId) as FileRecord[];
    const hashMap = new Map<string, FileRecord[]>();
    for (const f of tenantFiles) {
      if (f.contentHash) {
        if (!hashMap.has(f.contentHash)) hashMap.set(f.contentHash, []);
        hashMap.get(f.contentHash)!.push(f);
      }
    }

    const duplicates: { original: string; duplicate: string; hash: string; size: number }[] = [];
    let wastedBytes = 0;

    for (const [, files] of hashMap) {
      if (files.length > 1) {
        const sorted = files.sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());
        const original = sorted[0];
        for (let i = 1; i < sorted.length; i++) {
          duplicates.push({ original: original.originalName, duplicate: sorted[i].originalName, hash: original.contentHash || "", size: sorted[i].size });
          wastedBytes += sorted[i].size;
        }
      }
    }

    return { duplicates, wastedBytes };
  }

  // ─── Storage Optimization Scoring ────────────────────────────────────

  getStorageOptimizationScore(tenantId: string): { score: number; totalFiles: number; duplicateRate: number; largeFiles: number; recommendations: string[] } {
    const tenantFiles = this.list(tenantId) as FileRecord[];
    const n = tenantFiles.length;
    if (n === 0) return { score: 100, totalFiles: 0, duplicateRate: 0, largeFiles: 0, recommendations: ["No files to optimize."] };

    const { duplicates, wastedBytes } = this.detectDuplicates(tenantId);
    const duplicateRate = n > 0 ? duplicates.length / n : 0;

    const largeFiles = tenantFiles.filter((f) => f.size > 10485760).length; // > 10 MB
    const largeFileRate = n > 0 ? largeFiles / n : 0;

    const totalSize = tenantFiles.reduce((s, f) => s + f.size, 0);
    const wasteRatio = totalSize > 0 ? wastedBytes / totalSize : 0;

    const score = Math.round(Math.max(0, Math.min(100, (1 - duplicateRate * 0.4 - largeFileRate * 0.2 - wasteRatio * 0.4) * 100)));

    const recommendations: string[] = [];
    if (duplicates.length > 0) recommendations.push(`Remove ${duplicates.length} duplicate files to free ${this.formatBytes(wastedBytes)}.`);
    if (largeFiles > 0) recommendations.push(`${largeFiles} files exceed 10 MB. Consider compression.`);
    if (wasteRatio > 0.1) recommendations.push(`${Math.round(wasteRatio * 100)}% of storage is from duplicates.`);

    return { score, totalFiles: n, duplicateRate: Math.round(duplicateRate * 100), largeFiles, recommendations };
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024, sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }
}

export const fileStorage = new FileStorageService();
