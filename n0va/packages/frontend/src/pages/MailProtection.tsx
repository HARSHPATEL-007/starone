import { useEffect, useState, useCallback } from "react";
import {
  Shield, ShieldAlert, ShieldCheck, RefreshCw, AlertTriangle, Globe, Radar, Activity, Server, Lock, Fingerprint, Siren, Trash2,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const LAYER_ICON: Record<string, any> = {
  network: Globe, protocol: Server, content: Radar, behavioral: Activity, quantum: Fingerprint,
};

const LAYER_COLOR: Record<string, string> = {
  network: "text-sky-400", protocol: "text-violet-400", content: "text-amber-400", behavioral: "text-emerald-400", quantum: "text-fuchsia-400",
};

export default function MailProtection() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const d = unwrap(await api.adsMarketingModule.mailAbuseDashboard().catch(() => null));
    setDash(d);
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

  async function runThreat(action: string, target?: string) {
    setBusy(action);
    const r = unwrap(await api.adsMarketingModule.mailAbuseThreatResponse(action, target).catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setBusy(null);
    load();
  }

  const layers = dash?.layers || [];
  const counts = dash?.counts || {};
  const threatLevel = dash?.threatLevel || "low";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Shield className="w-6 h-6 text-n0va-400" /> Mail Protection</h1>
          <p className="text-gray-500 mt-1 text-sm">Anti-abuse engine — five-layer defense (spec §2.4)</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="w-3.5 h-3.5 text-n0va-600 bg-gray-700 border-gray-600 rounded" />
            Auto-refresh 30s
          </label>
          <button className="btn-secondary p-2" onClick={load} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : !dash ? (
        <div className="card border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-sm text-red-300 font-medium">Abuse data unavailable</p>
              <p className="text-xs text-red-400/70">Check that the backend is running.</p>
            </div>
            <button className="btn-secondary text-xs ml-auto" onClick={load}>Retry</button>
          </div>
        </div>
      ) : (
        <>
          <div className={`card flex flex-col sm:flex-row sm:items-center gap-3 border ${threatLevel === "high" ? "border-red-500/40 bg-red-500/5" : threatLevel === "medium" ? "border-amber-500/40 bg-amber-500/5" : "border-emerald-500/30 bg-emerald-500/10"}`}>
            {threatLevel === "high" ? <ShieldAlert className="w-8 h-8 text-red-400 shrink-0" /> : threatLevel === "medium" ? <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0" /> : <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />}
            <div className="min-w-0">
              <p className={`text-sm font-bold uppercase tracking-wider ${threatLevel === "high" ? "text-red-400" : threatLevel === "medium" ? "text-amber-400" : "text-emerald-400"}`}>Threat posture: {threatLevel}</p>
              <p className="text-xs text-gray-400 mt-0.5">{dash.summary}</p>
            </div>
            <div className="sm:ml-auto flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{dash.threatScore}<span className="text-sm text-gray-500">/100</span></p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Threat score</p>
              </div>
              <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${threatLevel === "high" ? "bg-red-500" : threatLevel === "medium" ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${dash.threatScore}%` }} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{counts.spamFlagged || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Spam blocked</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{counts.becFlagged || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">BEC flagged</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{counts.honeyHits || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Honeypot hits</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{dash.rateLimits?.dailyLimit || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">{dash.rateLimits?.plan || "pro"} daily limit</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{counts.total || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Messages scanned</p>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-3"><Lock className="w-4 h-4 text-n0va-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Defense layers</span></div>
            <div className="space-y-3">
              {layers.map((l: any) => {
                const Icon = LAYER_ICON[l.layer] || Shield;
                return (
                  <div key={l.layer} className="flex items-start gap-3">
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${LAYER_COLOR[l.layer] || "text-gray-400"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm text-gray-200 font-medium">{l.name}</span>
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${l.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-gray-700 text-gray-400"}`}>
                          {l.status} · {l.checks} checks
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-n0va-500" style={{ width: `${Math.min(100, l.checks * 16)}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-500 shrink-0">{l.blocked} blocked</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1 truncate">{l.details.join(" · ")}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-3"><Siren className="w-4 h-4 text-n0va-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">One-click defense actions</span></div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary text-xs" disabled={busy !== null} onClick={() => runThreat("block_sender")}>
                {busy === "block_sender" ? "Applying…" : "Block sender"}
              </button>
              <button className="btn-secondary text-xs" disabled={busy !== null} onClick={() => runThreat("quarantine_sender")}>
                {busy === "quarantine_sender" ? "Applying…" : "Quarantine sender"}
              </button>
              <button className="btn-secondary text-xs" disabled={busy !== null} onClick={() => runThreat("tighten_greylist")}>
                {busy === "tighten_greylist" ? "Applying…" : "Tighten greylist"}
              </button>
              <button className="btn-secondary text-xs" disabled={busy !== null} onClick={() => runThreat("enable_dmarc_enforce")}>
                {busy === "enable_dmarc_enforce" ? "Applying…" : "Enforce DMARC"}
              </button>
              <button className="btn-secondary text-xs" disabled={busy !== null} onClick={() => runThreat("purge_spam")}>
                {busy === "purge_spam" ? "Applying…" : "Purge spam"}
              </button>
              <button className="btn-secondary text-xs" disabled={busy !== null} onClick={() => runThreat("refresh_ip_reputation")}>
                {busy === "refresh_ip_reputation" ? "Applying…" : "Refresh IP reputation"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <div className="flex items-center gap-2 mb-3"><ShieldCheck className="w-4 h-4 text-n0va-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Honeypot traps</span></div>
              <ul className="space-y-2">
                {(dash.honeypots?.addresses || []).map((h: string, i: number) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-gray-300 font-mono text-xs truncate">{h}</span>
                    <span className="text-[10px] text-gray-500 shrink-0">{dash.honeypots?.hits || 0} hit(s)</span>
                  </li>
                ))}
              </ul>
              {(dash.honeypots?.senders || []).length > 0 && (
                <div className="mt-2 border-t border-gray-800/60 pt-2">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Captured senders</p>
                  {(dash.honeypots.senders || []).slice(0, 6).map((s: string, i: number) => (
                    <p key={i} className="text-xs text-red-400/80 font-mono truncate">{s}</p>
                  ))}
                </div>
              )}
            </div>
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-n0va-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Recent defense events</span></div>
                <button className="text-[10px] text-gray-500 hover:text-red-400 flex items-center gap-1" onClick={() => runThreat("purge_spam")}><Trash2 className="w-3 h-3" /> Clear</button>
              </div>
              {dash.recentEvents?.length > 0 ? (
                <ul className="space-y-2 max-h-64 overflow-y-auto">
                  {dash.recentEvents.map((e: any, i: number) => (
                    <li key={i} className="text-xs flex items-start gap-2">
                      <span className="text-n0va-400 shrink-0 font-mono">{new Date(e.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      <span className="text-gray-400 min-w-0 truncate">{e.detail}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-500">No defense events yet — run a scan or check back after incoming mail arrives.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
