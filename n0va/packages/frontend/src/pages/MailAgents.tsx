import { useEffect, useState, useCallback } from "react";
import {
  Bot, RefreshCw, AlertTriangle, Plus, Search, CheckCircle2, XCircle, Play, Pause, Activity, Wrench, ShieldCheck, Eye, Briefcase, FileText,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const AUTONOMY_COLOR: Record<string, string> = {
  "read-only": "bg-gray-500/15 text-gray-400 border-gray-500/30",
  low: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  high: "bg-violet-500/15 text-violet-400 border-violet-500/30",
};

const PERSONA_ICON: Record<string, any> = {
  mail_concierge: Wrench, reply_assistant: FileText, meeting_agent: Briefcase, task_extractor: CheckCircle2,
  crm_sync: Activity, compliance_agent: ShieldCheck, threat_hunter: Eye, executive_brief: FileText,
  cross_module: Bot, custom: Bot,
};

export default function MailAgents() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [personas, setPersonas] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [hitl, setHitl] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState<{ agentName: string; agentType: string; description: string; maxDailyActions: string }>({
    agentName: "", agentType: "mail_concierge", description: "", maxDailyActions: "50",
  });
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discover, setDiscover] = useState<any>(null);

  const load = useCallback(async () => {
    const [d, p, a, s, h, al] = await Promise.all([
      api.adsMarketingModule.mailAgentDashboard().catch(() => null),
      api.adsMarketingModule.mailAgentPersonas().catch(() => null),
      api.adsMarketingModule.mailAgentList().catch(() => null),
      api.adsMarketingModule.mailAgentSessions().catch(() => null),
      api.adsMarketingModule.mailAgentHitlQueue().catch(() => null),
      api.adsMarketingModule.mailAgentAuditLog().catch(() => null),
    ]);
    setDash(unwrap(d));
    setPersonas(Array.isArray(p) ? p : unwrap(p)?.personas || []);
    setAgents(Array.isArray(a) ? a : unwrap(a) || []);
    setSessions(Array.isArray(s) ? s : unwrap(s)?.sessions || []);
    setHitl(Array.isArray(h) ? h : unwrap(h)?.queue || []);
    setAudit(Array.isArray(al) ? al : unwrap(al)?.entries || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    function refresh() { load(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [load]);

  async function registerAgent() {
    setBusy("register");
    const r = unwrap(await api.adsMarketingModule.mailAgentRegister({
      agentName: form.agentName, agentType: form.agentType, description: form.description,
      maxDailyActions: Number(form.maxDailyActions) || 50,
    }).catch(() => null));
    if (r?.agentId) {
      addToast("success", r.summary);
      setShowRegister(false);
      setForm({ agentName: "", agentType: "mail_concierge", description: "", maxDailyActions: "50" });
      load();
    } else {
      addToast("error", "Failed to register agent — name and type required");
    }
    setBusy(null);
  }

  async function toggleAgent(agent: any) {
    setBusy(agent.agentId + "t");
    const r = unwrap(await api.adsMarketingModule.mailAgentUpdate(agent.agentId, { active: agent.status !== "active" }).catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setBusy(null);
    load();
  }

  async function runTool(agent: any) {
    setBusy(agent.agentId + "a");
    const r = unwrap(await api.adsMarketingModule.mailAgentAction(agent.agentId, "mail.read.search", { query: "round 24" }).catch(() => null));
    if (r?.summary) addToast(r.approved ? "success" : "warning", r.summary);
    setBusy(null);
    load();
  }

  async function resolveHitl(item: any, decision: string) {
    setBusy(item.hitlId + decision);
    const r = unwrap(await api.adsMarketingModule.mailAgentResolveHitl(item.hitlId, decision).catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setBusy(null);
    load();
  }

  async function runDiscover() {
    const r = unwrap(await api.adsMarketingModule.mailAgentDiscover(discoverQuery).catch(() => null));
    setDiscover(r);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Bot className="w-6 h-6 text-n0va-400" /> Mail Agents</h1>
          <p className="text-gray-500 mt-1 text-sm">N0VA1O agent framework — personas, tools, sessions &amp; human-in-the-loop (spec §11)</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn-secondary p-2" onClick={load} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary text-xs" onClick={() => setShowRegister(true)}><Plus className="w-3.5 h-3.5" /> Register agent</button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : !dash ? (
        <div className="card border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-sm text-red-300 font-medium">Agent framework unavailable</p>
              <p className="text-xs text-red-400/70">Check that the backend is running.</p>
            </div>
            <button className="btn-secondary text-xs ml-auto" onClick={load}>Retry</button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{dash.agents || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Agents</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-emerald-400">{dash.active || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Active</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{dash.sessions || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Sessions</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{dash.actionsToday || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Actions today</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-amber-400">{dash.pendingApprovals || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Pending approvals</p>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Eye className="w-4 h-4 text-violet-400" /> Tool discovery</h2>
              <span className="text-[10px] text-gray-500">Intent-based tool lookup</span>
            </div>
            <div className="flex gap-2">
              <input className="input flex-1 text-sm" placeholder='e.g. "send reply", "create event", "scan threats"'
                value={discoverQuery} onChange={(e) => setDiscoverQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && discover()} />
              <button className="btn-secondary text-xs px-3" onClick={runDiscover}><Search className="w-3.5 h-3.5" /> Find tools</button>
            </div>
            {discover && (
              <div className="mt-3">
                <p className="text-[11px] text-gray-400 mb-2">{discover.summary}{discover.suggestedWorkflow?.length > 1 ? ` · Workflow: ${discover.suggestedWorkflow.join(" → ")}` : ""}</p>
                <div className="flex flex-wrap gap-2">
                  {discover.tools.map((t: any) => (
                    <span key={t.name} className="text-[10px] font-mono px-2 py-1 rounded border border-gray-700 bg-gray-800/40 text-gray-300">
                      {t.name} {t.approval && <span className="text-amber-400">· approval</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-3">Personas ({personas.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {personas.map((p: any) => {
                const Icon = PERSONA_ICON[p.type] || Bot;
                return (
                  <div key={p.type} className="border border-gray-700/60 rounded-lg p-3 bg-gray-800/30 hover:border-n0va-500/40 transition">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-n0va-400 shrink-0" />
                      <p className="text-[11px] font-semibold text-white truncate">{p.name}</p>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 leading-snug line-clamp-2">{p.description}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${AUTONOMY_COLOR[p.autonomy] || AUTONOMY_COLOR.low}`}>{p.autonomy}</span>
                      <span className="text-[9px] text-gray-500 ml-auto">{p.registered || 0} registered</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Activity className="w-4 h-4 text-sky-400" /> Registered agents ({agents.length})</h2>
              {agents.length === 0 && (
                <div className="card border-dashed border-gray-700 text-center py-6">
                  <p className="text-sm text-gray-500">No agents registered yet.</p>
                </div>
              )}
              {agents.map((a: any) => (
                <div key={a.agentId} className="card !p-4">
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{a.agentName} <span className="text-[10px] text-gray-500 font-normal">({a.persona})</span></p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {a.autonomy} autonomy · {a.actionsToday}/{a.maxDailyActions} actions today · {a.webhookUrl ? "webhook" : "no webhook"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button className="btn-secondary p-1.5" onClick={() => runTool(a)} title="Run read.search" disabled={busy === a.agentId + "a"}>
                        <Play className="w-3.5 h-3.5 text-emerald-400" />
                      </button>
                      <button className="btn-secondary p-1.5" onClick={() => toggleAgent(a)} title={a.status === "active" ? "Disable" : "Enable"}>
                        {a.status === "active" ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>
                    </div>
                  </div>
                  <span className={`inline-block mt-2 text-[9px] font-semibold px-1.5 py-0.5 rounded border ${a.status === "active" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-gray-600/15 text-gray-400 border-gray-600/30"}`}>
                    {a.status}
                  </span>
                </div>
              ))}
              <h2 className="text-sm font-semibold text-white flex items-center gap-2 mt-4"><Briefcase className="w-4 h-4 text-fuchsia-400" /> Sessions ({sessions.length})</h2>
              {sessions.slice(0, 5).map((s: any) => (
                <div key={s.sessionId} className="card !p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${s.status === "active" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-gray-600/15 text-gray-400 border-gray-600/30"}`}>{s.status}</span>
                    <p className="text-[11px] text-gray-300 truncate">{s.agentName}</p>
                    <span className="text-[10px] text-gray-500 ml-auto">{s.actions} action(s)</span>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1">{s.context}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-amber-400" /> Interrogation room ({hitl.filter((h: any) => h.status === "pending_review").length} pending)</h2>
              {hitl.length === 0 && (
                <div className="card border-dashed border-gray-700 text-center py-6">
                  <p className="text-sm text-gray-500">No actions awaiting review.</p>
                </div>
              )}
              {hitl.map((h: any) => (
                <div key={h.hitlId} className="card !p-4 border-amber-500/20">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${h.status === "pending_review" ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-gray-600/15 text-gray-400 border-gray-600/30"}`}>{h.status}</span>
                    <p className="text-[11px] font-mono text-n0va-300 truncate">{h.tool}</p>
                    <span className="text-[10px] text-gray-500 ml-auto">risk {h.riskScore}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1.5">{h.agentName} · {h.toolAction}{h.params !== "{}" ? ` · ${h.params.slice(0, 60)}` : ""}</p>
                  {h.status === "pending_review" && (
                    <div className="flex gap-2 mt-2">
                      <button className="btn-primary text-[10px] !py-1" onClick={() => resolveHitl(h, "approve")} disabled={busy === h.hitlId + "approve"}>
                        <CheckCircle2 className="w-3 h-3" /> Approve
                      </button>
                      <button className="btn-secondary text-[10px] !py-1" onClick={() => resolveHitl(h, "reject")} disabled={busy === h.hitlId + "reject"}>
                        <XCircle className="w-3 h-3 text-red-400" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <h2 className="text-sm font-semibold text-white flex items-center gap-2 mt-4"><Activity className="w-4 h-4 text-emerald-400" /> Audit trail ({audit.length})</h2>
              {audit.slice(0, 8).map((e: any, i: number) => (
                <div key={i} className="card !p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${e.status === "ok" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : e.status === "pending_approval" ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-red-500/15 text-red-400 border-red-500/30"}`}>{e.status}</span>
                    <p className="text-[11px] font-mono text-gray-300 truncate">{e.tool}</p>
                    <span className="text-[10px] text-gray-600 ml-auto">{e.latencyMs}ms · risk {e.riskScore}</span>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1 truncate">{e.agentName} — {e.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {showRegister && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={() => setShowRegister(false)}>
          <div className="card w-full max-w-md !p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-white mb-3">Register an agent</h3>
            <label className="block text-[11px] text-gray-400 mb-1">Agent name</label>
            <input className="input mb-3" placeholder="Concierge One" value={form.agentName} onChange={(e) => setForm({ ...form, agentName: e.target.value })} />
            <label className="block text-[11px] text-gray-400 mb-1">Persona</label>
            <select className="input mb-3" value={form.agentType} onChange={(e) => setForm({ ...form, agentType: e.target.value })}>
              {personas.map((p: any) => <option key={p.type} value={p.type}>{p.name} — {p.autonomy}</option>)}
            </select>
            <label className="block text-[11px] text-gray-400 mb-1">Description</label>
            <input className="input mb-3" placeholder="What this agent does" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <label className="block text-[11px] text-gray-400 mb-1">Max daily actions</label>
            <input className="input mb-4" type="number" min={1} value={form.maxDailyActions} onChange={(e) => setForm({ ...form, maxDailyActions: e.target.value })} />
            <div className="flex gap-2 justify-end">
              <button className="btn-secondary text-xs" onClick={() => setShowRegister(false)}>Cancel</button>
              <button className="btn-primary text-xs" onClick={registerAgent} disabled={busy === "register" || !form.agentName.trim()}>
                {busy === "register" ? "Registering…" : "Register"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
