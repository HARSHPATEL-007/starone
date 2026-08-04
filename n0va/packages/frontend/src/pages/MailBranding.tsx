import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw, Palette, Server, Percent, Globe, CheckCircle2, ScrollText, ShieldCheck,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

export default function MailBranding() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [presetData, setPresetData] = useState<any>(null);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [navName, setNavName] = useState("");
  const [colorPreset, setColorPreset] = useState("ocean");
  const [primary, setPrimary] = useState("#0ea5e9");
  const [accent, setAccent] = useState("#0f172a");
  const [darkMode, setDarkMode] = useState(false);
  const [slaPct, setSlaPct] = useState("99.9");
  const [penalty, setPenalty] = useState("0.05");
  const [domainId, setDomainId] = useState("");
  const [candidates, setCandidates] = useState<any[]>([]);

  const loadAll = useCallback(async () => {
    const [d, p, m, c] = await Promise.all([
      api.adsMarketingModule.mailWhiteLabelDashboard().catch(() => null),
      api.adsMarketingModule.mailWhiteLabelPresets().catch(() => null),
      api.adsMarketingModule.mailWhiteLabelModels().catch(() => null),
      api.adsMarketingModule.mailWhiteLabelCandidateDomains().catch(() => null),
    ]);
    const dd = unwrap(d);
    setDash(dd);
    setPresetData(unwrap(p));
    const mR = unwrap(m);
    setModels(Array.isArray(mR) ? mR : mR?.models || []);
    const b = dd?.branding || {};
    setNavName(b.navName || "N0VA Mail");
    setColorPreset(b.colorPreset || "ocean");
    setPrimary(b.primary || "#0ea5e9");
    setAccent(b.accent || "#0f172a");
    setDarkMode(!!b.darkMode);
    if (dd?.sla?.slaPct) setSlaPct(String(dd.sla.slaPct));
    const cR = unwrap(c);
    setCandidates(Array.isArray(cR) ? cR : cR?.domains || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    function refresh() { loadAll(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadAll]);

  async function updateBranding() {
    setBusy(true);
    try {
      const patch: Record<string, any> = { navName };
      if (colorPreset) patch.colorPreset = colorPreset;
      if (primary) patch.primary = primary;
      if (accent) patch.accent = accent;
      patch.darkMode = darkMode;
      const r = unwrap(await api.adsMarketingModule.mailWhiteLabelUpdate(patch));
      addToast("success", "Brand updated", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Update failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function selectModel(modelId: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailWhiteLabelSelectDeployment(modelId));
      addToast("success", "Deployment", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Selection failed", e?.message);
    }
  }

  async function saveSla() {
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailWhiteLabelSetSla(Number(slaPct), Number(penalty)));
      addToast("success", "SLA saved", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "SLA failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function bindDomain() {
    if (!domainId) return;
    try {
      const r = unwrap(await api.adsMarketingModule.mailWhiteLabelBindDomain(domainId));
      addToast("success", "Domain bound", r?.summary || "");
      setDomainId("");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Bind failed", e?.message);
    }
  }

  const branding = dash?.branding || {};
  const deployment = dash?.deployment || {};
  const features = dash?.availableFeatures || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Palette className="w-6 h-6 text-n0va-400" /> White-label & branding</h1>
          <p className="text-gray-500 mt-1 text-sm">{dash?.summary || "Brand, deployment model and custom SLA management"}</p>
        </div>
        <button className="btn-secondary p-2" onClick={loadAll} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card p-4">
              <p className="text-2xl font-bold text-white truncate">{dash?.planName || "Free"}</p>
              <p className="text-xs text-gray-500 mt-1">Current plan tier</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{features.length}</p>
              <p className="text-xs text-gray-500 mt-1">Features available</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white truncate">{deployment.modelName || "Shared"}</p>
              <p className="text-xs text-gray-500 mt-1">Deployment model</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{dash?.sla?.slaString || "99.9%"}</p>
              <p className="text-xs text-gray-500 mt-1">Custom SLA</p>
            </div>
          </div>

          {dash?.suggestion && (
            <div className="border border-amber-500/20 bg-amber-500/5 text-amber-400 text-xs px-3 py-2 rounded-lg">{dash.suggestion}</div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Palette className="w-4 h-4 text-n0va-400" /> Brand identity</h3>
              <div className="flex items-center gap-3 p-3 border border-gray-800 rounded-lg" style={{ background: branding.accent || "#0f172a" }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: branding.primary || "#0ea5e9" }}>N</div>
                <div>
                  <p className="text-white font-semibold text-sm">{branding.navName || "N0VA Mail"}</p>
                  <p className="text-gray-400 text-[11px]">{branding.colorPreset} preset · {branding.font}</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto shrink-0" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Product name</label>
                <input className="input" value={navName} onChange={(e) => setNavName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Color preset</label>
                <div className="flex gap-2 flex-wrap">
                  {(presetData?.presets || []).map((p: any) => (
                    <button key={p.id} onClick={() => { setColorPreset(p.id); setPrimary(p.primary); setAccent(p.accent); }}
                      className={`border rounded-lg px-3 py-2 text-xs flex items-center gap-2 ${colorPreset === p.id ? "border-n0va-500" : "border-gray-800"}`}>
                      <span className="w-3 h-3 rounded-full" style={{ background: p.primary }} />
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Primary (Pro+)</label>
                  <div className="flex items-center gap-2">
                    <input type="color" className="w-9 h-9 rounded cursor-pointer bg-gray-800 border border-gray-700" value={primary} onChange={(e) => setPrimary(e.target.value)} />
                    <input className="input font-mono text-xs" value={primary} onChange={(e) => setPrimary(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Accent (Pro+)</label>
                  <div className="flex items-center gap-2">
                    <input type="color" className="w-9 h-9 rounded cursor-pointer bg-gray-800 border border-gray-700" value={accent} onChange={(e) => setAccent(e.target.value)} />
                    <input className="input font-mono text-xs" value={accent} onChange={(e) => setAccent(e.target.value)} />
                  </div>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-400">
                <input type="checkbox" className="accent-n0va-500" checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} />
                Dark mode support (Business+)
              </label>
              <button className="btn-primary text-sm" disabled={busy} onClick={updateBranding}>Save branding</button>
            </div>

            <div className="card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Server className="w-4 h-4 text-n0va-400" /> Deployment model</h3>
              <div className="space-y-2">
                {models.map((m: any) => (
                  <button key={m.id} onClick={() => selectModel(m.id)}
                    className={`w-full text-left border rounded-lg p-3 ${deployment.deploymentModel === m.id ? "border-n0va-500" : "border-gray-800 hover:border-gray-600"}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{m.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-n0va-500/15 text-n0va-300 ml-auto shrink-0">{m.isolation}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">{m.description}</p>
                    <p className="text-[10px] text-gray-600 mt-1">{m.pricing} · {m.slaGuarantee} SLA</p>
                  </button>
                ))}
              </div>
              <div className="border-t border-gray-800 pt-2">
                <p className="text-[11px] text-gray-500">Access level</p>
                <p className="text-xs text-white">{deployment.status || "operational"} · {deployment.isolation || "logical"} isolation · {deployment.slaGuarantee || "99.9%"} SLA</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Percent className="w-4 h-4 text-n0va-400" /> Custom SLA</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">SLA % (99 - 99.99999)</label>
                  <input className="input" value={slaPct} onChange={(e) => setSlaPct(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Penalty rate</label>
                  <input className="input" value={penalty} onChange={(e) => setPenalty(e.target.value)} />
                </div>
              </div>
              <button className="btn-primary text-sm" disabled={busy} onClick={saveSla}>Save SLA</button>
            </div>

            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Globe className="w-4 h-4 text-n0va-400" /> Outbound domain</h3>
                <CheckCircle2 className={`w-4 h-4 ${branding.customMailDomain ? "text-emerald-400" : "text-gray-700"}`} />
              </div>
              <p className="text-sm text-white">{branding.customMailDomain ? `Mail branded from ${branding.customMailDomain}` : "No custom domain bound - using default n0va.io"}</p>
              <div className="flex gap-2">
                <select className="select flex-1" value={domainId} onChange={(e) => setDomainId(e.target.value)}>
                  <option value="">Select verified domain</option>
                  {candidates.map((d: any) => <option key={d.domainId} value={d.domainId}>{d.name}</option>)}
                </select>
                <button className="btn-primary text-xs" disabled={!domainId} onClick={bindDomain}>Bind</button>
              </div>
              {!candidates.length && <p className="text-[11px] text-gray-600">No verified domains - verify a domain in Mail Domains first.</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card p-4 lg:col-span-2 space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-n0va-400" /> Available features</h3>
              <div className="flex gap-1.5 flex-wrap">
                {(presetData?.features || []).map((f: any) => {
                  const has = features.includes(f.id);
                  return (
                    <span key={f.id} title={f.name}
                      className={`text-[10px] px-2 py-1 rounded-full border ${has ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-gray-800 text-gray-600"}`}>
                      {has ? "●" : "○"} {f.name}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="card p-4 space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><ScrollText className="w-4 h-4 text-n0va-400" /> Activity</h3>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {(dash?.recentLog || []).map((l: any) => (
                  <p key={l.entryId} className="text-[10px] text-gray-500 truncate"><span className="text-n0va-300">{l.category}</span> — {l.detail}</p>
                ))}
                {!dash?.recentLog?.length && <p className="text-[11px] text-gray-600">No white-label events yet.</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}