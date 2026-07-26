import { DataStore } from "../services/DataStore";
import { workflowBuilderService } from "../services/WorkflowBuilderService";
import { decisionEngine } from "./DecisionEngine";

export interface WorkflowEfficiency {
  workflowId: string;
  name: string;
  category: string;
  status: string;
  nodeCount: number;
  edgeCount: number;
  complexity: number;
  complexityBand: string;
  hasCycle: boolean;
  executionCount: number;
  successRate: number;
  avgDuration: number;
  bottleneckNodes: { id: string; label: string; type: string; inDegree: number; outDegree: number }[];
  optimizationScore: number;
  optimizationBand: string;
  suggestions: string[];
}

export interface WorkflowFleetReport {
  generatedAt: string;
  workflows: WorkflowEfficiency[];
  portfolioStats: {
    total: number;
    active: number;
    draft: number;
    paused: number;
    archived: number;
    byCategory: Record<string, number>;
  };
  avgComplexity: number;
  avgSuccessRate: number;
  topOptimizations: { workflowId: string; name: string; score: number; suggestion: string }[];
  recommendations: string[];
}

export class WorkflowBuilderOrchestrator {
  analyzeAll(tenantId: string): WorkflowFleetReport {
    const workflows = workflowBuilderService.listWorkflows(tenantId);
    const categoryCount: Record<string, number> = {};
    const wfEfficiencies: WorkflowEfficiency[] = workflows.map(wf => {
      const nodeCount = wf.nodes.length;
      const edgeCount = wf.edges.length;
      const complexity = nodeCount > 0 ? Math.round((nodeCount * 0.4 + edgeCount * 0.3 + (wf.nodes.filter(n => n.type === "condition").length * 0.2 + wf.nodes.filter(n => n.type === "split").length * 0.1)) * 10) / 10 : 0;
      const inDegMap = new Map<string, number>();
      const outDegMap = new Map<string, number>();
      for (const n of wf.nodes) { inDegMap.set(n.id, 0); outDegMap.set(n.id, 0); }
      for (const e of wf.edges) {
        outDegMap.set(e.source, (outDegMap.get(e.source) || 0) + 1);
        inDegMap.set(e.target, (inDegMap.get(e.target) || 0) + 1);
      }
      const highIn = [...inDegMap.entries()].filter(([, d]) => d >= 3).map(([id]) => wf.nodes.find(n => n.id === id)).filter(Boolean);
      const highOut = [...outDegMap.entries()].filter(([, d]) => d >= 3).map(([id]) => wf.nodes.find(n => n.id === id)).filter(Boolean);
      const bottleneckNodes = [...highIn, ...highOut].map(n => ({
        id: n!.id, label: n!.label, type: n!.type,
        inDegree: inDegMap.get(n!.id) || 0, outDegree: outDegMap.get(n!.id) || 0,
      }));
      const executions = workflowBuilderService.getExecutions(tenantId, wf.id) as any[];
      const executionCount = executions.length;
      const completedEx = executions.filter((e: any) => e.status === "completed").length;
      const failedEx = executions.filter((e: any) => e.status === "failed").length;
      const successRate = (completedEx + failedEx) > 0 ? Math.round((completedEx / (completedEx + failedEx)) * 100) : 0;
      const durations = executions.filter((e: any) => e.completedAt).map((e: any) => new Date(e.completedAt).getTime() - new Date(e.startedAt).getTime());
      const avgDuration = durations.length > 0 ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length / 1000) : 0;
      const hasCycle = nodeCount > 0 && edgeCount > 0 && edgeCount >= nodeCount;
      const suggestions: string[] = [];
      if (hasCycle) suggestions.push("Workflow contains a potential cycle — review edge connections.");
      if (bottleneckNodes.length > 0) suggestions.push(`Node "${bottleneckNodes[0].label}" has high connectivity (fan-in/out) — consider splitting.`);
      if (edgeCount > nodeCount * 1.5) suggestions.push("High edge-to-node ratio — workflow may be overly complex.");
      if (nodeCount > 10) suggestions.push("Workflow has 10+ nodes — consider modularizing into sub-workflows.");
      if (successRate > 0 && successRate < 60) suggestions.push("Low execution success rate — review error-prone paths.");
      const optimizationScore = Math.round(Math.max(0, Math.min(100,
        50 - complexity * 2 + (successRate > 0 ? successRate * 0.3 : 0) + (avgDuration > 0 && avgDuration < 300 ? 10 : 0) - (bottleneckNodes.length * 5) - (hasCycle ? 15 : 0)
      )));
      categoryCount[wf.category] = (categoryCount[wf.category] || 0) + 1;
      return {
        workflowId: wf.id, name: wf.name, category: wf.category, status: wf.status,
        nodeCount, edgeCount, complexity, complexityBand: decisionEngine.label(decisionEngine.band(100 - complexity * 5, { excellent: 90, good: 70, fair: 50, poor: 30 })),
        hasCycle, executionCount, successRate, avgDuration, bottleneckNodes,
        optimizationScore, optimizationBand: decisionEngine.label(decisionEngine.band(optimizationScore)),
        suggestions,
      };
    });
    const active = wfEfficiencies.filter(w => w.status === "active").length;
    const draft = wfEfficiencies.filter(w => w.status === "draft").length;
    const paused = wfEfficiencies.filter(w => w.status === "paused").length;
    const archived = wfEfficiencies.filter(w => w.status === "archived").length;
    const total = wfEfficiencies.length;
    const avgComplexity = total > 0 ? Math.round(wfEfficiencies.reduce((s, w) => s + w.complexity, 0) / total * 10) / 10 : 0;
    const withRuns = wfEfficiencies.filter(w => w.executionCount > 0);
    const avgSuccessRate = withRuns.length > 0 ? Math.round(withRuns.reduce((s, w) => s + w.successRate, 0) / withRuns.length) : 0;
    const topOptimizations = [...wfEfficiencies].sort((a, b) => a.optimizationScore - b.optimizationScore).slice(0, 5).map(w => ({
      workflowId: w.workflowId, name: w.name, score: w.optimizationScore, suggestion: w.suggestions[0] || "Review for optimization",
    }));
    const recommendations: string[] = [];
    if (topOptimizations.length > 0) recommendations.push(`Lowest optimization: "${topOptimizations[0].name}" (score ${topOptimizations[0].score}) — ${topOptimizations[0].suggestion}`);
    if (avgSuccessRate > 0 && avgSuccessRate < 70) recommendations.push("Average workflow success rate below 70% — audit error handling across workflows.");
    if (active < total * 0.3) recommendations.push("Less than 30% of workflows are active — consider archiving unused drafts.");
    return {
      generatedAt: new Date().toISOString(), workflows: wfEfficiencies,
      portfolioStats: { total, active, draft, paused, archived, byCategory: categoryCount },
      avgComplexity, avgSuccessRate, topOptimizations, recommendations,
    };
  }
}

export const workflowBuilderOrchestrator = new WorkflowBuilderOrchestrator();
