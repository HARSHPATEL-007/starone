import { useEffect, useState, useCallback } from "react";
import { Zap, RefreshCw, Play, Plug, Power, Sun, Inbox, MessageSquare, Calendar, TrendingUp, PieChart as ChartPie, History, CheckCircle2 } from "lucide-react";
import { api } from "../api/client";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const ICONS: Record<string, any> = { sunrise: Sun, inbox: Inbox, chat: MessageSquare, calendar: Calendar, trending: TrendingUp, chart: ChartPie };

export default function AniAutomations() {
  const [dash, setDash] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const d = unwrap(await api.adsMarketingModule.ani.automations().catch(() => null));
    const r = unwrap(await api.adsMarketingModule.ani.automationRuns().catch(() => null));
    setDash({ ...(d || {}), runs: r });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const install = useCallback(async (templateId: string, automationId?: string, enabled?: boolean) => {
    setBusy(templateId);
    if (!automationId) await api.adsMarketingModule.ani.createAutomation({ templateId }).catch(() => null);
    else await api.adsMarketingModule.ani.toggleAutomation(automationId, !enabled).catch(() => null);
    setBusy(null);
    load();
  }, [load]);

  const run = useCallback(async (automationId?: string, templateId?: string) => {
    setBusy(templateId || automationId || "");
    await api.adsMarketingModule.ani.runAutomation(automationId || "", {}).catch(() => null);
    setBusy(null);
    load();
  }, [load]);

  const automations = dash?.automations || [];
  const runs = dash?.runs?.runs || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Zap className="w-6 h-6 text-n0va-400" /> ANI Automations</h1>
          <p className="text-gray-500 mt-1 text-sm">One-tap multi-step automations across the whole suite</p>
        </div>
        <button className="btn-secondary p-2" onClick={load} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {automations.map((a: any) => {
              const Icon = ICONS[a.icon] || Zap;
              return (
                <div key={a.id} className="card">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-n0va-500/15 flex items-center justify-center"><Icon className="w-4 h-4 text-n0va-300" /></div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{a.name}</p>
                      <p className="text-[10px] text-gray-500">{a.module}</p>
                    </div>
                    {a.enabled && <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">active</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-3 min-h-[32px]">{a.description}</p>
                  <div className="flex items-center gap-2 mt-3">
                    {a.installed ? (
                      <>
                        <button className={`btn-secondary flex-1 !py-1.5 text-xs ${busy === a.id ? "opacity-50" : ""}`} onClick={() => run(a.automationId, a.id)} disabled={!!busy}>
                          <Play className="w-3 h-3" /> Run
                        </button>
                        <button className="btn-secondary !p-2" onClick={() => install(a.id, a.automationId, a.enabled)} title={a.enabled ? "Disable" : "Enable"}>
                          <Power className={`w-3.5 h-3.5 ${a.enabled ? "text-emerald-400" : "text-gray-500"}`} />
                        </button>
                      </>
                    ) : (
                      <button className="btn-primary flex-1 !py-1.5 text-xs" onClick={() => install(a.id)} disabled={!!busy}>
                        <Plug className="w-3 h-3" /> Install
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><History className="w-4 h-4 text-n0va-400" /> Run history</h2>
            <div className="space-y-1.5">
              {runs.length === 0 && <p className="text-xs text-gray-500">No runs yet.</p>}
              {runs.map((r: any) => (
                <div key={r._id} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-gray-800/40">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-gray-200 truncate flex-1">{r.name}</span>
                  <span className="text-gray-500">{r.steps?.length ?? 0} steps</span>
                  <span className="text-gray-500">{(r.ranAt || "").slice(0, 16).replace("T", " ")}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}