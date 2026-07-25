import { useState, useEffect } from "react";
import { MessageCircle, MessageSquare, Trash2, ExternalLink, Clock, Filter, RefreshCw, Search, Loader } from "lucide-react";
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

export default function Comments() {
  const { addToast } = useToast();
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEntity, setFilterEntity] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { loadComments(); }, []);

  async function loadComments() {
    setLoading(true);
    try {
      const all: any[] = [];
      const entityTypes = ["campaigns", "creatives", "audiences"];
      for (const et of entityTypes) {
        const items = await api.entities.list(et);
        for (const item of items) {
          try {
            const entityComments = await api.comments.list(et, item._id);
            all.push(...entityComments.map((c: any) => ({ ...c, entityName: item.name || item.title || item._id, entityType: et })));
          } catch {}
        }
      }
      const sorted = all.sort((a, b) => new Date(b.createdAt || b._id).getTime() - new Date(a.createdAt || a._id).getTime());
      setComments(sorted);
    } catch { addToast("error", "Failed to load comments"); }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    try {
      await api.comments.delete(id);
      setComments((prev) => prev.filter((c) => c._id !== id && c.parentId !== id));
      addToast("success", "Comment deleted");
    } catch { addToast("error", "Failed to delete comment"); }
  }

  const entities = [...new Set(comments.map(c => c.entityName))];
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
        <button onClick={loadComments} className="btn-ghost text-sm flex items-center gap-1.5" disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {comments.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <select className="input text-sm w-auto" value={filterEntity} onChange={e => setFilterEntity(e.target.value)}>
              <option value="all">All Entities</option>
              {entities.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
            <input className="input pl-9 py-1.5 text-sm w-full" placeholder="Search comments..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
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
          <p className="text-sm text-gray-500 max-w-sm">Comments from campaign, creative, and audience pages will appear here.</p>
        </div>
      )}

      {!loading && (
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
                      <button onClick={() => handleDelete(comment._id)} className="text-xs text-gray-600 hover:text-red-400 ml-auto"><Trash2 className="w-3 h-3 inline" /></button>
                    </div>
                    <p className="text-sm text-gray-300 mt-1 whitespace-pre-wrap break-words">{comment.body}</p>
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
