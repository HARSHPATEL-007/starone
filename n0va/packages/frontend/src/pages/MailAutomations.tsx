import { useEffect, useState, useCallback } from "react";
import {
  Zap, RefreshCw, Plus, X, Play, Pause, Trash2, TestTube2, Clock3, ListChecks,
  ChevronRight, CircleDot, TimerReset, Mail,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const triggerColor: Record<string, string> = {
  on_receive: "bg-n0va-500/15 text-n0va-300",
  on_send: "bg-emerald-500/15 text-emerald-400",
  on_star: "bg-amber-500/15 text-amber-400",
  on_label: "bg-violet-500/15 text-violet-300",
  on_snooze: "bg-orange-500/15 text-orange-400",
  manual: "bg-gray-500/10 text-gray-400",
};

export default function MailAutomations() {
  const { addToast } = useToast();
  const [dashboard, setDashboard] = useState<any>(null);
  const [automations, setAutomations] = useState<any[]>([]);
  const [triggers, setTriggers] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [log, setLog] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showRun, setShowRun] = useState<any>(null);
  const [showTest, setShowTest] = useState<any>(null);
  const [form, setForm] = useState<any>({ name: "", trigger: "on_receive", steps: [{ delayHours: 0, actions: [{ action: "label", target: "VIP" }] }] });
  const [runMsg, setRunMsg] = useState("");
  const [sample, setSample] = useState({ subject: "", body: "", from: "" });
  const [testRes, setTestRes] = useState<any>(null);

  const loadData = useCallback(async () => {
    const [d, a, t, ac, l, m] = await Promise.all([
      api.adsMarketingModule.mailAutomationDashboard().catch(() => null),
      api.adsMarketingModule.mailAutomations().catch(() => null),
      api.adsMarketingModule.mailAutomationTriggers().catch(() => null),
      api.adsMarketingModule.mailAutomationActions().catch(() => null),
      api.adsMarketingModule.mailAutomationLog().catch(() => null),
      api.adsMarketingModule.mailMessages({ folder: "inbox", limit: 50 }).catch(() => null),
    ]);
    setDashboard(unwrap(d) || null);
    const aR = unwrap(a);
    setAutomations(Array.isArray(aR) ? aR : aR?.data || []);
    const tR = unwrap(t);
    setTriggers(Array.isArray(tR) ? tR : tR?.data || []);
    const acR = unwrap(ac);
    setActions(Array.isArray(acR) ? acR : acR?.data || []);
    const lR = unwrap(l);
    setLog(Array.isArray(lR) ? lR : lR?.entries || []);
    const mR = unwrap(m);
    setMessages(Array.isArray(mR) ? mR : mR?.messages || []);
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

  async function createAutomation() {
    if (!form.name.trim() || !form.steps.length) {
      addToast("warning", "Missing fields", "Name and at least one step are required.");
      return;
    }
    setBusy("create");
    try {
      const r = unwrap(await api.adsMarketingModule.mailCreateAutomation(form));
      addToast("success", "Automation created", r?.summary || "");
      setShowCreate(false);
      setForm({ name: "", trigger: "on_receive", steps: [{ delayHours: 0, actions: [{ action: "label", target: "VIP" }] }] });
      await loadData();
    } catch (e: any) {
      addToast("error", "Create failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function runAutomation() {
    if (!runMsg) {
      addToast("warning", "Pick a message", "Choose a message to run the automation against.");
      return;
    }
    await act(`run-${showRun._id}`, () => api.adsMarketingModule.mailRunAutomation(showRun._id, runMsg), "Automation run", "Run failed");
    setShowRun(null);
    setRunMsg("");
  }

  async function testAutomation() {
    if (!sample.subject.trim() && !sample.body.trim()) {
      addToast("warning", "Sample needed", "Enter a subject or body to test against.");
      return;
    }
    try {
      const r = unwrap(await api.adsMarketingModule.mailTestAutomation(showTest._id, sample));
      setTestRes(r);
    } catch (e: any) {
      addToast("error", "Test failed", e?.message);
    }
  }

  const stats = [
    { label: "Automations", value: dashboard?.total ?? 0, icon: Zap },
    { label: "Enabled", value: dashboard?.enabled ?? 0, icon: CircleDot },
    { label: "Total runs", value: dashboard?.totalRuns ?? 0, icon: Play },
    { label: "Pending steps", value: dashboard?.scheduledPending ?? 0, icon: TimerReset },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Zap className="w-5 h-5 text-n0va-300" /> Mail Automations</h1>
          <p className="text-sm text-gray-500">If-this-then-that rules that run on message events — instantly or on a delay.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-400">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="accent-n0va-500" />
            Auto-refresh 30s
          </label>
          <button onClick={loadData} className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-700/60 text-gray-300" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New automation</span>
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
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">Triggers:</span>
            {triggers.map((t: any) => (
              <span key={t.id} className={`text-xs px-2 py-1 rounded-full ${triggerColor[t.id] || "bg-gray-500/10 text-gray-400"}`} title={t.description}>
                {t.label}
              </span>
            ))}
            {dashboard?.byTrigger && Object.entries(dashboard.byTrigger).length > 0 && (
              <span className="text-xs text-gray-500 ml-auto">
                {Object.entries(dashboard.byTrigger).map(([k, v]) => `${k}: ${v}`).join(" · ")}
              </span>
            )}
          </div>

          <div className="grid gap-3">
            {automations.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-700 p-8 text-center text-gray-500 text-sm">
                No automations yet — create one to auto-label, file, star or reply to matching mail.
              </div>
            )}
            {automations.map((a: any) => (
              <div key={a._id} className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold truncate">{a.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${triggerColor[a.trigger] || "bg-gray-500/10 text-gray-400"}`}>
                        {triggers.find((t: any) => t.id === a.trigger)?.label || a.trigger}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${a.enabled ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-500/10 text-gray-400"}`}>
                        {a.enabled ? "enabled" : "paused"}
                      </span>
                    </div>
                    {a.description && <p className="text-xs text-gray-500 mt-0.5">{a.description}</p>}
                    <p className="text-xs text-gray-500 mt-1">
                      {a.runCount ?? 0} run(s) · {a.matchCount ?? 0} match(es)
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => { setShowTest(a); setTestRes(null); setSample({ subject: "", body: "", from: "" }); }}
                      className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 text-gray-300" title="Test with a sample">
                      <TestTube2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setShowRun(a); setRunMsg(""); }}
                      className="p-2 rounded-lg bg-n0va-500/20 hover:bg-n0va-500/30 text-n0va-300" title="Run against a message">
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => act(`toggle-${a._id}`, () => api.adsMarketingModule.mailToggleAutomation(a._id), "Toggled", "Toggle failed")}
                      disabled={busy === `toggle-${a._id}`}
                      className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 text-gray-300" title={a.enabled ? "Pause" : "Enable"}
                    >
                      {a.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => act(`del-${a._id}`, () => api.adsMarketingModule.mailDeleteAutomation(a._id), "Deleted", "Delete failed")}
                      disabled={busy === `del-${a._id}`}
                      className="p-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400" title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {a.steps.map((s: any, i: number) => (
                    <div key={s.stepId} className="flex flex-wrap items-center gap-2 text-sm rounded-lg bg-gray-900/50 px-3 py-2">
                      <span className="text-xs font-mono text-gray-500">{i + 1}</span>
                      <span className="font-medium truncate">{s.name}</span>
                      {s.delayHours > 0 && (
                        <span className="text-xs text-amber-400 flex items-center gap-1"><Clock3 className="w-3 h-3" /> +{s.delayHours}h</span>
                      )}
                      {s.condition && (
                        <span className="text-xs text-violet-300 font-mono">if {s.condition.field} {s.condition.operator} "{s.condition.value}"</span>
                      )}
                      <span className="flex flex-wrap gap-1 ml-auto">
                        {s.actions.map((ac: any, j: number) => (
                          <span key={j} className="text-[11px] px-1.5 py-0.5 rounded bg-n0va-500/10 text-n0va-300">
                            {ac.action}{ac.target ? ` → ${ac.target}` : ""}
                          </span>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2"><ListChecks className="w-4 h-4 text-gray-400" /> Activity log</h3>
            {log.length === 0 && <p className="text-sm text-gray-500">No runs yet.</p>}
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {log.map((l: any) => (
                <div key={l.logId} className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                  <span className="font-mono text-gray-600">{new Date(l.at).toLocaleString()}</span>
                  <span className="text-gray-200">{l.automationName}</span>
                  <span className={`px-1.5 py-0.5 rounded ${l.status === "matched" ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-500/10 text-gray-400"}`}>{l.status}</span>
                  {l.actionsApplied?.length > 0 && (
                    <span className="text-gray-500 truncate">{l.actionsApplied.join(", ")}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full sm:max-w-lg bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">New automation</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <input className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm" placeholder="Automation name (e.g. File invoices)"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <div className="flex flex-wrap gap-2">
                {triggers.map((t: any) => (
                  <button key={t.id} onClick={() => setForm({ ...form, trigger: t.id })}
                    className={`text-xs px-2.5 py-1.5 rounded-full border ${form.trigger === t.id ? "border-n0va-500 bg-n0va-500/20 text-n0va-300" : "border-gray-700 text-gray-400"}`}
                    title={t.description}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {form.steps.map((s: any, i: number) => (
                  <div key={i} className="rounded-lg bg-gray-800/60 border border-gray-700 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Step {i + 1}</span>
                      <input className="flex-1 rounded-lg bg-gray-900 border border-gray-700 px-2 py-1.5 text-sm" placeholder="Step name"
                        value={s.name || ""} onChange={(e) => setForm({ ...form, steps: form.steps.map((x: any, xi: number) => xi === i ? { ...x, name: e.target.value } : x) })} />
                      <input type="number" min={0} className="w-20 rounded-lg bg-gray-900 border border-gray-700 px-2 py-1.5 text-sm" placeholder="delay h"
                        value={s.delayHours} onChange={(e) => setForm({ ...form, steps: form.steps.map((x: any, xi: number) => xi === i ? { ...x, delayHours: Number(e.target.value) } : x) })} />
                      {form.steps.length > 1 && (
                        <button onClick={() => setForm({ ...form, steps: form.steps.filter((_: any, xi: number) => xi !== i) })}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"><X className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                    {s.actions.map((ac: any, ai: number) => (
                      <div key={ai} className="flex flex-wrap items-center gap-1.5">
                        <select className="rounded-lg bg-gray-900 border border-gray-700 px-2 py-1.5 text-xs"
                          value={ac.action} onChange={(e) => setForm({ ...form, steps: form.steps.map((x: any, xi: number) => xi === i ? { ...x, actions: x.actions.map((y: any, yi: number) => yi === ai ? { ...y, action: e.target.value } : y) } : x) })}>
                          {actions.map((aa: any) => <option key={aa.id} value={aa.id}>{aa.label}</option>)}
                        </select>
                        {actions.find((aa: any) => aa.id === ac.action)?.target && (
                          <input className="flex-1 min-w-24 rounded-lg bg-gray-900 border border-gray-700 px-2 py-1.5 text-xs" placeholder="Target (folder, label, email…)"
                            value={ac.target || ""} onChange={(e) => setForm({ ...form, steps: form.steps.map((x: any, xi: number) => xi === i ? { ...x, actions: x.actions.map((y: any, yi: number) => yi === ai ? { ...y, target: e.target.value } : y) } : x) })} />
                        )}
                        <button onClick={() => setForm({ ...form, steps: form.steps.map((x: any, xi: number) => xi === i ? { ...x, actions: x.actions.filter((_: any, yi: number) => yi !== ai) } : x) })}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                    <button onClick={() => setForm({ ...form, steps: form.steps.map((x: any, xi: number) => xi === i ? { ...x, actions: [...x.actions, { action: "notify" }] } : x) })}
                      className="text-xs text-n0va-300 hover:text-n0va-200">+ Add action</button>
                  </div>
                ))}
              </div>
              <button onClick={() => setForm({ ...form, steps: [...form.steps, { delayHours: 0, actions: [{ action: "notify" }] }] })}
                className="text-xs text-n0va-300 hover:text-n0va-200">+ Add step</button>
              <button onClick={createAutomation} disabled={busy === "create"}
                className="w-full py-2.5 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white font-medium">
                {busy === "create" ? "Creating…" : "Create automation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRun && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowRun(null)}>
          <div className="w-full sm:max-w-md bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold">Run "{showRun.name}"</h2>
              <button onClick={() => setShowRun(null)} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400"><X className="w-4 h-4" /></button>
            </div>
            <label className="text-xs text-gray-500 mb-1 block">Message to evaluate</label>
            <select className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm" value={runMsg} onChange={(e) => setRunMsg(e.target.value)}>
              <option value="">Pick a message…</option>
              {messages.map((m: any) => (
                <option key={m._id} value={m._id}>{(m.subject || "(no subject)").slice(0, 60)} — {m.from?.email || m.from?.name || "?"}</option>
              ))}
            </select>
            <button onClick={runAutomation} disabled={busy === `run-${showRun._id}`}
              className="mt-4 w-full py-2.5 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white font-medium flex items-center justify-center gap-2">
              <Play className="w-4 h-4" /> {busy === `run-${showRun._id}` ? "Running…" : "Run now"}
            </button>
          </div>
        </div>
      )}

      {showTest && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowTest(null)}>
          <div className="w-full sm:max-w-md bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold">Test "{showTest.name}"</h2>
              <button onClick={() => setShowTest(null)} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2">
              <input className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm" placeholder="Sample subject (e.g. Q3 invoice)"
                value={sample.subject} onChange={(e) => setSample({ ...sample, subject: e.target.value })} />
              <input className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm" placeholder="Sample sender (e.g. finance@n0va.mail)"
                value={sample.from} onChange={(e) => setSample({ ...sample, from: e.target.value })} />
              <textarea className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm" rows={3} placeholder="Sample body…"
                value={sample.body} onChange={(e) => setSample({ ...sample, body: e.target.value })} />
              <button onClick={testAutomation} className="w-full py-2.5 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white font-medium flex items-center justify-center gap-2">
                <TestTube2 className="w-4 h-4" /> Test
              </button>
            </div>
            {testRes && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-emerald-400">{testRes.summary}</p>
                {testRes.stepResults.map((s: any, i: number) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 text-xs rounded-lg bg-gray-800/60 px-3 py-2">
                    <ChevronRight className="w-3 h-3 text-gray-500" />
                    <span className="text-gray-200">{s.name}</span>
                    {s.delayHours > 0 && <span className="text-amber-400">+{s.delayHours}h</span>}
                    <span className={`ml-auto px-1.5 py-0.5 rounded ${s.wouldRun ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-500/10 text-gray-400"}`}>
                      {s.wouldRun ? "would run" : "skip"}
                    </span>
                    {s.actionsToRun?.length > 0 && <span className="text-gray-500 truncate">{s.actionsToRun.join(", ")}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <p className="text-[11px] text-gray-600 flex items-center gap-1"><Mail className="w-3 h-3" /> Delayed steps are queued and executed when due from the command center.</p>
    </div>
  );
}
