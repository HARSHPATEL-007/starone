import { useEffect, useState, useCallback } from "react";
import {
  Bell, RefreshCw, Plus, Trash2, Power, Zap, Mail, Clock, CheckCircle2, Inbox,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

function me(): string {
  try {
    const u = localStorage.getItem("n0va_user");
    if (u) return JSON.parse(u).userId || "user_001";
  } catch {}
  return "user_001";
}

export default function ChatNotifications() {
  const { addToast } = useToast();
  const [rules, setRules] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [inbox, setInbox] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [condition, setCondition] = useState("");
  const [action, setAction] = useState("notify");
  const [channels, setChannels] = useState("web");

  const load = useCallback(async () => {
    const [r, s, i] = await Promise.all([
      api.adsMarketingModule.chat.notifications().catch(() => null),
      api.adsMarketingModule.chat.notificationSettings().catch(() => null),
      api.adsMarketingModule.chat.priorityInbox({}).catch(() => null),
    ]);
    const d = unwrap(r);
    setRules(d?.rules || []);
    setTemplates(d?.templates || []);
    setSettings(unwrap(s)?.settings || unwrap(s));
    setInbox(unwrap(i));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(kind: string, fn: () => Promise<any>) {
    setBusy(kind);
    const r = unwrap(await fn().catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setBusy(null);
    load();
  }

  async function createRule() {
    if (!name.trim() || !condition.trim()) return;
    await act("create", () => api.adsMarketingModule.chat.createNotificationRule({ name: name.trim(), condition, action, channels: channels.split(",").map((c) => c.trim()) }));
    setName("");
    setCondition("");
    setShowCreate(false);
  }

  async function runDigest() {
    await act("digest", () => api.adsMarketingModule.chat.digest({ userId: me() }));
  }

  const priorityColor = (p: number) => (p >= 80 ? "bg-red-500" : p >= 50 ? "bg-amber-500" : p >= 20 ? "bg-sky-500" : "bg-gray-600");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Bell className="w-6 h-6 text-n0va-400" /> Chat Notifications</h1>
          <p className="text-gray-500 mt-1 text-sm">Priority rules, digests and a neural priority inbox</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary text-sm" onClick={runDigest} disabled={busy === "digest"}><Mail className="w-4 h-4 inline mr-1" />Send digest</button>
          <button className="btn-secondary p-2" onClick={load} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary text-sm" onClick={() => setShowCreate((v) => !v)}><Plus className="w-4 h-4 inline mr-1" />New rule</button>
        </div>
      </div>

      {settings && (
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-2 flex items-center gap-1.5"><Zap className="w-4 h-4 text-n0va-400" /> My notification settings</h2>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-gray-400">Mute all: <span className={`font-semibold ${settings.mute ? "text-red-400" : "text-emerald-400"}`}>{settings.mute ? "yes" : "no"}</span></span>
            <span className="text-gray-400">Digest: <span className="font-semibold text-gray-200">{settings.digest_frequency || "immediate"}</span></span>
            <button className="btn-secondary text-xs" onClick={() => act("settings", () => api.adsMarketingModule.chat.updateNotificationSettings({ mute: !settings.mute }))}>
              {settings.mute ? "Unmute" : "Mute all"}
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="card">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <input className="input" placeholder="Rule name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="input font-mono text-xs" placeholder="condition e.g. message.priority > 'high'" value={condition} onChange={(e) => setCondition(e.target.value)} />
            <select className="input" value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="notify">Notify</option>
              <option value="batch_digest">Batch digest</option>
              <option value="ai_summary_digest">AI summary digest</option>
              <option value="escalate">Escalate</option>
            </select>
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="web,sms" value={channels} onChange={(e) => setChannels(e.target.value)} />
              <button className="btn-primary shrink-0" disabled={!name.trim() || !condition.trim()} onClick={createRule}>Add</button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {templates.map((t: any) => (
              <button key={t.name} className="text-[10px] px-2 py-1 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-n0va-500/50 text-gray-300" onClick={() => { setName(t.name); setCondition(t.condition); setAction(t.action); }}>
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Bell className="w-4 h-4 text-n0va-400" /> Rules <span className="text-[11px] text-gray-500">· {rules.length}</span></h2>
          <div className="space-y-2">
            {rules.length === 0 && <p className="text-xs text-gray-500">No rules yet — create one or use a template.</p>}
            {rules.map((r: any) => (
              <div key={r.ruleId} className="p-3 rounded-xl bg-gray-800/40">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white flex-1 truncate">{r.name}</p>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase ${r.enabled ? "bg-emerald-900/60 text-emerald-300" : "bg-gray-700/60 text-gray-400"}`}>{r.enabled ? "on" : "off"}</span>
                  <button className="btn-secondary p-1" onClick={() => act(`toggle-${r.ruleId}`, () => api.adsMarketingModule.chat.toggleNotificationRule(r.ruleId, !r.enabled))}><Power className="w-3 h-3" /></button>
                  <button className="btn-secondary p-1 text-red-400" onClick={() => act(`del-${r.ruleId}`, () => api.adsMarketingModule.chat.deleteNotificationRule(r.ruleId))}><Trash2 className="w-3 h-3" /></button>
                </div>
                <p className="text-[11px] font-mono text-gray-500 mt-1.5">{r.condition}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-n0va-900/60 text-n0va-300 border border-n0va-700/40">{r.action}</span>
                  <span className="text-[10px] text-gray-500"><Clock className="w-2.5 h-2.5 inline -mt-0.5" /> {r.delay}</span>
                  <span className="text-[10px] text-gray-500">{(r.channels || []).join(", ")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Inbox className="w-4 h-4 text-n0va-400" /> Priority inbox <span className="text-[11px] text-gray-500">· {inbox?.total ?? 0} messages</span></h2>
          <div className="space-y-2 max-h-[55vh] overflow-y-auto">
            {(inbox?.messages || []).length === 0 && <p className="text-xs text-gray-500">No prioritized messages. Send more chat activity to populate.</p>}
            {(inbox?.messages || []).map((m: any) => (
              <div key={m.messageId} className="p-3 rounded-xl bg-gray-800/40">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${priorityColor(m.priority)}`} />
                  <span className="text-xs font-semibold text-gray-200 truncate flex-1">{m.sender?.display_name} <span className="text-gray-600">· {m.room_name}</span></span>
                  <span className="text-[10px] text-gray-500 shrink-0">score {m.priority}</span>
                </div>
                <p className="text-sm text-gray-300 mt-1 whitespace-pre-wrap break-words line-clamp-2">{m.content?.body}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-500 mt-3">Priority = mentions +50, DMs +40, threads +30, keywords +20, urgency ×60, focus mode −30. ≥80 critical · ≥50 high · ≥20 normal.</p>
        </div>
      </div>
    </div>
  );
}
