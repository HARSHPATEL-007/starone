import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, CalendarDays, Megaphone, Loader, Plus, X, Filter, List, Clock, Target, Eye, DollarSign, Zap, BarChart3, Calendar, Flag } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  type: "campaign" | "event" | "deadline" | "holiday";
  campaignId?: string;
  status?: string;
  notes?: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-300 border-green-500/30",
  paused: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  draft: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  archived: "bg-red-500/20 text-red-300 border-red-500/30",
  pending_approval: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  completed: "bg-blue-500/20 text-blue-300 border-blue-500/30",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  campaign: "border-l-n0va-500 bg-n0va-500/5",
  event: "border-l-green-500 bg-green-500/5",
  deadline: "border-l-red-500 bg-red-500/5",
  holiday: "border-l-yellow-500 bg-yellow-500/5",
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function MarketingCalendar() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [showCreate, setShowCreate] = useState(false);
  const [createDate, setCreateDate] = useState("");
  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState<"campaign" | "event" | "deadline">("campaign");
  const [processing, setProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({ title: "", date: "", type: "event" as const, notes: "" });

  useEffect(() => { loadCampaigns(); }, []);

  async function loadCampaigns() {
    setLoading(true);
    try {
      const res = await api.campaigns.list();
      setCampaigns(Array.isArray(res) ? res : res.campaigns || []);
    } catch {}
    setLoading(false);
  }

  async function handleCreate() {
    if (!createName.trim()) { addToast("error", "Campaign name is required"); return; }
    setProcessing(true);
    try {
      const created = await api.campaigns.create({
        name: createName.trim(), type: "standard",
        startDate: createDate ? new Date(createDate).toISOString() : new Date().toISOString(),
        status: "draft", budget: { daily: 10000, lifetime: 0 },
      });
      setCampaigns([created, ...campaigns]);
      setShowCreate(false);
      setCreateName("");
      addToast("success", "Campaign created");
      if (created._id) navigate(`/campaigns/${created._id}`);
    } catch { addToast("error", "Failed to create campaign"); }
    setProcessing(false);
  }

  function handleAddEvent() {
    if (!eventForm.title.trim() || !eventForm.date) { addToast("error", "Title and date required"); return; }
    const newEvent: CalendarEvent = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: eventForm.title.trim(),
      date: new Date(eventForm.date).toISOString(),
      type: eventForm.type,
      notes: eventForm.notes.trim(),
    };
    setEvents(prev => [...prev, newEvent]);
    setShowEventForm(false);
    setEventForm({ title: "", date: "", type: "event", notes: "" });
    addToast("success", "Event added");
  }

  function handleDeleteEvent(id: string) {
    setEvents(prev => prev.filter(e => e.id !== id));
  }

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();

  const campaignEvents: CalendarEvent[] = useMemo(() => campaigns.map(c => {
    const startDate = c.startDate || c.createdAt;
    return {
      id: `camp_${c._id || c.id}`,
      title: c.name,
      date: startDate,
      endDate: c.endDate,
      type: "campaign" as const,
      campaignId: c._id || c.id,
      status: c.status,
    };
  }), [campaigns]);

  const allEvents = useMemo(() => {
    let combined = [...campaignEvents, ...events];
    if (filterStatus !== "all") combined = combined.filter(e => e.status === filterStatus || !e.status);
    if (filterType !== "all") combined = combined.filter(e => e.type === filterType);
    return combined;
  }, [campaignEvents, events, filterStatus, filterType]);

  const calendar = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const weeks: { date: Date | null; events: CalendarEvent[]; campaignCount: number }[][] = [];
    let week: { date: Date | null; events: CalendarEvent[]; campaignCount: number }[] = [];

    for (let i = 0; i < startPad; i++) week.push({ date: null, events: [], campaignCount: 0 });

    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, month, d);
      const dayEvents = allEvents.filter(e => {
        const eDate = new Date(e.date).toDateString();
        if (e.endDate) {
          const end = new Date(e.endDate);
          return date >= new Date(e.date) && date <= end;
        }
        return date.toDateString() === eDate;
      });
      week.push({ date, events: dayEvents, campaignCount: dayEvents.filter(e => e.type === "campaign").length });
      if (week.length === 7) { weeks.push(week); week = []; }
    }
    if (week.length > 0) { while (week.length < 7) week.push({ date: null, events: [], campaignCount: 0 }); weeks.push(week); }

    return weeks;
  }, [allEvents, year, month]);

  const weekViewDays = useMemo(() => {
    const startOfWeek = new Date(viewDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [viewDate]);

  function handleDayClick(date: Date) {
    setCreateDate(date.toISOString().split("T")[0]);
    setCreateName("");
    setCreateType("campaign");
    setShowCreate(true);
  }

  function handleDayEventClick(date: Date) {
    setEventForm({ title: "", date: date.toISOString().split("T")[0], type: "event", notes: "" });
    setShowEventForm(true);
  }

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)); }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)); }
  function goToday() { setViewDate(new Date()); }

  const maxItemsPerDay = 3;

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader className="w-6 h-6 animate-spin text-n0va-400" /></div>;
  }

  const totalCampaigns = campaignEvents.length;
  const totalEvents = events.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <CalendarDays className="w-6 h-6 text-n0va-400" />
            Marketing Calendar
          </h1>
          <p className="text-gray-400 mt-1">{totalCampaigns} campaigns · {totalEvents} events · Click a day to create</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-900 rounded-lg p-0.5 border border-gray-800">
            <button className={`px-3 py-1.5 text-xs rounded-md ${viewMode === "month" ? "bg-n0va-600/20 text-n0va-400" : "text-gray-500"}`} onClick={() => setViewMode("month")}>Month</button>
            <button className={`px-3 py-1.5 text-xs rounded-md ${viewMode === "week" ? "bg-n0va-600/20 text-n0va-400" : "text-gray-500"}`} onClick={() => setViewMode("week")}>Week</button>
          </div>
          <button onClick={goToday} className="btn-ghost text-sm">Today</button>
          <button onClick={prevMonth} className="btn-secondary p-2"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-medium text-white min-w-[180px] text-center">{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} className="btn-secondary p-2"><ChevronRight className="w-4 h-4" /></button>
          <button onClick={() => { setEventForm({ title: "", date: "", type: "event", notes: "" }); setShowEventForm(true); }} className="btn-primary flex items-center gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Event
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-gray-600" />
        <select className="input text-xs py-1 w-auto" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          <option value="campaign">Campaigns</option>
          <option value="event">Events</option>
          <option value="deadline">Deadlines</option>
          <option value="holiday">Holidays</option>
        </select>
        <select className="input text-xs py-1 w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="paused">Paused</option>
          <option value="archived">Archived</option>
        </select>
        <div className="flex items-center gap-3 text-[10px] text-gray-500 ml-2">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-n0va-500/60" /> Campaign</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-500/60" /> Event</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500/60" /> Deadline</span>
        </div>
      </div>

      {viewMode === "month" ? (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-800">
            {DAYS.map(d => (
              <div key={d} className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">{d}</div>
            ))}
          </div>
          <div className="divide-y divide-gray-800/50">
            {calendar.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 divide-x divide-gray-800/50">
                {week.map(({ date, events: dayEvents, campaignCount }, di) => {
                  const isToday = date && date.toDateString() === today.toDateString();
                  const isOtherMonth = date && date.getMonth() !== month;
                  const visible = dayEvents.slice(0, maxItemsPerDay);
                  const overflow = dayEvents.length - maxItemsPerDay;

                  return (
                    <div key={di} className={`min-h-[130px] p-2 relative group ${isOtherMonth ? "bg-gray-900/30" : ""} ${isToday ? "bg-n0va-500/5" : ""}`}>
                      {date && (
                        <>
                          <div className="flex items-center justify-between mb-1">
                            <div className={`text-xs font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? "bg-n0va-600 text-white" : isOtherMonth ? "text-gray-700" : "text-gray-400"}`}>
                              {date.getDate()}
                            </div>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleDayClick(date)} className="text-gray-600 hover:text-n0va-400" title="New campaign"><Megaphone className="w-3 h-3" /></button>
                              <button onClick={() => handleDayEventClick(date)} className="text-gray-600 hover:text-green-400" title="New event"><Plus className="w-3 h-3" /></button>
                            </div>
                          </div>
                          <div className="space-y-0.5">
                            {visible.map(e => {
                              if (e.type === "campaign") {
                                return (
                                  <Link key={e.id} to={`/campaigns/${e.campaignId}`} className={`block text-[10px] px-1.5 py-1 rounded border truncate hover:opacity-80 transition-opacity ${STATUS_COLORS[e.status || "draft"] || STATUS_COLORS.draft}`} title={e.title}>
                                    <Megaphone className="w-2 h-2 inline mr-0.5 shrink-0" />{e.title}
                                  </Link>
                                );
                              }
                              const colorClass = EVENT_TYPE_COLORS[e.type] || "border-l-gray-500 bg-gray-500/5";
                              return (
                                <div key={e.id} className={`text-[10px] px-1.5 py-1 rounded border-l-2 truncate group/event ${colorClass}`} title={e.notes || e.title}>
                                  <span className="text-gray-400">{e.type === "deadline" ? "📋" : e.type === "holiday" ? "🎉" : "📌"} {e.title}</span>
                                  <button onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); handleDeleteEvent(e.id); }} className="float-right opacity-0 group-hover/event:opacity-100 text-gray-600 hover:text-red-400">
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              );
                            })}
                            {overflow > 0 && (
                              <span className="text-[10px] text-n0va-400 px-1.5 py-0.5 block">{+overflow} more</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setViewDate(new Date(year, month, viewDate.getDate() - 7))} className="btn-secondary p-1.5"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-medium text-white">
              {weekViewDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {weekViewDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <button onClick={() => setViewDate(new Date(year, month, viewDate.getDate() + 7))} className="btn-secondary p-1.5"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weekViewDays.map(day => {
              const isToday = day.toDateString() === today.toDateString();
              const dayEvents = allEvents.filter(e => new Date(e.date).toDateString() === day.toDateString());
              return (
                <div key={day.toISOString()} className={`rounded-lg border min-h-[200px] ${isToday ? "border-n0va-600/40 bg-n0va-600/5" : "border-gray-800"}`}>
                  <div className={`text-center text-xs font-medium py-1.5 border-b border-gray-800 ${isToday ? "text-n0va-400" : "text-gray-500"}`}>
                    {day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </div>
                  <div className="p-1.5 space-y-1">
                    {dayEvents.length === 0 && (
                      <div className="flex justify-center pt-4">
                        <button onClick={() => handleDayClick(day)} className="text-[10px] text-gray-700 hover:text-gray-500"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                    {dayEvents.map(e => {
                      if (e.type === "campaign") {
                        return (
                          <Link key={e.id} to={`/campaigns/${e.campaignId}`} className="block text-[10px] p-1.5 rounded border truncate hover:opacity-80 bg-gray-800/50 border-gray-700 text-gray-300">
                            <Megaphone className="w-2.5 h-2.5 inline mr-1" />{e.title}
                          </Link>
                        );
                      }
                      return (
                        <div key={e.id} className="text-[10px] p-1.5 rounded border-l-2 truncate flex items-center justify-between group/ev bg-gray-800/30"
                          style={{ borderLeftColor: e.type === "deadline" ? "#ef4444" : e.type === "holiday" ? "#eab308" : "#22c55e" }}>
                          <span className="text-gray-400">{e.title}</span>
                          <button onClick={() => handleDeleteEvent(e.id)} className="opacity-0 group-hover/ev:opacity-100 text-gray-600 hover:text-red-400"><X className="w-2.5 h-2.5" /></button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-sm bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Quick Campaign</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); handleCreate(); }} className="space-y-4">
              <div><label className="label">Campaign Name</label><input className="input w-full" placeholder="e.g. Summer Sale" value={createName} onChange={e => setCreateName(e.target.value)} autoFocus /></div>
              <div><label className="label">Start Date</label><input type="date" className="input w-full" value={createDate} onChange={e => setCreateDate(e.target.value)} /></div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={processing} className="btn-primary">{processing ? "Creating..." : "Create & Edit"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEventForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowEventForm(false)}>
          <div className="w-full max-w-sm bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Add Calendar Event</h3>
              <button onClick={() => setShowEventForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); handleAddEvent(); }} className="space-y-4">
              <div><label className="label">Title</label><input className="input w-full" value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} autoFocus placeholder="e.g. Team standup" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Date</label><input type="date" className="input w-full" value={eventForm.date} onChange={e => setEventForm({ ...eventForm, date: e.target.value })} /></div>
                <div><label className="label">Type</label><select className="input w-full" value={eventForm.type} onChange={e => setEventForm({ ...eventForm, type: e.target.value as any })}>
                  <option value="event">Event</option>
                  <option value="deadline">Deadline</option>
                  <option value="holiday">Holiday</option>
                </select></div>
              </div>
              <div><label className="label">Notes</label><textarea className="input w-full" rows={2} value={eventForm.notes} onChange={e => setEventForm({ ...eventForm, notes: e.target.value })} /></div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowEventForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Add Event</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-green-500/40" /> Active</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-yellow-500/40" /> Paused</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-gray-500/40" /> Draft</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-500/40" /> Archived</span>
        <span className="text-gray-700 ml-2">{totalCampaigns} campaigns · {totalEvents} events</span>
        <span className="text-gray-700">Click + to create campaign · Click "Event" to add non-campaign events</span>
      </div>
    </div>
  );
}
