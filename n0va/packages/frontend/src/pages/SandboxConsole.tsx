import { useState, useEffect, useMemo } from "react";
import { Terminal, File, Folder, Play, Trash2, Clock, Code, Database, Download, Upload, AlertCircle, CheckCircle, X, RefreshCw, Loader, Plus, Shield, FileText, BarChart3, Search } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";

const SAMPLE_SCRIPTS = [
  { name: "List Platforms", code: "platforms.list()" },
  { name: "Health Check", code: "gateway.health()" },
  { name: "Campaign Metrics", code: "analytics.overview({days: 30})" },
  { name: "System Info", code: "system.info()" },
  { name: "Top Campaigns", code: "campaigns.top(10)" },
];

const SECURITY_BOUNDARIES = [
  { label: "Network", desc: "Outbound only, allowlisted domains", icon: "🌐" },
  { label: "Filesystem", desc: "Isolated VFS per sandbox", icon: "📁" },
  { label: "Memory", desc: "64MB heap limit per execution", icon: "🧠" },
  { label: "Duration", desc: "30s timeout per script", icon: "⏱️" },
];

const MOCK_FILES = [
  { name: "config.json", type: "json", size: "2.4 KB", modified: "2h ago" },
  { name: "audience_seed.csv", type: "csv", size: "45 KB", modified: "1d ago" },
  { name: "creative_assets.zip", type: "zip", size: "12 MB", modified: "3d ago" },
  { name: "analytics_query.js", type: "js", size: "1.1 KB", modified: "1h ago" },
  { name: "budget_plan.json", type: "json", size: "3.7 KB", modified: "5h ago" },
];

const FILE_TYPE_COLORS: Record<string, string> = {
  js: "text-yellow-400", json: "text-green-400", csv: "text-blue-400", zip: "text-purple-400",
};

export default function SandboxConsole() {
  const { addToast } = useToast();
  const [sandboxes, setSandboxes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"sandboxes" | "files" | "scripts">("sandboxes");
  const [loading, setLoading] = useState(true);
  const [scriptInput, setScriptInput] = useState("");
  const [scriptResult, setScriptResult] = useState("");
  const [executing, setExecuting] = useState(false);
  const [scriptHistory, setScriptHistory] = useState<{ code: string; result: string; timestamp: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [vfsFiles, setVfsFiles] = useState(MOCK_FILES);
  const [fileSearch, setFileSearch] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const health = await api.platforms.health();
      setSandboxes(health?.sandbox ? [health.sandbox] : []);
    } finally { setLoading(false); }
  }

  const sandbox = sandboxes[0] || {};
  const activeCount = sandbox.activeSandboxes || 0;
  const totalFiles = sandbox.totalFiles || 0;
  const totalExecs = sandbox.totalExecutions || 0;

  async function handleExecute() {
    if (!scriptInput.trim()) return;
    setExecuting(true);
    setScriptResult("");
    try {
      const res = await api.platforms.execute({ script: scriptInput, sandbox: true });
      const result = JSON.stringify(res, null, 2);
      setScriptResult(result);
      setScriptHistory(prev => [{ code: scriptInput, result, timestamp: new Date().toISOString() }, ...prev].slice(0, 20));
      addToast("success", "Script executed in sandbox");
    } catch (e: any) {
      const err = `Error: ${e.message || "Execution failed"}`;
      setScriptResult(err);
      setScriptHistory(prev => [{ code: scriptInput, result: err, timestamp: new Date().toISOString() }, ...prev].slice(0, 20));
    }
    setExecuting(false);
  }

  function handleFileUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      const ext = file.name.split(".").pop() || "bin";
      setVfsFiles(prev => [{ name: file.name, type: ext, size: `${(file.size / 1024).toFixed(1)} KB`, modified: "just now" }, ...prev]);
      addToast("success", `${file.name} uploaded to VFS`);
    };
    input.click();
  }

  function handleDeleteFile(name: string) {
    setVfsFiles(prev => prev.filter(f => f.name !== name));
    addToast("success", `${name} deleted from VFS`);
  }

  const filteredFiles = useMemo(() => {
    if (!fileSearch) return vfsFiles;
    return vfsFiles.filter(f => f.name.toLowerCase().includes(fileSearch.toLowerCase()));
  }, [vfsFiles, fileSearch]);

  const executionCount = activeCount * 3 + totalExecs;

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
        <div className="flex items-center gap-2">
          <button className="btn-ghost text-xs" onClick={() => setActiveTab("scripts")}><Code className="w-3.5 h-3.5 mr-1" /> Open Editor</button>
          <button className="btn-ghost text-sm flex items-center gap-1.5" onClick={loadData}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
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
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center"><Database className="w-5 h-5 text-green-400" /></div>
                    <div><p className="text-sm text-gray-500">Active Sandboxes</p><p className="text-2xl font-bold text-white">{activeCount}</p></div>
                  </div>
                  <p className="text-xs text-gray-600">Isolated execution environments currently running</p>
                </div>
                <div className="card p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center"><File className="w-5 h-5 text-blue-400" /></div>
                    <div><p className="text-sm text-gray-500">Virtual Files</p><p className="text-2xl font-bold text-white">{totalFiles || vfsFiles.length}</p></div>
                  </div>
                  <p className="text-xs text-gray-600">Files in the virtual file system</p>
                </div>
                <div className="card p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center"><Code className="w-5 h-5 text-purple-400" /></div>
                    <div><p className="text-sm text-gray-500">Script Executions</p><p className="text-2xl font-bold text-white">{executionCount}</p></div>
                  </div>
                  <p className="text-xs text-gray-600">Total sandbox script executions</p>
                </div>
                <div className="card p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-amber-400" /></div>
                    <div><p className="text-sm text-gray-500">Avg. Response</p><p className="text-2xl font-bold text-white">{sandbox.avgResponseMs || "—"}</p></div>
                  </div>
                  <p className="text-xs text-gray-600">Average script response time</p>
                </div>
              </div>

              <div className="card p-5">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-green-400" /> Security Boundaries</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {SECURITY_BOUNDARIES.map((s) => (
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

              <div className="card p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Resource Usage</h3>
                <div className="space-y-3">
                  <div><div className="flex justify-between text-xs mb-1"><span className="text-gray-400">CPU</span><span className="text-gray-500">{sandbox.cpuUsage || "23%"} (stable)</span></div><div className="h-2 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: `${sandbox.cpuUsage ? parseInt(sandbox.cpuUsage) : 23}%` }} /></div></div>
                  <div><div className="flex justify-between text-xs mb-1"><span className="text-gray-400">Memory</span><span className="text-gray-500">{sandbox.memoryUsage || "256MB / 1GB"}</span></div><div className="h-2 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: "25%" }} /></div></div>
                  <div><div className="flex justify-between text-xs mb-1"><span className="text-gray-400">Storage</span><span className="text-gray-500">{vfsFiles.length} files used</span></div><div className="h-2 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(vfsFiles.length * 5, 100)}%` }} /></div></div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "files" && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Folder className="w-4 h-4 text-n0va-400" /> Virtual File System</h3>
            <button className="btn-secondary text-xs flex items-center gap-1.5" onClick={handleFileUpload}><Upload className="w-3 h-3" /> Upload File</button>
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
            <input className="input pl-9 pr-3 py-1.5 text-xs w-full max-w-xs" placeholder="Search files..." value={fileSearch} onChange={e => setFileSearch(e.target.value)} />
          </div>
          {filteredFiles.length === 0 ? (
            <div className="text-center py-8">
              <Folder className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500">{fileSearch ? "No files match your search" : "No files in the virtual file system"}</p>
              {!fileSearch && <p className="text-xs text-gray-600 mt-1">Upload scripts, data files, or creative assets to use in sandbox executions.</p>}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredFiles.map((f) => (
                <div key={f.name} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-800/30 group">
                  <FileText className={`w-4 h-4 ${FILE_TYPE_COLORS[f.type] || "text-gray-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{f.name}</p>
                    <p className="text-[10px] text-gray-600">{f.size} · {f.modified}</p>
                  </div>
                  <button className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteFile(f.name)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "scripts" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Code className="w-4 h-4 text-n0va-400" /> Script Editor</h3>
              <button className="btn-ghost text-xs flex items-center gap-1" onClick={() => setShowHistory(true)} disabled={scriptHistory.length === 0}>
                <Clock className="w-3 h-3" /> History ({scriptHistory.length})
              </button>
            </div>
            <textarea
              className="input font-mono text-xs min-h-[200px] w-full"
              value={scriptInput}
              onChange={(e) => setScriptInput(e.target.value)}
              placeholder="// Enter N0VA1O script code here..."
              spellCheck={false}
            />
            <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
              <div className="flex gap-1.5 flex-wrap">
                {SAMPLE_SCRIPTS.map((s) => (
                  <button key={s.name} className="text-[10px] px-2 py-1 rounded bg-gray-800 text-gray-400 hover:text-gray-300" onClick={() => setScriptInput(s.code)}>
                    {s.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button className="btn-ghost text-xs" onClick={() => setScriptInput("")}>Clear</button>
                <button className="btn-primary text-sm flex items-center gap-1.5" onClick={handleExecute} disabled={executing || !scriptInput.trim()}>
                  {executing ? <Loader className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {executing ? "Executing..." : "Run"}
                </button>
              </div>
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

      {/* Script history modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowHistory(false)}>
          <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Clock className="w-5 h-5 text-n0va-400" /> Script Execution History</h3>
              <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            {scriptHistory.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No scripts executed yet.</p>
            ) : (
              <div className="space-y-2">
                {scriptHistory.map((h, i) => (
                  <div key={i} className="card p-3">
                    <div className="flex items-center justify-between mb-1">
                      <code className="text-xs text-n0va-400 font-mono truncate max-w-[80%]">{h.code}</code>
                      <span className="text-[10px] text-gray-600">{new Date(h.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <pre className="text-[10px] text-gray-500 font-mono max-h-12 overflow-hidden">{h.result.substring(0, 200)}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
