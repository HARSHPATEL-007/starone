import { useEffect, useState } from "react";
import { Share2, Link2, Wifi } from "lucide-react";
import { api } from "../api/client";

export default function Platforms() {
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showConnect, setShowConnect] = useState(false);
  const [form, setForm] = useState({ platform: "meta", label: "", accessToken: "" });

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

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-n0va-500 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms.map((p) => (
            <div key={p.id} className="card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-n0va-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">{p.name}</h3>
                  <p className="text-xs text-gray-500">v{p.version}</p>
                </div>
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
