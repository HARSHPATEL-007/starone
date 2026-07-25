import { useEffect, useState } from "react";
import { Key, Plus, Trash2, Copy, CheckCheck, Eye, EyeOff, RefreshCw, Terminal, BookOpen, Code, Webhook, BarChart3, ExternalLink, Shield, Clock, X, AlertCircle } from "lucide-react";
import { api } from "../api/client";
import { SkeletonCard } from "../components/Skeleton";
import { useToast } from "../components/Toast";

export default function DeveloperPortal() {
  const { addToast } = useToast();
  const [keys, setKeys] = useState<any[]>([]);
  const [scopes, setScopes] = useState<any[]>([]);
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ name: "", scopes: ["campaigns:read"] as string[], expiresInDays: 90 });

  async function load() {
    setLoading(true);
    try {
      const [k, s, u] = await Promise.all([api.developerPortal.keys(), api.developerPortal.scopes(), api.developerPortal.usage()]);
      setKeys(k); setScopes(s); setUsage(u);
    } catch { addToast("error", "Failed to load developer portal"); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!createForm.name) { addToast("error", "Key name required"); return; }
    try {
      const newKey = await api.developerPortal.createKey(createForm);
      setShowKey(newKey.key);
      setShowCreate(false);
      setCreateForm({ name: "", scopes: ["campaigns:read"], expiresInDays: 90 });
      load();
    } catch { addToast("error", "Failed to create key"); }
  }

  async function handleRevoke(id: string) {
    try {
      await api.developerPortal.revokeKey(id);
      addToast("success", "Key revoked");
      load();
    } catch { addToast("error", "Failed to revoke"); }
  }

  function toggleScope(scope: string) {
    setCreateForm(prev => ({
      ...prev,
      scopes: prev.scopes.includes(scope) ? prev.scopes.filter(s => s !== scope) : [...prev.scopes, scope],
    }));
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Terminal className="w-6 h-6 text-n0va-400" />
            Developer Portal
          </h1>
          <p className="text-gray-500 mt-1">Manage API keys, webhooks, and integrations</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New API Key
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2"><Key className="w-5 h-5 text-blue-400" /><span className="text-2xl font-bold text-white">{usage?.totalKeys || 0}</span></div>
          <p className="text-xs text-gray-500">Total Keys</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2"><Shield className="w-5 h-5 text-green-400" /><span className="text-2xl font-bold text-white">{usage?.activeKeys || 0}</span></div>
          <p className="text-xs text-gray-500">Active Keys</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2"><BarChart3 className="w-5 h-5 text-purple-400" /><span className="text-2xl font-bold text-white">{(usage?.totalRequests || 0).toLocaleString()}</span></div>
          <p className="text-xs text-gray-500">API Requests</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2"><Clock className="w-5 h-5 text-yellow-400" /><span className="text-xs text-white truncate">{usage?.lastRequest ? new Date(usage.lastRequest).toLocaleDateString() : "Never"}</span></div>
          <p className="text-xs text-gray-500">Last Request</p>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Key className="w-4 h-4 text-n0va-400" /> API Keys</h2>
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        ) : keys.length === 0 ? (
          <div className="text-center py-8 text-gray-500"><Key className="w-8 h-8 mx-auto mb-2" /><p>No API keys yet. Create one to get started.</p></div>
        ) : (
          <div className="space-y-3">
            {keys.map((k) => (
              <div key={k.id} className={`flex items-center justify-between p-3 rounded-lg border ${k.active ? "border-gray-800 bg-gray-900/50" : "border-red-900/30 bg-red-900/10"}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${k.active ? "bg-green-400" : "bg-red-400"}`} />
                  <div>
                    <p className="text-sm font-medium text-white">{k.name}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <code className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">{k.keyPreview}</code>
                      <span>{k.scopes?.length || 0} scopes</span>
                      {k.expiresAt && <span>Expires: {new Date(k.expiresAt).toLocaleDateString()}</span>}
                      {k.lastUsed && <span>Last used: {new Date(k.lastUsed).toLocaleDateString()}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {k.active && (
                    <button onClick={() => handleRevoke(k.id)} className="btn-ghost text-xs text-red-400 p-1.5">Revoke</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-4">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Code className="w-4 h-4 text-n0va-400" /> API Quick Start</h2>
        <div className="bg-gray-950 rounded-lg p-4 text-xs font-mono">
          <p className="text-green-400"># Authenticate with your API key</p>
          <p className="text-gray-300">curl -H "Authorization: Bearer YOUR_API_KEY" \</p>
          <p className="text-gray-300">  -H "x-tenant-id: your_tenant_id" \</p>
          <p className="text-gray-300">  https://api.n0va.ai/api/v1/campaigns</p>
          <p className="text-green-400 mt-2"># JavaScript example</p>
          <p className="text-gray-300">const res = await fetch('https://api.n0va.ai/api/v1/campaigns', &lbrace;</p>
          <p className="text-gray-300">  headers: &lbrace;</p>
          <p className="text-gray-300">    'Authorization': 'Bearer ' + '&lt;YOUR_API_KEY&gt;',</p>
          <p className="text-gray-300">    'x-tenant-id': 'your_tenant_id',</p>
          <p className="text-gray-300">  &rbrace;</p>
          <p className="text-gray-300">&rbrace;);</p>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="card p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">Create API Key</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Key Name *</label>
                <input className="input w-full" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Production API Key" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Expires In</label>
                <select className="input w-full" value={createForm.expiresInDays} onChange={e => setCreateForm({ ...createForm, expiresInDays: Number(e.target.value) })}>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                  <option value={365}>1 year</option>
                  <option value={0}>Never expires</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-2">Scopes</label>
                <div className="grid grid-cols-2 gap-2">
                  {scopes.map((s) => (
                    <label key={s.key} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${createForm.scopes.includes(s.key) ? "border-n0va-500/50 bg-n0va-600/10" : "border-gray-800"}`}>
                      <input type="checkbox" className="sr-only" checked={createForm.scopes.includes(s.key)} onChange={() => toggleScope(s.key)} />
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${createForm.scopes.includes(s.key) ? "bg-n0va-500 border-n0va-500" : "border-gray-600"}`}>
                        {createForm.scopes.includes(s.key) && <CheckCheck className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <div>
                        <p className="text-xs text-white">{s.label}</p>
                        <p className="text-[10px] text-gray-500">{s.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <button onClick={handleCreate} className="btn-primary flex-1">Create Key</button>
              <button onClick={() => setShowCreate(false)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showKey && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowKey(null)}>
          <div className="card p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <AlertCircle className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-white mb-2 text-center">API Key Created</h2>
            <p className="text-xs text-gray-500 text-center mb-4">Copy this key now. You won't be able to see it again.</p>
            <div className="bg-gray-950 rounded-lg p-3 flex items-center gap-2">
              <code className="flex-1 text-xs text-green-400 break-all">{showKey}</code>
              <button onClick={() => copyToClipboard(showKey)} className="btn-ghost p-1.5 shrink-0">
                {copied === showKey ? <CheckCheck className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
              </button>
            </div>
            <button onClick={() => setShowKey(null)} className="btn-primary w-full mt-4">I've Saved the Key</button>
          </div>
        </div>
      )}
    </div>
  );
}
