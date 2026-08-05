import React, { useEffect, useRef, useState } from "react";
import {
  Activity, AlertTriangle, BarChart3, RefreshCw, Loader2, Plus,
  PlayCircle, CheckCircle2, RotateCcw, FileText, Radio, Waves,
} from "lucide-react";
import { api } from "../api/client";

const unwrap = (r: any) => r?.data ?? r;

function SkeletonCard({ h = 28 }: { h?: number }) {
  return <div className="animate-pulse rounded-xl bg-gray-800/60 p-4"><div style={{ height: h }} className="rounded-md bg-gray-700/60" /></div>;
}

const SEV_STYLE: Record<string, string> = {
  low: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
  medium: "border-amber-500/30 bg-amber-500/15 text-amber-300",
  high: "border-red-500/30 bg-red-500/15 text-red-300",
};

export default function N0VA1OObserve() {
  const { addToast } = (window as any).useToast ? (window as any).useToast() : { addToast: () => {} };
  const toastRef = useRef<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [auto, setAuto] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [dash, setDash] = useState<any>(null);
  const [catalog, setCatalog] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [lastTrace, setLastTrace] = useState<any>(null);
  const [lastRetry, setLastRetry] = useState<any>(null);

  const [sig, setSig] = useState("logs");
  const [scope, setScope] = useState("gateway");
  const [msg, setMsg] = useState("");
  const [durationMs, setDurationMs] = useState("");

  const [traceName, setTraceName] = useState("");
  const [traceMs, setTraceMs] = useState("");

  const [errClass, setErrClass] = useState("transient");
  const [errMsg, setErrMsg] = useState("");
  const [attempt, setAttempt] = useState("1");

  const addToastFn = () => {
    if (!toastRef.current && (window as any).__n0vaToast) toastRef.current = (window as any).__n0vaToast;
  };
  const toast = (t: string, type: "success" | "error" | "info" = "success") => {
    addToastFn();
    if (toastRef.current) toastRef.current(t, type);
    else if (addToast && typeof addToast === "function") addToast(t, type);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [d, c] = await Promise.all([
        api.adsMarketingModule.n0va1oObserveDashboard(),
        api.adsMarketingModule.n0va1oObserveCatalog(),
      ]);
      setDash(unwrap(d)); setCatalog(unwrap(c));
      setStats(unwrap(await api.adsMarketingModule.n0va1oTelemetryStats()));
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e?.message || "Failed to load observability data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    const h = () => loadAll();
    window.addEventListener("n0va:refresh-data", h);
    const t = setInterval(() => { if (auto) loadAll(); }, 30000);
    return () => { window.removeEventListener("n0va:refresh-data", h); clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  const act = async (key: string, fn: () => Promise<any>, successMsg?: string) => {
    setBusy(key);
    try {
      const r = await fn();
      const d = unwrap(r);
      toast(successMsg || d?.summary || "Done");
      await loadAll();
      return d;
    } catch (e: any) {
      toast(e?.message || "Action failed", "error");
      return null;
    } finally {
      setBusy(null);
    }
  };

  const runTelemetry = async () => {
    const d = await act("telemetry", () =>
      api.adsMarketingModule.n0va1oTelemetry({
        signal: sig, scope, message: msg || undefined,
        durationMs: durationMs ? Number(durationMs) : undefined,
      }), "Telemetry recorded");
    if (d) { setMsg(""); setDurationMs(""); }
  };

  const runTrace = async () => {
    if (!traceName.trim()) { toast("Trace name is required", "error"); return; }
    const d = await act("trace", () =>
      api.adsMarketingModule.n0va1oTrace({ name: traceName.trim(), durationMs: traceMs ? Number(traceMs) : undefined }), "Trace recorded");
    if (d) { setTraceName(""); setTraceMs(""); setLastTrace(unwrap(d)); }
  };

  const runGetTrace = async (traceId: string) => {
    const d = await act(`get-${traceId}`, () => api.adsMarketingModule.n0va1oGetTrace(traceId), "Trace loaded");
    if (d) setLastTrace(unwrap(d));
  };

  const runError = async () => {
    if (!errMsg.trim()) { toast("Error message is required", "error"); return; }
    const d = await act("error", () =>
      api.adsMarketingModule.n0va1oReportError({ errorClass: errClass, message: errMsg.trim(), scope }), "Error reported");
    if (d) setErrMsg("");
  };

  const runRetry = async (errorId: string) => {
    const d = await act(`retry-${errorId}`, () =>
      api.adsMarketingModule.n0va1oRetryDecision(errorId, Math.max(1, Number(attempt) || 1)), "Retry decision computed");
    if (d) setLastRetry(unwrap(d));
  };

  const runResolve = async (errorId: string) => {
    await act(`res-${errorId}`, () => api.adsMarketingModule.n0va1oResolveError(errorId), "Error resolved");
  };

  if (loading && !dash) {
    return (
      <div className="space-y-4 p-4 md:p-8">
        <SkeletonCard h={20} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} h={24} />)}
        </div>
        <SkeletonCard h={64} />
      </div>
    );
  }

  const signals = catalog?.signals || [];
  const errorClasses = catalog?.errorClasses || [];
  const traces = dash?.traces?.traces || [];
  const errors = dash?.errors?.errors || [];
  const bySignal = stats?.bySignal || [];

  const statCards = [
    { label: "Signals", value: catalog?.totalSignals ?? signals.length, icon: <Radio className="h-4 w-4" />, color: "text-sky-300" },
    { label: "Error classes", value: catalog?.totalErrorClasses ?? errorClasses.length, icon: <AlertTriangle className="h-4 w-4" />, color: "text-violet-300" },
    { label: "Traces", value: dash?.traces?.total ?? 0, icon: <Waves className="h-4 w-4" />, color: "text-emerald-300" },
    { label: "Open errors", value: dash?.errors?.open ?? 0, icon: <Activity className="h-4 w-4" />, color: "text-amber-300" },
  ];

  return (
    <div className="space-y-4 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-white">N0VA1O Observe</h1>
          <p className="text-sm text-gray-400">OpenTelemetry signals, retry-aware errors, one control plane.</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="accent-violet-500" />
          Auto-refresh 30s
          <button onClick={loadAll} className="rounded-lg border border-gray-700 p-1.5 text-gray-300 hover:bg-gray-800" title="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </label>
      </div>

      {loadError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{loadError}</div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {statCards.map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-800 bg-gray-900/60 p-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">{c.icon}{c.label}</div>
            <div className={`mt-1 text-lg font-bold ${c.color}`}>{c.value}</div>
          </div>
        ))}
      </div>

      {dash?.summary && <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-3 text-sm text-gray-300">{dash.summary}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Radio className="h-4 w-4 text-sky-300" />Signals</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {signals.map((s: any) => (
              <div key={s.id} className="rounded-lg border border-gray-800 bg-gray-950/60 p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-200">{s.name}</span>
                  <code className="text-[10px] text-gray-500">{s.collector}</code>
                </div>
                <div className="text-[10px] text-gray-600">retention {s.retentionDays}d</div>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <div className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Volume by signal</div>
            <div className="mt-1.5 space-y-1.5">
              {bySignal.map((b: any) => (
                <div key={b.signal} className="flex items-center gap-2">
                  <span className="w-14 text-[10px] text-gray-400">{b.signal}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-800">
                    <div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.min(100, (b.count / (stats?.total || 1)) * 100)}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-500">{b.count}</span>
                </div>
              ))}
              {bySignal.length === 0 && <div className="text-[10px] text-gray-600">No telemetry yet.</div>}
            </div>
            {stats?.avgDurationMs != null && <div className="mt-2 text-[10px] text-gray-500">avg duration {stats.avgDurationMs}ms</div>}
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Activity className="h-4 w-4 text-violet-300" />Record telemetry</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select value={sig} onChange={(e) => setSig(e.target.value)} className="rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-white">
              {signals.map((s: any) => <option key={s.id} value={s.id}>{s.id}</option>)}
            </select>
            <input value={scope} onChange={(e) => setScope(e.target.value)} placeholder="scope"
              className="w-24 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-white placeholder-gray-600" />
            <input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="message"
              className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-white placeholder-gray-600" />
            <input value={durationMs} onChange={(e) => setDurationMs(e.target.value)} placeholder="ms"
              className="w-16 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-white placeholder-gray-600" />
            <button onClick={runTelemetry} disabled={busy === "telemetry"}
              className="flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50">
              {busy === "telemetry" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Record
            </button>
          </div>
          <h2 className="mt-4 flex items-center gap-2 text-sm font-semibold text-white"><Waves className="h-4 w-4 text-emerald-300" />Traces</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input value={traceName} onChange={(e) => setTraceName(e.target.value)} placeholder="trace name"
              className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-white placeholder-gray-600" />
            <input value={traceMs} onChange={(e) => setTraceMs(e.target.value)} placeholder="ms"
              className="w-16 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-white placeholder-gray-600" />
            <button onClick={runTrace} disabled={busy === "trace"}
              className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50">
              {busy === "trace" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />} Trace
            </button>
          </div>
          <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
            {traces.map((t: any) => (
              <div key={t.traceId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-800 bg-gray-950/60 p-2 text-[11px]">
                <div className="min-w-0">
                  <div className="truncate text-gray-200">{t.name}</div>
                  <code className="text-[10px] text-gray-500">{t.traceId}</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">{t.durationMs}ms · {t.spanCount} span(s)</span>
                  <span className={`rounded-full border px-1.5 py-0.5 text-[10px] ${t.status === "ok" ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300" : "border-amber-500/30 bg-amber-500/15 text-amber-300"}`}>{t.status}</span>
                  <button onClick={() => runGetTrace(t.traceId)} disabled={busy === `get-${t.traceId}`}
                    className="flex items-center gap-1 rounded border border-gray-700 px-1.5 py-0.5 text-[10px] text-gray-300 hover:bg-gray-800 disabled:opacity-50">
                    {busy === `get-${t.traceId}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />} View
                  </button>
                </div>
              </div>
            ))}
            {traces.length === 0 && <div className="text-xs text-gray-500">No traces yet.</div>}
          </div>
          {lastTrace && (
            <div className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-[11px]">
              <div className="font-medium text-emerald-200">{lastTrace.name} — {lastTrace.durationMs}ms</div>
              {(lastTrace.spans || []).map((sp: any, i: number) => (
                <div key={i} className="mt-1 flex items-center gap-2 text-[10px] text-gray-300">
                  <span className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-gray-500">{sp.operation}</span>
                  <span>{sp.service}</span>
                  <span className="text-gray-500">{sp.durationMs}ms</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><AlertTriangle className="h-4 w-4 text-red-300" />Error classes & incident center</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {errorClasses.map((c: any) => (
            <div key={c.id} className="rounded-lg border border-gray-800 bg-gray-950/60 p-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-200">{c.name}</span>
                <code className="text-[10px] text-gray-500">{c.retryStrategy}</code>
              </div>
              <div className="mt-0.5 text-[10px] text-gray-500">{c.description}</div>
              <div className="text-[10px] text-gray-600">max {c.maxAttempts} attempt(s) · base backoff {c.baseBackoffMs}ms</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select value={errClass} onChange={(e) => setErrClass(e.target.value)} className="rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-white">
            {errorClasses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input value={errMsg} onChange={(e) => setErrMsg(e.target.value)} placeholder="error message"
            className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-white placeholder-gray-600" />
          <button onClick={runError} disabled={busy === "error"}
            className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50">
            {busy === "error" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />} Report error
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-gray-500">Retry decision at attempt:</span>
          <input value={attempt} onChange={(e) => setAttempt(e.target.value)} className="w-14 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1 text-xs text-white" />
          {lastRetry && (
            <span className={`rounded-full border px-2 py-0.5 text-[10px] ${lastRetry.verdict === "retry" ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300" : "border-red-500/30 bg-red-500/15 text-red-300"}`}>
              {lastRetry.verdict} · {lastRetry.backoffMs}ms · {lastRetry.strategy}
            </span>
          )}
        </div>
        <div className="mt-3 max-h-64 space-y-1.5 overflow-y-auto">
          {errors.map((e: any) => (
            <div key={e.errorId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-800 bg-gray-950/60 p-2 text-[11px]">
              <div className="min-w-0">
                <div className="truncate text-gray-200">{e.message}</div>
                <code className="text-[10px] text-gray-500">{e.errorId} · {e.scope}</code>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`rounded-full border px-1.5 py-0.5 text-[10px] ${SEV_STYLE[e.severity] || "border-gray-700 text-gray-400"}`}>{e.severity}</span>
                <span className="rounded-full border border-gray-700 px-1.5 py-0.5 text-[10px] text-gray-400">{e.errorClass}</span>
                <span className="text-[10px] text-gray-500">{e.attempts ?? 0} attempt(s) · {e.status}</span>
                {e.status === "open" && (
                  <>
                    <button onClick={() => runRetry(e.errorId)} disabled={busy === `retry-${e.errorId}`}
                      className="flex items-center gap-1 rounded border border-gray-700 px-1.5 py-0.5 text-[10px] text-gray-300 hover:bg-gray-800 disabled:opacity-50">
                      {busy === `retry-${e.errorId}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />} Retry
                    </button>
                    <button onClick={() => runResolve(e.errorId)} disabled={busy === `res-${e.errorId}`}
                      className="flex items-center gap-1 rounded border border-emerald-500/30 px-1.5 py-0.5 text-[10px] text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50">
                      {busy === `res-${e.errorId}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />} Resolve
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {errors.length === 0 && <div className="text-xs text-gray-500">No reported errors.</div>}
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><BarChart3 className="h-4 w-4 text-sky-300" />Recent activity</h2>
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          {(dash?.log?.entries || []).slice(0, 12).map((l: any, i: number) => (
            <div key={i} className="rounded-lg border border-gray-800 bg-gray-950/60 p-2 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-[10px] text-violet-300">{l.category}</span>
                <span className="shrink-0 text-[10px] text-gray-600">{new Date(l.at).toLocaleTimeString()}</span>
              </div>
              <div className="mt-0.5 text-gray-400">{l.detail}</div>
            </div>
          ))}
          {!dash?.log?.entries?.length && <div className="text-xs text-gray-500">No observability activity yet.</div>}
        </div>
      </div>
    </div>
  );
}
