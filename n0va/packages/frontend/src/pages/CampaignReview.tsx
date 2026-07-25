import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Edit3, Archive, Trash2, Target, Clock, DollarSign, Calendar, ExternalLink, Search, CheckCircle, CheckSquare, Square, MessageSquare, ThumbsUp, ThumbsDown, Filter, ArrowUpDown, Loader, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { useCsvExport } from "../hooks/useCsvExport";
import { SkeletonCard } from "../components/Skeleton";

const STATUS_GROUPS = [
  { key: "draft", label: "Drafts", icon: Edit3, color: "text-gray-400", bg: "bg-gray-500/10" },
  { key: "paused", label: "Paused", icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  { key: "archived", label: "Archived", icon: Archive, color: "text-red-400", bg: "bg-red-500/10" },
];

type SortKey = "name" | "budget" | "spend" | "date";

export default function CampaignReview() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { exportToCsv } = useCsvExport();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [noteInput, setNoteInput] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const result = await api.campaigns.list();
      setCampaigns(Array.isArray(result) ? result : result.campaigns || []);
    } catch { } finally { setLoading(false); }
  }

  async function handleStatus(id: string, status: string, name: string) {
    try {
      await api.campaigns.updateStatus(id, status);
      addToast("success", `"${name}" → ${status}`);
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
      loadData();
    } catch { addToast("error", "Failed to update status"); }
  }

  async function handleBulkStatus(status: string) {
    const ids = [...selected];
    if (ids.length === 0) { addToast("error", "No campaigns selected"); return; }
    setSubmitting(true);
    let success = 0;
    for (const id of ids) {
      try { await api.campaigns.updateStatus(id, status); success++; } catch { }
    }
    addToast("success", `${success}/${ids.length} campaigns → ${status}`);
    setSelected(new Set());
    setSubmitting(false);
    loadData();
  }

  async function handleDelete(id: string, name: string) {
    try {
      await api.campaigns.delete(id);
      addToast("success", `"${name}" deleted`);
      loadData();
    } catch { addToast("error", "Failed to delete"); }
  }

  async function handleBulkDelete() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setSubmitting(true);
    let success = 0;
    for (const id of ids) {
      try { await api.campaigns.delete(id); success++; } catch { }
    }
    addToast("success", `${success}/${ids.length} campaigns deleted`);
    setSelected(new Set());
    setSubmitting(false);
    loadData();
  }

  async function handleReview(id: string, status: "active" | "archived", name: string) {
    const note = reviewNotes[id] || "";
    await handleStatus(id, status, name);
    if (note.trim()) {
      try { await api.activity.create({ action: "reviewed", entityType: "campaign", entityId: id, details: note } as any).catch(() => {}); } catch { }
    }
    setReviewNotes(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function toggleSelectAll(ids: string[]) {
    if (selected.size === ids.length) setSelected(new Set());
    else setSelected(new Set(ids));
  }

  const grouped = useMemo(() => {
    let filtered = campaigns.filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase()));
    const sgn = sortAsc ? 1 : -1;
    filtered.sort((a, b) => {
      if (sortKey === "name") return a.name?.localeCompare(b.name || "") * sgn;
      if (sortKey === "budget") return ((a.budget?.lifetime || 0) - (b.budget?.lifetime || 0)) * sgn;
      if (sortKey === "spend") return ((a.budget?.spent || 0) - (b.budget?.spent || 0)) * sgn;
      if (sortKey === "date") return (new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime()) * sgn;
      return 0;
    });
    return STATUS_GROUPS.map(g => ({ ...g, items: filtered.filter(c => c.status === g.key) }));
  }, [campaigns, search, sortKey, sortAsc]);

  const total = grouped.reduce((s, g) => s + g.items.length, 0);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "name", label: "Name" }, { key: "budget", label: "Budget" },
    { key: "spend", label: "Spend" }, { key: "date", label: "Date" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-2xl font-bold text-white">Campaign Review Board</h1>
            <p className="text-sm text-gray-500">{total} campaigns · {selected.size} selected</p>
          </div>
        </div>
        <button onClick={loadData} className="btn-secondary text-sm">Refresh</button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input className="input pl-10" placeholder="Search campaigns..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <ArrowUpDown className="w-3.5 h-3.5" />
          {sortOptions.map(o => (
            <button key={o.key} onClick={() => { if (sortKey === o.key) setSortAsc(!sortAsc); else { setSortKey(o.key); setSortAsc(false); } }} className={`px-2 py-1 rounded border ${sortKey === o.key ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500"}`}>
              {o.label} {sortKey === o.key ? (sortAsc ? "↑" : "↓") : ""}
            </button>
          ))}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="card p-3 flex items-center gap-3 bg-n0va-600/10 border-n0va-600/30">
          <span className="text-sm text-white font-medium">{selected.size} selected</span>
          <button className="btn-primary text-xs flex items-center gap-1.5" onClick={() => handleBulkStatus("active")} disabled={submitting}>
            {submitting ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} Activate All
          </button>
          <button className="btn-secondary text-xs flex items-center gap-1.5" onClick={() => handleBulkStatus("archived")} disabled={submitting}>
            <Archive className="w-3.5 h-3.5" /> Archive All
          </button>
          <button className="btn-ghost text-xs flex items-center gap-1.5 text-red-400" onClick={handleBulkDelete} disabled={submitting}>
            <Trash2 className="w-3.5 h-3.5" /> Delete All
          </button>
        </div>
      )}

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Status Breakdown</h3>
          <button className="btn-ghost text-xs flex items-center gap-1" onClick={() => exportToCsv(grouped.map(g => ({ Status: g.label, Count: g.items.length })), "campaign_review_status")}><Download className="w-3 h-3" /> Export CSV</button>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={grouped.map(g => ({ status: g.label, count: g.items.length }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="status" stroke="#6b7280" fontSize={11} />
              <YAxis stroke="#6b7280" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                <Cell fill="#6b7280" />
                <Cell fill="#eab308" />
                <Cell fill="#ef4444" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</div>
      ) : total === 0 ? (
        <div className="card text-center py-12">
          <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
          <p className="text-gray-500">All campaigns are active — nothing needs review!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {grouped.map(group => {
            const Icon = group.icon;
            const groupIds = group.items.map(c => c._id || c.id);
            const allSelected = groupIds.length > 0 && groupIds.every(id => selected.has(id));
            return (
              <div key={group.key}>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${group.bg} mb-3`}>
                  {group.items.length > 0 && (
                    <button onClick={() => allSelected ? groupIds.forEach(id => toggleSelect(id)) : groupIds.forEach(id => { if (!selected.has(id)) toggleSelect(id); })} className="text-gray-500 hover:text-white">
                      {allSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <Icon className={`w-4 h-4 ${group.color}`} />
                  <h3 className={`text-sm font-semibold ${group.color}`}>{group.label}</h3>
                  <span className={`ml-auto text-xs ${group.color}`}>{group.items.length}</span>
                </div>
                <div className="space-y-2">
                  {group.items.length === 0 ? (
                    <p className="text-xs text-gray-600 text-center py-4">No {group.key} campaigns</p>
                  ) : group.items.map(c => {
                    const cId = c._id || c.id;
                    const spent = c.budget?.spent || 0;
                    const lifetime = c.budget?.lifetime || 0;
                    const isSelected = selected.has(cId);
                    return (
                      <div key={cId} className={`card !p-3 transition-colors ${isSelected ? "border-n0va-600/40" : "hover:border-gray-700"}`}>
                        <div className="flex items-start gap-2">
                          <button onClick={() => toggleSelect(cId)} className="mt-0.5 text-gray-600 hover:text-white shrink-0">
                            {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-n0va-400" /> : <Square className="w-3.5 h-3.5" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Target className="w-3.5 h-3.5 text-n0va-400 shrink-0" />
                                <p className="text-sm font-medium text-white truncate">{c.name}</p>
                              </div>
                              <button onClick={() => navigate(`/campaigns/${cId}`)} className="text-gray-600 hover:text-n0va-400 shrink-0">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-[10px] text-gray-500 capitalize mt-0.5">{c.type} · {c.goal || "No goal set"}</p>
                            <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-1 mb-2">
                              <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${lifetime.toLocaleString()}</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />${spent.toLocaleString()} spent</span>
                              {c.startDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(c.startDate).toLocaleDateString()}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 mt-2">
                          <button onClick={() => handleReview(cId, "active", c.name)} className="flex-1 text-[10px] py-1.5 rounded bg-green-600/20 text-green-400 hover:bg-green-600/30 flex items-center justify-center gap-1">
                            <ThumbsUp className="w-3 h-3" /> Approve
                          </button>
                          <button onClick={() => navigate(`/campaigns/${cId}`)} className="flex-1 text-[10px] py-1.5 rounded bg-n0va-600/20 text-n0va-400 hover:bg-n0va-600/30 flex items-center justify-center gap-1">
                            <Edit3 className="w-3 h-3" /> Edit
                          </button>
                          <button onClick={() => handleReview(cId, "archived", c.name)} className="flex-1 text-[10px] py-1.5 rounded bg-gray-800 text-gray-500 hover:text-gray-300 flex items-center justify-center gap-1">
                            <ThumbsDown className="w-3 h-3" /> Reject
                          </button>
                          <button onClick={() => setNoteInput(noteInput === cId ? null : cId)} className="text-[10px] py-1.5 px-2 rounded bg-gray-800 text-gray-600 hover:text-gray-300">
                            <MessageSquare className="w-3 h-3" />
                          </button>
                          <button onClick={() => { if (confirm(`Delete "${c.name}"?`)) handleDelete(cId, c.name); }} className="text-[10px] py-1.5 px-2 rounded bg-gray-800 text-gray-600 hover:text-red-400">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        {noteInput === cId && (
                          <div className="mt-2 flex gap-2">
                            <input className="input text-xs flex-1" placeholder="Add review note..." value={reviewNotes[cId] || ""} onChange={e => setReviewNotes(prev => ({ ...prev, [cId]: e.target.value }))} autoFocus />
                            <button className="text-xs text-n0va-400 hover:text-n0va-300" onClick={() => setNoteInput(null)}>Save</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
