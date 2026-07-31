import { useEffect, useState } from "react";
import { Users, Target, Globe, Smartphone, PieChart, TrendingUp, Eye, BarChart3, DollarSign, Sparkles, RefreshCw, ArrowRight, Activity, Monitor, Tablet, MapPin } from "lucide-react";
import { api } from "../api/client";
import { SkeletonCard } from "../components/Skeleton";
import { useToast } from "../components/Toast";

const CHART_COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#14b8a6"];

export default function AudienceInsights() {
  const { addToast } = useToast();
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try { const r: any = await api.audienceInsights.insights(); setInsights(r?.data ?? r); }
    catch { addToast("error", "Failed to load audience insights"); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) return <div className="space-y-6"><div className="h-8 bg-gray-800 rounded w-64 animate-pulse" /><div className="grid grid-cols-1 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-6 h-6 text-n0va-400" />
            Audience Insights
          </h1>
          <p className="text-gray-500 mt-1">Deep audience analytics, demographics, and recommendations</p>
        </div>
        <button className="btn-ghost text-xs p-1.5" onClick={load}><RefreshCw className="w-3.5 h-3.5" /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2"><Users className="w-5 h-5 text-blue-400" /><span className="text-2xl font-bold text-white">{insights?.totalAudiences || 0}</span></div>
          <p className="text-xs text-gray-500">Audiences</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2"><Eye className="w-5 h-5 text-green-400" /><span className="text-2xl font-bold text-white">{(insights?.totalReach || 0).toLocaleString()}</span></div>
          <p className="text-xs text-gray-500">Total Reach</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2"><Target className="w-5 h-5 text-purple-400" /><span className="text-2xl font-bold text-white">{insights?.topAudience || "N/A"}</span></div>
          <p className="text-xs text-gray-500">Top Audience</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2"><Sparkles className="w-5 h-5 text-yellow-400" /><span className="text-2xl font-bold text-white">{insights?.lookalikeSuggestions?.length || 0}</span></div>
          <p className="text-xs text-gray-500">Lookalike Options</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-n0va-400" /> Age Distribution</h2>
          <div className="space-y-3">
            {insights?.demographics?.ageGroups?.map((age: any, i: number) => (
              <div key={i}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-400">{age.label}</span>
                  <span className="text-gray-500">{age.percentage}% · {age.size.toLocaleString()} users</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${age.percentage}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                </div>
                <div className="flex items-center gap-3 text-[10px] text-gray-600 mt-0.5">
                  <span>CTR: {age.ctr}%</span>
                  <span>CVR: {age.cvr}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-n0va-400" /> Geographic Distribution</h2>
          <div className="space-y-3">
            {insights?.geoDistribution?.map((geo: any, i: number) => (
              <div key={i}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-400">{geo.region}</span>
                  <span className="text-gray-500">{geo.percentage}% · {geo.impressions.toLocaleString()} impressions</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${geo.percentage}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                </div>
                <div className="flex items-center gap-3 text-[10px] text-gray-600 mt-0.5">
                  <span>{geo.conversions.toLocaleString()} conversions</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Smartphone className="w-4 h-4 text-n0va-400" /> Device Breakdown</h2>
          <div className="grid grid-cols-3 gap-3">
            {insights?.deviceBreakdown?.map((d: any, i: number) => (
              <div key={i} className="text-center bg-gray-800/50 rounded-lg p-3">
                {d.device === "Mobile" ? <Smartphone className="w-6 h-6 text-blue-400 mx-auto mb-2" /> : d.device === "Desktop" ? <Monitor className="w-6 h-6 text-green-400 mx-auto mb-2" /> : <Tablet className="w-6 h-6 text-purple-400 mx-auto mb-2" />}
                <p className="text-lg font-bold text-white">{d.percentage}%</p>
                <p className="text-xs text-gray-500">{d.device}</p>
                <p className="text-[10px] text-gray-600 mt-1">CTR: {d.ctr}% · CVR: {d.cvr}%</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Target className="w-4 h-4 text-n0va-400" /> Interest Affinities</h2>
          <div className="space-y-2">
            {insights?.interests?.map((int: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-32 truncate">{int.category}</span>
                <div className="flex-1 h-4 bg-gray-800 rounded-full overflow-hidden relative">
                  <div className="h-full rounded-full" style={{ width: `${int.affinity}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                </div>
                <span className="text-xs text-white w-12 text-right">{int.affinity}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4 text-yellow-400" /> Lookalike Audience Suggestions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {insights?.lookalikeSuggestions?.map((la: any) => (
            <div key={la.id} className="bg-gray-800/50 rounded-lg p-3 border border-gray-800">
              <h3 className="text-sm font-medium text-white mb-1">{la.name}</h3>
              <p className="text-xs text-gray-500 mb-2">Source: {la.sourceAudience}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Est. reach: <span className="text-white">{la.estimatedReach.toLocaleString()}</span></span>
                <span className="text-green-400">{la.matchRate}% match</span>
              </div>
              <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-n0va-500 rounded-full" style={{ width: `${la.similarity * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-n0va-400" /> Audience Performance</h2>
        {insights?.audiencePerformance?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left py-2 px-2 font-medium">Name</th>
                <th className="text-left py-2 px-2 font-medium">Type</th>
                <th className="text-right py-2 px-2 font-medium">Size</th>
                <th className="text-right py-2 px-2 font-medium">Reach</th>
                <th className="text-right py-2 px-2 font-medium">Engagement</th>
                <th className="text-right py-2 px-2 font-medium">CVR</th>
                <th className="text-right py-2 px-2 font-medium">CPA</th>
                <th className="text-right py-2 px-2 font-medium">Campaigns</th>
              </tr></thead>
              <tbody>
                {insights.audiencePerformance.map((ap: any, i: number) => (
                  <tr key={ap.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-2 px-2 text-white">{ap.name}</td>
                    <td className="py-2 px-2 text-gray-400">{ap.type}</td>
                    <td className="py-2 px-2 text-right text-gray-300">{ap.size.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right text-gray-300">{ap.reach.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right text-gray-300">{ap.engagement}%</td>
                    <td className="py-2 px-2 text-right text-green-400">{ap.conversionRate}%</td>
                    <td className="py-2 px-2 text-right text-gray-300">${ap.cpa}</td>
                    <td className="py-2 px-2 text-right text-gray-300">{ap.campaigns}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center py-4">No audience performance data available</p>
        )}
      </div>
    </div>
  );
}
