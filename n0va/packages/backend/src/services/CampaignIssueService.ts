import { DataStore } from "./DataStore";

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
    return {
      total: issues.length,
      byStatus: { open: issues.filter(i => i.status === "open").length, in_progress: issues.filter(i => i.status === "in_progress").length, resolved: issues.filter(i => i.status === "resolved").length, wont_fix: issues.filter(i => i.status === "wont_fix").length },
      bySeverity: { critical: issues.filter(i => i.severity === "critical").length, high: issues.filter(i => i.severity === "high").length, medium: issues.filter(i => i.severity === "medium").length, low: issues.filter(i => i.severity === "low").length },
      byCategory: [...new Set(issues.map(i => i.category))].map(c => ({ category: c, count: issues.filter(i => i.category === c).length })),
      avgResolutionTime: "2.5 days",
    };
  }
}

export const campaignIssueService = new CampaignIssueService();
