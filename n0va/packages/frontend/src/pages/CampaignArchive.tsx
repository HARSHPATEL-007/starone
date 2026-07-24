import { useState, useEffect } from "react";
import { Archive, Search, RotateCcw, Trash2, Filter, Calendar, Megaphone, DollarSign, BarChart3, Clock, Target, Eye } from "lucide-react";
import { useToast } from "../components/Toast";

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

const STORAGE_KEY = "n0va_campaign_archive";

const DEFAULT_ARCHIVE: ArchivedCampaign[] = [
  { id: "ac-1", name: "Q1 Product Launch", description: "Initial product launch campaign across all channels", status: "completed", budget: 150000, spent: 142000, impressions: 1250000, clicks: 38000, conversions: 3200, archivedAt: new Date(Date.now() - 86400000 * 90).toISOString(), endedAt: new Date(Date.now() - 86400000 * 95).toISOString(), reason: "Campaign completed successfully" },
  { id: "ac-2", name: "Holiday Flash Sale", description: "24-hour flash sale for holiday shoppers", status: "completed", budget: 50000, spent: 48500, impressions: 890000, clicks: 28000, conversions: 4200, archivedAt: new Date(Date.now() - 86400000 * 60).toISOString(), endedAt: new Date(Date.now() - 86400000 * 62).toISOString(), reason: "Campaign completed successfully" },
  { id: "ac-3", name: "Spring Brand Awareness", description: "Brand awareness push for spring collection", status: "paused", budget: 80000, spent: 32000, impressions: 520000, clicks: 12500, conversions: 680, archivedAt: new Date(Date.now() - 86400000 * 30).toISOString(), endedAt: new Date(Date.now() - 86400000 * 35).toISOString(), reason: "Budget reallocation to higher-performing campaigns" },
  { id: "ac-4", name: "Influencer Pilot Program", description: "Test campaign with micro-influencers", status: "cancelled", budget: 25000, spent: 8000, impressions: 95000, clicks: 2100, conversions: 89, archivedAt: new Date(Date.now() - 86400000 * 20).toISOString(), endedAt: new Date(Date.now() - 86400000 * 22).toISOString(), reason: "Low ROI - paused after 2-week test" },
  { id: "ac-5", name: "Retargeting Q2", description: "Q2 retargeting for abandoned cart users", status: "archived", budget: 45000, spent: 44000, impressions: 320000, clicks: 9800, conversions: 1450, archivedAt: new Date(Date.now() - 86400000 * 15).toISOString(), endedAt: new Date(Date.now() - 86400000 * 18).toISOString(), reason: "Replaced by new retargeting strategy" },
  { id: "ac-6", name: "Beta Tester Recruitment", description: "Recruit beta testers for new platform feature", status: "completed", budget: 10000, spent: 9200, impressions: 180000, clicks: 5400, conversions: 340, archivedAt: new Date(Date.now() - 86400000 * 10).toISOString(), endedAt: new Date(Date.now() - 86400000 * 12).toISOString(), reason: "Target reached - 340 beta signups" },
];

function load(): ArchivedCampaign[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ARCHIVE));
    return DEFAULT_ARCHIVE;
  } catch { return []; }
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
  const [campaigns, setCampaigns] = useState<ArchivedCampaign[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => { setCampaigns(load()); }, []);

  function persist(updated: ArchivedCampaign[]) {
    setCampaigns(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function handleRestore(id: string) {
    setRestoring(id);
    setTimeout(() => {
      const name = campaigns.find(c => c.id === id)?.name;
      const restored = campaigns.filter(c => c.id !== id);
      persist(restored);
      addToast("success", `"${name}" restored to active campaigns`);
      setRestoring(null);
    }, 600);
  }

  function handleDelete(id: string) {
    const name = campaigns.find(c => c.id === id)?.name;
    persist(campaigns.filter(c => c.id !== id));
    addToast("success", `"${name}" permanently deleted`);
  }

  const filtered = campaigns.filter(c => {
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0);
  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0);

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
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4"><p className="text-xs text-gray-500">Total Budget</p><p className="text-lg font-bold text-white mt-1">${fmt(totalBudget)}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Total Spent</p><p className="text-lg font-bold text-white mt-1">${fmt(totalSpent)}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Avg. ROAS</p><p className="text-lg font-bold text-white mt-1">{((campaigns.reduce((s, c) => s + c.conversions, 0) * 50) / totalSpent).toFixed(1)}x</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Completed</p><p className="text-lg font-bold text-white mt-1">{campaigns.filter(c => c.status === "completed").length}</p></div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input className="input pl-10 pr-4 py-2 text-sm w-full" placeholder="Search archived campaigns..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input py-2 text-sm w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="paused">Paused</option>
          <option value="cancelled">Cancelled</option>
          <option value="archived">Archived</option>
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
              <div className={`p-2 rounded-lg ${sm.color.replace("text-", "bg-").replace("green-400", "green-500/10").replace("yellow-400", "yellow-500/10").replace("red-400", "red-500/10")}`}>
                <Archive className="w-5 h-5" />
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
    </div>
  );
}
