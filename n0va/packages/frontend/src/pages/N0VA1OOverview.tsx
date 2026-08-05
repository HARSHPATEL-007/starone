import { useEffect, useState, useCallback } from "react";
import {
  Layers, RefreshCw, Boxes, Link2, Braces, PlayCircle, Zap, ShieldAlert,
  Gauge, Timer, Cpu, Code2, Radio, ArrowRightLeft, KeyRound, Activity,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

export default function N0VA1OOverview() {
  const { addToast } = useToast();
  const [ov, setOv] = useState<any>(null);
  const [plans, setPlans] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [throughput, setThroughput] = useState<any>(null);
  const [latency, setLatency] = useState<any>(null);
  const [authMethods, setAuthMethods] = useState<any>(null);
  const [authDash, setAuthDash] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);

  const loadData = useCallback(async () => {
    const [o, p, u, t, l, a, ad] = await Promise.all([
      api.adsMarketingModule.n0va1oOverview().catch(() => null),
      api.adsMarketingModule.n0va1oPlans().catch(() => null),
      api.adsMarketingModule.n0va1oUsage().catch(() => null),
      api.adsMarketingModule.n0va1oThroughputStatus().catch(() => null),
      api.adsMarketingModule.n0va1oLatencyBenchmarks().catch(() => null),
      api.adsMarketingModule.n0va1oAuthMethodCatalog().catch(() => null),
      api.adsMarketingModule.n0va1oAuthDashboard().catch(() => null),
    ]);
    setOv(unwrap(o) || null);
    setPlans(unwrap(p) || null);
    setUsage(unwrap(u) || null);
    setThroughput(unwrap(t) || null);
    setLatency(unwrap(l) || null);
    setAuthMethods(unwrap(a) || null);
    setAuthDash(unwrap(ad) || null);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    const refresh = () => loadData();
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadData]);
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  async function setPlan(plan: string) {
    setBusy(`plan-${plan}`);
    try {
      const r = unwrap(await api.adsMarketingModule.n0va1oSetPlan(plan));
      addToast("success", "Plan changed", r?.summary || "");
      await loadData();
    } catch (e: any) {
      addToast("error", "Plan change failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  const c = ov?.counts || {};
  const perf = ov?.performance || {};
  const perfItems = [
    { label: "Tool discovery p99", value: `${perf.toolDiscoveryP99Ms ?? 45}ms`, icon: Radio },
    { label: "JIT auth", value: `${perf.jitAuthMs ?? 120}ms`, icon: KeyRound },
    { label: "Sandbox cold start", value: `${perf.sandboxColdStartMs ?? 200}ms`, icon: Cpu },
    { label: "Recipe compile", value: `${perf.recipeCompileMs ?? 85}ms`, icon: Code2 },
    { label: "Webhook delivery", value: `${perf.webhookDeliveryMs ?? 50}ms`, icon: Zap },
    { label: "Account switch", value: `${perf.accountSwitchMs ?? 15}ms`, icon: ArrowRightLeft },
  ];

  const statCards = [
    { label: "Agents", value: c.agents ?? 0, icon: Boxes },
    { label: "Connections", value: `${c.connectedConnections ?? 0}/${c.totalConnections ?? 0}`, icon: Link2 },
    { label: "Recipes", value: c.recipes ?? 0, icon: Braces },
    { label: "Executions", value: c.executions ?? 0, icon: PlayCircle },
    { label: "Triggers", value: c.triggers ?? 0, icon: Zap },
    { label: "HITL pending", value: c.hitlPending ?? 0, icon: ShieldAlert },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Layers className="w-5 h-5 text-n0va-300" /> N0VA1O Gateway</h1>
          <p className="text-sm text-gray-500">One gateway to 1,380+ platforms — JIT auth, deterministic recipes, human-in-the-loop governance.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-400">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="accent-n0va-500" />
            Auto-refresh 30s
          </label>
          <button onClick={loadData} className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-700/60 text-gray-300" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <SkeletonCard />
      ) : (
        <>
          <div className="rounded-xl bg-gray-800/40 border border-gray-700/50 p-3 text-xs text-gray-400 flex flex-wrap items-center gap-2">
            <span className="text-gray-300 font-medium">{ov?.summary || "N0VA1O gateway"}</span>
            <span className="text-gray-600">·</span>
            <span className="capitalize">plan: <b className="text-n0va-300">{ov?.plan || "free"}</b></span>
            {ov?.latestEvent ? (
              <>
                <span className="text-gray-600">·</span>
                <span className="truncate">latest: {ov.latestEvent.detail || ov.latestEvent.category}</span>
              </>
            ) : null}
          </div>

          <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {statCards.map((s) => (
              <div key={s.label} className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-3">
                <p className="text-xs text-gray-500 flex items-center gap-1.5"><s.icon className="w-3.5 h-3.5" /> {s.label}</p>
                <p className="text-xl font-bold mt-1">{s.value}</p>
              </div>
            ))}
          </section>

          <section className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-3">
            <h2 className="font-semibold flex items-center gap-2"><Gauge className="w-4 h-4 text-gray-400" /> Gateway performance</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {perfItems.map((p) => (
                <div key={p.label} className="rounded-lg bg-gray-900/50 px-3 py-2">
                  <p className="text-[11px] text-gray-500 flex items-center gap-1.5"><p.icon className="w-3 h-3" /> {p.label}</p>
                  <p className="text-sm font-bold text-n0va-300 mt-0.5">{p.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-3">
              <h2 className="font-semibold flex items-center gap-2"><Boxes className="w-4 h-4 text-gray-400" /> Plan &amp; usage</h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(plans?.tiers || []).map((t: any) => (
                  <button key={t.id} onClick={() => setPlan(t.id)} disabled={busy === `plan-${t.id}`}
                    className={`rounded-lg px-2 py-2 text-left border ${plans?.currentPlan === t.id
                      ? "border-n0va-500 bg-n0va-500/10"
                      : "border-gray-700 bg-gray-900/50 hover:border-gray-500"}`}>
                    <p className="text-xs font-semibold text-gray-200">{t.name}</p>
                    <p className="text-[10px] text-gray-500">${t.monthlyPrice}/mo</p>
                    {plans?.currentPlan === t.id && <p className="text-[10px] text-n0va-300 font-medium">Current</p>}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {(usage?.usage || []).map((u: any) => (
                  <div key={u.dimension}>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span className="capitalize">{u.dimension.replace(/([A-Z])/g, " $1")}</span>
                      <span className={u.used > u.limit ? "text-red-400 font-medium" : ""}>{u.used} / {u.limit}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-900/60 mt-1">
                      <div className={`h-1.5 rounded-full ${u.used > u.limit ? "bg-red-500" : u.used / u.limit > 0.8 ? "bg-amber-500" : "bg-n0va-500"}`}
                        style={{ width: `${Math.min(100, (u.used / (u.limit || 1)) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">{usage?.summary || "Within plan limits"}</p>
            </div>

            <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-3">
              <h2 className="font-semibold flex items-center gap-2"><Activity className="w-4 h-4 text-gray-400" /> Throughput &amp; latency</h2>
              <div className="rounded-lg bg-gray-900/50 p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-gray-400">Requests/min — <b className="text-gray-200">{throughput?.current?.requestsPerMinute ?? 0}</b> / {throughput?.target?.requestsPerMinute ?? 0} target</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${throughput?.verdict === "healthy" ? "bg-emerald-500/15 text-emerald-400" : throughput?.verdict === "elevated" ? "bg-amber-500/15 text-amber-400" : "bg-red-500/15 text-red-400"}`}>
                    {throughput?.verdict || "healthy"}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-800">
                  <div className="h-2 rounded-full bg-n0va-500" style={{ width: `${throughput?.utilizationPct ?? 0}%` }} />
                </div>
                <p className="text-[11px] text-gray-500">Utilization {throughput?.utilizationPct ?? 0}% · headroom {throughput?.headroomPct ?? 100}%</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 text-left">
                      <th className="py-1 pr-2 font-medium">Region</th>
                      <th className="py-1 pr-2 font-medium">Discovery p50</th>
                      <th className="py-1 pr-2 font-medium">Discovery p99</th>
                      <th className="py-1 pr-2 font-medium">JIT auth p99</th>
                      <th className="py-1 pr-2 font-medium">Compile p99</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(latency?.regions || []).map((r: any) => (
                      <tr key={r.region} className="text-gray-300 border-t border-gray-800">
                        <td className="py-1.5 pr-2 font-medium">{r.region}</td>
                        <td className="py-1.5 pr-2">{r.discoveryP50Ms}ms</td>
                        <td className="py-1.5 pr-2">{r.discoveryP99Ms}ms</td>
                        <td className="py-1.5 pr-2">{r.jitAuthP99Ms}ms</td>
                        <td className="py-1.5 pr-2">{r.compileP99Ms}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500">{latency?.summary}</p>
            </div>
          </section>

          <section className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-3">
            <h2 className="font-semibold flex items-center gap-2"><KeyRound className="w-4 h-4 text-gray-400" /> Authentication methods</h2>
            <div className="flex flex-wrap gap-2">
              {(authMethods?.methods || []).map((m: any) => (
                <div key={m.id} className="rounded-lg bg-gray-900/50 px-3 py-2 text-xs border border-gray-700/50">
                  <p className="font-medium text-gray-200 flex items-center gap-1.5">
                    {m.name}
                    {m.jitEligible && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-n0va-500/15 text-n0va-300">JIT</span>}
                  </p>
                  <p className="text-gray-500 text-[10px] mt-0.5">{m.standard}{m.mfaSupported ? " · MFA" : ""}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500">{authMethods?.summary}</p>
          </section>

          {authDash?.counts ? (
            <section className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-2">
              <h2 className="font-semibold flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-gray-400" /> Identity plane</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {["agents", "activeAgents", "tokens", "activeTokens"].map((k) => (
                  <div key={k} className="rounded-lg bg-gray-900/50 p-2 flex justify-between">
                    <span className="text-gray-500 capitalize">{k.replace("active", "active ")}</span>
                    <span className="font-bold text-gray-200">{authDash.counts[k] ?? 0}</span>
                  </div>
                ))}
                {["connections", "connected", "accounts"].map((k) => (
                  <div key={k} className="rounded-lg bg-gray-900/50 p-2 flex justify-between">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-bold text-gray-200">{authDash.counts[k] ?? 0}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                {(authDash.recent || []).slice(0, 5).map((e: any, i: number) => (
                  <p key={i} className="text-[11px] text-gray-500 truncate">
                    <span className="text-gray-600">{new Date(e.at).toLocaleString()}</span> — {e.detail}
                  </p>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
