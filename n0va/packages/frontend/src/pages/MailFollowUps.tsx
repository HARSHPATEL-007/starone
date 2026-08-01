import { useEffect, useState, useCallback } from "react";
import { AlarmClock, RefreshCw, BellRing, Sparkles, CheckCircle2, Trash2, Plus, Moon, Clock } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

export default function MailFollowUps() {
  const { addToast } = useToast();
  const [summary, setSummary] = useState<any>(null);
  const [snoozed, setSnoozed] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [inbox, setInbox] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ messageId: "", at: "", note: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(async () => {
    const [s, sn, fu, sg, msgs] = await Promise.all([
      api.adsMarketingModule.mailFollowUpSummary().catch(() => null),
      api.adsMarketingModule.mailListSnoozed().catch(() => null),
      api.adsMarketingModule.mailFollowUps().catch(() => null),
      api.adsMarketingModule.mailFollowUpSuggestions().catch(() => null),
      api.adsMarketingModule.mailMessages({ folder: "inbox", limit: 20 }).catch(() => null),
    ]);
    setSummary(unwrap(s));
    const snl = unwrap(sn);
    setSnoozed(snl?.snoozed || []);
    const ful = unwrap(fu);
    setFollowUps(ful?.followUps || []);
    const sgl = unwrap(sg);
    setSuggestions(Array.isArray(sgl) ? sgl : sgl?.data || []);
    const ms = unwrap(msgs);
    setInbox(ms?.messages || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    function refresh() { loadAll(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadAll]);

  async function unsnooze(id: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailUnsnooze(id));
      addToast("success", "Unsnoozed", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Failed", e?.message);
    }
  }

  async function complete(fu: any) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailCompleteFollowUp(fu.followUpId));
      addToast("success", "Done", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Failed", e?.message);
    }
  }

  async function remove(fu: any) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailDeleteFollowUp(fu.followUpId));
      addToast("success", "Deleted", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Failed", e?.message);
    }
  }

  async function createFollowUp() {
    if (!createForm.messageId || !createForm.at) {
      addToast("warning", "Missing fields", "Pick a message and a date.");
      return;
    }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailCreateFollowUp(createForm.messageId, {
        at: new Date(createForm.at).toISOString(),
        note: createForm.note,
      }));
      addToast("success", "Follow-up set", r?.summary || "");
      setShowCreate(false);
      await loadAll();
    } catch (e: any) {
      addToast("error", "Failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  const open = followUps.filter((f: any) => f.status === "open");
  const done = followUps.filter((f: any) => f.status === "done");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><AlarmClock className="w-6 h-6 text-n0va-400" /> Follow-ups & snooze</h1>
          <p className="text-gray-500 mt-1 text-sm">{summary?.summary || "Never lose a thread again"}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn-secondary p-2" onClick={loadAll} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> New follow-up
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{summary?.openFollowUps || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Open follow-ups</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-amber-400">{summary?.overdue || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Overdue</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{summary?.snoozedCount || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Snoozed</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{summary?.awaitingCount || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Awaiting reply</p>
            </div>
          </div>

          {suggestions.length > 0 && (
            <div className="card p-4 space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-n0va-400" /> Smart suggestions</h3>
              <ul className="divide-y divide-gray-800/50">
                {suggestions.map((s: any) => (
                  <li key={s.messageId} className="flex items-center gap-3 py-2 flex-wrap">
                    <span className="flex-1 min-w-0">
                      <span className="text-sm text-gray-300 truncate block">{s.subject}</span>
                      <span className="text-[10px] text-gray-500">{s.from?.email} · {s.ageHours}h unanswered · {s.reason}</span>
                    </span>
                    <button className="btn-secondary text-xs" onClick={() => { setCreateForm({ messageId: s.messageId, at: "", note: s.reason }); setShowCreate(true); }}>
                      Follow up
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4 space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><BellRing className="w-4 h-4 text-n0va-400" /> Follow-ups</h3>
              <ul className="divide-y divide-gray-800/50">
                {open.map((f: any) => (
                  <li key={f.followUpId} className="flex items-center gap-2 py-2 text-sm flex-wrap">
                    <Clock className={`w-3.5 h-3.5 shrink-0 ${f.overdue ? "text-red-400" : "text-gray-500"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="truncate block text-gray-300">{f.subject}</span>
                      <span className="text-[10px] text-gray-500">{f.note || f.from || ""}</span>
                    </span>
                    <span className={`text-[10px] shrink-0 ${f.overdue ? "text-red-400" : "text-gray-500"}`}>
                      {new Date(f.at).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                    <button className="btn-secondary text-[10px] px-2 py-1 shrink-0" onClick={() => complete(f)}>Done</button>
                    <button className="text-gray-500 hover:text-red-400 shrink-0" onClick={() => remove(f)}><Trash2 className="w-3 h-3" /></button>
                  </li>
                ))}
                {open.length === 0 && <li className="text-xs text-gray-500 py-1">No open follow-ups</li>}
              </ul>
              {done.length > 0 && (
                <div className="border-t border-gray-800 pt-2">
                  <h4 className="text-[10px] uppercase tracking-wide text-gray-600 mb-1">Completed</h4>
                  <ul className="space-y-1">
                    {done.slice(0, 3).map((f: any) => (
                      <li key={f.followUpId} className="flex items-center gap-2 text-xs text-gray-500">
                        <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                        <span className="truncate line-through">{f.subject}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="card p-4 space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Moon className="w-4 h-4 text-n0va-400" /> Snoozed</h3>
              <ul className="divide-y divide-gray-800/50">
                {snoozed.map((m: any) => (
                  <li key={m._id} className="flex items-center gap-2 py-2 text-sm flex-wrap">
                    <span className="min-w-0 flex-1">
                      <span className="truncate block text-gray-300">{m.subject}</span>
                      <span className="text-[10px] text-gray-500">{m.from?.email}</span>
                    </span>
                    <span className={`text-[10px] shrink-0 ${m.snoozedOverdue ? "text-red-400" : "text-gray-500"}`}>
                      until {new Date(m.snoozedUntil).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                    <button className="btn-secondary text-[10px] px-2 py-1 shrink-0" onClick={() => unsnooze(m._id)}>Unsnooze</button>
                  </li>
                ))}
                {snoozed.length === 0 && <li className="text-xs text-gray-500 py-1">Nothing snoozed</li>}
              </ul>
            </div>
          </div>
        </>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white flex items-center gap-2"><BellRing className="w-4 h-4 text-n0va-400" /> Set a follow-up</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setShowCreate(false)}>Close</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Message</label>
                <select className="select" value={createForm.messageId} onChange={(e) => setCreateForm({ ...createForm, messageId: e.target.value })}>
                  <option value="">Select a message…</option>
                  {inbox.map((m: any) => <option key={m._id} value={m._id}>{m.subject}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Follow-up date</label>
                <input type="datetime-local" className="input" value={createForm.at} onChange={(e) => setCreateForm({ ...createForm, at: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Note (optional)</label>
                <input className="input" placeholder="Chase the invoice…" value={createForm.note} onChange={(e) => setCreateForm({ ...createForm, note: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button className="btn-secondary text-sm" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="btn-primary text-sm" disabled={busy} onClick={createFollowUp}>Set follow-up</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
