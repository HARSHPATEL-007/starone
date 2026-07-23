import { useEffect, useState } from "react";
import { Link2, Link2Off, RefreshCw, Plus, CheckCircle, AlertCircle, Clock } from "lucide-react";

interface ConnectedAccount {
  _id: string;
  platform: string;
  label: string;
  status: string;
  metadata: Record<string, any>;
  createdAt: string;
}

const platformColors: Record<string, string> = {
  meta: "text-blue-400",
  google: "text-green-400",
  linkedin: "text-blue-300",
  tiktok: "text-pink-400",
  snapchat: "text-yellow-400",
  twitter: "text-sky-400",
};

export default function ConnectedAccounts() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnect, setShowConnect] = useState(false);
  const [form, setForm] = useState({ platform: "meta", label: "", accessToken: "" });
  const [platforms, setPlatforms] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/platforms/connected").then((r) => r.json()),
      fetch("/api/v1/platforms").then((r) => r.json()),
    ])
      .then(([accs, plats]) => {
        setAccounts(accs);
        setPlatforms(plats);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/v1/platforms/connect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + btoa(JSON.stringify({ userId: "user_001", tenantId: "tenant_001", role: "admin" })),
        "x-tenant-id": "tenant_001",
      },
      body: JSON.stringify({ ...form, scopes: ["read", "write"] }),
    });
    setShowConnect(false);
    setForm({ platform: "meta", label: "", accessToken: "" });
    const accs = await fetch("/api/v1/platforms/connected").then((r) => r.json());
    setAccounts(accs);
  }

  const statusIcon: Record<string, any> = {
    active: CheckCircle,
    error: AlertCircle,
    expired: Clock,
    pending: Clock,
  };

  const statusColors: Record<string, string> = {
    active: "text-green-400",
    error: "text-red-400",
    expired: "text-yellow-400",
    pending: "text-yellow-400",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Connected Accounts</h1>
          <p className="text-gray-500 mt-1">Manage 1,000+ ad platform connections via N0VA1O</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowConnect(true)}>
          <Plus className="w-4 h-4" /> Connect Account
        </button>
      </div>

      {showConnect && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-lg mx-4">
            <h2 className="text-lg font-semibold text-white mb-4">Connect Platform Account</h2>
            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Platform</label>
                <select className="select" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                  {platforms.map((p) => <option key={p.id} value={p.platform}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Account Label</label>
                <input className="input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g., Main Business Account" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Access Token</label>
                <input className="input font-mono text-xs" value={form.accessToken} onChange={(e) => setForm({ ...form, accessToken: e.target.value })} required placeholder="Enter platform access token..." />
              </div>
              <div className="text-xs text-gray-500 bg-gray-800 rounded-lg p-3">
                N0VA1O handles OAuth, token refresh, and scope management automatically. Your credentials are encrypted with AES-256-GCM and never stored in plaintext.
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowConnect(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Connect</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-n0va-500 border-t-transparent rounded-full" /></div>
      ) : accounts.length === 0 ? (
        <div className="card text-center py-12">
          <Link2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">No accounts connected. Connect your first ad platform.</p>
          <button className="btn-primary" onClick={() => setShowConnect(true)}>Connect First Account</button>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => {
            const StatusIcon = statusIcon[account.status] || Clock;
            return (
              <div key={account._id} className="card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
                      <Link2 className={`w-6 h-6 ${platformColors[account.platform] || "text-gray-400"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-white font-semibold">{account.label}</h3>
                        <span className="text-xs text-gray-500 capitalize">{account.platform}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <StatusIcon className={`w-3 h-3 ${statusColors[account.status] || ""}`} />
                          {account.status}
                        </span>
                        <span>JIT Auth: Enabled</span>
                        <span>Scopes: read, write</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="btn-secondary text-xs py-1.5">
                      <RefreshCw className="w-3 h-3" />
                    </button>
                    <button className="btn-secondary text-xs py-1.5 text-red-400">
                      <Link2Off className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {account.metadata?.accountId && (
                  <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-500">
                    Account ID: {account.metadata.accountId}
                    {account.metadata.customerId && <> | Customer ID: {account.metadata.customerId}</>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="card bg-gray-900/50 border-n0va-600/20">
        <h3 className="text-sm font-semibold text-white mb-2">N0VA1O Multi-Account Management</h3>
        <p className="text-xs text-gray-500">
          Switch between unlimited platform accounts with one click — zero re-authentication.
          N0VA1O handles all OAuth flows, token refresh, and scope management automatically.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
          <div className="bg-gray-800 rounded-lg p-2 text-center">
            <p className="text-n0va-400 font-bold">Unlimited</p>
            <p className="text-gray-500">Accounts per tenant</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-2 text-center">
            <p className="text-n0va-400 font-bold">AES-256-GCM</p>
            <p className="text-gray-500">Token encryption</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-2 text-center">
            <p className="text-n0va-400 font-bold">JIT</p>
            <p className="text-gray-500">Just-in-time auth</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-2 text-center">
            <p className="text-n0va-400 font-bold">1-Click</p>
            <p className="text-gray-500">Account switching</p>
          </div>
        </div>
      </div>
    </div>
  );
}
