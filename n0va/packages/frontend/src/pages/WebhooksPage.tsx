import { useEffect, useState } from "react";
import { Webhook, Plus, Trash2, Play, CheckCircle, XCircle, Clock, ToggleLeft, ToggleRight, Activity, RotateCw } from "lucide-react";
import { api } from "../api/client";

const availableEvents = [
  "campaign.created", "campaign.launched", "campaign.paused", "campaign.archived",
  "budget.alert", "fraud.detected", "creative.fatigue", "audience.updated",
  "platform.connected", "platform.error", "agent.run", "recipe.executed",
];

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", events: [] as string[], retryCount: 3, timeout: 10000 });
  const [testForm, setTestForm] = useState({ type: "campaign.created", source: "api", payload: "{}" });
  const [testResult, setTestResult] = useState<string | null>(null);
  const [detailWh, setDetailWh] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => { loadWebhooks(); }, []);

  async function loadWebhooks() {
    setLoading(true);
    try {
      setWebhooks(await api.webhooks.list());
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await api.webhooks.create(form as any);
    setShowCreate(false);
    setForm({ name: "", url: "", events: [], retryCount: 3, timeout: 10000 });
    loadWebhooks();
  }

  async function deleteWebhook(id: string) {
    await api.webhooks.delete(id);
    if (detailWh?.id === id) { setDetailWh(null); setDeliveries([]); }
    loadWebhooks();
  }

  async function toggleWebhook(wh: any) {
    await api.webhooks.update(wh.id, { enabled: !wh.enabled });
    loadWebhooks();
  }

  async function openDetail(wh: any) {
    setDetailWh(wh);
    setDeliveriesLoading(true);
    try {
      setDeliveries(await api.webhooks.deliveries(wh.id));
    } finally {
      setDeliveriesLoading(false);
    }
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
    } catch (err: any) {
      setTestResult(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setTestLoading(false);
    }
  }

  function toggleEvent(event: string) {
    setForm((prev) => ({ ...prev, events: prev.events.includes(event) ? prev.events.filter((e) => e !== event) : [...prev.events, event] }));
  }

  const deliveryIcon = (status: string) => {
    switch (status) {
      case "delivered": return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "failed": return <XCircle className="w-4 h-4 text-red-400" />;
      case "retrying": return <RotateCw className="w-4 h-4 text-yellow-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Webhooks</h1>
          <p className="text-gray-500 mt-1">Bidirectional triggers for cross-module integration</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary flex items-center gap-2" onClick={() => { setShowTest(true); setTestResult(null); }}>
            <Play className="w-4 h-4" /> Test Emit
          </button>
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> New Webhook
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-4">Create Webhook</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Slack Campaign Alerts" required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Webhook URL</label>
                <input className="input font-mono text-xs" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://hooks.slack.com/services/..." required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Events</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {availableEvents.map((event) => (
                    <label key={event} className="flex items-center gap-2 text-sm text-gray-300 p-2 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700">
                      <input type="checkbox" checked={form.events.includes(event)} onChange={() => toggleEvent(event)} className="w-4 h-4 text-n0va-600 bg-gray-700 border-gray-600 rounded" />
                      {event}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Retry Count</label>
                  <input className="input" type="number" value={form.retryCount} onChange={(e) => setForm({ ...form, retryCount: parseInt(e.target.value) })} min={0} max={10} />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Timeout (ms)</label>
                  <input className="input" type="number" value={form.timeout} onChange={(e) => setForm({ ...form, timeout: parseInt(e.target.value) })} min={1000} max={60000} step={1000} />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Webhook</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTest && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-lg mx-4">
            <h2 className="text-lg font-semibold text-white mb-4">Test Event Emission</h2>
            <form onSubmit={handleTestEmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Event Type</label>
                <select className="select" value={testForm.type} onChange={(e) => setTestForm({ ...testForm, type: e.target.value })}>
                  {availableEvents.map((ev) => <option key={ev} value={ev}>{ev}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Source</label>
                <input className="input" value={testForm.source} onChange={(e) => setTestForm({ ...testForm, source: e.target.value })} placeholder="api" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Payload (JSON)</label>
                <textarea className="input font-mono text-xs h-24" value={testForm.payload} onChange={(e) => setTestForm({ ...testForm, payload: e.target.value })} placeholder='{"key": "value"}' />
              </div>
              {testResult && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Result</label>
                  <pre className="text-xs text-gray-400 bg-gray-950 rounded-lg p-3 max-h-32 overflow-x-auto">{testResult}</pre>
                </div>
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

      {detailWh && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Webhook className="w-5 h-5 text-n0va-400" />
                <div>
                  <h2 className="text-lg font-semibold text-white">{detailWh.name}</h2>
                  <p className="text-xs text-gray-500 font-mono">{detailWh.url}</p>
                </div>
              </div>
              <button className="text-gray-500 hover:text-white" onClick={() => { setDetailWh(null); setDeliveries([]); }}><div className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
              <div className="bg-gray-800 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-white">{detailWh.events.length}</p>
                <p className="text-xs text-gray-500">Events</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-white">{detailWh.retryCount}</p>
                <p className="text-xs text-gray-500">Retries</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-white">{detailWh.timeout}ms</p>
                <p className="text-xs text-gray-500">Timeout</p>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-semibold text-white mb-2">Subscribed Events</h3>
              <div className="flex flex-wrap gap-1">
                {detailWh.events.map((event: string) => (<span key={event} className="badge bg-gray-800 text-gray-400 text-xs">{event}</span>))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-white">Delivery Log ({deliveries.length})</h3>
                {deliveriesLoading && <div className="animate-spin w-4 h-4 border-2 border-n0va-500 border-t-transparent rounded-full" />}
              </div>
              {deliveries.length === 0 && !deliveriesLoading ? (
                <p className="text-xs text-gray-500">No deliveries yet.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {deliveries.map((d: any) => (
                    <div key={d.id} className="flex items-start gap-3 p-2 bg-gray-800 rounded-lg text-xs">
                      {deliveryIcon(d.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300 font-medium capitalize">{d.status}</span>
                          <span className="text-gray-500">{d.attempts}/{d.maxRetries} attempts</span>
                        </div>
                        {d.statusCode && <p className="text-gray-500">HTTP {d.statusCode}</p>}
                        {d.error && <p className="text-red-400 truncate">{d.error}</p>}
                        <p className="text-gray-600">{new Date(d.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-3">
              <button className="btn-danger p-2 text-xs" onClick={() => { deleteWebhook(detailWh.id); }}>
                <Trash2 className="w-4 h-4" />
              </button>
              <button className="btn-secondary text-xs" onClick={() => { setDetailWh(null); setDeliveries([]); }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card animate-pulse"><div className="h-16 bg-gray-800 rounded-lg" /></div>
          ))}
        </div>
      ) : webhooks.length === 0 ? (
        <div className="card text-center py-12">
          <Webhook className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No webhooks configured. Create your first bidirectional trigger.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <div key={wh.id} className="card cursor-pointer hover:border-gray-700 transition-colors" onClick={() => openDetail(wh)}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <Webhook className="w-5 h-5 text-n0va-400 shrink-0" />
                    <h3 className="text-white font-semibold truncate">{wh.name}</h3>
                    <span className={`badge shrink-0 ${wh.enabled ? "badge-active" : "badge-draft"}`}>{wh.enabled ? "Active" : "Disabled"}</span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono truncate mb-2">{wh.url}</p>
                  <div className="flex flex-wrap gap-1">
                    {wh.events.slice(0, 5).map((event: string) => (<span key={event} className="badge bg-gray-800 text-gray-400 text-xs">{event}</span>))}
                    {wh.events.length > 5 && <span className="badge bg-gray-800 text-gray-500 text-xs">+{wh.events.length - 5}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3" onClick={(e) => e.stopPropagation()}>
                  <span className="text-xs text-gray-500 hidden md:inline">{wh.retryCount}r · {wh.timeout}ms</span>
                  <button className="text-gray-500 hover:text-n0va-400 p-1" onClick={() => toggleWebhook(wh)} title={wh.enabled ? "Disable" : "Enable"}>
                    {wh.enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                  <button className="text-gray-500 hover:text-red-400 p-1" onClick={() => deleteWebhook(wh.id)}><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
