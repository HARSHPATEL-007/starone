import { useState, useEffect, useCallback } from "react";
import { GitBranch, Plus, X, Edit3, Trash2, Play, Square, Power, TestTube, ListChecks, Activity, Eye, ChevronRight, ChevronDown, Circle, Diamond, Zap, Clock, Split, Merge, ArrowRight, Terminal, History, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "../components/Toast";
import { api } from "../api/client";

interface WorkflowNode {
  id: string;
  type: "trigger" | "condition" | "action" | "delay" | "split" | "merge";
  label: string;
  config: Record<string, any>;
  posX: number;
  posY: number;
}

interface WorkflowEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  condition?: string;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  category: string;
  status: "draft" | "active" | "paused" | "archived";
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  runCount: number;
  successCount: number;
  lastRun: string | null;
  createdAt: string;
  updatedAt: string;
}

interface NodeTypeDef {
  type: string;
  label: string;
  description: string;
  configFields: { key: string; label: string; type: string; required: boolean; options?: string[] }[];
}

interface ExecutionLog {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  nodeId?: string;
}

interface Execution {
  id: string;
  status: "running" | "success" | "failure";
  startedAt: string;
  completedAt: string | null;
  trigger?: string;
  log: ExecutionLog[];
}

const NODE_TYPE_META: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  trigger: { label: "Trigger", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/40", icon: Zap },
  condition: { label: "Condition", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/40", icon: Diamond },
  action: { label: "Action", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/40", icon: Play },
  delay: { label: "Delay", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/40", icon: Clock },
  split: { label: "Split", color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/40", icon: Split },
  merge: { label: "Merge", color: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/40", icon: Merge },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "text-gray-400", bg: "bg-gray-500/10" },
  active: { label: "Active", color: "text-green-400", bg: "bg-green-500/10" },
  paused: { label: "Paused", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  archived: { label: "Archived", color: "text-gray-500", bg: "bg-gray-500/10" },
};

const NODE_TYPES = ["trigger", "condition", "action", "delay", "split", "merge"] as const;

const NODE_W = 160;
const NODE_H = 60;
const NODE_GAP_X = 200;
const NODE_GAP_Y = 100;

function timeAgo(date: string | null): string {
  if (!date) return "Never";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString();
}

export default function WorkflowBuilder() {
  const { addToast } = useToast();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [nodeTypeDefs, setNodeTypeDefs] = useState<NodeTypeDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Workflow | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "", category: "" });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [testRunResult, setTestRunResult] = useState<Execution | null>(null);
  const [testRunning, setTestRunning] = useState(false);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [showExecutions, setShowExecutions] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    Promise.all([
      api.workflowBuilder.list(),
      api.workflowBuilder.categories(),
      api.workflowBuilder.nodeTypes(),
    ]).then(([w, c, nt]) => {
      setWorkflows((w || []).map((wf: any) => ({ nodes: [], edges: [], runCount: 0, successCount: 0, ...wf })));
      setCategories(c || []);
      setNodeTypeDefs(nt || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    try {
      const wf = await api.workflowBuilder.get(id);
      setDetail({ nodes: [], edges: [], runCount: 0, successCount: 0, ...wf });
    } catch { addToast("error", "Failed to load workflow"); }
  }, [addToast]);

  useEffect(() => {
    if (selectedId) { loadDetail(selectedId); setTestRunResult(null); setExecutions([]); setShowExecutions(false); }
    else { setDetail(null); setSelectedNodeId(null); }
  }, [selectedId, loadDetail]);

  function handleSelect(id: string) {
    setSelectedId(prev => prev === id ? null : id);
  }

  function handleCreate() {
    if (!createForm.name.trim()) { addToast("error", "Workflow name is required"); return; }
    api.workflowBuilder.create({ name: createForm.name.trim(), description: createForm.description.trim(), category: createForm.category }).then((created: Workflow) => {
      setWorkflows(prev => [{ ...created, nodes: created.nodes ?? [], edges: created.edges ?? [], runCount: created.runCount ?? 0, successCount: created.successCount ?? 0 }, ...prev]);
      addToast("success", "Workflow created");
      setShowCreateModal(false);
      setCreateForm({ name: "", description: "", category: "" });
    }).catch(() => addToast("error", "Failed to create workflow"));
  }

  function handleDelete(id: string) {
    const name = workflows.find(w => w.id === id)?.name;
    api.workflowBuilder.delete(id).then(() => {
      setWorkflows(prev => prev.filter(w => w.id !== id));
      if (selectedId === id) setSelectedId(null);
      addToast("success", `"${name}" deleted`);
    }).catch(() => addToast("error", "Failed to delete workflow"));
  }

  function handleActivate(id: string) {
    api.workflowBuilder.activate(id).then(() => {
      setWorkflows(prev => prev.map(w => w.id === id ? { ...w, status: "active" } : w));
      if (detail?.id === id) setDetail(prev => prev ? { ...prev, status: "active" } : null);
      addToast("success", "Workflow activated");
    }).catch(() => addToast("error", "Failed to activate workflow"));
  }

  function handleDeactivate(id: string) {
    api.workflowBuilder.deactivate(id).then(() => {
      setWorkflows(prev => prev.map(w => w.id === id ? { ...w, status: "paused" } : w));
      if (detail?.id === id) setDetail(prev => prev ? { ...prev, status: "paused" } : null);
      addToast("success", "Workflow paused");
    }).catch(() => addToast("error", "Failed to pause workflow"));
  }

  async function handleTestRun(id: string) {
    setTestRunning(true);
    setTestRunResult(null);
    try {
      const result = await api.workflowBuilder.testRun(id);
      setTestRunResult(result);
      addToast("success", "Test run completed");
    } catch {
      addToast("error", "Test run failed");
    } finally {
      setTestRunning(false);
    }
  }

  async function loadExecutions(id: string) {
    try {
      const ex = await api.workflowBuilder.executions(id);
      setExecutions(ex || []);
    } catch { addToast("error", "Failed to load executions"); }
  }

  function updateNode(id: string, field: string, value: any) {
    if (!detail) return;
    setDetail({
      ...detail,
      nodes: detail.nodes.map(n => n.id === id ? { ...n, [field]: value } : n),
    });
  }

  function updateNodeConfig(id: string, key: string, value: any) {
    if (!detail) return;
    setDetail({
      ...detail,
      nodes: detail.nodes.map(n => n.id === id ? { ...n, config: { ...n.config, [key]: value } } : n),
    });
  }

  function addNode(type: WorkflowNode["type"]) {
    if (!detail) return;
    const count = detail.nodes.filter(n => n.type === type).length;
    const id = `${type}_${Date.now()}`;
    const existing = detail.nodes;
    const lastY = existing.length > 0 ? Math.max(...existing.map(n => n.posY)) + NODE_GAP_Y + NODE_H : 40;
    const rowCount = existing.filter(n => n.posY === lastY - NODE_GAP_Y - NODE_H).length;
    const newY = existing.length > 0 && rowCount < 2 ? lastY - NODE_GAP_Y - NODE_H : lastY;
    const rowExisting = existing.filter(n => Math.abs(n.posY - newY) < 10);
    const newX = rowExisting.length > 0 ? Math.max(...rowExisting.map(n => n.posX)) + NODE_GAP_X : 40;
    setDetail({
      ...detail,
      nodes: [...detail.nodes, { id, type, label: `New ${type}`, config: {}, posX: newX, posY: newY }],
    });
  }

  function removeNode(id: string) {
    if (!detail) return;
    setDetail({
      ...detail,
      nodes: detail.nodes.filter(n => n.id !== id),
      edges: detail.edges.filter(e => e.from !== id && e.to !== id),
    });
    if (selectedNodeId === id) setSelectedNodeId(null);
  }

  function addEdge() {
    if (!detail || detail.nodes.length < 2) { addToast("error", "Need at least 2 nodes to connect"); return; }
    const unconnected: WorkflowNode[] = [];
    const hasFrom = new Set(detail.edges.map(e => e.from));
    const hasTo = new Set(detail.edges.map(e => e.to));
    for (const node of detail.nodes) {
      if (!hasFrom.has(node.id) || !hasTo.has(node.id)) unconnected.push(node);
    }
    const from = unconnected.find(n => !hasFrom.has(n.id)) || detail.nodes[detail.nodes.length - 2];
    const to = unconnected.find(n => !hasTo.has(n.id) && n.id !== from.id) || detail.nodes[detail.nodes.length - 1];
    if (from.id === to.id) return;
    if (detail.edges.some(e => e.from === from.id && e.to === to.id)) { addToast("warning", "Edge already exists"); return; }
    setDetail({
      ...detail,
      edges: [...detail.edges, { id: `e_${Date.now()}`, from: from.id, to: to.id, label: "", condition: "" }],
    });
  }

  function updateEdge(id: string, field: string, value: any) {
    if (!detail) return;
    setDetail({
      ...detail,
      edges: detail.edges.map(e => e.id === id ? { ...e, [field]: value } : e),
    });
  }

  function removeEdge(id: string) {
    if (!detail) return;
    setDetail({ ...detail, edges: detail.edges.filter(e => e.id !== id) });
  }

  async function handleSaveDetail() {
    if (!detail) return;
    try {
      await api.workflowBuilder.update(detail.id, { nodes: detail.nodes, edges: detail.edges } as any);
      setWorkflows(prev => prev.map(w => w.id === detail.id ? { ...detail } : w));
      addToast("success", "Workflow saved");
    } catch { addToast("error", "Failed to save workflow"); }
  }

  function getNodeTypeDef(type: string): NodeTypeDef | undefined {
    return nodeTypeDefs.find(d => d.type === type);
  }

  const filtered = workflows.filter(w => {
    if (categoryFilter !== "all" && w.category !== categoryFilter) return false;
    if (statusFilter !== "all" && w.status !== statusFilter) return false;
    return true;
  });

  const allStatuses = ["draft", "active", "paused", "archived"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <GitBranch className="w-6 h-6 text-n0va-400" />
            Workflow Builder
          </h1>
          <p className="text-gray-400 mt-1">{workflows.length} workflows · {workflows.filter(w => w.status === "active").length} active</p>
        </div>
        {!selectedId && (
          <button onClick={() => setShowCreateModal(true)} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New Workflow
          </button>
        )}
      </div>

      {!selectedId && (
        <div className="flex items-center gap-3 flex-wrap">
          <select className="input text-sm w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            {allStatuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select className="input text-sm w-auto" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(statusFilter !== "all" || categoryFilter !== "all") && (
            <button onClick={() => { setStatusFilter("all"); setCategoryFilter("all"); }} className="text-xs text-gray-500 hover:text-gray-300">Clear</button>
          )}
        </div>
      )}

      {selectedId && detail && (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedId(null)} className="btn-ghost text-xs px-2 py-1"><ChevronRight className="w-3 h-3 rotate-180" /> Back</button>
                <div>
                  <h2 className="text-lg font-semibold text-white">{detail.name}</h2>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                    <span className="flex items-center gap-1">{detail.category && <span>{detail.category}</span>}</span>
                    <span>{detail.nodes.length} nodes · {detail.edges.length} edges</span>
                    <span>{detail.runCount} runs</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${STATUS_META[detail.status]?.bg || "bg-gray-500/10"} ${STATUS_META[detail.status]?.color || "text-gray-400"}`}>
                  <Circle className="w-2 h-2 fill-current" />
                  {STATUS_META[detail.status]?.label || detail.status}
                </span>
                {detail.status === "active" ? (
                  <button onClick={() => handleDeactivate(detail.id)} className="btn-ghost text-xs flex items-center gap-1"><Power className="w-3 h-3" /> Deactivate</button>
                ) : detail.status !== "archived" && (
                  <button onClick={() => handleActivate(detail.id)} className="btn-ghost text-xs flex items-center gap-1 text-green-400"><Power className="w-3 h-3" /> Activate</button>
                )}
                <button onClick={() => handleTestRun(detail.id)} disabled={testRunning} className="btn-ghost text-xs flex items-center gap-1">
                  {testRunning ? <Activity className="w-3 h-3 animate-pulse" /> : <TestTube className="w-3 h-3" />}
                  {testRunning ? "Running..." : "Test Run"}
                </button>
                <button onClick={handleSaveDetail} className="btn-primary text-xs flex items-center gap-1"><Edit3 className="w-3 h-3" /> Save</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 space-y-4">
              <div className="card p-0 overflow-hidden">
                <div className="bg-gray-800/50 border-b border-gray-800 px-4 py-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-400">Workflow Canvas</span>
                  <div className="flex items-center gap-1">
                    {NODE_TYPES.map(t => {
                      const meta = NODE_TYPE_META[t];
                      const NI = meta.icon;
                      return (
                        <button key={t} onClick={() => addNode(t)} className={`text-[10px] px-2 py-1 rounded flex items-center gap-1 ${meta.bg} ${meta.color} hover:opacity-80`}>
                          <NI className="w-3 h-3" /> {meta.label}
                        </button>
                      );
                    })}
                    <button onClick={addEdge} className="text-[10px] px-2 py-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 flex items-center gap-1"><ArrowRight className="w-3 h-3" /> Connect</button>
                  </div>
                </div>
                <div className="relative min-h-[500px] bg-[#0a0e1a] overflow-auto">
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ minWidth: "100%", minHeight: "100%" }}>
                    {detail.edges.map(edge => {
                      const from = detail.nodes.find(n => n.id === edge.from);
                      const to = detail.nodes.find(n => n.id === edge.to);
                      if (!from || !to) return null;
                      const x1 = from.posX + NODE_W / 2;
                      const y1 = from.posY + NODE_H;
                      const x2 = to.posX + NODE_W / 2;
                      const y2 = to.posY;
                      const midX = (x1 + x2) / 2;
                      const midY = (y1 + y2) / 2;
                      const fromMeta = NODE_TYPE_META[from.type];
                      const toMeta = NODE_TYPE_META[to.type];
                      const strokeColor = fromMeta?.color?.replace("text-", "#") || "#6b7280";
                      return (
                        <g key={edge.id}>
                          <path d={`M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`} fill="none" stroke="#6b7280" strokeWidth="1.5" />
                          <circle cx={x2} cy={y2} r="3" fill="#6b7280" />
                          <rect x={midX - 40} y={midY - 8} width="80" height="16" rx="4" fill="#1f2937" stroke="#374151" strokeWidth="1" />
                          <text x={midX} y={midY + 3} textAnchor="middle" fill="#9ca3af" fontSize="8" className="pointer-events-auto cursor-pointer"
                            onClick={() => updateEdge(edge.id, "label", prompt("Edge label:", edge.label) || edge.label)}>
                            {edge.condition || edge.label || "—"}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                  {detail.nodes.map(node => {
                    const meta = NODE_TYPE_META[node.type];
                    const NI = meta.icon;
                    const isSelected = selectedNodeId === node.id;
                    return (
                      <div key={node.id}
                        className={`absolute z-10 flex flex-col items-center justify-center rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected ? "border-n0va-400 bg-n0va-500/15 shadow-lg shadow-n0va-500/20" : `${meta.border} bg-gray-800/80 hover:border-gray-500`
                        }`}
                        style={{ left: node.posX, top: node.posY, width: NODE_W, height: NODE_H }}
                        onClick={() => setSelectedNodeId(node.id)}
                      >
                        <NI className={`w-4 h-4 ${meta.color}`} />
                        <span className="text-[10px] font-medium text-white mt-0.5 text-center leading-tight px-1 truncate w-full">{node.label}</span>
                        <span className="text-[8px] text-gray-500">{meta.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedNodeId && (() => {
                const node = detail.nodes.find(n => n.id === selectedNodeId);
                if (!node) return null;
                const meta = NODE_TYPE_META[node.type];
                const NI = meta.icon;
                const def = getNodeTypeDef(node.type);
                return (
                  <div className="card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2"><NI className={`w-4 h-4 ${meta.color}`} /> Edit {meta.label} Node</h3>
                      <div className="flex items-center gap-1">
                        <button onClick={() => removeNode(node.id)} className="p-1 text-gray-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setSelectedNodeId(null)} className="p-1 text-gray-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label">Label</label>
                          <input className="input text-sm" value={node.label} onChange={e => updateNode(node.id, "label", e.target.value)} />
                        </div>
                        <div>
                          <label className="label">Type</label>
                          <select className="input text-sm" value={node.type} onChange={e => updateNode(node.id, "type", e.target.value)}>
                            {NODE_TYPES.map(t => <option key={t} value={t}>{NODE_TYPE_META[t]?.label || t}</option>)}
                          </select>
                        </div>
                      </div>
                      {def && def.configFields && def.configFields.length > 0 && (
                        <div>
                          <label className="label text-xs text-gray-400 mb-2">Configuration</label>
                          <div className="space-y-2">
                            {def.configFields.map(field => (
                              <div key={field.key}>
                                <label className="text-[10px] text-gray-500">{field.label}{field.required ? " *" : ""}</label>
                                {field.type === "select" && field.options ? (
                                  <select className="input text-xs" value={node.config[field.key] || ""} onChange={e => updateNodeConfig(node.id, field.key, e.target.value)}>
                                    <option value="">Select...</option>
                                    {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                                  </select>
                                ) : field.type === "number" ? (
                                  <input className="input text-xs" type="number" value={node.config[field.key] || ""} onChange={e => updateNodeConfig(node.id, field.key, e.target.value)} />
                                ) : (
                                  <input className="input text-xs" value={node.config[field.key] || ""} onChange={e => updateNodeConfig(node.id, field.key, e.target.value)} />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {(!def || !def.configFields || def.configFields.length === 0) && (
                        <div className="space-y-2">
                          {Object.keys(node.config).length === 0 && (
                            <div className="text-xs text-gray-600 italic">No configuration fields defined for this node type</div>
                          )}
                          {Object.entries(node.config).map(([k, v]) => (
                            <div key={k}>
                              <label className="text-[10px] text-gray-500 capitalize">{k.replace(/_/g, " ")}</label>
                              <input className="input text-xs" value={String(v)} onChange={e => updateNodeConfig(node.id, k, e.target.value)} />
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="border-t border-gray-800 pt-2">
                        <p className="text-[10px] text-gray-600">Node ID: {node.id}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {testRunResult && (
                <div className="card overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-n0va-400" />
                      Test Run Output
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      testRunResult.status === "success" ? "bg-green-500/10 text-green-400" :
                      testRunResult.status === "failure" ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400"
                    }`}>
                      {testRunResult.status}
                    </span>
                  </div>
                  <div className="bg-gray-950 p-4 font-mono text-xs leading-relaxed max-h-80 overflow-y-auto">
                    {testRunResult.log && testRunResult.log.length > 0 ? testRunResult.log.map((entry, i) => (
                      <div key={i} className={`flex items-start gap-2 ${
                        entry.level === "error" ? "text-red-400" :
                        entry.level === "warn" ? "text-yellow-400" :
                        entry.level === "debug" ? "text-gray-600" : "text-gray-300"
                      }`}>
                        <span className="text-gray-600 shrink-0">[{formatTimestamp(entry.timestamp)}]</span>
                        <span className="text-gray-500 shrink-0">{entry.level.toUpperCase()}</span>
                        {entry.nodeId && <span className="text-n0va-400 shrink-0">[{entry.nodeId}]</span>}
                        <span>{entry.message}</span>
                      </div>
                    )) : (
                      <div className="text-gray-500">No log output available.</div>
                    )}
                  </div>
                </div>
              )}

              <div className="card overflow-hidden">
                <button onClick={() => { if (!showExecutions && executions.length === 0) loadExecutions(detail.id); setShowExecutions(!showExecutions); }}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-800/30">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-n0va-400" />
                    <span className="text-sm font-semibold text-white">Execution History</span>
                    <span className="text-xs text-gray-600">{executions.length} entries</span>
                  </div>
                  {showExecutions ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                </button>
                {showExecutions && (
                  <div className="border-t border-gray-800">
                    {executions.length === 0 ? (
                      <div className="p-6 text-center text-sm text-gray-500">No executions yet. Run a test to see history.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-500 border-b border-gray-800/50">
                              <th className="text-left p-3 font-medium">Status</th>
                              <th className="text-left p-3 font-medium">Started</th>
                              <th className="text-left p-3 font-medium">Completed</th>
                              <th className="text-left p-3 font-medium">Trigger</th>
                              <th className="text-left p-3 font-medium">Duration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {executions.map(ex => (
                              <tr key={ex.id} className="border-b border-gray-800/30 hover:bg-gray-800/20">
                                <td className="p-3">
                                  <span className={`flex items-center gap-1 ${
                                    ex.status === "success" ? "text-green-400" :
                                    ex.status === "failure" ? "text-red-400" : "text-yellow-400"
                                  }`}>
                                    {ex.status === "success" ? <CheckCircle className="w-3 h-3" /> :
                                     ex.status === "failure" ? <AlertTriangle className="w-3 h-3" /> :
                                     <Activity className="w-3 h-3 animate-pulse" />}
                                    {ex.status}
                                  </span>
                                </td>
                                <td className="p-3 text-gray-300">{formatTimestamp(ex.startedAt)}</td>
                                <td className="p-3 text-gray-500">{ex.completedAt ? formatTimestamp(ex.completedAt) : "—"}</td>
                                <td className="p-3 text-gray-500">{ex.trigger || "manual"}</td>
                                <td className="p-3 text-gray-500">
                                  {ex.completedAt ? (
                                    (() => {
                                      const dur = new Date(ex.completedAt).getTime() - new Date(ex.startedAt).getTime();
                                      return dur < 1000 ? `${dur}ms` : `${(dur / 1000).toFixed(1)}s`;
                                    })()
                                  ) : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <button onClick={() => loadExecutions(detail.id)} className="w-full p-2 text-xs text-gray-600 hover:text-gray-300 border-t border-gray-800/50">
                      Refresh
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="card p-4">
                <h3 className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-1.5"><ListChecks className="w-3.5 h-3.5" /> Node Types</h3>
                <div className="space-y-2">
                  {NODE_TYPES.map(t => {
                    const meta = NODE_TYPE_META[t];
                    const NI = meta.icon;
                    const def = getNodeTypeDef(t);
                    return (
                      <div key={t} className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/30">
                        <div className={`p-1.5 rounded-md ${meta.bg}`}><NI className={`w-3.5 h-3.5 ${meta.color}`} /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white">{meta.label}</p>
                          <p className="text-[10px] text-gray-600 truncate">{def?.description || ""}</p>
                        </div>
                        <button onClick={() => addNode(t)} className="p-1 text-gray-600 hover:text-white"><Plus className="w-3 h-3" /></button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card p-4">
                <h3 className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Stats</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">Nodes</span><span className="text-white font-medium">{detail.nodes.length}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Edges</span><span className="text-white font-medium">{detail.edges.length}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Total Runs</span><span className="text-white font-medium">{detail.runCount}</span></div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Success Rate</span>
                    <span className={`font-medium ${detail.runCount > 0 ? (detail.successCount / detail.runCount) >= 0.8 ? "text-green-400" : "text-yellow-400" : "text-gray-500"}`}>
                      {detail.runCount > 0 ? `${Math.round((detail.successCount / detail.runCount) * 100)}%` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between"><span className="text-gray-500">Last Run</span><span className="text-white font-medium">{timeAgo(detail.lastRun)}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!selectedId && (
        <>
          {loading ? (
            <div className="card p-12 flex items-center justify-center">
              <GitBranch className="w-6 h-6 text-n0va-400 animate-pulse" />
              <span className="ml-3 text-gray-400">Loading workflows...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="card p-12 flex flex-col items-center justify-center text-center">
              <GitBranch className="w-12 h-12 text-gray-700 mb-4" />
              <h3 className="text-lg font-semibold text-gray-300 mb-2">{workflows.length === 0 ? "No workflows yet" : "No matching workflows"}</h3>
              <p className="text-sm text-gray-500">
                {workflows.length === 0 ? "Create your first workflow to automate marketing tasks." : "Try different filter settings."}
              </p>
              {workflows.length === 0 && (
                <button onClick={() => setShowCreateModal(true)} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Create Workflow</button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(wf => {
                const sm = STATUS_META[wf.status] || STATUS_META.draft;
                const SI = Circle;
                const successRate = wf.runCount > 0 ? Math.round((wf.successCount / wf.runCount) * 100) : 0;
                return (
                  <div key={wf.id} className={`card overflow-hidden cursor-pointer transition-all hover:border-gray-700 ${selectedId === wf.id ? "border-n0va-500" : ""}`}
                    onClick={() => handleSelect(wf.id)}>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 rounded-lg bg-n0va-500/10"><GitBranch className="w-5 h-5 text-n0va-400" /></div>
                        <div className="flex items-center gap-1">
                          <button onClick={e => { e.stopPropagation(); handleSelect(wf.id); }} className="p-1.5 text-gray-600 hover:text-n0va-400" title="Open"><Eye className="w-3.5 h-3.5" /></button>
                          <button onClick={e => { e.stopPropagation(); handleDelete(wf.id); }} className="p-1.5 text-gray-600 hover:text-red-400" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <h3 className="text-base font-semibold text-white mb-1">{wf.name}</h3>
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{wf.description || "No description"}</p>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${sm.bg} ${sm.color}`}>
                          <SI className="w-2 h-2 fill-current" /> {sm.label}
                        </span>
                        {wf.category && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">{wf.category}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600 pt-3 border-t border-gray-800">
                        <span className="flex items-center gap-1"><Play className="w-3 h-3" /> {wf.runCount} runs</span>
                        <span className={`flex items-center gap-1 ${successRate >= 80 ? "text-green-400" : successRate > 0 ? "text-yellow-400" : "text-gray-600"}`}>
                          <CheckCircle className="w-3 h-3" /> {wf.runCount > 0 ? `${successRate}%` : "—"} success
                        </span>
                        <span>{wf.nodes?.length || 0} nodes</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCreateModal(false)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Create Workflow</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); handleCreate(); }} className="space-y-4">
              <div>
                <label className="label">Workflow Name</label>
                <input className="input" placeholder="e.g. Welcome Email Series" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} autoFocus />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={2} placeholder="What does this workflow do?" value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} />
              </div>
              <div>
                <label className="label">Category</label>
                <select className="input" value={createForm.category} onChange={e => setCreateForm({ ...createForm, category: e.target.value })}>
                  <option value="">Select category...</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create Workflow</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
