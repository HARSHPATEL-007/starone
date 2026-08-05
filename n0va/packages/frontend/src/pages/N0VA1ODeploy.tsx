import React, { useEffect, useRef, useState } from "react";
import {
  Rocket, Server, Globe2, Activity, RefreshCw, Loader2, Plus,
  PlayCircle, Trash2, ListChecks, AlertTriangle, Wrench, CheckCircle2,
} from "lucide-react";
import { api } from "../api/client";

const unwrap = (r: any) => r?.data ?? r;

function SkeletonCard({ h = 28 }: { h?: number }) {
  return <div className="animate-pulse rounded-xl bg-gray-800/60 p-4"><div style={{ height: h }} className="rounded-md bg-gray-700/60" /></div>;
}

const STATUS_STYLE: Record<string, string> = {
  provisioning: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  failed: "bg-red-500/15 text-red-300 border-red-500/30",
  terminated: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

export default function N0VA1ODeploy() {
  const { addToast } = (window as any).useToast ? (window as any).useToast() : { addToast: () => {} };
  const toastRef = useRef<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [auto, setAuto] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [dash, setDash] = useState<any>(null);
  const [catalog, setCatalog] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [trouble, setTrouble] = useState<any>(null);
  const [troubleIssue, setTroubleIssue] = useState("");
  const [lastTrouble, setLastTrouble] = useState<any>(null);

  const [name, setName] = useState("");
  const [mode, setMode] = useState("managed");
  const [target, setTarget] = useState("docker");
  const [region, setRegion] = useState("us-east");
  const [vpcId, setVpcId] = useState("");
  const [cloudAccountId, setCloudAccountId] = useState("");
  const [showCreate, setShowCreate] = useState(false);

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
      const [d, c] = await Promise.all([
        api.adsMarketingModule.n0va1oDeployDashboard(),
        api.adsMarketingModule.n0va1oDeployCatalog(),
      ]);
      setDash(unwrap(d)); setCatalog(unwrap(c));
      setHealth(unwrap(await api.adsMarketingModule.n0va1oDeployHealth()));
      setTrouble(unwrap(await api.adsMarketingModule.n0va1oTroubleshootCatalog()));
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e?.message || "Failed to load deployment data");
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

  const runCreate = async () => {
    if (!name.trim()) { toast("Deployment name is required", "error"); return; }
    const d = await act("create", () =>
      api.adsMarketingModule.n0va1oDeployCreate({
        name: name.trim(), mode, target, region,
        vpcId: (mode === "vpc_peered" || mode === "hybrid") ? vpcId : undefined,
        cloudAccountId: mode === "byoc" ? cloudAccountId : undefined,
      }), "Deployment created");
    if (d) { setShowCreate(false); setName(""); setVpcId(""); setCloudAccountId(""); }
  };

  const runProvision = async (deploymentId: string) => {
    await act(`prov-${deploymentId}`, () => api.adsMarketingModule.n0va1oDeployProvision(deploymentId), "Provisioning started");
  };

  const runDelete = async (deploymentId: string) => {
    await act(`del-${deploymentId}`, () => api.adsMarketingModule.n0va1oDeployDelete(deploymentId), "Deployment terminated");
  };

  const runTrouble = async () => {
    if (!troubleIssue) { toast("Pick an issue to diagnose", "error"); return; }
    const d = await act("trouble", () => api.adsMarketingModule.n0va1oTroubleshoot(troubleIssue), "Diagnosis complete");
    if (d) setLastTrouble(unwrap(d));
  };

  const runResolve = async (issueId: string) => {
    await act(`res-${issueId}`, () => api.adsMarketingModule.n0va1oResolveIssue(issueId), "Issue resolved");
  };

  if (loading && !dash) {
    return (
      <div className="space-y-4 p-4 md:p-8">
        <SkeletonCard h={20} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} h={24} />)}
        </div>
        <SkeletonCard h={64} />
      </div>
    );
  }

  const deployments = dash?.deployments?.deployments || [];
  const stages = dash?.catalog?.stages || catalog?.stages || [];
  const onboarding = dash?.onboarding;
  const issues = dash?.issues || {};

  const statCards = [
    { label: "Deployments", value: dash?.deployments?.total ?? 0, icon: <Server className="h-4 w-4" />, color: "text-sky-300" },
    { label: "Active", value: health?.total ?? 0, icon: <Activity className="h-4 w-4" />, color: "text-emerald-300" },
    { label: "Avg health", value: health?.averageHealth != null ? `${health.averageHealth}/100` : "—", icon: <Globe2 className="h-4 w-4" />, color: "text-violet-300" },
    { label: "Onboarding", value: onboarding ? `${onboarding.progressPct}%` : "—", icon: <ListChecks className="h-4 w-4" />, color: "text-amber-300" },
  ];

  return (
    <div className="space-y-4 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-white">N0VA1O Deploy</h1>
          <p className="text-sm text-gray-400">Managed, BYOC, VPC-peered or hybrid gateways in 5 stages.</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="accent-violet-500" />
          Auto-refresh 30s
          <button onClick={loadAll} className="rounded-lg border border-gray-700 p-1.5 text-gray-300 hover:bg-gray-800" title="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </label>
      </div>

      {loadError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{loadError}</div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {statCards.map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-800 bg-gray-900/60 p-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">{c.icon}{c.label}</div>
            <div className={`mt-1 text-lg font-bold ${c.color}`}>{c.value}</div>
          </div>
        ))}
      </div>

      {dash?.summary && <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-3 text-sm text-gray-300">{dash.summary}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><ListChecks className="h-4 w-4 text-amber-300" />Onboarding checklist</h2>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] ${onboarding?.phase === "complete" ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300" : onboarding?.phase === "in_progress" ? "border-amber-500/30 bg-amber-500/15 text-amber-300" : "border-gray-700 bg-gray-800 text-gray-400"}`}>{onboarding?.phase}</span>
          </div>
          {onboarding && (
            <div className="mt-3">
              <div className="h-2 overflow-hidden rounded-full bg-gray-800">
                <div className="h-full rounded-full bg-amber-500" style={{ width: `${onboarding.progressPct}%` }} />
              </div>
              <div className="mt-1 text-[10px] text-gray-500">{onboarding.done}/{onboarding.total} steps complete</div>
              <div className="mt-2 space-y-1.5">
                {(onboarding.steps || []).map((s: any) => (
                  <div key={s.id} className="flex items-center gap-2 text-xs">
                    {s.done
                      ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      : <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-gray-600" />}
                    <span className={s.done ? "text-gray-300" : "text-gray-500"}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Rocket className="h-4 w-4 text-sky-300" />Deploy the gateway</h2>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-sky-500">
              <Plus className="h-3.5 w-3.5" /> New deployment
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {deployments.map((d: any) => (
              <div key={d.deploymentId} className="rounded-lg border border-gray-800 bg-gray-950/60 p-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium text-gray-200">{d.name}</div>
                    <div className="text-[10px] text-gray-500">{d.mode} · {d.target} · {d.region}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${STATUS_STYLE[d.status] || "border-gray-700 text-gray-400"}`}>{d.status}</span>
                    {d.vpcPeering && <span className="rounded-full border border-gray-700 px-2 py-0.5 font-mono text-[10px] text-gray-400">{d.vpcPeering.peeringId}</span>}
                    {d.status === "active" && (
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">health {d.healthScore ?? health?.deployments?.find((h: any) => h.deploymentId === d.deploymentId)?.healthScore ?? "—"}</span>
                    )}
                  </div>
                </div>
                {(d.status === "provisioning" || d.status === "failed") && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-800">
                    <div className={`h-full rounded-full ${d.status === "failed" ? "bg-red-500" : "bg-amber-500"}`} style={{ width: `${d.progress || 0}%` }} />
                  </div>
                )}
                {d.endpoints?.gatewayUrl && (
                  <code className="mt-1.5 block truncate text-[10px] text-emerald-300">{d.endpoints.gatewayUrl}</code>
                )}
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {d.status === "provisioning" && (
                    <button onClick={() => runProvision(d.deploymentId)} disabled={busy === `prov-${d.deploymentId}`}
                      className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-emerald-500 disabled:opacity-50">
                      {busy === `prov-${d.deploymentId}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlayCircle className="h-3 w-3" />} Provision
                    </button>
                  )}
                  {d.status !== "terminated" && (
                    <button onClick={() => runDelete(d.deploymentId)} disabled={busy === `del-${d.deploymentId}`}
                      className="flex items-center gap-1 rounded-lg border border-red-500/30 px-2 py-1 text-[10px] text-red-300 hover:bg-red-500/10 disabled:opacity-50">
                      {busy === `del-${d.deploymentId}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} Terminate
                    </button>
                  )}
                </div>
                {d.status === "failed" && d.stages?.some((s: any) => s.status === "failed") && (
                  <div className="mt-1.5 text-[10px] text-red-400">
                    {d.stages.filter((s: any) => s.status === "failed").map((s: any) => `${s.id}: ${s.error}`).join(" · ")}
                  </div>
                )}
              </div>
            ))}
            {deployments.length === 0 && <div className="text-xs text-gray-500">No deployments yet.</div>}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Globe2 className="h-4 w-4 text-emerald-300" />Health & alerts</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-400">
            {catalog?.modes?.map((m: any) => (
              <span key={m.id} className="rounded-full border border-gray-700 px-2 py-0.5 text-[10px] text-gray-400">{m.name}</span>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            {(health?.deployments || []).map((h: any) => (
              <div key={h.deploymentId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-800 bg-gray-950/60 p-2 text-[11px]">
                <div className="min-w-0">
                  <div className="truncate font-medium text-gray-200">{h.name}</div>
                  <div className="text-[10px] text-gray-500">uptime {h.uptimePct}% · latency {h.latencyMs}ms · {h.certificateStatus}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-800">
                    <div className={`h-full rounded-full ${h.healthScore >= 90 ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${h.healthScore}%` }} />
                  </div>
                  <span className="font-bold text-gray-200">{h.healthScore}</span>
                </div>
              </div>
            ))}
            {(health?.alerts || []).map((a: any, i: number) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-200">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{a.deploymentId}: {a.alert}
              </div>
            ))}
            {!health?.deployments?.length && <div className="text-xs text-gray-500">No active deployments.</div>}
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Wrench className="h-4 w-4 text-violet-300" />Troubleshooting</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select value={troubleIssue} onChange={(e) => setTroubleIssue(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-white">
              <option value="">Pick an issue…</option>
              {(trouble?.issues || []).map((t: any) => <option key={t.issue} value={t.issue}>{t.issue}</option>)}
            </select>
            <button onClick={runTrouble} disabled={busy === "trouble"}
              className="flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50">
              {busy === "trouble" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />} Diagnose
            </button>
          </div>
          {lastTrouble && (
            <div className="mt-3 rounded-lg border border-violet-500/30 bg-violet-500/10 p-2 text-[11px]">
              <div className="font-medium text-violet-200">{lastTrouble.issue}</div>
              <div className="mt-1 text-gray-300">{lastTrouble.diagnosis}</div>
              <div className="mt-1 text-emerald-300">{lastTrouble.resolution}</div>
              <div className="mt-1 text-[10px] text-gray-500">{lastTrouble.summary} · issue {lastTrouble.issueId}</div>
            </div>
          )}
          <div className="mt-3 space-y-1.5">
            {(issues.issues || []).map((i: any) => (
              <div key={i.issueId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-800 bg-gray-950/60 p-2 text-[11px]">
                <div className="min-w-0">
                  <div className="truncate text-gray-200">{i.issue}</div>
                  <div className="text-[10px] text-gray-500">{i.issueId}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] ${i.status === "open" ? "border-amber-500/30 bg-amber-500/15 text-amber-300" : "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"}`}>{i.status}</span>
                  {i.status === "open" && (
                    <button onClick={() => runResolve(i.issueId)} disabled={busy === `res-${i.issueId}`}
                      className="flex items-center gap-1 rounded-lg border border-emerald-500/30 px-2 py-1 text-[10px] text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50">
                      {busy === `res-${i.issueId}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />} Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
            {!issues.issues?.length && <div className="text-xs text-gray-500">No reported issues.</div>}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Activity className="h-4 w-4 text-amber-300" />Stages & recent activity</h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(stages || []).map((s: any) => (
            <span key={s.id} className="rounded-full border border-gray-700 px-2 py-0.5 text-[10px] text-gray-400">{s.name}</span>
          ))}
        </div>
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          {(dash?.log?.entries || []).slice(0, 12).map((l: any, i: number) => (
            <div key={i} className="rounded-lg border border-gray-800 bg-gray-950/60 p-2 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-[10px] text-sky-300">{l.category}</span>
                <span className="shrink-0 text-[10px] text-gray-600">{new Date(l.at).toLocaleTimeString()}</span>
              </div>
              <div className="mt-0.5 text-gray-400">{l.detail}</div>
            </div>
          ))}
          {!dash?.log?.entries?.length && <div className="text-xs text-gray-500">No deployment activity yet.</div>}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-sm rounded-xl border border-gray-700 bg-gray-900 p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-white">New deployment</h3>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Deployment name"
              className="mt-3 w-full rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-white placeholder-gray-600" />
            <div className="mt-2 grid grid-cols-3 gap-2">
              <select value={mode} onChange={(e) => setMode(e.target.value)} className="rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-white">
                {(catalog?.modes || []).map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <select value={target} onChange={(e) => setTarget(e.target.value)} className="rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-white">
                {(catalog?.targets || []).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select value={region} onChange={(e) => setRegion(e.target.value)} className="rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-white">
                {(catalog?.regions || []).map((r: any) => <option key={r.id} value={r.id}>{r.id}</option>)}
              </select>
            </div>
            {(mode === "vpc_peered" || mode === "hybrid") && (
              <input value={vpcId} onChange={(e) => setVpcId(e.target.value)} placeholder="VPC ID (required for VPC modes)"
                className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-white placeholder-gray-600" />
            )}
            {mode === "byoc" && (
              <input value={cloudAccountId} onChange={(e) => setCloudAccountId(e.target.value)} placeholder="Cloud account ID (required for BYOC)"
                className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-white placeholder-gray-600" />
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800">Cancel</button>
              <button onClick={runCreate} disabled={busy === "create"} className="flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50">
                {busy === "create" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
