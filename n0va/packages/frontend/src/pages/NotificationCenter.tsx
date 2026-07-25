import { useEffect, useState, useMemo } from "react";
import { Bell, AlertTriangle, DollarSign, TrendingUp, Bot, Info, CheckCheck, X, RefreshCw, Filter, ChevronDown, ChevronRight, Settings, BellOff, CheckSquare, Square, Trash2, Loader } from "lucide-react";
import { api } from "../api/client";
import { useFraudAlerts, useBudgetAlerts } from "../hooks/useSocket";
import { useToast } from "../components/Toast";
import { SkeletonRow } from "../components/Skeleton";
import { Link } from "react-router-dom";

const typeIcons: Record<string, any> = {
  fraud_alert: AlertTriangle, budget_alert: DollarSign,
  campaign_update: TrendingUp, agent_status: Bot, system: Info,
};

const severityColors: Record<string, string> = {
  error: "bg-red-500/10 border-red-500/30 text-red-400",
  warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
  success: "bg-green-500/10 border-green-500/30 text-green-400",
  info: "bg-blue-500/10 border-blue-500/30 text-blue-400",
};

type GroupBy = "none" | "type" | "date";

function getDateGroup(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
  if (d >= today) return "Today";
  if (d >= yesterday) return "Yesterday";
  if (d >= thisWeekStart) return "This Week";
  return "Older";
}

export default function NotificationCenter() {
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showLiveOnly, setShowLiveOnly] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>("date");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dismissedTypes, setDismissedTypes] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const fraudAlerts = useFraudAlerts();
  const budgetAlerts = useBudgetAlerts();

  useEffect(() => { loadNotifications(); }, []);

  async function loadNotifications() {
    setLoading(true);
    try { setNotifications(await api.notifications.list()); } finally { setLoading(false); }
  }

  const liveAlerts = [
    ...fraudAlerts.map((a: any, i: number) => ({
      id: `live_fraud_${Date.now()}_${i}`,
      tenantId: "tenant_001", type: "fraud_alert", title: "Live Fraud Alert",
      message: a.message || a.description || "Suspicious activity detected",
      severity: "error", read: false, link: "/fraud-evaluation",
      createdAt: new Date().toISOString(),
    })),
    ...budgetAlerts.map((a: any, i: number) => ({
      id: `live_budget_${Date.now()}_${i}`,
      tenantId: "tenant_001", type: "budget_alert", title: "Live Budget Alert",
      message: a.message || "Budget threshold crossed",
      severity: "warning", read: false, link: "/budget-strategy",
      createdAt: new Date().toISOString(),
    })),
  ];

  const allItems = useMemo(() => {
    const items = showLiveOnly ? liveAlerts : [...liveAlerts, ...notifications];
    return items.filter(n => !dismissedTypes.has(n.type)).filter(n => {
      if (filter === "unread") return !n.read;
      if (filter !== "all") return n.type === filter;
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notifications, liveAlerts, showLiveOnly, filter, dismissedTypes]);

  const grouped = useMemo(() => {
    if (groupBy === "none") return { "All": allItems };
    if (groupBy === "type") {
      const map: Record<string, any[]> = {};
      allItems.forEach(n => { const g = n.type || "other"; if (!map[g]) map[g] = []; map[g].push(n); });
      return map;
    }
    const map: Record<string, any[]> = {};
    allItems.forEach(n => { const g = getDateGroup(n.createdAt); if (!map[g]) map[g] = []; map[g].push(n); });
    return map;
  }, [allItems, groupBy]);

  const unreadCount = notifications.filter(n => !n.read).length;

  async function markAllRead() {
    try { await api.notifications.markAllRead(); setNotifications(prev => prev.map(n => ({ ...n, read: true }))); addToast("success", "All marked read"); }
    catch { addToast("error", "Failed to mark all as read"); }
  }

  async function markRead(id: string) {
    try { await api.notifications.markRead(id); setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n)); }
    catch { }
  }

  async function dismissNotification(id: string) {
    try { await api.notifications.delete(id); setNotifications(prev => prev.filter(n => n._id !== id)); }
    catch { setNotifications(prev => prev.filter(n => n._id !== id)); }
  }

  async function dismissSelected() {
    const ids = [...selected];
    for (const id of ids) {
      const n = notifications.find(n => n._id === id);
      if (n) await dismissNotification(id);
    }
    setSelected(new Set());
    addToast("success", `${ids.length} dismissed`);
  }

  function dismissType(type: string) {
    setDismissedTypes(prev => new Set([...prev, type]));
    addToast("success", `${type.replace("_", " ")} notifications hidden`);
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function toggleSelectAll(ids: string[]) {
    if (ids.every(id => selected.has(id))) setSelected(new Set());
    else setSelected(new Set(ids));
  }

  const groupOrder = groupBy === "date" ? ["Today", "Yesterday", "This Week", "Older"] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Bell className="w-6 h-6 text-n0va-400" />
            Notifications
          </h1>
          <p className="text-gray-500 mt-1">{unreadCount} unread{liveAlerts.length > 0 ? ` · ${liveAlerts.length} live` : ""} · {allItems.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          {selectMode ? (
            <div className="flex items-center gap-1.5">
              <button onClick={() => { setSelected(new Set()); setSelectMode(false); }} className="btn-ghost text-xs">Cancel</button>
              <button onClick={dismissSelected} className="btn-secondary text-xs flex items-center gap-1" disabled={selected.size === 0}>
                <Trash2 className="w-3.5 h-3.5" /> Dismiss ({selected.size})
              </button>
            </div>
          ) : (
            <>
              <button onClick={() => setSelectMode(true)} className="btn-ghost text-xs">Select</button>
              <button className="btn-secondary text-xs flex items-center gap-1.5" onClick={markAllRead}>
                <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
              </button>
            </>
          )}
          <button className="btn-secondary text-xs p-1.5" onClick={loadNotifications}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {["all", "unread", "fraud_alert", "budget_alert", "campaign_update", "agent_status", "system"].map(f => (
          <button key={f} className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${filter === f ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500"}`} onClick={() => setFilter(f)}>
            {f === "fraud_alert" ? "Fraud" : f === "budget_alert" ? "Budget" : f === "campaign_update" ? "Campaign" : f === "agent_status" ? "Agents" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <div className="w-px h-5 bg-gray-800 mx-1" />
        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer ml-1">
          <input type="checkbox" checked={showLiveOnly} onChange={() => setShowLiveOnly(!showLiveOnly)} className="rounded border-gray-600" />
          Live only
        </label>
        <select className="input text-xs py-1 w-auto ml-1" value={groupBy} onChange={e => setGroupBy(e.target.value as GroupBy)}>
          <option value="date">Group by Date</option>
          <option value="type">Group by Type</option>
          <option value="none">No Grouping</option>
        </select>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}</div>
        ) : allItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Bell className="w-10 h-10 mx-auto mb-2" />
            <p>No notifications</p>
          </div>
        ) : (
          Object.entries(grouped).map(([groupLabel, items]) => (
            <div key={groupLabel}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{groupLabel} ({items.length})</h3>
                {selectMode && (
                  <button className="text-xs text-gray-500 hover:text-white" onClick={() => {
                    const ids = items.map(n => n._id || n.id).filter(Boolean);
                    if (ids.every(id => selected.has(id))) ids.forEach(id => toggleSelect(id));
                    else ids.forEach(id => { if (!selected.has(id)) toggleSelect(id); });
                  }}>Select All</button>
                )}
              </div>
              <div className="space-y-1.5">
                {items.map(n => {
                  const Icon = typeIcons[n.type] || Info;
                  const itemId = n._id || n.id;
                  const isSelected = selected.has(itemId);
                  return (
                    <div key={itemId} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${n.read && !isSelected ? "border-gray-800 bg-gray-900/50" : isSelected ? "border-n0va-500/40 bg-n0va-600/10" : "border-gray-700 bg-gray-800/80"}`}>
                      {selectMode && (
                        <button onClick={() => toggleSelect(itemId)} className="mt-1 shrink-0">
                          {isSelected ? <CheckSquare className="w-4 h-4 text-n0va-400" /> : <Square className="w-4 h-4 text-gray-600" />}
                        </button>
                      )}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${severityColors[n.severity]}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {n.link ? (
                            <Link to={n.link} className="text-sm text-white font-medium hover:text-n0va-400">{n.title}</Link>
                          ) : (
                            <span className="text-sm text-white font-medium">{n.title}</span>
                          )}
                          {!n.read && <span className="w-2 h-2 bg-n0va-500 rounded-full shrink-0" />}
                        </div>
                        <p className="text-sm text-gray-400 mt-0.5">{n.message}</p>
                        <p className="text-xs text-gray-600 mt-1">{getTimeAgo(n.createdAt)}</p>
                      </div>
                      {!selectMode && (
                        <div className="flex items-center gap-1 shrink-0">
                          {!n.read && n._id && <button onClick={() => markRead(n._id as string)} className="text-gray-600 hover:text-n0va-400"><CheckCheck className="w-3.5 h-3.5" /></button>}
                          {n._id && <button onClick={() => dismissNotification(n._id as string)} className="text-gray-600 hover:text-gray-400"><X className="w-3.5 h-3.5" /></button>}
                          <button onClick={() => dismissType(n.type)} className="text-gray-600 hover:text-red-400" title="Hide this type"><BellOff className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function getTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
