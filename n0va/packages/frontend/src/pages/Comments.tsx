import { useState, useEffect } from "react";
import { MessageSquare, MessageCircle, Trash2, ExternalLink, Clock, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { getAllComments, Comment } from "../components/CommentsSection";
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
  const [comments, setComments] = useState<Comment[]>([]);
  const [filterEntity, setFilterEntity] = useState<string>("all");

  useEffect(() => { setComments(getAllComments()); }, []);

  function refresh() {
    setComments(getAllComments());
  }

  function handleDelete(id: string) {
    const target = comments.find(c => c.id === id);
    if (!target) return;
    const key = "n0va_comments_" + target.entityId;
    try {
      const all = JSON.parse(localStorage.getItem(key) || "[]");
      const updated = all.filter((c: Comment) => c.id !== id && c.parentId !== id);
      localStorage.setItem(key, JSON.stringify(updated));
      addToast("success", "Comment deleted");
      refresh();
    } catch {}
  }

  function handleClearAll() {
    const keys = new Set(comments.map(c => "n0va_comments_" + c.entityId));
    keys.forEach(k => localStorage.removeItem(k));
    addToast("success", "All comments cleared");
    refresh();
  }

  const entities = [...new Set(comments.map(c => c.entityName))];
  const filtered = filterEntity === "all" ? comments : comments.filter(c => c.entityName === filterEntity);
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
          <button onClick={refresh} className="btn-ghost text-sm">Refresh</button>
          {comments.length > 0 && (
            <button onClick={handleClearAll} className="btn-secondary text-sm text-red-400">Clear All</button>
          )}
        </div>
      </div>

      {/* Filter */}
      {entities.length > 0 && (
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-600" />
          <select className="input text-sm w-auto" value={filterEntity} onChange={e => setFilterEntity(e.target.value)}>
            <option value="all">All Campaigns</option>
            {entities.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      )}

      {/* Empty state */}
      {topLevel.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <MessageCircle className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No comments yet</h3>
          <p className="text-sm text-gray-500 max-w-sm">Comments from campaign detail pages will appear here.</p>
        </div>
      )}

      {/* Comment threads */}
      <div className="space-y-3">
        {topLevel.map(comment => {
          const replies = filtered.filter(c => c.parentId === comment.id);
          return (
            <div key={comment.id} className="card p-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-800 text-gray-400 flex items-center justify-center text-sm font-medium shrink-0">
                  {comment.author[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white">{comment.author}</span>
                    <span className="text-xs text-gray-600">{timeAgo(comment.createdAt)}</span>
                    <Link to={`/campaigns/${comment.entityId}`} className="text-xs text-n0va-400 hover:text-n0va-300 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> {comment.entityName}
                    </Link>
                    <button onClick={() => handleDelete(comment.id)} className="text-xs text-gray-600 hover:text-red-400 ml-auto"><Trash2 className="w-3 h-3 inline" /></button>
                  </div>
                  <p className="text-sm text-gray-300 mt-1 whitespace-pre-wrap break-words">{comment.body}</p>
                  {replies.length > 0 && (
                    <div className="mt-3 pl-3 border-l-2 border-gray-800 space-y-2">
                      {replies.map(reply => (
                        <div key={reply.id} className="flex gap-2 group">
                          <div className="w-6 h-6 rounded-full bg-gray-800 text-gray-500 flex items-center justify-center text-xs font-medium shrink-0">{reply.author[0]}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-white">{reply.author}</span>
                              <span className="text-[10px] text-gray-600">{timeAgo(reply.createdAt)}</span>
                              <button onClick={() => handleDelete(reply.id)} className="text-[10px] text-gray-600 hover:text-red-400 ml-auto"><Trash2 className="w-2.5 h-2.5 inline" /></button>
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
    </div>
  );
}
