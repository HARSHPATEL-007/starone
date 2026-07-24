import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lightbulb, TrendingUp, DollarSign, AlertTriangle, CheckCircle, Target, Clock, Users, BarChart3, RefreshCw, Calendar } from "lucide-react";
import { api } from "../api/client";
import { SkeletonCard } from "../components/Skeleton";

interface Insight {
  id: string;
  type: "positive" | "warning" | "action" | "info";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  campaignId?: string;
  campaignName?: string;
  metric?: string;
  value?: string;
}

export default function CampaignInsights() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [fraudHealth, setFraudHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [filter, setFilter] = useState<string>("all");

  function generateInsights(camps: any[], fraud: any): Insight[] {
    const result: Insight[] = [];
    const now = Date.now();
    let id = 0;
    const nextId = () => `insight_${++id}`;

    for (const c of camps) {
      const budget = c.budget || {};
      const spent = budget.spent || 0;
      const lifetime = budget.lifetime || 0;
      const remaining = lifetime - spent;
      const pctUsed = lifetime > 0 ? (spent / lifetime) * 100 : 0;
      const start = c.startDate ? new Date(c.startDate).getTime() : null;
      const end = c.endDate ? new Date(c.endDate).getTime() : null;

      if (pctUsed >= 90 && c.status === "active") {
        result.push({
          id: nextId(), type: "warning", impact: "high",
          title: "Budget nearly exhausted",
          description: `"${c.name}" has used ${pctUsed.toFixed(0)}% of its $${lifetime.toLocaleString()} budget with $${remaining.toLocaleString()} remaining.`,
          campaignId: c._id, campaignName: c.name, metric: "Budget Utilization", value: `${pctUsed.toFixed(0)}%`,
        });
      }

      if (pctUsed <= 20 && c.status === "active" && end) {
        const daysLeft = Math.ceil((end - now) / 86400000);
        if (daysLeft > 0 && daysLeft < 14) {
          result.push({
            id: nextId(), type: "warning", impact: "medium",
            title: "Budget underutilized before end",
            description: `"${c.name}" ends in ${daysLeft} days but has only spent ${pctUsed.toFixed(0)}% of budget. Consider accelerating spend.`,
            campaignId: c._id, campaignName: c.name, metric: "Spend Pace", value: `${pctUsed.toFixed(0)}%`,
          });
        }
      }

      if (remaining < 0) {
        result.push({
          id: nextId(), type: "action", impact: "high",
          title: "Campaign is over budget",
          description: `"${c.name}" has exceeded its budget by $${Math.abs(remaining).toLocaleString()}. Increase the budget or pause the campaign.`,
          campaignId: c._id, campaignName: c.name, metric: "Overspend", value: `$${Math.abs(remaining).toLocaleString()}`,
        });
      }

      if (end && end < now && c.status === "active") {
        result.push({
          id: nextId(), type: "action", impact: "high",
          title: "Campaign ended but still active",
          description: `"${c.name}" ended ${Math.ceil((now - end) / 86400000)} days ago but is still active. Archive or extend it.`,
          campaignId: c._id, campaignName: c.name, metric: "Status", value: "Overdue",
        });
      }

      if (end && end > now && end - now < 7 * 86400000 && c.status === "active") {
        result.push({
          id: nextId(), type: "info", impact: "medium",
          title: "Campaign ending soon",
          description: `"${c.name}" ends in ${Math.ceil((end - now) / 86400000)} days. Plan ahead for extension or ramp-down.`,
          campaignId: c._id, campaignName: c.name, metric: "Days Left", value: `${Math.ceil((end - now) / 86400000)}d`,
        });
      }

      if (start && start > now && c.status === "draft") {
        result.push({
          id: nextId(), type: "positive", impact: "low",
          title: "Upcoming campaign ready to launch",
          description: `"${c.name}" starts in ${Math.ceil((start - now) / 86400000)} days and is ready. Review and activate it.`,
          campaignId: c._id, campaignName: c.name, metric: "Starts In", value: `${Math.ceil((start - now) / 86400000)}d`,
        });
      }

      if (pctUsed >= 50 && pctUsed < 90 && spent > 0 && c.status === "active") {
        const pacing = lifetime > 0 && end ? ((now - (start || now)) / (end - (start || now))) * 100 : 0;
        if (pacing > 0 && pctUsed < pacing - 15) {
          result.push({
            id: nextId(), type: "info", impact: "low",
            title: "Campaign is underspending",
            description: `"${c.name}" is spending slower than planned (${pctUsed.toFixed(0)}% used vs ${pacing.toFixed(0)}% time elapsed). Consider boosting delivery.`,
            campaignId: c._id, campaignName: c.name, metric: "vs Pace", value: `${(pctUsed - pacing).toFixed(0)}%`,
          });
        }
        if (pacing > 0 && pctUsed > pacing + 15) {
          result.push({
            id: nextId(), type: "warning", impact: "medium",
            title: "Campaign is overspending",
            description: `"${c.name}" is spending faster than planned (${pctUsed.toFixed(0)}% used vs ${pacing.toFixed(0)}% time). May run out early.`,
            campaignId: c._id, campaignName: c.name, metric: "vs Pace", value: `+${(pctUsed - pacing).toFixed(0)}%`,
          });
        }
      }
    }

    if (camps.length === 0) {
      result.push({
        id: nextId(), type: "info", impact: "low",
        title: "No campaigns yet",
        description: "Create your first campaign to start seeing insights and recommendations.",
      });
    }

    const totalBudget = camps.reduce((s, c) => s + (c.budget?.lifetime || 0), 0);
    const totalSpent = camps.reduce((s, c) => s + (c.budget?.spent || 0), 0);
    const activeCamps = camps.filter((c) => c.status === "active").length;
    const pausedCamps = camps.filter((c) => c.status === "paused").length;
    const draftCamps = camps.filter((c) => c.status === "draft").length;

    result.push({
      id: nextId(), type: "info", impact: "low",
      title: "Portfolio Summary",
      description: `${activeCamps} active, ${pausedCamps} paused, ${draftCamps} draft campaigns. Total budget: $${totalBudget.toLocaleString()}, spent: $${totalSpent.toLocaleString()}.`,
      metric: "Campaigns", value: `${camps.length}`,
    });

    const platformCount: Record<string, number> = {};
    for (const c of camps) {
      for (const p of c.platforms || []) {
        platformCount[p] = (platformCount[p] || 0) + 1;
      }
    }
    const topPlatform = Object.entries(platformCount).sort((a, b) => b[1] - a[1])[0];
    if (topPlatform) {
      result.push({
        id: nextId(), type: "info", impact: "low",
        title: "Most used platform",
        description: `${topPlatform[0].charAt(0).toUpperCase() + topPlatform[0].slice(1)} is used in ${topPlatform[1]} of ${camps.length} campaigns.`,
        metric: "Platform", value: topPlatform[0],
      });
    }

    if (fraud) {
      if (fraud.activeFlags > 0) {
        result.push({
          id: nextId(), type: "warning", impact: "high",
          title: "Active fraud flags detected",
          description: `${fraud.activeFlags} fraud flags are active (${fraud.criticalFlags || 0} critical). Review the Fraud Center immediately.`,
          metric: "Flags", value: `${fraud.activeFlags}`,
        });
      }
      if (fraud.overallHealth === "good") {
        result.push({
          id: nextId(), type: "positive", impact: "low",
          title: "Fraud health is good",
          description: "No critical fraud issues detected. Your campaigns are running in a safe environment.",
          metric: "Health", value: "Good",
        });
      }
    }

    return result;
  }

  useEffect(() => {
    Promise.all([
      api.campaigns.list().then((r) => Array.isArray(r) ? r : r.campaigns || []).catch(() => []),
      api.fraud.health().catch(() => null),
    ]).then(([camps, fraud]) => {
      setCampaigns(camps);
      setFraudHealth(fraud);
      setInsights(generateInsights(camps, fraud));
      setLoading(false);
    });
  }, []);

  function refreshInsights() {
    setLoading(true);
    Promise.all([
      api.campaigns.list().then((r) => Array.isArray(r) ? r : r.campaigns || []).catch(() => []),
      api.fraud.health().catch(() => null),
    ]).then(([camps, fraud]) => {
      setCampaigns(camps);
      setFraudHealth(fraud);
      setInsights(generateInsights(camps, fraud));
      setLoading(false);
    });
  }

  const filteredInsights = filter === "all" ? insights : insights.filter((i) => i.type === filter);

  const counts = {
    all: insights.length,
    positive: insights.filter((i) => i.type === "positive").length,
    warning: insights.filter((i) => i.type === "warning").length,
    action: insights.filter((i) => i.type === "action").length,
    info: insights.filter((i) => i.type === "info").length,
  };

  const impactColors: Record<string, string> = {
    high: "bg-red-500/10 border-red-500/30 text-red-400",
    medium: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
    low: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  };

  const typeIcons: Record<string, any> = {
    positive: CheckCircle,
    warning: AlertTriangle,
    action: TrendingUp,
    info: Lightbulb,
  };

  const typeColors: Record<string, string> = {
    positive: "text-green-400 bg-green-500/10",
    warning: "text-yellow-400 bg-yellow-500/10",
    action: "text-n0va-400 bg-n0va-500/10",
    info: "text-blue-400 bg-blue-500/10",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Campaign Insights</h1>
            <p className="text-sm text-gray-500">Automated analysis and recommendations for your campaigns</p>
          </div>
        </div>
        <button onClick={refreshInsights} className="btn-secondary text-sm flex items-center gap-1.5" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-3">
            {(["all", "warning", "action", "positive"] as const).map((t) => (
              <button key={t} onClick={() => setFilter(t)} className={`card text-center p-4 transition-all ${filter === t ? "ring-2 ring-n0va-500" : ""}`}>
                <p className="text-2xl font-bold text-white">{counts[t]}</p>
                <p className="text-xs text-gray-500 capitalize">{t === "all" ? "Total Insights" : t === "positive" ? "Positive" : t === "warning" ? "Warnings" : "Actions Needed"}</p>
              </button>
            ))}
          </div>

          {filteredInsights.length === 0 ? (
            <div className="card text-center py-12">
              <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
              <p className="text-gray-500">No {filter === "all" ? "" : filter} insights — everything looks good!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInsights.map((insight) => {
                const Icon = typeIcons[insight.type];
                return (
                  <div key={insight.id} className={`card border-l-4 ${insight.type === "positive" ? "border-l-green-500" : insight.type === "warning" ? "border-l-yellow-500" : insight.type === "action" ? "border-l-n0va-500" : "border-l-blue-500"}`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeColors[insight.type]}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-white">{insight.title}</h3>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${impactColors[insight.impact]}`}>
                            {insight.impact}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{insight.description}</p>
                        {insight.campaignId && (
                          <button onClick={() => navigate(`/campaigns/${insight.campaignId}`)} className="text-xs text-n0va-400 hover:text-n0va-300 mt-1.5 inline-flex items-center gap-1">
                            <Target className="w-3 h-3" /> View campaign
                          </button>
                        )}
                      </div>
                      {insight.metric && (
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-gray-600">{insight.metric}</p>
                          <p className="text-sm font-bold text-white">{insight.value}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
