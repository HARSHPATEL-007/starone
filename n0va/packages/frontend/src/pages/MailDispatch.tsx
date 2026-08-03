import { useEffect, useState, useCallback } from "react";
import {
  SendHorizonal, RefreshCw, Plus, X, Send, Clock3, AlarmClock, Megaphone, Rocket,
  CheckCircle2, XCircle, Pause, Play, Trash2, AlertTriangle, CalendarClock,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const statusColor: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-400",
  pending_approval: "bg-amber-500/15 text-amber-400",
  active: "bg-n0va-500/15 text-n0va-300",
  paused: "bg-orange-500/15 text-orange-400",
  rejected: "bg-red-500/15 text-red-400",
  sent: "bg-emerald-500/15 text-emerald-400",
  scheduled: "bg-n0va-500/15 text-n0va-300",
  cancelled: "bg-gray-500/10 text-gray-400",
  done: "bg-emerald-500/15 text-emerald-400",
  open: "bg-amber-500/15 text-amber-400",
};

function relLabel(at: string): string {
  const diff = new Date(at).getTime() - Date.now();
  if (diff < 0) return "overdue";
  if (diff < 3600000) return `in ${Math.max(1, Math.round(diff / 60000))}m`;
  if (diff < 86400000) return `in ${Math.round(diff / 3600000)}h`;
  return `in ${Math.round(diff / 86400000)}d`;
}

function fmt(at: string): string {
  return new Date(at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function MailDispatch() {
  const { addToast } = useToast();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [schedSummary, setSchedSummary] = useState("");
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [fuSummary, setFuSummary] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campTotals, setCampTotals] = useState<any>({});
  const [mailboxes, setMailboxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");
  const [showSchedForm, setShowSchedForm] = useState(false);
  const [schedForm, setSchedForm] = useState({ mailboxId: "", to: "", subject: "", sendAt: "" });

  const loadData = useCallback(async () => {
    const [s, fu, fus, c, mb] = await Promise.all([
      api.adsMarketingModule.mailListScheduled().catch(() => null),
      api.adsMarketingModule.mailFollowUps({ status: "open" }).catch(() => null),
      api.adsMarketingModule.mailFollowUpSummary().catch(() => null),
      api.adsMarketingModule.mailCampaigns().catch(() => null),
      api.adsMarketingModule.mailMailboxes().catch(() => null),
    ]);
    const sR = unwrap(s);
    setSchedules(Array.isArray(sR) ? sR : sR?.schedules || []);
    setSchedSummary(sR?.summary || "");
    const fR = unwrap(fu);
    setFollowUps(Array.isArray(fR) ? fR : fR?.followUps || []);
    setFuSummary(unwrap(fus) || null);
    const cR = unwrap(c);
    setCampaigns(Array.isArray(cR) ? cR : cR?.campaigns || []);
    setCampTotals(cR?.totals || {});
    const mbs = unwrap(mb);
    setMailboxes(Array.isArray(mbs) ? mbs : mbs?.data || []);
    setLastUpdated(new Date().toISOString());
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    function refresh() { loadData(); }
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

  async function createSchedule() {
    if (!schedForm.mailboxId || !schedForm.to.trim() || !schedForm.subject.trim() || !schedForm.sendAt) {
      addToast("warning", "Missing fields", "Mailbox, recipient, subject and send time are required.");
      return;
    }
    if (!Date.parse(schedForm.sendAt)) {
      addToast("warning", "Invalid time", "Pick a valid send time.");
      return;
    }
    setBusy("sched-create");
    try {
      const r = unwrap(await api.adsMarketingModule.mailScheduleSend(schedForm.mailboxId, {
        to: schedForm.to.trim(),
        subject: schedForm.subject.trim(),
        sendAt: new Date(schedForm.sendAt).toISOString(),
      }));
      addToast("success", "Scheduled", r?.summary || "");
      setSchedForm({ mailboxId: schedForm.mailboxId, to: "", subject: "", sendAt: "" });
      setShowSchedForm(false);
      await loadData();
    } catch (e: any) {
      addToast("error", "Schedule failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  if (loading && !lastUpdated) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">Mail Dispatch</h1><p className="text-gray-500 mt-1">Queued sends, follow-ups & campaign windows — execute from one place</p></div>
          <div className="animate-spin w-5 h-5 border-2 border-n0va-500 border-t-transparent rounded-full" />
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        <SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
    );
  }

  const scheduledPending = schedules.filter((s) => s.status === "scheduled").length;
  const scheduledToday = schedules.filter((s) => s.status === "scheduled" && new Date(s.sendAt).getTime() <= Date.now() + 86400000).length;
  const dueToday = fuSummary?.dueToday ?? followUps.filter((f) => f.status === "open" && new Date(f.at).getTime() <= Date.now() + 86400000).length;
  const overdue = fuSummary?.overdue ?? followUps.filter((f) => f.status === "open" && f.overdue).length;
  const pendingApproval = campTotals?.pendingApproval ?? campaigns.filter((c) => c.status === "pending_approval").length;

  const stats = [
    { label: "Scheduled sends", value: scheduledPending, sub: `${scheduledToday} due today`, icon: CalendarClock, color: "text-n0va-400" },
    { label: "Follow-ups due", value: dueToday, sub: `${overdue} overdue`, icon: AlarmClock, color: "text-amber-400" },
    { label: "Awaiting response", value: fuSummary?.awaitingCount ?? 0, sub: `${fuSummary?.snoozedCount ?? 0} snoozed`, icon: Clock3, color: "text-gray-400" },
    { label: "Campaign approvals", value: pendingApproval, sub: `${campTotals?.active ?? 0} active`, icon: Megaphone, color: "text-violet-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><SendHorizonal className="w-6 h-6 text-n0va-400" /> Mail Dispatch</h1>
          <p className="text-gray-500 mt-1 text-sm">Queued sends, follow-ups & campaign windows — execute from one place</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && <span className="text-xs text-gray-500 hidden md:inline">Updated {new Date(lastUpdated).toLocaleTimeString()}</span>}
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="w-3.5 h-3.5 text-n0va-600 bg-gray-700 border-gray-600 rounded" />
            Auto (30s)
          </label>
          <button className="btn-secondary p-2" onClick={loadData} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card min-w-0">
            <div className="flex items-center gap-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-xs text-gray-500">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {(!schedules.length && !followUps.length && !campaigns.length) && (
        <div className="card border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-sm text-amber-300 font-medium">Nothing queued</p>
              <p className="text-xs text-amber-400/70">No scheduled sends, open follow-ups or campaigns yet — schedule a send below to get started.</p>
            </div>
          </div>
        </div>
      )}

      <div className="card min-w-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Send className="w-4 h-4 text-n0va-400" /> Scheduled sends {schedSummary && <span className="text-xs text-gray-500 font-normal">{schedSummary}</span>}</h3>
          <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => setShowSchedForm(!showSchedForm)}>
            {showSchedForm ? <><X className="w-3.5 h-3.5 mr-1" />Close</> : <><Plus className="w-3.5 h-3.5 mr-1" />Schedule a send</>}
          </button>
        </div>

        {showSchedForm && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 mt-4 items-end">
            <div className="min-w-0">
              <label className="text-xs text-gray-500 block mb-1">Mailbox</label>
              <select className="select text-xs" value={schedForm.mailboxId} onChange={(e) => setSchedForm({ ...schedForm, mailboxId: e.target.value })}>
                <option value="">Select mailbox…</option>
                {mailboxes.filter((m: any) => m.active !== false).map((m: any) => <option key={m.mailboxId || m._id} value={m.mailboxId || m._id}>{m.name || m.email}</option>)}
              </select>
            </div>
            <div className="min-w-0">
              <label className="text-xs text-gray-500 block mb-1">To</label>
              <input className="input text-xs" placeholder="name@partner.com" value={schedForm.to} onChange={(e) => setSchedForm({ ...schedForm, to: e.target.value })} />
            </div>
            <div className="min-w-0">
              <label className="text-xs text-gray-500 block mb-1">Subject</label>
              <input className="input text-xs" placeholder="Subject line" value={schedForm.subject} onChange={(e) => setSchedForm({ ...schedForm, subject: e.target.value })} />
            </div>
            <div className="min-w-0">
              <label className="text-xs text-gray-500 block mb-1">Send at</label>
              <input type="datetime-local" className="input text-xs" value={schedForm.sendAt} onChange={(e) => setSchedForm({ ...schedForm, sendAt: e.target.value })} />
            </div>
            <button className="btn-primary text-xs" disabled={!!busy} onClick={createSchedule}><CalendarClock className="w-3.5 h-3.5 mr-1" />Queue</button>
          </div>
        )}

        <div className="space-y-2 mt-4">
          {schedules.length === 0 && <div className="text-xs text-gray-500">No scheduled emails yet.</div>}
          {schedules.map((s: any) => (
            <div key={s._id} className={`flex items-center justify-between gap-2 flex-wrap rounded-lg px-3 py-2 ${s.status === "cancelled" ? "bg-gray-900/30 opacity-60" : "bg-gray-900/60"}`}>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-white truncate">{s.subject || "(no subject)"}</div>
                <div className="text-[10px] text-gray-500 truncate">
                  to {(Array.isArray(s.to) ? s.to : [s.to]).join(", ")} · {s.sendAt ? fmt(s.sendAt) : ""} · {relLabel(s.sendAt || "")}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`badge ${statusColor[s.status] || "bg-gray-600/20 text-gray-400"}`}>{s.status}</span>
                {s.status === "scheduled" && (
                  <>
                    <button className="btn-primary text-xs px-2.5 py-1" disabled={!!busy} onClick={() => act(`sched-send-${s._id}`, () => api.adsMarketingModule.mailSendScheduleNow(s._id), "Sent now", "Send failed")}>
                      <Send className="w-3 h-3 mr-1" />Send now
                    </button>
                    <button className="text-gray-500 hover:text-red-400 p-1" title="Cancel" disabled={!!busy} onClick={() => act(`sched-cancel-${s._id}`, () => api.adsMarketingModule.mailCancelSchedule(s._id), "Cancelled", "Cancel failed")}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card min-w-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2"><AlarmClock className="w-4 h-4 text-amber-400" /> Follow-up reminders {fuSummary && <span className="text-xs text-gray-500 font-normal">{fuSummary.summary}</span>}</h3>
        </div>
        <div className="space-y-2 mt-4">
          {followUps.length === 0 && <div className="text-xs text-gray-500">No open follow-ups. Nice.</div>}
          {followUps.map((f: any) => (
            <div key={f._id} className="flex items-center justify-between gap-2 flex-wrap rounded-lg px-3 py-2 bg-gray-900/60">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-white truncate">{f.subject || "(no subject)"}</div>
                <div className="text-[10px] text-gray-500 truncate">follow up {f.at ? fmt(f.at) : ""} · {relLabel(f.at || "")}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`badge ${f.overdue ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"}`}>{f.overdue ? "overdue" : "open"}</span>
                <button className="btn-primary text-xs px-2.5 py-1" disabled={!!busy} onClick={() => act(`fu-${f._id}`, () => api.adsMarketingModule.mailCompleteFollowUp(f._id), "Completed", "Complete failed")}>
                  <CheckCircle2 className="w-3 h-3 mr-1" />Done
                </button>
                <button className="text-gray-500 hover:text-red-400 p-1" title="Delete" disabled={!!busy} onClick={() => act(`fu-del-${f._id}`, () => api.adsMarketingModule.mailDeleteFollowUp(f._id), "Deleted", "Delete failed")}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card min-w-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Megaphone className="w-4 h-4 text-violet-400" /> Campaign send windows</h3>
          <div className="flex items-center gap-2 flex-wrap text-[10px] text-gray-500">
            <span className="badge bg-gray-600/20 text-gray-400">{campTotals?.total ?? campaigns.length} total</span>
            <span className="badge bg-gray-500/10 text-gray-400">{campTotals?.draft ?? 0} draft</span>
            <span className="badge bg-amber-500/15 text-amber-400">{pendingApproval} pending</span>
            <span className="badge bg-n0va-500/15 text-n0va-300">{campTotals?.active ?? 0} active</span>
            <span className="badge bg-orange-500/15 text-orange-400">{campTotals?.paused ?? 0} paused</span>
          </div>
        </div>
        <div className="space-y-2 mt-4">
          {campaigns.length === 0 && <div className="text-xs text-gray-500">No campaigns yet — create one on the Campaigns page.</div>}
          {campaigns.map((c: any) => (
            <div key={c.campaignId} className="flex items-center justify-between gap-2 flex-wrap rounded-lg px-3 py-2 bg-gray-900/60">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-white truncate">{c.name}</div>
                <div className="text-[10px] text-gray-500 truncate">
                  {c.recipients ?? 0} recipient(s){c.scheduleAt ? ` · window ${fmt(c.scheduleAt)}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <span className={`badge ${statusColor[c.status] || "bg-gray-600/20 text-gray-400"}`}>{c.status}</span>
                {(c.status === "draft" || c.status === "rejected") && (
                  <button className="btn-primary text-xs px-2.5 py-1" disabled={!!busy} onClick={() => act(`c-launch-${c.campaignId}`, () => api.adsMarketingModule.mailLaunchCampaign(c.campaignId), "Launched", "Launch failed")}>
                    <Rocket className="w-3 h-3 mr-1" />Launch
                  </button>
                )}
                {c.status === "pending_approval" && (
                  <>
                    <button className="btn-primary text-xs px-2.5 py-1" disabled={!!busy} onClick={() => act(`c-ok-${c.campaignId}`, () => api.adsMarketingModule.mailApproveCampaign(c.campaignId, "user_001"), "Approved", "Approve failed")}>
                      <CheckCircle2 className="w-3 h-3 mr-1" />Approve
                    </button>
                    <button className="btn-secondary text-xs px-2.5 py-1" disabled={!!busy} onClick={() => act(`c-no-${c.campaignId}`, () => api.adsMarketingModule.mailRejectCampaign(c.campaignId, "Rejected from Mail Dispatch"), "Rejected", "Reject failed")}>
                      <XCircle className="w-3 h-3 mr-1" />Reject
                    </button>
                  </>
                )}
                {c.status === "active" && (
                  <button className="btn-secondary text-xs px-2.5 py-1" disabled={!!busy} onClick={() => act(`c-pause-${c.campaignId}`, () => api.adsMarketingModule.mailPauseCampaign(c.campaignId), "Paused", "Pause failed")}>
                    <Pause className="w-3 h-3 mr-1" />Pause
                  </button>
                )}
                {c.status === "paused" && (
                  <button className="btn-secondary text-xs px-2.5 py-1" disabled={!!busy} onClick={() => act(`c-resume-${c.campaignId}`, () => api.adsMarketingModule.mailResumeCampaign(c.campaignId), "Resumed", "Resume failed")}>
                    <Play className="w-3 h-3 mr-1" />Resume
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
