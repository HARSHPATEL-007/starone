import { useEffect, useState, useCallback } from "react";
import {
  Fingerprint, RefreshCw, AlertTriangle, Activity, ShieldCheck, ShieldAlert, Lock, Eye, MousePointer2, Watch, Zap,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const SIGNAL_ICON: Record<string, any> = {
  keystroke_dynamics: Zap, mouse_movement: MousePointer2, gait_analysis: Watch, neural_patterns: Activity, eye_tracking: Eye, sub_vocal: Activity, touch_pressure: Activity, scroll_behavior: Activity,
};

const RISK_STYLE: Record<string, string> = {
  trusted: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  suspicious: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  blocked: "text-red-400 border-red-500/30 bg-red-500/10",
};

export default function MailBiometrics() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState("sess_me");

  const load = useCallback(async () => {
    const d = unwrap(await api.adsMarketingModule.mailBiometricDashboard().catch(() => null));
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

  async function act(kind: string, fn: () => Promise<any>) {
    setBusy(kind);
    const r = unwrap(await fn().catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setBusy(null);
    if (kind === "evaluate") { const s = unwrap(await api.adsMarketingModule.mailBiometricSession(sessionId).catch(() => null)); setSession(s); }
    load();
  }

  const signals = dash?.signals || [];
  const baseline = dash?.baseline || {};
  const sessions = dash?.sessions || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Fingerprint className="w-6 h-6 text-n0va-400" /> Mail Biometrics</h1>
          <p className="text-gray-500 mt-1 text-sm">Continuous authentication — 8 behavioral signals (spec §2.2)</p>
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
              <p className="text-sm text-red-300 font-medium">Biometrics data unavailable</p>
              <p className="text-xs text-red-400/70">Check that the backend is running.</p>
            </div>
            <button className="btn-secondary text-xs ml-auto" onClick={load}>Retry</button>
          </div>
        </div>
      ) : (
        <>
          <div className={`card flex flex-col sm:flex-row sm:items-center gap-3 border ${baseline.overallRisk === "trusted" ? "border-emerald-500/30 bg-emerald-500/10" : baseline.overallRisk === "suspicious" ? "border-amber-500/40 bg-amber-500/5" : "border-red-500/40 bg-red-500/5"}`}>
            {baseline.overallRisk === "trusted" ? <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" /> : baseline.overallRisk === "suspicious" ? <ShieldAlert className="w-8 h-8 text-amber-400 shrink-0" /> : <Lock className="w-8 h-8 text-red-400 shrink-0" />}
            <div className="min-w-0">
              <p className={`text-sm font-bold uppercase tracking-wider ${baseline.overallRisk === "trusted" ? "text-emerald-400" : baseline.overallRisk === "suspicious" ? "text-amber-400" : "text-red-400"}`}>Session posture: {baseline.overallRisk}</p>
              <p className="text-xs text-gray-400 mt-0.5">{baseline.summary}</p>
            </div>
            <div className="sm:ml-auto flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{baseline.avgTrustScore}<span className="text-sm text-gray-500">/100</span></p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Avg trust</p>
              </div>
              <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${baseline.overallRisk === "trusted" ? "bg-emerald-500" : baseline.overallRisk === "suspicious" ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${baseline.avgTrustScore}%` }} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{baseline.sessionCount || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Sessions</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{baseline.activeSessions || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Active sessions</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{baseline.blockedSessions || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Blocked</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{dash.signalCount || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Signals monitored</p>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h2 className="text-sm font-semibold text-white">Signal fidelity & live session</h2>
              <div className="flex items-center gap-2">
                <input value={sessionId} onChange={(e) => setSessionId(e.target.value)} placeholder="session id" className="input text-xs w-36" />
                <button className="btn-secondary text-xs" disabled={busy === "eval"} onClick={() => act("eval", () => api.adsMarketingModule.mailBiometricEvaluate(sessionId))}>{busy === "eval" ? "..." : "Evaluate"}</button>
                <button className="btn-primary text-xs" disabled={busy === "eval"} onClick={() => act("eval", () => api.adsMarketingModule.mailBiometricEvaluate(sessionId))}>Run</button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                {signals.map((sig: any) => {
                  const SigIcon = SIGNAL_ICON[sig.id] || Activity;
                  return (
                    <div key={sig.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/40">
                      <SigIcon className="w-4 h-4 text-n0va-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-gray-200 truncate">{sig.name}</p>
                          <span className="text-[10px] text-gray-500 shrink-0">{sig.confidence}%</span>
                        </div>
                        <p className="text-[10px] text-gray-500 truncate">{sig.unit} · dev {sig.deviationPct}% · {sig.samples} samples</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/40">
                  <Fingerprint className="w-5 h-5 text-n0va-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-400">Latest evaluation</p>
                    <p className="text-sm font-bold text-white truncate">{session ? session.verdict.toUpperCase() : "No evaluation yet"}</p>
                    {session && <p className="text-[10px] text-gray-500 truncate">{session.summary}</p>}
                  </div>
                  {session && <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${RISK_STYLE[session.riskLevel] || ""}`}>{session.riskLevel}</span>}
                </div>
                {sessions.map((s: any) => (
                  <div key={s.sessionId} className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/40">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-200 truncate">{s.sessionId}</p>
                      <p className="text-[10px] text-gray-500">{s.checks} checks · {s.anomalyCount} anomaly(ies)</p>
                    </div>
                    <span className="text-xs font-bold text-white">{s.trustScore}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${RISK_STYLE[s.riskLevel] || ""}`}>{s.riskLevel}</span>
                  </div>
                ))}
                {sessions.length === 0 && !session && <p className="text-xs text-gray-500 p-2">No sessions yet — evaluate a session to begin monitoring.</p>}
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-3">Recent biometric events</h2>
            {dash.recentEvents?.length ? (
              <div className="space-y-1.5">
                {dash.recentEvents.slice(0, 8).map((e: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Activity className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-gray-300"><span className="text-gray-500">{new Date(e.at).toLocaleTimeString()} ·</span> {e.detail}</p>
                      <p className="text-[10px] text-gray-600 uppercase">{e.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">No events logged yet.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
