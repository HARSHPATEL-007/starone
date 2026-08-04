import { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck, RefreshCw, Plus, X, Ban, Undo2, AlertTriangle, Bug, Trash2,
  MailX, ThumbsDown, Activity, CircleAlert, BadgeCheck,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const levelColor: Record<string, string> = {
  good: "bg-emerald-500/15 text-emerald-400",
  fair: "bg-amber-500/15 text-amber-400",
  poor: "bg-red-500/15 text-red-400",
};

const typeColor: Record<string, string> = {
  hard: "bg-red-500/15 text-red-400",
  soft: "bg-amber-500/15 text-amber-400",
  complaint: "bg-orange-500/15 text-orange-400",
};

const reasonLabel: Record<string, string> = {
  hard_bounce: "Hard bounce",
  complaint: "Complaint",
  manual: "Manual block",
  unsubscribe: "Unsubscribed",
};

export default function MailDeliverability() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [bounces, setBounces] = useState<any[]>([]);
  const [bounceFilter, setBounceFilter] = useState("");
  const [suppression, setSuppression] = useState<any[]>([]);
  const [suppressFilter, setSuppressFilter] = useState("");
  const [hygiene, setHygiene] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showBounce, setShowBounce] = useState(false);
  const [showSuppress, setShowSuppress] = useState(false);
  const [bounceForm, setBounceForm] = useState({ email: "", type: "soft", reason: "" });
  const [suppressForm, setSuppressForm] = useState({ email: "", reason: "manual", note: "" });

  const loadData = useCallback(async () => {
    const [d, b, s, hy] = await Promise.all([
      api.adsMarketingModule.mailDeliverabilityDashboard().catch(() => null),
      api.adsMarketingModule.mailBounces(bounceFilter || undefined).catch(() => null),
      api.adsMarketingModule.mailSuppressionList(suppressFilter || undefined).catch(() => null),
      api.adsMarketingModule.mailListHygiene().catch(() => null),
    ]);
    setDash(unwrap(d) || null);
    const bR = unwrap(b);
    setBounces(bR?.bounces || []);
    const sR = unwrap(s);
    setSuppression(sR?.entries || []);
    setHygiene(unwrap(hy) || null);
    setLoading(false);
  }, [bounceFilter, suppressFilter]);

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

  async function act(key: string, fn: () => Promise<any>, success: string, errorTitle: string) {
    setBusy(key);
    try {
      const r = unwrap(await fn());
      addToast("success", success, r?.summary || "");
      await loadData();
    } catch (e: any) {
      addToast("error", errorTitle, e?.message);
    } finally {
      setBusy("");
    }
  }

  async function recordBounce() {
    if (!bounceForm.email.trim()) {
      addToast("warning", "Email required", "Enter the recipient address.");
      return;
    }
    setBusy("bounce");
    try {
      const r = unwrap(await api.adsMarketingModule.mailRecordBounce(bounceForm));
      addToast("success", "Bounce recorded", r?.summary || "");
      setBounceForm({ email: "", type: "soft", reason: "" });
      setShowBounce(false);
      await loadData();
    } catch (e: any) {
      addToast("error", "Record failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function suppress() {
    if (!suppressForm.email.trim()) {
      addToast("warning", "Email required", "Enter the address to suppress.");
      return;
    }
    setBusy("suppress");
    try {
      const r = unwrap(await api.adsMarketingModule.mailSuppressEmail(suppressForm));
      addToast("success", "Suppressed", r?.summary || "");
      setSuppressForm({ email: "", reason: "manual", note: "" });
      setShowSuppress(false);
      await loadData();
    } catch (e: any) {
      addToast("error", "Suppress failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  const rep = dash?.reputation;
  const stats = [
    { label: "Reputation", value: rep ? `${rep.score}/100` : "—", icon: BadgeCheck, extra: rep?.level || "" },
    { label: "Bounces", value: dash?.bounces?.total ?? 0, icon: MailX, extra: `hard ${dash?.bounces?.byType?.hard ?? 0}` },
    { label: "Suppressed", value: dash?.suppression?.total ?? 0, icon: Ban, extra: "" },
    { label: "Hygiene flags", value: dash?.hygiene?.total ?? 0, icon: Bug, extra: "" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-n0va-300" /> Mail Deliverability</h1>
          <p className="text-sm text-gray-500">Bounce tracking, automatic suppression and sending reputation for your mail domains.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-400">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="accent-n0va-500" />
            Auto-refresh 30s
          </label>
          <button onClick={loadData} className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-700/60 text-gray-300" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setShowSuppress(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium">
            <Ban className="w-4 h-4" /> <span className="hidden sm:inline">Suppress</span>
          </button>
          <button onClick={() => setShowBounce(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white text-sm font-medium">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Record bounce</span>
          </button>
        </div>
      </div>

      {loading ? (
        <SkeletonCard />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <s.icon className="w-4 h-4 text-gray-500" />
                </div>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
                {s.extra && <p className={`text-xs mt-0.5 ${levelColor[rep?.level] || "text-gray-500"}`}>{s.extra}</p>}
              </div>
            ))}
          </div>

          {rep && (
            <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-gray-400" /> Sending reputation
                  <span className={`text-xs px-2 py-0.5 rounded-full ${levelColor[rep.level] || "bg-gray-500/10 text-gray-400"}`}>{rep.level}</span>
                </h3>
                <span className="text-xs text-gray-500">{rep.summary}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-gray-900 overflow-hidden">
                <div className={`h-full rounded-full ${rep.score >= 70 ? "bg-emerald-500" : rep.score >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${rep.score}%` }} />
              </div>
              <p className="text-xs text-gray-500 mt-1.5">hard {rep.hardBounces} · complaints {rep.complaints}</p>
            </div>
          )}

          {dash?.alerts?.length > 0 && (
            <div className="space-y-1.5">
              {dash.alerts.map((a: any, i: number) => (
                <div key={i} className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 border ${a.severity === "high" ? "border-red-500/30 bg-red-500/10 text-red-300" : a.severity === "medium" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-gray-700 bg-gray-800/60 text-gray-400"}`}>
                  <CircleAlert className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{a.message}</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-4 min-w-0">
            <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="font-semibold text-sm">Bounce log ({dash?.bounces?.total ?? bounces.length})</h3>
                <div className="flex gap-1">
                  {["", "hard", "soft", "complaint"].map((f) => (
                    <button key={f} onClick={() => setBounceFilter(f)}
                      className={`text-[11px] px-2 py-1 rounded-full ${bounceFilter === f ? "bg-n0va-500/20 text-n0va-300" : "bg-gray-700/50 text-gray-400"}`}>
                      {f === "" ? "all" : f}
                    </button>
                  ))}
                </div>
              </div>
              {bounces.length === 0 && <p className="text-sm text-gray-500">No bounces recorded.</p>}
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {bounces.map((b: any) => (
                  <div key={b.bounceId} className="flex flex-wrap items-center gap-2 text-xs rounded-lg bg-gray-900/50 px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded ${typeColor[b.type] || "bg-gray-500/10 text-gray-400"}`}>{b.type}</span>
                    <span className="text-gray-200 truncate">{b.email}</span>
                    {b.reason && <span className="text-gray-500 truncate">{b.reason}</span>}
                    <span className="ml-auto text-gray-600 font-mono">{new Date(b.at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="font-semibold text-sm">Suppression list ({dash?.suppression?.total ?? suppression.length})</h3>
                <div className="flex gap-1">
                  {["", "hard_bounce", "complaint", "manual", "unsubscribe"].map((f) => (
                    <button key={f} onClick={() => setSuppressFilter(f)}
                      className={`text-[11px] px-2 py-1 rounded-full ${suppressFilter === f ? "bg-n0va-500/20 text-n0va-300" : "bg-gray-700/50 text-gray-400"}`}>
                      {f === "" ? "all" : f.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
              {suppression.length === 0 && <p className="text-sm text-gray-500">No suppressed addresses.</p>}
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {suppression.map((s: any) => (
                  <div key={s.suppressionId} className="flex flex-wrap items-center gap-2 text-xs rounded-lg bg-gray-900/50 px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded ${s.reason === "complaint" ? "bg-red-500/15 text-red-400" : s.reason === "hard_bounce" ? "bg-orange-500/15 text-orange-400" : "bg-gray-500/10 text-gray-400"}`}>
                      {reasonLabel[s.reason] || s.reason}
                    </span>
                    <span className="text-gray-200 truncate">{s.email}</span>
                    <button
                      onClick={() => act(`un-${s.suppressionId}`, () => api.adsMarketingModule.mailUnsuppressEmail(s.email), "Removed", "Remove failed")}
                      disabled={busy === `un-${s.suppressionId}`}
                      className="ml-auto p-1.5 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 text-gray-300" title="Remove from suppression list">
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Bug className="w-4 h-4 text-gray-400" /> List hygiene
              <span className="text-xs text-gray-500">({hygiene?.total ?? 0} contact(s) to remove)</span>
            </h3>
            {hygiene?.suggested?.length === 0 && <p className="text-sm text-gray-500">No contacts need list cleanup.</p>}
            <div className="flex flex-wrap gap-2">
              {hygiene?.suggested?.map((c: any) => (
                <span key={c.contactId} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/20">
                  {c.name} &lt;{c.email}&gt; <span className="text-red-400/70">({c.reason})</span>
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {showBounce && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowBounce(false)}>
          <div className="w-full sm:max-w-md bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">Record a bounce</h2>
              <button onClick={() => setShowBounce(false)} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <input className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm" placeholder="Recipient email (e.g. user@partner.com)"
                value={bounceForm.email} onChange={(e) => setBounceForm({ ...bounceForm, email: e.target.value })} />
              <div className="flex gap-2">
                {["soft", "hard", "complaint"].map((t) => (
                  <button key={t} onClick={() => setBounceForm({ ...bounceForm, type: t })}
                    className={`flex-1 text-xs px-3 py-2 rounded-lg border ${bounceForm.type === t ? "border-n0va-500 bg-n0va-500/20 text-n0va-300" : "border-gray-700 text-gray-400"}`}>
                    {t}
                  </button>
                ))}
              </div>
              <textarea className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm" rows={2} placeholder="Reason / SMTP diagnostic…"
                value={bounceForm.reason} onChange={(e) => setBounceForm({ ...bounceForm, reason: e.target.value })} />
              <p className="text-xs text-gray-500">Hard bounces and complaints are suppressed automatically.</p>
              <button onClick={recordBounce} disabled={busy === "bounce"}
                className="w-full py-2.5 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white font-medium">
                {busy === "bounce" ? "Recording…" : "Record bounce"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuppress && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowSuppress(false)}>
          <div className="w-full sm:max-w-md bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">Suppress an address</h2>
              <button onClick={() => setShowSuppress(false)} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <input className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm" placeholder="Email to suppress"
                value={suppressForm.email} onChange={(e) => setSuppressForm({ ...suppressForm, email: e.target.value })} />
              <div className="flex flex-wrap gap-1.5">
                {["manual", "hard_bounce", "complaint", "unsubscribe"].map((r) => (
                  <button key={r} onClick={() => setSuppressForm({ ...suppressForm, reason: r })}
                    className={`text-xs px-2.5 py-1.5 rounded-full border ${suppressForm.reason === r ? "border-n0va-500 bg-n0va-500/20 text-n0va-300" : "border-gray-700 text-gray-400"}`}>
                    {reasonLabel[r] || r}
                  </button>
                ))}
              </div>
              <button onClick={suppress} disabled={busy === "suppress"}
                className="w-full py-2.5 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white font-medium flex items-center justify-center gap-2">
                <Ban className="w-4 h-4" /> {busy === "suppress" ? "Suppressing…" : "Suppress"}
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-[11px] text-gray-600 flex items-center gap-1"><ThumbsDown className="w-3 h-3" /> Suppressed addresses are checked before every campaign send.</p>
    </div>
  );
}
