import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Filter, Clock, User, FileText, Megaphone, Palette, Users, Bot, AlertTriangle, Shield, ExternalLink, Play, Pause, Search, Download, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import { api } from "../api/client";
import { SkeletonRow } from "../components/Skeleton";
import { useToast } from "../components/Toast";

const entityIcons: Record<string, any> = {
  campaign: Megaphone, creative: Palette, audience: Users,
  agent: Bot, platform: Shield, recipe: FileText,
};

const entityColors: Record<string, string> = {
  campaign: "text-blue-400 bg-blue-500/10", creative: "text-purple-400 bg-purple-500/10",
  audience: "text-green-400 bg-green-500/10", agent: "text-orange-400 bg-orange-500/10",
  platform: "text-cyan-400 bg-cyan-500/10", recipe: "text-pink-400 bg-pink-500/10",
};

const entityRoutes: Record<string, string> = {
  campaign: "/campaigns", creative: "/creatives", audience: "/audiences",
  agent: "/agents", recipe: "/recipes",
};

const RANGES = [
  { label: "All", value: 0 },
  { label: "24h", value: 1 },
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
];

const PAGE_SIZE = 20;

function getTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getTimeGroup(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "Today";
  if (days < 2) return "Yesterday";
  if (days < 7) return "This Week";
  return "Older";
}

const TIME_GROUP_ORDER = ["Today", "Yesterday", "This Week", "Older"];

export default function ActivityFeed() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [dateRange, setDateRange] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { loadActivities(); }, []);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(loadActivities, 30000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh]);

  async function loadActivities() {
    setLoading(true);
    setError(null);
    try {
      const result = await api.activity.list();
      setActivities(result || []);
    } catch (e: any) {
      setError(e.message || "Failed to load activities");
      addToast("error", "Failed to load activities");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    let result = activities.filter((a) => {
      if (filterType !== "all" && a.entityType !== filterType) return false;
      if (filterAction !== "all" && a.action !== filterAction) return false;
      if (dateRange > 0) {
        const cutoff = Date.now() - dateRange * 86400000;
        if (new Date(a.timestamp).getTime() < cutoff) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const match = (a.entityName || "").toLowerCase().includes(q) ||
          (a.details || "").toLowerCase().includes(q) ||
          (a.actor || a.userName || "").toLowerCase().includes(q) ||
          (a.action || "").toLowerCase().includes(q) ||
          (a.entityType || "").toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
    return result;
  }, [activities, filterType, filterAction, dateRange, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {};
    const sliced = filtered.slice(0, displayCount);
    for (const item of sliced) {
      const g = getTimeGroup(item.timestamp);
      if (!groups[g]) groups[g] = [];
      groups[g].push(item);
    }
    return groups;
  }, [filtered, displayCount]);

  const displayed = filtered.slice(0, displayCount);
  const hasMore = displayCount < filtered.length;

  const uniqueActions = useMemo(() => [...new Set(activities.map((a) => a.action))], [activities]);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
    setReadIds((prev) => { const n = new Set(prev); n.add(id); return n; });
  }

  function handleExport() {
    const csv = [
      ["Timestamp", "User", "Action", "Entity Type", "Entity Name", "Details"],
      ...displayed.map((a) => [
        new Date(a.timestamp).toISOString(),
        a.userName || a.actor || "",
        a.action || "",
        a.entityType || "",
        a.entityName || "",
        (a.details || "").replace(/,/g, ";"),
      ]),
    ].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-feed-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("success", `Exported ${displayed.length} activities`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Activity Feed</h1>
            {autoRefresh && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" /></span>}
          </div>
          <p className="text-gray-500 mt-1">
            Real-time audit trail &middot; {filtered.length} of {activities.length} activities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary text-xs flex items-center gap-1.5" onClick={handleExport} disabled={displayed.length === 0}>
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button className={`btn-secondary flex items-center gap-1.5 text-xs ${autoRefresh ? "border-green-600/40 text-green-400" : ""}`} onClick={() => setAutoRefresh(!autoRefresh)}>
            {autoRefresh ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />} {autoRefresh ? "Live" : "Auto"}
          </button>
          <button className="btn-secondary flex items-center gap-2" onClick={loadActivities} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
          <input className="input pl-9 pr-3 py-1.5 text-xs w-full" placeholder="Search activities..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mr-1">
          <Filter className="w-3.5 h-3.5" /> Type:
        </div>
        {["all", "campaign", "creative", "audience", "agent", "platform", "recipe"].map((t) => (
          <button key={t} className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${filterType === t ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500 hover:border-gray-600"}`} onClick={() => setFilterType(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <div className="w-px h-6 bg-gray-800 mx-2" />
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mr-1">
          <Filter className="w-3.5 h-3.5" /> Action:
        </div>
        {["all", ...uniqueActions].map((a) => (
          <button key={a} className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${filterAction === a ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500 hover:border-gray-600"}`} onClick={() => setFilterAction(a)}>
            {a === "all" ? "All" : a.charAt(0).toUpperCase() + a.slice(1)}
          </button>
        ))}
        <div className="w-px h-6 bg-gray-800 mx-2" />
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mr-1">
          <Clock className="w-3.5 h-3.5" /> Range:
        </div>
        {RANGES.map((r) => (
          <button key={r.value} className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${dateRange === r.value ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500 hover:border-gray-600"}`} onClick={() => setDateRange(r.value)}>
            {r.label}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}</div>
        ) : error ? (
          <div className="card text-center py-12 text-gray-500">
            <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-red-400" />
            <p className="text-red-400">{error}</p>
            <button className="btn-secondary text-sm mt-4" onClick={loadActivities}>Retry</button>
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Clock className="w-10 h-10 mx-auto mb-2" />
            <p>{search || filterType !== "all" || filterAction !== "all" || dateRange > 0 ? "No activities match the selected filters" : "No activities yet"}</p>
          </div>
        ) : (
          <>
            {TIME_GROUP_ORDER.map((group) => {
              const items = grouped[group];
              if (!items || items.length === 0) return null;
              return (
                <div key={group}>
                  <div className="flex items-center gap-2 py-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{group}</span>
                    <div className="flex-1 h-px bg-gray-800" />
                    <span className="text-[10px] text-gray-700">{items.length} activities</span>
                  </div>
                  {items.map((activity) => {
                    const Icon = entityIcons[activity.entityType] || FileText;
                    const colorClass = entityColors[activity.entityType] || "text-gray-400 bg-gray-500/10";
                    const timeAgo = getTimeAgo(activity.timestamp);
                    const route = entityRoutes[activity.entityType];
                    const entityId = activity.entityId;
                    const isExpanded = expandedId === activity._id;
                    const isRead = readIds.has(activity._id);

                    return (
                      <div key={activity._id} className={`flex items-start gap-3 p-3 rounded-lg transition-colors group ${isRead ? "opacity-60" : "hover:bg-gray-800/50 cursor-pointer"}`} onClick={() => toggleExpand(activity._id)}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-white font-medium">{activity.userName || activity.actor}</span>
                            <span className={`text-xs font-medium capitalize px-1.5 py-0.5 rounded ${activity.action === "created" ? "text-green-400 bg-green-500/10" : activity.action === "launched" ? "text-n0va-400 bg-n0va-500/10" : activity.action === "paused" ? "text-yellow-400 bg-yellow-500/10" : activity.action === "archived" ? "text-gray-400 bg-gray-500/10" : activity.action === "approved" ? "text-blue-400 bg-blue-500/10" : "text-gray-400 bg-gray-500/10"}`}>
                              {activity.action}
                            </span>
                            {route && entityId ? (
                              <button className="text-sm text-gray-300 truncate hover:text-n0va-400 flex items-center gap-1" onClick={(e) => { e.stopPropagation(); navigate(`${route}/${entityId}`); }}>
                                {activity.entityName} <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                              </button>
                            ) : (
                              <span className="text-sm text-gray-300 truncate">{activity.entityName}</span>
                            )}
                            <span className="text-xs text-gray-500 capitalize">({activity.entityType})</span>
                          </div>
                          {activity.details && !isExpanded && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-lg">{activity.details}</p>
                          )}
                          {isExpanded && (
                            <div className="mt-2 space-y-1.5 text-xs text-gray-500 bg-gray-800/40 rounded-lg p-3">
                              <p><span className="text-gray-600">Activity ID:</span> {activity._id}</p>
                              <p><span className="text-gray-600">Timestamp:</span> {new Date(activity.timestamp).toLocaleString()}</p>
                              <p><span className="text-gray-600">Entity:</span> {activity.entityType} / {activity.entityName}</p>
                              {activity.entityId && <p><span className="text-gray-600">Entity ID:</span> {activity.entityId}</p>}
                              {activity.actor && <p><span className="text-gray-600">Actor:</span> {activity.actor}</p>}
                              {activity.ip && <p><span className="text-gray-600">IP:</span> {activity.ip}</p>}
                              {activity.details && <p><span className="text-gray-600">Details:</span> {activity.details}</p>}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0" title={new Date(activity.timestamp).toLocaleString()}>
                          <Clock className="w-3 h-3" />
                          {timeAgo}
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {hasMore && (
              <div className="text-center pt-4">
                <button className="btn-secondary text-sm" onClick={() => setDisplayCount((c) => c + PAGE_SIZE)}>
                  Show More ({filtered.length - displayCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
