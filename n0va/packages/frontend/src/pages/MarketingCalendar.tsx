import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, CalendarDays, Megaphone, Loader, Plus, X } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-300 border-green-500/30",
  paused: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  draft: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  archived: "bg-red-500/20 text-red-300 border-red-500/30",
  pending_approval: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  completed: "bg-blue-500/20 text-blue-300 border-blue-500/30",
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function MarketingCalendar() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [showCreate, setShowCreate] = useState(false);
  const [createDate, setCreateDate] = useState("");
  const [createName, setCreateName] = useState("");
  const [processing, setProcessing] = useState(false);

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

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();

  const calendar = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const weeks: { date: Date | null; campaigns: any[] }[][] = [];
    let week: { date: Date | null; campaigns: any[] }[] = [];

    for (let i = 0; i < startPad; i++) week.push({ date: null, campaigns: [] });

    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, month, d);
      const dayCampaigns = campaigns.filter((c) => {
        const start = c.startDate ? new Date(c.startDate) : null;
        const end = c.endDate ? new Date(c.endDate) : null;
        if (!start && !end) return false;
        if (start && end) return date >= new Date(start.toDateString()) && date <= new Date(end.toDateString());
        if (start) return date.toDateString() === start.toDateString();
        return false;
      });
      week.push({ date, campaigns: dayCampaigns });
      if (week.length === 7) { weeks.push(week); week = []; }
    }
    if (week.length > 0) { while (week.length < 7) week.push({ date: null, campaigns: [] }); weeks.push(week); }

    return weeks;
  }, [campaigns, year, month]);

  function handleDayClick(date: Date) {
    setCreateDate(date.toISOString().split("T")[0]);
    setCreateName("");
    setShowCreate(true);
  }

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)); }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)); }
  function goToday() { setViewDate(new Date()); }

  const maxItemsPerDay = 3;

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader className="w-6 h-6 animate-spin text-n0va-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <CalendarDays className="w-6 h-6 text-n0va-400" />
            Marketing Calendar
          </h1>
          <p className="text-gray-400 mt-1">Click a day to create a new campaign</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goToday} className="btn-ghost text-sm">Today</button>
          <button onClick={prevMonth} className="btn-secondary p-2"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-medium text-white min-w-[180px] text-center">{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} className="btn-secondary p-2"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-800">
          {DAYS.map((d) => (
            <div key={d} className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">{d}</div>
          ))}
        </div>

        <div className="divide-y divide-gray-800/50">
          {calendar.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 divide-x divide-gray-800/50">
              {week.map(({ date, campaigns: dayCampaigns }, di) => {
                const isToday = date && date.toDateString() === today.toDateString();
                const isOtherMonth = date && date.getMonth() !== month;
                const visible = dayCampaigns.slice(0, maxItemsPerDay);
                const overflow = dayCampaigns.length - maxItemsPerDay;

                return (
                  <div key={di} className={`min-h-[130px] p-2 relative group ${isOtherMonth ? "bg-gray-900/30" : ""} ${isToday ? "bg-n0va-500/5" : ""}`}>
                    {date && (
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <div className={`text-xs font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                            isToday ? "bg-n0va-600 text-white" : isOtherMonth ? "text-gray-700" : "text-gray-400"
                          }`}>
                            {date.getDate()}
                          </div>
                          <button onClick={() => handleDayClick(date)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-n0va-400" title={`Create campaign on ${date.toLocaleDateString()}`}>
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="space-y-1">
                          {visible.map((c) => {
                            const id = c._id || c.id;
                            return (
                              <Link
                                key={id}
                                to={`/campaigns/${id}`}
                                className={`block text-[11px] px-1.5 py-1 rounded border truncate hover:opacity-80 transition-opacity ${STATUS_COLORS[c.status] || STATUS_COLORS.draft}`}
                                title={`${c.name} (${c.status})`}
                              >
                                <Megaphone className="w-2.5 h-2.5 inline mr-1 shrink-0" />
                                {c.name}
                              </Link>
                            );
                          })}
                          {overflow > 0 && (
                            <span className="text-[11px] text-n0va-400 px-1.5 py-0.5 block" title={`${dayCampaigns.length} campaigns on this day`}>
                              +{overflow} more
                            </span>
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

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-sm bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Quick Campaign</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); handleCreate(); }} className="space-y-4">
              <div>
                <label className="label">Campaign Name</label>
                <input className="input w-full" placeholder="e.g. Summer Sale" value={createName} onChange={e => setCreateName(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="label">Start Date</label>
                <input type="date" className="input w-full" value={createDate} onChange={e => setCreateDate(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={processing} className="btn-primary">{processing ? "Creating..." : "Create & Edit"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-green-500/40" /> Active</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-yellow-500/40" /> Paused</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-gray-500/40" /> Draft</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-500/40" /> Pending</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-500/40" /> Archived</span>
        <span className="text-gray-700 ml-2">{campaigns.length} campaigns · Hover day and click + to create</span>
      </div>
    </div>
  );
}
