import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw, AlertTriangle, Plus, X, Zap, PauseCircle, CheckCircle2,
  Target, FlaskConical, Trash2, Code2, Eye, Sparkles, Play,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const FIELDS = ["subject", "from", "body", "to", "label", "category", "importance", "has_attachment"];
const OPERATORS = ["contains", "is", "is_not", "starts_with"];
const ACTIONS = ["label", "archive", "move", "mark_read", "star", "forward", "notify", "auto_reply"];

const ACTION_BADGE: Record<string, string> = {
  label: "bg-purple-500/10 text-purple-400",
  archive: "bg-amber-500/10 text-amber-400",
  move: "bg-sky-500/10 text-sky-400",
  mark_read: "bg-emerald-500/10 text-emerald-400",
  star: "bg-yellow-500/10 text-yellow-400",
  forward: "bg-cyan-500/10 text-cyan-400",
  notify: "bg-orange-500/10 text-orange-400",
  auto_reply: "bg-pink-500/10 text-pink-400",
};

const SCRIPT_SAMPLE = `if subject contains "invoice" then label "Invoices"
if from is "billing@n0va.mail" then mark_read
if importance is "high" then notify "ops@n0va.ai"`;

export default function MailRules() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiTestBefore, setAiTestBefore] = useState(true);
  const [aiRes, setAiRes] = useState<any>(null);
  const [testing, setTesting] = useState<any>(null);
  const [testRes, setTestRes] = useState<any>(null);
  const [form, setForm] = useState<any>({
    name: "", kind: "visual", conditions: [{ field: "subject", operator: "contains", value: "" }],
    actions: [{ action: "label", target: "" }], script: SCRIPT_SAMPLE,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    const [d, t] = await Promise.all([
      api.adsMarketingModule.mailRulesDashboard().catch(() => null),
      api.adsMarketingModule.mailRuleTemplates().catch(() => null),
    ]);
    setDash(unwrap(d));
    setTemplates(Array.isArray(t) ? t : t?.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    function refresh() { loadData(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadData]);

  async function toggleRule(r: any) {
    setBusy(true);
    try {
      const res = unwrap(await api.adsMarketingModule.mailToggleRule(r._id, !r.enabled));
      addToast("success", res?.enabled ? "Rule enabled" : "Rule paused", res?.summary || "");
      await loadData();
    } catch (e: any) {
      addToast("error", "Toggle failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteRule(r: any) {
    setBusy(true);
    try {
      const res = unwrap(await api.adsMarketingModule.mailDeleteRule(r._id));
      addToast("success", "Rule deleted", res?.summary || "");
      await loadData();
    } catch (e: any) {
      addToast("error", "Delete failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function instantiate(t: any) {
    setBusy(true);
    try {
      const res = unwrap(await api.adsMarketingModule.mailInstantiateRuleTemplate(t.templateId));
      addToast("success", "Template added", res?.summary || "");
      await loadData();
    } catch (e: any) {
      addToast("error", "Instantiate failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function sweepRules() {
    setBusy(true);
    try {
      const res = unwrap(await api.adsMarketingModule.mailSweepRules());
      addToast("success", "Rules run across inbox", res?.summary || "");
      await loadData();
    } catch (e: any) {
      addToast("error", "Sweep failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function createRule() {
    if (!form.name.trim()) {
      addToast("warning", "Missing name", "Give the rule a name.");
      return;
    }
    const payload: any = { name: form.name, kind: form.kind, trigger: "on_receive", enabled: true };
    if (form.kind === "visual") {
      const conditions = form.conditions.filter((c: any) => c.value !== "" || c.field === "has_attachment");
      const actions = form.actions.filter((a: any) => a.action !== "");
      if (!conditions.length) {
        addToast("warning", "No conditions", "Add at least one condition.");
        return;
      }
      if (!actions.length) {
        addToast("warning", "No actions", "Add at least one action.");
        return;
      }
      payload.conditions = conditions;
      payload.actions = actions;
    } else {
      if (!form.script.trim()) {
        addToast("warning", "No script", "Write at least one rule line.");
        return;
      }
      payload.script = form.script;
    }
    setBusy(true);
    try {
      const res = unwrap(await api.adsMarketingModule.mailCreateRule(payload));
      addToast("success", "Rule created", res?.summary || "");
      setCreating(false);
      setForm({
        name: "", kind: "visual", conditions: [{ field: "subject", operator: "contains", value: "" }],
        actions: [{ action: "label", target: "" }], script: SCRIPT_SAMPLE,
      });
      await loadData();
    } catch (e: any) {
      addToast("error", "Create failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function runTest() {
    if (!testing) return;
    setBusy(true);
    try {
      const res = unwrap(await api.adsMarketingModule.mailTestRule(testing._id, {
        subject: testing.sampleSubject || "",
        from: { name: testing.sampleFrom, email: testing.sampleFrom },
        body: testing.sampleBody || "",
      }));
      setTestRes(res);
    } catch (e: any) {
      addToast("error", "Test failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function generateRule() {
    if (!aiText.trim()) {
      addToast("warning", "Describe the rule", "e.g. \u201CArchive all marketing newsletters and mark them read\u201D");
      return;
    }
    setBusy(true);
    setAiRes(null);
    try {
      const res = unwrap(await api.adsMarketingModule.mailAiGenerateRule(aiText.trim(), { testBeforeEnable: aiTestBefore }));
      setAiRes(res);
      addToast("success", "Rule generated", res?.summary || "");
      await loadData();
    } catch (e: any) {
      addToast("error", "Generation failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleGenerated() {
    if (!aiRes) return;
    setBusy(true);
    try {
      const res = unwrap(await api.adsMarketingModule.mailToggleRule(aiRes.ruleId, !aiRes.enabled));
      setAiRes({ ...aiRes, enabled: res.enabled });
      addToast("success", res.enabled ? "Rule enabled" : "Rule paused", res?.summary || "");
    } catch (e: any) {
      addToast("error", "Toggle failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  const rules = dash?.rules || [];
  const totals = dash?.totals;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">Mail Rules</h1><p className="text-gray-500 mt-1">Visual rules + App-Script style automation</p></div>
          <div className="animate-spin w-5 h-5 border-2 border-n0va-500 border-t-transparent rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Zap className="w-6 h-6 text-n0va-400" /> Mail Rules</h1>
          <p className="text-gray-500 mt-1 text-sm">Visual conditions or script DSL — applied on every receive</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary p-2" onClick={loadData} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary flex items-center gap-2" disabled={busy} onClick={sweepRules} title="Run all rules against the inbox now">
            <Play className="w-4 h-4 text-emerald-400" /> <span className="hidden sm:inline">Run now</span>
          </button>
          <button className="btn-secondary flex items-center gap-2" onClick={() => { setAiOpen(true); setAiText(""); setAiRes(null); }}>
            <Sparkles className="w-4 h-4 text-n0va-400" /> <span className="hidden sm:inline">AI rule</span>
          </button>
          <button className="btn-primary flex items-center gap-2" onClick={() => setCreating(true)}><Plus className="w-4 h-4" /> <span className="hidden sm:inline">New rule</span></button>
        </div>
      </div>

      {!rules.length && !templates.length && (
        <div className="card border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-sm text-red-300 font-medium">Rules data unavailable</p>
              <p className="text-xs text-red-400/70">Check that the backend is running.</p>
            </div>
            <button className="btn-secondary text-xs ml-auto" onClick={loadData}>Retry</button>
          </div>
        </div>
      )}

      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center gap-2 mb-2"><Target className="w-4 h-4 text-n0va-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Rules</span></div>
            <p className="text-3xl font-bold text-white">{totals.total}</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Active</span></div>
            <p className="text-3xl font-bold text-white">{totals.enabled}</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-2"><PauseCircle className="w-4 h-4 text-amber-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Paused</span></div>
            <p className="text-3xl font-bold text-white">{totals.paused}</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-2"><Zap className="w-4 h-4 text-n0va-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Total matches</span></div>
            <p className="text-3xl font-bold text-white">{totals.matches}</p>
          </div>
        </div>
      )}

      <div className="card !p-2">
        <div className="px-3 py-2 border-b border-gray-800/60 flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Your rules</span>
          {dash?.summary && <span className="text-xs text-gray-500">{dash.summary}</span>}
        </div>
        <ul className="divide-y divide-gray-800/50">
          {(rules.length ? rules : []).map((r: any) => (
            <li key={r._id} className="px-3 py-4">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{r.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${r.kind === "script" ? "bg-cyan-500/10 text-cyan-400" : "bg-n0va-600/20 text-n0va-400"}`}>
                      <span className="inline-flex items-center gap-1">{r.kind === "script" ? <Code2 className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}{r.kind}</span>
                    </span>
                    {r.templateId && <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold bg-gray-700/60 text-gray-400">{r.templateId}</span>}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${r.enabled ? "bg-green-500/10 text-green-400" : "bg-gray-600/30 text-gray-400"}`}>
                      {r.enabled ? "active" : "paused"}
                    </span>
                    {r.matchCount > 0 && <span className="text-[9px] text-gray-500">{r.matchCount} matches</span>}
                  </div>
                  {r.kind === "visual" ? (
                    <>
                      <p className="text-xs text-gray-400 mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                        {(r.conditions || []).map((c: any, i: number) => (
                          <span key={i} className="text-gray-500"><span className="text-n0va-400">{c.field}</span> <span className="text-gray-600">{c.operator}</span> <span className="text-gray-300">"{c.value}"</span></span>
                        ))}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {(r.actions || []).map((a: any, i: number) => (
                          <span key={i} className={`text-[10px] px-2 py-0.5 rounded ${ACTION_BADGE[a.action] || "bg-gray-700 text-gray-300"}`}>
                            {a.action}{a.target ? ` → ${a.target}` : ""}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <pre className="text-[10px] text-cyan-300/80 bg-gray-800/40 rounded-md p-2 mt-1.5 overflow-x-auto whitespace-pre-wrap break-words">
                      {(r.script || "").split(/\r?\n/).filter(Boolean).map((l: string, i: number) => <div key={i}>{l}</div>)}
                    </pre>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    className={`relative w-9 h-5 rounded-full transition-colors ${r.enabled ? "bg-n0va-600" : "bg-gray-700"}`}
                    disabled={busy}
                    onClick={() => toggleRule(r)}
                    title={r.enabled ? "Pause" : "Enable"}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${r.enabled ? "left-[18px]" : "left-0.5"}`} />
                  </button>
                  <button className="btn-secondary text-xs px-2 py-1.5" disabled={busy} onClick={() => { setTesting({ ...r, sampleSubject: "", sampleFrom: "", sampleBody: "" }); setTestRes(null); }} title="Test against a sample">
                    <FlaskConical className="w-3.5 h-3.5" />
                  </button>
                  <button className="btn-danger text-xs px-2 py-1.5" disabled={busy} onClick={() => deleteRule(r)} title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
          {rules.length === 0 && (
            <li className="px-3 py-10 text-center text-sm text-gray-500">No rules yet — create one or instantiate a template below.</li>
          )}
        </ul>
      </div>

      {templates.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Start from a template</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {templates.map((t: any) => (
              <div key={t.templateId} className="card">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-white">{t.name}</span>
                  <button className="btn-secondary text-xs px-2 py-1" disabled={busy} onClick={() => instantiate(t)}><Plus className="w-3 h-3" /> Add</button>
                </div>
                <p className="text-xs text-gray-500 mt-1">{t.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(t.actions || []).map((a: any, i: number) => (
                    <span key={i} className={`text-[10px] px-2 py-0.5 rounded ${ACTION_BADGE[a.action] || "bg-gray-700 text-gray-300"}`}>
                      {a.action}{a.target ? ` → ${a.target}` : ""}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {dash?.recentActivity?.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3"><Zap className="w-4 h-4 text-n0va-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Recent rule activity</span></div>
          <ul className="space-y-2">
            {dash.recentActivity.slice(0, 5).map((a: any, i: number) => (
              <li key={i} className="flex items-center justify-between gap-2 text-xs border-b border-gray-800/50 last:border-0 pb-2">
                <span className="text-gray-400 truncate"><span className="text-gray-200 font-medium">{a.ruleName}</span> · {a.subject}</span>
                <span className="text-gray-600 shrink-0">{new Date(a.executedAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-gray-900">
              <h2 className="font-semibold text-white flex items-center gap-2"><Zap className="w-4 h-4 text-n0va-400" /> New rule</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setCreating(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Name</label>
                  <input className="input" placeholder="e.g. Tame newsletters" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Kind</label>
                  <select className="select" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                    <option value="visual">Visual conditions</option>
                    <option value="script">Script (DSL)</option>
                  </select>
                </div>
              </div>

              {form.kind === "visual" ? (
                <>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5">Conditions (all must match)</label>
                    <div className="space-y-2">
                      {form.conditions.map((c: any, i: number) => (
                        <div key={i} className="flex gap-2 flex-wrap items-center">
                          <select className="select text-xs !w-auto" value={c.field} onChange={(e) => { const next = [...form.conditions]; next[i] = { ...next[i], field: e.target.value }; setForm({ ...form, conditions: next }); }}>
                            {FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
                          </select>
                          <select className="select text-xs !w-auto" value={c.operator} onChange={(e) => { const next = [...form.conditions]; next[i] = { ...next[i], operator: e.target.value }; setForm({ ...form, conditions: next }); }}>
                            {OPERATORS.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                          {c.field !== "has_attachment" && (
                            <input className="input text-xs flex-1 min-w-[120px]" placeholder="value" value={c.value} onChange={(e) => { const next = [...form.conditions]; next[i] = { ...next[i], value: e.target.value }; setForm({ ...form, conditions: next }); }} />
                          )}
                          <button className="text-gray-500 hover:text-red-400" onClick={() => setForm({ ...form, conditions: form.conditions.filter((_: any, j: number) => j !== i) })}><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                    <button className="btn-secondary text-xs mt-2" onClick={() => setForm({ ...form, conditions: [...form.conditions, { field: "subject", operator: "contains", value: "" }] })}>
                      <Plus className="w-3 h-3 inline" /> Condition
                    </button>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5">Actions</label>
                    <div className="space-y-2">
                      {form.actions.map((a: any, i: number) => (
                        <div key={i} className="flex gap-2 flex-wrap items-center">
                          <select className="select text-xs !w-auto" value={a.action} onChange={(e) => { const next = [...form.actions]; next[i] = { ...next[i], action: e.target.value }; setForm({ ...form, actions: next }); }}>
                            {ACTIONS.map((x) => <option key={x} value={x}>{x}</option>)}
                          </select>
                          <input className="input text-xs flex-1 min-w-[120px]" placeholder={a.action === "move" ? "folder (e.g. archive)" : "target (e.g. label name)"} value={a.target} onChange={(e) => { const next = [...form.actions]; next[i] = { ...next[i], target: e.target.value }; setForm({ ...form, actions: next }); }} />
                          <button className="text-gray-500 hover:text-red-400" onClick={() => setForm({ ...form, actions: form.actions.filter((_: any, j: number) => j !== i) })}><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                    <button className="btn-secondary text-xs mt-2" onClick={() => setForm({ ...form, actions: [...form.actions, { action: "label", target: "" }] })}>
                      <Plus className="w-3 h-3 inline" /> Action
                    </button>
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Script — one rule per line</label>
                  <textarea
                    className="input font-mono text-xs min-h-[160px]"
                    value={form.script}
                    onChange={(e) => setForm({ ...form, script: e.target.value })}
                  />
                  <p className="text-[10px] text-gray-600 mt-1">
                    <span className="text-n0va-400">if</span> field <span className="text-n0va-400">contains|is|is_not</span> "value" <span className="text-n0va-400">then</span> action ["target"] — actions: label, archive, move, mark_read, forward, star, notify, auto_reply
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button className="btn-secondary text-sm" onClick={() => setCreating(false)}>Cancel</button>
                <button className="btn-primary text-sm" disabled={busy} onClick={createRule}>Create rule</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {aiOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-n0va-400" /> AI rule generator</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setAiOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Describe the rule in plain English</label>
                <textarea
                  className="input min-h-[90px]"
                  placeholder="e.g. Archive all marketing newsletters and mark them read"
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                <input type="checkbox" className="accent-n0va-500" checked={aiTestBefore} onChange={(e) => setAiTestBefore(e.target.checked)} />
                Dry-run against recent messages before enabling
              </label>
              <button className="btn-primary text-sm w-full" disabled={busy} onClick={generateRule}>
                <Sparkles className="w-4 h-4" /> Generate rule
              </button>
              {aiRes && (
                <div className="rounded-lg bg-gray-800/40 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-white">{aiRes.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${aiRes.enabled ? "bg-green-500/10 text-green-400" : "bg-amber-500/10 text-amber-400"}`}>
                      {aiRes.enabled ? "active" : "paused — enable to run"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(aiRes.conditions || []).map((c: any, i: number) => (
                      <span key={`c${i}`} className="text-[10px] px-2 py-0.5 rounded bg-gray-700/60 text-gray-300">
                        <span className="text-n0va-400">{c.field}</span> {c.operator} "{c.value}"
                      </span>
                    ))}
                    {(aiRes.actions || []).map((a: any, i: number) => (
                      <span key={`a${i}`} className={`text-[10px] px-2 py-0.5 rounded ${ACTION_BADGE[a.action] || "bg-gray-700 text-gray-300"}`}>
                        {a.action}{a.target ? ` → ${a.target}` : ""}
                      </span>
                    ))}
                  </div>
                  {aiRes.test?.tested ? (
                    <p className="text-xs text-gray-400">
                      Dry run over {aiRes.test.scanned} recent messages — <span className="text-n0va-400">{aiRes.test.wouldMatch} would match</span>
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400">{aiRes.summary}</p>
                  )}
                  <div className="flex gap-2">
                    <button className="btn-secondary text-xs flex-1" disabled={busy} onClick={toggleGenerated}>
                      {aiRes.enabled ? "Pause rule" : "Enable rule"}
                    </button>
                    <button className="btn-primary text-xs flex-1" onClick={() => setAiOpen(false)}>Done</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {testing && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white flex items-center gap-2"><FlaskConical className="w-4 h-4 text-n0va-400" /> Test: {testing.name}</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setTesting(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Sample subject</label>
                <input className="input" placeholder="e.g. Q3 invoice attached" value={testing.sampleSubject} onChange={(e) => setTesting({ ...testing, sampleSubject: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Sample from</label>
                <input className="input" placeholder="billing@n0va.mail" value={testing.sampleFrom} onChange={(e) => setTesting({ ...testing, sampleFrom: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Sample body</label>
                <textarea className="input min-h-[90px]" placeholder="Optional…" value={testing.sampleBody} onChange={(e) => setTesting({ ...testing, sampleBody: e.target.value })} />
              </div>
              <button className="btn-primary text-sm w-full" disabled={busy} onClick={runTest}>Test rule</button>
              {testRes && (
                <div className={`rounded-lg p-3 text-sm ${testRes.wouldMatch ? "bg-green-500/10 text-green-300" : "bg-amber-500/10 text-amber-300"}`}>
                  <p className="font-semibold">{testRes.wouldMatch ? "Would match" : "Would NOT match"}</p>
                  <p className="text-xs mt-0.5">{testRes.summary}</p>
                  {testRes.failedConditions?.length > 0 && (
                    <p className="text-xs mt-1 text-amber-400/80">Failed conditions: {testRes.failedConditions.join(", ")}</p>
                  )}
                  {testRes.actionsToRun?.length > 0 && (
                    <p className="text-xs mt-1 text-green-400/80">Actions: {testRes.actionsToRun.join(", ")}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
