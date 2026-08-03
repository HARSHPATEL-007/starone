import { NavLink, useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import {
  LayoutDashboard,
  LayoutGrid,
  Megaphone,
  Palette,
  Users,
  Bot,
  Share2,
  BarChart3,
  FileJson,
  Shield,
  Link2,
  Webhook,
  Plug,
  Lock,
  Settings,
  GitCompare,
  TrendingUp,
  Split,
  Target,
  Eye,
  SearchX,
  CheckSquare,
  CheckCircle,
  Wallet,
  Activity,
  ScrollText,
  Calculator,
  Zap,
  Bell,
  MessageCircle,
  Crosshair,
  LifeBuoy,
  Layers,
  LogOut,
  HeartPulse,
  TrendingDown,
  Calendar as CalendarIcon,
  CalendarDays,
  FileText,
  BookTemplate,
  FolderOpen,
  UserPlus,
  CreditCard,
  History,
  Sparkles,
  ListFilter,
  ExternalLink,
  DollarSign,
  FileInput,
  Hash,
  Archive,
  Camera,
  Award,
  Send,
  ClipboardList,
  GitBranch,
  User,
  Upload,
  Download,
  Rocket,
  Newspaper,
  Clock,
  Terminal,
  Code2,
  Mail,
  AtSign,
  Play,
  AlertTriangle,
  Database,
  Sigma,
  Globe,
  Cpu,
  Lightbulb,
  Beaker,
  Binary,
  Search,
  ScanLine,
  Mailbox,
  Signature,
  ShieldAlert,
  AlarmClock,
  Paperclip,
  MessagesSquare,
  BrainCircuit,
  FolderSearch,
  Mic,
  SendHorizonal,
  CalendarClock,
  MailOpen,
  Import,
} from "lucide-react";
import { useRecentItems, RecentItem } from "../hooks/useRecentItems";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/command-center", icon: LayoutDashboard, label: "Command Center" },
  { to: "/mail", icon: Mail, label: "Mail" },
  { to: "/mail/search", icon: Search, label: "Mail Search" },
  { to: "/mail/rules", icon: Zap, label: "Mail Rules" },
  { to: "/mail/mailboxes", icon: Mailbox, label: "Mailboxes" },
  { to: "/mail/ai", icon: Sparkles, label: "Mail AI" },
  { to: "/mail/contacts", icon: Users, label: "Mail Contacts" },
  { to: "/mail/agent", icon: Bot, label: "Mail Agent" },
  { to: "/mail/compliance", icon: Shield, label: "Mail Compliance" },
  { to: "/mail/templates", icon: FileText, label: "Mail Templates" },
  { to: "/mail/signatures", icon: Signature, label: "Signatures" },
  { to: "/mail/spam", icon: ShieldAlert, label: "Spam" },
  { to: "/mail/followups", icon: AlarmClock, label: "Follow-ups" },
  { to: "/mail/analytics", icon: BarChart3, label: "Mail Analytics" },
  { to: "/mail/files", icon: Paperclip, label: "Mail Files" },
  { to: "/mail/collaboration", icon: MessagesSquare, label: "Collaboration" },
  { to: "/mail/predict", icon: BrainCircuit, label: "Predictive AI" },
  { to: "/mail/campaigns", icon: Megaphone, label: "Mail Campaigns" },
  { to: "/mail/discovery", icon: FolderSearch, label: "eDiscovery" },
  { to: "/mail/domains", icon: Globe, label: "Domains" },
  { to: "/mail/voice", icon: Mic, label: "Voice & Media" },
  { to: "/mail/command-center", icon: LayoutDashboard, label: "Mail Command" },
  { to: "/mail/dispatch", icon: SendHorizonal, label: "Mail Dispatch" },
  { to: "/mail/calendar", icon: CalendarClock, label: "Mail Calendar" },
  { to: "/mail/reader", icon: MailOpen, label: "Mail Reader" },
  { to: "/mail/ops", icon: Activity, label: "Mail Ops" },
  { to: "/mail/protection", icon: Shield, label: "Mail Protection" },
  { to: "/mail/webhooks", icon: Webhook, label: "Mail Webhooks" },
    { to: "/mail/agents", icon: Bot, label: "Mail Agents" },
    { to: "/mail/integrations", icon: Plug, label: "Mail Integrations" },
    { to: "/mail/billing", icon: CreditCard, label: "Mail Billing" },
    { to: "/mail/notifications", icon: Bell, label: "Mail Alerts" },
    { to: "/mail/quantum", icon: Lock, label: "Mail Quantum" },
    { to: "/mail/import", icon: Import, label: "Mail Import" },
  { to: "/custom-dashboards", icon: LayoutDashboard, label: "Custom Dashboards" },
  { to: "/campaigns", icon: Megaphone, label: "Campaigns" },
  { to: "/campaign-archive", icon: Archive, label: "Campaign Archive" },
  { to: "/campaign-snapshots", icon: Camera, label: "Snapshots" },
  { to: "/lead-scoring", icon: Award, label: "Lead Scoring" },
  { to: "/campaign-calendar", icon: CalendarIcon, label: "Calendar" },
  { to: "/marketing-calendar", icon: CalendarDays, label: "Marketing Calendar" },
  { to: "/campaign-review", icon: CheckSquare, label: "Review Board" },
  { to: "/approvals", icon: CheckCircle, label: "Approvals" },
  { to: "/insights", icon: TrendingUp, label: "Insights" },
  { to: "/campaign-comparison", icon: GitCompare, label: "Compare Campaigns" },
  { to: "/templates", icon: FileText, label: "Templates" },
  { to: "/ad-copy", icon: FileText, label: "Ad Copy" },
  { to: "/social-publisher", icon: Send, label: "Social Publisher" },
  { to: "/campaign-alerts", icon: Bell, label: "Campaign Alerts" },
  { to: "/playbooks", icon: BookTemplate, label: "Playbooks" },
  { to: "/playbook-execution", icon: Play, label: "Playbook Exec" },
  { to: "/launch-checklist", icon: CheckSquare, label: "Launch Checklist" },
  { to: "/campaigns/new", icon: Megaphone, label: "New Campaign" },
  { to: "/brief-generator", icon: Sparkles, label: "Brief Generator" },
  { to: "/briefs", icon: FileText, label: "Campaign Briefs" },
  { to: "/landing-pages", icon: ExternalLink, label: "Landing Pages" },
  { to: "/landing-page-builder", icon: ExternalLink, label: "Landing Page Builder" },
  { to: "/influencer-management", icon: Users, label: "Influencers" },
  { to: "/campaign-issues", icon: AlertTriangle, label: "Campaign Issues" },
  { to: "/competitive-benchmarking", icon: BarChart3, label: "Benchmarking" },
  { to: "/cdp", icon: Database, label: "Customer Data" },
  { to: "/campaign-scorecard", icon: Award, label: "Scorecard" },
  { to: "/workflow-builder", icon: GitBranch, label: "Workflow Builder" },
  { to: "/admin", icon: Shield, label: "Admin Panel" },
  { to: "/predictive-forecasting", icon: TrendingUp, label: "Forecasting" },
  { to: "/predictive-forecasting-enhanced", icon: TrendingUp, label: "Forecasting+" },
  { to: "/ab-test-statistics", icon: Sigma, label: "A/B Stats" },
  { to: "/anomaly-detection", icon: AlertTriangle, label: "Anomaly Detection" },
  { to: "/anomaly-detection-enhanced", icon: ScanLine, label: "Anomaly Detection+" },
  { to: "/incrementality-testing", icon: Beaker, label: "Incrementality" },
  { to: "/search-intelligence", icon: Search, label: "Search Intel" },
  { to: "/portfolio-budget-optimizer", icon: DollarSign, label: "Budget Optimizer" },
  { to: "/campaign-saturation", icon: TrendingDown, label: "Saturation" },
  { to: "/cost-tracker", icon: DollarSign, label: "Cost Tracker" },
  { to: "/forms", icon: FileInput, label: "Marketing Forms" },
  { to: "/channel-performance", icon: BarChart3, label: "Channel Perf." },
  { to: "/keywords", icon: Hash, label: "Keywords" },
  { to: "/surveys", icon: ClipboardList, label: "Surveys" },
  { to: "/campaign-health", icon: HeartPulse, label: "Campaign Health" },
  { to: "/customer-journey", icon: GitBranch, label: "Journey Builder" },
  { to: "/creatives", icon: Palette, label: "Creatives" },
  { to: "/creative-gallery", icon: LayoutGrid, label: "Creative Gallery" },
  { to: "/ad-preview", icon: Eye, label: "Ad Preview" },
  { to: "/creatives/new", icon: Palette, label: "New Creative" },
  { to: "/import", icon: Upload, label: "Data Import" },
  { to: "/export", icon: Download, label: "Export Center" },
  { to: "/audiences", icon: Users, label: "Audiences" },
  { to: "/audience-insights", icon: Users, label: "Audience Insights" },
  { to: "/audiences/new", icon: UserPlus, label: "Audience Builder" },
  { to: "/segmentation", icon: Split, label: "Segmentation" },
  { to: "/utm-builder", icon: Link2, label: "UTM Builder" },
  { to: "/funnel", icon: TrendingDown, label: "Funnels" },
  { to: "/smart-lists", icon: ListFilter, label: "Smart Lists" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/reports", icon: FileText, label: "Reports" },
  { to: "/report-builder", icon: FileText, label: "Report Builder" },
  { to: "/war-room", icon: Shield, label: "War Room" },
  { to: "/fraud-evaluation", icon: SearchX, label: "Fraud Center" },
  { to: "/budget-strategy", icon: Wallet, label: "Budget Strategy" },
  { to: "/budget-pacing", icon: TrendingUp, label: "Budget Pacing" },
  { to: "/campaign-optimizer", icon: Zap, label: "AI Optimizer" },
  { to: "/roi-calculator", icon: Calculator, label: "ROI Calculator" },
  { to: "/agents", icon: Bot, label: "AI Agents" },
  { to: "/agents/new", icon: Bot, label: "New Agent" },
  { to: "/recipes", icon: FileJson, label: "Recipes" },
  { to: "/recipes/new", icon: FileJson, label: "New Recipe" },
  { to: "/platforms", icon: Share2, label: "Platforms" },
  { to: "/connected-accounts", icon: Link2, label: "Accounts" },
  { to: "/platform-health", icon: HeartPulse, label: "Platform Health" },
  { to: "/attribution", icon: GitCompare, label: "Attribution" },
  { to: "/forecast", icon: TrendingUp, label: "Forecast" },
  { to: "/automation", icon: Zap, label: "Automation" },
  { to: "/creative-ab-test", icon: Split, label: "A/B Testing" },
  { to: "/audience-overlap", icon: Target, label: "Overlap Analysis" },
  { to: "/creative-fatigue", icon: TrendingDown, label: "Fatigue Monitor" },
  { to: "/activity", icon: Activity, label: "Activity Feed" },
  { to: "/audit-log", icon: ScrollText, label: "Audit Log" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/mentions", icon: AtSign, label: "Mentions" },
  { to: "/hyper-context", icon: Layers, label: "Hyper-Context" },
  { to: "/webhooks", icon: Webhook, label: "Webhooks" },
  { to: "/developer-portal", icon: Terminal, label: "Developer Portal" },
  { to: "/brand-kit", icon: Palette, label: "Brand Kit" },
  { to: "/content-library", icon: FolderOpen, label: "Content Library" },
  { to: "/goals", icon: Target, label: "Goals & OKRs" },
  { to: "/ab-testing", icon: GitCompare, label: "A/B Testing" },
  { to: "/comments", icon: MessageCircle, label: "Comments" },
  { to: "/competitive-intel", icon: Crosshair, label: "Competitive Intel" },
  { to: "/team", icon: Users, label: "Team" },
  { to: "/account", icon: User, label: "Account" },
  { to: "/billing", icon: CreditCard, label: "Billing" },
  { to: "/help", icon: LifeBuoy, label: "Help & Support" },
  { to: "/settings", icon: Settings, label: "Settings" },
  { to: "/campaign-board", icon: LayoutGrid, label: "Campaign Board" },
  { to: "/launch-readiness", icon: Rocket, label: "Launch Readiness" },
  { to: "/media-kit", icon: Newspaper, label: "Media Kit" },
  { to: "/campaign-scheduler", icon: Clock, label: "Scheduler" },
  { to: "/intent-console", icon: Terminal, label: "Intent Console" },
  { to: "/sandbox-console", icon: Code2, label: "Sandbox" },
  { to: "/n0va1o", icon: Globe, label: "N0VA1O Gateway" },
  { to: "/marketing-intelligence", icon: TrendingUp, label: "Marketing Intel" },
  { to: "/agent-intelligence", icon: Cpu, label: "Agent Intel" },
  { to: "/predictive-bidding", icon: TrendingUp, label: "Predictive Bidding" },
  { to: "/customer-lifetime-value", icon: DollarSign, label: "Customer LTV" },
  { to: "/ad-copy-optimizer", icon: FileText, label: "Ad Copy Optimizer" },
  { to: "/marketing-mix-model", icon: BarChart3, label: "MMM Analysis" },
  { to: "/campaign-simulation", icon: Layers, label: "Campaign Sim" },
  { to: "/real-time-bidding", icon: Zap, label: "RTB Engine" },
  { to: "/creative-ai-enhanced", icon: Lightbulb, label: "Creative AI+" },
  { to: "/audience-insights-enhanced", icon: Users, label: "Audience Insights+" },
  { to: "/ad-copy-personalization", icon: Sparkles, label: "Ad Personalization" },
  { to: "/campaign-health-predictor", icon: HeartPulse, label: "Health Predictor" },
  { to: "/attribution-analytics", icon: GitCompare, label: "Attribution Analytics" },
  { to: "/forecasting-dashboard", icon: TrendingUp, label: "Forecasting Dashboard" },
  { to: "/marketing-roi", icon: DollarSign, label: "Marketing ROI" },
  { to: "/ds-algorithms", icon: Binary, label: "DSA Playground" },
  { to: "/autonomous-campaign-manager", icon: Bot, label: "Auto Campaign Mgr" },
  { to: "/unified-ads-pipeline", icon: Layers, label: "Ads Pipeline" },
  { to: "/delivery", icon: Mail, label: "Delivery Status" },
];

const typeIcons: Record<string, any> = {
  campaign: Megaphone, creative: Palette, audience: Users,
  agent: Bot, recipe: FileJson, platform: Share2, webhook: Webhook,
};

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mentionCount, setMentionCount] = useState(0);
  const [mailUnread, setMailUnread] = useState(0);
  const [recent, setRecent] = useState<RecentItem[]>([]);

  useEffect(() => {
    api.notifications.unreadCount().then((res) => setUnreadCount(res.count)).catch(() => {});
    api.mentions.unreadCount().then((res) => setMentionCount(res.count)).catch(() => {});
    const loadMailUnread = () => {
      api.adsMarketingModule.mailUnreadSummary().then((r) => {
        const s = r && r.data !== undefined ? r.data : r;
        setMailUnread(s?.totals?.totalUnread || 0);
      }).catch(() => {});
    };
    loadMailUnread();
    function refresh() { loadMailUnread(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, []);

  useEffect(() => {
    api.adsMarketingModule.mailUnreadSummary().then((r) => {
      const s = r && r.data !== undefined ? r.data : r;
      setMailUnread(s?.totals?.totalUnread || 0);
    }).catch(() => {});
  }, [location.pathname]);

  function handleLogout() {
    localStorage.removeItem("n0va_token");
    localStorage.removeItem("n0va_user");
    navigate("/login");
  }

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-screen">
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-n0va-600 rounded-lg flex items-center justify-center text-sm font-bold">
            N0
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">N0VA</h1>
            <p className="text-xs text-gray-500">Ads & Marketing</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-n0va-600/20 text-n0va-400 border border-n0va-600/30"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            <span className="flex-1">{item.label}</span>
            {item.to === "/notifications" && unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
            {item.to === "/mail" && mailUnread > 0 && (
              <span className="bg-n0va-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {mailUnread > 99 ? "99+" : mailUnread}
              </span>
            )}
            {item.to === "/mentions" && mentionCount > 0 && (
              <span className="bg-n0va-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {mentionCount > 99 ? "99+" : mentionCount}
              </span>
            )}
          </NavLink>
        ))}
        {recent.length > 0 && (
          <>
            <div className="flex items-center gap-2 px-3 pt-4 pb-1">
              <History className="w-3 h-3 text-gray-600" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-600">Recent</span>
            </div>
            {recent.map((item: RecentItem) => {
              const Icon = typeIcons[item.type] || History;
              return (
                <NavLink
                  key={`${item.type}-${item.id}`}
                  to={item.route}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-n0va-600/20 text-n0va-400"
                        : "text-gray-500 hover:text-gray-200 hover:bg-gray-800"
                    }`
                  }
                >
                  <Icon className="w-3 h-3" />
                  <span className="truncate flex-1">{item.label}</span>
                  {item.subtitle && <span className="text-gray-600 truncate max-w-[80px] hidden 2xl:inline">{item.subtitle}</span>}
                </NavLink>
              );
            })}
          </>
        )}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-medium">
            {(() => {
              const userData = localStorage.getItem("n0va_user");
              if (userData) {
                try {
                  const u = JSON.parse(userData);
                  return u.name?.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() || "U";
                } catch {}
              }
              return "JD";
            })()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-white">
              {(() => {
                const userData = localStorage.getItem("n0va_user");
                if (userData) {
                  try { return JSON.parse(userData).name; } catch {}
                }
                return "User";
              })()}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {(() => {
                const userData = localStorage.getItem("n0va_user");
                if (userData) {
                  try { return JSON.parse(userData).role; } catch {}
                }
                return "User";
              })()}
            </p>
          </div>
          <button onClick={handleLogout} className="text-gray-600 hover:text-red-400 transition-colors" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
