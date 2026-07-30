import { describe, it, expect, beforeAll } from "vitest";
import { CampaignIssueService } from "../services/CampaignIssueService";
import { DataStore } from "../services/DataStore";

const service = new CampaignIssueService();
const T = "issue-test-tenant";

beforeAll(() => {
  const mem = DataStore.mem();
  mem.insert("campaigns", { _id: "issue-camp-1", name: "Issue Campaign 1", tenantId: T, status: "active", budget: { daily: 100, lifetime: 3000, spent: 1500, remaining: 1500 }, metrics: { impressions: 50000, clicks: 400, conversions: 10, revenue: 800, spend: 1500, roas: 0.53, ctr: 0.8, cvr: 2.5 }, startDate: "2025-06-01", endDate: "2025-08-01", platforms: ["meta"] });
  mem.insert("campaigns", { _id: "issue-camp-2", name: "Issue Campaign 2", tenantId: T, status: "active", budget: { daily: 200, lifetime: 6000, spent: 1000, remaining: 5000 }, metrics: { impressions: 80000, clicks: 2000, conversions: 80, revenue: 5000, spend: 1000, roas: 5.0, ctr: 2.5, cvr: 4.0 }, startDate: "2025-05-01", endDate: "2025-10-01", platforms: ["google"] });
});

describe("CampaignIssueService - issueBatchUpdate", () => {
  it("batch updates multiple issues", () => {
    const issues = service.getIssues(T);
    const ids = issues.slice(0, 2).map(i => i.id);
    const result = service.issueBatchUpdate(T, ids, { status: "resolved", resolution: "Batch resolved" });
    expect(result.total).toBe(ids.length);
    expect(result.succeeded).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(result.errors)).toBe(true);
  });

  it("returns errors for non-existent issue ids", () => {
    const result = service.issueBatchUpdate(T, ["nonexistent-id"], { status: "resolved" });
    expect(result.failed).toBe(1);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
  });
});

describe("CampaignIssueService - issuePriorityQueue", () => {
  it("returns sorted priority queue", () => {
    const queue = service.issuePriorityQueue(T);
    expect(Array.isArray(queue)).toBe(true);
    for (const item of queue) {
      expect(item).toHaveProperty("issue");
      expect(item).toHaveProperty("priorityScore");
      expect(item).toHaveProperty("urgencyLabel");
      expect(item).toHaveProperty("timeSinceCreation");
      expect(item).toHaveProperty("suggestedAction");
      expect(["immediate", "today", "this_week", "when_possible"]).toContain(item.urgencyLabel);
    }
    for (let i = 1; i < queue.length; i++) {
      expect(queue[i - 1].priorityScore).toBeGreaterThanOrEqual(queue[i].priorityScore);
    }
  });
});

describe("CampaignIssueService - issueAutoAssignment", () => {
  it("returns auto-assignment suggestions for open unassigned issues", () => {
    const suggestions = service.issueAutoAssignment(T);
    expect(Array.isArray(suggestions)).toBe(true);
    for (const s of suggestions) {
      expect(s).toHaveProperty("issueId");
      expect(s).toHaveProperty("title");
      expect(s).toHaveProperty("suggestedAssignee");
      expect(s).toHaveProperty("reason");
      expect(typeof s.confidence).toBe("number");
      expect(s).toHaveProperty("category");
    }
  });
});
