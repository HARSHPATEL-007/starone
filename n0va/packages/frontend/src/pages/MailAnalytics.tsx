import { useEffect, useState, useCallback } from "react";
import { BarChart3, RefreshCw, TrendingUp, Send, Inbox, Timer, Clock3, Layers } from "lucide-react";
import { api } from "../api/client";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const BAR_COLORS = ["bg-n0va-500", "bg-n0va-400", "bg-amber-500", "bg-green-500", "bg-purple-500", "bg-rose-500"];

export default function MailAnalytics() {
  const [exec, setExec] = useState<any>(null);
  const [trend, setTrend] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [senders, setSenders] = useState<any[]>([]);
  const [response, setResponse] = useState<any>(null);
  const [hours, setHours] = useState<any>(null);
  const [folders, setFolders] = useState<any[]>([]);
  const [mailboxes, setMailboxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    const [e, t, c, s, r, h, f, m] = await Promise.all([
      api.adsMarketingModule.mailAnalyticsExecutive().catch(() => null),
      api.adsMarketingModule.mailAnalyticsTrend(14).catch(() => null),
      api.adsMarketingModule.mailAnalyticsCategories().catch(() => null),
      api.adsMarketingModule.mailAnalyticsSenders(5).catch(() => null),
      api.adsMarketingModule.mailAnalyticsResponseTimes().catch(() => null),
      api.adsMarketingModule.mailAnalyticsHours().catch(() => null),
      api.adsMarketingModule.mailAnalyticsFolders().catch(() => null),
      api.adsMarketingModule.mailAnalyticsMailboxes().catch(() => null),
    ]);
    setExec(unwrap(e));
    setTrend(unwrap(t));
    const cl = unwrap(c);
    setCategories(Array.isArray(cl) ? cl : cl?.data || []);
    const sl = unwrap(s);
    setSenders(Array.isArray(sl) ? sl : sl?.data || []);
    setResponse(unwrap(r));
    setHours(unwrap(h));
    const fl = unwrap(f);
    setFolders(Array.isArray(fl) ? fl : fl?.data || []);
    const ml = unwrap(m);
    setMailboxes(ml?.mailboxes || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    function refresh() { loadAll(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadAll]);

  const maxTrend = Math.max(1, ...(trend?.trend || []).map((t: any) => t.total));
  const maxCat = Math.max(1, ...categories.map((c: any) => c.count));
  const maxSender = Math.max(1, ...senders.map((s: any) => s.count));
  const maxHour = Math.max(1, ...(hours?.hours || []).map((h: any) => h.count));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><BarChart3 className="w-6 h-6 text-n0va-400" /> Mail analytics</h1>
          <p className="text-gray-500 mt-1 text-sm">{exec?.summary || "Volume, senders, categories and response behavior"}</p>
        </div>
        <button className="btn-secondary p-2" onClick={loadAll} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <>
          <div className="card p-4 bg-gradient-to-br from-n0va-500/10 to-transparent">
            <p className="text-xs text-n0va-300 font-semibold uppercase tracking-wide flex items-center gap-1 mb-1"><TrendingUp className="w-3.5 h-3.5" /> Executive summary</p>
            <p className="text-sm text-gray-300">{exec?.summary}</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{exec?.messages || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Messages</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{exec?.unread || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Unread</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{exec?.replyRate || 0}%</p>
              <p className="text-xs text-gray-500 mt-1">Reply rate</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-n0va-300">{exec?.avgResponse || "—"}</p>
              <p className="text-xs text-gray-500 mt-1">Avg response</p>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Inbox className="w-4 h-4 text-n0va-400" /> Volume — last 14 days</h3>
            <div className="flex items-end gap-1 h-32">
              {(trend?.trend || []).map((t: any) => (
                <div key={t.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <div className="w-full flex flex-col-reverse" style={{ height: `${(t.total / maxTrend) * 100}%` }}>
                    <div className={`w-full rounded-t ${t.total > 0 ? "bg-n0va-500" : "bg-gray-800"}`} style={{ minHeight: t.total > 0 ? 4 : 2 }} title={`${t.date}: ${t.total}`} />
                  </div>
                  <span className="text-[8px] text-gray-600 truncate">{t.date.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Layers className="w-4 h-4 text-n0va-400" /> Category mix</h3>
              {categories.map((c: any, i: number) => (
                <div key={c.category} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-300 capitalize">{c.category}</span>
                    <span className="text-gray-500">{c.count} · {c.pct}%</span>
                  </div>
                  <div className="h-2 rounded bg-gray-800 overflow-hidden">
                    <div className={`h-full rounded ${BAR_COLORS[i % BAR_COLORS.length]}`} style={{ width: `${(c.count / maxCat) * 100}%` }} />
                  </div>
                </div>
              ))}
              {categories.length === 0 && <p className="text-xs text-gray-500">No categorized messages yet</p>}
            </div>

            <div className="card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Send className="w-4 h-4 text-n0va-400" /> Top senders</h3>
              {senders.map((s: any) => (
                <div key={s.email} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-300 truncate">{s.name || s.email}</span>
                    <span className="text-gray-500 shrink-0 ml-2">{s.count} msg{s.count !== 1 ? "s" : ""}{s.unread ? ` · ${s.unread} unread` : ""}</span>
                  </div>
                  <div className="h-2 rounded bg-gray-800 overflow-hidden">
                    <div className="h-full rounded bg-amber-500" style={{ width: `${(s.count / maxSender) * 100}%` }} />
                  </div>
                </div>
              ))}
              {senders.length === 0 && <p className="text-xs text-gray-500">No sender activity yet</p>}
            </div>

            <div className="card p-4 space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Timer className="w-4 h-4 text-n0va-400" /> Response times</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-800/40 rounded-lg p-3">
                  <p className="text-lg font-bold text-white">{response?.avgResponse || "—"}</p>
                  <p className="text-[10px] text-gray-500">Average</p>
                </div>
                <div className="bg-gray-800/40 rounded-lg p-3">
                  <p className="text-lg font-bold text-green-400">{response?.minResponse || "—"}</p>
                  <p className="text-[10px] text-gray-500">Fastest</p>
                </div>
                <div className="bg-gray-800/40 rounded-lg p-3">
                  <p className="text-lg font-bold text-rose-400">{response?.maxResponse || "—"}</p>
                  <p className="text-[10px] text-gray-500">Slowest</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">{response?.summary}</p>
            </div>

            <div className="card p-4 space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Clock3 className="w-4 h-4 text-n0va-400" /> Busiest hours</h3>
              <div className="flex items-end gap-0.5 h-20">
                {(hours?.hours || []).map((h: any) => (
                  <div key={h.hour} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                    <div className={`w-full rounded-t ${h.count > 0 ? "bg-purple-500" : "bg-gray-800"}`} style={{ height: h.count > 0 ? Math.max(3, (h.count / maxHour) * 64) : 2 }} title={`${h.hour}:00 — ${h.count}`} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">{hours?.summary}</p>
            </div>

            <div className="card p-4 lg:col-span-2 space-y-2">
              <h3 className="text-sm font-semibold text-white mb-2">Mailboxes</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800">
                      <th className="py-2 pr-3 font-medium">Mailbox</th>
                      <th className="py-2 pr-3 font-medium text-right">Messages</th>
                      <th className="py-2 pr-3 font-medium text-right">Unread</th>
                      <th className="py-2 pr-3 font-medium text-right">Sent</th>
                      <th className="py-2 font-medium text-right">Storage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mailboxes.map((mb: any) => (
                      <tr key={mb.mailboxId} className="border-b border-gray-800/50">
                        <td className="py-2 pr-3 text-gray-300">{mb.mailboxName} <span className="text-gray-600">{mb.email}</span></td>
                        <td className="py-2 pr-3 text-right text-white">{mb.messages}</td>
                        <td className="py-2 pr-3 text-right text-amber-400">{mb.unread}</td>
                        <td className="py-2 pr-3 text-right text-gray-300">{mb.sent}</td>
                        <td className="py-2 text-right text-gray-400">{Math.round(mb.storageBytes / 1024)} KB</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold text-white mb-2">Activity by folder</h3>
            <div className="flex flex-wrap gap-2">
              {folders.map((f: any) => (
                <span key={f.folder} className="text-xs px-2.5 py-1 rounded-full bg-gray-500/10 text-gray-300">
                  {f.folder} · <span className="text-white font-semibold">{f.count}</span>
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
