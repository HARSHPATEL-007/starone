import { useEffect, useState, useCallback } from "react";
import {
  Users, RefreshCw, Search, UserPlus, Trash2, Mail, Tag, Building2, X, MessageSquare, Clock,
  Upload, Download, Merge, Sparkles, ListChecks,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

function fmtDate(iso: string | undefined): string {
  if (!iso) return "never";
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

const REL_BADGE: Record<string, string> = {
  key_account: "bg-purple-500/15 text-purple-400",
  frequent: "bg-n0va-600/20 text-n0va-400",
  regular: "bg-gray-500/10 text-gray-400",
};

export default function MailContacts() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", tags: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [bulkDash, setBulkDash] = useState<any>(null);
  const [importText, setImportText] = useState("");
  const [importMode, setImportMode] = useState("skip");
  const [importGroup, setImportGroup] = useState("");
  const [mergeForm, setMergeForm] = useState({ keep: "", merge: "" });
  const [bulkTagForm, setBulkTagForm] = useState({ ids: "", tag: "", remove: false });
  const [bulkDelIds, setBulkDelIds] = useState("");

  const loadAll = useCallback(async () => {
    const d = unwrap(await api.adsMarketingModule.mailContactsDashboard().catch(() => null));
    setDash(d);
    const list = unwrap(await api.adsMarketingModule.mailContacts({ limit: 100 }).catch(() => null));
    setContacts(Array.isArray(list) ? list : list?.data || []);
    const bd = unwrap(await api.adsMarketingModule.mailContactBulkDashboard().catch(() => null));
    setBulkDash(bd);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    function refresh() { loadAll(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadAll]);

  async function applyFilters() {
    const opts: Record<string, any> = { limit: 100 };
    if (query.trim()) opts.query = query.trim();
    if (group) opts.group = group;
    const list = unwrap(await api.adsMarketingModule.mailContacts(opts).catch(() => null));
    setContacts(Array.isArray(list) ? list : list?.data || []);
  }

  async function openProfile(c: any) {
    const p = unwrap(await api.adsMarketingModule.mailContactProfile(c.contactId).catch(() => null));
    setProfile(p);
  }

  async function createContact() {
    if (!form.name.trim() || !form.email.trim()) {
      addToast("warning", "Missing fields", "Name and email are required.");
      return;
    }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailCreateContact({
        name: form.name.trim(),
        email: form.email.trim(),
        company: form.company.trim(),
        tags: form.tags.split(",").map((t: string) => t.trim()).filter(Boolean),
      }));
      addToast("success", "Contact added", r?.summary || "");
      setShowCreate(false);
      setForm({ name: "", email: "", company: "", tags: "" });
      await loadAll();
    } catch (e: any) {
      addToast("error", "Failed to add", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeContact(c: any) {
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailDeleteContact(c.contactId));
      addToast("success", "Contact deleted", r?.summary || "");
      if (profile?.contactId === c.contactId) setProfile(null);
      await loadAll();
    } catch (e: any) {
      addToast("error", "Delete failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  function parseImportRows(text: string): { name: string; email: string; company: string }[] {
    return text.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
      const parts = line.split(",").map((p) => p.trim());
      const email = parts.find((p) => p.includes("@")) || "";
      const name = parts.find((p) => !p.includes("@") && parts.indexOf(p) === 0) || email;
      const company = parts.length > 2 ? parts[2] : "";
      return { name: name === email ? "" : name, email, company };
    });
  }

  async function runImport() {
    const rows = parseImportRows(importText);
    if (!rows.length) {
      addToast("warning", "Nothing to import", "Paste one contact per line (name, email, company).");
      return;
    }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailContactImport({
        rows,
        mode: importMode,
        group: importGroup.trim() || undefined,
      }));
      addToast("success", "Import done", r?.summary || "");
      setImportText("");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Import failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  function downloadExport(r: any) {
    const blob = new Blob([r.content], { type: r.contentType || "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = r.filename || "contacts";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function exportContacts(format: string) {
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailContactExport({ format }));
      downloadExport(r);
      addToast("success", "Export ready", r?.summary || "");
    } catch (e: any) {
      addToast("error", "Export failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function runDedupe() {
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailContactDedupe());
      addToast("success", "Dedupe done", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Dedupe failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function runMerge() {
    if (!mergeForm.keep || !mergeForm.merge) {
      addToast("warning", "Missing pick", "Choose both the keeper and the contact to merge.");
      return;
    }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailContactMerge({
        keepContactId: mergeForm.keep,
        mergeContactId: mergeForm.merge,
      }));
      addToast("success", "Merged", r?.summary || "");
      setMergeForm({ keep: "", merge: "" });
      await loadAll();
    } catch (e: any) {
      addToast("error", "Merge failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function runBulkTag() {
    const ids = bulkTagForm.ids.split(",").map((s) => s.trim()).filter(Boolean);
    if (!ids.length || !bulkTagForm.tag.trim()) {
      addToast("warning", "Missing input", "Provide contact ids and a tag.");
      return;
    }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailContactBulkTag({
        contactIds: ids,
        tag: bulkTagForm.tag.trim(),
        remove: bulkTagForm.remove,
      }));
      addToast("success", bulkTagForm.remove ? "Tag removed" : "Tag applied", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Tag update failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function runBulkDelete() {
    const ids = bulkDelIds.split(",").map((s) => s.trim()).filter(Boolean);
    if (!ids.length) {
      addToast("warning", "Missing input", "Provide contact ids to delete.");
      return;
    }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailContactBulkDelete({ contactIds: ids }));
      addToast("success", "Bulk delete", r?.summary || "");
      setBulkDelIds("");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Delete failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  const totals = dash?.totals || {};
  const groups = dash?.groups || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Users className="w-6 h-6 text-n0va-400" /> Mail Contacts</h1>
          <p className="text-gray-500 mt-1 text-sm">{dash?.summary || "Your address book and relationships"}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn-secondary p-2" onClick={loadAll} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
            <UserPlus className="w-4 h-4" /> <span className="hidden sm:inline">Add contact</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{totals.contacts || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Contacts</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{totals.groups || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Groups</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{totals.messagesExchanged || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Messages exchanged</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
            <div className="space-y-4">
              <div className="card p-4 space-y-3">
                <div className="flex gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      className="input !pl-9"
                      placeholder="Search name or email…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") applyFilters(); }}
                    />
                  </div>
                  <button className="btn-secondary text-sm" onClick={applyFilters}>Search</button>
                </div>
                {groups.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      className={`text-[11px] px-2 py-1 rounded-full border ${group === "" ? "bg-n0va-600/20 text-n0va-400 border-n0va-600/30" : "border-gray-700 text-gray-400 hover:text-white"}`}
                      onClick={() => { setGroup(""); setTimeout(applyFilters, 0); }}
                    >All</button>
                    {groups.map((g: any) => (
                      <button
                        key={g.name}
                        className={`text-[11px] px-2 py-1 rounded-full border capitalize ${group === g.name ? "bg-n0va-600/20 text-n0va-400 border-n0va-600/30" : "border-gray-700 text-gray-400 hover:text-white"}`}
                        onClick={() => { setGroup(g.name); setTimeout(applyFilters, 0); }}
                      >{g.name} · {g.count}</button>
                    ))}
                  </div>
                )}
              </div>

              <div className="card !p-0">
                <ul className="divide-y divide-gray-800/50">
                  {contacts.map((c: any) => (
                    <li key={c.contactId}>
                      <button
                        onClick={() => openProfile(c)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-800/40 transition-colors flex items-center gap-3 ${profile?.contactId === c.contactId ? "bg-n0va-600/10" : ""}`}
                      >
                        <span className="w-9 h-9 rounded-full bg-n0va-600/20 text-n0va-400 flex items-center justify-center text-xs font-bold shrink-0">
                          {c.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-white truncate">{c.name}</span>
                            <span className="text-[10px] text-gray-500 shrink-0 flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDate(c.lastContact)}</span>
                          </span>
                          <span className="text-xs text-gray-500 truncate block">{c.email} · {c.messageCount} message{c.messageCount === 1 ? "" : "s"}</span>
                          {(c.tags || []).length > 0 && (
                            <span className="flex gap-1 mt-1 flex-wrap">
                              {(c.tags || []).map((t: string) => (
                                <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-700/60 text-gray-300 capitalize">{t}</span>
                              ))}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                  {contacts.length === 0 && <li className="px-4 py-10 text-center text-sm text-gray-500">No contacts found</li>}
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              {profile ? (
                <div className="card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-full bg-n0va-600/20 text-n0va-400 flex items-center justify-center text-sm font-bold">
                        {profile.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">{profile.name}</p>
                        <p className="text-xs text-gray-500">{profile.email}</p>
                      </div>
                    </div>
                    <button className="text-gray-500 hover:text-white" onClick={() => setProfile(null)}><X className="w-4 h-4" /></button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                    {profile.company && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{profile.company}</span>}
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{profile.messageCount} msgs · {profile.threadCount} threads</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold w-fit ${REL_BADGE[profile.relationship] || "bg-gray-500/10 text-gray-400"}`}>
                    {profile.relationship?.replace("_", " ")}
                  </span>
                  {(profile.tags || []).length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {(profile.tags || []).map((t: string) => (
                        <span key={t} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-gray-700/60 text-gray-300"><Tag className="w-2.5 h-2.5" />{t}</span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 italic">{profile.summary}</p>
                  <div className="flex gap-2 flex-wrap">
                    {(profile.sentiment || []).map((s: any) => (
                      <span key={s.label} className="text-[10px] px-2 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-300 capitalize">{s.label} · {s.count}</span>
                    ))}
                  </div>
                  <button className="btn-danger text-xs" disabled={busy} onClick={() => removeContact(profile)}>
                    <Trash2 className="w-3.5 h-3.5" /> Delete contact
                  </button>
                </div>
              ) : (
                <div className="card p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Most contacted</h3>
                  <ul className="space-y-2">
                    {(dash?.mostContacted || []).map((m: any) => (
                      <li key={m.email} className="flex items-center gap-2 text-sm">
                        <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                        <span className="truncate text-gray-300">{m.name}</span>
                        <span className="ml-auto text-xs text-gray-500 shrink-0">{m.count} msg{m.count === 1 ? "" : "s"}</span>
                      </li>
                    ))}
                    {(!dash?.mostContacted || dash.mostContacted.length === 0) && (
                      <li className="text-xs text-gray-500">No message history yet</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="card p-4 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><ListChecks className="w-4 h-4 text-n0va-400" /> Bulk tools</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700/60 text-gray-300">
                {bulkDash?.total || 0} contacts · {bulkDash?.duplicates || 0} duplicates · {bulkDash?.groups?.length || 0} groups
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-400 flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" /> Import contacts</p>
                <textarea
                  className="input !h-24 font-mono text-xs"
                  placeholder={"name, email, company\njordan@company.com"}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                />
                <div className="flex gap-2 flex-wrap items-center">
                  <select className="input !w-auto text-xs" value={importMode} onChange={(e) => setImportMode(e.target.value)}>
                    <option value="skip">Skip duplicates</option>
                    <option value="overwrite">Overwrite duplicates</option>
                  </select>
                  <input className="input !w-28 text-xs" placeholder="Group" value={importGroup} onChange={(e) => setImportGroup(e.target.value)} />
                  <button className="btn-primary text-xs" disabled={busy} onClick={runImport}>Import</button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button className="btn-secondary text-xs flex items-center gap-1.5" disabled={busy} onClick={() => exportContacts("csv")}>
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </button>
                  <button className="btn-secondary text-xs flex items-center gap-1.5" disabled={busy} onClick={() => exportContacts("json")}>
                    <Download className="w-3.5 h-3.5" /> Export JSON
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-400 flex items-center gap-1.5"><Merge className="w-3.5 h-3.5" /> Merge & dedupe</p>
                <div className="grid grid-cols-2 gap-2">
                  <select className="input text-xs" value={mergeForm.keep} onChange={(e) => setMergeForm({ ...mergeForm, keep: e.target.value })}>
                    <option value="">Keep…</option>
                    {contacts.map((c: any) => <option key={c.contactId} value={c.contactId}>{c.name}</option>)}
                  </select>
                  <select className="input text-xs" value={mergeForm.merge} onChange={(e) => setMergeForm({ ...mergeForm, merge: e.target.value })}>
                    <option value="">Merge into…</option>
                    {contacts.map((c: any) => <option key={c.contactId} value={c.contactId}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button className="btn-secondary text-xs" disabled={busy} onClick={runMerge}>Merge contacts</button>
                  <button className="btn-secondary text-xs flex items-center gap-1.5" disabled={busy} onClick={runDedupe}>
                    <Sparkles className="w-3.5 h-3.5" /> Dedupe ({bulkDash?.duplicates || 0})
                  </button>
                </div>

                <p className="text-xs font-medium text-gray-400 flex items-center gap-1.5 pt-1"><Tag className="w-3.5 h-3.5" /> Bulk tag / delete</p>
                <div className="flex gap-2 flex-wrap items-center">
                  <input className="input flex-1 min-w-[120px] text-xs" placeholder="contact ids, comma separated" value={bulkTagForm.ids} onChange={(e) => setBulkTagForm({ ...bulkTagForm, ids: e.target.value })} />
                  <input className="input !w-24 text-xs" placeholder="Tag" value={bulkTagForm.tag} onChange={(e) => setBulkTagForm({ ...bulkTagForm, tag: e.target.value })} />
                  <label className="flex items-center gap-1.5 text-xs text-gray-400">
                    <input type="checkbox" checked={bulkTagForm.remove} onChange={(e) => setBulkTagForm({ ...bulkTagForm, remove: e.target.checked })} />
                    Remove
                  </label>
                  <button className="btn-primary text-xs" disabled={busy} onClick={runBulkTag}>{bulkTagForm.remove ? "Remove tag" : "Apply tag"}</button>
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                  <input className="input flex-1 min-w-[120px] text-xs" placeholder="contact ids to delete" value={bulkDelIds} onChange={(e) => setBulkDelIds(e.target.value)} />
                  <button className="btn-danger text-xs" disabled={busy} onClick={runBulkDelete}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white flex items-center gap-2"><UserPlus className="w-4 h-4 text-n0va-400" /> Add contact</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Name</label>
                <input className="input" placeholder="Jordan Lee" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Email</label>
                <input className="input" placeholder="jordan@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Company</label>
                <input className="input" placeholder="Company Co" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Tags (comma separated)</label>
                <input className="input" placeholder="partner, vendor" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
              </div>
              <div className="flex justify-end pt-1">
                <button className="btn-primary text-sm" disabled={busy} onClick={createContact}>Save contact</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
