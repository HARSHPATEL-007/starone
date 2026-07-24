import { useState, useEffect } from "react";
import { Split, Plus, X, Edit3, Trash2, Copy, Users, MapPin, Globe, Calendar, ShoppingCart, MousePointerClick, Eye, Smartphone, Laptop, Target, User, Hash, DollarSign, Clock, ChevronDown, ChevronRight, Save, Download, Search } from "lucide-react";
import { useToast } from "../components/Toast";

type RuleField = "age" | "gender" | "location" | "device" | "os" | "browser" | "visited_page" | "clicked" | "converted" | "purchased" | "session_count" | "days_since_last_visit" | "total_revenue" | "custom_attribute";
type RuleOperator = "equals" | "not_equals" | "contains" | "not_contains" | "gt" | "gte" | "lt" | "lte" | "between" | "in" | "not_in";
type RuleGroupLogic = "and" | "or";

interface SegmentRule {
  id: string;
  field: RuleField;
  operator: RuleOperator;
  value: string;
  value2?: string;
}

interface RuleGroup {
  id: string;
  logic: RuleGroupLogic;
  rules: SegmentRule[];
}

interface Segment {
  id: string;
  name: string;
  description: string;
  groups: RuleGroup[];
  estimatedSize: number;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "n0va_segments";

const FIELD_META: Record<string, { label: string; icon: any; operators: RuleOperator[]; placeholder: string }> = {
  age: { label: "Age", icon: User, operators: ["equals", "gt", "gte", "lt", "lte", "between"], placeholder: "e.g. 25" },
  gender: { label: "Gender", icon: User, operators: ["equals", "not_equals"], placeholder: "male, female, other" },
  location: { label: "Location", icon: MapPin, operators: ["equals", "contains", "not_contains", "in"], placeholder: "e.g. United States" },
  device: { label: "Device Type", icon: Smartphone, operators: ["equals", "not_equals", "in"], placeholder: "mobile, desktop, tablet" },
  os: { label: "OS", icon: Laptop, operators: ["equals", "not_equals", "in"], placeholder: "iOS, Android, Windows" },
  browser: { label: "Browser", icon: Globe, operators: ["equals", "not_equals", "in"], placeholder: "Chrome, Safari, Firefox" },
  visited_page: { label: "Visited Page", icon: Eye, operators: ["equals", "contains", "not_contains"], placeholder: "URL or path" },
  clicked: { label: "Clicked", icon: MousePointerClick, operators: ["equals", "contains"], placeholder: "Element or CTA" },
  converted: { label: "Converted", icon: Target, operators: ["equals"], placeholder: "true or false" },
  purchased: { label: "Purchased Product", icon: ShoppingCart, operators: ["equals", "contains", "in"], placeholder: "Product name or SKU" },
  session_count: { label: "Session Count", icon: Clock, operators: ["equals", "gt", "gte", "lt", "lte", "between"], placeholder: "e.g. 5" },
  days_since_last_visit: { label: "Days Since Last Visit", icon: Calendar, operators: ["equals", "gt", "gte", "lt", "lte", "between"], placeholder: "e.g. 30" },
  total_revenue: { label: "Total Revenue", icon: DollarSign, operators: ["equals", "gt", "gte", "lt", "lte", "between"], placeholder: "e.g. 500" },
  custom_attribute: { label: "Custom Attribute", icon: Hash, operators: ["equals", "not_equals", "contains", "not_contains", "gt", "lt"], placeholder: "attribute:value" },
};

const OPERATOR_LABELS: Record<string, string> = {
  equals: "=", not_equals: "≠", contains: "contains", not_contains: "not contains",
  gt: ">", gte: "≥", lt: "<", lte: "≤", between: "between", in: "in", not_in: "not in",
};

const DEFAULT_SEGMENTS: Segment[] = [
  {
    id: "seg-1", name: "High-Value Returning Customers",
    description: "Customers with high lifetime value who visited in the last 30 days",
    groups: [
      { id: "g1", logic: "and", rules: [
        { id: "r1", field: "total_revenue", operator: "gt", value: "1000" },
        { id: "r2", field: "days_since_last_visit", operator: "lte", value: "30" },
        { id: "r3", field: "session_count", operator: "gte", value: "5" },
      ]},
    ],
    estimatedSize: 12450, createdAt: new Date(Date.now() - 86400000 * 20).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "seg-2", name: "Mobile Engaged Non-Buyers",
    description: "Mobile users who visited product pages but never purchased",
    estimatedSize: 38700,
    groups: [
      { id: "g2", logic: "and", rules: [
        { id: "r4", field: "device", operator: "in", value: "mobile, tablet" },
        { id: "r5", field: "visited_page", operator: "contains", value: "/products" },
        { id: "r6", field: "converted", operator: "equals", value: "false" },
      ]},
    ],
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: "seg-3", name: "GeoTargeted Campaign Audience",
    description: "Users in US/UK who are active on desktop",
    estimatedSize: 89200,
    groups: [
      { id: "g3", logic: "and", rules: [
        { id: "r7", field: "location", operator: "in", value: "United States, United Kingdom" },
        { id: "r8", field: "device", operator: "equals", value: "desktop" },
      ]},
      { id: "g4", logic: "or", rules: [
        { id: "r9", field: "age", operator: "between", value: "25", value2: "54" },
        { id: "r10", field: "total_revenue", operator: "gt", value: "500" },
      ]},
    ],
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

function load(): Segment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SEGMENTS));
    return DEFAULT_SEGMENTS;
  } catch { return []; }
}

function fmt(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

export default function Segmentation() {
  const { addToast } = useToast();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; description: string; groups: RuleGroup[] }>({ name: "", description: "", groups: [] });

  useEffect(() => { setSegments(load()); }, []);

  function persist(updated: Segment[]) {
    setSegments(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function toggle(id: string) { setExpanded(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; }); }

  function resetForm(s?: Segment) {
    if (s) setForm({ name: s.name, description: s.description, groups: s.groups.map(g => ({ ...g, rules: g.rules.map(r => ({ ...r })) })) });
    else setForm({ name: "", description: "", groups: [] });
  }

  function addGroup() {
    setForm(f => ({ ...f, groups: [...f.groups, { id: Date.now().toString(36), logic: "and" as RuleGroupLogic, rules: [] }] }));
  }

  function updateGroupLogic(id: string, logic: RuleGroupLogic) {
    setForm(f => ({ ...f, groups: f.groups.map(g => g.id === id ? { ...g, logic } : g) }));
  }

  function removeGroup(id: string) {
    setForm(f => ({ ...f, groups: f.groups.filter(g => g.id !== id) }));
  }

  function addRule(groupId: string) {
    setForm(f => ({ ...f, groups: f.groups.map(g => g.id === groupId ? { ...g, rules: [...g.rules, { id: Date.now().toString(36), field: "age" as RuleField, operator: "equals" as RuleOperator, value: "" }] } : g) }));
  }

  function updateRule(groupId: string, ruleId: string, field: keyof SegmentRule, value: any) {
    setForm(f => ({
      ...f, groups: f.groups.map(g => g.id === groupId ? {
        ...g, rules: g.rules.map(r => r.id === ruleId ? { ...r, [field]: value, ...(field === "field" ? { operator: FIELD_META[value as RuleField]?.operators[0] || "equals", value: "" } : {}) } : r),
      } : g),
    }));
  }

  function removeRule(groupId: string, ruleId: string) {
    setForm(f => ({ ...f, groups: f.groups.map(g => g.id === groupId ? { ...g, rules: g.rules.filter(r => r.id !== ruleId) } : g) }));
  }

  function handleSave() {
    if (!form.name.trim()) { addToast("error", "Segment name is required"); return; }
    const validGroups = form.groups.filter(g => g.rules.some(r => r.value.trim()));
    if (validGroups.length === 0) { addToast("error", "Add at least one rule with a value"); return; }
    const now = new Date().toISOString();
    const segment: Segment = {
      id: editingId || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: form.name.trim(), description: form.description.trim(),
      groups: validGroups.map(g => ({ ...g, rules: g.rules.filter(r => r.value.trim()).map(r => ({ ...r })) })),
      estimatedSize: Math.floor(Math.random() * 95000) + 5000,
      createdAt: editingId ? segments.find(s => s.id === editingId)!.createdAt : now,
      updatedAt: now,
    };
    let updated: Segment[];
    if (editingId) { updated = segments.map(s => s.id === editingId ? segment : s); addToast("success", "Segment updated"); }
    else { updated = [segment, ...segments]; addToast("success", "Segment created"); }
    persist(updated);
    setShowForm(false);
  }

  function handleDelete(id: string) {
    const name = segments.find(s => s.id === id)?.name;
    persist(segments.filter(s => s.id !== id));
    addToast("success", `"${name}" deleted`);
  }

  function duplicateSegment(id: string) {
    const s = segments.find(seg => seg.id === id);
    if (!s) return;
    const copy: Segment = { ...s, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: `${s.name} (Copy)`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    persist([copy, ...segments]);
    addToast("success", "Segment duplicated");
  }

  const filtered = segments.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Split className="w-6 h-6 text-n0va-400" />
            Segmentation Builder
          </h1>
          <p className="text-gray-400 mt-1">{segments.length} segments · {segments.reduce((s, seg) => s + seg.estimatedSize, 0).toLocaleString()} total reach</p>
        </div>
        <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> New Segment</button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
        <input className="input pl-10 pr-4 py-2 text-sm w-full" placeholder="Search segments..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">{editingId ? "Edit Segment" : "New Segment"}</h3><button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div><label className="label">Segment Name</label><input className="input" placeholder="e.g. High-Value Customers" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus /></div>
              <div><label className="label">Description</label><textarea className="input" rows={2} placeholder="What does this segment target?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div><div className="flex items-center justify-between mb-2"><label className="label mb-0">Rules</label><button type="button" onClick={addGroup} className="text-xs text-n0va-400 hover:text-n0va-300">+ Add Group</button></div>
                {form.groups.length === 0 && <p className="text-xs text-gray-600 py-2">No rule groups yet. Groups are combined with AND logic; rules within a group use the group's logic.</p>}
                {form.groups.map((group, gi) => (
                  <div key={group.id} className="mb-3 p-3 bg-n0va-900 rounded-lg border border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 font-mono">Group {gi + 1}</span>
                        <select className="text-[10px] bg-gray-800 text-gray-300 rounded px-1.5 py-0.5 border border-gray-700" value={group.logic} onChange={e => updateGroupLogic(group.id, e.target.value as RuleGroupLogic)}>
                          <option value="and">AND</option>
                          <option value="or">OR</option>
                        </select>
                        <span className="text-[10px] text-gray-600">logic</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => addRule(group.id)} className="text-xs text-n0va-400 hover:text-n0va-300">+ Rule</button>
                        {form.groups.length > 1 && <button type="button" onClick={() => removeGroup(group.id)} className="p-1 text-gray-600 hover:text-red-400"><X className="w-3 h-3" /></button>}
                      </div>
                    </div>
                    {group.rules.length === 0 && <p className="text-xs text-gray-700 py-1">No rules in this group. Add a rule.</p>}
                    <div className="space-y-2">
                      {group.rules.map((rule) => {
                        const fm = FIELD_META[rule.field];
                        return (
                          <div key={rule.id} className="flex items-center gap-1.5 flex-wrap">
                            <select className="text-xs bg-gray-800 text-gray-300 rounded px-1.5 py-1 border border-gray-700 min-w-[120px]" value={rule.field} onChange={e => updateRule(group.id, rule.id, "field", e.target.value as RuleField)}>
                              {Object.entries(FIELD_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                            <select className="text-xs bg-gray-800 text-gray-300 rounded px-1.5 py-1 border border-gray-700" value={rule.operator} onChange={e => updateRule(group.id, rule.id, "operator", e.target.value as RuleOperator)}>
                              {fm.operators.map(op => <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>)}
                            </select>
                            <input className="input text-xs py-1 w-28" placeholder={fm.placeholder} value={rule.value} onChange={e => updateRule(group.id, rule.id, "value", e.target.value)} />
                            {rule.operator === "between" && <><span className="text-xs text-gray-600">and</span><input className="input text-xs py-1 w-20" placeholder="e.g. 54" value={rule.value2 || ""} onChange={e => updateRule(group.id, rule.id, "value2", e.target.value)} /></>}
                            <button type="button" onClick={() => removeRule(group.id, rule.id)} className="p-1 text-gray-600 hover:text-red-400"><X className="w-3 h-3" /></button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{editingId ? "Save Changes" : "Create Segment"}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <Split className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No segments found</h3>
          <p className="text-sm text-gray-500">{search ? "Try different search terms" : "Build your first audience segment with custom rules."}</p>
          {!search && <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Create Segment</button>}
        </div>
      )}

      {/* Segment cards */}
      {filtered.map(seg => {
        const isOpen = expanded.has(seg.id);
        const totalRules = seg.groups.reduce((s, g) => s + g.rules.length, 0);
        return (
          <div key={seg.id} className="card overflow-hidden">
            <div className="p-5">
              <div className="flex items-start gap-4">
                <button onClick={() => toggle(seg.id)} className="p-1 mt-1 text-gray-600 hover:text-gray-300">{isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-base font-semibold text-white">{seg.name}</h3>
                    <span className="text-xs text-gray-600 flex items-center gap-1"><Users className="w-3 h-3" /> {fmt(seg.estimatedSize)}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{seg.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                    <span>{seg.groups.length} group{seg.groups.length !== 1 ? "s" : ""}</span>
                    <span>{totalRules} rule{totalRules !== 1 ? "s" : ""}</span>
                    <span>Updated {new Date(seg.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => duplicateSegment(seg.id)} className="p-1.5 text-gray-600 hover:text-gray-300"><Copy className="w-4 h-4" /></button>
                  <button onClick={() => { resetForm(seg); setEditingId(seg.id); setShowForm(true); }} className="p-1.5 text-gray-600 hover:text-gray-300"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(seg.id)} className="p-1.5 text-gray-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            {/* Expanded: rules visualization */}
            {isOpen && (
              <div className="border-t border-gray-800 p-4 space-y-3">
                {seg.groups.map((group, gi) => (
                  <div key={group.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-gray-400">Group {gi + 1}</span>
                      <span className="text-[10px] uppercase font-bold text-n0va-400 bg-n0va-500/10 px-1.5 py-0.5 rounded">{group.logic}</span>
                      <span className="text-[10px] text-gray-600">— all conditions must match</span>
                    </div>
                    <div className="space-y-1.5">
                      {group.rules.map(rule => {
                        const fm = FIELD_META[rule.field];
                        const Icon = fm?.icon || Target;
                        return (
                          <div key={rule.id} className="flex items-center gap-3 text-sm py-1.5 px-3 bg-gray-800/30 rounded-lg">
                            <Icon className="w-3.5 h-3.5 text-n0va-400 shrink-0" />
                            <span className="text-gray-400 min-w-[100px]">{fm?.label || rule.field}</span>
                            <span className="text-gray-600 font-mono text-xs">{OPERATOR_LABELS[rule.operator]}</span>
                            <span className="text-white font-medium">{rule.value}{rule.value2 ? ` — ${rule.value2}` : ""}</span>
                          </div>
                        );
                      })}
                    </div>
                    {gi < seg.groups.length - 1 && (
                      <div className="flex items-center gap-2 my-2">
                        <div className="flex-1 h-px bg-gray-800" />
                        <span className="text-[10px] uppercase font-bold text-gray-600">AND</span>
                        <div className="flex-1 h-px bg-gray-800" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
