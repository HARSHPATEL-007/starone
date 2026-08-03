import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function redactText(text: string): string {
  let out = String(text || "");
  out = out.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email redacted]");
  out = out.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN redacted]");
  out = out.replace(/(\+\d{1,3}[\s.-]?)?(\(\d{2,4}\)[\s.-]?)?\d{3}[\s.-]?\d{4}\b/g, "[phone redacted]");
  return out;
}

const CONCEPT_TOPICS: { topic: string; label: string; keywords: string[] }[] = [
  { topic: "contract", label: "Contracts & agreements", keywords: ["contract", "agreement", "msa", "sla", "terms", "clause", "signature", "renewal", "counterparty"] },
  { topic: "invoice", label: "Invoices & billing", keywords: ["invoice", "payment", "billing", "amount due", "receipt", "balance", "overdue", "purchase order"] },
  { topic: "meeting", label: "Meetings & scheduling", keywords: ["meeting", "agenda", "schedule", "calendar", "invite", "availability", "reschedule", "sync"] },
  { topic: "legal", label: "Legal & litigation", keywords: ["litigation", "attorney", "counsel", "discovery", "subpoena", "lawsuit", "court", "privilege", "deposition", "witness"] },
  { topic: "finance", label: "Finance & budget", keywords: ["budget", "revenue", "forecast", "spend", "roi", "quarter", "expense", "p&l"] },
  { topic: "hr", label: "HR & hiring", keywords: ["hiring", "interview", "candidate", "offer letter", "onboarding", "payroll", "benefits", "resume"] },
  { topic: "personal", label: "Personal", keywords: ["weekend", "vacation", "dinner", "birthday", "holiday", "photos", "family"] },
];

const PRIVILEGE_TYPES: { type: string; label: string }[] = [
  { type: "attorney_client", label: "Attorney-client communication" },
  { type: "work_product", label: "Attorney work product" },
  { type: "settlement", label: "Settlement negotiation" },
  { type: "confidential", label: "Confidential business information" },
];

export class MailDiscoveryService {
  private matchScope(m: any, scope: any): boolean {
    const s = scope || {};
    if (s.folder && m.folder !== s.folder) return false;
    if (s.label && !(m.labels || []).includes(s.label)) return false;
    if (s.query) {
      const q = String(s.query).toLowerCase();
      const hay = `${m.subject || ""} ${m.body || ""} ${(m.from || {}).name || ""} ${(m.from || {}).email || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (s.from) {
      const from = String(s.from).toLowerCase();
      if (!String((m.from || {}).email || "").toLowerCase().includes(from) && !String((m.from || {}).name || "").toLowerCase().includes(from)) return false;
    }
    if (s.dateFrom) {
      const df = new Date(String(s.dateFrom)).getTime();
      const d = new Date(m.receivedAt || m.sentAt || m.createdAt).getTime();
      if (isNaN(df) || d < df) return false;
    }
    if (s.dateTo) {
      const dt = new Date(String(s.dateTo)).getTime();
      const d = new Date(m.receivedAt || m.sentAt || m.createdAt).getTime();
      if (isNaN(dt) || d > dt) return false;
    }
    if (s.hasAttachments === "true" || s.hasAttachments === true) {
      if (!(m.attachments || []).length) return false;
    }
    if (s.attachmentType) {
      if (!(m.attachments || []).some((a: any) => String(a.type || a.name || "").toLowerCase().includes(String(s.attachmentType).toLowerCase()))) return false;
    }
    if (s.unreadOnly === "true" || s.unreadOnly === true) {
      if (m.read !== false) return false;
    }
    return true;
  }

  scopeSearch(tenantId: string, scope: any = {}, opts: any = {}) {
    const limit = opts.limit ? parseInt(String(opts.limit), 10) : 200;
    const results = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && this.matchScope(m, scope))
      .sort((a: any, b: any) => new Date(b.receivedAt || b.sentAt || b.createdAt).getTime() - new Date(a.receivedAt || a.sentAt || a.createdAt).getTime())
      .slice(0, limit)
      .map(m => ({
        messageId: m._id,
        threadId: m.threadId,
        subject: m.subject,
        from: m.from || {},
        to: m.to || [],
        date: m.receivedAt || m.sentAt || m.createdAt,
        folder: m.folder,
        labels: m.labels || [],
        attachments: (m.attachments || []).map((a: any) => a.name),
        sizeBytes: (m.body || "").length + ((m.attachments || []).reduce((acc: number, a: any) => acc + (a.sizeBytes || 0), 0)),
      }));
    return { results, total: results.length, scope, summary: `${results.length} message(s) matched` };
  }

  saveSearch(tenantId: string, input: any) {
    if (!input || !input.name) throw new Error("Search name is required");
    if (!input.scope || Object.keys(input.scope).length === 0) throw new Error("Search scope is required");
    const search = DataStore.mem().insert("mail_saved_searches", {
      tenantId,
      name: input.name,
      scope: input.scope,
      description: input.description || "",
      createdBy: input.createdBy || "user_001",
    });
    return { searchId: search._id, ...search, summary: `Saved search "${input.name}" created` };
  }

  listSavedSearches(tenantId: string) {
    const searches = DataStore.mem().find("mail_saved_searches", (s: any) => s.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { searches, count: searches.length, summary: `${searches.length} saved search(es)` };
  }

  deleteSavedSearch(tenantId: string, searchId: string) {
    const search = DataStore.mem().findOne("mail_saved_searches", (s: any) => s._id === searchId && s.tenantId === tenantId);
    if (!search) throw new Error(`Saved search "${searchId}" not found`);
    DataStore.mem().delete("mail_saved_searches", (s: any) => s._id === searchId && s.tenantId === tenantId);
    return { searchId, summary: `Saved search "${search.name}" deleted` };
  }

  runSavedSearch(tenantId: string, searchId: string) {
    const search = DataStore.mem().findOne("mail_saved_searches", (s: any) => s._id === searchId && s.tenantId === tenantId);
    if (!search) throw new Error(`Saved search "${searchId}" not found`);
    return { searchId, name: search.name, ...this.scopeSearch(tenantId, search.scope) };
  }

  private stampChain(tenantId: string, content: string) {
    const previous = DataStore.mem().find("mail_exports", (e: any) => e.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-1)[0];
    const contentHash = hashStr(String(content || "")).toString(36);
    const previousHash = previous ? previous.chainHash : "GENESIS";
    return { contentHash, previousHash, chainHash: hashStr(previousHash + contentHash).toString(36) };
  }

  createExport(tenantId: string, input: any) {
    if (!input) throw new Error("Export input is required");
    const format = input.format || "csv";
    if (!["csv", "eml", "mbox", "pdf"].includes(format)) throw new Error(`Unsupported export format "${format}"`);
    const matches = this.scopeSearch(tenantId, input.scope || {}, { limit: 500 }).results;
    if (matches.length === 0) throw new Error("No messages match the export scope");
    const redactPii = input.redactPii === true || input.redactPii === "true";
    const items = matches.map((m: any, i: number) => ({
      itemId: `itm_${hashStr(m.messageId + "export").toString(36)}`,
      batesNumber: `BATES-${String(i + 1).padStart(4, "0")}`,
      messageId: m.messageId,
      subject: m.subject,
      from: redactPii ? redactText((m.from || {}).email || "") : (m.from || {}).email || "",
      to: redactPii ? (m.to || []).map((t: any) => redactText(t.email || "")).join(", ") : (m.to || []).map((t: any) => t.email).join(", "),
      date: m.date,
      folder: m.folder,
      sizeBytes: m.sizeBytes,
    }));
    let content = "";
    const header = ["Bates #", "Date", "From", "To", "Subject", "Folder", "Size (bytes)"];
    if (format === "csv") {
      content = [header.join(",")].concat(items.map(it => [it.batesNumber, it.date, `"${it.from}"`, `"${it.to}"`, `"${it.subject.replace(/"/g, '""')}"`, it.folder, it.sizeBytes].join(","))).join("\n");
    } else if (format === "eml" || format === "mbox") {
      content = items.map(it => `From: ${it.from}\nTo: ${it.to}\nDate: ${it.date}\nSubject: ${it.subject}\n\n[Message ${it.messageId} — bates ${it.batesNumber}]\n`).join(format === "mbox" ? "\n" : "");
    } else {
      content = `N0VA MAIL eDiscovery Export\nExported: ${new Date().toISOString()}\nFormat: PDF (metadata manifest)\nMessages: ${items.length}\nPII redacted: ${redactPii}\n\n` + items.map(it => `${it.batesNumber} | ${it.date} | ${it.from} | ${it.subject}`).join("\n");
    }
    const totalBytes = items.reduce((acc, it) => acc + (it.sizeBytes || 0), 0);
    const chain = this.stampChain(tenantId, content);
    const exportRecord = DataStore.mem().insert("mail_exports", {
      tenantId,
      name: input.name || `Export ${new Date().toLocaleDateString()}`,
      format,
      scope: input.scope || {},
      redactPii,
      itemCount: items.length,
      batesRange: { from: items[0].batesNumber, to: items[items.length - 1].batesNumber },
      totalBytes,
      status: "ready",
      createdBy: input.createdBy || "user_001",
      kind: "ediscovery",
      ...chain,
      download: { filename: `${(input.name || "export").toLowerCase().replace(/[^a-z0-9_-]+/gi, "_")}.${format}`, content },
    });
    return { exportId: exportRecord._id, ...exportRecord, summary: `Export created — ${items.length} message(s), ${redactPii ? "PII redacted, " : ""}${format.toUpperCase()}` };
  }

  exports(tenantId: string) {
    const exportsList = DataStore.mem().find("mail_exports", (e: any) => e.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((e: any) => ({ exportId: e._id, name: e.name, format: e.format, itemCount: e.itemCount, batesRange: e.batesRange, totalBytes: e.totalBytes, redactPii: e.redactPii, status: e.status, createdAt: e.createdAt, kind: e.kind || "ediscovery", chainHash: e.chainHash }));
    return { exports: exportsList, count: exportsList.length, summary: `${exportsList.length} export(s)` };
  }

  getExport(tenantId: string, exportId: string) {
    const e = DataStore.mem().findOne("mail_exports", (x: any) => x._id === exportId && x.tenantId === tenantId);
    if (!e) throw new Error(`Export "${exportId}" not found`);
    return e;
  }

  deleteExport(tenantId: string, exportId: string) {
    const e = DataStore.mem().findOne("mail_exports", (x: any) => x._id === exportId && x.tenantId === tenantId);
    if (!e) throw new Error(`Export "${exportId}" not found`);
    DataStore.mem().delete("mail_exports", (x: any) => x._id === exportId && x.tenantId === tenantId);
    return { exportId, summary: `Export "${e.name}" deleted` };
  }

  conceptSearch(tenantId: string, query: string, opts: any = {}) {
    const q = String(query || "").trim();
    const limit = opts.limit ? parseInt(String(opts.limit), 10) : 300;
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId)
      .filter((m: any) => !q || `${m.subject || ""} ${m.body || ""}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a: any, b: any) => new Date(b.receivedAt || b.sentAt || b.createdAt).getTime() - new Date(a.receivedAt || a.sentAt || a.createdAt).getTime())
      .slice(0, limit);
    const clusterMap = new Map<string, any>();
    for (const t of CONCEPT_TOPICS) clusterMap.set(t.topic, { topic: t.topic, label: t.label, score: 0, messages: [] });
    clusterMap.set("general", { topic: "general", label: "General / unclassified", score: 0, messages: [] });
    for (const m of msgs) {
      const subject = (m.subject || "").toLowerCase();
      const body = (m.body || "").toLowerCase();
      let best: any = null;
      let bestScore = 0;
      for (const t of CONCEPT_TOPICS) {
        let s = 0;
        for (const kw of t.keywords) {
          if (subject.includes(kw)) s += 2;
          if (body.includes(kw)) s += 1;
        }
        if (s > bestScore) { bestScore = s; best = t; }
      }
      const key = best && bestScore >= 2 ? best.topic : "general";
      const c = clusterMap.get(key);
      c.score += bestScore;
      c.messages.push({ messageId: m._id, subject: m.subject, from: (m.from || {}).email, date: m.receivedAt || m.sentAt || m.createdAt, folder: m.folder, score: bestScore });
    }
    const clusters = [...clusterMap.values()]
      .filter((c) => c.messages.length > 0)
      .map((c) => ({ ...c, count: c.messages.length, messages: c.messages.slice(0, 20) }))
      .sort((a, b) => b.count - a.count);
    return {
      query: q,
      total: msgs.length,
      clusters,
      summary: `${msgs.length} message(s) clustered into ${clusters.length} concept group(s)${q ? ` for "${q}"` : ""}`,
    };
  }

  markMessagePrivileged(tenantId: string, messageId: string, input: any) {
    const msg = DataStore.mem().findOne("messages", (m: any) => m._id === messageId && m.tenantId === tenantId);
    if (!msg) throw new Error(`Message "${messageId}" not found`);
    if (!input) throw new Error("Privilege input is required");
    const type = String(input.type || "confidential");
    const typeDef = PRIVILEGE_TYPES.find((p) => p.type === type);
    if (!typeDef) throw new Error(`Unknown privilege type "${type}"`);
    if (!input.reason) throw new Error("A reason is required to assert privilege");
    const existing = DataStore.mem().findOne("mail_privileges", (p: any) => p.messageId === messageId && p.tenantId === tenantId && !p.removed);
    if (existing) throw new Error("Message is already privileged");
    const rec = DataStore.mem().insert("mail_privileges", {
      tenantId,
      messageId,
      type,
      reason: input.reason,
      subject: msg.subject,
      from: (msg.from || {}).email,
      assertedBy: input.assertedBy || "user_001",
      removed: false,
      createdAt: new Date().toISOString(),
    });
    return { privilegeId: rec._id, messageId, type, reason: rec.reason, summary: `Privilege asserted on "${msg.subject}" (${typeDef.label})` };
  }

  listPrivileges(tenantId: string) {
    const privileges = DataStore.mem().find("mail_privileges", (p: any) => p.tenantId === tenantId && !p.removed)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((p: any) => ({
        privilegeId: p._id,
        messageId: p.messageId,
        type: p.type,
        typeLabel: PRIVILEGE_TYPES.find((x) => x.type === p.type)?.label || p.type,
        subject: p.subject,
        from: p.from,
        reason: p.reason,
        assertedBy: p.assertedBy,
        createdAt: p.createdAt,
      }));
    return { privileges, count: privileges.length, summary: `${privileges.length} privileged message(s)` };
  }

  removePrivilege(tenantId: string, messageId: string) {
    const p = DataStore.mem().findOne("mail_privileges", (x: any) => x.messageId === messageId && x.tenantId === tenantId && !x.removed);
    if (!p) throw new Error("No active privilege on that message");
    DataStore.mem().update("mail_privileges", (x: any) => x._id === p._id, { removed: true, removedAt: new Date().toISOString() });
    return { messageId, summary: `Privilege removed from "${p.subject}"` };
  }

  privilegeSummary(tenantId: string) {
    const privileges = DataStore.mem().find("mail_privileges", (p: any) => p.tenantId === tenantId && !p.removed);
    const byType = PRIVILEGE_TYPES.map((t) => ({ type: t.type, label: t.label, count: privileges.filter((p) => p.type === t.type).length }));
    return { total: privileges.length, byType, summary: `${privileges.length} message(s) under privilege protection` };
  }

  exportAuditChain(tenantId: string) {
    const exportsList = DataStore.mem().find("mail_exports", (e: any) => e.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    let previousHash = "GENESIS";
    let chainIntact = true;
    let brokenAt: string | null = null;
    const entries = exportsList.map((e: any) => {
      const contentHash = hashStr(String(e.download?.content || "")).toString(36);
      const expected = hashStr(previousHash + contentHash).toString(36);
      const verified = e.chainHash === expected;
      if (!verified && chainIntact) { chainIntact = false; brokenAt = e._id; }
      previousHash = e.chainHash || expected;
      return { exportId: e._id, name: e.name, format: e.format, itemCount: e.itemCount, kind: e.kind || "ediscovery", createdAt: e.createdAt, previousHash: e.previousHash, chainHash: e.chainHash, verified };
    });
    return {
      entries: entries.slice().reverse(),
      length: entries.length,
      chainIntact,
      brokenAt,
      summary: chainIntact ? `Export chain intact — ${entries.length} export(s) hash-verified` : `Chain broken at "${brokenAt}" — tamper detected`,
    };
  }

  discoverySummary(tenantId: string) {
    const messages = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId);
    const byFolder = new Map<string, number>();
    let totalBytes = 0;
    for (const m of messages) {
      byFolder.set(m.folder || "other", (byFolder.get(m.folder || "other") || 0) + 1);
      totalBytes += (m.body || "").length + (m.attachments || []).reduce((acc: number, a: any) => acc + (a.sizeBytes || 0), 0);
    }
    const exportsList = this.exports(tenantId);
    const searches = this.listSavedSearches(tenantId);
    const privileges = this.listPrivileges(tenantId);
    const chain = this.exportAuditChain(tenantId);
    return {
      searchableMessages: messages.length,
      byFolder: [...byFolder.entries()].map(([folder, count]) => ({ folder, count })).sort((a, b) => b.count - a.count),
      totalSizeBytes: totalBytes,
      exports: exportsList.count,
      savedSearches: searches.count,
      privileged: privileges.count,
      chainIntact: chain.chainIntact,
      summary: `${messages.length} message(s) searchable · ${exportsList.count} export(s) · ${searches.count} saved search(es) · ${privileges.count} privileged`,
      seed: hashStr(tenantId + "discovery_summary"),
    };
  }
}

export const mailDiscovery = new MailDiscoveryService();
