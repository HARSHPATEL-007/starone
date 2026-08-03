import { useEffect, useState, useCallback } from "react";
import {
  Webhook, RefreshCw, AlertTriangle, Plus, Trash2, Zap, CheckCircle2, XCircle, Copy, Send, Activity,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const STATUS_COLOR: Record<string, string> = {
  delivered: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30",
  ping: "bg-sky-500/15 text-sky-400 border-sky-500/30",
};

export default function MailWebhooks() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [hooks, setHooks] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<{ url: string; label: string; events: string[] }>({ url: "", label: "", events: ["mail.received"] });

  const load = useCallback(async () => {
    const [d, h, del] = await Promise.all([
      api.adsMarketingModule.mailWebhookOverview().catch(() => null),
      api.adsMarketingModule.mailWebhookList().catch(() => null),
      api.adsMarketingModule.mailWebhookDeliveries().catch(() => null),
    ]);
    setDash(unwrap(d));
    setHooks(Array.isArray(h) ? h : unwrap(h) || []);
    setDeliveries(Array.isArray(del) ? del : unwrap(del)?.deliveries || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    function refresh() { load(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [load]);
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [autoRefresh, load]);

  async function createHook() {
    setBusy("create");
    const r = unwrap(await api.adsMarketingModule.mailWebhookCreate(form).catch(() => null));
    if (r?.webhookId) {
      addToast("success", r.summary);
      setShowCreate(false);
      setForm({ url: "", label: "", events: ["mail.received"] });
      load();
    } else {
      addToast("error", "Failed to create webhook — check URL and events");
    }
    setBusy(null);
  }

  async function toggleHook(hook: any) {
    setBusy(hook.webhookId + "t");
    const r = unwrap(await api.adsMarketingModule.mailWebhookUpdate(hook.webhookId, { active: !hook.active }).catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setBusy(null);
    load();
  }

  async function testHook(hook: any) {
    setBusy(hook.webhookId + "p");
    const r = unwrap(await api.adsMarketingModule.mailWebhookTest(hook.webhookId).catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setBusy(null);
    load();
  }

  async function deleteHook(hook: any) {
    if (!confirm(`Delete webhook ${hook.url}?`)) return;
    setBusy(hook.webhookId + "d");
    const r = unwrap(await api.adsMarketingModule.mailWebhookDelete(hook.webhookId).catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setBusy(null);
    load();
  }

  async function fireEvent(event: string) {
    setBusy("fire" + event);
    const r = unwrap(await api.adsMarketingModule.mailWebhookTrigger(event, { source: "manual" }).catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setBusy(null);
    load();
  }

  const catalog = dash?.catalog || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Webhook className="w-6 h-6 text-n0va-400" /> Mail Webhooks</h1>
          <p className="text-gray-500 mt-1 text-sm">Outbound event delivery with HMAC signatures (spec §4.4)</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="w-3.5 h-3.5 text-n0va-600 bg-gray-700 border-gray-600 rounded" />
            Auto-refresh 30s
          </label>
          <button className="btn-secondary p-2" onClick={load} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary text-xs" onClick={() => setShowCreate(true)}><Plus className="w-3.5 h-3.5" /> New webhook</button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : !dash ? (
        <div className="card border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-sm text-red-300 font-medium">Webhook data unavailable</p>
              <p className="text-xs text-red-400/70">Check that the backend is running.</p>
            </div>
            <button className="btn-secondary text-xs ml-auto" onClick={load}>Retry</button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{dash.webhooks || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Endpoints</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{dash.active || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Active</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{dash.subscriptions || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Subscriptions</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{dash.totalDeliveries || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Deliveries</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{dash.successRate || 0}%</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Success rate</p>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Zap className="w-4 h-4 text-amber-400" /> Event catalog</h2>
              <span className="text-[10px] text-gray-500">{dash.eventsFired || 0} event type(s) fired</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {catalog.map((e: any) => (
                <button key={e.event} onClick={() => fireEvent(e.event)} title={`${e.desc}. ${e.subscribers} subscriber(s) — click to fire`}
                  className="group text-left border border-gray-700/60 rounded-lg px-2.5 py-1.5 bg-gray-800/40 hover:border-n0va-500/50 transition">
                  <p className="text-[11px] font-mono text-n0va-300">{e.event}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5 truncate max-w-[150px]">{e.desc} · {e.subscribers} sub</p>
                  <p className="text-[9px] text-gray-600 mt-0.5 hidden group-hover:block">Click to fire →</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Send className="w-4 h-4 text-sky-400" /> Endpoints ({hooks.length})</h2>
              {hooks.length === 0 && (
                <div className="card border-dashed border-gray-700 text-center py-6">
                  <p className="text-sm text-gray-500">No webhooks yet — create one to start receiving events.</p>
                </div>
              )}
              {hooks.map((h: any) => (
                <div key={h.webhookId} className="card !p-4">
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{h.label}</p>
                      <p className="text-[11px] text-gray-500 font-mono truncate">{h.url}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {h.events.map((e: string) => (
                          <span key={e} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-n0va-500/10 text-n0va-300 border border-n0va-500/20">{e}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button className="btn-secondary p-1.5" onClick={() => testHook(h)} title="Send test ping" disabled={busy === h.webhookId + "p"}>
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                      </button>
                      <button className="btn-secondary p-1.5" onClick={() => toggleHook(h)} title={h.active ? "Pause" : "Enable"}>
                        <span className={`w-2 h-2 rounded-full ${h.active ? "bg-emerald-400" : "bg-gray-500"}`} />
                      </button>
                      <button className="btn-secondary p-1.5 hover:!border-red-500/40" onClick={() => deleteHook(h)} title="Delete">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                  {h.lastDeliveryAt && (
                    <p className="text-[9px] text-gray-600 mt-2">Last delivery: {new Date(h.lastDeliveryAt).toLocaleString()} · {h.deliveryCounts?.delivered || 0} ok / {h.deliveryCounts?.failed || 0} failed</p>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Activity className="w-4 h-4 text-violet-400" /> Recent deliveries ({deliveries.length})</h2>
              {deliveries.length === 0 && (
                <div className="card border-dashed border-gray-700 text-center py-6">
                  <p className="text-sm text-gray-500">No deliveries yet — ping an endpoint or fire an event.</p>
                </div>
              )}
              {deliveries.slice(0, 8).map((d: any) => (
                <div key={d.deliveryId} className="card !p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${STATUS_COLOR[d.status] || STATUS_COLOR.delivered}`}>{d.status}</span>
                    <span className="text-[11px] font-mono text-gray-300">{d.event}</span>
                    <span className="text-[9px] text-gray-600 ml-auto">{d.attempts} attempt(s) · {d.retries} retry(ies) · {d.latencyMs}ms</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <p className="text-[10px] font-mono text-gray-500 truncate flex-1">X-N0VA-Signature: {d.signature}</p>
                    <button className="text-gray-600 hover:text-gray-300" title="Copy signature"
                      onClick={() => { navigator.clipboard?.writeText(d.signature || ""); addToast("info", "Signature copied"); }}>
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  {d.error && <p className="text-[10px] text-red-400 mt-1">{d.error}</p>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="card w-full max-w-md !p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-white mb-3">New webhook endpoint</h3>
            <label className="block text-[11px] text-gray-400 mb-1">Delivery URL</label>
            <input className="input mb-3 font-mono text-xs" placeholder="https://your-app.com/hooks/n0va"
              value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            <label className="block text-[11px] text-gray-400 mb-1">Label</label>
            <input className="input mb-3" placeholder="Nova alerts"
              value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            <label className="block text-[11px] text-gray-400 mb-1">Events</label>
            <div className="flex flex-wrap gap-1.5 mb-4 max-h-32 overflow-y-auto">
              {(dash?.catalog || []).map((e: any) => {
                const on = form.events.includes(e.event);
                return (
                  <button key={e.event}
                    onClick={() => setForm({ ...form, events: on ? form.events.filter((x) => x !== e.event) : [...form.events, e.event] })}
                    className={`text-[10px] font-mono px-2 py-1 rounded border ${on ? "bg-n0va-500/20 text-n0va-300 border-n0va-500/40" : "bg-gray-800 text-gray-500 border-gray-700"}`}>
                    {e.event}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn-secondary text-xs" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn-primary text-xs" onClick={createHook} disabled={busy === "create" || form.events.length === 0}>
                {busy === "create" ? "Creating…" : "Create webhook"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
