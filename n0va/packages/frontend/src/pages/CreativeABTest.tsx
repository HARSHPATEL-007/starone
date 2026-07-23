import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { api } from "../api/client";
import { RefreshCw, CheckCircle, XCircle, MinusCircle } from "lucide-react";
import { SkeletonCard } from "../components/Skeleton";

interface ABTestVariant {
  id: string;
  name: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  ctr: number;
  cvr: number;
  roas: number;
}

interface ABTestResult {
  testId: string;
  testName: string;
  status: "running" | "completed" | "paused";
  confidence: number;
  winner: string | null;
  variants: ABTestVariant[];
  recommendation: string;
}

export default function CreativeABTest() {
  const [tests, setTests] = useState<ABTestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState<ABTestResult | null>(null);
  const [testType, setTestType] = useState<"creative" | "audience">("creative");

  useEffect(() => {
    loadData();
  }, [testType]);

  async function loadData() {
    setLoading(true);
    try {
      const data = await api.optimizer.abTest(testType);
      setTests(Array.isArray(data) ? data : [data]);
      if (Array.isArray(data) && data.length > 0) {
        setSelectedTest(data[0]);
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="space-y-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  if (tests.length === 0) {
    return (
      <div className="text-gray-400 text-center py-12">
        <p className="mb-4">No A/B test data available</p>
        <button className="btn-secondary flex items-center gap-2 mx-auto" onClick={loadData}>
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const currentTest = selectedTest || tests[0];

  const winnerVariant = currentTest.winner
    ? currentTest.variants.find((v) => v.id === currentTest.winner)
    : null;

  const statusColors = {
    running: "text-blue-400 bg-blue-500/10",
    completed: "text-green-400 bg-green-500/10",
    paused: "text-yellow-400 bg-yellow-500/10",
  };

  const statusIcons = {
    running: null,
    completed: <CheckCircle className="w-3.5 h-3.5" />,
    paused: <MinusCircle className="w-3.5 h-3.5" />,
  };

  const chartData = currentTest.variants.map((v) => ({
    name: v.name,
    CTR: parseFloat((v.ctr * 100).toFixed(2)),
    CVR: parseFloat((v.cvr * 100).toFixed(2)),
    ROAS: parseFloat(v.roas.toFixed(2)),
    isWinner: v.id === currentTest.winner,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Creative A/B Testing</h1>
          <p className="text-gray-500 mt-1">Statistical significance testing for creatives and audiences</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white"
            value={testType}
            onChange={(e) => setTestType(e.target.value as "creative" | "audience")}
          >
            <option value="creative">Creative Tests</option>
            <option value="audience">Audience Tests</option>
          </select>
          <button className="btn-secondary flex items-center gap-2" onClick={loadData}>
            <RefreshCw className="w-4 h-4" /> New Sample
          </button>
        </div>
      </div>

      {tests.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {tests.map((t) => (
            <button
              key={t.testId}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                selectedTest?.testId === t.testId
                  ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400"
                  : "border-gray-700 text-gray-500"
              }`}
              onClick={() => setSelectedTest(t)}
            >
              {t.testName}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{currentTest.testName}</h3>
                <p className="text-xs text-gray-500 mt-1">Test ID: {currentTest.testId}</p>
              </div>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[currentTest.status]}`}>
                {statusIcons[currentTest.status]}
                <span className="capitalize">{currentTest.status}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Confidence</p>
                <p className={`text-xl font-bold ${currentTest.confidence >= 0.95 ? "text-green-400" : currentTest.confidence >= 0.8 ? "text-yellow-400" : "text-gray-400"}`}>
                  {(currentTest.confidence * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">Statistical significance</p>
              </div>
              <div className="text-center p-3 bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Winner</p>
                {winnerVariant ? (
                  <>
                    <p className="text-xl font-bold text-green-400">{winnerVariant.name}</p>
                    <p className="text-xs text-gray-500">+{winnerVariant.cvr > 0 ? ((winnerVariant.cvr - currentTest.variants.reduce((a, v) => a + v.cvr, 0) / currentTest.variants.length) * 100).toFixed(1) : "0.0"}% vs avg</p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-bold text-gray-400">Pending</p>
                    <p className="text-xs text-gray-500">Insufficient data</p>
                  </>
                )}
              </div>
              <div className="text-center p-3 bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Variants</p>
                <p className="text-xl font-bold text-white">{currentTest.variants.length}</p>
                <p className="text-xs text-gray-500">Being tested</p>
              </div>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
                  <YAxis stroke="#6b7280" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }} />
                  <Bar dataKey="CTR" fill="#1a6dff" radius={[4, 4, 0, 0]} name="CTR (%)" />
                  <Bar dataKey="CVR" fill="#10b981" radius={[4, 4, 0, 0]} name="CVR (%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Variant Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    <th className="text-left py-2 px-3">Variant</th>
                    <th className="text-right py-2 px-3">Impressions</th>
                    <th className="text-right py-2 px-3">Clicks</th>
                    <th className="text-right py-2 px-3">Conversions</th>
                    <th className="text-right py-2 px-3">CTR</th>
                    <th className="text-right py-2 px-3">CVR</th>
                    <th className="text-right py-2 px-3">Spend</th>
                    <th className="text-right py-2 px-3">Revenue</th>
                    <th className="text-right py-2 px-3">ROAS</th>
                    <th className="text-center py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTest.variants.map((v) => (
                    <tr key={v.id} className={`border-b border-gray-800/50 hover:bg-gray-800/30 ${v.id === currentTest.winner ? "bg-green-900/10" : ""}`}>
                      <td className="py-2 px-3 text-white font-medium">{v.name}</td>
                      <td className="py-2 px-3 text-right text-gray-300">{v.impressions.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right text-gray-300">{v.clicks.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right text-gray-300">{v.conversions}</td>
                      <td className="py-2 px-3 text-right text-n0va-400">{(v.ctr * 100).toFixed(2)}%</td>
                      <td className="py-2 px-3 text-right text-green-400">{(v.cvr * 100).toFixed(2)}%</td>
                      <td className="py-2 px-3 text-right text-yellow-400">${v.spend.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right text-green-400">${v.revenue.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right text-n0va-400">{v.roas.toFixed(2)}x</td>
                      <td className="py-2 px-3 text-center">
                        {v.id === currentTest.winner ? (
                          <CheckCircle className="w-4 h-4 text-green-400 inline" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-600 inline" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-3">Recommendation</h3>
            <p className="text-sm text-gray-300 leading-relaxed">{currentTest.recommendation}</p>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-3">ROAS by Variant</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis type="number" stroke="#6b7280" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={11} width={60} />
                  <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }} />
                  <Bar dataKey="ROAS" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.isWinner ? "#10b981" : "#8b5cf6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-3">Methodology</h3>
            <div className="space-y-2 text-sm text-gray-400">
              <p>• <strong className="text-gray-300">Multi-armed bandit</strong> allocation — dynamic traffic distribution</p>
              <p>• Bayesian <strong className="text-gray-300">E-value</strong> threshold at 95% for declaring winners</p>
              <p>• Sequential testing — no peeking penalty (always valid inference)</p>
              <p>• Minimum <strong className="text-gray-300">1,000 impressions</strong> per variant before evaluation</p>
              <p>• Primary metric: <strong className="text-gray-300">Conversion Rate (CVR)</strong></p>
              <p>• Secondary: CTR, ROAS, Revenue per Visitor</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
