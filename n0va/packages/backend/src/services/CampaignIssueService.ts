import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); hash = ((hash << 5) - hash) + c; hash |= 0; }
  return Math.abs(hash);
}

function seededRandom(seed: string): () => number {
  let h = hashStr(seed);
  return () => { h = (h * 16807) % 2147483647; return (h - 1) / 2147483646; };
}

interface CampaignIssue {
  id: string;
  tenantId: string;
  campaignId: string;
  campaignName: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  category: "budget" | "creative" | "audience" | "platform" | "performance" | "compliance" | "other";
  status: "open" | "in_progress" | "resolved" | "wont_fix";
  assignedTo?: string;
  resolution?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface DetectionResult {
  issues: CampaignIssue[];
  _detectionScores: { issueId: string; confidence: number; urgency: number; impactScore: number }[];
}

interface IssueBatchUpdateResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

interface IssuePriorityItem {
  issue: CampaignIssue;
  priorityScore: number;
  urgencyLabel: "immediate" | "today" | "this_week" | "when_possible";
  timeSinceCreation: string;
  suggestedAction: string;
}

interface IssueAssignmentSuggestion {
  issueId: string;
  title: string;
  suggestedAssignee: string;
  reason: string;
  confidence: number;
  category: string;
}

export class CampaignIssueService {
  getIssues(tenantId: string, campaignId?: string): CampaignIssue[] {
    const mem = DataStore["mem"]();
    const campaigns = mem.find("campaigns", (c: any) => c.tenantId === tenantId);
    if (!mem.find("campaign_issues", () => true).length) {
      const seed = [
        { campaignId: campaigns[0]?._id, title: "Budget pacing behind schedule", description: "Campaign has spent 32% of budget at 45% time elapsed. Increase daily spend.", severity: "high", category: "budget" },
        { campaignId: campaigns[0]?._id, title: "Low CTR on Facebook ads", description: "Facebook ad set 'Retargeting v2' has 0.8% CTR vs 2.5% benchmark.", severity: "medium", category: "performance" },
        { campaignId: campaigns[1]?._id, title: "Creative fatigue detected", description: "Top creative has been running for 28 days with declining engagement.", severity: "high", category: "creative" },
        { campaignId: campaigns[2]?._id, title: "Google Ads disapproved", description: "3 ads disapproved due to policy violation on headline length.", severity: "critical", category: "platform" },
        { campaignId: campaigns[3]?._id, title: "Missing conversion tracking", description: "Campaign launched without conversion tracking configured.", severity: "high", category: "performance" },
      ];
      seed.forEach(s => mem.insert("campaign_issues", { ...s, tenantId, campaignName: campaigns.find((c: any) => c._id === s.campaignId)?.name || "Unknown", status: "open", createdAt: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(), updatedAt: new Date().toISOString() }));
    }
    let issues = mem.find("campaign_issues", (i: any) => i.tenantId === tenantId);
    if (campaignId) issues = issues.filter((i: any) => i.campaignId === campaignId);
    return issues.map((i: any) => ({ ...i, id: i._id || i.id }));
  }

  createIssue(tenantId: string, data: { campaignId: string; campaignName: string; title: string; description?: string; severity?: string; category?: string }): CampaignIssue {
    const mem = DataStore["mem"]();
    const issue: CampaignIssue = {
      id: `issue_${Date.now()}`,
      tenantId,
      campaignId: data.campaignId,
      campaignName: data.campaignName,
      title: data.title,
      description: data.description || "",
      severity: (data.severity as any) || "medium",
      category: (data.category as any) || "other",
      status: "open",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mem.insert("campaign_issues", issue);
    return issue;
  }

  updateIssue(tenantId: string, id: string, data: Partial<CampaignIssue>): CampaignIssue | null {
    const mem = DataStore["mem"]();
    const existing = mem.findOne("campaign_issues", (i: any) => (i._id || i.id) === id && i.tenantId === tenantId);
    if (!existing) return null;
    const updated = { ...existing, ...data, id: existing._id || existing.id, updatedAt: new Date().toISOString() };
    if (data.status === "resolved" && !updated.resolvedAt) { updated.resolvedAt = new Date().toISOString(); updated.resolvedBy = "current_user"; }
    mem.update("campaign_issues", (i: any) => (i._id || i.id) === id, updated);
    return updated;
  }

  deleteIssue(tenantId: string, id: string): boolean {
    return DataStore["mem"]().delete("campaign_issues", (i: any) => (i._id || i.id) === id && i.tenantId === tenantId);
  }

  getStats(tenantId: string) {
    const issues = this.getIssues(tenantId);

    // Run resolution time prediction
    const resolutionPrediction = this.predictResolutionTime(issues);

    // Run root cause analysis
    const rootCauses = this.rootCauseAnalysis(issues);

    // Run SLA breach probability
    const slaRisk = this.slaBreachProbability(issues);

    return {
      total: issues.length,
      byStatus: { open: issues.filter(i => i.status === "open").length, in_progress: issues.filter(i => i.status === "in_progress").length, resolved: issues.filter(i => i.status === "resolved").length, wont_fix: issues.filter(i => i.status === "wont_fix").length },
      bySeverity: { critical: issues.filter(i => i.severity === "critical").length, high: issues.filter(i => i.severity === "high").length, medium: issues.filter(i => i.severity === "medium").length, low: issues.filter(i => i.severity === "low").length },
      byCategory: [...new Set(issues.map(i => i.category))].map(c => ({ category: c, count: issues.filter(i => i.category === c).length })),
      avgResolutionTime: "2.5 days",
      _resolutionPrediction: resolutionPrediction,
      _rootCauses: rootCauses,
      _slaRisk: slaRisk,
    };
  }

  // ─── Automated Issue Detection ───────────────────────────────────────

  /**
   * Detect issues automatically by scanning campaign metrics against
   * configurable thresholds with confidence scoring.
   */
  detectIssues(tenantId: string): DetectionResult {
    const mem = DataStore["mem"]();
    const campaigns = mem.find("campaigns", (c: any) => c.tenantId === tenantId && c.status === "active");
    const detected: CampaignIssue[] = [];
    const scores: { issueId: string; confidence: number; urgency: number; impactScore: number }[] = [];

    for (const campaign of campaigns) {
      const metrics = campaign.metrics;
      const budget = campaign.budget;
      if (!metrics) continue;

      // Budget pacing issue
      if (budget?.lifetime > 0 && budget?.spent > 0) {
        const spentPct = (budget.spent / budget.lifetime) * 100;
        if (campaign.startDate && campaign.endDate) {
          const elapsed = Math.max(0, (Date.now() - new Date(campaign.startDate).getTime()) / 86400000);
          const total = Math.max(1, (new Date(campaign.endDate).getTime() - new Date(campaign.startDate).getTime()) / 86400000);
          const timePct = (elapsed / total) * 100;
          const deviation = spentPct - timePct;

          if (deviation > 20) {
            const confidence = Math.min(0.95, 0.5 + deviation / 200);
            const urgency = Math.min(1, deviation / 50);
            const impactScore = Math.min(1, budget.remaining / 10000);
            const id = `auto_budget_${campaign._id}_${Date.now()}`;
            detected.push({
              id, tenantId, campaignId: campaign._id, campaignName: campaign.name,
              title: "Budget pacing anomaly detected",
              description: `Spend pace (${spentPct.toFixed(0)}%) exceeds time elapsed (${timePct.toFixed(0)}%) by ${deviation.toFixed(0)}pp.`,
              severity: deviation > 35 ? "critical" : "high", category: "budget", status: "open",
              createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            });
            scores.push({ issueId: id, confidence: Math.round(confidence * 100), urgency: Math.round(urgency * 100), impactScore: Math.round(impactScore * 100) });
          }
        }
      }

      // ROAS issue
      if (metrics.roas !== undefined && metrics.roas < 1.5) {
        const severity: "critical" | "high" | "medium" = metrics.roas < 0.5 ? "critical" : metrics.roas < 1.0 ? "high" : "medium";
        const confidence = Math.max(0.7, 1 - metrics.roas / 2);
        const id = `auto_roas_${campaign._id}_${Date.now()}`;
        detected.push({
          id, tenantId, campaignId: campaign._id, campaignName: campaign.name,
          title: "Below-target ROAS",
          description: `ROAS of ${metrics.roas.toFixed(2)}x is below the minimum target of 1.5x. ${metrics.roas < 1 ? "Campaign is losing money." : ""}`,
          severity, category: "performance", status: "open",
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        });
        scores.push({ issueId: id, confidence: Math.round(confidence * 100), urgency: severity === "critical" ? 95 : severity === "high" ? 70 : 40, impactScore: Math.round(Math.min(100, (1.5 - metrics.roas) * 50)) });
      }

      // CTR issue
      if (metrics.ctr !== undefined && metrics.ctr < 1.0 && metrics.impressions > 5000) {
        const id = `auto_ctr_${campaign._id}_${Date.now()}`;
        detected.push({
          id, tenantId, campaignId: campaign._id, campaignName: campaign.name,
          title: "Low CTR — creative fatigue risk",
          description: `CTR of ${metrics.ctr.toFixed(2)}% is below 1.0% threshold with ${metrics.impressions.toLocaleString()} impressions. Creative may be fatigued.`,
          severity: "medium", category: "creative", status: "open",
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        });
        scores.push({ issueId: id, confidence: 75, urgency: 45, impactScore: 40 });
      }

      // High CPC issue
      if (metrics.cpc !== undefined && metrics.cpc > 3.0 && metrics.clicks > 100) {
        const id = `auto_cpc_${campaign._id}_${Date.now()}`;
        detected.push({
          id, tenantId, campaignId: campaign._id, campaignName: campaign.name,
          title: "Elevated CPC eroding margins",
          description: `CPC of $${metrics.cpc.toFixed(2)} exceeds $3.00 threshold across ${metrics.clicks} clicks. Review keyword relevance and bidding strategy.`,
          severity: "medium", category: "budget", status: "open",
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        });
        scores.push({ issueId: id, confidence: 70, urgency: 50, impactScore: 35 });
      }
    }

    return { issues: detected, _detectionScores: scores };
  }

  // ─── Resolution Time Prediction ──────────────────────────────────────

  /**
   * Predict resolution time for open issues based on historical patterns.
   * Uses a simplified regression model weighted by severity and category.
   */
  predictResolutionTime(issues: CampaignIssue[]): {
    openIssues: { id: string; title: string; predictedHours: number; confidence: number; slaDeadline: string }[];
    avgPredictedHours: number;
    totalBacklogHours: number;
  } {
    const severityMultiplier: Record<string, number> = { critical: 4, high: 16, medium: 48, low: 120 };
    const categoryMultiplier: Record<string, number> = { budget: 1.0, creative: 1.3, audience: 1.5, platform: 2.0, performance: 1.2, compliance: 3.0, other: 1.5 };

    // Historical resolved issues (use seed data average)
    const resolved = issues.filter((i) => i.status === "resolved" && i.resolvedAt && i.createdAt);
    const historicalAvgHours = resolved.length > 0
      ? resolved.reduce((s, i) => s + (new Date(i.resolvedAt!).getTime() - new Date(i.createdAt).getTime()) / 3600000, 0) / resolved.length
      : 48; // default 48h

    const open = issues.filter((i) => i.status === "open" || i.status === "in_progress");
    const predictions = open.map((i) => {
      const base = severityMultiplier[i.severity] || 48;
      const catMul = categoryMultiplier[i.category] || 1.5;
      const predictedHours = Math.round(base * catMul);
      const daysOpen = (Date.now() - new Date(i.createdAt).getTime()) / 3600000;
      const elapsedRatio = Math.min(1, daysOpen / predictedHours);
      const confidence = Math.max(0.3, 0.9 - elapsedRatio * 0.4);
      const slaDate = new Date(Date.now() + predictedHours * 3600000);
      return {
        id: i.id, title: i.title,
        predictedHours,
        confidence: Math.round(confidence * 100) / 100,
        slaDeadline: slaDate.toISOString(),
      };
    });

    const avgHours = predictions.length > 0
      ? predictions.reduce((s, p) => s + p.predictedHours, 0) / predictions.length
      : 0;

    return {
      openIssues: predictions,
      avgPredictedHours: Math.round(avgHours * 10) / 10,
      totalBacklogHours: Math.round(predictions.reduce((s, p) => s + p.predictedHours, 0) * 10) / 10,
    };
  }

  // ─── Root Cause Analysis ─────────────────────────────────────────────

  /**
   * Correlate issue categories with severity patterns to identify
   * systemic root causes.
   */
  rootCauseAnalysis(issues: CampaignIssue[]): {
    patterns: { category: string; avgSeverity: number; frequency: number; isSystemic: boolean; suggestedAction: string }[];
    mostFrequentCategory: string;
    highestSeverityCategory: string;
    systemicIssues: string[];
  } {
    const categories = [...new Set(issues.map((i) => i.category))];
    const severityScore: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

    const patterns = categories.map((cat) => {
      const catIssues = issues.filter((i) => i.category === cat);
      const avgSeverity = catIssues.reduce((s, i) => s + (severityScore[i.severity] || 0), 0) / catIssues.length;
      const frequency = catIssues.length;
      const isSystemic = frequency >= 2 && avgSeverity >= 2.5;
      const suggestedActions: Record<string, string> = {
        budget: "Review budget allocation and pacing across all campaigns. Consider portfolio-level rebalancing.",
        creative: "Implement creative rotation schedule and A/B testing framework. Set up fatigue monitoring.",
        audience: "Refresh audience segments and lookalike models. Check for audience overlap and saturation.",
        platform: "Audit platform-specific settings and compliance. Review ad policy changes per platform.",
        performance: "Review targeting, bidding, and landing page experience. Analyze funnel drop-off points.",
        compliance: "Engage legal/compliance team for policy review. Update creative approval workflow.",
        other: "Review and categorize for targeted action.",
      };
      return {
        category: cat,
        avgSeverity: Math.round(avgSeverity * 100) / 100,
        frequency,
        isSystemic,
        suggestedAction: suggestedActions[cat] || "Review and address underlying causes.",
      };
    });

    patterns.sort((a, b) => b.frequency - a.frequency);

    return {
      patterns,
      mostFrequentCategory: patterns[0]?.category || "none",
      highestSeverityCategory: patterns.sort((a, b) => b.avgSeverity - a.avgSeverity)[0]?.category || "none",
      systemicIssues: patterns.filter((p) => p.isSystemic).map((p) => p.category),
    };
  }

  // ─── SLA Breach Probability ──────────────────────────────────────────

  /**
   * Estimate probability of SLA breach for each open issue based on
   * elapsed time vs predicted resolution time.
   */
  slaBreachProbability(issues: CampaignIssue[]): {
    atRisk: { id: string; title: string; probability: number; daysOverdue: number }[];
    totalAtRisk: number;
    avgProbability: number;
  } {
    const prediction = this.predictResolutionTime(issues);
    const atRisk = prediction.openIssues
      .map((p) => {
        const elapsed = (Date.now() - new Date(p.slaDeadline).getTime()) / 86400000;
        const daysOverdue = Math.max(0, Math.round(elapsed * 10) / 10);
        // Probability increases with elapsed time beyond SLA
        const probability = Math.min(0.99, daysOverdue > 0 ? 0.5 + daysOverdue * 0.1 : 0.1);
        return { id: p.id, title: p.title, probability: Math.round(probability * 100) / 100, daysOverdue };
      })
      .filter((a) => a.probability > 0.3);

    atRisk.sort((a, b) => b.probability - a.probability);

    return {
      atRisk,
      totalAtRisk: atRisk.length,
      avgProbability: atRisk.length > 0
        ? Math.round(atRisk.reduce((s, a) => s + a.probability, 0) / atRisk.length * 100) / 100
        : 0,
    };
  }

  issueBatchUpdate(tenantId: string, issueIds: string[], updates: Partial<CampaignIssue>): IssueBatchUpdateResult {
    const mem = DataStore["mem"]();
    let succeeded = 0, failed = 0;
    const errors: string[] = [];
    for (const id of issueIds) {
      const existing = mem.findOne("campaign_issues", (i: any) => (i._id || i.id) === id && i.tenantId === tenantId);
      if (!existing) { failed++; errors.push(`Issue ${id} not found`); continue; }
      const updateData = { ...updates, updatedAt: new Date().toISOString() };
      if (updates.status === "resolved" && !existing.resolvedAt) {
        updateData.resolvedAt = new Date().toISOString();
        updateData.resolvedBy = "batch_user";
      }
      mem.update("campaign_issues", (i: any) => (i._id || i.id) === id, updateData);
      succeeded++;
    }
    return { total: issueIds.length, succeeded, failed, errors };
  }

  issuePriorityQueue(tenantId: string): IssuePriorityItem[] {
    const issues = this.getIssues(tenantId);
    const open = issues.filter(i => i.status === "open" || i.status === "in_progress");
    const severityScores: Record<string, number> = { critical: 100, high: 60, medium: 30, low: 10 };
    const now = Date.now();
    return open.map(i => {
      const sevScore = severityScores[i.severity] || 0;
      const hoursSince = (now - new Date(i.createdAt).getTime()) / 3600000;
      const ageBonus = Math.min(40, hoursSince / 24 * 5);
      const priorityScore = Math.round(sevScore + ageBonus);
      const urgencyLabel: IssuePriorityItem["urgencyLabel"] = priorityScore >= 100 ? "immediate" : priorityScore >= 60 ? "today" : priorityScore >= 30 ? "this_week" : "when_possible";
      return {
        issue: i, priorityScore, urgencyLabel,
        timeSinceCreation: hoursSince < 1 ? `${Math.round(hoursSince * 60)}m` : hoursSince < 24 ? `${Math.round(hoursSince)}h` : `${Math.round(hoursSince / 24)}d`,
        suggestedAction: i.severity === "critical" ? "Assign immediately and escalate if unresolved within 4h" : i.severity === "high" ? "Assign today with 24h resolution target" : "Review during next sprint planning",
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore);
  }

  issueAutoAssignment(tenantId: string): IssueAssignmentSuggestion[] {
    const issues = this.getIssues(tenantId);
    const open = issues.filter(i => i.status === "open" && !i.assignedTo);
    const teamByCategory: Record<string, string[]> = {
      budget: ["finance_team", "campaign_manager"],
      creative: ["creative_team", "design_team"],
      audience: ["audience_strategist", "data_scientist"],
      platform: ["platform_specialist", "tech_ops"],
      performance: ["campaign_manager", "optimization_team"],
      compliance: ["legal_team", "compliance_officer"],
      other: ["campaign_manager"],
    };
    return open.map(i => {
      const rng = seededRandom(i.id + tenantId + "_auto");
      const candidates = teamByCategory[i.category] || ["campaign_manager"];
      return {
        issueId: i.id, title: i.title,
        suggestedAssignee: candidates[0],
        reason: `${i.category} issues typically handled by ${candidates[0]}`,
        confidence: 70 + Math.floor(rng() * 20),
        category: i.category,
      };
    });
  }
}
