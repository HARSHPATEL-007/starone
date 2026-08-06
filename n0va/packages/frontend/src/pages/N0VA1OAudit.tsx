import React, { useEffect, useRef, useState } from "react";
import {
  ShieldCheck, RefreshCw, Loader2, Download, Trash2, Users, Activity,
  Fingerprint, Save, AlertTriangle, Link2,
} from "lucide-react";
import { api } from "../api/client";

const unwrap = (r: any) => r?.data ?? r;

function SkeletonCard({ h = 28 }: { h?: number }) {
  return <div className="animate-pulse rounded-xl bg-gray-800/60 p-4"><div style={{ height: h }} className="rounded-md bg-gray-700/60" /></div>;
}

export default function N0VA1OAudit() {
  const { addToast } = (window as any).useToast ? (window as any).useToast() : { addToast: () => {} };
  const toastRef = useRef<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [auto, setAuto] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [dash, setDash] = useState<any>(null);
  const [chain, setChain] = useState<any>(null);
  const [groups, setGroups] = useState<any>(null);
  const [dirLog, setDirLog] = useState<any>(null);
  const [auditLog, setAuditLog] = useState<any>(null);
  const [exportRes, setExportRes] = useState<any>(null);

  const [metaOnly, setMetaOnly] = useState(false);
  const [retentionEnabled, setRetentionEnabled] = useState(true);
  const [retentionDays, setRetentionDays] = useState(365);
  const [expiryLabel, setExpiryLabel] = useState("expired");

  const [syncEmail, setSyncEmail] = useState("");
  const [syncStatus, setSyncStatus] = useState("active");
  const [pulseEmail, setPulseEmail] = useState("");
  const [pulseRes, setPulseRes] = useState<any>(null);

  const [exportKind, setExportKind] = useState("audit");
  const [exportFramework, setExportFramework] = useState("gdpr");

  const toast = (t: string, type: "success" | "error" | "info" = "success") => {
    if (toastRef.current) toastRef.current(t, type);
    else if (addToast && typeof addToast === "function") addToast(t, type);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [d, c, g, dl, al] = await Promise.all([
        api.adsMarketingModule.n0va1oAuditDashboard(),
        api.adsMarketingModule.n0va1oVerifyAuditChain(),
        api.adsMarketingModule.n0va1oDirectoryGroups(),
        api.adsMarketingModule.n0va1oDirectoryLog(15),
        api.adsMarketingModule.n0va1oAuditCenterLog(15),
      ]);
      const dd = unwrap(d);
      setDash(dd); setChain(unwrap(c)); setGroups(unwrap(g));
      setDirLog(unwrap(dl)); setAuditLog(unwrap(al));
      setMetaOnly(!!dd?.policy?.metadataOnly);
      setRetentionEnabled(!!dd?.policy?.retentionEnabled);
      setRetentionDays(dd?.policy?.retentionDays ?? 365);
      setExpiryLabel(dd?.policy?.expiryLabel || "expired");
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e?.message || "Failed to load audit data");
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

  const savePolicy = async () => {
    const d = await act("policy", () => api.adsMarketingModule.n0va1oSetAuditPolicy({ metadataOnly: metaOnly, retentionEnabled, retentionDays: Number(retentionDays), expiryLabel }), "Audit policy saved");
    if (d) toast(d.summary || "Audit policy saved");
  };

  const runExport = async () => {
    const d = await act("export", () => api.adsMarketingModule.n0va1oExportAuditCsv(exportKind, exportKind === "evidence" ? exportFramework : undefined), "Audit CSV exported");
    if (d) setExportRes(d);
  };

  const syncUser = async () => {
    if (!syncEmail.trim()) { toast("Enter an email to sync", "error"); return; }
    const d = await act("sync", () => api.adsMarketingModule.n0va1oSyncDirectory({ email: syncEmail.trim(), status: syncStatus }), "Directory user synced");
    if (d) setSyncEmail("");
  };

  const runPulse = async () => {
    if (!pulseEmail.trim()) { toast("Enter an email for the pulse", "error"); return; }
    const d = await act("pulse", () => api.adsMarketingModule.n0va1oSimulateDirectoryPulse(pulseEmail.trim()), "Directory pulse armed");
    if (d) setPulseRes(d);
  };

  if (loading && !dash) {
    return <div className="space-y-4"><SkeletonCard h={80} /><SkeletonCard /><SkeletonCard /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Audit Center</h1>
          <p className="text-sm text-gray-400">Spec §9.1/§9.2 — tamper-proof audit chain, retention policy, directory lifecycle sync</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadAll} className="rounded-lg border border-gray-700 p-2 text-gray-300 hover:bg-gray-800" title="Refresh"><RefreshCw size={16} /></button>
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="accent-violet-500" /> Auto 30s
          </label>
        </div>
      </div>

      {loadError && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{loadError}</div>}

      {chain && (
        <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${chain.chainIntact ? "border-emerald-500/30 bg-emerald-500/10" : "border-red-500/30 bg-red-500/10"}`}>
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} className={chain.chainIntact ? "text-emerald-300" : "text-red-300"} />
            <div>
              <p className={`text-sm font-semibold ${chain.chainIntact ? "text-emerald-200" : "text-red-200"}`}>
                Audit chain {chain.chainIntact ? "INTACT" : "BROKEN"} — {chain.entries} entr(ies) hash-verified
              </p>
              <p className="text-xs text-gray-400">{chain.summary || ""}{chain.brokenAt ? ` — broken at ${chain.brokenAt}` : ""}</p>
            </div>
          </div>
          <button onClick={() => act("verify", () => api.adsMarketingModule.n0va1oVerifyAuditChain(), "Chain re-verified")} className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800">
            Re-verify
          </button>
        </div>
      )}

      {dash && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Retention", value: dash.retention?.retentionEnabled ? `${dash.retention.retentionDays} days` : "Off", icon: <Trash2 size={16} /> },
            { label: "Metadata-only", value: dash.policy?.metadataOnly ? "ON" : "OFF", icon: <Fingerprint size={16} /> },
            { label: "Directory users", value: `${dash.directory?.activeUsers ?? 0} active`, icon: <Users size={16} /> },
            { label: "Purged ready", value: Object.values(dash.retention?.counts || {}).reduce((a: number, b: any) => a + Number(b || 0), 0), icon: <Activity size={16} /> },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-gray-800 bg-gray-900/60 p-3">
              <div className="flex items-center gap-2 text-gray-400">{c.icon}<span className="text-xs">{c.label}</span></div>
              <div className="mt-1 text-xl font-bold text-white">{c.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-200">Audit policy</h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between rounded-lg bg-gray-800/50 px-3 py-2 text-sm text-gray-300">
              Metadata-only redaction
              <input type="checkbox" checked={metaOnly} onChange={(e) => setMetaOnly(e.target.checked)} className="accent-violet-500" />
            </label>
            <label className="flex items-center justify-between rounded-lg bg-gray-800/50 px-3 py-2 text-sm text-gray-300">
              Retention enabled
              <input type="checkbox" checked={retentionEnabled} onChange={(e) => setRetentionEnabled(e.target.checked)} className="accent-violet-500" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-gray-400">Retention days</label>
                <input type="number" value={retentionDays} onChange={(e) => setRetentionDays(Number(e.target.value))} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Expiry label</label>
                <input value={expiryLabel} onChange={(e) => setExpiryLabel(e.target.value)} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={savePolicy} disabled={busy === "policy"} className="flex items-center gap-1 rounded-lg bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-500 disabled:opacity-50">
                {busy === "policy" ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save policy
              </button>
              <button onClick={() => act("retention", () => api.adsMarketingModule.n0va1oApplyRetention(), "Retention purge complete")} disabled={busy === "retention"} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-50">
                Apply purge
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-200">Retention — entries per collection</h2>
          <div className="space-y-2">
            {Object.entries(dash?.retention?.counts || {}).map(([col, n]: any) => (
              <div key={col} className="flex items-center justify-between rounded-lg bg-gray-800/50 px-3 py-2 text-sm">
                <span className="font-mono text-xs text-gray-300">{col}</span>
                <span className="text-gray-400">{n} entries</span>
              </div>
            ))}
            {Object.keys(dash?.retention?.counts || {}).length === 0 && <p className="text-sm text-gray-500">No data</p>}
          </div>
          <p className="mt-3 text-xs text-gray-500">{dash?.retention?.summary}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-200"><Users size={14} /> Directory lifecycle</h2>
          <div className="space-y-2 text-xs text-gray-400">
            <p><b className="text-gray-200">{groups?.total ?? 0}</b> group(s) · <b className="text-gray-200">{dash?.directory?.users ?? 0}</b> user(s) · <b className="text-gray-200">{dash?.directory?.suspendedUsers ?? 0}</b> suspended</p>
            <div className="flex flex-wrap gap-1.5">
              {(groups?.groups || []).map((g: any) => (
                <span key={g.groupId} className="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] text-gray-300">{g.name} ({g.members})</span>
              ))}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-gray-800 pt-3">
            <input value={syncEmail} onChange={(e) => setSyncEmail(e.target.value)} placeholder="user@company.com" className="min-w-[160px] flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500" />
            <select value={syncStatus} onChange={(e) => setSyncStatus(e.target.value)} className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white">
              <option value="active">active</option>
              <option value="suspended">suspended</option>
              <option value="deprovision">deprovision</option>
            </select>
            <button onClick={syncUser} disabled={busy === "sync"} className="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-500 disabled:opacity-50">
              {busy === "sync" ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />} Sync
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <input value={pulseEmail} onChange={(e) => setPulseEmail(e.target.value)} placeholder="email for pulse" className="min-w-[160px] flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500" />
            <button onClick={runPulse} disabled={busy === "pulse"} className="rounded-lg border border-violet-500/40 px-4 py-2 text-sm text-violet-300 hover:bg-violet-600/10 disabled:opacity-50">
              {busy === "pulse" ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />} Pulse
            </button>
          </div>
          {pulseRes && (
            <div className="mt-2 rounded-lg border border-violet-500/30 bg-violet-600/10 p-2 text-xs text-violet-200">
              {pulseRes.summary} — heartbeat {pulseRes.heartbeatMs}ms, sync {pulseRes.syncLatencyMs}ms, {pulseRes.identity.directoryId}
            </div>
          )}
          <div className="mt-3 max-h-40 space-y-1.5 overflow-y-auto">
            {(dirLog?.entries || []).map((e: any, i: number) => (
              <div key={i} className="rounded-lg bg-gray-800/50 px-3 py-1.5 text-xs">
                <span className="text-gray-400">{new Date(e.at || e.createdAt).toLocaleString()}</span>
                <span className="mx-2 text-gray-600">·</span>
                <span className="text-gray-200">{e.detail}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-200"><Download size={14} /> Export CSV</h2>
          <div className="flex flex-wrap items-end gap-2">
            <select value={exportKind} onChange={(e) => setExportKind(e.target.value)} className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white">
              <option value="audit">Audit chain</option>
              <option value="evidence">Compliance evidence</option>
            </select>
            {exportKind === "evidence" && (
              <select value={exportFramework} onChange={(e) => setExportFramework(e.target.value)} className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white">
                {["gdpr", "hipaa", "soc2", "fedramp", "pci", "nis2", "iso27001"].map((f) => <option key={f} value={f}>{f.toUpperCase()}</option>)}
              </select>
            )}
            <button onClick={runExport} disabled={busy === "export"} className="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-500 disabled:opacity-50">
              {busy === "export" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export
            </button>
          </div>
          {exportRes && (
            <div className="mt-3 rounded-lg border border-violet-500/30 bg-violet-600/10 p-3 text-xs text-violet-200">
              <p className="mb-1 font-medium">{exportRes.filename || exportRes.summary}</p>
              <p>{exportRes.summary} — {exportRes.rows ?? 0} row(s), {exportRes.sizeBytes ?? exportRes.bytes ?? 0} bytes</p>
            </div>
          )}
          <h3 className="mb-2 mt-5 text-xs font-semibold text-gray-300">Audit events</h3>
          <div className="max-h-56 space-y-1.5 overflow-y-auto">
            {(auditLog?.entries || auditLog?.log || []).map((e: any, i: number) => (
              <div key={i} className="rounded-lg bg-gray-800/50 px-3 py-1.5 text-xs">
                <span className="text-gray-400">{new Date(e.timestamp || e.at || e.createdAt).toLocaleString()}</span>
                <span className="mx-2 text-gray-600">·</span>
                <span className="text-gray-200">{e.action || e.category} — {(e.detail || e.summary || "").slice(0, 80)}</span>
              </div>
            ))}
            {!(auditLog?.entries || auditLog?.log || []).length && <p className="text-sm text-gray-500">No audit events yet.</p>}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200/80">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        <span>Audit rows are hash-chained (contentHash + chainHash + merkle root). Metadata-only mode redacts payload details while keeping the chain verifiable.</span>
      </div>
    </div>
  );
}
