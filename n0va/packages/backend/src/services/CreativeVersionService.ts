interface VersionEntry {
  id: string;
  creativeId: string;
  tenantId: string;
  version: number;
  snapshot: Record<string, any>;
  changeDescription: string;
  changedBy: string;
  createdAt: string;
}

export class CreativeVersionService {
  private versions: VersionEntry[] = [];
  private counters: Map<string, number> = new Map();

  createVersion(creativeId: string, tenantId: string, snapshot: Record<string, any>, changeDescription: string, changedBy: string): VersionEntry {
    const current = this.counters.get(creativeId) || 0;
    const next = current + 1;
    this.counters.set(creativeId, next);

    const entry: VersionEntry = {
      id: `cv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      creativeId,
      tenantId,
      version: next,
      snapshot,
      changeDescription,
      changedBy,
      createdAt: new Date().toISOString(),
    };

    this.versions.push(entry);
    return entry;
  }

  getVersions(creativeId: string, tenantId: string): VersionEntry[] {
    return this.versions
      .filter((v) => v.creativeId === creativeId && v.tenantId === tenantId)
      .sort((a, b) => b.version - a.version);
  }

  getVersion(versionId: string, tenantId: string): VersionEntry | undefined {
    return this.versions.find((v) => v.id === versionId && v.tenantId === tenantId);
  }

  deleteVersion(versionId: string, tenantId: string): boolean {
    const idx = this.versions.findIndex((v) => v.id === versionId && v.tenantId === tenantId);
    if (idx === -1) return false;
    this.versions.splice(idx, 1);
    return true;
  }

  getLatestVersion(creativeId: string, tenantId: string): VersionEntry | undefined {
    return this.versions
      .filter((v) => v.creativeId === creativeId && v.tenantId === tenantId)
      .sort((a, b) => b.version - a.version)[0];
  }
}

export const creativeVersionService = new CreativeVersionService();
