import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CheckSquare, Square, Megaphone, CheckCircle, AlertCircle, RefreshCw, RotateCcw, Loader, ExternalLink } from "lucide-react";
import { api } from "../api/client";
import { useLaunchChecklist, ChecklistItem } from "../hooks/useLaunchChecklist";

const categoryColors: Record<string, string> = {
  creative: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  audience: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  budget: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  schedule: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  platform: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  tracking: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  approval: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function LaunchChecklist() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { items, getChecklist, toggleItem, resetChecklist } = useLaunchChecklist();

  useEffect(() => { loadCampaigns(); }, []);

  async function loadCampaigns() {
    setLoading(true);
    try {
      const res = await api.campaigns.list();
      setCampaigns(res.campaigns || res || []);
    } catch {}
    setLoading(false);
  }

  const checklistData = campaigns.map((c) => {
    const id = c._id || c.id;
    const cl = getChecklist(id);
    const pct = Math.round((cl.completed.length / items.length) * 100);
    return { campaign: c, id, checklist: cl, pct };
  });

  const readyToLaunch = checklistData.filter((d) => d.pct === 100 && d.campaign.status === "draft");
  const needsWork = checklistData.filter((d) => d.pct < 100 && d.campaign.status === "draft");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <CheckSquare className="w-6 h-6 text-n0va-400" />
            Launch Checklist
          </h1>
          <p className="text-gray-400 mt-1">Pre-flight checks for campaign launches</p>
        </div>
        <button onClick={loadCampaigns} className="btn-ghost text-sm flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-2xl font-bold text-white">{campaigns.length}</p>
          <p className="text-xs text-gray-500">Total Campaigns</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-emerald-400">{readyToLaunch.length}</p>
          <p className="text-xs text-gray-500">Ready to Launch</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-amber-400">{needsWork.length}</p>
          <p className="text-xs text-gray-500">Needs Attention</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-n0va-400">
            {checklistData.length > 0 ? Math.round(checklistData.reduce((s, d) => s + d.pct, 0) / checklistData.length) : 0}%
          </p>
          <p className="text-xs text-gray-500">Avg Readiness</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]"><Loader className="w-6 h-6 animate-spin text-n0va-400" /></div>
      ) : campaigns.length === 0 ? (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <Megaphone className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No campaigns yet</h3>
          <p className="text-sm text-gray-500">Create a campaign to start using the launch checklist.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {checklistData.map(({ campaign, id, checklist, pct }) => {
            const isComplete = pct === 100;
            const isActive = campaign.status === "active";
            return (
              <div key={id} className={`card p-5 ${isActive ? "border-green-600/30" : isComplete ? "border-emerald-600/30" : ""}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-green-500/10" : isComplete ? "bg-emerald-500/10" : "bg-gray-800"}`}>
                      {isActive ? <CheckCircle className="w-5 h-5 text-green-400" /> : <Megaphone className={`w-5 h-5 ${isComplete ? "text-emerald-400" : "text-gray-500"}`} />}
                    </div>
                    <div>
                      <Link to={`/campaigns/${id}`} className="text-sm font-medium text-white hover:text-n0va-400 flex items-center gap-1.5">
                        {campaign.name} <ExternalLink className="w-3 h-3" />
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500 capitalize">{campaign.status}</span>
                        <span className={`text-xs font-medium ${isComplete ? "text-emerald-400" : pct > 50 ? "text-amber-400" : "text-gray-500"}`}>
                          {pct}% complete
                        </span>
                        {isActive && <span className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">Live</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => resetChecklist(id)} className="text-gray-600 hover:text-gray-400" title="Reset checklist">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-gray-800 rounded-full mb-4 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${isComplete ? "bg-emerald-500" : "bg-n0va-500"}`} style={{ width: `${pct}%` }} />
                </div>

                {/* Checklist items */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {items.map((item: ChecklistItem) => {
                    const checked = checklist.completed.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleItem(id, item.id)}
                        disabled={isActive}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-colors ${
                          checked
                            ? "border-emerald-500/20 bg-emerald-500/5"
                            : "border-gray-800 hover:border-gray-700 bg-transparent"
                        } ${isActive ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        {checked ? <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" /> : <Square className="w-4 h-4 text-gray-600 mt-0.5 shrink-0" />}
                        <div className="min-w-0">
                          <p className={`text-xs font-medium ${checked ? "text-emerald-300" : "text-gray-300"}`}>{item.label}</p>
                          <p className="text-[10px] text-gray-600 mt-0.5">{item.description}</p>
                        </div>
                      </button>
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
