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

export const INTEGRATION_CATEGORIES = ["email", "chat", "crm", "storage", "meetings", "docs"] as const;

export const CONNECTORS: any[] = [
  { id: "gmail", name: "Gmail", description: "Inbox, labels & calendar", category: "email", scopes: ["mail.read", "mail.send", "calendar.read"], actions: ["sync_mail", "create_event"], authType: "oauth2" },
  { id: "outlook", name: "Outlook", description: "Inbox, folders & calendar", category: "email", scopes: ["mail.read", "mail.send", "calendar.read"], actions: ["sync_mail", "create_event"], authType: "oauth2" },
  { id: "slack", name: "Slack", description: "Channels & direct messages", category: "chat", scopes: ["chat.write", "channel.read"], actions: ["post_to_chat", "forward_to_channel"], authType: "oauth2" },
  { id: "teams", name: "Microsoft Teams", description: "Teams, channels & meetings", category: "chat", scopes: ["channel.read", "message.write"], actions: ["post_to_chat", "forward_to_channel"], authType: "oauth2" },
  { id: "crm", name: "CRM", description: "Contacts, leads & pipeline", category: "crm", scopes: ["contacts.read", "contacts.write", "deals.write"], actions: ["push_to_crm", "sync_contacts"], authType: "oauth2" },
  { id: "drive", name: "Google Drive", description: "Files & folders", category: "storage", scopes: ["file.read", "file.write"], actions: ["upload_file"], authType: "oauth2" },
  { id: "dropbox", name: "Dropbox", description: "Files & folders", category: "storage", scopes: ["file.read", "file.write"], actions: ["upload_file"], authType: "oauth2" },
  { id: "zoom", name: "Zoom", description: "Video meetings & recordings", category: "meetings", scopes: ["meeting.write"], actions: ["schedule_meeting"], authType: "oauth2" },
  { id: "calendar", name: "Calendar", description: "Events & availability", category: "meetings", scopes: ["calendar.read", "calendar.write"], actions: ["schedule_meeting", "create_event"], authType: "oauth2" },
  { id: "notion", name: "Notion", description: "Docs, pages & tasks", category: "docs", scopes: ["page.read", "page.write"], actions: ["create_task"], authType: "oauth2" },
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
    if (existing) return { connectionId: existing._id, ...this.toPublic(existing), summary: `Already connected — ${c.name} is linked to this mailbox` };
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
    return { connectionId: connection._id, ...this.toPublic(connection), summary: `${c.name} connected — ${c.scopes.length} scopes authorized` };
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
    return { connectionId, ...this.toPublic(updated), summary: `Connection settings updated` };
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
    } else {
      throw new Error(`Unsupported action "${action}"`);
    }
    const updated = DataStore.mem().update("mail_connections", (x: any) => x._id === connectionId, {
      actionsRun: (conn.actionsRun || 0) + 1,
    });
    logEntry(tenantId, `action_${action}`, `${c.name} · ${ACTION_LABELS[action] || action} — ${result.summary}`, { connectionId, action });
    return { connectionId, connectorId: c.id, action, ...result, actionsRun: updated.actionsRun, summary: `${c.name}: ${result.summary}` };
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
    logEntry(tenantId, "bridge_created", `Bridge "${name}": ${event} → ${c.name} ${action}`, { bridgeId: bridge._id });
    return { bridgeId: bridge._id, name, event, connectorId: c.id, action, enabled: bridge.enabled, summary: `Bridge "${name}" created — ${event} → ${c.name} ${ACTION_LABELS[action] || action}` };
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
    logEntry(tenantId, "bridge_fired", `Bridge "${bridge.name}" fired → ${r.summary}`, { bridgeId });
    return { bridgeId, event: bridge.event, connectorId: bridge.connectorId, action: bridge.action, triggerCount: updated.triggerCount, result: r, summary: `Bridge "${bridge.name}" fired → ${r.summary}` };
  }
}

export const mailIntegration = new MailIntegrationService();
