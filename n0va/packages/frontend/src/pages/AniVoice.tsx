import { useEffect, useState, useCallback } from "react";
import { Mic, RefreshCw, Play, History, Terminal, Sparkles } from "lucide-react";
import { api } from "../api/client";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

export default function AniVoice() {
  const [dash, setDash] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cmd, setCmd] = useState("");
  const [lastRun, setLastRun] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const c = unwrap(await api.adsMarketingModule.ani.voice().catch(() => null));
    const l = unwrap(await api.adsMarketingModule.ani.voiceLog().catch(() => null));
    setDash({ ...(c || {}), log: l });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const execute = useCallback(async (text?: string) => {
    const phrase = (text ?? cmd).trim();
    if (!phrase || busy) return;
    setBusy(true);
    const r = unwrap(await api.adsMarketingModule.ani.executeVoice(phrase).catch(() => null));
    setLastRun(r);
    setCmd("");
    setBusy(false);
    load();
  }, [cmd, busy, load]);

  const commands = dash?.commands || [];
  const log = dash?.log?.history || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Mic className="w-6 h-6 text-n0va-400" /> ANI Voice</h1>
          <p className="text-gray-500 mt-1 text-sm">Voice-first command layer for the entire suite</p>
        </div>
        <button className="btn-secondary p-2" onClick={load} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <>
          <div className="card bg-gradient-to-br from-n0va-900/40 to-transparent">
            <div className="flex gap-2 mb-2 items-center">
              <Terminal className="w-4 h-4 text-n0va-400" />
              <h2 className="text-sm font-semibold text-white">Command line</h2>
            </div>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder='Try "schedule a meeting", "triage my inbox", "run campaign pulse"...'
                value={cmd}
                onChange={(e) => setCmd(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && execute()}
              />
              <button className="btn-primary" onClick={() => execute()} disabled={busy || !cmd.trim()}><Play className="w-4 h-4" /></button>
            </div>
            {lastRun && (
              <div className="mt-3 p-3 rounded-xl bg-n0va-500/10 border border-n0va-500/20 text-xs">
                <p className="text-gray-200 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-n0va-300" /> {lastRun.reply}</p>
                <p className="text-[10px] text-n0va-300 mt-1.5">intent: {lastRun.intent?.label} · {lastRun.summary}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-n0va-400" /> Voice command catalog</h2>
              <div className="space-y-1.5">
                {commands.map((c: any) => (
                  <button key={c.command} className="w-full flex items-center gap-2 text-xs p-2.5 rounded-lg bg-gray-800/40 hover:bg-gray-800 transition-colors text-left" onClick={() => execute(c.command)}>
                    <Play className="w-3 h-3 text-n0va-400 shrink-0" />
                    <span className="text-gray-200 truncate flex-1">{c.command}</span>
                    <span className="text-[10px] text-gray-500 capitalize">{c.intent}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><History className="w-4 h-4 text-n0va-400" /> Command history</h2>
              <div className="space-y-1.5">
                {log.length === 0 && <p className="text-xs text-gray-500">No voice commands yet.</p>}
                {log.map((h: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-lg bg-gray-800/40">
                    <span className="text-gray-500 shrink-0">{(h.at || "").slice(5, 16).replace("T", " ")}</span>
                    <span className="text-gray-200 truncate">{h.text}</span>
                    <span className="text-n0va-300 ml-auto shrink-0">{h.intent}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}