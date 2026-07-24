import { useState, useEffect } from "react";
import { Calculator, TrendingUp, DollarSign, Target, Trash2, Plus, X, Copy, BarChart3, Download, Edit3 } from "lucide-react";
import { useToast } from "../components/Toast";
import { api } from "../api/client";

interface Scenario {
  id: string;
  name: string;
  budget: number;
  impressions: number;
  ctr: number;
  conversionRate: number;
  aov: number;
  fixedCosts: number;
  createdAt: string;
}

interface Projection {
  clicks: number;
  conversions: number;
  revenue: number;
  cpc: number;
  cpm: number;
  cpa: number;
  roas: number;
  profit: number;
  margin: number;
}

function calc(budget: number, impressions: number, ctr: number, cvr: number, aov: number, fixed: number): Projection {
  const clicks = impressions * (ctr / 100);
  const conversions = clicks * (cvr / 100);
  const revenue = conversions * aov;
  const cpc = clicks > 0 ? budget / clicks : 0;
  const cpm = impressions > 0 ? (budget / impressions) * 1000 : 0;
  const cpa = conversions > 0 ? budget / conversions : 0;
  const roas = budget > 0 ? revenue / budget : 0;
  const totalCost = budget + fixed;
  const profit = revenue - totalCost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  return { clicks, conversions, revenue, cpc, cpm, cpa, roas, profit, margin };
}

function fmt(n: number, decimals = 0): string {
  if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toFixed(decimals);
}

function currency(n: number): string {
  return "$" + (n >= 1000 ? fmt(n) : n.toFixed(2));
}

export default function ROICalculator() {
  const { addToast } = useToast();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", budget: 10000, impressions: 500000, ctr: 2.0, conversionRate: 3.0, aov: 75, fixedCosts: 2000 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.entities.list("roi_scenarios");
        setScenarios(data || []);
      } catch { setScenarios([]); }
      setLoading(false);
    })();
  }, []);

  async function persist(updated: Scenario[]) {
    setScenarios(updated);
    try {
      const existing = await api.entities.list("roi_scenarios");
      if (existing && existing.length > 0) await api.entities.deleteAll("roi_scenarios");
      for (const s of updated) await api.entities.create("roi_scenarios", s as any);
    } catch {}
  }

  function toggleSelect(id: string) {
    setSelectedIds(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function selectAll() { setSelectedIds(new Set(scenarios.map(s => s.id))); }
  function deselectAll() { setSelectedIds(new Set()); }

  function handleSave() {
    if (!form.name.trim()) { addToast("error", "Scenario name is required"); return; }
    const scenario: Scenario = {
      id: editingId || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: form.name.trim(),
      budget: form.budget, impressions: form.impressions, ctr: form.ctr,
      conversionRate: form.conversionRate, aov: form.aov, fixedCosts: form.fixedCosts,
      createdAt: editingId ? scenarios.find(s => s.id === editingId)!.createdAt : new Date().toISOString(),
    };
    let updated: Scenario[];
    if (editingId) { updated = scenarios.map(s => s.id === editingId ? scenario : s); addToast("success", "Scenario updated"); }
    else { updated = [scenario, ...scenarios]; addToast("success", "Scenario created"); }
    persist(updated);
    setShowForm(false);
  }

  function handleDelete(id: string) {
    const name = scenarios.find(s => s.id === id)?.name;
    persist(scenarios.filter(s => s.id !== id));
    selectedIds.delete(id);
    addToast("success", `"${name}" deleted`);
  }

  function duplicateScenario(id: string) {
    const s = scenarios.find(sc => sc.id === id);
    if (!s) return;
    const copy: Scenario = { ...s, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: `${s.name} (Copy)`, createdAt: new Date().toISOString() };
    persist([copy, ...scenarios]);
    addToast("success", "Scenario duplicated");
  }

  function resetForm(s?: Scenario) {
    if (s) setForm({ name: s.name, budget: s.budget, impressions: s.impressions, ctr: s.ctr, conversionRate: s.conversionRate, aov: s.aov, fixedCosts: s.fixedCosts });
    else setForm({ name: "", budget: 10000, impressions: 500000, ctr: 2.0, conversionRate: 3.0, aov: 75, fixedCosts: 2000 });
  }

  function exportCSV() {
    const header = "Name,Budget,Impressions,CTR%,Conv%,AOV,Fixed Costs,Clicks,Conversions,Revenue,CPC,CPM,CPA,ROAS,Profit,Margin%";
    const rows = scenarios.map(s => {
      const p = calc(s.budget, s.impressions, s.ctr, s.conversionRate, s.aov, s.fixedCosts);
      return `${s.name},${s.budget},${s.impressions},${s.ctr},${s.conversionRate},${s.aov},${s.fixedCosts},${Math.round(p.clicks)},${Math.round(p.conversions)},${p.revenue.toFixed(2)},${p.cpc.toFixed(4)},${p.cpm.toFixed(2)},${p.cpa.toFixed(2)},${p.roas.toFixed(2)},${p.profit.toFixed(2)},${p.margin.toFixed(1)}`;
    }).join("\n");
    const blob = new Blob(["\ufeff" + header + "\n" + rows], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "roi_scenarios.csv"; a.click();
    addToast("success", "Exported as CSV");
  }

  const comparison = [...selectedIds].map(id => {
    const s = scenarios.find(sc => sc.id === id);
    if (!s) return null;
    return { ...s, projection: calc(s.budget, s.impressions, s.ctr, s.conversionRate, s.aov, s.fixedCosts) };
  }).filter(Boolean) as (Scenario & { projection: Projection })[];

  const allProjections = scenarios.map(s => ({ ...s, projection: calc(s.budget, s.impressions, s.ctr, s.conversionRate, s.aov, s.fixedCosts) }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Calculator className="w-6 h-6 text-n0va-400" />
            ROI Calculator
          </h1>
          <p className="text-gray-400 mt-1">{scenarios.length} scenarios</p>
        </div>
        <div className="flex items-center gap-2">
          {scenarios.length > 0 && <button onClick={exportCSV} className="btn-ghost text-sm"><Download className="w-4 h-4 mr-1" /> CSV</button>}
          <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> New Scenario</button>
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">{editingId ? "Edit Scenario" : "New Scenario"}</h3><button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-3">
              <div><label className="label">Scenario Name</label><input className="input" placeholder="e.g. Conservative Estimate" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Budget ($)</label><input type="number" className="input" value={form.budget || ""} onChange={e => setForm({ ...form, budget: Number(e.target.value) || 0 })} /></div>
                <div><label className="label">Fixed Costs ($)</label><input type="number" className="input" value={form.fixedCosts || ""} onChange={e => setForm({ ...form, fixedCosts: Number(e.target.value) || 0 })} /></div>
              </div>
              <div><label className="label">Expected Impressions</label><input type="number" className="input" value={form.impressions || ""} onChange={e => setForm({ ...form, impressions: Number(e.target.value) || 0 })} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="label">CTR (%)</label><input type="number" step="0.1" className="input" value={form.ctr || ""} onChange={e => setForm({ ...form, ctr: Number(e.target.value) || 0 })} /></div>
                <div><label className="label">Conv. Rate (%)</label><input type="number" step="0.1" className="input" value={form.conversionRate || ""} onChange={e => setForm({ ...form, conversionRate: Number(e.target.value) || 0 })} /></div>
                <div><label className="label">AOV ($)</label><input type="number" className="input" value={form.aov || ""} onChange={e => setForm({ ...form, aov: Number(e.target.value) || 0 })} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{editingId ? "Save Changes" : "Create Scenario"}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card p-12 flex items-center justify-center text-center">
          <Calculator className="w-6 h-6 text-n0va-400 animate-spin" />
          <span className="ml-3 text-gray-400">Loading scenarios...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && scenarios.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <Calculator className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No ROI scenarios</h3>
          <p className="text-sm text-gray-500">Create scenarios to project campaign ROI and compare outcomes.</p>
          <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Create Scenario</button>
        </div>
      )}

      {/* Comparison view (selected scenarios side by side) */}
      {comparison.length >= 2 && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><BarChart3 className="w-4 h-4 text-n0va-400" /> Side-by-Side Comparison</h3>
            <button onClick={deselectAll} className="text-xs text-gray-500 hover:text-gray-300">Clear selection</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800">{comparison.map(c => <th key={c.id} className="text-left p-3 text-white font-medium">{c.name}</th>)}</tr></thead>
              <tbody>
                {[["Budget", (c: any) => currency(c.budget)], ["Fixed Costs", (c: any) => currency(c.fixedCosts)], ["Impressions", (c: any) => fmt(c.impressions)], ["CTR", (c: any) => c.ctr + "%"], ["Conv. Rate", (c: any) => c.conversionRate + "%"], ["AOV", (c: any) => currency(c.aov)], ["Clicks", (c: any) => fmt(Math.round(c.projection.clicks))], ["Conversions", (c: any) => fmt(Math.round(c.projection.conversions))], ["Revenue", (c: any) => currency(c.projection.revenue)], ["Profit", (c: any) => currency(c.projection.profit)], ["ROAS", (c: any) => c.projection.roas.toFixed(2) + "x"], ["CPA", (c: any) => currency(c.projection.cpa)], ["CPC", (c: any) => c.projection.cpc.toFixed(4)], ["CPM", (c: any) => currency(c.projection.cpm)], ["Margin", (c: any) => c.projection.margin.toFixed(1) + "%"]].map(([label, fn]) => (
                  <tr key={label as string} className="border-b border-gray-800/50 last:border-0"><td className="p-3 text-gray-500">{label as string}</td>{comparison.map(c => <td key={c.id} className="p-3 text-white font-mono">{(fn as any)(c)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Scenario grid */}
      {allProjections.length > 0 && (
        <>
          {comparison.length >= 2 && <h3 className="text-base font-semibold text-white flex items-center gap-2"><Target className="w-4 h-4 text-n0va-400" /> All Scenarios</h3>}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {allProjections.map(({ id, name, budget, impressions, ctr, conversionRate, aov, fixedCosts, projection: p }) => {
              const selected = selectedIds.has(id);
              return (
                <div key={id} className={`card p-5 relative ${selected ? "ring-2 ring-n0va-500" : ""}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={selected} onChange={() => toggleSelect(id)} className="w-4 h-4 rounded border-gray-700 bg-gray-800 accent-n0va-500" />
                      <h3 className="text-sm font-semibold text-white">{name}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => duplicateScenario(id)} className="p-1 text-gray-600 hover:text-gray-300"><Copy className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { resetForm(scenarios.find(s => s.id === id)!); setEditingId(id); setShowForm(true); }} className="p-1 text-gray-600 hover:text-gray-300"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(id)} className="p-1 text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>

                  {/* Inputs */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3 text-xs">
                    <span className="text-gray-600">Budget</span><span className="text-gray-300 text-right font-mono">{currency(budget)}</span>
                    <span className="text-gray-600">Impressions</span><span className="text-gray-300 text-right font-mono">{fmt(impressions)}</span>
                    <span className="text-gray-600">CTR / CVR</span><span className="text-gray-300 text-right font-mono">{ctr}% / {conversionRate}%</span>
                    <span className="text-gray-600">AOV / Fixed</span><span className="text-gray-300 text-right font-mono">{currency(aov)} / {currency(fixedCosts)}</span>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-800 my-3" />

                  {/* Results */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2 rounded-lg bg-green-500/5">
                      <p className="text-[10px] text-gray-600">Revenue</p>
                      <p className="text-sm font-bold text-green-400">{currency(p.revenue)}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-green-500/5">
                      <p className="text-[10px] text-gray-600">ROAS</p>
                      <p className="text-sm font-bold text-green-400">{p.roas.toFixed(2)}x</p>
                    </div>
                    <div className="p-2 rounded-lg" style={{ backgroundColor: p.profit >= 0 ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.05)" }}>
                      <p className="text-[10px] text-gray-600">Profit</p>
                      <p className={`text-sm font-bold ${p.profit >= 0 ? "text-green-400" : "text-red-400"}`}>{currency(p.profit)}</p>
                    </div>
                    <div className="p-2 rounded-lg" style={{ backgroundColor: p.margin >= 0 ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.05)" }}>
                      <p className="text-[10px] text-gray-600">Margin</p>
                      <p className={`text-sm font-bold ${p.margin >= 0 ? "text-green-400" : "text-red-400"}`}>{p.margin.toFixed(1)}%</p>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-500/5">
                      <p className="text-[10px] text-gray-600">CPA</p>
                      <p className="text-sm font-bold text-blue-400">{currency(p.cpa)}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-purple-500/5">
                      <p className="text-[10px] text-gray-600">CPM</p>
                      <p className="text-sm font-bold text-purple-400">{currency(p.cpm)}</p>
                    </div>
                  </div>

                  {/* Bar: revenue vs cost */}
                  <div className="mt-3 pt-3 border-t border-gray-800">
                    <div className="flex items-center justify-between text-[10px] text-gray-600 mb-1">
                      <span>Cost: {currency(budget + fixedCosts)}</span>
                      <span>Revenue: {currency(p.revenue)}</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
                      <div className="bg-red-500/60 h-full transition-all" style={{ width: `${Math.min((budget + fixedCosts) / p.revenue * 50, 50)}%` }} />
                      <div className="bg-green-500/60 h-full transition-all" style={{ width: `${Math.min((p.revenue - budget - fixedCosts) / p.revenue * 50, 50)}%` }} />
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[10px]">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500/60" /> Spend</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500/60" /> Profit</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
