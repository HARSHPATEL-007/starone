import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function random6(): string {
  return String(Math.floor(Math.random() * 900000) + 100000);
}

function logEntry(tenantId: string, category: string, detail: string, extra: any = {}) {
  DataStore.mem().insert("mail_integration_log", {
    tenantId, category, detail, at: new Date().toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...extra,
  });
}

export const INTEGRATION_CATEGORIES = ["email", "chat", "crm", "storage", "meetings", "docs", "finance"] as const;

export const CONNECTORS: any[] = [
  { id: "gmail", name: "Gmail", description: "Inbox, labels & calendar", category: "email", scopes: ["mail.read", "mail.send", "calendar.read"], actions: ["sync_mail", "create_event"], authType: "oauth2" },
  { id: "outlook", name: "Outlook", description: "Inbox, folders & calendar", category: "email", scopes: ["mail.read", "mail.send", "calendar.read"], actions: ["sync_mail", "create_event"], authType: "oauth2" },
  { id: "slack", name: "Slack", description: "Channels & direct messages", category: "chat", scopes: ["chat.write", "channel.read"], actions: ["post_to_chat", "forward_to_channel"], authType: "oauth2" },
  { id: "teams", name: "Microsoft Teams", description: "Teams, channels & meetings", category: "chat", scopes: ["channel.read", "message.write"], actions: ["post_to_chat", "forward_to_channel"], authType: "oauth2" },
  { id: "crm", name: "CRM", description: "Contacts, leads & pipeline", category: "crm", scopes: ["contacts.read", "contacts.write", "deals.write"], actions: ["push_to_crm", "sync_contacts", "update_crm_deal"], authType: "oauth2" },
  { id: "drive", name: "Google Drive", description: "Files & folders", category: "storage", scopes: ["file.read", "file.write"], actions: ["upload_file", "share_link", "create_doc", "read_from_drive"], authType: "oauth2" },
  { id: "dropbox", name: "Dropbox", description: "Files & folders", category: "storage", scopes: ["file.read", "file.write"], actions: ["upload_file", "share_link", "read_from_drive"], authType: "oauth2" },
  { id: "zoom", name: "Zoom", description: "Video meetings & recordings", category: "meetings", scopes: ["meeting.write"], actions: ["schedule_meeting"], authType: "oauth2" },
  { id: "calendar", name: "Calendar", description: "Events & availability", category: "meetings", scopes: ["calendar.read", "calendar.write"], actions: ["schedule_meeting", "create_event"], authType: "oauth2" },
  { id: "notion", name: "Notion", description: "Docs, pages & tasks", category: "docs", scopes: ["page.read", "page.write"], actions: ["create_task", "create_doc"], authType: "oauth2" },
  { id: "google_sheets", name: "Google Sheets", description: "Spreadsheets & exports", category: "docs", scopes: ["sheet.read", "sheet.write"], actions: ["push_to_sheets", "sync_contacts"], authType: "oauth2" },
  { id: "asana", name: "Asana", description: "Projects, tasks & tickets", category: "crm", scopes: ["task.write", "project.read"], actions: ["create_task", "create_ticket", "post_comment"], authType: "oauth2" },
  { id: "whatsapp", name: "WhatsApp", description: "Messages & broadcasts", category: "chat", scopes: ["message.send"], actions: ["send_sms", "post_to_chat"], authType: "oauth2" },
  { id: "webex", name: "Webex", description: "Meetings & team messaging", category: "meetings", scopes: ["meeting.write", "message.write"], actions: ["schedule_meeting", "create_event", "post_to_chat"], authType: "oauth2" },
  { id: "xero", name: "Xero", description: "Invoices & contacts", category: "finance", scopes: ["invoice.write", "contacts.read"], actions: ["create_invoice", "sync_contacts"], authType: "oauth2" },
];

const ACTION_LABELS: Record<string, string> = {
  sync_mail: "Sync email",
  create_event: "Create calendar event",
  post_to_chat: "Post to chat",
  forward_to_channel: "Forward to channel",
  push_to_crm: "Push to CRM",
  sync_contacts: "Sync contacts",
  upload_file: "Upload attachment",
  schedule_meeting: "Schedule meeting",
  create_task: "Create task",
  share_link: "Share file link",
  update_crm_deal: "Update CRM deal",
  create_doc: "Create document",
  push_to_sheets: "Push to sheets",
  create_ticket: "Create ticket",
  post_comment: "Post comment",
  send_sms: "Send SMS",
  create_invoice: "Create invoice",
  read_from_drive: "Read from drive",
};

export const BRIDGE_EVENTS = [
  "mail.received", "mail.sent", "mail.spam_detected", "mail.delivery_failed",
  "mail.rule_triggered", "mail.attachment_scanned", "mail.ai_suggestion",
];

export class MailIntegrationService {
  connectorCatalog(tenantId: string) {
    const connections = DataStore.mem().find("mail_connections", (c: any) => c.tenantId === tenantId);
    return {
      categories: INTEGRATION_CATEGORIES.map((cat) => ({ category: cat, count: CONNECTORS.filter((c) => c.category === cat).length })),
      connectors: CONNECTORS.map((c) => {
        const conns = connections.filter((x: any) => x.connectorId === c.id);
        return {
          ...c,
          connectedCount: conns.length,
          status: conns.some((x: any) => x.status === "connected") ? "connected" : conns.some((x: any) => x.status === "needs_auth") ? "needs_auth" : conns.some((x: any) => x.status === "error") ? "error" : "disconnected",
          lastSyncAt: conns.reduce((m: any, x: any) => (x.lastSyncAt && (!m || x.lastSyncAt > m) ? x.lastSyncAt : m), null),
        };
      }),
      summary: `${CONNECTORS.length} connectors across ${INTEGRATION_CATEGORIES.length} categories`,
    };
  }

  listConnections(tenantId: string, connectorId?: string) {
    const conns = DataStore.mem().find("mail_connections", (c: any) => c.tenantId === tenantId && (!connectorId || c.connectorId === connectorId));
    return [...conns].sort((a: any, b: any) => new Date(b.connectedAt).getTime() - new Date(a.connectedAt).getTime()).map((c: any) => this.toPublic(c));
  }

  private toPublic(c: any) {
    return {
      connectionId: c._id,
      connectorId: c.connectorId,
      connectorName: (CONNECTORS.find((x) => x.id === c.connectorId) || {}).name || c.connectorId,
      mailboxId: c.mailboxId,
      accountEmail: c.accountEmail,
      status: c.status,
      scopes: c.scopes,
      settings: c.settings,
      connectedAt: c.connectedAt,
      lastSyncAt: c.lastSyncAt || null,
      lastSyncStatus: c.lastSyncStatus || null,
      syncCount: c.syncCount || 0,
      itemsSynced: c.itemsSynced || 0,
      actionsRun: c.actionsRun || 0,
      error: c.error || null,
      tokenExpiresAt: c.tokenExpiresAt || null,
      oauthAuthorized: !!(c.accessToken || c.oauthCompletedAt),
      oauthState: c.oauthState || null,
      oauthScope: c.oauthScope || null,
    };
  }

  getConnectionPublic(tenantId: string, connectionId: string) {
    const conn = DataStore.mem().findOne("mail_connections", (c: any) => c._id === connectionId && c.tenantId === tenantId);
    if (!conn) throw new Error(`Connection "${connectionId}" not found`);
    return this.toPublic(conn);
  }

  private connector(id: string) {
    const c = CONNECTORS.find((x) => x.id === id);
    if (!c) throw new Error(`Unknown connector "${id}" — use one of: ${CONNECTORS.map((x) => x.id).join(", ")}`);
    return c;
  }

  private mailboxExists(tenantId: string, mailboxId: string) {
    return !!DataStore.mem().findOne("mailboxes", (m: any) => m._id === mailboxId && m.tenantId === tenantId);
  }

  connectConnector(tenantId: string, input: any) {
    const connectorId = String((input && input.connectorId) || "");
    const c = this.connector(connectorId);
    const mailboxId = String((input && input.mailboxId) || "");
    if (!mailboxId) throw new Error("mailboxId is required to connect");
    if (!this.mailboxExists(tenantId, mailboxId)) throw new Error(`Mailbox "${mailboxId}" not found`);
    const existing = DataStore.mem().findOne("mail_connections", (x: any) => x.tenantId === tenantId && x.connectorId === connectorId && x.mailboxId === mailboxId);
    if (existing && existing.status === "connected") return { ...this.toPublic(existing), summary: `Already connected — ${c.name} is linked to this mailbox` };
    if (existing) {
      const updated = DataStore.mem().update("mail_connections", (x: any) => x._id === existing._id, {
        status: "connected",
        error: null,
        connectedAt: new Date().toISOString(),
        lastSyncAt: null,
        lastSyncStatus: null,
        tokenExpiresAt: new Date(Date.now() + 45 * 24 * 3600 * 1000).toISOString(),
      });
      logEntry(tenantId, "connection_reconnected", `Reconnected ${c.name} to mailbox ${mailboxId}`, { connectionId: existing._id, connectorId });
      return { ...this.toPublic(updated), summary: `${c.name} reconnected — ${c.scopes.length} scopes authorized` };
    }
    const accountEmail = `acct_${hashStr(connectorId + "|" + mailboxId).toString(16).slice(0, 8)}@${connectorId}.io`;
    const connection = DataStore.mem().insert("mail_connections", {
      tenantId,
      connectorId,
      mailboxId,
      accountEmail,
      status: "connected",
      scopes: c.scopes,
      settings: { autoSync: true, notifyOnNew: true, notifyOnError: true, ...((input && input.settings) || {}) },
      connectedAt: new Date().toISOString(),
      lastSyncAt: null,
      lastSyncStatus: null,
      syncCount: 0,
      itemsSynced: 0,
      actionsRun: 0,
      error: null,
      tokenExpiresAt: new Date(Date.now() + 45 * 24 * 3600 * 1000).toISOString(),
    });
    logEntry(tenantId, "connection_connected", `Connected ${c.name} to mailbox ${mailboxId}`, { connectionId: connection._id, connectorId });
    return { ...this.toPublic(connection), summary: `${c.name} connected — ${c.scopes.length} scopes authorized` };
  }

  authorizeConnector(tenantId: string, connectionId: string) {
    const conn = DataStore.mem().findOne("mail_connections", (c: any) => c._id === connectionId && c.tenantId === tenantId);
    if (!conn) throw new Error(`Connection "${connectionId}" not found`);
    const c = this.connector(conn.connectorId);
    if (conn.status !== "needs_auth") {
      return { connectionId, status: conn.status, summary: `Connection is ${conn.status} — nothing to authorize` };
    }
    const updated = DataStore.mem().update("mail_connections", (x: any) => x._id === connectionId, {
      status: "connected",
      error: null,
      tokenExpiresAt: new Date(Date.now() + 45 * 24 * 3600 * 1000).toISOString(),
    });
    logEntry(tenantId, "connection_authorized", `OAuth completed for ${c.name}`, { connectionId });
    return { connectionId, status: updated.status, summary: `${c.name} authorized — token valid until ${new Date(updated.tokenExpiresAt).toLocaleDateString()}` };
  }

  refreshConnector(tenantId: string, connectionId: string) {
    const conn = DataStore.mem().findOne("mail_connections", (c: any) => c._id === connectionId && c.tenantId === tenantId);
    if (!conn) throw new Error(`Connection "${connectionId}" not found`);
    const c = this.connector(conn.connectorId);
    if (conn.status === "disconnected") throw new Error(`Connection is disconnected — connect it first`);
    const updated = DataStore.mem().update("mail_connections", (x: any) => x._id === connectionId, {
      status: "connected",
      error: null,
      connectedAt: new Date().toISOString(),
      tokenExpiresAt: new Date(Date.now() + 45 * 24 * 3600 * 1000).toISOString(),
    });
    logEntry(tenantId, "connection_refreshed", `Refreshed ${c.name} session`, { connectionId });
    return { connectionId, status: updated.status, summary: `${c.name} session refreshed — token renewed for 45 days` };
  }

  updateConnection(tenantId: string, connectionId: string, patch: any) {
    const conn = DataStore.mem().findOne("mail_connections", (c: any) => c._id === connectionId && c.tenantId === tenantId);
    if (!conn) throw new Error(`Connection "${connectionId}" not found`);
    const settings = { ...(conn.settings || {}), ...((patch && patch.settings) || {}) };
    const updated = DataStore.mem().update("mail_connections", (x: any) => x._id === connectionId, {
      ...((patch && patch.settings !== undefined) ? { settings } : {}),
      ...(patch && patch.status !== undefined ? { status: patch.status } : {}),
    });
    return { ...this.toPublic(updated), summary: `Connection settings updated` };
  }

  disconnectConnector(tenantId: string, connectionId: string) {
    const conn = DataStore.mem().findOne("mail_connections", (c: any) => c._id === connectionId && c.tenantId === tenantId);
    if (!conn) throw new Error(`Connection "${connectionId}" not found`);
    const c = this.connector(conn.connectorId);
    const updated = DataStore.mem().update("mail_connections", (x: any) => x._id === connectionId, {
      status: "disconnected",
      tokenExpiresAt: null,
    });
    logEntry(tenantId, "connection_disconnected", `Disconnected ${c.name}`, { connectionId });
    return { connectionId, status: updated.status, summary: `${c.name} disconnected — revoke access in the provider console to fully remove` };
  }

  syncNow(tenantId: string, connectionId: string) {
    const conn = DataStore.mem().findOne("mail_connections", (c: any) => c._id === connectionId && c.tenantId === tenantId);
    if (!conn) throw new Error(`Connection "${connectionId}" not found`);
    if (conn.status !== "connected") throw new Error(`Connection is ${conn.status} — authorize it before syncing`);
    const c = this.connector(conn.connectorId);
    const store = DataStore.mem();
    const failed = hashStr(`${connectionId}|sync`) % 11 === 0;
    const kind = hashStr(`${connectionId}|sync|dir`) % 2 === 0 ? "pull" : "push";
    const count = 3 + (hashStr(`${connectionId}|sync|count`) % 12);
    const durationMs = 120 + (hashStr(`${connectionId}|sync|ms`) % 3800);
    const job = store.insert("mail_integration_jobs", {
      tenantId,
      connectionId,
      connectorId: conn.connectorId,
      kind,
      status: failed ? "failed" : "success",
      pulled: failed ? 0 : kind === "pull" ? count : 0,
      pushed: failed ? 0 : kind === "push" ? count : 0,
      items: failed ? 0 : count,
      durationMs,
      error: failed ? `Provider timeout after ${durationMs}ms` : null,
      startedAt: new Date(Date.now() - durationMs).toISOString(),
      finishedAt: new Date().toISOString(),
      at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const itemsSynced = (conn.itemsSynced || 0) + (failed ? 0 : count);
    store.update("mail_connections", (x: any) => x._id === connectionId, {
      lastSyncAt: new Date().toISOString(),
      lastSyncStatus: failed ? "failed" : "success",
      syncCount: (conn.syncCount || 0) + 1,
      itemsSynced,
      error: failed ? "Last sync failed: provider timeout" : null,
    });
    logEntry(tenantId, `sync_${failed ? "failed" : "success"}`, `${c.name} ${kind} sync ${failed ? "failed" : `synced ${count} item(s)`}`, { connectionId, jobId: job._id });
    return {
      jobId: job._id,
      connectorId: conn.connectorId,
      kind,
      status: failed ? "failed" : "success",
      pulled: failed ? 0 : kind === "pull" ? count : 0,
      pushed: failed ? 0 : kind === "push" ? count : 0,
      items: failed ? 0 : count,
      durationMs,
      itemsSynced,
      error: job.error,
      summary: failed ? `${c.name} sync failed — ${job.error}` : `${c.name} ${kind} complete — ${count} item(s) synced`,
    };
  }

  syncHistory(tenantId: string, connectionId?: string, limit = 20) {
    const jobs = DataStore.mem().find("mail_integration_jobs", (j: any) => j.tenantId === tenantId && (!connectionId || j.connectionId === connectionId));
    const sorted = [...jobs].sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
    return {
      jobs: sorted.map((j: any) => ({
        jobId: j._id, connectionId: j.connectionId, connectorId: j.connectorId,
        connectorName: (CONNECTORS.find((x) => x.id === j.connectorId) || {}).name || j.connectorId,
        kind: j.kind, status: j.status, pulled: j.pulled, pushed: j.pushed, items: j.items,
        durationMs: j.durationMs, error: j.error || null, at: j.at,
      })),
      total: sorted.length,
      summary: `${sorted.length} sync job(s)`,
    };
  }

  syncStatus(tenantId: string) {
    const conns = DataStore.mem().find("mail_connections", (c: any) => c.tenantId === tenantId && c.status === "connected");
    const now = Date.now();
    const day = 24 * 3600 * 1000;
    return {
      connectors: conns.map((c: any) => {
        const overdue = !c.lastSyncAt || (now - new Date(c.lastSyncAt).getTime()) > day;
        return {
          connectionId: c._id,
          connectorId: c.connectorId,
          connectorName: (CONNECTORS.find((x) => x.id === c.connectorId) || {}).name || c.connectorId,
          lastSyncAt: c.lastSyncAt || null,
          lastSyncStatus: c.lastSyncStatus || "never",
          syncCount: c.syncCount || 0,
          itemsSynced: c.itemsSynced || 0,
          autoSync: (c.settings || {}).autoSync !== false,
          overdue,
        };
      }),
      total: conns.length,
      overdue: conns.filter((c: any) => !c.lastSyncAt || (now - new Date(c.lastSyncAt).getTime()) > day).length,
      summary: `${conns.length} active connection(s) — ${conns.filter((c: any) => !c.lastSyncAt || (now - new Date(c.lastSyncAt).getTime()) > day).length} overdue`,
    };
  }

  runAction(tenantId: string, connectionId: string, action: string, params: any = {}) {
    const conn = DataStore.mem().findOne("mail_connections", (c: any) => c._id === connectionId && c.tenantId === tenantId);
    if (!conn) throw new Error(`Connection "${connectionId}" not found`);
    if (conn.status !== "connected") throw new Error(`Connection is ${conn.status} — authorize it first`);
    const c = this.connector(conn.connectorId);
    if (!c.actions.includes(action)) throw new Error(`Connector "${c.id}" does not support action "${action}" — supported: ${c.actions.join(", ")}`);
    const seed = `${connectionId}|${action}|${JSON.stringify(params || {})}`;
    let result: any;
    if (action === "push_to_crm") {
      const messageId = params.messageId || "";
      const msg = messageId ? DataStore.mem().findOne("messages", (m: any) => m._id === messageId && m.tenantId === tenantId) : null;
      const email = (msg && msg.from && msg.from.email) || params.email || conn.accountEmail;
      const leadId = `lead_${hashStr(seed).toString(16).slice(0, 12)}`;
      result = { leadId, contactEmail: email, stage: "new", score: 20 + (hashStr(seed + "|score") % 70), summary: `Lead created from ${email} (score ${20 + (hashStr(seed + "|score") % 70)})` };
    } else if (action === "post_to_chat" || action === "forward_to_channel") {
      const channel = params.channel || "general";
      const messageId = params.messageId || "";
      const msg = messageId ? DataStore.mem().findOne("messages", (m: any) => m._id === messageId && m.tenantId === tenantId) : null;
      const text = (msg && msg.subject) || params.text || "N0VA mail update";
      const ts = `ts_${hashStr(seed).toString(16).slice(0, 12)}`;
      result = { ts, channel, message: text, summary: `${action === "post_to_chat" ? "Posted" : "Forwarded"} "${text}" to #${channel}` };
    } else if (action === "upload_file") {
      const messageId = params.messageId || "";
      const msg = messageId ? DataStore.mem().findOne("messages", (m: any) => m._id === messageId && m.tenantId === tenantId) : null;
      const attachment = ((msg && msg.attachments) || [])[0];
      const fileId = `file_${hashStr(seed).toString(16).slice(0, 12)}`;
      const name = (attachment && attachment.name) || params.name || "n0va-export.txt";
      const size = (attachment && attachment.sizeBytes) || 1024;
      result = { fileId, name, sizeBytes: size, summary: `Uploaded "${name}" (${size} bytes)` };
    } else if (action === "schedule_meeting") {
      const meetingId = `mtg_${hashStr(seed).toString(16).slice(0, 12)}`;
      const mins = 30 + (hashStr(seed + "|dur") % 60);
      result = { meetingId, title: params.title || "N0VA follow-up", durationMin: mins, joinUrl: `https://${c.id}.n0va.link/${meetingId}`, summary: `Meeting "${params.title || "N0VA follow-up"}" scheduled for ${mins} minutes` };
    } else if (action === "create_event") {
      const eventId = `evt_${hashStr(seed).toString(16).slice(0, 12)}`;
      const summary = params.title || "N0VA event";
      result = { eventId, title: summary, date: params.date || new Date(Date.now() + 86400000).toISOString().slice(0, 10), summary: `Event "${summary}" added to calendar` };
    } else if (action === "create_task") {
      const taskId = `tsk_${hashStr(seed).toString(16).slice(0, 12)}`;
      const title = params.title || "Follow up on email";
      result = { taskId, title, status: "todo", due: params.due || new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), summary: `Task "${title}" created` };
    } else if (action === "sync_contacts") {
      const contacts = DataStore.mem().find("mail_contacts", (x: any) => x.tenantId === tenantId);
      const count = contacts.length;
      result = { synced: count, summary: `${count} contact(s) pushed to ${c.name}` };
    } else if (action === "sync_mail") {
      const messages = DataStore.mem().find("messages", (x: any) => x.tenantId === tenantId && x.mailboxId === conn.mailboxId);
      const count = Math.min(messages.length, 2 + (hashStr(seed) % 10));
      result = { synced: count, summary: `${count} message(s) indexed into ${c.name}` };
    } else if (action === "share_link") {
      const messageId = params.messageId || "";
      const msg = messageId ? DataStore.mem().findOne("messages", (m: any) => m._id === messageId && m.tenantId === tenantId) : null;
      const name = (msg && msg.attachments && msg.attachments[0] && msg.attachments[0].name) || params.name || "n0va-share.txt";
      const shareId = `shr_${hashStr(seed).toString(16).slice(0, 12)}`;
      const permission = hashStr(seed + "|perm") % 3 === 0 ? "comment" : "view";
      result = { shareId, fileName: name, permission, shareUrl: `https://${c.id}.n0va.link/s/${shareId}`, summary: `Share link created for "${name}" (${permission})` };
    } else if (action === "update_crm_deal") {
      const dealId = params.dealId || `deal_${hashStr(seed).toString(16).slice(0, 12)}`;
      const stages = ["proposal", "negotiation", "won"];
      const stage = stages[hashStr(seed + "|stage") % stages.length];
      const value = (params.value as number) || 1000 + (hashStr(seed + "|value") % 9000);
      result = { dealId, stage, value, summary: `Deal ${dealId} moved to "${stage}" ($${value})` };
    } else if (action === "create_doc") {
      const docId = `doc_${hashStr(seed).toString(16).slice(0, 12)}`;
      const title = params.title || "N0VA mail notes";
      result = { docId, title, pageUrl: `https://${c.id}.n0va.link/${docId}`, summary: `Document "${title}" created` };
    } else if (action === "push_to_sheets") {
      const sheetId = `sht_${hashStr(seed).toString(16).slice(0, 12)}`;
      const rowsWritten = 2 + (hashStr(seed + "|rows") % 40);
      const tab = params.tab || "N0VA Export";
      result = { sheetId, tab, rowsWritten, sheetUrl: `https://${c.id}.n0va.link/${sheetId}`, summary: `${rowsWritten} row(s) written to "${tab}"` };
    } else if (action === "create_ticket") {
      const ticketId = `tic_${hashStr(seed).toString(16).slice(0, 12)}`;
      const priorities = ["low", "medium", "high"];
      const priority = priorities[hashStr(seed + "|prio") % priorities.length];
      const title = params.title || "Ticket from N0VA mail";
      result = { ticketId, title, priority, status: "open", assignee: params.assignee || "unassigned", summary: `Ticket "${title}" created (${priority})` };
    } else if (action === "post_comment") {
      const commentId = `cmm_${hashStr(seed).toString(16).slice(0, 12)}`;
      const thread = params.thread || "n0va-mail";
      const text = params.text || "See the N0VA mail thread for context";
      result = { commentId, thread, text, summary: `Comment posted on "${thread}"` };
    } else if (action === "send_sms") {
      const smsId = `sms_${hashStr(seed).toString(16).slice(0, 12)}`;
      const phone = params.phone || `+1555${String(1000 + (hashStr(seed + "|ph") % 9000))}`;
      const text = params.text || "You have a new message from N0VA Mail";
      result = { smsId, phone, delivered: true, summary: `SMS sent to ${phone}` };
    } else if (action === "create_invoice") {
      const invoiceId = `inv_${hashStr(seed).toString(16).slice(0, 12)}`;
      const amount = Number(params.amount) || 100 + (hashStr(seed + "|amt") % 900);
      const dueInDays = (params.dueInDays as number) || 14;
      result = { invoiceId, amount, currency: "USD", dueInDays, status: "sent", summary: `Invoice ${invoiceId} issued for $${amount} (due in ${dueInDays} day(s))` };
    } else if (action === "read_from_drive") {
      const fileId = `file_${hashStr(seed).toString(16).slice(0, 12)}`;
      const name = params.name || "n0va-export.txt";
      const sizeBytes = params.sizeBytes || 1024 + (hashStr(seed + "|sz") % 4096);
      const preview = `${name} — ${sizeBytes} bytes, read ${new Date().toISOString().slice(0, 10)}`;
      result = { fileId, name, sizeBytes, contentPreview: preview, summary: `Read "${name}" from ${c.name}` };
    } else {
      throw new Error(`Unsupported action "${action}"`);
    }
    const updated = DataStore.mem().update("mail_connections", (x: any) => x._id === connectionId, {
      actionsRun: (conn.actionsRun || 0) + 1,
    });
    logEntry(tenantId, `action_${action}`, `${c.name} Â· ${ACTION_LABELS[action] || action} — ${result.summary}`, { connectionId, action });
    return { connectionId, connectorId: c.id, action, ...result, actionsRun: updated.actionsRun, summary: `${c.name}: ${result.summary}` };
  }

  oauthStart(tenantId: string, connectionId: string) {
    const conn = DataStore.mem().findOne("mail_connections", (c: any) => c._id === connectionId && c.tenantId === tenantId);
    if (!conn) throw new Error(`Connection "${connectionId}" not found`);
    const c = this.connector(conn.connectorId);
    const state = `st_${hashStr(`${conn.connectorId}|${conn.mailboxId}|${tenantId}|oauth_state`).toString(36)}`;
    const redirect = encodeURIComponent("https://mail.n0va.io/oauth/callback");
    const authorizationUrl = `https://${conn.connectorId}.auth.n0va.io/authorize?client_id=n0va_${conn.connectorId}&redirect_uri=${redirect}&response_type=code&scope=${encodeURIComponent(conn.scopes.join(" "))}&state=${state}`;
    DataStore.mem().update("mail_connections", (x: any) => x._id === connectionId, {
      oauthState: state,
      oauthStartedAt: new Date().toISOString(),
      status: conn.status === "connected" ? "needs_auth" : conn.status,
      error: null,
    });
    logEntry(tenantId, "oauth_started", `OAuth flow started for ${c.name}`, { connectionId, state });
    return {
      connectionId,
      connectorId: c.id,
      state,
      authorizationUrl,
      redirectUri: "https://mail.n0va.io/oauth/callback",
      scopes: conn.scopes,
      expiresInSeconds: 600,
      summary: `Open the authorization URL in your browser to grant ${c.name} access (${conn.scopes.length} scopes)`,
    };
  }

  oauthCallback(tenantId: string, connectionId: string, input: any) {
    const conn = DataStore.mem().findOne("mail_connections", (c: any) => c._id === connectionId && c.tenantId === tenantId);
    if (!conn) throw new Error(`Connection "${connectionId}" not found`);
    const c = this.connector(conn.connectorId);
    const code = String((input && input.code) || "");
    if (!code) throw new Error("code is required from the provider callback");
    const state = String((input && input.state) || "");
    if (!conn.oauthState) throw new Error("No pending authorization — start the OAuth flow first");
    if (state !== conn.oauthState) throw new Error("State mismatch — restart the authorization flow");
    const seed = `${conn.connectorId}|${conn.mailboxId}|${tenantId}|oauth_tokens`;
    const accessToken = `oat_${hashStr(seed + "|at").toString(36)}${hashStr(seed + "|at2").toString(36).slice(0, 6)}`;
    const refreshToken = `rft_${hashStr(seed + "|rt").toString(36)}${hashStr(seed + "|rt2").toString(36).slice(0, 6)}`;
    const ttlMin = 50 + (hashStr(seed + "|ttl") % 50);
    const tokenExpiresAt = new Date(Date.now() + ttlMin * 60 * 1000).toISOString();
    const updated = DataStore.mem().update("mail_connections", (x: any) => x._id === connectionId, {
      status: "connected",
      error: null,
      accessToken,
      refreshToken,
      oauthState: null,
      oauthCompletedAt: new Date().toISOString(),
      oauthScope: conn.scopes.join(" "),
      tokenExpiresAt,
    });
    logEntry(tenantId, "oauth_completed", `${c.name} OAuth completed — ${conn.scopes.length} scopes granted`, { connectionId });
    return {
      connectionId,
      connectorId: c.id,
      status: updated.status,
      accessToken: `${accessToken.slice(0, 8)}…`,
      scopes: conn.scopes,
      tokenExpiresAt,
      expiresInMinutes: ttlMin,
      summary: `${c.name} authorized — ${conn.scopes.length} scopes granted, token expires in ${ttlMin} min`,
    };
  }

  oauthRefresh(tenantId: string, connectionId: string) {
    const conn = DataStore.mem().findOne("mail_connections", (c: any) => c._id === connectionId && c.tenantId === tenantId);
    if (!conn) throw new Error(`Connection "${connectionId}" not found`);
    if (conn.status === "disconnected") throw new Error(`Connection is disconnected — connect it first`);
    if (!conn.refreshToken) throw new Error("No refresh token — re-authorize the connection");
    const c = this.connector(conn.connectorId);
    const seed = `${conn.connectorId}|${conn.mailboxId}|${tenantId}|oauth_tokens`;
    const ttlMin = 60 + (hashStr(seed + "|ttl2") % 60);
    const oldExpiry = conn.tokenExpiresAt ? new Date(conn.tokenExpiresAt).getTime() : 0;
    const newExpiry = Math.max(Date.now() + ttlMin * 60 * 1000, oldExpiry);
    const tokenExpiresAt = new Date(newExpiry).toISOString();
    const updated = DataStore.mem().update("mail_connections", (x: any) => x._id === connectionId, {
      status: "connected",
      error: null,
      tokenExpiresAt,
      lastTokenRefreshAt: new Date().toISOString(),
    });
    logEntry(tenantId, "oauth_refreshed", `${c.name} access token refreshed via refresh token`, { connectionId });
    return {
      connectionId,
      connectorId: c.id,
      status: updated.status,
      tokenExpiresAt,
      expiresInMinutes: ttlMin,
      summary: `${c.name} access token refreshed — expires in ${ttlMin} min`,
    };
  }

  oauthRevoke(tenantId: string, connectionId: string) {
    const conn = DataStore.mem().findOne("mail_connections", (c: any) => c._id === connectionId && c.tenantId === tenantId);
    if (!conn) throw new Error(`Connection "${connectionId}" not found`);
    const c = this.connector(conn.connectorId);
    const updated = DataStore.mem().update("mail_connections", (x: any) => x._id === connectionId, {
      status: "disconnected",
      accessToken: null,
      refreshToken: null,
      oauthState: null,
      oauthCompletedAt: null,
      oauthScope: null,
      tokenExpiresAt: null,
      error: null,
    });
    logEntry(tenantId, "oauth_revoked", `${c.name} access revoked`, { connectionId });
    return { connectionId, connectorId: c.id, status: updated.status, summary: `${c.name} access revoked — re-authorize to reconnect` };
  }

  oauthStatus(tenantId: string, connectionId: string) {
    const conn = DataStore.mem().findOne("mail_connections", (c: any) => c._id === connectionId && c.tenantId === tenantId);
    if (!conn) throw new Error(`Connection "${connectionId}" not found`);
    const c = this.connector(conn.connectorId);
    const authorized = !!(conn.accessToken || conn.oauthCompletedAt);
    let expired = false;
    let expiresInHours: number | null = null;
    if (conn.tokenExpiresAt) {
      expiresInHours = Math.max(0, Math.round((new Date(conn.tokenExpiresAt).getTime() - Date.now()) / 3600000));
      expired = new Date(conn.tokenExpiresAt).getTime() < Date.now();
    }
    return {
      connectionId,
      connectorId: c.id,
      connectorName: c.name,
      status: conn.status,
      authorized,
      pendingAuth: !!conn.oauthState,
      scopes: conn.scopes,
      grantedScope: conn.oauthScope || null,
      tokenExpiresAt: conn.tokenExpiresAt || null,
      expired,
      expiresInHours,
      lastTokenRefreshAt: conn.lastTokenRefreshAt || null,
      summary: authorized
        ? expired
          ? `${c.name} token EXPIRED — refresh or re-authorize`
          : `${c.name} authorized — token valid ~${expiresInHours} h`
        : conn.oauthState
          ? `${c.name} awaiting authorization callback`
          : `${c.name} not authorized`,
    };
  }

  integrationLog(tenantId: string, connectorId?: string, limit = 50) {
    const items = DataStore.mem().find("mail_integration_log", (l: any) => l.tenantId === tenantId && (!connectorId || l.connectorId === connectorId));
    return [...items].sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit)
      .map((l: any) => ({ category: l.category, detail: l.detail, connectionId: l.connectionId || null, at: l.at }));
  }

  integrationAlerts(tenantId: string) {
    const conns = DataStore.mem().find("mail_connections", (c: any) => c.tenantId === tenantId);
    const now = Date.now();
    const day = 24 * 3600 * 1000;
    const alerts: any[] = [];
    for (const c of conns) {
      const name = (CONNECTORS.find((x) => x.id === c.connectorId) || {}).name || c.connectorId;
      if (c.status === "error") alerts.push({ severity: "high", connectionId: c._id, connectorId: c.connectorId, text: `${name} is in error state${c.error ? `: ${c.error}` : ""}` });
      else if (c.status === "needs_auth") alerts.push({ severity: "medium", connectionId: c._id, connectorId: c.connectorId, text: `${name} needs re-authorization` });
      else if (c.status === "connected" && (!c.lastSyncAt || (now - new Date(c.lastSyncAt).getTime()) > day)) alerts.push({ severity: "low", connectionId: c._id, connectorId: c.connectorId, text: `${name} hasn't synced in over 24h` });
    }
    return { alerts, total: alerts.length, summary: alerts.length ? `${alerts.length} integration alert(s)` : "All integrations healthy" };
  }

  integrationOverview(tenantId: string) {
    const catalog = this.connectorCatalog(tenantId);
    const conns = this.listConnections(tenantId);
    const jobs = this.syncHistory(tenantId);
    const alerts = this.integrationAlerts(tenantId);
    const bridges = DataStore.mem().find("mail_integration_bridges", (b: any) => b.tenantId === tenantId);
    const itemsSynced = conns.reduce((s: number, c: any) => s + (c.itemsSynced || 0), 0);
    const actionsRun = conns.reduce((s: number, c: any) => s + (c.actionsRun || 0), 0);
    const syncs = jobs.jobs.length;
    return {
      totalConnections: conns.length,
      connected: conns.filter((c: any) => c.status === "connected").length,
      needsAuth: conns.filter((c: any) => c.status === "needs_auth").length,
      errors: conns.filter((c: any) => c.status === "error").length,
      syncs,
      itemsSynced,
      actionsRun,
      bridges: bridges.length,
      catalog,
      connections: conns,
      alerts: alerts.alerts,
      recentSyncs: jobs.jobs.slice(0, 8),
      log: this.integrationLog(tenantId, undefined, 10),
      generatedAt: new Date().toISOString(),
      summary: `${conns.filter((c: any) => c.status === "connected").length} of ${conns.length} connection(s) active — ${itemsSynced} item(s) synced, ${actionsRun} action(s) run`,
      seed: hashStr(tenantId + "integration_seed"),
    };
  }

  integrationDashboard(tenantId: string) {
    return this.integrationOverview(tenantId);
  }

  listBridges(tenantId: string) {
    const bridges = DataStore.mem().find("mail_integration_bridges", (b: any) => b.tenantId === tenantId);
    return [...bridges].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((b: any) => ({
      bridgeId: b._id,
      name: b.name,
      event: b.event,
      connectorId: b.connectorId,
      connectorName: (CONNECTORS.find((x) => x.id === b.connectorId) || {}).name || b.connectorId,
      action: b.action,
      target: b.target || null,
      enabled: b.enabled,
      triggerCount: b.triggerCount || 0,
      lastTriggerAt: b.lastTriggerAt || null,
    }));
  }

  createBridge(tenantId: string, input: any) {
    const name = String((input && input.name) || "").trim();
    if (!name) throw new Error("Bridge name is required");
    const event = String((input && input.event) || "");
    if (!BRIDGE_EVENTS.includes(event)) throw new Error(`Unknown event "${event}" — use one of: ${BRIDGE_EVENTS.join(", ")}`);
    const c = this.connector(String((input && input.connectorId) || ""));
    const action = String((input && input.action) || "");
    if (!c.actions.includes(action)) throw new Error(`Connector "${c.id}" does not support action "${action}"`);
    const bridge = DataStore.mem().insert("mail_integration_bridges", {
      tenantId,
      name,
      event,
      connectorId: c.id,
      action,
      target: (input && input.target) || null,
      enabled: (input && input.enabled === false) ? false : true,
      triggerCount: 0,
      lastTriggerAt: null,
      createdAt: new Date().toISOString(),
    });
    logEntry(tenantId, "bridge_created", `Bridge "${name}": ${event} â†’ ${c.name} ${action}`, { bridgeId: bridge._id });
    return { bridgeId: bridge._id, name, event, connectorId: c.id, action, enabled: bridge.enabled, summary: `Bridge "${name}" created — ${event} â†’ ${c.name} ${ACTION_LABELS[action] || action}` };
  }

  deleteBridge(tenantId: string, bridgeId: string) {
    const bridge = DataStore.mem().findOne("mail_integration_bridges", (b: any) => b._id === bridgeId && b.tenantId === tenantId);
    if (!bridge) throw new Error(`Bridge "${bridgeId}" not found`);
    DataStore.mem().delete("mail_integration_bridges", (b: any) => b._id === bridgeId && b.tenantId === tenantId);
    logEntry(tenantId, "bridge_deleted", `Deleted bridge "${bridge.name}"`, { bridgeId });
    return { bridgeId, name: bridge.name, summary: `Bridge "${bridge.name}" deleted` };
  }

  triggerBridge(tenantId: string, bridgeId: string) {
    const bridge = DataStore.mem().findOne("mail_integration_bridges", (b: any) => b._id === bridgeId && b.tenantId === tenantId);
    if (!bridge) throw new Error(`Bridge "${bridgeId}" not found`);
    if (!bridge.enabled) throw new Error(`Bridge "${bridge.name}" is disabled`);
    const conn = DataStore.mem().findOne("mail_connections", (c: any) => c.tenantId === tenantId && c.connectorId === bridge.connectorId && c.status === "connected");
    if (!conn) throw new Error(`No active ${bridge.connectorId} connection — connect it first`);
    const r = this.runAction(tenantId, conn._id, bridge.action, { text: bridge.name, title: bridge.name, channel: bridge.target || "general" });
    const updated = DataStore.mem().update("mail_integration_bridges", (b: any) => b._id === bridgeId, {
      triggerCount: (bridge.triggerCount || 0) + 1,
      lastTriggerAt: new Date().toISOString(),
    });
    logEntry(tenantId, "bridge_fired", `Bridge "${bridge.name}" fired â†’ ${r.summary}`, { bridgeId });
    return { bridgeId, event: bridge.event, connectorId: bridge.connectorId, action: bridge.action, triggerCount: updated.triggerCount, result: r, summary: `Bridge "${bridge.name}" fired â†’ ${r.summary}` };
  }
}

export const mailIntegration = new MailIntegrationService();
