import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Play, Pause, RotateCcw, Settings, X, TrendingUp, Activity, History, Eye, EyeOff, ExternalLink } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

export default function Agents() {
  const { addToast } = useToast();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDefaults, setShowDefaults] = useState(false);
  const [configAgent, setConfigAgent] = useState<any>(null);
  const [configForm, setConfigForm] = useState("");
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => { loadAgents(); }, []);

  async function loadAgents() {
    setLoading(true);
    try { setAgents(await api.agents.list()); } finally { setLoading(false); }
  }

  async function toggleAgent(id: string, currentStatus: string) {
    const newStatus = currentStatus === "running" ? "paused" : "running";
    try {
      await api.agents.updateStatus(id, newStatus);
      addToast("success", `Agent ${newStatus}`);
      loadAgents();
    } catch { addToast("error", "Failed to toggle agent"); }
  }

  async function setupDefaultAgents() {
    try {
      const defaults = await api.agents.defaults();
      for (const agent of defaults) { await api.agents.create(agent); }
      addToast("success", "Agent swarm deployed");
      loadAgents();
    } catch { addToast("error", "Failed to deploy agents"); }
  }

  async function handleSimulateRun(id: string) {
    try {
      await api.agents.recordRun(id, { success: true, actionsCount: Math.floor(Math.random() * 5) + 1 });
      addToast("success", "Run recorded");
      loadAgents();
    } catch { addToast("error", "Failed to record run"); }
  }

  function openConfig(agent: any) {
    setConfigAgent(agent);
    setConfigForm(JSON.stringify(agent.config || {}, null, 2));
    setShowConfig(true);
  }

  async function saveConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!configAgent) return;
    try {
      let parsed;
      try { parsed = JSON.parse(configForm); } catch { addToast("error", "Invalid JSON config"); return; }
      await api.agents.recordRun(configAgent._id, { success: true });
      addToast("success", "Configuration updated (simulated)");
      setShowConfig(false);
      setConfigAgent(null);
    } catch { addToast("error", "Failed to update config"); }
  }

  const agentIcons: Record<string, string> = { budget: "💰", creative: "🎨", audience: "👥", bid: "⚡", fraud: "🛡️" };
  const agentColors: Record<string, string> = {
    budget: "border-green-600/20 bg-green-500/5",
    creative: "border-purple-600/20 bg-purple-500/5",
    audience: "border-blue-600/20 bg-blue-500/5",
    bid: "border-yellow-600/20 bg-yellow-500/5",
    fraud: "border-red-600/20 bg-red-500/5",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Agents</h1>
          <p className="text-gray-500 mt-1">Autonomous agent swarm for 24/7 campaign optimization</p>
        </div>
        {agents.length === 0 && (
          <button className="btn-primary flex items-center gap-2" onClick={setupDefaultAgents}>
            <Bot className="w-4 h-4" /> Deploy Agent Swarm
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : agents.length === 0 ? (
        <div className="card text-center py-12">
          <Bot className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">No AI agents deployed. Deploy the full agent swarm for autonomous campaign management.</p>
          <button className="btn-primary" onClick={setupDefaultAgents}>Deploy 5 Specialist Agents</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <div key={agent._id} className={`card border ${agentColors[agent.type] || ""} hover:border-gray-700 transition-colors`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{agentIcons[agent.type] || "🤖"}</span>
                  <div>
                    <h3 className="text-white font-semibold">{agent.name}</h3>
                    <p className="text-xs text-gray-500 capitalize">{agent.type} agent</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/agents/${agent._id}`} className="text-gray-500 hover:text-n0va-400" title="View details">
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                  <button className="text-gray-500 hover:text-white" onClick={() => openConfig(agent)} title="Configure">
                    <Settings className="w-4 h-4" />
                  </button>
                  <span className={`badge ${agent.status === "running" ? "badge-active" : agent.status === "paused" ? "badge-paused" : agent.status === "error" ? "badge-archived" : "badge-draft"}`}>
                    {agent.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="bg-gray-800 rounded-lg p-2">
                  <p className="text-lg font-bold text-white">{agent.metrics?.runs || 0}</p>
                  <p className="text-xs text-gray-500">Runs</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2">
                  <p className="text-lg font-bold text-green-400">{agent.metrics?.successes || 0}</p>
                  <p className="text-xs text-gray-500" title="Success count">OK</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2">
                  <p className="text-lg font-bold text-white">{agent.metrics?.actionsTaken || 0}</p>
                  <p className="text-xs text-gray-500">Actions</p>
                </div>
              </div>

              <div className="text-xs text-gray-500 space-y-1 mb-3">
                <p>Frequency: {agent.frequency}</p>
                {agent.lastRun && <p>Last run: {new Date(agent.lastRun).toLocaleString()}</p>}
                {agent.lastError && <p className="text-red-400">Error: {agent.lastError}</p>}
                {agent.hitlThreshold && <p>HITL threshold: ${agent.hitlThreshold.toLocaleString()}</p>}
              </div>

              <div className="flex gap-2">
                <button
                  className={`flex-1 btn flex items-center justify-center gap-2 text-xs ${agent.status === "running" ? "btn-secondary" : "btn-primary"}`}
                  onClick={() => toggleAgent(agent._id, agent.status)}
                >
                  {agent.status === "running" ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Start</>}
                </button>
                {agent.status === "running" && (
                  <button className="btn-secondary flex items-center gap-1 text-xs" onClick={() => handleSimulateRun(agent._id)} title="Simulate Run">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {agent.metrics?.runs > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-800">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Activity className="w-3 h-3" />
                    <span>Success rate: {((agent.metrics.successes / agent.metrics.runs) * 100).toFixed(0)}%</span>
                    {agent.metrics.failures > 0 && <span className="text-red-400"> · {agent.metrics.failures} failures</span>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showConfig && configAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowConfig(false)}>
          <div className="w-full max-w-lg bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Configure: {configAgent.name}</h3>
              <button onClick={() => setShowConfig(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={saveConfig} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Config (JSON)</label>
                <textarea className="input font-mono text-xs" rows={10} value={configForm} onChange={(e) => setConfigForm(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" className="btn-secondary" onClick={() => setShowConfig(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Config</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
