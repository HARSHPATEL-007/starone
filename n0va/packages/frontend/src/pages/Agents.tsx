import { useEffect, useState } from "react";
import { Bot, Play, Pause, RotateCcw } from "lucide-react";
import { api } from "../api/client";

const agentIcons: Record<string, string> = {
  budget: "💰",
  creative: "🎨",
  audience: "👥",
  bid: "⚡",
  fraud: "🛡️",
};

export default function Agents() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAgents(); }, []);

  async function loadAgents() {
    setLoading(true);
    try { setAgents(await api.agents.list()); } finally { setLoading(false); }
  }

  async function toggleAgent(id: string, currentStatus: string) {
    const newStatus = currentStatus === "running" ? "paused" : "running";
    await api.agents.updateStatus(id, newStatus);
    loadAgents();
  }

  async function setupDefaultAgents() {
    const defaults = await api.agents.defaults();
    for (const agent of defaults) {
      await api.agents.create(agent);
    }
    loadAgents();
  }

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
        <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-n0va-500 border-t-transparent rounded-full" /></div>
      ) : agents.length === 0 ? (
        <div className="card text-center py-12">
          <Bot className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">No AI agents deployed. Deploy the full agent swarm for autonomous campaign management.</p>
          <button className="btn-primary" onClick={setupDefaultAgents}>Deploy 5 Specialist Agents</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <div key={agent._id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{agentIcons[agent.type] || "🤖"}</span>
                  <div>
                    <h3 className="text-white font-semibold">{agent.name}</h3>
                    <p className="text-xs text-gray-500 capitalize">{agent.type} agent</p>
                  </div>
                </div>
                <span className={`badge ${agent.status === "running" ? "badge-active" : agent.status === "paused" ? "badge-paused" : agent.status === "error" ? "badge-archived" : "badge-draft"}`}>
                  {agent.status}
                </span>
              </div>

              <div className="text-xs text-gray-500 space-y-1 mb-4">
                <p>Frequency: {agent.frequency}</p>
                {agent.lastRun && <p>Last run: {new Date(agent.lastRun).toLocaleString()}</p>}
                {agent.lastError && <p className="text-red-400">Error: {agent.lastError}</p>}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="bg-gray-800 rounded-lg p-2">
                  <p className="text-lg font-bold text-white">{agent.metrics?.runs || 0}</p>
                  <p className="text-xs text-gray-500">Runs</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2">
                  <p className="text-lg font-bold text-green-400">{agent.metrics?.successes || 0}</p>
                  <p className="text-xs text-gray-500">Success</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2">
                  <p className="text-lg font-bold text-white">{agent.metrics?.actionsTaken || 0}</p>
                  <p className="text-xs text-gray-500">Actions</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  className={`flex-1 btn flex items-center justify-center gap-2 ${agent.status === "running" ? "btn-secondary" : "btn-primary"}`}
                  onClick={() => toggleAgent(agent._id, agent.status)}
                >
                  {agent.status === "running" ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Start</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
