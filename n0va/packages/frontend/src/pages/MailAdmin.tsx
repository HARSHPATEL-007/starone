import { useEffect, useState, useCallback } from "react";
import {
  Settings, RefreshCw, Plus, X, HardDrive, KeyRound, Copy, CheckCircle2, Trash2,
  RotateCcw, Ban, Eye, ShieldCheck, Clock3,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const scopeLabels: Record<string, string> = {
  send: "Send mail",
  read: "Read messages",
  webhook: "Manage webhooks",
  campaigns: "Manage campaigns",
};

function fmtBytes(b: number): string {
  if (!b) return "0 B";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function MailAdmin() {
  const { addToast } = useToast();
  const [bDash, setBDash] = useState<any>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any>(null);
  const [keys, setKeys] = useState<any[]>([]);
  const [kDash, setKDash] = useState<any>(null);
  const [keyUsage, setKeyUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [backupLabel, setBackupLabel] = useState("");
  const [keyForm, setKeyForm] = useState({ label: "", scopes: ["send"] as string[] });
  const [verifyInput, setVerifyInput] = useState("");
  const [verifyRes, setVerifyRes] = useState<any>(null);

  const loadData = useCallback(async () => {
    const [bd, b, s, k, kd] = await Promise.all([
      api.adsMarketingModule.mailBackupsDashboard().catch(() => null),
      api.adsMarketingModule.mailBackups().catch(() => null),
      api.adsMarketingModule.mailBackupSchedule().catch(() => null),
      api.adsMarketingModule.mailApiKeys().catch(() => null),
      api.adsMarketingModule.mailApiKeyDashboard().catch(() => null),
    ]);
    setBDash(unwrap(bd) || null);
    const bR = unwrap(b);
    setBackups(bR?.backups || []);
    setSchedule(unwrap(s) || null);
    const kR = unwrap(k);
    setKeys(kR?.keys || []);
    setKDash(unwrap(kd) || null);
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

  async function createBackup() {
    setBusy("bk");
    try {
      const r = unwrap(await api.adsMarketingModule.mailCreateBackup(backupLabel || undefined));
      addToast("success", "Backup created", r?.summary || "");
      setBackupLabel("");
      setShowCreate(false);
      await loadData();
    } catch (e: any) {
      addToast("error", "Backup failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function saveSchedule() {
    if (!schedule) return;
    setBusy("sched");
    try {
      const r = unwrap(await api.adsMarketingModule.mailSetBackupSchedule(schedule));
      addToast("success", "Schedule saved", r?.summary || "");
      await loadData();
    } catch (e: any) {
      addToast("error", "Save failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function createKey() {
    if (!keyForm.label.trim()) {
      addToast("warning", "Label required", "Give the key a label so you can recognize it.");
      return;
    }
    setBusy("key");
    try {
      const r = unwrap(await api.adsMarketingModule.mailCreateApiKey(keyForm));
      setNewKey(r.key || "");
      setKeyForm({ label: "", scopes: ["send"] });
      await loadData();
    } catch (e: any) {
      addToast("error", "Create failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function verifyKey() {
    if (!verifyInput.trim()) {
      addToast("warning", "Key required", "Paste a key to verify.");
      return;
    }
    setBusy("verify");
    try {
      const r = unwrap(await api.adsMarketingModule.mailVerifyApiKey(verifyInput));
      setVerifyRes(r);
    } catch (e: any) {
      addToast("error", "Verify failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function openUsage(apiKeyId: string) {
    setBusy(`usage-${apiKeyId}`);
    try {
      const r = unwrap(await api.adsMarketingModule.mailApiKeyUsage(apiKeyId));
      setKeyUsage(r);
    } catch (e: any) {
      addToast("error", "Usage failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(newKey);
      addToast("success", "Copied", "The key is on your clipboard.");
    } catch {
      addToast("warning", "Copy manually", newKey);
    }
  }

  const bkStats = [
    { label: "Backups", value: bDash?.total ?? 0, icon: HardDrive },
    { label: "Storage", value: fmtBytes(bDash?.totalBytes ?? 0), icon: ShieldCheck },
    { label: "Auto-backup", value: schedule?.autoBackup ? `every ${schedule.intervalHours}h` : "off", icon: Clock3 },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Settings className="w-5 h-5 text-n0va-300" /> Mail Admin</h1>
          <p className="text-sm text-gray-500">Backup &amp; restore snapshots and API keys for programmatic mail access.</p>
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
          <section className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold flex items-center gap-2"><HardDrive className="w-4 h-4 text-gray-400" /> Backups</h2>
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white text-sm font-medium">
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Back up now</span>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {bkStats.map((s) => (
                <div key={s.label} className="rounded-xl bg-gray-900/50 p-3">
                  <p className="text-xs text-gray-500 flex items-center gap-1.5"><s.icon className="w-3.5 h-3.5" /> {s.label}</p>
                  <p className="text-lg font-bold mt-1">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-gray-900/50 p-3 flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-xs text-gray-500 min-w-28">
                Auto-backup
                <select className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-xs text-gray-200"
                  value={schedule?.autoBackup ? "on" : "off"} onChange={(e) => setSchedule({ ...schedule, autoBackup: e.target.value === "on" })}>
                  <option value="off">Off</option>
                  <option value="on">On</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500">
                Interval (h)
                <input type="number" min={1} className="w-20 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-xs text-gray-200"
                  value={schedule?.intervalHours ?? 24} onChange={(e) => setSchedule({ ...schedule, intervalHours: Number(e.target.value) })} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500">
                Retention (d)
                <input type="number" min={1} className="w-20 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-xs text-gray-200"
                  value={schedule?.retentionDays ?? 30} onChange={(e) => setSchedule({ ...schedule, retentionDays: Number(e.target.value) })} />
              </label>
              <button onClick={saveSchedule} disabled={busy === "sched"}
                className="px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs">
                {busy === "sched" ? "Saving…" : "Save schedule"}
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {backups.map((b: any) => (
                <div key={b.backupId} className="rounded-lg bg-gray-900/50 px-3 py-2.5 flex flex-wrap items-center gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="text-gray-200 truncate">{b.label}{b.restoredAt ? " · restored" : ""}</p>
                    <p className="text-gray-600">{new Date(b.createdAt).toLocaleString()} · {fmtBytes(b.sizeBytes)} · {b.snapshot?.messages} msg(s)</p>
                  </div>
                  <div className="flex gap-1 ml-auto">
                    <button
                      onClick={() => act(`res-${b.backupId}`, () => api.adsMarketingModule.mailRestoreBackup(b.backupId), "Restored", "Restore failed")}
                      disabled={busy === `res-${b.backupId}`}
                      className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400" title="Restore">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => act(`del-${b.backupId}`, () => api.adsMarketingModule.mailDeleteBackup(b.backupId), "Deleted", "Delete failed")}
                      disabled={busy === `del-${b.backupId}`}
                      className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400" title="Delete backup">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {bDash?.recentRestores?.length > 0 && (
              <p className="text-xs text-gray-500">
                Recent restores: {bDash.recentRestores.map((r: any) => r.label).join(" · ")}
              </p>
            )}
          </section>

          <section className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold flex items-center gap-2"><KeyRound className="w-4 h-4 text-gray-400" /> API keys</h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span>{kDash?.keys ?? 0} key(s)</span>
                <span>{kDash?.callsToday ?? 0} calls today</span>
                <span>{kDash?.callsTotal ?? 0} total</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {Object.entries(kDash?.byAction || {}).map(([k, v]) => (
                <span key={k} className="text-[11px] px-2 py-0.5 rounded-full bg-n0va-500/10 text-n0va-300">{k}: {String(v)}</span>
              ))}
            </div>
            <div className="grid gap-2">
              {keys.length === 0 && <p className="text-sm text-gray-500">No API keys yet — create one for CI or integrations.</p>}
              {keys.map((k: any) => (
                <div key={k.apiKeyId} className="rounded-lg bg-gray-900/50 px-3 py-2.5 flex flex-wrap items-center gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-gray-200 truncate">{k.label}</p>
                      <span className={`px-1.5 py-0.5 rounded ${k.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>{k.status}</span>
                      <span className="text-gray-500 font-mono">{k.prefix}…{k.last4}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      {k.scopes.map((s: string) => (
                        <span key={s} className="px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400">{scopeLabels[s] || s}</span>
                      ))}
                      <span className="text-gray-600">{k.callsTotal ?? 0} calls</span>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-auto">
                    <button onClick={() => openUsage(k.apiKeyId)} disabled={busy === `usage-${k.apiKeyId}`}
                      className="p-1.5 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 text-gray-300" title="Usage">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {k.status === "active" && (
                      <button onClick={() => act(`rev-${k.apiKeyId}`, () => api.adsMarketingModule.mailRevokeApiKey(k.apiKeyId), "Revoked", "Revoke failed")}
                        disabled={busy === `rev-${k.apiKeyId}`}
                        className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400" title="Revoke">
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => { setShowKey(true); setNewKey(""); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium">
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Create API key</span>
            </button>
            <div className="rounded-lg bg-gray-900/50 p-3 flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-xs text-gray-500 flex-1 min-w-40">
                Verify a key
                <input className="rounded-lg bg-gray-800 border border-gray-700 px-2.5 py-1.5 text-xs font-mono text-gray-200"
                  placeholder="n0va_mk_…" value={verifyInput} onChange={(e) => setVerifyInput(e.target.value)} />
              </label>
              <button onClick={verifyKey} disabled={busy === "verify"}
                className="px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs">
                {busy === "verify" ? "Checking…" : "Verify"}
              </button>
              {verifyRes && (
                <span className={`flex items-center gap-1 text-xs ${verifyRes.valid ? "text-emerald-400" : "text-red-400"}`}>
                  {verifyRes.valid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                  {verifyRes.valid ? `valid · ${verifyRes.scopes?.join(", ")}` : `invalid (${verifyRes.reason})`}
                </span>
              )}
            </div>
            {keyUsage && (
              <div className="rounded-lg bg-gray-900/50 p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-300">{keyUsage.label} — {keyUsage.callsToday} today / {keyUsage.callsTotal} total</p>
                  <button onClick={() => setKeyUsage(null)} className="text-gray-500 hover:text-gray-300"><X className="w-3.5 h-3.5" /></button>
                </div>
                {Object.entries(keyUsage.byAction || {}).map(([k, v]) => (
                  <p key={k} className="text-gray-500">{k}: {String(v)}</p>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full sm:max-w-md bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">Back up now</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400"><X className="w-4 h-4" /></button>
            </div>
            <input className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm" placeholder="Label (optional, e.g. Pre-migration)"
              value={backupLabel} onChange={(e) => setBackupLabel(e.target.value)} />
            <p className="text-xs text-gray-500 mt-2">Snapshots mailboxes, messages, contacts, threads, rules, automations, sequences, templates, campaigns and tickets. The 10 newest are kept.</p>
            <button onClick={createBackup} disabled={busy === "bk"}
              className="mt-4 w-full py-2.5 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white font-medium">
              {busy === "bk" ? "Backing up…" : "Create backup"}
            </button>
          </div>
        </div>
      )}

      {showKey && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowKey(false)}>
          <div className="w-full sm:max-w-md bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            {!newKey ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold">Create an API key</h2>
                  <button onClick={() => setShowKey(false)} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400"><X className="w-4 h-4" /></button>
                </div>
                <div className="space-y-3">
                  <input className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm" placeholder="Label (e.g. CI pipeline)"
                    value={keyForm.label} onChange={(e) => setKeyForm({ ...keyForm, label: e.target.value })} />
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(scopeLabels).map(([id, label]) => (
                      <button key={id} onClick={() => setKeyForm({
                        ...keyForm,
                        scopes: keyForm.scopes.includes(id) ? keyForm.scopes.filter((s: string) => s !== id) : [...keyForm.scopes, id],
                      })}
                        className={`text-xs px-2.5 py-1.5 rounded-full border ${keyForm.scopes.includes(id) ? "border-n0va-500 bg-n0va-500/20 text-n0va-300" : "border-gray-700 text-gray-400"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <button onClick={createKey} disabled={busy === "key"}
                    className="w-full py-2.5 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white font-medium">
                    {busy === "key" ? "Creating…" : "Create key"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-emerald-400 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Key created</h2>
                  <button onClick={() => setShowKey(false)} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400"><X className="w-4 h-4" /></button>
                </div>
                <p className="text-xs text-amber-400 mb-2">Copy it now — the full key will never be shown again.</p>
                <div className="rounded-lg bg-gray-900 border border-gray-700 px-3 py-2.5 font-mono text-xs text-gray-200 break-all">{newKey}</div>
                <button onClick={copyKey}
                  className="mt-3 w-full py-2.5 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white font-medium flex items-center justify-center gap-2">
                  <Copy className="w-4 h-4" /> Copy key
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <p className="text-[11px] text-gray-600 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Keys are stored hashed — verify calls and usage stay auditable without exposing secrets.</p>
    </div>
  );
}
