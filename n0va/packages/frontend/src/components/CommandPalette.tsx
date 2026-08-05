import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Megaphone, Palette, LayoutGrid, Users, Bot, FileJson, BarChart3,   Shield, Layers, LayoutDashboard, Activity, ScrollText, Settings, Calendar, CalendarDays, HeartPulse, TrendingDown, Wallet, GitCompare, TrendingUp, Split,   SearchX, Eye, Bell, Link2,   BookTemplate, FileText, CreditCard, CheckSquare, CheckCircle, MessageCircle,   Crosshair, LifeBuoy, Zap, Calculator,   Sparkles, User, Upload, Download, FolderOpen, Target, ListFilter, ExternalLink, DollarSign, FileInput, Hash, Archive, Camera, Award, Send, ClipboardList, GitBranch, Mail, Mailbox, Inbox, Signature, ShieldAlert, AlarmClock, Paperclip, MessagesSquare,    BrainCircuit, FolderSearch, Globe, Mic, Volume2, Webhook, Plug, SendHorizonal, CalendarClock, MailOpen, Lock, Import, GitMerge, Workflow, Gauge, ListOrdered, Ticket, KeyRound, Fingerprint, Scale, Beaker, PenLine, MapPin, Store, Code2, AtSign, Tag, Terminal } from "lucide-react";
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
  { type: "page", label: "Command Center", route: "/command-center", icon: LayoutDashboard },
  { type: "page", label: "Mail", route: "/mail", icon: Mail },
  { type: "page", label: "Mail Search", route: "/mail/search", icon: Search },
  { type: "page", label: "Mail Rules", route: "/mail/rules", icon: Zap },
  { type: "page", label: "Mailboxes", route: "/mail/mailboxes", icon: Mailbox },
  { type: "page", label: "Mail AI", route: "/mail/ai", icon: Sparkles },
{ type: "page", label: "Mail Contacts", route: "/mail/contacts", icon: Users },
{ type: "page", label: "Mail Agent", route: "/mail/agent", icon: Bot },
{ type: "page", label: "Mail Compliance", route: "/mail/compliance", icon: Shield },
{ type: "page", label: "Mail Templates", route: "/mail/templates", icon: FileText },
{ type: "page", label: "Signatures", route: "/mail/signatures", icon: Signature },
{ type: "page", label: "Spam", route: "/mail/spam", icon: ShieldAlert },
{ type: "page", label: "Follow-ups", route: "/mail/followups", icon: AlarmClock },
{ type: "page", label: "Mail Analytics", route: "/mail/analytics", icon: BarChart3 },
{ type: "page", label: "Mail Files", route: "/mail/files", icon: Paperclip },
{ type: "page", label: "Collaboration", route: "/mail/collaboration", icon: MessagesSquare },
{ type: "page", label: "Predictive AI", route: "/mail/predict", icon: BrainCircuit },
{ type: "page", label: "Mail Campaigns", route: "/mail/campaigns", icon: Megaphone },
{ type: "page", label: "eDiscovery", route: "/mail/discovery", icon: FolderSearch },
{ type: "page", label: "Domains", route: "/mail/domains", icon: Globe },
{ type: "page", label: "Voice & Media", route: "/mail/voice", icon: Mic },
  { type: "page", label: "Voice Console", route: "/mail/voice-commands", icon: Volume2 },
{ type: "page", label: "Mail Command", route: "/mail/command-center", icon: LayoutDashboard },
{ type: "page", label: "Mail Dispatch", route: "/mail/dispatch", icon: SendHorizonal },
{ type: "page", label: "Mail Calendar", route: "/mail/calendar", icon: CalendarClock },
{ type: "page", label: "Mail Reader", route: "/mail/reader", icon: MailOpen },
{ type: "page", label: "Mail Ops", route: "/mail/ops", icon: Activity },
  { type: "page", label: "Mail Protection", route: "/mail/protection", icon: Shield },
  { type: "page", label: "Mail Webhooks", route: "/mail/webhooks", icon: Webhook },
    { type: "page", label: "Mail Agents", route: "/mail/agents", icon: Bot },
    { type: "page", label: "Mail Integrations", route: "/mail/integrations", icon: Plug },
    { type: "page", label: "Mail Billing", route: "/mail/billing", icon: CreditCard },
    { type: "page", label: "Mail Alerts", route: "/mail/notifications", icon: Bell },
    { type: "page", label: "Mail Quantum", route: "/mail/quantum", icon: Lock },
    { type: "page", label: "Mail Import", route: "/mail/import", icon: Import },
    { type: "page", label: "Mail Threads", route: "/mail/threads", icon: GitMerge },
    { type: "page", label: "Mail Automations", route: "/mail/automations", icon: Workflow },
    { type: "page", label: "Deliverability", route: "/mail/deliverability", icon: Gauge },
    { type: "page", label: "Mail Sequences", route: "/mail/sequences", icon: ListOrdered },
    { type: "page", label: "Mail Tickets", route: "/mail/tickets", icon: Ticket },
    { type: "page", label: "Mail Admin", route: "/mail/admin", icon: KeyRound },
    { type: "page", label: "Biometrics", route: "/mail/biometrics", icon: Fingerprint },
    { type: "page", label: "Zero Trust", route: "/mail/zero-trust", icon: Shield },
    { type: "page", label: "AI Governance", route: "/mail/governance", icon: Scale },
    { type: "page", label: "Mail Performance", route: "/mail/performance", icon: Gauge },
    { type: "page", label: "Chaos Engineering", route: "/mail/chaos", icon: Beaker },
    { type: "page", label: "Focus Time", route: "/mail/focus", icon: Target },
    { type: "page", label: "Neural Composer", route: "/mail/composer", icon: PenLine },
    { type: "page", label: "Mail Aliases", route: "/mail/aliases", icon: AtSign },
    { type: "page", label: "Mail Labels", route: "/mail/labels", icon: Tag },
    { type: "page", label: "Data Residency", route: "/mail/residency", icon: MapPin },
    { type: "page", label: "White Label", route: "/mail/branding", icon: Palette },
    { type: "page", label: "Marketplace", route: "/mail/marketplace", icon: Store },
    { type: "page", label: "Dev Center", route: "/mail/dev", icon: Code2 },
  { type: "page", label: "N0VA1O Overview", route: "/n0va1o/overview", icon: LayoutDashboard },
  { type: "page", label: "Gateway Catalog", route: "/n0va1o/catalog", icon: LayoutGrid },
  { type: "page", label: "N0VA1O Connections", route: "/n0va1o/connections", icon: Plug },
  { type: "page", label: "Recipes & Triggers", route: "/n0va1o/recipes", icon: Zap },
  { type: "page", label: "N0VA1O Governance", route: "/n0va1o/governance", icon: Shield },
  { type: "page", label: "N0VA1O Compliance", route: "/n0va1o/compliance", icon: Scale },
  { type: "page", label: "N0VA1O Universal CLI", route: "/n0va1o/cli", icon: Terminal },
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
  { type: "page", label: "Automation", route: "/automation", icon: Zap },
  { type: "page", label: "Playbooks", route: "/playbooks", icon: BookTemplate },
  { type: "page", label: "ROI Calculator", route: "/roi-calculator", icon: Calculator },
  { type: "page", label: "Team", route: "/team", icon: Users },
  { type: "page", label: "Audit Log", route: "/audit-log", icon: ScrollText },
  { type: "page", label: "Custom Dashboards", route: "/custom-dashboards", icon: LayoutDashboard },
  { type: "page", label: "Ad Preview", route: "/ad-preview", icon: Eye },
  { type: "page", label: "Segmentation", route: "/segmentation", icon: Split },
  { type: "page", label: "UTM Builder", route: "/utm-builder", icon: Link2 },
  { type: "page", label: "Funnels", route: "/funnel", icon: TrendingDown },
  { type: "page", label: "Smart Lists", route: "/smart-lists", icon: ListFilter },
  { type: "page", label: "Campaign Briefs", route: "/briefs", icon: FileText },
  { type: "page", label: "Landing Pages", route: "/landing-pages", icon: ExternalLink },
  { type: "page", label: "Cost Tracker", route: "/cost-tracker", icon: DollarSign },
  { type: "page", label: "Marketing Forms", route: "/forms", icon: FileInput },
  { type: "page", label: "Channel Performance", route: "/channel-performance", icon: BarChart3 },
  { type: "page", label: "Keywords", route: "/keywords", icon: Hash },
  { type: "page", label: "Campaign Archive", route: "/campaign-archive", icon: Archive },
  { type: "page", label: "Snapshots", route: "/campaign-snapshots", icon: Camera },
  { type: "page", label: "Lead Scoring", route: "/lead-scoring", icon: Award },
  { type: "page", label: "Social Publisher", route: "/social-publisher", icon: Send },
  { type: "page", label: "Campaign Alerts", route: "/campaign-alerts", icon: Bell },
  { type: "page", label: "Ad Copy", route: "/ad-copy", icon: FileText },
  { type: "page", label: "Surveys", route: "/surveys", icon: ClipboardList },
  { type: "page", label: "Campaign Health", route: "/campaign-health", icon: HeartPulse },
  { type: "page", label: "Journey Builder", route: "/customer-journey", icon: GitBranch },
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
