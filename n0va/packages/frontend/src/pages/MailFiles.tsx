import { useEffect, useState, useCallback } from "react";
import { Paperclip, RefreshCw, ScanSearch, ShieldAlert, ShieldCheck, Eye, FileText, Download } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

export default function MailFiles() {
  const { addToast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [detail, setDetail] = useState<any>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(async () => {
    const [s, f] = await Promise.all([
      api.adsMarketingModule.mailAttachmentStats().catch(() => null),
      api.adsMarketingModule.mailAttachments({ limit: 100 }).catch(() => null),
    ]);
    setStats(unwrap(s));
    const fl = unwrap(f);
    setFiles(Array.isArray(fl) ? fl : fl?.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    function refresh() { loadAll(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadAll]);

  async function scanFile(id: string) {
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailScanAttachment(id));
      addToast("success", "Scan complete", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Scan failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function quarantineFile(id: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailQuarantineAttachment(id));
      addToast("warning", "Quarantined", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Failed", e?.message);
    }
  }

  async function openDetail(id: string) {
    const r = unwrap(await api.adsMarketingModule.mailAttachment(id).catch(() => null));
    setDetail(r);
  }

  const types = [...new Set(files.map((f: any) => f.type))].sort();
  const filtered = files.filter(f => (!typeFilter || f.type === typeFilter) && (!statusFilter || f.scan?.status === statusFilter));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Paperclip className="w-6 h-6 text-n0va-400" /> Files & attachments</h1>
          <p className="text-gray-500 mt-1 text-sm">{stats?.summary || "Every attachment across your mail, scanned"}</p>
        </div>
        <button className="btn-secondary p-2" onClick={loadAll} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{stats?.totals?.files || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Files</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{(stats?.totals?.bytes || 0) / 1048576 > 1 ? `${Math.round((stats?.totals?.bytes || 0) / 1048576 * 10) / 10} MB` : `${Math.round((stats?.totals?.bytes || 0) / 1024)} KB`}</p>
              <p className="text-xs text-gray-500 mt-1">Total size</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{stats?.totals?.scanned || 0}/{stats?.totals?.files || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Scanned</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-amber-400">{stats?.totals?.risky || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Flagged</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select className="select text-xs w-auto" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All types</option>
              {types.map((t: string) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="select text-xs w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {["pending", "clean", "suspicious", "quarantined"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="text-xs text-gray-500">{filtered.length} file(s)</span>
          </div>

          <div className="card p-4 space-y-2">
            <ul className="divide-y divide-gray-800/50">
              {filtered.map((f: any) => (
                <li key={f.attachmentId} className="flex items-center gap-3 py-2 flex-wrap">
                  <FileText className="w-4 h-4 text-n0va-400 shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="text-sm text-gray-300 truncate block">{f.name}</span>
                    <span className="text-[10px] text-gray-500">{f.subject} · {f.from?.email} · {f.sizeLabel}</span>
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold shrink-0 ${f.scan?.status === "clean" ? "bg-green-500/15 text-green-400" : f.scan?.status === "suspicious" ? "bg-amber-500/15 text-amber-400" : f.scan?.status === "quarantined" ? "bg-red-500/15 text-red-400" : "bg-gray-500/10 text-gray-400"}`}>
                    {f.scan?.status}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button className="btn-secondary text-[10px] px-2 py-1 flex items-center gap-1" onClick={() => openDetail(f.attachmentId)}><Eye className="w-3 h-3" /> View</button>
                    <button className="btn-secondary text-[10px] px-2 py-1 flex items-center gap-1" disabled={busy} onClick={() => scanFile(f.attachmentId)}><ScanSearch className="w-3 h-3" /> Scan</button>
                    {f.scan?.status !== "quarantined" && (
                      <button className="btn-secondary text-[10px] px-2 py-1 flex items-center gap-1 text-amber-400" onClick={() => quarantineFile(f.attachmentId)}><ShieldAlert className="w-3 h-3" /> Quarantine</button>
                    )}
                  </div>
                </li>
              ))}
              {filtered.length === 0 && <li className="py-4 text-center text-xs text-gray-500">No attachments match</li>}
            </ul>
          </div>

          {stats?.byType?.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-white mb-2">By type</h3>
                <div className="flex flex-wrap gap-2">
                  {stats.byType.map((t: any) => (
                    <span key={t.type} className="text-xs px-2.5 py-1 rounded-full bg-gray-500/10 text-gray-300">{t.type} · {t.count}</span>
                  ))}
                </div>
              </div>
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-white mb-2">By folder</h3>
                <div className="flex flex-wrap gap-2">
                  {stats.byFolder.map((f: any) => (
                    <span key={f.folder} className="text-xs px-2.5 py-1 rounded-full bg-gray-500/10 text-gray-300">{f.folder} · {f.count}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-gray-900">
              <h2 className="font-semibold text-white flex items-center gap-2"><Paperclip className="w-4 h-4 text-n0va-400" /> {detail.name}</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setDetail(null)}>Close</button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <p className="text-gray-300"><span className="text-gray-500">From:</span> {detail.from?.email} <span className="text-gray-600">· {detail.folder}</span></p>
              <p className="text-gray-300 truncate"><span className="text-gray-500">Message:</span> {detail.subject}</p>
              <p className="text-gray-400"><span className="text-gray-500">Size:</span> {detail.sizeLabel} <span className="text-gray-600">· {detail.type}</span></p>
              <div className="bg-gray-800/40 rounded-lg p-3 space-y-1">
                <p className="flex items-center gap-2 text-xs">
                  <ShieldCheck className={`w-3.5 h-3.5 ${detail.scan?.status === "clean" ? "text-green-400" : "text-amber-400"}`} />
                  <span className="text-gray-300">Virus scan: {detail.scan?.virus}</span>
                </p>
                <p className="flex items-center gap-2 text-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-n0va-400" />
                  <span className="text-gray-300">DLP scan: {detail.scan?.dlp}</span>
                </p>
                <p className="text-[10px] text-gray-600">Scanned {detail.scan?.scannedAt ? new Date(detail.scan.scannedAt).toLocaleString() : "—"}</p>
              </div>
              <div className="bg-gray-800/40 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1 flex items-center gap-1"><FileText className="w-3 h-3" /> Preview</p>
                <p className="text-xs text-gray-300 whitespace-pre-wrap">{detail.preview}</p>
              </div>
              <div className="flex justify-end gap-2">
                <button className="btn-secondary text-sm flex items-center gap-2" onClick={() => addToast("info", "Download", `${detail.name} — download started (mock)`)}>
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
