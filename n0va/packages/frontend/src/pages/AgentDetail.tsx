import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Bot, Play, Pause, Trash2, Settings, Activity, RefreshCw, TrendingUp, Clock, CheckCircle, XCircle, ListChecks } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const agentIcons: Record<string, string> = { budget: "💰", creative: "🎨", audience: "👥", bid: "⚡", fraud: "🛡️" };

export default function AgentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [agent, setAgent] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => { if (id) loadAgent(); }, [id]);

  async function loadAgent() {
    if (!id) return;
    setLoading(true);
    try {
      const [agentData, activityData] = await Promise.all([
        api.agents.get(id),
        api.activity.list(`entityType=agent&entityId=${id}&limit=20`).catch(() => []),
      ]);
      setAgent(agentData);
      setActivities(Array.isArray(activityData) ? activityData : []);
    } catch {
      addToast("error", "Agent not found");
      navigate("/agents");
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus() {
    if (!agent) return;
    const newStatus = agent.status === "running" ? "paused" : "running";
    try {
      const updated = await api.agents.updateStatus(agent._id, newStatus);
      setAgent(updated);
      addToast("success", `Agent ${newStatus}`);
    } catch {
      addToast("error", "Failed to toggle agent");
    }
  }

  async function handleDelete() {
    if (!id) return;
    try {
      await api.agents.delete(id);
      addToast("success", "Agent deleted");
      navigate("/agents");
    } catch {
      addToast("error", "Failed to delete agent");
    }
  }

  async function handleSimulateRun() {
    if (!agent) return;
    try {
      const updated = await api.agents.recordRun(agent._id, { success: true, actionsCount: Math.floor(Math.random() * 5) + 1 });
      setAgent(updated);
      await api.activity.create({
        entityType: "agent",
        entityId: agent._id,
        entityName: agent.name,
        action: "run",
        details: `Simulated run with ${Math.floor(Math.random() * 5) + 1} actions`,
      });
      addToast("success", "Run recorded");
      loadAgent();
    } catch {
      addToast("error", "Failed to record run");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-5 w-5 bg-gray-800 rounded animate-pulse" />
          <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SkeletonCard />
          <div className="lg:col-span-2"><SkeletonCard /></div>
        </div>
      </div>
    );
  }

  if (!agent) return null;

  const metrics = agent.metrics || { runs: 0, successes: 0, failures: 0, actionsTaken: 0 };
  const successRate = metrics.runs > 0 ? ((metrics.successes / metrics.runs) * 100).toFixed(0) : "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/agents")} className="text-gray-500 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-3xl">{agentIcons[agent.type] || "🤖"}</span>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
              <span className={`badge ${agent.status === "running" ? "badge-active" : agent.status === "paused" ? "badge-paused" : agent.status === "error" ? "badge-archived" : "badge-draft"}`}>
                {agent.status}
              </span>
            </div>
            <p className="text-gray-500 mt-0.5">{agent.type} agent · {agent.frequency}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary flex items-center gap-2" onClick={loadAgent}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button className={`btn flex items-center gap-2 ${agent.status === "running" ? "btn-secondary" : "btn-primary"}`} onClick={toggleStatus}>
            {agent.status === "running" ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Start</>}
          </button>
          <button className="btn-danger" onClick={() => setShowDelete(true)}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-3">Performance</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-white">{metrics.runs}</p>
                  <p className="text-xs text-gray-500">Total Runs</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-400">{successRate}{successRate !== "—" ? "%" : ""}</p>
                  <p className="text-xs text-gray-500">Success Rate</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-green-400">{metrics.successes}</p>
                  <p className="text-xs text-gray-500">Successes</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-red-400">{metrics.failures}</p>
                  <p className="text-xs text-gray-500">Failures</p>
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-white">{metrics.actionsTaken}</p>
                <p className="text-xs text-gray-500">Actions Taken</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-3">Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Type</span>
                <span className="text-white capitalize">{agent.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Frequency</span>
                <span className="text-white">{agent.frequency}</span>
              </div>
              {agent.lastRun && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Run</span>
                  <span className="text-white text-xs">{new Date(agent.lastRun).toLocaleString()}</span>
                </div>
              )}
              {agent.hitlThreshold && (
                <div className="flex justify-between">
                  <span className="text-gray-500">HITL Threshold</span>
                  <span className="text-white">${agent.hitlThreshold.toLocaleString()}</span>
                </div>
              )}
              {agent.lastError && (
                <div className="pt-2">
                  <p className="text-gray-500 text-xs mb-1">Last Error</p>
                  <p className="text-red-400 text-xs bg-gray-800 rounded p-2">{agent.lastError}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Activity & Actions</h3>
              <button className="btn-secondary text-xs py-1.5 flex items-center gap-1.5" onClick={handleSimulateRun} disabled={agent.status !== "running"}>
                <Activity className="w-3.5 h-3.5" /> Simulate Run
              </button>
            </div>
            {activities.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {activities.map((a: any) => (
                  <div key={a._id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50">
                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${a.action === "run" || a.action === "success" ? "bg-green-400" : a.action === "error" || a.action === "failure" ? "bg-red-400" : "bg-yellow-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{a.details || a.action}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500 capitalize">{a.action}</span>
                        <span className="text-xs text-gray-600">·</span>
                        <span className="text-xs text-gray-500">{a.timestamp ? new Date(a.timestamp).toLocaleString() : ""}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Activity className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                  <p className="text-sm">No activity recorded yet</p>
                  <p className="text-xs text-gray-600 mt-1">Simulate a run or wait for the agent to execute</p>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Configuration</h3>
            {agent.config && Object.keys(agent.config).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(agent.config).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-3 p-2 bg-gray-800/50 rounded-lg">
                    <Settings className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 font-mono">{key}</p>
                      <p className="text-sm text-white font-mono truncate">{String(value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Settings className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                <p className="text-sm">No custom configuration</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm bg-n0va-800 rounded-xl border border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Agent</h3>
            <p className="text-sm text-gray-400 mb-4">Are you sure you want to delete {agent.name}?</p>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setShowDelete(false)}>Cancel</button>
              <button className="btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
