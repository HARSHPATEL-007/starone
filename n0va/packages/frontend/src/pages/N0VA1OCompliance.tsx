import React, { useEffect, useRef, useState } from "react";
import {
  ShieldCheck, Scale, FileSearch, GitBranch, Lock, CheckCircle2, AlertTriangle,
  XCircle, Eye, KeyRound, RefreshCw, ChevronDown, Fingerprint, ListChecks,
  BookOpenCheck, ArrowRight, Download, Trash2, Users, Save, Clock, Database,
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
  const [policy, setPolicy] = useState<any>(null);
  const [retention, setRetention] = useState<any>(null);
  const [directory, setDirectory] = useState<any>(null);
  const [exportKind, setExportKind] = useState("audit");
  const [exportFramework, setExportFramework] = useState("");
  const [policyForm, setPolicyForm] = useState({ metadataOnly: false, retentionEnabled: false, retentionDays: 365 });
  const [dirEmail, setDirEmail] = useState("");
  const [dirStatus, setDirStatus] = useState("active");
  const [dirGroups, setDirGroups] = useState("");

  const toast = (t: string, type: "success" | "error" | "info" = "success") => {
    if (toastRef.current) toastRef.current(t, type);
    else if (addToast && typeof addToast === "function") addToast(t, type);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [d, c, m, a, l, p, r, dir] = await Promise.all([
        api.adsMarketingModule.n0va1oComplianceDashboard(),
        api.adsMarketingModule.n0va1oComplianceFrameworkCatalog(),
        api.adsMarketingModule.n0va1oComplianceMapping(),
        api.adsMarketingModule.n0va1oAgents(),
        api.adsMarketingModule.n0va1oComplianceLog(20),
        api.adsMarketingModule.n0va1oAuditPolicy(),
        api.adsMarketingModule.n0va1oRetentionStatus(),
        api.adsMarketingModule.n0va1oDirectoryDashboard(),
      ]);
      const dd = unwrap(d), cc = unwrap(c), mm = unwrap(m);
      setDash(dd); setCatalog(cc); setMapping(mm);
      const ags = Array.isArray(unwrap(a)) ? unwrap(a) : unwrap(a)?.agents || [];
      setAgents(ags);
      if (!selectedAgent && ags.length) setSelectedAgent(ags[0].agentId || ags[0]._id);
      setLog(unwrap(l));
      const pp = unwrap(p), rr = unwrap(r), dird = unwrap(dir);
      setPolicy(pp); setRetention(rr); setDirectory(dird);
      setPolicyForm({ metadataOnly: pp.metadataOnly === true, retentionEnabled: pp.retentionEnabled === true, retentionDays: pp.retentionDays ?? 365 });
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

  const savePolicy = async () => {
    const d = await act("policy", () => api.adsMarketingModule.n0va1oSetAuditPolicy(policyForm), "Audit policy saved");
    if (d) { setPolicy(d); await loadAll(); }
  };

  const exportCsv = async () => {
    const d = await act("export", () => api.adsMarketingModule.n0va1oExportAuditCsv(exportKind, exportFramework || undefined), "CSV exported");
    if (d && d.content) {
      const blob = new Blob([d.content], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = d.filename || "n0va1o_export.csv"; a.click();
      URL.revokeObjectURL(url);
    }
  };

  const applyRetention = async () => {
    await act("retention", () => api.adsMarketingModule.n0va1oApplyRetention(), "Retention purge complete");
    await loadAll();
  };

  const syncDir = async () => {
    if (!dirEmail.trim()) { toast("Enter an email to sync", "error"); return; }
    const groups = dirGroups.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    const d = await act("dirsync", () => api.adsMarketingModule.n0va1oSyncDirectory({ users: [{ email: dirEmail.trim(), status: dirStatus, ...(groups.length ? { groups } : {}) }] }), "Directory synced");
    if (d) { setDirEmail(""); setDirGroups(""); await loadAll(); }
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

      <div className="mb-6 mt-8 border-b border-gray-700/50 pb-2">
        <h2 className="text-lg font-bold flex items-center gap-2"><Fingerprint className="w-5 h-5 text-emerald-400" /> Audit-aware compliance</h2>
        <p className="text-xs text-gray-400 mt-0.5">Metadata-only logging · instant CSV exports · flexible retention (1 day – 9 years) · directory lifecycle de-provisioning</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><KeyRound className="w-4 h-4 text-emerald-400" /> Audit policy</h2>
            <span className="text-[10px] font-mono text-gray-500">{policy?.expiryLabel}</span>
          </div>
          <div className="space-y-2.5">
            <label className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Metadata-only logging</span>
              <input type="checkbox" checked={policyForm.metadataOnly} onChange={(e) => setPolicyForm({ ...policyForm, metadataOnly: e.target.checked })} className="accent-emerald-500 h-4 w-4" />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Retention enabled</span>
              <input type="checkbox" checked={policyForm.retentionEnabled} onChange={(e) => setPolicyForm({ ...policyForm, retentionEnabled: e.target.checked })} className="accent-emerald-500 h-4 w-4" />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Retention (days)</span>
              <input type="number" min={1} max={3285} value={policyForm.retentionDays} onChange={(e) => setPolicyForm({ ...policyForm, retentionDays: Number(e.target.value) })} className="w-28 rounded-lg bg-gray-900 border border-gray-700/60 px-2 py-1 text-xs text-white" />
            </label>
            <button onClick={savePolicy} disabled={busy === "policy"} className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 px-3 py-1.5 text-xs text-emerald-300">
              {busy === "policy" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save policy
            </button>
            <p className="text-[11px] text-gray-500">{policy?.summary}</p>
            {policy?.metadataOnly && (
              <p className="text-[11px] text-amber-400/90 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Payloads are redacted from the audit chain — hashes still verify.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><Download className="w-4 h-4 text-sky-400" /> Instant CSV export</h2>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[120px]">
              <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">Export</label>
              <select value={exportKind} onChange={(e) => setExportKind(e.target.value)} className="w-full rounded-lg bg-gray-900 border border-gray-700/60 px-2 py-1.5 text-xs">
                <option value="audit">Audit chain</option>
                <option value="evidence">Compliance evidence</option>
              </select>
            </div>
            {exportKind === "evidence" && (
              <div className="flex-1 min-w-[120px]">
                <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">Framework</label>
                <select value={exportFramework} onChange={(e) => setExportFramework(e.target.value)} className="w-full rounded-lg bg-gray-900 border border-gray-700/60 px-2 py-1.5 text-xs">
                  <option value="">All frameworks</option>
                  {(catalog?.frameworks || []).map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            )}
            <button onClick={exportCsv} disabled={busy === "export"} className="flex items-center gap-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 px-3 py-1.5 text-xs text-sky-300">
              {busy === "export" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileSearch className="w-3.5 h-3.5" />} Export CSV
            </button>
          </div>
          <p className="mt-2 text-[11px] text-gray-500">Row-for-row chain data (timestamp, action, hashes, merkle root) or per-control evidence — no API staging, instant download.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-amber-400" /> Retention</h2>
            <button onClick={applyRetention} disabled={busy === "retention"} className="flex items-center gap-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-3 py-1.5 text-xs text-amber-300">
              {busy === "retention" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Apply purge
            </button>
          </div>
          <p className="text-[11px] text-gray-500 mb-2">{retention?.summary}</p>
          <div className="space-y-1.5">
            {(Object.entries(retention?.counts || {})).map(([col, n]: any) => (
              <div key={col} className="flex items-center justify-between rounded-md bg-gray-900/60 border border-gray-700/50 px-2.5 py-1.5">
                <span className="font-mono text-[11px] text-gray-300">{col}</span>
                <span className="text-[11px] text-gray-400">{n}</span>
              </div>
            ))}
          </div>
          {retention?.cutoff && <p className="mt-2 text-[10px] text-gray-500">Cutoff: {new Date(retention.cutoff).toLocaleString()}</p>}
        </div>

        <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-violet-400" /> Directory lifecycle</h2>
            <span className="text-[10px] text-gray-500">{directory?.groups} group(s) · {directory?.users} user(s)</span>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">Email</label>
              <input value={dirEmail} onChange={(e) => setDirEmail(e.target.value)} placeholder="user@company.com" className="w-full rounded-lg bg-gray-900 border border-gray-700/60 px-2 py-1.5 text-xs text-white placeholder-gray-600" />
            </div>
            <div className="min-w-[110px]">
              <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">Status</label>
              <select value={dirStatus} onChange={(e) => setDirStatus(e.target.value)} className="w-full rounded-lg bg-gray-900 border border-gray-700/60 px-2 py-1.5 text-xs">
                <option value="active">active</option>
                <option value="suspended">suspended</option>
              </select>
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">Groups (comma)</label>
              <input value={dirGroups} onChange={(e) => setDirGroups(e.target.value)} placeholder="engineering, finance" className="w-full rounded-lg bg-gray-900 border border-gray-700/60 px-2 py-1.5 text-xs text-white placeholder-gray-600" />
            </div>
            <button onClick={syncDir} disabled={busy === "dirsync"} className="flex items-center gap-1.5 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 px-3 py-1.5 text-xs text-violet-300">
              {busy === "dirsync" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />} Sync
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">{directory?.activeUsers ?? 0} active</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-300">{directory?.suspendedUsers ?? 0} suspended</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700/60 text-gray-400">{directory?.deprovisionEvents ?? 0} deprovision events</span>
          </div>
          <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {(directory?.recent || []).slice(0, 6).map((e: any, i: number) => (
              <div key={i} className="rounded-md bg-gray-900/60 border border-gray-700/50 px-2.5 py-1.5">
                <p className="text-xs text-gray-300 truncate">{e.detail || e.category}</p>
                <p className="text-[10px] text-gray-500">{e.category} · {new Date(e.at).toLocaleTimeString()}</p>
              </div>
            ))}
            {!directory?.recent?.length && <p className="text-[11px] text-gray-500">No directory activity yet — sync a user to arm real-time de-provisioning.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
