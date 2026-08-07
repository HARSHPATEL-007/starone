import { useEffect, useState, useCallback } from "react";
import { Sun, RefreshCw, CalendarDays, ChevronRight, FileText, CheckCircle } from "lucide-react";
import { api } from "../api/client";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

export default function AniBriefings() {
  const [dash, setDash] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const d = unwrap(await api.adsMarketingModule.ani.briefings().catch(() => null));
    setDash(d);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const generate = useCallback(async (type: string) => {
    setBusy(true);
    await api.adsMarketingModule.ani.generateBriefing(type).catch(() => null);
    setBusy(false);
    load();
  }, [load]);

  const briefings = dash?.briefings || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Sun className="w-6 h-6 text-n0va-400" /> ANI Briefings</h1>
          <p className="text-gray-500 mt-1 text-sm">Daily, weekly and executive briefings generated from cross-module signals</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => generate("daily")} disabled={busy}>Generate daily</button>
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => generate("weekly")} disabled={busy}>Generate weekly</button>
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => generate("executive")} disabled={busy}>Executive</button>
          <button className="btn-secondary p-2" onClick={load} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {briefings.length === 0 && <div className="card lg:col-span-2"><p className="text-xs text-gray-500">No briefings yet — generate one to get a cross-module pulse.</p></div>}
          {briefings.map((b: any) => {
            const active = open === b._id;
            return (
              <div key={b._id} className="card">
                <button className="w-full flex items-start justify-between gap-2 text-left" onClick={() => setOpen(active ? null : b._id)}>
                  <div>
                    <p className="text-sm font-semibold text-white flex items-center gap-1.5"><FileText className="w-4 h-4 text-n0va-400" /> {b.title}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {b.date} · {b.type}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${active ? "rotate-90" : ""}`} />
                </button>
                {active && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <p className="text-xs text-gray-300 leading-relaxed">{b.body}</p>
                    <p className="text-[10px] text-gray-500 mt-2">Signals: {JSON.stringify(b.signals || {})}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(b.actions || []).map((a: string, i: number) => (
                        <span key={i} className="text-[10px] px-2 py-1 rounded-full bg-n0va-500/10 border border-n0va-500/20 text-n0va-300 flex items-center gap-1">
                          <CheckCircle className="w-2.5 h-2.5" />{a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}