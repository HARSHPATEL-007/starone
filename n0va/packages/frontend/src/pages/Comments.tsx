import { useState, useEffect } from "react";
import { MessageCircle, MessageSquare, Trash2, ExternalLink, Clock, Filter, RefreshCw, Search, Loader, Plus, Send, X } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useToast } from "../components/Toast";

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

const ENTITY_CONFIGS = [
  { key: "campaigns", label: "Campaigns", route: "/campaigns" },
  { key: "creatives", label: "Creatives", route: "/creatives" },
  { key: "audiences", label: "Audiences", route: "/audiences" },
];

export default function Comments() {
  const { addToast } = useToast();
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEntity, setFilterEntity] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newComment, setNewComment] = useState({ entityType: "campaigns", entityId: "", body: "" });
  const [entities, setEntities] = useState<Record<string, any[]>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const all: any[] = [];
      const entityMap: Record<string, any[]> = {};
      for (const cfg of ENTITY_CONFIGS) {
        const items = await api.entities.list(cfg.key).catch(() => []);
        entityMap[cfg.key] = items;
        for (const item of items) {
          try {
            const entityComments = await api.comments.list(cfg.key, item._id);
            all.push(...entityComments.map((c: any) => ({ ...c, entityName: item.name || item.title || item._id, entityType: cfg.key, entityId: item._id })));
          } catch {}
        }
      }
      setEntities(entityMap);
      const sorted = all.sort((a, b) => new Date(b.createdAt || b._id).getTime() - new Date(a.createdAt || a._id).getTime());
      setComments(sorted);
    } catch { addToast("error", "Failed to load comments"); }
    setLoading(false);
  }

  async function handleCreate() {
    if (!newComment.body.trim() || !newComment.entityId) { addToast("error", "Select an entity and enter a comment"); return; }
    try {
      const created = await api.comments.create(newComment.entityType, newComment.entityId, { body: newComment.body.trim(), author: "You" });
      const entityName = (entities[newComment.entityType]?.find((e) => e._id === newComment.entityId)?.name || newComment.entityId);
      setComments([{ ...created, entityName, entityType: newComment.entityType, entityId: newComment.entityId }, ...comments]);
      setNewComment({ entityType: "campaigns", entityId: "", body: "" });
      setShowNew(false);
      addToast("success", "Comment added");
    } catch { addToast("error", "Failed to add comment"); }
  }

  async function handleReply(parentId: string, entityType: string, entityId: string) {
    if (!replyText.trim()) { addToast("error", "Enter a reply"); return; }
    try {
      const created = await api.comments.create(entityType, entityId, { body: replyText.trim(), author: "You", parentId });
      setComments([{ ...created, entityName: comments.find(c => c._id === parentId)?.entityName, entityType, entityId }, ...comments]);
      setReplyText("");
      setReplyingTo(null);
      addToast("success", "Reply added");
    } catch { addToast("error", "Failed to reply"); }
  }

  async function handleDelete(id: string) {
    try {
      await api.comments.delete(id);
      setComments((prev) => prev.filter((c) => c._id !== id && c.parentId !== id));
      addToast("success", "Comment deleted");
    } catch { addToast("error", "Failed to delete comment"); }
  }

  const entityNames = [...new Set(comments.map(c => c.entityName))];
  const filtered = comments.filter(c => {
    if (filterEntity !== "all" && c.entityName !== filterEntity) return false;
    if (searchQuery && !c.body?.toLowerCase().includes(searchQuery.toLowerCase()) && !c.author?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });
  const topLevel = filtered.filter(c => !c.parentId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <MessageCircle className="w-6 h-6 text-n0va-400" />
            Comments
          </h1>
          <p className="text-gray-400 mt-1">{comments.length} total · {topLevel.length} thread{topLevel.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNew(true)} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> New Comment</button>
          <button onClick={loadAll} className="btn-ghost text-sm flex items-center gap-1.5" disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {comments.length > 0 && (
          <>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <select className="input text-sm w-auto" value={filterEntity} onChange={e => setFilterEntity(e.target.value)}>
                <option value="all">All Entities</option>
                {entityNames.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
              <input className="input pl-9 py-1.5 text-sm w-full" placeholder="Search comments..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </>
        )}
      </div>

      {showNew && (
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-white">New Comment</h3><button onClick={() => setShowNew(false)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button></div>
          <div className="grid grid-cols-2 gap-3">
            <select className="input text-sm" value={newComment.entityType} onChange={e => setNewComment({ ...newComment, entityType: e.target.value, entityId: "" })}>
              {ENTITY_CONFIGS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <select className="input text-sm" value={newComment.entityId} onChange={e => setNewComment({ ...newComment, entityId: e.target.value })}>
              <option value="">Select {newComment.entityType}...</option>
              {(entities[newComment.entityType] || []).map((item: any) => <option key={item._id} value={item._id}>{item.name || item.title || item._id}</option>)}
            </select>
          </div>
          <textarea className="input min-h-[80px] resize-none text-sm" placeholder="Write your comment..." value={newComment.body} onChange={e => setNewComment({ ...newComment, body: e.target.value })} />
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowNew(false); setNewComment({ entityType: "campaigns", entityId: "", body: "" }); }} className="btn-ghost text-sm">Cancel</button>
            <button onClick={handleCreate} className="btn-primary text-sm flex items-center gap-1.5"><Send className="w-3.5 h-3.5" /> Post Comment</button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12"><Loader className="w-6 h-6 animate-spin text-n0va-400" /></div>
      )}

      {!loading && topLevel.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <MessageCircle className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No comments yet</h3>
          <p className="text-sm text-gray-500 max-w-sm">Start the conversation by adding a comment on a campaign, creative, or audience.</p>
          <button onClick={() => setShowNew(true)} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> New Comment</button>
        </div>
      )}

      {!loading && topLevel.length > 0 && (
        <div className="space-y-3">
          {topLevel.map(comment => {
            const replies = filtered.filter(c => c.parentId === comment._id);
            return (
              <div key={comment._id} className="card p-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-800 text-gray-400 flex items-center justify-center text-sm font-medium shrink-0">
                    {(comment.author || "A")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white">{comment.author || "Anonymous"}</span>
                      <span className="text-xs text-gray-600">{timeAgo(comment.createdAt || comment._id)}</span>
                      <Link to={`/${comment.entityType}/${comment.entityId}`} className="text-xs text-n0va-400 hover:text-n0va-300 flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> {comment.entityName}
                      </Link>
                      <span className="text-[10px] text-gray-600 capitalize px-1.5 py-0.5 bg-gray-800 rounded">{comment.entityType}</span>
                      <div className="ml-auto flex items-center gap-1">
                        <button onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)} className="text-xs text-gray-600 hover:text-n0va-400"><MessageSquare className="w-3 h-3 inline" /> Reply</button>
                        <button onClick={() => handleDelete(comment._id)} className="text-xs text-gray-600 hover:text-red-400"><Trash2 className="w-3 h-3 inline" /></button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 mt-1 whitespace-pre-wrap break-words">{comment.body}</p>

                    {replyingTo === comment._id && (
                      <div className="mt-3 flex gap-2">
                        <input className="input flex-1 text-sm" placeholder="Write a reply..." value={replyText} onChange={e => setReplyText(e.target.value)} autoFocus onKeyDown={e => e.key === "Enter" && handleReply(comment._id, comment.entityType, comment.entityId)} />
                        <button onClick={() => handleReply(comment._id, comment.entityType, comment.entityId)} className="btn-primary text-xs"><Send className="w-3 h-3" /></button>
                        <button onClick={() => { setReplyingTo(null); setReplyText(""); }} className="text-xs text-gray-500 hover:text-white">Cancel</button>
                      </div>
                    )}

                    {replies.length > 0 && (
                      <div className="mt-3 pl-3 border-l-2 border-gray-800 space-y-2">
                        {replies.map(reply => (
                          <div key={reply._id} className="flex gap-2 group">
                            <div className="w-6 h-6 rounded-full bg-gray-800 text-gray-500 flex items-center justify-center text-xs font-medium shrink-0">{(reply.author || "A")[0]}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-white">{reply.author || "Anonymous"}</span>
                                <span className="text-[10px] text-gray-600">{timeAgo(reply.createdAt || reply._id)}</span>
                                <button onClick={() => handleDelete(reply._id)} className="text-[10px] text-gray-600 hover:text-red-400 ml-auto"><Trash2 className="w-2.5 h-2.5 inline" /></button>
                              </div>
                              <p className="text-xs text-gray-400">{reply.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
