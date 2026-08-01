import { useEffect, useState, useCallback } from "react";
import {
  FileText, RefreshCw, Plus, X, Send, Users, Pencil, Trash2, Zap, AlertCircle, Clock,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const emptyForm = { name: "", category: "general", subject: "", body: "" };

export default function MailTemplates() {
  const { addToast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [mailboxes, setMailboxes] = useState<any[]>([]);
  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [sendFor, setSendFor] = useState<any>(null);
  const [sendForm, setSendForm] = useState({ mailboxId: "", to: "", vars: "" });
  const [bulkFor, setBulkFor] = useState<any>(null);
  const [bulkForm, setBulkForm] = useState({ mailboxId: "", recipients: "", vars: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(async () => {
    const [s, mb] = await Promise.all([
      api.adsMarketingModule.mailTemplateStats().catch(() => null),
      api.adsMarketingModule.mailMailboxes().catch(() => null),
    ]);
    setStats(unwrap(s));
    const mbs = unwrap(mb);
    setMailboxes(Array.isArray(mbs) ? mbs : mbs?.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    function refresh() { loadAll(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadAll]);

  async function saveTemplate() {
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) {
      addToast("warning", "Missing fields", "Name, subject and body are required.");
      return;
    }
    setBusy(true);
    try {
      const r = editId
        ? unwrap(await api.adsMarketingModule.mailUpdateTemplate(editId, form))
        : unwrap(await api.adsMarketingModule.mailCreateTemplate(form));
      addToast("success", editId ? "Template updated" : "Template created", r?.summary || "");
      setShowEdit(false);
      setForm(emptyForm);
      setEditId(null);
      await loadAll();
    } catch (e: any) {
      addToast("error", "Save failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteTemplate(id: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailDeleteTemplate(id));
      addToast("success", "Template deleted", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Delete failed", e?.message);
    }
  }

  function parseVars(vars: string): Record<string, string> {
    const out: Record<string, string> = {};
    for (const line of vars.split(/[,\n]/)) {
      const eq = line.indexOf("=");
      if (eq > 0) out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
    }
    return out;
  }

  async function sendOne() {
    if (!sendForm.mailboxId || !sendForm.to.trim()) {
      addToast("warning", "Missing fields", "Pick a mailbox and recipient.");
      return;
    }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailSendFromTemplate(sendForm.mailboxId, {
        templateId: sendFor.templateId,
        to: sendForm.to.trim(),
        variables: parseVars(sendForm.vars),
      }));
      addToast("success", "Sent", r?.summary || "");
      setSendFor(null);
      await loadAll();
    } catch (e: any) {
      addToast("error", "Send failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendBulk() {
    const recipients = bulkForm.recipients.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
    if (!bulkForm.mailboxId || recipients.length === 0) {
      addToast("warning", "Missing fields", "Pick a mailbox and at least one recipient.");
      return;
    }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailSendBulkTemplate(bulkForm.mailboxId, {
        templateId: bulkFor.templateId,
        recipients,
        defaults: parseVars(bulkForm.vars),
      }));
      addToast("success", "Bulk send done", r?.summary || "");
      setBulkFor(null);
      await loadAll();
    } catch (e: any) {
      addToast("error", "Bulk send failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  const templates = stats?.templates || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><FileText className="w-6 h-6 text-n0va-400" /> Email templates</h1>
          <p className="text-gray-500 mt-1 text-sm">{stats?.summary || "Reusable messages with variables and bulk send"}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn-secondary p-2" onClick={loadAll} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary flex items-center gap-2" onClick={() => { setEditId(null); setForm(emptyForm); setShowEdit(true); }}>
            <Plus className="w-4 h-4" /> New template
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{stats?.totals?.templates || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Templates</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{stats?.totals?.sends || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Total sends</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{stats?.categorySends?.length || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Categories in use</p>
            </div>
          </div>

          {stats?.categorySends?.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-white mb-2">Sends by category</h3>
              <div className="flex flex-wrap gap-2">
                {stats.categorySends.map((c: any) => (
                  <span key={c.category} className="text-xs px-2.5 py-1 rounded-full bg-n0va-500/15 text-n0va-300">
                    {c.category} · {c.count}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {templates.map((t: any) => (
              <div key={t.templateId} className="card p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-white truncate">{t.name}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded uppercase font-bold bg-gray-500/10 text-gray-400 shrink-0">{t.category}</span>
                </div>
                <p className="text-sm text-gray-400 truncate">{t.subject}</p>
                <p className="text-xs text-gray-600 line-clamp-2">{t.description || t.body?.slice(0, 120)}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-gray-500">{t.sentCount} send(s)</span>
                  {t.variables.map((v: string) => (
                    <code key={v} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-n0va-300">{"{{"}{v}{"}}"}</code>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => { setSendFor(t); setSendForm({ mailboxId: mailboxes[0]?.mailboxId || "", to: "", vars: "" }); }}>
                    <Send className="w-3 h-3" /> Send
                  </button>
                  <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => { setBulkFor(t); setBulkForm({ mailboxId: mailboxes[0]?.mailboxId || "", recipients: "", vars: "" }); }}>
                    <Users className="w-3 h-3" /> Bulk
                  </button>
                  <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => { setEditId(t.templateId); setForm({ name: t.name, category: t.category, subject: t.subject, body: t.body || "" }); setShowEdit(true); }}>
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button className="text-gray-500 hover:text-red-400 p-1 ml-auto" onClick={() => deleteTemplate(t.templateId)} title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
            {templates.length === 0 && (
              <div className="card p-6 lg:col-span-2 text-center text-sm text-gray-500">
                <Zap className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                No templates yet — create one to send from saved messages.
              </div>
            )}
          </div>

          {stats?.recentUsage?.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><Clock className="w-4 h-4 text-n0va-400" /> Recent sends</h3>
              <ul className="divide-y divide-gray-800/50">
                {stats.recentUsage.map((u: any, i: number) => (
                  <li key={i} className="flex items-center gap-2 py-2 text-xs">
                    <span className="text-gray-300 truncate">{u.templateName}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${u.kind === "bulk" ? "bg-amber-500/15 text-amber-400" : "bg-gray-500/10 text-gray-400"}`}>{u.kind}</span>
                    <span className="truncate text-gray-500">{u.recipient}</span>
                    <span className="text-[10px] text-gray-600 ml-auto shrink-0">{new Date(u.sentAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {showEdit && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-gray-900">
              <h2 className="font-semibold text-white">{editId ? "Edit template" : "New template"}</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setShowEdit(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Name</label>
                <input className="input" placeholder="Welcome email" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Category</label>
                <select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {["general", "onboarding", "sales", "invoice", "newsletter", "follow_up", "internal"].map(c => (
                    <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Subject <span className="text-gray-600">(use {"{{variable}}"})</span></label>
                <input className="input" placeholder="Welcome {{name}} to {{company}}" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Body</label>
                <textarea className="input min-h-[160px]" placeholder={"Hi {{name}},\n\nBody text with {{variables}}..."} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
              </div>
              <p className="text-[10px] text-gray-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Variables are extracted automatically from {"{{braces}}"}.</p>
              <div className="flex justify-end gap-2 pt-1">
                <button className="btn-secondary text-sm" onClick={() => setShowEdit(false)}>Cancel</button>
                <button className="btn-primary text-sm" disabled={busy} onClick={saveTemplate}>Save template</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {sendFor && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white flex items-center gap-2"><Send className="w-4 h-4 text-n0va-400" /> Send "{sendFor.name}"</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setSendFor(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">From mailbox</label>
                <select className="select" value={sendForm.mailboxId} onChange={(e) => setSendForm({ ...sendForm, mailboxId: e.target.value })}>
                  {mailboxes.map((mb: any) => <option key={mb.mailboxId} value={mb.mailboxId}>{mb.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">To</label>
                <input className="input" placeholder="recipient@company.com" value={sendForm.to} onChange={(e) => setSendForm({ ...sendForm, to: e.target.value })} />
              </div>
              {sendFor.variables?.length > 0 && (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Variables <span className="text-gray-600">(name=value, one per line)</span></label>
                  <textarea className="input min-h-[72px]" placeholder={sendFor.variables.map((v: string) => `${v}=`).join("\n")} value={sendForm.vars} onChange={(e) => setSendForm({ ...sendForm, vars: e.target.value })} />
                </div>
              )}
              <div className="flex justify-end pt-1">
                <button className="btn-primary text-sm flex items-center gap-2" disabled={busy} onClick={sendOne}><Send className="w-4 h-4" /> Send</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {bulkFor && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white flex items-center gap-2"><Users className="w-4 h-4 text-n0va-400" /> Bulk send "{bulkFor.name}"</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setBulkFor(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">From mailbox</label>
                <select className="select" value={bulkForm.mailboxId} onChange={(e) => setBulkForm({ ...bulkForm, mailboxId: e.target.value })}>
                  {mailboxes.map((mb: any) => <option key={mb.mailboxId} value={mb.mailboxId}>{mb.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Recipients <span className="text-gray-600">(comma or line separated)</span></label>
                <textarea className="input min-h-[80px]" placeholder="alice@partner.com, bob@partner.com" value={bulkForm.recipients} onChange={(e) => setBulkForm({ ...bulkForm, recipients: e.target.value })} />
              </div>
              {bulkFor.variables?.length > 0 && (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Default variables <span className="text-gray-600">(applied to all)</span></label>
                  <textarea className="input min-h-[64px]" placeholder={bulkFor.variables.map((v: string) => `${v}=`).join("\n")} value={bulkForm.vars} onChange={(e) => setBulkForm({ ...bulkForm, vars: e.target.value })} />
                </div>
              )}
              <div className="flex justify-end pt-1">
                <button className="btn-primary text-sm flex items-center gap-2" disabled={busy} onClick={sendBulk}><Users className="w-4 h-4" /> Send to all</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
