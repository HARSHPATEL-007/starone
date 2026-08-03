import { useEffect, useState, useCallback } from "react";
import {
  Search, RefreshCw, Plus, X, Save, Trash2, Download, FileArchive, ShieldAlert, FolderSearch, History,
  Network, Tag, ShieldCheck, CheckCircle2, XCircle,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const emptyScope = { query: "", from: "", folder: "", label: "", dateFrom: "", dateTo: "", hasAttachments: false, attachmentType: "", unreadOnly: false };

const PRIV_TYPES = [
  { value: "attorney_client", label: "Attorney-client communication" },
  { value: "work_product", label: "Attorney work product" },
  { value: "settlement", label: "Settlement negotiation" },
  { value: "confidential", label: "Confidential business information" },
];

export default function MailDiscovery() {
  const { addToast } = useToast();
  const [summary, setSummary] = useState<any>(null);
  const [scope, setScope] = useState(emptyScope);
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [exportsList, setExports] = useState<any[]>([]);
  const [showExport, setShowExport] = useState(false);
  const [exportForm, setExportForm] = useState({ name: "", format: "csv", redactPii: false });
  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [conceptQuery, setConceptQuery] = useState("");
  const [concepts, setConcepts] = useState<any[]>([]);
  const [conceptTotal, setConceptTotal] = useState<number | null>(null);
  const [privileges, setPrivileges] = useState<any[]>([]);
  const [privSummary, setPrivSummary] = useState<any>(null);
  const [showPriv, setShowPriv] = useState(false);
  const [privForm, setPrivForm] = useState({ messageId: "", type: "attorney_client", reason: "" });
  const [chain, setChain] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(async () => {
    const [s, se, ex, pl, ps, c] = await Promise.all([
      api.adsMarketingModule.mailDiscoverySummary().catch(() => null),
      api.adsMarketingModule.mailSavedSearches().catch(() => null),
      api.adsMarketingModule.mailExports().catch(() => null),
      api.adsMarketingModule.mailDiscoveryPrivileges().catch(() => null),
      api.adsMarketingModule.mailDiscoveryPrivilegeSummary().catch(() => null),
      api.adsMarketingModule.mailDiscoveryExportAuditChain().catch(() => null),
    ]);
    setSummary(unwrap(s));
    const seR = unwrap(se);
    setSavedSearches(Array.isArray(seR) ? seR : seR?.searches || []);
    const exR = unwrap(ex);
    setExports(Array.isArray(exR) ? exR : exR?.exports || []);
    const plR = unwrap(pl);
    setPrivileges(Array.isArray(plR) ? plR : plR?.privileges || []);
    setPrivSummary(unwrap(ps));
    setChain(unwrap(c));
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    function refresh() { loadAll(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadAll]);

  async function runSearch(sc: any = scope) {
    setBusy(true);
    try {
      const clean: Record<string, any> = {};
      for (const [k, v] of Object.entries(sc)) {
        if (v === "" || v === false || v === null || v === undefined) continue;
        clean[k] = k === "hasAttachments" || k === "unreadOnly" ? String(v) : v;
      }
      const r = unwrap(await api.adsMarketingModule.mailDiscoverySearch(clean, { limit: 200 }));
      setResults(Array.isArray(r) ? r : r?.results || []);
      setSearched(true);
    } catch (e: any) {
      addToast("error", "Search failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveSearch() {
    if (!saveName.trim()) return;
    try {
      const r = unwrap(await api.adsMarketingModule.mailSaveSearch({ name: saveName.trim(), scope }));
      addToast("success", "Search saved", r?.summary || "");
      setShowSave(false);
      setSaveName("");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Save failed", e?.message);
    }
  }

  async function runSaved(id: string) {
    const r = unwrap(await api.adsMarketingModule.mailRunSavedSearch(id));
    setResults(Array.isArray(r) ? r : r?.results || []);
    setSearched(true);
  }

  async function deleteSaved(id: string) {
    await api.adsMarketingModule.mailDeleteSavedSearch(id);
    await loadAll();
  }

  async function createExport() {
    if (!exportForm.name.trim()) {
      addToast("warning", "Missing name", "Give the export a name.");
      return;
    }
    setBusy(true);
    try {
      const clean: Record<string, any> = {};
      for (const [k, v] of Object.entries(scope)) {
        if (v === "" || v === false || v === null || v === undefined) continue;
        clean[k] = k === "hasAttachments" || k === "unreadOnly" ? String(v) : v;
      }
      const r = unwrap(await api.adsMarketingModule.mailCreateExport({
        name: exportForm.name.trim(),
        format: exportForm.format,
        redactPii: exportForm.redactPii,
        scope: clean,
      }));
      addToast("success", "Export ready", r?.summary || "");
      setShowExport(false);
      setExportForm({ name: "", format: "csv", redactPii: false });
      await loadAll();
    } catch (e: any) {
      addToast("error", "Export failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function downloadExport(id: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailExport(id));
      const blob = new Blob([r.download?.content || ""], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = r.download?.filename || "export.txt";
      a.click();
      URL.revokeObjectURL(url);
      addToast("success", "Downloading", r.download?.filename || "");
    } catch (e: any) {
      addToast("error", "Download failed", e?.message);
    }
  }

  async function deleteExport(id: string) {
    await api.adsMarketingModule.mailDeleteExport(id);
    await loadAll();
  }

  async function runConceptSearch() {
    if (!conceptQuery.trim()) return;
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailDiscoveryConceptSearch(conceptQuery.trim()));
      setConcepts(Array.isArray(r) ? r : r?.clusters || []);
      setConceptTotal(r?.total || 0);
    } catch (e: any) {
      addToast("error", "Concept search failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function markPrivileged() {
    if (!privForm.messageId.trim() || !privForm.reason.trim()) {
      addToast("warning", "Missing fields", "Message ID and reason are required.");
      return;
    }
    try {
      const r = unwrap(await api.adsMarketingModule.mailDiscoveryMarkPrivileged(privForm.messageId.trim(), { type: privForm.type, reason: privForm.reason.trim() }));
      addToast("success", "Privilege asserted", r?.summary || "");
      setShowPriv(false);
      setPrivForm({ messageId: "", type: "attorney_client", reason: "" });
      await loadAll();
    } catch (e: any) {
      addToast("error", "Assert failed", e?.message);
    }
  }

  async function removePrivilege(messageId: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailDiscoveryRemovePrivilege(messageId));
      addToast("info", "Privilege removed", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Remove failed", e?.message);
    }
  }

  async function verifyChain() {
    await loadAll();
    addToast("success", "Chain verified", chain?.summary || "");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><FolderSearch className="w-6 h-6 text-n0va-400" /> eDiscovery</h1>
          <p className="text-gray-500 mt-1 text-sm">{summary?.summary || "Scope search, saved searches and exports with Bates numbering"}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn-secondary p-2" onClick={loadAll} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowExport(true)}><Download className="w-4 h-4" /> Export</button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{summary?.searchableMessages || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Searchable messages</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{summary?.byFolder?.length || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Folders indexed</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{summary?.exports || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Exports</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{summary?.savedSearches || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Saved searches</p>
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Search className="w-4 h-4 text-n0va-400" /> Scope search</h3>
              <div className="flex items-center gap-2">
                <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => setShowSave(true)}><Save className="w-3 h-3" /> Save</button>
                <button className="btn-primary text-xs" disabled={busy} onClick={() => runSearch()}>Search</button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <input className="input" placeholder="Keyword in subject/body" value={scope.query} onChange={(e) => setScope({ ...scope, query: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }} />
              <input className="input" placeholder="From (name or email)" value={scope.from} onChange={(e) => setScope({ ...scope, from: e.target.value })} />
              <select className="select" value={scope.folder} onChange={(e) => setScope({ ...scope, folder: e.target.value })}>
                <option value="">Any folder</option>
                {["inbox", "sent", "drafts", "archive", "trash", "spam"].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <input className="input" placeholder="Label (e.g. Invoices)" value={scope.label} onChange={(e) => setScope({ ...scope, label: e.target.value })} />
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">From date</label>
                <input type="date" className="input" value={scope.dateFrom} onChange={(e) => setScope({ ...scope, dateFrom: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">To date</label>
                <input type="date" className="input" value={scope.dateTo} onChange={(e) => setScope({ ...scope, dateTo: e.target.value })} />
              </div>
              <input className="input" placeholder="Attachment type (e.g. pdf)" value={scope.attachmentType} onChange={(e) => setScope({ ...scope, attachmentType: e.target.value })} />
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs text-gray-400"><input type="checkbox" className="accent-violet-500" checked={scope.hasAttachments} onChange={(e) => setScope({ ...scope, hasAttachments: e.target.checked })} /> Attachments</label>
                <label className="flex items-center gap-1.5 text-xs text-gray-400"><input type="checkbox" className="accent-violet-500" checked={scope.unreadOnly} onChange={(e) => setScope({ ...scope, unreadOnly: e.target.checked })} /> Unread</label>
              </div>
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Network className="w-4 h-4 text-n0va-400" /> Concept search</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <input className="input flex-1 min-w-[220px]" placeholder="Cluster mail by concept (e.g. litigation, budget, hiring)" value={conceptQuery} onChange={(e) => setConceptQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") runConceptSearch(); }} />
              <button className="btn-primary text-xs" disabled={busy} onClick={runConceptSearch}>Cluster</button>
            </div>
            {concepts.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {concepts.map((c: any) => (
                  <div key={c.topic} className="border border-gray-800 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white truncate">{c.label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-n0va-500/15 text-n0va-300 whitespace-nowrap">{c.count}</span>
                    </div>
                    <div className="mt-2 space-y-1">
                      {(c.messages || []).slice(0, 5).map((m: any) => (
                        <div key={m.messageId} className="text-[11px] text-gray-400 truncate" title={m.subject}>{m.subject}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {concepts.length === 0 && conceptTotal !== null && <p className="text-xs text-gray-600">No concept groups found.</p>}
          </div>

          {searched && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-white mb-2">{results.length} result(s)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500 uppercase text-[10px]">
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">From</th>
                      <th className="py-2 pr-3">Subject</th>
                      <th className="py-2 pr-3">Folder</th>
                      <th className="py-2">Attachments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {results.map((r: any, i: number) => (
                      <tr key={i}>
                        <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{new Date(r.date).toLocaleDateString()}</td>
                        <td className="py-2 pr-3 text-gray-300 max-w-[140px] truncate">{r.from?.email || r.from}</td>
                        <td className="py-2 pr-3 text-white max-w-[200px] truncate">{r.subject}</td>
                        <td className="py-2 pr-3"><span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{r.folder}</span></td>
                        <td className="py-2 text-gray-500">{r.attachments?.length || 0}</td>
                      </tr>
                    ))}
                    {results.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-gray-600">No messages matched the scope.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Tag className="w-4 h-4 text-n0va-400" /> Privilege log</h3>
                <button className="btn-secondary text-xs flex items-center gap-1 whitespace-nowrap" onClick={() => setShowPriv(true)}><Plus className="w-3 h-3" /> Assert</button>
              </div>
              <p className="text-[10px] text-gray-600">{privSummary?.total || 0} message(s) under privilege protection · {privSummary?.byType?.length || 0} type(s)</p>
              {privileges.map((p: any) => (
                <div key={p.privilegeId} className="flex items-center gap-2 border border-gray-800 rounded-lg px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-white truncate">{p.subject}</div>
                    <div className="text-[10px] text-gray-500 truncate">{p.typeLabel} · {p.reason}</div>
                  </div>
                  <span className="text-[10px] text-gray-600 whitespace-nowrap">{String(p.createdAt || "").slice(0, 10)}</span>
                  <button className="text-gray-600 hover:text-red-400 p-1" title="Remove privilege" onClick={() => removePrivilege(p.messageId)}><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
              {privileges.length === 0 && <p className="text-xs text-gray-600">No messages marked privileged.</p>}
            </div>

            <div className="card p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-n0va-400" /> Export audit chain</h3>
                <button className="btn-secondary text-xs flex items-center gap-1 whitespace-nowrap" onClick={verifyChain}><RefreshCw className="w-3 h-3" /> Verify</button>
              </div>
              <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${chain?.chainIntact ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                {chain?.chainIntact ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                {chain?.summary || "No exports yet — the chain starts with the first export."}
              </div>
              {(chain?.entries || []).length > 0 && (
                <div className="space-y-1.5">
                  {chain.entries.map((e: any) => (
                    <div key={e.exportId} className="flex items-center gap-2 bg-gray-900/60 rounded-lg px-3 py-2 text-xs">
                      <span className="text-gray-300 truncate flex-1">{e.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${e.verified ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>{e.verified ? "VERIFIED" : "TAMPERED"}</span>
                      <span className="text-[9px] text-gray-600 font-mono hidden sm:inline">{String(e.chainHash || "").slice(0, 10)}…</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-4 space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><History className="w-4 h-4 text-n0va-400" /> Saved searches</h3>
              {savedSearches.map((s: any) => (
                <div key={s.searchId} className="flex items-center gap-2 border border-gray-800 rounded-lg px-3 py-2">
                  <button className="text-sm text-n0va-300 truncate text-left flex-1" onClick={() => runSaved(s.searchId)}>{s.name}</button>
                  <span className="text-[10px] text-gray-600">{Object.keys(s.scope || {}).filter(k => s.scope[k]).join(", ") || "all"}</span>
                  <button className="text-gray-600 hover:text-red-400 p-1" onClick={() => deleteSaved(s.searchId)}><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
              {savedSearches.length === 0 && <p className="text-xs text-gray-600">Save a scope above to reuse it later.</p>}
            </div>

            <div className="card p-4 space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><FileArchive className="w-4 h-4 text-n0va-400" /> Exports</h3>
              {exportsList.map((e: any) => (
                <div key={e.exportId} className="flex items-center gap-2 border border-gray-800 rounded-lg px-3 py-2 text-sm">
                  <span className="text-white truncate flex-1">{e.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold bg-gray-500/10 text-gray-400">{e.format}</span>
                  {e.redactPii && <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />}
                  <span className="text-[10px] text-gray-600">{e.batesRange?.from}–{e.batesRange?.to}</span>
                  <button className="text-n0va-300 hover:text-n0va-200 p-1" onClick={() => downloadExport(e.exportId)}><Download className="w-3.5 h-3.5" /></button>
                  <button className="text-gray-600 hover:text-red-400 p-1" onClick={() => deleteExport(e.exportId)}><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
              {exportsList.length === 0 && <p className="text-xs text-gray-600">No exports yet — build one from a scope.</p>}
            </div>
          </div>
        </>
      )}

      {showSave && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white">Save search</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setShowSave(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <input className="input" placeholder="e.g. Q3 invoice correspondence" value={saveName} onChange={(e) => setSaveName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveSearch(); }} />
              <div className="flex justify-end">
                <button className="btn-primary text-sm" onClick={saveSearch}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showExport && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white flex items-center gap-2"><Download className="w-4 h-4 text-n0va-400" /> Export scope results</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setShowExport(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Export name</label>
                <input className="input" placeholder="Q3 audit package" value={exportForm.name} onChange={(e) => setExportForm({ ...exportForm, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Format</label>
                <select className="select" value={exportForm.format} onChange={(e) => setExportForm({ ...exportForm, format: e.target.value })}>
                  {["csv", "eml", "mbox", "pdf"].map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-400">
                <input type="checkbox" className="accent-violet-500" checked={exportForm.redactPii} onChange={(e) => setExportForm({ ...exportForm, redactPii: e.target.checked })} />
                Redact PII (emails, phones, SSNs) in the export
              </label>
              <p className="text-[10px] text-gray-600">Items get Bates numbers (BATES-0001…) for legal review. Uses the current search scope.</p>
              <div className="flex justify-end gap-2">
                <button className="btn-secondary text-sm" onClick={() => setShowExport(false)}>Cancel</button>
                <button className="btn-primary text-sm flex items-center gap-2" disabled={busy} onClick={createExport}><Download className="w-4 h-4" /> Create export</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showPriv && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white flex items-center gap-2"><Tag className="w-4 h-4 text-n0va-400" /> Assert privilege</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setShowPriv(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Message ID</label>
                <input className="input" placeholder="msg_xxx or the RFC message-id" value={privForm.messageId} onChange={(e) => setPrivForm({ ...privForm, messageId: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Privilege type</label>
                <select className="select" value={privForm.type} onChange={(e) => setPrivForm({ ...privForm, type: e.target.value })}>
                  {PRIV_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Reason</label>
                <textarea className="input" rows={2} placeholder="e.g. Legal counsel review — contains advice about Q3 contract dispute" value={privForm.reason} onChange={(e) => setPrivForm({ ...privForm, reason: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2">
                <button className="btn-secondary text-sm" onClick={() => setShowPriv(false)}>Cancel</button>
                <button className="btn-primary text-sm" onClick={markPrivileged}>Assert privilege</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
