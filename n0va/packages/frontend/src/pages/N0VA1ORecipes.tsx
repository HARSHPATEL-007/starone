import { useEffect, useState, useCallback } from "react";
import {
  Braces, RefreshCw, PlayCircle, Cpu, FolderOpen, Plus, X, Zap,
  Radio, ToggleLeft, Trash2, Terminal, HardDrive, Sparkles, Layers,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const fmt = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)}MB` : b >= 1024 ? `${(b / 1024).toFixed(1)}KB` : `${b}B`);

export default function N0VA1ORecipes() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [catalog, setCatalog] = useState<any>(null);
  const [recipes, setRecipes] = useState<any>(null);
  const [executions, setExecutions] = useState<any>(null);
  const [sandboxes, setSandboxes] = useState<any>(null);
  const [files, setFiles] = useState<any>(null);
  const [vfs, setVfs] = useState<any>(null);
  const [trigOverview, setTrigOverview] = useState<any>(null);
  const [triggers, setTriggers] = useState<any>(null);
  const [trigStats, setTrigStats] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [plugins, setPlugins] = useState<any>(null);
  const [pluginInsights, setPluginInsights] = useState<any[]>([]);
  const [execLog, setExecLog] = useState<any[]>([]);
  const [compileRes, setCompileRes] = useState<any>(null);
  const [execRes, setExecRes] = useState<any>(null);
  const [showCompile, setShowCompile] = useState(false);
  const [showSpawn, setShowSpawn] = useState(false);
  const [showTrigger, setShowTrigger] = useState(false);
  const [recipeForm, setRecipeForm] = useState<any>({ name: "", steps: [{ action: "email_send", params: { subject: "" } }], schedule: "", failoverEnabled: false, notificationChannels: "" });
  const [sandboxForm, setSandboxForm] = useState<any>({ runtimeId: "python311", label: "", ttlSec: 300 });
  const [triggerForm, setTriggerForm] = useState<any>({ event: "", source: "webhook", targetUrl: "", name: "" });
  const [fireForm, setFireForm] = useState<any>({ event: "", source: "internal", payload: "{}" });
  const [fileForm, setFileForm] = useState<any>({ filename: "", sizeBytes: 1024, content: "" });
  const [execCode, setExecCode] = useState<string>("");
  const [statsRes, setStatsRes] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);

  const loadData = useCallback(async () => {
    const [d, c, r, e, s, f, v, to, t, ts, dl, p, l] = await Promise.all([
      api.adsMarketingModule.n0va1oExecDashboard().catch(() => null),
      api.adsMarketingModule.n0va1oRecipeCatalog().catch(() => null),
      api.adsMarketingModule.n0va1oRecipes().catch(() => null),
      api.adsMarketingModule.n0va1oExecutions().catch(() => null),
      api.adsMarketingModule.n0va1oSandboxes().catch(() => null),
      api.adsMarketingModule.n0va1oFiles().catch(() => null),
      api.adsMarketingModule.n0va1oVfs().catch(() => null),
      api.adsMarketingModule.n0va1oTriggerOverview().catch(() => null),
      api.adsMarketingModule.n0va1oTriggers().catch(() => null),
      api.adsMarketingModule.n0va1oTriggerStats().catch(() => null),
      api.adsMarketingModule.n0va1oDeliveries().catch(() => null),
      api.adsMarketingModule.n0va1oPluginDashboard().catch(() => null),
      api.adsMarketingModule.n0va1oExecLog().catch(() => null),
    ]);
    setDash(unwrap(d) || null);
    setCatalog(unwrap(c) || null);
    setRecipes(unwrap(r) || null);
    setExecutions(unwrap(e) || null);
    setSandboxes(unwrap(s) || null);
    setFiles(unwrap(f) || null);
    setVfs(unwrap(v) || null);
    setTrigOverview(unwrap(to) || null);
    setTriggers(unwrap(t) || null);
    setTrigStats(unwrap(ts) || null);
    setDeliveries((unwrap(dl)?.deliveries || []).slice(0, 10));
    setPlugins(unwrap(p) || null);
    setExecLog((unwrap(l)?.entries || []).slice(0, 10));
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

  async function compileRecipe() {
    setBusy("compile");
    try {
      const input: any = {
        name: recipeForm.name,
        steps: recipeForm.steps.map((s: any) => ({ action: s.action, params: s.params })),
      };
      if (recipeForm.schedule.trim()) input.schedule = recipeForm.schedule.trim();
      input.failoverEnabled = recipeForm.failoverEnabled;
      if (recipeForm.notificationChannels.trim()) input.notificationChannels = recipeForm.notificationChannels.split(",").map((x: string) => x.trim()).filter(Boolean);
      const r = unwrap(await api.adsMarketingModule.n0va1oCompileRecipe(input));
      setCompileRes(r);
      addToast("success", "Recipe compiled", r.summary || "");
      setShowCompile(false);
      await loadData();
    } catch (e: any) {
      addToast("error", "Compile failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function executeRecipe(recipeId: string) {
    setBusy(`exec-${recipeId}`);
    try {
      const r = unwrap(await api.adsMarketingModule.n0va1oExecuteRecipe(recipeId));
      setExecRes(r);
      addToast("success", "Recipe executed", r.summary);
      await loadData();
    } catch (e: any) {
      addToast("error", "Execute failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function spawnSandbox() {
    setBusy("spawn");
    try {
      const r = unwrap(await api.adsMarketingModule.n0va1oSpawnSandbox({ runtimeId: sandboxForm.runtimeId, label: sandboxForm.label, ttlSec: Number(sandboxForm.ttlSec) }));
      addToast("success", "Sandbox spawned", r.summary);
      setShowSpawn(false);
      await loadData();
    } catch (e: any) {
      addToast("error", "Spawn failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function execInSandbox(sandboxId: string) {
    if (!execCode.trim()) { addToast("warning", "Code required", "Enter code to execute."); return; }
    setBusy(`execsb-${sandboxId}`);
    try {
      const r = unwrap(await api.adsMarketingModule.n0va1oExecInSandbox(sandboxId, { code: execCode }));
      addToast("success", "Sandbox executed", r.summary);
      await loadData();
      setExecCode("");
    } catch (e: any) {
      addToast("error", "Execute failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function terminateSandbox(sandboxId: string) {
    setBusy(`term-${sandboxId}`);
    try {
      const r = unwrap(await api.adsMarketingModule.n0va1oTerminateSandbox(sandboxId));
      addToast("success", "Sandbox terminated", r.summary);
      await loadData();
    } catch (e: any) {
      addToast("error", "Failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function putFile() {
    setBusy("putFile");
    try {
      const r = unwrap(await api.adsMarketingModule.n0va1oPutFile({ filename: fileForm.filename, sizeBytes: Number(fileForm.sizeBytes), content: fileForm.content }));
      addToast("success", "File stored", r.summary);
      await loadData();
    } catch (e: any) {
      addToast("error", "Put failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function summarizeFile(fileId: string) {
    setBusy(`stats-${fileId}`);
    try {
      const r = unwrap(await api.adsMarketingModule.n0va1oVfsSummarizeStats(fileId));
      setStatsRes(r);
      addToast("success", "Checksum verified", r.checksumVerified ? "Content hash matches" : "Checksum mismatch");
    } catch (e: any) {
      addToast("error", "Failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function createTrigger() {
    setBusy("createTrig");
    try {
      const r = unwrap(await api.adsMarketingModule.n0va1oCreateTrigger({ event: triggerForm.event, source: triggerForm.source, targetUrl: triggerForm.targetUrl, name: triggerForm.name }));
      addToast("success", "Trigger created", r.summary);
      setShowTrigger(false);
      await loadData();
    } catch (e: any) {
      addToast("error", "Create failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function toggleTrigger(triggerId: string) {
    setBusy(`tg-${triggerId}`);
    try {
      const r = unwrap(await api.adsMarketingModule.n0va1oToggleTrigger(triggerId));
      addToast("success", "Trigger updated", r.summary);
      await loadData();
    } catch (e: any) {
      addToast("error", "Failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function deleteTrigger(triggerId: string) {
    setBusy(`del-${triggerId}`);
    try {
      const r = unwrap(await api.adsMarketingModule.n0va1oDeleteTrigger(triggerId));
      addToast("success", "Trigger deleted", r.summary);
      await loadData();
    } catch (e: any) {
      addToast("error", "Failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function fireEvent() {
    setBusy("fire");
    try {
      const payload = JSON.parse(fireForm.payload || "{}");
      const r = unwrap(await api.adsMarketingModule.n0va1oFireEvent({ event: fireForm.event, source: fireForm.source, payload }));
      addToast("success", "Event fired", r.summary);
      await loadData();
    } catch (e: any) {
      addToast("error", "Fire failed", e?.message?.includes("JSON") ? "Invalid JSON payload" : e?.message);
    } finally {
      setBusy("");
    }
  }

  async function togglePlugin(slotId: string) {
    setBusy(`pl-${slotId}`);
    try {
      const r = unwrap(await api.adsMarketingModule.n0va1oTogglePlugin(slotId));
      addToast("success", "Plugin updated", r.summary);
      await loadData();
    } catch (e: any) {
      addToast("error", "Failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function runPluginCycle() {
    setBusy("cycle");
    try {
      const r = unwrap(await api.adsMarketingModule.n0va1oRunPluginCycle());
      setPluginInsights(r.insights || []);
      addToast("success", "Plugin cycle", r.summary);
      await loadData();
    } catch (e: any) {
      addToast("error", "Cycle failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  const c = dash?.counts || {};
  const statCards = [
    { label: "Sandboxes running", value: `${c.runningSandboxes ?? 0}/${c.totalSandboxes ?? 0}`, icon: Cpu },
    { label: "Recipes", value: c.recipes ?? 0, icon: Braces },
    { label: "Executions", value: c.executions ?? 0, icon: PlayCircle },
    { label: "VFS offloaded", value: c.offloadedFiles ?? 0, icon: HardDrive },
  ];

  const modalWrap = "fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4";
  const modalBox = "w-full sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-xl sm:rounded-xl bg-gray-900 border border-gray-700 p-4 space-y-3";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Braces className="w-5 h-5 text-n0va-300" /> Recipes &amp; Execution</h1>
          <p className="text-sm text-gray-500">Deterministic recipes, ephemeral sandboxes, virtual filesystem, triggers and self-improving plugins.</p>
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
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {statCards.map((s) => (
              <div key={s.label} className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-3">
                <p className="text-xs text-gray-500 flex items-center gap-1.5"><s.icon className="w-3.5 h-3.5" /> {s.label}</p>
                <p className="text-xl font-bold mt-1">{s.value}</p>
              </div>
            ))}
          </section>

          <section className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold flex items-center gap-2"><Braces className="w-4 h-4 text-gray-400" /> Recipes</h2>
              <button onClick={() => setShowCompile(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white text-sm font-medium">
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Compile recipe</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(catalog?.steps || []).map((s: any) => (
                <span key={s.id} className="px-2 py-1 rounded-lg bg-gray-900/50 border border-gray-700/50 text-[11px] text-gray-300">
                  {s.id} <span className="text-gray-600 font-mono text-[9px]">→ {s.tool}</span>
                </span>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {(recipes?.recipes || []).map((r: any) => (
                <div key={r.recipeId} className="rounded-lg bg-gray-900/50 px-3 py-2.5 flex flex-wrap items-center gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="text-gray-200 font-medium truncate">{r.name}
                      <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[9px] ${r.status === "compiled" ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-700 text-gray-400"}`}>{r.status}</span>
                    </p>
                    <p className="text-gray-600">{r.steps} step(s) · compiled {r.compileMs}ms · {new Date(r.compiledAt).toLocaleString()}</p>
                  </div>
                  <button onClick={() => executeRecipe(r.recipeId)} disabled={busy === `exec-${r.recipeId}`}
                    className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white text-[11px]">
                    <PlayCircle className="w-3.5 h-3.5" /> Run
                  </button>
                </div>
              ))}
            </div>
            {(recipes?.recipes || []).length === 0 && <p className="text-xs text-gray-500 py-2">No recipes yet — compile your first multi-step recipe.</p>}
            {execRes && (
              <div className="rounded-lg bg-n0va-500/10 border border-n0va-500/30 p-3 text-xs space-y-2">
                <p className="text-n0va-300 font-medium">{execRes.summary} · <span className="font-mono text-[10px]">{execRes.transactionId}</span></p>
                <div className="space-y-1">
                  {(execRes.stepResults || []).map((s: any) => (
                    <p key={s.order} className="text-gray-400">
                      <span className={s.status === "succeeded" ? "text-emerald-400" : "text-red-400"}>[{s.status}]</span> {s.action} ({s.latencyMs}ms) — {s.result}
                    </p>
                  ))}
                </div>
              </div>
            )}
            {compileRes && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs space-y-2">
                <p className="text-emerald-400 font-medium">{compileRes.summary}</p>
                <div className="flex flex-wrap gap-2">
                  {(compileRes.phases || []).map((p: any) => (
                    <span key={p.phase} className="px-2 py-1 rounded bg-gray-900/60 text-gray-400">{p.phase} {p.durationMs}ms</span>
                  ))}
                  {compileRes.schedule && <span className="px-2 py-1 rounded bg-gray-900/60 text-amber-400 font-mono text-[10px]">cron {compileRes.schedule}</span>}
                  {compileRes.failoverEnabled && <span className="px-2 py-1 rounded bg-gray-900/60 text-n0va-300">failover on</span>}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              {(executions?.executions || []).slice(0, 6).map((e: any) => (
                <p key={e.executionId} className="text-[11px] text-gray-500 truncate">
                  <span className={`${e.status === "completed" ? "text-emerald-400" : "text-amber-400"}`}>{e.status}</span> — {e.recipeName} ({e.stepsSucceeded}/{e.stepsTotal}) · <span className="font-mono text-[10px]">{e.transactionId}</span> · {new Date(e.executedAt).toLocaleString()}
                </p>
              ))}
            </div>
          </section>

          <section className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold flex items-center gap-2"><Cpu className="w-4 h-4 text-gray-400" /> Sandboxes</h2>
                <button onClick={() => setShowSpawn(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white text-sm font-medium">
                  <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Spawn</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(dash?.runtimes || []).map((r: any) => (
                  <span key={r.id} className="px-2 py-1 rounded-lg bg-gray-900/50 border border-gray-700/50 text-[11px] text-gray-300">{r.name} · {r.memoryMB}MB</span>
                ))}
              </div>
              <div className="space-y-2">
                {(sandboxes?.sandboxes || []).map((s: any) => (
                  <div key={s.sandboxId} className="rounded-lg bg-gray-900/50 px-3 py-2.5 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="min-w-0">
                        <p className="text-gray-200 font-medium truncate">{s.label}
                          <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[9px] ${s.status === "running" ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-700 text-gray-400"}`}>{s.status}</span>
                        </p>
                        <p className="text-gray-600">{s.runtimeName} · cold {s.coldStartMs}ms · TTL {Math.round((new Date(s.expiresAt).getTime() - Date.now()) / 1000)}s</p>
                      </div>
                      {s.status === "running" && (
                        <button onClick={() => terminateSandbox(s.sandboxId)} disabled={busy === `term-${s.sandboxId}`}
                          className="ml-auto p-1.5 rounded-lg bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400" title="Terminate">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {s.status === "running" && (
                      <div className="flex gap-2">
                        <input className="flex-1 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-[11px] text-gray-200 font-mono"
                          placeholder="code…" value={execCode} onChange={(e) => setExecCode(e.target.value)} />
                        <button onClick={() => execInSandbox(s.sandboxId)} disabled={busy === `execsb-${s.sandboxId}`}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-[11px]">
                          <Terminal className="w-3.5 h-3.5" /> Exec
                        </button>
                      </div>
                    )}
                    {s.stdout && (
                      <pre className="rounded-lg bg-black/40 p-2 text-[10px] text-emerald-400 font-mono whitespace-pre-wrap break-all">{s.stdout}</pre>
                    )}
                  </div>
                ))}
                {(sandboxes?.sandboxes || []).length === 0 && <p className="text-xs text-gray-500 py-2">No sandboxes yet.</p>}
              </div>
            </div>

            <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-3">
              <h2 className="font-semibold flex items-center gap-2"><FolderOpen className="w-4 h-4 text-gray-400" /> Virtual filesystem</h2>
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="px-2 py-1 rounded-lg bg-gray-900/50 text-gray-300">{vfs?.totalFiles ?? 0} file(s)</span>
                <span className="px-2 py-1 rounded-lg bg-gray-900/50 text-gray-300">{vfs?.offloaded ?? 0} offloaded</span>
                <span className="px-2 py-1 rounded-lg bg-gray-900/50 text-gray-300">{fmt(vfs?.totalBytes ?? 0)} total</span>
                <span className="px-2 py-1 rounded-lg bg-gray-900/50 text-n0va-300">&gt;{vfs?.thresholdMB ?? 10}MB → vfs://</span>
              </div>
              <div className="rounded-lg bg-gray-900/50 p-3 space-y-2">
                <p className="text-[11px] text-gray-500">Store a payload — files over 10MB are offloaded to the virtual filesystem with a sha256 checksum.</p>
                <div className="flex flex-wrap gap-2">
                  <input className="flex-1 min-w-32 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-xs text-gray-200" placeholder="filename" value={fileForm.filename} onChange={(e) => setFileForm({ ...fileForm, filename: e.target.value })} />
                  <input type="number" className="w-28 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-xs text-gray-200" placeholder="sizeBytes" value={fileForm.sizeBytes} onChange={(e) => setFileForm({ ...fileForm, sizeBytes: e.target.value })} />
                  <button onClick={putFile} disabled={busy === "putFile" || !fileForm.filename}
                    className="px-3 py-1.5 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white text-xs">
                    {busy === "putFile" ? "Storing…" : "Store"}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {(files?.files || []).slice(0, 6).map((f: any) => (
                  <div key={f.fileId} className="rounded-lg bg-gray-900/50 px-3 py-2 flex flex-wrap items-center gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="text-gray-200 font-mono text-[10px] truncate">{f.filename}
                        <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[9px] ${f.offloaded ? "bg-violet-500/15 text-violet-400" : "bg-gray-700 text-gray-400"}`}>{f.offloaded ? "vfs://" : "inline"}</span>
                      </p>
                      <p className="text-gray-600">{fmt(f.sizeBytes)} · {f.checksum}</p>
                    </div>
                    <button onClick={() => summarizeFile(f.fileId)} disabled={busy === `stats-${f.fileId}`}
                      className="ml-auto px-2 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 text-[10px]">Verify</button>
                  </div>
                ))}
              </div>
              {statsRes && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs space-y-1">
                  <p className="text-emerald-400 font-medium">{statsRes.summary || (statsRes.checksumVerified ? "Checksum verified" : "Checksum mismatch")}</p>
                  {statsRes.records && statsRes.records.length > 0 && (
                    <p className="text-gray-400">{statsRes.records[0].stats ? `stats: ${Object.entries(statsRes.records[0].stats).map(([k, v]) => `${k}=${v}`).join(" · ")}` : statsRes.records[0].rows ? `${statsRes.records[0].rows} row(s)` : ""}</p>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold flex items-center gap-2"><Zap className="w-4 h-4 text-gray-400" /> Triggers</h2>
              <div className="flex gap-2">
                <button onClick={fireEvent} disabled={busy === "fire" || !fireForm.event}
                  className="px-3 py-2 rounded-lg bg-violet-500 hover:bg-violet-400 text-white text-sm font-medium">
                  <Radio className="w-4 h-4 inline mr-1" /> Fire event
                </button>
                <button onClick={() => setShowTrigger(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white text-sm font-medium">
                  <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New trigger</span>
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="px-2 py-1 rounded-lg bg-gray-900/50 text-gray-300">{triggers?.enabled ?? 0}/{triggers?.total ?? 0} active</span>
              <span className="px-2 py-1 rounded-lg bg-gray-900/50 text-gray-300">{trigStats?.totalDeliveries ?? 0} deliveries</span>
              <span className="px-2 py-1 rounded-lg bg-gray-900/50 text-emerald-400">{trigStats?.successRate ?? 100}% success</span>
              <span className="px-2 py-1 rounded-lg bg-gray-900/50 text-gray-300">avg {trigStats?.avgLatencyMs ?? 0}ms</span>
              <span className="px-2 py-1 rounded-lg bg-gray-900/50 text-gray-500">{trigStats?.summary}</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {(triggers?.triggers || []).map((t: any) => (
                <div key={t.triggerId} className="rounded-lg bg-gray-900/50 px-3 py-2.5 flex flex-wrap items-center gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="text-gray-200 font-medium truncate">{t.name}
                      <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[9px] ${t.enabled ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-700 text-gray-400"}`}>{t.enabled ? "on" : "off"}</span>
                    </p>
                    <p className="text-gray-600 truncate">{t.event} · {t.source} · {t.deliveryCount} delivery(ies) · {(t.successCount ?? 0)} ok</p>
                  </div>
                  <div className="flex gap-1 ml-auto">
                    <button onClick={() => toggleTrigger(t.triggerId)} disabled={busy === `tg-${t.triggerId}`}
                      className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400" title="Toggle">
                      <ToggleLeft className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteTrigger(t.triggerId)} disabled={busy === `del-${t.triggerId}`}
                      className="p-1.5 rounded-lg bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(trigOverview?.events || []).map((e: any) => (
                <span key={e.event} className={`px-2 py-1 rounded-lg text-[10px] border ${e.triggerCount ? "border-n0va-500/50 bg-n0va-500/10 text-n0va-300" : "border-gray-700 bg-gray-900/40 text-gray-500"}`}>
                  {e.event.replace("n0va1o.", "")}{e.triggerCount ? ` ×${e.triggerCount}` : ""}
                </span>
              ))}
            </div>
            <div className="rounded-lg bg-gray-900/50 p-3 space-y-1.5">
              <p className="text-[11px] text-gray-500">Fire an event with a JSON payload — every matching trigger delivers with an HMAC signature.</p>
              <div className="flex flex-wrap gap-2">
                <select className="flex-1 min-w-40 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-xs text-gray-200" value={fireForm.event} onChange={(e) => setFireForm({ ...fireForm, event: e.target.value })}>
                  <option value="">Select event…</option>
                  {(trigOverview?.events || []).map((e: any) => <option key={e.event} value={e.event}>{e.event}</option>)}
                </select>
                <select className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-xs text-gray-200" value={fireForm.source} onChange={(e) => setFireForm({ ...fireForm, source: e.target.value })}>
                  {(trigOverview?.sources || []).map((s: any) => <option key={s.id} value={s.id}>{s.id}</option>)}
                </select>
                <input className="flex-1 min-w-32 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-xs text-gray-200 font-mono" placeholder='{"key": "value"}'
                  value={fireForm.payload} onChange={(e) => setFireForm({ ...fireForm, payload: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              {(deliveries || []).map((d: any, i: number) => (
                <p key={i} className="text-[11px] text-gray-500 truncate">
                  <span className={d.status === "delivered" ? "text-emerald-400" : "text-red-400"}>{d.status}</span> — {d.event} → {d.triggerName} ({d.latencyMs}ms) · <span className="font-mono text-[9px]">{d.signature?.slice(0, 20)}…</span> · {new Date(d.at).toLocaleString()}
                </p>
              ))}
            </div>
          </section>

          <section className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-gray-400" /> Self-improving plugins</h2>
              <button onClick={runPluginCycle} disabled={busy === "cycle"}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-500 hover:bg-violet-400 text-white text-sm font-medium">
                <Layers className="w-4 h-4" /> <span className="hidden sm:inline">Run cycle</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="px-2 py-1 rounded-lg bg-gray-900/50 text-gray-300">{plugins?.enabledCount ?? 0}/{plugins?.slots?.length ?? 0} enabled</span>
              <span className="px-2 py-1 rounded-lg bg-gray-900/50 text-gray-300">{plugins?.totalRuns ?? 0} runs</span>
              <span className="px-2 py-1 rounded-lg bg-gray-900/50 text-n0va-300">{plugins?.totalInsights ?? 0} insights</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {(plugins?.slots || []).map((s: any) => (
                <div key={s.id} className="rounded-lg bg-gray-900/50 px-3 py-2.5 flex flex-wrap items-center gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="text-gray-200 font-medium truncate">{s.name}
                      <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[9px] ${s.enabled ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-700 text-gray-400"}`}>{s.enabled ? "on" : "off"}</span>
                    </p>
                    <p className="text-gray-600">{s.runs ?? 0} run(s) · {s.insightCount ?? 0} insight(s)</p>
                  </div>
                  <button onClick={() => togglePlugin(s.id)} disabled={busy === `pl-${s.id}`}
                    className="ml-auto p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400" title="Toggle">
                    <ToggleLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            {pluginInsights.length > 0 && (
              <div className="rounded-lg bg-violet-500/10 border border-violet-500/30 p-3 space-y-1.5">
                <p className="text-violet-300 font-medium text-xs">Latest cycle</p>
                {(pluginInsights || []).map((i: any, idx: number) => (
                  <p key={idx} className="text-[11px] text-gray-400">[{i.name}] {i.detail}</p>
                ))}
              </div>
            )}
            <div className="space-y-1.5">
              {(plugins?.recent || []).slice(0, 5).map((e: any, i: number) => (
                <p key={i} className="text-[11px] text-gray-500 truncate">
                  <span className="text-gray-600">{new Date(e.at).toLocaleString()}</span> — {e.detail}
                </p>
              ))}
            </div>
          </section>

          <section className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-2">
            <h2 className="font-semibold flex items-center gap-2"><Terminal className="w-4 h-4 text-gray-400" /> Execution activity</h2>
            <div className="space-y-1.5">
              {execLog.map((e: any, i: number) => (
                <p key={i} className="text-[11px] text-gray-500 truncate">
                  <span className="text-gray-600">{new Date(e.at).toLocaleString()}</span> — <span className="text-n0va-300/80">{e.category}</span> {e.detail}
                </p>
              ))}
              {execLog.length === 0 && <p className="text-xs text-gray-500 py-2">No activity yet.</p>}
            </div>
          </section>

          {showCompile && (
            <div className={modalWrap} onClick={() => setShowCompile(false)}>
              <div className={modalBox} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-200">Compile recipe</h3>
                  <button onClick={() => setShowCompile(false)} className="text-gray-500 hover:text-gray-300"><X className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 text-xs">
                  <label className="flex flex-col gap-1 text-gray-500">Name *
                    <input className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-gray-200" value={recipeForm.name} onChange={(e) => setRecipeForm({ ...recipeForm, name: e.target.value })} /></label>
                  {(recipeForm.steps as any[]).map((s: any, i: number) => (
                    <div key={i} className="rounded-lg bg-gray-900/60 p-2 space-y-2">
                      <p className="text-gray-500">Step {i + 1}</p>
                      <select className="w-full rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-gray-200"
                        value={s.action}
                        onChange={(e) => {
                          const next = [...recipeForm.steps];
                          next[i] = { action: e.target.value, params: { "": "" } };
                          setRecipeForm({ ...recipeForm, steps: next });
                        }}>
                        {(catalog?.steps || []).map((cs: any) => <option key={cs.id} value={cs.id}>{cs.id}</option>)}
                      </select>
                      <input className="w-full rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-gray-200"
                        placeholder={`param ${catalog?.steps?.find((cs: any) => cs.id === s.action)?.param || "value"}…`}
                        value={String(Object.values(s.params)[0] ?? "")}
                        onChange={(e) => {
                          const next = [...recipeForm.steps];
                          const key = catalog?.steps?.find((cs: any) => cs.id === s.action)?.param || "value";
                          next[i] = { action: s.action, params: { [key]: e.target.value } };
                          setRecipeForm({ ...recipeForm, steps: next });
                        }} />
                      <button onClick={() => setRecipeForm({ ...recipeForm, steps: recipeForm.steps.filter((_: any, j: number) => j !== i) })}
                        className="text-red-400 hover:underline text-[10px]">Remove step</button>
                    </div>
                  ))}
                  <button
                    onClick={() => setRecipeForm({ ...recipeForm, steps: [...recipeForm.steps, { action: (catalog?.steps?.[0]?.id) || "email_send", params: { "": "" } }] })}
                    className="w-full py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300">+ Add step</button>
                  <label className="flex flex-col gap-1 text-gray-500">Schedule (5-field cron, optional)
                    <input className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-gray-200 font-mono" placeholder="0 9 * * 1"
                      value={recipeForm.schedule} onChange={(e) => setRecipeForm({ ...recipeForm, schedule: e.target.value })} /></label>
                  <label className="flex items-center gap-2 text-gray-500">
                    <input type="checkbox" checked={recipeForm.failoverEnabled} onChange={(e) => setRecipeForm({ ...recipeForm, failoverEnabled: e.target.checked })} className="accent-n0va-500" />
                    Failover enabled
                  </label>
                  <label className="flex flex-col gap-1 text-gray-500">Notification channels (https, comma-separated)
                    <input className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-gray-200" value={recipeForm.notificationChannels} onChange={(e) => setRecipeForm({ ...recipeForm, notificationChannels: e.target.value })} /></label>
                </div>
                <button onClick={compileRecipe} disabled={busy === "compile" || !recipeForm.name}
                  className="w-full px-3 py-2 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white text-sm font-medium">
                  {busy === "compile" ? "Compiling…" : "Compile recipe"}
                </button>
              </div>
            </div>
          )}

          {showSpawn && (
            <div className={modalWrap} onClick={() => setShowSpawn(false)}>
              <div className={modalBox} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-200">Spawn sandbox</h3>
                  <button onClick={() => setShowSpawn(false)} className="text-gray-500 hover:text-gray-300"><X className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 text-xs">
                  <label className="flex flex-col gap-1 text-gray-500">Runtime
                    <select className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-gray-200" value={sandboxForm.runtimeId} onChange={(e) => setSandboxForm({ ...sandboxForm, runtimeId: e.target.value })}>
                      {(dash?.runtimes || []).map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select></label>
                  <label className="flex flex-col gap-1 text-gray-500">Label
                    <input className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-gray-200" value={sandboxForm.label} onChange={(e) => setSandboxForm({ ...sandboxForm, label: e.target.value })} /></label>
                  <label className="flex flex-col gap-1 text-gray-500">TTL seconds (30-3600)
                    <input type="number" min={30} max={3600} className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-gray-200" value={sandboxForm.ttlSec} onChange={(e) => setSandboxForm({ ...sandboxForm, ttlSec: e.target.value })} /></label>
                </div>
                <button onClick={spawnSandbox} disabled={busy === "spawn"}
                  className="w-full px-3 py-2 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white text-sm font-medium">
                  {busy === "spawn" ? "Spawning…" : "Spawn"}
                </button>
              </div>
            </div>
          )}

          {showTrigger && (
            <div className={modalWrap} onClick={() => setShowTrigger(false)}>
              <div className={modalBox} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-200">New trigger</h3>
                  <button onClick={() => setShowTrigger(false)} className="text-gray-500 hover:text-gray-300"><X className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 text-xs">
                  <label className="flex flex-col gap-1 text-gray-500">Event *
                    <select className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-gray-200" value={triggerForm.event} onChange={(e) => setTriggerForm({ ...triggerForm, event: e.target.value })}>
                      <option value="">Select event…</option>
                      {(trigOverview?.events || []).map((e: any) => <option key={e.event} value={e.event}>{e.event}</option>)}
                    </select></label>
                  <label className="flex flex-col gap-1 text-gray-500">Source
                    <select className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-gray-200" value={triggerForm.source} onChange={(e) => setTriggerForm({ ...triggerForm, source: e.target.value })}>
                      {(trigOverview?.sources || []).map((s: any) => <option key={s.id} value={s.id}>{s.id}</option>)}
                    </select></label>
                  <label className="flex flex-col gap-1 text-gray-500">Target URL *
                    <input className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-gray-200" placeholder="https://…" value={triggerForm.targetUrl} onChange={(e) => setTriggerForm({ ...triggerForm, targetUrl: e.target.value })} /></label>
                  <label className="flex flex-col gap-1 text-gray-500">Name
                    <input className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-gray-200" value={triggerForm.name} onChange={(e) => setTriggerForm({ ...triggerForm, name: e.target.value })} /></label>
                </div>
                <button onClick={createTrigger} disabled={busy === "createTrig" || !triggerForm.event || !triggerForm.targetUrl}
                  className="w-full px-3 py-2 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white text-sm font-medium">
                  {busy === "createTrig" ? "Creating…" : "Create trigger"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
