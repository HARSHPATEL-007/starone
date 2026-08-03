import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw, Plus, X, KeyRound, RadioTower, ShieldCheck, FileKey, RefreshCcw, Trash2, Lock, ScrollText,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const emptyKey = { algorithm: "kyber_1024", purpose: "email_encryption", label: "" };
const emptyChannel = { name: "" };
const emptyCert = { commonName: "", algorithm: "dilithium_5", validityDays: "365" };

export default function MailQuantum() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [algorithms, setAlgorithms] = useState<any[]>([]);
  const [chain, setChain] = useState<any>(null);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [keyForm, setKeyForm] = useState(emptyKey);
  const [showChannel, setShowChannel] = useState(false);
  const [channelForm, setChannelForm] = useState(emptyChannel);
  const [showCert, setShowCert] = useState(false);
  const [certForm, setCertForm] = useState(emptyCert);

  const loadAll = useCallback(async () => {
    const [d, a, c, e] = await Promise.all([
      api.adsMarketingModule.mailQuantumDashboard().catch(() => null),
      api.adsMarketingModule.mailQuantumAlgorithms().catch(() => null),
      api.adsMarketingModule.mailQuantumChain().catch(() => null),
      api.adsMarketingModule.mailQuantumQkdExchanges().catch(() => null),
    ]);
    setDash(unwrap(d));
    const aR = unwrap(a);
    setAlgorithms(Array.isArray(aR) ? aR : aR?.algorithms || []);
    setChain(unwrap(c));
    const eR = unwrap(e);
    setExchanges(Array.isArray(eR) ? eR : eR?.exchanges || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    function refresh() { loadAll(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadAll]);

  async function createKey() {
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailQuantumCreateKey({ ...keyForm, label: keyForm.label || undefined }));
      addToast("success", "Key pair created", r?.summary || "");
      setShowKey(false);
      setKeyForm(emptyKey);
      await loadAll();
    } catch (e: any) {
      addToast("error", "Create failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function keyAction(keyId: string, action: "rotate" | "revoke") {
    try {
      const r = unwrap(await api.adsMarketingModule[action === "rotate" ? "mailQuantumRotateKey" : "mailQuantumRevokeKey"](keyId));
      addToast("success", action === "rotate" ? "Key rotated" : "Key revoked", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Action failed", e?.message);
    }
  }

  async function createChannel() {
    if (!channelForm.name.trim()) {
      addToast("warning", "Missing name", "Channel name is required.");
      return;
    }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailQuantumCreateQkd({ name: channelForm.name.trim() }));
      addToast("success", "QKD channel created", r?.summary || "");
      setShowChannel(false);
      setChannelForm(emptyChannel);
      await loadAll();
    } catch (e: any) {
      addToast("error", "Create failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function simulate(channelId: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailQuantumSimulateQkd(channelId));
      addToast("success", "Key exchange", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Exchange failed", e?.message);
    }
  }

  async function issueCert() {
    if (!certForm.commonName.trim()) {
      addToast("warning", "Missing CN", "Common name is required.");
      return;
    }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailQuantumIssueCert({
        commonName: certForm.commonName.trim(),
        algorithm: certForm.algorithm,
        validityDays: Number(certForm.validityDays) || 365,
      }));
      addToast("success", "Certificate issued", r?.summary || "");
      setShowCert(false);
      setCertForm(emptyCert);
      await loadAll();
    } catch (e: any) {
      addToast("error", "Issue failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function certAction(certId: string, action: "renew" | "revoke") {
    try {
      const r = unwrap(await api.adsMarketingModule[action === "renew" ? "mailQuantumRenewCert" : "mailQuantumRevokeCert"](certId));
      addToast("success", action === "renew" ? "Certificate renewed" : "Certificate revoked", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Action failed", e?.message);
    }
  }

  const levelColor = dash?.level === "hardened" ? "bg-emerald-500/15 text-emerald-400" : dash?.level === "transitioning" ? "bg-amber-500/15 text-amber-400" : "bg-red-500/15 text-red-400";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Lock className="w-6 h-6 text-n0va-400" /> Quantum security</h1>
          <p className="text-gray-500 mt-1 text-sm">{dash?.summary || "Post-quantum encryption, QKD and PQC certificates"}</p>
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
                <p className="text-2xl font-bold text-white">{dash?.readiness || 0}%</p>
                <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${levelColor}`}>{dash?.level || "unknown"}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Quantum readiness</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{dash?.keyCount || 0}</p>
              <p className="text-xs text-gray-500 mt-1">PQC keys active</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{dash?.qkdCount || 0}</p>
              <p className="text-xs text-gray-500 mt-1">QKD channels</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{dash?.certCount || 0}</p>
              <p className="text-xs text-gray-500 mt-1">PQC certificates</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card p-4 lg:col-span-1 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-n0va-400" /> Readiness layers</h3>
              <div className="space-y-3">
                {(dash?.layers || []).map((l: any, i: number) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-400 truncate">{l.label}</span>
                      <span className={`shrink-0 ${l.status === "ready" ? "text-emerald-400" : l.status === "partial" ? "text-amber-400" : "text-red-400"}`}>{l.pct}% · {l.active}/{l.needed}</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${l.status === "ready" ? "bg-emerald-500" : l.status === "partial" ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${l.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-1 space-y-1">
                {(dash?.recommendations || []).map((r: string, i: number) => (
                  <p key={i} className="text-[11px] text-gray-500 flex gap-1.5"><span className="text-n0va-400 shrink-0">→</span>{r}</p>
                ))}
              </div>
            </div>

            <div className="card p-4 lg:col-span-2 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><FileKey className="w-4 h-4 text-n0va-400" /> PQC algorithm catalog</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {algorithms.map((a: any) => (
                  <div key={a.id} className="border border-gray-800 rounded-lg p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white">{a.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase ml-auto shrink-0 ${a.status === "nist_standardized" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>{a.type}</span>
                    </div>
                    <p className="text-[10px] text-gray-500">{a.securityBits}-bit · {a.status === "nist_standardized" ? "NIST standardized" : "NIST finalist"}</p>
                    <p className="text-[10px] text-gray-600 truncate" title={a.note}>{a.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><KeyRound className="w-4 h-4 text-n0va-400" /> Key vault</h3>
                <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => { setKeyForm(emptyKey); setShowKey(true); }}>
                  <Plus className="w-3 h-3" /> New key
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(dash?.keys?.keys || []).map((k: any) => (
                  <div key={k.keyId} className={`border rounded-lg p-3 space-y-1.5 ${k.status === "active" ? "border-gray-800" : "border-gray-800 opacity-60"}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${k.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-500/10 text-gray-400"}`}>{k.status}</span>
                      <span className="text-sm font-medium text-white truncate">{k.label}</span>
                      <span className="text-[10px] text-n0va-300 ml-auto shrink-0 font-mono">{k.publicFingerprint}</span>
                    </div>
                    <p className="text-[11px] text-gray-500">{k.algorithmName} · {k.securityBits}-bit · {k.purpose}</p>
                    {k.status === "active" && (
                      <div className="flex gap-1.5 pt-0.5">
                        <button className="btn-secondary text-[11px] flex items-center gap-1" onClick={() => keyAction(k.keyId, "rotate")}><RefreshCcw className="w-3 h-3" /> Rotate</button>
                        <button className="text-gray-600 hover:text-red-400 text-[11px] flex items-center gap-1 ml-auto" onClick={() => keyAction(k.keyId, "revoke")}><Trash2 className="w-3 h-3" /> Revoke</button>
                      </div>
                    )}
                  </div>
                ))}
                {!dash?.keys?.keys?.length && <p className="text-xs text-gray-600">No key pairs — create a Kyber-1024 key to start.</p>}
              </div>
            </div>

            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><RadioTower className="w-4 h-4 text-n0va-400" /> QKD channels</h3>
                <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => { setChannelForm(emptyChannel); setShowChannel(true); }}>
                  <Plus className="w-3 h-3" /> New channel
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(dash?.channels?.channels || []).map((c: any) => (
                  <div key={c.channelId} className="border border-gray-800 rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">{c.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-n0va-500/15 text-n0va-300 ml-auto shrink-0">{c.keyRateKbps} kbps</span>
                    </div>
                    <p className="text-[11px] text-gray-500">{c.distanceKm} km · QBER {c.errorRatePct}% · {c.securityLevel}</p>
                    <button className="btn-secondary text-[11px]" onClick={() => simulate(c.channelId)}>Run key exchange</button>
                  </div>
                ))}
                {!dash?.channels?.channels?.length && <p className="text-xs text-gray-600">No QKD channels — establish one for quantum key distribution.</p>}
              </div>
              {exchanges.length > 0 && (
                <div className="border-t border-gray-800 pt-2">
                  <p className="text-[11px] text-gray-500 mb-1.5">Recent exchanges</p>
                  <div className="space-y-1">
                    {exchanges.slice(0, 3).map((e: any) => (
                      <p key={e.exchangeId} className="text-[11px] text-gray-600 truncate">
                        <span className={e.eavesdropCheck === "clean" ? "text-emerald-400" : "text-amber-400"}>●</span> {e.channelName} — {Math.round(e.distilledKeyBits / 8)} B distilled · QBER {e.errorRatePct}%
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card p-4 lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><FileKey className="w-4 h-4 text-n0va-400" /> PQC certificates</h3>
                <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => { setCertForm(emptyCert); setShowCert(true); }}>
                  <Plus className="w-3 h-3" /> Issue
                </button>
              </div>
              <div className="space-y-2">
                {(dash?.certificates?.certificates || []).map((c: any) => (
                  <div key={c.certId} className={`border rounded-lg p-3 space-y-1.5 ${c.status === "active" ? "border-gray-800" : "border-gray-800 opacity-60"}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${c.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>{c.status}</span>
                      <span className="text-sm font-medium text-white truncate">{c.commonName}</span>
                      <span className="text-[10px] text-gray-500 ml-auto shrink-0 font-mono">{c.serial}</span>
                    </div>
                    <p className="text-[11px] text-gray-500">{c.algorithmName} · issuer {c.issuer} · expires {new Date(c.expiresAt).toLocaleDateString()}</p>
                    {c.status === "active" && (
                      <div className="flex gap-1.5 pt-0.5">
                        <button className="btn-secondary text-[11px]" onClick={() => certAction(c.certId, "renew")}>Renew</button>
                        <button className="text-gray-600 hover:text-red-400 text-[11px] ml-auto" onClick={() => certAction(c.certId, "revoke")}>Revoke</button>
                      </div>
                    )}
                  </div>
                ))}
                {!dash?.certificates?.certificates?.length && <p className="text-xs text-gray-600">No certificates issued — issue a Dilithium-5 cert for quantum-safe signatures.</p>}
              </div>
            </div>

            <div className="card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><ScrollText className="w-4 h-4 text-n0va-400" /> Cert chain</h3>
              <div className={`text-[11px] px-2.5 py-1.5 rounded ${chain?.verified ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                {chain?.verified ? "Chain verified" : "Chain has non-active leaves"} · {chain?.leaves || 0} leaf cert(s)
              </div>
              <div className="space-y-1.5 text-[11px]">
                <p className="text-gray-400">🔒 {chain?.root?.name} <span className="text-gray-600 font-mono block truncate">{chain?.root?.fingerprint}</span></p>
                <p className="text-gray-400 pl-3">└ {chain?.intermediate?.name} <span className="text-gray-600 font-mono block truncate">{chain?.intermediate?.fingerprint}</span></p>
                {(chain?.chain || []).filter((x: any) => x.depth === 0).map((l: any, i: number) => (
                  <p key={i} className="text-gray-400 pl-6 truncate">└ {l.name} <span className="text-gray-600 font-mono">{l.status}</span></p>
                ))}
              </div>
              <div className="border-t border-gray-800 pt-2">
                <p className="text-[11px] text-gray-500 mb-1.5">Recent quantum events</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {(dash?.recentLog || []).map((l: any) => (
                    <p key={l.entryId} className="text-[10px] text-gray-600 truncate"><span className="text-n0va-300">{l.category}</span> — {l.detail}</p>
                  ))}
                  {!dash?.recentLog?.length && <p className="text-[11px] text-gray-600">No events yet.</p>}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showKey && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-gray-900">
              <h2 className="font-semibold text-white flex items-center gap-2"><KeyRound className="w-4 h-4 text-n0va-400" /> New PQC key pair</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setShowKey(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Algorithm</label>
                <select className="select" value={keyForm.algorithm} onChange={(e) => setKeyForm({ ...keyForm, algorithm: e.target.value })}>
                  {algorithms.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Purpose</label>
                <select className="select" value={keyForm.purpose} onChange={(e) => setKeyForm({ ...keyForm, purpose: e.target.value })}>
                  <option value="email_encryption">email_encryption</option>
                  <option value="signing">signing</option>
                  <option value="key_exchange">key_exchange</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Label <span className="text-gray-600">(optional)</span></label>
                <input className="input" placeholder="Default label auto-generated" value={keyForm.label} onChange={(e) => setKeyForm({ ...keyForm, label: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button className="btn-secondary text-sm" onClick={() => setShowKey(false)}>Cancel</button>
                <button className="btn-primary text-sm" disabled={busy} onClick={createKey}>Generate key pair</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showChannel && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-gray-900">
              <h2 className="font-semibold text-white flex items-center gap-2"><RadioTower className="w-4 h-4 text-n0va-400" /> New QKD channel</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setShowChannel(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Channel name</label>
                <input className="input" placeholder="Athens-Brussels" value={channelForm.name} onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button className="btn-secondary text-sm" onClick={() => setShowChannel(false)}>Cancel</button>
                <button className="btn-primary text-sm" disabled={busy} onClick={createChannel}>Establish channel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCert && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-gray-900">
              <h2 className="font-semibold text-white flex items-center gap-2"><FileKey className="w-4 h-4 text-n0va-400" /> Issue PQC certificate</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setShowCert(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Common name</label>
                <input className="input" placeholder="mail.n0va.io" value={certForm.commonName} onChange={(e) => setCertForm({ ...certForm, commonName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Signature algorithm</label>
                  <select className="select" value={certForm.algorithm} onChange={(e) => setCertForm({ ...certForm, algorithm: e.target.value })}>
                    <option value="dilithium_5">Dilithium-5</option>
                    <option value="falcon_512">Falcon-512</option>
                    <option value="sphincs_256f">SPHINCS+-256f</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Validity (days)</label>
                  <input type="number" min={1} className="input" value={certForm.validityDays} onChange={(e) => setCertForm({ ...certForm, validityDays: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button className="btn-secondary text-sm" onClick={() => setShowCert(false)}>Cancel</button>
                <button className="btn-primary text-sm" disabled={busy} onClick={issueCert}>Issue certificate</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
