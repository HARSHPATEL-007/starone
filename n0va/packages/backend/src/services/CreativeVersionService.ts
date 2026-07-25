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

interface DiffResult {
  path: string;
  type: "added" | "removed" | "changed";
  oldValue?: any;
  newValue?: any;
  significance: "major" | "minor" | "patch";
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

  // ─── Structural Diff ────────────────────────────────────────────────

  /**
   * Deep-diff two version snapshots and classify each change.
   * Returns a structured list of diffs with significance ratings.
   */
  diff(versionA: string, versionB: string, tenantId: string): {
    diffs: DiffResult[];
    summary: { major: number; minor: number; patch: number };
    recommendedBump: "major" | "minor" | "patch" | "none";
  } {
    const a = this.getVersion(versionA, tenantId);
    const b = this.getVersion(versionB, tenantId);
    if (!a || !b) throw new Error("One or both versions not found");

    const diffs: DiffResult[] = [];
    this.deepDiff(a.snapshot, b.snapshot, "", diffs);

    const summary = { major: 0, minor: 0, patch: 0 };
    for (const d of diffs) {
      summary[d.significance]++;
    }

    const recommendedBump: "major" | "minor" | "patch" | "none" =
      summary.major > 0 ? "major" : summary.minor > 0 ? "minor" : summary.patch > 0 ? "patch" : "none";

    return { diffs, summary, recommendedBump };
  }

  private deepDiff(oldObj: any, newObj: any, basePath: string, diffs: DiffResult[]): void {
    const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);

    for (const key of allKeys) {
      const path = basePath ? `${basePath}.${key}` : key;
      const oldVal = oldObj?.[key];
      const newVal = newObj?.[key];

      if (!(key in (oldObj || {}))) {
        diffs.push({ path, type: "added", newValue: newVal, significance: this.classifySignificance(key, newVal) });
      } else if (!(key in (newObj || {}))) {
        diffs.push({ path, type: "removed", oldValue: oldVal, significance: this.classifySignificance(key, oldVal) });
      } else if (typeof oldVal === "object" && typeof newVal === "object" && oldVal !== null && newVal !== null && !Array.isArray(oldVal)) {
        this.deepDiff(oldVal, newVal, path, diffs);
      } else if (oldVal !== newVal) {
        const isStructural = typeof oldVal === "object" || typeof newVal === "object";
        diffs.push({
          path, type: "changed",
          oldValue: isStructural ? JSON.stringify(oldVal).slice(0, 200) : oldVal,
          newValue: isStructural ? JSON.stringify(newVal).slice(0, 200) : newVal,
          significance: this.classifySignificance(key, newVal),
        });
      }
    }
  }

  private classifySignificance(key: string, value: any): "major" | "minor" | "patch" {
    const majorKeys = ["headline", "body", "cta", "callToAction", "landingPageUrl", "destinationUrl", "creativeType", "mediaUrl", "videoUrl", "imageUrl"];
    const minorKeys = ["description", "headline2", "subheadline", "buttonText", "displayUrl", "path1", "path2", "finalUrl"];
    const lowerKey = key.toLowerCase();

    if (majorKeys.some((k) => lowerKey.includes(k))) return "major";
    if (minorKeys.some((k) => lowerKey.includes(k))) return "minor";
    if (typeof value === "string" && String(value).length > 50) return "minor";
    return "patch";
  }

  // ─── Rollback Impact Analysis ───────────────────────────────────────

  /**
   * Analyze the impact of rolling back to a previous version.
   * Shows what would change and estimates risk.
   */
  analyzeRollback(
    creativeId: string,
    tenantId: string,
    targetVersion: number,
  ): {
    rollbackFrom: { version: number; createdAt: string };
    rollbackTo: { version: number; createdAt: string };
    changes: DiffResult[];
    riskScore: number;
    riskLevel: "low" | "medium" | "high";
    estimatedRevertTime: string;
  } {
    const allVersions = this.getVersions(creativeId, tenantId);
    const current = allVersions[0];
    const target = allVersions.find((v) => v.version === targetVersion);

    if (!current) throw new Error("No current version found");
    if (!target) throw new Error(`Target version ${targetVersion} not found`);

    const diffResult = this.diff(current.id, target.id, tenantId);
    const majorChanges = diffResult.diffs.filter((d) => d.significance === "major").length;
    const riskScore = Math.min(100, majorChanges * 25 + diffResult.summary.minor * 10 + diffResult.summary.patch * 2);
    const riskLevel: "low" | "medium" | "high" = riskScore > 60 ? "high" : riskScore > 30 ? "medium" : "low";

    const estimatedRevertTime = majorChanges > 3 ? "~2-4 hours (requires QA)" : majorChanges > 0 ? "~30-60 minutes" : "~5-15 minutes";

    return {
      rollbackFrom: { version: current.version, createdAt: current.createdAt },
      rollbackTo: { version: target.version, createdAt: target.createdAt },
      changes: diffResult.diffs,
      riskScore,
      riskLevel,
      estimatedRevertTime,
    };
  }

  // ─── Semantic Version Analysis ──────────────────────────────────────

  /**
   * Analyze the version history and produce a semantic version summary.
   */
  semanticAnalysis(creativeId: string, tenantId: string): {
    currentVersion: number; totalVersions: number;
    versionHistory: { version: number; semver: string; changeDescription: string; changedBy: string; createdAt: string }[];
    totalMajorChanges: number; totalMinorChanges: number; totalPatchChanges: number;
    versionVelocity: string; mostActiveAuthor: string;
  } {
    const all = this.getVersions(creativeId, tenantId);
    if (all.length === 0) {
      return { currentVersion: 0, totalVersions: 0, versionHistory: [], totalMajorChanges: 0, totalMinorChanges: 0, totalPatchChanges: 0, versionVelocity: "N/A", mostActiveAuthor: "N/A" };
    }

    let totalMajor = 0, totalMinor = 0, totalPatch = 0;
    const authorCounts: Record<string, number> = {};

    const history = all.map((v, i) => {
      authorCounts[v.changedBy] = (authorCounts[v.changedBy] || 0) + 1;

      // Determine semantic version bump by comparing with previous version
      let semver = "v1.0.0";
      if (i < all.length - 1) {
        const diffResult = this.diff(v.id, all[i + 1].id, tenantId);
        const s = diffResult.recommendedBump;
        if (s === "major") { totalMajor++; semver = `v${totalMajor + 1}.${totalMinor}.${totalPatch}`; }
        else if (s === "minor") { totalMinor++; semver = `v${totalMajor + 1}.${totalMinor}.${totalPatch}`; }
        else { totalPatch++; semver = `v${totalMajor + 1}.${totalMinor}.${totalPatch}`; }
      }

      return { version: v.version, semver, changeDescription: v.changeDescription, changedBy: v.changedBy, createdAt: v.createdAt };
    });

    // Version velocity: average days between versions
    const timestamps = all.map((v) => new Date(v.createdAt).getTime()).sort((a, b) => a - b);
    let versionVelocity = "N/A";
    if (timestamps.length >= 2) {
      const totalDays = (timestamps[timestamps.length - 1] - timestamps[0]) / 86400000;
      const avgDays = totalDays / (timestamps.length - 1);
      versionVelocity = avgDays < 1 ? `${Math.round(avgDays * 24)}h between versions` : `${Math.round(avgDays)}d between versions`;
    }

    const mostActiveAuthor = Object.entries(authorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

    return {
      currentVersion: all[0].version,
      totalVersions: all.length,
      versionHistory: history,
      totalMajorChanges: totalMajor,
      totalMinorChanges: totalMinor,
      totalPatchChanges: totalPatch,
      versionVelocity,
      mostActiveAuthor,
    };
  }

  /**
   * Given two versions, compute a composite change footprint score
   * that measures how much the creative has evolved.
   */
  changeFootprint(versionA: string, versionB: string, tenantId: string): { totalChanges: number; footprintScore: number; normalizedScore: number; dominantChangeType: "text" | "visual" | "url" | "settings" } {
    const diffResult = this.diff(versionA, versionB, tenantId);
    const totalChanges = diffResult.diffs.length;

    // Score: major=3, minor=2, patch=1
    const footprintScore = diffResult.summary.major * 3 + diffResult.summary.minor * 2 + diffResult.summary.patch;
    const normalizedScore = Math.min(1, footprintScore / 20);

    // Dominant change type by path analysis
    const textChanges = diffResult.diffs.filter((d) => /headline|body|cta|description|text|button/i.test(d.path)).length;
    const visualChanges = diffResult.diffs.filter((d) => /image|video|media|icon|color|font|style|width|height/i.test(d.path)).length;
    const urlChanges = diffResult.diffs.filter((d) => /url|link|destination|landing/i.test(d.path)).length;
    const settingsChanges = diffResult.diffs.filter((d) => /budget|bid|target|schedule|platform|status/i.test(d.path)).length;

    const dominantChangeType: "text" | "visual" | "url" | "settings" =
      textChanges >= visualChanges && textChanges >= urlChanges && textChanges >= settingsChanges ? "text" :
      visualChanges >= urlChanges && visualChanges >= settingsChanges ? "visual" :
      urlChanges >= settingsChanges ? "url" : "settings";

    return {
      totalChanges,
      footprintScore,
      normalizedScore: Math.round(normalizedScore * 100) / 100,
      dominantChangeType,
    };
  }
}

export const creativeVersionService = new CreativeVersionService();
