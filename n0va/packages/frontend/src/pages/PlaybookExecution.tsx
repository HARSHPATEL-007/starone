import { useEffect, useState } from "react";
import { Play, Pause, RotateCcw, CheckCircle, XCircle, Clock, Loader2, Plus, Trash2, FileText, ListChecks, RefreshCw, ArrowRight, AlertCircle, SkipForward } from "lucide-react";
import { api } from "../api/client";
import { SkeletonCard } from "../components/Skeleton";
import { useToast } from "../components/Toast";

interface StepConfig {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "select";
  options?: string[];
  default?: string;
}

interface StepTemplate {
  id: string;
  stepType: string;
  name: string;
  description: string;
  config: StepConfig[];
}

interface Step {
  id: string;
  stepType: string;
  name: string;
  description: string;
  config: Record<string, string>;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  result?: string;
  error?: string;
}

interface Execution {
  id: string;
  playbookId: string;
  playbookName: string;
  campaignId: string;
  campaignName?: string;
  status: "draft" | "running" | "paused" | "completed" | "failed";
  steps: Step[];
  progress: number;
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-400 border-gray-500/30",
  running: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  paused: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  completed: "bg-green-500/10 text-green-400 border-green-500/30",
  failed: "bg-red-500/10 text-red-400 border-red-500/30",
};

const STEP_STATUS_ICONS: Record<string, any> = {
  pending: Clock,
  running: Loader2,
  completed: CheckCircle,
  failed: XCircle,
  skipped: SkipForward,
};

const STEP_STATUS_COLORS: Record<string, string> = {
  pending: "text-gray-500",
  running: "text-blue-400",
  completed: "text-green-400",
  failed: "text-red-400",
  skipped: "text-yellow-400",
};

const STEP_STATUS_BG: Record<string, string> = {
  pending: "bg-gray-500/10 border-gray-700",
  running: "bg-blue-500/5 border-blue-500/20",
  completed: "bg-green-500/5 border-green-500/20",
  failed: "bg-red-500/5 border-red-500/20",
  skipped: "bg-yellow-500/5 border-yellow-500/20",
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function PlaybookExecution() {
  const { addToast } = useToast();
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [templates, setTemplates] = useState<StepTemplate[]>([]);
  const [creating, setCreating] = useState(false);
  const [stepActionLoading, setStepActionLoading] = useState<string | null>(null);
  const [form, setForm] = useState({
    playbookName: "",
    campaignId: "",
    steps: [] as { templateId: string; stepType: string; name: string; config: Record<string, string> }[],
  });

  useEffect(() => { loadExecutions(); }, []);

  useEffect(() => {
    if (!selectedId) { setSelectedExecution(null); return; }
    loadDetail(selectedId);
  }, [selectedId]);

  async function loadExecutions() {
    setLoading(true);
    try {
      const data = await api.playbookExecution.list();
      setExecutions(data || []);
    } catch {
      setExecutions([]);
      addToast("error", "Failed to load executions");
    }
    setLoading(false);
  }

  async function loadDetail(id: string) {
    setLoadingDetail(true);
    try {
      const data = await api.playbookExecution.get(id);
      setSelectedExecution(data);
      setExecutions(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
    } catch {
      addToast("error", "Failed to load execution detail");
    }
    setLoadingDetail(false);
  }

  async function openCreateModal() {
    setForm({ playbookName: "", campaignId: "", steps: [] });
    setCreating(false);
    setShowCreate(true);
    try {
      const tmpl = await api.playbookExecution.templates();
      setTemplates(tmpl || []);
    } catch {
      setTemplates([]);
    }
  }

  function addStepFromTemplate(template: StepTemplate) {
    const config: Record<string, string> = {};
    for (const field of template.config || []) {
      config[field.key] = field.default || "";
    }
    setForm(f => ({
      ...f,
      steps: [...f.steps, { templateId: template.id, stepType: template.stepType, name: template.name, config }],
    }));
  }

  function removeStep(index: number) {
    setForm(f => ({ ...f, steps: f.steps.filter((_, i) => i !== index) }));
  }

  function updateStepConfig(index: number, key: string, value: string) {
    setForm(f => ({
      ...f,
      steps: f.steps.map((s, i) => i === index ? { ...s, config: { ...s.config, [key]: value } } : s),
    }));
  }

  async function handleCreate() {
    if (!form.playbookName.trim()) { addToast("error", "Playbook name is required"); return; }
    if (form.steps.length === 0) { addToast("error", "Add at least one step"); return; }
    setCreating(true);
    try {
      await api.playbookExecution.create({
        playbookId: "",
        playbookName: form.playbookName.trim(),
        campaignId: form.campaignId || undefined,
        steps: form.steps,
      });
      addToast("success", "Execution created");
      setShowCreate(false);
      await loadExecutions();
    } catch (err: any) {
      addToast("error", err.message || "Failed to create execution");
    }
    setCreating(false);
  }

  async function handleStart(id: string) {
    try {
      await api.playbookExecution.start(id);
      addToast("success", "Execution started");
      await loadDetail(id);
      await loadExecutions();
    } catch (err: any) {
      addToast("error", err.message || "Failed to start execution");
    }
  }

  async function handlePause(id: string) {
    try {
      await api.playbookExecution.pause(id);
      addToast("success", "Execution paused");
      await loadDetail(id);
      await loadExecutions();
    } catch (err: any) {
      addToast("error", err.message || "Failed to pause execution");
    }
  }

  async function handleResume(id: string) {
    try {
      await api.playbookExecution.resume(id);
      addToast("success", "Execution resumed");
      await loadDetail(id);
      await loadExecutions();
    } catch (err: any) {
      addToast("error", err.message || "Failed to resume execution");
    }
  }

  async function handleCompleteStep(stepId: string) {
    if (!selectedId) return;
    setStepActionLoading(stepId);
    try {
      await api.playbookExecution.completeStep(selectedId, stepId);
      addToast("success", "Step completed");
      await loadDetail(selectedId);
    } catch (err: any) {
      addToast("error", err.message || "Failed to complete step");
    }
    setStepActionLoading(null);
  }

  async function handleFailStep(stepId: string) {
    if (!selectedId) return;
    setStepActionLoading(stepId);
    try {
      await api.playbookExecution.failStep(selectedId, stepId, "Manually failed");
      addToast("success", "Step marked as failed");
      await loadDetail(selectedId);
    } catch (err: any) {
      addToast("error", err.message || "Failed to fail step");
    }
    setStepActionLoading(null);
  }

  async function handleDelete(id: string) {
    try {
      await api.playbookExecution.delete(id);
      addToast("success", "Execution deleted");
      if (selectedId === id) setSelectedId(null);
      await loadExecutions();
    } catch (err: any) {
      addToast("error", err.message || "Failed to delete execution");
    }
  }

  const getStepTemplate = (stepType: string) => templates.find(t => t.stepType === stepType || t.id === stepType);

  const selected = selectedExecution || executions.find(e => e.id === selectedId) || null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FileText className="w-6 h-6 text-n0va-400" />
            Playbook Execution
          </h1>
          <p className="text-gray-400 mt-1">{executions.length} executions · {executions.filter(e => e.status === "running").length} running</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary text-sm flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New Execution
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : executions.length === 0 ? (
            <div className="card p-6 flex flex-col items-center justify-center text-center">
              <FileText className="w-10 h-10 text-gray-700 mb-3" />
              <h3 className="text-sm font-semibold text-gray-300 mb-1">No executions</h3>
              <p className="text-xs text-gray-500">Create a playbook execution to get started.</p>
            </div>
          ) : (
            executions.map(exec => {
              const isSelected = selectedId === exec.id;
              const statusClass = STATUS_COLORS[exec.status] || STATUS_COLORS.draft;
              return (
                <div
                  key={exec.id}
                  onClick={() => setSelectedId(exec.id)}
                  className={`card p-4 cursor-pointer transition-all hover:border-gray-600 ${isSelected ? "border-n0va-500/50 bg-n0va-600/10" : ""}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{exec.playbookName}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {exec.campaignName || exec.campaignId || "No campaign"} · {timeAgo(exec.updatedAt)}
                      </p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ml-2 ${statusClass}`}>
                      {exec.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          exec.status === "completed" ? "bg-green-500" :
                          exec.status === "failed" ? "bg-red-500" :
                          exec.status === "running" ? "bg-blue-500" :
                          "bg-gray-600"
                        }`}
                        style={{ width: `${exec.progress || 0}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono w-8 text-right">{exec.progress || 0}%</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detail area */}
        <div className="lg:col-span-2">
          {!selectedId ? (
            <div className="card p-12 flex flex-col items-center justify-center text-center">
              <ArrowRight className="w-12 h-12 text-gray-700 mb-4" />
              <h3 className="text-lg font-semibold text-gray-300 mb-2">Select an execution</h3>
              <p className="text-sm text-gray-500">Choose an execution from the sidebar to view its details and steps.</p>
            </div>
          ) : loadingDetail ? (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : selected ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-lg font-bold text-white">{selected.playbookName}</h2>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full border ${STATUS_COLORS[selected.status] || STATUS_COLORS.draft}`}>
                        {selected.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {selected.campaignName || selected.campaignId ? `Campaign: ${selected.campaignName || selected.campaignId}` : "No campaign attached"}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                      <span>{selected.steps.length} step{selected.steps.length !== 1 ? "s" : ""}</span>
                      <span>Created {timeAgo(selected.createdAt)}</span>
                      <span>Updated {timeAgo(selected.updatedAt)}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden max-w-xs">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            selected.status === "completed" ? "bg-green-500" :
                            selected.status === "failed" ? "bg-red-500" :
                            selected.status === "running" ? "bg-blue-500" :
                            "bg-gray-600"
                          }`}
                          style={{ width: `${selected.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 font-mono">{selected.progress || 0}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    {selected.status === "draft" && (
                      <button onClick={() => handleStart(selected.id)} className="btn-primary text-xs flex items-center gap-1 py-1.5">
                        <Play className="w-3.5 h-3.5" /> Start
                      </button>
                    )}
                    {selected.status === "running" && (
                      <button onClick={() => handlePause(selected.id)} className="btn-secondary text-xs flex items-center gap-1 py-1.5">
                        <Pause className="w-3.5 h-3.5" /> Pause
                      </button>
                    )}
                    {selected.status === "paused" && (
                      <button onClick={() => handleResume(selected.id)} className="btn-primary text-xs flex items-center gap-1 py-1.5">
                        <Play className="w-3.5 h-3.5" /> Resume
                      </button>
                    )}
                    {(selected.status === "draft" || selected.status === "failed") && (
                      <button onClick={() => handleDelete(selected.id)} className="p-1.5 text-gray-500 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Steps */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-n0va-400" />
                  Steps
                </h3>
                {selected.steps.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">No steps in this execution.</p>
                ) : (
                  <div className="space-y-2">
                    {selected.steps.map((step, index) => {
                      const StepIcon = STEP_STATUS_ICONS[step.status] || Clock;
                      const statusColor = STEP_STATUS_COLORS[step.status] || "text-gray-500";
                      const statusBg = STEP_STATUS_BG[step.status] || "bg-gray-500/10 border-gray-700";
                      const isActionable = selected.status === "running" && step.status === "running";
                      const isPending = step.status === "pending";
                      const isLoading = stepActionLoading === step.id;
                      return (
                        <div key={step.id} className={`p-4 rounded-lg border ${statusBg}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className={`mt-0.5 ${statusColor} ${step.status === "running" ? "animate-spin" : ""}`}>
                                <StepIcon className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium text-white">{step.name || step.stepType}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[step.status === "running" ? "running" : step.status === "completed" ? "completed" : step.status === "failed" ? "failed" : step.status === "skipped" ? "paused" : "draft"]}`}>
                                    {step.status}
                                  </span>
                                </div>
                                {step.description && (
                                  <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                                )}
                                {step.result && step.status === "completed" && (
                                  <p className="text-xs text-green-400/80 mt-1 bg-green-500/5 rounded px-2 py-1 inline-block">{step.result}</p>
                                )}
                                {step.error && step.status === "failed" && (
                                  <p className="text-xs text-red-400/80 mt-1 bg-red-500/5 rounded px-2 py-1 inline-block">{step.error}</p>
                                )}
                                {/* Config display */}
                                {step.config && Object.keys(step.config).length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    {Object.entries(step.config).map(([k, v]) => v ? (
                                      <span key={k} className="text-[10px] text-gray-600 bg-gray-800/50 px-1.5 py-0.5 rounded">
                                        {k}: {v}
                                      </span>
                                    ) : null)}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {isActionable && (
                                <>
                                  <button
                                    onClick={() => handleCompleteStep(step.id)}
                                    disabled={isLoading}
                                    className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30 flex items-center gap-1 disabled:opacity-50"
                                  >
                                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                    Complete
                                  </button>
                                  <button
                                    onClick={() => handleFailStep(step.id)}
                                    disabled={isLoading}
                                    className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 flex items-center gap-1 disabled:opacity-50"
                                  >
                                    <XCircle className="w-3 h-3" /> Fail
                                  </button>
                                </>
                              )}
                              {isPending && selected.status === "running" && (
                                <button
                                  onClick={() => handleCompleteStep(step.id)}
                                  disabled={isLoading}
                                  className="text-xs px-2 py-1 rounded bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 border border-gray-600 flex items-center gap-1 disabled:opacity-50"
                                >
                                  {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <SkipForward className="w-3 h-3" />}
                                  Skip
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card p-12 flex flex-col items-center justify-center text-center">
              <AlertCircle className="w-12 h-12 text-gray-700 mb-4" />
              <h3 className="text-lg font-semibold text-gray-300 mb-2">Execution not found</h3>
              <p className="text-sm text-gray-500">This execution may have been deleted.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">New Playbook Execution</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white"><XCircle className="w-5 h-5" /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); handleCreate(); }} className="space-y-4">
              <div>
                <label className="label">Playbook Name</label>
                <input
                  className="input"
                  placeholder="e.g. Campaign Launch Execution"
                  value={form.playbookName}
                  onChange={e => setForm({ ...form, playbookName: e.target.value })}
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="label">Campaign ID <span className="text-gray-600">(optional)</span></label>
                <input
                  className="input"
                  placeholder="campaign_123"
                  value={form.campaignId}
                  onChange={e => setForm({ ...form, campaignId: e.target.value })}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Steps</label>
                </div>
                {templates.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2">Add steps from templates:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {templates.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => addStepFromTemplate(t)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-gray-700 text-gray-300 hover:border-n0va-500/50 hover:text-n0va-400 bg-gray-800/50"
                        >
                          + {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {form.steps.length === 0 && (
                  <p className="text-xs text-gray-600 py-2">No steps added. Use the template buttons above to add steps.</p>
                )}
                <div className="space-y-3">
                  {form.steps.map((step, index) => {
                    const template = getStepTemplate(step.stepType);
                    return (
                      <div key={index} className="p-3 bg-n0va-900 rounded-lg border border-gray-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ListChecks className="w-3.5 h-3.5 text-n0va-400" />
                            <span className="text-sm font-medium text-white">{step.name}</span>
                            <span className="text-[10px] text-gray-500">{step.stepType}</span>
                          </div>
                          <button type="button" onClick={() => removeStep(index)} className="text-gray-600 hover:text-red-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {template?.config && template.config.length > 0 && (
                          <div className="grid grid-cols-2 gap-2">
                            {template.config.map(field => (
                              <div key={field.key}>
                                <label className="text-[10px] text-gray-500">{field.label}</label>
                                {field.type === "boolean" ? (
                                  <select
                                    className="input text-xs mt-0.5"
                                    value={step.config[field.key] || ""}
                                    onChange={e => updateStepConfig(index, field.key, e.target.value)}
                                  >
                                    <option value="">—</option>
                                    <option value="true">True</option>
                                    <option value="false">False</option>
                                  </select>
                                ) : field.type === "select" ? (
                                  <select
                                    className="input text-xs mt-0.5"
                                    value={step.config[field.key] || ""}
                                    onChange={e => updateStepConfig(index, field.key, e.target.value)}
                                  >
                                    <option value="">Select {field.label}</option>
                                    {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                  </select>
                                ) : (
                                  <input
                                    className="input text-xs mt-0.5"
                                    type={field.type === "number" ? "number" : "text"}
                                    placeholder={field.label}
                                    value={step.config[field.key] || ""}
                                    onChange={e => updateStepConfig(index, field.key, e.target.value)}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {(!template?.config || template.config.length === 0) && (
                          <p className="text-[10px] text-gray-600 italic">No configuration required</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5 inline" /> Creating...</> : "Create Execution"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
