import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Megaphone, Copy, CheckSquare, Square, Download, ChevronLeft, ChevronRight, X, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { useCsvExport } from "../hooks/useCsvExport";
import { SkeletonRow } from "../components/Skeleton";

const STATUS_OPTIONS = ["all", "active", "paused", "draft", "archived"];
const TYPE_OPTIONS = ["all", "performance", "brand", "retargeting", "prospecting"];
const PLATFORM_OPTIONS = ["all", "meta", "google", "linkedin", "tiktok", "snapchat"];
const PAGE_SIZES = [10, 20, 50];

export default function Campaigns() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { exportToCsv } = useCsvExport();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", type: "performance", daily: "100", lifetime: "3000", platforms: ["meta", "google"] as string[], goal: "" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(pageSize));
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (typeFilter !== "all") params.set("type", typeFilter);
    return params.toString();
  }, [page, pageSize, search, statusFilter, typeFilter]);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.campaigns.list(buildParams());
      setCampaigns(res.campaigns || []);
      setTotal(res.total || 0);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  function resetFilters() {
    setSearch(""); setStatusFilter("all"); setTypeFilter("all"); setPlatformFilter("all"); setPage(1);
  }

  function hasActiveFilters() {
    return statusFilter !== "all" || typeFilter !== "all" || platformFilter !== "all" || search !== "";
  }

  const totalPages = Math.ceil(total / pageSize);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.campaigns.create({
        name: form.name,
        type: form.type,
        budget: { daily: parseFloat(form.daily), lifetime: parseFloat(form.lifetime), currency: "USD" },
        platforms: form.platforms,
        goal: form.goal,
      });
      setShowCreate(false); setForm({ name: "", type: "performance", daily: "100", lifetime: "3000", platforms: ["meta", "google"], goal: "" });
      addToast("success", "Campaign created"); loadCampaigns();
    } catch { addToast("error", "Failed to create campaign"); }
  }

  async function handleStatus(id: string, status: string) {
    try { await api.campaigns.updateStatus(id, status); addToast("success", `Campaign ${status}`); loadCampaigns(); } catch { addToast("error", `Failed to ${status} campaign`); }
  }

  async function handleClone(id: string) {
    try {
      await fetch(`/api/v1/campaigns/${id}/clone`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + btoa(JSON.stringify({ userId: "user_001", tenantId: "tenant_001", role: "admin" })), "x-tenant-id": "tenant_001" } });
      addToast("success", "Campaign duplicated"); loadCampaigns();
    } catch { addToast("error", "Failed to clone campaign"); }
  }

  async function handleBulkStatus() {
    if (!bulkStatus || selected.size === 0) return;
    try { await Promise.all(Array.from(selected).map((id) => api.campaigns.updateStatus(id, bulkStatus))); addToast("success", `${selected.size} campaigns ${bulkStatus}`); setSelected(new Set()); setBulkStatus(""); loadCampaigns(); } catch { addToast("error", "Bulk update failed"); }
  }

  function toggleSelect(id: string) { setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }); }
  function toggleAll() { setSelected(new Set(selected.size === campaigns.length ? [] : campaigns.map((c) => c._id))); }

  function handleExport() {
    if (campaigns.length === 0) return;
    const data = campaigns.map((c: any) => ({ Name: c.name, Type: c.type, Status: c.status, "Daily Budget": c.budget?.daily || 0, "Lifetime Budget": c.budget?.lifetime || 0, Spent: c.budget?.spent || 0, Remaining: c.budget?.remaining || 0, Platforms: (c.platforms || []).join("; "), Goal: c.goal || "" }));
    exportToCsv(data, "campaigns_export"); addToast("success", "Campaigns exported to CSV");
  }

  const statusBadge: Record<string, string> = { draft: "badge-draft", active: "badge-active", paused: "badge-paused", archived: "badge-archived" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Campaigns</h1>
          <p className="text-gray-500 mt-1">Manage your ad campaigns across all platforms</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary flex items-center gap-2" onClick={handleExport} disabled={campaigns.length === 0}><Download className="w-4 h-4" /> Export</button>
          <Link to="/campaigns/new" className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> New Campaign</Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input className="input pl-10" placeholder="Search campaigns..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} onKeyDown={(e) => e.key === "Enter" && loadCampaigns()} />
          {search && <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white" onClick={() => { setSearch(""); setPage(1); }}><X className="w-4 h-4" /></button>}
        </div>
        <select className="select w-auto text-xs" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s === "all" ? "All Status" : s}</option>)}
        </select>
        <select className="select w-auto text-xs" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
          {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t === "all" ? "All Types" : t}</option>)}
        </select>
        <select className="select w-auto text-xs" value={platformFilter} onChange={(e) => { setPlatformFilter(e.target.value); setPage(1); }}>
          {PLATFORM_OPTIONS.map((p) => <option key={p} value={p}>{p === "all" ? "All Platforms" : p}</option>)}
        </select>
        {hasActiveFilters() && <button className="btn-secondary text-xs py-1.5 flex items-center gap-1" onClick={resetFilters}><SlidersHorizontal className="w-3 h-3" /> Clear</button>}
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-n0va-600/10 border border-n0va-600/30 rounded-lg">
          <span className="text-sm text-gray-300">{selected.size} selected</span>
          <select className="select text-xs py-1" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
            <option value="">Action...</option>
            <option value="active">Activate</option>
            <option value="paused">Pause</option>
            <option value="archived">Archive</option>
          </select>
          <button className="btn-primary text-xs py-1.5" onClick={handleBulkStatus} disabled={!bulkStatus}>Apply</button>
          <button className="btn-secondary text-xs py-1.5" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}</div>
      ) : campaigns.length === 0 ? (
        <div className="card text-center py-12">
          <Megaphone className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">{hasActiveFilters() ? "No campaigns match your filters." : "No campaigns yet. Create your first campaign."}</p>
          {hasActiveFilters() && <button className="btn-secondary text-sm mt-3" onClick={resetFilters}>Clear Filters</button>}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-4 py-2 text-xs text-gray-500 border-b border-gray-800">
            <button onClick={toggleAll} className="hover:text-white">{selected.size === campaigns.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}</button>
            <span className="flex-1">Campaign</span>
            <span className="w-20 text-right">Budget</span>
            <span className="w-20 text-right">Spent</span>
          </div>
          {campaigns.map((campaign) => (
            <div key={campaign._id} className={`card hover:border-gray-700 transition-colors ${selected.has(campaign._id) ? "border-n0va-600/40" : ""}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button onClick={() => toggleSelect(campaign._id)} className="mt-1 text-gray-500 hover:text-white shrink-0">
                    {selected.has(campaign._id) ? <CheckSquare className="w-4 h-4 text-n0va-400" /> : <Square className="w-4 h-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Link to={`/campaigns/${campaign._id}`} className="text-white font-semibold hover:text-n0va-400 truncate">{campaign.name}</Link>
                      <span className={statusBadge[campaign.status] || "badge-draft shrink-0"}>{campaign.status}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                      <span>{campaign.type}</span>
                      <span>${campaign.budget.daily}/day</span>
                      <span>{campaign.platforms?.length || 0} platforms</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <button className="btn-secondary text-xs py-1.5 flex items-center gap-1" onClick={() => handleClone(campaign._id)} title="Clone"><Copy className="w-3 h-3" /></button>
                  {campaign.status === "draft" && <button className="btn-primary text-xs py-1.5" onClick={() => handleStatus(campaign._id, "active")}>Launch</button>}
                  {campaign.status === "active" && <button className="btn-secondary text-xs py-1.5" onClick={() => handleStatus(campaign._id, "paused")}>Pause</button>}
                  {campaign.status === "paused" && <button className="btn-primary text-xs py-1.5" onClick={() => handleStatus(campaign._id, "active")}>Resume</button>}
                  {campaign.status !== "archived" && <button className="btn-secondary text-xs py-1.5" onClick={() => handleStatus(campaign._id, "archived")}>Archive</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Rows per page:</span>
            {PAGE_SIZES.map((s) => (
              <button key={s} className={`px-2 py-0.5 rounded text-xs ${pageSize === s ? "bg-n0va-600/20 text-n0va-400" : "hover:text-gray-300"}`} onClick={() => { setPageSize(s); setPage(1); }}>{s}</button>
            ))}
            <span className="ml-2">{total} total</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <button className="btn-secondary p-1 disabled:opacity-30" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="w-4 h-4" /></button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let p: number;
                if (totalPages <= 5) p = i + 1;
                else if (page <= 3) p = i + 1;
                else if (page >= totalPages - 2) p = totalPages - 4 + i;
                else p = page - 2 + i;
                return <button key={p} className={`w-8 h-8 rounded-lg text-xs font-medium ${p === page ? "bg-n0va-600/20 text-n0va-400 border border-n0va-600/40" : "hover:text-gray-300"}`} onClick={() => setPage(p)}>{p}</button>;
              })}
              {totalPages > 5 && page < totalPages - 2 && <span className="px-1">...</span>}
              {totalPages > 5 && page < totalPages - 2 && <button className="w-8 h-8 rounded-lg text-xs hover:text-gray-300" onClick={() => setPage(totalPages)}>{totalPages}</button>}
            </div>
            <button className="btn-secondary p-1 disabled:opacity-30" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
