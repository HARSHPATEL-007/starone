import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { ArrowLeft, FileJson, Code, Play, CheckCircle, AlertCircle, Clock, Terminal } from "lucide-react";

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [compiling, setCompiling] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState<any>(null);
  const [compileResult, setCompileResult] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.recipes.list()
      .then((list) => {
        const found = Array.isArray(list) ? list.find((r: any) => r._id === id || r.id === id) : null;
        if (!found) throw new Error("Recipe not found");
        setRecipe(found);
      })
      .catch(() => navigate("/recipes"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  async function handleCompile() {
    if (!recipe) return;
    setCompiling(true);
    setCompileResult(null);
    try {
      const result = await api.recipes.compile(recipe._id || recipe.id);
      setCompileResult(result);
      setRecipe((prev: any) => ({ ...prev, isCompiled: true, compiledCode: result.compiledCode || prev.compiledCode }));
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
    } finally {
      setExecuting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-n0va-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!recipe) {
    return <div className="text-gray-400 text-center py-12">Recipe not found</div>;
  }

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Steps ({recipe.steps?.length || 0})</h3>
            <div className="space-y-2">
              {(recipe.steps || []).map((step: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                  <div className="w-7 h-7 bg-n0va-600/20 rounded-full flex items-center justify-center text-xs text-n0va-400 font-bold">
                    {i + 1}
                  </div>
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
              <pre className="text-xs text-green-400 bg-gray-950 rounded-lg p-3 overflow-x-auto">
                {JSON.stringify(execResult, null, 2)}
              </pre>
            </div>
          )}

          {compileResult && (
            <div className="card border-n0va-500/30">
              <h3 className="text-lg font-semibold text-white mb-3">Compile Result</h3>
              <pre className="text-xs text-n0va-400 bg-gray-950 rounded-lg p-3 overflow-x-auto">
                {JSON.stringify(compileResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>
            <div className="space-y-3">
              {!recipe.isCompiled ? (
                <button className="btn-primary w-full flex items-center justify-center gap-2" onClick={handleCompile} disabled={compiling}>
                  {compiling ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Code className="w-4 h-4" />}
                  {compiling ? "Compiling..." : "Compile Recipe"}
                </button>
              ) : (
                <button className="btn-primary w-full flex items-center justify-center gap-2" onClick={handleExecute} disabled={executing}>
                  {executing ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Play className="w-4 h-4" />}
                  {executing ? "Executing..." : "Execute Recipe"}
                </button>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-3">Recipe Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`font-medium ${recipe.isCompiled ? "text-green-400" : "text-yellow-400"}`}>
                  {recipe.isCompiled ? "Compiled" : "Uncompiled"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Steps</span>
                <span className="text-white font-medium">{recipe.steps?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Trigger</span>
                <span className="text-n0va-400 font-medium text-xs max-w-[140px] truncate">{recipe.trigger}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="text-white">{recipe.createdAt ? new Date(recipe.createdAt).toLocaleDateString() : "N/A"}</span>
              </div>
            </div>
          </div>

          {recipe.hitlGate && (
            <div className="card border-yellow-500/30 bg-yellow-500/5">
              <h3 className="text-sm text-yellow-400 font-semibold mb-2">Human-in-the-Loop Gate</h3>
              <p className="text-xs text-yellow-400/80">
                {recipe.hitlGate.field} threshold at ${recipe.hitlGate.threshold?.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
