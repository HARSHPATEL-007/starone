import { useEffect, useState, useCallback } from "react";
import {
  FlaskConical, RefreshCw, AlertTriangle, Rocket, ShieldCheck, ShieldAlert, CalendarDays, Activity, Play, Square,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

export default function MailChaos() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const d = unwrap(await api.adsMarketingModule.mailChaosDashboard().catch(() => null));
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
    load();
  }

  const catalog = dash?.catalog || {};
  const runs = dash?.runs || {};
  const resilience = dash?.resilience || {};
  const gameDays = dash?.gameDays || {};
  const score = resilience.score ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><FlaskConical className="w-6 h-6 text-n0va-400" /> Chaos Engineering</h1>
          <p className="text-gray-500 mt-1 text-sm">Resilience experiments & game days (spec §8.3)</p>
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
              <p className="text-sm text-red-300 font-medium">Chaos data unavailable</p>
              <p className="text-xs text-red-400/70">Check that the backend is running.</p>
            </div>
            <button className="btn-secondary text-xs ml-auto" onClick={load}>Retry</button>
          </div>
        </div>
      ) : (
        <>
          <div className={`card flex flex-col sm:flex-row sm:items-center gap-3 border ${score >= 80 ? "border-emerald-500/30 bg-emerald-500/10" : score >= 60 ? "border-amber-500/40 bg-amber-500/5" : "border-red-500/40 bg-red-500/5"}`}>
            {score >= 80 ? <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" /> : score >= 60 ? <ShieldAlert className="w-8 h-8 text-amber-400 shrink-0" /> : <AlertTriangle className="w-8 h-8 text-red-400 shrink-0" />}
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-wider text-white">Resilience score {score}<span className="text-gray-500">/100</span></p>
              <p className="text-xs text-gray-400 mt-0.5">{resilience.summary}</p>
            </div>
            <div className="sm:ml-auto flex items-center gap-3 shrink-0">
              <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${score}%` }} />
              </div>
              <span className="text-xs font-bold text-white">{resilience.level}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{runs.total || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Experiments run</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-emerald-400">{runs.recovered || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Recovered</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-red-400">{runs.failed || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Failed</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{catalog.total || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">In catalog · {catalog.autoRollback || 0} auto-rollback</p>
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-3">Experiment catalog</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {catalog.experiments?.map((e: any) => (
                <div key={e.id} className="p-3 rounded-lg bg-gray-800/40">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-100 truncate">{e.name} <span className="text-[10px] text-gray-500">· {e.id}</span></p>
                    <button className={`btn-secondary text-[10px] px-2 py-1 shrink-0 ${busy === `run_${e.id}` ? "opacity-50" : ""}`} disabled={busy === `run_${e.id}`} onClick={() => act(`run_${e.id}`, () => api.adsMarketingModule.mailChaosRun(e.id))}>
                      <Play className="w-3 h-3 mr-1" /> {busy === `run_${e.id}` ? "..." : "Run"}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">{e.target} · blast radius {e.blastRadius}</p>
                  <p className="text-[10px] text-gray-500">{e.expected}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1 inline-block ${e.autoRollback ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-amber-400 border-amber-500/30 bg-amber-500/10"}`}>{e.autoRollback ? "Auto-rollback" : "Manual rollback"}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-3">Run history</h2>
              {runs.runs?.length ? (
                <div className="space-y-2">
                  {runs.runs.map((r: any) => (
                    <div key={r.runId} className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/40">
                      {r.status === "recovered" ? <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" /> : r.status === "running" ? <Activity className="w-4 h-4 text-sky-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-gray-200 truncate">{r.name}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${r.status === "recovered" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : r.status === "running" ? "text-sky-400 border-sky-500/30 bg-sky-500/10" : "text-red-400 border-red-500/30 bg-red-500/10"}`}>{r.status}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 truncate">{r.target} · recovered in {r.recoverySeconds}s · {new Date(r.startedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No runs yet — fire an experiment above.</p>
              )}
            </div>

            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-n0va-400" /> Game day cadence</h2>
              {gameDays.schedule?.length ? (
                <div className="space-y-2">
                  {gameDays.schedule.map((g: any) => (
                    <div key={g.frequency} className="p-2.5 rounded-lg bg-gray-800/40">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-200">{g.frequency}</p>
                        <span className="text-[10px] text-gray-500">{g.duration}</span>
                      </div>
                      <p className="text-[10px] text-gray-500">{g.scope} · {g.participants}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">last {new Date(g.lastRun).toLocaleDateString()} · next {new Date(g.nextRun).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No game days scheduled.</p>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-3">Chaos activity</h2>
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
              <p className="text-xs text-gray-500">No chaos activity yet.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}