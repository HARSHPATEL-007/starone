import { useState, useMemo } from "react";
import { Bell, Plus, X, Edit3, Trash2, Copy, Search, BellOff, BellRing, TrendingUp, TrendingDown, DollarSign, Eye, MousePointerClick, Target, Megaphone, Users, AlertTriangle, Clock, Activity, Zap, History, Download, Send, Play } from "lucide-react";
import { useToast } from "../components/Toast";
import { useEntityData } from "../hooks/useEntityData";

type AlertMetric = "ctr" | "cpc" | "cpa" | "roas" | "spend" | "impressions" | "clicks" | "conversions" | "revenue" | "frequency";
type AlertCondition = "gt" | "lt" | "gte" | "lte" | "eq" | "change_pct";
type AlertChannel = "email" | "slack" | "webhook" | "in_app";
type AlertStatus = "active" | "paused" | "triggered";

interface CampaignAlert {
  id: string;
  name: string;
  description: string;
  metric: AlertMetric;
  condition: AlertCondition;
  threshold: number;
  channels: AlertChannel[];
  campaignFilter: string;
  cooldownHours: number;
  lastTriggered: string | null;
  triggerCount: number;
  status: AlertStatus;
  createdAt: string;
}

const METRIC_META: Record<string, { label: string; icon: any; unit: string }> = {
  ctr: { label: "CTR", icon: TrendingUp, unit: "%" }, cpc: { label: "CPC", icon: DollarSign, unit: "$" },
  cpa: { label: "CPA", icon: DollarSign, unit: "$" }, roas: { label: "ROAS", icon: TrendingUp, unit: "x" },
  spend: { label: "Daily Spend", icon: DollarSign, unit: "$" }, impressions: { label: "Impressions", icon: Eye, unit: "" },
  clicks: { label: "Clicks", icon: MousePointerClick, unit: "" }, conversions: { label: "Conversions", icon: Target, unit: "" },
  revenue: { label: "Revenue", icon: TrendingUp, unit: "$" }, frequency: { label: "Frequency", icon: Users, unit: "" },
};

const CONDITION_LABELS: Record<string, string> = { gt: ">", lt: "<", gte: "≥", lte: "≤", eq: "=", change_pct: "Change by %" };
const ALERT_CHANNELS: AlertChannel[] = ["email", "slack", "webhook", "in_app"];

const ALERT_TEMPLATES = [
  { name: "CTR Drop Alert", metric: "ctr" as AlertMetric, condition: "lt" as AlertCondition, threshold: 0.5, description: "Fires when CTR drops below 0.5%", channels: ["email", "slack"] as AlertChannel[] },
  { name: "CPA Spike Alert", metric: "cpa" as AlertMetric, condition: "gt" as AlertCondition, threshold: 50, description: "Fires when CPA exceeds $50", channels: ["email"] as AlertChannel[] },
  { name: "Daily Budget Warning", metric: "spend" as AlertMetric, condition: "gte" as AlertCondition, threshold: 1000, description: "Fires when daily spend exceeds $1,000", channels: ["slack", "in_app"] as AlertChannel[] },
  { name: "Low ROAS Alert", metric: "roas" as AlertMetric, condition: "lt" as AlertCondition, threshold: 1.0, description: "Fires when ROAS drops below 1.0x", channels: ["email", "webhook"] as AlertChannel[] },
];

export default function CampaignAlerts() {
  const { addToast } = useToast();
  const { data: alerts, loading, create, update, remove, replaceAll } = useEntityData<CampaignAlert>("campaign_alerts");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<AlertStatus | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [form, setForm] = useState<{ name: string; description: string; metric: AlertMetric; condition: AlertCondition; threshold: number; channels: AlertChannel[]; campaignFilter: string; cooldownHours: number; status: AlertStatus }>({
    name: "", description: "", metric: "ctr", condition: "lt", threshold: 0, channels: ["email"], campaignFilter: "all", cooldownHours: 6, status: "active",
  });

  const [alertHistory, setAlertHistory] = useState<{ alertId: string; alertName: string; triggeredAt: string; value: number; threshold: number }[]>([]);

  function resetForm(a?: CampaignAlert) {
    if (a) setForm({ name: a.name, description: a.description, metric: a.metric, condition: a.condition, threshold: a.threshold, channels: [...a.channels], campaignFilter: a.campaignFilter, cooldownHours: a.cooldownHours, status: a.status });
    else setForm({ name: "", description: "", metric: "ctr", condition: "lt", threshold: 0, channels: ["email"], campaignFilter: "all", cooldownHours: 6, status: "active" });
  }

  function applyTemplate(tpl: typeof ALERT_TEMPLATES[0]) {
    setForm({ name: tpl.name, description: tpl.description, metric: tpl.metric, condition: tpl.condition, threshold: tpl.threshold, channels: [...tpl.channels], campaignFilter: "all", cooldownHours: 6, status: "active" });
    setShowTemplates(false);
  }

  function toggleChannel(ch: AlertChannel) {
    setForm(f => ({ ...f, channels: f.channels.includes(ch) ? f.channels.filter(c => c !== ch) : [...f.channels, ch] }));
  }

  function handleSave() {
    if (!form.name.trim()) { addToast("error", "Alert name is required"); return; }
    const now = new Date().toISOString();
    const alert: CampaignAlert = {
      id: editingId || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: form.name.trim(), description: form.description.trim(), metric: form.metric,
      condition: form.condition, threshold: form.threshold, channels: form.channels,
      campaignFilter: form.campaignFilter.trim() || "all", cooldownHours: form.cooldownHours,
      lastTriggered: editingId ? alerts.find(a => a.id === editingId)!.lastTriggered : null,
      triggerCount: editingId ? alerts.find(a => a.id === editingId)!.triggerCount : 0,
      status: form.status, createdAt: editingId ? alerts.find(a => a.id === editingId)!.createdAt : now,
    };
    if (editingId) { update(editingId, alert as any); addToast("success", "Alert updated"); }
    else { create(alert as any); addToast("success", "Alert created"); }
    setShowForm(false);
    setEditingId(null);
  }

  function handleDelete(id: string) {
    const name = alerts.find(a => a.id === id)?.name;
    remove(id);
    addToast("success", `"${name}" deleted`);
  }

  function toggleStatus(id: string) {
    replaceAll(alerts.map(a => a.id === id ? { ...a, status: (a.status === "active" ? "paused" : "active") as AlertStatus } : a));
    const a = alerts.find(al => al.id === id);
    addToast("success", `"${a?.name}" ${a?.status === "active" ? "paused" : "activated"}`);
  }

  function resetTriggerCount(id: string) {
    replaceAll(alerts.map(a => a.id === id ? { ...a, triggerCount: 0, lastTriggered: null, status: "active" as AlertStatus } : a));
    addToast("success", "Trigger count reset");
  }

  function simulateTrigger(id: string) {
    const a = alerts.find(al => al.id === id);
    if (!a) return;
    const now = new Date().toISOString();
    const simulatedValue = a.metric === "roas" ? 0.5 + Math.random() * 2 : a.metric === "ctr" ? Math.random() * 2 : a.metric === "spend" ? 500 + Math.random() * 2000 : Math.random() * 100;
    replaceAll(alerts.map(al => al.id === id ? { ...al, lastTriggered: now, triggerCount: al.triggerCount + 1, status: "triggered" as AlertStatus } : a));
    setAlertHistory(prev => [{ alertId: id, alertName: a.name, triggeredAt: now, value: Math.round(simulatedValue * 100) / 100, threshold: a.threshold }, ...prev].slice(0, 50));
    addToast("warning", `Simulated: ${a.name} — value ${Math.round(simulatedValue * 100) / 100} (threshold: ${a.threshold})`);
  }

  const filtered = alerts.filter(a => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const historyForAlert = showHistory ? alertHistory.filter(h => h.alertId === showHistory) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3"><Bell className="w-6 h-6 text-n0va-400" /> Campaign Alerts</h1>
          <p className="text-gray-400 mt-1">{alerts.length} alerts · {alerts.filter(a => a.status === "active").length} active · {alerts.reduce((s, a) => s + a.triggerCount, 0)} total triggers</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowTemplates(true)} className="btn-ghost text-xs flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Templates</button>
          <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> New Alert</button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input className="input pl-10 pr-4 py-2 text-sm w-full" placeholder="Search alerts..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input py-2 text-sm w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value as AlertStatus | "all")}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="triggered">Triggered</option>
        </select>
      </div>

      {showTemplates && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" /> Quick Templates</h3>
            <button onClick={() => setShowTemplates(false)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {ALERT_TEMPLATES.map(tpl => (
              <button key={tpl.name} onClick={() => applyTemplate(tpl)} className="p-3 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-n0va-600/40 text-left transition-colors">
                <p className="text-xs font-semibold text-white">{tpl.name}</p>
                <p className="text-[10px] text-gray-500 mt-1">{tpl.description}</p>
                <div className="flex gap-1 mt-1.5">
                  <span className="text-[9px] text-n0va-400 bg-n0va-500/10 px-1 rounded">{tpl.metric.toUpperCase()} {CONDITION_LABELS[tpl.condition]} {tpl.threshold}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">{editingId ? "Edit Alert" : "New Alert"}</h3><button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div><label className="label">Alert Name</label><input className="input" placeholder="e.g. CTR Drop Alert" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus /></div>
              <div><label className="label">Description</label><textarea className="input" rows={2} placeholder="When should this fire?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="label">Metric</label><select className="input" value={form.metric} onChange={e => setForm({ ...form, metric: e.target.value as AlertMetric })}>{Object.entries(METRIC_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
                <div><label className="label">Condition</label><select className="input" value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value as AlertCondition })}>{Object.entries(CONDITION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div><label className="label">Threshold</label><input className="input" type="number" step="any" value={form.threshold} onChange={e => setForm({ ...form, threshold: Number(e.target.value) })} /></div>
              </div>
              <div><label className="label">Notification Channels</label><div className="flex gap-1.5">{ALERT_CHANNELS.map(ch => (<button key={ch} type="button" onClick={() => toggleChannel(ch)} className={`text-xs px-2.5 py-1.5 rounded border capitalize ${form.channels.includes(ch) ? "border-n0va-500 bg-n0va-500/10 text-n0va-400" : "border-gray-700 bg-gray-800 text-gray-400"}`}>{ch.replace("_", " ")}</button>))}</div></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Campaign Filter</label><input className="input" placeholder="all or campaign name" value={form.campaignFilter} onChange={e => setForm({ ...form, campaignFilter: e.target.value })} /></div>
                <div><label className="label">Cooldown (hours)</label><input className="input" type="number" min="1" value={form.cooldownHours} onChange={e => setForm({ ...form, cooldownHours: Number(e.target.value) })} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{editingId ? "Save Changes" : "Create Alert"}</button></div>
            </form>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <Bell className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No alerts configured</h3>
          <p className="text-sm text-gray-500">{search ? "Try different search terms" : "Set up alerts to monitor campaign performance."}</p>
          {!search && <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Create Alert</button>}
        </div>
      )}

      {filtered.map(a => {
        const mm = METRIC_META[a.metric];
        const MI = mm.icon;
        const isActive = a.status === "active";
        const isTriggered = a.status === "triggered";
        const hist = alertHistory.filter(h => h.alertId === a.id);
        return (
          <div key={a.id}>
            <div className={`card p-4 border-l-4 ${isActive ? "border-l-green-500" : isTriggered ? "border-l-red-500" : "border-l-gray-700"}`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${isActive ? "bg-green-500/10" : isTriggered ? "bg-red-500/10" : "bg-gray-800"}`}>
                  {isActive ? <BellRing className="w-5 h-5 text-green-400" /> : isTriggered ? <Bell className="w-5 h-5 text-red-400" /> : <BellOff className="w-5 h-5 text-gray-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-white">{a.name}</h3>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${isActive ? "bg-green-500/20 text-green-400" : isTriggered ? "bg-red-500/20 text-red-400" : "bg-gray-800 text-gray-500"}`}>{a.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{a.description}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-600 flex-wrap">
                    <span className="flex items-center gap-1"><MI className="w-3 h-3" />{mm.label} {CONDITION_LABELS[a.condition]} {a.threshold}{mm.unit}</span>
                    <span className="flex items-center gap-1">Campaign: {a.campaignFilter}</span>
                    <span className="flex items-center gap-1">Cooldown: {a.cooldownHours}h</span>
                    <span className={`flex items-center gap-1 ${a.triggerCount > 0 ? "text-red-400" : ""}`}>Triggered: {a.triggerCount}x</span>
                    {a.lastTriggered && <span className="flex items-center gap-1">Last: {new Date(a.lastTriggered).toLocaleDateString()}</span>}
                  </div>
                  <div className="flex gap-1 mt-1.5">
                    {a.channels.map(ch => <span key={ch} className="text-[9px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded capitalize">{ch.replace("_", " ")}</span>)}
                  </div>
                  {hist.length > 0 && showHistory === a.id && (
                    <div className="mt-3 pt-3 border-t border-gray-800">
                      <p className="text-[10px] text-gray-500 mb-2 flex items-center gap-1"><Clock className="w-3 h-3" /> Trigger History ({hist.length})</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {hist.map((h, i) => (
                          <div key={i} className="flex items-center gap-2 text-[10px] text-gray-600">
                            <span className="text-red-400">●</span>
                            <span>{new Date(h.triggeredAt).toLocaleString()}</span>
                            <span>value: {h.value}</span>
                            <span className="text-gray-500">(threshold: {h.threshold})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button onClick={() => simulateTrigger(a.id)} className="p-1.5 text-gray-600 hover:text-amber-400" title="Simulate trigger"><Play className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setShowHistory(showHistory === a.id ? null : a.id)} className="p-1.5 text-gray-600 hover:text-gray-300" title="History"><History className="w-3.5 h-3.5" /></button>
                  <button onClick={() => toggleStatus(a.id)} className="p-1.5 text-gray-600 hover:text-yellow-400">{a.status === "active" ? <BellOff className="w-3.5 h-3.5" /> : <BellRing className="w-3.5 h-3.5" />}</button>
                  {a.triggerCount > 0 && <button onClick={() => resetTriggerCount(a.id)} className="p-1.5 text-gray-600 hover:text-gray-300"><TrendingDown className="w-3.5 h-3.5" /></button>}
                  <button onClick={() => { resetForm(a); setEditingId(a.id); setShowForm(true); }} className="p-1.5 text-gray-600 hover:text-gray-300"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(a.id)} className="p-1.5 text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
