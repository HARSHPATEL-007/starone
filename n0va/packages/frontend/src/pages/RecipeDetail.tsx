import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { ArrowLeft, FileJson, Code, Play, CheckCircle, AlertCircle, Clock, Terminal, RefreshCw, Trash2, Edit3, Save, X, History, Activity } from "lucide-react";
import { SkeletonCard } from "../components/Skeleton";
import { useRecentItems } from "../hooks/useRecentItems";

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { track } = useRecentItems();
  const [recipe, setRecipe] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [compiling, setCompiling] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState<any>(null);
  const [compileResult, setCompileResult] = useState<any>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", trigger: "" });

  useEffect(() => { loadData(); }, [id, navigate]);

  async function loadData() {
    if (!id) return;
    setLoading(true);
    try {
      const [found, activityList] = await Promise.all([
        api.recipes.get(id),
        api.activity.list(`entityType=recipe&entityId=${id}&limit=20`).catch(() => []),
      ]);
      setRecipe(found);
      track({ type: "recipe", id: found._id || found.id, label: found.name, route: `/recipes/${found._id || found.id}` });
      setEditForm({ name: found.name, description: found.description || "", trigger: found.trigger || "" });
      setActivities(Array.isArray(activityList) ? activityList : []);
    } catch {
      navigate("/recipes");
    } finally {
      setLoading(false);
    }
  }

  async function handleCompile() {
    if (!recipe) return;
    setCompiling(true);
    setCompileResult(null);
    try {
      const result = await api.recipes.compile(recipe._id || recipe.id);
      setCompileResult(result);
      setRecipe((prev: any) => ({ ...prev, isCompiled: true, compiledCode: result.compiledCode || prev.compiledCode }));
      await api.activity.create({ entityType: "recipe", entityId: recipe._id || recipe.id, entityName: recipe.name, action: "compile", details: "Recipe compiled successfully" });
      addToast("success", "Recipe compiled");
      loadData();
    } catch {
      addToast("error", "Compile failed");
    } finally {
      setCompiling(false);
    }
  }

  async function handleExecute() {
    if (!recipe) return;
    setExecuting(true);
    setExecResult(null);
    try {
      const result = await api.recipes.execute(recipe._id || recipe.id);
      setExecResult(result);
      await api.activity.create({ entityType: "recipe", entityId: recipe._id || recipe.id, entityName: recipe.name, action: "execute", details: `Recipe executed: ${result.results?.length || 0} steps completed` });
      addToast("success", "Recipe executed");
      loadData();
    } catch {
      addToast("error", "Execute failed");
    } finally {
      setExecuting(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!recipe) return;
    try {
      const updated = await api.recipes.update(recipe._id || recipe.id, editForm);
      setRecipe(updated || { ...recipe, ...editForm });
      setShowEdit(false);
      addToast("success", "Recipe updated");
    } catch {
      addToast("error", "Failed to update recipe");
    }
  }

  async function handleDelete() {
    if (!id) return;
    try {
      await api.recipes.delete(id);
      addToast("success", "Recipe deleted");
      navigate("/recipes");
    } catch {
      addToast("error", "Failed to delete recipe");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-5 w-5 bg-gray-800 rounded animate-pulse" />
          <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="text-gray-400 text-center py-12">
        <p className="mb-4">Recipe not found</p>
        <button className="btn-secondary flex items-center gap-2 mx-auto" onClick={loadData}>
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/recipes")} className="text-gray-500 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
            <FileJson className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{recipe.name}</h1>
              {recipe.isCompiled ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-green-400 bg-green-500/10">
                  <CheckCircle className="w-3 h-3" /> Compiled
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-yellow-400 bg-yellow-500/10">
                  <AlertCircle className="w-3 h-3" /> Uncompiled
                </span>
              )}
            </div>
            {recipe.description && <p className="text-gray-500 mt-1">{recipe.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary flex items-center gap-1.5 text-sm" onClick={() => setShowEdit(true)}>
            <Edit3 className="w-4 h-4" /> Edit
          </button>
          <button className="text-red-400 hover:text-red-300 flex items-center gap-1.5 text-sm" onClick={() => setShowDelete(true)}>
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Steps ({recipe.steps?.length || 0})</h3>
            <div className="space-y-2">
              {(recipe.steps || []).map((step: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                  <div className="w-7 h-7 bg-n0va-600/20 rounded-full flex items-center justify-center text-xs text-n0va-400 font-bold">{i + 1}</div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium capitalize">{step.action?.replace(/_/g, " ")}</p>
                    {step.platform && <p className="text-xs text-gray-500">Platform: {step.platform}</p>}
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-900 px-2 py-1 rounded">{step.platform}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Trigger</h3>
            <pre className="text-sm text-n0va-400 bg-gray-950 rounded-lg p-3 font-mono">{recipe.trigger}</pre>
          </div>

          {recipe.compiledCode && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Compiled Code</h3>
                <Terminal className="w-4 h-4 text-gray-500" />
              </div>
              <pre className="text-xs text-gray-400 bg-gray-950 rounded-lg p-4 overflow-x-auto max-h-96 overflow-y-auto">{recipe.compiledCode}</pre>
            </div>
          )}

          {execResult && (
            <div className="card border-green-500/30">
              <h3 className="text-lg font-semibold text-white mb-3">Execution Result</h3>
              <pre className="text-xs text-green-400 bg-gray-950 rounded-lg p-3 overflow-x-auto">{JSON.stringify(execResult, null, 2)}</pre>
            </div>
          )}

          {compileResult && (
            <div className="card border-n0va-500/30">
              <h3 className="text-lg font-semibold text-white mb-3">Compile Result</h3>
              <pre className="text-xs text-n0va-400 bg-gray-950 rounded-lg p-3 overflow-x-auto">{JSON.stringify(compileResult, null, 2)}</pre>
            </div>
          )}

          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <History className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-white">Activity Log</h3>
            </div>
            {activities.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {activities.map((a: any) => (
                  <div key={a._id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50">
                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${a.action === "compile" ? "bg-purple-400" : a.action === "execute" ? "bg-green-400" : "bg-yellow-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white capitalize">{a.action}: {a.details}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{a.timestamp ? new Date(a.timestamp).toLocaleString() : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Activity className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                <p className="text-sm">No activity yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>
            <div className="space-y-3">
              <button className="btn-primary w-full flex items-center justify-center gap-2" onClick={handleCompile} disabled={compiling}>
                {compiling ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Code className="w-4 h-4" />}
                {compiling ? "Compiling..." : recipe.isCompiled ? "Re-Compile" : "Compile Recipe"}
              </button>
              <button className="btn-primary w-full flex items-center justify-center gap-2" onClick={handleExecute} disabled={executing || !recipe.isCompiled}>
                {executing ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Play className="w-4 h-4" />}
                {executing ? "Executing..." : "Execute Recipe"}
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-3">Recipe Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Status</span><span className={`font-medium ${recipe.isCompiled ? "text-green-400" : "text-yellow-400"}`}>{recipe.isCompiled ? "Compiled" : "Uncompiled"}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Steps</span><span className="text-white font-medium">{recipe.steps?.length || 0}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Trigger</span><span className="text-n0va-400 font-medium text-xs max-w-[140px] truncate">{recipe.trigger}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Created</span><span className="text-white">{recipe.createdAt ? new Date(recipe.createdAt).toLocaleDateString() : "N/A"}</span></div>
            </div>
          </div>

          {recipe.hitlGate && (
            <div className="card border-yellow-500/30 bg-yellow-500/5">
              <h3 className="text-sm text-yellow-400 font-semibold mb-2">Human-in-the-Loop Gate</h3>
              <p className="text-xs text-yellow-400/80">{recipe.hitlGate.field} threshold at ${recipe.hitlGate.threshold?.toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowEdit(false)}>
          <div className="w-full max-w-lg bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Edit Recipe</h3>
              <button onClick={() => setShowEdit(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div><label className="block text-sm text-gray-400 mb-1">Name</label><input className="input" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Description</label><textarea className="input" rows={3} value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Trigger</label><input className="input" value={editForm.trigger} onChange={(e) => setEditForm((f) => ({ ...f, trigger: e.target.value }))} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" /> Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm bg-n0va-800 rounded-xl border border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Recipe</h3>
            <p className="text-sm text-gray-400 mb-4">Are you sure you want to delete {recipe.name}?</p>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setShowDelete(false)}>Cancel</button>
              <button className="btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
