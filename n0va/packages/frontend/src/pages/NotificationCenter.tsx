import { useState } from "react";
import { Notification } from "../types";
import { Bell, AlertTriangle, DollarSign, TrendingUp, Bot, Info, CheckCheck, X, RefreshCw } from "lucide-react";
import { useFraudAlerts, useBudgetAlerts } from "../hooks/useSocket";

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: "n1", tenantId: "tenant_001", type: "budget_alert", title: "Budget Exceeded", message: "Campaign 'Summer Sale' has spent 90% of its budget", severity: "warning", read: false, link: "/campaigns", createdAt: new Date(Date.now() - 600000).toISOString() },
  { id: "n2", tenantId: "tenant_001", type: "campaign_update", title: "Campaign Launched", message: "Brand Awareness campaign is now active across 3 platforms", severity: "success", read: false, link: "/campaigns/camp_002", createdAt: new Date(Date.now() - 1800000).toISOString() },
  { id: "n3", tenantId: "tenant_001", type: "fraud_alert", title: "Suspicious Activity Detected", message: "Unusual click pattern detected on 'Retargeting Q3'", severity: "error", read: false, link: "/fraud-evaluation", createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "n4", tenantId: "tenant_001", type: "agent_status", title: "Agent Completed Run", message: "Budget Agent reallocated $2,400 across 4 campaigns", severity: "info", read: true, link: "/agents", createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: "n5", tenantId: "tenant_001", type: "budget_alert", title: "ROAS Threshold Reached", message: "Prospecting campaign reached 3.2x ROAS, exceeding 2.5x target", severity: "success", read: true, link: "/campaigns/camp_003", createdAt: new Date(Date.now() - 14400000).toISOString() },
  { id: "n6", tenantId: "tenant_001", type: "fraud_alert", title: "Flag Resolved", message: "Fraud flag on placement ID 'pl_0472' was auto-resolved", severity: "info", read: true, link: "/fraud-evaluation", createdAt: new Date(Date.now() - 28800000).toISOString() },
  { id: "n7", tenantId: "tenant_001", type: "system", title: "Weekly Report Ready", message: "Your weekly performance report for Jul 14-20 is available", severity: "info", read: false, link: "/analytics", createdAt: new Date(Date.now() - 43200000).toISOString() },
  { id: "n8", tenantId: "tenant_001", type: "campaign_update", title: "Creative Fatigue Detected", message: "2 creatives in 'Retargeting Q3' showing CTR decline", severity: "warning", read: false, link: "/creative-ab-test", createdAt: new Date(Date.now() - 86400000).toISOString() },
];

const typeIcons: Record<string, any> = {
  fraud_alert: AlertTriangle,
  budget_alert: DollarSign,
  campaign_update: TrendingUp,
  agent_status: Bot,
  system: Info,
};

const severityColors: Record<string, string> = {
  error: "bg-red-500/10 border-red-500/30 text-red-400",
  warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
  success: "bg-green-500/10 border-green-500/30 text-green-400",
  info: "bg-blue-500/10 border-blue-500/30 text-blue-400",
};

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState<string>("all");
  const [showLiveOnly, setShowLiveOnly] = useState(false);

  const fraudAlerts = useFraudAlerts();
  const budgetAlerts = useBudgetAlerts();

  const liveAlerts = [
    ...fraudAlerts.map((a: any) => ({
      id: `live_fraud_${Date.now()}_${Math.random()}`,
      tenantId: "tenant_001",
      type: "fraud_alert" as const,
      title: "Live Fraud Alert",
      message: a.message || a.description || "Suspicious activity detected",
      severity: "error" as const,
      read: false,
      link: "/fraud-evaluation",
      createdAt: new Date().toISOString(),
    })),
    ...budgetAlerts.map((a: any) => ({
      id: `live_budget_${Date.now()}_${Math.random()}`,
      tenantId: "tenant_001",
      type: "budget_alert" as const,
      title: "Live Budget Alert",
      message: a.message || "Budget threshold crossed",
      severity: "warning" as const,
      read: false,
      link: "/budget-strategy",
      createdAt: new Date().toISOString(),
    })),
  ];

  const allItems = showLiveOnly ? liveAlerts : [...liveAlerts, ...notifications];

  const filtered = allItems.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter !== "all") return n.type === filter;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function dismissNotification(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
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
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Bell className="w-10 h-10 mx-auto mb-2" />
            <p>No notifications</p>
          </div>
        ) : (
          filtered.map((n) => {
            const Icon = typeIcons[n.type] || Info;
            return (
              <div key={n.id} className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${n.read ? "border-gray-800 bg-gray-900/50" : "border-gray-700 bg-gray-800/80"} ${severityColors[n.severity] ? "" : ""}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${severityColors[n.severity]}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-medium">{n.title}</span>
                    {!n.read && <span className="w-2 h-2 bg-n0va-500 rounded-full" />}
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5">{n.message}</p>
                  <p className="text-xs text-gray-600 mt-1">{getTimeAgo(n.createdAt)}</p>
                </div>
                <button onClick={() => dismissNotification(n.id)} className="text-gray-600 hover:text-gray-400 flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
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
