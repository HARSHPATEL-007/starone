import { useState, useEffect } from "react";
import { Zap, Plus, X, Power, PowerOff, Edit3, Trash2, ChevronDown, ChevronRight, Clock, Activity, AlertTriangle, Bell, Megaphone, PauseCircle, RefreshCw, Copy, CheckCircle } from "lucide-react";
import { useToast } from "../components/Toast";

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

const STORAGE_KEY = "n0va_automation_rules";
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

const DEFAULT_RULES: AutomationRule[] = [
  { id: "auto-1", name: "Budget Exceeded Alert", description: "Notify the team when campaign spend exceeds 80% of budget", trigger: "budget_exceeded", action: "create_alert", config: { threshold: "80", channel: "in-app" }, enabled: true, lastRun: new Date(Date.now() - 3600000 * 2).toISOString(), runCount: 12, createdAt: new Date(Date.now() - 86400000 * 14).toISOString() },
  { id: "auto-2", name: "Campaign Launch Notification", description: "Send a notification when any campaign goes live", trigger: "campaign_launched", action: "send_notification", config: { priority: "high" }, enabled: true, lastRun: new Date(Date.now() - 3600000 * 8).toISOString(), runCount: 8, createdAt: new Date(Date.now() - 86400000 * 10).toISOString() },
  { id: "auto-3", name: "Auto-Pause on Budget", description: "Pause campaigns that exceed their budget", trigger: "budget_exceeded", action: "pause_campaign", config: { threshold: "100" }, enabled: false, lastRun: null, runCount: 0, createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: "auto-4", name: "Daily Performance Summary", description: "Send daily summary of campaign performance to team", trigger: "daily_report", action: "send_report", config: { time: "09:00", format: "summary" }, enabled: true, lastRun: new Date(Date.now() - 86400000 * 1).toISOString(), runCount: 45, createdAt: new Date(Date.now() - 86400000 * 30).toISOString() },
  { id: "auto-5", name: "Campaign End Reminder", description: "Alert team when a campaign ends within 24 hours", trigger: "schedule_reminder", action: "notify_team", config: { advance: "24h" }, enabled: true, lastRun: new Date(Date.now() - 3600000 * 6).toISOString(), runCount: 6, createdAt: new Date(Date.now() - 86400000 * 20).toISOString() },
];

function load(): AutomationRule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_RULES));
    return DEFAULT_RULES;
  } catch { return []; }
}

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
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [filterEnabled, setFilterEnabled] = useState<string>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", trigger: "campaign_launched" as Trigger, action: "send_notification" as Action, config: {} as Record<string, string> });

  useEffect(() => { setRules(load()); }, []);

  function persist(updated: AutomationRule[]) {
    setRules(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function toggle(id: string) {
    setExpanded(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function toggleEnabled(id: string) {
    persist(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    const rule = rules.find(r => r.id === id);
    addToast("success", `"${rule?.name}" ${rule?.enabled ? "disabled" : "enabled"}`);
  }

  function duplicate(id: string) {
    const rule = rules.find(r => r.id === id);
    if (!rule) return;
    const copy: AutomationRule = { ...rule, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: `${rule.name} (Copy)`, enabled: false, lastRun: null, runCount: 0, createdAt: new Date().toISOString() };
    persist([copy, ...rules]);
    addToast("success", "Rule duplicated");
  }

  function handleDelete(id: string) {
    const name = rules.find(r => r.id === id)?.name;
    persist(rules.filter(r => r.id !== id));
    addToast("success", `"${name}" deleted`);
  }

  function resetForm(r?: AutomationRule) {
    if (r) setForm({ name: r.name, description: r.description, trigger: r.trigger, action: r.action, config: { ...r.config } });
    else setForm({ name: "", description: "", trigger: "campaign_launched", action: "send_notification", config: {} });
  }

  function handleSave() {
    if (!form.name.trim()) { addToast("error", "Rule name is required"); return; }
    const rule: AutomationRule = {
      id: editingId || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: form.name.trim(),
      description: form.description.trim(),
      trigger: form.trigger,
      action: form.action,
      config: form.config,
      enabled: editingId ? rules.find(r => r.id === editingId)?.enabled ?? true : true,
      lastRun: editingId ? rules.find(r => r.id === editingId)?.lastRun ?? null : null,
      runCount: editingId ? rules.find(r => r.id === editingId)?.runCount ?? 0 : 0,
      createdAt: editingId ? rules.find(r => r.id === editingId)!.createdAt : new Date().toISOString(),
    };
    let updated: AutomationRule[];
    if (editingId) { updated = rules.map(r => r.id === editingId ? rule : r); addToast("success", "Rule updated"); }
    else { updated = [rule, ...rules]; addToast("success", "Rule created"); }
    persist(updated);
    setShowForm(false);
  }

  function simulateRun(id: string) {
    persist(rules.map(r => r.id === id ? { ...r, lastRun: new Date().toISOString(), runCount: r.runCount + 1 } : r));
    addToast("success", "Rule triggered (simulated)");
  }

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
        <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> New Rule</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Total Rules</p><p className="text-2xl font-bold text-white">{rules.length}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Active</p><p className="text-2xl font-bold text-green-400">{enabledCount}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Total Runs</p><p className="text-2xl font-bold text-white">{rules.reduce((s, r) => s + r.runCount, 0).toLocaleString()}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Last Run</p><p className="text-2xl font-bold text-gray-400 text-sm">{rules.filter(r => r.lastRun).sort((a, b) => new Date(b.lastRun!).getTime() - new Date(a.lastRun!).getTime())[0]?.lastRun ? timeAgo(rules.filter(r => r.lastRun).sort((a, b) => new Date(b.lastRun!).getTime() - new Date(a.lastRun!).getTime())[0].lastRun!) : "—"}</p></div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select className="input text-sm w-auto" value={filterEnabled} onChange={e => setFilterEnabled(e.target.value)}>
          <option value="all">All Rules</option>
          <option value="enabled">Active</option>
          <option value="disabled">Disabled</option>
        </select>
        {filterEnabled !== "all" && <button onClick={() => setFilterEnabled("all")} className="text-xs text-gray-500 hover:text-gray-300">Clear</button>}
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
                  <button onClick={() => simulateRun(rule.id)} className="p-1.5 text-gray-600 hover:text-n0va-400"><RefreshCw className="w-4 h-4" /></button>
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
                        <div key={k} className="flex items-center gap-2 text-xs"><span className="text-gray-600 capitalize">{k.replace(/_/g, " ")}:</span><span className="text-gray-300">{v}</span></div>
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
