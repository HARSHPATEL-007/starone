import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Megaphone, Copy, CheckSquare, Square, Download, BarChart3 } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { useCsvExport } from "../hooks/useCsvExport";
import { SkeletonRow } from "../components/Skeleton";

export default function Campaigns() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { exportToCsv } = useCsvExport();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", type: "performance", daily: "100", lifetime: "3000", platforms: ["meta", "google"] as string[], goal: "" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [showCreateWizard, setShowCreateWizard] = useState(false);

  useEffect(() => { loadCampaigns(); }, []);

  async function loadCampaigns() {
    setLoading(true);
    try {
      const res = await api.campaigns.list(search ? `search=${search}` : "");
      setCampaigns(res.campaigns || []);
    } finally {
      setLoading(false);
    }
  }

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
      setShowCreate(false);
      setForm({ name: "", type: "performance", daily: "100", lifetime: "3000", platforms: ["meta", "google"], goal: "" });
      addToast("success", "Campaign created");
      loadCampaigns();
    } catch {
      addToast("error", "Failed to create campaign");
    }
  }

  async function handleStatus(id: string, status: string) {
    try {
      await api.campaigns.updateStatus(id, status);
      addToast("success", `Campaign ${status}`);
      loadCampaigns();
    } catch {
      addToast("error", `Failed to ${status} campaign`);
    }
  }

  async function handleClone(id: string) {
    try {
      await fetch(`/api/v1/campaigns/${id}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + btoa(JSON.stringify({ userId: "user_001", tenantId: "tenant_001", role: "admin" })), "x-tenant-id": "tenant_001" },
      });
      addToast("success", "Campaign duplicated");
      loadCampaigns();
    } catch {
      addToast("error", "Failed to clone campaign");
    }
  }

  async function handleBulkStatus() {
    if (!bulkStatus || selected.size === 0) return;
    try {
      await Promise.all(Array.from(selected).map((id) => api.campaigns.updateStatus(id, bulkStatus)));
      addToast("success", `${selected.size} campaigns ${bulkStatus}`);
      setSelected(new Set());
      setBulkStatus("");
      loadCampaigns();
    } catch {
      addToast("error", "Bulk update failed");
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === campaigns.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(campaigns.map((c) => c._id)));
    }
  }

  function handleExport() {
    if (campaigns.length === 0) return;
    const data = campaigns.map((c: any) => ({
      Name: c.name,
      Type: c.type,
      Status: c.status,
      "Daily Budget": c.budget?.daily || 0,
      "Lifetime Budget": c.budget?.lifetime || 0,
      Spent: c.budget?.spent || 0,
      Remaining: c.budget?.remaining || 0,
      Platforms: (c.platforms || []).join("; "),
      Goal: c.goal || "",
    }));
    exportToCsv(data, "campaigns_export");
    addToast("success", "Campaigns exported to CSV");
  }

  const statusBadge: Record<string, string> = {
    draft: "badge-draft",
    active: "badge-active",
    paused: "badge-paused",
    archived: "badge-archived",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Campaigns</h1>
          <p className="text-gray-500 mt-1">Manage your ad campaigns across all platforms</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary flex items-center gap-2" onClick={handleExport} disabled={campaigns.length === 0}>
            <Download className="w-4 h-4" /> Export
          </button>
          <Link to="/campaigns/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Campaign
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input className="input pl-10" placeholder="Search campaigns..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadCampaigns()} />
        </div>
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
          <p className="text-gray-400">No campaigns yet. Create your first campaign.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-4 py-2 text-xs text-gray-500 border-b border-gray-800">
            <button onClick={toggleAll} className="hover:text-white">
              {selected.size === campaigns.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            </button>
            <span className="flex-1">Campaign</span>
            <span className="w-20 text-right">Budget</span>
            <span className="w-20 text-right">Spent</span>
          </div>
          {campaigns.map((campaign) => (
            <div key={campaign._id} className={`card hover:border-gray-700 transition-colors ${selected.has(campaign._id) ? "border-n0va-600/40" : ""}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <button onClick={() => toggleSelect(campaign._id)} className="mt-1 text-gray-500 hover:text-white">
                    {selected.has(campaign._id) ? <CheckSquare className="w-4 h-4 text-n0va-400" /> : <Square className="w-4 h-4" />}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Link to={`/campaigns/${campaign._id}`} className="text-white font-semibold hover:text-n0va-400">{campaign.name}</Link>
                      <span className={statusBadge[campaign.status] || "badge-draft"}>{campaign.status}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{campaign.type}</span>
                      <span>${campaign.budget.daily}/day</span>
                      <span>{campaign.platforms?.length || 0} platforms</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn-secondary text-xs py-1.5 flex items-center gap-1" onClick={() => handleClone(campaign._id)} title="Clone">
                    <Copy className="w-3 h-3" /> Clone
                  </button>
                  {campaign.status === "draft" && <button className="btn-primary text-xs py-1.5" onClick={() => handleStatus(campaign._id, "active")}>Launch</button>}
                  {campaign.status === "active" && <button className="btn-secondary text-xs py-1.5" onClick={() => handleStatus(campaign._id, "paused")}>Pause</button>}
                  {campaign.status === "paused" && <button className="btn-primary text-xs py-1.5" onClick={() => handleStatus(campaign._id, "active")}>Resume</button>}
                  <button className="btn-secondary text-xs py-1.5" onClick={() => handleStatus(campaign._id, "archived")}>Archive</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
