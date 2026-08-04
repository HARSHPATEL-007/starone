import { useEffect, useState, useCallback } from "react";
import {
  Target, RefreshCw, AlertTriangle, Timer, Bell, Layers, Zap, Calculator, Activity, Play, Square,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const TIER_COLORS: Record<number, string> = {
  1: "bg-gray-600",
  2: "bg-sky-500",
  3: "bg-amber-500",
  4: "bg-red-500",
};

export default function MailFocus() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [mode, setMode] = useState("deep_work");
  const [duration, setDuration] = useState("");
  const [frictionInput, setFrictionInput] = useState<Record<string, number>>({});
  const [roiUsers, setRoiUsers] = useState(1);
  const [roiRate, setRoiRate] = useState(75);

  const load = useCallback(async () => {
    const d = unwrap(await api.adsMarketingModule.mailFocusDashboard().catch(() => null));
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

  async function activate() {
    await act("activate", () => api.adsMarketingModule.mailFocusActivate(mode, duration ? Number(duration) : undefined));
  }

  async function computeFriction() {
    setBusy("friction");
    const r = unwrap(await api.adsMarketingModule.mailFocusFriction(Object.keys(frictionInput).length ? frictionInput : undefined).catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setBusy(null);
    load();
  }

  async function computeRoi() {
    setBusy("roi");
    const r = unwrap(await api.adsMarketingModule.mailFocusRoi(roiUsers, roiRate).catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setBusy(null);
    load();
  }

  const status = dash?.status || {};
  const session = status.session;
  const stats = status.stats || {};
  const tiers = dash?.tiers || {};
  const batching = dash?.batching || {};
  const friction = dash?.friction || {};
  const roi = dash?.roi || {};
  const modes = dash?.modes || [];
  const batchCatalog = dash?.suggestions || [];
  const log = dash?.recentLog || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Target className="w-6 h-6 text-n0va-400" /> Focus & Zero-Click Intelligence</h1>
          <p className="text-gray-500 mt-1 text-sm">Focus mode, notification tiers, smart batching, friction & ROI (spec §6, §4.3, §12)</p>
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
              <p className="text-sm text-red-300 font-medium">Focus data unavailable</p>
              <p className="text-xs text-red-400/70">Check that the backend is running.</p>
            </div>
            <button className="btn-secondary text-xs ml-auto" onClick={load}>Retry</button>
          </div>
        </div>
      ) : (
        <>
          {session && status.active ? (
            <div className="card border-emerald-500/30 bg-emerald-500/10">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <Timer className="w-7 h-7 text-emerald-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white">{session.name} focus active <span className="text-gray-500">· {session.remainingMin ?? "open-ended"} min left</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">{session.behavior}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    className="btn-secondary text-xs"
                    disabled={busy === "extend"}
                    onClick={() => act("extend", () => api.adsMarketingModule.mailFocusExtend(session.sessionId, 30))}
                  >
                    {busy === "extend" ? "..." : "+30 min"}
                  </button>
                  <button
                    className="btn-danger text-xs"
                    disabled={busy === "end"}
                    onClick={() => act("end", () => api.adsMarketingModule.mailFocusEnd(session.sessionId))}
                  >
                    <Square className="w-3 h-3 inline mr-1" />End focus
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white mb-2 flex items-center gap-1.5"><Target className="w-4 h-4 text-n0va-400" />Start a focus session</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select value={mode} onChange={(e) => setMode(e.target.value)} className="input">
                      {modes.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <input type="number" min={1} placeholder="Custom minutes (blank = default)" value={duration} onChange={(e) => setDuration(e.target.value)} className="input" />
                    <button className="btn-primary" disabled={busy === "activate"} onClick={activate}>
                      <Play className="w-4 h-4 inline mr-1" />{busy === "activate" ? "Starting..." : "Activate"}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1.5">{modes.find((m: any) => m.id === mode)?.behavior}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{stats.sessionsToday ?? 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Sessions today</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{stats.timeInFocusMin ?? 0}<span className="text-sm text-gray-500"> min</span></p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Time in focus</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-emerald-400">{stats.emailsHandled ?? 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Handled in focus</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-emerald-400">{stats.timeSavedMin ?? 0}<span className="text-sm text-gray-500"> min</span></p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Time saved</p>
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Bell className="w-4 h-4 text-n0va-400" />Notification tiers <span className="text-[11px] font-normal text-gray-500">· {tiers.total ?? 0} inbox messages classified</span></h2>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
              {(tiers.tiers || []).map((t: any) => (
                <div key={t.id} className="p-3 rounded-lg bg-gray-800/40">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-100">T{t.id} · {t.name}</p>
                    <span className={`text-xs font-bold text-white px-1.5 py-0.5 rounded ${TIER_COLORS[t.id] || "bg-gray-600"}`}>{t.count ?? 0}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1.5">{t.delivery}</p>
                  <ul className="mt-1.5 space-y-0.5">
                    {(t.examples || []).slice(0, 2).map((ex: string) => (
                      <li key={ex} className="text-[10px] text-gray-400 truncate">• {ex}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {tiers.summary && <p className="text-[11px] text-gray-500 mt-2">{tiers.summary}</p>}
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Layers className="w-4 h-4 text-n0va-400" />Smart batching policy</h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] px-2 py-1 rounded bg-gray-700/60 text-gray-200">{batching.context}</span>
              <span className="text-[11px] px-2 py-1 rounded bg-n0va-900/60 text-n0va-300 border border-n0va-700/40">{batching.policy}</span>
            </div>
            {batching.summary && <p className="text-[11px] text-gray-500 mt-2">{batching.summary}</p>}
            <div className="mt-3 border-t border-gray-700/40 pt-3">
              <p className="text-xs font-semibold text-gray-200 mb-2 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-n0va-400" />Batch intelligence (spec §4.3)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                {batchCatalog.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/40 text-[11px]">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-n0va-900/60 text-n0va-300 border border-n0va-700/40 shrink-0">{s.action}</span>
                    <span className="text-gray-300 truncate">{s.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 mt-2">Open <span className="text-gray-300">/mail</span>, select 2+ messages with the batch toolbar, then run group suggestions — newsletters archive, invoices file to Expenses, invites accept to Calendar, [TODO] items become tasks.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Activity className="w-4 h-4 text-n0va-400" />Daily friction score</h2>
              <div className="flex items-center gap-4">
                <div className="text-center shrink-0">
                  <p className="text-3xl font-bold text-white">{friction.score ?? "—"}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">vs baseline {friction.baseline ?? 3460}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${(friction.score ?? 0) <= 400 ? "bg-emerald-500" : (friction.score ?? 0) <= 1000 ? "bg-sky-500" : (friction.score ?? 0) <= 2500 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.min(100, Math.max(2, ((friction.score ?? 0) / (friction.baseline ?? 3460)) * 100))}%` }} />
                  </div>
                  <p className="text-xs text-gray-300 mt-1.5">{friction.level ?? "—"} friction · <span className="text-emerald-400">{friction.reductionPct ?? 0}%</span> below baseline</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <input type="number" step="0.1" min={0} placeholder="Clicks/email" onChange={(e) => setFrictionInput((f) => ({ ...f, clicksPerEmail: Number(e.target.value) }))} className="input text-xs" />
                <input type="number" min={0} placeholder="Decision sec" onChange={(e) => setFrictionInput((f) => ({ ...f, decisionSeconds: Number(e.target.value) }))} className="input text-xs" />
                <input type="number" min={0} placeholder="Notifications" onChange={(e) => setFrictionInput((f) => ({ ...f, notifications: Number(e.target.value) }))} className="input text-xs" />
              </div>
              <button className="btn-secondary text-xs mt-2" disabled={busy === "friction"} onClick={computeFriction}>
                {busy === "friction" ? "Computing..." : "Recompute with inputs"}
              </button>
            </div>

            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Calculator className="w-4 h-4 text-n0va-400" />ROI calculator</h2>
              <div className="flex items-center gap-4">
                <div className="text-center shrink-0">
                  <p className="text-3xl font-bold text-emerald-400">{roi.roiPct ?? "—"}<span className="text-sm text-gray-500">%</span></p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">ROI</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <p className="text-gray-400">Hours saved/yr</p><p className="text-white font-semibold text-right">{roi.hoursSavedPerYear?.toFixed?.(0) ?? "—"}</p>
                    <p className="text-gray-400">Value vs cost</p><p className="text-white font-semibold text-right">${(roi.annualValue ?? 0).toLocaleString()} vs ${(roi.annualCost ?? 0).toLocaleString()}</p>
                    <p className="text-gray-400">Per user saved</p><p className="text-white font-semibold text-right">{roi.minutesSavedPerDay ?? 99} min/day</p>
                    <p className="text-gray-400">Emails/day</p><p className="text-white font-semibold text-right">{roi.emailsPerDay ?? 100}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <input type="number" min={1} placeholder="Team size" value={roiUsers} onChange={(e) => setRoiUsers(Number(e.target.value) || 1)} className="input text-xs" />
                <input type="number" min={1} placeholder="Hourly rate $" value={roiRate} onChange={(e) => setRoiRate(Number(e.target.value) || 75)} className="input text-xs" />
              </div>
              <button className="btn-secondary text-xs mt-2" disabled={busy === "roi"} onClick={computeRoi}>
                {busy === "roi" ? "Calculating..." : "Recalculate"}
              </button>
              {(roi.breakdown || []).length > 0 && (
                <ul className="mt-3 space-y-0.5">
                  {(roi.breakdown || []).map((b: string) => <li key={b} className="text-[10px] text-gray-400 truncate">• {b}</li>)}
                </ul>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Activity className="w-4 h-4 text-n0va-400" />Recent focus activity</h2>
            <div className="space-y-1.5">
              {log.length === 0 && <p className="text-xs text-gray-500">No focus activity yet — start a session or compute a friction score.</p>}
              {log.map((e: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700/60 text-gray-300 shrink-0 mt-0.5">{e.category}</span>
                  <p className="text-gray-300 min-w-0 truncate flex-1">{e.detail}</p>
                  <span className="text-[10px] text-gray-500 shrink-0">{new Date(e.at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}