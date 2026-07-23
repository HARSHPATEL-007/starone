import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, Cell } from "recharts";
import { api } from "../api/client";
import { TrendingUp, DollarSign, Target, RefreshCw, CheckCircle } from "lucide-react";
import { useToast } from "../components/Toast";

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
  const [plans, setPlans] = useState<Record<string, BudgetPlan> | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string>("balanced");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await api.optimizer.budgetMock();
      setPlans(res);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-n0va-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!plans) {
    return <div className="text-gray-400 text-center py-12">No budget data available</div>;
  }

  const strategies = ["conservative", "balanced", "aggressive"] as const;
  const strategyLabels: Record<string, string> = {
    conservative: "Conservative",
    balanced: "Balanced",
    aggressive: "Aggressive",
  };
  const strategyColors: Record<string, string> = {
    conservative: "#10b981",
    balanced: "#1a6dff",
    aggressive: "#8b5cf6",
  };

  const plan = plans[selectedStrategy] || plans.balanced;
  const campaignNames = plan.campaigns.map((c) => c.name);

  const comparisonData = campaignNames.map((name) => {
    const row: Record<string, any> = { name };
    for (const s of strategies) {
      const p = plans[s];
      if (p) {
        const c = p.campaigns.find((c) => c.name === name);
        row[s] = c ? c.allocatedBudget : 0;
      }
    }
    return row;
  });

  const summaryData = strategies
    .filter((s) => plans[s])
    .map((s) => ({
      strategy: strategyLabels[s],
      key: s,
      budget: plans[s].totalBudget,
      revenue: plans[s].totalExpectedRevenue,
      roas: plans[s].expectedRoas,
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
          const plan = plans?.[selectedStrategy];
          if (!plan) { setApplying(false); return; }
          const results = { success: 0, failed: 0 };
          for (const c of plan.campaigns) {
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
          <button
            key={s}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
              selectedStrategy === s
                ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400"
                : "border-gray-700 text-gray-500 hover:text-gray-300"
            }`}
            onClick={() => setSelectedStrategy(s)}
          >
            <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: strategyColors[s] }} />
            {strategyLabels[s]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summaryData.map((s) => (
          <div
            key={s.key}
            className={`card cursor-pointer transition-all ${
              selectedStrategy === s.key ? "ring-2 ring-n0va-500/50" : ""
            }`}
            onClick={() => setSelectedStrategy(s.key)}
          >
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
          <h3 className="text-lg font-semibold text-white mb-4">
            {strategyLabels[selectedStrategy]} — Budget Allocation
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={plan.campaigns.map((c) => ({
                name: c.name,
                Current: c.currentBudget,
                Allocated: c.allocatedBudget,
              }))}>
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

      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">
          {strategyLabels[selectedStrategy]} — Detailed Allocation
        </h3>
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
              {plan.campaigns.map((c) => (
                <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-2 px-3 text-white font-medium">{c.name}</td>
                  <td className="py-2 px-3 text-right text-gray-300">${c.currentBudget.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-n0va-400">${c.allocatedBudget.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right">
                    <span className={c.shift > 0 ? "text-green-400" : c.shift < 0 ? "text-red-400" : "text-gray-400"}>
                      {c.shift > 0 ? "+" : ""}{c.shift}%
                    </span>
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
                  {summaryData.map((s) => (
                    <Cell key={s.key} fill={strategyColors[s.key]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">When to Use Each Strategy</h3>
          <div className="space-y-3">
            <div className="p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-sm text-white font-medium">Conservative</span>
              </div>
              <p className="text-xs text-gray-400">Prioritize profitability over growth. Best for mature campaigns with strict ROAS targets. Minimizes downside risk by pulling budget from underperformers and concentrating on proven winners.</p>
            </div>
            <div className="p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-sm text-white font-medium">Balanced</span>
              </div>
              <p className="text-xs text-gray-400">Equal weight on performance and growth. Ideal for diversified portfolios. Maintains base budget for all campaigns while reallocating marginal spend based on efficiency signals.</p>
            </div>
            <div className="p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span className="text-sm text-white font-medium">Aggressive</span>
              </div>
              <p className="text-xs text-gray-400">Maximize revenue regardless of efficiency. Best for new product launches or market share grabs. Heavily funds high-ceiling campaigns even at lower ROAS, starves low-potential campaigns.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
