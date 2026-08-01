import { useEffect, useState, useCallback } from "react";
import {
  Globe, RefreshCw, Plus, X, ShieldCheck, Activity, BadgeCheck, AlertTriangle, Trash2, FileKey, ServerCog,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const statusColor: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400",
  action_required: "bg-red-500/15 text-red-400",
  active: "bg-emerald-500/15 text-emerald-400",
};

const emptyForm = { domain: "", plan: "free" };
const emptyPolicies = { spfStrict: false, dmarcEnforce: false, mtaSts: false, tlsRpt: false, brandProtection: false };

export default function MailDomains() {
  const { addToast } = useToast();
  const [summary, setSummary] = useState<any>(null);
  const [domains, setDomains] = useState<any[]>([]);
  const [monitor, setMonitor] = useState<any>(null);
  const [log, setLog] = useState<any[]>([]);
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [policiesFor, setPoliciesFor] = useState<any>(null);
  const [policies, setPolicies] = useState(emptyPolicies);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(async () => {
    const [s, d, m, l] = await Promise.all([
      api.adsMarketingModule.mailDomainSummary().catch(() => null),
      api.adsMarketingModule.mailDomains().catch(() => null),
      api.adsMarketingModule.mailReputationMonitor().catch(() => null),
      api.adsMarketingModule.mailDomainLog().catch(() => null),
    ]);
    setSummary(unwrap(s));
    const dR = unwrap(d);
    setDomains(Array.isArray(dR) ? dR : dR?.domains || []);
    const mR = unwrap(m);
    setMonitor(Array.isArray(mR) ? mR : mR?.monitored || []);
    const lR = unwrap(l);
    setLog(Array.isArray(lR) ? lR : lR?.log || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    function refresh() { loadAll(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadAll]);

  async function register() {
    if (!form.domain.trim()) {
      addToast("warning", "Missing domain", "Enter a domain name.");
      return;
    }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailRegisterDomain({ domain: form.domain.trim(), plan: form.plan }));
      addToast("success", "Domain registered", r?.summary || "");
      setShowRegister(false);
      setForm(emptyForm);
      await loadAll();
    } catch (e: any) {
      addToast("error", "Registration failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function act(fn: () => Promise<any>, ok: string, err: string) {
    setBusy(true);
    try {
      const r = unwrap(await fn());
      addToast("success", ok, r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", err, e?.message);
    } finally {
      setBusy(false);
    }
  }

  function openPolicies(d: any) {
    setPoliciesFor(d);
    setPolicies({
      spfStrict: !!d.policies?.spfStrict,
      dmarcEnforce: !!d.policies?.dmarcEnforce,
      mtaSts: !!d.policies?.mtaSts,
      tlsRpt: !!d.policies?.tlsRpt,
      brandProtection: !!d.policies?.brandProtection,
    });
  }

  async function savePolicies() {
    if (!policiesFor) return;
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailSetDomainPolicy(policiesFor.domainId, policies));
      addToast("success", "Policies updated", r?.summary || "");
      setPoliciesFor(null);
      await loadAll();
    } catch (e: any) {
      addToast("error", "Policies failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Globe className="w-6 h-6 text-n0va-400" /> Custom domains</h1>
          <p className="text-gray-500 mt-1 text-sm">{summary?.summary || "DNS setup, verification and deliverability monitoring"}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn-secondary p-2" onClick={loadAll} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowRegister(true)}><Plus className="w-4 h-4" /> Add domain</button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{summary?.totals?.total || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Domains</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-emerald-400">{summary?.totals?.active || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Active</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{summary?.avgReputation || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Avg reputation</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-red-400">{summary?.flagged || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Flagged</p>
            </div>
          </div>

          {monitor?.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-n0va-400" /> Reputation monitor</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {monitor.map((m: any, i: number) => (
                  <div key={i} className={`border rounded-xl p-3 space-y-1.5 ${m.blacklisted || m.health === "critical" ? "border-red-500/30 bg-red-500/5" : "border-gray-800"}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white truncate">{m.domain}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${statusColor[m.status] || "bg-gray-500/10 text-gray-400"}`}>{m.status.replace("_", " ")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500">Reputation</span>
                      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${m.reputationScore >= 75 ? "bg-emerald-500" : m.reputationScore >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${m.reputationScore}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-400">{m.reputationScore}</span>
                    </div>
                    <p className="text-[10px] text-gray-500">Deliverability {m.deliverabilityScore}% · {m.blacklisted ? `listed on ${m.blacklists.join(", ")}` : "not blacklisted"}</p>
                    {m.alerts?.map((a: string, j: number) => (
                      <p key={j} className="text-[10px] text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3 shrink-0" /> {a}</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {domains.map((d: any) => (
            <div key={d.domainId} className="card p-4 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${statusColor[d.status] || "bg-gray-500/10 text-gray-400"}`}>{d.status.replace("_", " ")}</span>
                <h3 className="font-semibold text-white">{d.domain}</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/10 text-gray-400">{d.plan}</span>
                {d.verifiedAt && <span className="text-[10px] text-emerald-400 flex items-center gap-1"><BadgeCheck className="w-3 h-3" /> verified {new Date(d.verifiedAt).toLocaleDateString()}</span>}
                <div className="ml-auto flex items-center gap-2">
                  {d.status !== "active" && (
                    <button className="btn-primary text-xs flex items-center gap-1" disabled={busy} onClick={() => act(() => api.adsMarketingModule.mailVerifyDomain(d.domainId), "Verification run", "Verification failed")}>
                      <BadgeCheck className="w-3 h-3" /> Verify DNS
                    </button>
                  )}
                  <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => openPolicies(d)}><FileKey className="w-3 h-3" /> Policies</button>
                  <button className="text-gray-500 hover:text-red-400 p-1" title="Delete" disabled={busy} onClick={() => act(() => api.adsMarketingModule.mailDeleteDomain(d.domainId), "Domain deleted", "Delete failed")}><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500 uppercase text-[10px]">
                      <th className="py-1.5 pr-3">Type</th>
                      <th className="py-1.5 pr-3">Record</th>
                      <th className="py-1.5 pr-3">Purpose</th>
                      <th className="py-1.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {Object.entries(d.dns || {}).map(([key, rec]: any) => (
                      <tr key={key}>
                        <td className="py-1.5 pr-3 font-mono text-n0va-300 uppercase">{key}</td>
                        <td className="py-1.5 pr-3 font-mono text-gray-400 max-w-[280px] truncate">{rec.record}</td>
                        <td className="py-1.5 pr-3 text-gray-500">{rec.purpose}</td>
                        <td className="py-1.5">
                          {rec.verified === null ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">not checked</span>
                          ) : rec.verified ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">verified</span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">failed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {domains.length === 0 && (
            <div className="card p-6 text-center text-sm text-gray-500">
              <Globe className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              No custom domains yet — add one to send mail from your own domain.
            </div>
          )}

          {log.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><ServerCog className="w-4 h-4 text-n0va-400" /> Domain activity</h3>
              <ul className="divide-y divide-gray-800/50">
                {log.slice(0, 6).map((e: any, i: number) => (
                  <li key={i} className="flex items-center gap-2 py-1.5 text-xs">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${e.action === "verified" ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-500/10 text-gray-400"}`}>{e.action.replace("_", " ")}</span>
                    <span className="text-gray-300 truncate">{e.domain}</span>
                    <span className="text-gray-600 ml-auto shrink-0">{new Date(e.at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {showRegister && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white flex items-center gap-2"><Globe className="w-4 h-4 text-n0va-400" /> Register domain</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setShowRegister(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Domain</label>
                <input className="input" placeholder="mail.yourcompany.com" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") register(); }} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Plan</label>
                <select className="select" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
                  {["free", "pro", "business", "enterprise", "n0va1o"].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <p className="text-[10px] text-gray-600 flex items-start gap-1"><ShieldCheck className="w-3 h-3 shrink-0 mt-0.5" /> Generates 6 DNS records (MX, SPF, DKIM, DMARC, MTA-STS, TLS-RPT). DMARC enforcement & MTA-STS need Business+; Brand Protection needs Enterprise.</p>
              <div className="flex justify-end gap-2">
                <button className="btn-secondary text-sm" onClick={() => setShowRegister(false)}>Cancel</button>
                <button className="btn-primary text-sm" disabled={busy} onClick={register}>Register</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {policiesFor && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white flex items-center gap-2"><FileKey className="w-4 h-4 text-n0va-400" /> Policies — {policiesFor.domain}</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setPoliciesFor(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              {(["spfStrict", "dmarcEnforce", "mtaSts", "tlsRpt", "brandProtection"] as const).map((k) => (
                <label key={k} className="flex items-center justify-between gap-2 text-sm text-gray-300">
                  <span className="capitalize">{k.replace(/([a-z])([A-Z])/g, "$1 $2")}</span>
                  <input type="checkbox" className="accent-violet-500" checked={policies[k]} onChange={(e) => setPolicies({ ...policies, [k]: e.target.checked })} />
                </label>
              ))}
              <p className="text-[10px] text-gray-600">DMARC enforcement and MTA-STS require the Business plan or higher; Brand Protection requires Enterprise.</p>
              <div className="flex justify-end gap-2">
                <button className="btn-secondary text-sm" onClick={() => setPoliciesFor(null)}>Cancel</button>
                <button className="btn-primary text-sm" disabled={busy} onClick={savePolicies}>Save policies</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
