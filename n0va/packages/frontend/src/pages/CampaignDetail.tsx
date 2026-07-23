import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit3, Trash2, TrendingUp, DollarSign, Target } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { api } from "../api/client";

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.campaigns.get(id),
      fetch(`/api/v1/analytics/campaign/${id}`).then((r) => r.json()).catch(() => null),
    ])
      .then(([c, a]) => {
        setCampaign(c);
        setAnalytics(a);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!id || !confirm("Delete this campaign?")) return;
    await api.campaigns.delete(id);
    navigate("/campaigns");
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

  const dailyData = analytics?.daily?.slice(-14).map((d: any) => ({
    ...d,
    date: d.date?.substring(5),
  })) || [];

  const platformData = analytics?.byPlatform || [];
  const colors = ["#1a6dff", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];

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
        <button className="btn-danger flex items-center gap-2" onClick={handleDelete}>
          <Trash2 className="w-4 h-4" /> Delete
        </button>
      </div>

      {campaign.status === "draft" && (
        <div className="card border-yellow-600/30 bg-yellow-900/10">
          <p className="text-yellow-400 text-sm font-medium">This campaign is in draft. Launch it to start serving ads.</p>
          <button className="btn-primary mt-2" onClick={() => api.campaigns.updateStatus(id!, "active").then(() => setCampaign({ ...campaign, status: "active" }))}>
            Launch Campaign
          </button>
        </div>
      )}

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
              <span className="text-white font-bold">${(analytics?.daily?.reduce((s: number, d: any) => s + (d.revenue || 0), 0) || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-gray-400">Spend</span>
              </div>
              <span className="text-white font-bold">${(analytics?.daily?.reduce((s: number, d: any) => s + (d.spend || 0), 0) || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-400">Conversions</span>
              </div>
              <span className="text-white font-bold">{analytics?.daily?.reduce((s: number, d: any) => s + (d.conversions || 0), 0) || 0}</span>
            </div>
            <div className="pt-2 border-t border-gray-800 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Total Impressions</span><span className="text-white">{(analytics?.daily?.reduce((s: number, d: any) => s + (d.impressions || 0), 0) || 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Total Clicks</span><span className="text-white">{(analytics?.daily?.reduce((s: number, d: any) => s + (d.clicks || 0), 0) || 0).toLocaleString()}</span></div>
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
                  <span key={p} className="badge bg-n0va-600/20 text-n0va-400 border border-n0va-600/30">{p}</span>
                ))}
              </dd>
            </div>
            {campaign.goal && (
              <div className="col-span-2">
                <dt className="text-gray-500">Goal</dt>
                <dd className="text-white mt-1">{campaign.goal}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>
          <div className="space-y-3">
            {campaign.status === "draft" && (
              <button className="btn-primary w-full" onClick={() => api.campaigns.updateStatus(id!, "active").then(() => setCampaign({ ...campaign, status: "active" }))}>Launch Campaign</button>
            )}
            {campaign.status === "active" && (
              <button className="btn-secondary w-full" onClick={() => api.campaigns.updateStatus(id!, "paused").then(() => setCampaign({ ...campaign, status: "paused" }))}>Pause Campaign</button>
            )}
            {campaign.status === "paused" && (
              <button className="btn-primary w-full" onClick={() => api.campaigns.updateStatus(id!, "active").then(() => setCampaign({ ...campaign, status: "active" }))}>Resume Campaign</button>
            )}
            <button className="btn-secondary w-full"><Edit3 className="w-4 h-4 inline mr-2" /> Edit Budget</button>
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
    </div>
  );
}
