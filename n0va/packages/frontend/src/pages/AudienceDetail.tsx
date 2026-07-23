import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { api } from "../api/client";
import { ArrowLeft, Edit3, Users, BarChart3, Globe, Activity, Trash2, RefreshCw, Play, Pause, Target, DollarSign } from "lucide-react";
import { useToast } from "../components/Toast";

export default function AudienceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [audience, setAudience] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function loadData(isRefresh = false) {
    if (!id) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const found = await api.audiences.get(id);
      setAudience(found);
      setEditName(found.name);
      setEditDescription(found.description || "");
      const campaignList = await api.campaigns.list();
      setCampaigns(campaignList.campaigns || campaignList || []);
    } catch {
      navigate("/audiences");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadData(); }, [id, navigate]);

  async function handleSave() {
    if (!audience || !editName.trim()) return;
    try {
      const updated = await api.audiences.update(audience._id || audience.id, { name: editName, description: editDescription });
      setAudience(updated || { ...audience, name: editName, description: editDescription });
      setEditing(false);
      addToast("success", "Audience updated");
    } catch {
      addToast("error", "Failed to save audience");
    }
  }

  async function handleDelete() {
    if (!audience) return;
    try {
      await api.audiences.delete(audience._id || audience.id);
      addToast("success", "Audience deleted");
      navigate("/audiences");
    } catch {
      addToast("error", "Failed to delete audience");
    }
    setShowDeleteConfirm(false);
  }

  async function handleStatus(status: string) {
    if (!audience) return;
    try {
      const updated = await api.audiences.update(audience._id || audience.id, { status });
      setAudience(updated || { ...audience, status });
      addToast("success", `Audience ${status}`);
    } catch {
      addToast("error", "Failed to update status");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-5 h-5 bg-gray-800 rounded" />
          <div><div className="w-48 h-7 bg-gray-800 rounded" /><div className="w-32 h-4 bg-gray-800 rounded mt-2" /></div>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-4 text-center">
              <div className="w-4 h-4 bg-gray-800 rounded mx-auto mb-2" />
              <div className="w-16 h-6 bg-gray-800 rounded mx-auto mb-1" />
              <div className="w-10 h-3 bg-gray-800 rounded mx-auto" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6"><div className="w-36 h-5 bg-gray-800 rounded mb-4" /><div className="h-64 bg-gray-800 rounded" /></div>
          <div className="card p-6"><div className="w-36 h-5 bg-gray-800 rounded mb-4" /><div className="h-64 bg-gray-800 rounded" /></div>
        </div>
      </div>
    );
  }

  if (!audience) {
    return <div className="text-gray-400 text-center py-12">Audience not found</div>;
  }

  const perf = audience.performance || { impressions: 0, conversions: 0, spend: 0, revenue: 0, roas: 0 };
  const metrics = [
    { label: "Size", value: (audience.size || 0).toLocaleString(), icon: Users },
    { label: "Impressions", value: (perf.impressions || 0).toLocaleString(), icon: BarChart3 },
    { label: "Conversions", value: (perf.conversions || 0).toLocaleString(), icon: Activity },
    { label: "Spend", value: `$${(perf.spend || 0).toLocaleString()}`, icon: Globe },
    { label: "Revenue", value: `$${(perf.revenue || 0).toLocaleString()}`, icon: DollarSign },
    { label: "ROAS", value: `${(perf.roas || 0).toFixed(2)}x`, icon: BarChart3 },
  ];

  const total = Math.max(1, (perf.spend || 0) + (perf.revenue || 0) + (perf.impressions || 0) / 100);
  const sourceData = [
    { name: "Spend", value: Math.round(((perf.spend || 0) / total) * 100) },
    { name: "Revenue", value: Math.round(((perf.revenue || 0) / total) * 100) },
    { name: "Impressions", value: Math.max(1, Math.round(((perf.impressions || 0) / 100 / total) * 100)) },
    { name: "Conversions", value: Math.max(1, Math.round(((perf.conversions || 0) * 10 / total) * 100)) },
  ];

  const SOURCE_COLORS = ["#8b5cf6", "#1a6dff", "#10b981", "#f59e0b"];

  const audienceId = audience._id || audience.id;

  const linkedCampaigns = Array.isArray(campaigns) ? campaigns.filter((c: any) =>
    c.audiences?.some((a: any) => (a._id || a) === audienceId)
  ) : [];

  const criteriaKeys = audience.criteria ? Object.keys(audience.criteria).filter((k) => audience.criteria[k]) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/audiences")} className="text-gray-500 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            {editing ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1 text-white text-lg font-bold" autoFocus />
                  <button className="btn-secondary text-sm" onClick={handleSave}>Save</button>
                  <button className="text-gray-500 text-sm" onClick={() => setEditing(false)}>Cancel</button>
                </div>
                <input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1 text-white text-sm" placeholder="Description" />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{audience.name}</h1>
                <button onClick={() => setEditing(true)} className="text-gray-500 hover:text-n0va-400">
                  <Edit3 className="w-4 h-4" />
                </button>
                <span className={`badge ${audience.status === "active" ? "badge-active" : audience.status === "paused" ? "badge-paused" : "badge-draft"}`}>
                  {audience.status || "active"}
                </span>
              </div>
            )}
            <p className="text-gray-500 mt-1">{audience.description || audience.type || "Custom audience"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(audience.status === "active") ? (
            <button className="btn-secondary flex items-center gap-1.5 text-sm" onClick={() => handleStatus("paused")}>
              <Pause className="w-4 h-4" /> Pause
            </button>
          ) : (
            <button className="btn-primary flex items-center gap-1.5 text-sm" onClick={() => handleStatus("active")}>
              <Play className="w-4 h-4" /> Activate
            </button>
          )}
          <button className="btn-secondary p-2" onClick={() => loadData(true)} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button className="text-red-400 hover:text-red-300 flex items-center gap-1.5 text-sm" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowDeleteConfirm(false)}>
          <div className="w-full max-w-sm bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Delete Audience</h3>
            <p className="text-sm text-gray-400 mb-4">Are you sure you want to delete this audience?</p>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="card text-center">
            <m.icon className="w-4 h-4 text-n0va-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{m.value}</p>
            <p className="text-xs text-gray-500">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Audience Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sourceData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                  {sourceData.map((_entry, i) => (<Cell key={i} fill={SOURCE_COLORS[i]} />))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {sourceData.map((s, i) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SOURCE_COLORS[i] }} />
                <span className="text-xs text-gray-400">{s.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Performance Metrics</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: "Impressions", value: (perf.impressions || 0) / 1000 },
                { name: "Conversions", value: (perf.conversions || 0) },
                { name: "Revenue", value: (perf.revenue || 0) / 100 },
                { name: "Spend", value: (perf.spend || 0) / 100 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Audience Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <DetailField label="Type" value={audience.type || audience.source || "custom"} />
            <DetailField label="Source" value={audience.source || "platform"} />
            <DetailField label="Size" value={(audience.size || 0).toLocaleString()} />
            <DetailField label="Status" value={audience.status || "active"} />
            <DetailField label="Platform" value={audience.platform || "cross-platform"} />
            <DetailField label="Created" value={audience.createdAt ? new Date(audience.createdAt).toLocaleDateString() : "N/A"} />
          </div>
          {audience.tags && audience.tags.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {audience.tags.map((tag: string) => (
                  <span key={tag} className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded text-xs">{tag}</span>
                ))}
              </div>
            </div>
          )}
          {criteriaKeys.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-800">
              <p className="text-sm text-gray-500 mb-2">Criteria</p>
              <div className="grid grid-cols-2 gap-2">
                {criteriaKeys.map((key) => (
                  <div key={key} className="bg-gray-800/50 rounded-lg p-2">
                    <p className="text-xs text-gray-500 capitalize">{key.replace(/_/g, " ")}</p>
                    <p className="text-sm text-white">{typeof audience.criteria[key] === "object" ? JSON.stringify(audience.criteria[key]) : String(audience.criteria[key])}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Linked Campaigns</h3>
            <Link to="/campaigns" className="text-sm text-n0va-400 hover:text-n0va-300">View All</Link>
          </div>
          {linkedCampaigns.length > 0 ? (
            <div className="space-y-2">
              {linkedCampaigns.map((c: any) => (
                <Link key={c._id} to={`/campaigns/${c._id}`} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <Target className="w-4 h-4 text-n0va-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">{c.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{c.status} · {c.type}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">${c.budget?.daily || 0}/day</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Target className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="text-sm">Not used in any campaigns yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm text-white font-medium capitalize">{value}</p>
    </div>
  );
}
