import { agentService } from "../services/AgentService";
import { decisionEngine } from "./DecisionEngine";

export interface AgentFleetStatus {
  agentId: string;
  name: string;
  type: string;
  status: string;
  healthScore: number;
  healthBand: string;
  successRate: number;
  actionEfficiency: number;
  reliability: number;
  runs: number;
  frequency: string;
  lastRun: string | null;
  schedule: { current: string; recommended: string; confidence: number } | null;
  forecast: { expectedSuccesses: number; expectedActions: number; confidence: number; trend: string } | null;
}

export interface RedundancyPair {
  agent1: string;
  agent2: string;
  similarity: number;
  overlapDescription: string;
}

export interface AgentFleetReport {
  generatedAt: string;
  agents: AgentFleetStatus[];
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  avgHealth: number;
  avgSuccessRate: number;
  fleetSuccessRate: number;
  redundancies: RedundancyPair[];
  unreachableAgents: string[];
  typeEfficiency: { type: string; avgHealth: number; count: number }[];
  recommendations: string[];
}

export class AgentOrchestrator {
  async analyzeFleet(tenantId: string): Promise<AgentFleetReport> {
    const agents = await agentService.findByTenant(tenantId);
    const agentStatuses: AgentFleetStatus[] = [];
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const a of agents) {
      byType[a.type] = (byType[a.type] || 0) + 1;
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
      const m = a.metrics || { runs: 0, successes: 0, failures: 0, actionsTaken: 0 };
      const totalRuns = m.runs || 0;
      const successRate = totalRuns > 0 ? Math.round((m.successes / totalRuns) * 10000) / 100 : 0;
      const actionEfficiency = totalRuns > 0 ? Math.round(((m.actionsTaken || 0) / totalRuns) * 100) / 100 : 0;
      const reliability = totalRuns > 0 ? Math.round((1 - (1 - (m.successes / totalRuns)) * (1 + Math.exp(-totalRuns / 10))) * 10000) / 100 : 0;
      const recencyBonus = a.lastRun ? Math.max(0, 1 - (Date.now() - new Date(a.lastRun).getTime()) / (7 * 86400000)) : 0;
      const healthScoreRaw = successRate * 0.5 + reliability * 0.3 + recencyBonus * 20;
      const healthScore = Math.round(Math.max(0, Math.min(100, healthScoreRaw)));
      let scheduleRec: { current: string; recommended: string; confidence: number } | null = null;
      try {
        const opt = await agentService.getOptimalSchedule(a._id.toString());
        if (opt) scheduleRec = { current: opt.currentFrequency, recommended: opt.recommendedFrequency, confidence: opt.confidence };
      } catch {}
      let forecast: { expectedSuccesses: number; expectedActions: number; confidence: number; trend: string } | null = null;
      try {
        const f = await agentService.forecastPerformance(a._id.toString(), 10);
        forecast = { expectedSuccesses: f.expectedSuccesses, expectedActions: f.expectedActions, confidence: f.confidence, trend: f.trend };
      } catch {}
      agentStatuses.push({
        agentId: a._id.toString(), name: a.name, type: a.type, status: a.status,
        healthScore, healthBand: decisionEngine.label(decisionEngine.band(healthScore)),
        successRate, actionEfficiency, reliability, runs: totalRuns, frequency: a.frequency,
        lastRun: a.lastRun ? a.lastRun.toISOString() : null,
        schedule: scheduleRec, forecast,
      });
    }
    const redundancies: RedundancyPair[] = [];
    try { redundancies.push(...(await agentService.detectRedundancy(tenantId))); } catch {}
    const typeGroups: Record<string, { healthScores: number[]; count: number }> = {};
    for (const a of agentStatuses) {
      if (!typeGroups[a.type]) typeGroups[a.type] = { healthScores: [], count: 0 };
      typeGroups[a.type].healthScores.push(a.healthScore);
      typeGroups[a.type].count++;
    }
    const typeEfficiency = Object.entries(typeGroups).map(([type, g]) => ({
      type, avgHealth: Math.round(g.healthScores.reduce((s, h) => s + h, 0) / g.healthScores.length),
      count: g.count,
    })).sort((a, b) => a.avgHealth - b.avgHealth);
    const avgHealth = agentStatuses.length > 0 ? Math.round(agentStatuses.reduce((s, a) => s + a.healthScore, 0) / agentStatuses.length) : 0;
    const avgSuccessRate = agentStatuses.length > 0 ? Math.round(agentStatuses.reduce((s, a) => s + a.successRate, 0) / agentStatuses.length) : 0;
    const totalRuns = agentStatuses.reduce((s, a) => s + a.runs, 0);
    const totalSuccesses = agents.reduce((s, a) => s + ((a.metrics?.successes || 0)), 0);
    const fleetSuccessRate = totalRuns > 0 ? Math.round((totalSuccesses / totalRuns) * 10000) / 100 : 0;
    const unreachableAgents = agentStatuses.filter(a => a.healthScore === 0 && a.runs === 0).map(a => a.name);
    const recommendations: string[] = [];
    if (typeEfficiency.length > 0 && typeEfficiency[0].avgHealth < 50) recommendations.push(`Lowest health type: "${typeEfficiency[0].type}" (avg ${typeEfficiency[0].avgHealth}). Review agent configurations.`);
    if (redundancies.length > 0) recommendations.push(`${redundancies.length} redundant agent pair(s) detected — consider consolidating.`);
    if (unreachableAgents.length > 0) recommendations.push(`${unreachableAgents.length} unreachable agent(s) — investigate connectivity.`);
    if (fleetSuccessRate < 80 && fleetSuccessRate > 0) recommendations.push(`Fleet success rate ${fleetSuccessRate}% — below 80% target.`);
    const stale = agentStatuses.filter(a => !a.lastRun || (Date.now() - new Date(a.lastRun).getTime()) > 7 * 86400000);
    if (stale.length > 0) recommendations.push(`${stale.length} agent(s) not run in 7+ days — review scheduling.`);
    if (avgHealth >= 80) recommendations.push("Fleet health is strong. Continue monitoring for degradation.");
    return {
      generatedAt: new Date().toISOString(), agents: agentStatuses,
      byType, byStatus, avgHealth, avgSuccessRate, fleetSuccessRate,
      redundancies, unreachableAgents, typeEfficiency, recommendations,
    };
  }
}

export const agentOrchestrator = new AgentOrchestrator();
