import { useState, useEffect, useMemo } from "react";
import { Bug, Plus, X, Search, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useToast } from "../components/Toast";
import { api } from "../api/client";
import { SkeletonCard } from "../components/Skeleton";

type IssueSeverity = "critical" | "high" | "medium" | "low";
type IssueStatus = "open" | "in_progress" | "resolved" | "wont_fix";
type IssueCategory = "bug" | "feature" | "performance" | "design" | "content" | "other";

interface CampaignIssue {
  _id: string;
  campaignId: string;
  campaignName: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  category: IssueCategory;
  resolution?: string;
  assignedTo?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface IssueStats {
  total: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
  avgResolutionTime: number;
}

interface Campaign {
  _id: string;
  name: string;
}

const SEVERITY_OPTIONS: { value: IssueSeverity | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const STATUS_OPTIONS: { value: IssueStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "wont_fix", label: "Won't Fix" },
];

const CATEGORY_OPTIONS: { value: IssueCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature" },
  { value: "performance", label: "Performance" },
  { value: "design", label: "Design" },
  { value: "content", label: "Content" },
  { value: "other", label: "Other" },
];

const SEVERITY_BADGES: Record<IssueSeverity, string> = {
  critical: "bg-red-500/20 text-red-400",
  high: "bg-orange-500/20 text-orange-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  low: "bg-gray-500/20 text-gray-400",
};

const STATUS_BADGES: Record<IssueStatus, string> = {
  open: "bg-red-500/20 text-red-400",
  in_progress: "bg-blue-500/20 text-blue-400",
  resolved: "bg-green-500/20 text-green-400",
  wont_fix: "bg-gray-500/20 text-gray-400",
};

const STATUS_LABELS: Record<IssueStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  wont_fix: "Won't Fix",
};

function CreateIssueModal({
  onClose,
  onCreated,
  campaigns,
}: {
  onClose: () => void;
  onCreated: () => void;
  campaigns: Campaign[];
}) {
  const { addToast } = useToast();
  const [form, setForm] = useState({
    campaignId: "",
    campaignName: "",
    title: "",
    description: "",
    severity: "medium" as IssueSeverity,
    category: "bug" as IssueCategory,
  });

  function handleCampaignChange(id: string) {
    const c = campaigns.find((x) => x._id === id);
    setForm({ ...form, campaignId: id, campaignName: c?.name || "" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.campaignId || !form.title.trim()) {
      addToast("error", "Campaign and title are required");
      return;
    }
    try {
      await api.campaignIssues.create(form);
      addToast("success", "Issue created");
      onCreated();
      onClose();
    } catch {
      addToast("error", "Failed to create issue");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Create Issue</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Campaign</label>
            <select className="input" value={form.campaignId} onChange={(e) => handleCampaignChange(e.target.value)}>
              <option value="">Select campaign...</option>
              {campaigns.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Title</label>
            <input className="input" placeholder="Brief issue title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={3} placeholder="Describe the issue..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Severity</label>
              <select className="input" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as IssueSeverity })}>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as IssueCategory })}>
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
                <option value="performance">Performance</option>
                <option value="design">Design</option>
                <option value="content">Content</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Create Issue</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CampaignIssues() {
  const { addToast } = useToast();

  const [issues, setIssues] = useState<CampaignIssue[]>([]);
  const [stats, setStats] = useState<IssueStats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterCampaign, setFilterCampaign] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState<IssueSeverity | "all">("all");
  const [filterStatus, setFilterStatus] = useState<IssueStatus | "all">("all");
  const [filterCategory, setFilterCategory] = useState<IssueCategory | "all">("all");

  const [expanded, setExpanded] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    Promise.all([loadIssues(), loadStats(), loadCampaigns()]);
  }, []);

  async function loadIssues() {
    try {
      const data = await api.campaignIssues.list();
      setIssues(data || []);
    } catch {
      addToast("error", "Failed to load issues");
    }
  }

  async function loadStats() {
    try {
      const s = await api.campaignIssues.stats();
      setStats(s);
    } catch {}
  }

  async function loadCampaigns() {
    try {
      const data: any = await api.campaigns.list();
      setCampaigns(Array.isArray(data) ? data : data?.campaigns || data?.data || []);
    } catch {}
    setLoading(false);
  }

  async function handleUpdateStatus(id: string, status: IssueStatus, resolution?: string) {
    setUpdatingId(id);
    try {
      const payload: Record<string, unknown> = { status };
      if (resolution) payload.resolution = resolution;
      await api.campaignIssues.update(id, payload);
      setIssues((prev) => prev.map((i) => (i._id === id ? { ...i, status, resolution: resolution || i.resolution } : i)));
      await loadStats();
      addToast("success", `Issue ${STATUS_LABELS[status].toLowerCase()}`);
    } catch {
      addToast("error", "Failed to update issue");
    }
    setUpdatingId(null);
    setResolutionText("");
  }

  async function handleDelete(id: string) {
    try {
      await api.campaignIssues.delete(id);
      setIssues((prev) => prev.filter((i) => i._id !== id));
      await loadStats();
      addToast("success", "Issue deleted");
    } catch {
      addToast("error", "Failed to delete issue");
    }
  }

  const filtered = useMemo(() => {
    return issues.filter((i) => {
      if (filterCampaign !== "all" && i.campaignId !== filterCampaign) return false;
      if (filterSeverity !== "all" && i.severity !== filterSeverity) return false;
      if (filterStatus !== "all" && i.status !== filterStatus) return false;
      if (filterCategory !== "all" && i.category !== filterCategory) return false;
      if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !i.campaignName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [issues, filterCampaign, filterSeverity, filterStatus, filterCategory, search]);

  const openCount = stats?.byStatus?.open ?? issues.filter((i) => i.status === "open").length;
  const inProgressCount = stats?.byStatus?.in_progress ?? issues.filter((i) => i.status === "in_progress").length;
  const resolvedCount = stats?.byStatus?.resolved ?? issues.filter((i) => i.status === "resolved").length;
  const totalCount = stats?.total ?? issues.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Bug className="w-6 h-6 text-n0va-400" />
            Campaign Issues
          </h1>
          <p className="text-gray-400 mt-1">{totalCount} total &middot; {openCount} open &middot; {inProgressCount} in progress &middot; {resolvedCount} resolved</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> New Issue</button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500">Total Issues</p>
          <p className="text-xl font-bold text-white mt-1">{loading ? "-" : totalCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500">Open</p>
          <p className="text-xl font-bold text-red-400 mt-1">{loading ? "-" : openCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500">In Progress</p>
          <p className="text-xl font-bold text-yellow-400 mt-1">{loading ? "-" : inProgressCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500">Resolved</p>
          <p className="text-xl font-bold text-green-400 mt-1">{loading ? "-" : resolvedCount}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input className="input pl-10 pr-4 py-2 text-sm w-full" placeholder="Search issues..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input py-2 text-sm w-auto" value={filterCampaign} onChange={(e) => setFilterCampaign(e.target.value)}>
          <option value="all">All Campaigns</option>
          {campaigns.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 ml-2">Severity:</div>
        {SEVERITY_OPTIONS.map((s) => (
          <button
            key={s.value}
            className={`text-xs px-2.5 py-1 rounded-lg border ${filterSeverity === s.value ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500 hover:border-gray-600"}`}
            onClick={() => setFilterSeverity(s.value as IssueSeverity | "all")}
          >
            {s.label}
          </button>
        ))}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 ml-2">Status:</div>
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s.value}
            className={`text-xs px-2.5 py-1 rounded-lg border ${filterStatus === s.value ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500 hover:border-gray-600"}`}
            onClick={() => setFilterStatus(s.value as IssueStatus | "all")}
          >
            {s.label}
          </button>
        ))}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 ml-2">Category:</div>
        <select className="input py-2 text-sm w-auto" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as IssueCategory | "all")}>
          {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-4">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <Bug className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No issues found</h3>
          <p className="text-sm text-gray-500">
            {search || filterCampaign !== "all" || filterSeverity !== "all" || filterStatus !== "all" || filterCategory !== "all"
              ? "Try different filters"
              : "No issues reported yet."}
          </p>
          {!search && filterCampaign === "all" && filterSeverity === "all" && filterStatus === "all" && filterCategory === "all" && (
            <button onClick={() => setShowCreate(true)} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Report Issue</button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {filtered.map((issue) => {
          const isExpanded = expanded === issue._id;
          return (
            <div key={issue._id}>
              <div className="card p-4 cursor-pointer hover:bg-gray-800/50 transition-colors" onClick={() => setExpanded(isExpanded ? null : issue._id)}>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">{isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${SEVERITY_BADGES[issue.severity]}`}>{issue.severity}</span>
                      <h3 className="text-sm font-semibold text-white">{issue.title}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_BADGES[issue.status]}`}>{STATUS_LABELS[issue.status]}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-600">
                      <span>{issue.campaignName}</span>
                      <span className="capitalize">{issue.category}</span>
                      <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(issue._id); }}
                    className="p-1.5 text-gray-600 hover:text-red-400 shrink-0"
                    title="Delete issue"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="card p-4 border-t-0 rounded-t-none bg-gray-800/30">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Description</p>
                      <p className="text-sm text-gray-300">{issue.description || "No description provided."}</p>
                    </div>
                    {issue.assignedTo && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Assigned To</p>
                        <p className="text-sm text-gray-300">{issue.assignedTo}</p>
                      </div>
                    )}
                    {issue.resolution && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Resolution</p>
                        <p className="text-sm text-gray-300">{issue.resolution}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-800 flex-wrap">
                      {issue.status === "open" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUpdateStatus(issue._id, "in_progress"); }}
                          disabled={updatingId === issue._id}
                          className="btn-secondary text-xs"
                        >
                          {updatingId === issue._id ? "Updating..." : "Start Progress"}
                        </button>
                      )}
                      {issue.status === "in_progress" && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            className="input py-1.5 text-sm flex-1 min-w-[200px]"
                            placeholder="Add resolution notes..."
                            value={resolutionText}
                            onChange={(e) => setResolutionText(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(issue._id, "resolved", resolutionText || undefined); }}
                            disabled={updatingId === issue._id}
                            className="btn-primary text-xs"
                          >
                            {updatingId === issue._id ? "Resolving..." : "Resolve"}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(issue._id, "wont_fix", resolutionText || undefined); }}
                            disabled={updatingId === issue._id}
                            className="btn-secondary text-xs"
                          >
                            Won't Fix
                          </button>
                        </div>
                      )}
                      {issue.status === "resolved" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUpdateStatus(issue._id, "open"); }}
                          disabled={updatingId === issue._id}
                          className="btn-secondary text-xs"
                        >
                          Reopen
                        </button>
                      )}
                      {issue.status === "wont_fix" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUpdateStatus(issue._id, "open"); }}
                          disabled={updatingId === issue._id}
                          className="btn-secondary text-xs"
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showCreate && (
        <CreateIssueModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { loadIssues(); loadStats(); }}
          campaigns={campaigns}
        />
      )}
    </div>
  );
}
