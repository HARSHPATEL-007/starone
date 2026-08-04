import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw, Plus, X, Code2, Terminal, KeyRound, BarChart3, Activity, Gauge, Zap, BookOpen, Globe2, Copy, ScrollText,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

export default function MailDevCenter() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [spec, setSpec] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [keyLabel, setKeyLabel] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [testUrl, setTestUrl] = useState("");
  const [pingResult, setPingResult] = useState<any>(null);

  const loadAll = useCallback(async () => {
    const [d, s] = await Promise.all([
      api.adsMarketingModule.mailDevDashboard().catch(() => null),
      api.adsMarketingModule.mailDevSpec().catch(() => null),
    ]);
    setDash(unwrap(d));
    setSpec(unwrap(s));
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    function refresh() { loadAll(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadAll]);

  async function createKey() {
    if (!keyLabel.trim()) {
      addToast("warning", "Label required", "Give the sandbox key a label.");
      return;
    }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailDevCreateSandboxKey(keyLabel.trim()));
      setRevealed(r?.key || null);
      addToast("success", "Sandbox key created", r?.summary || "");
      setShowKey(false);
      setKeyLabel("");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Create failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function promote(keyId: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailDevPromoteSandboxKey(keyId));
      addToast("success", "Promoted", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Promote failed", e?.message);
    }
  }

  async function revoke(keyId: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailDevRevokeSandboxKey(keyId));
      addToast("success", "Revoked", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Revoke failed", e?.message);
    }
  }

  async function testWebhook() {
    if (!testUrl.trim()) return;
    const r = unwrap(await api.adsMarketingModule.mailDevTestWebhook(testUrl.trim()));
    setPingResult(r);
  }

  const sdks = dash?.sdks || [];
  const cliTools = dash?.cliTools || [];
  const metrics = dash?.metrics || [];
  const keys = dash?.sandboxKeys || [];
  const usage = dash?.usage || {};
  const rateLimit = dash?.rateLimit || {};
  const explorer = dash?.explorer || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Code2 className="w-6 h-6 text-n0va-400" /> Developer center</h1>
          <p className="text-gray-500 mt-1 text-sm">{dash?.summary || "SDKs, sandbox keys and API tooling"}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary p-2" onClick={loadAll} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary text-xs flex items-center gap-1" onClick={() => { setRevealed(null); setShowKey(true); }}><Plus className="w-3 h-3" /> Sandbox key</button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{sdks.length}</p>
              <p className="text-xs text-gray-500 mt-1">SDKs available</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{keys.filter((k: any) => k.status === "active").length}/{keys.length}</p>
              <p className="text-xs text-gray-500 mt-1">Sandbox keys active</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{usage.callsTotal || 0}</p>
              <p className="text-xs text-gray-500 mt-1">API calls total</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{rateLimit.remaining ?? rateLimit.limit}</p>
              <p className="text-xs text-gray-500 mt-1">Calls remaining today</p>
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Zap className="w-4 h-4 text-n0va-400" /> Developer metrics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {metrics.map((m: any) => (
                <div key={m.id} className="border border-gray-800 rounded-lg p-3">
                  <p className="text-lg font-bold text-white">{m.value}{m.unit}</p>
                  <p className="text-[10px] text-gray-500 truncate" title={m.name}>{m.name}</p>
                  <p className={`text-[10px] ${m.onTarget ? "text-emerald-400" : "text-amber-400"}`}>{m.onTarget ? "on target" : "below target"} · {m.target}{m.unit}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4 space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Code2 className="w-4 h-4 text-n0va-400" /> SDKs</h3>
              <div className="space-y-2">
                {sdks.map((s: any) => (
                  <div key={s.id} className="border border-gray-800 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{s.language}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase ${s.status === "stable" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>{s.status}</span>
                    </div>
                    <p className="text-[10px] text-n0va-300 font-mono mt-1">{s.package}@{s.version}</p>
                    <p className="text-[10px] text-gray-600 font-mono">{s.installCommand}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-4 space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Terminal className="w-4 h-4 text-n0va-400" /> CLI tools</h3>
              <div className="space-y-2">
                {cliTools.map((t: any) => (
                  <div key={t.id} className="border border-gray-800 rounded-lg p-3">
                    <p className="text-xs text-white font-mono">{t.command}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{t.usage}</p>
                    <p className="text-[10px] text-gray-600 font-mono truncate">{t.example}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><KeyRound className="w-4 h-4 text-n0va-400" /> Sandbox keys</h3>
              <div className="space-y-2">
                {keys.map((k: any) => (
                  <div key={k.keyId} className="border border-gray-800 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${k.status === "active" ? "bg-emerald-500/15 text-emerald-400" : k.status === "production" ? "bg-n0va-500/15 text-n0va-300" : "bg-red-500/15 text-red-400"}`}>{k.status}</span>
                      <span className="text-sm text-white truncate">{k.label}</span>
                      <span className="text-[10px] text-gray-500 ml-auto shrink-0 font-mono">{k.prefix}…{k.last4}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">{k.quotaPerDay}/day · {k.callsToday} used</p>
                    {k.status !== "revoked" && (
                      <div className="flex gap-1.5 pt-1">
                        {k.status === "active" && <button className="btn-secondary text-[10px]" onClick={() => promote(k.keyId)}>Promote to prod</button>}
                        <button className="text-gray-600 hover:text-red-400 text-[10px] ml-auto" onClick={() => revoke(k.keyId)}>Revoke</button>
                      </div>
                    )}
                  </div>
                ))}
                {!keys.length && <p className="text-xs text-gray-600">No sandbox keys - create one for 100 emails/day.</p>}
              </div>
            </div>

            <div className="card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Gauge className="w-4 h-4 text-n0va-400" /> Rate limits</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500">{rateLimit.plan} plan</span>
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${rateLimit.pct >= 90 ? "bg-red-500" : rateLimit.pct >= 70 ? "bg-amber-500" : "bg-n0va-500"}`} style={{ width: `${rateLimit.pct || 0}%` }} />
                </div>
                <span className="text-xs text-white font-semibold">{rateLimit.used}/{rateLimit.limit}</span>
              </div>
              <p className="text-[11px] text-gray-500">{rateLimit.remaining} requests remaining today.</p>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 pt-2 border-t border-gray-800"><Activity className="w-4 h-4 text-n0va-400" /> API usage</h3>
              <div className="flex gap-1.5 flex-wrap">
                {(usage.byAction || []).map((a: any) => (
                  <span key={a.action} className="text-[10px] px-2 py-1 rounded-full bg-gray-500/10 text-gray-400">{a.action} × {a.count}</span>
                ))}
                {!usage.byAction?.length && <p className="text-[11px] text-gray-600">No API calls recorded yet.</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><BarChart3 className="w-4 h-4 text-n0va-400" /> Endpoint latency</h3>
                <span className="text-[10px] text-gray-500">p50 / p99</span>
              </div>
              <div className="space-y-1.5">
                {explorer.map((e: any) => (
                  <div key={e.id} className="flex items-center gap-2 text-[11px]">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 ${e.method === "GET" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>{e.method}</span>
                    <span className="text-gray-400 font-mono truncate">{e.path}</span>
                    <span className="text-gray-600 shrink-0">{e.latencyMs}ms</span>
                    <span className="text-gray-600 shrink-0 hidden sm:inline">p99 {e.p99}ms</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-800 pt-2">
                <div className="flex gap-2">
                  <input className="input flex-1 font-mono text-xs" placeholder="https://hooks.example.com/cb" value={testUrl} onChange={(e) => setTestUrl(e.target.value)} />
                  <button className="btn-secondary text-xs" onClick={testWebhook}>Test webhook</button>
                </div>
                {pingResult && (
                  <p className={`text-[11px] mt-1.5 ${pingResult.ok ? "text-emerald-400" : "text-red-400"}`}>{pingResult.summary} · {pingResult.latencyMs}ms</p>
                )}
              </div>
            </div>

            <div className="card p-4 space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><BookOpen className="w-4 h-4 text-n0va-400" /> OpenAPI spec</h3>
              <p className="text-xs text-gray-400">{spec?.info?.title} · {spec?.version} · {spec?.endpoints} endpoint(s) documented</p>
              <div className="space-y-1">
                {(spec?.spec?.paths ? Object.keys(spec.spec.paths) : []).map((p: string) => (
                  <p key={p} className="text-[11px] text-gray-500 font-mono truncate">GET {p}</p>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Globe2 className="w-3.5 h-3.5 text-n0va-400" />
                <span className="text-[11px] text-gray-500">https://api.n0va.io</span>
              </div>
            </div>
          </div>

          <div className="card p-4 space-y-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><ScrollText className="w-4 h-4 text-n0va-400" /> Developer events</h3>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {(dash?.recentLog || []).map((l: any) => (
                <p key={l.entryId} className="text-[10px] text-gray-500 truncate"><span className="text-n0va-300">{l.category}</span> — {l.detail}</p>
              ))}
              {!dash?.recentLog?.length && <p className="text-[11px] text-gray-600">No developer events yet.</p>}
            </div>
          </div>
        </>
      )}

      {showKey && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-gray-900">
              <h2 className="font-semibold text-white flex items-center gap-2"><KeyRound className="w-4 h-4 text-n0va-400" /> New sandbox key</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setShowKey(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Label</label>
                <input className="input" placeholder="e.g. staging-bot" value={keyLabel} onChange={(e) => setKeyLabel(e.target.value)} />
              </div>
              <p className="text-[11px] text-gray-500">Sandbox keys allow 100 emails/day with full feature access.</p>
              <div className="flex justify-end gap-2 pt-1">
                <button className="btn-secondary text-sm" onClick={() => setShowKey(false)}>Cancel</button>
                <button className="btn-primary text-sm" disabled={busy} onClick={createKey}>Create key</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {revealed && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-gray-900">
              <h2 className="font-semibold text-white">Key created - copy it now</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setRevealed(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="border border-amber-500/30 bg-amber-500/5 rounded-lg p-3 font-mono text-xs text-amber-300 break-all">{revealed}</div>
              <p className="text-[11px] text-gray-500">This key is shown once. Store it safely - the raw value is never retrievable again.</p>
              <div className="flex justify-end gap-2">
                <button className="btn-primary text-sm flex items-center gap-1" onClick={() => { navigator.clipboard?.writeText(revealed); addToast("success", "Copied", "Key copied to clipboard."); }}>
                  <Copy className="w-3.5 h-3.5" /> Copy key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}