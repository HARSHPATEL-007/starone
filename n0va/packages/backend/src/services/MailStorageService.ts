import { DataStore } from "./DataStore";
import { estimateMessageBytes, mailboxService } from "./MailboxService";

const TIER_NAMES = ["hot", "warm", "cool", "cold"] as const;
type TierName = (typeof TIER_NAMES)[number];

const DEFAULT_POLICY = { autoTier: false, coolAfterDays: 30, coldAfterDays: 90 };

const TIER_BY_AGE_DAYS: Array<{ maxDays: number; tier: TierName }> = [
  { maxDays: 7, tier: "hot" },
  { maxDays: 30, tier: "warm" },
  { maxDays: 90, tier: "cool" },
  { maxDays: Infinity, tier: "cold" },
];

export class MailStorageService {
  private policy(tenantId: string) {
    const p = DataStore.mem().findOne("mail_storage_policy", (r: any) => r.tenantId === tenantId);
    if (!p) {
      DataStore.mem().insert("mail_storage_policy", { tenantId, ...DEFAULT_POLICY, updatedAt: new Date().toISOString() });
      return { tenantId, ...DEFAULT_POLICY };
    }
    return p;
  }

  private tierableMessages(tenantId: string): any[] {
    return DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && ["inbox", "archive", "sent"].includes(m.folder || "inbox"));
  }

  private ageDays(m: any): number {
    const at = new Date(m.receivedAt || m.createdAt || Date.now()).getTime();
    return Math.max(0, Math.floor((Date.now() - at) / 86400000));
  }

  private tierFor(m: any): TierName {
    const days = this.ageDays(m);
    const t = TIER_BY_AGE_DAYS.find((r) => days < r.maxDays) || TIER_BY_AGE_DAYS[TIER_BY_AGE_DAYS.length - 1];
    return t.tier;
  }

  private log(tenantId: string, entry: { category: string; detail: string; subject?: string }) {
    DataStore.mem().insert("mail_ops_log", {
      tenantId,
      category: entry.category,
      subject: entry.subject || "",
      sender: "",
      detail: entry.detail,
      at: new Date().toISOString(),
    });
  }

  tieringStatus(tenantId: string) {
    const msgs = this.tierableMessages(tenantId);
    const tiers: Record<TierName, { count: number; bytes: number }> = {
      hot: { count: 0, bytes: 0 },
      warm: { count: 0, bytes: 0 },
      cool: { count: 0, bytes: 0 },
      cold: { count: 0, bytes: 0 },
    };
    for (const m of msgs) {
      const tier = m.storageTier && TIER_NAMES.includes(m.storageTier) ? (m.storageTier as TierName) : this.tierFor(m);
      const bytes = estimateMessageBytes(m);
      tiers[tier].count += 1;
      tiers[tier].bytes += bytes;
    }
    const storage = mailboxService.storageAnalytics(tenantId);
    const policy = this.policy(tenantId);
    return {
      tiers,
      tierOrder: [...TIER_NAMES],
      policy,
      quota: { usedBytes: storage.totals.usedBytes, quotaBytes: storage.totals.quotaBytes, percentUsed: storage.totals.percentUsed },
      eligibleMessages: msgs.length,
      summary: `Storage across ${msgs.length} message(s) — hot ${tiers.hot.count}, warm ${tiers.warm.count}, cool ${tiers.cool.count}, cold ${tiers.cold.count} (${storage.totals.percentUsed}% of quota used)`,
      seed: hashStr(tenantId + "storage_tiers"),
    };
  }

  setTieringPolicy(tenantId: string, opts: any = {}) {
    const coolAfterDays = Math.max(1, parseInt(String(opts.coolAfterDays || 30), 10) || 30);
    const coldAfterDays = Math.max(2, parseInt(String(opts.coldAfterDays || 90), 10) || 90);
    if (coldAfterDays <= coolAfterDays) {
      throw new Error("coldAfterDays must be greater than coolAfterDays");
    }
    const existing = this.policy(tenantId);
    const policy = {
      tenantId,
      autoTier: typeof opts.autoTier === "boolean" ? opts.autoTier : !!existing.autoTier,
      coolAfterDays,
      coldAfterDays,
      updatedAt: new Date().toISOString(),
    };
    DataStore.mem().update("mail_storage_policy", (r: any) => r.tenantId === tenantId, policy);
    this.log(tenantId, { category: "storage_policy", detail: `Tiering policy set (autoTier ${policy.autoTier}, cool ${coolAfterDays}d, cold ${coldAfterDays}d)` });
    return { policy, summary: `Tiering policy updated — auto-tier ${policy.autoTier ? "ON" : "OFF"}, cool after ${coolAfterDays}d, cold after ${coldAfterDays}d` };
  }

  runTiering(tenantId: string) {
    const policy = this.policy(tenantId);
    const msgs = this.tierableMessages(tenantId);
    const movedByTier: Record<string, number> = { cool: 0, cold: 0 };
    let moved = 0;
    let movedBytes = 0;
    for (const m of msgs) {
      const target = this.tierFor(m);
      const current = m.storageTier && TIER_NAMES.includes(m.storageTier) ? (m.storageTier as TierName) : null;
      if (current === target) continue;
      if (target === "hot" || target === "warm") continue;
      DataStore.mem().update("messages", (x: any) => x._id === m._id, { storageTier: target, tieredAt: new Date().toISOString() });
      movedByTier[target] = (movedByTier[target] || 0) + 1;
      moved += 1;
      movedBytes += estimateMessageBytes(m);
    }
    this.log(tenantId, { category: "tiering", detail: `Moved ${moved} message(s) to cool/cold — ${movedBytes} bytes` });
    return {
      moved,
      movedBytes,
      byTier: movedByTier,
      policy,
      summary: moved > 0 ? `Tiered ${moved} message(s) to cool/cold storage (${Math.round(movedBytes / 1024)} KB)` : "All messages already on the correct tier",
      seed: hashStr(tenantId + "run_tiering"),
    };
  }

  cleanupSuggestions(tenantId: string) {
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId);
    const suggestions: any[] = [];

    const newsletters = msgs.filter((m: any) => (m.ai?.category || m.category || "") === "newsletter" && m.read && this.ageDays(m) > 30 && (m.folder || "inbox") !== "trash");
    if (newsletters.length > 0) {
      suggestions.push({
        suggestionId: `news_${hashStr(tenantId + "newsletters")}`,
        type: "newsletters",
        title: `Delete ${newsletters.length} newsletters`,
        description: `You have ${newsletters.length} read newsletter(s) older than 30 days. Delete them to free space.`,
        action: "delete",
        count: newsletters.length,
        estimatedSavingsBytes: newsletters.reduce((s, m) => s + estimateMessageBytes(m), 0),
      });
    }

    const large = msgs.filter((m: any) => (m.folder || "inbox") === "inbox" && (m.attachments || []).some((a: any) => a.sizeBytes > 5 * 1024 * 1024));
    if (large.length > 0) {
      suggestions.push({
        suggestionId: `large_${hashStr(tenantId + "large_attachments")}`,
        type: "large_attachments",
        title: `Move ${large.length} large-attachment message(s) to cold storage`,
        description: `${large.length} message(s) carry attachments larger than 5 MB. Move them to the cold tier.`,
        action: "move_to_cold",
        count: large.length,
        estimatedSavingsBytes: large.reduce((s, m) => s + estimateMessageBytes(m), 0),
      });
    }

    const bySubject = new Map<string, any[]>();
    for (const m of msgs) {
      if ((m.folder || "inbox") !== "inbox") continue;
      const key = String(m.subject || "").trim().toLowerCase();
      if (!key) continue;
      if (!bySubject.has(key)) bySubject.set(key, []);
      bySubject.get(key)!.push(m);
    }
    const dupes = [...bySubject.values()].filter((g) => g.length > 2);
    if (dupes.length > 0) {
      const threads = dupes.length;
      const extra = dupes.reduce((s, g) => s + (g.length - 1), 0);
      suggestions.push({
        suggestionId: `dupes_${hashStr(tenantId + "duplicates")}`,
        type: "duplicates",
        title: `Consolidate ${threads} duplicate thread(s)`,
        description: `${extra} message(s) share subjects across ${threads} thread(s). Archive all but the newest in each.`,
        action: "consolidate",
        count: extra,
        estimatedSavingsBytes: 0,
      });
    }

    return {
      suggestions,
      total: suggestions.length,
      summary: `${suggestions.length} cleanup suggestion(s) — ${newsletters.length} newsletters, ${large.length} large attachments, ${dupes.length} duplicate threads`,
      seed: hashStr(tenantId + "cleanup_suggestions"),
    };
  }

  applyCleanup(tenantId: string, suggestionId: string) {
    const list = this.cleanupSuggestions(tenantId);
    const suggestion = list.suggestions.find((s: any) => s.suggestionId === suggestionId);
    if (!suggestion) throw new Error("Suggestion not found");
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && (m.folder || "inbox") !== "trash");
    let touched = 0;
    let bytes = 0;
    if (suggestion.type === "newsletters") {
      const targets = msgs.filter((m: any) => (m.ai?.category || m.category || "") === "newsletter" && m.read && this.ageDays(m) > 30);
      for (const m of targets) {
        DataStore.mem().update("messages", (x: any) => x._id === m._id, { folder: "trash", storageTier: undefined });
        touched += 1;
        bytes += estimateMessageBytes(m);
      }
    } else if (suggestion.type === "large_attachments") {
      const targets = msgs.filter((m: any) => (m.attachments || []).some((a: any) => a.sizeBytes > 5 * 1024 * 1024) && (m.folder || "inbox") === "inbox");
      for (const m of targets) {
        DataStore.mem().update("messages", (x: any) => x._id === m._id, { folder: "archive", storageTier: "cold", tieredAt: new Date().toISOString() });
        touched += 1;
        bytes += estimateMessageBytes(m);
      }
    } else if (suggestion.type === "duplicates") {
      const bySubject = new Map<string, any[]>();
      for (const m of msgs) {
        const key = String(m.subject || "").trim().toLowerCase();
        if (!key) continue;
        if (!bySubject.has(key)) bySubject.set(key, []);
        bySubject.get(key)!.push(m);
      }
      for (const group of bySubject.values()) {
        if (group.length <= 2) continue;
        const sorted = [...group].sort((a, b) => new Date(b.receivedAt || b.createdAt || 0).getTime() - new Date(a.receivedAt || a.createdAt || 0).getTime());
        const keep = sorted[0];
        for (const m of sorted.slice(1)) {
          DataStore.mem().update("messages", (x: any) => x._id === m._id, { folder: "archive", storageTier: undefined });
          touched += 1;
        }
        void keep;
      }
    }
    this.log(tenantId, { category: "cleanup", detail: `${suggestion.type}: applied to ${touched} message(s)` });
    return {
      suggestion,
      touched,
      freedBytes: bytes,
      summary: `Applied "${suggestion.title}" — ${touched} message(s) touched`,
    };
  }

  applyAllCleanups(tenantId: string) {
    const list = this.cleanupSuggestions(tenantId);
    let touched = 0;
    let freedBytes = 0;
    const applied: string[] = [];
    for (const s of list.suggestions) {
      const res = this.applyCleanup(tenantId, s.suggestionId);
      touched += res.touched;
      freedBytes += res.freedBytes;
      applied.push(s.type);
    }
    this.log(tenantId, { category: "cleanup_all", detail: `Applied ${applied.length} cleanup suggestion(s)` });
    return {
      applied,
      touched,
      freedBytes,
      summary: `Applied ${applied.length} cleanup suggestion(s) — ${touched} message(s) touched, ${Math.round(freedBytes / 1024)} KB freed`,
    };
  }

  storageForecast(tenantId: string) {
    const storage = mailboxService.storageAnalytics(tenantId);
    const usedBytes = storage.totals.usedBytes;
    const quotaBytes = storage.totals.quotaBytes || 1;
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId);
    const growthPerDay = msgs.length === 0 ? 0 : 1024 * 1024 * (1 + (hashStr(tenantId + "growth") % 4)); // 1-4 MB/day deterministic
    const days = [30, 60, 90];
    const projected = days.map((d) => ({ days: d, projectedBytes: usedBytes + growthPerDay * d }));
    const hitDays = growthPerDay === 0 ? null : Math.ceil((quotaBytes - usedBytes) / growthPerDay);
    return {
      usedBytes,
      quotaBytes,
      growthPerDay,
      projected,
      quotaHitDays: hitDays,
      summary: growthPerDay === 0
        ? `No message activity — storage flat at ${Math.round(usedBytes / 1024 / 1024)} MB`
        : `At +${Math.round(growthPerDay / 1024 / 1024)} MB/day, quota hits in ~${hitDays === null ? "—" : hitDays} day(s)`,
      seed: hashStr(tenantId + "storage_forecast"),
    };
  }

  storageDashboard(tenantId: string) {
    const tiers = this.tieringStatus(tenantId);
    const suggestions = this.cleanupSuggestions(tenantId);
    const forecast = this.storageForecast(tenantId);
    return {
      ...tiers,
      suggestions: suggestions.suggestions,
      suggestionsTotal: suggestions.total,
      forecast,
      generatedAt: new Date().toISOString(),
      summary: `${tiers.summary} · ${suggestions.summary} · ${forecast.summary}`,
      seed: hashStr(tenantId + "storage_dashboard"),
    };
  }
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export const mailStorage = new MailStorageService();
