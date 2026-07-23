import { useEffect, useState } from "react";
import { FileJson, Play, Code, CheckCircle, AlertCircle } from "lucide-react";

export default function Recipes() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [compiling, setCompiling] = useState<string | null>(null);
  const [executing, setExecuting] = useState<string | null>(null);
  const [execResult, setExecResult] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", trigger: "", steps: "" });

  useEffect(() => { loadRecipes(); }, []);

  async function loadRecipes() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/recipes");
      setRecipes(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const steps = form.steps.split("\n").filter(Boolean).map((line) => {
      const parts = line.split(":");
      return { action: parts[0] || "", platform: parts[1] || "", params: {} };
    });
    await fetch("/api/v1/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + btoa(JSON.stringify({ userId: "user_001", tenantId: "tenant_001", role: "admin" })), "x-tenant-id": "tenant_001" },
      body: JSON.stringify({ name: form.name, description: form.description, trigger: form.trigger, steps }),
    });
    setShowCreate(false);
    setForm({ name: "", description: "", trigger: "", steps: "" });
    loadRecipes();
  }

  async function compileRecipe(id: string) {
    setCompiling(id);
    await fetch(`/api/v1/recipes/${id}/compile`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + btoa(JSON.stringify({ userId: "user_001", tenantId: "tenant_001", role: "admin" })), "x-tenant-id": "tenant_001" },
    });
    setCompiling(null);
    loadRecipes();
  }

  async function executeRecipe(id: string) {
    setExecuting(id);
    setExecResult(null);
    const res = await fetch(`/api/v1/recipes/${id}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + btoa(JSON.stringify({ userId: "user_001", tenantId: "tenant_001", role: "admin" })), "x-tenant-id": "tenant_001" },
    });
    const result = await res.json();
    setExecResult(result);
    setExecuting(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">N0VA1O Recipes</h1>
          <p className="text-gray-500 mt-1">Compiled deterministic workflows that bypass LLM inference</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
          <FileJson className="w-4 h-4" /> New Recipe
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-4">Create Recipe</h2>
            <form onSubmit={handleCreate} className="space-y-4">
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
                <input className="input" value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })} placeholder="roas_drop > 0.15 on meta for 4h" required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Steps (one per line: action:platform)</label>
                <textarea className="input font-mono text-xs" rows={5} value={form.steps} onChange={(e) => setForm({ ...form, steps: e.target.value })} placeholder={"shift_budget:meta\nshift_budget:google\nexpand_lookalike:meta"} required />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Recipe</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-n0va-500 border-t-transparent rounded-full" /></div>
      ) : recipes.length === 0 ? (
        <div className="card text-center py-12">
          <Code className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No recipes yet. Create your first N0VA1O recipe.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {recipes.map((r) => (
            <div key={r._id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-white font-semibold">{r.name}</h3>
                    {r.isCompiled ? (
                      <span className="badge-active flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Compiled</span>
                    ) : (
                      <span className="badge-draft flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Uncompiled</span>
                    )}
                  </div>
                  {r.description && <p className="text-sm text-gray-500">{r.description}</p>}
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
                <pre className="text-xs text-gray-400 bg-gray-950 rounded-lg p-3 mb-4 overflow-x-auto">
                  {r.compiledCode}
                </pre>
              )}

              <div className="flex gap-2">
                {!r.isCompiled ? (
                  <button className="btn-primary text-sm flex items-center gap-2" onClick={() => compileRecipe(r._id)} disabled={compiling === r._id}>
                    {compiling === r._id ? "Compiling..." : <><Code className="w-4 h-4" /> Compile</>}
                  </button>
                ) : (
                  <button className="btn-primary text-sm flex items-center gap-2" onClick={() => executeRecipe(r._id)} disabled={executing === r._id}>
                    {executing === r._id ? "Executing..." : <><Play className="w-4 h-4" /> Execute</>}
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
