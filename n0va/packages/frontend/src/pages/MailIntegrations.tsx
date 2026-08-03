import { useEffect, useState, useCallback } from "react";
import {
  Plug, RefreshCw, AlertTriangle, Plus, Trash2, Zap, CheckCircle2, Link2, RotateCw, Activity, Send, Unplug, KeyRound, ExternalLink,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const STATUS_META: Record<string, { color: string; label: string }> = {
  connected: { color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", label: "Connected" },
  needs_auth: { color: "bg-amber-500/15 text-amber-400 border-amber-500/30", label: "Needs auth" },
  error: { color: "bg-red-500/15 text-red-400 border-red-500/30", label: "Error" },
  disconnected: { color: "bg-gray-700/40 text-gray-400 border-gray-600/40", label: "Not connected" },
};

const ACTION_LABELS: Record<string, string> = {
  sync_mail: "Sync email",
  create_event: "New event",
  post_to_chat: "Post to chat",
  forward_to_channel: "Forward",
  push_to_crm: "Push to CRM",
  sync_contacts: "Sync contacts",
  upload_file: "Upload file",
  schedule_meeting: "Schedule meeting",
  create_task: "Create task",
  share_link: "Share link",
  update_crm_deal: "Update deal",
  create_doc: "Create doc",
};

export default function MailIntegrations() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [bridges, setBridges] = useState<any[]>([]);
  const [mailboxes, setMailboxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [showConnect, setShowConnect] = useState<string | null>(null);
  const [showBridge, setShowBridge] = useState(false);
  const [oauthFlow, setOauthFlow] = useState<{ connectionId: string; connectorName: string; authorizationUrl: string; state: string; scopes: string[] } | null>(null);
  const [connectForm, setConnectForm] = useState<{ mailboxId: string }>({ mailboxId: "" });
  const [bridgeForm, setBridgeForm] = useState<{ name: string; event: string; connectorId: string; action: string; target: string }>({
    name: "", event: "mail.received", connectorId: "slack", action: "post_to_chat", target: "",
  });

  const load = useCallback(async () => {
    const [d, b, mb] = await Promise.all([
      api.adsMarketingModule.mailIntegrationOverview().catch(() => null),
      api.adsMarketingModule.mailIntegrationBridges().catch(() => null),
      api.adsMarketingModule.mailMailboxes().catch(() => null),
    ]);
    setDash(unwrap(d));
    setBridges(Array.isArray(b) ? b : unwrap(b) || []);
    setMailboxes(Array.isArray(mb) ? mb : unwrap(mb) || []);
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

  async function connect(connectorId: string) {
    setBusy("connect" + connectorId);
    const r = unwrap(await api.adsMarketingModule.mailIntegrationConnect({ connectorId, mailboxId: connectForm.mailboxId }).catch(() => null));
    if (r?.connectionId) {
      addToast("success", r.summary);
      setShowConnect(null);
      setConnectForm({ mailboxId: "" });
      load();
    } else {
      addToast("error", "Connect failed — pick a mailbox first");
    }
    setBusy(null);
  }

  async function act(connectionId: string, kind: string, extra?: Record<string, unknown>) {
    const key = connectionId + kind;
    setBusy(key);
    let r: any = null;
    if (kind === "sync") r = unwrap(await api.adsMarketingModule.mailIntegrationSyncNow(connectionId).catch(() => null));
    else if (kind === "disconnect") r = unwrap(await api.adsMarketingModule.mailIntegrationDisconnect(connectionId).catch(() => null));
    else if (kind === "authorize") r = unwrap(await api.adsMarketingModule.mailIntegrationAuthorize(connectionId).catch(() => null));
    else r = unwrap(await api.adsMarketingModule.mailIntegrationRefresh(connectionId).catch(() => null));
    if (r?.summary) addToast(kind === "sync" ? "info" : kind === "disconnect" ? "warning" : "success", r.summary);
    setBusy(null);
    load();
    return r;
  }

  async function runAction(connectionId: string, action: string) {
    setBusy(connectionId + "a" + action);
    const r = unwrap(await api.adsMarketingModule.mailIntegrationAction(connectionId, action, { title: "N0VA follow-up", text: "N0VA mail update" }).catch(() => null));
    if (r?.summary) addToast("info", r.summary); else addToast("error", "Action failed");
    setBusy(null);
    load();
  }

  async function startOauth(conn: any) {
    setBusy(conn.connectionId + "oauth");
    const r = unwrap(await api.adsMarketingModule.mailIntegrationOauthStart(conn.connectionId).catch(() => null));
    if (r?.authorizationUrl) {
      setOauthFlow({ connectionId: conn.connectionId, connectorName: conn.connectorName, authorizationUrl: r.authorizationUrl, state: r.state, scopes: r.scopes || [] });
      addToast("info", r.summary);
    } else {
      addToast("error", "OAuth flow failed to start");
    }
    setBusy(null);
    load();
  }

  async function completeOauth() {
    if (!oauthFlow) return;
    setBusy(oauthFlow.connectionId + "callback");
    const r = unwrap(await api.adsMarketingModule.mailIntegrationOauthCallback(oauthFlow.connectionId, { code: "code_n0va_authorized", state: oauthFlow.state }).catch(() => null));
    if (r?.status === "connected") {
      addToast("success", r.summary);
      setOauthFlow(null);
    } else {
      addToast("error", "Authorization failed — restart the flow");
    }
    setBusy(null);
    load();
  }

  async function createBridge() {
    setBusy("bridge");
    const r = unwrap(await api.adsMarketingModule.mailIntegrationCreateBridge(bridgeForm).catch(() => null));
    if (r?.bridgeId) {
      addToast("success", r.summary);
      setShowBridge(false);
      setBridgeForm({ name: "", event: "mail.received", connectorId: "slack", action: "post_to_chat", target: "" });
      load();
    } else {
      addToast("error", "Bridge create failed");
    }
    setBusy(null);
  }

  async function triggerBridge(bridge: any) {
    setBusy(bridge.bridgeId + "t");
    const r = unwrap(await api.adsMarketingModule.mailIntegrationTriggerBridge(bridge.bridgeId).catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setBusy(null);
    load();
  }

  async function deleteBridge(bridge: any) {
    if (!confirm(`Delete bridge "${bridge.name}"?`)) return;
    setBusy(bridge.bridgeId + "d");
    const r = unwrap(await api.adsMarketingModule.mailIntegrationDeleteBridge(bridge.bridgeId).catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setBusy(null);
    load();
  }

  const connector = (id: string) => (dash?.catalog?.connectors || []).find((c: any) => c.id === id);
  const connFor = (connectorId: string) => (dash?.connections || []).filter((c: any) => c.connectorId === connectorId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Plug className="w-6 h-6 text-n0va-400" /> Mail Integrations</h1>
          <p className="text-gray-500 mt-1 text-sm">Connect N0VA MAIL to your stack (spec §9)</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="w-3.5 h-3.5 text-n0va-600 bg-gray-700 border-gray-600 rounded" />
            Auto-refresh 30s
          </label>
          <button className="btn-secondary p-2" onClick={load} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary text-xs" onClick={() => setShowBridge(true)}><Zap className="w-3.5 h-3.5" /> New bridge</button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : !dash ? (
        <div className="card border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-sm text-red-300 font-medium">Integration data unavailable</p>
              <p className="text-xs text-red-400/70">Check that the backend is running.</p>
            </div>
            <button className="btn-secondary text-xs ml-auto" onClick={load}>Retry</button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{dash.connected || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Connected</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-amber-400">{dash.needsAuth || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Need auth</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-red-400">{dash.errors || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Errors</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{dash.syncs || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Syncs</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{dash.itemsSynced || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Items synced</p>
            </div>
          </div>

          {dash.alerts?.length > 0 && (
            <div className="card border-amber-500/30 bg-amber-500/5">
              <h2 className="text-sm font-semibold text-amber-300 flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4" /> {dash.alerts.length} alert(s)</h2>
              <div className="space-y-1.5">
                {dash.alerts.map((a: any, i: number) => (
                  <p key={i} className={`text-xs ${a.severity === "high" ? "text-red-300" : a.severity === "medium" ? "text-amber-300" : "text-gray-400"}`}>
                    {a.severity === "high" ? "High" : a.severity === "medium" ? "Medium" : "Low"} · {a.text}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Link2 className="w-4 h-4 text-sky-400" /> Connectors ({dash.catalog?.connectors?.length || 0})</h2>
              <span className="text-[10px] text-gray-500">{dash.summary}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {(dash.catalog?.connectors || []).map((c: any) => {
                const conns = connFor(c.id);
                const meta = STATUS_META[c.status] || STATUS_META.disconnected;
                const actions = (dash.catalog?.connectors || []).find((x: any) => x.id === c.id)?.actions || [];
                return (
                  <div key={c.id} className="card !p-4">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-white">{c.name}</p>
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${meta.color}`}>{meta.label}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">{c.description}</p>
                        <p className="text-[9px] text-gray-600 mt-1 font-mono">{c.category} · {c.actions.join(", ")}</p>
                      </div>
                    </div>
                    {conns.length === 0 ? (
                      <button className="btn-primary text-xs mt-3 w-full" onClick={() => setShowConnect(c.id)} disabled={busy === "connect" + c.id}>
                        <Plug className="w-3.5 h-3.5" /> Connect
                      </button>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {conns.map((conn: any) => (
                          <div key={conn.connectionId} className="rounded-lg border border-gray-700/60 bg-gray-800/40 p-2.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-[11px] font-mono text-n0va-300 truncate">{conn.accountEmail}</p>
                              {conn.status === "connected" && conn.lastSyncStatus && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded border ${conn.lastSyncStatus === "success" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-red-500/10 text-red-400 border-red-500/30"}`}>{conn.lastSyncStatus}</span>
                              )}
                            </div>
                            <p className="text-[9px] text-gray-600 mt-0.5">
                              {conn.syncCount || 0} sync(s) · {conn.itemsSynced || 0} items · {conn.actionsRun || 0} actions
                              {conn.lastSyncAt ? ` · ${new Date(conn.lastSyncAt).toLocaleTimeString()}` : ""}
                            </p>
                            <p className="text-[9px] mt-1 flex items-center gap-1.5 flex-wrap">
                              <span className={`px-1.5 py-0.5 rounded border font-mono ${conn.oauthAuthorized ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : conn.oauthState ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-gray-800 text-gray-500 border-gray-700"}`}>
                                {conn.oauthAuthorized ? "OAuth ✓" : conn.oauthState ? "OAuth pending" : "OAuth —"}
                              </span>
                              {conn.tokenExpiresAt && conn.oauthAuthorized && (
                                <span className="text-gray-500">
                                  token {new Date(conn.tokenExpiresAt).toLocaleTimeString()}
                                </span>
                              )}
                              {conn.oauthScope && <span className="text-gray-600 font-mono truncate max-w-[140px]">{conn.oauthScope}</span>}
                            </p>
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              {conn.status === "connected" && (
                                <>
                                  <button className="btn-secondary p-1.5" title="OAuth 2.0 flow" onClick={() => startOauth(conn)} disabled={busy === conn.connectionId + "oauth"}>
                                    <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                                  </button>
                                  <button className="btn-secondary p-1.5" title="Sync now" onClick={() => act(conn.connectionId, "sync")} disabled={busy === conn.connectionId + "sync"}>
                                    <RotateCw className="w-3.5 h-3.5 text-sky-400" />
                                  </button>
                                  <button className="btn-secondary p-1.5" title="Refresh session" onClick={() => act(conn.connectionId, "refresh")} disabled={busy === conn.connectionId + "refresh"}>
                                    <RefreshCw className="w-3.5 h-3.5 text-violet-400" />
                                  </button>
                                  {actions.slice(0, 2).map((a: string) => (
                                    <button key={a} className="btn-secondary text-[10px] px-2 py-1" title={ACTION_LABELS[a] || a}
                                      onClick={() => runAction(conn.connectionId, a)} disabled={busy === conn.connectionId + "a" + a}>
                                      {ACTION_LABELS[a] || a}
                                    </button>
                                  ))}
                                </>
                              )}
                              {conn.status === "needs_auth" && (
                                <button className="btn-primary text-[10px] px-2 py-1" onClick={() => act(conn.connectionId, "authorize")} disabled={busy === conn.connectionId + "authorize"}>
                                  <CheckCircle2 className="w-3 h-3" /> Authorize
                                </button>
                              )}
                              <button className="btn-secondary p-1.5 hover:!border-red-500/40 ml-auto" title="Disconnect" onClick={() => act(conn.connectionId, "disconnect")} disabled={busy === conn.connectionId + "disconnect"}>
                                <Unplug className="w-3.5 h-3.5 text-red-400" />
                              </button>
                            </div>
                            {conn.error && <p className="text-[10px] text-red-400 mt-1">{conn.error}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Zap className="w-4 h-4 text-amber-400" /> Automations ({bridges.length})</h2>
              <span className="text-[10px] text-gray-500">mail events → connector actions (§9 ↔ §4.4)</span>
            </div>
            {bridges.length === 0 && (
              <div className="border border-dashed border-gray-700 rounded-lg text-center py-5">
                <p className="text-sm text-gray-500">No bridges yet — wire a mail event to a connected app.</p>
              </div>
            )}
            <div className="space-y-2">
              {bridges.map((b: any) => (
                <div key={b.bridgeId} className="flex items-center gap-2 flex-wrap rounded-lg border border-gray-700/60 bg-gray-800/40 p-2.5">
                  <span className={`w-2 h-2 rounded-full ${b.enabled ? "bg-emerald-400" : "bg-gray-500"}`} />
                  <p className="text-xs text-white font-medium">{b.name}</p>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-n0va-500/10 text-n0va-300 border border-n0va-500/20">{b.event}</span>
                  <span className="text-[9px] text-gray-500">→ {b.connectorName} · {ACTION_LABELS[b.action] || b.action}{b.target ? ` · #${b.target}` : ""}</span>
                  <span className="text-[9px] text-gray-600">{b.triggerCount} fire(s){b.lastTriggerAt ? ` · ${new Date(b.lastTriggerAt).toLocaleTimeString()}` : ""}</span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <button className="btn-secondary p-1.5" title="Fire now" onClick={() => triggerBridge(b)} disabled={busy === b.bridgeId + "t"}>
                      <Send className="w-3.5 h-3.5 text-sky-400" />
                    </button>
                    <button className="btn-secondary p-1.5 hover:!border-red-500/40" title="Delete" onClick={() => deleteBridge(b)} disabled={busy === b.bridgeId + "d"}>
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><RotateCw className="w-4 h-4 text-sky-400" /> Recent syncs</h2>
              {(dash.recentSyncs || []).length === 0 && (
                <div className="card border-dashed border-gray-700 text-center py-6">
                  <p className="text-sm text-gray-500">No syncs yet — connect an app and sync.</p>
                </div>
              )}
              {(dash.recentSyncs || []).map((j: any) => (
                <div key={j.jobId} className="card !p-3 flex items-center gap-2 flex-wrap">
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${j.status === "success" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-red-500/15 text-red-400 border-red-500/30"}`}>{j.status}</span>
                  <span className="text-[11px] text-gray-300">{j.connectorName}</span>
                  <span className="text-[9px] font-mono text-gray-500">{j.kind} · {j.items} item(s)</span>
                  <span className="text-[9px] text-gray-600 ml-auto">{j.durationMs}ms · {new Date(j.at).toLocaleTimeString()}</span>
                  {j.error && <p className="text-[10px] text-red-400 w-full">{j.error}</p>}
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Activity className="w-4 h-4 text-violet-400" /> Integration log</h2>
              {(dash.log || []).length === 0 && (
                <div className="card border-dashed border-gray-700 text-center py-6">
                  <p className="text-sm text-gray-500">No activity yet.</p>
                </div>
              )}
              {(dash.log || []).map((l: any, i: number) => (
                <div key={i} className="card !p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">{l.category}</span>
                    <span className="text-[9px] text-gray-600 ml-auto">{new Date(l.at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">{l.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {showConnect && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={() => setShowConnect(null)}>
          <div className="card w-full max-w-md !p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2"><Plug className="w-4 h-4 text-n0va-400" /> Connect {connector(showConnect)?.name}</h3>
            <p className="text-[11px] text-gray-500 mb-3">{connector(showConnect)?.description} — {connector(showConnect)?.scopes?.join(", ")}</p>
            <label className="block text-[11px] text-gray-400 mb-1">Mailbox</label>
            <select className="input mb-4" value={connectForm.mailboxId} onChange={(e) => setConnectForm({ mailboxId: e.target.value })}>
              <option value="">Select a mailbox…</option>
              {mailboxes.map((mb: any) => (
                <option key={mb.mailboxId} value={mb.mailboxId}>{mb.name} ({mb.email})</option>
              ))}
            </select>
            <div className="flex gap-2 justify-end">
              <button className="btn-secondary text-xs" onClick={() => setShowConnect(null)}>Cancel</button>
              <button className="btn-primary text-xs" onClick={() => connect(showConnect)} disabled={busy === "connect" + showConnect || !connectForm.mailboxId}>
                {busy === "connect" + showConnect ? "Connecting…" : "Connect"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBridge && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={() => setShowBridge(false)}>
          <div className="card w-full max-w-md !p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-white mb-3">New automation bridge</h3>
            <label className="block text-[11px] text-gray-400 mb-1">Name</label>
            <input className="input mb-3" placeholder="Slack alerts" value={bridgeForm.name} onChange={(e) => setBridgeForm({ ...bridgeForm, name: e.target.value })} />
            <label className="block text-[11px] text-gray-400 mb-1">Mail event</label>
            <select className="input mb-3" value={bridgeForm.event} onChange={(e) => setBridgeForm({ ...bridgeForm, event: e.target.value })}>
              {["mail.received", "mail.sent", "mail.spam_detected", "mail.delivery_failed", "mail.rule_triggered", "mail.attachment_scanned", "mail.ai_suggestion"].map((ev) => (
                <option key={ev} value={ev}>{ev}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Connector</label>
                <select className="input" value={bridgeForm.connectorId}
                  onChange={(e) => {
                    const c = connector(e.target.value);
                    setBridgeForm({ ...bridgeForm, connectorId: e.target.value, action: c?.actions?.[0] || "" });
                  }}>
                  {(dash?.catalog?.connectors || []).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Action</label>
                <select className="input" value={bridgeForm.action} onChange={(e) => setBridgeForm({ ...bridgeForm, action: e.target.value })}>
                  {(connector(bridgeForm.connectorId)?.actions || []).map((a: string) => (
                    <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>
                  ))}
                </select>
              </div>
            </div>
            <label className="block text-[11px] text-gray-400 mb-1">Target (channel / title, optional)</label>
            <input className="input mb-4" placeholder="general" value={bridgeForm.target} onChange={(e) => setBridgeForm({ ...bridgeForm, target: e.target.value })} />
            <div className="flex gap-2 justify-end">
              <button className="btn-secondary text-xs" onClick={() => setShowBridge(false)}>Cancel</button>
              <button className="btn-primary text-xs" onClick={createBridge} disabled={busy === "bridge" || !bridgeForm.name.trim()}>
                {busy === "bridge" ? "Creating…" : "Create bridge"}
              </button>
            </div>
          </div>
        </div>
      )}

      {oauthFlow && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={() => setOauthFlow(null)}>
          <div className="card w-full max-w-md !p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2"><KeyRound className="w-4 h-4 text-emerald-400" /> Authorize {oauthFlow.connectorName}</h3>
            <p className="text-[11px] text-gray-500 mb-3">Step 1 — open the provider URL, Step 2 — complete the simulated callback.</p>
            <label className="block text-[11px] text-gray-400 mb-1">Authorization URL</label>
            <div className="input font-mono text-[10px] text-n0va-300 break-all mb-2 select-all whitespace-normal">{oauthFlow.authorizationUrl}</div>
            <label className="block text-[11px] text-gray-400 mb-1">Scopes</label>
            <div className="flex gap-1.5 flex-wrap mb-4">
              {(oauthFlow.scopes || []).map((s: string) => (
                <span key={s} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-n0va-500/10 text-n0va-300 border border-n0va-500/20">{s}</span>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn-secondary text-xs" onClick={() => setOauthFlow(null)}>Cancel</button>
              <button className="btn-primary text-xs" onClick={completeOauth} disabled={busy === oauthFlow.connectionId + "callback"}>
                {busy === oauthFlow.connectionId + "callback" ? "Completing…" : "Complete authorization"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
