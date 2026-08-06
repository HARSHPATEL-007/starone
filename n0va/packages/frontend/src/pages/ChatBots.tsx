import { useEffect, useState, useCallback } from "react";
import {
  Bot as BotIcon, RefreshCw, Plus, Trash2, Power, Terminal, Activity, Sparkles, AlertTriangle, Zap,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

export default function ChatBots() {
  const { addToast } = useToast();
  const [bots, setBots] = useState<any[]>([]);
  const [commands, setCommands] = useState<any[]>([]);
  const [dash, setDash] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [dispatchRoom, setDispatchRoom] = useState("general");
  const [dispatchRaw, setDispatchRaw] = useState("/help");

  const load = useCallback(async () => {
    const [b, c, d] = await Promise.all([
      api.adsMarketingModule.chat.bots().catch(() => null),
      api.adsMarketingModule.chat.botCommands().catch(() => null),
      api.adsMarketingModule.chat.botsDashboard().catch(() => null),
    ]);
    setBots(unwrap(b)?.bots || []);
    setCommands(unwrap(c)?.commands || []);
    setDash(unwrap(d));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(kind: string, fn: () => Promise<any>) {
    setBusy(kind);
    const r = unwrap(await fn().catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setBusy(null);
    load();
  }

  async function createBot() {
    if (!name.trim()) return;
    await act("create", () => api.adsMarketingModule.chat.createBot({ name: name.trim(), permissions: { scopes: ["chat:read", "chat:write"] } }));
    setName("");
    setShowCreate(false);
  }

  async function dispatch() {
    setBusy("dispatch");
    const r = unwrap(await api.adsMarketingModule.chat.dispatchCommand({ roomId: dispatchRoom, userId: "user_001", raw: dispatchRaw }).catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setBusy(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><BotIcon className="w-6 h-6 text-n0va-400" /> Chat Bots</h1>
          <p className="text-gray-500 mt-1 text-sm">Bots, slash commands, triggers and AI personas for every channel</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary p-2" onClick={load} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary text-sm" onClick={() => setShowCreate((v) => !v)}><Plus className="w-4 h-4 inline mr-1" />New bot</button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card !p-4"><p className="text-2xl font-bold text-white">{dash?.total ?? bots.length}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Bots</p></div>
            <div className="card !p-4"><p className="text-2xl font-bold text-emerald-400">{dash?.enabled ?? bots.filter((b) => b.enabled).length}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Enabled</p></div>
            <div className="card !p-4"><p className="text-2xl font-bold text-sky-400">{dash?.runs ?? 0}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Total runs</p></div>
            <div className="card !p-4"><p className="text-2xl font-bold text-n0va-400">{commands.length}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Slash commands</p></div>
          </div>

          {showCreate && (
            <div className="card">
              <div className="flex flex-col sm:flex-row gap-2 items-end">
                <input className="input flex-1" placeholder="Bot name (e.g. Release Bot)" value={name} onChange={(e) => setName(e.target.value)} />
                <button className="btn-primary" disabled={!name.trim()} onClick={createBot}>Create</button>
              </div>
            </div>
          )}

          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Terminal className="w-4 h-4 text-n0va-400" /> Command console</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <input className="input sm:flex-none sm:!w-44 text-xs font-mono" value={dispatchRoom} onChange={(e) => setDispatchRoom(e.target.value)} placeholder="room id" />
              <input className="input flex-1 font-mono text-xs" value={dispatchRaw} onChange={(e) => setDispatchRaw(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") dispatch(); }} />
              <button className="btn-primary text-xs" disabled={busy === "dispatch" || !dispatchRaw.trim()} onClick={dispatch}>
                <Zap className="w-3.5 h-3.5 inline mr-1" />Run
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {commands.map((c: any) => (
                <button key={c.command} className="text-[11px] px-2 py-1 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-n0va-500/50 font-mono text-gray-300" onClick={() => setDispatchRaw(c.command)}>
                  {c.command}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {bots.map((b: any) => (
              <div key={b.botId} className="card">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-n0va-900/60 border border-n0va-700/40 flex items-center justify-center shrink-0">
                    <BotIcon className="w-6 h-6 text-n0va-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-white">{b.name}</p>
                      {b.is_seed && <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-700/60 text-gray-400 uppercase">seed</span>}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase ${b.enabled ? "bg-emerald-900/60 text-emerald-300 border border-emerald-700/40" : "bg-gray-700/60 text-gray-400"}`}>{b.enabled ? "enabled" : "disabled"}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">{(b.permissions?.scopes || []).join(", ") || "no scopes"}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(b.triggers || []).map((t: any) => (
                        <span key={t.trigger_id} className="text-[10px] px-1.5 py-0.5 rounded bg-sky-900/40 text-sky-300 border border-sky-700/30">{t.type}</span>
                      ))}
                      {(b.triggers || []).length === 0 && <span className="text-[10px] text-gray-600">no triggers</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button className="btn-secondary p-1.5" title={b.enabled ? "Disable" : "Enable"} disabled={busy === `toggle-${b.botId}`} onClick={() => act(`toggle-${b.botId}`, () => api.adsMarketingModule.chat.toggleBot(b.botId, !b.enabled))}>
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    {!b.is_seed && (
                      <button className="btn-secondary p-1.5 text-red-400 hover:bg-red-500/10" title="Delete" onClick={() => act(`del-${b.botId}`, () => api.adsMarketingModule.chat.deleteBot(b.botId))}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Activity className="w-4 h-4 text-n0va-400" /> Recent bot runs</h2>
            <div className="space-y-1.5">
              {(dash?.recentRuns || []).length === 0 && <p className="text-xs text-gray-500">No runs yet — try the command console above.</p>}
              {(dash?.recentRuns || []).map((r: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700/60 text-gray-300 shrink-0">{r.trigger}</span>
                  <span className="text-gray-300 truncate flex-1">{r.botId}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${r.status === "success" ? "bg-emerald-900/60 text-emerald-300" : "bg-amber-900/60 text-amber-300"}`}>{r.status}</span>
                  <span className="text-[10px] text-gray-500">{new Date(r.executed_at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
