import { useEffect, useState, useCallback } from "react";
import {
  Ticket, RefreshCw, Plus, X, CheckCircle2, RotateCcw, AlertOctagon, Clock3,
  User, Flag, Tag, MessageSquare, Search, LifeBuoy,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const statusColor: Record<string, string> = {
  open: "bg-amber-500/15 text-amber-400",
  pending: "bg-n0va-500/15 text-n0va-300",
  resolved: "bg-emerald-500/15 text-emerald-400",
  closed: "bg-gray-500/10 text-gray-400",
};

const prioColor: Record<string, string> = {
  low: "bg-gray-500/10 text-gray-400",
  medium: "bg-n0va-500/15 text-n0va-300",
  high: "bg-orange-500/15 text-orange-400",
  urgent: "bg-red-500/15 text-red-400",
};

const slaColor: Record<string, string> = {
  healthy: "bg-emerald-500/15 text-emerald-400",
  due_soon: "bg-amber-500/15 text-amber-400",
  overdue: "bg-red-500/15 text-red-400",
  done: "bg-gray-500/10 text-gray-400",
};

function slaOf(t: any): string {
  if (t.status === "resolved" || t.status === "closed") return "done";
  const diff = new Date(t.slaDeadline).getTime() - Date.now();
  if (diff < 0) return "overdue";
  if (diff < 7200000) return "due_soon";
  return "healthy";
}

export default function MailTickets() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [filters, setFilters] = useState<any>({ status: "", priority: "", search: "" });
  const [log, setLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [noteText, setNoteText] = useState("");
  const [form, setForm] = useState<any>({ subject: "", from: "", priority: "medium", assignee: "", slaHours: 24 });

  const loadData = useCallback(async () => {
    const [d, t, l] = await Promise.all([
      api.adsMarketingModule.mailTicketDashboard().catch(() => null),
      api.adsMarketingModule.mailTickets(filters).catch(() => null),
      api.adsMarketingModule.mailTicketLog().catch(() => null),
    ]);
    setDash(unwrap(d) || null);
    const tR = unwrap(t);
    setTickets(tR?.tickets || []);
    const lR = unwrap(l);
    setLog(lR?.entries || []);
    setLoading(false);
  }, [filters]);

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

  async function createTicket() {
    if (!form.subject.trim()) {
      addToast("warning", "Subject required", "A ticket needs a subject.");
      return;
    }
    setBusy("create");
    try {
      const r = unwrap(await api.adsMarketingModule.mailCreateTicket({ ...form, slaHours: Number(form.slaHours) || 24 }));
      addToast("success", "Ticket filed", r?.summary || "");
      setShowCreate(false);
      setForm({ subject: "", from: "", priority: "medium", assignee: "", slaHours: 24 });
      await loadData();
    } catch (e: any) {
      addToast("error", "Create failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function addNote() {
    if (!noteText.trim()) {
      addToast("warning", "Note required", "Write something before adding.");
      return;
    }
    await act(`note-${showDetail.ticketId}`, () => api.adsMarketingModule.mailTicketNote(showDetail.ticketId, noteText), "Note added", "Note failed");
    setNoteText("");
  }

  const stats = [
    { label: "Open", value: dash?.open ?? 0, icon: Ticket },
    { label: "Overdue SLA", value: dash?.sla?.overdue ?? 0, icon: Clock3 },
    { label: "Urgent", value: dash?.urgent ?? 0, icon: AlertOctagon },
    { label: "Avg resolution", value: dash?.avgResolutionHours !== undefined ? `${dash.avgResolutionHours}h` : "—", icon: LifeBuoy },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Ticket className="w-5 h-5 text-n0va-300" /> Team Mail Tickets</h1>
          <p className="text-sm text-gray-500">Shared inbox tickets with assignment, tags, notes and SLA tracking.</p>
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
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">File ticket</span>
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

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              {["", "open", "pending", "resolved"].map((s) => (
                <button key={s} onClick={() => setFilters({ ...filters, status: s })}
                  className={`text-[11px] px-2 py-1 rounded-full ${filters.status === s ? "bg-n0va-500/20 text-n0va-300" : "bg-gray-700/50 text-gray-400"}`}>
                  {s === "" ? "all" : s}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {["", "low", "medium", "high", "urgent"].map((p) => (
                <button key={p} onClick={() => setFilters({ ...filters, priority: p })}
                  className={`text-[11px] px-2 py-1 rounded-full ${filters.priority === p ? "bg-n0va-500/20 text-n0va-300" : "bg-gray-700/50 text-gray-400"}`}>
                  {p === "" ? "any prio" : p}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 ml-auto min-w-0">
              <Search className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <input className="rounded-lg bg-gray-800 border border-gray-700 px-2.5 py-1.5 text-xs w-40" placeholder="Search subject / sender"
                value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
            </div>
          </div>

          <div className="grid gap-3">
            {tickets.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-700 p-8 text-center text-gray-500 text-sm">
                No tickets match — file one from the shared inbox.
              </div>
            )}
            {tickets.map((t: any) => (
              <div key={t.ticketId} className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 cursor-pointer hover:bg-gray-800"
                onClick={() => { setShowDetail(t); setNoteText(""); }}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold truncate">{t.subject}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[t.status] || "bg-gray-500/10 text-gray-400"}`}>{t.status}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${prioColor[t.priority] || "bg-gray-500/10 text-gray-400"}`}>{t.priority}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${slaColor[slaOf(t)]}`}>{slaOf(t)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                      {t.from && <span className="truncate max-w-48">{t.from}</span>}
                      {t.assignee && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {t.assignee}</span>}
                      {(t.tags || []).map((tag: string) => (
                        <span key={tag} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300"><Tag className="w-2.5 h-2.5" /> {tag}</span>
                      ))}
                      {t.notes?.length > 0 && <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {t.notes.length}</span>}
                      <span className="ml-auto text-gray-600">{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2"><Clock3 className="w-4 h-4 text-gray-400" /> SLA health</h3>
            <div className="flex flex-wrap gap-2 text-xs">
              {Object.entries(dash?.sla?.byStatus || {}).map(([k, v]) => (
                <span key={k} className={`px-2 py-1 rounded-full ${slaColor[k] || "bg-gray-500/10 text-gray-400"}`}>
                  {k}: {String(v)}
                </span>
              ))}
              <span className="text-gray-500 ml-auto">{dash?.sla?.summary || ""}</span>
            </div>
          </div>

          <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4">
            <h3 className="font-semibold text-sm mb-2">Activity</h3>
            {log.length === 0 && <p className="text-sm text-gray-500">No ticket activity yet.</p>}
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {log.map((e: any) => (
                <div key={e.eventId} className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                  <span className="font-mono text-gray-600">{new Date(e.at).toLocaleString()}</span>
                  <span className="px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-300">{e.action}</span>
                  <span className="text-gray-500 truncate">
                    {e.detail?.assignee ? `→ ${e.detail.assignee}` : e.detail?.priority ? `priority ${e.detail.priority}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full sm:max-w-md bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">File a ticket</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <input className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm" placeholder="Subject (e.g. Refund request)"
                value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              <input className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm" placeholder="From (email, optional)"
                value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} />
              <input className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm" placeholder="Assignee (email, optional)"
                value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} />
              <div className="flex flex-wrap items-center gap-2">
                {["low", "medium", "high", "urgent"].map((p) => (
                  <button key={p} onClick={() => setForm({ ...form, priority: p })}
                    className={`text-xs px-2.5 py-1.5 rounded-full border ${form.priority === p ? "border-n0va-500 bg-n0va-500/20 text-n0va-300" : "border-gray-700 text-gray-400"}`}>
                    {p}
                  </button>
                ))}
                <label className="flex items-center gap-1.5 text-xs text-gray-400 ml-auto">
                  SLA hours
                  <input type="number" min={1} className="w-16 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1 text-xs"
                    value={form.slaHours} onChange={(e) => setForm({ ...form, slaHours: Number(e.target.value) })} />
                </label>
              </div>
              <button onClick={createTicket} disabled={busy === "create"}
                className="w-full py-2.5 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white font-medium">
                {busy === "create" ? "Filing…" : "File ticket"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowDetail(null)}>
          <div className="w-full sm:max-w-lg bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0">
                <h2 className="font-bold truncate">{showDetail.subject}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                  <span className={`px-2 py-0.5 rounded-full ${statusColor[showDetail.status]}`}>{showDetail.status}</span>
                  <span className={`px-2 py-0.5 rounded-full ${prioColor[showDetail.priority]}`}>{showDetail.priority}</span>
                  <span className={`px-2 py-0.5 rounded-full ${slaColor[slaOf(showDetail)]}`}>SLA {slaOf(showDetail)}</span>
                </div>
              </div>
              <button onClick={() => setShowDetail(null)} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 shrink-0"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {showDetail.status !== "resolved" && showDetail.status !== "closed" && (
                <button onClick={() => { act(`res-${showDetail.ticketId}`, () => api.adsMarketingModule.mailResolveTicket(showDetail.ticketId), "Resolved", "Resolve failed"); }}
                  disabled={busy === `res-${showDetail.ticketId}`}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                </button>
              )}
              {showDetail.status !== "open" && (
                <button onClick={() => { act(`re-${showDetail.ticketId}`, () => api.adsMarketingModule.mailReopenTicket(showDetail.ticketId), "Reopened", "Reopen failed"); }}
                  disabled={busy === `re-${showDetail.ticketId}`}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-xs">
                  <RotateCcw className="w-3.5 h-3.5" /> Reopen
                </button>
              )}
              {showDetail.priority !== "urgent" && (
                <button onClick={() => { act(`esc-${showDetail.ticketId}`, () => api.adsMarketingModule.mailEscalateTicket(showDetail.ticketId), "Escalated", "Escalate failed"); }}
                  disabled={busy === `esc-${showDetail.ticketId}`}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs">
                  <AlertOctagon className="w-3.5 h-3.5" /> Escalate
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-gray-800/60 p-3 space-y-1.5">
                <p className="font-medium text-gray-400 flex items-center gap-1.5"><Flag className="w-3 h-3" /> Priority</p>
                <div className="flex flex-wrap gap-1">
                  {["low", "medium", "high", "urgent"].map((p) => (
                    <button key={p} onClick={() => { act(`prio-${showDetail.ticketId}-${p}`, () => api.adsMarketingModule.mailTicketPriority(showDetail.ticketId, p), "Priority set", "Priority failed"); }}
                      className={`px-2 py-1 rounded ${showDetail.priority === p ? "bg-n0va-500/30 text-n0va-200" : "bg-gray-700/50 text-gray-400"}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-lg bg-gray-800/60 p-3 space-y-1.5">
                <p className="font-medium text-gray-400 flex items-center gap-1.5"><User className="w-3 h-3" /> Assignee</p>
                <div className="flex gap-1.5">
                  <input className="flex-1 min-w-0 rounded-lg bg-gray-900 border border-gray-700 px-2 py-1.5 text-xs"
                    placeholder="assignee@n0va.io" defaultValue={showDetail.assignee || ""} id={`assign-${showDetail.ticketId}`} />
                  <button onClick={() => {
                    const el = document.getElementById(`assign-${showDetail.ticketId}`) as HTMLInputElement;
                    if (el?.value) act(`asg-${showDetail.ticketId}`, () => api.adsMarketingModule.mailAssignTicket(showDetail.ticketId, el.value), "Assigned", "Assign failed");
                  }} className="px-2.5 py-1.5 rounded-lg bg-n0va-500/20 hover:bg-n0va-500/30 text-n0va-300">Set</button>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-gray-800/60 p-3 mt-3 space-y-1.5">
              <p className="font-medium text-gray-400 text-xs flex items-center gap-1.5"><Tag className="w-3 h-3" /> Tags</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {(showDetail.tags || []).map((tag: string) => (
                  <span key={tag} className="flex items-center gap-1 px-2 py-1 rounded-full bg-violet-500/10 text-violet-300 text-xs">
                    {tag}
                    <button onClick={() => act(`untag-${showDetail.ticketId}-${tag}`, () => api.adsMarketingModule.mailTicketUntag(showDetail.ticketId, tag), "Tag removed", "Remove failed")}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <div className="flex gap-1">
                  <input className="w-24 rounded-lg bg-gray-900 border border-gray-700 px-2 py-1 text-xs" placeholder="Add tag…" id={`tag-${showDetail.ticketId}`} />
                  <button onClick={() => {
                    const el = document.getElementById(`tag-${showDetail.ticketId}`) as HTMLInputElement;
                    if (el?.value) act(`tag-${showDetail.ticketId}`, () => api.adsMarketingModule.mailTicketTag(showDetail.ticketId, el.value.trim()), "Tag added", "Tag failed");
                  }} className="px-2 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs">+</button>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-gray-800/60 p-3 mt-3">
              <p className="font-medium text-gray-400 text-xs mb-1.5 flex items-center gap-1.5"><MessageSquare className="w-3 h-3" /> Notes ({showDetail.notes?.length || 0})</p>
              <div className="space-y-1.5 mb-2">
                {(showDetail.notes || []).map((n: any, i: number) => (
                  <div key={i} className="text-xs rounded-lg bg-gray-900/60 px-3 py-2">
                    <p className="text-gray-300">{n.body}</p>
                    <p className="text-gray-600 mt-0.5">{n.author} · {new Date(n.at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input className="flex-1 min-w-0 rounded-lg bg-gray-900 border border-gray-700 px-2 py-1.5 text-xs" placeholder="Add a note…"
                  value={noteText} onChange={(e) => setNoteText(e.target.value)} />
                <button onClick={addNote} disabled={busy === `note-${showDetail.ticketId}`}
                  className="px-2.5 py-1.5 rounded-lg bg-n0va-500/20 hover:bg-n0va-500/30 text-n0va-300 text-xs">Add</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="text-[11px] text-gray-600 flex items-center gap-1"><Clock3 className="w-3 h-3" /> SLA deadline: {showDetail ? new Date(showDetail.slaDeadline).toLocaleString() : "—"}</p>
    </div>
  );
}
