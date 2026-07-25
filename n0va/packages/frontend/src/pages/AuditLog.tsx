import { useState, useEffect } from "react";
import { ScrollText, Search, Filter, Download, ChevronDown, ChevronRight, Clock, User, Megaphone, Palette, Users, Bot, FileJson, Share2, Webhook, Shield, CheckCircle, XCircle, Edit3, Trash2, Plus, Eye, LogIn, LogOut, RefreshCw, Copy, FileText, LayoutDashboard, Loader } from "lucide-react";
import { useToast } from "../components/Toast";
import { api } from "../api/client";

interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: "create" | "update" | "delete" | "approve" | "reject" | "view" | "login" | "logout" | "export" | "duplicate" | "archive" | "restore";
  entityType: "campaign" | "creative" | "audience" | "agent" | "recipe" | "platform" | "webhook" | "user" | "setting" | "report" | "dashboard";
  entityId: string;
  entityName: string;
  details: string;
  ip: string;
}

const PAGE_SIZE = 25;

const ACTION_META: Record<string, { label: string; icon: any; color: string }> = {
  create: { label: "Created", icon: Plus, color: "text-green-400 bg-green-500/10" },
  update: { label: "Updated", icon: Edit3, color: "text-blue-400 bg-blue-500/10" },
  delete: { label: "Deleted", icon: Trash2, color: "text-red-400 bg-red-500/10" },
  approve: { label: "Approved", icon: CheckCircle, color: "text-emerald-400 bg-emerald-500/10" },
  reject: { label: "Rejected", icon: XCircle, color: "text-red-400 bg-red-500/10" },
  view: { label: "Viewed", icon: Eye, color: "text-gray-400 bg-gray-500/10" },
  login: { label: "Login", icon: LogIn, color: "text-purple-400 bg-purple-500/10" },
  logout: { label: "Logout", icon: LogOut, color: "text-purple-400 bg-purple-500/10" },
  export: { label: "Exported", icon: Download, color: "text-cyan-400 bg-cyan-500/10" },
  duplicate: { label: "Duplicated", icon: Copy, color: "text-amber-400 bg-amber-500/10" },
  archive: { label: "Archived", icon: Trash2, color: "text-gray-400 bg-gray-500/10" },
  restore: { label: "Restored", icon: RefreshCw, color: "text-green-400 bg-green-500/10" },
};

const ENTITY_ICONS: Record<string, any> = {
  campaign: Megaphone, creative: Palette, audience: Users,
  agent: Bot, recipe: FileJson, platform: Share2,   webhook: Webhook,
  user: User, setting: Shield,
  report: FileText, dashboard: LayoutDashboard,
};

const ENTITY_COLORS: Record<string, string> = {
  campaign: "text-blue-400", creative: "text-purple-400", audience: "text-green-400",
  agent: "text-orange-400", recipe: "text-pink-400", platform: "text-cyan-400",
  webhook: "text-rose-400", user: "text-gray-400", setting: "text-amber-400",
};

function mapEntry(e: any): AuditEntry {
  return {
    id: e._id || e.id,
    timestamp: e.timestamp || new Date().toISOString(),
    actor: e.actor || e.userName || "System",
    action: e.action || "view",
    entityType: e.entityType || "setting",
    entityId: e.entityId || e._id || "",
    entityName: e.entityName || e.label || "",
    details: e.details || e.description || "",
    ip: e.ip || "",
  };
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function AuditLog() {
  const { addToast } = useToast();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterEntity, setFilterEntity] = useState<string>("all");
  const [filterActor, setFilterActor] = useState<string>("all");
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.activity.list().then((r) => { setEntries((r || []).map(mapEntry)); setLoading(false); }).catch(() => { setLoading(false); });
  }, []);

  const actions = [...new Set(entries.map(e => e.action))];
  const entityTypes = [...new Set(entries.map(e => e.entityType))];
  const actors = [...new Set(entries.map(e => e.actor))];

  let filtered = entries;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(e => e.entityName.toLowerCase().includes(q) || e.details.toLowerCase().includes(q) || e.actor.toLowerCase().includes(q) || e.entityType.toLowerCase().includes(q));
  }
  if (filterAction !== "all") filtered = filtered.filter(e => e.action === filterAction);
  if (filterEntity !== "all") filtered = filtered.filter(e => e.entityType === filterEntity);
  if (filterActor !== "all") filtered = filtered.filter(e => e.actor === filterActor);

  const displayed = filtered.slice(0, displayCount);

  function exportCSV() {
    const header = "Timestamp,Actor,Action,Entity Type,Entity Name,Details,IP Address";
    const rows = filtered.map(e => `${e.timestamp},"${e.actor}","${e.action}","${e.entityType}","${e.entityName}","${e.details}","${e.ip}"`).join("\n");
    const blob = new Blob(["\ufeff" + header + "\n" + rows], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "audit_log.csv"; a.click();
    addToast("success", "Audit log exported");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ScrollText className="w-6 h-6 text-n0va-400" />
            Audit Log
          </h1>
          <p className="text-gray-400 mt-1">{entries.length} total events · {filtered.length} shown</p>
        </div>
        <button onClick={exportCSV} className="btn-ghost text-sm"><Download className="w-4 h-4 mr-1" /> Export CSV</button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input className="input pl-10 pr-4 py-2 text-sm" placeholder="Search audit events..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input text-sm w-auto" value={filterAction} onChange={e => setFilterAction(e.target.value)}>
          <option value="all">All Actions</option>
          {actions.map(a => <option key={a} value={a}>{ACTION_META[a]?.label || a}</option>)}
        </select>
        <select className="input text-sm w-auto" value={filterEntity} onChange={e => setFilterEntity(e.target.value)}>
          <option value="all">All Entities</option>
          {entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="input text-sm w-auto" value={filterActor} onChange={e => setFilterActor(e.target.value)}>
          <option value="all">All Actors</option>
          {actors.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {(search || filterAction !== "all" || filterEntity !== "all" || filterActor !== "all") && (
          <button onClick={() => { setSearch(""); setFilterAction("all"); setFilterEntity("all"); setFilterActor("all"); }} className="text-xs text-gray-500 hover:text-gray-300">Clear</button>
        )}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader className="w-6 h-6 text-n0va-400 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <ScrollText className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No audit events found</h3>
          <p className="text-sm text-gray-500">{search ? "Try different search terms or filters" : "Audit events will appear here as actions are performed."}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map(entry => {
            const am = ACTION_META[entry.action] || { label: entry.action, icon: Eye, color: "text-gray-400 bg-gray-500/10" };
            const ActionIcon = am.icon;
            const EntityIcon = ENTITY_ICONS[entry.entityType] || Shield;
            const isOpen = expandedId === entry.id;
            return (
              <div key={entry.id} className="card p-4 hover:bg-gray-800/30 transition-colors cursor-pointer" onClick={() => setExpandedId(isOpen ? null : entry.id)}>
                <div className="flex items-start gap-4">
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${am.color}`}><ActionIcon className="w-4 h-4" /></div>
                    <div className="w-px h-full min-h-[24px] bg-gray-800 mt-1" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white">{entry.actor}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${am.color}`}>{am.label}</span>
                      <EntityIcon className={`w-3.5 h-3.5 ${ENTITY_COLORS[entry.entityType] || "text-gray-400"}`} />
                      <span className={`text-sm ${ENTITY_COLORS[entry.entityType] || "text-gray-400"}`}>{entry.entityName}</span>
                      <span className="text-xs text-gray-600 ml-auto flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(entry.timestamp)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{entry.details}</p>

                    {/* Expanded details */}
                    {isOpen && (
                      <div className="mt-3 pt-3 border-t border-gray-800 grid grid-cols-2 gap-3 text-xs">
                        <div><span className="text-gray-600">Event ID</span><p className="text-gray-300 font-mono">{entry.id}</p></div>
                        <div><span className="text-gray-600">Timestamp</span><p className="text-gray-300">{new Date(entry.timestamp).toLocaleString()}</p></div>
                        <div><span className="text-gray-600">Entity Type</span><p className="text-gray-300 capitalize">{entry.entityType}</p></div>
                        <div><span className="text-gray-600">Entity ID</span><p className="text-gray-300 font-mono">{entry.entityId}</p></div>
                        <div><span className="text-gray-600">Actor</span><p className="text-gray-300">{entry.actor}</p></div>
                        <div><span className="text-gray-600">IP Address</span><p className="text-gray-300 font-mono">{entry.ip}</p></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Load more */}
          {filtered.length > displayCount && (
            <button onClick={() => setDisplayCount(p => p + PAGE_SIZE)} className="w-full py-3 text-sm text-gray-600 hover:text-gray-400 border border-dashed border-gray-800 rounded-lg">
              Show {Math.min(PAGE_SIZE, filtered.length - displayCount)} more events ({filtered.length - displayCount} remaining)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
