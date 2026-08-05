import React, { useEffect, useRef, useState } from "react";
import {
  Terminal, Download, Boxes, Command, UserCheck, LogOut,
  PlayCircle, Search, RefreshCw, KeyRound, ListOrdered, ChevronRight,
  CheckCircle2, XCircle, Loader2, Cpu,
} from "lucide-react";
import { api } from "../api/client";

const unwrap = (r: any) => r?.data ?? r;

function SkeletonCard({ h = 28 }: { h?: number }) {
  return <div className="animate-pulse rounded-xl bg-gray-800/60 p-4"><div style={{ height: h }} className="rounded-md bg-gray-700/60" /></div>;
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  authenticated: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  ended: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

export default function N0VA1OCli() {
  const { addToast } = (window as any).useToast ? (window as any).useToast() : { addToast: () => {} };
  const toastRef = useRef<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [auto, setAuto] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [dash, setDash] = useState<any>(null);
  const [catalog, setCatalog] = useState<any>(null);
  const [install, setInstall] = useState<any>(null);
  const [sessions, setSessions] = useState<any>(null);
  const [log, setLog] = useState<any>(null);
  const [discover, setDiscover] = useState<any>(null);
  const [lastExec, setLastExec] = useState<any>(null);
  const [auth, setAuth] = useState<any>(null);

  const [platform, setPlatform] = useState("npm");
  const [email, setEmail] = useState("");
  const [cmd, setCmd] = useState("n0va status");
  const [dQuery, setDQuery] = useState("");

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
      const [d, c, i, s, l] = await Promise.all([
        api.adsMarketingModule.n0va1oCliDashboard(),
        api.adsMarketingModule.n0va1oCliCatalog(),
        api.adsMarketingModule.n0va1oCliStatus(),
        api.adsMarketingModule.n0va1oCliSessions(),
        api.adsMarketingModule.n0va1oCliLog(20),
      ]);
      setDash(unwrap(d)); setCatalog(unwrap(c)); setInstall(unwrap(i));
      setSessions(unwrap(s)); setLog(unwrap(l));
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e?.message || "Failed to load CLI data");
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

  const runInstall = async () => {
    const d = await act("install", () => api.adsMarketingModule.n0va1oInstallCli({ platform }), "CLI installed");
    if (d) { setInstall(unwrap(d)); }
  };

  const runAuth = async () => {
    if (!email) { toast("Enter an email to authenticate", "error"); return; }
    const d = await act("auth", () => api.adsMarketingModule.n0va1oAuthenticateCli({ email }), "Device code issued");
    if (d) setAuth(unwrap(d));
  };

  const runComplete = async (sessionId: string) => {
    await act("complete", () => api.adsMarketingModule.n0va1oCompleteCliAuth(sessionId), "CLI authenticated");
  };

  const runExec = async (command: string) => {
    setCmd(command);
    const d = await act("exec", () => api.adsMarketingModule.n0va1oExecuteCliCommand({ command }));
    if (d) setLastExec(unwrap(d));
  };

  const runDiscover = async () => {
    if (!dQuery.trim()) { toast("Enter a discovery query", "error"); return; }
    const d = await act("discover", () => api.adsMarketingModule.n0va1oCliDiscover(dQuery.trim()), "Discovery complete");
    if (d) setDiscover(unwrap(d));
  };

  const runLogout = async (sessionId: string) => {
    await act(`end-${sessionId}`, () => api.adsMarketingModule.n0va1oEndCliSession(sessionId), "Session ended");
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

  const statCards = [
    { label: "CLI version", value: dash?.version || catalog?.version || "—", icon: <Terminal className="h-4 w-4" />, color: "text-sky-300" },
    { label: "Integrations reachable", value: dash?.integrationsReachable ?? "—", icon: <Boxes className="h-4 w-4" />, color: "text-violet-300" },
    { label: "Authenticated sessions", value: dash?.activeSessions ?? sessions?.authenticated ?? 0, icon: <UserCheck className="h-4 w-4" />, color: "text-emerald-300" },
    { label: "Commands run", value: dash?.commandsRun ?? 0, icon: <Command className="h-4 w-4" />, color: "text-amber-300" },
  ];

  return (
    <div className="space-y-4 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-white">N0VA1O Universal CLI</h1>
          <p className="text-sm text-gray-400">No SDKs. Just install, authenticate, and deploy.</p>
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
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Download className="h-4 w-4 text-sky-300" />Install</h2>
          <div className="mt-3 space-y-2 text-xs text-gray-400">
            {catalog?.platforms?.map((p: any) => (
              <div key={p.id} className="rounded-lg border border-gray-800 bg-gray-950/60 p-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-200">{p.name}</span>
                  <code className="text-[10px] text-gray-500">{p.packageManager}</code>
                </div>
                <code className="block truncate text-[10px] text-sky-300">{p.installCommand}</code>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-white"
            >
              {catalog?.platforms?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button
              onClick={runInstall}
              disabled={busy === "install"}
              className="flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {busy === "install" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Install
            </button>
            {install?.installed && (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
                installed ({install.version}, {install.platform})
              </span>
            )}
          </div>
          {install?.installed && (
            <div className="mt-2 rounded-lg border border-gray-800 bg-gray-950/60 p-2 text-[11px] text-gray-400">
              <div>Install time <span className="text-gray-200">{install.installSeconds}s</span> · Package <span className="text-gray-200">{install.packageSizeMb}MB</span></div>
              <div className="text-emerald-300">{install.summary}</div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><KeyRound className="h-4 w-4 text-violet-300" />Device-code auth</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-white placeholder-gray-600"
            />
            <button
              onClick={runAuth}
              disabled={busy === "auth"}
              className="flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {busy === "auth" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />} Start auth
            </button>
          </div>
          {auth && (
            <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-200">
              <div className="text-lg font-mono font-bold text-white">{auth.deviceCode}</div>
              <div>Open <span className="text-amber-100">{auth.verificationUrl}</span> and enter the code — expires in {Math.round((auth.expiresInSeconds || 600) / 60)} min</div>
              <div className="text-gray-400">{auth.summary}</div>
              <button
                onClick={() => runComplete(auth.sessionId)}
                disabled={busy === "complete"}
                className="mt-2 rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                Complete authorization
              </button>
            </div>
          )}
          <div className="mt-3 space-y-1.5">
            {sessions?.sessions?.slice(0, 5).map((s: any) => (
              <div key={s.sessionId} className="flex flex-wrap items-center justify-between gap-1 rounded-lg border border-gray-800 bg-gray-950/60 p-2 text-[11px]">
                <div className="min-w-0">
                  <div className="truncate font-mono text-gray-200">{s.email}</div>
                  <div className="truncate font-mono text-gray-500">{s.sessionId}</div>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] ${STATUS_STYLE[s.status] || STATUS_STYLE.pending}`}>{s.status}</span>
                  {s.status === "authenticated" && (
                    <button onClick={() => runLogout(s.sessionId)} disabled={busy === `end-${s.sessionId}`} className="rounded border border-gray-700 p-1 text-gray-400 hover:bg-gray-800" title="Log out">
                      <LogOut className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {!sessions?.sessions?.length && <div className="text-[11px] text-gray-500">No CLI sessions yet</div>}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Terminal className="h-4 w-4 text-emerald-300" />Terminal</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") runExec(cmd); }}
              className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 font-mono text-xs text-emerald-300 placeholder-gray-600"
              placeholder="n0va discover crm"
            />
            <button
              onClick={() => runExec(cmd)}
              disabled={busy === "exec"}
              className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {busy === "exec" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />} Run
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {["n0va version", "n0va status", "n0va whoami", "n0va discover crm", "n0va call hubspot_crm", "n0va sessions", "n0va help"].map((c) => (
              <button key={c} onClick={() => runExec(c)} className="rounded-full border border-gray-700 bg-gray-950 px-2 py-0.5 font-mono text-[10px] text-gray-400 hover:bg-gray-800 hover:text-gray-200">
                {c}
              </button>
            ))}
          </div>
          {lastExec && (
            <div className="mt-2 rounded-lg border border-gray-800 bg-gray-950/70 p-3 font-mono text-[11px]">
              <div className="flex items-center justify-between text-gray-500">
                <span>$ n0va {[lastExec.command, ...(lastExec.args || [])].join(" ")}</span>
                <span>{lastExec.durationMs}ms</span>
              </div>
              {lastExec.stdout && <pre className="mt-1 whitespace-pre-wrap text-emerald-300">{lastExec.stdout}</pre>}
              {lastExec.stderr && <pre className="mt-1 whitespace-pre-wrap text-red-300">{lastExec.stderr}</pre>}
              <div className={`mt-1 flex items-center gap-1 ${lastExec.exitCode === 0 ? "text-emerald-400" : "text-red-400"}`}>
                {lastExec.exitCode === 0 ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                exit {lastExec.exitCode} · {lastExec.summary}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Search className="h-4 w-4 text-sky-300" />Discover tools</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={dQuery}
              onChange={(e) => setDQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") runDiscover(); }}
              className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-white placeholder-gray-600"
              placeholder="crm, analytics, storage…"
            />
            <button
              onClick={runDiscover}
              disabled={busy === "discover"}
              className="flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {busy === "discover" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />} Discover
            </button>
          </div>
          {discover && (
            <div className="mt-2 text-[11px] text-gray-400">{discover.summary}</div>
          )}
          <div className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1">
            {discover?.tools?.map((t: any) => (
              <button key={t.toolId} onClick={() => runExec(`n0va call ${t.toolId}`)} className="flex w-full items-center justify-between rounded-lg border border-gray-800 bg-gray-950/60 p-2 text-left hover:bg-gray-800/60">
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-medium text-gray-200">{t.name}</div>
                  <div className="truncate font-mono text-[10px] text-gray-500">{t.toolId} · {t.category}</div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-600" />
              </button>
            ))}
            {discover && !discover.tools?.length && <div className="text-[11px] text-gray-500">No tools matched</div>}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><ListOrdered className="h-4 w-4 text-amber-300" />Command reference ({catalog?.totalCommands || 0})</h2>
        <div className="mt-2 grid gap-1.5 md:grid-cols-2">
          {catalog?.commands?.map((c: any) => (
            <div key={c.command} className="rounded-lg border border-gray-800 bg-gray-950/60 p-2">
              <div className="flex items-center gap-1.5">
                <code className="font-mono text-[11px] font-bold text-amber-300">{c.command}</code>
                <span className="text-[11px] text-gray-300">{c.description}</span>
              </div>
              <code className="block truncate text-[10px] text-gray-500">{c.usage}</code>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Cpu className="h-4 w-4 text-violet-300" />Activity log</h2>
        <div className="mt-2 max-h-64 space-y-1 overflow-y-auto pr-1">
          {log?.entries?.map((e: any, i: number) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-gray-800 bg-gray-950/60 p-2 text-[11px]">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
              <div className="min-w-0 flex-1">
                <div className="text-gray-300">{e.detail}</div>
                <div className="text-gray-600">{e.category} · {new Date(e.at).toLocaleTimeString()}</div>
              </div>
            </div>
          ))}
          {!log?.entries?.length && <div className="text-[11px] text-gray-500">No CLI activity yet</div>}
        </div>
      </div>
    </div>
  );
}
