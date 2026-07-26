import { DataStore } from "../services/DataStore";
import { campaignIssueService } from "../services/CampaignIssueService";
import { decisionEngine } from "./DecisionEngine";

export interface IssueTrend {
  week: string;
  opened: number;
  resolved: number;
  netChange: number;
  totalOpen: number;
}

export interface AutoRemediationSuggestion {
  issueId: string;
  campaignId: string;
  title: string;
  severity: string;
  category: string;
  suggestedAction: string;
  expectedImpact: string;
  effort: "low" | "medium" | "high";
  confidence: number;
}

export interface SystemicIssue {
  category: string;
  campaignCount: number;
  avgSeverity: number;
  rootCause: string;
  recommendedInitiative: string;
}

export interface IssueIntelligenceReport {
  generatedAt: string;
  stats: ReturnType<typeof campaignIssueService.getStats>;
  autoDetected: ReturnType<typeof campaignIssueService.detectIssues>;
  trends: IssueTrend[];
  autoRemediations: AutoRemediationSuggestion[];
  systemicIssues: SystemicIssue[];
  slaRisk: { totalAtRisk: number; avgProbability: number };
  priorityQueue: { id: string; title: string; priority: number; urgency: number; impact: number }[];
  recommendations: string[];
}

export class CampaignIssueOrchestrator {
  analyze(tenantId: string): IssueIntelligenceReport {
    const issues = campaignIssueService.getIssues(tenantId);
    const stats = campaignIssueService.getStats(tenantId);
    const autoDetected = campaignIssueService.detectIssues(tenantId);
    const allIssues = [...issues, ...autoDetected.issues];
    const now = Date.now();
    const trends: IssueTrend[] = [];
    for (let w = 4; w >= 0; w--) {
      const weekStart = new Date(now - w * 7 * 86400000);
      const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
      const opened = allIssues.filter(i => {
        const c = new Date(i.createdAt).getTime(); return c >= weekStart.getTime() && c < weekEnd.getTime();
      }).length;
      const resolved = allIssues.filter(i => i.resolvedAt && new Date(i.resolvedAt).getTime() >= weekStart.getTime() && new Date(i.resolvedAt).getTime() < weekEnd.getTime()).length;
      const openBefore = allIssues.filter(i => new Date(i.createdAt).getTime() < weekStart.getTime() && i.status !== "resolved" && i.status !== "wont_fix").length;
      trends.push({
        week: weekStart.toISOString().split("T")[0], opened, resolved,
        netChange: opened - resolved, totalOpen: openBefore + opened - resolved,
      });
    }
    const autoRemediations: AutoRemediationSuggestion[] = autoDetected.issues.map(issue => {
      const score = autoDetected._detectionScores.find(s => s.issueId === issue.id);
      const actionMap: Record<string, string> = {
        budget: "Increase budget or reallocate from underperforming campaigns",
        creative: "Refresh ad copy and visuals — run A/B tests on new variants",
        performance: "Audit targeting settings, landing page experience, and bid strategy",
        platform: "Review platform-specific compliance and policy settings",
        audience: "Refine audience segments — check for overlap and saturation",
        compliance: "Engage compliance team for policy review",
        other: "Investigate and categorize for targeted action",
      };
      const suggestedAction = actionMap[issue.category] || "Review and address";
      const confidence = score?.confidence || 70;
      return {
        issueId: issue.id, campaignId: issue.campaignId, title: issue.title,
        severity: issue.severity, category: issue.category, suggestedAction,
        expectedImpact: issue.severity === "critical" ? "Prevents campaign disruption" : "Improves campaign performance",
        effort: issue.severity === "critical" ? "high" : issue.severity === "high" ? "medium" : "low",
        confidence,
      };
    });
    const catGroups: Record<string, { campaigns: Set<string>; severities: number[] }> = {};
    for (const i of allIssues) {
      if (!catGroups[i.category]) catGroups[i.category] = { campaigns: new Set(), severities: [] };
      catGroups[i.category].campaigns.add(i.campaignName || i.campaignId);
      catGroups[i.category].severities.push({ critical: 4, high: 3, medium: 2, low: 1 }[i.severity] || 0);
    }
    const systemicIssues: SystemicIssue[] = Object.entries(catGroups)
      .filter(([, g]) => g.campaigns.size >= 2)
      .map(([category, g]) => {
        const avgSev = g.severities.reduce((s, v) => s + v, 0) / g.severities.length;
        const rootCauses: Record<string, string> = {
          budget: "Inconsistent budget pacing and allocation across campaigns",
          creative: "Aging creatives without systematic refresh cycle",
          performance: "Varying conversion strategies without standardized best practices",
          platform: "Inconsistent platform configuration and compliance adherence",
          audience: "Audience overlap and segment saturation across campaigns",
          compliance: "Policy awareness gaps across teams",
          other: "Miscellaneous issues requiring categorization",
        };
        const initiatives: Record<string, string> = {
          budget: "Implement portfolio-level budget rebalancing automation",
          creative: "Establish creative rotation schedule with automated fatigue detection",
          performance: "Create standardized campaign launch checklist and playbook",
          platform: "Centralize platform management with unified compliance monitoring",
          audience: "Build cross-campaign audience overlap analysis and deduplication",
          compliance: "Deploy automated compliance checks in campaign creation workflow",
          other: "Review and categorize for systematic resolution",
        };
        return {
          category, campaignCount: g.campaigns.size, avgSeverity: Math.round(avgSev * 100) / 100,
          rootCause: rootCauses[category] || "Unknown",
          recommendedInitiative: initiatives[category] || "Investigate and resolve",
        };
      });
    const slaResult = campaignIssueService.slaBreachProbability(allIssues);
    const priorityQueue = autoDetected._detectionScores
      .map(s => ({ id: s.issueId, title: autoDetected.issues.find(i => i.id === s.issueId)?.title || "", priority: Math.round((s.urgency * 0.5 + s.impactScore * 0.3 + s.confidence * 0.2)), urgency: s.urgency, impact: s.impactScore }))
      .sort((a, b) => b.priority - a.priority);
    const recommendations: string[] = [];
    if (systemicIssues.length > 0) recommendations.push(`${systemicIssues.length} systemic issue(s) found — prioritize cross-campaign initiatives over individual fixes.`);
    if (slaResult.totalAtRisk > 0) recommendations.push(`${slaResult.totalAtRisk} issue(s) at risk of SLA breach (avg ${(slaResult.avgProbability * 100).toFixed(0)}% probability).`);
    if (autoDetected.issues.length > 0) recommendations.push(`${autoDetected.issues.length} new issues auto-detected — review and assign for resolution.`);
    if (priorityQueue.length > 0) recommendations.push(`Top priority: "${priorityQueue[0].title}" (priority ${priorityQueue[0].priority}/100).`);
    return {
      generatedAt: new Date().toISOString(), stats, autoDetected, trends, autoRemediations,
      systemicIssues, slaRisk: { totalAtRisk: slaResult.totalAtRisk, avgProbability: slaResult.avgProbability },
      priorityQueue, recommendations,
    };
  }
}

export const campaignIssueOrchestrator = new CampaignIssueOrchestrator();
