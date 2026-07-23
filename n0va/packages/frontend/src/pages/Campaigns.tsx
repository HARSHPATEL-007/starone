import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Megaphone } from "lucide-react";
import { api } from "../api/client";

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", type: "performance", daily: "100", lifetime: "3000", platforms: ["meta", "google"] as string[], goal: "" });

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
    await api.campaigns.create({
      name: form.name,
      type: form.type,
      budget: { daily: parseFloat(form.daily), lifetime: parseFloat(form.lifetime), currency: "USD" },
      platforms: form.platforms,
      goal: form.goal,
    });
    setShowCreate(false);
    setForm({ name: "", type: "performance", daily: "100", lifetime: "3000", platforms: ["meta", "google"], goal: "" });
    loadCampaigns();
  }

  async function handleStatus(id: string, status: string) {
    await api.campaigns.updateStatus(id, status);
    loadCampaigns();
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
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            className="input pl-10"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadCampaigns()}
          />
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-lg mx-4">
            <h2 className="text-lg font-semibold text-white mb-4">Create Campaign</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Campaign Name</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Type</label>
                <select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="performance">Performance</option>
                  <option value="brand">Brand</option>
                  <option value="retargeting">Retargeting</option>
                  <option value="prospecting">Prospecting</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Daily Budget ($)</label>
                  <input className="input" type="number" value={form.daily} onChange={(e) => setForm({ ...form, daily: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Lifetime Budget ($)</label>
                  <input className="input" type="number" value={form.lifetime} onChange={(e) => setForm({ ...form, lifetime: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Platforms</label>
                <div className="flex gap-2 flex-wrap">
                  {["meta", "google", "linkedin", "tiktok"].map((p) => (
                    <label key={p} className="flex items-center gap-2 text-sm text-gray-300">
                      <input type="checkbox" checked={form.platforms.includes(p)} onChange={() => setForm({ ...form, platforms: form.platforms.includes(p) ? form.platforms.filter((x) => x !== p) : [...form.platforms, p] })} />
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Goal (optional)</label>
                <input className="input" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder="e.g., Drive Q3 enterprise signups" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Campaign</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-n0va-500 border-t-transparent rounded-full" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="card text-center py-12">
          <Megaphone className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No campaigns yet. Create your first campaign.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <div key={campaign._id} className="card hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Link to={`/campaigns/${campaign._id}`} className="text-white font-semibold hover:text-n0va-400">
                      {campaign.name}
                    </Link>
                    <span className={statusBadge[campaign.status] || "badge-draft"}>{campaign.status}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{campaign.type}</span>
                    <span>${campaign.budget.daily}/day</span>
                    <span>{campaign.platforms?.length || 0} platforms</span>
                    <span>Spent: ${(campaign.budget.spent || 0).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {campaign.status === "draft" && (
                    <button className="btn-primary text-xs py-1.5" onClick={() => handleStatus(campaign._id, "active")}>Launch</button>
                  )}
                  {campaign.status === "active" && (
                    <button className="btn-secondary text-xs py-1.5" onClick={() => handleStatus(campaign._id, "paused")}>Pause</button>
                  )}
                  {campaign.status === "paused" && (
                    <button className="btn-primary text-xs py-1.5" onClick={() => handleStatus(campaign._id, "active")}>Resume</button>
                  )}
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
