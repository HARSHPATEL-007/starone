import { useEffect, useState, useCallback } from "react";
import { Bell, RefreshCw, AlertTriangle, CheckCheck, Trash2, X, BellRing, Sparkles, Mail, ExternalLink } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const SEV_COLOR: Record<string, string> = {
  info: "bg-n0va-500/15 text-n0va-300 border-n0va-500/30",
  warning: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  critical: "bg-red-500/15 text-red-300 border-red-500/30",
};

const TYPE_DOT: Record<string, string> = {
  info: "bg-n0va-400",
  warning: "bg-amber-400",
  critical: "bg-red-400",
};

export default function MailNotifications() {
  const { addToast } = useToast();
  const [center, setCenter] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [list, setList] = useState<any[]>([]);

  const load = useCallback(async () => {
    const [c, s, l] = await Promise.all([
      api.adsMarketingModule.mailNotificationCenter().catch(() => null),
      api.adsMarketingModule.mailNotificationSettings().catch(() => null),
      api.adsMarketingModule.mailNotifications({ limit: 50 }).catch(() => null),
    ]);
    setCenter(unwrap(c));
    setSettings(unwrap(s));
    setList(Array.isArray(l) ? l : unwrap(l)?.notifications || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    function refresh() { load(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [load]);
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [autoRefresh, load]);

  async function collect() {
    setBusy("collect");
    const r = unwrap(await api.adsMarketingModule.mailCollectAlerts().catch(() => null));
    if (r?.summary) addToast("info", r.summary); else addToast("error", "Alert scan failed");
    setBusy(null);
    load();
  }

  async function markAllRead() {
    setBusy("allread");
    const r = unwrap(await api.adsMarketingModule.mailMarkAllNotificationsRead().catch(() => null));
    if (r?.summary) addToast("success", r.summary);
    setBusy(null);
    load();
  }

  async function clearAll() {
    if (!confirm("Clear all notifications?")) return;
    setBusy("clear");
    const r = unwrap(await api.adsMarketingModule.mailClearNotifications().catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setBusy(null);
    load();
  }

  async function markRead(n: any) {
    setBusy("r" + n.notificationId);
    await api.adsMarketingModule.mailMarkNotificationRead(n.notificationId).catch(() => null);
    setBusy(null);
    load();
  }

  async function remove(n: any) {
    setBusy("d" + n.notificationId);
    await api.adsMarketingModule.mailDeleteNotification(n.notificationId).catch(() => null);
    setBusy(null);
    load();
  }

  async function toggleType(type: string, enabled: boolean) {
    setBusy("s" + type);
    const r = unwrap(await api.adsMarketingModule.mailUpdateNotificationSettings({ [type]: enabled }).catch(() => null));
    if (r?.summary) addToast("success", r.summary); else addToast("error", "Settings update failed");
    setBusy(null);
    load();
  }

  const visible = filter ? list.filter((n: any) => n.type === filter) : list;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Bell className="w-6 h-6 text-n0va-400" /> Mail Notifications</h1>
          <p className="text-gray-500 mt-1 text-sm">Alert center — due follow-ups, approvals, incidents & billing</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="w-3.5 h-3.5 text-n0va-600 bg-gray-700 border-gray-600 rounded" />
            Auto-refresh 30s
          </label>
          <button className="btn-secondary p-2" onClick={load} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary text-xs" onClick={markAllRead} disabled={busy === "allread"}><CheckCheck className="w-3.5 h-3.5" /> Mark all read</button>
          <button className="btn-secondary text-xs" onClick={clearAll} disabled={busy === "clear"}><Trash2 className="w-3.5 h-3.5" /> Clear all</button>
          <button className="btn-primary text-xs" onClick={collect} disabled={busy === "collect"}>
            <Sparkles className="w-3.5 h-3.5" /> {busy === "collect" ? "Scanning…" : "Scan for alerts"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : !center ? (
        <div className="card border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div className="text-sm text-red-300">Could not load notifications — backend unreachable.</div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card">
              <div className="text-xs text-gray-500">Total</div>
              <div className="text-xl font-bold text-white mt-1">{center.total}</div>
              <div className="text-xs text-gray-500 mt-1">notifications</div>
            </div>
            <div className="card">
              <div className="text-xs text-gray-500">Unread</div>
              <div className="text-xl font-bold text-white mt-1">{center.unread}</div>
              <div className="text-xs text-gray-500 mt-1">{center.unread ? "needs attention" : "all caught up"}</div>
            </div>
            <div className="card">
              <div className="text-xs text-gray-500">Alert types</div>
              <div className="text-xl font-bold text-white mt-1">{(center.byType || []).length}</div>
              <div className="text-xs text-gray-500 mt-1">active categories</div>
            </div>
            <div className="card">
              <div className="text-xs text-gray-500">Summary</div>
              <div className="text-xs text-gray-400 mt-1 leading-relaxed break-words">{center.summary}</div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="card lg:col-span-2">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3 className="text-sm font-semibold text-white flex items-center gap-1.5"><BellRing className="w-4 h-4 text-n0va-400" /> Notifications</h3>
                {filter && (
                  <button className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1" onClick={() => setFilter(null)}>
                    <X className="w-3 h-3" /> Clear filter
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
                {visible.length === 0 && (
                  <div className="flex flex-col items-center py-10 text-center">
                    <Bell className="w-8 h-8 text-gray-700" />
                    <div className="text-xs text-gray-500 mt-2">No notifications {filter ? "of this type" : "yet"} — run "Scan for alerts" to check the mailbox.</div>
                  </div>
                )}
                {visible.map((n: any) => (
                  <div key={n.notificationId} className={`bg-gray-900/60 rounded-lg px-3 py-2.5 border ${n.read ? "border-gray-800/60" : "border-n0va-500/25"}`}>
                    <div className="flex items-start gap-2">
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${TYPE_DOT[n.severity] || TYPE_DOT.info}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className={`text-xs font-semibold ${n.read ? "text-gray-400" : "text-white"}`}>{n.title}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full border shrink-0 ${SEV_COLOR[n.severity] || SEV_COLOR.info}`}>{n.severity}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 break-words">{n.message}</p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="text-[10px] text-gray-600">{String(n.createdAt || "").slice(0, 19).replace("T", " ")}</span>
                          <a href={n.link} className="text-[10px] text-n0va-400 hover:text-n0va-300 flex items-center gap-0.5">
                            <ExternalLink className="w-2.5 h-2.5" /> {n.link}
                          </a>
                          <div className="flex items-center gap-1 ml-auto">
                            {!n.read && (
                              <button className="text-[10px] text-gray-500 hover:text-white flex items-center gap-1" disabled={busy === "r" + n.notificationId} onClick={() => markRead(n)}>
                                <CheckCheck className="w-3 h-3" /> Read
                              </button>
                            )}
                            <button className="text-gray-600 hover:text-red-400 p-0.5" disabled={busy === "d" + n.notificationId} onClick={() => remove(n)} title="Delete">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-2">By type</h3>
                <div className="flex flex-wrap gap-1.5">
                  {(center.byType || []).map((t: any) => (
                    <button key={t.type} onClick={() => setFilter(filter === t.type ? null : t.type)}
                      className={`text-[10px] px-2 py-1 rounded-full border ${filter === t.type ? "bg-n0va-500/20 border-n0va-500/40 text-n0va-300" : "bg-gray-900/60 border-gray-700 text-gray-400 hover:text-white"}`}>
                      {t.label} · {t.count}{t.unread ? ` (${t.unread})` : ""}
                    </button>
                  ))}
                  {(center.byType || []).length === 0 && <div className="text-xs text-gray-500">No alerts yet.</div>}
                </div>
              </div>
              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-1.5"><Mail className="w-4 h-4 text-n0va-400" /> Alert types</h3>
                <div className="space-y-1.5">
                  {(Object.entries((settings?.types || {}))).map(([type, enabled]) => (
                    <label key={type} className="flex items-center justify-between gap-2 cursor-pointer group">
                      <span className="text-xs text-gray-400 group-hover:text-gray-300">{type}</span>
                      <button
                        className={`text-[9px] px-2 py-0.5 rounded-full border ${enabled ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-gray-800 text-gray-500 border-gray-700"}`}
                        disabled={busy === "s" + type}
                        onClick={(e) => { e.preventDefault(); toggleType(type, !enabled); }}
                      >
                        {enabled ? "On" : "Off"}
                      </button>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
