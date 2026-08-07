import { useEffect, useState, useCallback } from "react";
import {
  Sparkles, RefreshCw, Send, Bot, Sun, Lightbulb, Zap, Brain, Activity, MessageSquare, CheckCircle2, ArrowRight,
} from "lucide-react";
import { api } from "../api/client";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);
const me = () => {
  try { const s = JSON.parse(localStorage.getItem("n0va_user") || "{}"); return s?.userId || "user_001"; } catch { return "user_001"; }
};

export default function AniHome() {
  const [dash, setDash] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<any>(null);

  const load = useCallback(async () => {
    const d = unwrap(await api.adsMarketingModule.ani.overview(me()).catch(() => null));
    setDash(d);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const send = useCallback(async () => {
    const text = msg.trim();
    if (!text || busy) return;
    setBusy(true);
    const r = unwrap(await api.adsMarketingModule.ani.chat(text).catch(() => null));
    setReply(r);
    setMsg("");
    setBusy(false);
    load();
  }, [msg, busy, load]);

  const quick = useCallback((text: string) => {
    setMsg("");
    setBusy(true);
    api.adsMarketingModule.ani.chat(text).catch(() => null).then((r) => { setReply(unwrap(r)); setBusy(false); load(); });
  }, [load]);

  const ctx = dash?.context || {};
  const recentRuns = dash?.recentRuns || [];
  const suggestions = dash?.suggestions || [];
  const greetings = ["Good morning, here's the state of everything.", "Here's your workspace at a glance.", "Your ambient brain is on."];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Sparkles className="w-6 h-6 text-n0va-400" /> N0VA ANI</h1>
          <p className="text-gray-500 mt-1 text-sm">Your ambient AI companion across the whole workspace</p>
        </div>
        <button className="btn-secondary p-2" onClick={load} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : !dash ? (
        <div className="card"><p className="text-xs text-gray-500">ANI unavailable.</p></div>
      ) : (
        <>
          <div className="card bg-gradient-to-br from-n0va-900/40 to-transparent">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-n0va-500/15 flex items-center justify-center shrink-0"><Sparkles className="w-5 h-5 text-n0va-300" /></div>
              <div className="flex-1">
                <p className="text-sm text-gray-200">{greetings[Math.floor(Date.now() / 86400000) % greetings.length]}</p>
                <p className="text-xs text-gray-500 mt-1">{dash.summary}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="card !p-4"><p className="text-2xl font-bold text-white">{ctx.inboxCount ?? 0}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Unread email</p></div>
            <div className="card !p-4"><p className="text-2xl font-bold text-n0va-400">{ctx.eventsToday ?? 0}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Events today</p></div>
            <div className="card !p-4"><p className="text-2xl font-bold text-amber-400">{ctx.tasks ?? 0}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Open tasks</p></div>
            <div className="card !p-4"><p className="text-2xl font-bold text-emerald-400">{ctx.activeCampaigns ?? 0}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Active campaigns</p></div>
            <div className="card !p-4"><p className="text-2xl font-bold text-sky-400">${(ctx.totalBudget ?? 0).toLocaleString()}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Tracked spend</p></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 card">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><MessageSquare className="w-4 h-4 text-n0va-400" /> Talk to ANI</h2>
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto pr-1">
                {reply && (
                  <div className="text-xs p-3 rounded-xl bg-n0va-500/10 border border-n0va-500/20">
                    <p className="text-gray-200 whitespace-pre-wrap">{reply.reply}</p>
                    {reply.intent && (
                      <p className="text-[10px] text-n0va-300 mt-2 flex items-center gap-1"><Brain className="w-3 h-3" /> intent: {reply.intent.label} · thread {reply.threadId.slice(-6)}</p>
                    )}
                    {reply.actions?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {(reply.actions || []).map((a: string, i: number) => (
                          <button key={i} className="btn-secondary !py-1 !px-2 text-[10px]" onClick={() => quick(a)}>{a}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {!reply && <p className="text-[11px] text-gray-600">Ask ANI to summarize, triage, schedule, or run an automation...</p>}
              </div>
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder='Try "summarize my morning" or "run campaign pulse"...'
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                />
                <button className="btn-primary" onClick={send} disabled={busy || !msg.trim()}><Send className="w-4 h-4" /></button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <button className="btn-secondary !py-1 !px-2 text-[10px]" onClick={() => quick("summarize my morning")}>Summarize morning</button>
                <button className="btn-secondary !py-1 !px-2 text-[10px]" onClick={() => quick("triage my inbox")}>Triage inbox</button>
                <button className="btn-secondary !py-1 !px-2 text-[10px]" onClick={() => quick("run campaign pulse")}>Campaign pulse</button>
                <button className="btn-secondary !py-1 !px-2 text-[10px]" onClick={() => quick("what's my priority")}>My priority</button>
              </div>
            </div>

            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Lightbulb className="w-4 h-4 text-amber-400" /> Proactive suggestions</h2>
              <div className="space-y-2">
                {suggestions.length === 0 && <p className="text-xs text-gray-500">All caught up.</p>}
                {suggestions.map((s: any) => (
                  <div key={s.suggestionId} className="text-xs p-2.5 rounded-lg bg-gray-800/40 border border-gray-700">
                    <p className="text-gray-300">{s.title}</p>
                    <p className="text-[10px] text-n0va-300 mt-1">{s.action}</p>
                  </div>
                ))}
              </div>
              <h2 className="text-sm font-semibold text-white mb-2 mt-5 flex items-center gap-1.5"><Zap className="w-4 h-4 text-n0va-400" /> Recent runs</h2>
              <div className="space-y-1.5">
                {recentRuns.length === 0 && <p className="text-xs text-gray-500">No automations run yet.</p>}
                {recentRuns.map((r: any) => (
                  <div key={r._id} className="flex items-center gap-2 text-[11px] p-2 rounded-lg bg-gray-800/40">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-gray-300 truncate flex-1">{r.name}</span>
                    <span className="text-gray-500">{r.steps?.length ?? 0} steps</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Activity className="w-4 h-4" /> ANI capabilities</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(dash.modules || []).map((m: string) => (
                <div key={m} className="flex items-center gap-1.5 text-[11px] p-2 rounded-lg bg-gray-800/40">
                  <Sun className="w-3 h-3 text-n0va-400" />
                  <span className="text-gray-300 capitalize">{m.replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-500 mt-3 flex items-center gap-1"><ArrowRight className="w-3 h-3" /> ANI remembers across modules — memory, briefings and automations live in the tabs above.</p>
          </div>
        </>
      )}
    </div>
  );
}