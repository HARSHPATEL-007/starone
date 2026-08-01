import { useEffect, useState, useCallback } from "react";
import {
  BrainCircuit, RefreshCw, Clock3, Activity, HeartPulse, BellRing, CalendarClock, Target, TrendingDown, Zap,
} from "lucide-react";
import { api } from "../api/client";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const riskColor: Record<string, string> = {
  low: "bg-emerald-500/15 text-emerald-400",
  medium: "bg-amber-500/15 text-amber-400",
  high: "bg-red-500/15 text-red-400",
};

export default function MailPredict() {
  const [dash, setDash] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [intent, setIntent] = useState<any>(null);
  const [contact, setContact] = useState("");
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    const [d, m] = await Promise.all([
      api.adsMarketingModule.mailPredictiveDashboard().catch(() => null),
      api.adsMarketingModule.mailMessages({ folder: "inbox", limit: 50 }).catch(() => null),
    ]);
    setDash(unwrap(d));
    const msgs = unwrap(m);
    setMessages(Array.isArray(msgs) ? msgs : msgs?.messages || msgs?.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    function refresh() { loadAll(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadAll]);

  async function analyze(msg: any) {
    setSelected(msg);
    const [o, i] = await Promise.all([
      api.adsMarketingModule.mailOutcomePrediction(msg._id).catch(() => null),
      api.adsMarketingModule.mailIntentPrediction(msg._id).catch(() => null),
    ]);
    setPrediction(unwrap(o));
    setIntent(unwrap(i));
  }

  async function checkHealth() {
    if (!contact.trim()) return;
    const h = unwrap(await api.adsMarketingModule.mailRelationshipHealth(contact.trim()));
    setHealth(h);
  }

  const churnRisks = dash?.churnRisks || [];
  const nudges = dash?.nudges || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><BrainCircuit className="w-6 h-6 text-n0va-400" /> Predictive intelligence</h1>
          <p className="text-gray-500 mt-1 text-sm">{dash?.summary || "AI forecasts: response times, outcomes, churn and send timing"}</p>
        </div>
        <button className="btn-secondary p-2" onClick={loadAll} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card p-4">
              <p className="text-2xl font-bold text-white flex items-center gap-2"><Clock3 className="w-5 h-5 text-n0va-400" />{dash?.sendTime?.label || "9am"}</p>
              <p className="text-xs text-gray-500 mt-1">Optimal send time</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{dash?.workload?.projectedMessages || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Inbox forecast / 7d</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{churnRisks.length}</p>
              <p className="text-xs text-gray-500 mt-1">At-risk threads</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{dash?.nudgeCount || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Nudges suggested</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><CalendarClock className="w-4 h-4 text-n0va-400" /> Send timing</h3>
              <p className="text-xs text-gray-400">{dash?.sendTime?.reason}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] px-2 py-1 rounded-full bg-n0va-500/15 text-n0va-300">Next best: {dash?.sendTime?.nextBest?.label}</span>
                <span className="text-[10px] px-2 py-1 rounded-full bg-gray-500/10 text-gray-400">Peak hour: {dash?.workload?.peakHour}:00</span>
              </div>
              {dash?.sendTime?.tip && <p className="text-xs text-emerald-400 flex items-start gap-1.5"><Zap className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {dash.sendTime.tip}</p>}
            </div>

            <div className="card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Activity className="w-4 h-4 text-n0va-400" /> Workload forecast</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500">Busy score</span>
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-n0va-500 rounded-full" style={{ width: `${dash?.workload?.busyScore || 0}%` }} />
                </div>
                <span className="text-xs text-white font-semibold">{dash?.workload?.busyScore || 0}/100</span>
              </div>
              <p className="text-xs text-gray-400">~{dash?.workload?.dailyRate || 0} incoming/day · {dash?.workload?.projectedHighPriority || 0} high priority over {dash?.workload?.days || 7} days.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4 space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><TrendingDown className="w-4 h-4 text-n0va-400" /> Churn risks</h3>
              {churnRisks.map((r: any, i: number) => (
                <div key={i} className="border border-gray-800 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${riskColor[r.risk] || "bg-gray-500/10 text-gray-400"}`}>{r.risk}</span>
                    <span className="text-sm text-white truncate">{r.subject}</span>
                    <span className="text-[10px] text-gray-500 ml-auto">{r.lastActivityDays}d</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{r.reason}</p>
                  <p className="text-xs text-n0va-300 mt-1">{r.recommendedAction}</p>
                </div>
              ))}
              {churnRisks.length === 0 && <p className="text-xs text-gray-600">No at-risk threads — relationships look healthy.</p>}
            </div>

            <div className="card p-4 space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><BellRing className="w-4 h-4 text-n0va-400" /> Nudge suggestions</h3>
              {nudges.map((n: any, i: number) => (
                <div key={i} className="border border-gray-800 rounded-lg p-3 flex items-center gap-2">
                  <span className="text-xs text-gray-400 truncate flex-1">{n.subject}</span>
                  <span className="text-[10px] text-gray-600">{n.ageDays}d</span>
                  <span className="text-[10px] text-amber-400">{n.suggestedAction}</span>
                </div>
              ))}
              {nudges.length === 0 && <p className="text-xs text-gray-600">Nothing to nudge right now.</p>}
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Target className="w-4 h-4 text-n0va-400" /> Message analyzer</h3>
            <select className="select" value={selected?._id || ""} onChange={(e) => {
              const msg = messages.find((m: any) => m._id === e.target.value);
              if (msg) analyze(msg);
            }}>
              <option value="">Pick a message to predict outcome & intent…</option>
              {messages.map((m: any) => <option key={m._id} value={m._id}>{m.subject}</option>)}
            </select>

            {prediction && intent && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-gray-800/50 border border-gray-800 rounded-xl p-4 space-y-2">
                  <p className="text-xs text-gray-500 uppercase font-bold">Outcome</p>
                  <p className="text-lg font-bold text-white">{prediction.probability}%</p>
                  <p className="text-xs text-gray-400">{prediction.likelyOutcome}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-n0va-500/15 text-n0va-300">{prediction.intentLabel}</span>
                  </div>
                  <p className="text-xs text-emerald-400"><Zap className="w-3 h-3 inline mr-1" />{prediction.suggestedAction}</p>
                </div>
                <div className="bg-gray-800/50 border border-gray-800 rounded-xl p-4 space-y-1.5">
                  <p className="text-xs text-gray-500 uppercase font-bold">Intent matrix</p>
                  {intent.predictions.slice(0, 4).map((p: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="text-gray-400 w-32 truncate">{p.label}</span>
                      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${i === 0 ? "bg-n0va-500" : "bg-gray-600"}`} style={{ width: `${Math.min(100, p.confidence)}%` }} />
                      </div>
                      <span className="text-gray-500 w-8 text-right">{p.confidence}</span>
                    </div>
                  ))}
                  <p className="text-xs text-n0va-300 pt-1">Top: {intent.topLabel} ({intent.confidence}%)</p>
                </div>
              </div>
            )}
          </div>

          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><HeartPulse className="w-4 h-4 text-n0va-400" /> Relationship health</h3>
            <div className="flex gap-2 flex-wrap">
              <input className="input flex-1 min-w-[200px]" placeholder="Contact email, e.g. john@partner.com" value={contact} onChange={(e) => setContact(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") checkHealth(); }} />
              <button className="btn-primary" onClick={checkHealth}>Analyze</button>
            </div>
            {health && (
              <div className="bg-gray-800/50 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-3xl font-bold text-white">{health.healthScore}</span>
                  <div>
                    <p className="text-sm text-white">{health.contact?.name} <span className="text-gray-500">({health.contact?.email})</span></p>
                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${health.level === "strong" ? "bg-emerald-500/15 text-emerald-400" : health.level === "healthy" ? "bg-n0va-500/15 text-n0va-300" : health.level === "cooling" ? "bg-amber-500/15 text-amber-400" : "bg-red-500/15 text-red-400"}`}>{health.level}</span>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-[10px] text-gray-500">{health.messagesExchanged} message(s) · {health.lastInteractionDays ?? "—"}d ago</p>
                  </div>
                </div>
                <ul className="mt-2 space-y-0.5">
                  {health.factors.map((f: string, i: number) => <li key={i} className="text-xs text-gray-500">· {f}</li>)}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
