import { useState, useEffect } from "react";
import { Terminal, File, Folder, Play, Trash2, Clock, Code, Database, Download, Upload, AlertCircle, CheckCircle, X, RefreshCw, Loader, Plus } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";

export default function SandboxConsole() {
  const { addToast } = useToast();
  const [sandboxes, setSandboxes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"sandboxes" | "files" | "scripts">("sandboxes");
  const [loading, setLoading] = useState(true);
  const [scriptInput, setScriptInput] = useState("");
  const [scriptResult, setScriptResult] = useState("");
  const [executing, setExecuting] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const health = await api.platforms.health();
      setSandboxes(health?.sandbox ? [health.sandbox] : []);
    } finally { setLoading(false); }
  }

  async function handleExecute() {
    if (!scriptInput.trim()) return;
    setExecuting(true);
    setScriptResult("");
    try {
      const res = await api.platforms.execute({ script: scriptInput, sandbox: true });
      setScriptResult(JSON.stringify(res, null, 2));
      addToast("success", "Script executed in sandbox");
    } catch (e: any) {
      setScriptResult(`Error: ${e.message || "Execution failed"}`);
    }
    setExecuting(false);
  }

  const sampleScripts = [
    { name: "List Platforms", code: "platforms.list()" },
    { name: "Health Check", code: "gateway.health()" },
    { name: "Campaign Metrics", code: "analytics.overview({days: 30})" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Terminal className="w-6 h-6 text-n0va-400" />
            N0VA1O Sandbox
          </h1>
          <p className="text-gray-400 mt-1">Isolated execution environment for scripts and virtual file system</p>
        </div>
        <button className="btn-ghost text-sm flex items-center gap-1.5" onClick={loadData}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="flex gap-2 border-b border-gray-800 mb-2">
        {(["sandboxes", "files", "scripts"] as const).map((tab) => (
          <button key={tab} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${activeTab === tab ? "border-n0va-400 text-n0va-400" : "border-transparent text-gray-500 hover:text-gray-300"}`} onClick={() => setActiveTab(tab)}>
            {tab === "sandboxes" ? "Sandbox Status" : tab === "files" ? "Virtual File System" : "Script Executor"}
          </button>
        ))}
      </div>

      {activeTab === "sandboxes" && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader className="w-6 h-6 animate-spin text-n0va-400" /></div>
          ) : sandboxes.length === 0 ? (
            <div className="card p-12 flex flex-col items-center justify-center text-center">
              <Terminal className="w-12 h-12 text-gray-700 mb-4" />
              <h3 className="text-lg font-semibold text-gray-300 mb-2">No sandbox data</h3>
              <p className="text-sm text-gray-500">Sandbox information will appear when N0VA1O gateway is connected.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center"><Database className="w-5 h-5 text-green-400" /></div>
                  <div>
                    <p className="text-sm text-gray-500">Active Sandboxes</p>
                    <p className="text-2xl font-bold text-white">{sandboxes[0]?.activeSandboxes || 0}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600">Isolated execution environments currently running</p>
              </div>
              <div className="card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center"><File className="w-5 h-5 text-blue-400" /></div>
                  <div>
                    <p className="text-sm text-gray-500">Virtual Files</p>
                    <p className="text-2xl font-bold text-white">{sandboxes[0]?.totalFiles || 0}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600">Files in the virtual file system</p>
              </div>
              <div className="card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center"><Code className="w-5 h-5 text-purple-400" /></div>
                  <div>
                    <p className="text-sm text-gray-500">Script Executions</p>
                    <p className="text-2xl font-bold text-white">{sandboxes[0]?.totalExecutions || 0}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600">Total sandbox script executions</p>
              </div>
            </div>
          )}

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-green-400" /> Security Boundaries</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Network", desc: "Outbound only, allowlisted domains", status: "active" },
                { label: "Filesystem", desc: "Isolated VFS per sandbox", status: "active" },
                { label: "Memory", desc: "64MB heap limit per execution", status: "active" },
                { label: "Duration", desc: "30s timeout per script", status: "active" },
              ].map((s) => (
                <div key={s.label} className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    <span className="text-xs font-medium text-white">{s.label}</span>
                  </div>
                  <p className="text-[10px] text-gray-500">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "files" && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Folder className="w-4 h-4 text-n0va-400" /> Virtual File System</h3>
            <button className="btn-secondary text-xs flex items-center gap-1.5"><Upload className="w-3 h-3" /> Upload File</button>
          </div>
          <div className="text-center py-12">
            <Folder className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No files in the virtual file system</p>
            <p className="text-xs text-gray-600 mt-1">Upload scripts, data files, or creative assets to use in sandbox executions.</p>
            <div className="mt-4 grid grid-cols-3 max-w-lg mx-auto gap-3">
              {[
                { ext: ".js", label: "JavaScript", color: "text-yellow-400" },
                { ext: ".json", label: "JSON Data", color: "text-green-400" },
                { ext: ".csv", label: "CSV Data", color: "text-blue-400" },
              ].map((t) => (
                <div key={t.ext} className="bg-gray-800/50 rounded-lg p-3 text-center border border-gray-800 hover:border-gray-700 cursor-pointer">
                  <p className={`text-lg font-bold ${t.color}`}>{t.ext}</p>
                  <p className="text-[10px] text-gray-600">{t.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "scripts" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Code className="w-4 h-4 text-n0va-400" /> Script Editor</h3>
            <textarea
              className="input font-mono text-xs min-h-[200px] w-full"
              value={scriptInput}
              onChange={(e) => setScriptInput(e.target.value)}
              placeholder="// Enter N0VA1O script code here...&#10;platforms.list()&#10;// OR&#10;analytics.overview({days: 30})"
              spellCheck={false}
            />
            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-1.5">
                {sampleScripts.map((s) => (
                  <button key={s.name} className="text-[10px] px-2 py-1 rounded bg-gray-800 text-gray-400 hover:text-gray-300" onClick={() => setScriptInput(s.code)}>
                    {s.name}
                  </button>
                ))}
              </div>
              <button className="btn-primary text-sm flex items-center gap-1.5" onClick={handleExecute} disabled={executing || !scriptInput.trim()}>
                {executing ? <Loader className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {executing ? "Executing..." : "Run"}
              </button>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Terminal className="w-4 h-4 text-green-400" /> Output</h3>
            {scriptResult ? (
              <pre className="font-mono text-xs text-gray-300 bg-gray-900 rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-auto whitespace-pre-wrap break-words">{scriptResult}</pre>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[200px] text-center">
                <Play className="w-8 h-8 text-gray-700 mb-2" />
                <p className="text-xs text-gray-600">Run a script to see output here</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Shield({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
}
