import React, { useEffect, useRef, useState } from "react";
import {
  Shield, ShieldCheck, ShieldAlert, Activity, Scale, CheckCircle2, XCircle,
  Clock, Zap, FileSearch, GitBranch, KeyRound, PlayCircle, Trash2, Lock,
  Eye, Ban, UserCheck, Plus, RefreshCw, ChevronDown, Layers, Cpu,
} from "lucide-react";
import { api } from "../api/client";

const unwrap = (r: any) => r?.data ?? r;

function SkeletonCard({ h = 28 }: { h?: number }) {
  return <div className="animate-pulse rounded-xl bg-gray-800/60 p-4"><div style={{ height: h }} className="rounded-md bg-gray-700/60" /></div>;
}

const HITL_STYLE: Record<string, string> = {
  critical: "bg-red-500/15 text-red-300 border-red-500/30",
  high: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  medium: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  low: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};
const VERDICT_STYLE: Record<string, string> = {
  pass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  warn: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  allowed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  denied: "bg-red-500/15 text-red-300 border-red-500/30",
  approval_required: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-300 border-red-500/30",
  auto_executed: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  escalated: "bg-orange-500/15 text-orange-300 border-orange-500/30",
};

export default function N0VA1OGovernance() {
  const { addToast } = (window as any).useToast ? (window as any).useToast() : { addToast: () => {} };
  const toastRef = useRef<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [auto, setAuto] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [dash, setDash] = useState<any>(null);
  const [routing, setRouting] = useState<any>(null);
  const [policies, setPolicies] = useState<any>(null);
  const [access, setAccess] = useState<any>(null);
  const [modifiers, setModifiers] = useState<any>(null);
  const [hitl, setHitl] = useState<any>(null);
  const [audit, setAudit] = useState<any>(null);
  const [modCatalog, setModCatalog] = useState<any>(null);
  const [zt, setZt] = useState<any>(null);
  const [auditLog, setAuditLog] = useState<any>(null);
  const [routingLog, setRoutingLog] = useState<any>(null);

  const [showModifier, setShowModifier] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [showEval, setShowEval] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [evalRes, setEvalRes] = useState<any>(null);
  const [auditRes, setAuditRes] = useState<any>(null);
  const [showRoom, setShowRoom] = useState<any>(null);

  const [mForm, setMForm] = useState({ type: "schema", name: "", toolPattern: "", transform: "" });
  const [pForm, setPForm] = useState({ teamId: "", endpoint: "", whitelist: "", blacklist: "", approvalRequired: "", ssoRequired: false });
  const [evalForm, setEvalForm] = useState({ toolId: "", teamId: "", riskLevel: "low", action: "", reasoning: "" });
  const [aForm, setAForm] = useState({ action: "", toolId: "", actor: "admin", details: "" });

  const addToastFn = () => {
    if (!toastRef.current && (window as any).__n0vaToast) toastRef.current = (window as any).__n0vaToast;
  };
  const toast = (t: string, type: "success" | "error" | "info" = "success") => {
    addToastFn();
    if (toastRef.current) toastRef.current(t, type);
    else if (addToast && typeof addToast === "function") addToast(t, type);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [d, r, p, a, m, h, au, mc, ztR, al, rl] = await Promise.all([
        api.adsMarketingModule.n0va1oGovernanceDashboard(),
        api.adsMarketingModule.n0va1oRoutingOverview(),
        api.adsMarketingModule.n0va1oRoutingPolicies(),
        api.adsMarketingModule.n0va1oAccessRequests(),
        api.adsMarketingModule.n0va1oModifiers(),
        api.adsMarketingModule.n0va1oHitlQueue(),
        api.adsMarketingModule.n0va1oVerifyAuditChain(),
        api.adsMarketingModule.n0va1oModifierCatalog(),
        api.adsMarketingModule.n0va1oZeroTrust(),
        api.adsMarketingModule.n0va1oAuditLog(30),
        api.adsMarketingModule.n0va1oRoutingLog(20),
      ]);
      setDash(unwrap(d)); setRouting(unwrap(r)); setPolicies(unwrap(p)); setAccess(unwrap(a));
      setModifiers(unwrap(m)); setHitl(unwrap(h)); setAudit(unwrap(au)); setModCatalog(unwrap(mc));
      setZt(unwrap(ztR)); setAuditLog(unwrap(al)); setRoutingLog(unwrap(rl));
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e?.message || "Failed to load governance data");
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

  const createModifier = () => act("mod", () => api.adsMarketingModule.n0va1oCreateModifier(mForm), "Modifier registered");
  const createPolicy = () => act("policy", () => api.adsMarketingModule.n0va1oCreateRoutingPolicy({
    teamId: pForm.teamId,
    endpoint: pForm.endpoint,
    whitelist: pForm.whitelist.split(",").map((s) => s.trim()).filter(Boolean),
    blacklist: pForm.blacklist.split(",").map((s) => s.trim()).filter(Boolean),
    approvalRequired: pForm.approvalRequired.split(",").map((s) => s.trim()).filter(Boolean),
    ssoRequired: pForm.ssoRequired,
  }), "Policy created");
  const runEval = async () => {
    const d = await act("eval", () => api.adsMarketingModule.n0va1oEvaluateCall(evalForm));
    if (d) setEvalRes(d);
  };
  const runAccessEval = async () => {
    const d = await act("aeval", () => api.adsMarketingModule.n0va1oEvaluateToolAccess({ toolId: evalForm.toolId, teamId: evalForm.teamId }));
    if (d) setEvalRes((prev: any) => ({ ...(prev || {}), accessEval: d }));
  };
  const appendAudit = async () => {
    const d = await act("audit", () => api.adsMarketingModule.n0va1oAppendAudit({
      action: aForm.action, toolId: aForm.toolId, actor: aForm.actor,
      details: aForm.details ? { note: aForm.details } : {},
    }), "Audit entry stamped");
    if (d) setAuditRes(d);
  };
  const resolveHitl = (hitlId: string, decision: string) =>
    act("hitl", () => api.adsMarketingModule.n0va1oResolveHitl(hitlId, decision, { reviewer: "admin" }));
  const resolveAccess = (requestId: string, decision: string) =>
    act("access", () => api.adsMarketingModule.n0va1oResolveAccessRequest(requestId, decision));

  const openRoom = async (hitlId: string) => {
    const d = await act("room", () => api.adsMarketingModule.n0va1oHitl(hitlId));
    if (d) setShowRoom(d);
  };

  const ztLevelColor = (lvl: string) =>
    lvl === "hardened" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" :
    lvl === "strong" ? "bg-sky-500/15 text-sky-300 border-sky-500/30" :
    "bg-amber-500/15 text-amber-300 border-amber-500/30";

  const ztData = dash?.zeroTrust || zt || null;

  if (loading && !dash) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse mb-6 h-8 w-56 rounded-md bg-gray-700/60" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} h={48} />)}</div>
      </div>
    );
  }

  const cards = [
    { label: "Zero-trust score", value: ztData ? `${ztData.overallScore}/100` : "—", sub: ztData ? `${ztData.level} · ${(ztData.layers || []).filter((l: any) => l.status === "pass").length}/4 layers passing` : "", icon: ShieldCheck, color: "text-emerald-400" },
    { label: "HITL pending", value: String(dash?.hitl?.pending ?? hitl?.pending ?? 0), sub: `${dash?.hitl?.overdue ?? 0} overdue · ${dash?.hitl?.total ?? 0} total`, icon: Clock, color: "text-amber-400" },
    { label: "Access requests", value: String(routing?.pendingAccessRequests ?? access?.pending ?? 0), sub: `${routing?.toolCount ?? 0} tools · ${(routing?.intents || []).length} intents`, icon: KeyRound, color: "text-sky-400" },
    { label: "Audit entries", value: String(dash?.audit?.entries ?? audit?.entries ?? auditLog?.total ?? 0), sub: dash?.audit?.chainIntact ? "chain intact · merkle " + String(dash?.audit?.merkleRoot || "").slice(0, 10) : "chain broken!", icon: FileSearch, color: dash?.audit?.chainIntact ? "text-violet-400" : "text-red-400" },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="w-6 h-6 text-violet-400" /> N0VA1O Governance</h1>
          <p className="text-sm text-gray-400 mt-1">Zero-trust enforcement, HITL escalation, routing policy &amp; tamper-proof audit chain</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-400">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="accent-violet-500" /> Auto 30s
          </label>
          <button onClick={() => loadAll()} className="flex items-center gap-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700/50 px-3 py-2 text-sm"><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-300">{loadError}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wide text-gray-400">{c.label}</span>
              <c.icon className={`w-4 h-4 ${c.color}`} />
            </div>
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-xs text-gray-500 mt-1 truncate">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-400" /> Zero-trust layers</h2>
            {ztData && <span className={`text-xs px-2 py-0.5 rounded-full border ${ztLevelColor(ztData.level)}`}>{ztData.level}</span>}
          </div>
          <p className="text-xs text-gray-500 mb-3">{ztData?.summary || "No zero-trust data"}</p>
          <div className="space-y-3">
            {(ztData?.layers || []).map((l: any) => (
              <div key={l.id}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">{l.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${VERDICT_STYLE[l.status] || "bg-gray-700 text-gray-300"}`}>
                    {l.passRate}% · {l.verifiedCount} verified · {l.blockedCount} blocked
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-700/60 overflow-hidden">
                  <div className={`h-full rounded-full ${l.status === "pass" ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${l.passRate}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-1 truncate">{l.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><Lock className="w-4 h-4 text-sky-400" /> HITL escalation queue</h2>
            <span className="text-xs text-gray-500">{hitl?.total ?? 0} pending · {dash?.hitl?.overdue ?? 0} overdue</span>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {(hitl?.queue || []).length === 0 && <p className="text-xs text-gray-500">No escalations pending.</p>}
            {(hitl?.queue || []).map((h: any) => (
              <div key={h.hitlId} className="rounded-lg bg-gray-900/60 border border-gray-700/50 p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm font-medium truncate">{h.toolId}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${HITL_STYLE[h.riskLevel] || "bg-gray-700 text-gray-300"}`}>{h.riskLevel} · {h.riskScore}/100</span>
                </div>
                <p className="text-xs text-gray-400 mt-1 truncate">{h.action} · deadline {h.deadline ? new Date(h.deadline).toLocaleString() : "n/a"}</p>
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => openRoom(h.hitlId)} className="flex items-center gap-1 rounded-md bg-gray-700/70 hover:bg-gray-600/70 px-2 py-1 text-xs"><Eye className="w-3 h-3" /> Room</button>
                  <button onClick={() => resolveHitl(h.hitlId, "approve")} disabled={busy === "hitl"} className="flex items-center gap-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 px-2 py-1 text-xs text-emerald-300"><CheckCircle2 className="w-3 h-3" /> Approve</button>
                  <button onClick={() => resolveHitl(h.hitlId, "reject")} disabled={busy === "hitl"} className="flex items-center gap-1 rounded-md bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 px-2 py-1 text-xs text-red-300"><XCircle className="w-3 h-3" /> Reject</button>
                  {h.riskLevel === "medium" && (
                    <button onClick={() => resolveHitl(h.hitlId, "override")} disabled={busy === "hitl"} className="flex items-center gap-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-2 py-1 text-xs text-amber-300"><Zap className="w-3 h-3" /> Override</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><Cpu className="w-4 h-4 text-violet-400" /> Modifier pipeline</h2>
            <button onClick={() => { setShowModifier(true); }} className="flex items-center gap-1 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 px-2 py-1 text-xs text-violet-300"><Plus className="w-3 h-3" /> New</button>
          </div>
          <p className="text-xs text-gray-500 mb-2">{modCatalog?.summary}</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(modCatalog?.types || []).map((t: any) => (
              <span key={t.id} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-700/50 border border-gray-600/50 text-gray-300">{t.name}</span>
            ))}
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {(modifiers?.modifiers || []).length === 0 && <p className="text-xs text-gray-500">No modifiers registered.</p>}
            {(modifiers?.modifiers || []).map((m: any) => (
              <div key={m.modifierId || m._id} className="flex items-center justify-between gap-2 rounded-lg bg-gray-900/60 border border-gray-700/50 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{m.name}</p>
                  <p className="text-xs text-gray-500 truncate">{m.type} · {m.toolPattern}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${m.enabled ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-gray-700 text-gray-400 border-gray-600/50"}`}>{m.enabled ? "on" : "off"}</span>
                  <button onClick={() => act("mdel", () => api.adsMarketingModule.n0va1oDeleteModifier(m.modifierId || m._id), "Modifier deleted")} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><Ban className="w-4 h-4 text-red-400" /> Evaluate call</h2>
            <button onClick={() => setShowEval(true)} className="flex items-center gap-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-2 py-1 text-xs text-amber-300"><PlayCircle className="w-3 h-3" /> Evaluate</button>
          </div>
          {evalRes ? (
            <div className="rounded-lg bg-gray-900/60 border border-gray-700/50 p-3">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                <span className="text-sm font-medium">{evalRes.toolId}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${VERDICT_STYLE[evalRes.verdict] || "bg-gray-700 text-gray-300"}`}>{evalRes.verdict}</span>
              </div>
              <p className="text-xs text-gray-400">{evalRes.summary} · risk {evalRes.riskScore}/100</p>
              {evalRes.interrogationRoom && (
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {(evalRes.interrogationRoom.panels || []).map((p: any) => (
                    <div key={p.id} className="rounded-md bg-gray-800/60 border border-gray-700/50 p-1.5">
                      <p className="text-[10px] uppercase tracking-wide text-gray-500">{p.name}</p>
                      <p className="text-[11px] text-gray-300 truncate">{p.content}</p>
                    </div>
                  ))}
                </div>
              )}
              {evalRes.accessEval && (
                <div className="mt-2 pt-2 border-t border-gray-700/50">
                  <p className="text-xs text-gray-400">Access check: <span className={`px-2 py-0.5 rounded-full border text-[11px] ${VERDICT_STYLE[evalRes.accessEval.verdict] || ""}`}>{evalRes.accessEval.verdict}</span> — {evalRes.accessEval.summary}</p>
                </div>
              )}
              <button onClick={() => setEvalRes(null)} className="mt-2 text-xs text-gray-500 hover:text-gray-300">Clear</button>
            </div>
          ) : <p className="text-xs text-gray-500">Evaluate a tool call against risk levels (low auto-executes; medium/high/critical escalate to HITL with interrogation room).</p>}
          <div className="mt-4 border-t border-gray-700/50 pt-3">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><GitBranch className="w-4 h-4 text-emerald-400" /> Routing policies</h3>
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setShowPolicy(true)} className="flex items-center gap-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 px-2 py-1 text-xs text-sky-300"><Plus className="w-3 h-3" /> Policy</button>
              <span className="text-xs text-gray-500">{policies?.total ?? 0} team endpoint(s) · {routing?.discoveries ?? 0} discoveries · {routing?.translations ?? 0} translations · p99 {routing?.discoveryP99Ms ?? 45}ms</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {(policies?.policies || []).length === 0 && <p className="text-xs text-gray-500">No routing policies yet.</p>}
              {(policies?.policies || []).map((p: any) => (
                <div key={p.policyId || p.teamId} className="rounded-lg bg-gray-900/60 border border-gray-700/50 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{p.teamId} <span className="text-xs text-gray-500 font-normal">→ {p.endpoint}</span></p>
                    <button onClick={() => act("pdel", () => api.adsMarketingModule.n0va1oDeleteRoutingPolicy(p.teamId), "Policy deleted")} className="text-red-400 hover:text-red-300 shrink-0"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <p className="text-xs text-gray-500 truncate">wl {p.whitelist?.length ?? 0} · bl {p.blacklist?.length ?? 0} · approval {p.approvalRequired?.length ?? 0} · sso {p.ssoRequired ? "on" : "off"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><UserCheck className="w-4 h-4 text-emerald-400" /> Access requests</h2>
            <span className="text-xs text-gray-500">{access?.pending ?? 0} pending</span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {(access?.requests || []).length === 0 && <p className="text-xs text-gray-500">No access requests.</p>}
            {(access?.requests || []).map((rq: any) => (
              <div key={rq.requestId} className="rounded-lg bg-gray-900/60 border border-gray-700/50 p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm font-medium truncate">{rq.toolId}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${VERDICT_STYLE[rq.status] || "bg-gray-700 text-gray-300"}`}>{rq.status}</span>
                </div>
                <p className="text-xs text-gray-400 truncate">{rq.requester} · team {rq.teamId} · {rq.reason || "no reason"}</p>
                {rq.status === "pending" && (
                  <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => resolveAccess(rq.requestId, "approve")} disabled={busy === "access"} className="flex items-center gap-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 px-2 py-1 text-xs text-emerald-300"><CheckCircle2 className="w-3 h-3" /> Approve</button>
                    <button onClick={() => resolveAccess(rq.requestId, "deny")} disabled={busy === "access"} className="flex items-center gap-1 rounded-md bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 px-2 py-1 text-xs text-red-300"><XCircle className="w-3 h-3" /> Deny</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><FileSearch className="w-4 h-4 text-violet-400" /> Audit chain</h2>
            <div className="flex items-center gap-2">
              {audit && (
                <span className={`text-xs px-2 py-0.5 rounded-full border ${audit.chainIntact ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-red-500/15 text-red-300 border-red-500/30"}`}>
                  {audit.chainIntact ? `${audit.entries} entr(ies) hash-verified` : `chain broken at ${audit.brokenAt}`}
                </span>
              )}
              <button onClick={() => setShowAudit(true)} className="flex items-center gap-1 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 px-2 py-1 text-xs text-violet-300"><Plus className="w-3 h-3" /> Stamp entry</button>
              <button onClick={() => act("verify", () => api.adsMarketingModule.n0va1oVerifyAuditChain())} disabled={busy === "verify"} className="flex items-center gap-1 rounded-lg bg-gray-700/70 hover:bg-gray-600/70 px-2 py-1 text-xs">Verify</button>
            </div>
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-2">Recent entries</h3>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {(auditLog?.entries || []).slice(0, 12).map((e: any) => (
                  <div key={e.auditId || e._id} className="flex items-start justify-between gap-2 rounded-md bg-gray-900/60 border border-gray-700/50 px-2.5 py-1.5">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{e.action} <span className="text-gray-500 font-normal">· {e.toolId || "—"}</span></p>
                      <p className="text-[10px] text-gray-500 truncate">actor {e.actor} · {new Date(e.at).toLocaleTimeString()}</p>
                    </div>
                    <span className="text-[10px] font-mono text-gray-500 shrink-0">{(e.chainHash || "").slice(0, 10)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-2">Routing activity</h3>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {(routingLog?.entries || []).slice(0, 12).map((e: any, i: number) => (
                  <div key={i} className="rounded-md bg-gray-900/60 border border-gray-700/50 px-2.5 py-1.5">
                    <p className="text-xs text-gray-300 truncate">{e.detail || e.category}</p>
                    <p className="text-[10px] text-gray-500">{e.category} · {new Date(e.at).toLocaleTimeString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showRoom && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowRoom(null)}>
          <div className="modalWrap w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl lg:rounded-2xl bg-gray-900 border border-gray-700/60 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center gap-2"><Eye className="w-4 h-4 text-orange-400" /> Interrogation room</h2>
              <button onClick={() => setShowRoom(null)} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
            </div>
            <div className="mb-3 flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">{showRoom.toolId}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${HITL_STYLE[showRoom.riskLevel] || "bg-gray-700 text-gray-300"}`}>{showRoom.riskName} · {showRoom.riskScore}/100</span>
              <span className="text-xs text-gray-500">{showRoom.hitlId}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(showRoom.interrogationRoom?.panels || []).map((p: any) => (
                <div key={p.id} className="rounded-lg bg-gray-800/60 border border-gray-700/50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">{p.name}</p>
                  <p className="text-sm text-gray-200 mt-1">{p.content}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button onClick={() => { resolveHitl(showRoom.hitlId, "approve"); setShowRoom(null); }} disabled={busy === "hitl"} className="flex items-center gap-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 px-3 py-2 text-sm text-emerald-300"><CheckCircle2 className="w-4 h-4" /> Approve</button>
              <button onClick={() => { resolveHitl(showRoom.hitlId, "reject"); setShowRoom(null); }} disabled={busy === "hitl"} className="flex items-center gap-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 px-3 py-2 text-sm text-red-300"><XCircle className="w-4 h-4" /> Reject</button>
              <button onClick={() => setShowRoom(null)} className="rounded-lg bg-gray-700/70 hover:bg-gray-600/70 px-3 py-2 text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {showModifier && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowModifier(false)}>
          <div className="modalWrap w-full max-w-md rounded-t-2xl lg:rounded-2xl bg-gray-900 border border-gray-700/60 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">New modifier</h2>
              <button onClick={() => setShowModifier(false)} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400">Type</label>
                <select value={mForm.type} onChange={(e) => setMForm({ ...mForm, type: e.target.value })} className="w-full rounded-lg bg-gray-800 border border-gray-700/60 px-3 py-2 text-sm">
                  <option value="schema">Schema</option>
                  <option value="before">Before-execution</option>
                  <option value="after">After-execution</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400">Name</label>
                <input value={mForm.name} onChange={(e) => setMForm({ ...mForm, name: e.target.value })} placeholder="e.g. redact_pii" className="w-full rounded-lg bg-gray-800 border border-gray-700/60 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Tool pattern</label>
                <input value={mForm.toolPattern} onChange={(e) => setMForm({ ...mForm, toolPattern: e.target.value })} placeholder="e.g. crm.*, *invoice*" className="w-full rounded-lg bg-gray-800 border border-gray-700/60 px-3 py-2 text-sm font-mono" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Transform (comma-separated props for schema type)</label>
                <input value={mForm.transform} onChange={(e) => setMForm({ ...mForm, transform: e.target.value })} placeholder="e.g. masked_fields, region" className="w-full rounded-lg bg-gray-800 border border-gray-700/60 px-3 py-2 text-sm" />
              </div>
              <button onClick={() => { createModifier(); setShowModifier(false); }} disabled={busy === "mod"} className="w-full rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-2 text-sm font-medium disabled:opacity-50">Register modifier</button>
            </div>
          </div>
        </div>
      )}

      {showPolicy && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowPolicy(false)}>
          <div className="modalWrap w-full max-w-md rounded-t-2xl lg:rounded-2xl bg-gray-900 border border-gray-700/60 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">New routing policy</h2>
              <button onClick={() => setShowPolicy(false)} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400">Team ID</label>
                <input value={pForm.teamId} onChange={(e) => setPForm({ ...pForm, teamId: e.target.value })} placeholder="e.g. growth" className="w-full rounded-lg bg-gray-800 border border-gray-700/60 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400">MCP endpoint</label>
                <input value={pForm.endpoint} onChange={(e) => setPForm({ ...pForm, endpoint: e.target.value })} placeholder="e.g. https://mcp.n0va1o.io/growth" className="w-full rounded-lg bg-gray-800 border border-gray-700/60 px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400">Whitelist (comma)</label>
                  <input value={pForm.whitelist} onChange={(e) => setPForm({ ...pForm, whitelist: e.target.value })} placeholder="crm.*" className="w-full rounded-lg bg-gray-800 border border-gray-700/60 px-3 py-2 text-sm font-mono" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Blacklist (comma)</label>
                  <input value={pForm.blacklist} onChange={(e) => setPForm({ ...pForm, blacklist: e.target.value })} placeholder="finance.*" className="w-full rounded-lg bg-gray-800 border border-gray-700/60 px-3 py-2 text-sm font-mono" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400">Approval-required tools (comma)</label>
                <input value={pForm.approvalRequired} onChange={(e) => setPForm({ ...pForm, approvalRequired: e.target.value })} placeholder="*invoice*" className="w-full rounded-lg bg-gray-800 border border-gray-700/60 px-3 py-2 text-sm font-mono" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={pForm.ssoRequired} onChange={(e) => setPForm({ ...pForm, ssoRequired: e.target.checked })} className="accent-violet-500" /> SSO required
              </label>
              <button onClick={() => { createPolicy(); setShowPolicy(false); }} disabled={busy === "policy"} className="w-full rounded-lg bg-sky-600 hover:bg-sky-500 px-3 py-2 text-sm font-medium disabled:opacity-50">Create policy</button>
            </div>
          </div>
        </div>
      )}

      {showEval && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowEval(false)}>
          <div className="modalWrap w-full max-w-md rounded-t-2xl lg:rounded-2xl bg-gray-900 border border-gray-700/60 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Evaluate tool call</h2>
              <button onClick={() => setShowEval(false)} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400">Tool ID</label>
                <input value={evalForm.toolId} onChange={(e) => setEvalForm({ ...evalForm, toolId: e.target.value })} placeholder="e.g. crm.create_lead" className="w-full rounded-lg bg-gray-800 border border-gray-700/60 px-3 py-2 text-sm font-mono" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Risk level</label>
                <select value={evalForm.riskLevel} onChange={(e) => setEvalForm({ ...evalForm, riskLevel: e.target.value })} className="w-full rounded-lg bg-gray-800 border border-gray-700/60 px-3 py-2 text-sm">
                  <option value="low">Low — auto-execute</option>
                  <option value="medium">Medium — 72h review, override allowed</option>
                  <option value="high">High — 24h human review</option>
                  <option value="critical">Critical — 4h block + interrogation room</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400">Action</label>
                <input value={evalForm.action} onChange={(e) => setEvalForm({ ...evalForm, action: e.target.value })} placeholder="What the agent wants to do" className="w-full rounded-lg bg-gray-800 border border-gray-700/60 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Reasoning (optional)</label>
                <textarea value={evalForm.reasoning} onChange={(e) => setEvalForm({ ...evalForm, reasoning: e.target.value })} rows={2} className="w-full rounded-lg bg-gray-800 border border-gray-700/60 px-3 py-2 text-sm" />
              </div>
              <button onClick={() => { runEval(); setShowEval(false); }} disabled={busy === "eval"} className="w-full rounded-lg bg-amber-600 hover:bg-amber-500 px-3 py-2 text-sm font-medium disabled:opacity-50">Run evaluation</button>
              <button onClick={() => { runAccessEval(); setShowEval(false); }} disabled={busy === "aeval"} className="w-full rounded-lg bg-sky-600 hover:bg-sky-500 px-3 py-2 text-sm font-medium disabled:opacity-50">Check tool access (policy)</button>
            </div>
          </div>
        </div>
      )}

      {showAudit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAudit(false)}>
          <div className="modalWrap w-full max-w-md rounded-t-2xl lg:rounded-2xl bg-gray-900 border border-gray-700/60 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Stamp audit entry</h2>
              <button onClick={() => setShowAudit(false)} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400">Action</label>
                <input value={aForm.action} onChange={(e) => setAForm({ ...aForm, action: e.target.value })} placeholder="e.g. campaign_launch" className="w-full rounded-lg bg-gray-800 border border-gray-700/60 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Tool ID</label>
                <input value={aForm.toolId} onChange={(e) => setAForm({ ...aForm, toolId: e.target.value })} placeholder="e.g. campaigns.launch" className="w-full rounded-lg bg-gray-800 border border-gray-700/60 px-3 py-2 text-sm font-mono" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Actor</label>
                <input value={aForm.actor} onChange={(e) => setAForm({ ...aForm, actor: e.target.value })} placeholder="admin" className="w-full rounded-lg bg-gray-800 border border-gray-700/60 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Details (optional JSON note)</label>
                <input value={aForm.details} onChange={(e) => setAForm({ ...aForm, details: e.target.value })} placeholder="e.g. channel=facebook" className="w-full rounded-lg bg-gray-800 border border-gray-700/60 px-3 py-2 text-sm" />
              </div>
              <button onClick={() => { appendAudit(); setShowAudit(false); }} disabled={busy === "audit"} className="w-full rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-2 text-sm font-medium disabled:opacity-50">Stamp &amp; chain</button>
              {auditRes && <p className="text-xs text-emerald-300">{auditRes.summary}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
