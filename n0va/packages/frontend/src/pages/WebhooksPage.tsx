import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Webhook, Plus, Trash2, Play, CheckCircle, XCircle, Clock, ToggleLeft, ToggleRight, ExternalLink, Search, BarChart3, Key, Eye, EyeOff, ChevronDown, ChevronUp, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../api/client";
import { useToast } from "../components/Toast";

const AVAILABLE_EVENTS = [
  "campaign.created", "campaign.launched", "campaign.paused", "campaign.archived",
  "budget.alert", "fraud.detected", "creative.fatigue", "audience.updated",
  "platform.connected", "platform.error", "agent.run", "recipe.executed",
];

export default function WebhooksPage() {
  const { addToast } = useToast();
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", events: [] as string[], retryCount: 3, timeout: 10000 });
  const [testForm, setTestForm] = useState({ type: "campaign.created", source: "api", payload: "{}" });
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showSecrets, setShowSecrets] = useState<Set<string>>(new Set());
  const [expandedDeliveries, setExpandedDeliveries] = useState<string | null>(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryData, setDeliveryData] = useState<any[]>([]);

  useEffect(() => { loadWebhooks(); }, []);

  async function loadWebhooks() {
    setLoading(true);
    try {
      const list = await api.webhooks.list();
      setWebhooks(list || []);
      const deliveryMap: Record<string, any[]> = {};
      for (const wh of (list || [])) {
        try {
          const dlv = await api.webhooks.deliveries(wh._id || wh.id);
          deliveryMap[wh._id || wh.id] = dlv || [];
        } catch { deliveryMap[wh._id || wh.id] = []; }
      }
      setDeliveries(deliveryMap);
    } finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.url.trim()) { addToast("error", "Name and URL are required"); return; }
    try {
      await api.webhooks.create({ ...form, enabled: true } as any);
      addToast("success", "Webhook created");
      setShowCreate(false);
      setForm({ name: "", url: "", events: [], retryCount: 3, timeout: 10000 });
      loadWebhooks();
    } catch { addToast("error", "Failed to create webhook"); }
  }

  async function handleDelete(id: string) {
    try {
      await api.webhooks.delete(id);
      addToast("success", "Webhook deleted");
      loadWebhooks();
    } catch { addToast("error", "Failed to delete webhook"); }
  }

  async function toggleWebhook(wh: any) {
    try {
      await api.webhooks.update(wh._id || wh.id, { enabled: !wh.enabled });
      addToast("success", wh.enabled ? "Webhook disabled" : "Webhook enabled");
      loadWebhooks();
    } catch { addToast("error", "Failed to toggle webhook"); }
  }

  async function handleTestEmit(e: React.FormEvent) {
    e.preventDefault();
    setTestLoading(true);
    setTestResult(null);
    try {
      let payload: any;
      try { payload = JSON.parse(testForm.payload); } catch { payload = { test: true, message: testForm.payload }; }
      const data = await api.webhooks.testEmit({ type: testForm.type, source: testForm.source, payload });
      setTestResult(JSON.stringify(data, null, 2));
      addToast("success", "Test event emitted");
    } catch (err: any) {
      setTestResult(JSON.stringify({ error: err.message }, null, 2));
    } finally { setTestLoading(false); }
  }

  function toggleEvent(event: string) {
    setForm((prev) => ({ ...prev, events: prev.events.includes(event) ? prev.events.filter((e) => e !== event) : [...prev.events, event] }));
  }

  function toggleSecret(id: string) {
    setShowSecrets((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function handleShowDeliveries(whId: string) {
    const dlv = deliveries[whId] || [];
    setDeliveryData(dlv);
    setShowDeliveryModal(true);
  }

  const filtered = useMemo(() => {
    if (!search) return webhooks;
    const q = search.toLowerCase();
    return webhooks.filter((wh) =>
      (wh.name || "").toLowerCase().includes(q) ||
      (wh.url || "").toLowerCase().includes(q) ||
      (wh.events || []).some((e: string) => e.toLowerCase().includes(q))
    );
  }, [webhooks, search]);

  const totalDeliveries = useMemo(() => {
    return Object.values(deliveries).reduce((sum, d) => sum + d.length, 0);
  }, [deliveries]);

  const successRate = useMemo(() => {
    let total = 0, success = 0;
    for (const d of Object.values(deliveries)) {
      for (const item of d) {
        total++;
        if (item.status === "delivered" || item.status === "success") success++;
      }
    }
    return total > 0 ? Math.round((success / total) * 100) : 0;
  }, [deliveries]);

  const chartData = useMemo(() => {
    return webhooks.map((wh) => ({
      name: (wh.name || "Unknown").substring(0, 14),
      Deliveries: (deliveries[wh._id || wh.id] || []).length,
      Status: wh.enabled ? 1 : 0,
    }));
  }, [webhooks, deliveries]);

  function handleExport() {
    const headers = ["Name", "URL", "Events", "Enabled", "Deliveries", "Created"];
    const rows = webhooks.map((wh) => [
      wh.name || "", wh.url || "", (wh.events || []).join(";"), wh.enabled ? "Yes" : "No",
      (deliveries[wh._id || wh.id] || []).length, wh.createdAt ? new Date(wh.createdAt).toISOString() : "",
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "webhooks-export.csv"; a.click();
    URL.revokeObjectURL(url);
    addToast("success", "Exported webhooks");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Webhooks</h1>
          <p className="text-gray-500 mt-1">Bidirectional triggers for cross-module integration</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost text-xs flex items-center gap-1.5" onClick={handleExport}><Download className="w-3.5 h-3.5" /> Export</button>
          <button className="btn-secondary flex items-center gap-2 text-sm" onClick={() => { setShowTest(true); setTestResult(null); }}>
            <Play className="w-3.5 h-3.5" /> Test Emit
          </button>
          <button className="btn-primary flex items-center gap-2 text-sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5" /> New Webhook
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-3"><p className="text-[10px] text-gray-500">Total Webhooks</p><p className="text-lg font-bold text-white">{webhooks.length}</p></div>
        <div className="card p-3"><p className="text-[10px] text-gray-500">Active</p><p className="text-lg font-bold text-green-400">{webhooks.filter(w => w.enabled).length}</p></div>
        <div className="card p-3"><p className="text-[10px] text-gray-500">Total Deliveries</p><p className="text-lg font-bold text-white">{totalDeliveries}</p></div>
        <div className="card p-3"><p className="text-[10px] text-gray-500">Success Rate</p><p className="text-lg font-bold text-white">{successRate}%</p></div>
      </div>

      {chartData.length > 1 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-n0va-400" />
            <h3 className="text-sm font-semibold text-white">Delivery Volume</h3>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} />
              <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", fontSize: "11px" }} />
              <Bar dataKey="Deliveries" fill="#6366f1" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input className="input pl-10" placeholder="Search webhooks by name, URL, or event..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Create Webhook</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><label className="label">Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Slack Campaign Alerts" required /></div>
              <div><label className="label">Webhook URL</label><input className="input font-mono text-xs" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://hooks.slack.com/services/..." required /></div>
              <div><label className="label">Events</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {AVAILABLE_EVENTS.map((event) => (
                    <label key={event} className="flex items-center gap-2 text-sm text-gray-300 p-2 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700">
                      <input type="checkbox" checked={form.events.includes(event)} onChange={() => toggleEvent(event)} className="w-4 h-4 text-n0va-600 bg-gray-700 border-gray-600 rounded" />
                      {event}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Retry Count</label><input className="input" type="number" value={form.retryCount} onChange={(e) => setForm({ ...form, retryCount: parseInt(e.target.value) })} min={0} max={10} /></div>
                <div><label className="label">Timeout (ms)</label><input className="input" type="number" value={form.timeout} onChange={(e) => setForm({ ...form, timeout: parseInt(e.target.value) })} min={1000} max={60000} step={1000} /></div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Webhook</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test modal */}
      {showTest && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Test Event Emission</h2>
              <button onClick={() => setShowTest(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleTestEmit} className="space-y-4">
              <div><label className="label">Event Type</label>
                <select className="select" value={testForm.type} onChange={(e) => setTestForm({ ...testForm, type: e.target.value })}>
                  {AVAILABLE_EVENTS.map((ev) => <option key={ev} value={ev}>{ev}</option>)}
                </select>
              </div>
              <div><label className="label">Source</label><input className="input" value={testForm.source} onChange={(e) => setTestForm({ ...testForm, source: e.target.value })} placeholder="api" /></div>
              <div><label className="label">Payload (JSON)</label><textarea className="input font-mono text-xs h-24" value={testForm.payload} onChange={(e) => setTestForm({ ...testForm, payload: e.target.value })} placeholder='{"key": "value"}' /></div>
              {testResult && (
                <div><label className="label">Result</label><pre className="text-xs text-gray-400 bg-gray-950 rounded-lg p-3 max-h-32 overflow-x-auto">{testResult}</pre></div>
              )}
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowTest(false)}>Close</button>
                <button type="submit" className="btn-primary" disabled={testLoading}>
                  {testLoading ? <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" /> Emitting...</> : "Emit Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delivery log modal */}
      {showDeliveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowDeliveryModal(false)}>
          <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Clock className="w-5 h-5 text-n0va-400" /> Delivery Logs</h3>
              <button onClick={() => setShowDeliveryModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            {deliveryData.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No delivery records yet.</p>
            ) : (
              <div className="space-y-2">
                {deliveryData.map((d, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/30">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${d.status === "delivered" || d.status === "success" ? "bg-green-400" : "bg-red-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white">{d.event || d.type || "Unknown"}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${d.status === "delivered" || d.status === "success" ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10"}`}>{d.status}</span>
                        {d.statusCode && <span className="text-xs text-gray-600">HTTP {d.statusCode}</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{d.url || d.endpoint || "—"}</p>
                      <p className="text-[10px] text-gray-700">{d.timestamp ? new Date(d.timestamp).toLocaleString() : "—"}{d.duration ? ` · ${d.duration}ms` : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card animate-pulse"><div className="h-16 bg-gray-800 rounded-lg" /></div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Webhook className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">{search ? "No webhooks match your search" : "No webhooks configured. Create your first bidirectional trigger."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((wh) => {
            const whId = wh._id || wh.id;
            const whDeliveries = deliveries[whId] || [];
            const whSuccess = whDeliveries.filter((d: any) => d.status === "delivered" || d.status === "success").length;
            const whRate = whDeliveries.length > 0 ? Math.round((whSuccess / whDeliveries.length) * 100) : 0;
            const showSecret = showSecrets.has(whId);
            return (
              <div key={whId} className="card hover:border-gray-700 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Webhook className="w-5 h-5 text-n0va-400 shrink-0" />
                      <h3 className="text-white font-semibold truncate">{wh.name}</h3>
                      <span className={`badge shrink-0 ${wh.enabled ? "badge-active" : "badge-draft"}`}>{wh.enabled ? "Active" : "Disabled"}</span>
                      {whDeliveries.length > 0 && (
                        <span className={`text-xs ${whRate >= 80 ? "text-green-400" : whRate >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                          {whRate}% success
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 font-mono truncate mb-1">{wh.url}</p>
                    {wh.secret && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <Key className="w-3 h-3 text-gray-600" />
                        <span className="text-xs font-mono text-gray-600">
                          {showSecret ? wh.secret : "••••••••" + (wh.secret?.slice(-4) || "")}
                        </span>
                        <button className="text-gray-600 hover:text-gray-400" onClick={() => toggleSecret(whId)}>
                          {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1 items-center">
                      {wh.events?.slice(0, 5).map((event: string) => (<span key={event} className="badge bg-gray-800 text-gray-400 text-xs">{event}</span>))}
                      {wh.events?.length > 5 && <span className="badge bg-gray-800 text-gray-500 text-xs">+{wh.events.length - 5}</span>}
                      <span className="text-[10px] text-gray-700 ml-1">{whDeliveries.length} deliveries</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    <button className="text-gray-500 hover:text-n0va-400 p-1" onClick={() => handleShowDeliveries(whId)} title="Delivery logs"><Clock className="w-4 h-4" /></button>
                    <Link to={`/webhooks/${whId}`} className="text-gray-500 hover:text-n0va-400 p-1" title="View details"><ExternalLink className="w-4 h-4" /></Link>
                    <button className="text-gray-500 hover:text-n0va-400 p-1" onClick={() => toggleWebhook(wh)} title={wh.enabled ? "Disable" : "Enable"}>
                      {wh.enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button className="text-gray-500 hover:text-red-400 p-1" onClick={() => handleDelete(whId)} title="Delete"><Trash2 className="w-4 h-4" /></button>
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
