import { useState, useEffect } from "react";
import { LayoutDashboard, Plus, X, Edit3, Trash2, ChevronDown, ChevronRight, GripVertical, Save, Eye, EyeOff, Copy, BarChart3, TrendingUp, DollarSign, Target, Users, Megaphone, CheckCircle, Activity, Bot, Palette, Calendar, Bell, Zap, Crosshair, Star, Clock } from "lucide-react";
import { useToast } from "../components/Toast";

interface DashboardWidget {
  id: string;
  type: string;
  label: string;
  visible: boolean;
  width: "full" | "half" | "third";
}

interface CustomDashboard {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "n0va_custom_dashboards";

const WIDGET_TEMPLATES: { type: string; label: string; icon: any; defaultWidth: "full" | "half" | "third"; desc: string }[] = [
  { type: "kpi_revenue", label: "Revenue KPI", icon: DollarSign, defaultWidth: "third", desc: "Total revenue, ROAS, and CPA metrics" },
  { type: "kpi_campaigns", label: "Campaign KPIs", icon: Megaphone, defaultWidth: "third", desc: "Active, paused, draft campaign counts" },
  { type: "kpi_audience", label: "Audience KPIs", icon: Users, defaultWidth: "third", desc: "Total audience reach and segments" },
  { type: "chart_performance", label: "Performance Chart", icon: TrendingUp, defaultWidth: "full", desc: "Revenue and impressions trend" },
  { type: "recent_campaigns", label: "Recent Campaigns", icon: Megaphone, defaultWidth: "half", desc: "Last 5 campaigns with status" },
  { type: "pending_approvals", label: "Pending Approvals", icon: CheckCircle, defaultWidth: "half", desc: "Campaigns awaiting approval" },
  { type: "budget_status", label: "Budget Status", icon: DollarSign, defaultWidth: "half", desc: "Budget utilization across campaigns" },
  { type: "activity_feed", label: "Recent Activity", icon: Activity, defaultWidth: "half", desc: "Latest team actions and updates" },
  { type: "agent_status", label: "AI Agent Status", icon: Bot, defaultWidth: "third", desc: "AI agent health and run count" },
  { type: "goals_progress", label: "Goals Progress", icon: Target, defaultWidth: "third", desc: "OKR completion percentages" },
  { type: "ab_testing", label: "A/B Test Status", icon: Zap, defaultWidth: "third", desc: "Running and completed test counts" },
  { type: "calendar_preview", label: "Upcoming Schedule", icon: Calendar, defaultWidth: "half", desc: "Next 7 days campaign schedule" },
  { type: "approval_queue", label: "Approval Queue", icon: CheckCircle, defaultWidth: "half", desc: "Items needing your review" },
  { type: "competitive_snapshot", label: "Competitive Snapshot", icon: Crosshair, defaultWidth: "half", desc: "Competitor count and recent ads" },
  { type: "recent_comments", label: "Recent Comments", icon: Star, defaultWidth: "half", desc: "Latest team discussions" },
];

const DASHBOARD_DEMOS: CustomDashboard[] = [
  {
    id: "db-1", name: "Executive Overview",
    widgets: [
      { id: "w1", type: "kpi_revenue", label: "Revenue KPI", visible: true, width: "third" },
      { id: "w2", type: "kpi_campaigns", label: "Campaign KPIs", visible: true, width: "third" },
      { id: "w3", type: "kpi_audience", label: "Audience KPIs", visible: true, width: "third" },
      { id: "w4", type: "chart_performance", label: "Performance Chart", visible: true, width: "full" },
      { id: "w5", type: "recent_campaigns", label: "Recent Campaigns", visible: true, width: "half" },
      { id: "w6", type: "pending_approvals", label: "Pending Approvals", visible: true, width: "half" },
      { id: "w7", type: "goals_progress", label: "Goals Progress", visible: true, width: "half" },
      { id: "w8", type: "activity_feed", label: "Recent Activity", visible: true, width: "half" },
    ],
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: "db-2", name: "Campaign Performance",
    widgets: [
      { id: "w9", type: "chart_performance", label: "Performance Chart", visible: true, width: "full" },
      { id: "w10", type: "recent_campaigns", label: "Recent Campaigns", visible: true, width: "half" },
      { id: "w11", type: "budget_status", label: "Budget Status", visible: true, width: "half" },
      { id: "w12", type: "ab_testing", label: "A/B Test Status", visible: true, width: "third" },
      { id: "w13", type: "competitive_snapshot", label: "Competitive Snapshot", visible: true, width: "third" },
      { id: "w14", type: "approval_queue", label: "Approval Queue", visible: true, width: "third" },
    ],
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "db-3", name: "Team Overview",
    widgets: [
      { id: "w15", type: "agent_status", label: "AI Agent Status", visible: true, width: "third" },
      { id: "w16", type: "activity_feed", label: "Recent Activity", visible: true, width: "half" },
      { id: "w17", type: "recent_comments", label: "Recent Comments", visible: true, width: "half" },
      { id: "w18", type: "calendar_preview", label: "Upcoming Schedule", visible: true, width: "full" },
    ],
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
];

function load(): CustomDashboard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DASHBOARD_DEMOS));
    return DASHBOARD_DEMOS;
  } catch { return []; }
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  if (hrs < 168) return `${Math.floor(hrs / 24)}d ago`;
  return new Date(date).toLocaleDateString();
}

/* --- Widget renders --- */

function KpiCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: any; color: string }) {
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className={`p-2.5 rounded-lg ${color} shrink-0`}><Icon className="w-5 h-5" /></div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-white">{value}</p>
        {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function PlaceholderWidget({ label, icon: Icon }: { label: string; icon: any }) {
  return (
    <div className="card p-6 flex flex-col items-center justify-center text-center min-h-[120px]">
      <Icon className="w-6 h-6 text-gray-700 mb-2" />
      <p className="text-xs text-gray-600">{label} widget</p>
      <p className="text-[10px] text-gray-700 mt-1">Data preview</p>
    </div>
  );
}

export default function CustomDashboards() {
  const { addToast } = useToast();
  const [dashboards, setDashboards] = useState<CustomDashboard[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editName, setEditName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);

  useEffect(() => {
    const loaded = load();
    setDashboards(loaded);
    if (loaded.length > 0 && !activeId) setActiveId(loaded[0].id);
  }, []);

  const active = dashboards.find(d => d.id === activeId);

  function persist(updated: CustomDashboard[]) {
    setDashboards(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function handleCreate() {
    if (!editName.trim()) { addToast("error", "Dashboard name is required"); return; }
    const now = new Date().toISOString();
    const db: CustomDashboard = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: editName.trim(),
      widgets: [
        { id: "w-" + Date.now().toString(36), type: "kpi_revenue", label: "Revenue KPI", visible: true, width: "third" },
        { id: "w-" + Date.now().toString(36) + "b", type: "recent_campaigns", label: "Recent Campaigns", visible: true, width: "full" },
      ],
      createdAt: now, updatedAt: now,
    };
    persist([db, ...dashboards]);
    setActiveId(db.id);
    setShowCreate(false);
    setEditName("");
    addToast("success", "Dashboard created");
  }

  function handleDelete(id: string) {
    const db = dashboards.find(d => d.id === id);
    persist(dashboards.filter(d => d.id !== id));
    if (activeId === id) setActiveId(dashboards.filter(d => d.id !== id)[0]?.id || null);
    addToast("success", `"${db?.name}" deleted`);
  }

  function duplicateDashboard(id: string) {
    const db = dashboards.find(d => d.id === id);
    if (!db) return;
    const copy: CustomDashboard = {
      ...db, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: `${db.name} (Copy)`,
      widgets: db.widgets.map(w => ({ ...w, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) })),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    persist([copy, ...dashboards]);
    addToast("success", "Dashboard duplicated");
  }

  function toggleWidgetVisibility(widgetId: string) {
    if (!active) return;
    persist(dashboards.map(d => d.id === active.id ? {
      ...d, widgets: d.widgets.map(w => w.id === widgetId ? { ...w, visible: !w.visible } : w),
      updatedAt: new Date().toISOString(),
    } : d));
  }

  function removeWidget(widgetId: string) {
    if (!active) return;
    persist(dashboards.map(d => d.id === active.id ? {
      ...d, widgets: d.widgets.filter(w => w.id !== widgetId),
      updatedAt: new Date().toISOString(),
    } : d));
  }

  function addWidget(type: string) {
    if (!active) return;
    const tmpl = WIDGET_TEMPLATES.find(t => t.type === type);
    if (!tmpl) return;
    if (active.widgets.some(w => w.type === type)) { addToast("error", "Widget already added"); setShowWidgetPicker(false); return; }
    const widget: DashboardWidget = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type, label: tmpl.label, visible: true, width: tmpl.defaultWidth,
    };
    persist(dashboards.map(d => d.id === active.id ? {
      ...d, widgets: [...d.widgets, widget],
      updatedAt: new Date().toISOString(),
    } : d));
    setShowWidgetPicker(false);
    addToast("success", `"${tmpl.label}" added`);
  }

  function renameDashboard() {
    if (!active || !editName.trim()) return;
    persist(dashboards.map(d => d.id === active.id ? { ...d, name: editName.trim(), updatedAt: new Date().toISOString() } : d));
    setEditingId(null);
    addToast("success", "Dashboard renamed");
  }

  if (dashboards.length === 0) {
    return (
      <div className="card p-12 flex flex-col items-center justify-center text-center">
        <LayoutDashboard className="w-12 h-12 text-gray-700 mb-4" />
        <h3 className="text-lg font-semibold text-gray-300 mb-2">No custom dashboards</h3>
        <p className="text-sm text-gray-500">Create your first dashboard to track the metrics that matter most.</p>
        <button onClick={() => { setEditName(""); setShowCreate(true); }} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Create Dashboard</button>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCreate(false)}>
            <div className="w-full max-w-sm bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white mb-4">Create Dashboard</h3>
              <form onSubmit={e => { e.preventDefault(); handleCreate(); }}>
                <input className="input w-full" placeholder="e.g. Executive Overview" value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
                <div className="flex justify-end gap-3 mt-4"><button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">Create</button></div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + dashboard tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {dashboards.map(db => (
            <button key={db.id} onClick={() => setActiveId(db.id)} className={`text-sm px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${activeId === db.id ? "bg-n0va-500/10 text-n0va-400 font-medium" : "text-gray-500 hover:text-gray-300"}`}>
              <LayoutDashboard className="w-3.5 h-3.5 inline mr-1.5" />{db.name}
            </button>
          ))}
          <button onClick={() => { setEditName(""); setShowCreate(true); }} className="text-sm px-3 py-2 text-gray-600 hover:text-gray-400"><Plus className="w-3.5 h-3.5" /></button>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {active && <button onClick={() => duplicateDashboard(active.id)} className="p-1.5 text-gray-600 hover:text-gray-300"><Copy className="w-4 h-4" /></button>}
          {active && <button onClick={() => { setEditingId(active.id); setEditName(active.name); }} className="p-1.5 text-gray-600 hover:text-gray-300"><Edit3 className="w-4 h-4" /></button>}
          {active && <button onClick={() => handleDelete(active.id)} className="p-1.5 text-gray-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>}
        </div>
      </div>

      {/* Rename modal */}
      {editingId && active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEditingId(null)}>
          <div className="w-full max-w-sm bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Rename Dashboard</h3>
            <form onSubmit={e => { e.preventDefault(); renameDashboard(); }}>
              <input className="input w-full" value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
              <div className="flex justify-end gap-3 mt-4"><button type="button" onClick={() => setEditingId(null)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">Save</button></div>
            </form>
          </div>
        </div>
      )}

      {active && (
        <>
          {/* Dashboard info */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{active.widgets.filter(w => w.visible).length} visible widgets · Updated {timeAgo(active.updatedAt)}</span>
            <button onClick={() => setShowWidgetPicker(true)} className="text-n0va-400 hover:text-n0va-300 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add Widget</button>
          </div>

          {/* Widget grid */}
          <div className="space-y-4">
            {/* Full width widgets */}
            <div className="space-y-4">
              {active.widgets.filter(w => w.width === "full" && w.visible).map(w => {
                const tmpl = WIDGET_TEMPLATES.find(t => t.type === w.type);
                const Icon = tmpl?.icon || BarChart3;
                return (
                  <div key={w.id} className="relative group">
                    <PlaceholderWidget label={w.label} icon={Icon} />
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => toggleWidgetVisibility(w.id)} className="p-1 bg-gray-800 rounded text-gray-500 hover:text-gray-300"><EyeOff className="w-3.5 h-3.5" /></button>
                      <button onClick={() => removeWidget(w.id)} className="p-1 bg-gray-800 rounded text-gray-500 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Half width widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {active.widgets.filter(w => w.width === "half" && w.visible).map(w => {
                const tmpl = WIDGET_TEMPLATES.find(t => t.type === w.type);
                const Icon = tmpl?.icon || BarChart3;
                return (
                  <div key={w.id} className="relative group">
                    <PlaceholderWidget label={w.label} icon={Icon} />
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => toggleWidgetVisibility(w.id)} className="p-1 bg-gray-800 rounded text-gray-500 hover:text-gray-300"><EyeOff className="w-3.5 h-3.5" /></button>
                      <button onClick={() => removeWidget(w.id)} className="p-1 bg-gray-800 rounded text-gray-500 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Third width widgets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {active.widgets.filter(w => w.width === "third" && w.visible).map(w => {
                const tmpl = WIDGET_TEMPLATES.find(t => t.type === w.type);
                const Icon = tmpl?.icon || BarChart3;
                return (
                  <div key={w.id} className="relative group">
                    <PlaceholderWidget label={w.label} icon={Icon} />
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => toggleWidgetVisibility(w.id)} className="p-1 bg-gray-800 rounded text-gray-500 hover:text-gray-300"><EyeOff className="w-3.5 h-3.5" /></button>
                      <button onClick={() => removeWidget(w.id)} className="p-1 bg-gray-800 rounded text-gray-500 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hidden widgets indicator */}
            {active.widgets.filter(w => !w.visible).length > 0 && (
              <div className="text-center py-4 text-xs text-gray-600">
                {active.widgets.filter(w => !w.visible).length} hidden widget{active.widgets.filter(w => !w.visible).length !== 1 ? "s" : ""}
                <button onClick={() => active.widgets.filter(w => !w.visible).forEach(w => toggleWidgetVisibility(w.id))} className="ml-2 text-n0va-400 hover:text-n0va-300">Show all</button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Widget picker */}
      {showWidgetPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowWidgetPicker(false)}>
          <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">Add Widget</h3><button onClick={() => setShowWidgetPicker(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {WIDGET_TEMPLATES.map(tmpl => {
                const Icon = tmpl.icon;
                const isAdded = active?.widgets.some(w => w.type === tmpl.type);
                return (
                  <button key={tmpl.type} onClick={() => addWidget(tmpl.type)} disabled={isAdded} className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${isAdded ? "border-green-500/20 bg-green-500/5 opacity-60" : "border-gray-800 hover:border-gray-700"}`}>
                    <div className="p-2 rounded-lg bg-gray-800 shrink-0"><Icon className="w-4 h-4 text-gray-400" /></div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{tmpl.label}</p>
                      <p className="text-xs text-gray-600">{tmpl.desc}</p>
                      <span className="text-[10px] text-gray-700 mt-1 inline-block capitalize">{tmpl.defaultWidth} width</span>
                    </div>
                    {isAdded && <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-1" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
