import { useEffect, useState, useCallback } from "react";
import {
  SendHorizonal, RefreshCw, Plus, X, Play, Pause, Trash2, MailOpen, CheckCircle2,
  Link2, UserMinus, Settings2, TrendingUp, CircleDashed,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const seqColor: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-400",
  active: "bg-emerald-500/15 text-emerald-400",
  paused: "bg-amber-500/15 text-amber-400",
  archived: "bg-gray-500/10 text-gray-400",
};

const catLabels: Record<string, string> = {
  newsletter: "Newsletters",
  promotions: "Promotions & offers",
  product_updates: "Product updates",
  security: "Security alerts",
  events: "Events & webinars",
  billing: "Billing & invoices",
};

const reasonLabels: Record<string, string> = {
  too_many: "Too many emails",
  not_relevant: "Content not relevant",
  never_signed_up: "I didn't sign up",
  other: "Other",
};

export default function MailSequences() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [sequences, setSequences] = useState<any[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, any>>({});
  const [mailboxes, setMailboxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showEnroll, setShowEnroll] = useState<any>(null);
  const [form, setForm] = useState<any>({ name: "", description: "", mailboxId: "", steps: [{ name: "", subject: "", body: "", delayHours: 24 }] });
  const [enrollEmails, setEnrollEmails] = useState("");

  const [unsubDash, setUnsubDash] = useState<any>(null);
  const [unsubLog, setUnsubLog] = useState<any[]>([]);
  const [unsubPrefs, setUnsubPrefs] = useState<any>(null);
  const [prefEmail, setPrefEmail] = useState("");
  const [linkEmail, setLinkEmail] = useState("");
  const [linkCat, setLinkCat] = useState("");

  const loadData = useCallback(async () => {
    const [d, s, mb, ud, ul] = await Promise.all([
      api.adsMarketingModule.mailSequencesDashboard().catch(() => null),
      api.adsMarketingModule.mailSequences().catch(() => null),
      api.adsMarketingModule.mailMailboxes().catch(() => null),
      api.adsMarketingModule.mailUnsubscribeDashboard().catch(() => null),
      api.adsMarketingModule.mailUnsubscribeLog().catch(() => null),
    ]);
    setDash(unwrap(d) || null);
    const sR = unwrap(s);
    setSequences(Array.isArray(sR) ? sR : sR?.data || []);
    const mbR = unwrap(mb);
    setMailboxes(Array.isArray(mbR) ? mbR : mbR?.data || []);
    setUnsubDash(unwrap(ud) || null);
    const ulR = unwrap(ul);
    setUnsubLog(ulR?.entries || []);
    const pm: Record<string, any> = {};
    await Promise.all((Array.isArray(sR) ? sR : sR?.data || []).map(async (seq: any) => {
      const p = await api.adsMarketingModule.mailSequenceProgress(seq._id).catch(() => null);
      const pR = unwrap(p);
      if (pR) pm[seq._id] = pR;
    }));
    setProgressMap(pm);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    const refresh = () => loadData();
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadData]);
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  async function act(key: string, fn: () => Promise<any>, success: string, errorTitle: string) {
    setBusy(key);
    try {
      const r = unwrap(await fn());
      addToast("success", success, r?.summary || "");
      await loadData();
    } catch (e: any) {
      addToast("error", errorTitle, e?.message);
    } finally {
      setBusy("");
    }
  }

  async function createSequence() {
    if (!form.name.trim() || !form.steps.length) {
      addToast("warning", "Missing fields", "Name and at least one step are required.");
      return;
    }
    setBusy("create");
    try {
      const r = unwrap(await api.adsMarketingModule.mailCreateSequence({ ...form, steps: form.steps.map((s: any) => ({ ...s, delayHours: Number(s.delayHours) || 0 })) }));
      addToast("success", "Sequence created", r?.summary || "");
      setShowCreate(false);
      setForm({ name: "", description: "", mailboxId: "", steps: [{ name: "", subject: "", body: "", delayHours: 24 }] });
      await loadData();
    } catch (e: any) {
      addToast("error", "Create failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function enroll() {
    if (!enrollEmails.trim()) {
      addToast("warning", "Emails required", "Enter one or more recipient addresses (comma separated).");
      return;
    }
    const emails = enrollEmails.split(",").map((e: string) => e.trim()).filter(Boolean);
    setBusy("enroll");
    try {
      const r = unwrap(await api.adsMarketingModule.mailEnrollMany(showEnroll._id, emails));
      addToast("success", "Enrolled", r?.summary || "");
      setShowEnroll(null);
      setEnrollEmails("");
      await loadData();
    } catch (e: any) {
      addToast("error", "Enroll failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function generateLink() {
    if (!linkEmail.trim()) {
      addToast("warning", "Email required", "Enter an address to generate a link for.");
      return;
    }
    setBusy("link");
    try {
      const r = unwrap(await api.adsMarketingModule.mailUnsubscribeLink(linkEmail, linkCat || undefined));
      addToast("success", "Link generated", r?.link || "");
      setLinkEmail("");
    } catch (e: any) {
      addToast("error", "Generate failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function loadPrefs(email: string) {
    if (!email.trim()) {
      addToast("warning", "Email required", "Enter an address to look up.");
      return;
    }
    setPrefEmail(email);
    setBusy("prefs");
    try {
      const r = unwrap(await api.adsMarketingModule.mailPreferences(email));
      setUnsubPrefs(r);
    } catch (e: any) {
      addToast("error", "Lookup failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function savePrefs() {
    if (!unsubPrefs) return;
    setBusy("saveprefs");
    try {
      const r = unwrap(await api.adsMarketingModule.mailUpdatePreferences(unsubPrefs.email, { categories: unsubPrefs.categories }));
      addToast("success", "Saved", r?.summary || "");
      setUnsubPrefs(r);
    } catch (e: any) {
      addToast("error", "Save failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  const stats = [
    { label: "Sequences", value: dash?.sequences ?? 0, icon: SendHorizonal },
    { label: "Active enrollments", value: dash?.activeEnrollments ?? 0, icon: CircleDashed },
    { label: "Messages sent", value: dash?.sentCount ?? 0, icon: MailOpen },
    { label: "Completion", value: `${dash?.completionRate ?? 0}%`, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><SendHorizonal className="w-5 h-5 text-n0va-300" /> Mail Sequences</h1>
          <p className="text-sm text-gray-500">Automated nurture drip campaigns plus the unsubscribe &amp; preferences center.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-400">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="accent-n0va-500" />
            Auto-refresh 30s
          </label>
          <button onClick={loadData} className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-700/60 text-gray-300" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white text-sm font-medium">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New sequence</span>
          </button>
        </div>
      </div>

      {loading ? (
        <SkeletonCard />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <s.icon className="w-4 h-4 text-gray-500" />
                </div>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3">
            {sequences.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-700 p-8 text-center text-gray-500 text-sm">
                No sequences yet — build a nurture drip and enroll contacts.
              </div>
            )}
            {sequences.map((seq: any) => {
              const prog = progressMap[seq._id] || {};
              return (
                <div key={seq._id} className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold truncate">{seq.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${seqColor[seq.status] || "bg-gray-500/10 text-gray-400"}`}>{seq.status}</span>
                        <span className="text-xs text-gray-500">{seq.sentCount ?? 0} sent · {seq.enrollments ?? 0} enrolled</span>
                      </div>
                      {seq.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{seq.description}</p>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => act(`adv-${seq._id}`, () => api.adsMarketingModule.mailAdvanceSequence(seq._id), "Advanced", "Advance failed")}
                        disabled={busy === `adv-${seq._id}`}
                        className="p-2 rounded-lg bg-n0va-500/20 hover:bg-n0va-500/30 text-n0va-300" title="Advance due steps now">
                        <Play className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setShowEnroll(seq); setEnrollEmails(""); }}
                        className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 text-gray-300" title="Enroll contacts">
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => act(`tg-${seq._id}`, () => api.adsMarketingModule.mailToggleSequence(seq._id), "Toggled", "Toggle failed")}
                        disabled={busy === `tg-${seq._id}`}
                        className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 text-gray-300" title={seq.status === "active" ? "Pause" : "Activate"}>
                        {seq.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => act(`del-${seq._id}`, () => api.adsMarketingModule.mailDeleteSequence(seq._id), "Deleted", "Delete failed")}
                        disabled={busy === `del-${seq._id}`}
                        className="p-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {seq.steps.map((s: any, i: number) => (
                      <div key={s.stepId} className="flex flex-wrap items-center gap-2 text-sm rounded-lg bg-gray-900/50 px-3 py-2">
                        <span className="text-xs font-mono text-gray-500">{i + 1}</span>
                        <span className="font-medium truncate">{s.name || s.subject || `Step ${i + 1}`}</span>
                        {s.delayHours > 0 && <span className="text-xs text-amber-400">+{s.delayHours}h</span>}
                        {s.subject && <span className="text-xs text-gray-500 truncate">{s.subject}</span>}
                        {prog.steps && (
                          <span className="text-[11px] text-gray-500 ml-auto">{prog.steps[i]?.reached ?? 0} reached</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {prog.total !== undefined && (
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span>{prog.total} enrollment(s)</span>
                      {Object.entries(prog.byStatus || {}).map(([k, v]) => (
                        <span key={k} className="px-1.5 py-0.5 rounded bg-gray-700/50">{k}: {String(v)}</span>
                      ))}
                      <span className="ml-auto text-n0va-300">{prog.completionRate ?? 0}% complete</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-gray-400" /> Pipeline</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              {Object.entries(dash?.byStatus || {}).map(([k, v]) => (
                <div key={k} className="rounded-lg bg-gray-900/50 px-3 py-2 flex items-center justify-between">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-bold">{String(v)}</span>
                </div>
              ))}
            </div>
            {dash?.topSequences?.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Top: {dash.topSequences.map((t: any) => `${t.name} (${t.enrollments})`).join(" · ")}
              </p>
            )}
          </div>

          <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2"><UserMinus className="w-4 h-4 text-gray-400" /> Unsubscribe &amp; preferences center</h3>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{unsubDash?.unsubscribed ?? 0} unsubscribed</span>
                <span>{unsubDash?.subscribed ?? 0} subscribed</span>
              </div>
            </div>
            <div className="grid lg:grid-cols-3 gap-4 min-w-0">
              <div className="rounded-lg bg-gray-900/50 p-3 min-w-0 space-y-2">
                <p className="text-xs font-medium text-gray-400 flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> Generate unsubscribe link</p>
                <div className="flex flex-wrap gap-2">
                  <input className="flex-1 min-w-28 rounded-lg bg-gray-800 border border-gray-700 px-2.5 py-1.5 text-xs" placeholder="email@example.com"
                    value={linkEmail} onChange={(e) => setLinkEmail(e.target.value)} />
                  <select className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-xs" value={linkCat} onChange={(e) => setLinkCat(e.target.value)}>
                    <option value="">All categories</option>
                    {Object.entries(catLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <button onClick={generateLink} disabled={busy === "link"} className="w-full py-1.5 rounded-lg bg-n0va-500/20 hover:bg-n0va-500/30 text-n0va-300 text-xs font-medium">
                  {busy === "link" ? "Generating…" : "Generate link"}
                </button>
                <p className="text-[11px] text-gray-600">n0va.io/unsubscribe/… links are appended to every campaign footer.</p>
              </div>
              <div className="rounded-lg bg-gray-900/50 p-3 min-w-0 space-y-2">
                <p className="text-xs font-medium text-gray-400 flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5" /> Preferences lookup</p>
                <div className="flex flex-wrap gap-2">
                  <input className="flex-1 min-w-28 rounded-lg bg-gray-800 border border-gray-700 px-2.5 py-1.5 text-xs" placeholder="email@example.com"
                    value={prefEmail} onChange={(e) => setPrefEmail(e.target.value)} />
                  <button onClick={() => loadPrefs(prefEmail)} disabled={busy === "prefs"}
                    className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-xs text-gray-200">
                    {busy === "prefs" ? "…" : "Load"}
                  </button>
                </div>
                {unsubPrefs && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-300 truncate">{unsubPrefs.email}</span>
                      <span className={`text-[11px] px-1.5 py-0.5 rounded ${unsubPrefs.unsubscribed ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                        {unsubPrefs.unsubscribed ? "unsubscribed" : "subscribed"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {Object.entries(unsubPrefs.categories || {}).map(([k, v]) => (
                        <label key={k} className="flex items-center gap-1.5 text-[11px] text-gray-400">
                          <input type="checkbox" checked={!!v} onChange={(e) => setUnsubPrefs({ ...unsubPrefs, categories: { ...unsubPrefs.categories, [k]: e.target.checked } })}
                            className="accent-n0va-500" />
                          <span className="truncate">{catLabels[k] || k}</span>
                        </label>
                      ))}
                    </div>
                    <button onClick={savePrefs} disabled={busy === "saveprefs"}
                      className="w-full py-1.5 rounded-lg bg-n0va-500/20 hover:bg-n0va-500/30 text-n0va-300 text-xs font-medium">
                      {busy === "saveprefs" ? "Saving…" : "Save preferences"}
                    </button>
                  </div>
                )}
              </div>
              <div className="rounded-lg bg-gray-900/50 p-3 min-w-0">
                <p className="text-xs font-medium text-gray-400 mb-2">Recent opt-outs ({unsubDash?.total ?? 0})</p>
                {unsubLog.length === 0 && <p className="text-xs text-gray-600">No opt-outs recorded.</p>}
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {unsubLog.map((u: any) => (
                    <div key={u.unsubscribeId} className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="text-gray-300 truncate">{u.email}</span>
                      <span className="text-gray-500">{reasonLabels[u.reason] || u.reason}</span>
                      <span className="text-gray-600 ml-auto">{u.source}</span>
                    </div>
                  ))}
                </div>
                {unsubDash?.byReason && Object.keys(unsubDash.byReason).length > 0 && (
                  <p className="text-[11px] text-gray-600 mt-2">
                    {Object.entries(unsubDash.byReason).map(([k, v]) => `${reasonLabels[k] || k}: ${v}`).join(" · ")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full sm:max-w-lg bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">New sequence</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <input className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm" placeholder="Sequence name (e.g. Trial onboarding)"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm" placeholder="Description (optional)"
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <select className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm" value={form.mailboxId}
                onChange={(e) => setForm({ ...form, mailboxId: e.target.value })}>
                <option value="">Default mailbox</option>
                {mailboxes.map((m: any) => <option key={m.mailboxId || m._id} value={m.mailboxId || m._id}>{m.name}</option>)}
              </select>
              <div className="space-y-2">
                {form.steps.map((s: any, i: number) => (
                  <div key={i} className="rounded-lg bg-gray-800/60 border border-gray-700 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Step {i + 1}</span>
                      <input type="number" min={0} className="w-24 rounded-lg bg-gray-900 border border-gray-700 px-2 py-1.5 text-xs" placeholder="delay h"
                        value={s.delayHours} onChange={(e) => setForm({ ...form, steps: form.steps.map((x: any, xi: number) => xi === i ? { ...x, delayHours: Number(e.target.value) } : x) })} />
                      {form.steps.length > 1 && (
                        <button onClick={() => setForm({ ...form, steps: form.steps.filter((_: any, xi: number) => xi !== i) })}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 ml-auto"><X className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                    <input className="w-full rounded-lg bg-gray-900 border border-gray-700 px-2 py-1.5 text-xs" placeholder="Subject"
                      value={s.subject} onChange={(e) => setForm({ ...form, steps: form.steps.map((x: any, xi: number) => xi === i ? { ...x, subject: e.target.value } : x) })} />
                    <textarea className="w-full rounded-lg bg-gray-900 border border-gray-700 px-2 py-1.5 text-xs" rows={2} placeholder="Body…"
                      value={s.body} onChange={(e) => setForm({ ...form, steps: form.steps.map((x: any, xi: number) => xi === i ? { ...x, body: e.target.value } : x) })} />
                  </div>
                ))}
              </div>
              <button onClick={() => setForm({ ...form, steps: [...form.steps, { name: "", subject: "", body: "", delayHours: 24 }] })}
                className="text-xs text-n0va-300 hover:text-n0va-200">+ Add step</button>
              <button onClick={createSequence} disabled={busy === "create"}
                className="w-full py-2.5 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white font-medium">
                {busy === "create" ? "Creating…" : "Create sequence"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEnroll && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowEnroll(null)}>
          <div className="w-full sm:max-w-md bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold">Enroll in "{showEnroll.name}"</h2>
              <button onClick={() => setShowEnroll(null)} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400"><X className="w-4 h-4" /></button>
            </div>
            <textarea className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm" rows={3}
              placeholder="Recipients, comma separated (e.g. a@x.com, b@y.com)" value={enrollEmails} onChange={(e) => setEnrollEmails(e.target.value)} />
            <button onClick={enroll} disabled={busy === "enroll"}
              className="mt-4 w-full py-2.5 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white font-medium">
              {busy === "enroll" ? "Enrolling…" : "Enroll"}
            </button>
          </div>
        </div>
      )}

      <p className="text-[11px] text-gray-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Sequences respect suppression lists — opted-out addresses never receive steps.</p>
    </div>
  );
}
