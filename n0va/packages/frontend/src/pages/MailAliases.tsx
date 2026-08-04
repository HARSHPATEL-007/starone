import { useEffect, useState, useCallback } from "react";
import {
  AtSign, RefreshCw, Plus, Power, Trash2, X, Mail, ArrowRightLeft, FileText, ShieldCheck, CornerDownRight,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

export default function MailAliases() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [aliases, setAliases] = useState<any[]>([]);
  const [mailboxes, setMailboxes] = useState<any[]>([]);
  const [forwarding, setForwarding] = useState<any[]>([]);
  const [log, setLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ address: "", mailboxId: "", label: "" });
  const [fwdBox, setFwdBox] = useState<any>(null);
  const [fwdForm, setFwdForm] = useState({ target: "", mode: "keep" });
  const [resolveAddr, setResolveAddr] = useState("");
  const [resolveRes, setResolveRes] = useState<any>(null);

  const loadAll = useCallback(async () => {
    const d = unwrap(await api.adsMarketingModule.mailAliasDashboard().catch(() => null));
    setDash(d);
    const l = unwrap(await api.adsMarketingModule.mailAliases({}).catch(() => null));
    setAliases(Array.isArray(l) ? l : l?.aliases || []);
    const boxes = unwrap(await api.adsMarketingModule.mailMailboxes().catch(() => null));
    setMailboxes(Array.isArray(boxes) ? boxes : boxes?.data || []);
    const f = unwrap(await api.adsMarketingModule.mailListForwarding().catch(() => null));
    setForwarding(Array.isArray(f) ? f : f?.forwarding || []);
    const lg = unwrap(await api.adsMarketingModule.mailAliasLog(20).catch(() => null));
    setLog(lg?.log || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    function refresh() { loadAll(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadAll]);

  async function createAlias() {
    if (!form.address.trim() || !form.mailboxId) {
      addToast("warning", "Missing fields", "Address and mailbox are required.");
      return;
    }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailCreateAlias({
        address: form.address.trim(),
        mailboxId: form.mailboxId,
        label: form.label.trim(),
      }));
      addToast("success", "Alias created", r?.summary || "");
      setShowCreate(false);
      setForm({ address: "", mailboxId: "", label: "" });
      await loadAll();
    } catch (e: any) {
      addToast("error", "Create failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleAlias(a: any) {
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailToggleAlias(a.aliasId));
      addToast("success", "Alias updated", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Update failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteAlias(a: any) {
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailDeleteAlias(a.aliasId));
      addToast("success", "Alias deleted", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Delete failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function openForwarding(b: any) {
    const cur = unwrap(await api.adsMarketingModule.mailForwarding(b.mailboxId || b._id).catch(() => null));
    setFwdBox(b);
    setFwdForm({ target: cur?.target || "", mode: cur?.mode || "keep" });
  }

  async function saveForwarding() {
    if (!fwdForm.target.trim()) {
      addToast("warning", "Missing target", "A forwarding target email is required.");
      return;
    }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailEnableForwarding(fwdBox.mailboxId || fwdBox._id, {
        target: fwdForm.target.trim(),
        mode: fwdForm.mode,
      }));
      addToast("success", "Forwarding set", r?.summary || "");
      setFwdBox(null);
      await loadAll();
    } catch (e: any) {
      addToast("error", "Forwarding failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function disableForwarding(f: any) {
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailDisableForwarding(f.mailboxId));
      addToast("success", "Forwarding off", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Disable failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function resolveAddress() {
    if (!resolveAddr.trim()) return;
    const r = unwrap(await api.adsMarketingModule.mailResolveAlias(resolveAddr.trim()).catch(() => null));
    setResolveRes(r);
  }

  const deliv = dash?.deliverability || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><AtSign className="w-6 h-6 text-n0va-400" /> Mail Aliases</h1>
          <p className="text-gray-500 mt-1 text-sm">{dash?.summary || "Alias addresses and forwarding rules"}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn-secondary p-2" onClick={loadAll} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New alias</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{dash?.total || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Total aliases</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-emerald-400">{dash?.active || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Active</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-amber-400">{dash?.paused || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Paused</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-n0va-400">{dash?.forwardingEnabled || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Forwarding active</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
            <div className="space-y-4 min-w-0">
              <div className="card !p-0">
                <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2"><AtSign className="w-4 h-4 text-n0va-400" /> Alias addresses</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-n0va-600/20 text-n0va-400">
                    {dash?.deliverability?.score !== undefined ? `Deliverability ${deliv.score}/100 · ${deliv.level}` : ""}
                  </span>
                </div>
                <ul className="divide-y divide-gray-800/50">
                  {aliases.map((a: any) => (
                    <li key={a.aliasId} className="px-4 py-3 flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${a.status === "active" ? "bg-emerald-400" : "bg-gray-600"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{a.address}</p>
                        <p className="text-xs text-gray-500 truncate flex items-center gap-1 flex-wrap">
                          <CornerDownRight className="w-3 h-3 shrink-0" />{a.mailboxName}
                          {a.label ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700/60 text-gray-300">{a.label}</span> : null}
                        </p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase shrink-0 ${a.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                        {a.status}
                      </span>
                      <button
                        className="p-1.5 rounded-lg text-gray-500 hover:text-amber-400 shrink-0"
                        title={a.status === "active" ? "Pause" : "Resume"}
                        disabled={busy}
                        onClick={() => toggleAlias(a)}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 shrink-0" title="Delete" disabled={busy} onClick={() => deleteAlias(a)}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                  {aliases.length === 0 && (
                    <li className="px-4 py-10 text-center text-sm text-gray-500">No aliases yet — create one to receive mail at a custom address.</li>
                  )}
                </ul>
              </div>

              <div className="card p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><ArrowRightLeft className="w-4 h-4 text-n0va-400" /> Forwarding</h3>
                <div className="flex flex-col gap-2">
                  {mailboxes.map((b: any) => {
                    const f = forwarding.find((x: any) => x.mailboxId === (b.mailboxId || b._id));
                    return (
                      <div key={b.mailboxId || b._id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/40">
                        <Mail className="w-4 h-4 text-gray-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{b.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {f?.enabled ? <span className="text-emerald-400">→ {f.target} ({f.mode})</span> : "No forwarding"}
                          </p>
                        </div>
                        {f?.enabled ? (
                          <button className="btn-danger text-[11px] px-2 py-1 shrink-0" disabled={busy} onClick={() => disableForwarding(f)}>Off</button>
                        ) : (
                          <button className="btn-secondary text-[11px] px-2 py-1 shrink-0" disabled={busy} onClick={() => openForwarding(b)}>Set up</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-n0va-400" /> Resolve tool</h3>
                <div className="flex gap-2 flex-wrap">
                  <input
                    className="input flex-1 min-w-[160px]"
                    placeholder="address@domain.com"
                    value={resolveAddr}
                    onChange={(e) => setResolveAddr(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") resolveAddress(); }}
                  />
                  <button className="btn-secondary text-sm" onClick={resolveAddress}>Resolve</button>
                </div>
                {resolveRes && (
                  <div className={`text-xs p-3 rounded-lg ${resolveRes.resolved ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                    <p className="font-medium">{resolveRes.resolved ? "Resolved" : "Not an active alias"}</p>
                    <p className="text-gray-400 mt-0.5">{resolveRes.summary}{resolveRes.primaryAddress ? ` · delivers to ${resolveRes.primaryAddress}` : ""}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-n0va-400" /> Recent activity</h3>
                <ul className="space-y-2.5">
                  {log.map((l: any, i: number) => (
                    <li key={i} className="text-xs">
                      <p className="text-gray-300">{l.detail}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">
                        {new Date(l.at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · {l.category}
                      </p>
                    </li>
                  ))}
                  {log.length === 0 && <li className="text-xs text-gray-500">No activity yet</li>}
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white flex items-center gap-2"><AtSign className="w-4 h-4 text-n0va-400" /> New alias</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Alias address</label>
                <input className="input" placeholder="sales@yourdomain.com" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Deliver to mailbox</label>
                <select className="input" value={form.mailboxId} onChange={(e) => setForm({ ...form, mailboxId: e.target.value })}>
                  <option value="">Choose a mailbox…</option>
                  {mailboxes.map((b: any) => (
                    <option key={b.mailboxId || b._id} value={b.mailboxId || b._id}>{b.name} · {b.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Label (optional)</label>
                <input className="input" placeholder="Catch-all, billing…" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
              </div>
              <div className="flex justify-end pt-1">
                <button className="btn-primary text-sm" disabled={busy} onClick={createAlias}>Create alias</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {fwdBox && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white flex items-center gap-2"><ArrowRightLeft className="w-4 h-4 text-n0va-400" /> Forward {fwdBox.name}</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setFwdBox(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Forward to</label>
                <input className="input" placeholder="backup@company.com" value={fwdForm.target} onChange={(e) => setFwdForm({ ...fwdForm, target: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Mode</label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    className={`text-xs px-3 py-1.5 rounded-lg border ${fwdForm.mode === "keep" ? "bg-n0va-600/20 text-n0va-400 border-n0va-600/30" : "border-gray-700 text-gray-400"}`}
                    onClick={() => setFwdForm({ ...fwdForm, mode: "keep" })}
                  >Keep a copy</button>
                  <button
                    className={`text-xs px-3 py-1.5 rounded-lg border ${fwdForm.mode === "move" ? "bg-n0va-600/20 text-n0va-400 border-n0va-600/30" : "border-gray-700 text-gray-400"}`}
                    onClick={() => setFwdForm({ ...fwdForm, mode: "move" })}
                  >Move (no copy)</button>
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button className="btn-primary text-sm" disabled={busy} onClick={saveForwarding}>Save forwarding</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}