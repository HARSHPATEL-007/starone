import React, { useEffect, useRef, useState } from "react";
import {
  Code2, Boxes, Rocket, FolderOpen, RefreshCw, Loader2, FileCode2,
  Sparkles, Activity, Layers, Copy, Plus, PlayCircle, Trash2,
} from "lucide-react";
import { api } from "../api/client";

const unwrap = (r: any) => r?.data ?? r;

function SkeletonCard({ h = 28 }: { h?: number }) {
  return <div className="animate-pulse rounded-xl bg-gray-800/60 p-4"><div style={{ height: h }} className="rounded-md bg-gray-700/60" /></div>;
}

export default function N0VA1OSdk() {
  const { addToast } = (window as any).useToast ? (window as any).useToast() : { addToast: () => {} };
  const toastRef = useRef<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [auto, setAuto] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [dash, setDash] = useState<any>(null);
  const [catalog, setCatalog] = useState<any>(null);
  const [snippet, setSnippet] = useState<any>(null);
  const [guide, setGuide] = useState<any>(null);

  const [lang, setLang] = useState("python");
  const [feature, setFeature] = useState("auth");
  const [scopePrefix, setScopePrefix] = useState("");
  const [projName, setProjName] = useState("");
  const [projLang, setProjLang] = useState("python");
  const [showCreate, setShowCreate] = useState(false);

  const addToastFn = () => {
    if (!toastRef.current && (window as any).__n0vaToast) toastRef.current = (window as any).__n0vaToast;
  };
  const toast = (t: string, type: "success" | "error" | "info" = "success") => {
    addToastFn();
    if (toastRef.current) toastRef.current(t, type);
    else if (addToast && typeof addToast === "function") addToast(t, type);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [d, c] = await Promise.all([
        api.adsMarketingModule.n0va1oSdkDashboard(),
        api.adsMarketingModule.n0va1oSdkCatalog(),
      ]);
      setDash(unwrap(d)); setCatalog(unwrap(c));
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e?.message || "Failed to load SDK data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    const h = () => loadAll();
    window.addEventListener("n0va:refresh-data", h);
    const t = setInterval(() => { if (auto) loadAll(); }, 30000);
    return () => { window.removeEventListener("n0va:refresh-data", h); clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  const act = async (key: string, fn: () => Promise<any>, successMsg?: string) => {
    setBusy(key);
    try {
      const r = await fn();
      const d = unwrap(r);
      toast(successMsg || d?.summary || "Done");
      await loadAll();
      return d;
    } catch (e: any) {
      toast(e?.message || "Action failed", "error");
      return null;
    } finally {
      setBusy(null);
    }
  };

  const runSnippet = async () => {
    const d = await act("snippet", () =>
      api.adsMarketingModule.n0va1oSdkSnippet({ language: lang, feature, scopePrefix: scopePrefix || undefined }), "Snippet generated");
    if (d) setSnippet(unwrap(d));
  };

  const runGuide = async (language: string) => {
    const d = await act(`guide-${language}`, () => api.adsMarketingModule.n0va1oSdkInstallGuide(language), "Install guide loaded");
    if (d) setGuide(unwrap(d));
  };

  const runCreate = async () => {
    if (!projName.trim()) { toast("Project name is required", "error"); return; }
    const d = await act("create", () => api.adsMarketingModule.n0va1oSdkCreateProject({ name: projName.trim(), language: projLang }), "Project created");
    if (d) { setShowCreate(false); setProjName(""); }
  };

  const runUsage = async (projectId: string) => {
    await act(`usage-${projectId}`, () => api.adsMarketingModule.n0va1oSdkRecordUsage(projectId), "Usage recorded");
  };

  const copyCode = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => toast("Copied to clipboard")).catch(() => {});
  };

  if (loading && !dash) {
    return (
      <div className="space-y-4 p-4 md:p-8">
        <SkeletonCard h={20} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} h={24} />)}
        </div>
        <SkeletonCard h={64} />
      </div>
    );
  }

  const langs = catalog?.languages || dash?.catalog?.languages || [];
  const feats = catalog?.features || dash?.catalog?.features || [];
  const projects = dash?.projects?.projects || [];
  const usageRows = dash?.usage?.byLanguage || [];

  const statCards = [
    { label: "Official SDKs", value: catalog?.totalLanguages ?? langs.length, icon: <Code2 className="h-4 w-4" />, color: "text-sky-300" },
    { label: "Gateway features", value: catalog?.totalFeatures ?? feats.length, icon: <Sparkles className="h-4 w-4" />, color: "text-violet-300" },
    { label: "Gateway version", value: catalog?.gatewayVersion || "—", icon: <Layers className="h-4 w-4" />, color: "text-emerald-300" },
    { label: "Projects", value: dash?.projects?.total ?? 0, icon: <FolderOpen className="h-4 w-4" />, color: "text-amber-300" },
  ];

  return (
    <div className="space-y-4 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-white">N0VA1O SDK</h1>
          <p className="text-sm text-gray-400">{catalog?.integrations} integrations, one SDK. Ship on every stack.</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="accent-violet-500" />
          Auto-refresh 30s
          <button onClick={loadAll} className="rounded-lg border border-gray-700 p-1.5 text-gray-300 hover:bg-gray-800" title="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </label>
      </div>

      {loadError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{loadError}</div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {statCards.map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-800 bg-gray-900/60 p-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">{c.icon}{c.label}</div>
            <div className={`mt-1 text-lg font-bold ${c.color}`}>{c.value}</div>
          </div>
        ))}
      </div>

      {dash?.summary && <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-3 text-sm text-gray-300">{dash.summary}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Code2 className="h-4 w-4 text-sky-300" />Languages</h2>
          <div className="mt-3 space-y-2">
            {langs.map((l: any) => (
              <div key={l.id} className="rounded-lg border border-gray-800 bg-gray-950/60 p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-gray-200">{l.name}</span>
                    <span className="ml-2 rounded-full border border-gray-700 px-1.5 py-0.5 text-[10px] text-gray-500">{l.package}</span>
                    <span className="ml-1 text-[10px] text-gray-600">({l.registry})</span>
                  </div>
                  <button
                    onClick={() => runGuide(l.id)}
                    disabled={busy === `guide-${l.id}`}
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-700 px-2 py-1 text-[10px] text-gray-300 hover:bg-gray-800 disabled:opacity-50"
                  >
                    {busy === `guide-${l.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileCode2 className="h-3 w-3" />} Guide
                  </button>
                </div>
                <code className="block truncate text-[10px] text-sky-300">{l.install}</code>
                <div className="text-[10px] text-gray-600">min runtime: {l.minRuntime}</div>
              </div>
            ))}
          </div>
          {guide && (
            <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-[11px] text-emerald-300">
              <div className="font-medium text-emerald-200">{guide.summary}</div>
              {guide.install && <code className="mt-1 block truncate text-[10px] text-emerald-200">{guide.install}</code>}
              {guide.minRuntime && <div className="text-[10px] text-emerald-400/80">min runtime: {guide.minRuntime}</div>}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Boxes className="h-4 w-4 text-violet-300" />Snippet generator</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select value={lang} onChange={(e) => setLang(e.target.value)} className="rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-white">
              {langs.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <select value={feature} onChange={(e) => setFeature(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-white">
              {feats.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <input
              value={scopePrefix}
              onChange={(e) => setScopePrefix(e.target.value)}
              placeholder="scope prefix (opt)"
              className="rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-white placeholder-gray-600"
            />
            <button
              onClick={runSnippet}
              disabled={busy === "snippet"}
              className="flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {busy === "snippet" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Generate
            </button>
          </div>
          {snippet && (
            <div className="mt-3 rounded-lg border border-gray-800 bg-gray-950/80 p-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500">{snippet.language} · {snippet.feature}</span>
                <button onClick={() => copyCode(snippet.code)} className="flex items-center gap-1 rounded border border-gray-700 px-1.5 py-0.5 text-[10px] text-gray-300 hover:bg-gray-800">
                  <Copy className="h-3 w-3" /> Copy
                </button>
              </div>
              <pre className="mt-2 overflow-x-auto whitespace-pre text-[10px] leading-relaxed text-emerald-300">{snippet.code}</pre>
              {snippet.summary && <div className="mt-2 text-[10px] text-gray-500">{snippet.summary}</div>}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Sparkles className="h-4 w-4 text-amber-300" />Feature coverage ({feats.length})</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {feats.map((f: any) => (
            <button
              key={f.id}
              onClick={() => { setFeature(f.id); setSnippet(null); }}
              className="rounded-lg border border-gray-800 bg-gray-950/60 p-2 text-left hover:border-violet-500/40"
            >
              <div className="text-xs font-medium text-gray-200">{f.name}</div>
              <code className="block truncate text-[10px] text-sky-300">{f.snippet}</code>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><FolderOpen className="h-4 w-4 text-emerald-300" />Projects</h2>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500">
              <Plus className="h-3.5 w-3.5" /> New project
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {projects.map((p: any) => (
              <div key={p.projectId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-800 bg-gray-950/60 p-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium text-gray-200">{p.name}</div>
                  <code className="text-[10px] text-gray-500">{p.projectId} · {p.language}</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-gray-700 px-2 py-0.5 text-[10px] text-gray-400">{p.status}</span>
                  <span className="text-[10px] text-gray-500">{p.calls} call(s)</span>
                  <button
                    onClick={() => runUsage(p.projectId)}
                    disabled={busy === `usage-${p.projectId}`}
                    className="flex items-center gap-1 rounded-lg border border-gray-700 px-2 py-1 text-[10px] text-gray-300 hover:bg-gray-800 disabled:opacity-50"
                  >
                    {busy === `usage-${p.projectId}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3" />} +1 call
                  </button>
                </div>
              </div>
            ))}
            {projects.length === 0 && <div className="text-xs text-gray-500">No projects yet — create one to start.</div>}
          </div>
          <div className="mt-3">
            <div className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Calls by language</div>
            <div className="mt-1.5 space-y-1.5">
              {usageRows.map((u: any) => (
                <div key={u.language} className="flex items-center gap-2">
                  <span className="w-16 text-[10px] text-gray-400">{u.language}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-800">
                    <div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.min(100, (u.calls / (dash?.usage?.totalCalls || 1)) * 100)}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-500">{u.calls}</span>
                </div>
              ))}
              {usageRows.length === 0 && <div className="text-[10px] text-gray-600">No usage recorded yet.</div>}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Activity className="h-4 w-4 text-sky-300" />Recent activity</h2>
          <div className="mt-3 max-h-80 space-y-1.5 overflow-y-auto">
            {(dash?.log?.entries || []).map((l: any, i: number) => (
              <div key={i} className="rounded-lg border border-gray-800 bg-gray-950/60 p-2 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-[10px] text-violet-300">{l.category}</span>
                  <span className="shrink-0 text-[10px] text-gray-600">{new Date(l.at).toLocaleTimeString()}</span>
                </div>
                <div className="mt-0.5 text-gray-400">{l.detail}</div>
              </div>
            ))}
            {!dash?.log?.entries?.length && <div className="text-xs text-gray-500">No SDK activity yet.</div>}
          </div>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-sm rounded-xl border border-gray-700 bg-gray-900 p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-white">New SDK project</h3>
            <input
              value={projName}
              onChange={(e) => setProjName(e.target.value)}
              placeholder="Project name"
              className="mt-3 w-full rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-white placeholder-gray-600"
            />
            <select value={projLang} onChange={(e) => setProjLang(e.target.value)} className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-white">
              {langs.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800">Cancel</button>
              <button onClick={runCreate} disabled={busy === "create"} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50">
                {busy === "create" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
