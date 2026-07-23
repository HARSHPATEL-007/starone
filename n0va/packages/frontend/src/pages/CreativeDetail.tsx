import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";
import { ArrowLeft, Edit3, Palette, Eye, MousePointer, Target, Trash2, RefreshCw, Play, Pause, CheckCircle, XCircle, Image, Video, Film, FileText } from "lucide-react";

export default function CreativeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [creative, setCreative] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editHeadline, setEditHeadline] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editCta, setEditCta] = useState("");

  useEffect(() => { loadData(); }, [id, navigate]);

  async function loadData() {
    if (!id) return;
    setLoading(true);
    try {
      const [found, campaignList] = await Promise.all([
        api.creatives.get(id),
        api.campaigns.list().catch(() => ({ campaigns: [] })),
      ]);
      setCreative(found);
      setEditName(found.name);
      setEditHeadline(found.headline || "");
      setEditBody(found.body || "");
      setEditCta(found.cta || "");
      setCampaigns(campaignList.campaigns || campaignList || []);
    } catch {
      navigate("/creatives");
    } finally {
      setLoading(false);
    }
  }

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function handleSave() {
    if (!creative || !editName.trim()) return;
    try {
      const updated = await api.creatives.update(creative._id || creative.id, { name: editName, headline: editHeadline, body: editBody, cta: editCta });
      setCreative(updated || { ...creative, name: editName, headline: editHeadline, body: editBody, cta: editCta });
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

  async function handleStatus(status: string) {
    if (!creative) return;
    try {
      const updated = await api.creatives.updateStatus(creative._id || creative.id, status);
      setCreative(updated || { ...creative, status });
      addToast("success", `Creative ${status}`);
    } catch {
      addToast("error", "Failed to update status");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-5 w-5 bg-gray-800 rounded animate-pulse" />
          <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      </div>
    );
  }

  if (!creative) {
    return (
      <div className="text-gray-400 text-center py-12">
        <p className="mb-4">Creative not found</p>
        <button className="btn-secondary flex items-center gap-2 mx-auto" onClick={loadData}>
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
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
  const creativeId = creative._id || creative.id;

  const linkedCampaigns = Array.isArray(campaigns) ? campaigns.filter((c: any) =>
    c.creatives?.some((cr: any) => (cr._id || cr) === creativeId)
  ) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/creatives")} className="text-gray-500 hover:text-white">
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
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{creative.name}</h1>
                <button onClick={() => setEditing(true)} className="text-gray-500 hover:text-n0va-400">
                  <Edit3 className="w-4 h-4" />
                </button>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[creative.status] || "text-gray-400 bg-gray-500/10"}`}>
                  {creative.status}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500 capitalize">{creative.type}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {creative.status === "draft" && (
            <button className="btn-secondary flex items-center gap-1.5 text-sm" onClick={() => handleStatus("pending_approval")}>
              <CheckCircle className="w-4 h-4" /> Submit
            </button>
          )}
          {creative.status === "pending_approval" && (
            <>
              <button className="btn-primary flex items-center gap-1.5 text-sm" onClick={() => handleStatus("approved")}>
                <CheckCircle className="w-4 h-4" /> Approve
              </button>
              <button className="btn-danger flex items-center gap-1.5 text-sm" onClick={() => handleStatus("rejected")}>
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </>
          )}
          {creative.status === "approved" && (
            <button className="btn-primary flex items-center gap-1.5 text-sm" onClick={() => handleStatus("active")}>
              <Play className="w-4 h-4" /> Activate
            </button>
          )}
          {creative.status === "active" && (
            <button className="btn-secondary flex items-center gap-1.5 text-sm" onClick={() => handleStatus("paused")}>
              <Pause className="w-4 h-4" /> Pause
            </button>
          )}
          {(creative.status === "paused" || creative.status === "rejected") && (
            <button className="btn-primary flex items-center gap-1.5 text-sm" onClick={() => handleStatus("active")}>
              <Play className="w-4 h-4" /> Activate
            </button>
          )}
          <button className="text-red-400 hover:text-red-300 flex items-center gap-1.5 text-sm" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
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

      {editing && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Edit Content</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Headline</label>
              <input className="input" value={editHeadline} onChange={(e) => setEditHeadline(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Body</label>
              <textarea className="input" rows={3} value={editBody} onChange={(e) => setEditBody(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">CTA</label>
              <input className="input" value={editCta} onChange={(e) => setEditCta(e.target.value)} />
            </div>
          </div>
        </div>
      )}

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

        <div className="space-y-3">
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

          {(creative.type === "image" || creative.type === "video" || creative.type === "carousel") && (
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Preview</h3>
              <div className="h-48 bg-gray-800 rounded-lg flex items-center justify-center">
                {creative.type === "image" && (
                  <div className="text-center text-gray-500">
                    <Image className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                    <p className="text-sm">{creative.assetUrl ? "Image asset" : "No image uploaded"}</p>
                  </div>
                )}
                {creative.type === "video" && (
                  <div className="text-center text-gray-500">
                    <Video className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                    <p className="text-sm">{creative.assetUrl ? "Video asset" : "No video uploaded"}</p>
                  </div>
                )}
                {creative.type === "carousel" && (
                  <div className="text-center text-gray-500">
                    <Film className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                    <p className="text-sm">Carousel preview not available</p>
                  </div>
                )}
              </div>
              {creative.assetUrl && (
                <p className="text-xs text-gray-500 mt-2 truncate">URL: {creative.assetUrl}</p>
              )}
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
