import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend, BarChart, Bar, Cell } from "recharts";
import { api } from "../api/client";
import { TrendingUp, RefreshCw, DollarSign, Target, BarChart3, Sliders, ChevronDown, ChevronRight, Calculator } from "lucide-react";
import { SkeletonChart } from "../components/Skeleton";
import { useToast } from "../components/Toast";

interface ForecastPoint {
  date: string; actualRevenue?: number; predictedRevenue: number;
  predictedSpend: number; actualSpend?: number; predictedRoas: number;
  lowerBound: number; upperBound: number; confidence: number;
}

interface ScenarioROI {
  name: string; budget: number; revenue: number; roas: number; roi: number;
  netProfit: number; cpa: number; isProfitable: boolean;
}

type Tab = "forecast" | "scenarios" | "campaigns";

export default function CampaignForecast() {
  const { addToast } = useToast();
  const [tab, setTab] = useState<Tab>("forecast");
  const [forecast, setForecast] = useState<{ historical: ForecastPoint[]; predictions: ForecastPoint[]; summary: any; recommendations: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioROI[]>([]);
  const [scenarioBase, setScenarioBase] = useState({ budget: 50000, revenue: 150000, leads: 1200, cvr: 5, dealSize: 2500 });
  const [showScenarioForm, setShowScenarioForm] = useState(false);

  useEffect(() => { loadData(); loadCampaigns(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [analytics, budget] = await Promise.all([
        api.analytics.overview("60").catch(() => null),
        api.optimizer.budget({}).catch(() => null),
      ]);
      generateForecast(analytics, budget);
    } catch { setForecast(null); }
    setLoading(false);
  }

  async function loadCampaigns() {
    try { const res = await api.campaigns.list(); setCampaigns(res.campaigns || res || []); } catch {}
  }

  function generateForecast(analytics: any, budget: any) {
    const rawDaily = analytics?.dailyMetrics || [];
    const historical = rawDaily.slice(-30).map((d: any, i: number) => ({
      date: d.date?.substring(5) || `Day ${i + 1}`,
      actualRevenue: d.revenue, actualSpend: d.spend,
      predictedRevenue: d.revenue, predictedSpend: d.spend,
      predictedRoas: d.roas || 0,
      lowerBound: d.revenue * 0.85, upperBound: d.revenue * 1.15, confidence: 1,
    }));

    const last30Revenue = historical.reduce((s: number, d: any) => s + (d.actualRevenue || 0), 0);
    const last30Spend = historical.reduce((s: number, d: any) => s + (d.actualSpend || 0), 0);
    const avgRoas = last30Spend > 0 ? last30Revenue / last30Spend : 2.5;

    const weekRev: number[] = [];
    for (let w = 0; w < 4; w++) {
      const start = w * 7, end = Math.min(start + 7, historical.length);
      weekRev.push(historical.slice(start, end).reduce((s: number, d: any) => s + (d.actualRevenue || 0), 0));
    }
    const trend = weekRev.length >= 2 && weekRev[0] > 0
      ? ((weekRev[weekRev.length - 1] / weekRev[0]) - 1) * (7 / (weekRev.length * 7))
      : 0.03;

    const avgRevenue = last30Revenue / 30;
    const avgSpend = last30Spend / 30;
    const predictions: ForecastPoint[] = [];
    const weekdayPattern = historical.slice(-14).map((d: any) => ({
      rev: d.actualRevenue || avgRevenue, spend: d.actualSpend || avgSpend,
    }));

    for (let i = 1; i <= 14; i++) {
      const dayOfWeek = (new Date().getDay() + i) % 7;
      const weekendFactor = [0, 6].includes(dayOfWeek) ? 0.7 : 1.0;
      const patternIdx = (historical.length - 14 + i - 1) % Math.max(1, weekdayPattern.length);
      const baseRev = weekdayPattern[patternIdx]?.rev || avgRevenue;
      const baseSpend = weekdayPattern[patternIdx]?.spend || avgSpend;
      const growthFactor = 1 + trend * i;
      const jitter = 0.9 + Math.random() * 0.2;
      const predictedRevenue = baseRev * growthFactor * weekendFactor * jitter;
      const predictedSpend = baseSpend * growthFactor * 0.9 * jitter;
      const confidence = Math.max(0.35, 1 - i * 0.045);
      const predictedRoas = predictedSpend > 0 ? predictedRevenue / predictedSpend : 0;

      predictions.push({
        date: `Day +${i}`, predictedRevenue: Math.round(predictedRevenue),
        predictedSpend: Math.round(predictedSpend),
        predictedRoas: parseFloat(predictedRoas.toFixed(2)),
        lowerBound: Math.round(predictedRevenue * (1 - (1 - confidence) * 0.5)),
        upperBound: Math.round(predictedRevenue * (1 + (1 - confidence) * 0.5)),
        confidence: parseFloat(confidence.toFixed(2)),
      });
    }

    const expectedRevenue = predictions.reduce((s, p) => s + p.predictedRevenue, 0);
    const expectedSpend = predictions.reduce((s, p) => s + p.predictedSpend, 0);
    const budgetRecs = budget?.recommendations || [];

    const recommendations = [
      avgRoas > 2.5 ? `Strong ROAS (${avgRoas.toFixed(2)}x) — consider increasing budget by 15-20% to capture additional conversions` : `ROAS (${avgRoas.toFixed(2)}x) — optimize underperforming placements and refresh fatigued creatives`,
      trend > 0.02 ? `Revenue trending up (${(trend * 100).toFixed(1)}%/day) — maintain current strategy with incremental testing` : trend < -0.01 ? `Revenue declining (${(trend * 100).toFixed(1)}%/day) — investigate audience fatigue and competitive landscape` : `Revenue stable (${(trend * 100).toFixed(1)}%/day) — focus on incremental optimizations`,
      ...budgetRecs.slice(0, 2).map((r: any) => r.reason || r.recommendation || "").filter(Boolean),
      predictions.some(p => p.predictedRoas < 1.5) ? "Some forecast periods show ROAS below 1.5x — review placement-level performance data" : "All forecast periods project ROAS above 1.5x — healthy portfolio performance expected",
    ].filter(Boolean);

    setForecast({ historical, predictions, summary: { avgRoas, last30Revenue, last30Spend, expectedRevenue, expectedSpend, trend }, recommendations });
  }

  function runScenario() {
    const s = scenarioBase;
    const variants: ScenarioROI[] = [
      { name: "Conservative", budget: s.budget * 0.6, revenue: s.revenue * 0.55, roas: 0, roi: 0, netProfit: 0, cpa: 0, isProfitable: false },
      { name: "Balanced", budget: s.budget, revenue: s.revenue, roas: 0, roi: 0, netProfit: 0, cpa: 0, isProfitable: false },
      { name: "Aggressive", budget: s.budget * 1.5, revenue: s.revenue * 1.8, roas: 0, roi: 0, netProfit: 0, cpa: 0, isProfitable: false },
    ];
    const results = variants.map(v => {
      const leads = Math.round(s.leads * (v.budget / s.budget));
      const totalCost = v.budget + s.budget * 0.1;
      const netProfit = v.revenue - totalCost;
      return {
        ...v,
        roas: parseFloat((v.revenue / (v.budget || 1)).toFixed(2)),
        roi: parseFloat((((v.revenue - totalCost) / totalCost) * 100).toFixed(1)),
        netProfit: parseFloat(netProfit.toFixed(0)),
        cpa: parseFloat((leads > 0 ? totalCost / leads : 0).toFixed(2)),
        isProfitable: netProfit > 0,
      };
    });
    setScenarios(results);
    addToast("success", "Scenarios calculated");
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "forecast", label: "Revenue Forecast", icon: TrendingUp },
    { key: "scenarios", label: "Scenario Modeling", icon: Sliders },
    { key: "campaigns", label: "Campaign Breakdown", icon: BarChart3 },
  ];

  const chartData = forecast ? [
    ...forecast.historical.slice(-14).map(d => ({ date: d.date, Revenue: d.actualRevenue || 0, Spend: d.actualSpend || 0, Predicted: undefined, Upper: undefined, Lower: undefined, type: "actual" })),
    ...forecast.predictions.map(p => ({ date: p.date, Revenue: undefined, Spend: undefined, Predicted: p.predictedRevenue, Upper: p.upperBound, Lower: p.lowerBound, type: "forecast" })),
  ] : [];

  const roasData = forecast ? forecast.predictions.map(p => ({ date: p.date, ROAS: p.predictedRoas, Confidence: p.confidence * 100 })) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-n0va-400" />
            Campaign Forecast
          </h1>
          <p className="text-gray-500 mt-1">14-day revenue prediction with scenario modeling and campaign breakdowns</p>
        </div>
        <button onClick={loadData} className="btn-ghost text-sm flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
      </div>

      <div className="flex gap-1 border-b border-gray-800 pb-0">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? "border-n0va-400 text-white" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "forecast" && (
        <>
          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => (<div key={i} className="card animate-pulse"><div className="h-4 w-4 bg-gray-800 rounded mb-3" /><div className="h-3 w-20 bg-gray-800 rounded mb-1" /><div className="h-7 w-16 bg-gray-800 rounded mb-1" /><div className="h-3 w-12 bg-gray-800 rounded" /></div>))}</div>
              <SkeletonChart /><div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><SkeletonChart /><SkeletonChart /></div>
            </div>
          ) : !forecast ? (
            <div className="text-gray-400 text-center py-12"><p className="mb-4">No forecast data available</p><button className="btn-secondary flex items-center gap-2 mx-auto" onClick={loadData}><RefreshCw className="w-4 h-4" /> Retry</button></div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card"><TrendingUp className="w-4 h-4 text-n0va-400 mb-2" /><p className="text-xs text-gray-500 mb-1">Projected Revenue</p><p className="text-2xl font-bold text-white">${(forecast.summary.expectedRevenue / 1000).toFixed(1)}K</p><p className="text-xs text-green-400">Next 14 days</p></div>
                <div className="card"><DollarSign className="w-4 h-4 text-yellow-400 mb-2" /><p className="text-xs text-gray-500 mb-1">Expected Spend</p><p className="text-2xl font-bold text-white">${(forecast.summary.expectedSpend / 1000).toFixed(1)}K</p><p className="text-xs text-gray-500">Next 14 days</p></div>
                <div className="card"><Target className="w-4 h-4 text-emerald-400 mb-2" /><p className="text-xs text-gray-500 mb-1">Avg. ROAS</p><p className="text-2xl font-bold text-white">{forecast.summary.avgRoas.toFixed(2)}x</p><p className="text-xs text-gray-500">Last 30 days</p></div>
                <div className="card"><TrendingUp className={`w-4 h-4 mb-2 ${forecast.summary.trend > 0 ? "text-green-400" : "text-red-400"}`} /><p className="text-xs text-gray-500 mb-1">Daily Trend</p><p className={`text-2xl font-bold ${forecast.summary.trend > 0 ? "text-green-400" : "text-red-400"}`}>{(forecast.summary.trend * 100).toFixed(1)}%</p></div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">Revenue Forecast</h3><span className="text-xs text-gray-500">Historical + 14-day prediction</span></div>
                <div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#1f2937" /><XAxis dataKey="date" stroke="#6b7280" fontSize={11} /><YAxis stroke="#6b7280" fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} /><Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }} /><Legend /><Area type="monotone" dataKey="Revenue" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} name="Actual Revenue" connectNulls={false} /><Area type="monotone" dataKey="Predicted" stroke="#1a6dff" fill="#1a6dff" fillOpacity={0.1} strokeWidth={2} strokeDasharray="6 3" name="Predicted Revenue" connectNulls={false} /><Area type="monotone" dataKey="Upper" stroke="#1a6dff" fill="#1a6dff" fillOpacity={0.05} strokeWidth={1} name="Upper Bound" connectNulls={false} /><Area type="monotone" dataKey="Lower" stroke="#1a6dff" fill="#1a6dff" fillOpacity={0.05} strokeWidth={1} name="Lower Bound" connectNulls={false} /><Area type="monotone" dataKey="Spend" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={2} name="Actual Spend" connectNulls={false} /></AreaChart></ResponsiveContainer></div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card"><h3 className="text-lg font-semibold text-white mb-4">Predicted ROAS & Confidence</h3>
                  <div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={roasData}><CartesianGrid strokeDasharray="3 3" stroke="#1f2937" /><XAxis dataKey="date" stroke="#6b7280" fontSize={11} /><YAxis stroke="#6b7280" fontSize={11} domain={[0, "auto"]} /><Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }} /><Legend /><Line type="monotone" dataKey="ROAS" stroke="#1a6dff" strokeWidth={2} dot={false} name="Predicted ROAS" /><Line type="monotone" dataKey="Confidence" stroke="#10b981" strokeWidth={2} dot={false} name="Confidence %" /></LineChart></ResponsiveContainer></div>
                </div>

                <div className="card"><h3 className="text-lg font-semibold text-white mb-4">Recommendations</h3>
                  <div className="space-y-3">{forecast.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg"><div className="w-6 h-6 bg-n0va-600/20 rounded-full flex items-center justify-center text-xs text-n0va-400 font-bold flex-shrink-0">{i + 1}</div><p className="text-sm text-gray-300">{rec}</p></div>
                  ))}</div>
                </div>
              </div>

              <div className="card"><h3 className="text-lg font-semibold text-white mb-4">Daily Forecast Breakdown</h3>
                <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-gray-500 border-b border-gray-800"><th className="text-left py-2 px-3">Day</th><th className="text-right py-2 px-3">Predicted Revenue</th><th className="text-right py-2 px-3">Predicted Spend</th><th className="text-right py-2 px-3">Predicted ROAS</th><th className="text-right py-2 px-3">Lower Bound</th><th className="text-right py-2 px-3">Upper Bound</th><th className="text-right py-2 px-3">Confidence</th></tr></thead>
                    <tbody>{forecast.predictions.map((p, i) => (
                      <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30"><td className="py-2 px-3 text-white">{p.date}</td><td className="py-2 px-3 text-right text-green-400">${p.predictedRevenue.toLocaleString()}</td><td className="py-2 px-3 text-right text-yellow-400">${p.predictedSpend.toLocaleString()}</td><td className="py-2 px-3 text-right text-n0va-400">{p.predictedRoas.toFixed(2)}x</td><td className="py-2 px-3 text-right text-gray-400">${p.lowerBound.toLocaleString()}</td><td className="py-2 px-3 text-right text-gray-400">${p.upperBound.toLocaleString()}</td><td className="py-2 px-3 text-right"><span className={`${p.confidence > 0.7 ? "text-green-400" : p.confidence > 0.5 ? "text-yellow-400" : "text-red-400"}`}>{(p.confidence * 100).toFixed(0)}%</span></td></tr>
                    ))}</tbody></table></div>
              </div>
            </>
          )}
        </>
      )}

      {tab === "scenarios" && (
        <div className="space-y-4">
          <div className="card"><h3 className="text-lg font-semibold text-white mb-4">What-If Scenario Modeling</h3>
            <p className="text-sm text-gray-500 mb-4">Adjust baseline parameters to compare Conservative, Balanced, and Aggressive budget scenarios.</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div><label className="label">Budget ($)</label><input type="number" className="input" value={scenarioBase.budget} onChange={e => setScenarioBase({ ...scenarioBase, budget: Number(e.target.value) || 0 })} /></div>
              <div><label className="label">Revenue ($)</label><input type="number" className="input" value={scenarioBase.revenue} onChange={e => setScenarioBase({ ...scenarioBase, revenue: Number(e.target.value) || 0 })} /></div>
              <div><label className="label">Leads</label><input type="number" className="input" value={scenarioBase.leads} onChange={e => setScenarioBase({ ...scenarioBase, leads: Number(e.target.value) || 0 })} /></div>
              <div><label className="label">CVR %</label><input type="number" className="input" step="0.1" value={scenarioBase.cvr} onChange={e => setScenarioBase({ ...scenarioBase, cvr: Number(e.target.value) || 0 })} /></div>
              <div><label className="label">Deal Size ($)</label><input type="number" className="input" value={scenarioBase.dealSize} onChange={e => setScenarioBase({ ...scenarioBase, dealSize: Number(e.target.value) || 0 })} /></div>
            </div>
            <button onClick={runScenario} className="btn-primary mt-4 text-sm flex items-center gap-1.5"><Calculator className="w-4 h-4" /> Calculate Scenarios</button>
          </div>

          {scenarios.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-4">
                {scenarios.map(s => (
                  <div key={s.name} className={`card ${s.isProfitable ? "border-green-600/30" : "border-red-600/30"}`}>
                    <p className="text-sm font-semibold text-white mb-3">{s.name}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs"><span className="text-gray-500">Budget</span><span className="text-white font-mono">${s.budget.toLocaleString()}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-gray-500">Revenue</span><span className="text-green-400 font-mono">${s.revenue.toLocaleString()}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-gray-500">Net Profit</span><span className={`font-mono ${s.isProfitable ? "text-green-400" : "text-red-400"}`}>${s.netProfit.toLocaleString()}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-gray-500">ROAS</span><span className="text-n0va-400 font-mono">{s.roas.toFixed(2)}x</span></div>
                      <div className="flex justify-between text-xs"><span className="text-gray-500">ROI</span><span className={`font-mono ${s.roi > 0 ? "text-green-400" : "text-red-400"}`}>{s.roi}%</span></div>
                      <div className="flex justify-between text-xs"><span className="text-gray-500">CPA</span><span className="text-white font-mono">${s.cpa.toFixed(2)}</span></div>
                    </div>
                    <span className={`mt-3 inline-block text-[10px] px-2 py-0.5 rounded-full ${s.isProfitable ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>{s.isProfitable ? "Profitable" : "Not Profitable"}</span>
                  </div>
                ))}
              </div>

              <div className="card"><h3 className="text-lg font-semibold text-white mb-4">Scenario Comparison</h3>
                <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={scenarios.map(s => ({ name: s.name, Revenue: s.revenue, Profit: s.netProfit > 0 ? s.netProfit : 0, Loss: s.netProfit < 0 ? Math.abs(s.netProfit) : 0 }))}><CartesianGrid strokeDasharray="3 3" stroke="#1f2937" /><XAxis dataKey="name" stroke="#6b7280" fontSize={11} /><YAxis stroke="#6b7280" fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} /><Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }} /><Legend /><Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue" /><Bar dataKey="Profit" fill="#1a6dff" radius={[4, 4, 0, 0]} name="Net Profit" /></BarChart></ResponsiveContainer></div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "campaigns" && (
        <div className="space-y-3">
          {campaigns.length === 0 ? (
            <div className="card p-12 flex flex-col items-center justify-center text-center"><BarChart3 className="w-12 h-12 text-gray-700 mb-4" /><h3 className="text-lg font-semibold text-gray-300 mb-2">No campaigns</h3><p className="text-sm text-gray-500">Campaign data will appear here for per-campaign forecasting.</p></div>
          ) : (
            campaigns.map((c: any) => {
              const id = c._id || c.id;
              const spend = c.budget?.daily || 0;
              const perf = c.performance || {};
              const estMonthly = spend * 30;
              const estRevenue = estMonthly * (c.roas || 2.5);
              return (
                <div key={id} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-white">{c.name}</h3>
                    <span className="text-xs capitalize px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">{c.status || "draft"}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-gray-800 rounded p-2"><p className="text-[10px] text-gray-500">Daily Budget</p><p className="text-sm font-medium text-white">${spend.toLocaleString()}</p></div>
                    <div className="bg-gray-800 rounded p-2"><p className="text-[10px] text-gray-500">Est. Monthly</p><p className="text-sm font-medium text-yellow-400">${estMonthly.toLocaleString()}</p></div>
                    <div className="bg-gray-800 rounded p-2"><p className="text-[10px] text-gray-500">Proj. Revenue</p><p className="text-sm font-medium text-green-400">${estRevenue.toLocaleString()}</p></div>
                    <div className="bg-gray-800 rounded p-2"><p className="text-[10px] text-gray-500">Est. ROAS</p><p className="text-sm font-medium text-n0va-400">{(c.roas || 2.5).toFixed(2)}x</p></div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
