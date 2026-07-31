import { useEffect, useState } from "react";
import { AtSign, CheckCheck, MessageCircle, ExternalLink, RefreshCw } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonRow } from "../components/Skeleton";
import { Link } from "react-router-dom";

export default function MentionsPage() {
  const { addToast } = useToast();
  const [mentions, setMentions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try { const r: any = await api.mentions.list(); setMentions(Array.isArray(r) ? r : r?.data || []); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function markRead(id: string) {
    try {
      await api.mentions.markRead(id);
      setMentions(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
    } catch { /* ignore */ }
  }

  async function markAllRead() {
    try {
      await api.mentions.markAllRead();
      setMentions(prev => prev.map(m => ({ ...m, read: true })));
      addToast("success", "All mentions marked read");
    } catch { addToast("error", "Failed to mark all as read"); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <AtSign className="w-6 h-6 text-n0va-400" />
            Mentions
          </h1>
          <p className="text-gray-500 mt-1">{mentions.filter(m => !m.read).length} unread · {mentions.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary text-xs flex items-center gap-1.5" onClick={markAllRead}>
            <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
          </button>
          <button className="btn-ghost text-xs p-1.5" onClick={load}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
        ) : mentions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <AtSign className="w-10 h-10 mx-auto mb-2" />
            <p>No mentions yet</p>
            <p className="text-xs mt-1">When someone @mentions you in comments or notes, it will appear here</p>
          </div>
        ) : mentions.map((m) => (
          <div key={m.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${m.read ? "border-gray-800 bg-gray-900/50" : "border-gray-700 bg-gray-800/80"}`}>
            <div className="w-8 h-8 rounded-lg bg-n0va-600/20 flex items-center justify-center shrink-0">
              <AtSign className="w-4 h-4 text-n0va-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white">
                You were mentioned in a <span className="text-n0va-400">{m.entityType}</span>
              </p>
              <p className="text-sm text-gray-400 mt-0.5">{m.context}</p>
              <p className="text-xs text-gray-600 mt-1">{new Date(m.createdAt).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {!m.read && (
                <button onClick={() => markRead(m.id)} className="p-1.5 text-gray-600 hover:text-n0va-400">
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
