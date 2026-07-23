import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { api } from "../api/client";
import { ArrowLeft, Edit3, Users, BarChart3, Globe, Activity, Trash2 } from "lucide-react";

export default function AudienceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [audience, setAudience] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.audiences.list().then((list) => {
        const found = Array.isArray(list) ? list.find((a: any) => a._id === id || a.id === id) : null;
        if (!found) throw new Error("Audience not found");
        setAudience(found);
        setEditName(found.name);
        return found;
      }),
      api.analytics.overview("30"),
    ])
      .then(([aud, analyticsData]) => {
        setAnalytics(analyticsData);
      })
      .catch(() => navigate("/audiences"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  async function handleSave() {
    if (!audience || !editName.trim()) return;
    try {
      const updated = await api.audiences.update(audience._id || audience.id, { name: editName });
      setAudience(updated || { ...audience, name: editName });
      setEditing(false);
    } catch { /* ignore */ }
  }

  async function handleDelete() {
    if (!audience || !window.confirm("Delete this audience?")) return;
    try {
      await api.audiences.delete(audience._id || audience.id);
      navigate("/audiences");
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-n0va-500 border-t-transparent rounded-full" />
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
    { label: "Revenue", value: `$${(perf.revenue || 0).toLocaleString()}`, icon: Globe },
    { label: "ROAS", value: `${(perf.roas || 0).toFixed(2)}x`, icon: BarChart3 },
  ];

  const sourceData = [
    { name: "Direct", value: 35 },
    { name: "Social", value: 28 },
    { name: "Email", value: 20 },
    { name: "Referral", value: 12 },
    { name: "Paid", value: 5 },
  ];

  const SOURCE_COLORS = ["#8b5cf6", "#1a6dff", "#10b981", "#f59e0b", "#ec4899"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/audiences")} className="text-gray-500 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1 text-white text-lg font-bold"
                  autoFocus
                />
                <button className="btn-secondary text-sm" onClick={handleSave}>Save</button>
                <button className="text-gray-500 text-sm" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{audience.name}</h1>
                <button onClick={() => setEditing(true)} className="text-gray-500 hover:text-n0va-400">
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            )}
            <p className="text-gray-500 mt-1">{audience.description || audience.type || "Custom audience"}</p>
          </div>
        </div>
        <button className="text-red-400 hover:text-red-300 flex items-center gap-1.5 text-sm" onClick={handleDelete}>
          <Trash2 className="w-4 h-4" /> Delete
        </button>
      </div>

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
          <h3 className="text-lg font-semibold text-white mb-4">Audience Breakdown by Source</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sourceData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                  {sourceData.map((_entry, i) => (
                    <Cell key={i} fill={SOURCE_COLORS[i]} />
                  ))}
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
