import { useEffect, useState } from "react";
import { Shield, RefreshCw, Activity, Server, Link2, Zap, AlertTriangle, CheckCircle, Database, Cpu, FileJson } from "lucide-react";
import { api } from "../api/client";
import { SkeletonCard } from "../components/Skeleton";

export default function PlatformHealth() {
  const [health, setHealth] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [fraudHealth, setFraudHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [h, a, f] = await Promise.all([
        api.platforms.health(),
        api.platforms.connected().catch(() => []),
        api.fraud.health().catch(() => null),
      ]);
      setHealth(h);
      setAccounts(a);
      setFraudHealth(f);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonCard />
      </div>
    );
  }

  const uptimeHours = health ? Math.floor(health.uptime / 3600) : 0;
  const activeAccounts = accounts.filter((a) => a.status === "active").length;
  const errorAccounts = accounts.filter((a) => a.status === "error").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Health</h1>
          <p className="text-gray-500 mt-1">N0VA1O Gateway, connected accounts, and fraud detection status</p>
        </div>
        <button className="btn-secondary flex items-center gap-2" onClick={loadAll}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <Server className="w-5 h-5 text-n0va-400 mb-3" />
          <p className="text-xs text-gray-500 mb-1">Gateway Status</p>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${health?.status === "operational" ? "bg-green-400" : "bg-red-400"}`} />
            <span className="text-xl font-bold text-white">{health?.status || "Unknown"}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Uptime: {uptimeHours}h</p>
        </div>
        <div className="card">
          <Link2 className="w-5 h-5 text-blue-400 mb-3" />
          <p className="text-xs text-gray-500 mb-1">Connected Accounts</p>
          <p className="text-xl font-bold text-white">{activeAccounts}</p>
          <p className="text-xs text-gray-500 mt-1">{errorAccounts > 0 ? `${errorAccounts} with errors` : "All healthy"}</p>
        </div>
        <div className="card">
          <Cpu className="w-5 h-5 text-purple-400 mb-3" />
          <p className="text-xs text-gray-500 mb-1">Active Sandboxes</p>
          <p className="text-xl font-bold text-white">{health?.sandbox?.activeSandboxes || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Isolated executions</p>
        </div>
        <div className="card">
          <Database className="w-5 h-5 text-green-400 mb-3" />
          <p className="text-xs text-gray-500 mb-1">Virtual Files</p>
          <p className="text-xl font-bold text-white">{health?.vfs?.totalFiles || 0}</p>
          <p className="text-xs text-gray-500 mt-1">{health?.vfs?.totalSizeMB?.toFixed(1) || 0} MB total</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">N0VA1O Gateway Details</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-gray-300">Registered Intents</span>
              </div>
              <span className="text-sm text-white font-bold">{health?.router?.registeredIntents || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-300">Registered Actions</span>
              </div>
              <span className="text-sm text-white font-bold">{health?.router?.registeredActions || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <FileJson className="w-4 h-4 text-n0va-400" />
                <span className="text-sm text-gray-300">Cached Recipes</span>
              </div>
              <span className="text-sm text-white font-bold">{health?.recipes?.cachedRecipes || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Link2 className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-300">Available Connectors</span>
              </div>
              <span className="text-sm text-white font-bold">{health?.connections || 0}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Connected Accounts</h3>
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Link2 className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="text-sm">No accounts connected</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {accounts.map((a) => (
                <div key={a._id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${a.status === "active" ? "bg-green-400" : a.status === "error" ? "bg-red-400" : "bg-yellow-400"}`} />
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">{a.label}</p>
                      <p className="text-xs text-gray-500">{a.platform}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 capitalize shrink-0">{a.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {fraudHealth && (
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-semibold text-white">Fraud Detection Health</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">{fraudHealth.totalFlags}</p>
              <p className="text-xs text-gray-500">Total Flags</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-400">{fraudHealth.activeFlags}</p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-orange-400">{fraudHealth.highFlags || 0}</p>
              <p className="text-xs text-gray-500">High Risk</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-purple-400">{fraudHealth.autoPaused || 0}</p>
              <p className="text-xs text-gray-500">Auto-Paused</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-400">{fraudHealth.mediumFlags || 0}</p>
              <p className="text-xs text-gray-500">Medium Risk</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-400">{fraudHealth.lowFlags || 0}</p>
              <p className="text-xs text-gray-500">Low Risk</p>
            </div>
          </div>
          {fraudHealth.topCategories?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-800">
              <p className="text-sm text-gray-400 mb-2">Top Fraud Categories</p>
              <div className="flex flex-wrap gap-2">
                {fraudHealth.topCategories.map((c: any) => (
                  <span key={c.category} className="px-2.5 py-1 bg-gray-800 text-gray-300 rounded-lg text-xs">
                    {c.category} <span className="text-gray-500">({c.count})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
