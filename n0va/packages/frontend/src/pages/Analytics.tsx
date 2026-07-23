import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

const COLORS = ["#1a6dff", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#ec4899"];

export default function Analytics() {
  const [crossPlatform, setCrossPlatform] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/analytics/cross-platform")
      .then((r) => r.json())
      .then(setCrossPlatform)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-n0va-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const platforms = crossPlatform?.platforms || [];
  const budgets = crossPlatform?.budgetOverview || [];

  const spendPieData = platforms.map((p: any) => ({ name: p.platform, value: p.spend }));
  const revBarData = platforms.map((p: any) => ({ name: p.platform, Revenue: p.revenue, Spend: p.spend }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Cross-Platform Analytics</h1>
        <p className="text-gray-500 mt-1">Compare performance across all connected platforms</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {platforms.map((p: any, i: number) => (
          <div key={p.platform} className="card">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
              <h3 className="text-white font-semibold">{p.platform}</h3>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Spend</span><span className="text-white">${(p.spend / 1000).toFixed(1)}K</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Revenue</span><span className="text-green-400">${(p.revenue / 1000).toFixed(1)}K</span></div>
              <div className="flex justify-between"><span className="text-gray-500">ROAS</span><span className="text-n0va-400">{p.roas?.toFixed(2) || "0.00"}x</span></div>
              <div className="flex justify-between"><span className="text-gray-500">CTR</span><span className="text-white">{p.ctr?.toFixed(2) || "0.00"}%</span></div>
              <div className="flex justify-between"><span className="text-gray-500">CPC</span><span className="text-white">${p.cpc?.toFixed(2) || "0.00"}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Impressions</span><span className="text-white">{(p.impressions / 1000).toFixed(0)}K</span></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue vs Spend by Platform</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px", color: "#f3f4f6" }} />
                <Bar dataKey="Revenue" fill="#1a6dff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Spend" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Spend Distribution</h3>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={spendPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {spendPieData.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px", color: "#f3f4f6" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {budgets.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Budget Overview</h3>
          <div className="space-y-3">
            {budgets.map((b: any) => (
              <div key={b.name} className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white truncate">{b.name}</span>
                    <span className={`text-xs ${b.status === "active" ? "text-green-400" : b.status === "paused" ? "text-yellow-400" : "text-gray-500"}`}>{b.status}</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5">
                    <div className="bg-n0va-600 h-1.5 rounded-full" style={{ width: `${b.budget > 0 ? (b.spent / b.budget) * 100 : 0}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                    <span>${(b.spent / 1000).toFixed(1)}K spent</span>
                    <span>${(b.remaining / 1000).toFixed(1)}K left</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
