import { useEffect, useState, useMemo } from "react";
import { Share2, Link2, Wifi, X, Trash2, ExternalLink, Activity, Play, Search, CheckCircle, AlertTriangle, Settings, Edit3, RefreshCw, WifiOff, BarChart3, Globe } from "lucide-react";
import { api } from "../api/client";
import { SkeletonCard } from "../components/Skeleton";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";

export default function Platforms() {
  const { addToast } = useToast();
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showConnect, setShowConnect] = useState(false);
  const [form, setForm] = useState({ platform: "meta", label: "", accessToken: "" });
  const [detailPlatform, setDetailPlatform] = useState<any>(null);
  const [detailAccounts, setDetailAccounts] = useState<any[]>([]);
  const [executing, setExecuting] = useState<string | null>(null);
  const [execResult, setExecResult] = useState<any>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", authType: "" });
  const [showDisconnect, setShowDisconnect] = useState<string | null>(null);
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);
  const [oauthStatus, setOauthStatus] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.platforms.list().then(setPlatforms),
      api.platforms.health().then(setHealth),
      api.platforms.connected().then(setConnectedAccounts).catch(() => {}),
      api.oauth.status().then(setOauthStatus).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.platforms.connect({ ...form, scopes: ["read", "write"] });
      addToast("success", "Platform connected");
      setShowConnect(false);
      setForm({ platform: "meta", label: "", accessToken: "" });
      const accounts = await api.platforms.connected();
      setConnectedAccounts(accounts);
    } catch { addToast("error", "Failed to connect platform"); }
  }

  async function handleOAuthConnect(platform: string) {
    try {
      const redirectUri = `${window.location.origin}/platforms`;
      const result = await api.oauth.authorize(platform, redirectUri);
      window.open(result.authUrl, "oauth_popup", "width=600,height=700");
    } catch { addToast("error", "Failed to initiate OAuth"); }
  }

  function getOAuthStatus(platform: string) {
    return oauthStatus?.platforms?.find((p: any) => p.platform === platform);
  }

  async function openDetail(p: any) {
    setDetailPlatform(p);
    setExecResult(null);
    try {
      const accounts = await api.platforms.connected();
      setDetailAccounts(accounts.filter((a: any) => a.platform === p.platform));
    } catch { setDetailAccounts([]); }
  }

  async function executeAction(action: string) {
    if (!detailPlatform) return;
    setExecuting(action);
    setExecResult(null);
    try {
      const result = await api.platforms.execute({ platform: detailPlatform.platform, action, params: {} });
      setExecResult({ action, result });
    } catch (e: any) {
      setExecResult({ action, result: { error: e.message } });
    } finally {
      setExecuting(null);
    }
  }

  async function handleDisconnect(id: string) {
    try {
      await api.platforms.disconnect(id);
      setDetailAccounts((prev) => prev.filter((a) => (a._id || a.id) !== id));
      setConnectedAccounts((prev) => prev.filter((a) => (a._id || a.id) !== id));
      setShowDisconnect(null);
      addToast("success", "Account disconnected");
    } catch { addToast("error", "Failed to disconnect account"); }
  }

  function openEdit(p: any) {
    setEditForm({ name: p.name || "", authType: p.authType || "" });
    setShowEdit(true);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!detailPlatform) return;
    try {
      await api.platforms.update(detailPlatform.id, editForm);
      addToast("success", "Platform updated");
      setShowEdit(false);
      const list = await api.platforms.list();
      setPlatforms(list);
      setDetailPlatform(list.find((p: any) => p.id === detailPlatform.id));
    } catch { addToast("error", "Failed to update platform"); }
  }

  const filtered = useMemo(() => {
    return platforms.filter((p) => !search || p.name?.toLowerCase().includes(search.toLowerCase()));
  }, [platforms, search]);

  const connectedCount = connectedAccounts.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Platforms</h1>
          <p className="text-gray-500 mt-1">N0VA1O Gateway — connect and manage ad platforms</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost text-xs flex items-center gap-1.5" onClick={() => { Promise.all([api.platforms.list().then(setPlatforms), api.platforms.health().then(setHealth), api.platforms.connected().then(setConnectedAccounts).catch(() => {}), api.oauth.status().then(setOauthStatus).catch(() => {})]); addToast("success", "Refreshed"); }}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowConnect(true)}>
            <Link2 className="w-4 h-4" /> Connect Platform
          </button>
        </div>
      </div>

      {health && (
        <div className="card bg-gray-900/50 border-n0va-600/20">
          <div className="flex items-center gap-3">
            {health.status === "online" ? <Wifi className="w-5 h-5 text-green-400" /> : <WifiOff className="w-5 h-5 text-red-400" />}
            <div className="flex-1">
              <p className="text-sm text-white font-medium">N0VA1O Gateway — {health.status}</p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-gray-500">{health.connections} available connectors</span>
                <span className="text-xs text-gray-600">·</span>
                <span className="text-xs text-gray-500">{connectedCount} connected accounts</span>
                {health.uptime && <><span className="text-xs text-gray-600">·</span><span className="text-xs text-gray-500">Uptime: {health.uptime}</span></>}
              </div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${health.status === "online" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>{health.status}</span>
          </div>
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input className="input pl-10" placeholder="Search platforms..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {showConnect && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-lg mx-4">
            <h2 className="text-lg font-semibold text-white mb-4">Connect Platform</h2>
            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Platform</label>
                <select className="select" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                  {platforms.length > 0 ? platforms.map((p) => <option key={p.id} value={p.platform}>{p.name}</option>) : (
                    <>
                      <option value="meta">Meta Ads</option>
                      <option value="google">Google Ads</option>
                      <option value="tiktok">TikTok Ads</option>
                      <option value="linkedin">LinkedIn Ads</option>
                    </>
                  )}
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

      {/* Detail modal */}
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
              <div className="flex items-center gap-2">
                <button className="text-gray-500 hover:text-white" onClick={() => openEdit(detailPlatform)} title="Edit"><Edit3 className="w-4 h-4" /></button>
                <button className="text-gray-500 hover:text-white" onClick={() => { setDetailPlatform(null); setExecResult(null); }}><X className="w-5 h-5" /></button>
              </div>
            </div>

            {detailPlatform.metrics && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="card p-3 bg-gray-900/50"><p className="text-[10px] text-gray-500">Rate Limit</p><p className="text-sm font-bold text-white">{detailPlatform.metrics.rateLimit || "—"}</p></div>
                <div className="card p-3 bg-gray-900/50"><p className="text-[10px] text-gray-500">Quota Used</p><p className="text-sm font-bold text-white">{detailPlatform.metrics.quotaUsed || "—"}</p></div>
                <div className="card p-3 bg-gray-900/50"><p className="text-[10px] text-gray-500">Latency</p><p className="text-sm font-bold text-white">{detailPlatform.metrics.latency || "—"}</p></div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <div className="card bg-gray-900/50">
                <h3 className="text-sm font-semibold text-white mb-3">Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  {detailPlatform.actions?.map((action: string) => (
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
                    {detailAccounts.map((acct: any) => {
                      const aid = acct._id || acct.id;
                      return (
                        <div key={aid} className="flex items-center justify-between p-2 bg-gray-800 rounded-lg">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${acct.status === "active" ? "bg-green-400" : acct.status === "error" ? "bg-red-400" : "bg-yellow-400"}`} />
                            <span className="text-xs text-white truncate">{acct.label || acct.platform}</span>
                          </div>
                          <button className="text-gray-500 hover:text-red-400 shrink-0 ml-2" onClick={() => setShowDisconnect(aid)} title="Disconnect"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {execResult && (
              <div className="card bg-gray-900/50 border-n0va-600/30 mb-4">
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

      {/* Edit modal */}
      {showEdit && detailPlatform && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowEdit(false)}>
          <div className="card w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">Edit: {detailPlatform.name}</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              <div><label className="label">Name</label><input className="input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
              <div><label className="label">Auth Type</label>
                <select className="input" value={editForm.authType} onChange={e => setEditForm({ ...editForm, authType: e.target.value })}>
                  <option value="oauth2">OAuth 2.0</option>
                  <option value="api_key">API Key</option>
                  <option value="basic">Basic Auth</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disconnect confirmation */}
      {showDisconnect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowDisconnect(null)}>
          <div className="w-full max-w-sm bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Disconnect Account</h3>
            <p className="text-sm text-gray-400 mb-4">Are you sure you want to disconnect this account?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDisconnect(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => handleDisconnect(showDisconnect)} className="btn-primary bg-red-600 hover:bg-red-500 border-red-600">Disconnect</button>
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
          {filtered.map((p) => {
            const oa = getOAuthStatus(p.platform);
            return (
              <div key={p.id} className="card cursor-pointer hover:border-gray-700 transition-colors" onClick={() => openDetail(p)}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center"><Share2 className="w-5 h-5 text-n0va-400" /></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold truncate">{p.name}</h3>
                    <p className="text-xs text-gray-500">v{p.version}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {oa ? (
                      oa.active ? (
                        <span className="text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded-full">Connected</span>
                      ) : (
                        <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded-full">Expired</span>
                      )
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); handleOAuthConnect(p.platform); }} className="btn-ghost text-[10px] p-1" title="Connect with OAuth">
                        <Link2 className="w-3 h-3 text-gray-500" />
                      </button>
                    )}
                    <div className={`w-2 h-2 rounded-full ${health?.status === "online" ? "bg-green-400" : "bg-gray-600"}`} />
                  </div>
                </div>
                <div className="space-y-2 text-xs text-gray-500">
                  <p>Auth: {p.authType}</p>
                  {oa?.expiresAt && <p className="text-[10px] text-gray-600">Token expires: {new Date(oa.expiresAt).toLocaleDateString()}</p>}
                  <div className="flex flex-wrap gap-1">
                    {p.actions?.slice(0, 4).map((a: string) => (
                      <span key={a} className="badge bg-gray-800 text-gray-400">{a}</span>
                    ))}
                    {p.actions?.length > 4 && <span className="badge bg-gray-800 text-gray-500">+{p.actions.length - 4}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
