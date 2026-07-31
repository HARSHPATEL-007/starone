import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Zap, Plus, X, Power, PowerOff, Edit3, Trash2, ChevronDown, ChevronRight, Clock, Activity, AlertTriangle, Bell, Megaphone, PauseCircle, RefreshCw, Copy, CheckCircle, CheckSquare, BarChart3, History, Play } from "lucide-react";
import { useToast } from "../components/Toast";
import { api } from "../api/client";

type Trigger = "campaign_launched" | "campaign_completed" | "campaign_paused" | "budget_exceeded" | "creative_approved" | "review_submitted" | "daily_report" | "schedule_reminder";
type Action = "send_notification" | "pause_campaign" | "update_status" | "create_alert" | "send_report" | "notify_team";

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: Trigger;
  action: Action;
  config: Record<string, string>;
  enabled: boolean;
  lastRun: string | null;
  runCount: number;
  createdAt: string;
}

interface Execution {
  id: string;
  ruleId: string;
  ruleName: string;
  trigger: string;
  action: string;
  status: "success" | "failure" | "skipped";
  timestamp: string;
  details?: string;
}

const TRIGGERS: { value: Trigger; label: string; icon: any; desc: string }[] = [
  { value: "campaign_launched", label: "Campaign Launched", icon: Megaphone, desc: "When a campaign status changes to active" },
  { value: "campaign_completed", label: "Campaign Completed", icon: CheckCircle, desc: "When a campaign reaches its end date" },
  { value: "campaign_paused", label: "Campaign Paused", icon: PauseCircle, desc: "When a campaign is manually paused" },
  { value: "budget_exceeded", label: "Budget Exceeded", icon: AlertTriangle, desc: "When spend exceeds 80% of budget" },
  { value: "creative_approved", label: "Creative Approved", icon: CheckCircle, desc: "When a creative is approved" },
  { value: "review_submitted", label: "Review Submitted", icon: Activity, desc: "When a campaign review is submitted" },
  { value: "daily_report", label: "Daily Report Ready", icon: Clock, desc: "When daily analytics report is generated" },
  { value: "schedule_reminder", label: "Schedule Reminder", icon: Bell, desc: "When a campaign is ending within 24h" },
];
const ACTIONS: { value: Action; label: string; icon: any; desc: string }[] = [
  { value: "send_notification", label: "Send Notification", icon: Bell, desc: "Create a system notification" },
  { value: "pause_campaign", label: "Pause Campaign", icon: PauseCircle, desc: "Auto-pause the campaign" },
  { value: "update_status", label: "Update Status", icon: Activity, desc: "Change campaign status" },
  { value: "create_alert", label: "Create Alert", icon: AlertTriangle, desc: "Generate a budget or performance alert" },
  { value: "send_report", label: "Send Report", icon: RefreshCw, desc: "Email or notify with a report" },
  { value: "notify_team", label: "Notify Team", icon: Bell, desc: "Send notification to all team members" },
];

function timeAgo(date: string | null): string {
  if (!date) return "Never";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function Automation() {
  const { addToast } = useToast();
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [executions, setExecutions] = useState<any[]>([]);
  const [showExecutions, setShowExecutions] = useState(false);
  const [filterEnabled, setFilterEnabled] = useState<string>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", trigger: "campaign_launched" as Trigger, action: "send_notification" as Action, config: {} as Record<string, string> });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEnabled, setBulkEnabled] = useState(false);

  useEffect(() => {
    api.automationRules.list().then((r: any) => {
      setRules(Array.isArray(r) ? r : r?.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const loadExecutions = useCallback(() => {
    api.automationRules.executions().then((r: any) => setExecutions(Array.isArray(r) ? r : r?.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (showExecutions && executions.length === 0) loadExecutions();
  }, [showExecutions, executions.length, loadExecutions]);

  function toggle(id: string) {
    setExpanded(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function toggleEnabled(id: string) {
    const rule = rules.find(r => r.id === id);
    api.automationRules.toggle(id).then(() => {
      setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
      addToast("success", `"${rule?.name}" ${rule?.enabled ? "disabled" : "enabled"}`);
    }).catch(() => addToast("error", "Failed to toggle rule"));
  }

  function duplicate(id: string) {
    const rule = rules.find(r => r.id === id);
    if (!rule) return;
    const { id: _, lastRun: _2, runCount: _3, createdAt: _4, enabled: _5, ...rest } = rule;
    api.automationRules.create({ ...rest, name: `${rule.name} (Copy)` } as any).then(created => {
      setRules(prev => [created, ...prev]);
      addToast("success", "Rule duplicated");
    }).catch(() => addToast("error", "Failed to duplicate rule"));
  }

  function handleDelete(id: string) {
    const name = rules.find(r => r.id === id)?.name;
    api.automationRules.delete(id).then(() => {
      setRules(prev => prev.filter(r => r.id !== id));
      addToast("success", `"${name}" deleted`);
    }).catch(() => addToast("error", "Failed to delete rule"));
  }

  function resetForm(r?: AutomationRule) {
    if (r) setForm({ name: r.name, description: r.description, trigger: r.trigger, action: r.action, config: { ...r.config } });
    else setForm({ name: "", description: "", trigger: "campaign_launched", action: "send_notification", config: {} });
  }

  function handleSave() {
    if (!form.name.trim()) { addToast("error", "Rule name is required"); return; }
    const data = { name: form.name.trim(), description: form.description.trim(), trigger: form.trigger, action: form.action, config: form.config };
    if (editingId) {
      api.automationRules.update(editingId, data as any).then(updated => {
        setRules(prev => prev.map(r => r.id === editingId ? { ...r, ...updated } : r));
        addToast("success", "Rule updated");
      }).catch(() => addToast("error", "Failed to update rule"));
    } else {
      api.automationRules.create(data as any).then(created => {
        setRules(prev => [created, ...prev]);
        addToast("success", "Rule created");
      }).catch(() => addToast("error", "Failed to create rule"));
    }
    setShowForm(false);
  }

  function evaluateRule(id: string) {
    api.automationRules.evaluate(id).then(res => {
      setRules(prev => prev.map(r => r.id === id ? { ...r, lastRun: res.execution?.timestamp || new Date().toISOString(), runCount: r.runCount + 1 } : r));
      if (res.triggered) addToast("success", `Rule triggered: ${res.actions?.join(", ") || "action executed"}`);
      else addToast("info", "No trigger conditions met");
    }).catch(() => addToast("error", "Evaluate failed"));
  }

  function evaluateAll() {
    api.automationRules.evaluateAll().then(results => {
      const triggered = results.filter(r => r.triggered).length;
      addToast("success", `Evaluation complete: ${triggered} rule${triggered !== 1 ? "s" : ""} triggered`);
    }).catch(() => addToast("error", "Evaluate all failed"));
  }

  function toggleSelect(id: string) {
    setSelectedIds(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(r => r.id)));
  }

  function bulkToggleEnabled(enable: boolean) {
    Promise.all(rules.filter(r => selectedIds.has(r.id)).map(r => api.automationRules.toggle(r.id).then(() => r))).then(() => {
      setRules(prev => prev.map(r => selectedIds.has(r.id) ? { ...r, enabled: enable } : r));
      addToast("success", `${selectedIds.size} rules ${enable ? "enabled" : "disabled"}`);
    }).catch(() => addToast("error", "Bulk toggle failed"));
  }

  const chartData = rules.filter(r => r.runCount > 0).map(r => ({
    name: r.name.length > 12 ? r.name.substring(0, 12) + "..." : r.name,
    runs: r.runCount,
  }));

  const filtered = rules.filter(r => filterEnabled === "all" || (filterEnabled === "enabled" && r.enabled) || (filterEnabled === "disabled" && !r.enabled));
  const enabledCount = rules.filter(r => r.enabled).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Zap className="w-6 h-6 text-n0va-400" />
            Workflow Automation
          </h1>
          <p className="text-gray-400 mt-1">{rules.length} rules · {enabledCount} enabled</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={evaluateAll} className="btn-ghost text-sm flex items-center gap-1.5"><Play className="w-3.5 h-3.5" /> Evaluate All</button>
          <button
            onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }}
            className="btn-primary text-sm flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> New Rule
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Total Rules</p><p className="text-2xl font-bold text-white">{rules.length}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Active</p><p className="text-2xl font-bold text-green-400">{enabledCount}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Total Runs</p><p className="text-2xl font-bold text-white">{rules.reduce((s, r) => s + r.runCount, 0).toLocaleString()}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Last Run</p><p className="text-2xl font-bold text-gray-400 text-sm">{rules.filter(r => r.lastRun).sort((a, b) => new Date(b.lastRun!).getTime() - new Date(a.lastRun!).getTime())[0]?.lastRun ? timeAgo(rules.filter(r => r.lastRun).sort((a, b) => new Date(b.lastRun!).getTime() - new Date(a.lastRun!).getTime())[0].lastRun!) : "—"}</p></div>
      </div>

      {/* Execution History */}
      <div className="card overflow-hidden">
        <button onClick={() => setShowExecutions(!showExecutions)} className="w-full flex items-center justify-between p-4 hover:bg-gray-800/30">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-n0va-400" />
            <span className="text-sm font-semibold text-white">Execution History</span>
            <span className="text-xs text-gray-600">{executions.length} entries</span>
          </div>
          {showExecutions ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
        </button>
        {showExecutions && (
          <div className="border-t border-gray-800">
            {executions.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">No executions recorded yet. Run a rule to see history.</div>
            ) : (
              <div className="divide-y divide-gray-800/50 max-h-80 overflow-y-auto">
                {executions.map((ex: Execution) => (
                  <div key={ex.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${ex.status === "success" ? "bg-green-400" : ex.status === "failure" ? "bg-red-400" : "bg-gray-500"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white truncate">{ex.ruleName}</p>
                      <p className="text-gray-600 text-xs truncate">{ex.trigger} → {ex.action}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ex.status === "success" ? "bg-green-500/10 text-green-400" : ex.status === "failure" ? "bg-red-500/10 text-red-400" : "bg-gray-500/10 text-gray-500"}`}>{ex.status}</span>
                    <span className="text-xs text-gray-600 shrink-0">{timeAgo(ex.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={loadExecutions} className="w-full p-2 text-xs text-gray-600 hover:text-gray-300 border-t border-gray-800/50">Refresh</button>
          </div>
        )}
      </div>

      {chartData.length > 1 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-n0va-400" /> Execution Activity</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }} />
                <Bar dataKey="runs" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select className="input text-sm w-auto" value={filterEnabled} onChange={e => setFilterEnabled(e.target.value)}>
          <option value="all">All Rules</option>
          <option value="enabled">Active</option>
          <option value="disabled">Disabled</option>
        </select>
        {filterEnabled !== "all" && <button onClick={() => setFilterEnabled("all")} className="text-xs text-gray-500 hover:text-gray-300">Clear</button>}
        <button onClick={() => setBulkEnabled(!bulkEnabled)} className={`btn-ghost text-xs ${bulkEnabled ? "text-n0va-400" : ""}`}><CheckSquare className="w-3.5 h-3.5 mr-1" /> Bulk</button>
        {bulkEnabled && selectedIds.size > 0 && (
          <>
            <button onClick={() => bulkToggleEnabled(true)} className="btn-ghost text-xs text-green-400">Enable {selectedIds.size}</button>
            <button onClick={() => bulkToggleEnabled(false)} className="btn-ghost text-xs text-red-400">Disable {selectedIds.size}</button>
          </>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">{editingId ? "Edit Rule" : "New Automation Rule"}</h3><button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div><label className="label">Rule Name</label><input className="input" placeholder="e.g. Budget Exceeded Alert" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus /></div>
              <div><label className="label">Description</label><textarea className="input" rows={2} placeholder="What does this rule do?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Trigger</label><select className="input" value={form.trigger} onChange={e => setForm({ ...form, trigger: e.target.value as Trigger })}>{TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
                  <p className="text-[10px] text-gray-600 mt-1">{TRIGGERS.find(t => t.value === form.trigger)?.desc}</p>
                </div>
                <div><label className="label">Action</label><select className="input" value={form.action} onChange={e => setForm({ ...form, action: e.target.value as Action })}>{ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}</select>
                  <p className="text-[10px] text-gray-600 mt-1">{ACTIONS.find(a => a.value === form.action)?.desc}</p>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{editingId ? "Save Changes" : "Create Rule"}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <Zap className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No automation rules</h3>
          <p className="text-sm text-gray-500">Create rules to automate campaign workflows.</p>
          <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Create Rule</button>
        </div>
      )}

      {/* Rule cards */}
      {filtered.map(rule => {
        const isOpen = expanded.has(rule.id);
        const tMeta = TRIGGERS.find(t => t.value === rule.trigger);
        const aMeta = ACTIONS.find(a => a.value === rule.action);
        const TriggerIcon = tMeta?.icon || Zap;
        const ActionIcon = aMeta?.icon || Zap;
        return (
          <div key={rule.id} className={`card overflow-hidden border-l-4 ${rule.enabled ? "border-l-green-500/50" : "border-l-gray-700"}`}>
            <div className="p-5">
              <div className="flex items-start gap-4">
                {bulkEnabled && (
                  <input type="checkbox" checked={selectedIds.has(rule.id)} onChange={() => toggleSelect(rule.id)} className="mt-1.5 w-4 h-4 rounded border-gray-700 bg-gray-800 accent-n0va-500" />
                )}
                <button onClick={() => toggle(rule.id)} className="p-1 mt-1 text-gray-600 hover:text-gray-300">{isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-base font-semibold text-white">{rule.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${rule.enabled ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-500"}`}>
                      {rule.enabled ? <Power className="w-3 h-3" /> : <PowerOff className="w-3 h-3" />}
                      {rule.enabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{rule.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                    <span className="flex items-center gap-1"><TriggerIcon className="w-3 h-3" /> {tMeta?.label}</span>
                    <span>→</span>
                    <span className="flex items-center gap-1"><ActionIcon className="w-3 h-3" /> {aMeta?.label}</span>
                    <span className="text-gray-600">{rule.runCount} run{rule.runCount !== 1 ? "s" : ""}</span>
                    {rule.lastRun && <span className="text-gray-600">Last: {timeAgo(rule.lastRun)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleEnabled(rule.id)} className={`p-1.5 rounded-lg ${rule.enabled ? "text-green-400 hover:bg-green-500/10" : "text-gray-600 hover:text-gray-300"}`}>
                    {rule.enabled ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => evaluateRule(rule.id)} className="p-1.5 text-gray-600 hover:text-n0va-400"><RefreshCw className="w-4 h-4" /></button>
                  <button onClick={() => duplicate(rule.id)} className="p-1.5 text-gray-600 hover:text-gray-300"><Copy className="w-4 h-4" /></button>
                  <button onClick={() => { resetForm(rule); setEditingId(rule.id); setShowForm(true); }} className="p-1.5 text-gray-600 hover:text-gray-300"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(rule.id)} className="p-1.5 text-gray-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            {/* Expanded config */}
            {isOpen && (
              <div className="border-t border-gray-800 p-4 bg-gray-800/20">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1"><TriggerIcon className="w-3 h-3" /> Trigger Config</p>
                    <p className="text-sm text-gray-300">{tMeta?.label}</p>
                    <p className="text-xs text-gray-600">{tMeta?.desc}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1"><ActionIcon className="w-3 h-3" /> Action Config</p>
                    <p className="text-sm text-gray-300">{aMeta?.label}</p>
                    <p className="text-xs text-gray-600">{aMeta?.desc}</p>
                  </div>
                </div>
                {Object.keys(rule.config).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-800">
                    <p className="text-xs font-medium text-gray-400 mb-2">Configuration</p>
                    <div className="space-y-1">
                      {Object.entries(rule.config).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-2 text-xs"><span className="text-gray-600 capitalize">{k.replace(/_/g, " ")}:</span><span className="text-gray-300">{String(v)}</span></div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
