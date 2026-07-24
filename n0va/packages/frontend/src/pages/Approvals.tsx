import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CheckCircle, XCircle, Clock, Megaphone, Palette, AlertCircle, Check, Loader, MessageSquare, Search, RefreshCw, ExternalLink } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";

interface ApprovalItem {
  type: "campaign" | "creative";
  id: string;
  name: string;
  status: string;
  submittedAt?: string;
  submittedBy?: string;
}

interface ApprovalAction {
  itemId: string;
  itemType: "campaign" | "creative";
  action: "approved" | "rejected";
  comment: string;
  timestamp: string;
  actor: string;
  itemName: string;
}

const STORAGE_HISTORY = "n0va_approval_history";

function loadHistory(): ApprovalAction[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_HISTORY) || "[]"); }
  catch { return []; }
}

function saveHistory(h: ApprovalAction[]) {
  localStorage.setItem(STORAGE_HISTORY, JSON.stringify(h.slice(0, 100)));
}

export default function Approvals() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [creatives, setCreatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [history, setHistory] = useState<ApprovalAction[]>([]);

  useEffect(() => { loadData(); setHistory(loadHistory()); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [cRes, crRes]: any = await Promise.all([
        api.campaigns.list().catch(() => []),
        api.creatives.list().catch(() => []),
      ]);
      setCampaigns(Array.isArray(cRes) ? cRes : cRes?.campaigns || []);
      setCreatives(Array.isArray(crRes) ? crRes : crRes?.creatives || []);
    } catch {}
    setLoading(false);
  }

  const pendingCampaigns = campaigns.filter((c) => c.status === "pending_approval");
  const pendingCreatives = creatives.filter((c) => c.status === "pending_approval");
  const allPending: ApprovalItem[] = [
    ...pendingCampaigns.map((c) => ({ type: "campaign" as const, id: c._id || c.id, name: c.name, status: c.status })),
    ...pendingCreatives.map((c) => ({ type: "creative" as const, id: c._id || c.id, name: c.name, status: c.status })),
  ];

  const approvedToday = history.filter((h) => h.action === "approved" && new Date(h.timestamp).toDateString() === new Date().toDateString()).length;
  const rejectedToday = history.filter((h) => h.action === "rejected" && new Date(h.timestamp).toDateString() === new Date().toDateString()).length;
  const approvalRate = history.length > 0 ? Math.round((history.filter((h) => h.action === "approved").length / history.length) * 100) : 0;

  async function handleAction(item: ApprovalItem, action: "approved" | "rejected") {
    if (action === "rejected" && !comment.trim()) {
      addToast("error", "Please provide a reason for rejection");
      return;
    }
    setProcessing(`${item.type}-${item.id}`);
    try {
      const newStatus = action === "approved" ? "active" : "draft";
      if (item.type === "campaign") await api.campaigns.updateStatus(item.id, newStatus);
      else await api.creatives.updateStatus(item.id, newStatus);

      const actor = (() => { try { return JSON.parse(localStorage.getItem("n0va_user") || "{}").name || "You"; } catch { return "You"; } })();
      const entry: ApprovalAction = {
        itemId: item.id, itemType: item.type, action, comment: comment.trim(),
        timestamp: new Date().toISOString(), actor, itemName: item.name,
      };
      const updated = [entry, ...history];
      setHistory(updated);
      saveHistory(updated);
      addToast("success", `${item.name} ${action}`);
      setComment("");
      setActiveItem(null);
      loadData();
    } catch {
      addToast("error", `Failed to ${action} ${item.type}`);
    } finally {
      setProcessing(null);
    }
  }

  const getActorInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase(); // eslint-disable-line

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader className="w-6 h-6 animate-spin text-n0va-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-n0va-400" />
            Approvals
          </h1>
          <p className="text-gray-400 mt-1">Review and approve campaigns and creatives before launch</p>
        </div>
        <button onClick={loadData} className="btn-ghost text-sm flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{allPending.length}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Check className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{approvedToday}</p>
            <p className="text-xs text-gray-500">Approved Today</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{rejectedToday}</p>
            <p className="text-xs text-gray-500">Rejected Today</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{approvalRate}%</p>
            <p className="text-xs text-gray-500">Approval Rate</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-800">
        <button
          onClick={() => setTab("pending")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
            tab === "pending" ? "text-n0va-400 border-n0va-500" : "text-gray-500 border-transparent hover:text-gray-300"
          }`}
        >
          <Clock className="w-4 h-4 inline mr-2" />Pending {allPending.length > 0 && <span className="ml-1.5 text-xs bg-n0va-500/20 text-n0va-400 px-1.5 py-0.5 rounded-full">{allPending.length}</span>}
        </button>
        <button
          onClick={() => setTab("history")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
            tab === "history" ? "text-n0va-400 border-n0va-500" : "text-gray-500 border-transparent hover:text-gray-300"
          }`}
        >
          <MessageSquare className="w-4 h-4 inline mr-2" />History
        </button>
      </div>

      {tab === "pending" && (
        <>
          {allPending.length === 0 ? (
            <div className="card p-12 flex flex-col items-center justify-center text-center">
              <CheckCircle className="w-12 h-12 text-gray-700 mb-4" />
              <h3 className="text-lg font-semibold text-gray-300 mb-2">All clear</h3>
              <p className="text-sm text-gray-500 max-w-sm">No campaigns or creatives pending approval.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allPending.map((item) => (
                <div key={`${item.type}-${item.id}`} className="card p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${item.type === "campaign" ? "bg-n0va-500/10" : "bg-purple-500/10"}`}>
                        {item.type === "campaign" ? <Megaphone className="w-5 h-5 text-n0va-400" /> : <Palette className="w-5 h-5 text-purple-400" />}
                      </div>
                      <div>
                        <Link to={item.type === "campaign" ? `/campaigns/${item.id}` : `/creatives/${item.id}`} className="text-sm font-medium text-white hover:text-n0va-400 transition-colors flex items-center gap-1.5">
                          {item.name} <ExternalLink className="w-3 h-3" />
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-medium capitalize">{item.type}</span>
                          <span className="text-xs text-gray-500">Pending approval</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {activeItem === `${item.type}-${item.id}` && (
                    <div className="mt-4 space-y-3 border-t border-gray-800 pt-4">
                      <textarea
                        className="input min-h-[60px] resize-none text-sm"
                        placeholder={item.type === "campaign" ? "Review notes (required for rejection)..." : "Review notes (required for rejection)..."}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAction(item, "approved")}
                          disabled={processing === `${item.type}-${item.id}`}
                          className="btn-primary text-sm flex items-center gap-1.5"
                        >
                          {processing === `${item.type}-${item.id}` ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(item, "rejected")}
                          disabled={processing === `${item.type}-${item.id}`}
                          className="btn-ghost text-sm flex items-center gap-1.5 text-red-400 hover:text-red-300"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                        <button onClick={() => { setActiveItem(null); setComment(""); }} className="btn-ghost text-sm ml-auto">Cancel</button>
                      </div>
                    </div>
                  )}

                  {activeItem !== `${item.type}-${item.id}` && (
                    <div className="mt-3">
                      <button onClick={() => setActiveItem(`${item.type}-${item.id}`)} className="btn-ghost text-xs flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Review & Approve
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "history" && (
        <>
          {history.length === 0 ? (
            <div className="card p-12 flex flex-col items-center justify-center text-center">
              <MessageSquare className="w-12 h-12 text-gray-700 mb-4" />
              <h3 className="text-lg font-semibold text-gray-300 mb-2">No history yet</h3>
              <p className="text-sm text-gray-500 max-w-sm">Approvals and rejections will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((h, i) => (
                <div key={i} className="card p-4 flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${h.action === "approved" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                    {h.action === "approved" ? <Check className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">
                      <span className="font-medium">{h.actor}</span>{" "}
                      {h.action === "approved" ? "approved" : "rejected"}{" "}
                      <span className="font-medium">{h.itemName}</span>
                      <span className="text-xs text-gray-600 ml-1">({h.itemType})</span>
                    </p>
                    {h.comment && <p className="text-xs text-gray-400 mt-0.5">"{h.comment}"</p>}
                    <p className="text-xs text-gray-600 mt-0.5">{new Date(h.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
