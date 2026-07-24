import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Megaphone, Palette, LayoutGrid, Users, Bot, FileJson, BarChart3, Shield, Layers, Activity, Settings, Calendar, CalendarDays, HeartPulse, TrendingDown, Wallet, GitCompare, TrendingUp, Split, SearchX, Bell, Link2,   FileText, CreditCard, CheckSquare, CheckCircle, MessageCircle,   Crosshair, LifeBuoy,   Sparkles, User, Upload, Download, FolderOpen, Target } from "lucide-react";
import { api } from "../api/client";

interface SearchResult {
  type: "page" | "campaign" | "creative" | "audience" | "agent" | "recipe";
  label: string;
  subtitle?: string;
  route: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
}

const PAGE_ITEMS: SearchResult[] = [
  { type: "page", label: "Dashboard", route: "/", icon: BarChart3 },
  { type: "page", label: "Campaigns", route: "/campaigns", icon: Megaphone },
  { type: "page", label: "Calendar", route: "/campaign-calendar", icon: Calendar },
  { type: "page", label: "Creatives", route: "/creatives", icon: Palette },
  { type: "page", label: "Audiences", route: "/audiences", icon: Users },
  { type: "page", label: "Analytics", route: "/analytics", icon: BarChart3 },
  { type: "page", label: "War Room", route: "/war-room", icon: Shield },
  { type: "page", label: "Fraud Center", route: "/fraud-evaluation", icon: SearchX },
  { type: "page", label: "Budget Strategy", route: "/budget-strategy", icon: Wallet },
  { type: "page", label: "AI Agents", route: "/agents", icon: Bot },
  { type: "page", label: "Recipes", route: "/recipes", icon: FileJson },
  { type: "page", label: "Platforms", route: "/platforms", icon: Layers },
  { type: "page", label: "Platform Health", route: "/platform-health", icon: HeartPulse },
  { type: "page", label: "Attribution", route: "/attribution", icon: GitCompare },
  { type: "page", label: "Forecast", route: "/forecast", icon: TrendingUp },
  { type: "page", label: "A/B Testing", route: "/creative-ab-test", icon: Split },
  { type: "page", label: "Overlap Analysis", route: "/audience-overlap", icon: Users },
  { type: "page", label: "Fatigue Monitor", route: "/creative-fatigue", icon: TrendingDown },
  { type: "page", label: "Activity Feed", route: "/activity", icon: Activity },
  { type: "page", label: "Notifications", route: "/notifications", icon: Bell },
  { type: "page", label: "Help & Support", route: "/help", icon: LifeBuoy },
  { type: "page", label: "Hyper-Context", route: "/hyper-context", icon: Layers },
  { type: "page", label: "Webhooks", route: "/webhooks", icon: Activity },
  { type: "page", label: "Settings", route: "/settings", icon: Settings },
  { type: "page", label: "New Campaign", route: "/campaigns/new", icon: Megaphone },
  { type: "page", label: "Audience Builder", route: "/audiences/new", icon: Users },
  { type: "page", label: "Connected Accounts", route: "/connected-accounts", icon: Link2 },
  { type: "page", label: "Reports", route: "/reports", icon: FileText },
  { type: "page", label: "Billing", route: "/billing", icon: CreditCard },
  { type: "page", label: "New Agent", route: "/agents/new", icon: Bot },
  { type: "page", label: "New Creative", route: "/creatives/new", icon: Palette },
  { type: "page", label: "New Recipe", route: "/recipes/new", icon: FileJson },
  { type: "page", label: "Campaign Comparison", route: "/campaign-comparison", icon: GitCompare },
  { type: "page", label: "Insights", route: "/insights", icon: TrendingUp },
  { type: "page", label: "Templates", route: "/templates", icon: FileText },
  { type: "page", label: "Review Board", route: "/campaign-review", icon: CheckSquare },
  { type: "page", label: "Search", route: "/search", icon: Search },
  { type: "page", label: "Brief Generator", route: "/brief-generator", icon: Sparkles },
  { type: "page", label: "Account", route: "/account", icon: User },
  { type: "page", label: "Brand Kit", route: "/brand-kit", icon: Palette },
  { type: "page", label: "Data Import", route: "/import", icon: Upload },
  { type: "page", label: "Approvals", route: "/approvals", icon: CheckCircle },
  { type: "page", label: "Creative Gallery", route: "/creative-gallery", icon: LayoutGrid },
  { type: "page", label: "Launch Checklist", route: "/launch-checklist", icon: CheckSquare },
  { type: "page", label: "Marketing Calendar", route: "/marketing-calendar", icon: CalendarDays },
  { type: "page", label: "Export Center", route: "/export", icon: Download },
  { type: "page", label: "Content Library", route: "/content-library", icon: FolderOpen },
  { type: "page", label: "Goals & OKRs", route: "/goals", icon: Target },
  { type: "page", label: "A/B Testing", route: "/ab-testing", icon: GitCompare },
  { type: "page", label: "Comments", route: "/comments", icon: MessageCircle },
  { type: "page", label: "Competitive Intel", route: "/competitive-intel", icon: Crosshair },
];

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-green-500/20 text-green-400" },
  paused: { label: "Paused", color: "bg-yellow-500/20 text-yellow-400" },
  draft: { label: "Draft", color: "bg-gray-500/20 text-gray-400" },
  archived: { label: "Archived", color: "bg-gray-700/20 text-gray-500" },
  running: { label: "Running", color: "bg-green-500/20 text-green-400" },
  pending_approval: { label: "Pending", color: "bg-yellow-500/20 text-yellow-400" },
  approved: { label: "Approved", color: "bg-blue-500/20 text-blue-400" },
  rejected: { label: "Rejected", color: "bg-red-500/20 text-red-400" },
};

const TYPE_ICONS: Record<string, any> = {
  campaign: Megaphone, creative: Palette, audience: Users,
  agent: Bot, recipe: FileJson,
};

const TYPE_ROUTES: Record<string, string> = {
  campaign: "/campaigns", creative: "/creatives", audience: "/audiences",
  agent: "/agents", recipe: "/recipes",
};

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [entityData, setEntityData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setLoading(true);
      setTimeout(() => inputRef.current?.focus(), 50);
      Promise.all([
        api.campaigns.list().then((r) => Array.isArray(r) ? r : r.campaigns || []).catch(() => []),
        api.creatives.list().catch(() => []),
        api.audiences.list().catch(() => []),
        api.agents.list().catch(() => []),
        api.recipes.list().catch(() => []),
      ]).then(([campaigns, creatives, audiences, agents, recipes]) => {
        setEntityData({ campaigns, creatives, audiences, agents, recipes });
        setLoading(false);
      });
    }
  }, [open]);

  const entityResults = useMemo(() => {
    const items: SearchResult[] = [];
    for (const [type, entries] of Object.entries(entityData)) {
      for (const e of entries) {
        const Icon = TYPE_ICONS[type] || Activity;
        const statusBadge = STATUS_BADGES[e.status];
        items.push({
          type: type.substring(0, type.length - 1) as any,
          label: e.name || e._id,
          subtitle: e.type || e.platform || "",
          route: `${TYPE_ROUTES[type] || "/"}/${e._id || e.id}`,
          icon: Icon,
          badge: statusBadge?.label || e.status,
          badgeColor: statusBadge?.color || "bg-gray-500/20 text-gray-400",
        });
      }
    }
    return items;
  }, [entityData]);

  const allItems = useMemo(() => [...PAGE_ITEMS, ...entityResults], [entityResults]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase();
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        item.subtitle?.toLowerCase().includes(q)
    );
  }, [query, allItems]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      onClose();
      navigate(result.route);
    },
    [navigate, onClose]
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      handleSelect(filtered[selectedIndex]);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  function resultKey(r: SearchResult, i: number) {
    return `${r.type}-${r.route}-${i}`;
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
          <Search className="w-5 h-5 text-gray-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, campaigns, creatives..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-500"
          />
          {loading && <div className="w-4 h-4 border-2 border-n0va-500 border-t-transparent rounded-full animate-spin" />}
          <kbd className="text-xs text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">ESC</kbd>
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">No results for "{query}"</div>
          ) : (
            filtered.map((result, i) => {
              const isEntity = result.type !== "page";
              return (
                <button
                  key={resultKey(result, i)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                    i === selectedIndex ? "bg-n0va-600/20 text-n0va-400" : "text-gray-300 hover:bg-gray-800"
                  }`}
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <result.icon className="w-4 h-4 text-gray-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{result.label}</span>
                      {result.badge && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${result.badgeColor || "bg-gray-500/20 text-gray-400"}`}>
                          {result.badge}
                        </span>
                      )}
                    </div>
                    {result.subtitle && <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>}
                  </div>
                  <span className={`text-xs shrink-0 ${isEntity ? "text-gray-600 capitalize" : "text-n0va-400"}`}>
                    {isEntity ? result.type : "page"}
                  </span>
                </button>
              );
            })
          )}
          {entityData.campaigns && entityData.campaigns.length > 0 && !query.trim() && (
            <div className="border-t border-gray-800 mt-2 pt-2 px-3">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider font-medium">Quick Links</p>
              <div className="flex gap-2 mt-2">
                <button className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 px-2.5 py-1.5 rounded-lg" onClick={() => { onClose(); navigate("/campaigns/new"); }}>New Campaign</button>
                <button className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 px-2.5 py-1.5 rounded-lg" onClick={() => { onClose(); navigate("/campaign-calendar"); }}>Calendar</button>
                <button className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 px-2.5 py-1.5 rounded-lg" onClick={() => { onClose(); navigate("/activity"); }}>Activity</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
