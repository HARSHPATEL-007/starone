import { useState, useEffect } from "react";
import { Globe, Key, Terminal, Webhook, BookOpen, Shield, CheckCircle, XCircle, Loader, Plus, RefreshCw, Copy, ExternalLink, Play } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";

type Tab = "sessions" | "sandbox" | "intents" | "webhooks" | "catalog";

export default function N0VA1OGateway() {
  const { addToast } = useToast();
  const [tab, setTab] = useState<Tab>("sessions");
  const [sessions, setSessions] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<Record<string, { count: number; examples: string[] }>>({});
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [intents, setIntents] = useState<any[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState("meta_ads");
  const [loading, setLoading] = useState(true);
  const [jitPlatform, setJitPlatform] = useState("google_ads");
  const [jitScopes, setJitScopes] = useState("campaign_create,performance_read");
  const [whSource, setWhSource] = useState("meta_ads");
  const [whEvent, setWhEvent] = useState("campaign_created");
  const [whUrl, setWhUrl] = useState("");
  const [sandboxScript, setSandboxScript] = useState("");
  const [sandboxRuntime, setSandboxRuntime] = useState("python");
  const [sandboxResult, setSandboxResult] = useState<any>(null);
  const [intentInput, setIntentInput] = useState("campaign_create");
  const [intentPlatforms, setIntentPlatforms] = useState("meta_ads,google_ads");
  const [intentResult, setIntentResult] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [s, c, w] = await Promise.all([
        api.n0va1o.activeSessions().catch(() => ({ data: [] })),
        api.n0va1o.catalog().catch(() => ({})),
        api.n0va1o.webhooks().catch(() => ({ data: [] })),
      ]);
      setSessions(s.data || s || []);
      setCatalog(c.data || c || {});
      setWebhooks(w.data || w || []);
    } finally { setLoading(false); }
  }

  async function handleProvisionJIT() {
    try {
      const res = await api.n0va1o.provisionJIT(jitPlatform, jitScopes.split(",").map(s => s.trim()));
      addToast("success", `JIT session ${res.sessionId?.slice(0, 12)}... provisioned`);
      loadData();
    } catch (e: any) { addToast("error", e.message); }
  }

  async function handleRegisterWebhook() {
    try {
      await api.n0va1o.registerWebhook(whSource, whEvent, whUrl);
      addToast("success", "Webhook registered");
      setWhUrl("");
      loadData();
    } catch (e: any) { addToast("error", e.message); }
  }

  async function handleRunSandbox() {
    if (!sandboxScript.trim()) return;
    try {
      const res = await api.n0va1o.createSandbox(sandboxScript, sandboxRuntime);
      setSandboxResult(res);
      addToast("success", "Sandbox execution completed");
    } catch (e: any) { addToast("error", e.message); }
  }

  async function handleResolveIntent() {
    try {
      const res = await api.n0va1o.resolveIntent(intentInput, intentPlatforms.split(",").map(s => s.trim()));
      setIntentResult(res);
    } catch (e: any) { addToast("error", e.message); }
  }

  async function loadIntents() {
    try {
      const res = await api.n0va1o.intents(selectedPlatform);
      setIntents(res.data || res || []);
    } catch { setIntents([]); }
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "sessions", label: "JIT Sessions", icon: Key },
    { key: "sandbox", label: "Sandbox", icon: Terminal },
    { key: "intents", label: "Intent Routing", icon: Globe },
    { key: "webhooks", label: "Webhooks", icon: Webhook },
    { key: "catalog", label: "Integration Catalog", icon: BookOpen },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Shield className="w-6 h-6 text-n0va-400" /> N0VA1O Gateway
          </h1>
          <p className="text-gray-400 mt-1">
            JIT auth provisioning, ephemeral sandbox execution, intent-driven routing, and bidirectional webhook triggers
          </p>
        </div>
        <button onClick={loadData} className="btn-secondary btn-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="flex gap-1 border-b border-gray-800 pb-0">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? "border-n0va-400 text-white" : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          ><t.icon className="w-4 h-4" /> {t.label}</button>
        ))}
      </div>

      {tab === "sessions" && (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-n0va-400" /> Provision JIT Auth
            </h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="label">Platform</label>
                <select value={jitPlatform} onChange={e => setJitPlatform(e.target.value)} className="input">
                  {["google_ads", "meta_ads", "linkedin_ads", "tiktok_ads"].map(p => <option key={p} value={p}>{p.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">Scopes (comma-separated)</label>
                <input value={jitScopes} onChange={e => setJitScopes(e.target.value)} className="input" placeholder="campaign_create, performance_read" />
              </div>
            </div>
            <button onClick={handleProvisionJIT} className="btn-primary"><Plus className="w-4 h-4" /> Provision Session</button>
          </div>
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Active Sessions</h2>
            {sessions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No active JIT sessions</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-gray-400 border-b border-gray-800">
                    <th className="text-left py-2 px-3">Session ID</th>
                    <th className="text-left py-2 px-3">Platform</th>
                    <th className="text-left py-2 px-3">Scopes</th>
                    <th className="text-left py-2 px-3">Expires</th>
                    <th className="text-left py-2 px-3">Status</th>
                  </tr></thead>
                  <tbody>
                    {sessions.map((s: any) => (
                      <tr key={s.sessionId} className="border-b border-gray-800/50 text-gray-300">
                        <td className="py-2 px-3 font-mono text-xs">{s.sessionId?.slice(0, 16)}...</td>
                        <td className="py-2 px-3">{s.platform?.replace("_", " ")}</td>
                        <td className="py-2 px-3">{s.scopes?.join(", ")}</td>
                        <td className="py-2 px-3">{new Date(s.expiresAt).toLocaleString()}</td>
                        <td className="py-2 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                            s.status === "active" ? "bg-green-900/50 text-green-400" : "bg-gray-800 text-gray-500"
                          }`}>
                            {s.status === "active" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "sandbox" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-n0va-400" /> Execute Script
            </h2>
            <div className="mb-4">
              <label className="label">Runtime</label>
              <select value={sandboxRuntime} onChange={e => setSandboxRuntime(e.target.value)} className="input">
                <option value="python">Python</option>
                <option value="r">R</option>
                <option value="node">Node.js</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="label">Script</label>
              <textarea value={sandboxScript} onChange={e => setSandboxScript(e.target.value)}
                className="input font-mono text-xs h-32" placeholder="# Enter script or data: payload" />
            </div>
            <button onClick={handleRunSandbox} className="btn-primary" disabled={!sandboxScript.trim()}>
              <Play className="w-4 h-4" /> Execute
            </button>
            {sandboxResult && (
              <div className="mt-4 p-3 bg-gray-900 rounded-lg border border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  {sandboxResult.status === "completed" ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className={`text-sm font-medium ${sandboxResult.status === "completed" ? "text-green-400" : "text-red-400"}`}>
                    {sandboxResult.status}
                  </span>
                </div>
                <pre className="text-xs text-gray-300 whitespace-pre-wrap">{sandboxResult.result || sandboxResult.error}</pre>
              </div>
            )}
          </div>
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Security Boundaries</h2>
            <div className="space-y-3">
              {[
                { label: "Network", desc: "Outbound only, allowlisted domains" },
                { label: "Filesystem", desc: "Isolated VFS per sandbox" },
                { label: "Memory", desc: "64MB heap limit per execution" },
                { label: "Duration", desc: "30s timeout per script" },
              ].map(b => (
                <div key={b.label} className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg border border-gray-800">
                  <Shield className="w-5 h-5 text-n0va-400" />
                  <div><p className="text-sm font-medium text-white">{b.label}</p><p className="text-xs text-gray-400">{b.desc}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "intents" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Resolve Intent</h2>
            <div className="mb-4">
              <label className="label">Intent</label>
              <select value={intentInput} onChange={e => setIntentInput(e.target.value)} className="input">
                {["campaign_create", "audience_sync", "creative_upload", "bid_adjust", "performance_read", "keyword_extract", "budget_update", "lead_gen"].map(i => (
                  <option key={i} value={i}>{i.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="label">Platforms (comma-separated)</label>
              <input value={intentPlatforms} onChange={e => setIntentPlatforms(e.target.value)} className="input" />
            </div>
            <button onClick={handleResolveIntent} className="btn-primary"><Globe className="w-4 h-4" /> Resolve</button>
            {intentResult && (
              <div className="mt-4 p-3 bg-gray-900 rounded-lg border border-gray-800">
                <p className="text-sm text-green-400 mb-1">Resolved to {intentResult.platforms?.length} platform(s)</p>
                <p className="text-xs text-gray-400">Actions: {intentResult.actions?.join(", ")}</p>
                <p className="text-xs text-gray-400">Priority: {intentResult.priority}</p>
              </div>
            )}
          </div>
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Available Intents</h2>
            <div className="mb-4">
              <label className="label">Platform</label>
              <select value={selectedPlatform} onChange={e => { setSelectedPlatform(e.target.value); }} className="input">
                {["meta_ads", "google_ads", "linkedin_ads", "tiktok_ads"].map(p => <option key={p} value={p}>{p.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
              </select>
            </div>
            <button onClick={loadIntents} className="btn-secondary mb-4"><RefreshCw className="w-4 h-4" /> Load Intents</button>
            {intents.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {intents.map((i: string) => (
                  <span key={i} className="px-3 py-1 bg-n0va-600/20 text-n0va-400 rounded-full text-xs border border-n0va-600/30">
                    {i.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Click "Load Intents" to see available intents</p>
            )}
          </div>
        </div>
      )}

      {tab === "webhooks" && (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Webhook className="w-5 h-5 text-n0va-400" /> Register Webhook
            </h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="label">Source</label>
                <select value={whSource} onChange={e => setWhSource(e.target.value)} className="input">
                  {["meta_ads", "google_ads", "linkedin_ads", "tiktok_ads"].map(p => <option key={p} value={p}>{p.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Event Type</label>
                <select value={whEvent} onChange={e => setWhEvent(e.target.value)} className="input">
                  {["campaign_created", "budget_updated", "performance_alert", "audience_synced"].map(e => (
                    <option key={e} value={e}>{e.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Callback URL</label>
                <input value={whUrl} onChange={e => setWhUrl(e.target.value)} className="input" placeholder="https://hooks.example.com/callback" />
              </div>
            </div>
            <button onClick={handleRegisterWebhook} className="btn-primary" disabled={!whUrl}><Plus className="w-4 h-4" /> Register</button>
          </div>
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Registered Webhooks</h2>
            {webhooks.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No webhooks registered</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-gray-400 border-b border-gray-800">
                    <th className="text-left py-2 px-3">ID</th>
                    <th className="text-left py-2 px-3">Source</th>
                    <th className="text-left py-2 px-3">Event</th>
                    <th className="text-left py-2 px-3">Callback URL</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3">Last Triggered</th>
                  </tr></thead>
                  <tbody>
                    {webhooks.map((w: any) => (
                      <tr key={w.id} className="border-b border-gray-800/50 text-gray-300">
                        <td className="py-2 px-3 font-mono text-xs">{w.id?.slice(0, 12)}...</td>
                        <td className="py-2 px-3">{w.source?.replace("_", " ")}</td>
                        <td className="py-2 px-3">{w.eventType?.replace(/_/g, " ")}</td>
                        <td className="py-2 px-3 text-xs">{w.callbackUrl}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${w.status === "active" ? "bg-green-900/50 text-green-400" : "bg-gray-800 text-gray-500"}`}>
                            {w.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-xs">{w.lastTriggered ? new Date(w.lastTriggered).toLocaleString() : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "catalog" && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-n0va-400" /> Integration Catalog
          </h2>
          {Object.keys(catalog).length === 0 ? (
            <p className="text-gray-500 text-center py-8">Loading catalog...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(catalog).map(([category, info]: [string, any]) => (
                <div key={category} className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-white capitalize">{category.replace(/_/g, " ")}</h3>
                    <span className="text-xs text-n0va-400 font-mono">{info.count} integrations</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {info.examples?.map((ex: string) => (
                      <span key={ex} className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded text-xs">{ex}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
