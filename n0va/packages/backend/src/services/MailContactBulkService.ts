import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class MailContactBulkService {
  private log(tenantId: string, entry: any) {
    DataStore.mem().insert("mail_contact_bulk_log", { tenantId, ...entry, at: new Date().toISOString() });
  }

  importContacts(tenantId: string, input: any) {
    const rows = input && Array.isArray(input.rows) ? input.rows : [];
    if (!rows.length) throw new Error("At least one contact row is required");
    const group = String(input.group || "").trim();
    const mode = input.mode === "overwrite" ? "overwrite" : "skip";
    let imported = 0, updated = 0, skipped = 0, invalid = 0;
    const invalidRows: any[] = [];
    for (const row of rows) {
      const email = String((row && row.email) || "").trim().toLowerCase();
      const name = String((row && row.name) || "").trim() || email;
      if (!EMAIL_RE.test(email)) { invalid++; invalidRows.push({ email: email || "(missing)", reason: "invalid email" }); continue; }
      const existing = DataStore.mem().findOne("mail_contacts", (c: any) => c.tenantId === tenantId && c.email.toLowerCase() === email);
      if (existing) {
        if (mode === "overwrite") {
          const tags = new Set([...(existing.tags || []), ...(group ? [group] : [])]);
          const patch: any = { name: name || existing.name, tags: [...tags] };
          if (row && row.company) patch.company = row.company;
          DataStore.mem().update("mail_contacts", (c: any) => c._id === existing._id && c.tenantId === tenantId, patch);
          updated++;
        } else {
          skipped++;
        }
        continue;
      }
      DataStore.mem().insert("mail_contacts", {
        tenantId,
        name,
        email,
        tags: group ? [group] : [],
        company: (row && row.company) || "",
        notes: "",
        createdBy: "bulk_import",
      });
      imported++;
    }
    this.log(tenantId, { category: "contact_import", detail: `${imported} imported, ${updated} updated, ${skipped} skipped, ${invalid} invalid (mode ${mode})` });
    return {
      imported,
      updated,
      skipped,
      invalid,
      invalidRows,
      total: rows.length,
      group,
      mode,
      summary: `${imported} imported, ${updated} updated, ${skipped} skipped (duplicates), ${invalid} invalid`,
    };
  }

  exportContacts(tenantId: string, opts: any = {}) {
    let contacts = DataStore.mem().find("mail_contacts", (c: any) => c.tenantId === tenantId);
    if (opts.group) contacts = contacts.filter(c => (c.tags || []).includes(opts.group));
    const rows = contacts.map(c => ({ name: c.name, email: c.email, company: c.company || "", tags: (c.tags || []).join("|") }));
    const format = opts.format === "json" ? "json" : "csv";
    const filename = `contacts.${format}`;
    let content: string;
    let contentType: string;
    if (format === "json") {
      contentType = "application/json";
      content = JSON.stringify(rows, null, 2);
    } else {
      contentType = "text/csv";
      content = "name,email,company,tags\n" + rows.map(r => [r.name, r.email, r.company, r.tags].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    }
    const checksum = `sha256_${hashStr(tenantId + "|" + content).toString(36)}`;
    this.log(tenantId, { category: "contact_export", detail: `${rows.length} contact(s) exported as ${format.toUpperCase()}` });
    return { format, filename, contentType, rows: rows.length, content, checksum, summary: `${rows.length} contact(s) exported as ${format.toUpperCase()} (${content.length} bytes)` };
  }

  mergeContacts(tenantId: string, input: any) {
    if (!input || !input.keepContactId || !input.mergeContactId) throw new Error("keepContactId and mergeContactId are required");
    if (input.keepContactId === input.mergeContactId) throw new Error("Cannot merge a contact into itself");
    const keep = DataStore.mem().findOne("mail_contacts", (c: any) => c._id === input.keepContactId && c.tenantId === tenantId);
    if (!keep) throw new Error(`Contact "${input.keepContactId}" not found`);
    const merge = DataStore.mem().findOne("mail_contacts", (c: any) => c._id === input.mergeContactId && c.tenantId === tenantId);
    if (!merge) throw new Error(`Contact "${input.mergeContactId}" not found`);
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && ((m.from || {}).email === merge.email || (m.to || []).some((r: any) => r.email === merge.email)));
    for (const m of msgs) {
      const from = (m.from || {}).email === merge.email ? { ...m.from, email: keep.email, name: keep.name || m.from.name } : m.from;
      const to = (m.to || []).map((r: any) => r.email === merge.email ? { ...r, email: keep.email, name: keep.name || r.name } : r);
      DataStore.mem().update("messages", (mm: any) => mm._id === m._id && mm.tenantId === tenantId, { from, to });
    }
    const tags = [...new Set([...(keep.tags || []), ...(merge.tags || [])])];
    const patch: any = { tags };
    const notes = [keep.notes, merge.notes].filter(Boolean).join("; ");
    if (notes) patch.notes = notes;
    DataStore.mem().update("mail_contacts", (c: any) => c._id === keep._id && c.tenantId === tenantId, patch);
    DataStore.mem().delete("mail_contacts", (c: any) => c._id === merge._id && c.tenantId === tenantId);
    this.log(tenantId, { category: "contact_merged", detail: `"${merge.name}" merged into "${keep.name}" (${msgs.length} message(s) reassigned)` });
    return { keepContactId: keep._id, mergeContactId: merge._id, email: keep.email, messagesReassigned: msgs.length, tags, summary: `"${merge.name}" merged into "${keep.name}" (${msgs.length} message(s) reassigned)` };
  }

  dedupeContacts(tenantId: string) {
    const contacts = DataStore.mem().find("mail_contacts", (c: any) => c.tenantId === tenantId);
    const byEmail = new Map<string, any[]>();
    for (const c of contacts) {
      const k = c.email.toLowerCase();
      byEmail.set(k, [...(byEmail.get(k) || []), c]);
    }
    const pairs: any[] = [];
    for (const [email, list] of byEmail.entries()) {
      if (list.length < 2) continue;
      const sorted = list.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      const keep = sorted[0];
      for (const dup of sorted.slice(1)) {
        DataStore.mem().delete("mail_contacts", (c: any) => c._id === dup._id && c.tenantId === tenantId);
        pairs.push({ keepContactId: keep._id, mergedContactId: dup._id, email });
      }
    }
    this.log(tenantId, { category: "contact_dedupe", detail: `${pairs.length} duplicate(s) removed` });
    return { duplicates: pairs.length, removed: pairs.length, pairs, summary: `${pairs.length} duplicate(s) removed` };
  }

  bulkTagContacts(tenantId: string, input: any) {
    const ids = input && Array.isArray(input.contactIds) ? input.contactIds : [];
    if (!ids.length) throw new Error("At least one contactId is required");
    if (!input || !input.tag || !String(input.tag).trim()) throw new Error("Tag is required");
    const tag = String(input.tag).trim();
    let updated = 0;
    const found: string[] = [];
    for (const id of ids) {
      const c = DataStore.mem().findOne("mail_contacts", (cc: any) => cc._id === id && cc.tenantId === tenantId);
      if (!c) continue;
      const tags = new Set(c.tags || []);
      if (input.remove) tags.delete(tag); else tags.add(tag);
      DataStore.mem().update("mail_contacts", (cc: any) => cc._id === id && cc.tenantId === tenantId, { tags: [...tags] });
      updated++;
      found.push(id);
    }
    this.log(tenantId, { category: "contact_bulk_tag", detail: `Tag "${tag}" ${input.remove ? "removed from" : "applied to"} ${updated} contact(s)` });
    return { contactIds: found, tag, action: input.remove ? "removed" : "applied", updated, summary: `Tag "${tag}" ${input.remove ? "removed from" : "applied to"} ${updated} contact(s)` };
  }

  bulkDeleteContacts(tenantId: string, input: any) {
    const ids = input && Array.isArray(input.contactIds) ? input.contactIds : [];
    if (!ids.length) throw new Error("At least one contactId is required");
    let deleted = 0;
    for (const id of ids) {
      const c = DataStore.mem().findOne("mail_contacts", (cc: any) => cc._id === id && cc.tenantId === tenantId);
      if (!c) continue;
      DataStore.mem().delete("mail_contacts", (cc: any) => cc._id === id && cc.tenantId === tenantId);
      deleted++;
    }
    this.log(tenantId, { category: "contact_bulk_delete", detail: `${deleted} contact(s) deleted` });
    return { deleted, requested: ids.length, summary: `${deleted} contact(s) deleted` };
  }

  bulkDashboard(tenantId: string) {
    const contacts = DataStore.mem().find("mail_contacts", (c: any) => c.tenantId === tenantId);
    const byEmail = new Map<string, number>();
    const groupCounts = new Map<string, number>();
    for (const c of contacts) {
      const k = c.email.toLowerCase();
      byEmail.set(k, (byEmail.get(k) || 0) + 1);
      const tags = c.tags && c.tags.length ? c.tags : ["uncategorized"];
      for (const t of tags) groupCounts.set(t, (groupCounts.get(t) || 0) + 1);
    }
    const duplicates = [...byEmail.values()].filter(n => n > 1).reduce((acc, n) => acc + (n - 1), 0);
    const groups = [...groupCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    const log = this.bulkLog(tenantId, 10);
    const lastImport = log.log.find(l => l.category === "contact_import");
    return {
      total: contacts.length,
      duplicates,
      groups,
      lastImport: lastImport ? { at: lastImport.at, detail: lastImport.detail } : null,
      recentLog: log.log,
      summary: `${contacts.length} contact(s) · ${duplicates} duplicate(s) available for cleanup · ${groups.length} group(s)`,
      generatedAt: new Date().toISOString(),
    };
  }

  bulkLog(tenantId: string, limit = 20) {
    const log = DataStore.mem().find("mail_contact_bulk_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, limit);
    return { log, total: log.length, summary: `${log.length} bulk operation(s) recorded` };
  }
}

export const mailContactBulk = new MailContactBulkService();
