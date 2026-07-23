import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Edit3, Trash2, Copy, TrendingUp, DollarSign, Target, BarChart3, Users, Image, Layers, Save, X, ExternalLink, Radio, RefreshCw, Calendar, Clock } from "lucide-react";
import { useCampaignLive } from "../hooks/useSocket";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard, SkeletonChart } from "../components/Skeleton";

type Tab = "overview" | "creatives" | "audiences" | "platforms" | "hypercontext" | "schedule";

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const liveData = useCampaignLive(id);
  const [campaign, setCampaign] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", goal: "", daily: 0, lifetime: 0, startDate: "", endDate: "" });

  const mergedAnalytics = liveData ? {
    ...analytics,
    daily: analytics?.daily?.map((d: any) => {
      if (liveData.date && d.date === liveData.date) return { ...d, ...liveData };
      return d;
    }) || (liveData.date ? [{ ...liveData, date: liveData.date }] : []),
  } : analytics;

  useEffect(() => {
    if (!id) return;
    loadCampaign();
  }, [id]);

  async function loadCampaign() {
    if (!id) return;
    setLoading(true);
    try {
      const [c, a] = await Promise.all([
        api.campaigns.get(id),
        api.analytics.campaign(id).catch(() => null),
      ]);
      setCampaign(c);
      setAnalytics(a);
      setEditForm({ name: c.name || "", goal: c.goal || "", daily: c.budget?.daily || 0, lifetime: c.budget?.lifetime || 0, startDate: c.startDate ? c.startDate.split("T")[0] : "", endDate: c.endDate ? c.endDate.split("T")[0] : "" });
    } catch {
      addToast("error", "Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function handleDelete() {
    if (!id) return;
    try {
      await api.campaigns.delete(id);
      addToast("success", "Campaign deleted");
      navigate("/campaigns");
    } catch {
      addToast("error", "Failed to delete campaign");
    }
    setShowDeleteConfirm(false);
  }

  async function handleStatus(status: string) {
    if (!id) return;
    try {
      await api.campaigns.updateStatus(id, status);
      setCampaign((prev: any) => ({ ...prev, status }));
      addToast("success", `Campaign ${status}`);
    } catch {
      addToast("error", `Failed to update status`);
    }
  }

  async function handleClone() {
    if (!id) return;
    try {
      const cloned = await api.campaigns.clone(id);
      addToast("success", "Campaign cloned");
      navigate(`/campaigns/${cloned._id || cloned.id}`);
    } catch {
      addToast("error", "Failed to clone campaign");
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    try {
      const updated = await api.campaigns.update(id, {
        name: editForm.name,
        goal: editForm.goal,
        startDate: editForm.startDate ? new Date(editForm.startDate).toISOString() : undefined,
        endDate: editForm.endDate ? new Date(editForm.endDate).toISOString() : undefined,
      });
      await api.campaigns.updateBudget(id, { daily: editForm.daily, lifetime: editForm.lifetime });
      setCampaign((prev: any) => ({ ...prev, ...updated, budget: { ...prev.budget, daily: editForm.daily, lifetime: editForm.lifetime } }));
      setShowEdit(false);
      addToast("success", "Campaign updated");
    } catch {
      addToast("error", "Failed to update campaign");
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
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonChart />
        <SkeletonChart />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-gray-400 text-center py-12">
        <p className="mb-4">Campaign not found</p>
        <button className="btn-secondary flex items-center gap-2 mx-auto" onClick={loadCampaign}>
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const liveDaily = mergedAnalytics?.daily || analytics?.daily || [];
  const dailyData = liveDaily.slice(-14).map((d: any) => ({
    ...d,
    date: d.date?.substring(5),
  })) || [];

  const platformData = analytics?.byPlatform || [];

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "creatives", label: "Creatives", icon: Image },
    { id: "audiences", label: "Audiences", icon: Users },
    { id: "schedule", label: "Schedule", icon: Calendar },
    { id: "platforms", label: "Platforms", icon: Layers },
    { id: "hypercontext", label: "Hyper Context", icon: Target },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/campaigns")} className="btn-secondary p-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{campaign.name}</h1>
            <span className={`badge ${campaign.status === "active" ? "badge-active" : campaign.status === "paused" ? "badge-paused" : campaign.status === "draft" ? "badge-draft" : "badge-archived"}`}>
              {campaign.status}
            </span>
          </div>
          <p className="text-gray-500 mt-1 capitalize">{campaign.type} campaign</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary flex items-center gap-2" onClick={handleClone}>
            <Copy className="w-4 h-4" /> Clone
          </button>
          <button className="btn-secondary flex items-center gap-2" onClick={() => { setEditForm({ name: campaign.name, goal: campaign.goal || "", daily: campaign.budget?.daily || 0, lifetime: campaign.budget?.lifetime || 0, startDate: campaign.startDate ? campaign.startDate.split("T")[0] : "", endDate: campaign.endDate ? campaign.endDate.split("T")[0] : "" }); setShowEdit(true); }}>
            <Edit3 className="w-4 h-4" /> Edit
          </button>
          <button className="btn-danger flex items-center gap-2" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowDeleteConfirm(false)}>
          <div className="w-full max-w-sm bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Delete Campaign</h3>
            <p className="text-sm text-gray-400 mb-4">Are you sure you want to delete this campaign? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {campaign.status === "draft" && (
        <div className="card border-yellow-600/30 bg-yellow-900/10">
          <p className="text-yellow-400 text-sm font-medium">This campaign is in draft. Launch it to start serving ads.</p>
          <div className="flex gap-2 mt-2">
            <button className="btn-primary" onClick={() => handleStatus("active")}>Launch Campaign</button>
            <Link to="/campaigns/new" className="btn-secondary">Create New</Link>
          </div>
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-800">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${tab === t.id ? "border-n0va-500 text-n0va-400" : "border-transparent text-gray-500 hover:text-gray-300"}`} onClick={() => setTab(t.id)}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card lg:col-span-2">
              <h3 className="text-lg font-semibold text-white mb-4">Performance</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1a6dff" stopOpacity={0.3} /><stop offset="95%" stopColor="#1a6dff" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={11} />
                    <YAxis stroke="#6b7280" fontSize={11} tickFormatter={(v) => `$${v}`} />
                    <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px", color: "#f3f4f6" }} />
                    <Area type="monotone" dataKey="revenue" stroke="#1a6dff" fill="url(#revGrad)" strokeWidth={2} name="Revenue" />
                    <Area type="monotone" dataKey="spend" stroke="#f59e0b" fill="transparent" strokeWidth={2} name="Spend" strokeDasharray="4 4" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Key Metrics</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-n0va-400" />
                    <span className="text-sm text-gray-400">Revenue</span>
                  </div>
                    <span className="text-white font-bold">${liveDaily.reduce((s: number, d: any) => s + (d.revenue || 0), 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-gray-400">Spend</span>
                  </div>
                    <span className="text-white font-bold">${liveDaily.reduce((s: number, d: any) => s + (d.spend || 0), 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-400">Conversions</span>
                  </div>
                    <span className="text-white font-bold">{liveDaily.reduce((s: number, d: any) => s + (d.conversions || 0), 0)}</span>
                </div>
                <div className="pt-2 border-t border-gray-800 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Total Impressions</span><span className="text-white">{liveDaily.reduce((s: number, d: any) => s + (d.impressions || 0), 0).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Total Clicks</span><span className="text-white">{liveDaily.reduce((s: number, d: any) => s + (d.clicks || 0), 0).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Budget Remaining</span><span className="text-green-400">${(campaign.budget.remaining || 0).toLocaleString()}</span></div>
                </div>
              </div>
            </div>
          </div>

          {platformData.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Platform Breakdown</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={platformData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="platform" stroke="#6b7280" fontSize={11} />
                    <YAxis stroke="#6b7280" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px", color: "#f3f4f6" }} />
                    <Bar dataKey="impressions" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Impressions" />
                    <Bar dataKey="clicks" fill="#10b981" radius={[4, 4, 0, 0]} name="Clicks" />
                    <Bar dataKey="conversions" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Conversions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card lg:col-span-2">
              <h3 className="text-lg font-semibold text-white mb-4">Campaign Details</h3>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-500">Daily Budget</dt>
                  <dd className="text-white font-medium mt-1">${campaign.budget.daily.toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Lifetime Budget</dt>
                  <dd className="text-white font-medium mt-1">${campaign.budget.lifetime.toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Spent</dt>
                  <dd className="text-white font-medium mt-1">${(campaign.budget.spent || 0).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Remaining</dt>
                  <dd className="text-green-400 font-medium mt-1">${(campaign.budget.remaining || 0).toLocaleString()}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-gray-500">Platforms</dt>
                  <dd className="flex gap-2 mt-1">
                    {campaign.platforms?.map((p: string) => (
                      <Link key={p} to={`/platforms/${p}`} className="badge bg-n0va-600/20 text-n0va-400 border border-n0va-600/30 hover:bg-n0va-600/30 flex items-center gap-1">
                        {p} <ExternalLink className="w-3 h-3" />
                      </Link>
                    ))}
                  </dd>
                </div>
                {campaign.goal && (
                  <div className="col-span-2">
                    <dt className="text-gray-500">Goal</dt>
                    <dd className="text-white mt-1">{campaign.goal}</dd>
                  </div>
                )}
                {campaign.startDate && (
                  <div className="col-span-2">
                    <dt className="text-gray-500">Schedule</dt>
                    <dd className="text-white mt-1 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-gray-500" />
                      {new Date(campaign.startDate).toLocaleDateString()} → {new Date(campaign.endDate).toLocaleDateString()}
                      <span className="text-xs text-gray-500">
                        ({Math.round((new Date(campaign.endDate).getTime() - new Date(campaign.startDate).getTime()) / 86400000) + 1} days)
                      </span>
                    </dd>
                  </div>
                )}
                {campaign.tags?.length > 0 && (
                  <div className="col-span-2">
                    <dt className="text-gray-500">Tags</dt>
                    <dd className="flex gap-2 mt-1">
                      {campaign.tags.map((t: string) => (
                        <span key={t} className="badge bg-gray-800 text-gray-400 border border-gray-700">{t}</span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>
              <div className="space-y-3">
      {liveData && (
        <div className="card border-green-600/30 bg-green-900/10 flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" /></span>
          <span className="text-green-400 text-sm font-medium">Live data streaming</span>
          <span className="text-xs text-gray-500">Impressions: {liveData.impressions?.toLocaleString() || "—"} · Clicks: {liveData.clicks?.toLocaleString() || "—"} · Spend: ${liveData.spend?.toLocaleString() || "—"}</span>
        </div>
      )}

      {campaign.status === "draft" && (
                  <button className="btn-primary w-full" onClick={() => handleStatus("active")}>Launch Campaign</button>
                )}
                {campaign.status === "active" && (
                  <button className="btn-secondary w-full" onClick={() => handleStatus("paused")}>Pause Campaign</button>
                )}
                {campaign.status === "paused" && (
                  <button className="btn-primary w-full" onClick={() => handleStatus("active")}>Resume Campaign</button>
                )}
                {campaign.status !== "archived" && (
                  <button className="btn-secondary w-full" onClick={() => handleStatus("archived")}>Archive Campaign</button>
                )}
              </div>
              <div className="mt-6 pt-4 border-t border-gray-800">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Budget Pace</h4>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div className="bg-n0va-600 h-2 rounded-full" style={{ width: `${Math.min(100, ((campaign.budget.spent || 0) / campaign.budget.lifetime) * 100)}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-1">{((campaign.budget.spent || 0) / campaign.budget.lifetime * 100).toFixed(1)}% of budget consumed</p>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "creatives" && <CreativesTab campaign={campaign} onUpdate={loadCampaign} />}

      {tab === "audiences" && <AudiencesTab campaign={campaign} onUpdate={loadCampaign} />}

      {tab === "schedule" && <ScheduleTab campaign={campaign} />}

      {tab === "platforms" && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Active Platforms</h3>
            <Link to="/platforms" className="text-sm text-n0va-400 hover:text-n0va-300">All Platforms</Link>
          </div>
          {campaign.platforms?.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {campaign.platforms.map((p: string) => (
                <Link key={p} to={`/platforms/${p}`} className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors">
                  <div className="w-8 h-8 bg-n0va-600/20 rounded-lg flex items-center justify-center text-sm font-bold text-n0va-400">{p.charAt(0).toUpperCase()}</div>
                  <div>
                    <p className="text-sm text-white font-medium capitalize">{p}</p>
                    <p className="text-xs text-gray-500">Connected</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No platforms selected.</p>
          )}
        </div>
      )}

      {tab === "hypercontext" && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Hyper Context Links</h3>
            <Link to="/hyper-context" className="text-sm text-n0va-400 hover:text-n0va-300">Manage All Links</Link>
          </div>
          {campaign.hyperContext ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-500">Tasks</p>
                <p className="text-lg text-white font-bold">{(campaign.hyperContext.linkedTasks || []).length}</p>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-500">Docs</p>
                <p className="text-lg text-white font-bold">{(campaign.hyperContext.linkedDocs || []).length}</p>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-500">Sheets</p>
                <p className="text-lg text-white font-bold">{(campaign.hyperContext.linkedSheets || []).length}</p>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-500">Calendar</p>
                <p className="text-lg text-white font-bold">{(campaign.hyperContext.linkedCalendar || []).length}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No hyper context data.</p>
          )}
        </div>
      )}

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowEdit(false)}>
          <div className="w-full max-w-lg bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Edit Campaign</h3>
              <button onClick={() => setShowEdit(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input className="input" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Goal</label>
                <input className="input" value={editForm.goal} onChange={(e) => setEditForm((f) => ({ ...f, goal: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Daily Budget</label>
                  <input type="number" className="input" value={editForm.daily} onChange={(e) => setEditForm((f) => ({ ...f, daily: Number(e.target.value) }))} min={0} />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Lifetime Budget</label>
                  <input type="number" className="input" value={editForm.lifetime} onChange={(e) => setEditForm((f) => ({ ...f, lifetime: Number(e.target.value) }))} min={0} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Start Date</label>
                  <input type="date" className="input" value={editForm.startDate} onChange={(e) => setEditForm((f) => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">End Date</label>
                  <input type="date" className="input" value={editForm.endDate} onChange={(e) => setEditForm((f) => ({ ...f, endDate: e.target.value }))} min={editForm.startDate} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" /> Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CreativesTab({ campaign, onUpdate }: { campaign: any; onUpdate: () => void }) {
  const { addToast } = useToast();
  const [allCreatives, setAllCreatives] = useState<any[]>([]);
  const [showLink, setShowLink] = useState(false);
  const [search, setSearch] = useState("");

  async function openLink() {
    try {
      const list = await api.creatives.list();
      setAllCreatives(Array.isArray(list) ? list : []);
      setShowLink(true);
    } catch {
      addToast("error", "Failed to load creatives");
    }
  }

  async function linkCreative(creativeId: string) {
    const currentIds = (campaign.creatives || []).map((c: any) => c._id || c);
    if (currentIds.includes(creativeId)) {
      addToast("error", "Already linked");
      return;
    }
    try {
      await api.campaigns.update(campaign._id || campaign.id, { creatives: [...currentIds, creativeId] });
      addToast("success", "Creative linked");
      setShowLink(false);
      onUpdate();
    } catch {
      addToast("error", "Failed to link creative");
    }
  }

  async function removeCreative(creativeId: string) {
    const currentIds = (campaign.creatives || []).map((c: any) => c._id || c);
    try {
      await api.campaigns.update(campaign._id || campaign.id, { creatives: currentIds.filter((id: string) => id !== creativeId) });
      addToast("success", "Creative removed");
      onUpdate();
    } catch {
      addToast("error", "Failed to remove creative");
    }
  }

  const filteredCreatives = allCreatives.filter((c: any) =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Linked Creatives</h3>
          <button className="btn-secondary text-sm flex items-center gap-1.5" onClick={openLink}>
            <Image className="w-3.5 h-3.5" /> Link Creative
          </button>
        </div>
        {campaign.creatives?.length > 0 ? (
          <div className="space-y-2">
            {campaign.creatives.map((c: any) => {
              const cId = c._id || c;
              return (
                <div key={cId} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors group">
                  <Link to={`/creatives/${cId}`} className="flex items-center gap-3 min-w-0 flex-1">
                    <Image className="w-4 h-4 text-n0va-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-sm text-white">{c.name || cId}</span>
                      {c.status && <span className="text-xs text-gray-500 ml-2">({c.status})</span>}
                    </div>
                  </Link>
                  <button className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 text-xs" onClick={() => removeCreative(cId)}>
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No creatives linked to this campaign.</p>
        )}
      </div>

      {showLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowLink(false)}>
          <div className="w-full max-w-lg bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Link Creative</h3>
            <input className="input mb-3" placeholder="Search creatives..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredCreatives.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No creatives found</p>
              ) : (
                filteredCreatives.map((c: any) => {
                  const cId = c._id || c.id;
                  const isLinked = (campaign.creatives || []).some((cc: any) => (cc._id || cc) === cId);
                  return (
                    <button key={cId} className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${isLinked ? "bg-gray-800/30 text-gray-500" : "bg-gray-800/50 hover:bg-gray-800 text-white"}`} onClick={() => !isLinked && linkCreative(cId)} disabled={isLinked}>
                      <div className="flex items-center gap-3 min-w-0">
                        <Image className="w-4 h-4 text-n0va-400 shrink-0" />
                        <span className="text-sm truncate">{c.name || cId}</span>
                      </div>
                      <span className="text-xs shrink-0">{isLinked ? "Linked" : "Link"}</span>
                    </button>
                  );
                })
              )}
            </div>
            <div className="flex justify-end mt-4">
              <button className="btn-secondary" onClick={() => setShowLink(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AudiencesTab({ campaign, onUpdate }: { campaign: any; onUpdate: () => void }) {
  const { addToast } = useToast();
  const [allAudiences, setAllAudiences] = useState<any[]>([]);
  const [showLink, setShowLink] = useState(false);
  const [search, setSearch] = useState("");

  async function openLink() {
    try {
      const list = await api.audiences.list();
      setAllAudiences(Array.isArray(list) ? list : []);
      setShowLink(true);
    } catch {
      addToast("error", "Failed to load audiences");
    }
  }

  async function linkAudience(audienceId: string) {
    const currentIds = (campaign.audiences || []).map((a: any) => a._id || a);
    if (currentIds.includes(audienceId)) {
      addToast("error", "Already linked");
      return;
    }
    try {
      await api.campaigns.update(campaign._id || campaign.id, { audiences: [...currentIds, audienceId] });
      addToast("success", "Audience linked");
      setShowLink(false);
      onUpdate();
    } catch {
      addToast("error", "Failed to link audience");
    }
  }

  async function removeAudience(audienceId: string) {
    const currentIds = (campaign.audiences || []).map((a: any) => a._id || a);
    try {
      await api.campaigns.update(campaign._id || campaign.id, { audiences: currentIds.filter((id: string) => id !== audienceId) });
      addToast("success", "Audience removed");
      onUpdate();
    } catch {
      addToast("error", "Failed to remove audience");
    }
  }

  const filteredAudiences = allAudiences.filter((a: any) =>
    a.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Target Audiences</h3>
          <button className="btn-secondary text-sm flex items-center gap-1.5" onClick={openLink}>
            <Users className="w-3.5 h-3.5" /> Link Audience
          </button>
        </div>
        {campaign.audiences?.length > 0 ? (
          <div className="space-y-2">
            {campaign.audiences.map((a: any) => {
              const aId = a._id || a;
              return (
                <div key={aId} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors group">
                  <Link to={`/audiences/${aId}`} className="flex items-center gap-3 min-w-0 flex-1">
                    <Users className="w-4 h-4 text-purple-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-sm text-white">{a.name || aId}</span>
                      {a.size ? <span className="text-xs text-gray-500 ml-2">({a.size.toLocaleString()})</span> : null}
                    </div>
                  </Link>
                  <button className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 text-xs" onClick={() => removeAudience(aId)}>
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No audiences targeted yet.</p>
        )}
      </div>

      {showLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowLink(false)}>
          <div className="w-full max-w-lg bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Link Audience</h3>
            <input className="input mb-3" placeholder="Search audiences..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredAudiences.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No audiences found</p>
              ) : (
                filteredAudiences.map((a: any) => {
                  const aId = a._id || a.id;
                  const isLinked = (campaign.audiences || []).some((aa: any) => (aa._id || aa) === aId);
                  return (
                    <button key={aId} className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${isLinked ? "bg-gray-800/30 text-gray-500" : "bg-gray-800/50 hover:bg-gray-800 text-white"}`} onClick={() => !isLinked && linkAudience(aId)} disabled={isLinked}>
                      <div className="flex items-center gap-3 min-w-0">
                        <Users className="w-4 h-4 text-purple-400 shrink-0" />
                        <span className="text-sm truncate">{a.name || aId}</span>
                      </div>
                      <span className="text-xs shrink-0">{isLinked ? "Linked" : "Link"}</span>
                    </button>
                  );
                })
              )}
            </div>
            <div className="flex justify-end mt-4">
              <button className="btn-secondary" onClick={() => setShowLink(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ScheduleTab({ campaign }: { campaign: any }) {
  const startDate = campaign.startDate ? new Date(campaign.startDate) : null;
  const endDate = campaign.endDate ? new Date(campaign.endDate) : null;
  const now = new Date();
  const totalDays = startDate && endDate ? Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1 : 0;
  const elapsedDays = startDate && now > startDate ? Math.round((now.getTime() - startDate.getTime()) / 86400000) : 0;
  const progress = totalDays > 0 ? Math.min(100, (elapsedDays / totalDays) * 100) : 0;
  const isActive = startDate && endDate && now >= startDate && now <= endDate;
  const isUpcoming = startDate && now < startDate;
  const isPast = endDate && now > endDate;

  if (!startDate || !endDate) {
    return (
      <div className="card text-center py-12">
        <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">No schedule set for this campaign.</p>
        <p className="text-gray-500 text-sm mt-1">Use the edit modal to set start and end dates.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-3 mb-1">
            <Calendar className="w-4 h-4 text-n0va-400" />
            <span className="text-sm text-gray-500">Start Date</span>
          </div>
          <p className="text-xl font-bold text-white">{startDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-3 mb-1">
            <Clock className="w-4 h-4 text-n0va-400" />
            <span className="text-sm text-gray-500">Duration</span>
          </div>
          <p className="text-xl font-bold text-white">{totalDays} days</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-3 mb-1">
            <Calendar className="w-4 h-4 text-n0va-400" />
            <span className="text-sm text-gray-500">End Date</span>
          </div>
          <p className="text-xl font-bold text-white">{endDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
        </div>
      </div>

      {isActive && (
        <div className="card border-green-600/30 bg-green-900/10 flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" /></span>
          <span className="text-green-400 text-sm font-medium">Campaign is running</span>
        </div>
      )}
      {isUpcoming && (
        <div className="card border-yellow-600/30 bg-yellow-900/10 flex items-center gap-2">
          <Clock className="w-4 h-4 text-yellow-400" />
          <span className="text-yellow-400 text-sm font-medium">Starts in {Math.ceil((startDate.getTime() - now.getTime()) / 86400000)} days</span>
        </div>
      )}
      {isPast && (
        <div className="card border-gray-600/30 bg-gray-800/50 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-gray-400 text-sm font-medium">Campaign ended {Math.floor((now.getTime() - endDate.getTime()) / 86400000)} days ago</span>
        </div>
      )}

      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Timeline</h3>
        <div className="relative py-6">
          <div className="w-full bg-gray-800 rounded-full h-3">
            <div className="bg-n0va-600 h-3 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          {isActive && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0" style={{ left: `${progress}%` }}>
                <div className="w-px h-24 bg-green-400" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-green-400 rounded-full" />
                <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-green-400 whitespace-nowrap">Today</span>
              </div>
            </div>
          )}
          <div className="flex justify-between text-xs text-gray-500 mt-3">
            <span className="text-gray-400">{startDate.toLocaleDateString()}</span>
            <span className="text-gray-400">{endDate.toLocaleDateString()}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <p className="text-gray-500">Elapsed</p>
            <p className="text-white font-bold">{elapsedDays}d</p>
          </div>
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <p className="text-gray-500">Remaining</p>
            <p className="text-white font-bold">{Math.max(0, totalDays - elapsedDays)}d</p>
          </div>
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <p className="text-gray-500">Progress</p>
            <p className="text-white font-bold">{progress.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {totalDays > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Day-by-Day Overview</h3>
          <div className="flex gap-0.5 h-12 items-end">
            {Array.from({ length: Math.min(totalDays, 90) }).map((_, i) => {
              const d = new Date(startDate.getTime() + i * 86400000);
              const isToday = d.toDateString() === now.toDateString();
              const inPast = d < now;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1" title={d.toLocaleDateString()}>
                  <div className={`w-full rounded-t transition-all ${isToday ? "bg-green-500 h-full" : inPast ? "bg-n0va-600/60" : "bg-gray-700"}`} style={{ height: isToday ? "100%" : inPast ? `${12 + (i % 7) * 2}px` : "8px" }} />
                  {i % 7 === 0 && <span className="text-[10px] text-gray-600">{d.getDate()}</span>}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Past</span>
            <span className="text-n0va-400">Today</span>
            <span>Future</span>
          </div>
        </div>
      )}
    </div>
  );
}
