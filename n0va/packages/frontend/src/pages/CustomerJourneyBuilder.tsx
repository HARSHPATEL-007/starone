import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { GitBranch, Plus, X, Edit3, Trash2, Search, ArrowRight, ArrowDown, ArrowUp, Star, Home, MousePointerClick, Move, Link2, Unlink, Save, Eye, Download } from "lucide-react";
import { useToast } from "../components/Toast";
import { api } from "../api/client";

interface JourneyNode {
  id: string;
  label: string;
  type: "entry" | "action" | "decision" | "conversion" | "exit";
  description: string;
  conversionRate: number;
  posX: number;
  posY: number;
}

interface JourneyEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  percentage: number;
}

interface CustomerJourney {
  id: string;
  name: string;
  description: string;
  nodes: JourneyNode[];
  edges: JourneyEdge[];
  campaignName: string;
  createdAt: string;
  updatedAt: string;
}

const NODE_TYPE_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  entry: { label: "Entry", color: "border-blue-500/30 text-blue-400", bg: "bg-blue-500/10", icon: Home },
  action: { label: "Action", color: "border-amber-500/30 text-amber-400", bg: "bg-amber-500/10", icon: MousePointerClick },
  decision: { label: "Decision", color: "border-purple-500/30 text-purple-400", bg: "bg-purple-500/10", icon: GitBranch },
  conversion: { label: "Conversion", color: "border-green-500/30 text-green-400", bg: "bg-green-500/10", icon: Star },
  exit: { label: "Exit", color: "border-gray-600/30 text-gray-400", bg: "bg-gray-600/10", icon: ArrowRight },
};

const NODE_TYPES = ["entry", "action", "decision", "conversion", "exit"] as const;

export default function CustomerJourneyBuilder() {
  const { addToast } = useToast();
  const [journeys, setJourneys] = useState<CustomerJourney[]>([]);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "canvas">("list");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; description: string; campaignName: string; nodes: JourneyNode[]; edges: JourneyEdge[] }>({ name: "", description: "", campaignName: "", nodes: [], edges: [] });

  useEffect(() => {
    api.customerJourney.list().then(d => setJourneys(d || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function resetForm(j?: CustomerJourney) {
    if (j) setForm({ name: j.name, description: j.description, campaignName: j.campaignName, nodes: j.nodes.map(n => ({ ...n })), edges: j.edges.map(e => ({ ...e })) });
    else setForm({ name: "", description: "", campaignName: "", nodes: [
      { id: "n1", label: "Entry Point", type: "entry", description: "How users enter", conversionRate: 100, posX: 300, posY: 40 },
      { id: "n2", label: "Action Step", type: "action", description: "What users do next", conversionRate: 30, posX: 300, posY: 180 },
      { id: "n3", label: "Decision", type: "decision", description: "Branching point", conversionRate: 25, posX: 150, posY: 320 },
      { id: "n4", label: "Conversion", type: "conversion", description: "Desired outcome", conversionRate: 12, posX: 450, posY: 320 },
      { id: "n5", label: "Exit", type: "exit", description: "Lost users", conversionRate: 13, posX: 300, posY: 440 },
    ], edges: [
      { id: "e1", from: "n1", to: "n2", label: "proceed", percentage: 100 },
      { id: "e2", from: "n2", to: "n3", label: "decision", percentage: 50 },
      { id: "e3", from: "n2", to: "n4", label: "convert", percentage: 30 },
      { id: "e4", from: "n3", to: "n5", label: "drop off", percentage: 50 },
      { id: "e5", from: "n4", to: "n5", label: "done", percentage: 18 },
    ] });
  }

  function addNode() {
    const id = Date.now().toString(36);
    setForm(f => ({ ...f, nodes: [...f.nodes, { id, label: "", type: "action" as const, description: "", conversionRate: 0, posX: 150 + (f.nodes.length % 3) * 150, posY: 80 + Math.floor(f.nodes.length / 3) * 140 }] }));
  }

  function updateNode(id: string, field: keyof JourneyNode, value: any) {
    setForm(f => ({ ...f, nodes: f.nodes.map(n => n.id === id ? { ...n, [field]: value } : n) }));
  }

  function removeNode(id: string) {
    setForm(f => ({ ...f, nodes: f.nodes.filter(n => n.id !== id), edges: f.edges.filter(e => e.from !== id && e.to !== id) }));
  }

  function handleCanvasClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) { setSelectedNodeId(null); setConnectFrom(null); }
  }

  function startConnect(fromId: string) { setConnectFrom(fromId); setSelectedNodeId(null); }

  function completeConnect(toId: string) {
    if (!connectFrom || connectFrom === toId) { setConnectFrom(null); return; }
    if (form.edges.some(e => e.from === connectFrom && e.to === toId)) { addToast("warning", "Edge already exists"); setConnectFrom(null); return; }
    const edge: JourneyEdge = { id: `e${Date.now()}`, from: connectFrom, to: toId, label: "", percentage: 50 };
    setForm(f => ({ ...f, edges: [...f.edges, edge] }));
    setConnectFrom(null);
    addToast("success", "Edge created");
  }

  function removeEdge(id: string) {
    setForm(f => ({ ...f, edges: f.edges.filter(e => e.id !== id) }));
  }

  function updateEdge(id: string, field: keyof JourneyEdge, value: any) {
    setForm(f => ({ ...f, edges: f.edges.map(e => e.id === id ? { ...e, [field]: value } : e) }));
  }

  async function handleSave() {
    if (!form.name.trim()) { addToast("error", "Journey name is required"); return; }
    if (form.nodes.length < 2) { addToast("error", "A journey needs at least 2 stages"); return; }
    const validNodes = form.nodes.filter(n => n.label.trim()).map(n => ({ ...n, label: n.label.trim() }));
    const now = new Date().toISOString();
    const journey: CustomerJourney = {
      id: editingId || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: form.name.trim(), description: form.description.trim(), campaignName: form.campaignName.trim(),
      nodes: validNodes, edges: form.edges,
      createdAt: editingId ? journeys.find(j => j.id === editingId)!.createdAt : now, updatedAt: now,
    };
    if (editingId) { await api.customerJourney.update(editingId, journey as any); setJourneys(prev => prev.map(j => j.id === editingId ? journey : j)); addToast("success", "Journey updated"); }
    else { await api.customerJourney.create(journey as any); setJourneys(prev => [journey, ...prev]); addToast("success", "Journey created"); }
    setShowForm(false);
    setEditingId(null);
    setViewMode("list");
  }

  async function handleDelete(id: string) {
    const name = journeys.find(j => j.id === id)?.name;
    await api.customerJourney.delete(id);
    setJourneys(prev => prev.filter(j => j.id !== id));
    if (expandedId === id) setExpandedId(null);
    addToast("success", `"${name}" deleted`);
  }

  function openCanvas(j: CustomerJourney) {
    setForm({ name: j.name, description: j.description, campaignName: j.campaignName, nodes: j.nodes.map(n => ({ ...n })), edges: j.edges.map(e => ({ ...e })) });
    setEditingId(j.id);
    setViewMode("canvas");
  }

  const filtered = journeys.filter(j => !search || j.name.toLowerCase().includes(search.toLowerCase()) || j.description.toLowerCase().includes(search.toLowerCase()));

  function exportJourneysCSV() {
    const header = "Name,Description,Campaign,Nodes,Edges,Created";
    const rows = journeys.map(j => `"${j.name}","${j.description.replace(/"/g, '""')}","${j.campaignName}",${j.nodes.length},${j.edges.length},"${new Date(j.createdAt).toLocaleDateString()}"`).join("\n");
    const blob = new Blob(["\ufeff" + header + "\n" + rows], { type: "text/csv;charset=utf-8" });
    const el = document.createElement("a"); el.href = URL.createObjectURL(blob); el.download = "customer_journeys.csv"; el.click();
    addToast("success", "Journeys exported");
  }

  const NODE_W = 140, NODE_H = 70;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <GitBranch className="w-6 h-6 text-n0va-400" />
            Customer Journey Builder
          </h1>
          <p className="text-gray-400 mt-1">{journeys.length} journey maps</p>
        </div>
        <div className="flex items-center gap-2">
          {viewMode === "canvas" && (
            <div className="flex items-center gap-2 mr-2">
              <span className="text-xs text-gray-500">
                {connectFrom ? `Connecting from selected node... click target node` : "Click a node to select it"}
              </span>
              <button onClick={() => { setViewMode("list"); setEditingId(null); setSelectedNodeId(null); setConnectFrom(null); }} className="btn-ghost text-xs">Back</button>
              <button onClick={handleSave} className="btn-primary text-xs flex items-center gap-1"><Save className="w-3 h-3" /> Save</button>
            </div>
          )}
          <button onClick={() => { resetForm(); setEditingId(null); setViewMode("list"); setShowForm(true); }} className="btn-primary text-sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> New Journey</button>
        </div>
      </div>

      {viewMode === "list" && (
        <>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input className="input pl-10 pr-4 py-2 text-sm w-full" placeholder="Search journeys..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {journeys.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card">
                <h3 className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5"><GitBranch className="w-3.5 h-3.5 text-n0va-400" /> Nodes per Journey</h3>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[...journeys].sort((a, b) => b.nodes.length - a.nodes.length).slice(0, 8).map(j => ({ name: j.name.length > 14 ? j.name.substring(0, 14) + "..." : j.name, nodes: j.nodes.length }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis type="number" stroke="#6b7280" fontSize={9} />
                      <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={9} width={90} />
                      <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }} />
                      <Bar dataKey="nodes" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="card flex items-center justify-center">
                <div className="text-center">
                  <button onClick={exportJourneysCSV} className="btn-ghost text-sm flex items-center gap-1.5 mx-auto"><Download className="w-4 h-4" /> Export CSV</button>
                  <p className="text-xs text-gray-600 mt-2">{journeys.length} journeys · {journeys.reduce((s, j) => s + j.nodes.length, 0)} total nodes</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {viewMode === "canvas" && (
        <div className="card p-0 overflow-hidden">
          <div className="bg-gray-800/50 border-b border-gray-800 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">{editingId ? "Editing:" : "New:"}</span>
              <input className="bg-transparent text-sm text-white border-b border-dashed border-gray-600 focus:border-n0va-400 outline-none px-1" placeholder="Journey name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{form.nodes.length} nodes, {form.edges.length} edges</span>
              <button onClick={() => setConnectFrom(null)} className={`text-xs px-2 py-1 rounded ${connectFrom ? "bg-n0va-500/20 text-n0va-400" : "text-gray-500"}`}>{connectFrom ? "Cancel connect" : "Connect mode"}</button>
              <button onClick={addNode} className="btn-ghost text-xs flex items-center gap-1"><Plus className="w-3 h-3" /> Add Node</button>
              <button onClick={handleSave} className="btn-primary text-xs flex items-center gap-1"><Save className="w-3 h-3" /> Save</button>
              <button onClick={() => { setViewMode("list"); setEditingId(null); setSelectedNodeId(null); setConnectFrom(null); }} className="btn-ghost text-xs"><X className="w-3 h-3" /></button>
            </div>
          </div>
          <div className="relative min-h-[520px] bg-[#0a0e1a]" onClick={handleCanvasClick}>
            {/* SVG edges layer */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              {form.edges.map(edge => {
                const from = form.nodes.find(n => n.id === edge.from);
                const to = form.nodes.find(n => n.id === edge.to);
                if (!from || !to) return null;
                const x1 = from.posX + NODE_W / 2, y1 = from.posY + NODE_H;
                const x2 = to.posX + NODE_W / 2, y2 = to.posY;
                const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
                return (
                  <g key={edge.id}>
                    <path d={`M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`} fill="none" stroke={edge.percentage > 50 ? "#10b981" : "#6b7280"} strokeWidth="1.5" strokeDasharray={edge.percentage > 50 ? "none" : "4 3"} />
                    <rect x={midX - 30} y={midY - 9} width="60" height="18" rx="4" fill="#1f2937" stroke="#374151" strokeWidth="1" className="pointer-events-auto cursor-pointer"
                      onClick={() => updateEdge(edge.id, "percentage", Math.min(100, (edge.percentage || 0) + 5))} />
                    <text x={midX} y={midY + 3} textAnchor="middle" fill="#9ca3af" fontSize="9" className="pointer-events-none">{edge.label || `${edge.percentage}%`}</text>
                  </g>
                );
              })}
            </svg>
            {/* Nodes layer */}
            {form.nodes.map(node => {
              const ntm = NODE_TYPE_META[node.type];
              const NI = ntm.icon;
              const isSelected = selectedNodeId === node.id;
              const isConnecting = connectFrom === node.id;
              return (
                <div key={node.id}
                  className={`absolute z-10 flex flex-col items-center justify-center rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected ? "border-n0va-400 bg-n0va-500/15 shadow-lg shadow-n0va-500/20" : isConnecting ? "border-amber-400 bg-amber-500/10" : "border-gray-700 bg-gray-800 hover:border-gray-600"
                  }`}
                  style={{ left: node.posX, top: node.posY, width: NODE_W, height: NODE_H }}
                  onClick={(e) => { e.stopPropagation(); if (connectFrom) { completeConnect(node.id); } else { setSelectedNodeId(node.id); } }}>
                  <NI className={`w-4 h-4 ${ntm.color.split(" ").pop()}`} />
                  <span className="text-[10px] font-medium text-white mt-0.5 text-center leading-tight px-1 truncate w-full">{node.label || "New node"}</span>
                  <span className="text-[8px] text-gray-500">{node.conversionRate}%</span>
                </div>
              );
            })}
            {/* Selection panel */}
            {selectedNodeId && (() => {
              const node = form.nodes.find(n => n.id === selectedNodeId);
              if (!node) return null;
              return (
                <div className="absolute bottom-3 left-3 right-3 z-20 bg-gray-900 border border-gray-700 rounded-lg p-3 flex items-center gap-3">
                  <select className="text-[10px] bg-gray-800 text-gray-300 rounded px-1 py-1 border border-gray-700" value={node.type} onChange={e => updateNode(node.id, "type", e.target.value)}>{NODE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                  <input className="text-xs bg-transparent text-white border-b border-gray-600 flex-1 outline-none" placeholder="Label" value={node.label} onChange={e => updateNode(node.id, "label", e.target.value)} />
                  <input className="text-xs bg-transparent text-white border-b border-gray-600 w-16 outline-none" placeholder="Desc" value={node.description} onChange={e => updateNode(node.id, "description", e.target.value)} />
                  <div className="flex items-center gap-1 text-xs text-gray-500"><span>Rate:</span><input type="number" className="text-xs bg-gray-800 text-white rounded px-1 py-0.5 w-14 border border-gray-700" min="0" max="100" value={node.conversionRate} onChange={e => updateNode(node.id, "conversionRate", Number(e.target.value))} /><span>%</span></div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateNode(node.id, "posX", node.posX - 10)} className="p-1 text-gray-500 hover:text-white text-xs">←</button>
                    <button onClick={() => updateNode(node.id, "posX", node.posX + 10)} className="p-1 text-gray-500 hover:text-white text-xs">→</button>
                    <button onClick={() => updateNode(node.id, "posY", node.posY - 10)} className="p-1 text-gray-500 hover:text-white text-xs">↑</button>
                    <button onClick={() => updateNode(node.id, "posY", node.posY + 10)} className="p-1 text-gray-500 hover:text-white text-xs">↓</button>
                  </div>
                  <button onClick={() => startConnect(node.id)} className="btn-ghost text-xs flex items-center gap-1"><Link2 className="w-3 h-3" /> Connect</button>
                  <button onClick={() => { removeNode(node.id); setSelectedNodeId(null); }} className="p-1 text-gray-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {showForm && viewMode === "list" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">{editingId ? "Edit Journey" : "New Journey"}</h3><button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Journey Name</label><input className="input" placeholder="e.g. B2B Purchase Journey" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus /></div>
                <div><label className="label">Campaign</label><input className="input" placeholder="Related campaign" value={form.campaignName} onChange={e => setForm({ ...form, campaignName: e.target.value })} /></div>
              </div>
              <div><label className="label">Description</label><textarea className="input" rows={2} placeholder="Describe this customer journey..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="flex gap-2">
                <button type="button" onClick={addNode} className="btn-ghost text-xs flex items-center gap-1"><Plus className="w-3 h-3" /> Add Stage</button>
                <button type="button" onClick={() => { if (!editingId) setShowForm(false); setViewMode("canvas"); }} className="btn-ghost text-xs flex items-center gap-1"><Eye className="w-3 h-3" /> Visual Canvas</button>
              </div>
              <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                {form.nodes.map((node, idx) => {
                  const ntm = NODE_TYPE_META[node.type];
                  return (
                    <div key={node.id} className="flex items-center gap-1.5">
                      <span className="text-[9px] text-gray-700 font-mono w-4">{idx + 1}</span>
                      <select className="text-[10px] bg-gray-800 text-gray-300 rounded px-1 py-1 border border-gray-700 w-16" value={node.type} onChange={e => updateNode(node.id, "type", e.target.value)}>{NODE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                      <input className="input text-xs py-1 flex-1" placeholder="Stage name" value={node.label} onChange={e => updateNode(node.id, "label", e.target.value)} />
                      <input className="input text-xs py-1 w-14" type="number" step="0.1" min="0" max="100" placeholder="%" value={node.conversionRate} onChange={e => updateNode(node.id, "conversionRate", Number(e.target.value))} />
                      <button type="button" onClick={() => removeNode(node.id)} className="p-1 text-gray-600 hover:text-red-400"><X className="w-3 h-3" /></button>
                    </div>
                  );
                })}
              </div>
              {form.edges.length > 0 && (
                <div><label className="label">Edges ({form.edges.length})</label>
                  <div className="space-y-1 max-h-[120px] overflow-y-auto">
                    {form.edges.map(e => {
                      const from = form.nodes.find(n => n.id === e.from);
                      const to = form.nodes.find(n => n.id === e.to);
                      return (
                        <div key={e.id} className="flex items-center gap-1 text-xs text-gray-500">
                          <span className="text-gray-300">{from?.label || "?"}</span>
                          <ArrowRight className="w-3 h-3" />
                          <span className="text-gray-300">{to?.label || "?"}</span>
                          <input className="input text-[10px] py-0.5 w-12" placeholder="Label" value={e.label} onChange={v => updateEdge(e.id, "label", v.target.value)} />
                          <input className="input text-[10px] py-0.5 w-12" type="number" min="0" max="100" value={e.percentage} onChange={v => updateEdge(e.id, "percentage", Number(v.target.value))} />
                          <span className="text-gray-600">%</span>
                          <button type="button" onClick={() => removeEdge(e.id)} className="p-0.5 text-gray-600 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{editingId ? "Save Changes" : "Create Journey"}</button></div>
            </form>
          </div>
        </div>
      )}

      {loading && (
        <div className="card p-12 flex items-center justify-center text-center"><GitBranch className="w-6 h-6 text-n0va-400 animate-pulse" /><span className="ml-3 text-gray-400">Loading journeys...</span></div>
      )}

      {!loading && filtered.length === 0 && viewMode === "list" && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <GitBranch className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No journey maps</h3>
          <p className="text-sm text-gray-500">{search ? "Try different search terms" : "Map your customer journeys to understand the buying process."}</p>
          {!search && <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Create Journey</button>}
        </div>
      )}

      {viewMode === "list" && filtered.map(j => {
        const isOpen = expandedId === j.id;
        return (
          <div key={j.id} className="card overflow-hidden">
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-n0va-500/10"><GitBranch className="w-5 h-5 text-n0va-400" /></div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-white">{j.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{j.description}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-600 flex-wrap">
                    <span>{j.nodes.length} stages</span>
                    <span>{j.edges.length} connections</span>
                    {j.campaignName && <span>Campaign: {j.campaignName}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openCanvas(j)} className="btn-ghost text-xs py-1 px-2 flex items-center gap-1"><Eye className="w-3 h-3" /> Canvas</button>
                  <button onClick={() => setExpandedId(isOpen ? null : j.id)} className="p-1.5 text-gray-600 hover:text-gray-300">{isOpen ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}</button>
                  <button onClick={() => { resetForm(j); setEditingId(j.id); setShowForm(true); }} className="p-1.5 text-gray-600 hover:text-gray-300"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(j.id)} className="p-1.5 text-gray-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
            {isOpen && (
              <div className="border-t border-gray-800 p-5">
                <div className="flex items-end justify-center gap-2 mb-4 overflow-x-auto pb-2">
                  {j.nodes.map((node, idx) => {
                    const ntm = NODE_TYPE_META[node.type];
                    const NI = ntm.icon;
                    const height = Math.max(40, (node.conversionRate / 100) * 180);
                    return (
                      <div key={node.id} className="flex flex-col items-center min-w-[100px]">
                        <div className={`px-2.5 py-1.5 rounded-lg border text-center ${ntm.color} ${ntm.bg}`} style={{ height: `${height}px`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                          <NI className="w-4 h-4 mb-0.5" /><span className="text-[10px] font-semibold leading-tight">{node.label}</span>
                        </div>
                        <span className="text-[10px] text-gray-600 mt-1">{node.conversionRate}%</span>
                        {idx < j.nodes.length - 1 && <ArrowDown className="w-3 h-3 text-gray-700 mt-0.5" />}
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-gray-800 pt-3 mt-2">
                  <table className="w-full text-xs"><thead><tr className="text-gray-500 text-left"><th className="pb-1.5 font-medium">Stage</th><th className="pb-1.5 font-medium">Type</th><th className="pb-1.5 font-medium">Description</th><th className="pb-1.5 font-medium text-right">Conv. Rate</th></tr></thead>
                    <tbody>{j.nodes.map((node, idx) => {
                      const ntm = NODE_TYPE_META[node.type]; const NI = ntm.icon;
                      return (<tr key={node.id} className="border-b border-gray-800/40"><td className="py-1.5 text-white flex items-center gap-1.5"><span className="text-gray-600">{idx + 1}.</span>{node.label}</td><td className="py-1.5"><span className="flex items-center gap-1 text-gray-400"><NI className="w-3 h-3" />{ntm.label}</span></td><td className="py-1.5 text-gray-500">{node.description}</td><td className="py-1.5 text-right font-semibold text-white">{node.conversionRate}%</td></tr>);
                    })}</tbody></table>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
