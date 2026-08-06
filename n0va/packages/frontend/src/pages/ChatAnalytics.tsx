import { useEffect, useState, useCallback } from "react";
import {
  BarChart3, RefreshCw, Hash, Users, Clock, Smile, Activity, TrendingUp, MessageSquare,
} from "lucide-react";
import { api } from "../api/client";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

export default function ChatAnalytics() {
  const [dash, setDash] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const d = unwrap(await api.adsMarketingModule.chat.analyticsDashboard().catch(() => null));
    setDash(d);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const report = dash?.report || {};
  const volume = dash?.volume_7d || [];
  const topRooms = dash?.top_rooms || [];
  const topUsers = dash?.top_users || [];
  const sentiment = dash?.sentiment || {};
  const maxVol = Math.max(1, ...volume.map((b: any) => b.count ?? 0));
  const sentTotal = Math.max(1, (sentiment.positive ?? 0) + (sentiment.neutral ?? 0) + (sentiment.negative ?? 0));

  const bars = [
    { label: "positive", value: sentiment.positive ?? 0, color: "bg-emerald-500" },
    { label: "neutral", value: sentiment.neutral ?? 0, color: "bg-gray-500" },
    { label: "negative", value: sentiment.negative ?? 0, color: "bg-red-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><BarChart3 className="w-6 h-6 text-n0va-400" /> Chat Analytics</h1>
          <p className="text-gray-500 mt-1 text-sm">Volume, top rooms, activity, response times and sentiment</p>
        </div>
        <button className="btn-secondary p-2" onClick={load} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : !dash ? (
        <div className="card"><p className="text-xs text-gray-500">Analytics data unavailable.</p></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="card !p-4"><p className="text-2xl font-bold text-white">{report.messages ?? 0}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Messages</p></div>
            <div className="card !p-4"><p className="text-2xl font-bold text-n0va-400">{report.rooms ?? 0}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Rooms</p></div>
            <div className="card !p-4"><p className="text-2xl font-bold text-emerald-400">{report.active_users ?? 0}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Active users</p></div>
            <div className="card !p-4"><p className="text-2xl font-bold text-sky-400">{report.threads ?? 0}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Threads</p></div>
            <div className="card !p-4"><p className="text-2xl font-bold text-amber-400">{report.avg_response_min ?? "—"}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Avg response (min)</p></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 card">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Activity className="w-4 h-4 text-n0va-400" /> 7-day message volume</h2>
              <div className="flex items-end gap-1.5 h-40">
                {volume.map((b: any) => (
                  <div key={b.date} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="w-full rounded-t bg-n0va-600/70 hover:bg-n0va-500 transition-colors" style={{ height: `${Math.max(4, ((b.count ?? 0) / maxVol) * 100)}%` }} />
                    <span className="text-[9px] text-gray-500">{b.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Smile className="w-4 h-4 text-n0va-400" /> Sentiment</h2>
              <div className="space-y-2">
                {bars.map((b) => (
                  <div key={b.label}>
                    <div className="flex justify-between text-[11px] mb-1"><span className="text-gray-400">{b.label}</span><span className="text-gray-200 font-semibold">{b.value}</span></div>
                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${b.color}`} style={{ width: `${((b.value ?? 0) / sentTotal) * 100}%` }} />
                    </div>
                  </div>
                ))}
                <p className="text-[11px] text-gray-500 pt-1">{dash?.sentiment?.summary || "Neural sentiment trend across sampled messages."}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Hash className="w-4 h-4 text-n0va-400" /> Top rooms</h2>
              <div className="space-y-1.5">
                {topRooms.length === 0 && <p className="text-xs text-gray-500">No data yet.</p>}
                {topRooms.map((r: any, i: number) => (
                  <div key={r.roomId || i} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-gray-800/40">
                    <span className="text-gray-500 w-5">{i + 1}</span>
                    <span className="text-gray-200 truncate flex-1">{r.room_name || r.roomId}</span>
                    <span className="text-n0va-300 font-semibold shrink-0">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Users className="w-4 h-4 text-n0va-400" /> Top users</h2>
              <div className="space-y-1.5">
                {topUsers.length === 0 && <p className="text-xs text-gray-500">No data yet.</p>}
                {topUsers.map((u: any, i: number) => (
                  <div key={u.userId || i} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-gray-800/40">
                    <span className="text-gray-500 w-5">{i + 1}</span>
                    <span className="text-gray-200 truncate flex-1">{u.userId}</span>
                    <span className="text-gray-400 shrink-0">{u.sent ?? 0} sent</span>
                    <span className="text-gray-500 shrink-0">· {u.reactions ?? 0} reactions</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}