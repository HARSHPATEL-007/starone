import { useState } from "react";
import { DollarSign, BarChart3, TrendingUp, Target, ArrowUp, ArrowDown, Equal, Plus, Trash2, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard, SkeletonTable, SkeletonChart } from "../components/Skeleton";

type Objective = "conversions" | "revenue";

interface CampaignRow {
  id: string;
  name: string;
  currentBudget: number;
  currentConversions: number;
  currentRevenue: number;
  minBudget: number | null;
  maxBudget: number | null;
}

interface AllocationResult {
  campaigns: {
    name: string;
    currentBudget: number;
    allocatedBudget: number;
    expectedConversions: number;
    expectedRevenue: number;
    marginalRoi: number;
    constraint: "min" | "max" | "none";
  }[];
  totalExpectedConversions: number;
  totalExpectedRevenue: number;
  weightedAvgMarginalRoi: number;
  reallocationIntensity: number;
  iterations: number;
  converged: boolean;
}

interface FrontierPoint {
  budgetPercent: number;
  totalConversions: number;
  totalRevenue: number;
  marginalRoi: number;
  isOptimal: boolean;
}

interface FrontierResult {
  points: FrontierPoint[];
  optimalBudgetPercent: number;
  optimalConversions: number;
  optimalRevenue: number;
}

let campaignIdCounter = 0;

const emptyCampaign = (): CampaignRow => ({
  id: `camp_${++campaignIdCounter}`,
  name: "",
  currentBudget: 0,
  currentConversions: 0,
  currentRevenue: 0,
  minBudget: null,
  maxBudget: null,
});

export default function PortfolioBudgetOptimizer() {
  const { addToast } = useToast();
  const [tab, setTab] = useState<"allocation" | "frontier">("allocation");
  const [totalBudget, setTotalBudget] = useState(100000);
  const [objective, setObjective] = useState<Objective>("conversions");
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([emptyCampaign(), emptyCampaign(), emptyCampaign()]);

  const [allocating, setAllocating] = useState(false);
  const [allocationResult, setAllocationResult] = useState<AllocationResult | null>(null);

  const [computingFrontier, setComputingFrontier] = useState(false);
  const [frontierResult, setFrontierResult] = useState<FrontierResult | null>(null);

  const [expandedCampaigns, setExpandedCampaigns] = useState(true);

  function addCampaign() {
    setCampaigns([...campaigns, emptyCampaign()]);
  }

  function removeCampaign(id: string) {
    if (campaigns.length <= 1) return;
    setCampaigns(campaigns.filter((c) => c.id !== id));
  }

  function updateCampaign(id: string, field: keyof CampaignRow, value: string | number | null) {
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updated = { ...c, [field]: value };
        if (field === "currentBudget" || field === "currentConversions" || field === "currentRevenue") {
          const num = typeof value === "number" ? value : parseFloat(String(value)) || 0;
          updated[field] = num;
        }
        return updated;
      })
    );
  }

  function computeCurrentTotal() {
    return campaigns.reduce((sum, c) => sum + c.currentBudget, 0);
  }

  async function handleRunOptimization() {
    const payload = {
      totalBudget,
      objective,
      campaigns: campaigns.map((c) => ({
        name: c.name || `Campaign ${c.id}`,
        currentBudget: c.currentBudget,
        currentConversions: c.currentConversions,
        currentRevenue: c.currentRevenue,
        ...(c.minBudget !== null ? { minBudget: c.minBudget } : {}),
        ...(c.maxBudget !== null ? { maxBudget: c.maxBudget } : {}),
      })),
    };

    setAllocating(true);
    setAllocationResult(null);
    try {
      const res: AllocationResult = await api.portfolioBudgetOptimizer.allocate(payload);
      setAllocationResult(res);
      addToast("success", "Optimization complete", `${res.converged ? "Converged" : "Did not converge"} in ${res.iterations} iterations`);
    } catch (e: any) {
      addToast("error", "Optimization failed", e?.message || "Unknown error");
    }
    setAllocating(false);
  }

  async function handleComputeFrontier() {
    const payload = {
      totalBudget,
      objective,
      campaigns: campaigns.map((c) => ({
        name: c.name || `Campaign ${c.id}`,
        currentBudget: c.currentBudget,
        currentConversions: c.currentConversions,
        currentRevenue: c.currentRevenue,
        ...(c.minBudget !== null ? { minBudget: c.minBudget } : {}),
        ...(c.maxBudget !== null ? { maxBudget: c.maxBudget } : {}),
      })),
    };

    setComputingFrontier(true);
    setFrontierResult(null);
    try {
      const res: FrontierResult = await api.portfolioBudgetOptimizer.efficientFrontier(payload);
      setFrontierResult(res);
      addToast("success", "Frontier computed", `${res.points.length} budget levels analyzed`);
    } catch (e: any) {
      addToast("error", "Frontier computation failed", e?.message || "Unknown error");
    }
    setComputingFrontier(false);
  }

  const campaignTotal = computeCurrentTotal();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Portfolio Budget Optimizer</h1>
          <p className="text-gray-500 mt-1">Optimize budget allocation across campaigns to maximize {objective === "conversions" ? "conversions" : "revenue"}</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-800 pb-1">
        <button
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${tab === "allocation" ? "bg-gray-800 text-white border border-b-0 border-gray-700" : "text-gray-500 hover:text-gray-300"}`}
          onClick={() => setTab("allocation")}
        >
          <BarChart3 className="w-4 h-4 inline mr-2" />
          Allocation
        </button>
        <button
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${tab === "frontier" ? "bg-gray-800 text-white border border-b-0 border-gray-700" : "text-gray-500 hover:text-gray-300"}`}
          onClick={() => setTab("frontier")}
        >
          <TrendingUp className="w-4 h-4 inline mr-2" />
          Efficient Frontier
        </button>
      </div>

      {/* Shared Input Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-n0va-400" />
            Budget Configuration
          </h3>
          <button
            className="btn-ghost text-xs flex items-center gap-1"
            onClick={() => setExpandedCampaigns(!expandedCampaigns)}
          >
            {expandedCampaigns ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {expandedCampaigns ? "Collapse" : "Expand"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Total Budget</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
              <input
                type="number"
                className="w-full pl-7 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-n0va-500"
                value={totalBudget}
                onChange={(e) => setTotalBudget(Math.max(0, parseInt(e.target.value) || 0))}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Objective</label>
            <select
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-n0va-500"
              value={objective}
              onChange={(e) => setObjective(e.target.value as Objective)}
            >
              <option value="conversions">Maximize Conversions</option>
              <option value="revenue">Maximize Revenue</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Current Total</label>
            <div className="px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm">
              <span className="text-white font-medium">${campaignTotal.toLocaleString()}</span>
              {totalBudget !== campaignTotal && (
                <span className={`ml-2 text-xs ${totalBudget > campaignTotal ? "text-green-400" : "text-red-400"}`}>
                  {totalBudget > campaignTotal ? "+" : ""}${(totalBudget - campaignTotal).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {expandedCampaigns && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400 font-medium">Campaigns ({campaigns.length})</span>
            </div>
            {campaigns.map((c, i) => (
              <div key={c.id} className="bg-gray-800/50 rounded-lg p-3">
                <div className="grid grid-cols-2 md:grid-cols-7 gap-3 items-end">
                  <div className="col-span-2 md:col-span-1">
                    {i === 0 && <label className="text-[10px] text-gray-500 mb-1 block">Name</label>}
                    <input
                      type="text"
                      className="w-full px-2 py-1.5 bg-gray-700/50 border border-gray-600 rounded text-white text-xs focus:outline-none focus:border-n0va-500"
                      placeholder={`Campaign ${i + 1}`}
                      value={c.name}
                      onChange={(e) => updateCampaign(c.id, "name", e.target.value)}
                    />
                  </div>
                  <div>
                    {i === 0 && <label className="text-[10px] text-gray-500 mb-1 block">Current Budget</label>}
                    <input
                      type="number"
                      className="w-full px-2 py-1.5 bg-gray-700/50 border border-gray-600 rounded text-white text-xs focus:outline-none focus:border-n0va-500"
                      value={c.currentBudget || ""}
                      onChange={(e) => updateCampaign(c.id, "currentBudget", e.target.value)}
                    />
                  </div>
                  <div>
                    {i === 0 && <label className="text-[10px] text-gray-500 mb-1 block">Conversions</label>}
                    <input
                      type="number"
                      className="w-full px-2 py-1.5 bg-gray-700/50 border border-gray-600 rounded text-white text-xs focus:outline-none focus:border-n0va-500"
                      value={c.currentConversions || ""}
                      onChange={(e) => updateCampaign(c.id, "currentConversions", e.target.value)}
                    />
                  </div>
                  <div>
                    {i === 0 && <label className="text-[10px] text-gray-500 mb-1 block">Revenue</label>}
                    <input
                      type="number"
                      className="w-full px-2 py-1.5 bg-gray-700/50 border border-gray-600 rounded text-white text-xs focus:outline-none focus:border-n0va-500"
                      value={c.currentRevenue || ""}
                      onChange={(e) => updateCampaign(c.id, "currentRevenue", e.target.value)}
                    />
                  </div>
                  <div>
                    {i === 0 && <label className="text-[10px] text-gray-500 mb-1 block">Min Budget</label>}
                    <input
                      type="number"
                      className="w-full px-2 py-1.5 bg-gray-700/50 border border-gray-600 rounded text-white text-xs focus:outline-none focus:border-n0va-500"
                      value={c.minBudget ?? ""}
                      placeholder="—"
                      onChange={(e) => updateCampaign(c.id, "minBudget", e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </div>
                  <div>
                    {i === 0 && <label className="text-[10px] text-gray-500 mb-1 block">Max Budget</label>}
                    <input
                      type="number"
                      className="w-full px-2 py-1.5 bg-gray-700/50 border border-gray-600 rounded text-white text-xs focus:outline-none focus:border-n0va-500"
                      value={c.maxBudget ?? ""}
                      placeholder="—"
                      onChange={(e) => updateCampaign(c.id, "maxBudget", e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </div>
                  <div>
                    {i === 0 && <label className="text-[10px] text-gray-500 mb-1 block">&nbsp;</label>}
                    <button
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-30"
                      onClick={() => removeCampaign(c.id)}
                      disabled={campaigns.length <= 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <button className="btn-ghost text-sm flex items-center gap-1.5 text-n0va-400" onClick={addCampaign}>
              <Plus className="w-3.5 h-3.5" /> Add Campaign
            </button>
          </div>
        )}

        <div className="mt-4 flex gap-3">
          {tab === "allocation" && (
            <button
              className="btn-primary flex items-center gap-2"
              onClick={handleRunOptimization}
              disabled={allocating || campaigns.length === 0}
            >
              {allocating ? (
                <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Optimizing...</>
              ) : (
                <><TrendingUp className="w-4 h-4" /> Run Optimization</>
              )}
            </button>
          )}
          {tab === "frontier" && (
            <button
              className="btn-primary flex items-center gap-2"
              onClick={handleComputeFrontier}
              disabled={computingFrontier || campaigns.length === 0}
            >
              {computingFrontier ? (
                <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Computing...</>
              ) : (
                <><BarChart3 className="w-4 h-4" /> Compute Frontier</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {tab === "allocation" && (
        <AllocationTab
          allocating={allocating}
          allocationResult={allocationResult}
          onRerun={handleRunOptimization}
        />
      )}

      {tab === "frontier" && (
        <FrontierTab
          computingFrontier={computingFrontier}
          frontierResult={frontierResult}
          objective={objective}
        />
      )}
    </div>
  );
}

function AllocationTab({
  allocating,
  allocationResult,
  onRerun,
}: {
  allocating: boolean;
  allocationResult: AllocationResult | null;
  onRerun: () => void;
}) {
  if (allocating) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
        <SkeletonTable rows={6} />
      </div>
    );
  }

  if (!allocationResult) {
    return (
      <div className="card text-center py-12">
        <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Configure your budget and campaigns, then run the optimization to see results.</p>
      </div>
    );
  }

  const r = allocationResult;
  const maxBudget = Math.max(...r.campaigns.map((c) => Math.max(c.currentBudget, c.allocatedBudget)), 1);

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-n0va-400" />
            <span className="text-xs text-gray-500">Expected Conversions</span>
          </div>
          <p className="text-2xl font-bold text-white">{Math.round(r.totalExpectedConversions).toLocaleString()}</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-500">Expected Revenue</span>
          </div>
          <p className="text-2xl font-bold text-white">${Math.round(r.totalExpectedRevenue).toLocaleString()}</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-500">Weighted Avg Marginal ROI</span>
          </div>
          <p className="text-2xl font-bold text-white">{(r.weightedAvgMarginalRoi * 100).toFixed(1)}%</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-gray-500">Reallocation Intensity</span>
          </div>
          <p className="text-2xl font-bold text-white">{r.reallocationIntensity.toFixed(1)}%</p>
          <p className="text-[10px] text-gray-600 mt-0.5">
            {r.reallocationIntensity < 10 ? "Minimal change" : r.reallocationIntensity < 30 ? "Moderate shift" : "Significant reallocation"}
          </p>
        </div>
      </div>

      {/* Convergence Info */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className={`px-2 py-0.5 rounded-full ${r.converged ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>
          {r.converged ? "Converged" : "Did not converge"}
        </span>
        <span>{r.iterations} iterations</span>
        <button className="btn-ghost text-xs flex items-center gap-1" onClick={onRerun}>
          <RefreshCw className="w-3 h-3" /> Rerun
        </button>
      </div>

      {/* Campaign Allocation Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Campaign Allocation</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left py-2 px-3">Campaign</th>
                <th className="text-right py-2 px-3">Current Budget</th>
                <th className="text-right py-2 px-3">Allocated</th>
                <th className="text-right py-2 px-3">Delta</th>
                <th className="text-right py-2 px-3">Delta %</th>
                <th className="text-right py-2 px-3">Exp. Conversions</th>
                <th className="text-right py-2 px-3">Exp. Revenue</th>
                <th className="text-right py-2 px-3">Marginal ROI</th>
                <th className="text-center py-2 px-3">Constraint</th>
              </tr>
            </thead>
            <tbody>
              {r.campaigns.map((c, i) => {
                const delta = c.allocatedBudget - c.currentBudget;
                const deltaPct = c.currentBudget > 0 ? (delta / c.currentBudget) * 100 : 0;
                const DeltaIcon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Equal;
                const deltaColor = delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "text-gray-400";
                const constraintLabel = c.constraint === "min" ? "Floor" : c.constraint === "max" ? "Cap" : "—";
                const constraintColor = c.constraint === "min" ? "text-yellow-400 bg-yellow-500/10" : c.constraint === "max" ? "text-orange-400 bg-orange-500/10" : "text-gray-500";
                return (
                  <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-2.5 px-3 text-white font-medium">{c.name}</td>
                    <td className="py-2.5 px-3 text-right text-gray-300">${c.currentBudget.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right text-n0va-400">${c.allocatedBudget.toLocaleString()}</td>
                    <td className={`py-2.5 px-3 text-right ${deltaColor}`}>
                      <span className="flex items-center justify-end gap-1">
                        <DeltaIcon className="w-3 h-3" />
                        {delta > 0 ? "+" : ""}${delta.toLocaleString()}
                      </span>
                    </td>
                    <td className={`py-2.5 px-3 text-right ${deltaColor}`}>
                      {delta > 0 ? "+" : ""}{deltaPct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-300">{c.expectedConversions.toFixed(1)}</td>
                    <td className="py-2.5 px-3 text-right text-green-400">${Math.round(c.expectedRevenue).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right text-purple-400">{(c.marginalRoi * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`text-[11px] px-1.5 py-0.5 rounded ${constraintColor}`}>{constraintLabel}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Budget Comparison Bars */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Budget Comparison</h3>
        <div className="space-y-4">
          {r.campaigns.map((c, i) => {
            const currentW = (c.currentBudget / maxBudget) * 100;
            const allocatedW = (c.allocatedBudget / maxBudget) * 100;
            return (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white font-medium">{c.name}</span>
                  <span className="text-xs text-gray-500">${c.currentBudget.toLocaleString()} → ${c.allocatedBudget.toLocaleString()}</span>
                </div>
                <div className="relative h-7 bg-gray-800 rounded overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gray-600 rounded transition-all"
                    style={{ width: `${currentW}%` }}
                  />
                  <div
                    className="absolute inset-y-0 bg-n0va-500/70 rounded transition-all"
                    style={{ width: `${allocatedW}%` }}
                  />
                  {c.allocatedBudget > c.currentBudget && (
                    <div
                      className="absolute inset-y-0 bg-green-500/40 rounded-r transition-all"
                      style={{ left: `${currentW}%`, width: `${Math.max(allocatedW - currentW, 0)}%` }}
                    />
                  )}
                  {c.allocatedBudget < c.currentBudget && (
                    <div
                      className="absolute inset-y-0 bg-red-500/40 rounded-r transition-all"
                      style={{ left: `${allocatedW}%`, width: `${Math.max(currentW - allocatedW, 0)}%` }}
                    />
                  )}
                  <div className="absolute inset-0 flex items-center px-2">
                    <span className="text-[10px] text-gray-300 font-medium drop-shadow-lg">
                      ${c.currentBudget.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-gray-400 mx-1 drop-shadow-lg">→</span>
                    <span className="text-[10px] text-white font-semibold drop-shadow-lg">
                      ${c.allocatedBudget.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-4 mt-0.5">
                  <span className="flex items-center gap-1 text-[10px] text-gray-600">
                    <span className="w-2 h-2 rounded-sm bg-gray-600 inline-block" /> Current
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-gray-600">
                    <span className="w-2 h-2 rounded-sm bg-n0va-500/70 inline-block" /> Allocated
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FrontierTab({
  computingFrontier,
  frontierResult,
  objective,
}: {
  computingFrontier: boolean;
  frontierResult: FrontierResult | null;
  objective: Objective;
}) {
  if (computingFrontier) {
    return (
      <div className="space-y-6">
        <SkeletonChart />
        <SkeletonTable rows={8} />
      </div>
    );
  }

  if (!frontierResult) {
    return (
      <div className="card text-center py-12">
        <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Configure your budget and campaigns, then compute the efficient frontier.</p>
      </div>
    );
  }

  const points = frontierResult.points;
  const optPct = frontierResult.optimalBudgetPercent;

  if (points.length < 2) {
    return (
      <div className="card text-center py-8">
        <p className="text-gray-500 text-sm">Insufficient data points to render the frontier chart.</p>
      </div>
    );
  }

  const svgW = 700;
  const svgH = 320;
  const pad = { top: 20, right: 20, bottom: 45, left: 55 };
  const plotW = svgW - pad.left - pad.right;
  const plotH = svgH - pad.top - pad.bottom;

  const yKey = objective === "conversions" ? "totalConversions" : "totalRevenue";
  const yLabel = objective === "conversions" ? "Total Conversions" : "Total Revenue";

  const xMin = Math.min(...points.map((p) => p.budgetPercent));
  const xMax = Math.max(...points.map((p) => p.budgetPercent));
  const yMin = Math.min(...points.map((p) => p[yKey]));
  const yMax = Math.max(...points.map((p) => p[yKey]));
  const yRange = yMax - yMin || 1;
  const xRange = xMax - xMin || 1;

  function xScale(v: number) { return pad.left + ((v - xMin) / xRange) * plotW; }
  function yScale(v: number) { return pad.top + plotH - ((v - yMin) / yRange) * plotH; }

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${xScale(p.budgetPercent).toFixed(1)},${yScale(p[yKey]).toFixed(1)}`).join(" ");

  const optPoint = points.find((p) => p.isOptimal) || points[Math.floor(points.length / 2)];
  const optX = xScale(optPoint.budgetPercent);
  const optY = yScale(optPoint[yKey]);

  const xTicks = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150].filter((v) => v >= xMin && v <= xMax);
  const yTicks = Array.from({ length: 5 }, (_, i) => yMin + (yRange / 4) * i);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-n0va-400" />
            <span className="text-xs text-gray-500">Optimal Budget</span>
          </div>
          <p className="text-2xl font-bold text-white">{frontierResult.optimalBudgetPercent}%</p>
          <p className="text-xs text-gray-600">of base budget</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            {objective === "conversions" ? <Target className="w-4 h-4 text-green-400" /> : <DollarSign className="w-4 h-4 text-green-400" />}
            <span className="text-xs text-gray-500">Optimal {objective === "conversions" ? "Conversions" : "Revenue"}</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {objective === "conversions"
              ? Math.round(frontierResult.optimalConversions).toLocaleString()
              : `$${Math.round(frontierResult.optimalRevenue).toLocaleString()}`
            }
          </p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-500">Optimal Point</span>
          </div>
          <p className="text-sm text-gray-300">Marginal benefit decline</p>
          <p className="text-xs text-gray-600">Budget before diminishing returns</p>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Efficient Frontier</h3>
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-3xl" style={{ minHeight: 280 }}>
            {/* Grid lines */}
            {yTicks.map((v) => (
              <line key={v} x1={pad.left} y1={yScale(v)} x2={pad.left + plotW} y2={yScale(v)} stroke="#1f2937" strokeWidth={1} />
            ))}
            {xTicks.map((v) => (
              <line key={v} x1={xScale(v)} y1={pad.top} x2={xScale(v)} y2={pad.top + plotH} stroke="#1f2937" strokeWidth={1} />
            ))}

            {/* Y axis label */}
            <text x={15} y={pad.top + plotH / 2} textAnchor="middle" fill="#6b7280" fontSize={11} transform={`rotate(-90, 15, ${pad.top + plotH / 2})`}>
              {yLabel}
            </text>

            {/* Y axis ticks */}
            {yTicks.map((v) => (
              <text key={v} x={pad.left - 8} y={yScale(v) + 4} textAnchor="end" fill="#6b7280" fontSize={10}>
                {objective === "conversions" ? Math.round(v).toLocaleString() : `$${Math.round(v).toLocaleString()}`}
              </text>
            ))}

            {/* X axis ticks */}
            {xTicks.map((v) => (
              <text key={v} x={xScale(v)} y={pad.top + plotH + 16} textAnchor="middle" fill="#6b7280" fontSize={10}>
                {v}%
              </text>
            ))}

            {/* Line */}
            <path d={pathD} fill="none" stroke="#1a6dff" strokeWidth={2.5} strokeLinejoin="round" />

            {/* Area under curve */}
            <path d={`${pathD} L${xScale(xMax)},${pad.top + plotH} L${xScale(xMin)},${pad.top + plotH} Z`} fill="url(#gradient)" opacity={0.15} />

            {/* Points */}
            {points.map((p, i) => (
              <circle
                key={i}
                cx={xScale(p.budgetPercent)}
                cy={yScale(p[yKey])}
                r={p.isOptimal ? 6 : 3.5}
                fill={p.isOptimal ? "#10b981" : "#1a6dff"}
                stroke={p.isOptimal ? "#10b981" : "none"}
                strokeWidth={p.isOptimal ? 2 : 0}
              />
            ))}

            {/* Highlight optimal point */}
            {optPoint && (
              <>
                <line x1={optX} y1={optY} x2={optX} y2={pad.top + plotH} stroke="#10b981" strokeWidth={1} strokeDasharray="4,3" />
                <line x1={pad.left} y1={optY} x2={optX} y2={optY} stroke="#10b981" strokeWidth={1} strokeDasharray="4,3" />
                <text x={optX + 8} y={optY - 6} fill="#10b981" fontSize={10} fontWeight={600}>
                  Optimal {optPoint.budgetPercent}%
                </text>
              </>
            )}

            <defs>
              <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1a6dff" />
                <stop offset="100%" stopColor="#1a6dff" stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Y axis */}
            <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + plotH} stroke="#374151" strokeWidth={1} />
            {/* X axis */}
            <line x1={pad.left} y1={pad.top + plotH} x2={pad.left + plotW} y2={pad.top + plotH} stroke="#374151" strokeWidth={1} />
          </svg>
        </div>
      </div>

      {/* Frontier Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Budget Levels</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left py-2 px-3">Budget Level</th>
                <th className="text-right py-2 px-3">Conversions</th>
                <th className="text-right py-2 px-3">Revenue</th>
                <th className="text-right py-2 px-3">Marginal ROI</th>
                <th className="text-center py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {points.map((p, i) => (
                <tr key={i} className={`border-b border-gray-800/50 hover:bg-gray-800/30 ${p.isOptimal ? "bg-green-500/5" : ""}`}>
                  <td className="py-2 px-3 text-white font-medium">{p.budgetPercent}%</td>
                  <td className="py-2 px-3 text-right text-gray-300">{Math.round(p.totalConversions).toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-green-400">${Math.round(p.totalRevenue).toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-purple-400">{(p.marginalRoi * 100).toFixed(1)}%</td>
                  <td className="py-2 px-3 text-center">
                    {p.isOptimal && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 font-medium">Optimal</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
