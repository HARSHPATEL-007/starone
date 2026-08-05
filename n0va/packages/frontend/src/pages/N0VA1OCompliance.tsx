import React, { useEffect, useRef, useState } from "react";
import {
  ShieldCheck, Scale, FileSearch, GitBranch, Lock, CheckCircle2, AlertTriangle,
  XCircle, Eye, KeyRound, RefreshCw, ChevronDown, Fingerprint, ListChecks,
  BookOpenCheck, ArrowRight,
} from "lucide-react";
import { api } from "../api/client";

const unwrap = (r: any) => r?.data ?? r;

function SkeletonCard({ h = 28 }: { h?: number }) {
  return <div className="animate-pulse rounded-xl bg-gray-800/60 p-4"><div style={{ height: h }} className="rounded-md bg-gray-700/60" /></div>;
}

const STYLE: Record<string, string> = {
  pass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  warn: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  fail: "bg-red-500/15 text-red-300 border-red-500/30",
};

export default function N0VA1OCompliance() {
  const { addToast } = (window as any).useToast ? (window as any).useToast() : { addToast: () => {} };
  const toastRef = useRef<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [auto, setAuto] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [dash, setDash] = useState<any>(null);
  const [catalog, setCatalog] = useState<any>(null);
  const [mapping, setMapping] = useState<any>(null);
  const [evidence, setEvidence] = useState<any>(null);
  const [agents, setAgents] = useState<any>(null);
  const [trail, setTrail] = useState<any>(null);
  const [log, setLog] = useState<any>(null);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [activeFramework, setActiveFramework] = useState<string | null>(null);

  const toast = (t: string, type: "success" | "error" | "info" = "success") => {
    if (toastRef.current) toastRef.current(t, type);
    else if (addToast && typeof addToast === "function") addToast(t, type);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [d, c, m, a, l] = await Promise.all([
        api.adsMarketingModule.n0va1oComplianceDashboard(),
        api.adsMarketingModule.n0va1oComplianceFrameworkCatalog(),
        api.adsMarketingModule.n0va1oComplianceMapping(),
        api.adsMarketingModule.n0va1oAgents(),
        api.adsMarketingModule.n0va1oComplianceLog(20),
      ]);
      const dd = unwrap(d), cc = unwrap(c), mm = unwrap(m);
      setDash(dd); setCatalog(cc); setMapping(mm);
      const ags = Array.isArray(unwrap(a)) ? unwrap(a) : unwrap(a)?.agents || [];
      setAgents(ags);
      if (!selectedAgent && ags.length) setSelectedAgent(ags[0].agentId || ags[0]._id);
      setLog(unwrap(l));
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e?.message || "Failed to load compliance data");
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
      return d;
    } catch (e: any) {
      toast(e?.message || "Action failed", "error");
      return null;
    } finally {
      setBusy(null);
    }
  };

  const loadEvidence = async (frameworkId: string) => {
    setActiveFramework(frameworkId);
    const d = await act("ev", () => api.adsMarketingModule.n0va1oComplianceEvidence(frameworkId));
    if (d) setEvidence(d);
  };

  const loadTrail = async (agentId: string) => {
    const d = await act("trail", () => api.adsMarketingModule.n0va1oAgentAuditTrail(agentId));
    if (d) setTrail(d);
  };

  if (loading && !dash) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse mb-6 h-8 w-56 rounded-md bg-gray-700/60" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} h={48} />)}</div>
      </div>
    );
  }

  const reports = dash?.reports?.reports || dash?.byFramework || [];
  const avg = dash?.average ?? dash?.reports?.average ?? 0;
  const frameworkRows = (mapping?.frameworks || catalog?.frameworks || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    controls: f.controls ?? mapping?.frameworks?.find((x: any) => x.id === f.id)?.controls ?? 0,
  }));
  const totalControls = mapping?.totalControls ?? catalog?.frameworks?.reduce((a: number, f: any) => a + (f.controls || 0), 0) ?? 0;

  const cards = [
    { label: "Avg readiness", value: `${avg}/100`, sub: dash?.reports?.summary || "across all frameworks", icon: ShieldCheck, color: "text-emerald-400" },
    { label: "Frameworks", value: String(catalog?.total ?? reports.length), sub: dash?.reports?.status ?? "", icon: BookOpenCheck, color: "text-violet-400" },
    { label: "Mapped controls", value: String(totalControls), sub: `${(mapping?.frameworks || []).length} frameworks covered`, icon: ListChecks, color: "text-sky-400" },
    { label: "Passing now", value: reports.filter((r: any) => r.status === "pass").length + "/" + reports.length, sub: reports.filter((r: any) => r.status === "warn").length + " warn · " + reports.filter((r: any) => r.status === "fail").length + " fail", icon: GitBranch, color: "text-amber-400" },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Scale className="w-6 h-6 text-emerald-400" /> N0VA1O Compliance</h1>
          <p className="text-sm text-gray-400 mt-1">Framework evidence, control mapping &amp; quantum-signed agent audit trails</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-400">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="accent-emerald-500" /> Auto 30s
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
            <h2 className="font-semibold flex items-center gap-2"><BookOpenCheck className="w-4 h-4 text-emerald-400" /> Framework catalog</h2>
            <span className="text-xs text-gray-500">{catalog?.summary}</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {(catalog?.frameworks || []).map((f: any) => (
              <button key={f.id} onClick={() => loadEvidence(f.id)} className={`text-left rounded-lg border p-3 transition ${activeFramework === f.id ? "bg-emerald-500/10 border-emerald-500/40" : "bg-gray-900/60 border-gray-700/50 hover:border-gray-600"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">{f.name}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-700/60 text-gray-300 shrink-0">{f.controls} ctrl</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1 truncate">{f.description}</p>
                <p className="text-[10px] font-mono text-gray-600 mt-1">{f.id}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><GitBranch className="w-4 h-4 text-sky-400" /> Control mapping</h2>
            <span className="text-xs text-gray-500">{mapping?.summary}</span>
          </div>
          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {(mapping?.mapping || []).map((m: any) => (
              <div key={m.control} className="rounded-md bg-gray-900/60 border border-gray-700/50 px-2.5 py-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-medium">{m.controlName}</span>
                  <span className="text-[10px] font-mono text-gray-500">{m.control}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(m.frameworks || []).map((f: string) => (
                    <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700/60 text-gray-300">{f}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><Fingerprint className="w-4 h-4 text-violet-400" /> Evidence detail</h2>
            {evidence && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${STYLE[evidence.status] || "bg-gray-700 text-gray-300"}`}>{evidence.status} · {evidence.score}/100</span>
                <span className="text-xs text-gray-500">{evidence.passing}/{evidence.controls?.length ?? 0} passing · {evidence.failing} failing</span>
              </div>
            )}
          </div>
          {!evidence && <p className="text-xs text-gray-500">Select a framework in the catalog to collect evidence.</p>}
          {evidence && (
            <div className="space-y-2">
              <p className="text-sm text-gray-300">{evidence.summary}</p>
              <div className="grid lg:grid-cols-2 gap-2">
                {(evidence.controls || []).map((c: any) => (
                  <div key={c.id} className="rounded-lg bg-gray-900/60 border border-gray-700/50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{c.name}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border shrink-0 ${STYLE[c.status] || "bg-gray-700 text-gray-300"}`}>{c.status} {c.score}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-700/60 overflow-hidden mt-2">
                      <div className={`h-full rounded-full ${c.status === "pass" ? "bg-emerald-500" : c.status === "warn" ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${c.score}%` }} />
                    </div>
                    <p className="text-[11px] text-gray-500 mt-2 truncate">{c.evidence}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><Lock className="w-4 h-4 text-emerald-400" /> Agent audit trail</h2>
            <select value={selectedAgent} onChange={(e) => { setSelectedAgent(e.target.value); }} className="rounded-lg bg-gray-800 border border-gray-700/60 px-2 py-1 text-xs max-w-[180px]">
              {(agents || []).map((a: any) => (
                <option key={a.agentId || a._id} value={a.agentId || a._id}>{a.name}</option>
              ))}
            </select>
          </div>
          <button onClick={() => selectedAgent && loadTrail(selectedAgent)} disabled={busy === "trail"} className="w-full mb-3 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 px-3 py-2 text-sm text-violet-300">Build trail</button>
          {trail && (
            <div className="space-y-3">
              <div className="rounded-lg bg-gray-900/60 border border-gray-700/50 p-3">
                <p className="text-xs text-gray-300">{trail.summary}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-800 border border-gray-700/60 text-gray-400 truncate max-w-[180px]">merkle {trail.merkle_root?.slice(0, 16)}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-800 border border-gray-700/60 text-gray-400 truncate max-w-[180px]">chain {trail.chain_hash?.slice(0, 16)}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/30 text-violet-300 truncate max-w-[200px]">qs {trail.quantum_signature}</span>
                </div>
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-1.5">Reasoning chain</h3>
                <div className="space-y-1.5">
                  {(trail.reasoning_chain || []).map((r: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 rounded-md bg-gray-900/60 border border-gray-700/50 px-2.5 py-1.5">
                      <span className="text-[10px] font-mono text-gray-500 shrink-0">step {r.step}</span>
                      <span className="text-xs text-gray-300 truncate">{r.action}</span>
                      <span className="text-[10px] font-mono text-gray-500 ml-auto shrink-0 truncate max-w-[110px]">{r.chainStep}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-1.5">Trail entries</h3>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {(trail.trail || []).slice(0, 20).map((e: any, i: number) => (
                    <div key={i} className="rounded-md bg-gray-900/60 border border-gray-700/50 px-2.5 py-1.5">
                      <p className="text-xs text-gray-300 truncate">{e.action} <span className="text-gray-500">· {e.toolId || "—"} · {new Date(e.at).toLocaleTimeString()}</span></p>
                      <p className="text-[10px] font-mono text-gray-500 truncate">{e.contentHash} → {e.chainHash}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><FileSearch className="w-4 h-4 text-amber-400" /> Readiness reports</h2>
            <span className="text-xs text-gray-500">avg {avg}/100</span>
          </div>
          <div className="space-y-2">
            {reports.map((r: any) => (
              <div key={r.framework} className="rounded-lg bg-gray-900/60 border border-gray-700/50 px-3 py-2">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-medium truncate">{r.name}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border shrink-0 ${STYLE[r.status] || "bg-gray-700 text-gray-300"}`}>{r.score}</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-700/60 overflow-hidden">
                  <div className={`h-full rounded-full ${r.status === "pass" ? "bg-emerald-500" : r.status === "warn" ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${r.score}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-gray-700/50 pt-3">
            <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-2">Recent activity</h3>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {(log?.entries || []).slice(0, 10).map((e: any, i: number) => (
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
  );
}
