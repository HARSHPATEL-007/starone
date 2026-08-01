import { DataStore } from "./DataStore";
import { mailMessage } from "./MailMessageService";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function extractVariables(subject: string, body: string): string[] {
  const vars: string[] = [];
  const re = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(`${subject}\n${body}`)) !== null) {
    if (!vars.includes(m[1])) vars.push(m[1]);
  }
  return vars;
}

export class MailTemplateService {
  private getMailbox(tenantId: string, mailboxId?: string): any {
    if (mailboxId) {
      const mb = DataStore.mem().findOne("mailboxes", (m: any) => m._id === mailboxId && m.tenantId === tenantId);
      if (mb) return mb;
      throw new Error(`Mailbox "${mailboxId}" not found`);
    }
    const mailboxes = DataStore.mem().find("mailboxes", (m: any) => m.tenantId === tenantId);
    if (mailboxes.length === 0) throw new Error("No mailboxes configured");
    return mailboxes.find((m: any) => m.status === "active") || mailboxes[0];
  }

  private getTemplate(tenantId: string, templateId: string): any {
    const t = DataStore.mem().findOne("mail_templates", (tpl: any) => tpl._id === templateId && tpl.tenantId === tenantId);
    if (!t) throw new Error(`Template "${templateId}" not found`);
    return t;
  }

  private logUsage(tenantId: string, entry: any) {
    DataStore.mem().insert("mail_template_usage", { tenantId, ...entry, sentAt: new Date().toISOString() });
  }

  templates(tenantId: string) {
    const templates = DataStore.mem().find("mail_templates", (t: any) => t.tenantId === tenantId)
      .sort((a: any, b: any) => (b.sentCount || 0) - (a.sentCount || 0) || String(a.name).localeCompare(String(b.name)));
    return templates.map(t => ({
      templateId: t._id, name: t.name, subject: t.subject, category: t.category || "general",
      description: t.description || "", variables: t.variables || [],
      sentCount: t.sentCount || 0, lastSentAt: t.lastSentAt || null,
    }));
  }

  getTemplatePublic(tenantId: string, templateId: string) {
    const t = this.getTemplate(tenantId, templateId);
    return { templateId: t._id, name: t.name, subject: t.subject, body: t.body, category: t.category || "general", description: t.description || "", variables: t.variables || [], sentCount: t.sentCount || 0, lastSentAt: t.lastSentAt || null };
  }

  createTemplate(tenantId: string, input: any) {
    if (!input || !input.name || !input.subject || !input.body) throw new Error("Template name, subject and body are required");
    const variables = extractVariables(input.subject, input.body);
    const template = DataStore.mem().insert("mail_templates", {
      tenantId,
      name: input.name,
      subject: input.subject,
      body: input.body,
      category: input.category || "general",
      description: input.description || "",
      variables,
      sentCount: 0,
      lastSentAt: null,
      createdBy: input.createdBy || "user_001",
    });
    return { templateId: template._id, ...template, summary: `Template "${input.name}" created` };
  }

  updateTemplate(tenantId: string, templateId: string, patch: any) {
    this.getTemplate(tenantId, templateId);
    const subject = patch.subject !== undefined ? patch.subject : undefined;
    const body = patch.body !== undefined ? patch.body : undefined;
    const variables = subject !== undefined || body !== undefined
      ? extractVariables(subject ?? "", body ?? "")
      : undefined;
    const updated = DataStore.mem().update("mail_templates", (t: any) => t._id === templateId && t.tenantId === tenantId, {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(subject !== undefined ? { subject } : {}),
      ...(body !== undefined ? { body } : {}),
      ...(patch.category !== undefined ? { category: patch.category } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(variables !== undefined ? { variables } : {}),
    });
    return { templateId: updated._id, name: updated.name, subject: updated.subject, category: updated.category || "general", description: updated.description || "", variables: updated.variables, summary: `Template "${updated.name}" updated` };
  }

  deleteTemplate(tenantId: string, templateId: string) {
    const t = this.getTemplate(tenantId, templateId);
    DataStore.mem().delete("mail_templates", (tpl: any) => tpl._id === templateId && tpl.tenantId === tenantId);
    return { templateId, summary: `Template "${t.name}" deleted` };
  }

  renderTemplate(tenantId: string, templateId: string, variables: any = {}) {
    const t = this.getTemplate(tenantId, templateId);
    const vars: Record<string, string> = variables || {};
    const missing: string[] = [];
    for (const v of t.variables || []) if (vars[v] === undefined || vars[v] === null) missing.push(v);
    const fill = (s: string) => (s || "").replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (all: string, key: string) => (vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : all));
    return {
      templateId: t._id, name: t.name,
      subject: fill(t.subject), body: fill(t.body),
      variables: t.variables || [], missing,
      summary: missing.length ? `Rendered "${t.name}" — ${missing.length} variable(s) not filled` : `Rendered "${t.name}"`,
    };
  }

  sendFromTemplate(tenantId: string, mailboxId: string, input: any) {
    const mb = this.getMailbox(tenantId, mailboxId);
    if (!input || !input.templateId) throw new Error("templateId is required");
    if (!input.to) throw new Error("Recipient (to) is required");
    const t = this.getTemplate(tenantId, input.templateId);
    const rendered = this.renderTemplate(tenantId, t._id, input.variables || {});
    const result = mailMessage.composeSend(tenantId, mb._id, {
      to: input.to, subject: rendered.subject, body: rendered.body, importance: input.importance || "normal",
    });
    const sent = DataStore.mem().update("mail_templates", (tpl: any) => tpl._id === t._id, { sentCount: (t.sentCount || 0) + 1, lastSentAt: new Date().toISOString() });
    this.logUsage(tenantId, { templateId: t._id, templateName: t.name, kind: "single", recipient: String(input.to), subject: rendered.subject });
    return { ...result, templateId: t._id, templateName: t.name, sentCount: sent.sentCount, summary: `Sent "${t.name}" — "${rendered.subject}"` };
  }

  sendBulk(tenantId: string, mailboxId: string, input: any) {
    const mb = this.getMailbox(tenantId, mailboxId);
    if (!input || !input.templateId) throw new Error("templateId is required");
    if (!input.recipients || !Array.isArray(input.recipients) || input.recipients.length === 0) throw new Error("recipients array is required");
    const t = this.getTemplate(tenantId, input.templateId);
    const defaults = input.defaults || {};
    const results: any[] = [];
    let sent = 0;
    let failed = 0;
    for (const rcpt of input.recipients) {
      const to = typeof rcpt === "string" ? rcpt : rcpt.to;
      if (!to) { failed++; continue; }
      try {
        const vars = { ...defaults, ...(typeof rcpt === "object" ? rcpt.variables || {} : {}) };
        const rendered = this.renderTemplate(tenantId, t._id, vars);
        const result = mailMessage.composeSend(tenantId, mb._id, {
          to, subject: rendered.subject, body: rendered.body, importance: input.importance || "normal",
        });
        this.logUsage(tenantId, { templateId: t._id, templateName: t.name, kind: "bulk", recipient: to, subject: rendered.subject });
        results.push({ to, ok: true, subject: rendered.subject });
        sent++;
      } catch (e: any) {
        results.push({ to, ok: false, error: e.message || "send failed" });
        failed++;
      }
    }
    const updated = DataStore.mem().update("mail_templates", (tpl: any) => tpl._id === t._id, { sentCount: (t.sentCount || 0) + sent, lastSentAt: new Date().toISOString() });
    return {
      templateId: t._id, templateName: t.name, sent, failed, results,
      sentCount: updated.sentCount,
      summary: `Bulk send complete — ${sent} sent, ${failed} failed (${input.recipients.length} total)`,
      seed: hashStr(tenantId + t._id + "bulk" + new Date().toISOString().slice(0, 13)),
    };
  }

  templateStats(tenantId: string) {
    const templates = this.templates(tenantId);
    const usage = DataStore.mem().find("mail_template_usage", (u: any) => u.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
      .slice(0, 10);
    const byCategory = new Map<string, number>();
    for (const t of templates) byCategory.set(t.category, (byCategory.get(t.category) || 0) + (t.sentCount || 0));
    return {
      templates,
      totals: { templates: templates.length, sends: templates.reduce((s, t) => s + (t.sentCount || 0), 0) },
      topTemplates: templates.slice(0, 3),
      categorySends: [...byCategory.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
      recentUsage: usage,
      summary: `${templates.length} template(s) — ${templates.reduce((s, t) => s + (t.sentCount || 0), 0)} total send(s)`,
      seed: hashStr(tenantId + "template_stats"),
    };
  }

  templateUsageLog(tenantId: string, limit = 20) {
    const log = DataStore.mem().find("mail_template_usage", (u: any) => u.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
      .slice(0, limit);
    return { log, total: log.length, summary: `${log.length} template send(s) recorded` };
  }
}

export const mailTemplates = new MailTemplateService();
