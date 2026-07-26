import { useState, useEffect } from "react";
import { Bot, Cpu, Shield, Workflow, RefreshCw, Loader, CheckCircle, XCircle, AlertTriangle, Fingerprint, FileText, Zap } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";

type Tab = "agents" | "cross-module" | "security";

export default function AgentIntelligence() {
  const { addToast } = useToast();
  const [tab, setTab] = useState<Tab>("agents");
  const [loading, setLoading] = useState(true);
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<any[]>([]);
  const [crossModules, setCrossModules] = useState<any[]>([]);
  const [crossHistory, setCrossHistory] = useState<any[]>([]);
  const [modifiers, setModifiers] = useState<any[]>([]);
  const [pendingInts, setPendingInts] = useState<any[]>([]);
  const [selectedAction, setSelectedAction] = useState("campaign_created");
  const [entityId, setEntityId] = useState("cmp_001");
  const [intActionId, setIntActionId] = useState("act_001");
  const [intDesc, setIntDesc] = useState("Budget shift for Q3 campaign");
  const [intValue, setIntValue] = useState(60000);
  const [intThreshold, setIntThreshold] = useState(50000);
  const [valAction, setValAction] = useState("update_budget");
  const [valParams, setValParams] = useState('{"budget_increase": 200}');
  const [valResult, setValResult] = useState<any>(null);

  useEffect(() => { loadAgentData(); loadModifiers(); }, []);

  async function loadAgentData() {
    setLoading(true);
    try {
      const [d, s, sch, c] = await Promise.all([
        api.agentIntelligence.definitions().catch(() => ({ data: [] })),
        api.agentIntelligence.status().catch(() => ({ data: [] })),
        api.agentIntelligence.schedules().catch(() => ({ data: [] })),
        api.agentIntelligence.compliance().catch(() => ({ data: [] })),
      ]);
      setDefinitions((d as any)?.data || d || []);
      setStatuses((s as any)?.data || s || []);
      setSchedules((sch as any)?.data || sch || []);
      setCompliance((c as any)?.data || c || []);
    } catch { }
    setLoading(false);
  }

  async function loadCrossModule() {
    try {
      const [m, h] = await Promise.all([
        api.agentIntelligence.crossModuleMatrix().catch(() => ({ data: [] })),
        api.agentIntelligence.crossModuleHistory().catch(() => ({ data: [] })),
      ]);
      setCrossModules((m as any)?.data || m || []);
      setCrossHistory((h as any)?.data || h || []);
    } catch { }
  }

  async function handleExecuteCrossModule() {
    try {
      const res = await api.agentIntelligence.executeCrossModule(selectedAction, entityId);
      addToast("success", `Cross-module action executed — ${res.affectedModules?.length || 0} modules affected`);
      loadCrossModule();
    } catch (e: any) { addToast("error", e.message); }
  }

  async function loadModifiers() {
    try {
      const [m, p] = await Promise.all([
        api.agentIntelligence.securityModifiers(),
        api.agentIntelligence.pendingInterrogations(),
      ]);
      setModifiers((m as any)?.data || m || []);
      setPendingInts((p as any)?.data || p || []);
    } catch { }
  }

  async function handleCreateInterrogation() {
    try {
      const res = await api.agentIntelligence.createInterrogation(intActionId, intDesc, intValue, intThreshold);
      addToast("success", `Interrogation ${res.id} created`);
      loadModifiers();
    } catch (e: any) { addToast("error", e.message); }
  }

  async function handleResolveInterrogation(id: string, approved: boolean) {
    try {
      await api.agentIntelligence.resolveInterrogation(id, approved, `sig_${Date.now()}`);
      addToast("success", `Interrogation ${approved ? "approved" : "rejected"}`);
      loadModifiers();
    } catch (e: any) { addToast("error", e.message); }
  }

  async function handleValidate() {
    try {
      const params = JSON.parse(valParams);
      const res = await api.agentIntelligence.validateAction(valAction, params);
      setValResult(res.data || res);
    } catch (e: any) { addToast("error", e instanceof SyntaxError ? "Invalid JSON params" : e.message); }
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "agents", label: "Enhanced Agents", icon: Bot },
    { key: "cross-module", label: "Cross-Module", icon: Workflow },
    { key: "security", label: "Security Modifiers", icon: Shield },
  ];

  function healthColor(h: string) {
    switch (h) {
      case "excellent": return "text-green-400 bg-green-900/30";
      case "good": return "text-blue-400 bg-blue-900/30";
      case "fair": return "text-yellow-400 bg-yellow-900/30";
      case "critical": return "text-red-400 bg-red-900/30";
      default: return "text-gray-400 bg-gray-900/30";
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Cpu className="w-6 h-6 text-n0va-400" /> Agent Intelligence
          </h1>
          <p className="text-gray-400 mt-1">Enhanced agent definitions, cross-module integration matrix, and security modifiers</p>
        </div>
        <button onClick={() => { loadAgentData(); loadModifiers(); }} className="btn-secondary btn-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="flex gap-1 border-b border-gray-800 pb-0">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); if (t.key === "cross-module") loadCrossModule(); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? "border-n0va-400 text-white" : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          ><t.icon className="w-4 h-4" /> {t.label}</button>
        ))}
      </div>

      {tab === "agents" && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader className="w-6 h-6 animate-spin text-n0va-400" /></div>
          ) : (
            <>
              {definitions.length > 0 && (
                <div className="card p-6">
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Bot className="w-5 h-5 text-n0va-400" /> Agent Definitions
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {definitions.map((d: any) => (
                      <div key={d.agentType} className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                        <h3 className="text-sm font-medium text-white mb-2">{d.agentName}</h3>
                        <div className="space-y-1 text-xs text-gray-400">
                          <p>Type: <span className="text-gray-300">{d.agentType}</span></p>
                          <p>Frequency: <span className="text-gray-300">{d.frequency?.replace(/_/g, " ")}</span></p>
                          <p>HITL: <span className="text-yellow-400">{d.hitlThreshold}</span></p>
                          <p className="mt-2">{d.description}</p>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {d.actions?.map((a: string) => <span key={a} className="px-2 py-0.5 bg-n0va-600/10 text-n0va-400 rounded text-xs">{a}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {statuses.length > 0 && (
                <div className="card p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Agent Health</h2>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                    {statuses.map((s: any) => (
                      <div key={s.type} className="p-3 bg-gray-900 rounded-lg text-center">
                        <p className="text-xs text-gray-400 mb-1">{s.name}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${healthColor(s.health)}`}>
                          {s.health === "excellent" ? <CheckCircle className="w-3 h-3" /> : s.health === "critical" ? <XCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          {s.health}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">{s.successRate}% success</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {schedules.length > 0 && (
                <div className="card p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Schedules</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-gray-400 border-b border-gray-800">
                        <th className="text-left py-2 px-3">Agent</th>
                        <th className="text-left py-2 px-3">Frequency</th>
                        <th className="text-left py-2 px-3">Last Run</th>
                        <th className="text-left py-2 px-3">Next Run</th>
                        <th className="text-left py-2 px-3">Overdue</th>
                      </tr></thead>
                      <tbody>
                        {schedules.map((s: any) => (
                          <tr key={s.agentType} className="border-b border-gray-800/50 text-gray-300">
                            <td className="py-2 px-3 capitalize">{s.agentType}</td>
                            <td className="py-2 px-3">{s.frequencyHours}h</td>
                            <td className="py-2 px-3 text-xs">{s.lastRun ? new Date(s.lastRun).toLocaleString() : "Never"}</td>
                            <td className="py-2 px-3 text-xs">{new Date(s.nextRun).toLocaleString()}</td>
                            <td className="py-2 px-3">
                              <span className={`text-xs ${s.overdueMinutes > 60 ? "text-red-400" : "text-green-400"}`}>
                                {s.overdueMinutes > 0 ? `${s.overdueMinutes}m overdue` : "On time"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "cross-module" && (
        <div className="space-y-6">
          <button onClick={loadCrossModule} className="btn-secondary"><RefreshCw className="w-4 h-4" /> Load Integration Matrix</button>
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Execute Cross-Module Action</h2>
            <div className="flex gap-4 items-end mb-4">
              <div className="flex-1">
                <label className="label">Source Action</label>
                <select value={selectedAction} onChange={e => setSelectedAction(e.target.value)} className="input">
                  {["campaign_created", "budget_allocated", "creative_uploaded", "audience_synced", "lead_converted", "performance_alert", "brand_safety_risk", "invoice_generated"].map(a => (
                    <option key={a} value={a}>{a.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="label">Entity ID</label>
                <input value={entityId} onChange={e => setEntityId(e.target.value)} className="input" />
              </div>
              <button onClick={handleExecuteCrossModule} className="btn-primary"><Zap className="w-4 h-4" /> Execute</button>
            </div>
          </div>
          {crossModules.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Integration Matrix ({crossModules.length} links)</h2>
              <div className="space-y-4">
                {Array.from(new Set(crossModules.map((l: any) => l.sourceAction))).map(action => {
                  const links = crossModules.filter((l: any) => l.sourceAction === action);
                  return (
                    <div key={action} className="p-3 bg-gray-900 rounded-lg border border-gray-800">
                      <h3 className="text-sm font-medium text-n0va-400 mb-2 capitalize">{action.replace(/_/g, " ")}</h3>
                      <div className="flex flex-wrap gap-2">
                        {links.map((l: any, i: number) => (
                          <span key={i} className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs border border-gray-700">
                            {l.targetModule?.replace(/_/g, " ")} → {l.targetEntityType?.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{links[0]?.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {crossHistory.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Action History</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-gray-400 border-b border-gray-800">
                    <th className="text-left py-2 px-3">Action</th>
                    <th className="text-left py-2 px-3">Entity</th>
                    <th className="text-left py-2 px-3">Modules</th>
                    <th className="text-left py-2 px-3">Timestamp</th>
                  </tr></thead>
                  <tbody>
                    {crossHistory.slice(0, 10).map((h: any) => (
                      <tr key={h.actionId} className="border-b border-gray-800/50 text-gray-300">
                        <td className="py-2 px-3 capitalize">{h.sourceAction?.replace(/_/g, " ")}</td>
                        <td className="py-2 px-3 text-xs">{h.sourceEntity}</td>
                        <td className="py-2 px-3">{h.affectedModules?.join(", ")}</td>
                        <td className="py-2 px-3 text-xs">{new Date(h.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "security" && (
        <div className="space-y-6">
          {modifiers.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-n0va-400" /> Security Modifiers ({modifiers.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {modifiers.map((m: any) => (
                  <div key={m.name} className="p-3 bg-gray-900 rounded-lg border border-gray-800">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        m.type === "schema" ? "bg-purple-900/50 text-purple-400" :
                        m.type === "before_execution" ? "bg-blue-900/50 text-blue-400" :
                        m.type === "after_execution" ? "bg-orange-900/50 text-orange-400" :
                        "bg-red-900/50 text-red-400"
                      }`}>{m.type?.replace(/_/g, " ")}</span>
                      <span className="text-sm font-medium text-white">{m.name}</span>
                    </div>
                    <p className="text-xs text-gray-400">{m.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Validate Action</h2>
              <div className="mb-4">
                <label className="label">Action</label>
                <select value={valAction} onChange={e => setValAction(e.target.value)} className="input">
                  <option value="update_budget">Update Budget</option>
                  <option value="update_bid">Update Bid</option>
                  <option value="delete_campaign">Delete Campaign</option>
                  <option value="create_campaign">Create Campaign</option>
                  <option value="read_performance">Read Performance</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="label">Params (JSON)</label>
                <textarea value={valParams} onChange={e => setValParams(e.target.value)} className="input font-mono text-xs h-20" />
              </div>
              <button onClick={handleValidate} className="btn-primary"><Fingerprint className="w-4 h-4" /> Validate</button>
              {valResult && (
                <div className="mt-4 p-3 bg-gray-900 rounded-lg border border-gray-800">
                  <p className="text-sm text-gray-300 mb-2">
                    {valResult.warnings?.length > 0 ? (
                      <span className="text-yellow-400"><AlertTriangle className="w-4 h-4 inline mr-1" /> {valResult.warnings.length} warning(s)</span>
                    ) : (
                      <span className="text-green-400"><CheckCircle className="w-4 h-4 inline mr-1" /> No warnings</span>
                    )}
                  </p>
                  {valResult.warnings?.map((w: string, i: number) => <p key={i} className="text-xs text-yellow-400">• {w}</p>)}
                </div>
              )}
            </div>
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">HITL Interrogation</h2>
              <div className="mb-4">
                <label className="label">Action ID</label>
                <input value={intActionId} onChange={e => setIntActionId(e.target.value)} className="input" />
              </div>
              <div className="mb-4">
                <label className="label">Description</label>
                <input value={intDesc} onChange={e => setIntDesc(e.target.value)} className="input" />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div><label className="label">Value</label><input type="number" value={intValue} onChange={e => setIntValue(Number(e.target.value))} className="input" /></div>
                <div><label className="label">Threshold</label><input type="number" value={intThreshold} onChange={e => setIntThreshold(Number(e.target.value))} className="input" /></div>
              </div>
              <button onClick={handleCreateInterrogation} className="btn-primary"><FileText className="w-4 h-4" /> Create Interrogation</button>
            </div>
          </div>
          {pendingInts.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Pending Interrogations ({pendingInts.length})</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-gray-400 border-b border-gray-800">
                    <th className="text-left py-2 px-3">ID</th>
                    <th className="text-left py-2 px-3">Description</th>
                    <th className="text-right py-2 px-3">Value</th>
                    <th className="text-right py-2 px-3">Threshold</th>
                    <th className="text-left py-2 px-3">Role</th>
                    <th className="text-left py-2 px-3">Actions</th>
                  </tr></thead>
                  <tbody>
                    {pendingInts.map((r: any) => (
                      <tr key={r.id} className="border-b border-gray-800/50 text-gray-300">
                        <td className="py-2 px-3 font-mono text-xs">{r.id}</td>
                        <td className="py-2 px-3">{r.actionDescription}</td>
                        <td className="py-2 px-3 text-right">${r.value?.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right">${r.threshold?.toLocaleString()}</td>
                        <td className="py-2 px-3 text-xs capitalize">{r.approverRole?.replace(/_/g, " ")}</td>
                        <td className="py-2 px-3">
                          <div className="flex gap-1">
                            <button onClick={() => handleResolveInterrogation(r.id, true)} className="px-2 py-1 bg-green-900/50 text-green-400 rounded text-xs hover:bg-green-900/70">
                              Approve
                            </button>
                            <button onClick={() => handleResolveInterrogation(r.id, false)} className="px-2 py-1 bg-red-900/50 text-red-400 rounded text-xs hover:bg-red-900/70">
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
