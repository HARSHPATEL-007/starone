import { useEffect, useState } from "react";
import { Calendar, Clock, Plus, X, Trash2, ChevronLeft, ChevronRight, Loader, Zap, Pause, Archive, DollarSign, Send, AlertCircle, ExternalLink, Filter, Repeat, Edit3, CheckCircle, ToggleLeft, ToggleRight } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";

const ACTION_ICONS: Record<string, any> = { launch: Zap, pause: Pause, archive: Archive, budget_change: DollarSign, status_change: Send };
const ACTION_COLORS: Record<string, string> = { launch: "text-green-400 bg-green-500/10", pause: "text-yellow-400 bg-yellow-500/10", archive: "text-gray-400 bg-gray-500/10", budget_change: "text-blue-400 bg-blue-500/10", status_change: "text-purple-400 bg-purple-500/10" };
const ACTION_LABELS: Record<string, string> = { launch: "Launch", pause: "Pause", archive: "Archive", budget_change: "Budget Change", status_change: "Status Change" };
const RECURRENCE_OPTIONS = [
  { value: "", label: "One-time" }, { value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" },
];

export default function CampaignScheduler() {
  const { addToast } = useToast();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [filterAction, setFilterAction] = useState("all");
  const [showExecuted, setShowExecuted] = useState(false);
  const [form, setForm] = useState({ campaignId: "", type: "launch", executeAt: "", params: "{}", recurrence: "" });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        api.scheduler.list().catch(() => []),
        api.campaigns.list().catch(() => ({ campaigns: [] })),
      ]);
      setSchedules(s);
      setCampaigns(c.campaigns || c || []);
    } finally { setLoading(false); }
  }

  function resetForm(s?: any) {
    if (s) {
      const dt = s.executeAt ? new Date(s.executeAt).toISOString().slice(0, 16) : "";
      setForm({ campaignId: s.campaignId || "", type: s.type || "launch", executeAt: dt, params: JSON.stringify(s.params || {}, null, 1), recurrence: s.recurrence || "" });
    } else {
      setForm({ campaignId: "", type: "launch", executeAt: "", params: "{}", recurrence: "" });
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      let params: Record<string, unknown> = {};
      try { params = JSON.parse(form.params); } catch { addToast("error", "Invalid JSON in params"); return; }
      const payload = {
        campaignId: form.campaignId,
        type: form.type,
        executeAt: new Date(form.executeAt).toISOString(),
        params: { ...params, recurrence: form.recurrence || undefined },
      };

      if (editingId) {
        await api.entities.update("scheduled_actions", editingId, payload);
        addToast("success", "Schedule updated");
      } else {
        await api.scheduler.schedule(payload);
        addToast("success", "Action scheduled");
      }
      setShowForm(false);
      setEditingId(null);
      loadAll();
    } catch { addToast("error", "Failed to save schedule"); }
  }

  async function handleCancel(id: string) {
    try {
      await api.scheduler.cancel(id);
      setSchedules(prev => prev.filter(s => s._id !== id));
      addToast("success", "Scheduled action cancelled");
    } catch { addToast("error", "Failed to cancel"); }
  }

  async function handleToggleStatus(s: any) {
    try {
      const newStatus = s.active === false ? true : false;
      await api.entities.update("scheduled_actions", s._id, { active: newStatus });
      setSchedules(prev => prev.map(x => x._id === s._id ? { ...x, active: newStatus } : x));
      addToast("success", newStatus ? "Schedule enabled" : "Schedule disabled");
    } catch { addToast("error", "Failed to update status"); }
  }

  const now = new Date();
  const upcoming = schedules
    .filter(s => new Date(s.executeAt) > now && s.active !== false)
    .filter(s => filterAction === "all" || s.type === filterAction)
    .sort((a, b) => new Date(a.executeAt).getTime() - new Date(b.executeAt).getTime());
  const past = schedules
    .filter(s => new Date(s.executeAt) <= now || s.active === false)
    .filter(s => filterAction === "all" || s.type === filterAction)
    .sort((a, b) => new Date(b.executeAt).getTime() - new Date(a.executeAt).getTime());

  const campaignName = (id: string) => campaigns.find(c => c._id === id || c.id === id)?.name || id;

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function timeUntil(iso: string) {
    const diff = new Date(iso).getTime() - Date.now();
    if (diff < 0) return "Overdue";
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 48) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  function getStatusIcon(s: any) {
    if (s.active === false) return ToggleRight;
    if (s.params?.recurrence) return Repeat;
    return null;
  }

  const actionTypes = [...new Set(schedules.map(s => s.type))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Calendar className="w-6 h-6 text-n0va-400" />
            Campaign Scheduler
          </h1>
          <p className="text-gray-400 mt-1">{upcoming.length} upcoming · {past.length} executed/disabled</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-900 rounded-lg p-0.5 border border-gray-800">
            <button className={`px-3 py-1.5 text-xs rounded-md ${viewMode === "list" ? "bg-n0va-600/20 text-n0va-400" : "text-gray-500"}`} onClick={() => setViewMode("list")}>List</button>
            <button className={`px-3 py-1.5 text-xs rounded-md ${viewMode === "calendar" ? "bg-n0va-600/20 text-n0va-400" : "text-gray-500"}`} onClick={() => setViewMode("calendar")}>Calendar</button>
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={() => { setEditingId(null); resetForm(); setShowForm(true); }}><Plus className="w-4 h-4" /> Schedule Action</button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">{editingId ? "Edit Schedule" : "Schedule Campaign Action"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div><label className="label">Campaign</label><select className="input" value={form.campaignId} onChange={e => setForm({ ...form, campaignId: e.target.value })} required><option value="">Select campaign...</option>{campaigns.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Action</label><select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div><label className="label">Recurrence</label><select className="input" value={form.recurrence} onChange={e => setForm({ ...form, recurrence: e.target.value })}>{RECURRENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
              </div>
              <div><label className="label">Execute At</label><input className="input" type="datetime-local" value={form.executeAt} onChange={e => setForm({ ...form, executeAt: e.target.value })} required /></div>
              <div><label className="label">Params (JSON) <span className="text-gray-500">— optional</span></label><textarea className="input font-mono text-xs min-h-[80px]" value={form.params} onChange={e => setForm({ ...form, params: e.target.value })} placeholder='{"budget": {"daily": 5000}}' /></div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{editingId ? "Update" : "Schedule"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-gray-600" />
        <button className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${filterAction === "all" ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500 hover:border-gray-600"}`} onClick={() => setFilterAction("all")}>All</button>
        {actionTypes.map(t => (
          <button key={t} className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${filterAction === t ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500 hover:border-gray-600"}`} onClick={() => setFilterAction(t)}>{ACTION_LABELS[t] || t}</button>
        ))}
        <button onClick={() => setShowExecuted(!showExecuted)} className={`text-xs px-2.5 py-1 rounded-lg border ${showExecuted ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500"}`}>Show Executed</button>
      </div>

      {viewMode === "calendar" ? (
        <CalendarView schedules={upcoming} campaignName={campaignName} formatDate={formatDate} onCancel={handleCancel} onEdit={(s) => { resetForm(s); setEditingId(s._id); setShowForm(true); }} onToggle={handleToggleStatus} />
      ) : (
        <>
          {loading && <div className="flex items-center justify-center py-12"><Loader className="w-6 h-6 animate-spin text-n0va-400" /></div>}

          {!loading && schedules.length === 0 && (
            <div className="card p-12 flex flex-col items-center justify-center text-center">
              <Calendar className="w-12 h-12 text-gray-700 mb-4" />
              <h3 className="text-lg font-semibold text-gray-300 mb-2">No scheduled actions</h3>
              <p className="text-sm text-gray-500 max-w-sm">Schedule campaign launches, pauses, budget changes, or status updates for future execution.</p>
            </div>
          )}

          {!loading && upcoming.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> Upcoming ({upcoming.length})</h3>
              <div className="space-y-2">
                {upcoming.map(s => {
                  const Icon = ACTION_ICONS[s.type] || Send;
                  const colorClass = ACTION_COLORS[s.type] || "text-gray-400 bg-gray-500/10";
                  const hasRecurrence = s.params?.recurrence;
                  return (
                    <div key={s._id} className={`card p-4 flex items-start justify-between gap-4 ${s.active === false ? "opacity-50" : ""}`}>
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}><Icon className="w-5 h-5" /></div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-white">{ACTION_LABELS[s.type] || s.type}</span>
                            <span className="text-xs text-gray-500">{campaignName(s.campaignId)}</span>
                            <span className="text-[10px] text-n0va-400 bg-n0va-500/10 px-1.5 py-0.5 rounded-full">{timeUntil(s.executeAt)}</span>
                            {hasRecurrence && <span className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-full flex items-center gap-1"><Repeat className="w-2.5 h-2.5" /> {hasRecurrence}</span>}
                            {s.active === false && <span className="text-[10px] text-gray-500 bg-gray-500/10 px-1.5 py-0.5 rounded-full">Disabled</span>}
                          </div>
                          <p className="text-xs text-gray-500 mt-1"><Clock className="w-3 h-3 inline mr-1" />{formatDate(s.executeAt)}</p>
                          {s.params && Object.keys(s.params).filter(k => k !== "recurrence").length > 0 && (
                            <pre className="text-[10px] text-gray-600 mt-1 bg-gray-800/50 p-1.5 rounded">{JSON.stringify(Object.fromEntries(Object.entries(s.params).filter(([k]) => k !== "recurrence")), null, 1).slice(0, 120)}</pre>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => handleToggleStatus(s)} className="text-gray-600 hover:text-n0va-400" title={s.active === false ? "Enable" : "Disable"}>
                          {s.active === false ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button onClick={() => { resetForm(s); setEditingId(s._id); setShowForm(true); }} className="text-gray-600 hover:text-gray-300"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => handleCancel(s._id)} className="text-gray-600 hover:text-red-400" title="Cancel"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!loading && showExecuted && past.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> Executed / Disabled ({past.length})</h3>
              <div className="space-y-1">
                {past.slice(0, 20).map(s => {
                  const Icon = ACTION_ICONS[s.type] || Send;
                  const colorClass = ACTION_COLORS[s.type] || "text-gray-400 bg-gray-500/10";
                  return (
                    <div key={s._id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/30 opacity-60 hover:opacity-100 transition-opacity">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}><Icon className="w-4 h-4" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-white font-medium">{ACTION_LABELS[s.type] || s.type} — {campaignName(s.campaignId)}</p>
                          {s.active === false && <span className="text-[10px] text-gray-500">Disabled</span>}
                          {s.params?.recurrence && <span className="text-[10px] text-purple-400">{s.params.recurrence}</span>}
                        </div>
                        <p className="text-[10px] text-gray-600">{formatDate(s.executeAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CalendarView({ schedules, campaignName, formatDate, onCancel, onEdit, onToggle }: {
  schedules: any[]; campaignName: (id: string) => string; formatDate: (iso: string) => string;
  onCancel: (id: string) => void; onEdit: (s: any) => void; onToggle: (s: any) => void;
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const now = new Date();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; });
  const daySchedules = days.map(day => ({ day, items: schedules.filter(s => { const sd = new Date(s.executeAt); return sd.getDate() === day.getDate() && sd.getMonth() === day.getMonth() && sd.getFullYear() === day.getFullYear(); }) }));
  const ACTION_COLORS_CAL: Record<string, string> = { launch: "border-l-green-500 bg-green-500/5", pause: "border-l-yellow-500 bg-yellow-500/5", archive: "border-l-gray-500 bg-gray-500/5", budget_change: "border-l-blue-500 bg-blue-500/5", status_change: "border-l-purple-500 bg-purple-500/5" };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <button className="btn-secondary p-1.5" onClick={() => setWeekOffset(weekOffset - 1)}><ChevronLeft className="w-4 h-4" /></button>
        <span className="text-sm text-white font-medium">
          {weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })} — {new Date(weekStart.getTime() + 6 * 86400000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </span>
        <button className="btn-secondary p-1.5" onClick={() => setWeekOffset(weekOffset + 1)}><ChevronRight className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {daySchedules.map(({ day, items }) => {
          const isToday = day.toDateString() === now.toDateString();
          return (
            <div key={day.toISOString()} className={`rounded-lg border ${isToday ? "border-n0va-600/40" : "border-gray-800"} min-h-[160px]`}>
              <div className={`text-center text-xs font-medium py-1.5 border-b border-gray-800 ${isToday ? "text-n0va-400 bg-n0va-600/10" : "text-gray-500"}`}>
                {day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </div>
              <div className="p-1.5 space-y-1">
                {items.length === 0 && <p className="text-[10px] text-gray-700 text-center py-2">—</p>}
                {items.map(s => (
                  <div key={s._id} className={`text-[10px] p-1.5 rounded border-l-2 ${ACTION_COLORS_CAL[s.type] || "border-l-gray-600"} group relative`}>
                    <p className="text-white font-medium truncate">{campaignName(s.campaignId)}</p>
                    <p className="text-gray-500 truncate">{new Date(s.executeAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</p>
                    {s.params?.recurrence && <p className="text-purple-400 truncate">{s.params.recurrence}</p>}
                    <div className="absolute -top-1 -right-1 hidden group-hover:flex gap-0.5">
                      <button onClick={() => onEdit(s)} className="w-3.5 h-3.5 bg-gray-600 rounded-full text-white flex items-center justify-center"><Edit3 className="w-2.5 h-2.5" /></button>
                      <button onClick={() => onToggle(s)} className="w-3.5 h-3.5 bg-amber-500 rounded-full text-white flex items-center justify-center"><ToggleLeft className="w-2.5 h-2.5" /></button>
                      <button onClick={() => onCancel(s._id)} className="w-3.5 h-3.5 bg-red-500 rounded-full text-white flex items-center justify-center"><X className="w-2.5 h-2.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
