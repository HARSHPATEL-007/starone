import { DataStore } from "./DataStore";
import { mailMessage } from "./MailMessageService";

export const DEFAULT_LABEL_COLOR = "#4A90D9";

export class MailLabelService {
  private log(tenantId: string, entry: any) {
    DataStore.mem().insert("mail_label_log", { tenantId, ...entry, at: new Date().toISOString() });
  }

  listLabels(tenantId: string) {
    const labels = DataStore.mem().find("mail_labels", (l: any) => l.tenantId === tenantId);
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId);
    const rows = labels.map((l: any) => {
      const labeled = msgs.filter((m: any) => (m.labels || []).includes(l.name));
      return {
        labelId: l._id,
        name: l.name,
        color: l.color || DEFAULT_LABEL_COLOR,
        autoApplyRules: l.autoApplyRules || [],
        count: labeled.length,
        unread: labeled.filter((m: any) => !m.read).length,
        createdAt: l.createdAt,
      };
    });
    rows.sort((a: any, b: any) => b.count - a.count || a.name.localeCompare(b.name));
    return {
      labels: rows,
      total: rows.length,
      summary: `${rows.length} label(s) · ${rows.reduce((s, r) => s + r.count, 0)} message(s) labeled`,
    };
  }

  getLabel(tenantId: string, labelId: string) {
    const row = DataStore.mem().findOne("mail_labels", (l: any) => l._id === labelId && l.tenantId === tenantId);
    if (!row) throw new Error(`Label "${labelId}" not found`);
    const all = this.listLabels(tenantId);
    const found = all.labels.find((l: any) => l.labelId === labelId);
    return found || { labelId: row._id, name: row.name, color: row.color || DEFAULT_LABEL_COLOR, autoApplyRules: row.autoApplyRules || [], count: 0, unread: 0, createdAt: row.createdAt };
  }

  createLabel(tenantId: string, input: any) {
    if (!input || !input.name) throw new Error("Label name is required");
    const name = String(input.name).trim();
    if (!name) throw new Error("Label name is required");
    if (DataStore.mem().findOne("mail_labels", (l: any) => l.tenantId === tenantId && l.name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`Label "${name}" already exists`);
    }
    const color = input.color && /^#[0-9a-fA-F]{3,8}$/.test(String(input.color)) ? String(input.color) : DEFAULT_LABEL_COLOR;
    const autoApplyRules = Array.isArray(input.autoApplyRules) ? input.autoApplyRules.map(String) : [];
    const label = DataStore.mem().insert("mail_labels", { tenantId, name, color, autoApplyRules });
    this.log(tenantId, { type: "label_created", labelId: label._id, name, detail: `Label "${name}" created` });
    return { labelId: label._id, name, color, autoApplyRules, summary: `Label "${name}" created` };
  }

  updateLabel(tenantId: string, labelId: string, patch: any) {
    const row = DataStore.mem().findOne("mail_labels", (l: any) => l._id === labelId && l.tenantId === tenantId);
    if (!row) throw new Error(`Label "${labelId}" not found`);
    const changes: any = {};
    if (patch && patch.name !== undefined && patch.name !== row.name) {
      const name = String(patch.name).trim();
      if (!name) throw new Error("Label name is required");
      if (DataStore.mem().findOne("mail_labels", (l: any) => l.tenantId === tenantId && l._id !== labelId && l.name.toLowerCase() === name.toLowerCase())) {
        throw new Error(`Label "${name}" already exists`);
      }
      changes.name = name;
      const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && (m.labels || []).includes(row.name));
      for (const m of msgs) {
        DataStore.mem().update("messages", (x: any) => x._id === m._id, { labels: m.labels.map((l: string) => (l === row.name ? name : l)) });
      }
    }
    if (patch && patch.color !== undefined) {
      changes.color = /^#[0-9a-fA-F]{3,8}$/.test(String(patch.color)) ? String(patch.color) : DEFAULT_LABEL_COLOR;
    }
    if (patch && patch.autoApplyRules !== undefined) {
      changes.autoApplyRules = Array.isArray(patch.autoApplyRules) ? patch.autoApplyRules.map(String) : [];
    }
    if (Object.keys(changes).length === 0) return this.getLabel(tenantId, labelId);
    const updated = DataStore.mem().update("mail_labels", (l: any) => l._id === labelId && l.tenantId === tenantId, changes);
    this.log(tenantId, { type: "label_updated", labelId, name: updated.name, detail: `Label "${updated.name}" updated` });
    return this.getLabel(tenantId, labelId);
  }

  deleteLabel(tenantId: string, labelId: string) {
    const row = DataStore.mem().findOne("mail_labels", (l: any) => l._id === labelId && l.tenantId === tenantId);
    if (!row) throw new Error(`Label "${labelId}" not found`);
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && (m.labels || []).includes(row.name));
    let stripped = 0;
    for (const m of msgs) {
      DataStore.mem().update("messages", (x: any) => x._id === m._id, { labels: m.labels.filter((l: string) => l !== row.name) });
      stripped++;
    }
    DataStore.mem().delete("mail_labels", (l: any) => l._id === labelId && l.tenantId === tenantId);
    this.log(tenantId, { type: "label_deleted", labelId, name: row.name, detail: `Label "${row.name}" deleted (stripped from ${stripped} message(s))` });
    return { labelId, name: row.name, stripped, summary: `Label "${row.name}" deleted (stripped from ${stripped} message(s))` };
  }

  applyLabel(tenantId: string, labelId: string, messageId: string) {
    const row = DataStore.mem().findOne("mail_labels", (l: any) => l._id === labelId && l.tenantId === tenantId);
    if (!row) throw new Error(`Label "${labelId}" not found`);
    const res = mailMessage.applyLabel(tenantId, messageId, row.name);
    this.log(tenantId, { type: "label_applied", labelId, name: row.name, messageId, detail: `Label "${row.name}" applied to ${messageId}` });
    return { ...res, labelId, color: row.color || DEFAULT_LABEL_COLOR };
  }

  removeLabel(tenantId: string, labelId: string, messageId: string) {
    const row = DataStore.mem().findOne("mail_labels", (l: any) => l._id === labelId && l.tenantId === tenantId);
    if (!row) throw new Error(`Label "${labelId}" not found`);
    const res = mailMessage.removeLabel(tenantId, messageId, row.name);
    this.log(tenantId, { type: "label_removed", labelId, name: row.name, messageId, detail: `Label "${row.name}" removed from ${messageId}` });
    return { ...res, labelId };
  }

  labelDashboard(tenantId: string) {
    const list = this.listLabels(tenantId);
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId);
    const labeledNames = new Set(list.labels.map((l: any) => l.name));
    const unlabeled = msgs.filter((m: any) => !(m.labels || []).some((l: string) => labeledNames.has(l))).length;
    const log = DataStore.mem().find("mail_label_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 8);
    return {
      total: list.total,
      colored: list.labels.filter((l: any) => l.color !== DEFAULT_LABEL_COLOR).length,
      withRules: list.labels.filter((l: any) => (l.autoApplyRules || []).length > 0).length,
      labeledMessages: list.labels.reduce((s: number, l: any) => s + l.count, 0),
      unlabeled,
      topLabels: list.labels.slice(0, 5).map((l: any) => ({ name: l.name, color: l.color, count: l.count })),
      recentActivity: log,
      summary: `${list.total} label(s) · ${list.labels.reduce((s, l) => s + l.count, 0)} labeled · ${unlabeled} unlabeled message(s)`,
    };
  }

  labelLog(tenantId: string, limit = 25) {
    const log = DataStore.mem().find("mail_label_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, limit);
    return { log, total: log.length };
  }
}

export const mailLabel = new MailLabelService();
