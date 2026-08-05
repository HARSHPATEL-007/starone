import { useEffect, useState, useCallback } from "react";
import {
  Link2, RefreshCw, Bot, KeyRound, Plug, MonitorPlay, Plus, X, Power,
  RefreshCcw, Ban, CheckCircle2, Copy, Eye, Activity,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const AUTH_METHODS = ["oauth2", "api_key", "jwt", "mcp_token", "zero_trust"];
const AUTONOMY = ["manual", "assisted", "autonomous"];

export default function N0VA1OConnections() {
  const { addToast } = useToast();
  const [agents, setAgents] = useState<any>(null);
  const [tokens, setTokens] = useState<any>(null);
  const [conns, setConns] = useState<any>(null);
  const [accounts, setAccounts] = useState<any>(null);
  const [sessions, setSessions] = useState<any>(null);
  const [log, setLog] = useState<any[]>([]);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [agentDetail, setAgentDetail] = useState<any>(null);
  const [minted, setMinted] = useState<any>(null);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showConnModal, setShowConnModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [agentForm, setAgentForm] = useState<any>({ name: "", description: "", authMethod: "mcp_token", scopes: "gateway.read, tools.discover", permissions: "", autonomyLevel: "assisted", approvalRequiredFor: "", maxDailyActions: 100, webhookUrl: "" });
  const [connForm, setConnForm] = useState<any>({ platformId: "", agentId: "", label: "", authMethod: "oauth2", scopes: "gateway.read" });
  const [sessionForm, setSessionForm] = useState<any>({ agentId: "", ttlSeconds: 3600, userDefinedId: "" });
  const [mintForm, setMintForm] = useState<any>({ agentId: "", ttlSec: 3600, scopes: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);

  const loadData = useCallback(async () => {
    const [a, t, c, ac, s, l, cat] = await Promise.all([
      api.adsMarketingModule.n0va1oAgents().catch(() => null),
      api.adsMarketingModule.n0va1oTokens().catch(() => null),
      api.adsMarketingModule.n0va1oConnections().catch(() => null),
      api.adsMarketingModule.n0va1oAccounts().catch(() => null),
      api.adsMarketingModule.n0va1oListSessions().catch(() => null),
      api.adsMarketingModule.n0va1oAuthLog().catch(() => null),
      api.adsMarketingModule.n0va1oGatewayCatalog().catch(() => null),
    ]);
    setAgents(unwrap(a) || null);
    setTokens(unwrap(t) || null);
    setConns(unwrap(c) || null);
    setAccounts(unwrap(ac) || null);
    setSessions(unwrap(s) || null);
    setLog((unwrap(l)?.entries || []).slice(0, 10));
    const catData = unwrap(cat);
    if (catData?.platforms) setPlatforms(catData.platforms);
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

  async function registerAgent() {
    setBusy("register");
    try {
      const input: any = { ...agentForm };
      input.scopes = agentForm.scopes.split(",").map((s: string) => s.trim()).filter(Boolean);
      input.permissions = agentForm.permissions.split(",").map((s: string) => s.trim()).filter(Boolean);
      input.approvalRequiredFor = agentForm.approvalRequiredFor.split(",").map((s: string) => s.trim()).filter(Boolean);
      input.maxDailyActions = Number(agentForm.maxDailyActions);
      const r = unwrap(await api.adsMarketingModule.n0va1oRegisterAgent(input));
      addToast("success", "Agent registered", r.summary || "");
      setAgentDetail(r);
      setShowAgentModal(false);
      await loadData();
    } catch (e: any) {
      addToast("error", "Register failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function deactivateAgent(agentId: string) {
    setBusy(`deact-${agentId}`);
    try {
      const r = unwrap(await api.adsMarketingModule.n0va1oDeactivateAgent(agentId));
      addToast("success", "Agent deactivated", r.summary);
      await loadData();
    } catch (e: any) {
      addToast("error", "Failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function openAgent(agentId: string) {
    setBusy(`agent-${agentId}`);
    try {
      const r = unwrap(await api.adsMarketingModule.n0va1oAgent(agentId));
      setAgentDetail(r);
    } catch (e: any) {
      addToast("error", "Failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function mintToken() {
    setBusy("mint");
    try {
      const input: any = { agentId: mintForm.agentId, ttlSec: Number(mintForm.ttlSec) };
      if (mintForm.scopes.trim()) input.scopes = mintForm.scopes.split(",").map((s: string) => s.trim()).filter(Boolean);
      const r = unwrap(await api.adsMarketingModule.n0va1oMintJitToken(input));
      setMinted(r);
      addToast("success", "JIT token minted", r.summary || "");
      await loadData();
    } catch (e: any) {
      addToast("error", "Mint failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function rotateToken(tokenId: string) {
    setBusy(`rot-${tokenId}`);
    try {
      const r = unwrap(await api.adsMarketingModule.n0va1oRotateToken(tokenId));
      addToast("success", "Token rotated", r.summary);
      await loadData();
    } catch (e: any) {
      addToast("error", "Failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function revokeToken(tokenId: string) {
    setBusy(`rev-${tokenId}`);
    try {
      const r = unwrap(await api.adsMarketingModule.n0va1oRevokeToken(tokenId));
      addToast("success", "Token revoked", r.summary);
      await loadData();
    } catch (e: any) {
      addToast("error", "Failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function createConn() {
    setBusy("createConn");
    try {
      const input: any = { ...connForm };
      input.scopes = connForm.scopes.split(",").map((s: string) => s.trim()).filter(Boolean);
      const r = unwrap(await api.adsMarketingModule.n0va1oCreateConnection(input));
      addToast("success", "Connection created", r.summary);
      setShowConnModal(false);
      await loadData();
    } catch (e: any) {
      addToast("error", "Create failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function authorizeConn(connectionId: string) {
    setBusy(`auth-${connectionId}`);
    try {
      const r = unwrap(await api.adsMarketingModule.n0va1oAuthorizeConnection(connectionId));
      addToast("success", "Authorized", r.summary);
      await loadData();
    } catch (e: any) {
      addToast("error", "Failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function disconnectConn(connectionId: string) {
    setBusy(`disc-${connectionId}`);
    try {
      const r = unwrap(await api.adsMarketingModule.n0va1oDisconnectConnection(connectionId));
      addToast("warning", "Disconnected", r.summary);
      await loadData();
    } catch (e: any) {
      addToast("error", "Failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function addAccount(connId: string) {
    const name = window.prompt("Account name to add to the pool:");
    if (!name || !name.trim()) return;
    setBusy(`acc-${connId}`);
    try {
      const r = unwrap(await api.adsMarketingModule.n0va1oAddAccount({ connectionId: connId, accountName: name }));
      addToast("success", "Account added", r.summary);
      await loadData();
    } catch (e: any) {
      addToast("error", "Failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function switchAccount(accountId: string) {
    setBusy(`sw-${accountId}`);
    try {
      const r = unwrap(await api.adsMarketingModule.n0va1oSwitchAccount(accountId));
      addToast("success", "Switched", r.summary);
      await loadData();
    } catch (e: any) {
      addToast("error", "Failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function createSession() {
    setBusy("createSes");
    try {
      const r = unwrap(await api.adsMarketingModule.n0va1oCreateSession({ agentId: sessionForm.agentId, ttlSeconds: Number(sessionForm.ttlSeconds), userDefinedId: sessionForm.userDefinedId }));
      addToast("success", "Session created", r.summary || "");
      setShowSessionModal(false);
      await loadData();
    } catch (e: any) {
      addToast("error", "Create failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function endSession(sessionId: string) {
    setBusy(`end-${sessionId}`);
    try {
      const r = unwrap(await api.adsMarketingModule.n0va1oEndSession(sessionId));
      addToast("success", "Session ended", r.summary);
      await loadData();
    } catch (e: any) {
      addToast("error", "Failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      addToast("success", "Copied", `${label} is on your clipboard.`);
    } catch {
      addToast("warning", "Copy manually", text);
    }
  }

  const counts = {
    agents: agents?.total ?? 0,
    connected: `${conns?.byStatus?.find((b: any) => b.status === "connected")?.count ?? 0}/${conns?.total ?? 0}`,
    tokens: tokens?.active ?? 0,
    sessions: sessions?.active ?? 0,
  };

  const statCards = [
    { label: "Agents", value: counts.agents, icon: Bot },
    { label: "Connections", value: counts.connected, icon: Plug },
    { label: "Active tokens", value: counts.tokens, icon: KeyRound },
    { label: "Active sessions", value: counts.sessions, icon: MonitorPlay },
  ];

  const modalWrap = "fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4";
  const modalBox = "w-full sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-xl sm:rounded-xl bg-gray-900 border border-gray-700 p-4 space-y-3";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Link2 className="w-5 h-5 text-n0va-300" /> Gateway Identity</h1>
          <p className="text-sm text-gray-500">Agents, JIT tokens, connections, account pools and WebSocket sessions.</p>
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
              <h2 className="font-semibold flex items-center gap-2"><Bot className="w-4 h-4 text-gray-400" /> Agents</h2>
              <button onClick={() => setShowAgentModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white text-sm font-medium">
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Register agent</span>
              </button>
            </div>
            <div className="space-y-2">
              {(agents?.agents || []).map((a: any) => (
                <div key={a.agentId} className="rounded-lg bg-gray-900/50 px-3 py-2.5 flex flex-wrap items-center gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="text-gray-200 font-medium truncate">{a.name}
                      <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[9px] ${a.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-700 text-gray-400"}`}>{a.status}</span>
                    </p>
                    <p className="text-gray-600 truncate">{a.agentId} · {a.authMethod}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(a.scopes || []).slice(0, 3).map((sc: string) => (
                      <span key={sc} className="px-1.5 py-0.5 rounded bg-n0va-500/10 text-[9px] text-n0va-300">{sc}</span>
                    ))}
                    {(a.scopes || []).length > 3 && <span className="text-[9px] text-gray-500">+{(a.scopes || []).length - 3}</span>}
                  </div>
                  <div className="flex gap-1 ml-auto">
                    <button onClick={() => openAgent(a.agentId)} disabled={busy === `agent-${a.agentId}`}
                      className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400" title="View credentials">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {a.status === "active" && (
                      <button onClick={() => deactivateAgent(a.agentId)} disabled={busy === `deact-${a.agentId}`}
                        className="p-1.5 rounded-lg bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400" title="Deactivate">
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {(agents?.agents || []).length === 0 && <p className="text-xs text-gray-500 py-2">No agents registered yet.</p>}
            </div>
          </section>

          <section className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-3">
              <h2 className="font-semibold flex items-center gap-2"><KeyRound className="w-4 h-4 text-gray-400" /> JIT tokens</h2>
              <div className="rounded-lg bg-gray-900/50 p-3 space-y-2">
                <p className="text-[11px] text-gray-500">Mint a short-lived, scope-pruned token for an agent (AES-256-GCM sealed envelope).</p>
                <div className="flex flex-wrap gap-2">
                  <select className="flex-1 min-w-36 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-xs text-gray-200"
                    value={mintForm.agentId} onChange={(e) => setMintForm({ ...mintForm, agentId: e.target.value })}>
                    <option value="">Select agent…</option>
                    {(agents?.agents || []).map((a: any) => (
                      <option key={a.agentId} value={a.agentId}>{a.name}</option>
                    ))}
                  </select>
                  <input type="number" min={60} max={86400} className="w-24 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-xs text-gray-200"
                    placeholder="TTL s" value={mintForm.ttlSec} onChange={(e) => setMintForm({ ...mintForm, ttlSec: e.target.value })} />
                  <input className="flex-1 min-w-40 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-xs text-gray-200"
                    placeholder="scopes (optional)" value={mintForm.scopes} onChange={(e) => setMintForm({ ...mintForm, scopes: e.target.value })} />
                  <button onClick={mintToken} disabled={busy === "mint" || !mintForm.agentId}
                    className="px-3 py-1.5 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white text-xs">
                    {busy === "mint" ? "Minting…" : "Mint"}
                  </button>
                </div>
                {minted && (
                  <div className="rounded-lg bg-n0va-500/10 border border-n0va-500/30 p-2.5 text-xs space-y-1">
                    <p className="text-n0va-300 font-medium">{minted.summary}</p>
                    <p className="text-gray-300 font-mono text-[10px] break-all">{minted.tokenId}</p>
                    <div className="flex flex-wrap gap-1">
                      {(minted.scopes || []).map((sc: string) => (
                        <span key={sc} className="px-1.5 py-0.5 rounded bg-gray-900 text-[9px] text-n0va-300">{sc}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {(tokens?.tokens || []).slice(0, 8).map((t: any) => (
                  <div key={t.tokenId} className="rounded-lg bg-gray-900/50 px-3 py-2 flex flex-wrap items-center gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="text-gray-300 font-mono text-[10px] truncate">{t.tokenId}
                        <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[9px] ${t.status === "revoked" ? "bg-red-500/15 text-red-400" : t.expired ? "bg-gray-700 text-gray-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                          {t.status === "revoked" ? "revoked" : t.expired ? "expired" : "active"}
                        </span>
                      </p>
                      <p className="text-gray-600">{t.agentName} · expires {new Date(t.expiresAt).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-1 ml-auto">
                      <button onClick={() => rotateToken(t.tokenId)} disabled={busy === `rot-${t.tokenId}`}
                        className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400" title="Rotate">
                        <RefreshCcw className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => revokeToken(t.tokenId)} disabled={busy === `rev-${t.tokenId}`}
                        className="p-1.5 rounded-lg bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400" title="Revoke">
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold flex items-center gap-2"><Plug className="w-4 h-4 text-gray-400" /> Connections</h2>
                <button onClick={() => setShowConnModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white text-sm font-medium">
                  <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Connect</span>
                </button>
              </div>
              <div className="space-y-2">
                {(conns?.connections || []).map((c: any) => (
                  <div key={c.connectionId} className="rounded-lg bg-gray-900/50 px-3 py-2.5 flex flex-wrap items-center gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="text-gray-200 font-medium truncate">{c.label}
                        <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[9px] ${c.status === "connected" ? "bg-emerald-500/15 text-emerald-400" : c.status === "pending" ? "bg-amber-500/15 text-amber-400" : c.status === "error" ? "bg-red-500/15 text-red-400" : "bg-gray-700 text-gray-400"}`}>{c.status}</span>
                      </p>
                      <p className="text-gray-600 truncate">{c.platformId} · {c.authMethod} · {c.agentName}</p>
                    </div>
                    <div className="flex gap-1 ml-auto">
                      <button onClick={() => addAccount(c.connectionId)} disabled={busy === `acc-${c.connectionId}`}
                        className="px-2 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400" title="Add account">+ Acct</button>
                      {c.status !== "connected" ? (
                        <button onClick={() => authorizeConn(c.connectionId)} disabled={busy === `auth-${c.connectionId}`}
                          className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400" title="Authorize">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button onClick={() => disconnectConn(c.connectionId)} disabled={busy === `disc-${c.connectionId}`}
                          className="px-2 py-1 rounded-lg bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400" title="Disconnect">
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {(conns?.connections || []).length === 0 && <p className="text-xs text-gray-500 py-2">No connections yet.</p>}
              </div>
              <div className="rounded-lg bg-gray-900/50 p-3 space-y-2">
                <p className="text-[11px] text-gray-500">Account pool — {accounts?.total ?? 0} account(s)
                  {accounts?.activeAccount ? ` · active: ${(accounts?.accounts || []).find((a: any) => a.accountId === accounts.activeAccount)?.accountName || ""}` : ""}</p>
                {(accounts?.accounts || []).slice(0, 6).map((a: any) => (
                  <div key={a.accountId} className="flex items-center gap-2 text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full ${a.active ? "bg-emerald-400" : "bg-gray-600"}`} />
                    <span className="text-gray-300 truncate">{a.accountName}</span>
                    <span className="text-gray-600 truncate">{a.platformId}</span>
                    {!a.active && (
                      <button onClick={() => switchAccount(a.accountId)} disabled={busy === `sw-${a.accountId}`}
                        className="ml-auto px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 text-[10px]">Switch</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold flex items-center gap-2"><MonitorPlay className="w-4 h-4 text-gray-400" /> Sessions</h2>
              <button onClick={() => setShowSessionModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white text-sm font-medium">
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New session</span>
              </button>
            </div>
            <div className="space-y-2">
              {(sessions?.sessions || []).slice(0, 8).map((s: any) => (
                <div key={s.sessionId} className="rounded-lg bg-gray-900/50 px-3 py-2.5 flex flex-wrap items-center gap-2 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="text-gray-200 font-mono text-[10px] truncate">{s.sessionId}
                      <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[9px] ${s.status === "active" && !s.expired ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-700 text-gray-400"}`}>
                        {s.status === "active" && !s.expired ? "active" : "ended"}
                      </span>
                    </p>
                    <p className="text-gray-600 truncate">{s.agentName} · {s.contextTokens ?? 0} ctx tokens · {s.userDefinedId ? `${s.userDefinedId} · ` : ""}{new Date(s.expiresAt).toLocaleString()}</p>
                  </div>
                  {s.status === "active" && !s.expired && (
                    <button onClick={() => endSession(s.sessionId)} disabled={busy === `end-${s.sessionId}`}
                      className="p-1.5 rounded-lg bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400" title="End session">
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {(sessions?.sessions || []).length === 0 && <p className="text-xs text-gray-500 py-2">No sessions yet.</p>}
            </div>
          </section>

          <section className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-2">
            <h2 className="font-semibold flex items-center gap-2"><Activity className="w-4 h-4 text-gray-400" /> Identity activity</h2>
            <div className="space-y-1.5">
              {log.map((e: any, i: number) => (
                <p key={i} className="text-[11px] text-gray-500 truncate">
                  <span className="text-gray-600">{new Date(e.at).toLocaleString()}</span> — <span className="text-n0va-300/80">{e.category}</span> {e.detail}
                </p>
              ))}
              {log.length === 0 && <p className="text-xs text-gray-500 py-2">No activity yet.</p>}
            </div>
          </section>

          {agentDetail && (
            <div className={modalWrap} onClick={() => setAgentDetail(null)}>
              <div className={modalBox} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-200">Agent credentials</h3>
                  <button onClick={() => setAgentDetail(null)} className="text-gray-500 hover:text-gray-300"><X className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 text-xs">
                  <p className="text-gray-200 font-medium">{agentDetail.name}
                    <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[9px] ${agentDetail.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-700 text-gray-400"}`}>{agentDetail.status}</span>
                  </p>
                  <p className="text-gray-500">{agentDetail.agentId} · {agentDetail.authMethod} · autonomy {agentDetail.autonomyLevel}</p>
                  <div className="rounded-lg bg-gray-900/60 p-2.5 space-y-1">
                    <p className="text-gray-500 flex items-center justify-between">
                      API key <button onClick={() => copyText(agentDetail.apiKey || agentDetail.api_key, "API key")} className="text-n0va-300 hover:underline flex items-center gap-1"><Copy className="w-3 h-3" /> copy</button>
                    </p>
                    <p className="text-gray-300 font-mono text-[10px] break-all">{agentDetail.apiKey || agentDetail.api_key || "—"}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(agentDetail.scopes || []).map((sc: string) => (
                      <span key={sc} className="px-1.5 py-0.5 rounded bg-n0va-500/10 text-[9px] text-n0va-300">{sc}</span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(agentDetail.permissions || []).map((p: string) => (
                      <span key={p} className="px-1.5 py-0.5 rounded bg-gray-800 text-[9px] text-gray-400">{p}</span>
                    ))}
                  </div>
                  <p className="text-gray-600">Max daily actions: {agentDetail.maxDailyActions} · Approval required for: {(agentDetail.approvalRequiredFor || []).join(", ") || "none"}</p>
                </div>
              </div>
            </div>
          )}

          {showAgentModal && (
            <div className={modalWrap} onClick={() => setShowAgentModal(false)}>
              <div className={modalBox} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-200">Register agent</h3>
                  <button onClick={() => setShowAgentModal(false)} className="text-gray-500 hover:text-gray-300"><X className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="col-span-2 flex flex-col gap-1 text-gray-500">Name *
                    <input className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-gray-200" value={agentForm.name} onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })} /></label>
                  <label className="col-span-2 flex flex-col gap-1 text-gray-500">Description
                    <input className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-gray-200" value={agentForm.description} onChange={(e) => setAgentForm({ ...agentForm, description: e.target.value })} /></label>
                  <label className="flex flex-col gap-1 text-gray-500">Auth method
                    <select className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-gray-200" value={agentForm.authMethod} onChange={(e) => setAgentForm({ ...agentForm, authMethod: e.target.value })}>
                      {AUTH_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select></label>
                  <label className="flex flex-col gap-1 text-gray-500">Autonomy
                    <select className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-gray-200" value={agentForm.autonomyLevel} onChange={(e) => setAgentForm({ ...agentForm, autonomyLevel: e.target.value })}>
                      {AUTONOMY.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select></label>
                  <label className="col-span-2 flex flex-col gap-1 text-gray-500">Scopes (comma-separated)
                    <input className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-gray-200" value={agentForm.scopes} onChange={(e) => setAgentForm({ ...agentForm, scopes: e.target.value })} /></label>
                  <label className="col-span-2 flex flex-col gap-1 text-gray-500">Permissions (comma-separated)
                    <input className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-gray-200" value={agentForm.permissions} onChange={(e) => setAgentForm({ ...agentForm, permissions: e.target.value })} /></label>
                  <label className="col-span-2 flex flex-col gap-1 text-gray-500">Approval-required tools (comma-separated)
                    <input className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-gray-200" value={agentForm.approvalRequiredFor} onChange={(e) => setAgentForm({ ...agentForm, approvalRequiredFor: e.target.value })} /></label>
                  <label className="flex flex-col gap-1 text-gray-500">Max daily actions
                    <input type="number" min={1} max={1000} className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-gray-200" value={agentForm.maxDailyActions} onChange={(e) => setAgentForm({ ...agentForm, maxDailyActions: e.target.value })} /></label>
                  <label className="flex flex-col gap-1 text-gray-500">Webhook URL (https)
                    <input className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-gray-200" value={agentForm.webhookUrl} onChange={(e) => setAgentForm({ ...agentForm, webhookUrl: e.target.value })} /></label>
                </div>
                <button onClick={registerAgent} disabled={busy === "register" || !agentForm.name}
                  className="w-full px-3 py-2 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white text-sm font-medium">
                  {busy === "register" ? "Registering…" : "Register"}
                </button>
              </div>
            </div>
          )}

          {showConnModal && (
            <div className={modalWrap} onClick={() => setShowConnModal(false)}>
              <div className={modalBox} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-200">New connection</h3>
                  <button onClick={() => setShowConnModal(false)} className="text-gray-500 hover:text-gray-300"><X className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="col-span-2 flex flex-col gap-1 text-gray-500">Platform *
                    <select className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-gray-200" value={connForm.platformId} onChange={(e) => setConnForm({ ...connForm, platformId: e.target.value })}>
                      <option value="">Select platform…</option>
                      {platforms.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select></label>
                  <label className="col-span-2 flex flex-col gap-1 text-gray-500">Agent *
                    <select className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-gray-200" value={connForm.agentId} onChange={(e) => setConnForm({ ...connForm, agentId: e.target.value })}>
                      <option value="">Select agent…</option>
                      {(agents?.agents || []).map((a: any) => <option key={a.agentId} value={a.agentId}>{a.name}</option>)}
                    </select></label>
                  <label className="flex flex-col gap-1 text-gray-500">Label
                    <input className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-gray-200" value={connForm.label} onChange={(e) => setConnForm({ ...connForm, label: e.target.value })} /></label>
                  <label className="flex flex-col gap-1 text-gray-500">Auth method
                    <select className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-gray-200" value={connForm.authMethod} onChange={(e) => setConnForm({ ...connForm, authMethod: e.target.value })}>
                      {AUTH_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select></label>
                  <label className="col-span-2 flex flex-col gap-1 text-gray-500">Scopes (comma-separated)
                    <input className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-gray-200" value={connForm.scopes} onChange={(e) => setConnForm({ ...connForm, scopes: e.target.value })} /></label>
                </div>
                <button onClick={createConn} disabled={busy === "createConn" || !connForm.platformId || !connForm.agentId}
                  className="w-full px-3 py-2 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white text-sm font-medium">
                  {busy === "createConn" ? "Creating…" : "Create connection"}
                </button>
              </div>
            </div>
          )}

          {showSessionModal && (
            <div className={modalWrap} onClick={() => setShowSessionModal(false)}>
              <div className={modalBox} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-200">New session</h3>
                  <button onClick={() => setShowSessionModal(false)} className="text-gray-500 hover:text-gray-300"><X className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="col-span-2 flex flex-col gap-1 text-gray-500">Agent *
                    <select className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-gray-200" value={sessionForm.agentId} onChange={(e) => setSessionForm({ ...sessionForm, agentId: e.target.value })}>
                      <option value="">Select agent…</option>
                      {(agents?.agents || []).map((a: any) => <option key={a.agentId} value={a.agentId}>{a.name}</option>)}
                    </select></label>
                  <label className="flex flex-col gap-1 text-gray-500">TTL seconds
                    <input type="number" min={60} max={86400} className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-gray-200" value={sessionForm.ttlSeconds} onChange={(e) => setSessionForm({ ...sessionForm, ttlSeconds: e.target.value })} /></label>
                  <label className="flex flex-col gap-1 text-gray-500">User-defined ID
                    <input className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-gray-200" value={sessionForm.userDefinedId} onChange={(e) => setSessionForm({ ...sessionForm, userDefinedId: e.target.value })} /></label>
                </div>
                <button onClick={createSession} disabled={busy === "createSes" || !sessionForm.agentId}
                  className="w-full px-3 py-2 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white text-sm font-medium">
                  {busy === "createSes" ? "Creating…" : "Create session"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
