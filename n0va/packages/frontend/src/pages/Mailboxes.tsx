import { useEffect, useState, useCallback } from "react";
import {
  Mailbox, RefreshCw, AlertTriangle, Plus, X, Database, Users, Tag, ShieldCheck,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const TYPE_BADGE: Record<string, string> = {
  personal: "bg-gray-500/10 text-gray-400",
  work: "bg-n0va-600/20 text-n0va-400",
  team: "bg-sky-500/10 text-sky-400",
  shared: "bg-amber-500/10 text-amber-400",
  alias: "bg-purple-500/10 text-purple-400",
  neural: "bg-emerald-500/10 text-emerald-400",
  archive: "bg-gray-500/10 text-gray-400",
  auto: "bg-cyan-500/10 text-cyan-400",
};

const PLAN_BADGE: Record<string, string> = {
  free: "bg-gray-700 text-gray-300",
  pro: "bg-n0va-600/20 text-n0va-400",
  business: "bg-amber-500/10 text-amber-400",
  n0va1o: "bg-emerald-500/10 text-emerald-400",
};

function fmtBytes(n: number | undefined): string {
  const v = n || 0;
  if (v >= 1073741824) return `${(v / 1073741824).toFixed(1)} GB`;
  if (v >= 1048576) return `${(v / 1048576).toFixed(1)} MB`;
  if (v >= 1024) return `${(v / 1024).toFixed(0)} KB`;
  return `${v} B`;
}

function quotaColor(p: number): string {
  if (p >= 90) return "bg-red-500";
  if (p >= 75) return "bg-amber-400";
  return "bg-n0va-500";
}

export default function Mailboxes() {
  const { addToast } = useToast();
  const [mailboxes, setMailboxes] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", type: "work", plan: "pro", displayName: "" });

  const loadData = useCallback(async () => {
    setLoading(true);
    const [mb, an] = await Promise.all([
      api.adsMarketingModule.mailMailboxes().catch(() => null),
      api.adsMarketingModule.mailStorageAnalytics().catch(() => null),
    ]);
    setMailboxes(Array.isArray(mb) ? mb : mb?.data || []);
    setAnalytics(unwrap(an));
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    function refresh() { loadData(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadData]);

  async function createMailbox() {
    if (!form.name.trim() || !form.email.trim()) {
      addToast("warning", "Missing fields", "Name and email are required.");
      return;
    }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailCreateMailbox({
        name: form.name, email: form.email, type: form.type, plan: form.plan,
        displayName: form.displayName || form.name,
      }));
      addToast("success", "Mailbox created", r?.summary || "");
      setCreating(false);
      setForm({ name: "", email: "", type: "work", plan: "pro", displayName: "" });
      await loadData();
    } catch (e: any) {
      addToast("error", "Create failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(mb: any) {
    setBusy(true);
    try {
      const next = mb.status === "active" ? "disabled" : "active";
      const r = unwrap(await api.adsMarketingModule.mailUpdateMailbox(mb.mailboxId, { status: next }));
      addToast("success", next === "active" ? "Mailbox enabled" : "Mailbox disabled", r?.summary || "");
      await loadData();
    } catch (e: any) {
      addToast("error", "Update failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  const t = analytics?.totals;
  const alerts = (analytics?.mailboxes || []).flatMap((q: any) => q.alerts || []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">Mailboxes</h1><p className="text-gray-500 mt-1">Quota, storage, and mailbox management</p></div>
          <div className="animate-spin w-5 h-5 border-2 border-n0va-500 border-t-transparent rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Mailbox className="w-6 h-6 text-n0va-400" /> Mailboxes</h1>
          <p className="text-gray-500 mt-1 text-sm">Quota, storage, and mailbox management</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary p-2" onClick={loadData} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary flex items-center gap-2" onClick={() => setCreating(true)}><Plus className="w-4 h-4" /> <span className="hidden sm:inline">New mailbox</span></button>
        </div>
      </div>

      {!mailboxes.length && (
        <div className="card border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-sm text-red-300 font-medium">Mailbox data unavailable</p>
              <p className="text-xs text-red-400/70">Check that the backend is running.</p>
            </div>
            <button className="btn-secondary text-xs ml-auto" onClick={loadData}>Retry</button>
          </div>
        </div>
      )}

      {t && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center gap-2 mb-2"><Mailbox className="w-4 h-4 text-n0va-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Mailboxes</span></div>
            <p className="text-3xl font-bold text-white">{t.mailboxes}</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-2"><Database className="w-4 h-4 text-n0va-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Storage used</span></div>
            <p className="text-3xl font-bold text-white">{fmtBytes(t.usedBytes)}</p>
            <p className="text-xs text-gray-500 mt-1">of {fmtBytes(t.quotaBytes)} quota</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-n0va-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Messages</span></div>
            <p className="text-3xl font-bold text-white">{t.messages}</p>
            <p className="text-xs text-gray-500 mt-1">+{fmtBytes(t.attachmentBytes)} attachments</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-2"><ShieldCheck className={`w-4 h-4 ${t.critical > 0 ? "text-red-400" : "text-emerald-400"}`} /><span className="text-xs text-gray-500 uppercase tracking-wider">Critical quotas</span></div>
            <p className="text-3xl font-bold text-white">{t.critical}</p>
            <p className="text-xs text-gray-500 mt-1">{alerts.length} total alerts</p>
          </div>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="card border-amber-500/30 bg-amber-500/5">
          <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2">Quota alerts</p>
          <ul className="space-y-1">
            {alerts.slice(0, 5).map((a: string, i: number) => (
              <li key={i} className="text-xs text-amber-200/80 flex items-center gap-2"><AlertTriangle className="w-3 h-3 shrink-0" />{a}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card !p-2">
        <div className="px-3 py-2 border-b border-gray-800/60">
          <span className="text-sm font-semibold text-white">All mailboxes</span>
        </div>
        <ul className="divide-y divide-gray-800/50">
          {(mailboxes.length ? mailboxes : []).map((mb: any) => (
            <li key={mb.mailboxId} className="px-3 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white">{mb.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${TYPE_BADGE[mb.type] || TYPE_BADGE.personal}`}>{mb.type}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${PLAN_BADGE[mb.plan] || PLAN_BADGE.free}`}>{mb.plan}</span>
                  {mb.status !== "active" && <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold bg-red-500/10 text-red-400">disabled</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{mb.email || mb.domain} {mb.aliases?.length ? `· ${mb.aliases.join(", ")}` : ""}</p>
                <p className="text-xs text-gray-600 mt-0.5">{mb.messageCount} messages · {mb.unreadCount} unread</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-1.5 bg-gray-800 rounded-full flex-1 max-w-xs">
                    <div className={`h-1.5 rounded-full ${quotaColor(mb.percentUsed)}`} style={{ width: `${Math.min(mb.percentUsed, 100)}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-500">{mb.percentUsed}%</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-400">{fmtBytes(mb.usedBytes)} / {fmtBytes(mb.quotaBytes)}</p>
                <button className="btn-secondary text-xs px-2 py-1 mt-1" disabled={busy} onClick={() => toggleStatus(mb)}>
                  {mb.status === "active" ? "Disable" : "Enable"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {analytics && (analytics.topSenders?.length > 0 || analytics.byCategory?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card">
            <div className="flex items-center gap-2 mb-3"><Users className="w-4 h-4 text-n0va-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Top senders</span></div>
            <ul className="space-y-2">
              {(analytics.topSenders || []).slice(0, 6).map((s: any, i: number) => (
                <li key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-gray-300 truncate">{s.email}</span>
                  <span className="text-xs text-gray-500 shrink-0">{s.count} msgs</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-3"><Tag className="w-4 h-4 text-n0va-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">By category</span></div>
            <ul className="space-y-2">
              {(analytics.byCategory || []).slice(0, 6).map((c: any, i: number) => (
                <li key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-gray-300 capitalize truncate">{c.category}</span>
                  <span className="text-xs text-gray-500 shrink-0">{c.count} msgs</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white flex items-center gap-2"><Plus className="w-4 h-4 text-n0va-400" /> New mailbox</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setCreating(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Name</label>
                <input className="input" placeholder="Team Sales" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Display name</label>
                <input className="input" placeholder="Optional" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Email address</label>
                <input className="input" placeholder="sales@n0va.ai" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Type</label>
                  <select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="personal">personal</option>
                    <option value="work">work</option>
                    <option value="team">team</option>
                    <option value="shared">shared</option>
                    <option value="alias">alias</option>
                    <option value="neural">neural</option>
                    <option value="archive">archive</option>
                    <option value="auto">auto</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Plan</label>
                  <select className="select" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
                    <option value="free">free</option>
                    <option value="pro">pro</option>
                    <option value="business">business</option>
                    <option value="n0va1o">n0va1o</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button className="btn-primary text-sm" disabled={busy} onClick={createMailbox}>Create mailbox</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
