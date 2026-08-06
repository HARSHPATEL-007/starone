import { useEffect, useState, useCallback } from "react";
import {
  Radio, RefreshCw, Plus, PhoneOff, Mic, Square, Users, Calendar, TrendingUp, AlertTriangle, Joystick,
} from "lucide-react";
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

const TYPE_STYLE: Record<string, string> = {
  instant: "bg-emerald-900/60 text-emerald-300 border border-emerald-700/40",
  scheduled: "bg-sky-900/60 text-sky-300 border border-sky-700/40",
  persistent: "bg-violet-900/60 text-violet-300 border border-violet-700/40",
  breakout: "bg-amber-900/60 text-amber-300 border border-amber-700/40",
  external: "bg-fuchsia-900/60 text-fuchsia-300 border border-fuchsia-700/40",
  neural: "bg-cyan-900/60 text-cyan-300 border border-cyan-700/40",
};

export default function ChatHuddles() {
  const { addToast } = useToast();
  const [huddles, setHuddles] = useState<any[]>([]);
  const [wall, setWall] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [roomId, setRoomId] = useState("general");
  const [topic, setTopic] = useState("");
  const [huddleType, setHuddleType] = useState("instant");

  const load = useCallback(async () => {
    const [h, w] = await Promise.all([
      api.adsMarketingModule.chat.huddles().catch(() => null),
      api.adsMarketingModule.chat.huddleWall().catch(() => null),
    ]);
    setHuddles(unwrap(h)?.huddles || []);
    setWall(unwrap(w));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(kind: string, fn: () => Promise<any>) {
    setBusy(kind);
    const r = unwrap(await fn().catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setBusy(null);
    load();
  }

  async function start() {
    await act("start", () => api.adsMarketingModule.chat.startHuddle(roomId, { type: huddleType, topic: topic.trim() || undefined, userId: me() }));
    setTopic("");
  }

  const active = huddles.filter((h) => h.state === "active");
  const ended = huddles.filter((h) => h.state !== "active");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Radio className="w-6 h-6 text-n0va-400" /> Chat Huddles</h1>
          <p className="text-gray-500 mt-1 text-sm">Instant audio huddles with recording, transcription and participant walls</p>
        </div>
        <button className="btn-secondary p-2" onClick={load} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card !p-4"><p className="text-2xl font-bold text-white">{wall?.total ?? huddles.length}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">All time</p></div>
        <div className="card !p-4"><p className="text-2xl font-bold text-emerald-400">{wall?.live ?? active.length}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Live now</p></div>
        <div className="card !p-4"><p className="text-2xl font-bold text-n0va-400">{wall?.averageTr ?? "—"}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Avg participants</p></div>
        <div className="card !p-4"><p className="text-2xl font-bold text-amber-400">{wall?.wall ?? 0}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Last 4 months</p></div>
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Plus className="w-4 h-4 text-n0va-400" /> Start a huddle</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input className="input" placeholder="room id (e.g. general)" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
          <input className="input" placeholder="Topic (optional)" value={topic} onChange={(e) => setTopic(e.target.value)} />
          <select className="input" value={huddleType} onChange={(e) => setHuddleType(e.target.value)}>
            <option value="instant">Instant</option>
            <option value="scheduled">Scheduled</option>
            <option value="persistent">Persistent</option>
            <option value="breakout">Breakout</option>
            <option value="external">External</option>
          </select>
          <button className="btn-primary" disabled={busy === "start" || !roomId.trim()} onClick={start}>
            {busy === "start" ? "Starting..." : "Start"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <>
          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Radio className="w-4 h-4 text-emerald-400" /> Live huddles <span className="text-[11px] text-gray-500">· {active.length}</span></h2>
            <div className="space-y-2">
              {active.length === 0 && <p className="text-xs text-gray-500">No active huddles. Start one above.</p>}
              {active.map((h: any) => (
                <div key={h.huddleId} className="p-3 rounded-xl bg-gray-800/40 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <p className="text-sm font-semibold text-white truncate">{h.topic || "Untitled huddle"}</p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase ${TYPE_STYLE[h.type] || "bg-gray-700/60 text-gray-300"}`}>{h.type}</span>
                      {h.is_recording && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-900/60 text-red-300 border border-red-700/40 animate-pulse">● recording</span>}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">
                      {h.roomId} · started by {h.started_by} · {h.participant_count}/{h.max_participants} participants · {(h.duration ?? 0) > 0 ? `${Math.floor(h.duration / 60)}m ${h.duration % 60}s` : "just started"}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {(h.participants || []).map((p: any) => (
                        <span key={p.user_id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-n0va-900/60 text-n0va-300 border border-n0va-700/40">
                          {p.user_id}{p.role === "host" ? " ⭐" : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 flex-wrap">
                    <button className="btn-secondary text-xs" disabled={busy === `join-${h.huddleId}`} onClick={() => act(`join-${h.huddleId}`, () => api.adsMarketingModule.chat.joinHuddle(h.huddleId, me()))}>
                      <Users className="w-3.5 h-3.5 inline mr-1" />Join
                    </button>
                    <button className="btn-secondary text-xs" disabled={busy === `rec-${h.huddleId}`} onClick={() => act(`rec-${h.huddleId}`, () => h.is_recording ? api.adsMarketingModule.chat.stopRecording(h.huddleId) : api.adsMarketingModule.chat.startRecording(h.huddleId))}>
                      {h.is_recording ? <Square className="w-3.5 h-3.5 inline mr-1" /> : <Mic className="w-3.5 h-3.5 inline mr-1" />}{h.is_recording ? "Stop rec" : "Record"}
                    </button>
                    <button className="btn-danger text-xs" disabled={busy === `end-${h.huddleId}`} onClick={() => act(`end-${h.huddleId}`, () => api.adsMarketingModule.chat.endHuddle(h.huddleId))}>
                      <PhoneOff className="w-3.5 h-3.5 inline mr-1" />End
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-n0va-400" /> Past huddles <span className="text-[11px] text-gray-500">· {ended.length}</span></h2>
            <div className="space-y-1.5">
              {ended.length === 0 && <p className="text-xs text-gray-500">No past huddles yet.</p>}
              {ended.map((h: any) => (
                <div key={h.huddleId} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-gray-800/40">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase ${TYPE_STYLE[h.type] || "bg-gray-700/60 text-gray-300"}`}>{h.type}</span>
                  <span className="text-gray-200 truncate flex-1">{h.topic || h.roomId}</span>
                  <span className="text-gray-500 shrink-0">{h.participant_count} joined</span>
                  <span className="text-gray-500 shrink-0">{h.duration ? `${Math.floor(h.duration / 60)}m` : "—"}</span>
                </div>
              ))}
            </div>
          </div>

          {wall?.months && (
            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-n0va-400" /> Activity wall</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {wall.months.map((m: any) => (
                  <div key={m.month} className="p-3 rounded-xl bg-gray-800/40">
                    <p className="text-[10px] text-gray-500 uppercase">{m.month}</p>
                    <p className="text-lg font-bold text-white">{m.count}</p>
                    <p className="text-[10px] text-gray-500">{m.participants} participants</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
