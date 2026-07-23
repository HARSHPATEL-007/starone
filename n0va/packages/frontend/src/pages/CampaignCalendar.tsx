import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Filter, Clock } from "lucide-react";
import { api } from "../api/client";
import { SkeletonRow } from "../components/Skeleton";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500 border-green-400",
  paused: "bg-yellow-500 border-yellow-400",
  draft: "bg-gray-500 border-gray-400",
  archived: "bg-gray-700 border-gray-600",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function CampaignCalendar() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => { loadCampaigns(); }, []);

  async function loadCampaigns() {
    setLoading(true);
    try {
      const res = await api.campaigns.list();
      setCampaigns(Array.isArray(res) ? res : res.campaigns || []);
    } finally {
      setLoading(false);
    }
  }

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      if (filterType !== "all" && c.type !== filterType) return false;
      return true;
    });
  }, [campaigns, filterStatus, filterType]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month, daysInMonth, 23, 59, 59);

  const dayLabels = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }

  function goToday() {
    setViewDate(new Date());
  }

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

    return {
      left: `${(leftDays / daysInMonth) * 100}%`,
      width: `${(widthDays / daysInMonth) * 100}%`,
    };
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

  const uniqueTypes = useMemo(() => [...new Set(campaigns.map((c) => c.type))], [campaigns]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Campaign Calendar</h1>
          <p className="text-gray-500 mt-1">Visual timeline of all campaigns</p>
        </div>
        <button className="btn-secondary flex items-center gap-2" onClick={loadCampaigns} disabled={loading}>
          <Clock className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button className="btn-secondary p-2" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></button>
          <button className="btn-secondary text-sm" onClick={goToday}>Today</button>
          <button className="btn-secondary p-2" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></button>
          <h2 className="text-lg font-semibold text-white ml-2">{MONTHS[month]} {year}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
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
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex">
          <div className="w-56 shrink-0 border-r border-gray-800">
            <div className="h-10 flex items-center px-3 border-b border-gray-800">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</span>
            </div>
            <div className="divide-y divide-gray-800/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 flex items-center px-3">
                    <SkeletonRow />
                  </div>
                ))
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
                  </div>
                ))}
              </div>
              <div className="divide-y divide-gray-800/50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 relative">
                      <div className="absolute inset-0 flex">
                        {dayLabels.map((d) => <div key={d} className="flex-1 border-r border-gray-800/20" />)}
                      </div>
                    </div>
                  ))
                ) : (
                  filteredCampaigns.map((c) => (
                    <div key={c._id || c.id} className="h-12 relative hover:bg-gray-800/10 transition-colors cursor-pointer" onClick={() => navigate(`/campaigns/${c._id || c.id}`)}>
                      <div className="absolute inset-0 flex">
                        {dayLabels.map((d) => (
                          <div key={d} className={`flex-1 border-r border-gray-800/20 ${isToday(d) ? "bg-n0va-600/5" : ""}`} />
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

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>Legend:</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500" /> Active</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500" /> Paused</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-500" /> Draft</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-700" /> Archived</span>
        <span className="text-gray-600 ml-4">{filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? "s" : ""} (visible in view)</span>
      </div>
    </div>
  );
}
