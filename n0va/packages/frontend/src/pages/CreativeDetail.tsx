import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { ArrowLeft, Edit3, Palette, Eye, MousePointer, Target, Trash2 } from "lucide-react";

export default function CreativeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [creative, setCreative] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editHeadline, setEditHeadline] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.creatives.get(id)
      .then((found) => {
        setCreative(found);
        setEditName(found.name);
        setEditHeadline(found.headline || "");
      })
      .catch(() => navigate("/creatives"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function handleSave() {
    if (!creative || !editName.trim()) return;
    try {
      const updated = await api.creatives.update(creative._id || creative.id, { name: editName, headline: editHeadline });
      setCreative(updated || { ...creative, name: editName, headline: editHeadline });
      setEditing(false);
    } catch {
      addToast("error", "Failed to save creative");
    }
  }

  async function handleDelete() {
    if (!creative) return;
    try {
      await api.creatives.delete(creative._id || creative.id);
      addToast("success", "Creative deleted");
      navigate("/creatives");
    } catch {
      addToast("error", "Failed to delete creative");
    }
    setShowDeleteConfirm(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-n0va-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!creative) {
    return <div className="text-gray-400 text-center py-12">Creative not found</div>;
  }

  const perf = creative.performance || { impressions: 0, clicks: 0, ctr: 0 };
  const statusColors: Record<string, string> = {
    active: "text-green-400 bg-green-500/10",
    paused: "text-yellow-400 bg-yellow-500/10",
    draft: "text-gray-400 bg-gray-500/10",
    approved: "text-blue-400 bg-blue-500/10",
    rejected: "text-red-400 bg-red-500/10",
    pending_approval: "text-orange-400 bg-orange-500/10",
  };

  const chartData = [
    { name: "Impressions", value: perf.impressions || 0 },
    { name: "Clicks", value: perf.clicks || 0 },
    { name: "CTR %", value: parseFloat(((perf.ctr || 0) * 100).toFixed(2)) || 0 },
  ];

  const platformVariants = creative.platformVariants || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/creatives")} className="text-gray-500 hover:text-white">
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
                <h1 className="text-2xl font-bold text-white">{creative.name}</h1>
                <button onClick={() => setEditing(true)} className="text-gray-500 hover:text-n0va-400">
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[creative.status] || "text-gray-400 bg-gray-500/10"}`}>
                {creative.status}
              </span>
              <span className="text-xs text-gray-500 capitalize">{creative.type}</span>
            </div>
          </div>
        </div>
        <button className="text-red-400 hover:text-red-300 flex items-center gap-1.5 text-sm" onClick={() => setShowDeleteConfirm(true)}>
          <Trash2 className="w-4 h-4" /> Delete
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowDeleteConfirm(false)}>
          <div className="w-full max-w-sm bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Delete Creative</h3>
            <p className="text-sm text-gray-400 mb-4">Are you sure you want to delete this creative?</p>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <Eye className="w-4 h-4 text-n0va-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-white">{perf.impressions?.toLocaleString() || 0}</p>
          <p className="text-xs text-gray-500">Impressions</p>
        </div>
        <div className="card text-center">
          <MousePointer className="w-4 h-4 text-n0va-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-white">{perf.clicks?.toLocaleString() || 0}</p>
          <p className="text-xs text-gray-500">Clicks</p>
        </div>
        <div className="card text-center">
          <Target className="w-4 h-4 text-n0va-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-white">{((perf.ctr || 0) * 100).toFixed(2)}%</p>
          <p className="text-xs text-gray-500">CTR</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Performance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Creative Details</h3>
          <div className="space-y-3">
            <DetailField label="Type" value={creative.type} />
            <DetailField label="Status" value={creative.status} />
            <DetailField label="Format" value={creative.type === "image" ? "Static Image" : creative.type === "video" ? "Video" : creative.type === "carousel" ? "Carousel" : "Text"} />
            {creative.headline && <DetailField label="Headline" value={creative.headline} />}
            {creative.body && <DetailField label="Body" value={creative.body} />}
            {creative.cta && <DetailField label="CTA" value={creative.cta} />}
          </div>
          {creative.tags && creative.tags.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {creative.tags.map((tag: string) => (
                  <span key={tag} className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded text-xs">{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {Object.keys(platformVariants).length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Platform Variants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(platformVariants).map(([platform, variant]: [string, any]) => (
              <div key={platform} className="bg-gray-800 rounded-lg p-3">
                <p className="text-sm text-white font-medium capitalize mb-2">{platform}</p>
                {variant.headline && <p className="text-xs text-gray-400 mb-1"><strong>Headline:</strong> {variant.headline}</p>}
                {variant.body && <p className="text-xs text-gray-400 mb-1"><strong>Body:</strong> {variant.body}</p>}
                {variant.cta && <p className="text-xs text-gray-400"><strong>CTA:</strong> {variant.cta}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm text-white font-medium">{value}</p>
    </div>
  );
}
