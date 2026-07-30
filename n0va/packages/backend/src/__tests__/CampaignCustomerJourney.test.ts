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

  // ── Deep method tests ─────────────────────────────────────────────

  it("clusters journey paths", () => {
    const clusters = campaignCustomerJourney.journeyPathClustering(tenantId);
    expect(clusters.clusters.length).toBeGreaterThan(0);
    expect(clusters.totalJourneys).toBeGreaterThan(0);
    expect(clusters.dominantCluster).toBeTruthy();
    expect(clusters.clusterDiversity).toBeGreaterThanOrEqual(0);
    clusters.clusters.forEach(c => {
      expect(c.name).toBeTruthy();
      expect(c.journeyCount).toBeGreaterThanOrEqual(0);
      expect(c.conversionRate).toBeGreaterThanOrEqual(0);
      expect(c.commonFirstTouch).toBeTruthy();
      expect(c.commonLastTouch).toBeTruthy();
    });
  });

  it("performs attribution modeling", () => {
    const attr = campaignCustomerJourney.journeyAttributionModeling(tenantId);
    expect(attr.channels.length).toBeGreaterThanOrEqual(6);
    expect(attr.totalConversions).toBeGreaterThan(0);
    expect(attr.primaryChannel).toBeTruthy();
    expect(["strong", "moderate", "fragmented"]).toContain(attr.attributionConsensus);
    attr.channels.forEach(c => {
      expect(c.name).toBeTruthy();
      expect(c.firstTouch).toBeGreaterThanOrEqual(0);
      expect(c.lastTouch).toBeGreaterThanOrEqual(0);
      expect(c.linear).toBeGreaterThanOrEqual(0);
      expect(c.role).toBeTruthy();
    });
  });

  it("predicts journey churn", () => {
    const churn = campaignCustomerJourney.journeyChurnPrediction(tenantId);
    expect(churn.touchpointRisk.length).toBeGreaterThan(0);
    expect(churn.overallChurnRate).toBeGreaterThan(0);
    expect(churn.highestRiskTouchpoint).toBeTruthy();
    expect(churn.recommendation).toBeTruthy();
    churn.touchpointRisk.forEach(t => {
      expect(t.position).toBeGreaterThan(0);
      expect(t.channel).toBeTruthy();
      expect(t.churnRisk).toBeGreaterThanOrEqual(0);
      expect(t.churnReason).toBeTruthy();
      expect(t.retentionAction).toBeTruthy();
    });
  });

  it("maps lifecycle stages", () => {
    const stages = campaignCustomerJourney.journeyLifecycleStageMapping(tenantId);
    expect(stages.stages.length).toBeGreaterThan(0);
    expect(stages.primaryStage).toBeTruthy();
    expect(stages.lifecycleProgression).toBeTruthy();
    stages.stages.forEach(s => {
      expect(s.name).toBeTruthy();
      expect(s.journeyCount).toBeGreaterThanOrEqual(0);
      expect(s.topChannels.length).toBeGreaterThanOrEqual(0);
    });
  });

  it("measures touchpoint effectiveness", () => {
    const eff = campaignCustomerJourney.journeyTouchpointEffectiveness(tenantId);
    expect(eff.touchpointTypes.length).toBeGreaterThan(0);
    expect(eff.mostEffective).toBeTruthy();
    expect(eff.leastEffective).toBeTruthy();
    eff.touchpointTypes.forEach(t => {
      expect(t.channel).toBeTruthy();
      expect(t.position).toBeTruthy();
      expect(t.occurrenceCount).toBeGreaterThan(0);
      expect(t.conversionRate).toBeGreaterThanOrEqual(0);
      expect(t.influenceScore).toBeGreaterThan(0);
      expect(t.recommendation).toBeTruthy();
    });
  });

  it("analyzes journey sequences", () => {
    const seq = campaignCustomerJourney.journeySequenceAnalysis(tenantId);
    expect(seq.sequences.length).toBeGreaterThan(0);
    expect(seq.mostCommonSequence).toBeTruthy();
    expect(seq.highestConvertingSequence).toBeTruthy();
    expect(seq.sequenceDiversity).toBeGreaterThanOrEqual(0);
    seq.sequences.forEach(s => {
      expect(s.sequence).toBeTruthy();
      expect(s.frequency).toBeGreaterThan(0);
      expect(s.conversionRate).toBeGreaterThanOrEqual(0);
      expect(s.commonality).toBeTruthy();
    });
  });

  it("path clustering is deterministic", () => {
    const r1 = campaignCustomerJourney.journeyPathClustering(tenantId);
    const r2 = campaignCustomerJourney.journeyPathClustering(tenantId);
    expect(r1.dominantCluster).toBe(r2.dominantCluster);
    expect(r1.totalJourneys).toBe(r2.totalJourneys);
  });

  it("attribution modeling is deterministic", () => {
    const r1 = campaignCustomerJourney.journeyAttributionModeling(tenantId);
    const r2 = campaignCustomerJourney.journeyAttributionModeling(tenantId);
    expect(r1.primaryChannel).toBe(r2.primaryChannel);
    expect(r1.attributionConsensus).toBe(r2.attributionConsensus);
  });

  it("fixes Math.random bug — deterministic conversion values", () => {
    const r1 = campaignCustomerJourney.analyzeCustomerJourneys(tenantId);
    const r2 = campaignCustomerJourney.analyzeCustomerJourneys(tenantId);
    r1.journeys.forEach((j, i) => {
      expect(j.conversionValue).toBe(r2.journeys[i].conversionValue);
    });
  });
});
