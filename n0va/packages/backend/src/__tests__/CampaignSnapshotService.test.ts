import { describe, it, expect, beforeAll } from "vitest";
import { campaignSnapshotService } from "../services/CampaignSnapshotService";
import { DataStore } from "../services/DataStore";

const TEST_TENANT = "test_ss_tenant";
const TEST_CAMPAIGN = "test_ss_camp";
let snapshotId1 = "";
let snapshotId2 = "";

beforeAll(async () => {
  DataStore.mem().insert("campaigns", {
    _id: TEST_CAMPAIGN, name: "Snapshot Test", tenantId: TEST_TENANT, status: "active",
    budget: { daily: 500, lifetime: 15000, spent: 8000, remaining: 7000, currency: "USD" },
    platforms: ["google", "meta"],
  });
  DataStore.mem().insert("campaigns", {
    _id: "ss_camp_2", name: "Snapshot Camp 2", tenantId: TEST_TENANT, status: "active",
    budget: { daily: 300, lifetime: 10000, spent: 4000, remaining: 6000, currency: "USD" },
    platforms: ["meta"],
  });
  for (let j = 0; j < 10; j++) {
    DataStore.mem().insert("metrics", {
      campaignId: TEST_CAMPAIGN, date: new Date(2025, 0, j + 1).toISOString(),
      impressions: 8000 + j * 300, clicks: 350 + j * 15,
      conversions: 18 + j * 2, spend: 600 + j * 30, revenue: 2000 + j * 150,
    });
  }
  const s1 = await campaignSnapshotService.captureSnapshot(TEST_TENANT, TEST_CAMPAIGN, "Baseline", "First snapshot");
  snapshotId1 = s1._id;
  const s2 = await campaignSnapshotService.captureSnapshot(TEST_TENANT, TEST_CAMPAIGN, "Week 2", "Follow-up snapshot");
  snapshotId2 = s2._id;
  await campaignSnapshotService.captureSnapshot(TEST_TENANT, "ss_camp_2", "Camp 2 Baseline");
});

describe("CampaignSnapshotService - captureSnapshot", () => {
  it("captures snapshot with aggregated metrics", () => {
    expect(snapshotId1).toBeTruthy();
    const snap = DataStore.mem().findOne("campaign_snapshots", (s: any) => s._id === snapshotId1);
    expect(snap).not.toBeNull();
    expect(snap.campaignId).toBe(TEST_CAMPAIGN);
    expect(snap.metrics).toHaveProperty("totalImpressions");
    expect(snap.metrics).toHaveProperty("totalClicks");
    expect(snap.metrics).toHaveProperty("totalConversions");
    expect(snap.metrics).toHaveProperty("totalSpend");
    expect(snap.metrics).toHaveProperty("totalRevenue");
    expect(snap.metrics).toHaveProperty("avgCtr");
    expect(snap.metrics).toHaveProperty("avgRoas");
    expect(snap.name).toBe("Baseline");
  });
});

describe("CampaignSnapshotService - compareSnapshots", () => {
  it("compares two snapshots with diff", async () => {
    const r = await campaignSnapshotService.compareSnapshots(snapshotId1, snapshotId2, TEST_TENANT);
    expect(r).toHaveProperty("snapshot1");
    expect(r).toHaveProperty("snapshot2");
    expect(r).toHaveProperty("diff");
    expect(r.diff).toHaveProperty("totalImpressions");
    expect(r.diff.totalImpressions).toHaveProperty("before");
    expect(r.diff.totalImpressions).toHaveProperty("after");
    expect(r.diff.totalImpressions).toHaveProperty("change");
    expect(r).toHaveProperty("summary");
  });
});

describe("CampaignSnapshotService - getSnapshotTimeline", () => {
  it("returns timeline sorted newest first", async () => {
    const r = await campaignSnapshotService.getSnapshotTimeline(TEST_TENANT, TEST_CAMPAIGN);
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBe(2);
    expect(r[0].capturedAt >= r[1].capturedAt).toBe(true);
  });
});

describe("CampaignSnapshotService - snapshotPerformanceTrend", () => {
  it("returns trend across snapshots", async () => {
    const r = await campaignSnapshotService.snapshotPerformanceTrend(TEST_TENANT, TEST_CAMPAIGN);
    expect(r).not.toBeNull();
    expect(r!.campaignId).toBe(TEST_CAMPAIGN);
    expect(Array.isArray(r!.snapshots)).toBe(true);
    expect(r!.snapshots.length).toBe(2);
    for (const e of r!.snapshots) {
      expect(e).toHaveProperty("snapshotId");
      expect(e).toHaveProperty("compositeScore");
      expect(e).toHaveProperty("metrics");
    }
    expect(["improving", "declining", "stable"]).toContain(r!.direction);
  });

  it("returns null for unknown campaign", async () => {
    const r = await campaignSnapshotService.snapshotPerformanceTrend(TEST_TENANT, "nonexistent");
    expect(r).toBeNull();
  });
});

describe("CampaignSnapshotService - snapshotAnomalyDetection", () => {
  it("detects anomalies across snapshots", async () => {
    const r = await campaignSnapshotService.snapshotAnomalyDetection(TEST_TENANT, TEST_CAMPAIGN);
    expect(r).toHaveProperty("anomalies");
    expect(Array.isArray(r.anomalies)).toBe(true);
    expect(r).toHaveProperty("summary");
    expect(r.summary).toHaveProperty("total");
    expect(r.summary).toHaveProperty("high");
    expect(r.summary).toHaveProperty("medium");
    expect(r.summary).toHaveProperty("low");
  });
});

describe("CampaignSnapshotService - snapshotForecast", () => {
  it("returns forecasts for snapshot metrics", async () => {
    const r = await campaignSnapshotService.snapshotForecast(TEST_TENANT, TEST_CAMPAIGN);
    expect(r).not.toBeNull();
    expect(r!.campaignId).toBe(TEST_CAMPAIGN);
    expect(Array.isArray(r!.forecasts)).toBe(true);
    expect(r!.forecasts.length).toBeGreaterThan(0);
    for (const f of r!.forecasts) {
      expect(f).toHaveProperty("metric");
      expect(f).toHaveProperty("currentValue");
      expect(f).toHaveProperty("forecastedValue");
      expect(f).toHaveProperty("confidence");
      expect(f).toHaveProperty("direction");
      expect(["up", "down", "stable"]).toContain(f.direction);
    }
    expect(["positive", "negative", "neutral"]).toContain(r!.overallOutlook);
  });

  it("returns null for unknown campaign", async () => {
    const r = await campaignSnapshotService.snapshotForecast(TEST_TENANT, "nonexistent");
    expect(r).toBeNull();
  });
});

describe("CampaignSnapshotService - snapshotHealthScore", () => {
  it("returns health score from latest snapshot", async () => {
    const r = await campaignSnapshotService.snapshotHealthScore(TEST_TENANT, TEST_CAMPAIGN);
    expect(r).not.toBeNull();
    expect(r!.campaignId).toBe(TEST_CAMPAIGN);
    expect(r!.healthScore).toBeGreaterThanOrEqual(0);
    expect(r!.healthScore).toBeLessThanOrEqual(100);
    expect(Array.isArray(r!.dimensions)).toBe(true);
    expect(r!.dimensions.length).toBe(5);
    for (const d of r!.dimensions) {
      expect(d).toHaveProperty("name");
      expect(d).toHaveProperty("score");
      expect(d).toHaveProperty("weight");
    }
    expect(Array.isArray(r!.topIssues)).toBe(true);
    expect(["excellent", "good", "fair", "poor", "critical"]).toContain(r!.rating);
  });

  it("returns null for unknown campaign", async () => {
    const r = await campaignSnapshotService.snapshotHealthScore(TEST_TENANT, "nonexistent");
    expect(r).toBeNull();
  });
});

describe("CampaignSnapshotService - snapshotMetricBreakdown", () => {
  it("returns metric breakdown with benchmarks", async () => {
    const r = await campaignSnapshotService.snapshotMetricBreakdown(TEST_TENANT, snapshotId1);
    expect(r).not.toBeNull();
    expect(r!.snapshotId).toBe(snapshotId1);
    expect(Array.isArray(r!.metrics)).toBe(true);
    expect(r!.metrics.length).toBeGreaterThan(0);
    for (const m of r!.metrics) {
      expect(m).toHaveProperty("metric");
      expect(m).toHaveProperty("value");
      expect(m).toHaveProperty("benchmark");
      expect(m).toHaveProperty("percentile");
      expect(m).toHaveProperty("status");
      expect(["good", "warning", "critical"]).toContain(m.status);
    }
    expect(r!.overallHealth).toBeGreaterThanOrEqual(0);
  });

  it("returns null for unknown snapshot", async () => {
    const r = await campaignSnapshotService.snapshotMetricBreakdown(TEST_TENANT, "nonexistent");
    expect(r).toBeNull();
  });
});

describe("CampaignSnapshotService - snapshotChangeSummary", () => {
  it("returns change summary between two snapshots", async () => {
    const r = await campaignSnapshotService.snapshotChangeSummary(TEST_TENANT, snapshotId1, snapshotId2);
    expect(r).not.toBeNull();
    expect(r!.snapshot1.id).toBe(snapshotId1);
    expect(r!.snapshot2.id).toBe(snapshotId2);
    expect(Array.isArray(r!.changes)).toBe(true);
    expect(r!.changes.length).toBeGreaterThan(0);
    for (const c of r!.changes) {
      expect(c).toHaveProperty("metric");
      expect(c).toHaveProperty("before");
      expect(c).toHaveProperty("after");
      expect(c).toHaveProperty("direction");
      expect(["improved", "declined", "stable"]).toContain(c.direction);
    }
    expect(typeof r!.overallVerdict).toBe("string");
  });

  it("returns null for unknown snapshot pair", async () => {
    const r = await campaignSnapshotService.snapshotChangeSummary(TEST_TENANT, "nonexistent", snapshotId2);
    expect(r).toBeNull();
  });
});

describe("CampaignSnapshotService - snapshotBenchmark", () => {
  it("returns benchmark against industry", async () => {
    const r = await campaignSnapshotService.snapshotBenchmark(TEST_TENANT, snapshotId1);
    expect(r).not.toBeNull();
    expect(r!.snapshotId).toBe(snapshotId1);
    expect(Array.isArray(r!.benchmarks)).toBe(true);
    expect(r!.benchmarks.length).toBeGreaterThan(0);
    for (const b of r!.benchmarks) {
      expect(b).toHaveProperty("metric");
      expect(b).toHaveProperty("value");
      expect(b).toHaveProperty("benchmark");
      expect(b).toHaveProperty("verdict");
      expect(["above", "at", "below"]).toContain(b.verdict);
    }
    expect(["above", "at", "below"]).toContain(r!.overallVerdict);
    expect(typeof r!.recommendation).toBe("string");
  });

  it("returns null for unknown snapshot", async () => {
    const r = await campaignSnapshotService.snapshotBenchmark(TEST_TENANT, "nonexistent");
    expect(r).toBeNull();
  });
});

describe("CampaignSnapshotService - snapshotRegressionReport", () => {
  it("returns regressions and improvements between snapshots", async () => {
    const r = await campaignSnapshotService.snapshotRegressionReport(TEST_TENANT, snapshotId1, snapshotId2);
    expect(r).not.toBeNull();
    expect(r!.snapshot1.id).toBe(snapshotId1);
    expect(r!.snapshot2.id).toBe(snapshotId2);
    expect(Array.isArray(r!.regressions)).toBe(true);
    expect(Array.isArray(r!.improvements)).toBe(true);
    for (const reg of r!.regressions) {
      expect(reg).toHaveProperty("metric");
      expect(reg).toHaveProperty("declinePercent");
      expect(reg).toHaveProperty("severity");
      expect(["minor", "moderate", "severe"]).toContain(reg.severity);
    }
    expect(typeof r!.summary).toBe("string");
  });

  it("returns null for unknown snapshot pair", async () => {
    const r = await campaignSnapshotService.snapshotRegressionReport(TEST_TENANT, "nonexistent", snapshotId2);
    expect(r).toBeNull();
  });
});

describe("CampaignSnapshotService - snapshotExport", () => {
  it("returns structured export of snapshot data", async () => {
    const r = await campaignSnapshotService.snapshotExport(TEST_TENANT, snapshotId1);
    expect(r).not.toBeNull();
    expect(r!.snapshotId).toBe(snapshotId1);
    expect(r!.campaignId).toBe(TEST_CAMPAIGN);
    expect(Array.isArray(r!.sections)).toBe(true);
    expect(r!.sections.length).toBeGreaterThan(0);
    for (const s of r!.sections) {
      expect(s).toHaveProperty("heading");
      expect(s).toHaveProperty("content");
    }
    expect(r!.generatedAt).toBeTruthy();
  });

  it("returns null for unknown snapshot", async () => {
    const r = await campaignSnapshotService.snapshotExport(TEST_TENANT, "nonexistent");
    expect(r).toBeNull();
  });
});
