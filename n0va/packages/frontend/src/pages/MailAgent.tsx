import { useEffect, useState, useCallback } from "react";
import {
  Bot, RefreshCw, CalendarClock, CheckSquare, Play, RotateCcw, X, Mail, Clock, ListChecks, MessageSquareText,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

export default function MailAgent() {
  const { addToast } = useToast();
  const [status, setStatus] = useState<any>(null);
  const [mailboxes, setMailboxes] = useState<any[]>([]);
  const [log, setLog] = useState<any[]>([]);
  const [inbox, setInbox] = useState<any[]>([]);
  const [oooText, setOooText] = useState("");
  const [schedForm, setSchedForm] = useState({ mailboxId: "", to: "", subject: "", sendAt: "" });
  const [showSched, setShowSched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(async () => {
    const [s, mb, l] = await Promise.all([
      api.adsMarketingModule.mailAgentStatus().catch(() => null),
      api.adsMarketingModule.mailMailboxes().catch(() => null),
      api.adsMarketingModule.mailAgentLog(15).catch(() => null),
    ]);
    setStatus(unwrap(s));
    const mbs = unwrap(mb);
    setMailboxes(Array.isArray(mbs) ? mbs : mbs?.data || []);
    setLog(unwrap(l)?.log || []);
    const msgs = unwrap(await api.adsMarketingModule.mailMessages({ folder: "inbox", limit: 10 }).catch(() => null));
    setInbox(msgs?.messages || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    function refresh() { loadAll(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadAll]);

  async function toggleOoo(mb: any, enabled: boolean) {
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailSetOutOfOffice(mb.mailboxId, {
        enabled,
        message: enabled ? (oooText.trim() || "I'm currently out of the office and will reply when I return.") : undefined,
      }));
      addToast("success", enabled ? "Out of office on" : "Out of office off", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function runCycle() {
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailRunAgentCycle());
      addToast("success", "Agent cycle complete", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Cycle failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function createSchedule() {
    if (!schedForm.to.trim() || !schedForm.subject.trim() || !schedForm.sendAt) {
      addToast("warning", "Missing fields", "Recipient, subject and send time are required.");
      return;
    }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailScheduleSend(schedForm.mailboxId, {
        to: schedForm.to.trim(), subject: schedForm.subject.trim(), body: "", sendAt: new Date(schedForm.sendAt).toISOString(),
      }));
      addToast("success", "Scheduled", r?.summary || "");
      setShowSched(false);
      setSchedForm({ mailboxId: schedForm.mailboxId, to: "", subject: "", sendAt: "" });
      await loadAll();
    } catch (e: any) {
      addToast("error", "Schedule failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function cancelSchedule(id: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailCancelSchedule(id));
      addToast("success", "Cancelled", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Cancel failed", e?.message);
    }
  }

  async function extractTasks(messageId: string) {
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailExtractTasks(messageId));
      addToast("success", "Tasks extracted", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Extract failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function completeTask(id: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailCompleteTask(id));
      addToast("success", "Task done", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Failed", e?.message);
    }
  }

  const ooo = status?.ooo || [];
  const scheduled = status?.scheduled || [];
  const tasks = status?.tasks || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Bot className="w-6 h-6 text-n0va-400" /> N0VA1O Agent</h1>
          <p className="text-gray-500 mt-1 text-sm">{status?.summary || "Your autonomous mail assistant"}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn-secondary p-2" onClick={loadAll} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary flex items-center gap-2" disabled={busy} onClick={runCycle}>
            <Play className="w-4 h-4" /> Run cycle
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{status?.activeOutOfOffice || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Out of office</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{status?.pendingSchedules || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Scheduled sends</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{status?.openTasks || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Open tasks</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><MessageSquareText className="w-4 h-4 text-n0va-400" /> Out of office auto-replies</h3>
              </div>
              <p className="text-xs text-gray-500">Auto-reply message (optional)</p>
              <textarea
                className="input min-h-[64px]"
                placeholder="I'm currently out of the office and will reply when I return."
                value={oooText}
                onChange={(e) => setOooText(e.target.value)}
              />
              <ul className="space-y-2">
                {ooo.map((o: any) => (
                  <li key={o.mailboxId} className="flex items-center gap-2 text-sm">
                    <span className="truncate text-gray-300">{o.mailboxName}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${o.active ? "bg-green-500/15 text-green-400" : o.enabled ? "bg-amber-500/15 text-amber-400" : "bg-gray-500/10 text-gray-400"}`}>
                      {o.active ? "Active" : o.enabled ? "Configured" : "Off"}
                    </span>
                    <span className="text-[10px] text-gray-500">{o.autoRepliesSent} sent</span>
                    <button className="btn-secondary text-xs px-2 py-1 ml-auto" disabled={busy} onClick={() => toggleOoo(o, !o.enabled)}>
                      {o.enabled ? "Disable" : "Enable"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><CalendarClock className="w-4 h-4 text-n0va-400" /> Scheduled emails</h3>
                <button className="btn-secondary text-xs" onClick={() => setShowSched(true)}>Schedule send</button>
              </div>
              <ul className="space-y-2">
                {scheduled.filter((s: any) => s.status === "scheduled").map((s: any) => (
                  <li key={s._id} className="flex items-center gap-2 text-sm">
                    <Clock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <span className="truncate text-gray-300">{s.subject}</span>
                    <span className="text-[10px] text-gray-500 shrink-0">{new Date(s.sendAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    <button className="text-gray-500 hover:text-red-400 shrink-0" onClick={() => cancelSchedule(s._id)} title="Cancel"><X className="w-3.5 h-3.5" /></button>
                  </li>
                ))}
                {scheduled.filter((s: any) => s.status === "scheduled").length === 0 && (
                  <li className="text-xs text-gray-500">Nothing scheduled</li>
                )}
              </ul>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 pt-2 border-t border-gray-800"><ListChecks className="w-4 h-4 text-n0va-400" /> Tasks from mail</h3>
              <ul className="space-y-2">
                {tasks.filter((t: any) => t.status === "open").slice(0, 6).map((t: any) => (
                  <li key={t._id} className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-n0va-500 shrink-0" />
                    <span className="truncate text-gray-300">{t.title}</span>
                    <button className="btn-secondary text-[10px] px-2 py-0.5 ml-auto shrink-0" onClick={() => completeTask(t._id)}>Done</button>
                  </li>
                ))}
                {tasks.filter((t: any) => t.status === "open").length === 0 && (
                  <li className="text-xs text-gray-500">No open tasks</li>
                )}
              </ul>
            </div>

            <div className="card p-4 lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><CheckSquare className="w-4 h-4 text-n0va-400" /> Extract tasks from a message</h3>
              </div>
              <ul className="divide-y divide-gray-800/50 max-h-[280px] overflow-y-auto">
                {inbox.slice(0, 8).map((m: any) => (
                  <li key={m._id} className="flex items-center gap-3 py-2">
                    <span className="flex-1 min-w-0">
                      <span className="text-sm text-gray-300 truncate block">{m.subject}</span>
                      <span className="text-[10px] text-gray-500">{m.from?.email}</span>
                    </span>
                    <button className="btn-secondary text-xs" disabled={busy} onClick={() => extractTasks(m._id)}>Extract</button>
                  </li>
                ))}
                {inbox.length === 0 && <li className="py-4 text-center text-xs text-gray-500">No inbox messages</li>}
              </ul>
            </div>

            <div className="card p-4 lg:col-span-2">
              <h3 className="text-sm font-semibold text-white mb-3">Agent activity</h3>
              <ul className="space-y-2">
                {log.map((l: any, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    <RotateCcw className="w-3 h-3 text-gray-500 shrink-0" />
                    <span className="capitalize text-gray-300 shrink-0">{l.action?.replace(/_/g, " ")}</span>
                    <span className="truncate text-gray-500">{l.detail}</span>
                    <span className="text-[10px] text-gray-600 shrink-0 ml-auto">{new Date(l.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </li>
                ))}
                {log.length === 0 && <li className="text-xs text-gray-500">No agent activity yet — run a cycle to see it work</li>}
              </ul>
            </div>
          </div>
        </>
      )}

      {showSched && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white flex items-center gap-2"><CalendarClock className="w-4 h-4 text-n0va-400" /> Schedule an email</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setShowSched(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">From mailbox</label>
                <select className="select" value={schedForm.mailboxId} onChange={(e) => setSchedForm({ ...schedForm, mailboxId: e.target.value })}>
                  {(mailboxes.length ? mailboxes : []).map((mb: any) => (
                    <option key={mb.mailboxId} value={mb.mailboxId}>{mb.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">To</label>
                <input className="input" placeholder="recipient@company.com" value={schedForm.to} onChange={(e) => setSchedForm({ ...schedForm, to: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Subject</label>
                <input className="input" placeholder="Subject" value={schedForm.subject} onChange={(e) => setSchedForm({ ...schedForm, subject: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Send at</label>
                <input type="datetime-local" className="input" value={schedForm.sendAt} onChange={(e) => setSchedForm({ ...schedForm, sendAt: e.target.value })} />
              </div>
              <div className="flex justify-end pt-1">
                <button className="btn-primary text-sm flex items-center gap-2" disabled={busy} onClick={createSchedule}>
                  <Mail className="w-4 h-4" /> Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
