import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, CalendarDays, Megaphone, Loader } from "lucide-react";
import { api } from "../api/client";

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
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(() => new Date());

  useEffect(() => { loadCampaigns(); }, []);

  async function loadCampaigns() {
    setLoading(true);
    try {
      const res = await api.campaigns.list();
      setCampaigns(Array.isArray(res) ? res : res.campaigns || []);
    } catch {}
    setLoading(false);
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
          <p className="text-gray-400 mt-1">Month view of campaign schedules</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goToday} className="btn-ghost text-sm">Today</button>
          <button onClick={prevMonth} className="btn-secondary p-2"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-medium text-white min-w-[180px] text-center">{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} className="btn-secondary p-2"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-800">
          {DAYS.map((d) => (
            <div key={d} className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="divide-y divide-gray-800/50">
          {calendar.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 divide-x divide-gray-800/50">
              {week.map(({ date, campaigns: dayCampaigns }, di) => {
                const isToday = date && date.toDateString() === today.toDateString();
                const isOtherMonth = date && date.getMonth() !== month;
                const visible = dayCampaigns.slice(0, maxItemsPerDay);
                const overflow = dayCampaigns.length - maxItemsPerDay;

                return (
                  <div key={di} className={`min-h-[130px] p-2 ${isOtherMonth ? "bg-gray-900/30" : ""} ${isToday ? "bg-n0va-500/5" : ""}`}>
                    {date && (
                      <>
                        <div className={`text-xs font-medium mb-1.5 w-7 h-7 flex items-center justify-center rounded-full ${
                          isToday ? "bg-n0va-600 text-white" : isOtherMonth ? "text-gray-700" : "text-gray-400"
                        }`}>
                          {date.getDate()}
                        </div>
                        <div className="space-y-1">
                          {visible.map((c) => {
                            const id = c._id || c.id;
                            return (
                              <Link
                                key={id}
                                to={`/campaigns/${id}`}
                                className={`block text-[11px] px-1.5 py-1 rounded border truncate hover:opacity-80 transition-opacity ${STATUS_COLORS[c.status] || STATUS_COLORS.draft}`}
                                title={c.name}
                              >
                                <Megaphone className="w-2.5 h-2.5 inline mr-1 shrink-0" />
                                {c.name}
                              </Link>
                            );
                          })}
                          {overflow > 0 && (
                            <button className="text-[11px] text-n0va-400 hover:text-n0va-300 w-full text-left px-1.5 py-0.5">
                              +{overflow} more
                            </button>
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

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-green-500/40" /> Active</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-yellow-500/40" /> Paused</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-gray-500/40" /> Draft</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-500/40" /> Pending</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-500/40" /> Archived</span>
      </div>
    </div>
  );
}
