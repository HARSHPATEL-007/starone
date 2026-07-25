import React, { useEffect, useState } from "react";
import { Plus, BarChart3, LineChart, PieChart, Table2, Filter, Download, Clock, Trash2, Save, FileText, GripVertical, Settings, Calendar, Mail, Eye, RefreshCw, X, Edit3, Check, AlertCircle, TrendingUp, MousePointer, DollarSign, Target, Users, PieChartIcon, Layout, List } from "lucide-react";
import { api } from "../api/client";
import { SkeletonCard } from "../components/Skeleton";
import { useToast } from "../components/Toast";

const WIDGET_ICONS: Record<string, any> = {
  metric_card: Eye,
  line_chart: TrendingUp,
  bar_chart: BarChart3,
  pie_chart: PieChartIcon,
  table: Table2,
  funnel: Layout,
  comparison: BarChart3,
};

const CHART_COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

export default function ReportBuilder() {
  const { addToast } = useToast();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [metricsDef, setMetricsDef] = useState<any[]>([]);
  const [chartTypes, setChartTypes] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [editMode, setEditMode] = useState<"view" | "edit">("view");
  const [generatedData, setGeneratedData] = useState<any>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "", dateRange: "last_30" });
  const [scheduleForm, setScheduleForm] = useState({ frequency: "weekly", dayOfWeek: 1, time: "09:00", recipients: "", format: "pdf" });
  const [widgetPalette, setWidgetPalette] = useState<any[]>([]);

  async function load() {
    setLoading(true);
    try {
      const [r, m] = await Promise.all([api.reportBuilder.list(), api.reportBuilder.metrics()]);
      setReports(r);
      setMetricsDef(m.metrics);
      setChartTypes(m.chartTypes);
    } catch { addToast("error", "Failed to load reports"); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function selectReport(r: any) {
    setSelectedReport(r);
    setEditMode("view");
    setGeneratedData(null);
    setWidgetPalette(r.widgets || []);
  }

  async function generateReport() {
    if (!selectedReport) return;
    setGenLoading(true);
    try {
      const data = await api.reportBuilder.generate(selectedReport.id);
      setGeneratedData(data);
    } catch { addToast("error", "Failed to generate report"); }
    setGenLoading(false);
  }

  async function handleCreate() {
    if (!createForm.name) { addToast("error", "Report name required"); return; }
    try {
      const r = await api.reportBuilder.create(createForm);
      addToast("success", "Report created");
      setReports(prev => [...prev, r]);
      setShowCreate(false);
      setCreateForm({ name: "", description: "", dateRange: "last_30" });
      selectReport(r);
    } catch { addToast("error", "Failed to create report"); }
  }

  async function handleDelete(id: string) {
    try {
      await api.reportBuilder.delete(id);
      setReports(prev => prev.filter(r => r.id !== id));
      if (selectedReport?.id === id) { setSelectedReport(null); setGeneratedData(null); }
      addToast("success", "Report deleted");
    } catch { addToast("error", "Failed to delete"); }
  }

  async function handleSchedule() {
    if (!selectedReport) return;
    try {
      const recipients = scheduleForm.recipients.split(",").map((r: string) => r.trim()).filter(Boolean);
      await api.reportBuilder.schedule(selectedReport.id, { ...scheduleForm, recipients });
      addToast("success", "Report scheduled");
      setShowSchedule(false);
      const updated = await api.reportBuilder.get(selectedReport.id);
      setSelectedReport(updated);
    } catch { addToast("error", "Failed to schedule"); }
  }

  async function handleUnschedule() {
    if (!selectedReport) return;
    try {
      await api.reportBuilder.unschedule(selectedReport.id);
      addToast("success", "Schedule removed");
      const updated = await api.reportBuilder.get(selectedReport.id);
      setSelectedReport(updated);
    } catch { addToast("error", "Failed to remove schedule"); }
  }

  async function saveWidgets() {
    if (!selectedReport) return;
    try {
      await api.reportBuilder.update(selectedReport.id, { widgets: widgetPalette });
      addToast("success", "Widgets saved");
      setEditMode("view");
      setSelectedReport({ ...selectedReport, widgets: [...widgetPalette] });
    } catch { addToast("error", "Failed to save widgets"); }
  }

  function addWidget(type: string) {
    const metrics = metricsDef[0]?.key || "impressions";
    const chart = chartTypes.find((c: any) => c.type === type);
    const newWidget = {
      id: `w_${Date.now()}`,
      type,
      title: chart?.label || type,
      metric: ["metric_card", "line_chart", "bar_chart", "comparison"].includes(type) ? metrics : undefined,
      dimension: type === "pie_chart" ? "platform" : undefined,
      size: "medium",
      position: { x: widgetPalette.length % 2, y: Math.floor(widgetPalette.length / 2) },
    };
    setWidgetPalette(prev => [...prev, newWidget]);
  }

  function removeWidget(id: string) {
    setWidgetPalette(prev => prev.filter(w => w.id !== id));
  }

  function updateWidget(id: string, data: any) {
    setWidgetPalette(prev => prev.map(w => w.id === id ? { ...w, ...data } : w));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FileText className="w-6 h-6 text-n0va-400" />
            Custom Report Builder
          </h1>
          <p className="text-gray-500 mt-1">Design, generate, and schedule custom reports</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New Report
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-2">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">My Reports</h2>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              <FileText className="w-8 h-8 mx-auto mb-2" />
              No reports yet
            </div>
          ) : reports.map((r) => (
            <div key={r.id} className={`card p-3 cursor-pointer transition-colors ${selectedReport?.id === r.id ? "border-n0va-500/50 bg-n0va-600/10" : "hover:border-gray-700"}`} onClick={() => selectReport(r)}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white truncate">{r.name}</p>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="text-gray-600 hover:text-red-400 p-0.5">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1 truncate">{r.description || "No description"}</p>
              <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-600">
                <span>{r.widgets?.length || 0} widgets</span>
                <span>·</span>
                <span>{r.dateRange}</span>
                {r.schedule && <><span>·</span><Clock className="w-3 h-3 text-green-400" /></>}
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-3">
          {!selectedReport ? (
            <div className="card p-12 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3" />
              <p>Select a report or create a new one</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">{selectedReport.name}</h2>
                  <p className="text-xs text-gray-500">{selectedReport.description} · {selectedReport.dateRange}</p>
                </div>
                <div className="flex items-center gap-2">
                  {editMode === "view" ? (
                    <>
                      <button onClick={() => setEditMode("edit")} className="btn-ghost text-xs flex items-center gap-1"><Edit3 className="w-3.5 h-3.5" /> Edit Widgets</button>
                      <button onClick={generateReport} className="btn-secondary text-xs flex items-center gap-1" disabled={genLoading}>
                        <RefreshCw className={`w-3.5 h-3.5 ${genLoading ? "animate-spin" : ""}`} /> Generate
                      </button>
                      {selectedReport.schedule ? (
                        <button onClick={handleUnschedule} className="btn-ghost text-xs text-red-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Unschedule</button>
                      ) : (
                        <button onClick={() => setShowSchedule(true)} className="btn-ghost text-xs flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Schedule</button>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mr-2">
                        {chartTypes.map((ct: any) => (
                          <button key={ct.type} onClick={() => addWidget(ct.type)} className="btn-ghost text-xs p-1.5" title={ct.label}>
                            {ct.type === "metric_card" ? <Eye className="w-3.5 h-3.5" /> : ct.type === "line_chart" ? <TrendingUp className="w-3.5 h-3.5" /> : ct.type === "bar_chart" ? <BarChart3 className="w-3.5 h-3.5" /> : ct.type === "pie_chart" ? <PieChartIcon className="w-3.5 h-3.5" /> : ct.type === "table" ? <Table2 className="w-3.5 h-3.5" /> : ct.type === "funnel" ? <Layout className="w-3.5 h-3.5" /> : <BarChart3 className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                      </div>
                      <button onClick={saveWidgets} className="btn-primary text-xs flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Save</button>
                      <button onClick={() => { setEditMode("view"); setWidgetPalette(selectedReport.widgets || []); }} className="btn-ghost text-xs">Cancel</button>
                    </>
                  )}
                </div>
              </div>

              {selectedReport.schedule && (
                <div className="flex items-center gap-3 text-xs bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <Clock className="w-4 h-4 text-green-400" />
                  <span className="text-green-300">Scheduled: {selectedReport.schedule.frequency} at {selectedReport.schedule.time} · {selectedReport.schedule.recipients.length} recipient(s) · {selectedReport.schedule.format}</span>
                </div>
              )}

              {editMode === "edit" ? (
                <div className="space-y-3">
                  {widgetPalette.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-800 rounded-lg">
                      <Plus className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">Add widgets using the buttons above</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {widgetPalette.map((w) => (
                        <div key={w.id} className="card p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {React.createElement(WIDGET_ICONS[w.type] || FileText, { className: "w-4 h-4 text-n0va-400" })}
                              <input className="text-sm font-medium text-white bg-transparent border-b border-gray-700 focus:border-n0va-500 outline-none" value={w.title} onChange={e => updateWidget(w.id, { title: e.target.value })} />
                            </div>
                            <button onClick={() => removeWidget(w.id)} className="text-gray-600 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <select className="input text-xs py-1" value={w.metric || ""} onChange={e => updateWidget(w.id, { metric: e.target.value })}>
                              {metricsDef.map((m: any) => <option key={m.key} value={m.key}>{m.label}</option>)}
                            </select>
                            <select className="input text-xs py-1" value={w.size} onChange={e => updateWidget(w.id, { size: e.target.value })}>
                              <option value="small">Small</option>
                              <option value="medium">Medium</option>
                              <option value="large">Large</option>
                              <option value="full">Full</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : genLoading ? (
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : generatedData ? (
                <div className="space-y-4">
                  {generatedData.widgets?.map((widget: any) => (
                    <div key={widget.widgetId} className="card p-4">
                      <h3 className="text-sm font-semibold text-white mb-3">{widget.title}</h3>
                      {widget.type === "metric_card" && (
                        <div>
                          <p className="text-2xl font-bold text-white">{widget.total?.toLocaleString() || "—"}</p>
                          {widget.change !== undefined && (
                            <p className={`text-xs mt-1 ${widget.change >= 0 ? "text-green-400" : "text-red-400"}`}>
                              {widget.change >= 0 ? "+" : ""}{widget.change.toFixed(1)}% vs previous period
                            </p>
                          )}
                        </div>
                      )}
                      {widget.type === "line_chart" && widget.series && (
                        <div className="space-y-1">
                          {widget.series.slice(-14).map((s: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className="text-gray-500 w-24 truncate">{s.label}</span>
                              <div className="flex-1 h-4 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-n0va-500 rounded-full" style={{ width: `${Math.min((s.value / Math.max(...widget.series.map((x: any) => x.value))) * 100, 100)}%` }} />
                              </div>
                              <span className="text-white w-16 text-right">{s.value.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {widget.type === "pie_chart" && widget.segments && (
                        <div className="space-y-2">
                          {widget.segments.map((s: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                              <span className="text-gray-400 flex-1">{s.label}</span>
                              <span className="text-white font-medium">${s.value.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {widget.type === "table" && widget.columns && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead><tr className="text-gray-500 border-b border-gray-800">
                              {widget.columns.map((col: string, i: number) => <th key={i} className="text-left py-2 px-2 font-medium">{col}</th>)}
                            </tr></thead>
                            <tbody>
                              {widget.rows?.map((row: any[], i: number) => (
                                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                  {row.map((cell: any, j: number) => <td key={j} className="py-2 px-2 text-gray-300">{cell}</td>)}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {widget.type === "funnel" && widget.stages && (
                        <div className="space-y-2">
                          {widget.stages.map((stage: any, i: number) => (
                            <div key={i} className="flex items-center gap-3">
                              <span className="text-xs text-gray-500 w-24">{stage.label}</span>
                              <div className="flex-1 h-6 bg-gray-800 rounded-lg overflow-hidden relative">
                                <div className="h-full bg-n0va-500/60 rounded-lg" style={{ width: `${(stage.value / widget.stages[0]?.value) * 100}%` }} />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white font-medium">{stage.value.toLocaleString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <BarChart3 className="w-10 h-10 mx-auto mb-2" />
                  <p>Click "Generate" to preview report data</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="card p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">Create New Report</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Name *</label>
                <input className="input w-full" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Monthly Performance Report" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Description</label>
                <textarea className="input w-full" rows={2} value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} placeholder="Campaign summary for stakeholders" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Date Range</label>
                <select className="input w-full" value={createForm.dateRange} onChange={e => setCreateForm({ ...createForm, dateRange: e.target.value })}>
                  <option value="last_7">Last 7 days</option>
                  <option value="last_30">Last 30 days</option>
                  <option value="last_90">Last 90 days</option>
                  <option value="this_month">This month</option>
                  <option value="last_month">Last month</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <button onClick={handleCreate} className="btn-primary flex-1">Create Report</button>
              <button onClick={() => setShowCreate(false)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showSchedule && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowSchedule(false)}>
          <div className="card p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">Schedule Report</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Frequency</label>
                <select className="input w-full" value={scheduleForm.frequency} onChange={e => setScheduleForm({ ...scheduleForm, frequency: e.target.value })}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              {scheduleForm.frequency === "weekly" && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Day of Week</label>
                  <select className="input w-full" value={scheduleForm.dayOfWeek} onChange={e => setScheduleForm({ ...scheduleForm, dayOfWeek: Number(e.target.value) })}>
                    <option value="0">Sunday</option>
                    <option value="1">Monday</option>
                    <option value="2">Tuesday</option>
                    <option value="3">Wednesday</option>
                    <option value="4">Thursday</option>
                    <option value="5">Friday</option>
                    <option value="6">Saturday</option>
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Time</label>
                <input type="time" className="input w-full" value={scheduleForm.time} onChange={e => setScheduleForm({ ...scheduleForm, time: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Recipients (comma-separated emails)</label>
                <input className="input w-full" value={scheduleForm.recipients} onChange={e => setScheduleForm({ ...scheduleForm, recipients: e.target.value })} placeholder="alice@co.com, bob@co.com" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Format</label>
                <select className="input w-full" value={scheduleForm.format} onChange={e => setScheduleForm({ ...scheduleForm, format: e.target.value })}>
                  <option value="pdf">PDF</option>
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <button onClick={handleSchedule} className="btn-primary flex-1">Schedule</button>
              <button onClick={() => setShowSchedule(false)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
