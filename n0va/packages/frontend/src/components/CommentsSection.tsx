import { useState, useEffect } from "react";
import { MessageSquare, Send, Reply, MoreHorizontal, Trash2, AtSign, Clock } from "lucide-react";
import { useToast } from "./Toast";

export interface Comment {
  id: string;
  entityId: string;
  entityName: string;
  author: string;
  body: string;
  parentId: string | null;
  createdAt: string;
}

const STORAGE_PREFIX = "n0va_comments_";

function loadComments(entityId: string): Comment[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_PREFIX + entityId) || "[]"); } catch { return []; }
}

function saveComments(entityId: string, comments: Comment[]) {
  localStorage.setItem(STORAGE_PREFIX + entityId, JSON.stringify(comments));
}

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

interface Props {
  entityId: string;
  entityName: string;
}

export function getAllComments(): Comment[] {
  const all: Comment[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      try { all.push(...JSON.parse(localStorage.getItem(key) || "[]")); } catch {}
    }
  }
  return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getCommentCount(entityId: string): number {
  return loadComments(entityId).length;
}

export default function CommentsSection({ entityId, entityName }: Props) {
  const { addToast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => { setComments(loadComments(entityId)); }, [entityId]);

  function persist(updated: Comment[]) {
    setComments(updated);
    saveComments(entityId, updated);
  }

  function handlePost() {
    if (!newComment.trim()) return;
    const comment: Comment = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      entityId,
      entityName,
      author: "You",
      body: newComment.trim(),
      parentId: null,
      createdAt: new Date().toISOString(),
    };
    persist([comment, ...comments]);
    setNewComment("");
    addToast("success", "Comment added");
  }

  function handleReply(parentId: string) {
    if (!replyText.trim()) return;
    const comment: Comment = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      entityId,
      entityName,
      author: "You",
      body: replyText.trim(),
      parentId,
      createdAt: new Date().toISOString(),
    };
    persist([...comments, comment]);
    setReplyText("");
    setReplyTo(null);
    addToast("success", "Reply added");
  }

  function handleDelete(id: string) {
    persist(comments.filter(c => c.id !== id && c.parentId !== id));
    addToast("success", "Comment removed");
  }

  const topLevel = comments.filter(c => !c.parentId);
  const replies = (parentId: string) => comments.filter(c => c.parentId === parentId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <MessageSquare className="w-4 h-4" />
        <span>{comments.length} comment{comments.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Post new comment */}
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-n0va-500/10 text-n0va-400 flex items-center justify-center text-sm font-medium shrink-0">Y</div>
        <div className="flex-1 space-y-2">
          <textarea
            className="input w-full resize-none text-sm"
            rows={2}
            placeholder="Add a comment..."
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePost(); }}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-600">Cmd+Enter to post</span>
            <button onClick={handlePost} disabled={!newComment.trim()} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 disabled:opacity-50">
              <Send className="w-3 h-3" /> Post
            </button>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {topLevel.length === 0 && (
        <div className="text-center py-8 text-gray-600 text-sm">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
          No comments yet. Start the conversation.
        </div>
      )}

      {/* Comments */}
      <div className="space-y-3">
        {topLevel.map(comment => (
          <div key={comment.id}>
            <div className="flex gap-3 group">
              <div className="w-8 h-8 rounded-full bg-gray-800 text-gray-400 flex items-center justify-center text-sm font-medium shrink-0">
                {comment.author[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-white">{comment.author}</span>
                  <span className="text-xs text-gray-600">{timeAgo(comment.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">{comment.body}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <button onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)} className="text-xs text-gray-600 hover:text-gray-400 flex items-center gap-1">
                    <Reply className="w-3 h-3" /> Reply
                  </button>
                  <button onClick={() => handleDelete(comment.id)} className="text-xs text-gray-600 hover:text-red-400 flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>

                {/* Reply input */}
                {replyTo === comment.id && (
                  <div className="flex gap-2 mt-2">
                    <textarea
                      className="input w-full resize-none text-sm"
                      rows={1}
                      placeholder="Write a reply..."
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      autoFocus
                    />
                    <button onClick={() => handleReply(comment.id)} disabled={!replyText.trim()} className="btn-primary text-xs py-1 px-2 disabled:opacity-50">
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Replies */}
                {replies(comment.id).length > 0 && (
                  <div className="mt-2 ml-2 pl-3 border-l-2 border-gray-800 space-y-2">
                    {replies(comment.id).map(reply => (
                      <div key={reply.id} className="flex gap-2 group">
                        <div className="w-6 h-6 rounded-full bg-gray-800 text-gray-500 flex items-center justify-center text-xs font-medium shrink-0">
                          {reply.author[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-white">{reply.author}</span>
                            <span className="text-[10px] text-gray-600">{timeAgo(reply.createdAt)}</span>
                          </div>
                          <p className="text-xs text-gray-400 whitespace-pre-wrap break-words">{reply.body}</p>
                          <button onClick={() => handleDelete(reply.id)} className="text-[10px] text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 mt-0.5"><Trash2 className="w-2.5 h-2.5 inline" /> Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
