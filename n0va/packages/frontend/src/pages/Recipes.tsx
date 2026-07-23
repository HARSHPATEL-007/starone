import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { FileJson, Play, Code, CheckCircle, AlertCircle, Plus, Trash2, Edit3, X, Search, ExternalLink } from "lucide-react";
import { api } from "../api/client";
import { SkeletonCard } from "../components/Skeleton";
import { useToast } from "../components/Toast";

export default function Recipes() {
  const { addToast } = useToast();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [compiling, setCompiling] = useState<string | null>(null);
  const [executing, setExecuting] = useState<string | null>(null);
  const [execResult, setExecResult] = useState<any>(null);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", trigger: "", hitlThreshold: 0, hitlField: "" });
  const [steps, setSteps] = useState<{ action: string; platform: string }[]>([{ action: "", platform: "" }]);

  const loadRecipes = useCallback(async () => {
    setLoading(true);
    try { setRecipes(await api.recipes.list()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRecipes(); }, [loadRecipes]);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", description: "", trigger: "", hitlThreshold: 0, hitlField: "" });
    setSteps([{ action: "", platform: "" }]);
    setShowForm(true);
  }

  function openEdit(r: any) {
    setEditing(r);
    setForm({ name: r.name, description: r.description || "", trigger: r.trigger, hitlThreshold: r.hitlGate?.threshold || 0, hitlField: r.hitlGate?.field || "" });
    setSteps(r.steps?.length > 0 ? r.steps.map((s: any) => ({ action: s.action, platform: s.platform })) : [{ action: "", platform: "" }]);
    setShowForm(true);
  }

  function addStep() { setSteps((prev) => [...prev, { action: "", platform: "" }]); }
  function removeStep(i: number) { setSteps((prev) => prev.filter((_, idx) => idx !== i)); }
  function updateStep(i: number, key: "action" | "platform", value: string) {
    setSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, [key]: value } : s));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const validSteps = steps.filter((s) => s.action && s.platform);
    if (validSteps.length === 0) return;
    const data: any = {
      name: form.name,
      description: form.description,
      trigger: form.trigger,
      steps: validSteps,
    };
    if (form.hitlThreshold > 0 && form.hitlField) {
      data.hitlGate = { threshold: form.hitlThreshold, field: form.hitlField };
    }
    try {
      if (editing) {
        await api.recipes.update(editing._id, data);
      } else {
        await api.recipes.create(data);
      }
      setShowForm(false);
      setEditing(null);
      loadRecipes();
      addToast("success", editing ? "Recipe updated" : "Recipe created");
    } catch {
      addToast("error", editing ? "Failed to update recipe" : "Failed to create recipe");
    }
  }

  async function compileRecipe(id: string) {
    setCompiling(id);
    try { await api.recipes.compile(id); loadRecipes(); } finally { setCompiling(null); }
  }

  async function executeRecipe(id: string) {
    setExecuting(id);
    setExecResult(null);
    try {
      const result = await api.recipes.execute(id);
      setExecResult(result);
    } finally { setExecuting(null); }
  }

  async function handleDelete(id: string) {
    try { await api.recipes.delete(id); setShowDelete(null); loadRecipes(); addToast("success", "Recipe deleted"); }
    catch { addToast("error", "Failed to delete recipe"); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">N0VA1O Recipes</h1>
          <p className="text-gray-500 mt-1">Compiled deterministic workflows that bypass LLM inference</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
          <FileJson className="w-4 h-4" /> New Recipe
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input className="input pl-10" placeholder="Search recipes..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-4">{editing ? "Edit" : "Create"} Recipe</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Auto-Budget-Reallocation-v2" required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="When ROAS drops 15%, shift budget" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Trigger</label>
                <input className="input font-mono text-xs" value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })} placeholder="roas_drop > 0.15 on meta for 4h" required />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Steps</label>
                <div className="space-y-2">
                  {steps.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-5">{i + 1}.</span>
                      <input className="input flex-1 font-mono text-xs" placeholder="action (e.g. shift_budget)" value={s.action} onChange={(e) => updateStep(i, "action", e.target.value)} required />
                      <input className="input flex-1 font-mono text-xs" placeholder="platform (e.g. meta)" value={s.platform} onChange={(e) => updateStep(i, "platform", e.target.value)} required />
                      <button type="button" className="text-gray-500 hover:text-red-400 p-1 disabled:opacity-30" onClick={() => removeStep(i)} disabled={steps.length <= 1}><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
                <button type="button" className="btn-secondary text-xs mt-2 flex items-center gap-1" onClick={addStep}>
                  <Plus className="w-3 h-3" /> Add Step
                </button>
              </div>

              <div className="border-t border-gray-800 pt-4">
                <label className="block text-sm text-gray-400 mb-2">HITL Gate (optional)</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Threshold ($)</label>
                    <input type="number" className="input" value={form.hitlThreshold || ""} onChange={(e) => setForm({ ...form, hitlThreshold: parseInt(e.target.value) || 0 })} min={0} placeholder="10000" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Field</label>
                    <input className="input" value={form.hitlField} onChange={(e) => setForm({ ...form, hitlField: e.target.value })} placeholder="budget_shift" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</button>
                <button type="submit" className="btn-primary">{editing ? "Save" : "Create Recipe"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card max-w-sm mx-4 text-center">
            <p className="text-white mb-4">Delete this recipe?</p>
            <div className="flex gap-3 justify-center">
              <button className="btn-secondary" onClick={() => setShowDelete(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => handleDelete(showDelete)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : recipes.length === 0 ? (
        <div className="card text-center py-12">
          <Code className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No recipes yet. Create your first N0VA1O recipe.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {recipes.filter((r) => !search || r.name?.toLowerCase().includes(search.toLowerCase())).map((r) => (
            <div key={r._id} className="card relative group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <Link to={`/recipes/${r._id}`} className="text-white font-semibold hover:text-n0va-400">{r.name}</Link>
                    {r.isCompiled ? (
                      <span className="badge-active flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Compiled</span>
                    ) : (
                      <span className="badge-draft flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Uncompiled</span>
                    )}
                  </div>
                  {r.description && <p className="text-sm text-gray-500">{r.description}</p>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                  <button className="text-gray-500 hover:text-n0va-400 p-1" onClick={() => openEdit(r)}><Edit3 className="w-3.5 h-3.5" /></button>
                  <button className="text-gray-500 hover:text-red-400 p-1" onClick={() => setShowDelete(r._id)}><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Trigger</p>
                  <code className="text-xs text-n0va-400 bg-gray-800 px-2 py-1 rounded">{r.trigger}</code>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Steps ({r.steps?.length || 0})</p>
                  <div className="flex flex-wrap gap-1">
                    {(r.steps || []).map((s: any, i: number) => (
                      <span key={i} className="badge bg-gray-800 text-gray-300 text-xs">
                        {s.action} <span className="text-gray-500">→</span> {s.platform}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {r.hitlGate && (
                <div className="text-xs text-yellow-400 bg-yellow-900/10 border border-yellow-600/20 rounded-lg px-3 py-2 mb-4">
                  HITL Gate: {r.hitlGate.field} threshold at ${r.hitlGate.threshold?.toLocaleString()}
                </div>
              )}

              {r.compiledCode && r.isCompiled && (
                <pre className="text-xs text-gray-400 bg-gray-950 rounded-lg p-3 mb-4 overflow-x-auto">{r.compiledCode}</pre>
              )}

              <div className="flex gap-2">
                {!r.isCompiled ? (
                  <button className="btn-primary text-sm flex items-center gap-2" onClick={() => compileRecipe(r._id)} disabled={compiling === r._id}>
                    {compiling === r._id ? <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-1" /> Compiling...</> : <><Code className="w-4 h-4" /> Compile</>}
                  </button>
                ) : (
                  <button className="btn-primary text-sm flex items-center gap-2" onClick={() => executeRecipe(r._id)} disabled={executing === r._id}>
                    {executing === r._id ? <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-1" /> Executing...</> : <><Play className="w-4 h-4" /> Execute</>}
                  </button>
                )}
              </div>

              {execResult && execResult.recipeId === r._id && (
                <div className="mt-4 bg-gray-950 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-2">Execution Results:</p>
                  <pre className="text-xs text-green-400 overflow-x-auto">{JSON.stringify(execResult.results, null, 2)}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
