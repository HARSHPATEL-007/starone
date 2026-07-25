import { useEffect, useState, useCallback } from "react";
import { Link2, Link2Off, RefreshCw, Plus, AlertCircle, CheckCircle, Clock, Activity, ChevronDown, ChevronRight, DollarSign, BarChart3, Users, ExternalLink, Wifi, WifiOff } from "lucide-react";
import { api } from "../api/client";
import { SkeletonCard } from "../components/Skeleton";
import { useToast } from "../components/Toast";

const platformIcons: Record<string, string> = {
  meta: "🔵", google: "🟢", linkedin: "🔷", tiktok: "🩷", snapchat: "⭐", twitter: "🐦", pinterest: "📌", reddit: "🔴",
};

const platformColors: Record<string, string> = {
  meta: "text-blue-400", google: "text-green-400", linkedin: "text-blue-300",
  tiktok: "text-pink-400", snapchat: "text-yellow-400", twitter: "text-sky-400",
  pinterest: "text-red-400", reddit: "text-orange-400",
};

export default function ConnectedAccounts() {
  const { addToast } = useToast();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnect, setShowConnect] = useState(false);
  const [form, setForm] = useState({ platform: "meta", label: "", accessToken: "" });
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [health, setHealth] = useState<any>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [accs, plats, h] = await Promise.all([
        api.platforms.connected(),
        api.platforms.list(),
        api.platforms.health().catch(() => null),
      ]);
      setAccounts(accs);
      setPlatforms(plats);
      setHealth(h);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.platforms.connect({ ...form, scopes: ["read", "write"] });
      addToast("success", "Account connected");
      setShowConnect(false);
      setForm({ platform: "meta", label: "", accessToken: "" });
      loadData();
    } catch { addToast("error", "Failed to connect"); }
  }

  async function disconnect(id: string) {
    setDisconnecting(id);
    try {
      await api.platforms.disconnect(id);
      setAccounts(prev => prev.filter(a => a._id !== id));
      addToast("success", "Account disconnected");
    } catch { addToast("error", "Failed to disconnect"); } finally { setDisconnecting(null); }
  }

  async function handleReconnect(id: string) {
    try {
      const acc = accounts.find(a => a._id === id);
      if (!acc) return;
      await api.platforms.update(id, { status: "active" });
      setAccounts(prev => prev.map(a => a._id === id ? { ...a, status: "active" } : a));
      addToast("success", `${acc.label} reconnected`);
    } catch { addToast("error", "Reconnect failed"); }
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "active": return <CheckCircle className="w-3.5 h-3.5 text-green-400" />;
      case "error": return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
      default: return <Clock className="w-3.5 h-3.5 text-yellow-400" />;
    }
  };

  const totalActive = accounts.filter(a => a.status === "active").length;
  const totalError = accounts.filter(a => a.status === "error").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Link2 className="w-6 h-6 text-n0va-400" />
            Connected Accounts
          </h1>
          <p className="text-gray-500 mt-1">{accounts.length} accounts · {totalActive} active · {totalError} errors</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary p-2" onClick={loadData} title="Refresh"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowConnect(true)}>
            <Plus className="w-4 h-4" /> Connect Account
          </button>
        </div>
      </div>

      {health && (
        <div className="card bg-gray-900/50 border-n0va-600/20">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-n0va-400" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white">Platform Health</h3>
              <p className="text-xs text-gray-500">{health.total || accounts.length} platforms · {health.healthy || (accounts.filter(a => a.status === "active").length)} healthy</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5 text-green-400" /> {health.healthy || totalActive} online</span>
              <span className="flex items-center gap-1.5"><WifiOff className="w-3.5 h-3.5 text-red-400" /> {health.unhealthy || totalError} offline</span>
            </div>
          </div>
          {health.platforms && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {Object.entries(health.platforms).map(([p, h]: [string, any]) => (
                <span key={p} className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${h.ok || h.healthy ? "border-green-700 bg-green-900/20 text-green-400" : "border-red-700 bg-red-900/20 text-red-400"}`}>
                  {h.ok || h.healthy ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />} {p}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {showConnect && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-lg mx-4">
            <h2 className="text-lg font-semibold text-white mb-4">Connect Platform Account</h2>
            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Platform</label>
                <select className="input" value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>
                  {platforms.length > 0 ? platforms.map(p => <option key={p.id} value={p.platform}>{p.icon || ""} {p.name}</option>) : <><option value="meta">Meta Ads</option><option value="google">Google Ads</option><option value="linkedin">LinkedIn Ads</option><option value="tiktok">TikTok Ads</option></>}
                </select>
              </div>
              <div><label className="block text-sm text-gray-400 mb-1">Account Label</label><input className="input" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="e.g. Main Business Account" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Access Token</label><input className="input font-mono text-xs" value={form.accessToken} onChange={e => setForm({ ...form, accessToken: e.target.value })} required placeholder="Enter platform access token..." /></div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowConnect(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Connect</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : accounts.length === 0 ? (
        <div className="card text-center py-12">
          <Link2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">No accounts connected. Connect your first ad platform.</p>
          <button className="btn-primary" onClick={() => setShowConnect(true)}>Connect First Account</button>
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map(account => {
            const isExpanded = expandedId === account._id;
            const isErrored = account.status === "error";
            return (
              <div key={account._id} className="card overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <button onClick={() => setExpandedId(isExpanded ? null : account._id)} className="text-gray-600 hover:text-white shrink-0">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center shrink-0">
                      <Link2 className={`w-5 h-5 ${platformColors[account.platform] || "text-gray-400"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-semibold truncate">{account.label}</h3>
                        <span className="text-[10px] text-gray-500 capitalize shrink-0 bg-gray-800 px-1.5 py-0.5 rounded">{account.platform}</span>
                        <span className="shrink-0">{statusIcon(account.status)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-0.5">
                        <span className="capitalize">{account.status}</span>
                        {account.lastSync && (
                          <span className="flex items-center gap-1">
                            <RefreshCw className="w-2.5 h-2.5" /> Synced {getTimeAgo(account.lastSync)}
                          </span>
                        )}
                        {account.metadata?.accountId && <span>ID: {account.metadata.accountId}</span>}
                        {account.metrics?.campaigns !== undefined && <span>{account.metrics.campaigns} campaigns</span>}
                      </div>
                    </div>
                    {account.metrics?.spend !== undefined && (
                      <div className="text-right shrink-0 hidden sm:block">
                        <p className="text-sm font-bold text-white">${(account.metrics.spend || 0).toLocaleString()}</p>
                        <p className="text-[10px] text-gray-500">Total Spend</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-3">
                    {isErrored && (
                      <button onClick={() => handleReconnect(account._id)} className="btn-secondary text-xs px-2 py-1 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> Reconnect
                      </button>
                    )}
                    <button className="btn-danger p-2 text-xs" onClick={() => disconnect(account._id)} disabled={disconnecting === account._id}>
                      {disconnecting === account._id ? <div className="animate-spin w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full" /> : <Link2Off className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <BarChart3 className="w-4 h-4 text-n0va-400 mx-auto mb-1" />
                        <p className="text-lg font-bold text-white">{account.metrics?.campaigns ?? "—"}</p>
                        <p className="text-[10px] text-gray-500">Campaigns</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <DollarSign className="w-4 h-4 text-green-400 mx-auto mb-1" />
                        <p className="text-lg font-bold text-white">${(account.metrics?.spend || 0).toLocaleString()}</p>
                        <p className="text-[10px] text-gray-500">Spend</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <Users className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                        <p className="text-lg font-bold text-white">{account.metrics?.impressions ?? "—"}</p>
                        <p className="text-[10px] text-gray-500">Impressions</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <Activity className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                        <p className="text-lg font-bold text-white">{account.metrics?.clicks ?? "—"}</p>
                        <p className="text-[10px] text-gray-500">Clicks</p>
                      </div>
                    </div>
                    {account.lastSync && (
                      <p className="text-[10px] text-gray-600 mt-3 text-center">
                        Last synced: {new Date(account.lastSync).toLocaleString()}
                      </p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => disconnect(account._id)} className="flex-1 btn-ghost text-xs flex items-center justify-center gap-1.5">
                        <Link2Off className="w-3 h-3" /> Disconnect
                      </button>
                      <button onClick={() => handleReconnect(account._id)} className="flex-1 btn-secondary text-xs flex items-center justify-center gap-1.5">
                        <RefreshCw className="w-3 h-3" /> Re-sync
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="card bg-gray-900/50 border-n0va-600/20">
        <h3 className="text-sm font-semibold text-white mb-2">N0VA1O Multi-Account Management</h3>
        <p className="text-xs text-gray-500">Switch between unlimited platform accounts with one click — zero re-authentication. N0VA1O handles all OAuth flows, token refresh, and scope management automatically.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
          <div className="bg-gray-800 rounded-lg p-2 text-center"><p className="text-n0va-400 font-bold">Unlimited</p><p className="text-gray-500">Accounts per tenant</p></div>
          <div className="bg-gray-800 rounded-lg p-2 text-center"><p className="text-n0va-400 font-bold">AES-256-GCM</p><p className="text-gray-500">Token encryption</p></div>
          <div className="bg-gray-800 rounded-lg p-2 text-center"><p className="text-n0va-400 font-bold">JIT</p><p className="text-gray-500">Just-in-time auth</p></div>
          <div className="bg-gray-800 rounded-lg p-2 text-center"><p className="text-n0va-400 font-bold">1-Click</p><p className="text-gray-500">Account switching</p></div>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
