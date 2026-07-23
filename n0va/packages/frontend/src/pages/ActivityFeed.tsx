import { useEffect, useState } from "react";
import { RefreshCw, Filter, Clock, User, FileText, Megaphone, Palette, Users, Bot, AlertTriangle, Shield } from "lucide-react";
import { api } from "../api/client";
import { SkeletonRow } from "../components/Skeleton";

const entityIcons: Record<string, any> = {
  campaign: Megaphone, creative: Palette, audience: Users,
  agent: Bot, platform: Shield, recipe: FileText,
};

const entityColors: Record<string, string> = {
  campaign: "text-blue-400 bg-blue-500/10", creative: "text-purple-400 bg-purple-500/10",
  audience: "text-green-400 bg-green-500/10", agent: "text-orange-400 bg-orange-500/10",
  platform: "text-cyan-400 bg-cyan-500/10", recipe: "text-pink-400 bg-pink-500/10",
};

export default function ActivityFeed() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [filterAction, setFilterAction] = useState("all");

  useEffect(() => { loadActivities(); }, []);

  async function loadActivities() {
    setLoading(true);
    try { setActivities(await api.activity.list()); } finally { setLoading(false); }
  }

  const filtered = activities.filter((a) => {
    if (filterType !== "all" && a.entityType !== filterType) return false;
    if (filterAction !== "all" && a.action !== filterAction) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Activity Feed</h1>
          <p className="text-gray-500 mt-1">Real-time audit trail of all actions across the platform</p>
        </div>
        <button className="btn-secondary flex items-center gap-2" onClick={loadActivities} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mr-2">
          <Filter className="w-3.5 h-3.5" /> Type:
        </div>
        {["all", "campaign", "creative", "audience", "agent", "platform", "recipe"].map((t) => (
          <button key={t} className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${filterType === t ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500"}`} onClick={() => setFilterType(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <div className="w-px h-6 bg-gray-800 mx-2" />
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mr-2">
          <Filter className="w-3.5 h-3.5" /> Action:
        </div>
        {["all", "created", "updated", "paused", "approved", "archived", "launched"].map((a) => (
          <button key={a} className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${filterAction === a ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500"}`} onClick={() => setFilterAction(a)}>
            {a.charAt(0).toUpperCase() + a.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Clock className="w-10 h-10 mx-auto mb-2" />
            <p>No activities match the selected filters</p>
          </div>
        ) : (
          filtered.map((activity) => {
            const Icon = entityIcons[activity.entityType] || FileText;
            const colorClass = entityColors[activity.entityType] || "text-gray-400 bg-gray-500/10";
            const timeAgo = getTimeAgo(activity.timestamp);
            return (
              <div key={activity._id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-800/50 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-white font-medium">{activity.userName}</span>
                    <span className="text-xs text-gray-500 capitalize">{activity.action}</span>
                    <span className="text-sm text-gray-300 truncate">{activity.entityName}</span>
                    <span className="text-xs text-gray-500 capitalize">({activity.entityType})</span>
                  </div>
                  {activity.details && (
                    <p className="text-xs text-gray-500 mt-0.5">{activity.details}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {timeAgo}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

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
