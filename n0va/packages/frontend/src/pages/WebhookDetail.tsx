import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Webhook, ToggleLeft, ToggleRight, Trash2, CheckCircle, XCircle, RotateCw, Clock, RefreshCw } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

export default function WebhookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [webhook, setWebhook] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  async function loadData() {
    if (!id) return;
    setLoading(true);
    try {
      const wh = await api.webhooks.get(id);
      setWebhook(wh);
    } catch {
      addToast("error", "Webhook not found");
      navigate("/webhooks");
    } finally {
      setLoading(false);
    }
  }

  async function loadDeliveries() {
    if (!id) return;
    setDeliveriesLoading(true);
    try {
      setDeliveries(await api.webhooks.deliveries(id));
    } finally {
      setDeliveriesLoading(false);
    }
  }

  useEffect(() => {
    if (webhook) loadDeliveries();
  }, [webhook]);

  async function toggleWebhook() {
    if (!webhook) return;
    try {
      const updated = await api.webhooks.update(webhook.id, { enabled: !webhook.enabled });
      setWebhook(updated);
      addToast("success", `Webhook ${updated.enabled ? "enabled" : "disabled"}`);
    } catch {
      addToast("error", "Failed to update webhook");
    }
  }

  async function deleteWebhook() {
    if (!id) return;
    try {
      await api.webhooks.delete(id);
      addToast("success", "Webhook deleted");
      navigate("/webhooks");
    } catch {
      addToast("error", "Failed to delete webhook");
    }
  }

  const deliveryIcon = (status: string) => {
    switch (status) {
      case "delivered": return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "failed": return <XCircle className="w-4 h-4 text-red-400" />;
      case "retrying": return <RotateCw className="w-4 h-4 text-yellow-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-5 w-5 bg-gray-800 rounded animate-pulse" />
          <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
        </div>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!webhook) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/webhooks")} className="text-gray-500 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 bg-n0va-500/10 rounded-lg flex items-center justify-center">
            <Webhook className="w-5 h-5 text-n0va-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{webhook.name}</h1>
              <span className={`badge ${webhook.enabled ? "badge-active" : "badge-draft"}`}>
                {webhook.enabled ? "Active" : "Disabled"}
              </span>
            </div>
            <p className="text-gray-500 text-sm font-mono mt-0.5">{webhook.url}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary flex items-center gap-2" onClick={loadDeliveries} disabled={deliveriesLoading}>
            <RefreshCw className={`w-4 h-4 ${deliveriesLoading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button className="btn-secondary flex items-center gap-2" onClick={toggleWebhook}>
            {webhook.enabled ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
            {webhook.enabled ? "Disable" : "Enable"}
          </button>
          <button className="btn-danger flex items-center gap-2" onClick={deleteWebhook}>
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-3">Configuration</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">Event Subscriptions ({webhook.events.length})</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {webhook.events.map((event: string) => (
                    <span key={event} className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded text-xs">{event}</span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-white">{webhook.retryCount}</p>
                  <p className="text-xs text-gray-500">Max Retries</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-white">{webhook.timeout}ms</p>
                  <p className="text-xs text-gray-500">Timeout</p>
                </div>
              </div>
              {webhook.createdAt && (
                <p className="text-xs text-gray-500">Created {new Date(webhook.createdAt).toLocaleDateString()}</p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Delivery Log ({deliveries.length})</h3>
            </div>
            {deliveriesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-gray-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : deliveries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">No deliveries yet. Emit a test event to see delivery logs.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {deliveries.map((d: any) => (
                  <div key={d.id} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                    {deliveryIcon(d.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white font-medium capitalize">{d.status}</span>
                        <span className="text-xs text-gray-500">
                          {d.attempts}/{d.maxRetries || webhook.retryCount} attempts
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        {d.statusCode && <span>HTTP {d.statusCode}</span>}
                        {d.status === "delivered" && d.latencyMs && <span>{(d.latencyMs / 1000).toFixed(1)}s</span>}
                        <span>{new Date(d.createdAt).toLocaleString()}</span>
                      </div>
                      {d.error && <p className="text-xs text-red-400 mt-1 truncate">{d.error}</p>}
                    </div>
                    {d.responseBody && (
                      <details className="text-xs text-gray-500 shrink-0">
                        <summary className="cursor-pointer hover:text-gray-300">Response</summary>
                        <pre className="mt-1 p-2 bg-gray-900 rounded max-w-xs overflow-x-auto">{JSON.stringify(d.responseBody, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
