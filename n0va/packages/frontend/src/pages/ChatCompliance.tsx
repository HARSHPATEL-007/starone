import { useEffect, useState, useCallback } from "react";
import {
  Shield, RefreshCw, Power, AlertTriangle, ScrollText, Lock, Scale, CheckCircle2, Unlock,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const SEVERITY_STYLE: Record<string, string> = {
  critical: "bg-red-900/60 text-red-300 border border-red-700/40",
  high: "bg-amber-900/60 text-amber-300 border border-amber-700/40",
  medium: "bg-sky-900/60 text-sky-300 border border-sky-700/40",
  low: "bg-gray-700/60 text-gray-300 border border-gray-600/40",
};

export default function ChatCompliance() {
  const { addToast } = useToast();
  const [overview, setOverview] = useState<any>(null);
  const [policies, setPolicies] = useState<any[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [holds, setHolds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [holdRoom, setHoldRoom] = useState("");
  const [holdReason, setHoldReason] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [testResult, setTestResult] = useState<any>(null);

  const load = useCallback(async () => {
    const [o, p, v, h] = await Promise.all([
      api.adsMarketingModule.chat.complianceOverview().catch(() => null),
      api.adsMarketingModule.chat.policies().catch(() => null),
      api.adsMarketingModule.chat.violations({}).catch(() => null),
      api.adsMarketingModule.chat.legalHolds().catch(() => null),
    ]);
    setOverview(unwrap(o));
    setPolicies(unwrap(p)?.policies || []);
    setViolations(unwrap(v)?.violations || []);
    setHolds(unwrap(h)?.holds || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(kind: string, fn: () => Promise<any>) {
    setBusy(kind);
    const r = unwrap(await fn().catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setBusy(null);
    load();
  }

  async function evaluate() {
    if (!testMessage.trim()) return;
    setBusy("eval");
    const r = unwrap(await api.adsMarketingModule.chat.evaluateCompliance({ content: { body: testMessage }, sender: { user_id: "user_001" }, roomId: "general" }).catch(() => null));
    setTestResult(r);
    setBusy(null);
  }

  async function placeHold() {
    if (!holdRoom.trim() || !holdReason.trim()) return;
    await act("hold", () => api.adsMarketingModule.chat.placeHold({ roomId: holdRoom.trim(), reason: holdReason.trim(), placed_by: "user_001" }));
    setHoldRoom("");
    setHoldReason("");
  }

  const pendingViolations = overview?.pending || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Shield className="w-6 h-6 text-n0va-400" /> Chat Compliance</h1>
          <p className="text-gray-500 mt-1 text-sm">Policies, violations, legal holds and an immutable audit trail</p>
        </div>
        <button className="btn-secondary p-2" onClick={load} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="card !p-4"><p className="text-2xl font-bold text-white">{overview?.total ?? policies.length}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Policies</p></div>
            <div className="card !p-4"><p className="text-2xl font-bold text-emerald-400">{overview?.enabled ?? policies.filter((p) => p.enabled).length}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Enabled</p></div>
            <div className="card !p-4"><p className="text-2xl font-bold text-red-400">{overview?.pendingNum ?? pendingViolations.length}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Pending violations</p></div>
            <div className="card !p-4"><p className="text-2xl font-bold text-amber-400">{overview?.legal_holds ?? holds.length}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Legal holds</p></div>
            <div className="card !p-4"><p className="text-2xl font-bold text-n0va-400">{overview?.audit_logs ?? 0}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Audit events</p></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Scale className="w-4 h-4 text-n0va-400" /> Policies</h2>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {policies.map((p: any) => (
                  <div key={p.policyId} className="p-3 rounded-xl bg-gray-800/40">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-100 flex-1 truncate">{p.policy_name}</p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase ${p.enabled ? "bg-emerald-900/60 text-emerald-300" : "bg-gray-700/60 text-gray-400"}`}>{p.enabled ? "on" : "off"}</span>
                      <button className="btn-secondary p-1" onClick={() => act(`toggle-${p.policyId}`, () => api.adsMarketingModule.chat.updatePolicy(p.policyId, { enabled: !p.enabled }))}><Power className="w-3 h-3" /></button>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 truncate">{p.description}</p>
                    <p className="text-[10px] font-mono text-gray-600 mt-0.5 truncate">{JSON.stringify(p.config).slice(0, 140)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-n0va-400" /> Violations <span className="text-[11px] text-gray-500">· {violations.length}</span></h2>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {violations.length === 0 && <p className="text-xs text-gray-500">No violations recorded.</p>}
                {violations.map((v: any) => (
                  <div key={v.violationId} className="p-3 rounded-xl bg-gray-800/40">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase ${SEVERITY_STYLE[v.severity] || "bg-gray-700/60"}`}>{v.severity}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase ${v.status === "pending" ? "bg-amber-900/60 text-amber-300" : "bg-emerald-900/60 text-emerald-300"}`}>{v.status}</span>
                      <span className="text-[10px] text-gray-500 ml-auto">{new Date(v.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-gray-300 mt-1.5">{(v.reason || []).join(" · ")}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">room {v.roomId} · sender {v.senderId}</p>
                    {v.status === "pending" && (
                      <button className="btn-secondary text-[10px] mt-1.5" onClick={() => act(`resolve-${v.violationId}`, () => api.adsMarketingModule.chat.resolveViolation(v.violationId, "manual_review"))}>
                        <CheckCircle2 className="w-3 h-3 inline mr-1" />Resolve
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Lock className="w-4 h-4 text-n0va-400" /> Legal holds</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                <input className="input text-xs" placeholder="room id" value={holdRoom} onChange={(e) => setHoldRoom(e.target.value)} />
                <input className="input text-xs" placeholder="reason" value={holdReason} onChange={(e) => setHoldReason(e.target.value)} />
                <button className="btn-primary text-xs" disabled={!holdRoom.trim() || !holdReason.trim()} onClick={placeHold}>Place hold</button>
              </div>
              <div className="space-y-1.5">
                {holds.length === 0 && <p className="text-xs text-gray-500">No active holds.</p>}
                {holds.map((h: any) => (
                  <div key={h.holdId} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-gray-800/40">
                    <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-gray-300 truncate flex-1">{h.roomId} — {h.reason}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase ${h.status === "active" ? "bg-amber-900/60 text-amber-300" : "bg-gray-700/60 text-gray-400"}`}>{h.status}</span>
                    {h.status === "active" && (
                      <button className="text-gray-500 hover:text-emerald-400" title="Release" onClick={() => act(`release-${h.holdId}`, () => api.adsMarketingModule.chat.releaseHold(h.holdId))}><Unlock className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><ScrollText className="w-4 h-4 text-n0va-400" /> Evaluate a message</h2>
              <textarea className="input w-full resize-none" rows={3} placeholder="Paste a message to test against policies (e.g. contains a credit card number)" value={testMessage} onChange={(e) => setTestMessage(e.target.value)} />
              <button className="btn-primary text-sm mt-2" disabled={busy === "eval" || !testMessage.trim()} onClick={evaluate}>
                {busy === "eval" ? "Evaluating..." : "Evaluate"}
              </button>
              {testResult && (
                <div className={`mt-3 p-3 rounded-xl ${testResult.allowed ? "bg-emerald-900/30 border border-emerald-700/40" : "bg-red-900/30 border border-red-700/40"}`}>
                  <p className="text-sm font-semibold text-white">{testResult.allowed ? "Allowed" : "Blocked"}</p>
                  {(testResult.violations || []).map((v: string, i: number) => (
                    <p key={i} className="text-xs text-red-300 mt-1">• {v}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
