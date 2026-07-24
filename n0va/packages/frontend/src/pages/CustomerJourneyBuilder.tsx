import { useState, useEffect } from "react";
import { GitBranch, Plus, X, Edit3, Trash2, Copy, Search, Users, Eye, MousePointerClick, ShoppingCart, Target, ArrowRight, ArrowDown, ArrowUp, Star, Home, Mail, Globe, Smartphone } from "lucide-react";
import { useToast } from "../components/Toast";

interface JourneyNode {
  id: string;
  label: string;
  type: "entry" | "action" | "decision" | "conversion" | "exit";
  description: string;
  conversionRate: number;
}

interface JourneyEdge {
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

const STORAGE_KEY = "n0va_customer_journeys";

const NODE_TYPE_META: Record<string, { label: string; color: string; icon: any }> = {
  entry: { label: "Entry", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Home },
  action: { label: "Action", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: MousePointerClick },
  decision: { label: "Decision", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: GitBranch },
  conversion: { label: "Conversion", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: Star },
  exit: { label: "Exit", color: "bg-gray-600/20 text-gray-400 border-gray-600/30", icon: ArrowRight },
};

const NODE_TYPES = ["entry", "action", "decision", "conversion", "exit"] as const;

const DEFAULT_JOURNEYS: CustomerJourney[] = [
  {
    id: "cj-1", name: "B2B SaaS Customer Journey", description: "Enterprise software buyer journey from awareness to purchase",
    campaignName: "Enterprise Q3",
    nodes: [
      { id: "n1", label: "Google Search", type: "entry", description: "User searches for marketing software", conversionRate: 100 },
      { id: "n2", label: "Landing Page Visit", type: "action", description: "Clicks on ad and visits landing page", conversionRate: 35 },
      { id: "n3", label: "Content Download", type: "action", description: "Downloads whitepaper or case study", conversionRate: 18 },
      { id: "n4", label: "Email Nurture", type: "action", description: "Receives automated email sequence", conversionRate: 12 },
      { id: "n5", label: "Demo Request", type: "decision", description: "Requests a product demonstration", conversionRate: 6 },
      { id: "n6", label: "Sales Call", type: "action", description: "Speaks with sales representative", conversionRate: 4.5 },
      { id: "n7", label: "Purchase", type: "conversion", description: "Becomes a paying customer", conversionRate: 2.2 },
    ],
    edges: [
      { from: "n1", to: "n2", label: "Click ad", percentage: 35 },
      { from: "n2", to: "n3", label: "Download CTA", percentage: 18 },
      { from: "n3", to: "n4", label: "Auto-enrolled", percentage: 100 },
      { from: "n4", to: "n5", label: "Request demo", percentage: 6 },
      { from: "n5", to: "n6", label: "Qualified", percentage: 75 },
      { from: "n6", to: "n7", label: "Closed won", percentage: 22 },
      { from: "n2", to: "exit-1", label: "Bounce", percentage: 65 },
      { from: "n4", to: "exit-2", label: "Unsubscribe", percentage: 88 },
    ],
    createdAt: new Date(Date.now() - 86400000 * 40).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "cj-2", name: "E-commerce Purchase Flow", description: "Online shopper journey from discovery to purchase",
    campaignName: "Summer Sale 2025",
    nodes: [
      { id: "na1", label: "Social Ad", type: "entry", description: "User sees product on social media", conversionRate: 100 },
      { id: "na2", label: "Product Page", type: "action", description: "Visits product detail page", conversionRate: 28 },
      { id: "na3", label: "Add to Cart", type: "action", description: "Adds item to shopping cart", conversionRate: 14 },
      { id: "na4", label: "Checkout", type: "action", description: "Begins checkout process", conversionRate: 10 },
      { id: "na5", label: "Purchase", type: "conversion", description: "Completes purchase", conversionRate: 7.5 },
      { id: "na6", label: "Post-Purchase", type: "exit", description: "Receives order confirmation", conversionRate: 7.5 },
    ],
    edges: [
      { from: "na1", to: "na2", label: "Swipe up / Click", percentage: 28 },
      { from: "na2", to: "na3", label: "Add to cart", percentage: 14 },
      { from: "na3", to: "na4", label: "Checkout", percentage: 10 },
      { from: "na4", to: "na5", label: "Complete", percentage: 7.5 },
      { from: "na5", to: "na6", label: "Confirmation", percentage: 100 },
    ],
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

function load(): CustomerJourney[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_JOURNEYS));
    return DEFAULT_JOURNEYS;
  } catch { return []; }
}

export default function CustomerJourneyBuilder() {
  const { addToast } = useToast();
  const [journeys, setJourneys] = useState<CustomerJourney[]>([]);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; description: string; campaignName: string; nodes: JourneyNode[] }>({ name: "", description: "", campaignName: "", nodes: [] });

  useEffect(() => { setJourneys(load()); }, []);

  function persist(updated: CustomerJourney[]) {
    setJourneys(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function resetForm(j?: CustomerJourney) {
    if (j) setForm({ name: j.name, description: j.description, campaignName: j.campaignName, nodes: j.nodes.map(n => ({ ...n })) });
    else setForm({ name: "", description: "", campaignName: "", nodes: [
      { id: Date.now().toString(36), label: "Entry Point", type: "entry", description: "How users enter the journey", conversionRate: 100 },
      { id: Date.now().toString(36) + "a", label: "Action Step", type: "action", description: "What users do next", conversionRate: 30 },
      { id: Date.now().toString(36) + "b", label: "Conversion", type: "conversion", description: "Desired outcome", conversionRate: 8 },
    ] });
  }

  function addNode() {
    setForm(f => ({ ...f, nodes: [...f.nodes, { id: Date.now().toString(36), label: "", type: "action" as const, description: "", conversionRate: 0 }] }));
  }

  function updateNode(id: string, field: keyof JourneyNode, value: any) {
    setForm(f => ({ ...f, nodes: f.nodes.map(n => n.id === id ? { ...n, [field]: value } : n) }));
  }

  function removeNode(id: string) {
    setForm(f => ({ ...f, nodes: f.nodes.filter(n => n.id !== id) }));
  }

  function moveNode(idx: number, dir: -1 | 1) {
    const to = idx + dir;
    if (to < 0 || to >= form.nodes.length) return;
    setForm(f => { const arr = [...f.nodes]; const [m] = arr.splice(idx, 1); arr.splice(to, 0, m); return { ...f, nodes: arr }; });
  }

  function handleSave() {
    if (!form.name.trim()) { addToast("error", "Journey name is required"); return; }
    if (form.nodes.length < 2) { addToast("error", "A journey needs at least 2 stages"); return; }
    const validNodes = form.nodes.filter(n => n.label.trim()).map(n => ({ ...n, label: n.label.trim() }));
    const now = new Date().toISOString();
    const journey: CustomerJourney = {
      id: editingId || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: form.name.trim(), description: form.description.trim(), campaignName: form.campaignName.trim(),
      nodes: validNodes, edges: [],
      createdAt: editingId ? journeys.find(j => j.id === editingId)!.createdAt : now, updatedAt: now,
    };
    let updated: CustomerJourney[];
    if (editingId) { updated = journeys.map(j => j.id === editingId ? journey : j); addToast("success", "Journey updated"); }
    else { updated = [journey, ...journeys]; addToast("success", "Journey created"); }
    persist(updated);
    setShowForm(false);
    setEditingId(null);
  }

  function handleDelete(id: string) {
    const name = journeys.find(j => j.id === id)?.name;
    persist(journeys.filter(j => j.id !== id));
    if (expandedId === id) setExpandedId(null);
    addToast("success", `"${name}" deleted`);
  }

  const filtered = journeys.filter(j => !search || j.name.toLowerCase().includes(search.toLowerCase()) || j.description.toLowerCase().includes(search.toLowerCase()));

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
        <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> New Journey</button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
        <input className="input pl-10 pr-4 py-2 text-sm w-full" placeholder="Search journeys..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Builder modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">{editingId ? "Edit Journey" : "New Journey"}</h3><button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Journey Name</label><input className="input" placeholder="e.g. B2B Purchase Journey" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus /></div>
                <div><label className="label">Campaign</label><input className="input" placeholder="Related campaign" value={form.campaignName} onChange={e => setForm({ ...form, campaignName: e.target.value })} /></div>
              </div>
              <div><label className="label">Description</label><textarea className="input" rows={2} placeholder="Describe this customer journey..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div><div className="flex items-center justify-between mb-2"><label className="label mb-0">Journey Stages</label><button type="button" onClick={addNode} className="text-xs text-n0va-400 hover:text-n0va-300">+ Add Stage</button></div>
                {form.nodes.map((node, idx) => {
                  const ntm = NODE_TYPE_META[node.type];
                  const NI = ntm.icon;
                  return (
                    <div key={node.id} className="flex items-center gap-1.5 mb-2">
                      <div className="flex flex-col items-center gap-0.5">
                        <button type="button" onClick={() => moveNode(idx, -1)} disabled={idx === 0} className="p-0.5 text-gray-600 hover:text-white disabled:opacity-20"><ArrowUp className="w-2.5 h-2.5" /></button>
                        <span className="text-[9px] text-gray-700 font-mono">{idx + 1}</span>
                        <button type="button" onClick={() => moveNode(idx, 1)} disabled={idx === form.nodes.length - 1} className="p-0.5 text-gray-600 hover:text-white disabled:opacity-20"><ArrowDown className="w-2.5 h-2.5" /></button>
                      </div>
                      <select className="text-[10px] bg-gray-800 text-gray-300 rounded px-1 py-1 border border-gray-700 w-16" value={node.type} onChange={e => updateNode(node.id, "type", e.target.value)}>
                        {NODE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input className="input text-xs py-1 flex-1" placeholder="Stage name" value={node.label} onChange={e => updateNode(node.id, "label", e.target.value)} />
                      <input className="input text-xs py-1 w-14" type="number" step="0.1" min="0" max="100" placeholder="%" value={node.conversionRate} onChange={e => updateNode(node.id, "conversionRate", Number(e.target.value))} />
                      <button type="button" onClick={() => removeNode(node.id)} className="p-1 text-gray-600 hover:text-red-400"><X className="w-3 h-3" /></button>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{editingId ? "Save Changes" : "Create Journey"}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <GitBranch className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No journey maps</h3>
          <p className="text-sm text-gray-500">{search ? "Try different search terms" : "Map your customer journeys to understand the buying process."}</p>
          {!search && <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Create Journey</button>}
        </div>
      )}

      {/* Journey cards */}
      {filtered.map(j => {
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
                    {j.campaignName && <span>Campaign: {j.campaignName}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setExpandedId(isOpen ? null : j.id)} className="p-1.5 text-gray-600 hover:text-gray-300">
                    {isOpen ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                  </button>
                  <button onClick={() => { resetForm(j); setEditingId(j.id); setShowForm(true); }} className="p-1.5 text-gray-600 hover:text-gray-300"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(j.id)} className="p-1.5 text-gray-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            {isOpen && (
              <div className="border-t border-gray-800 p-5">
                {/* Funnel visualization */}
                <div className="flex items-end justify-center gap-2 mb-4 overflow-x-auto pb-2">
                  {j.nodes.map((node, idx) => {
                    const ntm = NODE_TYPE_META[node.type];
                    const NI = ntm.icon;
                    const height = Math.max(40, (node.conversionRate / 100) * 180);
                    return (
                      <div key={node.id} className="flex flex-col items-center min-w-[100px]">
                        <div className={`px-2.5 py-1.5 rounded-lg border text-center ${ntm.color}`}
                          style={{ height: `${height}px`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                          <NI className="w-4 h-4 mb-0.5" />
                          <span className="text-[10px] font-semibold leading-tight">{node.label}</span>
                        </div>
                        <span className="text-[10px] text-gray-600 mt-1">{node.conversionRate}%</span>
                        {idx < j.nodes.length - 1 && <ArrowDown className="w-3 h-3 text-gray-700 mt-0.5" />}
                      </div>
                    );
                  })}
                </div>

                {/* Detail table */}
                <div className="border-t border-gray-800 pt-3 mt-2">
                  <table className="w-full text-xs">
                    <thead><tr className="text-gray-500 text-left">
                      <th className="pb-1.5 font-medium">Stage</th>
                      <th className="pb-1.5 font-medium">Type</th>
                      <th className="pb-1.5 font-medium">Description</th>
                      <th className="pb-1.5 font-medium text-right">Conv. Rate</th>
                    </tr></thead>
                    <tbody>
                      {j.nodes.map((node, idx) => {
                        const ntm = NODE_TYPE_META[node.type];
                        const NI = ntm.icon;
                        return (
                          <tr key={node.id} className="border-b border-gray-800/40">
                            <td className="py-1.5 text-white flex items-center gap-1.5">
                              <span className="text-gray-600">{idx + 1}.</span>
                              {node.label}
                            </td>
                            <td className="py-1.5"><span className="flex items-center gap-1 text-gray-400"><NI className="w-3 h-3" />{ntm.label}</span></td>
                            <td className="py-1.5 text-gray-500">{node.description}</td>
                            <td className="py-1.5 text-right font-semibold text-white">{node.conversionRate}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
