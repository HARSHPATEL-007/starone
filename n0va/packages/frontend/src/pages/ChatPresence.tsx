import { useEffect, useState, useCallback } from "react";
import {
  Radio, RefreshCw, MonitorSmartphone, Timer, Calendar, MessageSquare, Wifi,
} from "lucide-react";

const CalendarIcon = Calendar;
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

function me(): string {
  try {
    const u = localStorage.getItem("n0va_user");
    if (u) return JSON.parse(u).userId || "user_001";
  } catch {}
  return "user_001";
}

const STATUS_STYLE: Record<string, string> = {
  online: "bg-emerald-900/60 text-emerald-300 border border-emerald-700/40",
  away: "bg-amber-900/60 text-amber-300 border border-amber-700/40",
  busy: "bg-red-900/60 text-red-300 border border-red-700/40",
  dnd: "bg-red-900/60 text-red-300 border border-red-700/40",
  offline: "bg-gray-700/60 text-gray-400 border border-gray-600/40",
  in_meeting: "bg-sky-900/60 text-sky-300 border border-sky-700/40",
  on_call: "bg-sky-900/60 text-sky-300 border border-sky-700/40",
  in_focus: "bg-violet-900/60 text-violet-300 border border-violet-700/40",
  neural_flow: "bg-fuchsia-900/60 text-fuchsia-300 border border-fuchsia-700/40",
};

export default function ChatPresence() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [myPresence, setMyPresence] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState("online");
  const [custom, setCustom] = useState("");
  const [focusMin, setFocusMin] = useState("120");
  const [meetingTitle, setMeetingTitle] = useState("");

  const load = useCallback(async () => {
    const [d, p] = await Promise.all([
      api.adsMarketingModule.chat.presenceDashboard().catch(() => null),
      api.adsMarketingModule.chat.presence(me()).catch(() => null),
    ]);
    setDash(unwrap(d));
    setMyPresence(unwrap(p)?.presence || unwrap(p));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(kind: string, fn: () => Promise<any>, reload = true) {
    setBusy(kind);
    const r = unwrap(await fn().catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setBusy(null);
    if (reload) load();
  }

  async function updateStatus() {
    await act("status", () => api.adsMarketingModule.chat.updatePresence({ userId: me(), status }));
  }

  async function setCustomStatus() {
    await act("custom", () => api.adsMarketingModule.chat.setCustomStatus(me(), custom.trim() || null));
    setCustom("");
  }

  async function startFocus() {
    await act("focus", () => api.adsMarketingModule.chat.focusMode({ userId: me(), enabled: true, durationMinutes: Number(focusMin) || 120 }));
  }

  async function stopFocus() {
    await act("focusoff", () => api.adsMarketingModule.chat.focusMode({ userId: me(), enabled: false }));
  }

  async function joinMeeting() {
    await act("meeting", () => api.adsMarketingModule.chat.calendarStatus({ userId: me(), inMeeting: true, meetingTitle: meetingTitle.trim() || "Meeting" }));
    setMeetingTitle("");
  }

  async function leaveMeeting() {
    await act("meetingoff", () => api.adsMarketingModule.chat.calendarStatus({ userId: me(), inMeeting: false }));
  }

  const byStatus = dash?.byStatus || {};
  const statuses = dash?.statuses || Object.keys(STATUS_STYLE);
  const devices = myPresence?.devices || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Radio className="w-6 h-6 text-n0va-400" /> Presence & Signals</h1>
          <p className="text-gray-500 mt-1 text-sm">Team availability, focus mode, devices and calendar-aware status</p>
        </div>
        <button className="btn-secondary p-2" onClick={load} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : !dash ? (
        <div className="card"><p className="text-xs text-gray-500">Presence data unavailable.</p></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="card !p-4"><p className="text-2xl font-bold text-white">{dash.total ?? 0}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Known users</p></div>
            <div className="card !p-4"><p className="text-2xl font-bold text-emerald-400">{dash.online ?? 0}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Online</p></div>
            <div className="card !p-4"><p className="text-2xl font-bold text-violet-400">{dash.inFocus ?? 0}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">In focus</p></div>
            <div className="card !p-4"><p className="text-2xl font-bold text-sky-400">{dash.inMeetings ?? 0}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">In meetings</p></div>
            <div className="card !p-4"><p className="text-2xl font-bold text-n0va-400">{dash.devices ?? 0}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Devices</p></div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Wifi className="w-4 h-4 text-n0va-400" /> Live presence by status</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {statuses.map((s: string) => (
                <div key={s} className="p-3 rounded-xl bg-gray-800/40">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${STATUS_STYLE[s] || "bg-gray-700/60 text-gray-300"}`}>{s}</span>
                    <span className="text-lg font-bold text-white">{byStatus[s] ?? 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><MessageSquare className="w-4 h-4 text-n0va-400" /> My status</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] px-2 py-1 rounded uppercase ${STATUS_STYLE[myPresence?.status] || "bg-gray-700/60"}`}>{myPresence?.status || "offline"}</span>
                {myPresence?.custom_status && <span className="text-xs text-gray-300">"{myPresence.custom_status}"</span>}
                <span className="text-[10px] text-gray-500 ml-auto">last seen {new Date(myPresence?.last_active_at).toLocaleTimeString()}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                <select className="input text-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {statuses.map((s: string) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button className="btn-primary text-xs" disabled={busy === "status"} onClick={updateStatus}>Set status</button>
                <div className="flex gap-2">
                  <input className="input text-xs flex-1" placeholder="custom status" value={custom} onChange={(e) => setCustom(e.target.value)} />
                  <button className="btn-secondary text-xs" onClick={setCustomStatus}>Set</button>
                </div>
              </div>
              {devices.length > 0 && (
                <div className="mt-3 border-t border-gray-700/40 pt-3">
                  <p className="text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5"><MonitorSmartphone className="w-3.5 h-3.5 text-n0va-400" /> Devices</p>
                  <div className="flex flex-wrap gap-1.5">
                    {devices.map((d: any) => (
                      <span key={d.device_id} className="text-[10px] px-2 py-1 rounded-lg bg-gray-800/50 border border-gray-700 text-gray-300">{d.platform} · {d.client_version}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="card">
                <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Timer className="w-4 h-4 text-n0va-400" /> Focus mode</h2>
                {myPresence?.focus_mode?.enabled ? (
                  <div className="rounded-xl bg-violet-900/30 border border-violet-700/40 p-3">
                    <p className="text-sm font-semibold text-violet-200">In focus until {new Date(myPresence.focus_mode.end_time).toLocaleTimeString()}</p>
                    <p className="text-[11px] text-gray-400 mt-1">interrupts: {(myPresence.focus_mode.allowed_interrupts || []).join(", ")}</p>
                    <button className="btn-danger text-xs mt-2" onClick={stopFocus} disabled={busy === "focusoff"}>End focus</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input className="input text-xs" placeholder="minutes (default 120)" value={focusMin} onChange={(e) => setFocusMin(e.target.value)} />
                    <button className="btn-primary text-xs" disabled={busy === "focus"} onClick={startFocus}>Start focus</button>
                  </div>
                )}
              </div>

              <div className="card">
                <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-n0va-400" /> Calendar status</h2>
                {myPresence?.calendar_status?.in_meeting ? (
                  <div className="rounded-xl bg-sky-900/30 border border-sky-700/40 p-3">
                    <p className="text-sm font-semibold text-sky-200">In meeting: {myPresence.calendar_status.meeting_title}</p>
                    <button className="btn-secondary text-xs mt-2" onClick={leaveMeeting} disabled={busy === "meetingoff"}>Leave meeting</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input className="input flex-1 text-xs" placeholder="Meeting title" value={meetingTitle} onChange={(e) => setMeetingTitle(e.target.value)} />
                    <button className="btn-primary text-xs" disabled={busy === "meeting"} onClick={joinMeeting}>Join</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}