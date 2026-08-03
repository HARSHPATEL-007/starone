import { useEffect, useState, useCallback } from "react";
import {
  Import, RefreshCw, AlertTriangle, Plus, Trash2, ScanLine, Eye, Download, CheckCircle2, Clock, FolderOpen, Mail, HardDrive,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const PROVIDERS = [
  { id: "gmail", name: "Google Workspace (Gmail)" },
  { id: "outlook", name: "Microsoft 365 (Outlook)" },
  { id: "yahoo", name: "Yahoo Mail" },
  { id: "imap", name: "Generic IMAP" },
];

const MODES = [
  { id: "full", label: "Full mailbox" },
  { id: "last_90_days", label: "Last 90 days" },
  { id: "last_30_days", label: "Last 30 days" },
];

const STATUS_META: Record<string, { color: string; label: string }> = {
  scanning: { color: "bg-sky-500/15 text-sky-400 border-sky-500/30", label: "Scanning" },
  mapped: { color: "bg-amber-500/15 text-amber-400 border-amber-500/30", label: "Mapped" },
  completed: { color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", label: "Completed" },
};

const progressFor = (m: any) =>
  m.status === "completed" ? Math.min(100, Math.round(((m.imported || 0) / Math.max(1, m.totalMessages || 1)) * 100))
    : m.status === "mapped" ? 60 : 5;

export default function MailImport() {
  const { addToast } = useToast();
  const [migs, setMigs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [log, setLog] = useState<any[]>([]);
  const [mailboxes, setMailboxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showPreview, setShowPreview] = useState<any>(null);
  const [form, setForm] = useState<{ provider: string; mailboxId: string; sourceEmail: string; mode: string }>({
    provider: "gmail", mailboxId: "", sourceEmail: "", mode: "full",
  });

  const load = useCallback(async () => {
    const [m, s, l, mb] = await Promise.all([
      api.adsMarketingModule.mailMigrations().catch(() => null),
      api.adsMarketingModule.mailMigrationSummary().catch(() => null),
      api.adsMarketingModule.mailMigrationLog().catch(() => null),
      api.adsMarketingModule.mailMailboxes().catch(() => null),
    ]);
    setMigs(Array.isArray(m) ? m : unwrap(m) || []);
    setSummary(unwrap(s));
    setLog(Array.isArray(l) ? l : unwrap(l) || []);
    setMailboxes(Array.isArray(mb) ? mb : unwrap(mb) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    function refresh() { load(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [load]);
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [autoRefresh, load]);

  async function createMigration() {
    setBusy("new");
    const r = unwrap(await api.adsMarketingModule.mailStartMigration(form).catch(() => null));
    if (r?.migrationId) {
      addToast("success", r.summary);
      setShowNew(false);
      setForm({ provider: "gmail", mailboxId: "", sourceEmail: "", mode: "full" });
      load();
    } else {
      addToast("error", "Migration start failed — check provider, mailbox and source email");
    }
    setBusy(null);
  }

  async function scan(m: any) {
    setBusy(m.migrationId + "scan");
    const r = unwrap(await api.adsMarketingModule.mailMigrationScan(m.migrationId).catch(() => null));
    if (r?.summary) addToast("info", r.summary); else addToast("error", "Scan failed");
    setBusy(null);
    load();
  }

  async function preview(m: any) {
    setBusy(m.migrationId + "prev");
    const r = unwrap(await api.adsMarketingModule.mailMigrationPreview(m.migrationId).catch(() => null));
    if (r?.samples) { setShowPreview(r); addToast("info", r.summary); } else addToast("error", "Preview failed");
    setBusy(null);
  }

  async function runImport(m: any) {
    if (!confirm(`Import into the mailbox now? Duplicates will be skipped.`)) return;
    setBusy(m.migrationId + "import");
    const r = unwrap(await api.adsMarketingModule.mailMigrationImport(m.migrationId).catch(() => null));
    if (r?.summary) addToast(r.failed > 0 ? "warning" : "success", r.summary); else addToast("error", "Import failed");
    setBusy(null);
    load();
  }

  async function del(m: any) {
    if (!confirm(`Delete migration from ${m.sourceEmail}?`)) return;
    setBusy(m.migrationId + "del");
    const r = unwrap(await api.adsMarketingModule.mailDeleteMigration(m.migrationId).catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setBusy(null);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Import className="w-6 h-6 text-n0va-400" /> Mail Import</h1>
          <p className="text-gray-500 mt-1 text-sm">Migrate mailboxes from other providers with scan, preview and dedupe</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="w-3.5 h-3.5 text-n0va-600 bg-gray-700 border-gray-600 rounded" />
            Auto-refresh 30s
          </label>
          <button className="btn-secondary p-2" onClick={load} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary text-xs" onClick={() => setShowNew(true)}><Plus className="w-3.5 h-3.5" /> New import</button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : !summary ? (
        <div className="card border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-sm text-red-300 font-medium">Migration data unavailable</p>
              <p className="text-xs text-red-400/70">Check that the backend is running.</p>
            </div>
            <button className="btn-secondary text-xs ml-auto" onClick={load}>Retry</button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{summary.total || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Migrations</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-emerald-400">{summary.completed || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Completed</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{summary.importedTotal || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Messages imported</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-violet-400">{summary.storageMb || "0.0"} MB</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Storage added</p>
            </div>
          </div>

          {migs.length === 0 ? (
            <div className="card border-dashed border-gray-700 text-center py-10">
              <Import className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No migrations yet — bring in a mailbox from Gmail, Outlook, Yahoo or IMAP.</p>
              <button className="btn-primary text-xs mt-3" onClick={() => setShowNew(true)}><Plus className="w-3.5 h-3.5" /> Start an import</button>
            </div>
          ) : (
            <div className="space-y-3">
              {migs.map((m: any) => {
                const meta = STATUS_META[m.status] || STATUS_META.scanning;
                const pct = progressFor(m);
                return (
                  <div key={m.migrationId} className="card !p-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Mail className="w-4 h-4 text-n0va-400" />
                      <p className="text-sm font-semibold text-white">{m.providerName}</p>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${meta.color}`}>{meta.label}</span>
                      <span className="text-[9px] font-mono text-gray-500">{m.mode}</span>
                      <p className="text-[11px] text-gray-400 ml-auto">{m.sourceEmail}</p>
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <div className="flex-1 min-w-[120px] h-1.5 rounded-full bg-gray-800 overflow-hidden">
                        <div className="h-full rounded-full bg-n0va-500/70" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-500">{pct}%</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1.5 flex-wrap">
                      ~{m.totalMessages} messages · {Object.entries(m.perFolder || {}).map(([f, n]) => `${f} ${n}`).join(" · ")}
                    </p>
                    {m.status === "completed" && (
                      <p className="text-[10px] text-gray-400 mt-1">
                        {m.imported} imported · {m.failed} failed · {m.dedupeSkipped} duplicates skipped
                        {m.completedAt ? ` · ${new Date(m.completedAt).toLocaleTimeString()}` : ""}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                      {m.status === "scanning" && (
                        <button className="btn-primary text-[10px] px-2 py-1" onClick={() => scan(m)} disabled={busy === m.migrationId + "scan"}>
                          <ScanLine className="w-3 h-3" /> Scan folders
                        </button>
                      )}
                      {m.status === "mapped" && (
                        <>
                          <button className="btn-secondary text-[10px] px-2 py-1" onClick={() => preview(m)} disabled={busy === m.migrationId + "prev"}>
                            <Eye className="w-3 h-3" /> Preview
                          </button>
                          <button className="btn-primary text-[10px] px-2 py-1" onClick={() => runImport(m)} disabled={busy === m.migrationId + "import"}>
                            <Download className="w-3 h-3" /> Import messages
                          </button>
                        </>
                      )}
                      {m.status === "completed" && (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Imported into mailbox</span>
                      )}
                      <button className="btn-secondary p-1.5 hover:!border-red-500/40 ml-auto" title="Delete migration" onClick={() => del(m)} disabled={busy === m.migrationId + "del"}>
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><FolderOpen className="w-4 h-4 text-sky-400" /> Providers</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {summary.providers?.length === 0 && (
                  <p className="text-xs text-gray-500 col-span-full">No providers used yet.</p>
                )}
                {(summary.providers || []).map((p: any) => (
                  <div key={p.providerId} className="card !p-3 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-n0va-400" />
                    <p className="text-xs text-white">{p.providerName}</p>
                    <span className="text-[10px] text-gray-500 ml-auto">{p.count} migration(s)</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Clock className="w-4 h-4 text-violet-400" /> Activity log</h2>
              {log.length === 0 && (
                <div className="card border-dashed border-gray-700 text-center py-6">
                  <p className="text-sm text-gray-500">No migration activity yet.</p>
                </div>
              )}
              {log.map((l: any, i: number) => (
                <div key={i} className="card !p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">{l.category}</span>
                    <span className="text-[9px] text-gray-600 ml-auto">{new Date(l.at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">{l.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {showNew && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <div className="card w-full max-w-md !p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2"><Import className="w-4 h-4 text-n0va-400" /> New mailbox import</h3>
            <p className="text-[11px] text-gray-500 mb-3">Scan a source mailbox, preview the mapping, then import with automatic dedupe.</p>
            <label className="block text-[11px] text-gray-400 mb-1">Source provider</label>
            <select className="input mb-3" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <label className="block text-[11px] text-gray-400 mb-1">Source email</label>
            <input className="input mb-3" placeholder="alice@old-company.com" value={form.sourceEmail} onChange={(e) => setForm({ ...form, sourceEmail: e.target.value })} />
            <label className="block text-[11px] text-gray-400 mb-1">Target mailbox</label>
            <select className="input mb-3" value={form.mailboxId} onChange={(e) => setForm({ ...form, mailboxId: e.target.value })}>
              <option value="">Select a mailbox…</option>
              {mailboxes.map((mb: any) => (
                <option key={mb.mailboxId} value={mb.mailboxId}>{mb.name} ({mb.email})</option>
              ))}
            </select>
            <label className="block text-[11px] text-gray-400 mb-1">Date range</label>
            <select className="input mb-4" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
              {MODES.map((mo) => (
                <option key={mo.id} value={mo.id}>{mo.label}</option>
              ))}
            </select>
            <div className="flex gap-2 justify-end">
              <button className="btn-secondary text-xs" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="btn-primary text-xs" onClick={createMigration} disabled={busy === "new" || !form.mailboxId || !form.sourceEmail.trim()}>
                {busy === "new" ? "Queuing…" : "Start migration"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={() => setShowPreview(null)}>
          <div className="card w-full max-w-md !p-5 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2"><HardDrive className="w-4 h-4 text-sky-400" /> Preview — {showPreview.sourceEmail}</h3>
            <p className="text-[11px] text-gray-500 mb-3">{showPreview.summary}</p>
            <p className="text-[11px] text-gray-400 mb-1 font-medium">Folder mapping</p>
            <div className="flex gap-1.5 flex-wrap mb-3">
              {showPreview.folderMapping.map((fm: any, i: number) => (
                <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                  {fm.source} → {fm.target}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mb-1 font-medium">Sample messages</p>
            <div className="space-y-2">
              {showPreview.samples.map((s: any, i: number) => (
                <div key={i} className="rounded-lg border border-gray-700/60 bg-gray-800/40 p-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[11px] text-white truncate">{s.subject}</p>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-n0va-500/10 text-n0va-300 border border-n0va-500/20">{s.folder}</span>
                  </div>
                  <p className="text-[9px] text-gray-500 mt-0.5">{s.from.email} · {s.date} · {s.sizeBytes} B</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button className="btn-secondary text-xs" onClick={() => setShowPreview(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
