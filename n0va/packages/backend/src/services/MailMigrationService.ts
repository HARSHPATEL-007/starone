import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function logEntry(tenantId: string, category: string, detail: string, extra: any = {}) {
  DataStore.mem().insert("mail_migration_log", {
    tenantId, category, detail, at: new Date().toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...extra,
  });
}

export const MIGRATION_PROVIDERS: any[] = [
  { id: "gmail", name: "Google Workspace (Gmail)", defaultFolders: ["inbox", "sent", "drafts", "archive", "spam"] },
  { id: "outlook", name: "Microsoft 365 (Outlook)", defaultFolders: ["inbox", "sent", "drafts", "archive", "junk"] },
  { id: "yahoo", name: "Yahoo Mail", defaultFolders: ["inbox", "sent", "drafts", "archive", "bulk"] },
  { id: "imap", name: "Generic IMAP", defaultFolders: ["inbox", "sent", "drafts", "archive", "junk"] },
];

export const MIGRATION_MODES = ["full", "last_90_days", "last_30_days"] as const;

const FOLDER_WEIGHTS: Record<string, number> = { inbox: 0.42, sent: 0.18, drafts: 0.04, archive: 0.31, spam: 0.05, bulk: 0.05, junk: 0.05 };
const MODE_FRACTION: Record<string, number> = { full: 1, last_90_days: 0.25, last_30_days: 0.08 };

const SUBJECT_POOL = [
  "Welcome to your new workspace", "Q3 invoice attached", "Project kickoff notes",
  "Budget approval needed", "Meeting rescheduled to Thursday", "Contract draft for review",
  "Monthly newsletter", "Your account summary", "Team offsite planning", "Renewal reminder",
];

function provider(id: string) {
  const p = MIGRATION_PROVIDERS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown provider "${id}" — use one of: ${MIGRATION_PROVIDERS.map((x) => x.id).join(", ")}`);
  return p;
}

export class MailMigrationService {
  private row(tenantId: string, migrationId: string) {
    const row = DataStore.mem().findOne("mail_migrations", (m: any) => m._id === migrationId && m.tenantId === tenantId);
    if (!row) throw new Error(`Migration "${migrationId}" not found`);
    return row;
  }

  private toPublic(m: any) {
    return {
      migrationId: m._id,
      provider: m.provider,
      providerName: (MIGRATION_PROVIDERS.find((p) => p.id === m.provider) || {}).name || m.provider,
      mailboxId: m.mailboxId,
      sourceEmail: m.sourceEmail,
      mode: m.mode,
      status: m.status,
      totalMessages: m.totalMessages,
      perFolder: m.perFolder || {},
      imported: m.imported || 0,
      failed: m.failed || 0,
      dedupeSkipped: m.dedupeSkipped || 0,
      storageBytes: m.storageBytes || 0,
      error: m.error || null,
      startedAt: m.startedAt,
      completedAt: m.completedAt || null,
    };
  }

  startMigration(tenantId: string, input: any) {
    const p = provider(String((input && input.provider) || ""));
    const mailboxId = String((input && input.mailboxId) || "");
    if (!mailboxId) throw new Error("mailboxId is required to migrate");
    const mailbox = DataStore.mem().findOne("mailboxes", (m: any) => m._id === mailboxId && m.tenantId === tenantId);
    if (!mailbox) throw new Error(`Mailbox "${mailboxId}" not found`);
    const sourceEmail = String((input && input.sourceEmail) || "").trim();
    if (!sourceEmail) throw new Error("sourceEmail is required");
    const mode = String((input && input.mode) || "full");
    if (!MIGRATION_MODES.includes(mode as any)) throw new Error(`Unknown mode "${mode}" — use one of: ${MIGRATION_MODES.join(", ")}`);
    const seed = `${p.id}|${sourceEmail}|${mailboxId}`;
    const totalMessages = Math.round((1200 + (hashStr(seed + "|total") % 3800)) * MODE_FRACTION[mode]);
    const weights = p.defaultFolders.map((f: string) => FOLDER_WEIGHTS[f] || 0.1);
    const wsum = weights.reduce((s: number, w: number) => s + w, 0);
    const perFolder: Record<string, number> = {};
    let acc = 0;
    p.defaultFolders.forEach((f: string, i: number) => {
      if (i === p.defaultFolders.length - 1) {
        perFolder[f] = totalMessages - acc;
      } else {
        const n = Math.round((totalMessages * weights[i]) / wsum);
        perFolder[f] = n;
        acc += n;
      }
    });
    const migration = DataStore.mem().insert("mail_migrations", {
      tenantId,
      provider: p.id,
      mailboxId,
      sourceEmail,
      mode,
      status: "scanning",
      totalMessages,
      perFolder,
      imported: 0,
      failed: 0,
      dedupeSkipped: 0,
      storageBytes: 0,
      scannedAt: null,
      importedAt: null,
      startedAt: new Date().toISOString(),
      completedAt: null,
      error: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    logEntry(tenantId, "migration_started", `${p.name} migration queued for ${sourceEmail} (${mode}, ~${totalMessages} message(s))`, { migrationId: migration._id });
    return {
      migrationId: migration._id,
      provider: p.id,
      providerName: p.name,
      sourceEmail,
      mode,
      status: "scanning",
      totalMessages,
      perFolder,
      summary: `Migration from ${p.name} queued — ${totalMessages} message(s) estimated across ${p.defaultFolders.length} folders`,
    };
  }

  migrationScan(tenantId: string, migrationId: string) {
    const m = this.row(tenantId, migrationId);
    const seed = `${m.provider}|${m.sourceEmail}|${m.mailboxId}`;
    const folders = Object.entries(m.perFolder || {}) as [string, number][];
    const scanned = folders.map(([folder, count]) => ({
      folder,
      count,
      sizeBytes: count * (800 + (hashStr(`${seed}|size|${folder}`) % 16000)),
      labels: folder === "spam" || folder === "bulk" || folder === "junk" ? ["flagged"] : [`${folder}/${hashStr(`${seed}|lbl|${folder}`) % 3 === 0 ? "promotions" : "updates"}`],
    }));
    const scannedBytes = scanned.reduce((s: number, f: any) => s + f.sizeBytes, 0);
    const updated = DataStore.mem().update("mail_migrations", (x: any) => x._id === migrationId, {
      status: "mapped",
      scannedAt: new Date().toISOString(),
      scannedFolders: scanned,
      estimatedBytes: scannedBytes,
      updatedAt: new Date().toISOString(),
    });
    logEntry(tenantId, "migration_scanned", `${m.provider} scan complete — ${folders.length} folders, ~${(scannedBytes / 1048576).toFixed(1)} MB`, { migrationId });
    return {
      migrationId,
      provider: m.provider,
      sourceEmail: m.sourceEmail,
      status: updated.status,
      folders: scanned,
      estimatedBytes: scannedBytes,
      estimatedMb: (scannedBytes / 1048576).toFixed(1),
      summary: `Scan complete — ${m.totalMessages} message(s) across ${folders.length} folders, ~${(scannedBytes / 1048576).toFixed(1)} MB`,
    };
  }

  migrationPreview(tenantId: string, migrationId: string) {
    const m = this.row(tenantId, migrationId);
    if (m.status === "scanning") throw new Error("Scan the migration before previewing");
    const seed = `${m.provider}|${m.sourceEmail}|${m.mailboxId}`;
    const folders = (m.scannedFolders && m.scannedFolders.map((f: any) => f.folder)) || Object.keys(m.perFolder || {});
    const samples = Array.from({ length: 5 }, (_, i) => {
      const folder = folders[i % folders.length];
      return {
        messageId: `mig_${m.provider}_${i}_${hashStr(`${seed}|msg|${i}`).toString(36)}`,
        subject: SUBJECT_POOL[hashStr(`${seed}|sub|${i}`) % SUBJECT_POOL.length],
        from: { name: "Migrated contact", email: `${hashStr(`${seed}|from|${i}`).toString(36).slice(0, 10)}@${m.provider}.io` },
        folder,
        date: new Date(Date.now() - (i + 1) * 86400000).toISOString().slice(0, 10),
        sizeBytes: 800 + (hashStr(`${seed}|sz|${i}`) % 16000),
      };
    });
    const folderMapping = (m.scannedFolders && m.scannedFolders.map((f: any) => f.folder)) || folders;
    const existingMig = DataStore.mem().find("messages", (x: any) => x.tenantId === tenantId && String(x.messageId || "").startsWith(`mig_${m.provider}_`));
    return {
      migrationId,
      provider: m.provider,
      sourceEmail: m.sourceEmail,
      samples,
      folderMapping: folderMapping.map((f: string) => ({ source: f, target: f === "junk" || f === "bulk" ? "spam" : f })),
      dedupeEstimate: existingMig.length,
      summary: `Preview ready — ${samples.length} sample(s), ${folderMapping.length} folder mapping(s), ${existingMig.length} already-imported message(s) will be skipped`,
    };
  }

  runMigration(tenantId: string, migrationId: string) {
    const m = this.row(tenantId, migrationId);
    if (m.status === "completed") throw new Error("Migration already completed");
    const seed = `${m.provider}|${m.sourceEmail}|${m.mailboxId}`;
    const store = DataStore.mem();
    const folders = Object.keys(m.perFolder || {});
    const importCount = Math.min(m.totalMessages, 12 + (hashStr(seed + "|import_count") % 18));
    const failCount = hashStr(seed + "|fail_count") % 3;
    let imported = 0;
    let failed = 0;
    let dedupeSkipped = 0;
    let storageBytes = 0;
    const perFolder: Record<string, number> = {};
    const now = Date.now();
    for (let i = 0; i < importCount; i++) {
      const messageId = `mig_${m.provider}_${i}_${hashStr(`${seed}|msg|${i}`).toString(36)}`;
      const isFailure = i >= importCount - failCount && failCount > 0;
      const existing = store.findOne("messages", (x: any) => x.tenantId === tenantId && x.messageId === messageId);
      if (existing) {
        dedupeSkipped++;
        continue;
      }
      if (isFailure) {
        failed++;
        continue;
      }
      const folder = folders[i % folders.length];
      const sizeBytes = 800 + (hashStr(`${seed}|sz|${i}`) % 16000);
      const fromEmail = `${hashStr(`${seed}|from|${i}`).toString(36).slice(0, 10)}@${m.provider}.io`;
      store.insert("messages", {
        tenantId,
        mailboxId: m.mailboxId,
        threadId: `thr_mig_${m.provider}_${i}`,
        messageId,
        from: { name: "Migrated contact", email: fromEmail },
        to: [{ name: m.sourceEmail, email: m.sourceEmail }],
        subject: SUBJECT_POOL[hashStr(`${seed}|sub|${i}`) % SUBJECT_POOL.length],
        body: `Imported message ${i + 1} from ${m.provider} (${m.sourceEmail}).`,
        folder,
        labels: [],
        read: true,
        starred: false,
        attachments: [],
        receivedAt: new Date(now - (i + 1) * 86400000).toISOString(),
        sentAt: null,
        importance: "normal",
        flags: ["imported"],
        ai: {},
        importedFrom: m.provider,
        importedAt: new Date().toISOString(),
        migrationId,
      });
      imported++;
      storageBytes += sizeBytes;
      perFolder[folder] = (perFolder[folder] || 0) + 1;
    }
    const updated = store.update("mail_migrations", (x: any) => x._id === migrationId, {
      status: "completed",
      imported: (m.imported || 0) + imported,
      failed: (m.failed || 0) + failed,
      dedupeSkipped: (m.dedupeSkipped || 0) + dedupeSkipped,
      storageBytes: (m.storageBytes || 0) + storageBytes,
      importedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    logEntry(tenantId, "migration_imported", `${m.provider} import finished — ${imported} imported, ${failed} failed, ${dedupeSkipped} skipped (dedupe)`, { migrationId });
    return {
      migrationId,
      provider: m.provider,
      sourceEmail: m.sourceEmail,
      status: updated.status,
      imported,
      failed,
      dedupeSkipped,
      storageBytes,
      storageMb: (storageBytes / 1048576).toFixed(1),
      perFolder,
      summary: `Import complete — ${imported} message(s) imported, ${failed} failed, ${dedupeSkipped} skipped as duplicates`,
    };
  }

  migrationStatus(tenantId: string, migrationId: string) {
    const m = this.row(tenantId, migrationId);
    const p = provider(m.provider);
    const progressPct = m.status === "completed" ? Math.min(100, Math.round(((m.imported || 0) / Math.max(1, m.totalMessages)) * 100)) : m.status === "mapped" ? 60 : 5;
    const remaining = Math.max(0, m.totalMessages - (m.imported || 0));
    return {
      ...this.toPublic(m),
      progressPct,
      remaining,
      estimatedMb: m.estimatedBytes ? (m.estimatedBytes / 1048576).toFixed(1) : "0.0",
      summary: m.status === "completed"
        ? `${p.name} migration complete — ${m.imported} imported, ${m.failed} failed, ${m.dedupeSkipped} duplicates skipped`
        : m.status === "mapped"
          ? `${p.name} migration mapped — ready to import`
          : `${p.name} migration scanning — ${m.totalMessages} message(s) estimated`,
    };
  }

  listMigrations(tenantId: string) {
    const rows = DataStore.mem().find("mail_migrations", (m: any) => m.tenantId === tenantId);
    return [...rows].sort((a: any, b: any) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()).map((m: any) => this.toPublic(m));
  }

  deleteMigration(tenantId: string, migrationId: string) {
    const m = this.row(tenantId, migrationId);
    DataStore.mem().delete("mail_migrations", (x: any) => x._id === migrationId && x.tenantId === tenantId);
    logEntry(tenantId, "migration_deleted", `Migration ${migrationId} (${m.provider} → ${m.sourceEmail}) deleted`, { migrationId });
    return { migrationId, provider: m.provider, summary: `Migration from ${m.provider} removed` };
  }

  migrationLog(tenantId: string, limit = 50) {
    const items = DataStore.mem().find("mail_migration_log", (l: any) => l.tenantId === tenantId);
    return [...items].sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit)
      .map((l: any) => ({ category: l.category, detail: l.detail, migrationId: l.migrationId || null, at: l.at }));
  }

  migrationSummary(tenantId: string) {
    const rows = DataStore.mem().find("mail_migrations", (m: any) => m.tenantId === tenantId);
    const completed = rows.filter((m: any) => m.status === "completed");
    const active = rows.filter((m: any) => m.status !== "completed");
    const importedTotal = rows.reduce((s: number, m: any) => s + (m.imported || 0), 0);
    const storageTotal = rows.reduce((s: number, m: any) => s + (m.storageBytes || 0), 0);
    const dedupeTotal = rows.reduce((s: number, m: any) => s + (m.dedupeSkipped || 0), 0);
    const providerCounts: Record<string, number> = {};
    for (const m of rows) providerCounts[m.provider] = (providerCounts[m.provider] || 0) + 1;
    return {
      total: rows.length,
      completed: completed.length,
      active: active.length,
      importedTotal,
      storageBytes: storageTotal,
      storageMb: (storageTotal / 1048576).toFixed(1),
      dedupeTotal,
      providers: Object.entries(providerCounts).map(([providerId, count]) => ({
        providerId,
        providerName: (MIGRATION_PROVIDERS.find((p) => p.id === providerId) || {}).name || providerId,
        count,
      })),
      summary: rows.length
        ? `${completed.length} of ${rows.length} migration(s) complete — ${importedTotal} message(s) imported (~${(storageTotal / 1048576).toFixed(1)} MB)`
        : "No migrations yet",
    };
  }
}

export const mailMigration = new MailMigrationService();
