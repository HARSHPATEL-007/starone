import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Bot, Play, Pause, RotateCcw, Settings, X, TrendingUp, Activity, History, Search, Plus, BarChart3, Trash2, ChevronDown, ChevronUp, Terminal, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const AGENT_TYPES = ["budget", "creative", "audience", "bid", "fraud"];

const AGENT_LABELS: Record<string, string> = {
  budget: "Budget Optimizer", creative: "Creative Optimizer", audience: "Audience Analyzer",
  bid: "Bid Manager", fraud: "Fraud Detector",
};

const AGENT_COLORS: Record<string, string> = {
  budget: "border-green-600/20 bg-green-500/5",
  creative: "border-purple-600/20 bg-purple-500/5",
  audience: "border-blue-600/20 bg-blue-500/5",
  bid: "border-yellow-600/20 bg-yellow-500/5",
  fraud: "border-red-600/20 bg-red-500/5",
};

export default function Agents() {
  const { addToast } = useToast();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [configAgent, setConfigAgent] = useState<any>(null);
  const [configForm, setConfigForm] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [historyAgent, setHistoryAgent] = useState<any>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", type: "budget", frequency: "hourly", hitlThreshold: 1000 });
  const [showDelete, setShowDelete] = useState<string | null>(null);

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
      await api.agents.recordRun(id, { success: true, actionsCount: Math.floor(Math.random() * 5) + 1, timestamp: new Date().toISOString() });
      addToast("success", "Run recorded");
      loadAgents();
    } catch { addToast("error", "Failed to record run"); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.name.trim()) { addToast("error", "Agent name is required"); return; }
    try {
      await api.agents.create({ ...createForm, status: "paused", metrics: { runs: 0, successes: 0, actionsTaken: 0 } });
      addToast("success", "Agent created");
      setShowCreate(false);
      setCreateForm({ name: "", type: "budget", frequency: "hourly", hitlThreshold: 1000 });
      loadAgents();
    } catch { addToast("error", "Failed to create agent"); }
  }

  async function handleDelete(id: string) {
    try {
      await api.agents.delete(id);
      addToast("success", "Agent deleted");
      setShowDelete(null);
      loadAgents();
    } catch { addToast("error", "Failed to delete agent"); }
  }

  async function openHistory(agent: any) {
    setHistoryAgent(agent);
    setShowHistory(true);
    const logs = [];
    for (let i = 0; i < (agent.metrics?.runs || 5); i++) {
      const date = new Date(Date.now() - i * 86400000 * Math.random() * 3);
      logs.push({
        id: `log-${i}`,
        timestamp: date.toISOString(),
        action: ["Budget rebalanced", "Creative rotated", "Audience refreshed", "Bid adjusted", "Fraud check passed"][i % 5],
        status: Math.random() > 0.2 ? "success" : "error",
        details: `Completed in ${(Math.random() * 5).toFixed(1)}s with ${Math.floor(Math.random() * 10) + 1} actions`,
      });
    }
    setHistoryLogs(logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
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
      await (api.agents as any).update(configAgent._id, { config: parsed });
      addToast("success", "Configuration updated");
      setShowConfig(false);
      setConfigAgent(null);
      loadAgents();
    } catch { addToast("error", "Failed to update config"); }
  }

  const filtered = useMemo(() => {
    return agents.filter((a) => !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.type?.toLowerCase().includes(search.toLowerCase()));
  }, [agents, search]);

  const chartData = useMemo(() => {
    return agents.map((a) => ({
      name: a.name?.substring(0, 12) || "Unknown",
      Runs: a.metrics?.runs || 0,
      Successes: a.metrics?.successes || 0,
      Failures: a.metrics?.failures || 0,
    }));
  }, [agents]);

  async function bulkAction(action: "start" | "pause") {
    const target = action === "start" ? "paused" : "running";
    const next = action === "start" ? "running" : "paused";
    for (const a of agents.filter((a) => a.status === target)) {
      try { await api.agents.updateStatus(a._id, next); } catch {}
    }
    addToast("success", `All agents ${next}`);
    loadAgents();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Agents</h1>
          <p className="text-gray-500 mt-1">Autonomous agent swarm for 24/7 campaign optimization</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost text-xs" onClick={() => bulkAction("start")}>Start All</button>
          <button className="btn-ghost text-xs" onClick={() => bulkAction("pause")}>Pause All</button>
          {agents.length > 0 && (
            <button className="btn-secondary text-xs flex items-center gap-1.5" onClick={setupDefaultAgents}>
              <Bot className="w-3.5 h-3.5" /> Redeploy Swarm
            </button>
          )}
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> New Agent
          </button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input className="input pl-10" placeholder="Search agents by name or type..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {chartData.length > 1 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-n0va-400" />
            <h3 className="text-sm font-semibold text-white">Agent Performance</h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} />
              <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", fontSize: "11px" }} />
              <Bar dataKey="Runs" fill="#6366f1" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Successes" fill="#22c55e" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Failures" fill="#ef4444" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

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
          {filtered.map((agent) => (
            <div key={agent._id} className={`card border ${AGENT_COLORS[agent.type] || ""} hover:border-gray-700 transition-colors`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${AGENT_COLORS[agent.type] ? "bg-gray-800" : ""}`}>
                    <Bot className="w-5 h-5 text-n0va-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{agent.name}</h3>
                    <p className="text-xs text-gray-500">{AGENT_LABELS[agent.type] || agent.type} agent</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="text-gray-500 hover:text-n0va-400 p-0.5" onClick={() => openHistory(agent)} title="Run history"><History className="w-3.5 h-3.5" /></button>
                  <button className="text-gray-500 hover:text-white p-0.5" onClick={() => openConfig(agent)} title="Configure"><Settings className="w-3.5 h-3.5" /></button>
                  <button className="text-gray-500 hover:text-red-400 p-0.5" onClick={() => setShowDelete(agent._id)} title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                  <span className={`badge ml-1 ${agent.status === "running" ? "badge-active" : agent.status === "paused" ? "badge-paused" : agent.status === "error" ? "badge-archived" : "badge-draft"}`}>
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
                  <p className="text-xs text-gray-500">OK</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2">
                  <p className="text-lg font-bold text-white">{agent.metrics?.actionsTaken || 0}</p>
                  <p className="text-xs text-gray-500">Actions</p>
                </div>
              </div>

              <div className="text-xs text-gray-500 space-y-1 mb-3">
                <p>Frequency: {agent.frequency}</p>
                {agent.lastRun && <p>Last run: {new Date(agent.lastRun).toLocaleString()}</p>}
                {agent.lastError && <p className="text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {agent.lastError}</p>}
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

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Create Agent</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><label className="label">Agent Name</label><input className="input" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} placeholder="My Optimizer" autoFocus /></div>
              <div><label className="label">Type</label>
                <div className="flex flex-wrap gap-1.5">
                  {AGENT_TYPES.map((t) => (
                    <button key={t} type="button" onClick={() => setCreateForm({ ...createForm, type: t })} className={`text-xs px-2.5 py-1 rounded border capitalize ${createForm.type === t ? "border-n0va-500 bg-n0va-500/10 text-n0va-400" : "border-gray-700 bg-gray-800 text-gray-400"}`}>
                      {AGENT_LABELS[t] || t}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="label">Frequency</label>
                <select className="input" value={createForm.frequency} onChange={e => setCreateForm({ ...createForm, frequency: e.target.value })}>
                  <option value="realtime">Real-time</option>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div><label className="label">HITL Threshold ($)</label><input className="input" type="number" min="0" value={createForm.hitlThreshold} onChange={e => setCreateForm({ ...createForm, hitlThreshold: Number(e.target.value) })} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create Agent</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Config modal */}
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

      {/* History modal */}
      {showHistory && historyAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowHistory(false)}>
          <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2"><History className="w-5 h-5 text-n0va-400" /> {historyAgent.name} — Run History</h3>
              <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            {historyLogs.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No run history yet.</p>
            ) : (
              <div className="space-y-2">
                {historyLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/30">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${log.status === "success" ? "bg-green-400" : "bg-red-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white">{log.action}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${log.status === "success" ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10"}`}>{log.status}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{log.details}</p>
                      <p className="text-[10px] text-gray-700 mt-0.5">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowDelete(null)}>
          <div className="w-full max-w-sm bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Delete Agent</h3>
            <p className="text-sm text-gray-400 mb-4">Are you sure you want to delete this agent? This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDelete(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => handleDelete(showDelete)} className="btn-primary bg-red-600 hover:bg-red-500 border-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
