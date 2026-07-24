import { useState, useEffect } from "react";
import { ScrollText, Search, Filter, Download, ChevronDown, ChevronRight, Clock, User, Megaphone, Palette, Users, Bot, FileJson, Share2, Webhook, Shield, CheckCircle, XCircle, Edit3, Trash2, Plus, Eye, LogIn, LogOut, RefreshCw, Copy, FileText, LayoutDashboard } from "lucide-react";
import { useToast } from "../components/Toast";

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

const STORAGE_KEY = "n0va_audit_log";
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

function generateSeedAudit(): AuditEntry[] {
  const now = Date.now();
  const actors = ["You", "Sarah Chen", "Alex Rivera", "Mia Johnson", "System"];
  const ips = ["192.168.1.42", "10.0.0.15", "172.16.0.8", "203.0.113.45", "198.51.100.22"];
  const entries: AuditEntry[] = [];

  const templates: Omit<AuditEntry, "id" | "timestamp" | "ip">[] = [
    { actor: "You", action: "create", entityType: "campaign", entityId: "c1", entityName: "Summer Sale 2026", details: "Created new campaign with $25,000 budget" },
    { actor: "You", action: "update", entityType: "campaign", entityId: "c1", entityName: "Summer Sale 2026", details: "Updated budget from $20,000 to $25,000" },
    { actor: "Sarah Chen", action: "create", entityType: "creative", entityId: "cr1", entityName: "Hero Banner v2", details: "Uploaded new creative asset" },
    { actor: "Sarah Chen", action: "approve", entityType: "creative", entityId: "cr1", entityName: "Hero Banner v2", details: "Approved creative for campaign use" },
    { actor: "Alex Rivera", action: "create", entityType: "audience", entityId: "a1", entityName: "High-Value Customers", details: "Built audience segment with 45K users" },
    { actor: "Alex Rivera", action: "update", entityType: "audience", entityId: "a1", entityName: "High-Value Customers", details: "Added behavioral targeting rules" },
    { actor: "You", action: "create", entityType: "agent", entityId: "ag1", entityName: "Budget Optimizer", details: "Created AI agent for budget optimization" },
    { actor: "Mia Johnson", action: "view", entityType: "report", entityId: "r1", entityName: "Q3 Performance Report", details: "Viewed quarterly performance report" },
    { actor: "System", action: "login", entityType: "user", entityId: "u1", entityName: "You", details: "Successful login from Chrome on Windows" },
    { actor: "Sarah Chen", action: "login", entityType: "user", entityId: "u2", entityName: "Sarah Chen", details: "Successful login from Safari on macOS" },
    { actor: "You", action: "export", entityType: "campaign", entityId: "c1", entityName: "Summer Sale 2026", details: "Exported campaign data as CSV" },
    { actor: "Alex Rivera", action: "reject", entityType: "creative", entityId: "cr2", entityName: "Banner Ad Set B", details: "Rejected creative — brand color mismatch" },
    { actor: "You", action: "duplicate", entityType: "campaign", entityId: "c2", entityName: "Summer Sale 2026 (Copy)", details: "Duplicated campaign for A/B testing" },
    { actor: "System", action: "delete", entityType: "creative", entityId: "cr3", entityName: "Old Logo Variant", details: "Auto-cleaned unused creative (30 days inactive)" },
    { actor: "Mia Johnson", action: "logout", entityType: "user", entityId: "u4", entityName: "Mia Johnson", details: "User logged out" },
    { actor: "You", action: "create", entityType: "webhook", entityId: "w1", entityName: "Slack Notifications", details: "Created webhook for campaign alerts" },
    { actor: "You", action: "update", entityType: "setting", entityId: "s1", entityName: "Default Budget Alert", details: "Changed budget alert threshold to 80%" },
    { actor: "Sarah Chen", action: "create", entityType: "recipe", entityId: "r1", entityName: "Social Media Playbook", details: "Created new recipe template" },
    { actor: "Alex Rivera", action: "archive", entityType: "campaign", entityId: "c3", entityName: "Q2 Promotions", details: "Archived completed campaign" },
    { actor: "You", action: "restore", entityType: "campaign", entityId: "c3", entityName: "Q2 Promotions", details: "Restored archived campaign for reference" },
    { actor: "System", action: "login", entityType: "user", entityId: "u5", entityName: "James Park", details: "First login — new user onboarding" },
    { actor: "Sarah Chen", action: "update", entityType: "campaign", entityId: "c4", entityName: "Brand Awareness Q3", details: "Extended campaign end date by 7 days" },
    { actor: "You", action: "approve", entityType: "campaign", entityId: "c5", entityName: "Product Launch", details: "Approved campaign for activation" },
    { actor: "Alex Rivera", action: "create", entityType: "platform", entityId: "p1", entityName: "LinkedIn Ads", details: "Connected LinkedIn Ads platform" },
    { actor: "System", action: "update", entityType: "setting", entityId: "s2", entityName: "System Config", details: "Auto-updated integration credentials" },
    { actor: "You", action: "export", entityType: "audience", entityId: "a2", entityName: "Retargeting Pool", details: "Exported audience list for external use" },
    { actor: "Mia Johnson", action: "view", entityType: "dashboard", entityId: "d1", entityName: "Executive Dashboard", details: "Viewed executive summary dashboard" },
    { actor: "Sarah Chen", action: "duplicate", entityType: "creative", entityId: "cr4", entityName: "Social Post v3", details: "Duplicated creative for variant testing" },
    { actor: "System", action: "create", entityType: "agent", entityId: "ag2", entityName: "Performance Monitor", details: "Auto-deployed monitoring agent" },
    { actor: "Alex Rivera", action: "update", entityType: "audience", entityId: "a3", entityName: "Lookalike Audience", details: "Updated seed audience for lookalike model" },
  ];

  templates.forEach((t, i) => {
    entries.push({
      ...t,
      id: `audit-${i}`,
      timestamp: new Date(now - 3600000 * i * 2 - 60000 * Math.floor(Math.random() * 60)).toISOString(),
      ip: ips[i % ips.length],
    });
  });

  return entries;
}

function load(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    const seed = generateSeedAudit();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  } catch { return []; }
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
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterEntity, setFilterEntity] = useState<string>("all");
  const [filterActor, setFilterActor] = useState<string>("all");
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { setEntries(load()); }, []);

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

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <ScrollText className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No audit events found</h3>
          <p className="text-sm text-gray-500">{search ? "Try different search terms or filters" : "Audit events will appear here as actions are performed."}</p>
        </div>
      )}

      {/* Timeline */}
      {displayed.length > 0 && (
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
