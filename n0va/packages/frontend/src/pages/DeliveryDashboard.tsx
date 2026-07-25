import { useEffect, useState, useCallback } from "react";
import { Bell, Mail, MessageSquare, Smartphone, Globe, RefreshCw, RotateCcw, Send, Activity, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonRow, SkeletonCard } from "../components/Skeleton";

const CHANNEL_COLORS: Record<string, string> = {
  email: "#3b82f6", slack: "#8b5cf6", sms: "#10b981",
  webhook: "#f59e0b", in_app: "#6b7280",
};

const CHANNEL_ICONS: Record<string, any> = {
  email: Mail, slack: MessageSquare, sms: Smartphone,
  webhook: Globe, in_app: Bell,
};

const STATUS_BADGE: Record<string, string> = {
  delivered: "bg-green-500/10 text-green-400 border-green-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  retrying: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

const CHANNELS = ["email", "slack", "sms", "webhook", "in_app"];

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

export default function DeliveryDashboard() {
  const { addToast } = useToast();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<Set<string>>(new Set());
  const [showSendModal, setShowSendModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendForm, setSendForm] = useState({ title: "", message: "", channels: new Set<string>() });

  async function loadData() {
    try {
      const [d, s] = await Promise.all([api.delivery.list(), api.delivery.stats()]);
      setDeliveries(d);
      setStats(s);
    } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => { loadData(); const iv = setInterval(loadData, 10000); return () => clearInterval(iv); }, []);

  async function handleRetry(id: string) {
    setRetrying(prev => new Set(prev).add(id));
    try {
      await api.delivery.retry(id);
      addToast("success", "Retry initiated");
      loadData();
    } catch {
      addToast("error", "Retry failed");
    } finally {
      setRetrying(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  }

  function toggleChannel(ch: string) {
    setSendForm(prev => {
      const next = new Set(prev.channels);
      if (next.has(ch)) next.delete(ch); else next.add(ch);
      return { ...prev, channels: next };
    });
  }

  async function handleSendTest() {
    if (!sendForm.title || !sendForm.message || sendForm.channels.size === 0) {
      addToast("warning", "Fill in title, message, and select at least one channel");
      return;
    }
    setSending(true);
    try {
      await api.delivery.send({ notificationId: "test", title: sendForm.title, message: sendForm.message, channels: [...sendForm.channels] });
      addToast("success", "Test notification sent");
      setShowSendModal(false);
      setSendForm({ title: "", message: "", channels: new Set() });
      loadData();
    } catch {
      addToast("error", "Failed to send test notification");
    } finally {
      setSending(false);
    }
  }

  const channelData = CHANNELS.map(ch => ({
    name: ch === "in_app" ? "In-App" : ch.charAt(0).toUpperCase() + ch.slice(1),
    value: stats?.byChannel?.[ch] || 0,
    color: CHANNEL_COLORS[ch],
    key: ch,
  })).filter(d => d.value > 0);

  const statusData = ["pending", "delivered", "failed", "retrying"].map(s => ({
    status: s.charAt(0).toUpperCase() + s.slice(1),
    count: stats?.byStatus?.[s] || 0,
    key: s,
  }));

  const totalDeliveries = stats?.total ?? deliveries.length;
  const deliveredCount = stats?.byStatus?.delivered ?? 0;
  const failedCount = stats?.byStatus?.failed ?? 0;
  const successRate = totalDeliveries > 0 ? ((deliveredCount / totalDeliveries) * 100).toFixed(1) : "0.0";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">Delivery Dashboard</h1><p className="text-gray-500 mt-1">Notification delivery history and monitoring</p></div>
          <div className="animate-spin w-5 h-5 border-2 border-n0va-500 border-t-transparent rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Bell className="w-6 h-6 text-n0va-400" />
            Delivery Dashboard
          </h1>
          <p className="text-gray-500 mt-1">Notification delivery history and monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-primary text-xs flex items-center gap-1.5" onClick={() => setShowSendModal(true)}>
            <Send className="w-3.5 h-3.5" /> Send Test
          </button>
          <button className="btn-secondary p-1.5" onClick={loadData} title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Total Deliveries</span>
            <Activity className="w-4 h-4 text-n0va-400" />
          </div>
          <p className="text-2xl font-bold text-white">{totalDeliveries}</p>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Delivered</span>
            <CheckCircle className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-green-400">{deliveredCount}</p>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Failed</span>
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-400">{failedCount}</p>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Success Rate</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">{successRate}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Channel Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={channelData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" nameKey="name">
                  {channelData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px", color: "#f3f4f6" }} />
                <Legend formatter={(value) => <span className="text-gray-400 text-xs">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Status Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="status" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px", color: "#f3f4f6" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {statusData.map((entry) => {
                    const fill = entry.key === "delivered" ? "#10b981" : entry.key === "failed" ? "#ef4444" : entry.key === "pending" ? "#f59e0b" : "#3b82f6";
                    return <Cell key={entry.key} fill={fill} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Delivery Log</h3>
          <span className="text-xs text-gray-500">{deliveries.length} entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs text-gray-500 uppercase tracking-wider pb-3 pr-4">Channel</th>
                <th className="text-left text-xs text-gray-500 uppercase tracking-wider pb-3 pr-4">Recipient</th>
                <th className="text-left text-xs text-gray-500 uppercase tracking-wider pb-3 pr-4">Status</th>
                <th className="text-left text-xs text-gray-500 uppercase tracking-wider pb-3 pr-4">Attempts</th>
                <th className="text-left text-xs text-gray-500 uppercase tracking-wider pb-3 pr-4">Created At</th>
                <th className="text-right text-xs text-gray-500 uppercase tracking-wider pb-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-gray-500 py-8">No deliveries found</td></tr>
              ) : (
                deliveries.map((d: any) => {
                  const Icon = CHANNEL_ICONS[d.channel] || Bell;
                  const id = d._id || d.id;
                  return (
                    <tr key={id} className="border-b border-gray-800/50 last:border-0">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" style={{ color: CHANNEL_COLORS[d.channel] || "#6b7280" }} />
                          <span className="text-white capitalize">{d.channel === "in_app" ? "In-App" : d.channel}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-gray-300">{d.recipient || d.recipientEmail || "-"}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE[d.status] || "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}>
                          {d.status === "delivered" ? <CheckCircle className="w-3 h-3" /> : d.status === "failed" ? <XCircle className="w-3 h-3" /> : d.status === "pending" ? <Clock className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          {d.status ? d.status.charAt(0).toUpperCase() + d.status.slice(1) : "Unknown"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-400">{d.attempts ?? 1}</td>
                      <td className="py-3 pr-4 text-gray-400 text-xs">{d.createdAt ? getTimeAgo(d.createdAt) : "-"}</td>
                      <td className="py-3 text-right">
                        {d.status === "failed" && (
                          <button
                            className="btn-ghost text-xs flex items-center gap-1 ml-auto"
                            onClick={() => handleRetry(id)}
                            disabled={retrying.has(id)}
                          >
                            <RotateCcw className={`w-3 h-3 ${retrying.has(id) ? "animate-spin" : ""}`} />
                            {retrying.has(id) ? "Retrying..." : "Retry"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowSendModal(false)}>
          <div className="card w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Send Test Notification</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">Title</label>
                <input
                  className="input w-full text-sm"
                  placeholder="Notification title"
                  value={sendForm.title}
                  onChange={e => setSendForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">Message</label>
                <textarea
                  className="input w-full text-sm resize-none"
                  rows={3}
                  placeholder="Notification message"
                  value={sendForm.message}
                  onChange={e => setSendForm(prev => ({ ...prev, message: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Channels</label>
                <div className="grid grid-cols-2 gap-2">
                  {CHANNELS.map(ch => (
                    <label key={ch} className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendForm.channels.has(ch)}
                        onChange={() => toggleChannel(ch)}
                        className="rounded border-gray-700 bg-gray-800 accent-n0va-500"
                      />
                      {ch === "in_app" ? "In-App" : ch.charAt(0).toUpperCase() + ch.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button className="btn-secondary text-xs" onClick={() => setShowSendModal(false)}>Cancel</button>
                <button className="btn-primary text-xs flex items-center gap-1.5" onClick={handleSendTest} disabled={sending}>
                  {sending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
