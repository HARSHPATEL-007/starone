import { useState, useEffect } from "react";
import { Bell, Plus, X, Edit3, Trash2, Copy, Search, BellOff, BellRing, TrendingUp, TrendingDown, DollarSign, Eye, MousePointerClick, Target, Megaphone, Users } from "lucide-react";
import { useToast } from "../components/Toast";

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

const STORAGE_KEY = "n0va_campaign_alerts";

const METRIC_META: Record<string, { label: string; icon: any; unit: string }> = {
  ctr: { label: "CTR", icon: TrendingUp, unit: "%" },
  cpc: { label: "CPC", icon: DollarSign, unit: "$" },
  cpa: { label: "CPA", icon: DollarSign, unit: "$" },
  roas: { label: "ROAS", icon: TrendingUp, unit: "x" },
  spend: { label: "Daily Spend", icon: DollarSign, unit: "$" },
  impressions: { label: "Impressions", icon: Eye, unit: "" },
  clicks: { label: "Clicks", icon: MousePointerClick, unit: "" },
  conversions: { label: "Conversions", icon: Target, unit: "" },
  revenue: { label: "Revenue", icon: TrendingUp, unit: "$" },
  frequency: { label: "Frequency", icon: Users, unit: "" },
};

const CONDITION_LABELS: Record<string, string> = {
  gt: ">", lt: "<", gte: "≥", lte: "≤", eq: "=", change_pct: "Change by %",
};

const ALERT_CHANNELS: AlertChannel[] = ["email", "slack", "webhook", "in_app"];

const DEFAULT_ALERTS: CampaignAlert[] = [
  { id: "ca-1", name: "CTR Drop Alert", description: "Fires when CTR drops below 2%", metric: "ctr", condition: "lt", threshold: 2, channels: ["email", "in_app"], campaignFilter: "all", cooldownHours: 6, lastTriggered: new Date(Date.now() - 86400000 * 2).toISOString(), triggerCount: 3, status: "active", createdAt: new Date(Date.now() - 86400000 * 30).toISOString() },
  { id: "ca-2", name: "Budget Threshold Warning", description: "Notify when daily spend exceeds $5000", metric: "spend", condition: "gt", threshold: 5000, channels: ["slack", "in_app"], campaignFilter: "Product Launch Q3", cooldownHours: 1, lastTriggered: new Date(Date.now() - 86400000 * 5).toISOString(), triggerCount: 8, status: "active", createdAt: new Date(Date.now() - 86400000 * 25).toISOString() },
  { id: "ca-3", name: "ROAS Performance Alert", description: "Alert when ROAS drops below 2.5x", metric: "roas", condition: "lt", threshold: 2.5, channels: ["email", "slack"], campaignFilter: "all", cooldownHours: 12, lastTriggered: null, triggerCount: 1, status: "active", createdAt: new Date(Date.now() - 86400000 * 20).toISOString() },
  { id: "ca-4", name: "High CPA Alert", description: "Fires when CPA exceeds $100", metric: "cpa", condition: "gt", threshold: 100, channels: ["in_app"], campaignFilter: "Enterprise Q3", cooldownHours: 24, lastTriggered: new Date(Date.now() - 86400000 * 1).toISOString(), triggerCount: 5, status: "triggered", createdAt: new Date(Date.now() - 86400000 * 15).toISOString() },
  { id: "ca-5", name: "Conversion Spike Monitor", description: "Notify on 50% increase in conversions", metric: "conversions", condition: "change_pct", threshold: 50, channels: ["email"], campaignFilter: "all", cooldownHours: 4, lastTriggered: new Date(Date.now() - 86400000 * 10).toISOString(), triggerCount: 2, status: "paused", createdAt: new Date(Date.now() - 86400000 * 10).toISOString() },
];

function load(): CampaignAlert[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ALERTS));
    return DEFAULT_ALERTS;
  } catch { return []; }
}

export default function CampaignAlerts() {
  const { addToast } = useToast();
  const [alerts, setAlerts] = useState<CampaignAlert[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<AlertStatus | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; description: string; metric: AlertMetric; condition: AlertCondition; threshold: number; channels: AlertChannel[]; campaignFilter: string; cooldownHours: number; status: AlertStatus }>({
    name: "", description: "", metric: "ctr", condition: "lt", threshold: 0, channels: ["email"], campaignFilter: "all", cooldownHours: 6, status: "active",
  });

  useEffect(() => { setAlerts(load()); }, []);

  function persist(updated: CampaignAlert[]) {
    setAlerts(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function resetForm(a?: CampaignAlert) {
    if (a) setForm({ name: a.name, description: a.description, metric: a.metric, condition: a.condition, threshold: a.threshold, channels: [...a.channels], campaignFilter: a.campaignFilter, cooldownHours: a.cooldownHours, status: a.status });
    else setForm({ name: "", description: "", metric: "ctr", condition: "lt", threshold: 0, channels: ["email"], campaignFilter: "all", cooldownHours: 6, status: "active" });
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
    let updated: CampaignAlert[];
    if (editingId) { updated = alerts.map(a => a.id === editingId ? alert : a); addToast("success", "Alert updated"); }
    else { updated = [alert, ...alerts]; addToast("success", "Alert created"); }
    persist(updated);
    setShowForm(false);
    setEditingId(null);
  }

  function handleDelete(id: string) {
    const name = alerts.find(a => a.id === id)?.name;
    persist(alerts.filter(a => a.id !== id));
    addToast("success", `"${name}" deleted`);
  }

  function toggleStatus(id: string) {
    persist(alerts.map(a => a.id === id ? { ...a, status: (a.status === "active" ? "paused" : "active") as AlertStatus } : a));
    const a = alerts.find(al => al.id === id);
    addToast("success", `"${a?.name}" ${a?.status === "active" ? "paused" : "activated"}`);
  }

  function resetTriggerCount(id: string) {
    persist(alerts.map(a => a.id === id ? { ...a, triggerCount: 0, lastTriggered: null, status: "active" as AlertStatus } : a));
    addToast("success", "Trigger count reset");
  }

  const filtered = alerts.filter(a => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Bell className="w-6 h-6 text-n0va-400" />
            Campaign Alerts
          </h1>
          <p className="text-gray-400 mt-1">{alerts.length} alerts · {alerts.filter(a => a.status === "active").length} active · {alerts.reduce((s, a) => s + a.triggerCount, 0)} total triggers</p>
        </div>
        <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> New Alert</button>
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

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">{editingId ? "Edit Alert" : "New Alert"}</h3><button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div><label className="label">Alert Name</label><input className="input" placeholder="e.g. CTR Drop Alert" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus /></div>
              <div><label className="label">Description</label><textarea className="input" rows={2} placeholder="When should this fire?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="label">Metric</label>
                  <select className="input" value={form.metric} onChange={e => setForm({ ...form, metric: e.target.value as AlertMetric })}>
                    {Object.entries(METRIC_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div><label className="label">Condition</label>
                  <select className="input" value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value as AlertCondition })}>
                    {Object.entries(CONDITION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div><label className="label">Threshold</label><input className="input" type="number" step="any" value={form.threshold} onChange={e => setForm({ ...form, threshold: Number(e.target.value) })} /></div>
              </div>
              <div><label className="label">Notification Channels</label>
                <div className="flex gap-1.5">
                  {ALERT_CHANNELS.map(ch => (
                    <button key={ch} type="button" onClick={() => toggleChannel(ch)} className={`text-xs px-2.5 py-1.5 rounded border capitalize ${form.channels.includes(ch) ? "border-n0va-500 bg-n0va-500/10 text-n0va-400" : "border-gray-700 bg-gray-800 text-gray-400"}`}>{ch.replace("_", " ")}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Campaign Filter</label>
                  <select className="input" value={form.campaignFilter} onChange={e => setForm({ ...form, campaignFilter: e.target.value })}>
                    <option value="all">All Campaigns</option>
                    <option value="Product Launch Q3">Product Launch Q3</option>
                    <option value="Summer Sale 2025">Summer Sale 2025</option>
                    <option value="Enterprise Q3">Enterprise Q3</option>
                    <option value="Webinar Series">Webinar Series</option>
                  </select>
                </div>
                <div><label className="label">Cooldown (hours)</label><input className="input" type="number" min="1" value={form.cooldownHours} onChange={e => setForm({ ...form, cooldownHours: Number(e.target.value) })} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{editingId ? "Save Changes" : "Create Alert"}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <Bell className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No alerts configured</h3>
          <p className="text-sm text-gray-500">{search ? "Try different search terms" : "Set up alerts to monitor campaign performance."}</p>
          {!search && <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Create Alert</button>}
        </div>
      )}

      {/* Alert cards */}
      {filtered.map(a => {
        const mm = METRIC_META[a.metric];
        const MI = mm.icon;
        const isActive = a.status === "active";
        const isTriggered = a.status === "triggered";
        return (
          <div key={a.id} className={`card p-4 border-l-4 ${isActive ? "border-l-green-500" : isTriggered ? "border-l-red-500" : "border-l-gray-700"}`}>
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
                  <span className="flex items-center gap-1">Triggered: {a.triggerCount}x</span>
                  {a.lastTriggered && <span className="flex items-center gap-1">Last: {new Date(a.lastTriggered).toLocaleDateString()}</span>}
                </div>
                <div className="flex gap-1 mt-1.5">
                  {a.channels.map(ch => <span key={ch} className="text-[9px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded capitalize">{ch.replace("_", " ")}</span>)}
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button onClick={() => toggleStatus(a.id)} className="p-1.5 text-gray-600 hover:text-yellow-400">{a.status === "active" ? <BellOff className="w-3.5 h-3.5" /> : <BellRing className="w-3.5 h-3.5" />}</button>
                {a.triggerCount > 0 && <button onClick={() => resetTriggerCount(a.id)} className="p-1.5 text-gray-600 hover:text-gray-300"><TrendingDown className="w-3.5 h-3.5" /></button>}
                <button onClick={() => { resetForm(a); setEditingId(a.id); setShowForm(true); }} className="p-1.5 text-gray-600 hover:text-gray-300"><Edit3 className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(a.id)} className="p-1.5 text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
