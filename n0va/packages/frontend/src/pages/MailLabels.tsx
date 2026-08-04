import { useEffect, useState, useCallback } from "react";
import {
  Tag, RefreshCw, Plus, Trash2, X, Pencil, Palette, Bookmark, MessageSquareText, Radio, Layers,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";
import { useMailRealtime, MAIL_REALTIME_EVENTS } from "../hooks/useSocket";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const EVENT_LABELS: Record<string, string> = {
  "mail.received": "Received",
  "mail.sent": "Sent",
  "mail.read": "Read",
  "mail.thread_update": "Thread",
  "mail.label_change": "Label",
  "mail.folder_change": "Folder",
  "mail.spam_detected": "Spam",
  "mail.ai_suggestion": "AI",
};

const EVENT_COLORS: Record<string, string> = {
  "mail.received": "bg-blue-100 text-blue-700",
  "mail.sent": "bg-emerald-100 text-emerald-700",
  "mail.read": "bg-slate-100 text-slate-600",
  "mail.thread_update": "bg-violet-100 text-violet-700",
  "mail.label_change": "bg-amber-100 text-amber-700",
  "mail.folder_change": "bg-cyan-100 text-cyan-700",
  "mail.spam_detected": "bg-rose-100 text-rose-700",
  "mail.ai_suggestion": "bg-fuchsia-100 text-fuchsia-700",
};

export default function MailLabels() {
  const { addToast } = useToast();
  const { connected: rtConnected, events: rtEvents } = useMailRealtime(
    (() => { try { return JSON.parse(localStorage.getItem("n0va_user") || "{}").tenantId || "tenant_001"; } catch { return "tenant_001"; } })()
  );

  const [dash, setDash] = useState<any>(null);
  const [labels, setLabels] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [log, setLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", color: "#4A90D9", autoApplyRules: "" });

  const [applyTarget, setApplyTarget] = useState<any>(null);
  const [applyMsg, setApplyMsg] = useState("");

  const loadAll = useCallback(async () => {
    const d = unwrap(await api.adsMarketingModule.mailLabelDashboard().catch(() => null));
    setDash(d);
    const l = unwrap(await api.adsMarketingModule.mailLabels().catch(() => null));
    setLabels(Array.isArray(l) ? l : l?.labels || []);
    const m = unwrap(await api.adsMarketingModule.mailMessages({ folder: "inbox", limit: 60 }).catch(() => null));
    setMessages(Array.isArray(m) ? m : m?.messages || []);
    const lg = unwrap(await api.adsMarketingModule.mailLabelLog(20).catch(() => null));
    setLog(lg?.log || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    function refresh() { loadAll(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadAll]);

  async function saveLabel() {
    if (!form.name.trim()) {
      addToast("warning", "Missing name", "A label name is required.");
      return;
    }
    const rules = form.autoApplyRules.split(",").map((s) => s.trim()).filter(Boolean);
    setBusy(true);
    try {
      const payload = { name: form.name.trim(), color: form.color, autoApplyRules: rules };
      if (editing) {
        const r = unwrap(await api.adsMarketingModule.mailUpdateLabel(editing.labelId, payload));
        addToast("success", "Label updated", r?.summary || "Label updated");
      } else {
        const r = unwrap(await api.adsMarketingModule.mailCreateLabel(payload));
        addToast("success", "Label created", r?.summary || "");
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: "", color: "#4A90D9", autoApplyRules: "" });
      await loadAll();
    } catch (e: any) {
      addToast("error", "Save failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  function openEdit(l: any) {
    setEditing(l);
    setForm({ name: l.name, color: l.color || "#4A90D9", autoApplyRules: (l.autoApplyRules || []).join(", ") });
    setShowForm(true);
  }

  async function deleteLabel(l: any) {
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailDeleteLabel(l.labelId));
      addToast("success", "Label deleted", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Delete failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function doApply() {
    if (!applyTarget || !applyMsg) {
      addToast("warning", "Missing selection", "Pick a label and a message.");
      return;
    }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailLabelApply(applyTarget.labelId, applyMsg));
      addToast("success", "Label applied", r?.summary || "");
      setApplyTarget(null);
      setApplyMsg("");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Apply failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function doRemove(l: any, messageId: string) {
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailLabelRemove(l.labelId, messageId));
      addToast("success", "Label removed", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Remove failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Tag className="h-6 w-6 text-amber-500" /> Mail Labels
          </h1>
          <p className="text-sm text-gray-500">Label catalog with colors, auto-apply rules and live realtime events</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${rtConnected ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
            <Radio className="h-3.5 w-3.5" /> {rtConnected ? "Realtime connected" : "Realtime offline"}
          </span>
          <button onClick={loadAll} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50" title="Refresh">
            <RefreshCw className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={() => { setEditing(null); setForm({ name: "", color: "#4A90D9", autoApplyRules: "" }); setShowForm(true); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 text-white px-3 py-2 text-sm font-medium hover:bg-amber-600"
          >
            <Plus className="h-4 w-4" /> New label
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Total labels</div>
          <div className="text-2xl font-bold mt-1">{dash?.total ?? 0}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Labeled messages</div>
          <div className="text-2xl font-bold mt-1">{dash?.labeledMessages ?? 0}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">With auto rules</div>
          <div className="text-2xl font-bold mt-1">{dash?.withRules ?? 0}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Unlabeled messages</div>
          <div className="text-2xl font-bold mt-1">{dash?.unlabeled ?? 0}</div>
        </div>
      </div>

      {rtEvents.length > 0 && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-violet-700 uppercase tracking-wide mb-2">
            <Layers className="h-4 w-4" /> Live mail events <span className="font-normal normal-case">(latest 5)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {rtEvents.slice(0, 5).map((e: any, i: number) => (
              <span key={i} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${EVENT_COLORS[e.event] || "bg-gray-100 text-gray-600"}`}>
                {EVENT_LABELS[e.event] || e.event}
                <span className="opacity-70 max-w-[140px] truncate">{e.payload?.subject || e.payload?.label || ""}</span>
              </span>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {MAIL_REALTIME_EVENTS.map((ev) => (
              <span key={ev} className="text-[10px] font-mono text-violet-400">{ev}</span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Bookmark className="h-4 w-4 text-amber-500" /> Label catalog
              </div>
              <span className="text-xs text-gray-400">{labels.length} label(s)</span>
            </div>
            {labels.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-400">No labels yet — create one to start tagging messages.</div>
            )}
            {labels.map((l: any) => (
              <div key={l.labelId} className="px-4 py-3 flex items-center gap-3">
                <span
                  className="h-4 w-4 rounded-full shrink-0 border border-gray-200"
                  style={{ backgroundColor: l.color || "#4A90D9" }}
                  title={l.color || "#4A90D9"}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{l.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {l.count} message(s) · {l.unread} unread
                    {(l.autoApplyRules || []).length > 0 && (
                      <span className="ml-2 text-amber-600">rules: {(l.autoApplyRules || []).join(", ")}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <select
                    value={applyTarget?.labelId === l.labelId ? applyMsg : ""}
                    onChange={(e) => { setApplyTarget(l); setApplyMsg(e.target.value); if (e.target.value) doApply(); }}
                    className="text-xs rounded-lg border border-gray-200 px-2 py-1 max-w-[150px]"
                    title="Apply to a message"
                  >
                    <option value="">Apply to…</option>
                    {messages.slice(0, 20).map((m: any) => (
                      <option key={m._id} value={m._id}>{m.subject}</option>
                    ))}
                  </select>
                  <button onClick={() => openEdit(l)} className="p-1.5 rounded-lg hover:bg-gray-100" title="Edit">
                    <Pencil className="h-4 w-4 text-gray-500" />
                  </button>
                  <button onClick={() => deleteLabel(l)} className="p-1.5 rounded-lg hover:bg-rose-50" title="Delete">
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <MessageSquareText className="h-4 w-4 text-amber-500" /> Activity log
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {log.length === 0 && <div className="text-xs text-gray-400">No label activity yet.</div>}
              {log.map((e: any, i: number) => (
                <div key={i} className="text-xs border-l-2 border-amber-200 pl-2">
                  <span className="font-medium text-gray-700">{e.type?.replace(/_/g, " ")}</span>
                  <div className="text-gray-400 truncate">{e.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Palette className="h-5 w-5 text-amber-500" /> {editing ? "Edit label" : "New label"}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Finance"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Color</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="h-9 w-12 rounded border border-gray-200 cursor-pointer"
                  />
                  <input
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Auto-apply rules (comma-separated rule ids)</label>
                <input
                  value={form.autoApplyRules}
                  onChange={(e) => setForm({ ...form, autoApplyRules: e.target.value })}
                  placeholder="r_high_priority, r_finance"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={saveLabel}
                disabled={busy}
                className="w-full rounded-lg bg-amber-500 text-white py-2.5 text-sm font-semibold hover:bg-amber-600 disabled:opacity-50"
              >
                {busy ? "Saving…" : editing ? "Save changes" : "Create label"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
