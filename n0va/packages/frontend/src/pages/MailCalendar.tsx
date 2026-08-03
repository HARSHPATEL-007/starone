import { useEffect, useState, useCallback } from "react";
import {
  CalendarClock, ChevronLeft, ChevronRight, RefreshCw, Send, AlarmClock, Megaphone, Clock3,
  CheckCircle2, XCircle, Pause, Play, X, AlertTriangle,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const KIND_STYLE: Record<string, { dot: string; chip: string; label: string }> = {
  send: { dot: "bg-n0va-400", chip: "bg-n0va-500/15 text-n0va-300", label: "Scheduled send" },
  followup: { dot: "bg-amber-400", chip: "bg-amber-500/15 text-amber-400", label: "Follow-up" },
  campaign: { dot: "bg-violet-400", chip: "bg-violet-500/15 text-violet-300", label: "Campaign window" },
  snoozed: { dot: "bg-gray-400", chip: "bg-gray-600/20 text-gray-400", label: "Snoozed" },
};

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function timeLabel(at: string): string {
  return new Date(at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function MailCalendar() {
  const { addToast } = useToast();
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string>(dayKey(new Date()));
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");

  const loadData = useCallback(async () => {
    const [s, fu, c, sn] = await Promise.all([
      api.adsMarketingModule.mailListScheduled().catch(() => null),
      api.adsMarketingModule.mailFollowUps({ status: "open" }).catch(() => null),
      api.adsMarketingModule.mailCampaigns().catch(() => null),
      api.adsMarketingModule.mailListSnoozed().catch(() => null),
    ]);
    const out: any[] = [];
    const sR = unwrap(s);
    const schedules = Array.isArray(sR) ? sR : sR?.schedules || [];
    schedules.forEach((x: any) => {
      if (!x.sendAt) return;
      out.push({ kind: "send", id: x._id, title: x.subject || "(no subject)", at: x.sendAt, status: x.status, meta: { to: Array.isArray(x.to) ? x.to.join(", ") : x.to || "" } });
    });
    const fR = unwrap(fu);
    const followUps = Array.isArray(fR) ? fR : fR?.followUps || [];
    followUps.forEach((x: any) => {
      if (!x.at) return;
      out.push({ kind: "followup", id: x._id, title: x.subject || "(no subject)", at: x.at, status: x.status, overdue: x.overdue, meta: {} });
    });
    const cR = unwrap(c);
    const campaigns = Array.isArray(cR) ? cR : cR?.campaigns || [];
    campaigns.forEach((x: any) => {
      if (!x.scheduleAt) return;
      out.push({ kind: "campaign", id: x.campaignId, title: x.name, at: x.scheduleAt, status: x.status, meta: { recipients: x.recipients ?? 0 } });
    });
    const snR = unwrap(sn);
    const snoozed = Array.isArray(snR) ? snR : snR?.snoozed || [];
    snoozed.forEach((x: any) => {
      if (!x.snoozedUntil) return;
      out.push({ kind: "snoozed", id: x._id, title: x.subject || "(no subject)", at: x.snoozedUntil, status: "snoozed", overdue: x.snoozedOverdue, meta: {} });
    });
    setItems(out.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()));
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

  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const firstWeekday = base.getDay();
  const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const start = new Date(base.getFullYear(), base.getMonth(), 1 - firstWeekday);
  const cells: Date[] = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));

  const byDay: Record<string, any[]> = {};
  items.forEach((it) => {
    const k = dayKey(new Date(it.at));
    (byDay[k] = byDay[k] || []).push(it);
  });

  const todayKey = dayKey(now);
  const selectedItems = (byDay[selectedDay] || []).sort((a: any, b: any) => new Date(a.at).getTime() - new Date(b.at).getTime());
  const monthLabel = base.toLocaleString("en", { month: "long", year: "numeric" });
  const inMonth = items.filter((it) => dayKey(new Date(it.at)).startsWith(`${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}`));

  if (loading && !lastUpdated) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">Mail Calendar</h1><p className="text-gray-500 mt-1">Sends, follow-ups, campaign windows & snoozes on one timeline</p></div>
          <div className="animate-spin w-5 h-5 border-2 border-n0va-500 border-t-transparent rounded-full" />
        </div>
        <SkeletonCard /><SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><CalendarClock className="w-6 h-6 text-n0va-400" /> Mail Calendar</h1>
          <p className="text-gray-500 mt-1 text-sm">Sends, follow-ups, campaign windows & snoozes on one timeline</p>
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

      <div className="card min-w-0">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div className="flex items-center gap-2">
            <button className="btn-secondary p-2" onClick={() => setMonthOffset(monthOffset - 1)} title="Previous month"><ChevronLeft className="w-4 h-4" /></button>
            <button className="btn-secondary p-2" onClick={() => setMonthOffset(monthOffset + 1)} title="Next month"><ChevronRight className="w-4 h-4" /></button>
            <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => { setMonthOffset(0); setSelectedDay(todayKey); }}>Today</button>
          </div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-white">{monthLabel}</h3>
            <span className="badge bg-gray-600/20 text-gray-400">{inMonth.length} item(s)</span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap text-[10px] text-gray-500 mb-3">
          {Object.entries(KIND_STYLE).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${v.dot}`} />{v.label}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-800 rounded-lg overflow-hidden">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="bg-gray-900 text-[10px] text-gray-500 text-center py-1.5">{d}</div>
          ))}
          {cells.map((d) => {
            const k = dayKey(d);
            const dayItems = byDay[k] || [];
            const inCurrent = d.getMonth() === base.getMonth();
            const isToday = k === todayKey;
            const isSelected = k === selectedDay;
            return (
              <button
                key={k}
                onClick={() => setSelectedDay(k)}
                className={`bg-gray-900 min-h-[52px] md:min-h-[72px] p-1 text-left align-top hover:bg-gray-800/70 transition-colors ${inCurrent ? "" : "opacity-40"} ${isToday ? "bg-n0va-900/40" : ""} ${isSelected ? "ring-1 ring-inset ring-n0va-500" : ""}`}
              >
                <div className={`text-[10px] font-semibold ${isToday ? "text-n0va-300" : inCurrent ? "text-gray-300" : "text-gray-600"}`}>{d.getDate()}</div>
                <div className="flex flex-col gap-0.5 mt-0.5">
                  {dayItems.slice(0, 3).map((it: any, i: number) => (
                    <span key={i} className="hidden md:flex items-center gap-1 rounded px-1 py-px overflow-hidden">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${KIND_STYLE[it.kind].dot}`} />
                      <span className="text-[9px] text-gray-400 truncate">{it.title}</span>
                    </span>
                  ))}
                  {dayItems.slice(0, 5).map((it: any, i: number) => (
                    <span key={`m${i}`} className={`md:hidden w-1.5 h-1.5 rounded-full ${KIND_STYLE[it.kind].dot}`} />
                  ))}
                  {dayItems.length > 3 && <span className="hidden md:block text-[9px] text-gray-500">+{dayItems.length - 3} more</span>}
                  {dayItems.length > 5 && <span className="md:hidden text-[9px] text-gray-500">+{dayItems.length - 5}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card min-w-0">
        <h3 className="text-sm font-semibold text-white mb-3">
          {selectedDay === todayKey ? "Today" : new Date(selectedDay + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          <span className="text-gray-500 font-normal text-xs ml-2">{selectedItems.length} item(s)</span>
        </h3>
        <div className="space-y-2">
          {selectedItems.length === 0 && <div className="text-xs text-gray-500">Nothing scheduled for this day.</div>}
          {selectedItems.map((it: any) => (
            <div key={it.kind + it.id} className="flex items-center justify-between gap-2 flex-wrap rounded-lg px-3 py-2 bg-gray-900/60">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-white truncate">{it.title}</div>
                <div className="text-[10px] text-gray-500 truncate">
                  {timeLabel(it.at)}{it.kind === "send" && it.meta.to ? ` · to ${it.meta.to}` : ""}
                  {it.kind === "campaign" && it.meta.recipients ? ` · ${it.meta.recipients} recipient(s)` : ""}
                  {it.overdue ? " · overdue" : ""}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <span className={`badge ${KIND_STYLE[it.kind].chip}`}>{KIND_STYLE[it.kind].label}</span>
                {it.status && it.kind !== "snoozed" && it.status !== "done" && (
                  <span className={`badge ${it.status === "scheduled" || it.status === "active" ? "bg-n0va-500/15 text-n0va-300" : it.status === "pending_approval" ? "bg-amber-500/15 text-amber-400" : "bg-gray-600/20 text-gray-400"}`}>{it.status}</span>
                )}
                {it.kind === "send" && it.status === "scheduled" && (
                  <>
                    <button className="btn-primary text-xs px-2.5 py-1" disabled={!!busy} onClick={() => act(`send-${it.id}`, () => api.adsMarketingModule.mailSendScheduleNow(it.id), "Sent now", "Send failed")}>
                      <Send className="w-3 h-3 mr-1" />Send now
                    </button>
                    <button className="text-gray-500 hover:text-red-400 p-1" title="Cancel" disabled={!!busy} onClick={() => act(`cancel-${it.id}`, () => api.adsMarketingModule.mailCancelSchedule(it.id), "Cancelled", "Cancel failed")}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                {it.kind === "followup" && it.status === "open" && (
                  <>
                    <button className="btn-primary text-xs px-2.5 py-1" disabled={!!busy} onClick={() => act(`fu-${it.id}`, () => api.adsMarketingModule.mailCompleteFollowUp(it.id), "Completed", "Complete failed")}>
                      <CheckCircle2 className="w-3 h-3 mr-1" />Done
                    </button>
                    <button className="text-gray-500 hover:text-red-400 p-1" title="Delete" disabled={!!busy} onClick={() => act(`fu-del-${it.id}`, () => api.adsMarketingModule.mailDeleteFollowUp(it.id), "Deleted", "Delete failed")}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                {it.kind === "campaign" && it.status === "pending_approval" && (
                  <>
                    <button className="btn-primary text-xs px-2.5 py-1" disabled={!!busy} onClick={() => act(`ok-${it.id}`, () => api.adsMarketingModule.mailApproveCampaign(it.id, "user_001"), "Approved", "Approve failed")}>
                      <CheckCircle2 className="w-3 h-3 mr-1" />Approve
                    </button>
                    <button className="btn-secondary text-xs px-2.5 py-1" disabled={!!busy} onClick={() => act(`no-${it.id}`, () => api.adsMarketingModule.mailRejectCampaign(it.id, "Rejected from Mail Calendar"), "Rejected", "Reject failed")}>
                      <XCircle className="w-3 h-3 mr-1" />Reject
                    </button>
                  </>
                )}
                {it.kind === "campaign" && it.status === "active" && (
                  <button className="btn-secondary text-xs px-2.5 py-1" disabled={!!busy} onClick={() => act(`pause-${it.id}`, () => api.adsMarketingModule.mailPauseCampaign(it.id), "Paused", "Pause failed")}>
                    <Pause className="w-3 h-3 mr-1" />Pause
                  </button>
                )}
                {it.kind === "campaign" && it.status === "paused" && (
                  <button className="btn-secondary text-xs px-2.5 py-1" disabled={!!busy} onClick={() => act(`resume-${it.id}`, () => api.adsMarketingModule.mailResumeCampaign(it.id), "Resumed", "Resume failed")}>
                    <Play className="w-3 h-3 mr-1" />Resume
                  </button>
                )}
                {it.kind === "snoozed" && (
                  <button className="btn-secondary text-xs px-2.5 py-1" disabled={!!busy} onClick={() => act(`unsnz-${it.id}`, () => api.adsMarketingModule.mailUnsnooze(it.id), "Unsnoozed", "Unsnooze failed")}>
                    <Clock3 className="w-3 h-3 mr-1" />Unsnooze
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {!loading && items.length === 0 && (
        <div className="card border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-sm text-amber-300 font-medium">Calendar is empty</p>
              <p className="text-xs text-amber-400/70">Schedule a send or set a follow-up to see it on the timeline.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
