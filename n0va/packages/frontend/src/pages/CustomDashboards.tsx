import { useState, useEffect } from "react";
import { LayoutDashboard, Plus, X, Edit3, Trash2, ChevronDown, ChevronRight, GripVertical, Save, Eye, EyeOff, Copy, BarChart3, TrendingUp, DollarSign, Target, Users, Megaphone, CheckCircle, Activity, Bot, Palette, Calendar, Bell, Zap, Crosshair, Star, Clock } from "lucide-react";
import { useToast } from "../components/Toast";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import { api } from "../api/client";

interface DashboardWidget {
  id: string;
  type: string;
  label: string;
  visible: boolean;
  width: "full" | "half" | "third";
}

interface CustomDashboard {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "n0va_custom_dashboards";

const WIDGET_TEMPLATES: { type: string; label: string; icon: any; defaultWidth: "full" | "half" | "third"; desc: string }[] = [
  { type: "kpi_revenue", label: "Revenue KPI", icon: DollarSign, defaultWidth: "third", desc: "Total revenue, ROAS, and CPA metrics" },
  { type: "kpi_campaigns", label: "Campaign KPIs", icon: Megaphone, defaultWidth: "third", desc: "Active, paused, draft campaign counts" },
  { type: "kpi_audience", label: "Audience KPIs", icon: Users, defaultWidth: "third", desc: "Total audience reach and segments" },
  { type: "chart_performance", label: "Performance Chart", icon: TrendingUp, defaultWidth: "full", desc: "Revenue and impressions trend" },
  { type: "recent_campaigns", label: "Recent Campaigns", icon: Megaphone, defaultWidth: "half", desc: "Last 5 campaigns with status" },
  { type: "pending_approvals", label: "Pending Approvals", icon: CheckCircle, defaultWidth: "half", desc: "Campaigns awaiting approval" },
  { type: "budget_status", label: "Budget Status", icon: DollarSign, defaultWidth: "half", desc: "Budget utilization across campaigns" },
  { type: "activity_feed", label: "Recent Activity", icon: Activity, defaultWidth: "half", desc: "Latest team actions and updates" },
  { type: "agent_status", label: "AI Agent Status", icon: Bot, defaultWidth: "third", desc: "AI agent health and run count" },
  { type: "goals_progress", label: "Goals Progress", icon: Target, defaultWidth: "third", desc: "OKR completion percentages" },
  { type: "ab_testing", label: "A/B Test Status", icon: Zap, defaultWidth: "third", desc: "Running and completed test counts" },
  { type: "calendar_preview", label: "Upcoming Schedule", icon: Calendar, defaultWidth: "half", desc: "Next 7 days campaign schedule" },
  { type: "approval_queue", label: "Approval Queue", icon: CheckCircle, defaultWidth: "half", desc: "Items needing your review" },
  { type: "competitive_snapshot", label: "Competitive Snapshot", icon: Crosshair, defaultWidth: "half", desc: "Competitor count and recent ads" },
  { type: "recent_comments", label: "Recent Comments", icon: Star, defaultWidth: "half", desc: "Latest team discussions" },
];

const DASHBOARD_DEMOS: CustomDashboard[] = [
  {
    id: "db-1", name: "Executive Overview",
    widgets: [
      { id: "w1", type: "kpi_revenue", label: "Revenue KPI", visible: true, width: "third" },
      { id: "w2", type: "kpi_campaigns", label: "Campaign KPIs", visible: true, width: "third" },
      { id: "w3", type: "kpi_audience", label: "Audience KPIs", visible: true, width: "third" },
      { id: "w4", type: "chart_performance", label: "Performance Chart", visible: true, width: "full" },
      { id: "w5", type: "recent_campaigns", label: "Recent Campaigns", visible: true, width: "half" },
      { id: "w6", type: "pending_approvals", label: "Pending Approvals", visible: true, width: "half" },
      { id: "w7", type: "goals_progress", label: "Goals Progress", visible: true, width: "half" },
      { id: "w8", type: "activity_feed", label: "Recent Activity", visible: true, width: "half" },
    ],
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: "db-2", name: "Campaign Performance",
    widgets: [
      { id: "w9", type: "chart_performance", label: "Performance Chart", visible: true, width: "full" },
      { id: "w10", type: "recent_campaigns", label: "Recent Campaigns", visible: true, width: "half" },
      { id: "w11", type: "budget_status", label: "Budget Status", visible: true, width: "half" },
      { id: "w12", type: "ab_testing", label: "A/B Test Status", visible: true, width: "third" },
      { id: "w13", type: "competitive_snapshot", label: "Competitive Snapshot", visible: true, width: "third" },
      { id: "w14", type: "approval_queue", label: "Approval Queue", visible: true, width: "third" },
    ],
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "db-3", name: "Team Overview",
    widgets: [
      { id: "w15", type: "agent_status", label: "AI Agent Status", visible: true, width: "third" },
      { id: "w16", type: "activity_feed", label: "Recent Activity", visible: true, width: "half" },
      { id: "w17", type: "recent_comments", label: "Recent Comments", visible: true, width: "half" },
      { id: "w18", type: "calendar_preview", label: "Upcoming Schedule", visible: true, width: "full" },
    ],
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
];

const COLORS = ["#1a6dff", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

function load(): CustomDashboard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DASHBOARD_DEMOS));
    return DASHBOARD_DEMOS;
  } catch { return []; }
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  if (hrs < 168) return `${Math.floor(hrs / 24)}d ago`;
  return new Date(date).toLocaleDateString();
}

function KpiCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: any; color: string }) {
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className={`p-2.5 rounded-lg ${color} shrink-0`}><Icon className="w-5 h-5" /></div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-white">{value}</p>
        {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* --- Live widget components --- */

function RevenueKpiWidget() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api.campaigns.dashboard().then(setData).catch(() => {}); }, []);
  if (!data) return <div className="card p-4 animate-pulse h-24 bg-gray-900" />;
  return (
    <div className="card p-4">
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Revenue" value={`$${((data.metrics?.totalRevenue ?? 0) / 1000).toFixed(1)}K`} icon={TrendingUp} color="bg-green-500/10" />
        <KpiCard label="ROAS" value={(data.metrics?.avgRoas ?? 0).toFixed(2)} icon={BarChart3} color="bg-n0va-500/10" />
        <KpiCard label="Spent" value={`$${((data.totalSpent ?? 0) / 1000).toFixed(1)}K`} icon={DollarSign} color="bg-yellow-500/10" />
      </div>
    </div>
  );
}

function CampaignKpiWidget() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api.campaigns.list().then(setData).catch(() => {}); }, []);
  const campaigns = Array.isArray(data) ? data : [];
  const active = campaigns.filter((c: any) => c.status === "active").length;
  const paused = campaigns.filter((c: any) => c.status === "paused").length;
  const draft = campaigns.filter((c: any) => c.status === "draft").length;
  return (
    <div className="card p-4">
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Active" value={String(active)} sub="running campaigns" icon={Megaphone} color="bg-green-500/10" />
        <KpiCard label="Paused" value={String(paused)} icon={BarChart3} color="bg-yellow-500/10" />
        <KpiCard label="Draft" value={String(draft)} icon={BarChart3} color="bg-gray-500/10" />
      </div>
    </div>
  );
}

function AudienceKpiWidget() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api.audiences.list().then(setData).catch(() => {}); }, []);
  const audiences = Array.isArray(data) ? data : [];
  const totalReach = audiences.reduce((s: number, a: any) => s + (a.size || 0), 0);
  return (
    <div className="card p-4">
      <div className="grid grid-cols-1 gap-3">
        <KpiCard label="Total Reach" value={totalReach >= 1000000 ? `${(totalReach / 1000000).toFixed(1)}M` : totalReach >= 1000 ? `${(totalReach / 1000).toFixed(1)}K` : String(totalReach)} icon={Users} color="bg-purple-500/10" />
        <KpiCard label="Segments" value={String(audiences.length)} icon={Target} color="bg-n0va-500/10" />
      </div>
    </div>
  );
}

function PerformanceChartWidget() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api.analytics.overview("14").then(setData).catch(() => {}); }, []);
  const daily = data?.dailyMetrics?.slice(-14) || [];
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-semibold text-white">Revenue & Impressions</h3><span className="text-xs text-gray-500">Last 14 days</span></div>
      {daily.length === 0 ? <div className="h-48 flex items-center justify-center text-gray-600 text-sm">No data</div> : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily}>
              <defs><linearGradient id="revG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1a6dff" stopOpacity={0.3} /><stop offset="95%" stopColor="#1a6dff" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickFormatter={(v) => v?.substring(5) || v} />
              <YAxis stroke="#6b7280" fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px", color: "#f3f4f6", fontSize: "12px" }} />
              <Area type="monotone" dataKey="revenue" stroke="#1a6dff" fill="url(#revG)" strokeWidth={2} name="Revenue" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function RecentCampaignsWidget() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api.campaigns.list().then(setData).catch(() => {}); }, []);
  const campaigns = (Array.isArray(data) ? data : []).slice(0, 5);
  const statusColors: Record<string, string> = { active: "bg-green-500", paused: "bg-yellow-500", draft: "bg-gray-600", archived: "bg-gray-800", completed: "bg-n0va-500" };
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-white mb-3">Recent Campaigns</h3>
      {campaigns.length === 0 ? <p className="text-xs text-gray-600">No campaigns yet</p> : (
        <div className="space-y-2">
          {campaigns.map((c: any) => (
            <div key={c._id} className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-300 truncate">{c.name || c.title}</p>
                <p className="text-xs text-gray-600">{c.type || "campaign"} · ${((c.budget?.daily || 0) / 100).toFixed(0)}/day</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[c.status] || "bg-gray-700"} text-white shrink-0`}>{c.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PendingApprovalsWidget() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api.campaigns.list().then(setData).catch(() => {}); }, []);
  const pending = (Array.isArray(data) ? data : []).filter((c: any) => c.status === "draft").slice(0, 5);
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-white mb-3">Pending Approvals</h3>
      {pending.length === 0 ? <p className="text-xs text-green-400">All clear — no pending items</p> : (
        <div className="space-y-2">
          {pending.map((c: any) => (
            <div key={c._id} className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
              <p className="text-sm text-gray-300 truncate">{c.name || c.title}</p>
              <CheckCircle className="w-4 h-4 text-yellow-400 shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BudgetStatusWidget() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api.campaigns.dashboard().then(setData).catch(() => {}); }, []);
  if (!data) return <div className="card p-4 animate-pulse h-24 bg-gray-900" />;
  const used = data.totalBudget ? ((data.totalSpent / data.totalBudget) * 100) : 0;
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-white mb-3">Budget Status</h3>
      <div className="flex flex-col items-center">
        <div className="relative w-20 h-20 mb-2">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="32" fill="none" stroke="#1f2937" strokeWidth="8" />
            <circle cx="40" cy="40" r="32" fill="none" stroke="#1a6dff" strokeWidth="8" strokeDasharray={`${used * 2.01} 201`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center"><span className="text-sm font-bold text-white">{used.toFixed(0)}%</span></div>
        </div>
        <p className="text-xs text-gray-500">${((data.totalSpent ?? 0) / 1000).toFixed(1)}K of ${((data.totalBudget ?? 0) / 1000).toFixed(1)}K</p>
      </div>
    </div>
  );
}

function ActivityFeedWidget() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api.activity.list().then((d) => setData(Array.isArray(d) ? d.slice(0, 5) : [])).catch(() => {}); }, []);
  const items = data || [];
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-white mb-3">Recent Activity</h3>
      {items.length === 0 ? <p className="text-xs text-gray-600">No activity yet</p> : (
        <div className="space-y-2">
          {items.map((a: any, i: number) => (
            <div key={a.id || i} className="flex items-start gap-2 py-1.5 border-b border-gray-800 last:border-0">
              <Activity className="w-3 h-3 text-gray-600 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-300">{a.action}</p>
                <p className="text-[10px] text-gray-600">{a.userName} · {a.timestamp ? timeAgo(a.timestamp) : ""}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AgentStatusWidget() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api.agents.list().then(setData).catch(() => {}); }, []);
  const agents = Array.isArray(data) ? data : [];
  const running = agents.filter((a: any) => a.status === "running").length;
  const idle = agents.filter((a: any) => a.status === "idle").length;
  const errors = agents.filter((a: any) => a.status === "error").length;
  return (
    <div className="card p-4">
      <div className="grid grid-cols-3 gap-2">
        <KpiCard label="Running" value={String(running)} icon={Bot} color="bg-green-500/10" />
        <KpiCard label="Idle" value={String(idle)} icon={Bot} color="bg-gray-500/10" />
        <KpiCard label="Errors" value={String(errors)} sub={errors > 0 ? "needs attention" : undefined} icon={Bot} color={errors > 0 ? "bg-red-500/10" : "bg-gray-500/10"} />
      </div>
    </div>
  );
}

function GoalsProgressWidget() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("n0va_goals");
      if (raw) setData(JSON.parse(raw));
    } catch {}
  }, []);
  const goals = Array.isArray(data) ? data.slice(0, 4) : [];
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-white mb-3">Goals Progress</h3>
      {goals.length === 0 ? <p className="text-xs text-gray-600">Set goals to track progress</p> : (
        <div className="space-y-2">
          {goals.map((g: any) => {
            const progress = g.keyResults?.length ? Math.round(g.keyResults.filter((kr: any) => kr.status === "completed").length / g.keyResults.length * 100) : 0;
            return (<div key={g.id} className="flex items-center justify-between py-1"><span className="text-xs text-gray-300 truncate flex-1">{g.title}</span><div className="flex items-center gap-2"><div className="w-16 h-1.5 bg-gray-800 rounded-full"><div className="h-full bg-n0va-500 rounded-full" style={{ width: `${progress}%` }} /></div><span className="text-xs text-gray-600 w-6 text-right">{progress}%</span></div></div>);
          })}
        </div>
      )}
    </div>
  );
}

function ABTestStatusWidget() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("n0va_ab_tests");
      if (raw) setData(JSON.parse(raw));
    } catch {}
  }, []);
  const tests = Array.isArray(data) ? data : [];
  const running = tests.filter((t: any) => t.status === "running").length;
  const completed = tests.filter((t: any) => t.status === "completed").length;
  return (
    <div className="card p-4">
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Running" value={String(running)} icon={Zap} color="bg-n0va-500/10" />
        <KpiCard label="Completed" value={String(completed)} icon={CheckCircle} color="bg-green-500/10" />
      </div>
    </div>
  );
}

function CalendarPreviewWidget() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api.hypercontext.calendar.list().then((d) => setData(Array.isArray(d) ? d.slice(0, 5) : [])).catch(() => {}); }, []);
  const events = data || [];
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-white mb-3">Upcoming Schedule</h3>
      {events.length === 0 ? <p className="text-xs text-gray-600">No upcoming events</p> : (
        <div className="space-y-2">
          {events.map((e: any) => (
            <div key={e._id} className="flex items-center gap-3 py-1.5 border-b border-gray-800 last:border-0">
              <div className="w-8 h-8 rounded-lg bg-n0va-500/10 flex items-center justify-center shrink-0"><Calendar className="w-4 h-4 text-n0va-400" /></div>
              <div className="min-w-0 flex-1"><p className="text-xs text-gray-300 truncate">{e.title}</p><p className="text-[10px] text-gray-600">{e.startDate ? new Date(e.startDate).toLocaleDateString() : ""} · {e.type}</p></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ApprovalQueueWidget() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api.campaigns.list().then(setData).catch(() => {}); }, []);
  const draft = (Array.isArray(data) ? data : []).filter((c: any) => c.status === "draft");
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-white mb-3">Approval Queue</h3>
      {draft.length === 0 ? <p className="text-xs text-green-400">All campaigns approved</p> : (
        <p className="text-2xl font-bold text-white">{draft.length}</p>
      )}
    </div>
  );
}

function CompetitiveSnapshotWidget() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("n0va_competitive_intel");
      if (raw) {
        const parsed = JSON.parse(raw);
        setData(Array.isArray(parsed) ? parsed : []);
      }
    } catch {}
  }, []);
  const competitors = Array.isArray(data) ? data : [];
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-white mb-3">Competitive Snapshot</h3>
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Competitors" value={String(competitors.length)} icon={Crosshair} color="bg-red-500/10" />
        <KpiCard label="Recent Ads" value={String(competitors.reduce((s: number, c: any) => s + (c.recentAds?.length || 0), 0))} icon={Crosshair} color="bg-orange-500/10" />
      </div>
    </div>
  );
}

function RecentCommentsWidget() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("n0va_comments");
      if (raw) {
        const parsed = JSON.parse(raw);
        setData(Array.isArray(parsed) ? parsed.slice(0, 4) : []);
      }
    } catch {}
  }, []);
  const comments = data || [];
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-white mb-3">Recent Comments</h3>
      {comments.length === 0 ? <p className="text-xs text-gray-600">No discussions yet</p> : (
        <div className="space-y-2">
          {comments.map((c: any, i: number) => (
            <div key={c.id || i} className="flex items-start gap-2 py-1.5 border-b border-gray-800 last:border-0">
              <Star className="w-3 h-3 text-gray-600 mt-0.5 shrink-0" />
              <div><p className="text-xs text-gray-300 truncate">{c.text || c.content}</p><p className="text-[10px] text-gray-600">{c.author || "User"}</p></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const WIDGET_COMPONENTS: Record<string, () => JSX.Element> = {
  kpi_revenue: RevenueKpiWidget,
  kpi_campaigns: CampaignKpiWidget,
  kpi_audience: AudienceKpiWidget,
  chart_performance: PerformanceChartWidget,
  recent_campaigns: RecentCampaignsWidget,
  pending_approvals: PendingApprovalsWidget,
  budget_status: BudgetStatusWidget,
  activity_feed: ActivityFeedWidget,
  agent_status: AgentStatusWidget,
  goals_progress: GoalsProgressWidget,
  ab_testing: ABTestStatusWidget,
  calendar_preview: CalendarPreviewWidget,
  approval_queue: ApprovalQueueWidget,
  competitive_snapshot: CompetitiveSnapshotWidget,
  recent_comments: RecentCommentsWidget,
};

function WidgetRenderer({ type, label }: { type: string; label: string }) {
  const Widget = WIDGET_COMPONENTS[type];
  if (!Widget) {
    return (
      <div className="card p-6 flex flex-col items-center justify-center text-center min-h-[120px]">
        <BarChart3 className="w-6 h-6 text-gray-700 mb-2" />
        <p className="text-xs text-gray-600">{label}</p>
      </div>
    );
  }
  return <Widget />;
}

export default function CustomDashboards() {
  const { addToast } = useToast();
  const [dashboards, setDashboards] = useState<CustomDashboard[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editName, setEditName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);

  useEffect(() => {
    const loaded = load();
    setDashboards(loaded);
    if (loaded.length > 0 && !activeId) setActiveId(loaded[0].id);
  }, []);

  const active = dashboards.find(d => d.id === activeId);

  function persist(updated: CustomDashboard[]) {
    setDashboards(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function handleCreate() {
    if (!editName.trim()) { addToast("error", "Dashboard name is required"); return; }
    const now = new Date().toISOString();
    const db: CustomDashboard = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: editName.trim(),
      widgets: [
        { id: "w-" + Date.now().toString(36), type: "kpi_revenue", label: "Revenue KPI", visible: true, width: "third" },
        { id: "w-" + Date.now().toString(36) + "b", type: "recent_campaigns", label: "Recent Campaigns", visible: true, width: "full" },
      ],
      createdAt: now, updatedAt: now,
    };
    persist([db, ...dashboards]);
    setActiveId(db.id);
    setShowCreate(false);
    setEditName("");
    addToast("success", "Dashboard created");
  }

  function handleDelete(id: string) {
    const db = dashboards.find(d => d.id === id);
    persist(dashboards.filter(d => d.id !== id));
    if (activeId === id) setActiveId(dashboards.filter(d => d.id !== id)[0]?.id || null);
    addToast("success", `"${db?.name}" deleted`);
  }

  function duplicateDashboard(id: string) {
    const db = dashboards.find(d => d.id === id);
    if (!db) return;
    const copy: CustomDashboard = {
      ...db, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: `${db.name} (Copy)`,
      widgets: db.widgets.map(w => ({ ...w, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) })),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    persist([copy, ...dashboards]);
    addToast("success", "Dashboard duplicated");
  }

  function toggleWidgetVisibility(widgetId: string) {
    if (!active) return;
    persist(dashboards.map(d => d.id === active.id ? {
      ...d, widgets: d.widgets.map(w => w.id === widgetId ? { ...w, visible: !w.visible } : w),
      updatedAt: new Date().toISOString(),
    } : d));
  }

  function removeWidget(widgetId: string) {
    if (!active) return;
    persist(dashboards.map(d => d.id === active.id ? {
      ...d, widgets: d.widgets.filter(w => w.id !== widgetId),
      updatedAt: new Date().toISOString(),
    } : d));
  }

  function addWidget(type: string) {
    if (!active) return;
    const tmpl = WIDGET_TEMPLATES.find(t => t.type === type);
    if (!tmpl) return;
    if (active.widgets.some(w => w.type === type)) { addToast("error", "Widget already added"); setShowWidgetPicker(false); return; }
    const widget: DashboardWidget = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type, label: tmpl.label, visible: true, width: tmpl.defaultWidth,
    };
    persist(dashboards.map(d => d.id === active.id ? {
      ...d, widgets: [...d.widgets, widget],
      updatedAt: new Date().toISOString(),
    } : d));
    setShowWidgetPicker(false);
    addToast("success", `"${tmpl.label}" added`);
  }

  function renameDashboard() {
    if (!active || !editName.trim()) return;
    persist(dashboards.map(d => d.id === active.id ? { ...d, name: editName.trim(), updatedAt: new Date().toISOString() } : d));
    setEditingId(null);
    addToast("success", "Dashboard renamed");
  }

  if (dashboards.length === 0) {
    return (
      <div className="card p-12 flex flex-col items-center justify-center text-center">
        <LayoutDashboard className="w-12 h-12 text-gray-700 mb-4" />
        <h3 className="text-lg font-semibold text-gray-300 mb-2">No custom dashboards</h3>
        <p className="text-sm text-gray-500">Create your first dashboard to track the metrics that matter most.</p>
        <button onClick={() => { setEditName(""); setShowCreate(true); }} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Create Dashboard</button>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCreate(false)}>
            <div className="w-full max-w-sm bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white mb-4">Create Dashboard</h3>
              <form onSubmit={e => { e.preventDefault(); handleCreate(); }}>
                <input className="input w-full" placeholder="e.g. Executive Overview" value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
                <div className="flex justify-end gap-3 mt-4"><button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">Create</button></div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {dashboards.map(db => (
            <button key={db.id} onClick={() => setActiveId(db.id)} className={`text-sm px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${activeId === db.id ? "bg-n0va-500/10 text-n0va-400 font-medium" : "text-gray-500 hover:text-gray-300"}`}>
              <LayoutDashboard className="w-3.5 h-3.5 inline mr-1.5" />{db.name}
            </button>
          ))}
          <button onClick={() => { setEditName(""); setShowCreate(true); }} className="text-sm px-3 py-2 text-gray-600 hover:text-gray-400"><Plus className="w-3.5 h-3.5" /></button>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {active && <button onClick={() => duplicateDashboard(active.id)} className="p-1.5 text-gray-600 hover:text-gray-300"><Copy className="w-4 h-4" /></button>}
          {active && <button onClick={() => { setEditingId(active.id); setEditName(active.name); }} className="p-1.5 text-gray-600 hover:text-gray-300"><Edit3 className="w-4 h-4" /></button>}
          {active && <button onClick={() => handleDelete(active.id)} className="p-1.5 text-gray-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>}
        </div>
      </div>

      {editingId && active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEditingId(null)}>
          <div className="w-full max-w-sm bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Rename Dashboard</h3>
            <form onSubmit={e => { e.preventDefault(); renameDashboard(); }}>
              <input className="input w-full" value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
              <div className="flex justify-end gap-3 mt-4"><button type="button" onClick={() => setEditingId(null)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">Save</button></div>
            </form>
          </div>
        </div>
      )}

      {active && (
        <>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{active.widgets.filter(w => w.visible).length} visible widgets · Updated {timeAgo(active.updatedAt)}</span>
            <button onClick={() => setShowWidgetPicker(true)} className="text-n0va-400 hover:text-n0va-300 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add Widget</button>
          </div>

          <div className="space-y-4">
            <div className="space-y-4">
              {active.widgets.filter(w => w.width === "full" && w.visible).map(w => (
                <div key={w.id} className="relative group">
                  <WidgetRenderer type={w.type} label={w.label} />
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => toggleWidgetVisibility(w.id)} className="p-1 bg-gray-800 rounded text-gray-500 hover:text-gray-300"><EyeOff className="w-3.5 h-3.5" /></button>
                    <button onClick={() => removeWidget(w.id)} className="p-1 bg-gray-800 rounded text-gray-500 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {active.widgets.filter(w => w.width === "half" && w.visible).map(w => (
                <div key={w.id} className="relative group">
                  <WidgetRenderer type={w.type} label={w.label} />
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => toggleWidgetVisibility(w.id)} className="p-1 bg-gray-800 rounded text-gray-500 hover:text-gray-300"><EyeOff className="w-3.5 h-3.5" /></button>
                    <button onClick={() => removeWidget(w.id)} className="p-1 bg-gray-800 rounded text-gray-500 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {active.widgets.filter(w => w.width === "third" && w.visible).map(w => (
                <div key={w.id} className="relative group">
                  <WidgetRenderer type={w.type} label={w.label} />
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => toggleWidgetVisibility(w.id)} className="p-1 bg-gray-800 rounded text-gray-500 hover:text-gray-300"><EyeOff className="w-3.5 h-3.5" /></button>
                    <button onClick={() => removeWidget(w.id)} className="p-1 bg-gray-800 rounded text-gray-500 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>

            {active.widgets.filter(w => !w.visible).length > 0 && (
              <div className="text-center py-4 text-xs text-gray-600">
                {active.widgets.filter(w => !w.visible).length} hidden widget{active.widgets.filter(w => !w.visible).length !== 1 ? "s" : ""}
                <button onClick={() => active.widgets.filter(w => !w.visible).forEach(w => toggleWidgetVisibility(w.id))} className="ml-2 text-n0va-400 hover:text-n0va-300">Show all</button>
              </div>
            )}
          </div>
        </>
      )}

      {showWidgetPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowWidgetPicker(false)}>
          <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">Add Widget</h3><button onClick={() => setShowWidgetPicker(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {WIDGET_TEMPLATES.map(tmpl => {
                const Icon = tmpl.icon;
                const isAdded = active?.widgets.some(w => w.type === tmpl.type);
                return (
                  <button key={tmpl.type} onClick={() => addWidget(tmpl.type)} disabled={isAdded} className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${isAdded ? "border-green-500/20 bg-green-500/5 opacity-60" : "border-gray-800 hover:border-gray-700"}`}>
                    <div className="p-2 rounded-lg bg-gray-800 shrink-0"><Icon className="w-4 h-4 text-gray-400" /></div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{tmpl.label}</p>
                      <p className="text-xs text-gray-600">{tmpl.desc}</p>
                      <span className="text-[10px] text-gray-700 mt-1 inline-block capitalize">{tmpl.defaultWidth} width</span>
                    </div>
                    {isAdded && <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-1" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
