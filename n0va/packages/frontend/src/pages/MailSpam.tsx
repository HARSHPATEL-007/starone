import { useEffect, useState, useCallback } from "react";
import { ShieldAlert, RefreshCw, ScanSearch, ShieldCheck, Ban, UserCheck, RotateCcw, Trash2, Plus } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

export default function MailSpam() {
  const { addToast } = useToast();
  const [status, setStatus] = useState<any>(null);
  const [quarantine, setQuarantine] = useState<any[]>([]);
  const [blocked, setBlocked] = useState<any[]>([]);
  const [allowed, setAllowed] = useState<any[]>([]);
  const [log, setLog] = useState<any[]>([]);
  const [newBlocked, setNewBlocked] = useState("");
  const [newAllowed, setNewAllowed] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(async () => {
    const [s, q, b, a, l] = await Promise.all([
      api.adsMarketingModule.mailSpamStatus().catch(() => null),
      api.adsMarketingModule.mailQuarantine().catch(() => null),
      api.adsMarketingModule.mailBlockedSenders().catch(() => null),
      api.adsMarketingModule.mailAllowedSenders().catch(() => null),
      api.adsMarketingModule.mailSpamLog(10).catch(() => null),
    ]);
    setStatus(unwrap(s));
    const ql = unwrap(q);
    setQuarantine(Array.isArray(ql) ? ql : ql?.data || []);
    const bl = unwrap(b);
    setBlocked(Array.isArray(bl) ? bl : bl?.data || []);
    const al = unwrap(a);
    setAllowed(Array.isArray(al) ? al : al?.data || []);
    setLog(unwrap(l)?.log || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    function refresh() { loadAll(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadAll]);

  async function scanAll() {
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailScanAllSpam());
      addToast("success", "Scan complete", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Scan failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function reportNotSpam(id: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailReportNotSpam(id));
      addToast("success", "Restored", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Failed", e?.message);
    }
  }

  async function moveToSpam(id: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailReportSpam(id));
      addToast("success", "Reported", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Failed", e?.message);
    }
  }

  async function scanOne(id: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailScanMessage(id));
      addToast("info", "Scan result", `${r.subject}: ${r.score}/100 — ${r.verdict}`);
      await loadAll();
    } catch (e: any) {
      addToast("error", "Scan failed", e?.message);
    }
  }

  async function addBlocked() {
    if (!newBlocked.trim()) return;
    try {
      const r = unwrap(await api.adsMarketingModule.mailBlockSender({ email: newBlocked.trim() }));
      addToast("success", "Blocked", r?.summary || "");
      setNewBlocked("");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Failed", e?.message);
    }
  }

  async function unblock(email: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailUnblockSender(email));
      addToast("success", "Unblocked", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Failed", e?.message);
    }
  }

  async function addAllowed() {
    if (!newAllowed.trim()) return;
    try {
      const r = unwrap(await api.adsMarketingModule.mailAllowSender({ email: newAllowed.trim() }));
      addToast("success", "Allowed", r?.summary || "");
      setNewAllowed("");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Failed", e?.message);
    }
  }

  async function removeAllowed(email: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailRemoveAllowedSender(email));
      addToast("success", "Removed", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Failed", e?.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><ShieldAlert className="w-6 h-6 text-n0va-400" /> Spam & quarantine</h1>
          <p className="text-gray-500 mt-1 text-sm">{status?.summary || "Detect, review and manage unwanted mail"}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn-secondary p-2" onClick={loadAll} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary flex items-center gap-2" disabled={busy} onClick={scanAll}>
            <ScanSearch className="w-4 h-4" /> Scan inbox
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{status?.quarantineCount || 0}</p>
              <p className="text-xs text-gray-500 mt-1">In quarantine</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{status?.blockedCount || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Blocked senders</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{status?.allowedCount || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Allowed senders</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-green-400">{status?.protectionScore || 0}%</p>
              <p className="text-xs text-gray-500 mt-1">Protection score</p>
            </div>
          </div>

          <div className="card p-4 space-y-2">
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-n0va-400" /> Quarantine</h3>
            <ul className="divide-y divide-gray-800/50">
              {quarantine.map((m: any) => (
                <li key={m.messageId} className="flex items-center gap-3 py-2 flex-wrap">
                  <span className="flex-1 min-w-0">
                    <span className="text-sm text-gray-300 truncate block">{m.subject}</span>
                    <span className="text-[10px] text-gray-500">{m.from?.email} · {m.reasons?.length ? m.reasons.slice(0, 2).join(", ") : "low reputation"}</span>
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold shrink-0 ${m.isSpam ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"}`}>
                    {m.score}/100
                  </span>
                  {m.blocked && <span className="text-[10px] px-2 py-0.5 rounded uppercase font-bold bg-gray-500/10 text-gray-400 shrink-0">Blocked</span>}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button className="btn-secondary text-[10px] px-2 py-1 flex items-center gap-1" onClick={() => scanOne(m.messageId)}><ScanSearch className="w-3 h-3" /> Scan</button>
                    <button className="btn-secondary text-[10px] px-2 py-1 flex items-center gap-1 text-green-400" onClick={() => reportNotSpam(m.messageId)}><RotateCcw className="w-3 h-3" /> Not spam</button>
                    <button className="btn-secondary text-[10px] px-2 py-1 flex items-center gap-1 text-red-400" onClick={() => moveToSpam(m.messageId)}><Ban className="w-3 h-3" /> Report</button>
                  </div>
                </li>
              ))}
              {quarantine.length === 0 && <li className="py-4 text-center text-xs text-gray-500">Quarantine is empty — run a scan to check the inbox</li>}
            </ul>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4 space-y-2">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><Ban className="w-4 h-4 text-red-400" /> Blocked senders</h3>
              <div className="flex gap-2">
                <input className="input flex-1 text-sm" placeholder="block@example.com" value={newBlocked} onChange={(e) => setNewBlocked(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addBlocked()} />
                <button className="btn-secondary text-sm flex items-center gap-1" onClick={addBlocked}><Plus className="w-3.5 h-3.5" /> Block</button>
              </div>
              <ul className="divide-y divide-gray-800/50">
                {blocked.map((b: any) => (
                  <li key={b.email} className="flex items-center gap-2 py-2 text-sm">
                    <span className="truncate text-gray-300">{b.email}</span>
                    <span className="text-[10px] text-gray-600 shrink-0">{b.reason || "manual"}</span>
                    <button className="text-gray-500 hover:text-red-400 ml-auto shrink-0" onClick={() => unblock(b.email)} title="Unblock"><Trash2 className="w-3.5 h-3.5" /></button>
                  </li>
                ))}
                {blocked.length === 0 && <li className="text-xs text-gray-500 py-1">No blocked senders</li>}
              </ul>
            </div>

            <div className="card p-4 space-y-2">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><UserCheck className="w-4 h-4 text-green-400" /> Allowed senders</h3>
              <div className="flex gap-2">
                <input className="input flex-1 text-sm" placeholder="trusted@example.com" value={newAllowed} onChange={(e) => setNewAllowed(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addAllowed()} />
                <button className="btn-secondary text-sm flex items-center gap-1" onClick={addAllowed}><Plus className="w-3.5 h-3.5" /> Allow</button>
              </div>
              <ul className="divide-y divide-gray-800/50">
                {allowed.map((a: any) => (
                  <li key={a.email} className="flex items-center gap-2 py-2 text-sm">
                    <span className="truncate text-gray-300">{a.email}</span>
                    <button className="text-gray-500 hover:text-red-400 ml-auto shrink-0" onClick={() => removeAllowed(a.email)} title="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
                  </li>
                ))}
                {allowed.length === 0 && <li className="text-xs text-gray-500 py-1">No allowed senders</li>}
              </ul>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold text-white mb-2">Recent spam activity</h3>
            <ul className="space-y-2">
              {log.map((l: any, i: number) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                  <span className="capitalize text-gray-300 shrink-0">{l.action?.replace(/_/g, " ")}</span>
                  <span className="truncate text-gray-500">{l.detail}</span>
                  <span className="text-[10px] text-gray-600 shrink-0 ml-auto">{new Date(l.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </li>
              ))}
              {log.length === 0 && <li className="text-xs text-gray-500">No spam activity yet</li>}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
