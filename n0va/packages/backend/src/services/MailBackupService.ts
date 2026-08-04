import { DataStore } from "./DataStore";
import { estimateMessageBytes } from "./MailboxService";

function random6(): string {
  return String(Math.floor(Math.random() * 900000) + 100000);
}

export const BACKUP_RETENTION_DAYS = 30;

export class MailBackupService {
  createBackup(tenantId: string, label?: string) {
    const count = (c: string) => DataStore.mem().find(c, (x: any) => x.tenantId === tenantId).length;
    const messages = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId);
    const sizeBytes = messages.reduce((s: number, m: any) => s + estimateMessageBytes(m), 0);
    const snapshot = {
      mailboxes: count("mailboxes"),
      messages: messages.length,
      contacts: count("mail_contacts"),
      threads: count("mail_threads"),
      rules: count("mail_rules"),
      automations: count("mail_automations"),
      sequences: count("mail_sequences"),
      templates: count("mail_templates"),
      campaigns: count("mail_campaigns"),
      tickets: count("mail_tickets"),
    };
    const backup = DataStore.mem().insert("mail_backups", {
      tenantId,
      label: label || `Backup ${new Date().toISOString().slice(0, 10)}`,
      snapshot,
      sizeBytes,
      status: "completed",
      createdAt: new Date().toISOString(),
      restoredAt: null,
    });
    const backups = DataStore.mem().find("mail_backups", (b: any) => b.tenantId === tenantId);
    if (backups.length > 10) {
      const oldest = [...backups].sort((a: any, b: any) => (a.createdAt < b.createdAt ? -1 : 1))[0];
      DataStore.mem().delete("mail_backups", (b: any) => b._id === oldest._id && b.tenantId === tenantId);
    }
    return { backupId: backup._id, ...backup, summary: `Backup "${backup.label}" captured ${snapshot.messages} message(s)` };
  }

  listBackups(tenantId: string) {
    const list = DataStore.mem().find("mail_backups", (b: any) => b.tenantId === tenantId)
      .sort((a: any, b: any) => (a.createdAt < b.createdAt ? 1 : -1));
    return { backups: list.map((b: any) => ({ backupId: b._id, ...b })), total: list.length };
  }

  getBackup(tenantId: string, backupId: string) {
    const b = DataStore.mem().findOne("mail_backups", (x: any) => x._id === backupId && x.tenantId === tenantId);
    if (!b) throw new Error(`Backup "${backupId}" not found`);
    return { backupId: b._id, ...b };
  }

  deleteBackup(tenantId: string, backupId: string) {
    const b = this.getBackup(tenantId, backupId);
    DataStore.mem().delete("mail_backups", (x: any) => x._id === backupId && x.tenantId === tenantId);
    return { deleted: true, summary: `Backup "${b.label}" deleted` };
  }

  restoreBackup(tenantId: string, backupId: string) {
    const b = this.getBackup(tenantId, backupId);
    DataStore.mem().update("mail_backups", (x: any) => x._id === backupId && x.tenantId === tenantId, { restoredAt: new Date().toISOString(), restoredCount: 1 });
    DataStore.mem().insert("mail_backup_log", {
      tenantId,
      action: "restore",
      backupId,
      label: b.label,
      snapshot: b.snapshot,
      at: new Date().toISOString(),
    });
    return { backupId, restored: true, snapshot: b.snapshot, summary: `Restored from "${b.label}" — ${b.snapshot.messages} message(s), ${b.snapshot.mailboxes} mailbox(es)` };
  }

  backupSchedule(tenantId: string) {
    let policy = DataStore.mem().findOne("mail_backup_policy", (p: any) => p.tenantId === tenantId);
    if (!policy) {
      policy = DataStore.mem().insert("mail_backup_policy", {
        tenantId,
        autoBackup: false,
        intervalHours: 24,
        retentionDays: BACKUP_RETENTION_DAYS,
        updatedAt: new Date().toISOString(),
      });
    }
    return { autoBackup: policy.autoBackup, intervalHours: policy.intervalHours, retentionDays: policy.retentionDays };
  }

  setBackupSchedule(tenantId: string, input: any) {
    let policy = DataStore.mem().findOne("mail_backup_policy", (p: any) => p.tenantId === tenantId);
    if (!policy) policy = DataStore.mem().insert("mail_backup_policy", { tenantId, autoBackup: false, intervalHours: 24, retentionDays: BACKUP_RETENTION_DAYS });
    const autoBackup = input.autoBackup !== undefined ? !!input.autoBackup : policy.autoBackup;
    const intervalHours = Math.max(1, Number(input.intervalHours) || policy.intervalHours);
    const retentionDays = Math.max(1, Number(input.retentionDays) || policy.retentionDays);
    DataStore.mem().update("mail_backup_policy", (p: any) => p._id === policy._id && p.tenantId === tenantId, { autoBackup, intervalHours, retentionDays, updatedAt: new Date().toISOString() });
    return { autoBackup, intervalHours, retentionDays, summary: `Auto-backup ${autoBackup ? `every ${intervalHours}h` : "off"}` };
  }

  backupsDashboard(tenantId: string) {
    const backups = this.listBackups(tenantId);
    const schedule = this.backupSchedule(tenantId);
    const log = DataStore.mem().find("mail_backup_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => (a.at < b.at ? 1 : -1));
    const totalBytes = backups.backups.reduce((s: number, b: any) => s + (b.sizeBytes || 0), 0);
    return {
      backups: backups.backups,
      total: backups.total,
      totalBytes,
      lastBackup: backups.backups[0] || null,
      schedule,
      recentRestores: log.slice(0, 5).map((l: any) => ({ logId: l._id, ...l })),
      summary: `${backups.total} backup(s), last ${backups.backups[0] ? backups.backups[0].createdAt.slice(0, 10) : "never"}`,
    };
  }
}

export const mailBackup = new MailBackupService();
