import { useEffect, useState, useCallback } from "react";
import {
  Gauge, RefreshCw, AlertTriangle, Database, Zap, Globe, Leaf, Search, Trash2, ChevronRight, Activity,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const LAYER_COLOR: Record<string, string> = {
  L1: "text-sky-400", L2: "text-cyan-400", L3: "text-teal-400", L4: "text-emerald-400", L5: "text-lime-400", L6: "text-amber-400", L7: "text-orange-400", L8: "text-rose-400", L9: "text-violet-400",
};

export default function MailPerformance() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [explain, setExplain] = useState<any>(null);
  const [query, setQuery] = useState("find messages in folder inbox by tenant with date received");
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const d = unwrap(await api.adsMarketingModule.mailPerformanceDashboard().catch(() => null));
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
    if (kind === "explain") setExplain(r);
    load();
  }

  const caching = dash?.caching || {};
  const queryOpt = dash?.queryOptimization || {};
  const scalability = dash?.scalability || {};
  const edge = dash?.edge || {};
  const sustain = dash?.sustainability || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Gauge className="w-6 h-6 text-n0va-400" /> Mail Performance</h1>
          <p className="text-gray-500 mt-1 text-sm">Cache stack, query optimization, edge & green computing (spec §6.6)</p>
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
              <p className="text-sm text-red-300 font-medium">Performance data unavailable</p>
              <p className="text-xs text-red-400/70">Check that the backend is running.</p>
            </div>
            <button className="btn-secondary text-xs ml-auto" onClick={load}>Retry</button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{caching.averageHitRate ?? 0}<span className="text-sm text-gray-500">%</span></p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Cache avg hit rate · {caching.layers?.length || 0} layers</p>
              <p className={`text-[10px] mt-1 font-bold ${caching.overallStatus === "healthy" ? "text-emerald-400" : caching.overallStatus === "degraded" ? "text-amber-400" : "text-red-400"}`}>{caching.overallStatus}</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{queryOpt.activeCount ?? 0}<span className="text-sm text-gray-500">/{queryOpt.indexes?.length ?? 0}</span></p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Query techniques active</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{scalability.avgLoadPct ?? 0}<span className="text-sm text-gray-500">%</span></p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Avg load · {scalability.verdict}</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{edge.avgLatencyMs ?? 0}<span className="text-sm text-gray-500">ms</span></p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Edge avg latency · {edge.regions?.length || 0} regions</p>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Database className="w-4 h-4 text-n0va-400" /> Cache layers</h2>
              <button className="btn-secondary text-xs" disabled={busy === "flush"} onClick={() => act("flush", () => api.adsMarketingModule.mailPerformanceFlushCache(undefined))}><Trash2 className="w-3.5 h-3.5 mr-1" /> {busy === "flush" ? "Flushing..." : "Flush all"}</button>
            </div>
            <div className="space-y-2">
              {caching.layers?.map((l: any) => (
                <div key={l.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/40">
                  <span className={`text-[10px] font-bold w-8 shrink-0 ${LAYER_COLOR[l.layer] || "text-gray-400"}`}>{l.layer}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-gray-200 truncate">{l.name} <span className="text-gray-500">· {l.technology}</span></p>
                      <span className={`text-[10px] font-bold shrink-0 ${l.status === "on_target" ? "text-emerald-400" : "text-amber-400"}`}>{l.status}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${l.status === "on_target" ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${Math.min(100, l.hitRate)}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-500 shrink-0">{l.hitRate}% / target {l.hitRateTarget}% · {l.hits.toLocaleString()} hits · ttl {l.ttl}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Search className="w-4 h-4 text-n0va-400" /> Query optimizer</h2>
              <div className="flex items-center gap-2 mb-3">
                <input value={query} onChange={(e) => setQuery(e.target.value)} className="input text-xs flex-1" placeholder="describe your query..." />
                <button className="btn-primary text-xs" disabled={busy === "explain"} onClick={() => act("explain", () => api.adsMarketingModule.mailPerformanceExplainQuery(query))}><ChevronRight className="w-3.5 h-3.5" /></button>
              </div>
              {explain && (
                <div className="p-2.5 rounded-lg bg-gray-800/40 mb-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-white">{explain.verdict}</p>
                    <span className="text-[10px] text-gray-500">{explain.estimatedMs}ms est.</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">{explain.summary}</p>
                  {explain.indexMatches?.length > 0 && (
                    <p className="text-[10px] text-n0va-400 mt-1">indexes: {explain.indexMatches.join(", ")}</p>
                  )}
                </div>
              )}
              <div className="space-y-1.5">
                {queryOpt.indexes?.map((idx: any) => (
                  <div key={idx.name} className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/40">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${queryOpt.active?.some((a: any) => a.name === idx.name) ? "bg-emerald-500" : "bg-gray-600"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-200 truncate">{idx.name} <span className="text-[10px] text-gray-500">· {idx.type}</span></p>
                      <p className="text-[10px] text-gray-500 truncate">{idx.impact}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Globe className="w-4 h-4 text-n0va-400" /> Edge regions</h2>
              <div className="space-y-2">
                {edge.regions?.map((r: any) => (
                  <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/40">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-gray-200">{r.name}</p>
                        <span className={`text-[10px] font-bold ${r.status === "healthy" ? "text-emerald-400" : "text-amber-400"}`}>{r.status}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-n0va-500 rounded-full" style={{ width: `${r.loadPct}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-500 shrink-0">{r.latencyMs}ms · {r.loadPct}% load</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-500 mt-2">{edge.sync?.mode}</p>

              <h2 className="text-sm font-semibold text-white mt-5 mb-2 flex items-center gap-2"><Zap className="w-4 h-4 text-n0va-400" /> Scalability targets</h2>
              <div className="space-y-1.5">
                {scalability.targets?.map((t: any) => (
                  <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/40">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-200 truncate">{t.name} <span className="text-[10px] text-gray-500">· {t.target}</span></p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${t.currentLoadPct >= 80 ? "bg-red-500" : t.currentLoadPct >= 60 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${t.currentLoadPct}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-500 shrink-0">{t.currentLoadPct}% load · {t.headroomPct}% headroom</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Leaf className="w-4 h-4 text-emerald-400" /> Sustainability</h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="relative w-16 h-16">
                  <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#1f2937" strokeWidth="8" />
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#10b981" strokeWidth="8" strokeDasharray={`${(sustain.greenScore / 100) * 175.9} 175.9`} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">{sustain.greenScore}</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-400 uppercase">{sustain.greenLevel}</p>
                  <p className="text-[10px] text-gray-500">{sustain.co2PerEmail}g CO2/email · WUE {sustain.wue} · target {sustain.targetCo2}g</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 flex-1">
                {sustain.initiatives?.map((i: any) => (
                  <div key={i.name} className="p-2 rounded-lg bg-gray-800/40">
                    <p className="text-xs font-medium text-gray-200 truncate">{i.name} <span className="text-[10px] text-emerald-400">· {i.impact}</span></p>
                    <p className="text-[10px] text-gray-500 truncate">{i.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {sustain.certifications?.map((c: string) => (
                <span key={c} className="text-[10px] text-gray-400 px-2 py-0.5 rounded-full border border-gray-700 bg-gray-800/60">{c}</span>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-3">Performance events</h2>
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
              <p className="text-xs text-gray-500">No performance events yet — flush a cache layer to log one.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
