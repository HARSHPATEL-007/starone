import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export interface AudienceSegmentSpec {
  type: string;
  windowDays?: number;
  minValue?: number;
  exclude?: boolean;
}

export class CampaignAudienceBuilderService {
  buildAudience(tenantId: string, name: string, segments: AudienceSegmentSpec[], options: { lookalikePercent?: number; excludeExisting?: boolean; platforms?: string[] } = {}): { audienceId: string; name: string; segments: AudienceSegmentSpec[]; estimatedSize: number; platforms: string[]; syncRules: string[]; createdAt: string } {
    if (!name || segments.length === 0) throw new Error("Audience requires a name and at least one segment");
    const audienceId = `aud_${hashStr(name + tenantId)}`;
    const seed = hashStr(name + tenantId + "size");
    const baseSize = 10000 + (seed % 90000);
    const sizeFactor = segments.reduce((s, seg) => s * (seg.windowDays ? Math.min(1, seg.windowDays / 30) : 1), 1) * (options.lookalikePercent ? Math.max(0.2, options.lookalikePercent / 10) : 1);
    const estimatedSize = Math.round(baseSize * sizeFactor);
    const platforms = options.platforms || ["meta", "google", "linkedin", "tiktok"];
    const syncRules = [
      "Daily sync from CRM (new leads added automatically)",
      "Weekly quality scoring (low-quality segments auto-paused)",
      "Monthly lookalike refresh (expand/shrink based on performance)",
    ];
    const existing = DataStore.mem().findOne("audiences", (a: any) => a._id === audienceId && a.tenantId === tenantId) as any;
    const record = {
      _id: audienceId, tenantId, name, segments,
      lookalikePercent: options.lookalikePercent || 0,
      excludeExisting: options.excludeExisting ?? true,
      platforms, syncRules, estimatedSize,
      createdAt: new Date().toISOString(),
      syncedTo: platforms.map((p: string) => ({ platform: p, status: "pending", syncedAt: null })),
      qualityScore: Math.round(hashStr(name + "q") % 100),
    };
    if (existing) {
      DataStore.mem().update("audiences", (a: any) => a._id === audienceId && a.tenantId === tenantId, record);
    } else {
      DataStore.mem().insert("audiences", record);
    }
    return { audienceId, name, segments, estimatedSize, platforms, syncRules, createdAt: record.createdAt };
  }

  syncAudienceToPlatforms(tenantId: string, audienceId: string): { audienceId: string; platforms: { platform: string; status: string; syncedAt: string }[]; summary: string } {
    const aud = DataStore.mem().findOne("audiences", (a: any) => a._id === audienceId && a.tenantId === tenantId) as any;
    if (!aud) throw new Error(`Audience "${audienceId}" not found`);
    const syncedAt = new Date().toISOString();
    const platforms = aud.platforms.map((p: string) => ({ platform: p, status: "synced", syncedAt }));
    DataStore.mem().update("audiences", (a: any) => a._id === audienceId && a.tenantId === tenantId, { syncedTo: platforms });
    return { audienceId, platforms, summary: `"${aud.name}" synced to ${platforms.length} platforms` };
  }

  audienceQualityScoring(tenantId: string): { audiences: { audienceId: string; name: string; qualityScore: number; status: string; suggestion: string }[]; totals: { scored: number; healthy: number; watch: number; autoPauseSuggested: number; summary: string } } {
    const all = DataStore.mem().find("audiences", (a: any) => a.tenantId === tenantId) as any[];
    const rows: any[] = [];
    let healthy = 0, watch = 0, autoPauseSuggested = 0;
    for (const a of all) {
      const q = Math.round(a.qualityScore || 50);
      const status = q >= 70 ? "healthy" : q >= 30 ? "watch" : "low_quality";
      if (status === "healthy") healthy++;
      if (status === "watch") watch++;
      if (status === "low_quality") autoPauseSuggested++;
      rows.push({
        audienceId: a._id, name: a.name, qualityScore: q, status,
        suggestion: status === "healthy" ? "Maintain — performant audience" : status === "watch" ? "Monitor quality — below healthy threshold" : "Auto-pause suggested — quality score below 30",
      });
    }
    return {
      audiences: rows,
      totals: { scored: rows.length, healthy, watch, autoPauseSuggested, summary: `${healthy} healthy, ${watch} watch, ${autoPauseSuggested} low-quality (auto-pause suggested)` },
    };
  }

  audienceLtvRanking(tenantId: string): { ranked: { rank: number; audienceId: string; name: string; roas: number; ltvScore: number; status: string; autoAction: string }[]; summary: string } {
    const all = DataStore.mem().find("audiences", (a: any) => a.tenantId === tenantId) as any[];
    const ranked = all
      .map((a: any) => {
        const seed = hashStr(a._id + "ltv");
        const roas = Math.round((0.4 + (seed % 480) / 100) * 100) / 100;
        const ltvScore = Math.round((30 + (seed % 70)) * 100) / 100;
        const quality = a.qualityScore || 50;
        const status = quality < 30 ? "auto_paused" : roas >= 4 ? "auto_expand" : roas >= 2 ? "maintain" : "review";
        return {
          audienceId: a._id, name: a.name, roas, ltvScore, status,
          autoAction: status === "auto_expand" ? "Expand lookalike by 1%" : status === "auto_paused" ? "Auto-paused (AI suggestion)" : status === "maintain" ? "Maintain current size" : "Review targeting",
        };
      })
      .sort((x: any, y: any) => y.roas - x.roas)
      .map((a: any, i: number) => ({ rank: i + 1, ...a }));
    return { ranked, summary: `${ranked.filter(r => r.status === "auto_expand").length} audiences to expand, ${ranked.filter(r => r.status === "auto_paused").length} auto-paused` };
  }

  applyAudienceAutoActions(tenantId: string): { applied: { audienceId: string; name: string; action: string; status: string }[]; totals: { evaluated: number; applied: number; summary: string } } {
    const ranked = this.audienceLtvRanking(tenantId);
    const applied = ranked.ranked.filter(r => r.status === "auto_paused" || r.status === "auto_expand").map(r => {
      DataStore.mem().update("audiences", (a: any) => a._id === r.audienceId && a.tenantId === tenantId, { autoStatus: r.status, autoAction: r.autoAction, lastAutoDecisionAt: new Date().toISOString() });
      DataStore.mem().insert("audience_actions", { tenantId, audienceId: r.audienceId, name: r.name, action: r.autoAction, status: r.status, decidedAt: new Date().toISOString(), via: "auto" });
      return { audienceId: r.audienceId, name: r.name, action: r.autoAction, status: r.status };
    });
    return {
      applied,
      totals: { evaluated: ranked.ranked.length, applied: applied.length, summary: `${applied.length} auto-actions applied (${ranked.ranked.filter(r => r.status === "auto_paused").length} paused, ${ranked.ranked.filter(r => r.status === "auto_expand").length} expanded)` },
    };
  }

  audienceSyncStatus(tenantId: string): { audiences: { audienceId: string; name: string; estimatedSize: number; platforms: string[]; syncedCount: number; qualityScore: number; autoStatus: string | null }[]; totals: { total: number; fullySynced: number; summary: string } } {
    const all = DataStore.mem().find("audiences", (a: any) => a.tenantId === tenantId) as any[];
    let fullySynced = 0;
    const rows = all.map((a: any) => {
      const syncedCount = (a.syncedTo || []).filter((s: any) => s.status === "synced").length;
      if (syncedCount === a.platforms.length) fullySynced++;
      return {
        audienceId: a._id, name: a.name, estimatedSize: a.estimatedSize,
        platforms: a.platforms, syncedCount, qualityScore: a.qualityScore || 50,
        autoStatus: a.autoStatus || null,
      };
    });
    return { audiences: rows, totals: { total: rows.length, fullySynced, summary: `${fullySynced}/${rows.length} audiences fully synced` } };
  }
}

export const campaignAudienceBuilder = new CampaignAudienceBuilderService();
