import { useEffect, useState } from "react";
import { Notification } from "../types";
import { Bell, AlertTriangle, DollarSign, TrendingUp, Bot, Info, CheckCheck, X, RefreshCw } from "lucide-react";
import { api } from "../api/client";
import { useFraudAlerts, useBudgetAlerts } from "../hooks/useSocket";
import { useToast } from "../components/Toast";
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

export default function NotificationCenter() {
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showLiveOnly, setShowLiveOnly] = useState(false);

  const fraudAlerts = useFraudAlerts();
  const budgetAlerts = useBudgetAlerts();

  useEffect(() => { loadNotifications(); }, []);

  async function loadNotifications() {
    setLoading(true);
    try { setNotifications(await api.notifications.list()); } finally { setLoading(false); }
  }

  const liveAlerts = [
    ...fraudAlerts.map((a: any) => ({
      id: `live_fraud_${Date.now()}_${Math.random()}`,
      tenantId: "tenant_001", type: "fraud_alert", title: "Live Fraud Alert",
      message: a.message || a.description || "Suspicious activity detected",
      severity: "error", read: false, link: "/fraud-evaluation",
      createdAt: new Date().toISOString(),
    })),
    ...budgetAlerts.map((a: any) => ({
      id: `live_budget_${Date.now()}_${Math.random()}`,
      tenantId: "tenant_001", type: "budget_alert", title: "Live Budget Alert",
      message: a.message || "Budget threshold crossed",
      severity: "warning", read: false, link: "/budget-strategy",
      createdAt: new Date().toISOString(),
    })),
  ];

  const allItems = showLiveOnly ? liveAlerts : [...liveAlerts, ...notifications];

  const filtered = allItems.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter !== "all") return n.type === filter;
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markAllRead() {
    try { await api.notifications.markAllRead(); setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))); }
    catch { addToast("error", "Failed to mark all as read"); }
  }

  async function markRead(id: string) {
    try { await api.notifications.markRead(id); setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n)); }
    catch { addToast("error", "Failed to mark as read"); }
  }

  async function dismissNotification(id: string) {
    try { await api.notifications.delete(id); setNotifications((prev) => prev.filter((n) => n._id !== id)); }
    catch { setNotifications((prev) => prev.filter((n) => n._id !== id)); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-gray-500 mt-1">
            {unreadCount} unread{liveAlerts.length > 0 ? ` · ${liveAlerts.length} live` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={showLiveOnly} onChange={() => setShowLiveOnly(!showLiveOnly)} className="rounded border-gray-600" />
            Live only
          </label>
          <button className="btn-secondary text-xs flex items-center gap-1.5" onClick={markAllRead}>
            <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
          </button>
          <button className="btn-secondary text-xs flex items-center gap-1.5" onClick={loadNotifications}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {["all", "unread", "fraud_alert", "budget_alert", "campaign_update", "agent_status", "system"].map((f) => (
          <button key={f} className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${filter === f ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500"}`} onClick={() => setFilter(f)}>
            {f === "fraud_alert" ? "Fraud" : f === "budget_alert" ? "Budget" : f === "campaign_update" ? "Campaign" : f === "agent_status" ? "Agents" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-n0va-500 border-t-transparent rounded-full" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Bell className="w-10 h-10 mx-auto mb-2" />
            <p>No notifications</p>
          </div>
        ) : (
          filtered.map((n) => {
            const Icon = typeIcons[n.type] || Info;
            const itemId = n._id || n.id;
            return (
              <div key={itemId} className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${n.read ? "border-gray-800 bg-gray-900/50" : "border-gray-700 bg-gray-800/80"}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${severityColors[n.severity]}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {n.link ? (
                      <Link to={n.link} className="text-sm text-white font-medium hover:text-n0va-400">{n.title}</Link>
                    ) : (
                      <span className="text-sm text-white font-medium">{n.title}</span>
                    )}
                    {!n.read && <span className="w-2 h-2 bg-n0va-500 rounded-full" />}
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5">{n.message}</p>
                  <p className="text-xs text-gray-600 mt-1">{getTimeAgo(n.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1">
                  {!n.read && <button onClick={() => n._id && markRead(n._id)} className="text-gray-600 hover:text-n0va-400"><CheckCheck className="w-4 h-4" /></button>}
                  <button onClick={() => n._id ? dismissNotification(n._id) : null} className="text-gray-600 hover:text-gray-400"><X className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })
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
