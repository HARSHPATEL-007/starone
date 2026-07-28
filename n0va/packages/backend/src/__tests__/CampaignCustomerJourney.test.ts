import { describe, it, expect } from "vitest";
import { campaignCustomerJourney } from "../services/CampaignCustomerJourneyService";

describe("CampaignCustomerJourneyService", () => {
  const tenantId = "test-tenant-jny";

  it("analyzes customer journeys", () => {
    const report = campaignCustomerJourney.analyzeCustomerJourneys(tenantId);
    expect(report.tenantId).toBe(tenantId);
    expect(report.journeys.length).toBeGreaterThan(0);
    expect(report.averageTouchpoints).toBeGreaterThan(0);
    expect(report.overallConversionRate).toBeGreaterThan(0);
    expect(report.journeyLengthDistribution.length).toBeGreaterThan(0);
    expect(report.commonPaths.length).toBeGreaterThan(0);
    expect(report.recommendations.length).toBeGreaterThan(0);
    report.journeys.forEach(j => {
      expect(j.journeyId).toBeTruthy();
      expect(j.touchpoints.length).toBe(j.totalTouchpoints);
      expect(j.path).toBeTruthy();
    });
  });

  it("returns consistent journeys for same tenant", () => {
    const r1 = campaignCustomerJourney.analyzeCustomerJourneys(tenantId);
    const r2 = campaignCustomerJourney.analyzeCustomerJourneys(tenantId);
    expect(r1.journeys.length).toBe(r2.journeys.length);
    expect(r1.averageTouchpoints).toBe(r2.averageTouchpoints);
    expect(r1.overallConversionRate).toBe(r2.overallConversionRate);
  });

  it("returns different journeys for different tenants", () => {
    const rA = campaignCustomerJourney.analyzeCustomerJourneys("tenant-alpha");
    const rB = campaignCustomerJourney.analyzeCustomerJourneys("tenant-beta");
    expect(rA.journeys.length).not.toBe(rB.journeys.length);
  });

  it("analyzes journey segments", () => {
    const segments = campaignCustomerJourney.analyzeJourneySegments(tenantId);
    expect(segments.length).toBe(6);
    segments.forEach(s => {
      expect(s.segmentName).toBeTruthy();
      expect(s.description).toBeTruthy();
      expect(s.averageTouchpoints).toBeGreaterThanOrEqual(0);
      expect(s.averageHours).toBeGreaterThanOrEqual(0);
      expect(s.mostCommonFirstTouch).toBeTruthy();
      expect(s.mostCommonLastTouch).toBeTruthy();
    });
  });

  it("generates journey optimizations", () => {
    const opts = campaignCustomerJourney.generateJourneyOptimizations(tenantId);
    expect(opts.length).toBeGreaterThan(0);
    opts.forEach(o => {
      expect(o.focusArea).toBeTruthy();
      expect(o.insight).toBeTruthy();
      expect(o.recommendation).toBeTruthy();
      expect(o.expectedImpact).toBeTruthy();
      expect(["high", "medium", "low"]).toContain(o.priority);
    });
  });

  it("analyzes journey drop-offs", () => {
    const dropOffs = campaignCustomerJourney.analyzeJourneyDropOffs(tenantId);
    expect(dropOffs.length).toBeGreaterThan(0);
    dropOffs.forEach(d => {
      expect(d.touchpointLabel).toBeTruthy();
      expect(d.usersEntering).toBeGreaterThan(0);
      expect(d.dropOffRate).toBeGreaterThanOrEqual(0);
      expect(["high", "medium", "low"]).toContain(d.significance);
      expect(d.recoverySuggestion).toBeTruthy();
    });
  });

  it("analyzes journey time buckets", () => {
    const buckets = campaignCustomerJourney.analyzeJourneyTimeBuckets(tenantId);
    expect(buckets.length).toBe(6);
    buckets.forEach(b => {
      expect(b.timeBucket).toBeTruthy();
      expect(b.journeyCount).toBeGreaterThanOrEqual(0);
      expect(b.conversionRate).toBeGreaterThanOrEqual(0);
      expect(b.recommendation).toBeTruthy();
    });
  });

  it("handles empty portfolio gracefully", () => {
    const empty = campaignCustomerJourney.analyzeCustomerJourneys("empty-tenant");
    expect(empty.journeys.length).toBeGreaterThan(0);
    expect(empty.averageTouchpoints).toBeGreaterThan(0);
    expect(empty.overallConversionRate).toBeGreaterThanOrEqual(0);
  });

  it("returns actionable recommendations", () => {
    const report = campaignCustomerJourney.analyzeCustomerJourneys(tenantId);
    expect(report.recommendations.length).toBeGreaterThanOrEqual(1);
    report.recommendations.forEach(r => {
      expect(typeof r).toBe("string");
      expect(r.length).toBeGreaterThan(10);
    });
  });
});
