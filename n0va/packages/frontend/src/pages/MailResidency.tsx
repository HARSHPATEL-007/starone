import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw, Plus, X, Globe2, Lock, ShieldAlert, FileCheck2, ArrowRightLeft, ScrollText, Landmark,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const CLASS_LABELS: Record<string, string> = {
  messages: "Messages", contacts: "Contacts", attachments: "Attachments",
  analytics: "Analytics", backups: "Backups", ai_models: "AI models",
};

const levelColor: Record<string, string> = {
  hardened: "bg-emerald-500/15 text-emerald-400",
  partial: "bg-amber-500/15 text-amber-400",
  default: "bg-red-500/15 text-red-400",
};

export default function MailResidency() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [catalog, setCatalog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [policyClass, setPolicyClass] = useState("messages");
  const [policyRegion, setPolicyRegion] = useState("eu");
  const [policyStrict, setPolicyStrict] = useState(true);
  const [showPolicy, setShowPolicy] = useState(false);
  const [showLock, setShowLock] = useState(false);
  const [lockRegion, setLockRegion] = useState("eu");
  const [lockNote, setLockNote] = useState("");
  const [breachRegion, setBreachRegion] = useState("eu");
  const [breachDetail, setBreachDetail] = useState("");
  const [showBreach, setShowBreach] = useState(false);
  const [certRegion, setCertRegion] = useState("eu");
  const [cert, setCert] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [reportRegion, setReportRegion] = useState("eu");

  const loadAll = useCallback(async () => {
    const [d, c] = await Promise.all([
      api.adsMarketingModule.mailResidencyDashboard().catch(() => null),
      api.adsMarketingModule.mailResidencyRegions().catch(() => null),
    ]);
    setDash(unwrap(d));
    setCatalog(unwrap(c));
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    function refresh() { loadAll(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadAll]);

  async function setPolicy() {
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailResidencySetPolicy(policyClass, policyRegion, policyStrict));
      addToast("success", "Policy updated", r?.summary || "");
      setShowPolicy(false);
      await loadAll();
    } catch (e: any) {
      addToast("error", "Update failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function placeLock() {
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailResidencyLock(lockRegion, lockNote.trim() || undefined));
      addToast("success", "Sovereign lock", r?.summary || "");
      setShowLock(false);
      setLockNote("");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Lock failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function releaseLock(lockId: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailResidencyReleaseLock(lockId));
      addToast("success", "Lock released", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Release failed", e?.message);
    }
  }

  async function fileBreach() {
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailResidencyBreach(breachRegion, breachDetail.trim() || undefined));
      addToast("success", "Breach notified", r?.summary || "");
      setShowBreach(false);
      setBreachDetail("");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Notification failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function getCert() {
    const r = unwrap(await api.adsMarketingModule.mailResidencyCertificate(certRegion));
    setCert(r);
  }

  async function getReport() {
    const r = unwrap(await api.adsMarketingModule.mailResidencyReport(reportRegion));
    setReport(r);
  }

  const st = dash?.status;
  const flows = dash?.flow?.flows || [];
  const locks = dash?.locks?.locks || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Globe2 className="w-6 h-6 text-n0va-400" /> Data residency & sovereignty</h1>
          <p className="text-gray-500 mt-1 text-sm">{dash?.summary || "Region pinning, sovereign locks and breach notification"}</p>
        </div>
        <button className="btn-secondary p-2" onClick={loadAll} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card p-4">
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-white">{st?.level || "default"}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${levelColor[st?.level] || "bg-red-500/15 text-red-400"}`}>{st?.strictClasses || 0}/{st?.totalClasses || 6}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Residency level</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{dash?.flow?.activeRegions || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Active flow regions</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{dash?.locks?.open || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Sovereign locks</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{st?.breaches || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Breaches on file</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Lock className="w-4 h-4 text-n0va-400" /> Data class residency</h3>
                <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => { setShowPolicy(true); }}>
                  <Plus className="w-3 h-3" /> Pin class
                </button>
              </div>
              <div className="space-y-2">
                {(st?.policies || []).map((p: any) => (
                  <div key={p.dataClass} className="flex items-center gap-2 text-sm border border-gray-800 rounded-lg px-3 py-2">
                    <span className="text-gray-300 truncate">{CLASS_LABELS[p.dataClass] || p.dataClass}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-n0va-500/15 text-n0va-300 ml-auto shrink-0">{p.regionName}</span>
                    {p.strict && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 shrink-0">strict</span>}
                    {p.mandatory && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 shrink-0">mandatory</span>}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-600">{catalog?.summary}</p>
            </div>

            <div className="card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><ArrowRightLeft className="w-4 h-4 text-n0va-400" /> Data flow monitor</h3>
              <div className={`text-[11px] px-2.5 py-1.5 rounded inline-block ${dash?.flow?.verdict === "compliant" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                {dash?.flow?.verdict === "compliant" ? "Compliant" : "Review needed"} · ~{Math.round((dash?.flow?.egressBytes || 0) / 1000)} KB egress
              </div>
              <div className="space-y-2">
                {flows.map((f: any) => (
                  <div key={f.regionId} className="flex items-center gap-2 text-sm border border-gray-800 rounded-lg px-3 py-2">
                    <span className="text-gray-300 truncate">{f.regionName}</span>
                    <span className="text-[10px] text-gray-500 ml-auto shrink-0">{f.count} class(es)</span>
                    <span className="text-[10px] text-gray-600 shrink-0 hidden sm:inline">{f.transitEncryption}</span>
                  </div>
                ))}
                {!flows.length && <p className="text-xs text-gray-600">No active flows yet.</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Landmark className="w-4 h-4 text-n0va-400" /> Sovereign locks</h3>
                <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => { setShowLock(true); }}>
                  <Plus className="w-3 h-3" /> Place lock
                </button>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {locks.map((l: any) => (
                  <div key={l._id} className={`border rounded-lg px-3 py-2 ${l.status === "active" ? "border-gray-800" : "border-gray-800 opacity-50"}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${l.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-500/10 text-gray-400"}`}>{l.status}</span>
                      <span className="text-sm text-white truncate">{l.regionName}</span>
                      {l.status === "active" && (
                        <button className="text-gray-600 hover:text-amber-400 text-[11px] ml-auto shrink-0" onClick={() => releaseLock(l._id)}>Release</button>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-600 truncate font-mono">{l._id}</p>
                  </div>
                ))}
                {!locks.length && <p className="text-xs text-gray-600">No sovereign locks - place one to guarantee GAR control.</p>}
              </div>
            </div>

            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><FileCheck2 className="w-4 h-4 text-n0va-400" /> Residency certificate</h3>
                <select className="select text-xs w-32" value={certRegion} onChange={(e) => setCertRegion(e.target.value)}>
                  {(catalog?.regions || []).map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <button className="btn-primary text-xs" onClick={getCert}>Issue certificate</button>
              {cert && (
                <div className="border border-gray-800 rounded-lg p-3 space-y-1.5">
                  <p className="text-xs text-white font-mono">{cert.certificateId}</p>
                  <p className="text-[11px] text-gray-400">{cert.regionName} · {cert.classCount} class(es) · {cert.issuedOn}</p>
                  <p className="text-[10px] text-gray-600 break-all font-mono">{cert.verificationHash}</p>
                  <div className="flex gap-1 flex-wrap">{(cert.guarantees || []).map((g: string, i: number) => <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-500/10 text-gray-400">{g}</span>)}</div>
                </div>
              )}
            </div>

            <div className="card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-n0va-400" /> Breach & jurisdiction</h3>
              <div className="flex gap-2">
                <button className="btn-secondary text-xs" onClick={getReport} title="Report for selected region">Jurisdiction report</button>
                <button className="text-red-400 border border-red-500/30 hover:bg-red-500/10 text-xs px-3 py-1.5 rounded-lg" onClick={() => { setShowBreach(true); }}>Notify breach</button>
              </div>
              {report && (
                <div className="border border-gray-800 rounded-lg p-3 space-y-1">
                  <p className="text-xs text-white">{report.regionName}</p>
                  <p className="text-[11px] text-gray-400">{report.dataCenter}</p>
                  <p className="text-[10px] text-gray-500">{report.guarantee}</p>
                  <div className="flex gap-1.5 text-[10px] text-gray-500 flex-wrap">
                    <span>Classes: {report.dataClasses.length}</span>
                    <span>Strict: {report.strictClasses}</span>
                    <span>Locks: {report.sovereignLocks}</span>
                    <span>Breaches: {report.breachCount}</span>
                  </div>
                  <p className={`text-[10px] ${report.compliant ? "text-emerald-400" : "text-amber-400"}`}>{report.compliant ? "Compliant" : "No data class resident"}</p>
                </div>
              )}
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><ScrollText className="w-4 h-4 text-n0va-400" /> Residency events</h3>
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {(dash?.recentLog || []).map((l: any) => (
                <p key={l.entryId} className="text-[11px] text-gray-500 truncate"><span className="text-n0va-300">{l.category}</span> — {l.detail}</p>
              ))}
              {!dash?.recentLog?.length && <p className="text-xs text-gray-600">No residency events yet.</p>}
            </div>
          </div>
        </>
      )}

      {showPolicy && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-gray-900">
              <h2 className="font-semibold text-white flex items-center gap-2"><Lock className="w-4 h-4 text-n0va-400" /> Pin data class</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setShowPolicy(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Data class</label>
                <select className="select" value={policyClass} onChange={(e) => setPolicyClass(e.target.value)}>
                  {Object.keys(CLASS_LABELS).map((c) => <option key={c} value={c}>{CLASS_LABELS[c]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Region</label>
                <select className="select" value={policyRegion} onChange={(e) => setPolicyRegion(e.target.value)}>
                  {(catalog?.regions || []).map((r: any) => <option key={r.id} value={r.id}>{r.name} · {r.dataCenter}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-400">
                <input type="checkbox" className="accent-n0va-500" checked={policyStrict} onChange={(e) => setPolicyStrict(e.target.checked)} />
                Strict mode (no cross-border transfer)
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button className="btn-secondary text-sm" onClick={() => setShowPolicy(false)}>Cancel</button>
                <button className="btn-primary text-sm" disabled={busy} onClick={setPolicy}>Apply policy</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLock && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-gray-900">
              <h2 className="font-semibold text-white flex items-center gap-2"><Landmark className="w-4 h-4 text-n0va-400" /> Place sovereign lock</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setShowLock(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Region</label>
                <select className="select" value={lockRegion} onChange={(e) => setLockRegion(e.target.value)}>
                  {(catalog?.regions || []).map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Note</label>
                <input className="input" placeholder="e.g. EU customer data" value={lockNote} onChange={(e) => setLockNote(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button className="btn-secondary text-sm" onClick={() => setShowLock(false)}>Cancel</button>
                <button className="btn-primary text-sm" disabled={busy} onClick={placeLock}>Place lock</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBreach && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-gray-900">
              <h2 className="font-semibold text-white flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-n0va-400" /> Notify breach</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setShowBreach(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Region</label>
                <select className="select" value={breachRegion} onChange={(e) => setBreachRegion(e.target.value)}>
                  {(catalog?.regions || []).map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Detail</label>
                <input className="input" placeholder="What was exposed?" value={breachDetail} onChange={(e) => setBreachDetail(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button className="btn-secondary text-sm" onClick={() => setShowBreach(false)}>Cancel</button>
                <button className="btn-primary text-sm" disabled={busy} onClick={fileBreach}>Submit disclosure</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
