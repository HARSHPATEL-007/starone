import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, Cell } from "recharts";
import { api } from "../api/client";
import { TrendingUp, DollarSign, Target, RefreshCw, CheckCircle, History, ChevronDown, ChevronRight, Download } from "lucide-react";
import { useToast } from "../components/Toast";
import { useCsvExport } from "../hooks/useCsvExport";
import { SkeletonCard } from "../components/Skeleton";

interface BudgetPlan {
  status: string;
  totalBudget: number;
  totalExpectedRevenue: number;
  expectedRoas: number;
  strategy: string;
  campaigns: {
    id: string;
    name: string;
    currentBudget: number;
    allocatedBudget: number;
    expectedRevenue: number;
    expectedRoas: number;
    shift: number;
    reason: string;
  }[];
}

export default function BudgetStrategy() {
  const { addToast } = useToast();
  const { exportToCsv } = useCsvExport();
  const [plans, setPlans] = useState<Record<string, BudgetPlan> | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string>("balanced");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await api.optimizer.budget({});
      if (res && res.strategy) {
        setPlans({ [res.strategy]: res });
      } else {
        const mock = await api.optimizer.budgetMock();
        setPlans(mock);
      }
    } catch {
      try {
        const mock = await api.optimizer.budgetMock();
        setPlans(mock);
      } catch { setPlans(null); }
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard /><SkeletonCard />
        </div>
      </div>
    );
  }

  if (!plans) {
    return (
      <div className="text-gray-400 text-center py-12">
        <p className="mb-4">No budget data available</p>
        <button className="btn-secondary flex items-center gap-2 mx-auto" onClick={loadData}>
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const strategies = ["conservative", "balanced", "aggressive"] as const;
  const strategyLabels: Record<string, string> = { conservative: "Conservative", balanced: "Balanced", aggressive: "Aggressive" };
  const strategyColors: Record<string, string> = { conservative: "#10b981", balanced: "#1a6dff", aggressive: "#8b5cf6" };

  const plan = plans[selectedStrategy] || plans.balanced;
  const campaignNames = plan?.campaigns?.map((c) => c.name) || [];

  const comparisonData = campaignNames.map((name) => {
    const row: Record<string, any> = { name };
    for (const s of strategies) {
      const p = plans[s];
      if (p) { const c = p.campaigns.find((c: any) => c.name === name); row[s] = c ? c.allocatedBudget : 0; }
    }
    return row;
  });

  const summaryData = strategies.filter((s) => plans[s]).map((s) => ({
    strategy: strategyLabels[s], key: s,
    budget: plans[s].totalBudget, revenue: plans[s].totalExpectedRevenue, roas: plans[s].expectedRoas,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Budget Strategy Comparison</h1>
          <p className="text-gray-500 mt-1">Compare conservative, balanced, and aggressive budget allocation strategies</p>
        </div>
        <button className="btn-secondary flex items-center gap-2" onClick={loadData} disabled={applying}>
          <RefreshCw className="w-4 h-4" /> New Sample
        </button>
        <button className="btn-primary flex items-center gap-2" onClick={async () => {
          setApplying(true);
          const p = plans?.[selectedStrategy];
          if (!p) { setApplying(false); return; }
          const results = { success: 0, failed: 0 };
          for (const c of p.campaigns) {
            try {
              await api.campaigns.updateBudget(c.id, { daily: Math.round(c.allocatedBudget / 30), lifetime: Math.round(c.allocatedBudget) });
              results.success++;
            } catch { results.failed++; }
          }
          addToast("success", `${results.success} budgets applied, ${results.failed} failed`);
          setApplying(false);
        }} disabled={applying || !plans}>
          {applying ? <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-1" /> Applying...</> : <><CheckCircle className="w-4 h-4" /> Apply {strategyLabels[selectedStrategy]}</>}
        </button>
      </div>

      <div className="flex gap-2">
        {strategies.map((s) => (
          <button key={s} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${selectedStrategy === s ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500 hover:text-gray-300"}`} onClick={() => setSelectedStrategy(s)}>
            <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: strategyColors[s] }} />
            {strategyLabels[s]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summaryData.map((s) => (
          <div key={s.key} className={`card cursor-pointer transition-all ${selectedStrategy === s.key ? "ring-2 ring-n0va-500/50" : ""}`} onClick={() => setSelectedStrategy(s.key)}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: strategyColors[s.key] }} />
              <span className="text-xs text-gray-500 uppercase">{s.strategy}</span>
            </div>
            <p className="text-2xl font-bold text-white">${(s.revenue / 1000).toFixed(0)}K</p>
            <p className="text-xs text-gray-500">Expected Revenue</p>
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>Budget: ${(s.budget / 1000).toFixed(0)}K</span>
              <span className="text-n0va-400">{s.roas.toFixed(2)}x ROAS</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">{strategyLabels[selectedStrategy]} — Budget Allocation</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={plan?.campaigns?.map((c: any) => ({ name: c.name, Current: c.currentBudget, Allocated: c.allocatedBudget })) || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }} />
                <Legend />
                <Bar dataKey="Current" fill="#6b7280" radius={[4, 4, 0, 0]} name="Current Budget" />
                <Bar dataKey="Allocated" fill={strategyColors[selectedStrategy]} radius={[4, 4, 0, 0]} name="Allocated Budget" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Strategy Comparison — Budget</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }} />
                <Legend />
                {strategies.filter((s) => plans[s]).map((s) => (
                  <Bar key={s} dataKey={s} fill={strategyColors[s]} radius={[4, 4, 0, 0]} name={strategyLabels[s]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {plan && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">{strategyLabels[selectedStrategy]} — Detailed Allocation</h3>
            <button className="btn-ghost text-xs flex items-center gap-1" onClick={() => { exportToCsv(plan.campaigns.map((c: any) => ({ Campaign: c.name, CurrentBudget: c.currentBudget, AllocatedBudget: c.allocatedBudget, ShiftPercent: c.shift, ExpectedRevenue: c.expectedRevenue, ExpectedROAS: c.expectedRoas, Reason: c.reason })), `budget_allocation_${selectedStrategy}`); addToast("success", "Allocation data exported"); }}><Download className="w-3 h-3" /> Export CSV</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left py-2 px-3">Campaign</th>
                  <th className="text-right py-2 px-3">Current Budget</th>
                  <th className="text-right py-2 px-3">Allocated</th>
                  <th className="text-right py-2 px-3">Shift</th>
                  <th className="text-right py-2 px-3">Expected Revenue</th>
                  <th className="text-right py-2 px-3">Expected ROAS</th>
                  <th className="text-left py-2 px-3">Reason</th>
                </tr>
              </thead>
              <tbody>
                {plan.campaigns.map((c: any) => (
                  <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-2 px-3 text-white font-medium">{c.name}</td>
                    <td className="py-2 px-3 text-right text-gray-300">${c.currentBudget.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-n0va-400">${c.allocatedBudget.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">
                      <span className={c.shift > 0 ? "text-green-400" : c.shift < 0 ? "text-red-400" : "text-gray-400"}>{c.shift > 0 ? "+" : ""}{c.shift}%</span>
                    </td>
                    <td className="py-2 px-3 text-right text-green-400">${c.expectedRevenue.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-n0va-400">{c.expectedRoas.toFixed(2)}x</td>
                    <td className="py-2 px-3 text-gray-400 max-w-xs truncate">{c.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Optimization History */}
      <div className="card">
        <button onClick={async () => { setHistoryOpen(!historyOpen); if (!historyOpen && history.length === 0) { setHistoryLoading(true); try { const h = await api.optimizer.budgetHistory(); setHistory(h || []); } catch {} setHistoryLoading(false); }}} className="w-full flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2"><History className="w-5 h-5 text-n0va-400" /> Optimization History</h3>
          {historyOpen ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
        </button>
        {historyOpen && (
          <div className="mt-4">
            {historyLoading ? (
              <div className="flex items-center justify-center py-8"><RefreshCw className="w-5 h-5 animate-spin text-n0va-400" /></div>
            ) : history.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No optimization history yet. Run a budget optimization to save results.</p>
            ) : (
              <div className="space-y-3">
                {history.map((h: any, i: number) => (
                  <div key={h._id || i} className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium capitalize px-2 py-0.5 rounded-full bg-n0va-500/20 text-n0va-400">{h.strategy || "balanced"}</span>
                        <span className="text-xs text-gray-500">{h.createdAt ? new Date(h.createdAt).toLocaleString() : "—"}</span>
                      </div>
                      <span className="text-sm font-semibold text-white">{(h.expectedPortfolioRoas || 0).toFixed(2)}x ROAS</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><p className="text-[10px] text-gray-500">Current Budget</p><p className="text-sm font-medium text-white">${(h.totalCurrentBudget || 0).toLocaleString()}</p></div>
                      <div><p className="text-[10px] text-gray-500">Recommended</p><p className="text-sm font-medium text-n0va-400">${(h.totalRecommendedBudget || 0).toLocaleString()}</p></div>
                      <div><p className="text-[10px] text-gray-500">Change</p><p className={`text-sm font-medium ${(h.totalChangePercent || 0) > 0 ? "text-green-400" : "text-red-400"}`}>{(h.totalChangePercent || 0) > 0 ? "+" : ""}{(h.totalChangePercent || 0).toFixed(1)}%</p></div>
                    </div>
                    {h.recommendations && h.recommendations.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-700">
                        <p className="text-[10px] text-gray-500 mb-1">Recommendations</p>
                        <div className="flex flex-wrap gap-1.5">
                          {h.recommendations.map((r: any, ri: number) => (
                            <span key={ri} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">{r.campaignName || r.recommendation}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Strategy Comparison — Revenue</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summaryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="strategy" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }} />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {summaryData.map((s) => (<Cell key={s.key} fill={strategyColors[s.key]} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">When to Use Each Strategy</h3>
          <div className="space-y-3">
            <div className="p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2 mb-1"><div className="w-2.5 h-2.5 rounded-full bg-green-500" /><span className="text-sm text-white font-medium">Conservative</span></div>
              <p className="text-xs text-gray-400">Prioritize profitability over growth. Best for mature campaigns with strict ROAS targets. Minimizes downside risk by pulling budget from underperformers and concentrating on proven winners.</p>
            </div>
            <div className="p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2 mb-1"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /><span className="text-sm text-white font-medium">Balanced</span></div>
              <p className="text-xs text-gray-400">Equal weight on performance and growth. Ideal for diversified portfolios. Maintains base budget for all campaigns while reallocating marginal spend based on efficiency signals.</p>
            </div>
            <div className="p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2 mb-1"><div className="w-2.5 h-2.5 rounded-full bg-purple-500" /><span className="text-sm text-white font-medium">Aggressive</span></div>
              <p className="text-xs text-gray-400">Maximize revenue regardless of efficiency. Best for new product launches or market share grabs. Heavily funds high-ceiling campaigns even at lower ROAS, starves low-potential campaigns.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
