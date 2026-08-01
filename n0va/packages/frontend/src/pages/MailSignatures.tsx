import { useEffect, useState, useCallback } from "react";
import { Signature, RefreshCw, Star, Power, Eye } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

export default function MailSignatures() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [text, setText] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [makeDefault, setMakeDefault] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(async () => {
    const r = await api.adsMarketingModule.mailSignaturesDashboard().catch(() => null);
    setDash(unwrap(r));
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    function refresh() { loadAll(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadAll]);

  async function save() {
    if (!editing) return;
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailUpdateSignature(editing.mailboxId, { text, enabled, isDefault: makeDefault }));
      addToast("success", "Signature saved", r?.summary || "");
      setEditing(null);
      setPreview(null);
      await loadAll();
    } catch (e: any) {
      addToast("error", "Save failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(sig: any) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailToggleSignature(sig.mailboxId, !sig.enabled));
      addToast("success", "Toggled", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Failed", e?.message);
    }
  }

  async function showPreview(sig: any) {
    const r = unwrap(await api.adsMarketingModule.mailSignaturePreview(sig.mailboxId, "Hi there, checking in on the Q3 plan.").catch(() => null));
    setPreview(r || { body: "Hi there, checking in on the Q3 plan.\n\n-- \n" + sig.text });
  }

  const signatures = dash?.signatures || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Signature className="w-6 h-6 text-n0va-400" /> Signatures</h1>
          <p className="text-gray-500 mt-1 text-sm">{dash?.summary || "Per-mailbox email signatures"}</p>
        </div>
        <button className="btn-secondary p-2" onClick={loadAll} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{dash?.totals?.configured || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Configured</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{dash?.totals?.enabled || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Enabled</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{dash?.totals?.defaults || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Defaults</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {signatures.map((sig: any) => (
              <div key={sig.mailboxId} className="card p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white truncate flex items-center gap-2">
                      {sig.mailboxName}
                      {sig.isDefault && <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </h3>
                    <p className="text-[10px] text-gray-500 truncate">{sig.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button className={`p-1.5 rounded ${sig.enabled ? "text-green-400 bg-green-500/10" : "text-gray-500 bg-gray-500/10"}`} onClick={() => toggle(sig)} title={sig.enabled ? "Disable" : "Enable"}>
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => { setEditing(sig); setText(sig.text || ""); setEnabled(sig.enabled); setMakeDefault(sig.isDefault); }}>
                      <Signature className="w-3 h-3" /> Edit
                    </button>
                    <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => showPreview(sig)}>
                      <Eye className="w-3 h-3" /> Preview
                    </button>
                  </div>
                </div>
                {sig.text ? (
                  <p className="text-xs text-gray-400 whitespace-pre-wrap bg-gray-800/40 rounded-lg p-3">{sig.text}</p>
                ) : (
                  <p className="text-xs text-gray-600 italic">No signature set</p>
                )}
              </div>
            ))}
          </div>

          {preview && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Eye className="w-4 h-4 text-n0va-400" /> Compose preview</h3>
                <button className="text-gray-500 hover:text-white" onClick={() => setPreview(null)}>Close</button>
              </div>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{preview.body}</p>
              <p className="text-[10px] text-gray-600 mt-2">{preview.withSignature ? "Signature attached" : "No signature attached"}</p>
            </div>
          )}
        </>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white">Signature — {editing.mailboxName}</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setEditing(null)}>Close</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Signature text</label>
                <textarea className="input min-h-[120px]" placeholder={"Jane Doe\nN0VA Marketing\njane@n0va.mail"} value={text} onChange={(e) => setText(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" className="accent-n0va-500" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                Enabled
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" className="accent-n0va-500" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} />
                Set as default signature
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button className="btn-secondary text-sm" onClick={() => setEditing(null)}>Cancel</button>
                <button className="btn-primary text-sm" disabled={busy} onClick={save}>Save signature</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
