import { nanoid } from "nanoid";
import * as crypto from "crypto";

interface VFile {
  id: string;
  name: string;
  path: string;
  contentType: string;
  size: number;
  chunks: Buffer[];
  checksum: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  expiresAt?: Date;
}

interface VDirectory {
  name: string;
  path: string;
  files: string[];
  directories: string[];
}

interface UploadResult {
  id: string;
  path: string;
  size: number;
  checksum: string;
  pointer: string;
}

export class VirtualFileSystem {
  private files = new Map<string, VFile>();
  private directories = new Map<string, VDirectory>();
  private readonly maxFileSize = 100 * 1024 * 1024;
  private readonly chunkSize = 5 * 1024 * 1024;
  private readonly storagePath: string;

  constructor(storagePath?: string) {
    this.storagePath = storagePath || "/tmp/n0va1o/vfs";
    this.ensureRootDirectory();
  }

  private ensureRootDirectory(): void {
    this.directories.set("/", {
      name: "/",
      path: "/",
      files: [],
      directories: [],
    });
  }

  async upload(
    name: string,
    data: Buffer | string,
    contentType: string,
    metadata: Record<string, unknown> = {},
    ttlMs?: number
  ): Promise<UploadResult> {
    const content = typeof data === "string" ? Buffer.from(data) : data;
    const id = `vfs_${nanoid(16)}`;
    const checksum = crypto.createHash("sha256").update(content).digest("hex");
    const path = `/${id}/${name}`;

    if (content.length > this.maxFileSize) {
      throw new Error(`File exceeds maximum size of ${this.maxFileSize / 1024 / 1024}MB`);
    }

    const chunks: Buffer[] = [];
    for (let i = 0; i < content.length; i += this.chunkSize) {
      chunks.push(content.subarray(i, i + this.chunkSize));
    }

    const file: VFile = {
      id,
      name,
      path,
      contentType,
      size: content.length,
      chunks,
      checksum,
      metadata,
      createdAt: new Date(),
      expiresAt: ttlMs ? new Date(Date.now() + ttlMs) : undefined,
    };

    this.files.set(id, file);

    const parentPath = this.getParentPath(path);
    this.linkFileToDirectory(parentPath, id, name);

    return {
      id,
      path,
      size: content.length,
      checksum,
      pointer: `n0va1o://vfs/${id}/${name}`,
    };
  }

  async read(fileId: string): Promise<Buffer | null> {
    const file = this.files.get(fileId);
    if (!file) return null;
    if (file.expiresAt && file.expiresAt < new Date()) {
      this.files.delete(fileId);
      return null;
    }
    return Buffer.concat(file.chunks);
  }

  async readAsString(fileId: string, encoding: BufferEncoding = "utf-8"): Promise<string | null> {
    const data = await this.read(fileId);
    return data ? data.toString(encoding) : null;
  }

  async getMetadata(fileId: string) {
    const file = this.files.get(fileId);
    if (!file) return null;
    return {
      id: file.id,
      name: file.name,
      path: file.path,
      contentType: file.contentType,
      size: file.size,
      checksum: file.checksum,
      metadata: file.metadata,
      createdAt: file.createdAt,
      expiresAt: file.expiresAt,
    };
  }

  async delete(fileId: string): Promise<boolean> {
    return this.files.delete(fileId);
  }

  async getPointer(fileId: string): Promise<string | null> {
    const file = this.files.get(fileId);
    return file ? `n0va1o://vfs/${file.id}/${file.name}` : null;
  }

  async resolvePointer(pointer: string): Promise<Buffer | null> {
    const match = pointer.match(/^n0va1o:\/\/vfs\/([^/]+)\//);
    if (!match) return null;
    return this.read(match[1]);
  }

  async createDirectory(path: string): Promise<void> {
    if (this.directories.has(path)) return;
    this.directories.set(path, { name: path.split("/").pop() || path, path, files: [], directories: [] });
    const parentPath = this.getParentPath(path);
    const parent = this.directories.get(parentPath);
    if (parent && !parent.directories.includes(path)) {
      parent.directories.push(path);
    }
  }

  listDirectory(path: string = "/") {
    const dir = this.directories.get(path);
    if (!dir) return null;

    return {
      ...dir,
      files: dir.files.map((fid) => {
        const f = this.files.get(fid);
        return f ? { id: f.id, name: f.name, size: f.size, contentType: f.contentType, createdAt: f.createdAt } : null;
      }).filter(Boolean),
    };
  }

  getStorageStats() {
    let totalSize = 0;
    let totalFiles = 0;
    for (const file of this.files.values()) {
      totalSize += file.size;
      totalFiles++;
    }
    return {
      totalFiles,
      totalSize,
      totalSizeMB: parseFloat((totalSize / 1024 / 1024).toFixed(2)),
      directoryCount: this.directories.size,
    };
  }

  cleanupExpired(): number {
    const now = new Date();
    let cleaned = 0;
    for (const [id, file] of this.files) {
      if (file.expiresAt && file.expiresAt < now) {
        this.files.delete(id);
        cleaned++;
      }
    }
    return cleaned;
  }

  private getParentPath(filePath: string): string {
    const parts = filePath.split("/").filter(Boolean);
    parts.pop();
    return "/" + parts.join("/");
  }

  private linkFileToDirectory(dirPath: string, fileId: string, fileName: string): void {
    if (!this.directories.has(dirPath)) {
      this.createDirectory(dirPath);
    }
    const dir = this.directories.get(dirPath);
    if (dir && !dir.files.includes(fileId)) {
      dir.files.push(fileId);
    }
  }
}
