import { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck, ShieldAlert, RefreshCw, AlertTriangle, Cpu, MonitorSmartphone, Network, Fingerprint, Database, KeyRound, Laptop, Plus, Ban, Activity,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const LAYER_ICON: Record<string, any> = {
  identity: Fingerprint, device: MonitorSmartphone, network: Network, application: Cpu, data: Database, session: ShieldCheck,
};

const LAYER_COLOR: Record<string, string> = {
  identity: "text-sky-400", device: "text-violet-400", network: "text-amber-400", application: "text-emerald-400", data: "text-fuchsia-400", session: "text-cyan-400",
};

export default function MailTrust() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ deviceId: "", name: "", type: "laptop" });
  const [accessOpen, setAccessOpen] = useState(false);
  const [accessForm, setAccessForm] = useState({ userId: "", deviceId: "", networkContext: "corporate_vpn", mfaVerified: false });

  const load = useCallback(async () => {
    const d = unwrap(await api.adsMarketingModule.mailZeroTrustDashboard().catch(() => null));
    setDash(d);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    function refresh() { load(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [load]);
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [autoRefresh, load]);

  async function act(kind: string, fn: () => Promise<any>) {
    setBusy(kind);
    const r = unwrap(await fn().catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setBusy(null);
    load();
  }

  const overview = dash?.overview || {};
  const layers = dash?.layers?.layers || [];
  const principles = dash?.layers?.principles || [];
  const devices = dash?.devices || {};
  const honeytokens = dash?.honeytokens || {};
  const ztScore = overview.ztScore ?? 0;
  const posture = overview.posture || "at_risk";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-n0va-400" /> Mail Trust</h1>
          <p className="text-gray-500 mt-1 text-sm">Zero-trust architecture — never trust, always verify (spec §2.1)</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="w-3.5 h-3.5 text-n0va-600 bg-gray-700 border-gray-600 rounded" />
            Auto-refresh 30s
          </label>
          <button className="btn-secondary p-2" onClick={load} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary text-xs" onClick={() => setEnrollOpen(true)}><Plus className="w-3.5 h-3.5 mr-1" /> Enroll device</button>
          <button className="btn-secondary text-xs" onClick={() => setAccessOpen(true)}><KeyRound className="w-3.5 h-3.5 mr-1" /> Test access</button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : !dash ? (
        <div className="card border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-sm text-red-300 font-medium">Zero-trust data unavailable</p>
              <p className="text-xs text-red-400/70">Check that the backend is running.</p>
            </div>
            <button className="btn-secondary text-xs ml-auto" onClick={load}>Retry</button>
          </div>
        </div>
      ) : (
        <>
          <div className={`card flex flex-col sm:flex-row sm:items-center gap-3 border ${posture === "hardened" ? "border-emerald-500/30 bg-emerald-500/10" : posture === "monitored" ? "border-amber-500/40 bg-amber-500/5" : "border-red-500/40 bg-red-500/5"}`}>
            {posture === "hardened" ? <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" /> : posture === "monitored" ? <ShieldAlert className="w-8 h-8 text-amber-400 shrink-0" /> : <Ban className="w-8 h-8 text-red-400 shrink-0" />}
            <div className="min-w-0">
              <p className={`text-sm font-bold uppercase tracking-wider ${posture === "hardened" ? "text-emerald-400" : posture === "monitored" ? "text-amber-400" : "text-red-400"}`}>Zero-trust posture: {posture}</p>
              <p className="text-xs text-gray-400 mt-0.5">{overview.summary}</p>
            </div>
            <div className="sm:ml-auto flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{ztScore}<span className="text-sm text-gray-500">/100</span></p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">ZT score</p>
              </div>
              <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${posture === "hardened" ? "bg-emerald-500" : posture === "monitored" ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${ztScore}%` }} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{devices.total || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Devices</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{devices.trusted || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Trusted</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{overview.stats?.denied || 0} / {overview.stats?.challenged || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Denied / challenged</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{honeytokens.hit || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Honeytoken hits</p>
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-3">Six validation layers</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {layers.map((l: any) => {
                const LayIcon = LAYER_ICON[l.id] || ShieldCheck;
                return (
                  <div key={l.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-800/40">
                    <LayIcon className={`w-4 h-4 shrink-0 ${LAYER_COLOR[l.id] || "text-gray-400"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-gray-200">{l.name} <span className="text-gray-500">· {l.control}</span></p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${l.status === "enforced" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : l.status === "monitoring" ? "text-amber-400 border-amber-500/30 bg-amber-500/10" : "text-red-400 border-red-500/30 bg-red-500/10"}`}>{l.status}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 truncate">{l.tech} · {l.frequency}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-n0va-500 rounded-full" style={{ width: `${l.passRate}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-500 shrink-0">{l.passRate}% pass · {l.verifiedCount} verified · {l.blockedCount} blocked</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-n0va-400" /> Enrolled devices</h2>
              {devices.devices?.length ? (
                <div className="space-y-2">
                  {devices.devices.map((d: any) => (
                    <div key={d.deviceId} className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/40">
                      <Laptop className="w-4 h-4 text-gray-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-gray-200 truncate">{d.name}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${d.status === "trusted" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : d.status === "untrusted" ? "text-amber-400 border-amber-500/30 bg-amber-500/10" : "text-red-400 border-red-500/30 bg-red-500/10"}`}>{d.status}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 truncate">{d.type} · posture {d.posture}% · {d.mdm} · {d.edr} · patch {d.patchLevel}%</p>
                        <div className="flex-1 h-1 mt-1 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${d.posture}%` }} />
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-600">{d.deviceId}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No devices enrolled — enroll your first device.</p>
              )}

              <h2 className="text-sm font-semibold text-white mt-5 mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-red-400" /> Honeytokens</h2>
              <div className="flex items-center gap-2 flex-wrap">
                {honeytokens.tokens?.map((t: any) => (
                  <span key={t.tokenId} className={`text-[10px] font-mono px-2 py-1 rounded border ${t.status === "hit" ? "text-red-400 border-red-500/40 bg-red-500/10" : "text-gray-400 border-gray-700 bg-gray-800/60"}`}>
                    {t.name} {t.status === "hit" ? "· HIT" : ""} ({t.purpose})
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">{honeytokens.summary}</p>
            </div>

            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-3">Zero-trust principles</h2>
              {principles.length ? (
                <div className="space-y-2">
                  {principles.map((p: any) => (
                    <div key={p.id} className="p-2.5 rounded-lg bg-gray-800/40">
                      <p className="text-xs font-bold text-n0va-400">{p.title}</p>
                      <ul className="mt-1 space-y-0.5">
                        {p.points.map((pt: string, i: number) => (
                          <li key={i} className="text-[11px] text-gray-400 flex items-start gap-1.5"><span className="text-gray-600 mt-0.5">•</span>{pt}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No principles available.</p>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-3">Zero-trust activity</h2>
            {dash.recentEvents?.length ? (
              <div className="space-y-1.5">
                {dash.recentEvents.slice(0, 8).map((e: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Activity className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-gray-300"><span className="text-gray-500">{new Date(e.at).toLocaleTimeString()} ·</span> {e.detail}</p>
                      <p className="text-[10px] text-gray-600 uppercase">{e.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">No activity logged yet.</p>
            )}
          </div>
        </>
      )}

      {enrollOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5 max-h-[85vh] overflow-y-auto">
            <h2 className="text-sm font-bold text-white mb-4">Enroll device</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400">Device ID</label>
                <input value={enrollForm.deviceId} onChange={(e) => setEnrollForm({ ...enrollForm, deviceId: e.target.value })} className="input mt-1" placeholder="dev_laptop_1" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Name</label>
                <input value={enrollForm.name} onChange={(e) => setEnrollForm({ ...enrollForm, name: e.target.value })} className="input mt-1" placeholder="Work laptop" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Type</label>
                <select value={enrollForm.type} onChange={(e) => setEnrollForm({ ...enrollForm, type: e.target.value })} className="input mt-1">
                  <option value="workstation">Workstation</option>
                  <option value="laptop">Laptop</option>
                  <option value="mobile">Mobile</option>
                  <option value="tablet">Tablet</option>
                  <option value="server">Server</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button className="btn-secondary text-xs" onClick={() => setEnrollOpen(false)}>Cancel</button>
              <button
                className="btn-primary text-xs"
                disabled={!enrollForm.deviceId || busy === "enroll"}
                onClick={async () => {
                  await act("enroll", () => api.adsMarketingModule.mailZeroTrustEnroll(enrollForm));
                  setEnrollOpen(false);
                  setEnrollForm({ deviceId: "", name: "", type: "laptop" });
                }}
              >{busy === "enroll" ? "Enrolling..." : "Enroll"}</button>
            </div>
          </div>
        </div>
      )}

      {accessOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5 max-h-[85vh] overflow-y-auto">
            <h2 className="text-sm font-bold text-white mb-4">Test access request</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400">User</label>
                <input value={accessForm.userId} onChange={(e) => setAccessForm({ ...accessForm, userId: e.target.value })} className="input mt-1" placeholder="user@acme.com" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Device ID</label>
                <input value={accessForm.deviceId} onChange={(e) => setAccessForm({ ...accessForm, deviceId: e.target.value })} className="input mt-1" placeholder="dev_laptop_1" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Network context</label>
                <select value={accessForm.networkContext} onChange={(e) => setAccessForm({ ...accessForm, networkContext: e.target.value })} className="input mt-1">
                  <option value="corporate_vpn">Corporate VPN</option>
                  <option value="office">Office</option>
                  <option value="home">Home</option>
                  <option value="public_wifi">Public WiFi</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-400">
                <input type="checkbox" checked={accessForm.mfaVerified} onChange={(e) => setAccessForm({ ...accessForm, mfaVerified: e.target.checked })} className="w-3.5 h-3.5 text-n0va-600 bg-gray-700 border-gray-600 rounded" />
                MFA verified
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button className="btn-secondary text-xs" onClick={() => setAccessOpen(false)}>Cancel</button>
              <button
                className="btn-primary text-xs"
                disabled={!accessForm.userId || busy === "access"}
                onClick={async () => {
                  await act("access", () => api.adsMarketingModule.mailZeroTrustAccess(accessForm));
                  setAccessOpen(false);
                }}
              >{busy === "access" ? "Evaluating..." : "Evaluate"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}