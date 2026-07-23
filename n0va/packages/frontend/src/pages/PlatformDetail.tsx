import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { ArrowLeft, Share2, Wifi, Play, CheckCircle, XCircle, Clock, Activity, RefreshCw, AlertCircle, Unplug } from "lucide-react";

export default function PlatformDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [platform, setPlatform] = useState<any>(null);
  const [connected, setConnected] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState<string | null>(null);
  const [execResult, setExecResult] = useState<any>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    loadPlatform();
  }, [id]);

  async function loadPlatform() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [plat, accounts, h] = await Promise.all([
        api.platforms.get(id),
        api.platforms.connected(),
        api.platforms.health(),
      ]);
      setPlatform(plat);
      setConnected(accounts.filter((a: any) => a.platform === plat.platform));
      setHealth(h);
    } catch (err: any) {
      setError(err.message || "Failed to load platform");
      addToast("error", "Failed to load platform details");
    } finally {
      setLoading(false);
    }
  }

  async function executeAction(action: string) {
    if (!platform) return;
    setExecuting(action);
    setExecResult(null);
    try {
      const result = await api.platforms.execute({ platform: platform.platform, action, params: {} });
      setExecResult({ action, result });
    } finally {
      setExecuting(null);
    }
  }

  async function handleDisconnect() {
    if (!disconnectTarget) return;
    try {
      await api.platforms.disconnect(disconnectTarget._id || disconnectTarget.id);
      addToast("success", `Disconnected ${disconnectTarget.label || disconnectTarget.platform}`);
      setDisconnectTarget(null);
      loadPlatform();
    } catch {
      addToast("error", "Failed to disconnect account");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-800 rounded-xl" />
          <div><div className="w-36 h-7 bg-gray-800 rounded" /><div className="w-24 h-4 bg-gray-800 rounded mt-2" /></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card p-6"><div className="w-40 h-5 bg-gray-800 rounded mb-4" /><div className="grid grid-cols-2 gap-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 bg-gray-800 rounded" />)}</div></div>
          <div className="card p-6"><div className="w-28 h-5 bg-gray-800 rounded mb-4" /><div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 bg-gray-800 rounded" />)}</div></div>
        </div>
      </div>
    );
  }

  if (!platform) {
    return (
      <div className="card text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">Platform not found</p>
        <div className="flex items-center justify-center gap-3 mt-4">
          <button className="btn-secondary flex items-center gap-2" onClick={loadPlatform}><RefreshCw className="w-4 h-4" /> Retry</button>
          <button className="btn-secondary" onClick={() => navigate("/platforms")}>Back to Platforms</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/platforms")} className="text-gray-500 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
          <Share2 className="w-6 h-6 text-n0va-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{platform.name}</h1>
          <p className="text-gray-500 mt-1">v{platform.version} · {platform.authType} auth</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Available Actions ({platform.actions.length})</h3>
            <div className="grid grid-cols-2 gap-2">
              {platform.actions.map((action: string) => (
                <button
                  key={action}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-800 bg-gray-800/30 hover:border-gray-700 transition-colors text-left"
                  onClick={() => executeAction(action)}
                  disabled={executing === action}
                >
                  <Play className="w-4 h-4 text-n0va-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">{action.replace(/_/g, " ")}</p>
                  </div>
                  {executing === action && <div className="animate-spin w-4 h-4 border-2 border-n0va-500 border-t-transparent rounded-full" />}
                </button>
              ))}
            </div>
          </div>

          {execResult && (
            <div className="card border-n0va-600/30">
              <h3 className="text-lg font-semibold text-white mb-3">Execution Result: {execResult.action}</h3>
              <pre className="text-xs text-gray-400 bg-gray-950 rounded-lg p-3 overflow-x-auto">
                {JSON.stringify(execResult.result, null, 2)}
              </pre>
            </div>
          )}

          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Connected Accounts</h3>
            {connected.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Wifi className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                <p className="text-sm">No accounts connected for this platform</p>
                <Link to="/connected-accounts" className="text-n0va-400 text-sm hover:text-n0va-300 mt-1 inline-block">Manage connections</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {connected.map((acct: any) => (
                  <div key={acct._id || acct.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg group">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${acct.status === "active" ? "bg-green-400" : acct.status === "error" ? "bg-red-400" : "bg-yellow-400"}`} />
                      <div>
                        <p className="text-sm text-white font-medium">{acct.label || acct.platform}</p>
                        <p className="text-xs text-gray-500 capitalize">{acct.status}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{acct.credentials?.scopes?.join(", ") || "read, write"}</span>
                      <button className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 text-xs flex items-center gap-1" onClick={() => setDisconnectTarget(acct)}>
                        <Unplug className="w-3 h-3" /> Disconnect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-3">Gateway Status</h3>
            {health ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Wifi className={`w-4 h-4 ${health.status === "healthy" ? "text-green-400" : "text-red-400"}`} />
                  <span className="text-sm text-white">{health.status}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Activity className="w-4 h-4" />
                  <span>{health.connections} connectors</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Health check unavailable</p>
            )}
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-3">Platform Info</h3>
            <div className="space-y-3">
              <DetailRow label="Name" value={platform.name} />
              <DetailRow label="Platform ID" value={platform.platform} />
              <DetailRow label="Version" value={platform.version} />
              <DetailRow label="Auth Type" value={platform.authType} />
              <DetailRow label="Connections" value={String(connected.length)} />
            </div>
          </div>
        </div>
      </div>

      {disconnectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDisconnectTarget(null)}>
          <div className="w-full max-w-sm bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Disconnect Account</h3>
            <p className="text-sm text-gray-400 mb-4">Are you sure you want to disconnect <strong className="text-white">{disconnectTarget.label || disconnectTarget.platform}</strong>?</p>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setDisconnectTarget(null)}>Cancel</button>
              <button className="btn-danger" onClick={handleDisconnect}>Disconnect</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-white font-medium">{value}</span>
    </div>
  );
}
