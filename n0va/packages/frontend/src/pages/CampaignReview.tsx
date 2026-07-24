import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Edit3, Archive, Trash2, Target, Clock, DollarSign, Calendar, ExternalLink, Search, CheckCircle } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const STATUS_GROUPS = [
  { key: "draft", label: "Drafts", icon: Edit3, color: "text-gray-400", bg: "bg-gray-500/10" },
  { key: "paused", label: "Paused", icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  { key: "archived", label: "Archived", icon: Archive, color: "text-red-400", bg: "bg-red-500/10" },
];

export default function CampaignReview() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const result = await api.campaigns.list();
      const list = Array.isArray(result) ? result : result.campaigns || [];
      setCampaigns(list);
    } catch { } finally { setLoading(false); }
  }

  async function handleStatus(id: string, status: string, name: string) {
    try {
      await api.campaigns.updateStatus(id, status);
      addToast("success", `"${name}" ${status}`);
      loadData();
    } catch { addToast("error", "Failed to update status"); }
  }

  async function handleDelete(id: string, name: string) {
    try {
      await api.campaigns.delete(id);
      addToast("success", `"${name}" deleted`);
      loadData();
    } catch { addToast("error", "Failed to delete"); }
  }

  const grouped = STATUS_GROUPS.map((g) => ({
    ...g,
    items: campaigns.filter((c) => {
      if (search && !c.name?.toLowerCase().includes(search.toLowerCase())) return false;
      return c.status === g.key;
    }),
  }));

  const total = grouped.reduce((s, g) => s + g.items.length, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Campaign Review Board</h1>
            <p className="text-sm text-gray-500">{total} campaigns needing attention</p>
          </div>
        </div>
        <button onClick={loadData} className="btn-secondary text-sm">Refresh</button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input className="input pl-10" placeholder="Search campaigns..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : total === 0 ? (
        <div className="card text-center py-12">
          <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
          <p className="text-gray-500">All campaigns are active — nothing needs review!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {grouped.map((group) => {
            const Icon = group.icon;
            return (
              <div key={group.key}>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${group.bg} mb-3`}>
                  <Icon className={`w-4 h-4 ${group.color}`} />
                  <h3 className={`text-sm font-semibold ${group.color}`}>{group.label}</h3>
                  <span className={`ml-auto text-xs ${group.color}`}>{group.items.length}</span>
                </div>
                <div className="space-y-2">
                  {group.items.length === 0 ? (
                    <p className="text-xs text-gray-600 text-center py-4">No {group.key} campaigns</p>
                  ) : (
                    group.items.map((c) => {
                      const spent = c.budget?.spent || 0;
                      const lifetime = c.budget?.lifetime || 0;
                      return (
                        <div key={c._id} className="card !p-3 hover:border-gray-700 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <Target className="w-3.5 h-3.5 text-n0va-400 shrink-0" />
                                <p className="text-sm font-medium text-white truncate">{c.name}</p>
                              </div>
                              <p className="text-[10px] text-gray-500 capitalize mt-0.5">{c.type} · {c.goal || "No goal set"}</p>
                            </div>
                            <button onClick={() => navigate(`/campaigns/${c._id}`)} className="text-gray-600 hover:text-n0va-400 shrink-0">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-3 text-[10px] text-gray-500 mb-3">
                            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${lifetime.toLocaleString()}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />${spent.toLocaleString()} spent</span>
                            {c.startDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(c.startDate).toLocaleDateString()}</span>}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button onClick={() => handleStatus(c._id, "active", c.name)} className="flex-1 text-[10px] py-1.5 rounded bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors flex items-center justify-center gap-1">
                              <Play className="w-3 h-3" /> Activate
                            </button>
                            <button onClick={() => navigate(`/campaigns/${c._id}`)} className="flex-1 text-[10px] py-1.5 rounded bg-n0va-600/20 text-n0va-400 hover:bg-n0va-600/30 transition-colors flex items-center justify-center gap-1">
                              <Edit3 className="w-3 h-3" /> Edit
                            </button>
                            <button onClick={() => handleStatus(c._id, "archived", c.name)} className="flex-1 text-[10px] py-1.5 rounded bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-1">
                              <Archive className="w-3 h-3" /> Archive
                            </button>
                            <button onClick={() => { if (confirm(`Delete "${c.name}"?`)) handleDelete(c._id, c.name); }} className="text-[10px] py-1.5 px-2 rounded bg-gray-800 text-gray-600 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
