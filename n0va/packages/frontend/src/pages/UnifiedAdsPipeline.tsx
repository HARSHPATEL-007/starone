import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Layers, Play, CheckCircle, Archive, RotateCcw, Activity, AlertTriangle, Eye, ChevronRight, Plus, RefreshCw, FileText, Clock, Zap, Target, BarChart3 } from "lucide-react";
import { useToast } from "../components/Toast";
import { api } from "../api/client";

const STAGE_COLORS: Record<string, string> = {
  draft: "bg-gray-700 text-gray-300",
  active: "bg-green-500/20 text-green-400",
  paused: "bg-yellow-500/20 text-yellow-400",
  completed: "bg-blue-500/20 text-blue-400",
  archived: "bg-red-500/20 text-red-400",
};

const STAGE_ORDER = ["draft", "active", "paused", "completed", "archived"];

export default function UnifiedAdsPipeline() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [pipelineId, setPipelineId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [monitorData, setMonitorData] = useState<any>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [healthData, setHealthData] = useState<any>(null);
  const [showNew, setShowNew] = useState(false);
  const [config, setConfig] = useState("{}");

  useEffect(() => {
    api.unifiedAdsPipeline.list().then(data => {
      setPipelines(Array.isArray(data) ? data : data?.pipelines || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function refresh() {
    setLoading(true);
    api.unifiedAdsPipeline.list().then(data => {
      setPipelines(Array.isArray(data) ? data : data?.pipelines || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }

  function selectPipeline(id: string) {
    setPipelineId(id);
    api.unifiedAdsPipeline.get(id).then(setSelected).catch(() => addToast("error", "Failed to load pipeline"));
    api.unifiedAdsPipeline.monitor(id).then(setMonitorData).catch(() => {});
    api.unifiedAdsPipeline.report(id).then(setReportData).catch(() => {});
    api.unifiedAdsPipeline.timeline(id).then(d => setTimeline(Array.isArray(d) ? d : [])).catch(() => {});
    api.unifiedAdsPipeline.health(id).then(setHealthData).catch(() => {});
  }

  function advancePipeline() {
    if (!pipelineId) { addToast("warning", "Select a pipeline first"); return; }
    api.unifiedAdsPipeline.advance(pipelineId).then(r => {
      addToast("success", `Pipeline advanced to ${r.stage || r.status}`);
      selectPipeline(pipelineId);
    }).catch(() => addToast("error", "Failed to advance pipeline"));
  }

  function activatePipeline() {
    if (!pipelineId) { addToast("warning", "Select a pipeline first"); return; }
    api.unifiedAdsPipeline.activate(pipelineId).then(r => {
      addToast("success", "Pipeline activated");
      selectPipeline(pipelineId);
    }).catch(() => addToast("error", "Failed to activate"));
  }

  function archivePipeline() {
    if (!pipelineId) { addToast("warning", "Select a pipeline first"); return; }
    api.unifiedAdsPipeline.archive(pipelineId).then(() => {
      addToast("success", "Pipeline archived");
      selectPipeline(pipelineId);
    }).catch(() => addToast("error", "Failed to archive"));
  }

  function rollbackPipeline() {
    if (!pipelineId) { addToast("warning", "Select a pipeline first"); return; }
    api.unifiedAdsPipeline.rollback(pipelineId).then(() => {
      addToast("success", "Pipeline rolled back");
      selectPipeline(pipelineId);
    }).catch(() => addToast("error", "Failed to rollback"));
  }

  function configurePipeline() {
    if (!pipelineId) { addToast("warning", "Select a pipeline first"); return; }
    let parsed: any;
    try { parsed = JSON.parse(config); } catch { addToast("error", "Invalid JSON config"); return; }
    api.unifiedAdsPipeline.configure(pipelineId, parsed).then((r) => {
      addToast("success", "Pipeline configured");
      selectPipeline(pipelineId);
    }).catch(() => addToast("error", "Failed to configure"));
  }

  function handleOptimize() {
    if (!pipelineId) { addToast("warning", "Select a pipeline first"); return; }
    api.unifiedAdsPipeline.optimize(pipelineId).then((r) => {
      addToast("success", "Optimization complete");
      selectPipeline(pipelineId);
    }).catch(() => addToast("error", "Failed to optimize"));
  }

  function handleValidate() {
    if (!pipelineId) { addToast("warning", "Select a pipeline first"); return; }
    api.unifiedAdsPipeline.validate(pipelineId).then((r) => {
      addToast("success", `Valid: ${r.valid ? "Yes" : "No"}${r.errors?.length ? ` (${r.errors.length} errors)` : ""}`);
    }).catch(() => addToast("error", "Failed to validate"));
  }

  function handleInitialize() {
    if (!campaignId) { addToast("warning", "Enter a campaign ID"); return; }
    api.unifiedAdsPipeline.initialize(campaignId).then((r) => {
      addToast("success", "Pipeline initialized");
      refresh();
      if (r.pipelineId || r.id) selectPipeline(r.pipelineId || r.id);
    }).catch(() => addToast("error", "Failed to initialize"));
  }

  if (loading) return (
    <div className="p-6 space-y-4">
      <div className="h-8 bg-gray-800 rounded w-48 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-800 rounded animate-pulse" />)}
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-n0va-400" />
          <h1 className="text-2xl font-bold text-white">Unified Ads Pipeline</h1>
        </div>
        <button onClick={refresh} className="btn-ghost text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Refresh</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Pipelines</h3>
            {pipelines.length === 0 ? (
              <div className="text-center py-8">
                <Layers className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No pipelines yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {pipelines.map((p: any) => (
                  <button key={p.id || p._id} onClick={() => selectPipeline(p.id || p._id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${(pipelineId === (p.id || p._id)) ? "bg-n0va-600/20 border border-n0va-600/30" : "bg-gray-800 hover:bg-gray-750"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-200">{p.name || p.campaignName || p.id}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STAGE_COLORS[p.stage || p.status || "draft"]}`}>{p.stage || p.status || "draft"}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{p.campaignId || ""}</p>
                    {p.progress !== undefined && (
                      <div className="mt-2 w-full bg-gray-700 rounded-full h-1.5">
                        <div className="bg-n0va-500 h-1.5 rounded-full" style={{ width: `${p.progress}%` }} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">New Pipeline</h3>
            <div className="flex gap-2">
              <input value={campaignId} onChange={e => setCampaignId(e.target.value)} placeholder="Campaign ID" className="input flex-1" />
            </div>
            <button onClick={handleInitialize} className="btn-primary text-sm w-full mt-2 flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Initialize
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selected ? (
            <>
              <div className="card p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{selected.name || selected.campaignName || `Pipeline ${pipelineId}`}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STAGE_COLORS[selected.stage || selected.status || "draft"]}`}>{selected.stage || selected.status || "draft"}</span>
                  </div>
                  <div className="flex gap-2">
                    {(!selected.stage || selected.stage === "draft") && (
                      <button onClick={activatePipeline} className="btn-primary text-xs flex items-center gap-1"><Play className="w-3 h-3" /> Activate</button>
                    )}
                    {(!selected.stage || selected.stage !== "completed") && (
                      <button onClick={advancePipeline} className="btn-secondary text-xs flex items-center gap-1"><ChevronRight className="w-3 h-3" /> Advance</button>
                    )}
                    <button onClick={handleOptimize} className="btn-secondary text-xs flex items-center gap-1"><Zap className="w-3 h-3" /> Optimize</button>
                    <button onClick={handleValidate} className="btn-ghost text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Validate</button>
                    <button onClick={archivePipeline} className="btn-ghost text-xs flex items-center gap-1"><Archive className="w-3 h-3" /> Archive</button>
                    <button onClick={rollbackPipeline} className="btn-ghost text-xs flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Rollback</button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-4">
                  {STAGE_ORDER.map(stage => (
                    <div key={stage} className={`p-3 rounded-lg text-center ${(selected.stage || selected.status) === stage ? "ring-2 ring-n0va-500" : "bg-gray-800"}`}>
                      <p className="text-xs font-medium capitalize text-gray-400">{stage}</p>
                      <div className={`mt-1 w-3 h-3 mx-auto rounded-full ${(selected.stage || selected.status) === stage ? "bg-n0va-400" : "bg-gray-600"}`} />
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-800 pt-4 space-y-2 text-sm">
                  {selected.campaignId && <div className="flex justify-between text-gray-400"><span>Campaign</span><span className="text-gray-200">{selected.campaignId}</span></div>}
                  {selected.createdAt && <div className="flex justify-between text-gray-400"><span>Created</span><span className="text-gray-200">{new Date(selected.createdAt).toLocaleString()}</span></div>}
                  {selected.progress !== undefined && <div className="flex justify-between text-gray-400"><span>Progress</span><span className="text-gray-200">{selected.progress}%</span></div>}
                </div>
              </div>

              {monitorData && (
                <div className="card p-4">
                  <div className="flex items-center gap-2 text-gray-300 mb-3"><Activity className="w-4 h-4" /><h3 className="text-sm font-semibold">Monitor</h3></div>
                  <div className="text-sm text-gray-400 space-y-1">
                    {Object.entries(monitorData).filter(([k]) => !k.startsWith("_")).slice(0, 10).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="capitalize">{k.replace(/_/g, " ")}</span>
                        <span className="text-gray-200">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {timeline.length > 0 && (
                <div className="card p-4">
                  <div className="flex items-center gap-2 text-gray-300 mb-3"><Clock className="w-4 h-4" /><h3 className="text-sm font-semibold">Timeline</h3></div>
                  <div className="space-y-2">
                    {timeline.map((t: any, i: number) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-2 h-2 mt-1.5 rounded-full bg-n0va-400 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-gray-200">{t.event || t.action || t.stage}</p>
                          <p className="text-xs text-gray-500">{t.date ? new Date(t.date).toLocaleString() : ""}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {reportData && (
                <div className="card p-4">
                  <div className="flex items-center gap-2 text-gray-300 mb-3"><FileText className="w-4 h-4" /><h3 className="text-sm font-semibold">Report</h3></div>
                  <div className="text-sm text-gray-400 space-y-1">
                    {Object.entries(reportData).filter(([k]) => !k.startsWith("_")).slice(0, 10).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="capitalize">{k.replace(/_/g, " ")}</span>
                        <span className="text-gray-200">{typeof v === "number" ? v.toLocaleString() : String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {healthData && (
                <div className="card p-4">
                  <div className="flex items-center gap-2 text-gray-300 mb-3"><Activity className="w-4 h-4" /><h3 className="text-sm font-semibold">Health</h3></div>
                  <div className="flex items-center gap-3">
                    <div className={`text-2xl font-bold ${healthData.status === "healthy" ? "text-green-400" : healthData.status === "warning" ? "text-yellow-400" : "text-red-400"}`}>
                      {typeof healthData.score === "number" ? healthData.score : healthData.status || "unknown"}
                    </div>
                    {healthData.issues?.length > 0 && (
                      <div className="text-sm text-gray-400">
                        {healthData.issues.map((issue: string, i: number) => <p key={i}>• {issue}</p>)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="card p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Configuration</h3>
                <textarea value={config} onChange={e => setConfig(e.target.value)} rows={4} className="input w-full font-mono text-xs" />
                <button onClick={configurePipeline} className="btn-primary text-sm mt-2">Apply Config</button>
              </div>
            </>
          ) : (
            <div className="card p-12 text-center">
              <Layers className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">Select a Pipeline</h3>
              <p className="text-sm text-gray-600">Choose a pipeline from the left to view details, or initialize a new one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
