import React, { useEffect, useRef, useState } from "react";
import {
  Database, ArrowRight, PlayCircle, Trash2, RefreshCw, Loader2,
  CheckCircle2, XCircle, Clock, FileArchive, ListOrdered,
} from "lucide-react";
import { api } from "../api/client";

const unwrap = (r: any) => r?.data ?? r;

function SkeletonCard({ h = 28 }: { h?: number }) {
  return <div className="animate-pulse rounded-xl bg-gray-800/60 p-4"><div style={{ height: h }} className="rounded-md bg-gray-700/60" /></div>;
}

const PHASE_LABELS: Record<string, string> = {
  audit_export: "Audit export",
  agents: "Agents",
  recipes: "Recipes",
  connections: "Connections",
  webhooks: "Webhooks",
  validate: "Validate",
};

const STATUS_STYLE: Record<string, string> = {
  in_progress: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  ready: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  blocked: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  done: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  failed: "bg-red-500/15 text-red-300 border-red-500/30",
};

export default function N0VA1OMigration() {
  const { addToast } = (window as any).useToast ? (window as any).useToast() : { addToast: () => {} };
  const toastRef = useRef<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [auto, setAuto] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [catalog, setCatalog] = useState<any>(null);
  const [dash, setDash] = useState<any>(null);
  const [migs, setMigs] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<Record<string, any>>({});
  const [log, setLog] = useState<any>(null);

  const [source, setSource] = useState("zapier");
  const [label, setLabel] = useState("");
  const [expand, setExpand] = useState<Record<string, boolean>>({});

  const toast = (t: string, type: "success" | "error" | "info" = "success") => {
    if (toastRef.current) toastRef.current(t, type);
    else if (addToast && typeof addToast === "function") addToast(t, type);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [c, d, m, l] = await Promise.all([
        api.adsMarketingModule.n0va1oMigrationCatalog(),
        api.adsMarketingModule.n0va1oMigrationDashboard(),
        api.adsMarketingModule.n0va1oMigrations(),
        api.adsMarketingModule.n0va1oMigrationLog(20),
      ]);
      const migList = unwrap(m);
      setCatalog(unwrap(c)); setDash(unwrap(d));
      setMigs(Array.isArray(migList) ? migList : migList?.migrations || []);
      setLog(unwrap(l));
      const stMap: Record<string, any> = {};
      for (const row of (Array.isArray(migList) ? migList : migList?.migrations || [])) {
        try { stMap[row.migrationId] = unwrap(await api.adsMarketingModule.n0va1oMigrationStatus(row.migrationId)); } catch { /* skip */ }
      }
      setStatuses(stMap);
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e?.message || "Failed to load migration data");
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

  const startMigration = async () => {
    const d = await act("start", () => api.adsMarketingModule.n0va1oMigrationStart({ source, label: label || `${source} import` }), "Migration started");
    if (d) setExpand((x) => ({ ...x, [d.migrationId]: true }));
  };

  const runPhase = async (migrationId: string, phaseId: string) => {
    const d = await act(`run-${phaseId}`, () => api.adsMarketingModule.n0va1oMigrationRunPhase(migrationId, phaseId), "Phase executed");
    if (d && !d.success && d.error) toast(d.error, "error");
  };

  const delMigration = async (migrationId: string) => {
    await act(`del-${migrationId}`, () => api.adsMarketingModule.n0va1oMigrationDelete(migrationId), "Migration removed");
  };

  const srcName = (id: string) => catalog?.targets?.find((t: any) => t.id === id)?.name || id;

  if (loading && !dash) {
    return <div className="space-y-4"><SkeletonCard h={80} /><SkeletonCard /><SkeletonCard /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Migration Assistant</h1>
          <p className="text-sm text-gray-400">Spec §16 — move off legacy gateways (Zapier / MuleSoft / Workato / Tray) with dependency-gated phases</p>
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
            { label: "Total migrations", value: dash.counts?.total ?? 0, icon: <Database size={16} /> },
            { label: "In progress", value: dash.counts?.inProgress ?? 0, icon: <Clock size={16} /> },
            { label: "Phases done", value: `${dash.counts?.phasesDone ?? 0} / ${dash.counts?.phasesTotal ?? 0}`, icon: <CheckCircle2 size={16} /> },
            { label: "Completed", value: dash.counts?.completed ?? 0, icon: <FileArchive size={16} /> },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-gray-800 bg-gray-900/60 p-3">
              <div className="flex items-center gap-2 text-gray-400">{c.icon}<span className="text-xs">{c.label}</span></div>
              <div className="mt-1 text-2xl font-bold text-white">{c.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-200">Start a migration</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <label className="mb-1 block text-xs text-gray-400">Legacy source</label>
            <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white">
              {catalog?.targets?.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name} (~{t.sizeHintMB} MB)</option>
              ))}
            </select>
          </div>
          <div className="min-w-[180px] flex-1">
            <label className="mb-1 block text-xs text-gray-400">Label (optional)</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Q3 Zapier import" className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500" />
          </div>
          <button onClick={startMigration} disabled={busy === "start"} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50">
            {busy === "start" ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />} Start
          </button>
        </div>
        {catalog && <p className="mt-2 text-xs text-gray-500">Phases: {catalog.phases?.map((p: any) => PHASE_LABELS[p.id] || p.id).join(" → ")}</p>}
      </div>

      {migs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-800 p-8 text-center text-sm text-gray-500">No migrations yet — start one above.</div>
      ) : (
        <div className="space-y-4">
          {migs.map((m: any) => {
            const st = statuses[m.migrationId];
            return (
              <div key={m.migrationId} className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLE[m.status] || STATUS_STYLE.blocked}`}>{m.status}</span>
                    <span className="text-sm font-semibold text-white">{m.label || srcName(m.source)}</span>
                    <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">{srcName(m.source)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.status === "in_progress" && (
                      <button onClick={() => setExpand((x) => ({ ...x, [m.migrationId]: !x[m.migrationId] }))} className="rounded-lg border border-gray-700 px-3 py-1 text-xs text-gray-300 hover:bg-gray-800">
                        {expand[m.migrationId] ? "Hide phases" : "Show phases"}
                      </button>
                    )}
                    <button onClick={() => delMigration(m.migrationId)} className="rounded-lg border border-red-500/30 p-1.5 text-red-400 hover:bg-red-500/10" title="Delete"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-400 lg:grid-cols-4">
                  <span>Est. transfer: <b className="text-gray-200">{m.transferSizeEstimateMB} MB</b></span>
                  <span>Est. duration: <b className="text-gray-200">{m.durationEstimateMin} min</b></span>
                  <span>Progress: <b className="text-gray-200">{st?.progressPct ?? 0}%</b></span>
                  <span>Remaining: <b className="text-gray-200">{st?.remaining ?? 6} phase(s)</b></span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-800">
                  <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${st?.progressPct ?? 0}%` }} />
                </div>
                {expand[m.migrationId] && m.status === "in_progress" && (
                  <div className="mt-3 space-y-2 border-t border-gray-800 pt-3">
                    {(m.phases || []).map((p: any) => (
                      <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-800/50 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] ${STATUS_STYLE[p.status] || STATUS_STYLE.blocked}`}>{p.status}</span>
                          <span className="text-sm text-gray-200">{PHASE_LABELS[p.id] || p.id}</span>
                          {p.dependsOn && <span className="text-[10px] text-gray-500">after {PHASE_LABELS[p.dependsOn] || p.dependsOn}</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          {typeof p.transferPct === "number" && <span className="text-xs text-gray-400">{p.transferPct}%</span>}
                          {p.status === "ready" && (
                            <button onClick={() => runPhase(m.migrationId, p.id)} disabled={busy === `run-${p.id}`} className="rounded-lg bg-violet-600/80 px-3 py-1 text-xs text-white hover:bg-violet-500 disabled:opacity-50">
                              {busy === `run-${p.id}` ? <Loader2 size={12} className="animate-spin" /> : <PlayCircle size={12} />} Run
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-200">By source</h2>
          <div className="space-y-2">
            {(dash?.bySource || []).map((s: any) => (
              <div key={s.source} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{srcName(s.source)}</span>
                <span className="text-gray-400">{s.count} migration(s)</span>
              </div>
            ))}
            {(dash?.bySource || []).length === 0 && <p className="text-sm text-gray-500">No data</p>}
          </div>
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
            {(log?.entries || []).length === 0 && <p className="text-sm text-gray-500">No activity yet</p>}
          </div>
        </div>
      </div>

      <p className="flex items-center gap-2 text-xs text-gray-500">
        <ArrowRight size={12} /> Phases are dependency-gated: run each in order (audit_export → agents → recipes → connections → webhooks → validate). Progress is additive per run.
      </p>
    </div>
  );
}
