import { cdpService } from "../services/CDPService";
import { decisionEngine } from "./DecisionEngine";

export interface CDPIntelligenceReport {
  profileIntelligence: {
    totalProfiles: number;
    activeProfiles: number;
    avgLTV: number;
    ltvPercentiles: { p25: number; p50: number; p75: number; p95: number };
    segmentCount: number;
    topTraits: { trait: string; count: number }[];
  };
  segmentOverlap: { segmentA: string; segmentB: string; overlapCount: number; overlapPct: number }[];
  lookalikeEffectiveness: { seedProfileCount: number; candidateCount: number; avgSimilarity: number; highSimilarityCount: number };
  ltvSummary: {
    totalCurrentLTV: number;
    totalPredicted12Months: number;
    growthPct: number;
    atRiskCount: number;
    highValueCount: number;
    avgConfidence: number;
  };
  eventHealth: {
    totalEvents: number;
    uniqueTypes: number;
    topEventType: string;
    eventVolatility: number;
    healthBand: string;
  };
}

export class CDPOrchestrator {
  getIntelligenceReport(tenantId: string): CDPIntelligenceReport {
    const stats = cdpService.getStats(tenantId);
    const profiles = cdpService.getProfiles(tenantId);
    const segments = cdpService.getSegments(tenantId);
    const events = stats;
    const ltvBatch = cdpService.batchPredictLTV(tenantId);

    const ltvs = profiles.map(p => p.lifetimeValue).sort((a, b) => a - b);
    const ltvPercentiles = {
      p25: decisionEngine.percentileRank(ltvs, ltvs[Math.floor(ltvs.length * 0.25)] || 0),
      p50: ltvs.length > 0 ? ltvs[Math.floor(ltvs.length * 0.5)] : 0,
      p75: ltvs.length > 0 ? ltvs[Math.floor(ltvs.length * 0.75)] : 0,
      p95: ltvs.length > 0 ? ltvs[Math.floor(ltvs.length * 0.95)] : 0,
    };

    const segmentOverlap = this.computeSegmentOverlap(profiles, segments);
    const topTrait = stats.topTraits?.[0] || { trait: "none", count: 0 };

    const eventVolatility = events.totalEvents > 0
      ? Math.round(Math.min(100, (events.eventTypes / Math.max(events.totalEvents, 1)) * 1000))
      : 0;

    const eventHealthBand = decisionEngine.label(
      decisionEngine.band(100 - eventVolatility, { excellent: 90, good: 70, fair: 50, poor: 30 })
    );

    const growthPct = ltvBatch.summary.totalLTV > 0
      ? Math.round(((ltvBatch.summary.totalPredicted12Months - ltvBatch.summary.totalLTV) / ltvBatch.summary.totalLTV) * 10000) / 100
      : 0;

    return {
      profileIntelligence: {
        totalProfiles: stats.totalProfiles,
        activeProfiles: stats.activeProfiles,
        avgLTV: stats.avgLifetimeValue,
        ltvPercentiles,
        segmentCount: stats.totalSegments,
        topTraits: stats.topTraits || [],
      },
      segmentOverlap,
      lookalikeEffectiveness: {
        seedProfileCount: 0,
        candidateCount: 0,
        avgSimilarity: 0,
        highSimilarityCount: 0,
      },
      ltvSummary: {
        totalCurrentLTV: ltvBatch.summary.totalLTV,
        totalPredicted12Months: ltvBatch.summary.totalPredicted12Months,
        growthPct,
        atRiskCount: ltvBatch.summary.atRiskCount,
        highValueCount: ltvBatch.summary.highValueCount,
        avgConfidence: ltvBatch.predictions.length > 0
          ? Math.round(ltvBatch.predictions.reduce((s, p) => s + p.confidence, 0) / ltvBatch.predictions.length * 100) / 100
          : 0,
      },
      eventHealth: {
        totalEvents: events.totalEvents,
        uniqueTypes: events.eventTypes,
        topEventType: topTrait.trait,
        eventVolatility,
        healthBand: eventHealthBand,
      },
    };
  }

  getLookalikeEffectiveness(tenantId: string, seedProfileIds: string[]): {
    seedProfileCount: number;
    candidateCount: number;
    avgSimilarity: number;
    highSimilarityCount: number;
    candidateDistribution: { band: string; count: number }[];
  } {
    const result = cdpService.generateLookalike(tenantId, seedProfileIds);
    if (result.candidates.length === 0) {
      return { seedProfileCount: result.seedCount, candidateCount: 0, avgSimilarity: 0, highSimilarityCount: 0, candidateDistribution: [] };
    }

    const simValues = result.candidates.map(c => c.similarity);
    const avgSimilarity = Math.round(simValues.reduce((s, v) => s + v, 0) / simValues.length * 10000) / 10000;
    const highSimilarityCount = result.candidates.filter(c => c.similarity > 0.7).length;

    const bands = { excellent: 0, good: 0, fair: 0, poor: 0, critical: 0 };
    for (const c of result.candidates) {
      const b = decisionEngine.band(c.similarity * 100, { excellent: 80, good: 60, fair: 40, poor: 20 });
      bands[b]++;
    }
    const candidateDistribution = Object.entries(bands)
      .filter(([_, count]) => count > 0)
      .map(([band, count]) => ({ band, count }));

    return {
      seedProfileCount: result.seedCount,
      candidateCount: result.candidates.length,
      avgSimilarity,
      highSimilarityCount,
      candidateDistribution,
    };
  }

  private computeSegmentOverlap(profiles: any[], segments: any[]): { segmentA: string; segmentB: string; overlapCount: number; overlapPct: number }[] {
    const overlaps: { segmentA: string; segmentB: string; overlapCount: number; overlapPct: number }[] = [];
    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        const sa = segments[i];
        const sb = segments[j];
        const inBoth = profiles.filter((p: any) =>
          p.segments?.includes(sa.name) && p.segments?.includes(sb.name)
        ).length;
        const union = profiles.filter((p: any) =>
          p.segments?.includes(sa.name) || p.segments?.includes(sb.name)
        ).length;
        if (union > 0) {
          overlaps.push({
            segmentA: sa.name, segmentB: sb.name,
            overlapCount: inBoth,
            overlapPct: Math.round((inBoth / union) * 10000) / 100,
          });
        }
      }
    }
    return overlaps.sort((a, b) => b.overlapPct - a.overlapPct);
  }
}

export const cdpOrchestrator = new CDPOrchestrator();
