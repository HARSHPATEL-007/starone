import { useState } from "react";
import { Archive, Search, RotateCcw, Trash2, Filter, Calendar, Megaphone, DollarSign, BarChart3, Clock, Target, Eye, Loader, AlertCircle, Download } from "lucide-react";
import { useToast } from "../components/Toast";
import { useEntityData } from "../hooks/useEntityData";
import { SkeletonCard } from "../components/Skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const ARCHIVE_STATUS_COLORS: Record<string, string> = { completed: "#10b981", paused: "#f59e0b", cancelled: "#ef4444", archived: "#6b7280" };

interface ArchivedCampaign {
  id: string;
  name: string;
  description: string;
  status: "completed" | "paused" | "cancelled" | "archived";
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  archivedAt: string;
  endedAt: string;
  reason: string;
}

function fmt(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  completed: { label: "Completed", color: "bg-green-500/20 text-green-400" },
  paused: { label: "Paused", color: "bg-yellow-500/20 text-yellow-400" },
  cancelled: { label: "Cancelled", color: "bg-red-500/20 text-red-400" },
  archived: { label: "Archived", color: "bg-gray-700 text-gray-400" },
};

export default function CampaignArchive() {
  const { addToast } = useToast();
  const { data: campaigns, loading, error, remove, replaceAll, refresh } = useEntityData<ArchivedCampaign>("campaign_archive");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [restoring, setRestoring] = useState<string | null>(null);
  const [batchIds, setBatchIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function handleRestore(id: string) {
    setRestoring(id);
    setTimeout(() => {
      const name = campaigns.find(c => c.id === id)?.name;
      const restored = campaigns.filter(c => c.id !== id);
      replaceAll(restored);
      addToast("success", `"${name}" restored to active campaigns`);
      setRestoring(null);
    }, 600);
  }

  function handleDelete(id: string) {
    const name = campaigns.find(c => c.id === id)?.name;
    remove(id);
    addToast("success", `"${name}" permanently deleted`);
  }

  function handleBatchRestore() {
    const names: string[] = [];
    const restored = campaigns.filter(c => {
      if (batchIds.has(c.id)) names.push(c.name);
      return !batchIds.has(c.id);
    });
    replaceAll(restored);
    addToast("success", `Restored ${names.length} campaign${names.length !== 1 ? "s" : ""}`);
    setBatchIds(new Set());
  }

  function handleBatchDelete() {
    const names: string[] = [];
    const remaining = campaigns.filter(c => {
      if (batchIds.has(c.id)) names.push(c.name);
      return !batchIds.has(c.id);
    });
    replaceAll(remaining);
    addToast("success", `Deleted ${names.length} campaign${names.length !== 1 ? "s" : ""}`);
    setBatchIds(new Set());
    setShowDeleteConfirm(false);
  }

  function toggleBatch(id: string) {
    setBatchIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const filtered = campaigns.filter(c => {
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0);
  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        <SkeletonCard /><SkeletonCard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-12 flex flex-col items-center justify-center text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-300 mb-2">Failed to load archive</h3>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <button onClick={refresh} className="btn-primary text-sm"><RotateCcw className="w-4 h-4 inline mr-1.5" /> Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Archive className="w-6 h-6 text-n0va-400" />
            Campaign Archive
          </h1>
          <p className="text-gray-400 mt-1">{campaigns.length} archived campaigns · ${(totalBudget - totalSpent).toLocaleString()} unspent</p>
        </div>
        <div className="flex items-center gap-2">
          {batchIds.size > 0 && (
            <>
              <button onClick={handleBatchRestore} className="btn-ghost text-xs flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Restore ({batchIds.size})</button>
              <button onClick={() => setShowDeleteConfirm(true)} className="btn-ghost text-xs text-red-400 flex items-center gap-1"><Trash2 className="w-3 h-3" /> Delete ({batchIds.size})</button>
            </>
          )}
          <button onClick={refresh} className="btn-ghost text-sm"><RotateCcw className="w-4 h-4 inline mr-1" /> Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4"><p className="text-xs text-gray-500">Total Budget</p><p className="text-lg font-bold text-white mt-1">${fmt(totalBudget)}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Total Spent</p><p className="text-lg font-bold text-white mt-1">${fmt(totalSpent)}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Avg. ROAS</p><p className="text-lg font-bold text-white mt-1">{((campaigns.reduce((s, c) => s + c.conversions, 0) * 50) / Math.max(totalSpent, 1)).toFixed(1)}x</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Completed</p><p className="text-lg font-bold text-white mt-1">{campaigns.filter(c => c.status === "completed").length}</p></div>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Archive Overview</h3>
          <button className="btn-ghost text-xs flex items-center gap-1" onClick={() => {
            const csv = [["Name", "Status", "Budget", "Spent", "Impressions", "Clicks", "Conversions", "Ended", "Reason"].join(","),
              ...campaigns.map((c: any) =>
                `"${c.name}","${c.status}",${c.budget},${c.spent},${c.impressions},${c.clicks},${c.conversions},"${c.endedAt}","${(c.reason || "").replace(/"/g, '""')}"`
              )].join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "archive_report.csv"; a.click();
            URL.revokeObjectURL(url);
          }}>
            <Download className="w-3 h-3" /> CSV
          </button>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={Object.entries(
                campaigns.reduce((acc: Record<string, number>, c: any) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {})
              ).filter(([, c]) => c > 0).map(([status, count]) => ({ name: status, value: count }))}
                cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {Object.entries(ARCHIVE_STATUS_COLORS).map(([s, c]) => <Cell key={s} fill={c} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input className="input pl-10 pr-4 py-2 text-sm w-full" placeholder="Search archived campaigns..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input py-2 text-sm w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {filtered.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <Archive className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No archived campaigns</h3>
          <p className="text-sm text-gray-500">{search ? "Try different search terms" : "Completed and paused campaigns will appear here."}</p>
        </div>
      )}

      {filtered.map(c => {
        const sm = STATUS_META[c.status];
        const spendPct = c.budget > 0 ? (c.spent / c.budget * 100) : 0;
        const cpa = c.conversions > 0 ? c.spent / c.conversions : 0;
        return (
          <div key={c.id} className={`card p-5 transition-all ${restoring === c.id ? "opacity-40 scale-95" : ""}`}>
            <div className="flex items-start gap-4">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={batchIds.has(c.id)} onChange={() => toggleBatch(c.id)} className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-n0va-500 focus:ring-n0va-500" />
                <div className={`p-2 rounded-lg ${sm.color.replace("text-", "bg-").replace("green-400", "green-500/10").replace("yellow-400", "yellow-500/10").replace("red-400", "red-500/10")}`}>
                  <Archive className="w-5 h-5" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-base font-semibold text-white">{c.name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sm.color}`}>{sm.label}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{c.description}</p>
                <div className="flex items-center gap-1 mt-1">
                  <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden max-w-[200px]">
                    <div className={`h-full rounded-full ${spendPct > 90 ? "bg-red-500" : spendPct > 70 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${spendPct}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-600">{spendPct.toFixed(0)}% of budget spent</span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-600 flex-wrap">
                  <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> ${c.spent.toLocaleString()} / ${c.budget.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {fmt(c.impressions)}</span>
                  <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> {c.conversions} conv.</span>
                  <span className="flex items-center gap-1"><Target className="w-3 h-3" /> CPA: ${cpa.toFixed(2)}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Ended {new Date(c.endedAt).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-gray-700 mt-2">Reason: {c.reason}</p>
                <p className="text-[10px] text-gray-700 mt-0.5">Archived {new Date(c.archivedAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handleRestore(c.id)} className="p-2 text-gray-600 hover:text-green-400" title="Restore to active campaigns">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(c.id)} className="p-2 text-gray-600 hover:text-red-400" title="Permanently delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowDeleteConfirm(false)}>
          <div className="w-full max-w-sm bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white text-center mb-2">Delete {batchIds.size} campaign{batchIds.size !== 1 ? "s" : ""}?</h3>
            <p className="text-sm text-gray-500 text-center mb-4">This action cannot be undone. Campaigns will be permanently removed.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleBatchDelete} className="btn-primary bg-red-600 hover:bg-red-500">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
