import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Edit3, Trash2, Copy, TrendingUp, DollarSign, Target, BarChart3, Users, Image, Layers, Save, X, ExternalLink, Radio } from "lucide-react";
import { useCampaignLive } from "../hooks/useSocket";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { api } from "../api/client";
import { useToast } from "../components/Toast";

type Tab = "overview" | "creatives" | "audiences" | "platforms" | "hypercontext";

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
  const [editForm, setEditForm] = useState({ name: "", goal: "", daily: 0, lifetime: 0 });

  const mergedAnalytics = liveData ? {
    ...analytics,
    daily: analytics?.daily?.map((d: any) => {
      if (liveData.date && d.date === liveData.date) return { ...d, ...liveData };
      return d;
    }) || (liveData.date ? [{ ...liveData, date: liveData.date }] : []),
  } : analytics;

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.campaigns.get(id),
      fetch(`/api/v1/analytics/campaign/${id}`).then((r) => r.json()).catch(() => null),
    ])
      .then(([c, a]) => {
        setCampaign(c);
        setAnalytics(a);
        setEditForm({ name: c.name || "", goal: c.goal || "", daily: c.budget?.daily || 0, lifetime: c.budget?.lifetime || 0 });
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!id || !confirm("Delete this campaign?")) return;
    await api.campaigns.delete(id);
    addToast("success", "Campaign deleted");
    navigate("/campaigns");
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
      const res = await fetch(`/api/v1/campaigns/${id}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + btoa(JSON.stringify({ userId: "user_001", tenantId: "tenant_001", role: "admin" })), "x-tenant-id": "tenant_001" },
      });
      const cloned = await res.json();
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
        budget: { daily: editForm.daily, lifetime: editForm.lifetime },
      });
      setCampaign((prev: any) => ({ ...prev, ...updated }));
      setShowEdit(false);
      addToast("success", "Campaign updated");
    } catch {
      addToast("error", "Failed to update campaign");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-n0va-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!campaign) {
    return <div className="text-gray-400 text-center py-12">Campaign not found</div>;
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
          <button className="btn-secondary flex items-center gap-2" onClick={() => { setEditForm({ name: campaign.name, goal: campaign.goal || "", daily: campaign.budget?.daily || 0, lifetime: campaign.budget?.lifetime || 0 }); setShowEdit(true); }}>
            <Edit3 className="w-4 h-4" /> Edit
          </button>
          <button className="btn-danger flex items-center gap-2" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

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

      {tab === "creatives" && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Linked Creatives</h3>
            <Link to="/creatives" className="text-sm text-n0va-400 hover:text-n0va-300">Manage Creatives</Link>
          </div>
          {campaign.creatives?.length > 0 ? (
            <div className="space-y-2">
              {campaign.creatives.map((c: any) => (
                <Link key={c._id || c} to={`/creatives/${c._id || c}`} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <Image className="w-4 h-4 text-n0va-400" />
                    <span className="text-sm text-white">{c.name || c._id || c}</span>
                  </div>
                  <span className="text-xs text-gray-500">{c.status || "linked"}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No creatives linked to this campaign.</p>
          )}
        </div>
      )}

      {tab === "audiences" && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Target Audiences</h3>
            <Link to="/audiences" className="text-sm text-n0va-400 hover:text-n0va-300">Manage Audiences</Link>
          </div>
          {campaign.audiences?.length > 0 ? (
            <div className="space-y-2">
              {campaign.audiences.map((a: any) => (
                <Link key={a._id || a} to={`/audiences/${a._id || a}`} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-white">{a.name || a._id || a}</span>
                  </div>
                  <span className="text-xs text-gray-500">{a.size?.toLocaleString() || "—"}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No audiences targeted yet.</p>
          )}
        </div>
      )}

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
