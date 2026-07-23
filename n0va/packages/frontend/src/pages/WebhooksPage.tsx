import { useEffect, useState } from "react";
import { Webhook, Plus, Trash2, Play, CheckCircle, XCircle, Clock } from "lucide-react";

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  retryCount: number;
  timeout: number;
  enabled: boolean;
  createdAt: string;
}

const availableEvents = [
  "campaign.created", "campaign.launched", "campaign.paused", "campaign.archived",
  "budget.alert", "fraud.detected", "creative.fatigue", "audience.updated",
  "platform.connected", "platform.error", "agent.run", "recipe.executed",
];

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", events: [] as string[], retryCount: 3, timeout: 10000 });

  useEffect(() => { loadWebhooks(); }, []);

  async function loadWebhooks() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/webhooks");
      setWebhooks(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/v1/webhooks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + btoa(JSON.stringify({ userId: "user_001", tenantId: "tenant_001", role: "admin" })),
        "x-tenant-id": "tenant_001",
      },
      body: JSON.stringify(form),
    });
    setShowCreate(false);
    setForm({ name: "", url: "", events: [], retryCount: 3, timeout: 10000 });
    loadWebhooks();
  }

  async function deleteWebhook(id: string) {
    await fetch(`/api/v1/webhooks/${id}`, { method: "DELETE" });
    loadWebhooks();
  }

  function toggleEvent(event: string) {
    setForm((prev) => ({
      ...prev,
      events: prev.events.includes(event) ? prev.events.filter((e) => e !== event) : [...prev.events, event],
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Webhooks</h1>
          <p className="text-gray-500 mt-1">Bidirectional triggers for cross-module integration</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> New Webhook
        </button>
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

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-n0va-500 border-t-transparent rounded-full" /></div>
      ) : webhooks.length === 0 ? (
        <div className="card text-center py-12">
          <Webhook className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No webhooks configured. Create your first bidirectional trigger.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <div key={wh.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Webhook className="w-5 h-5 text-n0va-400" />
                    <h3 className="text-white font-semibold">{wh.name}</h3>
                    <span className={`badge ${wh.enabled ? "badge-active" : "badge-draft"}`}>{wh.enabled ? "Active" : "Disabled"}</span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono mb-2">{wh.url}</p>
                  <div className="flex flex-wrap gap-1">
                    {wh.events.map((event) => (
                      <span key={event} className="badge bg-gray-800 text-gray-400 text-xs">{event}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{wh.retryCount} retries | {wh.timeout}ms timeout</span>
                  <button className="btn-danger p-2" onClick={() => deleteWebhook(wh.id)}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
