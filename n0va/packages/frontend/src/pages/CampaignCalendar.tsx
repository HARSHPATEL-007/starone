import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Filter, Clock, Plus, X, Calendar as CalendarIcon, Tag, BarChart3, List, Grid } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500 border-green-400",
  paused: "bg-yellow-500 border-yellow-400",
  draft: "bg-gray-500 border-gray-400",
  archived: "bg-gray-700 border-gray-600",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const EVENT_TYPES = [
  { value: "campaign", label: "Campaign", color: "bg-blue-500" },
  { value: "deadline", label: "Deadline", color: "bg-red-500" },
  { value: "review", label: "Review", color: "bg-amber-500" },
  { value: "holiday", label: "Holiday", color: "bg-purple-500" },
];

export default function CampaignCalendar() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterEventType, setFilterEventType] = useState("all");
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({ title: "", type: "deadline", date: new Date().toISOString().split("T")[0], notes: "" });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await api.campaigns.list();
      setCampaigns(Array.isArray(res) ? res : res.campaigns || []);
      const stored = localStorage.getItem("n0va_calendar_events");
      if (stored) setEvents(JSON.parse(stored));
    } finally { setLoading(false); }
  }

  function saveEvents(evts: any[]) {
    setEvents(evts);
    localStorage.setItem("n0va_calendar_events", JSON.stringify(evts));
  }

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!eventForm.title.trim()) return;
    const newEvent = { id: Date.now().toString(36), ...eventForm, title: eventForm.title.trim() };
    saveEvents([...events, newEvent]);
    setShowEventForm(false);
    setEventForm({ title: "", type: "deadline", date: new Date().toISOString().split("T")[0], notes: "" });
    addToast("success", "Event added");
  }

  function handleDeleteEvent(id: string) {
    saveEvents(events.filter(ev => ev.id !== id));
    addToast("success", "Event deleted");
  }

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      if (filterType !== "all" && c.type !== filterType) return false;
      return true;
    });
  }, [campaigns, filterStatus, filterType]);

  const filteredEvents = useMemo(() => {
    if (filterEventType === "all") return events;
    return events.filter(ev => ev.type === filterEventType);
  }, [events, filterEventType]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month, daysInMonth, 23, 59, 59);

  const dayLabels = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const weekOffset = useMemo(() => {
    const now = viewDate;
    const dayOfMonth = now.getDate();
    return Math.floor((dayOfMonth - 1 + firstDayOfWeek) / 7);
  }, [viewDate, firstDayOfWeek]);

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)); }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)); }
  function goToday() { setViewDate(new Date()); }

  function totalDays(campaign: any): number {
    if (!campaign.startDate && !campaign.endDate) return 0;
    const start = campaign.startDate ? new Date(campaign.startDate) : new Date();
    const end = campaign.endDate ? new Date(campaign.endDate) : new Date();
    const visStart = start > monthStart ? start : monthStart;
    const visEnd = end < monthEnd ? end : monthEnd;
    if (visStart > visEnd) return 0;
    return Math.round((visEnd.getTime() - visStart.getTime()) / 86400000) + 1;
  }

  function barStyle(campaign: any): React.CSSProperties {
    if (!campaign.startDate && !campaign.endDate) return { display: "none" };
    const start = campaign.startDate ? new Date(campaign.startDate) : new Date();
    const end = campaign.endDate ? new Date(campaign.endDate) : new Date();
    const visStart = start > monthStart ? start : monthStart;
    const visEnd = end < monthEnd ? end : monthEnd;
    if (visStart > visEnd) return { display: "none" };
    const leftDays = Math.round((visStart.getTime() - monthStart.getTime()) / 86400000);
    const widthDays = Math.round((visEnd.getTime() - visStart.getTime()) / 86400000) + 1;
    return { left: `${(leftDays / daysInMonth) * 100}%`, width: `${(widthDays / daysInMonth) * 100}%` };
  }

  function hasVisibleBar(campaign: any): boolean {
    if (!campaign.startDate && !campaign.endDate) return false;
    const start = campaign.startDate ? new Date(campaign.startDate) : new Date();
    const end = campaign.endDate ? new Date(campaign.endDate) : new Date();
    return start <= monthEnd && end >= monthStart;
  }

  function isToday(day: number): boolean {
    const today = new Date();
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
  }

  function getEventsForDay(day: number): any[] {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return filteredEvents.filter(ev => ev.date === dateStr);
  }

  const uniqueTypes = useMemo(() => [...new Set(campaigns.map((c) => c.type))], [campaigns]);
  const activeCount = campaigns.filter(c => c.status === "active").length;
  const pausedCount = campaigns.filter(c => c.status === "paused").length;
  const draftCount = campaigns.filter(c => c.status === "draft").length;

  // Week view calculation
  const weekStart = useMemo(() => {
    const d = new Date(viewDate);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }, [viewDate]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart]);

  function getCampaignsForDate(date: Date): any[] {
    return filteredCampaigns.filter(c => {
      if (!c.startDate && !c.endDate) return false;
      const start = c.startDate ? new Date(c.startDate) : new Date(0);
      const end = c.endDate ? new Date(c.endDate) : new Date(8640000000000000);
      return date >= start && date <= end;
    });
  }

  function getEventsForDate(date: Date): any[] {
    const ds = date.toISOString().split("T")[0];
    return filteredEvents.filter(ev => ev.date === ds);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Campaign Calendar</h1>
          <p className="text-gray-500 mt-1">Visual timeline of all campaigns and events</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-primary text-sm flex items-center gap-1.5" onClick={() => setShowEventForm(true)}><Plus className="w-3.5 h-3.5" /> Add Event</button>
          <button className="btn-secondary flex items-center gap-2" onClick={loadData} disabled={loading}>
            <Clock className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="card p-3"><p className="text-[10px] text-gray-500">Total Campaigns</p><p className="text-lg font-bold text-white">{campaigns.length}</p></div>
        <div className="card p-3"><p className="text-[10px] text-gray-500">Active</p><p className="text-lg font-bold text-green-400">{activeCount}</p></div>
        <div className="card p-3"><p className="text-[10px] text-gray-500">Paused</p><p className="text-lg font-bold text-yellow-400">{pausedCount}</p></div>
        <div className="card p-3"><p className="text-[10px] text-gray-500">Events</p><p className="text-lg font-bold text-white">{events.length}</p></div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button className="btn-secondary p-2" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></button>
          <button className="btn-secondary text-sm" onClick={goToday}>Today</button>
          <button className="btn-secondary p-2" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></button>
          <h2 className="text-lg font-semibold text-white ml-2">{MONTHS[month]} {year}</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-gray-800 rounded-lg overflow-hidden">
            <button className={`px-2.5 py-1.5 text-xs ${viewMode === "month" ? "bg-n0va-600/20 text-n0va-400" : "text-gray-500 hover:text-gray-300"}`} onClick={() => setViewMode("month")}><Grid className="w-3.5 h-3.5 inline mr-1" />Month</button>
            <button className={`px-2.5 py-1.5 text-xs ${viewMode === "week" ? "bg-n0va-600/20 text-n0va-400" : "text-gray-500 hover:text-gray-300"}`} onClick={() => setViewMode("week")}><List className="w-3.5 h-3.5 inline mr-1" />Week</button>
          </div>
          <Filter className="w-4 h-4 text-gray-500 ml-2" />
          <select className="select text-xs py-1" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <select className="select text-xs py-1" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            {uniqueTypes.map((t) => <option key={t} value={t}>{(t as string).charAt(0).toUpperCase() + (t as string).slice(1)}</option>)}
          </select>
          <select className="select text-xs py-1" value={filterEventType} onChange={(e) => setFilterEventType(e.target.value)}>
            <option value="all">All Events</option>
            {EVENT_TYPES.map(et => <option key={et.value} value={et.value}>{et.label}</option>)}
          </select>
        </div>
      </div>

      {viewMode === "week" ? (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-800">
            {WEEKS.map((w, i) => (
              <div key={w} className={`p-2 text-center border-r border-gray-800/50 last:border-r-0 ${weekDays[i].toDateString() === new Date().toDateString() ? "bg-n0va-600/10" : ""}`}>
                <p className="text-[10px] text-gray-500">{w}</p>
                <p className={`text-sm font-bold ${weekDays[i].toDateString() === new Date().toDateString() ? "text-n0va-400" : "text-white"}`}>{weekDays[i].getDate()}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 min-h-[400px]">
            {weekDays.map((d, i) => {
              const dayCampaigns = getCampaignsForDate(d);
              const dayEvents = getEventsForDate(d);
              const isToday = d.toDateString() === new Date().toDateString();
              return (
                <div key={i} className={`border-r border-gray-800/50 last:border-r-0 p-1.5 ${isToday ? "bg-n0va-600/5" : ""}`}>
                  {dayCampaigns.slice(0, 2).map(c => (
                    <div key={c._id || c.id} className={`text-[9px] px-1.5 py-0.5 rounded mb-0.5 truncate cursor-pointer text-white ${STATUS_COLORS[c.status] || "bg-gray-500"}`} onClick={() => navigate(`/campaigns/${c._id || c.id}`)}>
                      {c.name}
                    </div>
                  ))}
                  {dayCampaigns.length > 2 && <p className="text-[8px] text-gray-600 px-1">+{dayCampaigns.length - 2} more</p>}
                  {dayEvents.map(ev => {
                    const et = EVENT_TYPES.find(t => t.value === ev.type);
                    return (
                      <div key={ev.id} className="group flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded mb-0.5 bg-gray-800 text-gray-400 truncate">
                        <div className={`w-1.5 h-1.5 rounded-full ${et?.color || "bg-gray-500"} shrink-0`} />
                        <span className="truncate">{ev.title}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteEvent(ev.id); }} className="ml-auto text-gray-700 hover:text-red-400 hidden group-hover:inline"><X className="w-2.5 h-2.5" /></button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="flex">
            <div className="w-56 shrink-0 border-r border-gray-800">
              <div className="h-10 flex items-center px-3 border-b border-gray-800">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</span>
              </div>
              <div className="divide-y divide-gray-800/50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (<div key={i} className="h-12 flex items-center px-3"><div className="h-3 w-full bg-gray-800 rounded animate-pulse" /></div>))
                ) : filteredCampaigns.length === 0 ? (
                  <div className="h-24 flex items-center justify-center text-gray-500 text-sm">No campaigns</div>
                ) : (
                  filteredCampaigns.map((c) => (
                    <div key={c._id || c.id} className="h-12 flex items-center px-3 hover:bg-gray-800/30 cursor-pointer transition-colors" onClick={() => navigate(`/campaigns/${c._id || c.id}`)}>
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">{c.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 capitalize">{c.type}</span>
                          <span className={`w-1.5 h-1.5 rounded-full ${c.status === "active" ? "bg-green-500" : c.status === "paused" ? "bg-yellow-500" : c.status === "draft" ? "bg-gray-500" : "bg-gray-700"}`} />
                          <span className="text-xs text-gray-600">{c.status}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="flex-1 overflow-x-auto">
              <div className="min-w-[600px]">
                <div className="flex h-10 border-b border-gray-800">
                  {dayLabels.map((d) => (
                    <div key={d} className={`flex-1 flex items-center justify-center text-xs border-r border-gray-800/50 ${isToday(d) ? "bg-n0va-600/20 text-n0va-400 font-bold" : "text-gray-500"}`}>
                      {d}
                      {getEventsForDay(d).length > 0 && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-purple-400" />}
                    </div>
                  ))}
                </div>
                <div className="divide-y divide-gray-800/50">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-12 relative">
                        <div className="absolute inset-0 flex">{dayLabels.map((d) => <div key={d} className="flex-1 border-r border-gray-800/20" />)}</div>
                      </div>
                    ))
                  ) : (
                    filteredCampaigns.map((c) => (
                      <div key={c._id || c.id} className="h-12 relative hover:bg-gray-800/10 transition-colors cursor-pointer" onClick={() => navigate(`/campaigns/${c._id || c.id}`)}>
                        <div className="absolute inset-0 flex">
                          {dayLabels.map((d) => (
                            <div key={d} className={`flex-1 border-r border-gray-800/20 ${isToday(d) ? "bg-n0va-600/5" : ""} ${getEventsForDay(d).length > 0 ? "border-b-2 border-purple-500/30" : ""}`} />
                          ))}
                        </div>
                        {hasVisibleBar(c) && (
                          <div className="absolute inset-y-2 px-0.5" style={barStyle(c)}>
                            <div className={`h-full rounded-md ${STATUS_COLORS[c.status] || "bg-gray-500"} bg-opacity-80 border flex items-center px-2 overflow-hidden`}>
                              <span className="text-white text-xs font-medium truncate">{c.name}</span>
                            </div>
                          </div>
                        )}
                        {!hasVisibleBar(c) && !c.startDate && !c.endDate && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs text-gray-600">No dates set</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
        <span>Legend:</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500" /> Active</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500" /> Paused</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-500" /> Draft</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-700" /> Archived</span>
        {EVENT_TYPES.map(et => <span key={et.value} className="flex items-center gap-1"><span className={`w-3 h-3 rounded ${et.color}`} /> {et.label}</span>)}
        <span className="text-gray-600 ml-auto">{filteredCampaigns.length} campaigns · {filteredEvents.length} events</span>
      </div>

      {showEventForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowEventForm(false)}>
          <div className="w-full max-w-md bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-n0va-400" /> Add Event</h3>
              <button onClick={() => setShowEventForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddEvent} className="space-y-4">
              <div><label className="label">Title</label><input className="input" value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} placeholder="Campaign Review" autoFocus /></div>
              <div><label className="label">Type</label>
                <div className="flex flex-wrap gap-1.5">
                  {EVENT_TYPES.map(et => (
                    <button type="button" key={et.value} onClick={() => setEventForm({ ...eventForm, type: et.value })} className={`text-xs px-2.5 py-1 rounded border capitalize ${eventForm.type === et.value ? "border-n0va-500 bg-n0va-500/10 text-n0va-400" : "border-gray-700 bg-gray-800 text-gray-400"}`}>
                      {et.label}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="label">Date</label><input className="input" type="date" value={eventForm.date} onChange={e => setEventForm({ ...eventForm, date: e.target.value })} /></div>
              <div><label className="label">Notes</label><textarea className="input" rows={2} value={eventForm.notes} onChange={e => setEventForm({ ...eventForm, notes: e.target.value })} placeholder="Optional notes..." /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowEventForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Add Event</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
