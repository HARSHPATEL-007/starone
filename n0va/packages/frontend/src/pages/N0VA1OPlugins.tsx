import React, { useEffect, useRef, useState } from "react";
import {
  Puzzle, RefreshCw, Loader2, Power, Zap, Lightbulb, ListOrdered, Sparkles,
} from "lucide-react";
import { api } from "../api/client";

const unwrap = (r: any) => r?.data ?? r;

function SkeletonCard({ h = 28 }: { h?: number }) {
  return <div className="animate-pulse rounded-xl bg-gray-800/60 p-4"><div style={{ height: h }} className="rounded-md bg-gray-700/60" /></div>;
}

export default function N0VA1OPlugins() {
  const { addToast } = (window as any).useToast ? (window as any).useToast() : { addToast: () => {} };
  const toastRef = useRef<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [auto, setAuto] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [dash, setDash] = useState<any>(null);
  const [log, setLog] = useState<any>(null);
  const [lastCycle, setLastCycle] = useState<any[]>([]);

  const toast = (t: string, type: "success" | "error" | "info" = "success") => {
    if (toastRef.current) toastRef.current(t, type);
    else if (addToast && typeof addToast === "function") addToast(t, type);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [d, l] = await Promise.all([
        api.adsMarketingModule.n0va1oPluginDashboard(),
        api.adsMarketingModule.n0va1oPluginLog(20),
      ]);
      setDash(unwrap(d)); setLog(unwrap(l));
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e?.message || "Failed to load plugin data");
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

  const toggle = async (slotId: string) => {
    const d = await act(`tg-${slotId}`, () => api.adsMarketingModule.n0va1oTogglePlugin(slotId), "Plugin toggled");
    if (d) toast(d.summary || "Plugin toggled");
  };

  const runCycle = async () => {
    const d = await act("cycle", () => api.adsMarketingModule.n0va1oRunPluginCycle(), "Plugin cycle complete");
    if (d) setLastCycle(d.insights || []);
  };

  if (loading && !dash) {
    return <div className="space-y-4"><SkeletonCard h={80} /><SkeletonCard /><SkeletonCard /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Plugin Engine</h1>
          <p className="text-sm text-gray-400">8-slot self-improving architecture — every plugin improves the gateway (auth, schema, rate-limit, errors, payloads, routes, security, cost)</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadAll} className="rounded-lg border border-gray-700 p-2 text-gray-300 hover:bg-gray-800" title="Refresh"><RefreshCw size={16} /></button>
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="accent-violet-500" /> Auto 30s
          </label>
        </div>
      </div>

      {loadError && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{loadError}</div>}

      {dash && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Slots", value: `${dash.slots?.length ?? 8}`, icon: <Puzzle size={16} /> },
            { label: "Enabled", value: dash.enabledCount ?? 0, icon: <Power size={16} /> },
            { label: "Total runs", value: dash.totalRuns ?? 0, icon: <Zap size={16} /> },
            { label: "Insights", value: dash.totalInsights ?? 0, icon: <Lightbulb size={16} /> },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-gray-800 bg-gray-900/60 p-3">
              <div className="flex items-center gap-2 text-gray-400">{c.icon}<span className="text-xs">{c.label}</span></div>
              <div className="mt-1 text-2xl font-bold text-white">{c.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-800 bg-gray-900/60 p-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-200">Run a plugin cycle</h2>
          <p className="text-xs text-gray-500">Every enabled slot generates an insight and increments its run + insight counters.</p>
        </div>
        <button onClick={runCycle} disabled={busy === "cycle"} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50">
          {busy === "cycle" ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Run cycle
        </button>
      </div>

      {lastCycle.length > 0 && (
        <div className="rounded-xl border border-violet-500/30 bg-violet-600/10 p-4">
          <h2 className="mb-2 text-sm font-semibold text-violet-200">Latest insights</h2>
          <div className="space-y-1.5">
            {lastCycle.map((i: any) => (
              <div key={i.slotId} className="rounded-lg bg-gray-900/60 px-3 py-1.5 text-xs text-gray-300">
                <b className="text-violet-300">{i.name}</b> — {i.detail} <span className="text-gray-500">(runs {i.runs}, insights {i.insightCount})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(dash?.slots || []).map((s: any) => (
          <div key={s.id} className={`rounded-xl border p-4 ${s.enabled ? "border-violet-500/30 bg-violet-600/5" : "border-gray-800 bg-gray-900/60"}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] text-gray-500">SLOT {s.slot}</span>
                <h3 className="text-sm font-semibold text-white">{s.name}</h3>
              </div>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] ${s.enabled ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300" : "border-gray-700 bg-gray-800 text-gray-400"}`}>
                {s.enabled ? "active" : "disabled"}
              </span>
            </div>
            <p className="mt-2 min-h-[48px] text-xs leading-relaxed text-gray-400">{s.purpose}</p>
            <div className="mt-3 flex items-center justify-between border-t border-gray-800 pt-2 text-xs text-gray-400">
              <span>{s.runs ?? 0} runs</span>
              <span>{s.insightCount ?? 0} insights</span>
              {s.lastRunAt && <span className="hidden truncate text-[10px] text-gray-500 xl:inline">{new Date(s.lastRunAt).toLocaleTimeString()}</span>}
            </div>
            <button onClick={() => toggle(s.id)} disabled={busy === `tg-${s.id}`}
              className={`mt-3 w-full rounded-lg border px-3 py-1.5 text-xs ${s.enabled ? "border-red-500/30 text-red-300 hover:bg-red-500/10" : "border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"} disabled:opacity-50`}>
              {s.enabled ? "Disable" : "Enable"}
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-200"><ListOrdered size={14} /> Activity log</h2>
        <div className="max-h-64 space-y-1.5 overflow-y-auto">
          {(log?.entries || []).map((e: any, i: number) => (
            <div key={i} className="rounded-lg bg-gray-800/50 px-3 py-1.5 text-xs">
              <span className="text-gray-400">{new Date(e.at || e.createdAt).toLocaleString()}</span>
              <span className="mx-2 text-gray-600">·</span>
              <span className="text-gray-200">{e.detail}</span>
            </div>
          ))}
          {(log?.entries || []).length === 0 && <p className="text-sm text-gray-500">No plugin activity yet.</p>}
        </div>
      </div>
    </div>
  );
}
