import { useEffect, useState } from "react";
import { api } from "../api/client";
import { AlertTriangle, CheckCircle, Shield, RefreshCw, Play, Flag, Ban } from "lucide-react";

interface Flag {
  id: string;
  campaignId: string;
  campaignName: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  metric: string;
  value: number;
  threshold: number;
  flaggedAt: string;
  resolved: boolean;
}

interface FraudHealth {
  totalEvaluations: number;
  flagged: number;
  criticalFlags: number;
  resolvedFlags: number;
  overallHealth: "good" | "warning" | "critical";
  topIssues: string[];
}

export default function FraudEvaluation() {
  const [health, setHealth] = useState<FraudHealth | null>(null);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [healthData, flagsData] = await Promise.all([
        api.fraud.health(),
        api.fraud.simulate().then((sim: any) => {
          const allFlags: Flag[] = [];
          for (const campaign of Object.values(sim.campaigns || {}) as any[]) {
            for (const flag of campaign.flags || []) {
              allFlags.push({ ...flag, campaignName: campaign.campaignName || "Unknown" });
            }
          }
          return allFlags;
        }),
      ]);
      setHealth(healthData);
      setFlags(flagsData);
    } finally {
      setLoading(false);
    }
  }

  async function runEvaluation() {
    setEvaluating(true);
    setResult(null);
    try {
      const res = await api.fraud.evaluate({ simulate: true, detailed: true });
      setResult(res);
      await loadData();
    } finally {
      setEvaluating(false);
    }
  }

  async function runSimulation() {
    setSimulating(true);
    try {
      const res = await api.fraud.simulate();
      setResult(res.summary || res);
      const allFlags: Flag[] = [];
      for (const campaign of Object.values(res.campaigns || {}) as any[]) {
        for (const flag of campaign.flags || []) {
          allFlags.push({ ...flag, campaignName: campaign.campaignName || "Unknown" });
        }
      }
      setFlags(allFlags);
    } finally {
      setSimulating(false);
    }
  }

  async function resolveFlag(flagId: string) {
    try {
      await api.fraud.resolveFlag(flagId);
      setFlags((prev) => prev.map((f) => (f.id === flagId ? { ...f, resolved: true } : f)));
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-n0va-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const unresolved = flags.filter((f) => !f.resolved);
  const severityColors: Record<string, string> = {
    low: "text-blue-400 bg-blue-500/10",
    medium: "text-yellow-400 bg-yellow-500/10",
    high: "text-orange-400 bg-orange-500/10",
    critical: "text-red-400 bg-red-500/10",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Fraud Evaluation Center</h1>
          <p className="text-gray-500 mt-1">Detect invalid traffic, click fraud, and anomalous patterns</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary flex items-center gap-2" onClick={runEvaluation} disabled={evaluating}>
            {evaluating ? <div className="animate-spin w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full" /> : <Play className="w-4 h-4" />}
            Evaluate
          </button>
          <button className="btn-secondary flex items-center gap-2" onClick={runSimulation} disabled={simulating}>
            {simulating ? <div className="animate-spin w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full" /> : <RefreshCw className="w-4 h-4" />}
            Simulate
          </button>
        </div>
      </div>

      {result && (
        <div className="card border-yellow-500/30">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div>
              <h3 className="text-white font-semibold mb-1">Evaluation Result</h3>
              <pre className="text-sm text-gray-400 whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="card">
          <Shield className={`w-4 h-4 mb-2 ${health?.overallHealth === "good" ? "text-green-400" : health?.overallHealth === "warning" ? "text-yellow-400" : "text-red-400"}`} />
          <p className="text-lg font-bold text-white">{health?.overallHealth || "good"}</p>
          <p className="text-xs text-gray-500">Overall Health</p>
        </div>
        <div className="card">
          <CheckCircle className="w-4 h-4 text-green-400 mb-2" />
          <p className="text-lg font-bold text-white">{health?.totalEvaluations || flags.length}</p>
          <p className="text-xs text-gray-500">Evaluations</p>
        </div>
        <div className="card">
          <AlertTriangle className="w-4 h-4 text-yellow-400 mb-2" />
          <p className="text-lg font-bold text-white">{health?.flagged || unresolved.length}</p>
          <p className="text-xs text-gray-500">Active Flags</p>
        </div>
        <div className="card">
          <Flag className="w-4 h-4 text-red-400 mb-2" />
          <p className="text-lg font-bold text-white">{health?.criticalFlags || 0}</p>
          <p className="text-xs text-gray-500">Critical</p>
        </div>
        <div className="card">
          <Ban className="w-4 h-4 text-blue-400 mb-2" />
          <p className="text-lg font-bold text-white">{health?.resolvedFlags || flags.filter((f) => f.resolved).length}</p>
          <p className="text-xs text-gray-500">Resolved</p>
        </div>
      </div>

      {health?.topIssues && health.topIssues.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-3">Top Issues</h3>
          <div className="space-y-2">
            {health.topIssues.map((issue, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-gray-800 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <span className="text-sm text-gray-300">{issue}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Fraud Flags ({unresolved.length} active)</h3>
          <span className="text-xs text-gray-500">{flags.length} total</span>
        </div>
        {flags.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Shield className="w-10 h-10 mx-auto mb-2 text-green-400" />
            <p>No fraud flags detected</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left py-2 px-3">Campaign</th>
                  <th className="text-left py-2 px-3">Type</th>
                  <th className="text-center py-2 px-3">Severity</th>
                  <th className="text-right py-2 px-3">Value</th>
                  <th className="text-right py-2 px-3">Threshold</th>
                  <th className="text-left py-2 px-3">Description</th>
                  <th className="text-center py-2 px-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {flags.map((flag) => (
                  <tr key={flag.id} className={`border-b border-gray-800/50 hover:bg-gray-800/30 ${flag.resolved ? "opacity-50" : ""}`}>
                    <td className="py-2 px-3 text-white">{flag.campaignName}</td>
                    <td className="py-2 px-3 text-gray-300 capitalize">{flag.type}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${severityColors[flag.severity] || "text-gray-400"}`}>
                        {flag.severity}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right text-gray-300">{flag.value?.toFixed?.(1) ?? flag.value}</td>
                    <td className="py-2 px-3 text-right text-gray-400">{flag.threshold}</td>
                    <td className="py-2 px-3 text-gray-400 max-w-xs truncate">{flag.description}</td>
                    <td className="py-2 px-3 text-center">
                      {flag.resolved ? (
                        <span className="text-xs text-green-400">Resolved</span>
                      ) : (
                        <button
                          className="text-xs text-n0va-400 hover:text-n0va-300"
                          onClick={() => resolveFlag(flag.id)}
                        >
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-3">Detection Methodology</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-white font-medium mb-1">Click Fraud Detection</p>
            <p className="text-gray-400">Analyzes click timing distributions, IP clustering, and user-agent patterns to identify automated click farms and bot traffic.</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-white font-medium mb-1">IVT Detection</p>
            <p className="text-gray-400">Invalid Traffic detection using impression-to-click ratios, viewability scores, and device fingerprint correlation against known fraud sources.</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-white font-medium mb-1">Anomaly Detection</p>
            <p className="text-gray-400">Statistical outlier detection on conversion patterns, geographic distribution, and spend velocity using rolling Z-score analysis.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
