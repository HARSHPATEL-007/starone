import { useEffect, useState } from "react";
import { Share2, Link2, Wifi, X, Trash2, ExternalLink, Activity, Play } from "lucide-react";
import { api } from "../api/client";
import { SkeletonCard } from "../components/Skeleton";
import { useNavigate } from "react-router-dom";

export default function Platforms() {
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showConnect, setShowConnect] = useState(false);
  const [form, setForm] = useState({ platform: "meta", label: "", accessToken: "" });
  const [detailPlatform, setDetailPlatform] = useState<any>(null);
  const [detailAccounts, setDetailAccounts] = useState<any[]>([]);
  const [executing, setExecuting] = useState<string | null>(null);
  const [execResult, setExecResult] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.platforms.list().then(setPlatforms),
      api.platforms.health().then(setHealth),
    ]).finally(() => setLoading(false));
  }, []);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    await api.platforms.connect({ ...form, scopes: ["read", "write"] });
    setShowConnect(false);
    setForm({ platform: "meta", label: "", accessToken: "" });
  }

  async function openDetail(p: any) {
    setDetailPlatform(p);
    setExecResult(null);
    const accounts = await api.platforms.connected();
    setDetailAccounts(accounts.filter((a: any) => a.platform === p.platform));
  }

  async function executeAction(action: string) {
    if (!detailPlatform) return;
    setExecuting(action);
    setExecResult(null);
    try {
      const result = await api.platforms.execute({ platform: detailPlatform.platform, action, params: {} });
      setExecResult({ action, result });
    } finally {
      setExecuting(null);
    }
  }

  async function disconnectAccount(id: string) {
    try {
      await fetch(`/api/v1/platforms/connected/${id}`, { method: "DELETE" });
      setDetailAccounts((prev) => prev.filter((a) => a._id !== id));
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Platforms</h1>
          <p className="text-gray-500 mt-1">N0VA1O Gateway — connect and manage ad platforms</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowConnect(true)}>
          <Link2 className="w-4 h-4" /> Connect Platform
        </button>
      </div>

      {health && (
        <div className="card bg-gray-900/50 border-n0va-600/20">
          <div className="flex items-center gap-3">
            <Wifi className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-sm text-white font-medium">N0VA1O Gateway — {health.status}</p>
              <p className="text-xs text-gray-500">{health.connections} available connectors</p>
            </div>
          </div>
        </div>
      )}

      {showConnect && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-lg mx-4">
            <h2 className="text-lg font-semibold text-white mb-4">Connect Platform</h2>
            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Platform</label>
                <select className="select" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                  {platforms.map((p) => <option key={p.id} value={p.platform}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Label</label>
                <input className="input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g., Main Business Account" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Access Token</label>
                <input className="input font-mono text-xs" value={form.accessToken} onChange={(e) => setForm({ ...form, accessToken: e.target.value })} required />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowConnect(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Connect</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailPlatform && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-3xl mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center"><Share2 className="w-5 h-5 text-n0va-400" /></div>
                <div>
                  <h2 className="text-lg font-semibold text-white">{detailPlatform.name}</h2>
                  <p className="text-xs text-gray-500">v{detailPlatform.version} · {detailPlatform.authType}</p>
                </div>
              </div>
              <button className="text-gray-500 hover:text-white" onClick={() => { setDetailPlatform(null); setExecResult(null); }}><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <div className="card bg-gray-900/50">
                <h3 className="text-sm font-semibold text-white mb-3">Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  {detailPlatform.actions.map((action: string) => (
                    <button key={action} className="flex items-center gap-2 p-2 rounded-lg border border-gray-800 bg-gray-800/30 hover:border-gray-700 text-left disabled:opacity-50" onClick={() => executeAction(action)} disabled={executing === action}>
                      <Play className="w-3.5 h-3.5 text-n0va-400 shrink-0" />
                      <span className="text-xs text-white truncate">{action.replace(/_/g, " ")}</span>
                      {executing === action && <div className="animate-spin w-3 h-3 border-2 border-n0va-500 border-t-transparent rounded-full ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="card bg-gray-900/50">
                <h3 className="text-sm font-semibold text-white mb-3">Connected Accounts ({detailAccounts.length})</h3>
                {detailAccounts.length === 0 ? (
                  <p className="text-xs text-gray-500">No accounts connected.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {detailAccounts.map((acct: any) => (
                      <div key={acct._id || acct.id} className="flex items-center justify-between p-2 bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${acct.status === "active" ? "bg-green-400" : acct.status === "error" ? "bg-red-400" : "bg-yellow-400"}`} />
                          <span className="text-xs text-white truncate">{acct.label || acct.platform}</span>
                        </div>
                        <button className="text-gray-500 hover:text-red-400 shrink-0" onClick={() => disconnectAccount(acct._id || acct.id)} title="Disconnect"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {execResult && (
              <div className="card bg-gray-900/50 border-n0va-600/30">
                <h3 className="text-sm font-semibold text-white mb-2">Result: {execResult.action}</h3>
                <pre className="text-xs text-gray-400 bg-gray-950 rounded-lg p-3 max-h-48 overflow-x-auto">{JSON.stringify(execResult.result, null, 2)}</pre>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <button className="btn-secondary text-sm" onClick={() => navigate(`/platforms/${detailPlatform.id}`)}><ExternalLink className="w-4 h-4 mr-1" /> Full Page</button>
              <button className="btn-secondary text-sm" onClick={() => { setDetailPlatform(null); setExecResult(null); }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms.map((p) => (
            <div key={p.id} className="card cursor-pointer hover:border-gray-700 transition-colors" onClick={() => openDetail(p)}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center"><Share2 className="w-5 h-5 text-n0va-400" /></div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold truncate">{p.name}</h3>
                  <p className="text-xs text-gray-500">v{p.version}</p>
                </div>
                <Activity className="w-4 h-4 text-gray-600" />
              </div>
              <div className="space-y-2 text-xs text-gray-500">
                <p>Auth: {p.authType}</p>
                <div className="flex flex-wrap gap-1">
                  {p.actions.slice(0, 4).map((a: string) => (
                    <span key={a} className="badge bg-gray-800 text-gray-400">{a}</span>
                  ))}
                  {p.actions.length > 4 && <span className="badge bg-gray-800 text-gray-500">+{p.actions.length - 4}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
