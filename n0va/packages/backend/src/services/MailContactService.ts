import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export class MailContactService {
  listContacts(tenantId: string, opts: any = {}) {
    let contacts = DataStore.mem().find("mail_contacts", (c: any) => c.tenantId === tenantId);
    const q = String(opts.query || "").toLowerCase().trim();
    if (q) contacts = contacts.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
    if (opts.group) contacts = contacts.filter(c => (c.tags || []).includes(opts.group));
    const withStats = contacts.map(c => {
      const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && ((m.from || {}).email === c.email || (m.to || []).some((r: any) => r.email === c.email)));
      return {
        contactId: c._id, name: c.name, email: c.email, tags: c.tags || [], company: c.company || "",
        notes: c.notes || "", messageCount: msgs.length,
        lastContact: msgs.length ? msgs.map(m => m.receivedAt).sort().pop() : undefined,
      };
    });
    if (opts.sort === "recent") withStats.sort((a, b) => (b.lastContact || "").localeCompare(a.lastContact || ""));
    const limit = opts.limit ? parseInt(String(opts.limit), 10) : 100;
    return withStats.slice(0, limit);
  }

  getContact(tenantId: string, contactId: string) {
    const contact = DataStore.mem().findOne("mail_contacts", (c: any) => c._id === contactId && c.tenantId === tenantId);
    if (!contact) throw new Error(`Contact "${contactId}" not found`);
    return { contactId: contact._id, name: contact.name, email: contact.email, tags: contact.tags || [], company: contact.company || "", notes: contact.notes || "", createdAt: contact.createdAt };
  }

  createContact(tenantId: string, input: any) {
    if (!input || !input.name || !input.email) throw new Error("Contact name and email are required");
    const dup = DataStore.mem().findOne("mail_contacts", (c: any) => c.tenantId === tenantId && c.email.toLowerCase() === String(input.email).toLowerCase());
    if (dup) throw new Error(`Contact "${input.email}" already exists`);
    const contact = DataStore.mem().insert("mail_contacts", {
      tenantId,
      name: input.name,
      email: input.email,
      tags: input.tags || [],
      company: input.company || "",
      notes: input.notes || "",
      createdBy: input.createdBy || "user_001",
    });
    return { contactId: contact._id, ...contact, summary: `Contact "${input.name}" added` };
  }

  updateContact(tenantId: string, contactId: string, patch: any) {
    const contact = this.getContact(tenantId, contactId);
    const updated = DataStore.mem().update("mail_contacts", (c: any) => c._id === contactId && c.tenantId === tenantId, {
      ...(patch.name ? { name: patch.name } : {}),
      ...(patch.email ? { email: patch.email } : {}),
      ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
      ...(patch.company !== undefined ? { company: patch.company } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    });
    return { contactId: updated._id, name: updated.name, email: updated.email, tags: updated.tags, company: updated.company, notes: updated.notes, summary: `Contact "${contact.name}" updated` };
  }

  deleteContact(tenantId: string, contactId: string) {
    const contact = this.getContact(tenantId, contactId);
    DataStore.mem().delete("mail_contacts", (c: any) => c._id === contactId && c.tenantId === tenantId);
    return { contactId, summary: `Contact "${contact.name}" deleted` };
  }

  contactGroups(tenantId: string) {
    const contacts = DataStore.mem().find("mail_contacts", (c: any) => c.tenantId === tenantId);
    const counts = new Map<string, number>();
    for (const c of contacts) {
      const tags = c.tags && c.tags.length ? c.tags : ["uncategorized"];
      for (const t of tags) counts.set(t, (counts.get(t) || 0) + 1);
    }
    return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }

  mostContacted(tenantId: string, limit = 5) {
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId);
    const counts = new Map<string, { name: string; email: string; count: number }>();
    for (const m of msgs) {
      const partners: { name: string; email: string }[] = [];
      if ((m.from || {}).email) partners.push({ name: (m.from || {}).name || "", email: m.from.email });
      for (const r of m.to || []) if (r.email) partners.push({ name: r.name || "", email: r.email });
      for (const p of partners) {
        const e = p.email.toLowerCase();
        const known = DataStore.mem().findOne("mail_contacts", (c: any) => c.tenantId === tenantId && c.email.toLowerCase() === e);
        const existing = counts.get(e) || { name: known ? known.name : p.name || p.email, email: p.email, count: 0 };
        existing.count++;
        counts.set(e, existing);
      }
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
  }

  contactProfile(tenantId: string, contactId: string) {
    const contact = this.getContact(tenantId, contactId);
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && ((m.from || {}).email === contact.email || (m.to || []).some((r: any) => r.email === contact.email)));
    const threads = new Set(msgs.map(m => m.threadId));
    const last = msgs.map(m => m.receivedAt).sort().pop();
    const sentimentCounts = new Map<string, number>();
    for (const m of msgs) {
      const s = (m.ai && m.ai.sentiment) || "neutral";
      sentimentCounts.set(s, (sentimentCounts.get(s) || 0) + 1);
    }
    const sentiment = [...sentimentCounts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
    const seed = hashStr(contact.email + "profile");
    return {
      ...contact,
      messageCount: msgs.length,
      threadCount: threads.size,
      lastContact: last,
      sentiment,
      relationship: seed % 5 === 0 ? "key_account" : seed % 3 === 0 ? "frequent" : "regular",
      summary: `${msgs.length} message(s) across ${threads.size} thread(s) — last contact ${last ? new Date(last).toDateString() : "never"}`,
    };
  }

  contactsDashboard(tenantId: string) {
    const contacts = this.listContacts(tenantId);
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId);
    const sentToContacts = msgs.filter(m => (m.to || []).some((r: any) => contacts.some(c => c.email === r.email))).length;
    return {
      contacts,
      totals: { contacts: contacts.length, groups: this.contactGroups(tenantId).length, messagesExchanged: sentToContacts },
      groups: this.contactGroups(tenantId),
      mostContacted: this.mostContacted(tenantId, 5),
      summary: `${contacts.length} contacts in your address book — ${sentToContacts} message(s) exchanged with them`,
      seed: hashStr(tenantId + "contacts_seed"),
    };
  }
}

export const mailContacts = new MailContactService();
