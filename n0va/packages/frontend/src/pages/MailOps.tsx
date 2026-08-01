import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw, Gauge, ShieldCheck, Zap, AlertTriangle, Plus, X, CheckCircle2,
  Archive, Clock, Activity, Database, Layers, Sparkles, Wrench, ArrowUpCircle,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

function sevBadge(sev: string): string {
  if (sev === "P0" || sev === "P1") return "bg-red-500/15 text-red-400";
  if (sev === "P2") return "bg-amber-500/15 text-amber-400";
  if (sev === "P3") return "bg-sky-500/15 text-sky-400";
  return "bg-gray-600/20 text-gray-400";
}

function statusBadge(status: string): string {
  if (status === "resolved") return "bg-green-500/10 text-green-400";
  if (status === "acknowledged") return "bg-sky-500/10 text-sky-400";
  return "bg-amber-500/10 text-amber-400";
}

function tierColor(tier: string): string {
  if (tier === "hot") return "bg-red-500";
  if (tier === "warm") return "bg-amber-500";
  if (tier === "cool") return "bg-sky-500";
  return "bg-violet-500";
}

function fmtBytes(b: number): string {
  if (b >= 1024 * 1024 * 1024) return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (b >= 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(b / 1024)} KB`;
}

const SEVERITIES = ["P0", "P1", "P2", "P3", "P4"];

export default function MailOps() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [storage, setStorage] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [opsLog, setOpsLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");
  const [showIncident, setShowIncident] = useState(false);
  const [incSeverity, setIncSeverity] = useState("P2");
  const [incTitle, setIncTitle] = useState("");
  const [incDesc, setIncDesc] = useState("");
  const [autoTier, setAutoTier] = useState(false);
  const [coolDays, setCoolDays] = useState(30);
  const [coldDays, setColdDays] = useState(90);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [d, s, inc] = await Promise.all([
      api.adsMarketingModule.mailOpsDashboard().then(unwrap).catch(() => null),
      api.adsMarketingModule.mailStorageDashboard().then(unwrap).catch(() => null),
      api.adsMarketingModule.mailOpsIncidents().then(unwrap).catch(() => null),
    ]);
    setDash(d);
    setStorage(s);
    setIncidents(inc?.incidents || []);
    if (s?.policy) {
      setAutoTier(!!s.policy.autoTier);
      setCoolDays(s.policy.coolAfterDays || 30);
      setColdDays(s.policy.coldAfterDays || 90);
    }
    setLastUpdated(new Date().toISOString());
    setLoading(false);
  }, []);

  const loadLog = useCallback(async () => {
    const l = await api.adsMarketingModule.mailOpsLog().then(unwrap).catch(() => null);
    setOpsLog(l?.entries || []);
  }, []);

  useEffect(() => { loadData(); loadLog(); }, [loadData, loadLog]);
  useEffect(() => {
    function refresh() { loadData(); loadLog(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadData, loadLog]);
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => { loadData(); loadLog(); }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData, loadLog]);

  async function act(key: string, fn: () => Promise<any>, success: string, errorTitle: string) {
    setBusy(key);
    try {
      const r = await fn().then(unwrap);
      addToast("success", success, r?.summary || "");
      await loadData();
      await loadLog();
    } catch (e: any) {
      addToast("error", errorTitle, e?.message);
    } finally {
      setBusy("");
    }
  }

  async function createIncident() {
    if (!incTitle.trim()) { addToast("error", "Title required"); return; }
    await act("inc-create", () => api.adsMarketingModule.mailOpsCreateIncident({ severity: incSeverity, title: incTitle.trim(), description: incDesc.trim() }), `Incident ${incSeverity} filed`, "Create failed");
    setShowIncident(false);
    setIncTitle("");
    setIncDesc("");
  }

  async function savePolicy() {
    await act("policy", () => api.adsMarketingModule.mailStorageSetPolicy({ autoTier, coolAfterDays: coolDays, coldAfterDays: coldDays }), "Policy saved", "Policy save failed");
  }

  const h = dash?.health || {};
  const perf = dash?.performance || {};
  const sec = dash?.security || {};
  const biz = dash?.business || {};
  const s = storage || {};
  const tiers = s.tiers || {};
  const tierTotal = (Object.values(tiers) as any[]).reduce((sum, t) => sum + (t?.count || 0), 0) || 1;

  if (loading && !dash && !storage) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">Mail Ops</h1><p className="text-gray-500 mt-1">Operations & incident response — one click at a time</p></div>
          <div className="animate-spin w-5 h-5 border-2 border-n0va-500 border-t-transparent rounded-full" />
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><SkeletonCard /><SkeletonCard /></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mail Ops</h1>
          <p className="text-gray-500 mt-1">Operations & incident response — one click at a time</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && <span className="text-xs text-gray-500 hidden md:inline">Updated {new Date(lastUpdated).toLocaleTimeString()}</span>}
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="w-3.5 h-3.5 text-n0va-600 bg-gray-700 border-gray-600 rounded" />
            Auto (30s)
          </label>
          <button className="btn-secondary p-2" onClick={() => { loadData(); loadLog(); }} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {!dash && (
        <div className="card border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-sm text-red-300 font-medium">Ops data unavailable</p>
              <p className="text-xs text-red-400/70">Check that the backend is running, then refresh.</p>
            </div>
          </div>
        </div>
      )}

      {dash && (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="card"><div className="flex items-center gap-2 text-gray-400"><Gauge className="w-4 h-4 text-emerald-400" /><span className="text-xs font-medium uppercase tracking-wide">SMTP uptime</span></div><p className="text-3xl font-bold text-white mt-2">{h.smtpUptime}</p><p className="text-xs text-gray-500 mt-1">delivery service</p></div>
            <div className="card"><div className="flex items-center gap-2 text-gray-400"><Gauge className="w-4 h-4 text-emerald-400" /><span className="text-xs font-medium uppercase tracking-wide">IMAP uptime</span></div><p className="text-3xl font-bold text-white mt-2">{h.imapUptime}</p><p className="text-xs text-gray-500 mt-1">mailbox service</p></div>
            <div className="card"><div className="flex items-center gap-2 text-gray-400"><Activity className="w-4 h-4 text-amber-400" /><span className="text-xs font-medium uppercase tracking-wide">Queue depth</span></div><p className="text-3xl font-bold text-white mt-2">{h.queueDepth ?? 0}</p><p className={`text-xs mt-1 ${h.queueVerdict === "normal" ? "text-green-400" : h.queueVerdict === "elevated" ? "text-amber-400" : "text-red-400"}`}>{h.queueVerdict}</p></div>
            <div className="card"><div className="flex items-center gap-2 text-gray-400"><ShieldCheck className="w-4 h-4 text-sky-400" /><span className="text-xs font-medium uppercase tracking-wide">Error rate</span></div><p className="text-3xl font-bold text-white mt-2">{h.errorRate}</p><p className="text-xs text-gray-500 mt-1">delivery errors</p></div>
          </div>

          <div className="card">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-n0va-400" />
              <h2 className="text-sm font-semibold text-white">One-click operations</h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-3">
              <button className="btn-secondary text-xs px-3 py-1.5" disabled={!!busy} onClick={() => act("retry", () => api.adsMarketingModule.mailOpsRetryQueue(), "Queue retried", "Retry failed")}><RefreshCw className={`w-3.5 h-3.5 mr-1 ${busy === "retry" ? "animate-spin" : ""}`} />Retry queue</button>
              <button className="btn-primary text-xs px-3 py-1.5" disabled={!!busy} onClick={() => act("house", () => api.adsMarketingModule.mailOpsHousekeeping(), "Housekeeping done", "Housekeeping failed")}><Sparkles className={`w-3.5 h-3.5 mr-1 ${busy === "house" ? "animate-spin" : ""}`} />Run all housekeeping</button>
              <button className="btn-secondary text-xs px-3 py-1.5" disabled={!!busy} onClick={() => act("cp", () => api.adsMarketingModule.mailOpsCheckpoint("one-click checkpoint"), "Checkpoint taken", "Checkpoint failed")}><Database className="w-3.5 h-3.5 mr-1" />Take checkpoint</button>
              <button className="btn-secondary text-xs px-3 py-1.5" disabled={!!busy} onClick={() => act("threat", () => api.adsMarketingModule.mailOpsThreatRule(), "Threat rule deployed", "Deploy failed")}><ShieldCheck className="w-3.5 h-3.5 mr-1" />Deploy threat rule</button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Housekeeping runs rules sweep + spam rescan + smart archive + storage tiering + agent cycle in one click.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="card">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Activity className="w-4 h-4 text-n0va-400" /> Performance</h2>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div className="flex justify-between rounded-lg bg-gray-800/40 px-3 py-2"><span className="text-gray-500">Avg delivery</span><span className="text-white font-semibold">{perf.avgDeliveryMs} ms</span></div>
                  <div className="flex justify-between rounded-lg bg-gray-800/40 px-3 py-2"><span className="text-gray-500">P99 search</span><span className="text-white font-semibold">{perf.p99SearchMs} ms</span></div>
                  <div className="flex justify-between rounded-lg bg-gray-800/40 px-3 py-2"><span className="text-gray-500">Attachment proc</span><span className="text-white font-semibold">{perf.attachmentProcAvg}s avg</span></div>
                  <div className="flex justify-between rounded-lg bg-gray-800/40 px-3 py-2"><span className="text-gray-500">AI latency</span><span className="text-white font-semibold">{perf.aiLatencyMs} ms avg</span></div>
                </div>
                <h2 className="text-sm font-semibold text-white flex items-center gap-2 mt-4"><ShieldCheck className="w-4 h-4 text-n0va-400" /> Security</h2>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div className="flex justify-between rounded-lg bg-gray-800/40 px-3 py-2"><span className="text-gray-500">Spam caught</span><span className="text-white font-semibold">{sec.spamCaught}%</span></div>
                  <div className="flex justify-between rounded-lg bg-gray-800/40 px-3 py-2"><span className="text-gray-500">False positives</span><span className="text-white font-semibold">{sec.falsePositives}%</span></div>
                  <div className="flex justify-between rounded-lg bg-gray-800/40 px-3 py-2"><span className="text-gray-500">Malware blocked</span><span className="text-white font-semibold">{sec.malwareBlocked}</span></div>
                  <div className="flex justify-between rounded-lg bg-gray-800/40 px-3 py-2"><span className="text-gray-500">Auth anomalies</span><span className="text-white font-semibold">{sec.authAnomalies}</span></div>
                </div>
                <h2 className="text-sm font-semibold text-white flex items-center gap-2 mt-4"><Database className="w-4 h-4 text-n0va-400" /> Business</h2>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div className="flex justify-between rounded-lg bg-gray-800/40 px-3 py-2"><span className="text-gray-500">Active mailboxes</span><span className="text-white font-semibold">{biz.activeMailboxes}</span></div>
                  <div className="flex justify-between rounded-lg bg-gray-800/40 px-3 py-2"><span className="text-gray-500">Messages today</span><span className="text-white font-semibold">{biz.messagesToday}</span></div>
                  <div className="flex justify-between rounded-lg bg-gray-800/40 px-3 py-2"><span className="text-gray-500">Storage used</span><span className="text-white font-semibold">{fmtBytes(biz.storageUsedBytes)}</span></div>
                  <div className="flex justify-between rounded-lg bg-gray-800/40 px-3 py-2"><span className="text-gray-500">AI queries today</span><span className="text-white font-semibold">{biz.aiQueriesToday}</span></div>
                </div>
              </div>

              <div className="card">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" /> Alerts (last 24h)</h2>
                <div className="space-y-2 mt-3">
                  {dash.alerts?.map((a: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 flex-wrap rounded-lg bg-gray-800/40 px-3 py-2">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${sevBadge(a.severity)}`}>{a.severity}</span>
                      <span className="text-sm text-gray-300 flex-1 min-w-0 truncate">{a.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(a.status)}`}>{a.status}</span>
                    </div>
                  ))}
                  {(!dash.alerts || dash.alerts.length === 0) && <p className="text-xs text-gray-500">No alerts in the last 24h.</p>}
                </div>
              </div>

              <div className="card">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-n0va-400" />
                  <h2 className="text-sm font-semibold text-white">Ops activity</h2>
                </div>
                <div className="space-y-1.5 mt-3 max-h-48 overflow-y-auto">
                  {opsLog.slice(0, 15).map((e: any, i: number) => (
                    <p key={i} className="text-xs text-gray-500"><span className="text-gray-400 font-mono">{new Date(e.at).toLocaleTimeString()}</span> <span className="text-n0va-400">{e.category}</span> — {e.detail}</p>
                  ))}
                  {opsLog.length === 0 && <p className="text-xs text-gray-500">No ops activity yet.</p>}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="card">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-400" /> Incidents</h2>
                  <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => setShowIncident(true)}><Plus className="w-3.5 h-3.5 mr-1" />File</button>
                </div>
                <div className="space-y-2 mt-3">
                  {incidents.map((inc: any) => (
                    <div key={inc._id} className="rounded-lg bg-gray-800/40 px-3 py-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${sevBadge(inc.severity)}`}>{inc.severity}</span>
                        <span className="text-sm text-gray-300 flex-1 min-w-0 truncate">{inc.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(inc.status)}`}>{inc.status}</span>
                      </div>
                      {inc.description && <p className="text-xs text-gray-500 mt-1 truncate">{inc.description}</p>}
                      <p className="text-xs text-gray-600 mt-1">{inc.responsePlan}{inc.escalated ? ` — escalated to ${inc.escalatedTo}` : ""}</p>
                      {inc.status !== "resolved" && (
                        <div className="flex items-center gap-2 mt-2">
                          <button className="btn-secondary text-[10px] px-2 py-1" disabled={!!busy} onClick={() => act("inc-esc", () => api.adsMarketingModule.mailOpsEscalateIncident(inc._id), "Escalated", "Escalate failed")}>Escalate</button>
                          <button className="btn-secondary text-[10px] px-2 py-1" disabled={!!busy} onClick={() => act("inc-ack", () => api.adsMarketingModule.mailOpsAckIncident(inc._id), "Acknowledged", "Ack failed")}>Acknowledge</button>
                          <button className="btn-primary text-[10px] px-2 py-1" disabled={!!busy} onClick={() => act("inc-res", () => api.adsMarketingModule.mailOpsResolveIncident(inc._id), "Resolved", "Resolve failed")}><CheckCircle2 className="w-3 h-3 mr-1" />Resolve</button>
                        </div>
                      )}
                    </div>
                  ))}
                  {incidents.length === 0 && <p className="text-xs text-gray-500">No incidents filed.</p>}
                </div>
              </div>

              <div className="card">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Layers className="w-4 h-4 text-n0va-400" /> Storage tiers</h2>
                <div className="flex h-3 rounded-full overflow-hidden mt-3 bg-gray-800">
                  {(["hot", "warm", "cool", "cold"] as const).map((t) => (
                    <div key={t} className={tierColor(t)} style={{ width: `${((tiers[t]?.count || 0) / tierTotal) * 100}%` }} title={`${t}: ${tiers[t]?.count || 0}`} />
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-2 mt-2 text-center">
                  {(["hot", "warm", "cool", "cold"] as const).map((t) => (
                    <div key={t} className="rounded-lg bg-gray-800/40 px-2 py-1.5">
                      <p className={`text-xs font-bold capitalize ${tierColor(t).replace("bg-", "text-")}`}>{t}</p>
                      <p className="text-sm text-white font-semibold">{tiers[t]?.count || 0}</p>
                      <p className="text-[10px] text-gray-500">{fmtBytes(tiers[t]?.bytes || 0)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-3">
                  <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                    <input type="checkbox" checked={autoTier} onChange={(e) => setAutoTier(e.target.checked)} className="w-3.5 h-3.5 text-n0va-600 bg-gray-700 border-gray-600 rounded" />
                    Auto-tier
                  </label>
                  <input type="number" min={1} value={coolDays} onChange={(e) => setCoolDays(parseInt(e.target.value || "1", 10))} className="input w-16 !py-1 text-xs" title="Cool after days" />
                  <span className="text-xs text-gray-500">cool</span>
                  <input type="number" min={2} value={coldDays} onChange={(e) => setColdDays(parseInt(e.target.value || "2", 10))} className="input w-16 !py-1 text-xs" title="Cold after days" />
                  <span className="text-xs text-gray-500">cold</span>
                  <button className="btn-secondary text-xs px-3 py-1.5 ml-auto" disabled={!!busy} onClick={savePolicy}>Save policy</button>
                  <button className="btn-primary text-xs px-3 py-1.5" disabled={!!busy} onClick={() => act("tier", () => api.adsMarketingModule.mailStorageRunTiering(), "Tiering run", "Tiering failed")}><Archive className="w-3.5 h-3.5 mr-1" />Tier now</button>
                </div>
                <p className="text-xs text-gray-500 mt-2">{s.forecast?.summary}</p>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-n0va-400" /> AI cleanup suggestions</h2>
                  {(s.suggestionsTotal || 0) > 0 && (
                    <button className="btn-primary text-xs px-3 py-1.5" disabled={!!busy} onClick={() => act("clean-all", () => api.adsMarketingModule.mailStorageApplyAllCleanups(), "All cleanups applied", "Apply failed")}><ArrowUpCircle className="w-3.5 h-3.5 mr-1" />Apply all</button>
                  )}
                </div>
                <div className="space-y-2 mt-3">
                  {(s.suggestions || []).map((sg: any) => (
                    <div key={sg.suggestionId} className="flex items-center gap-2 flex-wrap rounded-lg bg-gray-800/40 px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-300 truncate">{sg.title}</p>
                        <p className="text-xs text-gray-500 truncate">{sg.description}</p>
                      </div>
                      {sg.estimatedSavingsBytes > 0 && <span className="text-xs text-emerald-400">{fmtBytes(sg.estimatedSavingsBytes)}</span>}
                      <button className="btn-secondary text-[10px] px-2 py-1" disabled={!!busy} onClick={() => act("clean-one", () => api.adsMarketingModule.mailStorageApplyCleanup(sg.suggestionId), "Cleanup applied", "Apply failed")}>Apply</button>
                    </div>
                  ))}
                  {(s.suggestions || []).length === 0 && <p className="text-xs text-gray-500">No cleanup suggestions — storage is tidy.</p>}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowIncident(false)}>
          <div className="card w-full max-w-md !p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-400" />File incident</h3>
              <button className="text-gray-500 hover:text-white" onClick={() => setShowIncident(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3 mt-4">
              <div>
                <label className="text-xs text-gray-500">Severity</label>
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  {SEVERITIES.map((s) => (
                    <button key={s} onClick={() => setIncSeverity(s)} className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${incSeverity === s ? "border-n0va-500 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500 hover:text-gray-300"}`}>{s}</button>
                  ))}
                </div>
              </div>
              <input value={incTitle} onChange={(e) => setIncTitle(e.target.value)} placeholder="Title (required)" className="input" />
              <textarea value={incDesc} onChange={(e) => setIncDesc(e.target.value)} placeholder="Description" rows={3} className="input resize-none" />
              <button className="btn-primary w-full" disabled={!!busy} onClick={createIncident}><CheckCircle2 className="w-4 h-4 mr-1" />File incident</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
