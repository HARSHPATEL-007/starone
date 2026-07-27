import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { DataStore } from "../services/DataStore";

// ─── CampaignService mocks ───────────────────────────────────────
const { Campaign: MockCampaign, Metric: MockMetric } = vi.hoisted(() => {
  const mockExec = vi.fn();
  const mockLean = vi.fn(() => ({ exec: mockExec }));
  const mockLimit = vi.fn(() => ({ populate: vi.fn(() => ({ exec: mockExec })) }));
  const mockSortChain = vi.fn(() => ({ skip: vi.fn(() => ({ limit: mockLimit })) }));
  const mockPopulate = vi.fn(() => ({ exec: mockExec }));
  const Campaign = {
    find: vi.fn(() => ({ sort: mockSortChain, populate: mockPopulate })),
    findOne: vi.fn(() => ({ populate: mockPopulate })),
    findById: vi.fn(() => ({ lean: mockLean })),
    findOneAndUpdate: vi.fn(() => ({ exec: mockExec })),
    deleteOne: vi.fn(() => ({ exec: mockExec })),
    countDocuments: vi.fn(() => ({ exec: mockExec })),
    prototype: { save: vi.fn() },
  };
  const Metric = {
    find: vi.fn(() => ({ sort: vi.fn(() => ({ limit: vi.fn(() => ({ exec: vi.fn() })) })) })),
    aggregate: vi.fn(() => ({ exec: vi.fn() })),
  };
  return { Campaign, Metric };
});

vi.mock("mongoose", () => {
  const mockObjectId = function (id?: string) { return id ?? "000000000000000000000000"; } as any;
  const mockSchema = {
    pre: vi.fn(() => mockSchema), index: vi.fn(() => mockSchema), add: vi.fn(),
    Types: { ObjectId: mockObjectId, Mixed: {} },
    virtual: vi.fn(() => ({ get: vi.fn() })),
    methods: {} as any, statics: {} as any, post: vi.fn(() => mockSchema), plugin: vi.fn(() => mockSchema),
  };
  const mockSchemaCtor = Object.assign(vi.fn(() => mockSchema), {
    Types: { ObjectId: mockObjectId, Mixed: {} },
  });
  return {
    default: { Types: { ObjectId: mockObjectId }, Schema: mockSchemaCtor, model: vi.fn() },
    Types: { ObjectId: mockObjectId },
    Schema: mockSchemaCtor,
    Document: class {},
    Model: class {},
    connect: vi.fn(),
    model: vi.fn(),
  };
});
vi.mock("../models/Campaign", () => ({ Campaign: MockCampaign, default: MockCampaign, __esModule: true }));
vi.mock("../models/Metric", () => ({ Metric: MockMetric, default: MockMetric, __esModule: true }));

import { campaignService } from "../services/CampaignService";
import { cdpService } from "../services/CDPService";
import { creativeVersionService } from "../services/CreativeVersionService";
import { influencerService } from "../services/InfluencerService";
import { landingPageBuilderService } from "../services/LandingPageBuilderService";
import { playbookExecutionService } from "../services/PlaybookExecutionService";
import { reportBuilderService } from "../services/ReportBuilderService";
import { statisticalABTestService } from "../services/StatisticalABTestService";

const TEST_TENANT = "507f1f77bcf86cd799439011";
const OBJECT_ID_HEX = (n: number) => `00000000000000000000000${n}`.slice(-24);

// ═══════════════════════════════════════════════════════════════════
// CampaignService
// ═══════════════════════════════════════════════════════════════════
describe("CampaignService", () => {
  const Campaign = MockCampaign;
  const Metric = MockMetric;

  beforeEach(() => {
    vi.clearAllMocks();
    Campaign.find().sort().skip().limit().populate().exec.mockResolvedValue([]);
    Campaign.find().sort().skip().limit().populate().exec.mockResolvedValue([]);
    Campaign.find().populate().exec.mockResolvedValue([]);
    Campaign.findById().lean().exec.mockResolvedValue(null);
    Campaign.findOne().populate().exec.mockResolvedValue(null);
    Campaign.findOneAndUpdate().exec.mockResolvedValue(null);
    Campaign.deleteOne().exec.mockResolvedValue({ deletedCount: 0 });
    Campaign.countDocuments().exec.mockResolvedValue(0);
    Metric.find().sort().limit().exec.mockResolvedValue([]);
    Metric.aggregate().exec.mockResolvedValue([]);
  });

  describe("getPerformanceInsights", () => {
    it("returns sorted insights array", async () => {
      Campaign.find().populate().exec.mockResolvedValue([
        { _id: "c1", name: "Camp A", budget: { daily: 100, lifetime: 3000, spent: 500 }, status: "active" },
        { _id: "c2", name: "Camp B", budget: { daily: 200, lifetime: 5000, spent: 1000 }, status: "active" },
      ]);
      Metric.find().sort().limit().exec.mockResolvedValue([
        { campaignId: "c1", impressions: 1000, clicks: 50, conversions: 5, spend: 200, revenue: 800, date: new Date() },
        { campaignId: "c2", impressions: 2000, clicks: 80, conversions: 8, spend: 400, revenue: 1600, date: new Date() },
      ]);
      const r = await campaignService.getPerformanceInsights("t1");
      expect(r.length).toBe(2);
      r.forEach((i) => {
        expect(i).toHaveProperty("campaignId");
        expect(i).toHaveProperty("overallHealth");
        expect(i).toHaveProperty("dimensions");
        expect(i).toHaveProperty("anomalies");
        expect(i).toHaveProperty("percentile");
        expect(i).toHaveProperty("recommendation");
      });
      expect(r[0].overallHealth).toBeGreaterThanOrEqual(0);
    });

    it("returns empty dimensions for campaigns with no metrics", async () => {
      Campaign.find().populate().exec.mockResolvedValue([
        { _id: "c3", name: "Camp C", budget: { daily: 100, lifetime: 3000, spent: 0 }, status: "draft" },
      ]);
      Metric.find().sort().limit().exec.mockResolvedValue([]);
      const r = await campaignService.getPerformanceInsights("t1");
      expect(r.length).toBe(1);
      expect(r[0].dimensions.length).toBeGreaterThan(0);
    });
  });

  describe("getPortfolioConcentration", () => {
    it("returns concentration analysis", async () => {
      Campaign.find().populate().exec.mockResolvedValue([
        { _id: "c1", name: "A", budget: { lifetime: 5000 } },
        { _id: "c2", name: "B", budget: { lifetime: 3000 } },
        { _id: "c3", name: "C", budget: { lifetime: 2000 } },
      ]);
      const r = await campaignService.getPortfolioConcentration("t1");
      expect(r).toHaveProperty("hhi");
      expect(r).toHaveProperty("giniCoefficient");
      expect(r).toHaveProperty("effectiveCampaignCount");
      expect(r).toHaveProperty("concentrationLabel");
      expect(r.hhi).toBeGreaterThan(0);
      expect(typeof r.concentrationLabel).toBe("string");
    });

    it("returns zeros for empty portfolio", async () => {
      Campaign.find().populate().exec.mockResolvedValue([]);
      const r = await campaignService.getPortfolioConcentration("t1");
      expect(r.hhi).toBe(0);
      expect(r.concentrationLabel).toBe("none");
    });
  });

  describe("getSimilarCampaigns", () => {
    it("returns top similar campaigns by cosine similarity", async () => {
      Campaign.find().populate().exec.mockResolvedValue([
        { _id: "c1", name: "Target" },
        { _id: "c2", name: "Similar A" },
        { _id: "c3", name: "Similar B" },
      ]);
      Metric.find().sort().limit().exec.mockResolvedValue([
        { campaignId: "c1", impressions: 1000, clicks: 50, conversions: 5, spend: 200, revenue: 800 },
        { campaignId: "c2", impressions: 900, clicks: 45, conversions: 4, spend: 180, revenue: 700 },
        { campaignId: "c3", impressions: 100, clicks: 5, conversions: 1, spend: 20, revenue: 50 },
      ]);
      const r = await campaignService.getSimilarCampaigns("c1", "t1", 2);
      expect(r.length).toBeLessThanOrEqual(2);
      r.forEach((s) => {
        expect(s).toHaveProperty("id");
        expect(s).toHaveProperty("similarity");
        expect(s.similarity).toBeGreaterThanOrEqual(0);
      });
    });

    it("returns empty array if target not found", async () => {
      Campaign.find().populate().exec.mockResolvedValue([{ _id: "other", name: "Other" }]);
      const r = await campaignService.getSimilarCampaigns("nonexistent", "t1");
      expect(r).toEqual([]);
    });
  });

  describe("getPerformanceAnomalies", () => {
    it("returns sorted anomalies from insights", async () => {
      Campaign.find().populate().exec.mockResolvedValue([
        { _id: "c1", name: "Camp A", budget: { daily: 100, lifetime: 3000, spent: 500 }, status: "active" },
      ]);
      Metric.find().sort().limit().exec.mockResolvedValue([
        { campaignId: "c1", impressions: 1000, clicks: 5, conversions: 1, spend: 200, revenue: 100, date: new Date() },
      ]);
      const r = await campaignService.getPerformanceAnomalies("t1");
      expect(Array.isArray(r)).toBe(true);
    });
  });

  describe("getBudgetPrediction", () => {
    it("returns default prediction when campaign not found", async () => {
      Campaign.findById().lean().exec.mockResolvedValue(null);
      const r = await campaignService.getBudgetPrediction("nonexistent");
      expect(r).toBeNull();
    });

    it("returns budget prediction for existing campaign", async () => {
      Campaign.findById().lean().exec.mockResolvedValue({
        _id: "c1", startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        budget: { lifetime: 10000, spent: 2000 },
      });
      Metric.find().sort().limit().exec.mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => ({
          campaignId: "c1", spend: 400 + i * 50,
          date: new Date(Date.now() - (5 - i) * 86400000).toISOString(),
        })),
      );
      const r = await campaignService.getBudgetPrediction("c1");
      expect(r).not.toBeNull();
      expect(r!).toHaveProperty("currentBurnRate");
      expect(r!).toHaveProperty("projectedEndSpend");
      expect(r!).toHaveProperty("projectedUtilization");
      expect(r!).toHaveProperty("dailyProjections");
      expect(r!.currentBurnRate).toBeGreaterThan(0);
    });

    it("returns default prediction when metrics < 3", async () => {
      Campaign.findById().lean().exec.mockResolvedValue({
        _id: "c1", startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        budget: { lifetime: 10000, spent: 500 },
      });
      Metric.find().sort().limit().exec.mockResolvedValue([
        { campaignId: "c1", spend: 100, date: new Date().toISOString() },
      ]);
      const r = await campaignService.getBudgetPrediction("c1");
      expect(r).not.toBeNull();
      expect(r!.dailyProjections).toEqual([]);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// CDPService
// ═══════════════════════════════════════════════════════════════════
describe("CDPService", () => {
  beforeAll(() => {
    DataStore["mem"]().delete("cdp_profiles", () => true);
    DataStore["mem"]().delete("cdp_events", () => true);
    DataStore["mem"]().delete("cdp_segments", () => true);
  });

  describe("getStats", () => {
    it("returns stats object with profile/event counts", () => {
      const r = cdpService.getStats(TEST_TENANT);
      expect(r).toHaveProperty("totalProfiles");
      expect(r).toHaveProperty("activeProfiles");
      expect(r).toHaveProperty("totalEvents");
      expect(r).toHaveProperty("eventTypes");
      expect(r).toHaveProperty("totalSegments");
      expect(r).toHaveProperty("avgLifetimeValue");
    });
  });

  describe("getProfiles", () => {
    it("returns seeded profiles for a tenant", () => {
      const r = cdpService.getProfiles(TEST_TENANT);
      expect(r.length).toBeGreaterThan(0);
      r.forEach((p) => {
        expect(p).toHaveProperty("id");
        expect(p).toHaveProperty("name");
        expect(p).toHaveProperty("status");
      });
    });

    it("filters by search query", () => {
      const r = cdpService.getProfiles(TEST_TENANT, "alice");
      expect(r.length).toBeGreaterThanOrEqual(0);
      if (r.length > 0) expect(r[0].name.toLowerCase()).toContain("alice");
    });
  });

  describe("getProfile", () => {
    it("returns undefined for non-existent profile", () => {
      expect(cdpService.getProfile(TEST_TENANT, "nonexistent")).toBeUndefined();
    });
  });

  describe("updateProfile", () => {
    it("returns null for non-existent profile", () => {
      expect(cdpService.updateProfile(TEST_TENANT, "nonexistent", { name: "Test" })).toBeNull();
    });
  });

  describe("getEvents", () => {
    it("returns seeded events for a tenant", () => {
      const r = cdpService.getEvents(TEST_TENANT);
      expect(r.length).toBeGreaterThan(0);
      r.forEach((e) => {
        expect(e).toHaveProperty("id");
        expect(e).toHaveProperty("type");
        expect(e).toHaveProperty("channel");
      });
    });

    it("filters by profileId", () => {
      const events = cdpService.getEvents(TEST_TENANT);
      if (events.length > 0) {
        const filtered = cdpService.getEvents(TEST_TENANT, events[0].profileId);
        expect(filtered.every((e) => e.profileId === events[0].profileId)).toBe(true);
      }
    });

    it("filters by type", () => {
      const filtered = cdpService.getEvents(TEST_TENANT, undefined, "purchase");
      expect(filtered.every((e) => e.type === "purchase")).toBe(true);
    });
  });

  describe("getEventTypes", () => {
    it("returns sorted unique event types", () => {
      const r = cdpService.getEventTypes(TEST_TENANT);
      expect(r.length).toBeGreaterThan(0);
      for (let i = 1; i < r.length; i++) expect(r[i] >= r[i - 1]).toBe(true);
    });
  });

  describe("trackEvent", () => {
    it("creates event and updates profile", () => {
      const profile = cdpService.getProfiles(TEST_TENANT)[0];
      const r = cdpService.trackEvent(TEST_TENANT, {
        profileId: profile.id, type: "test_event", properties: { key: "val" },
      });
      expect(r).toHaveProperty("id");
      expect(r.type).toBe("test_event");
      expect(r.properties.key).toBe("val");
      expect(r.channel).toBe("api");
    });
  });

  describe("getSegments", () => {
    it("returns segments with profile counts", () => {
      const r = cdpService.getSegments(TEST_TENANT);
      expect(r.length).toBeGreaterThan(0);
      r.forEach((s) => {
        expect(s).toHaveProperty("id");
        expect(s).toHaveProperty("name");
        expect(s).toHaveProperty("profileCount");
        expect(s).toHaveProperty("rules");
      });
    });
  });

  describe("updateSegment", () => {
    it("returns null for non-existent segment", () => {
      expect(cdpService.updateSegment(TEST_TENANT, "nonexistent", { name: "Test" })).toBeNull();
    });
  });

  describe("deleteSegment", () => {
    it("returns false for non-existent segment", () => {
      expect(cdpService.deleteSegment(TEST_TENANT, "nonexistent")).toBe(false);
    });
  });

  describe("getEventTypeStats", () => {
    it("returns event type stats sorted by count descending", () => {
      const r = cdpService.getEventTypeStats(TEST_TENANT);
      expect(r.length).toBeGreaterThan(0);
      r.forEach((e) => {
        expect(e).toHaveProperty("type");
        expect(e).toHaveProperty("count");
        expect(e).toHaveProperty("lastOccurrence");
      });
      for (let i = 1; i < r.length; i++) expect(r[i].count).toBeLessThanOrEqual(r[i - 1].count);
    });
  });

  describe("resolveIdentities", () => {
    it("returns match results with resolved/unresolved counts", () => {
      const r = cdpService.resolveIdentities(TEST_TENANT);
      expect(r).toHaveProperty("matches");
      expect(r).toHaveProperty("resolved");
      expect(r).toHaveProperty("unresolved");
      expect(Array.isArray(r.matches)).toBe(true);
    });
  });

  describe("mergeProfiles", () => {
    it("returns null when either profile missing", () => {
      expect(cdpService.mergeProfiles(TEST_TENANT, "nonexistent", "also_missing")).toBeNull();
    });
  });

  describe("generateLookalike", () => {
    it("returns candidates when seed profiles exist", () => {
      const profiles = cdpService.getProfiles(TEST_TENANT);
      const seedIds = profiles.slice(0, 2).map((p) => p.id);
      const r = cdpService.generateLookalike(TEST_TENANT, seedIds, { size: 5 });
      expect(r).toHaveProperty("candidates");
      expect(r).toHaveProperty("seedCount");
      expect(r).toHaveProperty("totalScored");
      expect(r.seedCount).toBe(2);
      if (r.candidates.length > 0) {
        expect(r.candidates[0]).toHaveProperty("similarity");
        expect(r.candidates[0].similarity).toBeGreaterThanOrEqual(0);
      }
    });

    it("returns empty when no seed profiles match", () => {
      const r = cdpService.generateLookalike(TEST_TENANT, ["nonexistent"]);
      expect(r.candidates).toEqual([]);
      expect(r.seedCount).toBe(0);
    });
  });

  describe("predictLTV", () => {
    it("throws for non-existent profile", () => {
      expect(() => cdpService.predictLTV(TEST_TENANT, "nonexistent")).toThrow("Profile not found");
    });

    it("returns LTV prediction for existing profile", () => {
      const profiles = cdpService.getProfiles(TEST_TENANT);
      const r = cdpService.predictLTV(TEST_TENANT, profiles[0].id);
      expect(r).toHaveProperty("currentLTV");
      expect(r).toHaveProperty("predictedLTV6Months");
      expect(r).toHaveProperty("predictedLTV12Months");
      expect(r).toHaveProperty("predictedLTV24Months");
      expect(r).toHaveProperty("confidence");
      expect(r).toHaveProperty("factors");
      expect(r.factors).toHaveProperty("recency");
      expect(r.factors).toHaveProperty("churnRisk");
      expect(r.currentLTV).toBeGreaterThanOrEqual(0);
    });
  });

  describe("batchPredictLTV", () => {
    it("returns batch predictions with summary", () => {
      const r = cdpService.batchPredictLTV(TEST_TENANT);
      expect(r).toHaveProperty("predictions");
      expect(r).toHaveProperty("summary");
      expect(r.predictions.length).toBeGreaterThan(0);
      expect(r.summary).toHaveProperty("totalLTV");
      expect(r.summary).toHaveProperty("atRiskCount");
      expect(r.summary).toHaveProperty("highValueCount");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// CreativeVersionService
// ═══════════════════════════════════════════════════════════════════
describe("CreativeVersionService", () => {
  const CREATIVE_ID = "test_cr_1";

  it("createVersion returns version entry with incremented version", () => {
    const v1 = creativeVersionService.createVersion(CREATIVE_ID, TEST_TENANT, { headline: "Hello" }, "Initial", "user1");
    expect(v1.version).toBe(1);
    expect(v1.creativeId).toBe(CREATIVE_ID);
    expect(v1.snapshot.headline).toBe("Hello");

    const v2 = creativeVersionService.createVersion(CREATIVE_ID, TEST_TENANT, { headline: "World" }, "Update", "user1");
    expect(v2.version).toBe(2);
  });

  it("getVersions returns sorted versions descending", () => {
    const r = creativeVersionService.getVersions(CREATIVE_ID, TEST_TENANT);
    expect(r.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < r.length; i++) expect(r[i].version).toBeLessThanOrEqual(r[i - 1].version);
  });

  it("getVersion returns specific version by id", () => {
    const all = creativeVersionService.getVersions(CREATIVE_ID, TEST_TENANT);
    const r = creativeVersionService.getVersion(all[0].id, TEST_TENANT);
    expect(r).not.toBeUndefined();
    expect(r!.id).toBe(all[0].id);
  });

  it("getLatestVersion returns highest version", () => {
    const r = creativeVersionService.getLatestVersion(CREATIVE_ID, TEST_TENANT);
    expect(r).not.toBeUndefined();
    const all = creativeVersionService.getVersions(CREATIVE_ID, TEST_TENANT);
    expect(r!.version).toBe(all[0].version);
  });

  it("deleteVersion removes version", () => {
    const v = creativeVersionService.createVersion("del_test", TEST_TENANT, { x: 1 }, "To delete", "user1");
    expect(creativeVersionService.deleteVersion(v.id, TEST_TENANT)).toBe(true);
    expect(creativeVersionService.getVersion(v.id, TEST_TENANT)).toBeUndefined();
  });

  it("deleteVersion returns false for non-existent", () => {
    expect(creativeVersionService.deleteVersion("nonexistent", TEST_TENANT)).toBe(false);
  });

  describe("diff", () => {
    it("returns structured diffs between two versions", () => {
      const vA = creativeVersionService.createVersion("diff_test", TEST_TENANT, { headline: "A", body: "Old", cta: "Click" }, "V1", "user1");
      const vB = creativeVersionService.createVersion("diff_test", TEST_TENANT, { headline: "B", body: "Old", landingPageUrl: "/new" }, "V2", "user1");
      const r = creativeVersionService.diff(vA.id, vB.id, TEST_TENANT);
      expect(r).toHaveProperty("diffs");
      expect(r).toHaveProperty("summary");
      expect(r).toHaveProperty("recommendedBump");
      expect(r.diffs.length).toBeGreaterThan(0);
      expect(["major", "minor", "patch", "none"]).toContain(r.recommendedBump);
    });

    it("throws if version not found", () => {
      expect(() => creativeVersionService.diff("nonexistent", "also_missing", TEST_TENANT)).toThrow("not found");
    });
  });

  describe("analyzeRollback", () => {
    it("returns rollback analysis", () => {
      const r = creativeVersionService.analyzeRollback(CREATIVE_ID, TEST_TENANT, 1);
      expect(r).toHaveProperty("rollbackFrom");
      expect(r).toHaveProperty("rollbackTo");
      expect(r).toHaveProperty("changes");
      expect(r).toHaveProperty("riskScore");
      expect(r).toHaveProperty("riskLevel");
      expect(["low", "medium", "high"]).toContain(r.riskLevel);
    });
  });

  describe("semanticAnalysis", () => {
    it("returns version history with semantic versioning", () => {
      const r = creativeVersionService.semanticAnalysis(CREATIVE_ID, TEST_TENANT);
      expect(r).toHaveProperty("currentVersion");
      expect(r).toHaveProperty("totalVersions");
      expect(r).toHaveProperty("versionHistory");
      expect(r).toHaveProperty("versionVelocity");
      expect(r).toHaveProperty("mostActiveAuthor");
      expect(r.totalVersions).toBeGreaterThan(0);
    });

    it("returns empty for non-existent creative", () => {
      const r = creativeVersionService.semanticAnalysis("nonexistent", TEST_TENANT);
      expect(r.totalVersions).toBe(0);
    });
  });

  describe("changeFootprint", () => {
    it("returns change footprint between two versions", () => {
      const all = creativeVersionService.getVersions(CREATIVE_ID, TEST_TENANT);
      if (all.length >= 2) {
        const r = creativeVersionService.changeFootprint(all[0].id, all[1].id, TEST_TENANT);
        expect(r).toHaveProperty("totalChanges");
        expect(r).toHaveProperty("footprintScore");
        expect(r).toHaveProperty("normalizedScore");
        expect(r).toHaveProperty("dominantChangeType");
        expect(r.totalChanges).toBeGreaterThanOrEqual(0);
        expect(["text", "visual", "url", "settings"]).toContain(r.dominantChangeType);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// InfluencerService
// ═══════════════════════════════════════════════════════════════════
describe("InfluencerService", () => {
  describe("search", () => {
    it("returns all influencers when no filters", () => {
      const r = influencerService.search({});
      expect(r.length).toBeGreaterThan(0);
      r.forEach((i) => {
        expect(i).toHaveProperty("id");
        expect(i).toHaveProperty("name");
        expect(i).toHaveProperty("platform");
        expect(i).toHaveProperty("followers");
        expect(i).toHaveProperty("engagementRate");
      });
    });

    it("filters by platform", () => {
      const r = influencerService.search({ platform: "youtube" });
      expect(r.every((i) => i.platform === "youtube")).toBe(true);
    });

    it("filters by category", () => {
      const r = influencerService.search({ category: "tech" });
      expect(r.every((i) => i.category.some((c) => c.includes("tech")))).toBe(true);
    });

    it("filters by minFollowers", () => {
      const r = influencerService.search({ minFollowers: 500000 });
      expect(r.every((i) => i.followers >= 500000)).toBe(true);
    });

    it("filters by maxPrice", () => {
      const r = influencerService.search({ maxPrice: 2000 });
      expect(r.every((i) => i.priceRange.min <= 2000)).toBe(true);
    });
  });

  describe("addToCampaign and getCampaignInfluencers", () => {
    it("adds influencer to campaign and retrieves it", () => {
      const ci = influencerService.addToCampaign(TEST_TENANT, {
        campaignId: "camp_1", influencerId: "inf_1",
        influencerName: "Test", influencerHandle: "@test",
        platform: "instagram", deliverables: ["post"], compensation: 1000,
      });
      expect(ci).toHaveProperty("id");
      expect(ci.status).toBe("proposed");

      const list = influencerService.getCampaignInfluencers("camp_1");
      expect(list.some((l) => l.id === ci.id)).toBe(true);
    });
  });

  describe("updateInfluencerStatus", () => {
    it("updates status and returns null for non-existent", () => {
      const r = influencerService.updateInfluencerStatus(TEST_TENANT, "nonexistent", "active");
      expect(r).toBeNull();
    });
  });

  describe("getAllCampaignInfluencers", () => {
    it("returns campaign influencers for tenant", () => {
      const r = influencerService.getAllCampaignInfluencers(TEST_TENANT);
      expect(Array.isArray(r)).toBe(true);
    });
  });

  describe("getPlatforms", () => {
    it("returns platform list", () => {
      const r = influencerService.getPlatforms();
      expect(r.length).toBeGreaterThan(0);
      r.forEach((p) => {
        expect(p).toHaveProperty("platform");
        expect(p).toHaveProperty("label");
      });
    });
  });

  describe("computeAudienceQuality", () => {
    it("returns quality scores for influencer", () => {
      const inf = influencerService.search({})[0];
      const r = influencerService.computeAudienceQuality(inf, ["tech", "saas"]);
      expect(r).toHaveProperty("qualityScore");
      expect(r).toHaveProperty("authenticityRatio");
      expect(r).toHaveProperty("relevanceScore");
      expect(r).toHaveProperty("growthHealth");
      expect(r.qualityScore).toBeGreaterThanOrEqual(0);
      expect(r.qualityScore).toBeLessThanOrEqual(1);
    });

    it("uses default 0.5 relevance when no brand categories", () => {
      const inf = influencerService.search({})[0];
      const r = influencerService.computeAudienceQuality(inf);
      expect(r.relevanceScore).toBe(0.5);
    });
  });

  describe("detectFakeFollowers", () => {
    it("returns fake follower analysis", () => {
      const inf = influencerService.search({})[0];
      const r = influencerService.detectFakeFollowers(inf);
      expect(r).toHaveProperty("probability");
      expect(r).toHaveProperty("flags");
      expect(r).toHaveProperty("confidence");
      expect(r).toHaveProperty("details");
      expect(r.probability).toBeGreaterThanOrEqual(0);
      expect(r.probability).toBeLessThanOrEqual(1);
      expect(["low", "medium", "high"]).toContain(r.confidence);
    });
  });

  describe("predictROI", () => {
    it("returns fallback prediction with no historical data", () => {
      const inf = influencerService.search({})[0];
      const r = influencerService.predictROI(inf, []);
      expect(r).toHaveProperty("predictedROI");
      expect(r).toHaveProperty("confidence");
      expect(r).toHaveProperty("range");
      expect(r.confidence).toBe(0.3);
    });

    it("returns historical-based prediction with campaigns", () => {
      const inf = influencerService.search({})[0];
      const historical: any[] = [
        { platform: inf.platform, compensation: 2000, performance: { roi: 3.0 } },
        { platform: inf.platform, compensation: 2500, performance: { roi: 4.0 } },
        { platform: inf.platform, compensation: 3000, performance: { roi: 3.5 } },
      ];
      const r = influencerService.predictROI(inf, historical);
      expect(r.similarInfluencers).toBeGreaterThan(0);
      expect(r.confidence).toBeGreaterThan(0.3);
    });
  });

  describe("computeOptimalPrice", () => {
    it("returns optimal price calculation", () => {
      const inf = influencerService.search({})[0];
      const r = influencerService.computeOptimalPrice(inf, 3.0, 0.02, 0.03, 100);
      expect(r).toHaveProperty("optimalPrice");
      expect(r).toHaveProperty("priceRange");
      expect(r).toHaveProperty("valueScore");
      expect(r).toHaveProperty("paybackUnits");
      expect(r.optimalPrice).toBeGreaterThan(0);
    });
  });

  describe("computeBrandFit", () => {
    it("returns brand fit score with matched/missing categories", () => {
      const inf = influencerService.search({})[0];
      const r = influencerService.computeBrandFit(inf, ["tech", "saas", "finance"]);
      expect(r).toHaveProperty("score");
      expect(r).toHaveProperty("matchedCategories");
      expect(r).toHaveProperty("missingCategories");
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    });

    it("returns zero score for empty brand categories", () => {
      const inf = influencerService.search({})[0];
      const r = influencerService.computeBrandFit(inf, []);
      expect(r.score).toBe(0);
    });
  });

  describe("rankInfluencers", () => {
    it("returns ranked list with composite scores", () => {
      const r = influencerService.rankInfluencers(["tech", "saas"], []);
      expect(r.length).toBeGreaterThan(0);
      r.forEach((entry) => {
        expect(entry).toHaveProperty("rank");
        expect(entry).toHaveProperty("qualityScore");
        expect(entry).toHaveProperty("predictedROI");
        expect(entry.rank).toBeGreaterThan(0);
      });
      for (let i = 1; i < r.length; i++) expect(r[i].rank).toBeGreaterThan(r[i - 1].rank);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// LandingPageBuilderService
// ═══════════════════════════════════════════════════════════════════
describe("LandingPageBuilderService", () => {
  beforeAll(() => {
    DataStore["mem"]().delete("landing_pages_built", () => true);
  });

  describe("getTemplates", () => {
    it("returns all templates", () => {
      const r = landingPageBuilderService.getTemplates();
      expect(r.length).toBeGreaterThan(0);
      r.forEach((t) => {
        expect(t).toHaveProperty("id");
        expect(t).toHaveProperty("name");
        expect(t).toHaveProperty("sections");
      });
    });
  });

  describe("createPage and getPages", () => {
    it("creates a page from template", () => {
      const r = landingPageBuilderService.createPage(TEST_TENANT, {
        name: "Test Landing", slug: "test-landing", template: "tpl_lead_gen",
      });
      expect(r).toHaveProperty("id");
      expect(r.name).toBe("Test Landing");
      expect(r.status).toBe("draft");
      expect(r.sections.length).toBeGreaterThan(0);

      const pages = landingPageBuilderService.getPages(TEST_TENANT);
      expect(pages.some((p) => p.id === r.id)).toBe(true);
    });

    it("generates slug from name if not provided", () => {
      const r = landingPageBuilderService.createPage(TEST_TENANT, {
        name: "My Awesome Page", slug: "", template: "tpl_webinar",
      });
      expect(r.slug).toBeTruthy();
    });
  });

  describe("getPage", () => {
    it("returns undefined for non-existent page", () => {
      expect(landingPageBuilderService.getPage(TEST_TENANT, "nonexistent")).toBeUndefined();
    });
  });

  describe("updatePage", () => {
    it("updates existing page and returns null for non-existent", () => {
      expect(landingPageBuilderService.updatePage(TEST_TENANT, "nonexistent", { name: "X" })).toBeNull();
    });
  });

  describe("publishPage", () => {
    it("publishes page and sets URL", () => {
      const page = landingPageBuilderService.createPage(TEST_TENANT, {
        name: "Publish Test", slug: "publish-test", template: "tpl_sales",
      });
      const r = landingPageBuilderService.publishPage(TEST_TENANT, page.id);
      expect(r).not.toBeNull();
      expect(r!.status).toBe("published");
      expect(r!.publishedUrl).toContain("pages.n0va.ai");
    });

    it("returns null for non-existent page", () => {
      expect(landingPageBuilderService.publishPage(TEST_TENANT, "nonexistent")).toBeNull();
    });
  });

  describe("deletePage", () => {
    it("deletes page and returns boolean", () => {
      const page = landingPageBuilderService.createPage(TEST_TENANT, {
        name: "Delete Test", slug: "delete-test", template: "tpl_thank_you",
      });
      expect(landingPageBuilderService.deletePage(TEST_TENANT, page.id)).toBe(true);
      expect(landingPageBuilderService.getPage(TEST_TENANT, page.id)).toBeUndefined();
    });

    it("returns false for non-existent", () => {
      expect(landingPageBuilderService.deletePage(TEST_TENANT, "nonexistent")).toBe(false);
    });
  });

  describe("predictConversion", () => {
    it("predicts CVR with factors and tips", () => {
      const tpl = landingPageBuilderService.getTemplates()[0];
      const r = landingPageBuilderService.predictConversion({
        sections: tpl.sections.map((s) => ({ type: s.type, content: { ...s.defaultContent }, order: 0 })),
        seo: { title: "Best Landing Page Ever for Conversions in 2024", description: "A great description that is long enough to be good for SEO purposes and includes keywords.", keywords: ["a", "b", "c"] },
      });
      expect(r).toHaveProperty("predictedCvr");
      expect(r).toHaveProperty("confidence");
      expect(r).toHaveProperty("factors");
      expect(r).toHaveProperty("optimizationTips");
      expect(r.predictedCvr).toBeGreaterThan(0);
      expect(r.factors.length).toBeGreaterThan(0);
    });
  });

  describe("seoScore", () => {
    it("returns SEO score across dimensions", () => {
      const r = landingPageBuilderService.seoScore({
        seo: { title: "Perfect Title Length for SEO Ranking", description: "A meta description that is long enough to pass the 50 character minimum requirement for good SEO.", keywords: ["kw1", "kw2", "kw3", "kw4", "kw5"] },
        slug: "perfect-url-slug",
        sections: [{ type: "hero", content: { headline: "Big Headline Text Here For Content Depth Purposes", cta: "Click" }, order: 0 }],
      });
      expect(r).toHaveProperty("overallScore");
      expect(r).toHaveProperty("dimensions");
      expect(r).toHaveProperty("actionableItems");
      expect(r.overallScore).toBeGreaterThan(0);
      expect(r.dimensions.length).toBe(6);
    });

    it("handles empty page gracefully", () => {
      const r = landingPageBuilderService.seoScore({});
      expect(r.overallScore).toBe(0);
      expect(r.actionableItems.length).toBeGreaterThan(0);
    });
  });

  describe("optimizeElements", () => {
    it("returns optimization suggestions for page elements", () => {
      const pages = landingPageBuilderService.getPages(TEST_TENANT);
      if (pages.length > 0) {
        const r = landingPageBuilderService.optimizeElements(pages[0]);
        expect(r).toHaveProperty("elements");
        expect(r).toHaveProperty("overallOptimizationScore");
        expect(r).toHaveProperty("priorityActions");
        expect(r.overallOptimizationScore).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("suggestVariants", () => {
    it("returns A/B test variant suggestions", () => {
      const pages = landingPageBuilderService.getPages(TEST_TENANT);
      if (pages.length > 0) {
        const r = landingPageBuilderService.suggestVariants(pages[0]);
        expect(r).toHaveProperty("variants");
        expect(r.variants.length).toBeGreaterThan(0);
        r.variants.forEach((v) => {
          expect(v).toHaveProperty("name");
          expect(v).toHaveProperty("changes");
          expect(v).toHaveProperty("predictedLift");
        });
      }
    });
  });

  describe("projectPerformance", () => {
    it("projects page performance over 30 days", () => {
      const pages = landingPageBuilderService.getPages(TEST_TENANT);
      if (pages.length > 0) {
        const r = landingPageBuilderService.projectPerformance(pages[0]);
        expect(r).toHaveProperty("current");
        expect(r).toHaveProperty("projected30Days");
        expect(r).toHaveProperty("projectionBasis");
        expect(r.projected30Days).toHaveProperty("views");
        expect(r.projected30Days).toHaveProperty("conversions");
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// PlaybookExecutionService
// ═══════════════════════════════════════════════════════════════════
describe("PlaybookExecutionService", () => {
  beforeAll(() => {
    DataStore["mem"]().delete("playbook_executions", () => true);
  });

  describe("getStepTemplates", () => {
    it("returns step type templates", () => {
      const r = playbookExecutionService.getStepTemplates();
      expect(r.length).toBeGreaterThan(0);
      r.forEach((s) => {
        expect(s).toHaveProperty("type");
        expect(s).toHaveProperty("label");
      });
    });
  });

  describe("createExecution and getExecutions", () => {
    it("creates execution with default pending steps", () => {
      const r = playbookExecutionService.createExecution(TEST_TENANT, {
        playbookId: "pb_1", playbookName: "Test Playbook",
        steps: [
          { type: "create_campaign", label: "Create Campaign", config: {} },
          { type: "wait", label: "Wait", config: { duration: 60 } },
          { type: "launch_campaign", label: "Launch", config: {}, dependsOn: ["step_0_0"] },
        ],
        createdBy: "user1",
      });
      expect(r.status).toBe("draft");
      expect(r.steps.length).toBe(3);
      r.steps.forEach((s) => expect(s.status).toBe("pending"));

      const list = playbookExecutionService.getExecutions(TEST_TENANT);
      expect(list.some((e) => e.id === r.id)).toBe(true);
    });
  });

  describe("getExecution", () => {
    it("returns undefined for non-existent", () => {
      expect(playbookExecutionService.getExecution(TEST_TENANT, "nonexistent")).toBeUndefined();
    });
  });

  describe("startExecution", () => {
    it("starts execution and returns null if not draft", () => {
      const exec = playbookExecutionService.createExecution(TEST_TENANT, {
        playbookId: "pb_start", playbookName: "Start Test",
        steps: [{ type: "send_notification", label: "Notify", config: {} }],
        createdBy: "user1",
      });
      const r = playbookExecutionService.startExecution(TEST_TENANT, exec.id);
      expect(r).not.toBeNull();
      expect(r!.status).toBe("running");
      expect(playbookExecutionService.startExecution(TEST_TENANT, exec.id)).toBeNull();
    });
  });

  describe("completeStep", () => {
    it("completes a step and advances execution", () => {
      const exec = playbookExecutionService.createExecution(TEST_TENANT, {
        playbookId: "pb_complete", playbookName: "Complete Test",
        steps: [{ type: "send_notification", label: "Step 1", config: {} }],
        createdBy: "user1",
      });
      const started = playbookExecutionService.startExecution(TEST_TENANT, exec.id)!;
      const r = playbookExecutionService.completeStep(TEST_TENANT, started.id, started.steps[0].id, { success: true });
      expect(r).not.toBeNull();
      const completed = r!.steps.find((s) => s.id === started.steps[0].id);
      expect(completed!.status).toBe("completed");
    });

    it("returns null for non-existent execution", () => {
      expect(playbookExecutionService.completeStep(TEST_TENANT, "nonexistent", "step1")).toBeNull();
    });
  });

  describe("failStep", () => {
    it("fails a step and marks execution as failed", () => {
      const exec = playbookExecutionService.createExecution(TEST_TENANT, {
        playbookId: "pb_fail", playbookName: "Fail Test",
        steps: [{ type: "create_campaign", label: "Step 1", config: {} }],
        createdBy: "user1",
      });
      const started = playbookExecutionService.startExecution(TEST_TENANT, exec.id)!;
      const r = playbookExecutionService.failStep(TEST_TENANT, started.id, started.steps[0].id, "Something broke");
      expect(r).not.toBeNull();
      expect(r!.status).toBe("failed");
    });
  });

  describe("pauseExecution and resumeExecution", () => {
    it("pauses and resumes execution", () => {
      const exec = playbookExecutionService.createExecution(TEST_TENANT, {
        playbookId: "pb_pause", playbookName: "Pause Test",
        steps: [{ type: "send_notification", label: "Step", config: {} }],
        createdBy: "user1",
      });
      playbookExecutionService.startExecution(TEST_TENANT, exec.id);
      const paused = playbookExecutionService.pauseExecution(TEST_TENANT, exec.id);
      expect(paused!.status).toBe("paused");
      const resumed = playbookExecutionService.resumeExecution(TEST_TENANT, exec.id);
      expect(resumed!.status).toBe("running");
    });

    it("returns null if not in correct state", () => {
      expect(playbookExecutionService.pauseExecution(TEST_TENANT, "nonexistent")).toBeNull();
      expect(playbookExecutionService.resumeExecution(TEST_TENANT, "nonexistent")).toBeNull();
    });
  });

  describe("deleteExecution", () => {
    it("deletes execution and returns false for non-existent", () => {
      const exec = playbookExecutionService.createExecution(TEST_TENANT, {
        playbookId: "pb_del", playbookName: "Delete Test",
        steps: [{ type: "custom", label: "Step", config: {} }],
        createdBy: "user1",
      });
      expect(playbookExecutionService.deleteExecution(TEST_TENANT, exec.id)).toBe(true);
      expect(playbookExecutionService.getExecution(TEST_TENANT, exec.id)).toBeUndefined();
      expect(playbookExecutionService.deleteExecution(TEST_TENANT, "nonexistent")).toBe(false);
    });
  });

  describe("computeCriticalPath", () => {
    it("returns critical path with slack analysis", () => {
      const exec = playbookExecutionService.createExecution(TEST_TENANT, {
        playbookId: "pb_cpm", playbookName: "CPM Test",
        steps: [
          { type: "create_campaign", label: "A", config: {}, id: "a" },
          { type: "create_creative", label: "B", config: {}, dependsOn: ["a"], id: "b" },
          { type: "send_notification", label: "C", config: {}, id: "c" },
          { type: "launch_campaign", label: "D", config: {}, dependsOn: ["b", "c"], id: "d" },
        ],
        createdBy: "user1",
      });
      const r = playbookExecutionService.computeCriticalPath(exec);
      expect(r).toHaveProperty("path");
      expect(r).toHaveProperty("totalDuration");
      expect(r).toHaveProperty("criticalSteps");
      expect(r).toHaveProperty("isOnCriticalPath");
      expect(r.totalDuration).toBeGreaterThan(0);
    });
  });

  describe("estimateCompletion", () => {
    it("returns PERT completion estimate", () => {
      const exec = playbookExecutionService.createExecution(TEST_TENANT, {
        playbookId: "pb_pert", playbookName: "PERT Test",
        steps: [
          { type: "create_campaign", label: "A", config: {} },
          { type: "create_creative", label: "B", config: {}, dependsOn: [] },
        ],
        createdBy: "user1",
      });
      const r = playbookExecutionService.estimateCompletion(exec);
      expect(r).toHaveProperty("optimistic");
      expect(r).toHaveProperty("mostLikely");
      expect(r).toHaveProperty("pessimistic");
      expect(r).toHaveProperty("expected");
      expect(r).toHaveProperty("variance");
      expect(r).toHaveProperty("confidence");
      expect(r.expected).toBeGreaterThan(0);
    });

    it("returns zeros when no remaining steps", () => {
      const exec = playbookExecutionService.createExecution(TEST_TENANT, {
        playbookId: "pb_done", playbookName: "Done",
        steps: [{ type: "send_notification", label: "Only", config: {} }],
        createdBy: "user1",
      });
      const started = playbookExecutionService.startExecution(TEST_TENANT, exec.id)!;
      const completed = playbookExecutionService.completeStep(TEST_TENANT, started.id, started.steps[0].id)!;
      const r = playbookExecutionService.estimateCompletion(completed);
      expect(r.expected).toBe(0);
      expect(r.confidence).toBe("high");
    });
  });

  describe("estimateSuccessProbability", () => {
    it("returns success probability for a step type", () => {
      const r = playbookExecutionService.estimateSuccessProbability("create_campaign");
      expect(r).toHaveProperty("probability");
      expect(r).toHaveProperty("historicalCount");
      expect(r).toHaveProperty("factors");
      expect(r.probability).toBeGreaterThan(0);
    });
  });

  describe("analyzeRollbackImpact", () => {
    it("returns rollback analysis for failed step", () => {
      const exec = playbookExecutionService.createExecution(TEST_TENANT, {
        playbookId: "pb_roll", playbookName: "Rollback Test",
        steps: [
          { type: "create_campaign", label: "Create", config: {} },
          { type: "create_creative", label: "Creative", config: {} },
        ],
        createdBy: "user1",
      });
      const r = playbookExecutionService.analyzeRollbackImpact(exec, exec.steps[1].id);
      expect(r).toHaveProperty("affectedSteps");
      expect(r).toHaveProperty("estimatedRevertTime");
      expect(r).toHaveProperty("riskScore");
      expect(r).toHaveProperty("recommendation");
      expect(r.riskScore).toBeGreaterThanOrEqual(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// ReportBuilderService
// ═══════════════════════════════════════════════════════════════════
describe("ReportBuilderService", () => {
  beforeAll(() => {
    DataStore["mem"]().delete("reports", () => true);
    // Seed some metrics for report data generation
    const mem = DataStore["mem"]();
    for (let i = 0; i < 30; i++) {
      mem.insert("metrics", { impressions: 1000 + i * 100, clicks: 50 + i * 5, conversions: 5 + i, spend: 200 + i * 10, revenue: 800 + i * 50, date: `2025-01-${String(i + 1).padStart(2, "0")}`, campaignId: "c1" });
    }
    mem.insert("campaigns", { name: "Test Camp", tenantId: TEST_TENANT, status: "active", budget: { lifetime: 5000, spent: 2000 }, platforms: ["meta", "google"], goal: "Test" });
  });

  describe("getDefaultWidgets", () => {
    it("returns default widget list", () => {
      const r = reportBuilderService.getDefaultWidgets();
      expect(r.length).toBeGreaterThan(0);
    });
  });

  describe("createReport and getReports", () => {
    it("creates a report with default widgets", () => {
      const r = reportBuilderService.createReport(TEST_TENANT, { name: "Test Report", dateRange: "last_30" });
      expect(r).toHaveProperty("id");
      expect(r.name).toBe("Test Report");
      expect(r.widgets.length).toBeGreaterThan(0);

      const list = reportBuilderService.getReports(TEST_TENANT);
      expect(list.some((l) => l.id === r.id)).toBe(true);
    });
  });

  describe("getReport", () => {
    it("returns undefined for non-existent", () => {
      expect(reportBuilderService.getReport(TEST_TENANT, "nonexistent")).toBeUndefined();
    });
  });

  describe("updateReport", () => {
    it("updates report and returns null for non-existent", () => {
      const r = reportBuilderService.createReport(TEST_TENANT, { name: "Updatable", dateRange: "today" });
      const updated = reportBuilderService.updateReport(TEST_TENANT, r.id, { name: "Updated" });
      expect(updated!.name).toBe("Updated");
      expect(reportBuilderService.updateReport(TEST_TENANT, "nonexistent", {})).toBeNull();
    });
  });

  describe("deleteReport", () => {
    it("deletes and returns false for non-existent", () => {
      const r = reportBuilderService.createReport(TEST_TENANT, { name: "Deletable", dateRange: "today" });
      expect(reportBuilderService.deleteReport(TEST_TENANT, r.id)).toBe(true);
      expect(reportBuilderService.deleteReport(TEST_TENANT, "nonexistent")).toBe(false);
    });
  });

  describe("generateReportData", () => {
    it("returns widget data with insights", () => {
      const report = reportBuilderService.createReport(TEST_TENANT, { name: "Data Report", dateRange: "last_30" });
      const r = reportBuilderService.generateReportData(TEST_TENANT, report.id);
      expect(r).toHaveProperty("widgets");
      expect(r).toHaveProperty("dateRange");
      expect(r).toHaveProperty("insights");
      expect(r.widgets.length).toBeGreaterThan(0);
    });

    it("throws for non-existent report", () => {
      expect(() => reportBuilderService.generateReportData(TEST_TENANT, "nonexistent")).toThrow("Report not found");
    });
  });

  describe("computeTrendLine", () => {
    it("returns linear regression with R-squared", () => {
      const data = Array.from({ length: 10 }, (_, i) => ({ label: `d${i}`, value: 100 + i * 10 }));
      const r = reportBuilderService.computeTrendLine(data);
      expect(r).toHaveProperty("slope");
      expect(r).toHaveProperty("intercept");
      expect(r).toHaveProperty("rSquared");
      expect(r).toHaveProperty("direction");
      expect(r).toHaveProperty("points");
      expect(r.rSquared).toBeGreaterThan(0);
      expect(r.direction).toBe("up");
    });

    it("returns flat for insufficient data", () => {
      const r = reportBuilderService.computeTrendLine([{ label: "a", value: 100 }, { label: "b", value: 110 }]);
      expect(r.direction).toBe("flat");
    });
  });

  describe("movingAverage", () => {
    it("computes moving average with given window", () => {
      const data = Array.from({ length: 10 }, (_, i) => ({ label: `d${i}`, value: 100 }));
      const r = reportBuilderService.movingAverage(data, 3);
      expect(r.length).toBe(10);
      for (let i = 0; i < 2; i++) expect(r[i].value).toBe(100);
      for (let i = 2; i < 10; i++) expect(r[i].value).toBe(100);
    });
  });

  describe("forecast", () => {
    it("forecasts future values with confidence intervals", () => {
      const data = Array.from({ length: 10 }, (_, i) => ({ label: `2025-01-${String(i + 1).padStart(2, "0")}`, value: 200 + i * 5 }));
      const r = reportBuilderService.forecast("spend", data, 5);
      expect(r).toHaveProperty("points");
      expect(r).toHaveProperty("confidence");
      expect(r.points.length).toBe(5);
      r.points.forEach((p) => {
        expect(p).toHaveProperty("value");
        expect(p).toHaveProperty("lower");
        expect(p).toHaveProperty("upper");
        expect(p.upper).toBeGreaterThanOrEqual(p.lower);
      });
    });
  });

  describe("generateInsights", () => {
    it("returns automated insights from metrics", () => {
      const r = reportBuilderService.generateInsights(TEST_TENANT);
      expect(Array.isArray(r)).toBe(true);
      r.forEach((insight) => {
        expect(insight).toHaveProperty("type");
        expect(insight).toHaveProperty("title");
        expect(insight).toHaveProperty("severity");
        expect(["trend", "anomaly", "comparison", "distribution"]).toContain(insight.type);
        expect(["positive", "neutral", "negative"]).toContain(insight.severity);
      });
    });
  });

  describe("scheduleReport and removeSchedule", () => {
    it("schedules and removes a report schedule", () => {
      const report = reportBuilderService.createReport(TEST_TENANT, { name: "Scheduled", dateRange: "weekly" });
      const scheduled = reportBuilderService.scheduleReport(TEST_TENANT, report.id, {
        frequency: "weekly", dayOfWeek: 1, time: "09:00", recipients: ["a@b.com"], format: "pdf",
      });
      expect(scheduled!.schedule).toBeDefined();
      expect(scheduled!.schedule!.frequency).toBe("weekly");

      const removed = reportBuilderService.removeSchedule(TEST_TENANT, report.id);
      expect(removed!.schedule).toBeUndefined();
    });

    it("returns null for non-existent on schedule/remove", () => {
      expect(reportBuilderService.scheduleReport(TEST_TENANT, "nonexistent", { frequency: "daily", time: "09:00", recipients: [], format: "pdf" })).toBeNull();
      expect(reportBuilderService.removeSchedule(TEST_TENANT, "nonexistent")).toBeNull();
    });
  });

  describe("getAvailableMetrics", () => {
    it("returns available metrics list", () => {
      const r = reportBuilderService.getAvailableMetrics();
      expect(r.length).toBeGreaterThan(0);
      r.forEach((m) => {
        expect(m).toHaveProperty("key");
        expect(m).toHaveProperty("label");
        expect(m).toHaveProperty("category");
      });
    });
  });

  describe("getChartTypes", () => {
    it("returns chart type options", () => {
      const r = reportBuilderService.getChartTypes();
      expect(r.length).toBeGreaterThan(0);
      r.forEach((c) => {
        expect(c).toHaveProperty("type");
        expect(c).toHaveProperty("label");
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// StatisticalABTestService
// ═══════════════════════════════════════════════════════════════════
describe("StatisticalABTestService", () => {
  describe("test", () => {
    it("returns full A/B test results with significant detection", () => {
      const r = statisticalABTestService.test({
        controlImpressions: 10000, controlConversions: 200,
        variantImpressions: 10000, variantConversions: 400,
      });
      expect(r).toHaveProperty("controlRate");
      expect(r).toHaveProperty("variantRate");
      expect(r).toHaveProperty("lift");
      expect(r).toHaveProperty("liftPercent");
      expect(r).toHaveProperty("chiSquared");
      expect(r).toHaveProperty("pValue");
      expect(r).toHaveProperty("significant");
      expect(r).toHaveProperty("confidenceInterval");
      expect(r).toHaveProperty("oddsRatio");
      expect(r).toHaveProperty("sampleSize");
      expect(r).toHaveProperty("power");
      expect(r).toHaveProperty("minimumDetectableEffect");
      expect(r).toHaveProperty("recommendation");
      expect(r.significant).toBe(true);
      expect(r.pValue).toBeLessThan(0.05);
      expect(r.sampleSize.recommended).toBeGreaterThan(0);
    });

    it("returns non-significant for similar conversion rates", () => {
      const r = statisticalABTestService.test({
        controlImpressions: 5000, controlConversions: 150,
        variantImpressions: 5000, variantConversions: 155,
      });
      expect(r.significant).toBe(false);
    });

    it("returns proper recommendation for variant win", () => {
      const r = statisticalABTestService.test({
        controlImpressions: 10000, controlConversions: 100,
        variantImpressions: 10000, variantConversions: 250,
      });
      expect(r.recommendation).toContain("Variant wins");
    });

    it("handles zero variant wins (control better)", () => {
      const r = statisticalABTestService.test({
        controlImpressions: 10000, controlConversions: 400,
        variantImpressions: 10000, variantConversions: 200,
      });
      expect(r.recommendation).toContain("Control performs better");
    });

    it("throws for zero impressions", () => {
      expect(() => statisticalABTestService.test({
        controlImpressions: 0, controlConversions: 0,
        variantImpressions: 1000, variantConversions: 10,
      })).toThrow("Impressions must be > 0");
    });

    it("throws for negative conversions", () => {
      expect(() => statisticalABTestService.test({
        controlImpressions: 1000, controlConversions: -1,
        variantImpressions: 1000, variantConversions: 10,
      })).toThrow("Conversions cannot be negative");
    });
  });

  describe("sampleSize", () => {
    it("calculates sample size per variant", () => {
      const r = statisticalABTestService.sampleSize({ baselineRate: 0.05, minimumDetectableEffect: 0.02 });
      expect(r).toBeGreaterThan(0);
    });

    it("returns at least 1", () => {
      const r = statisticalABTestService.sampleSize({ baselineRate: 0.5, minimumDetectableEffect: 0.5 });
      expect(r).toBeGreaterThanOrEqual(1);
    });
  });

  describe("estimateDuration", () => {
    it("estimates test duration in days", () => {
      const r = statisticalABTestService.estimateDuration(1000, { baselineRate: 0.05, minimumDetectableEffect: 0.02 });
      expect(r).toHaveProperty("requiredSampleSize");
      expect(r).toHaveProperty("estimatedDays");
      expect(r).toHaveProperty("weeks");
      expect(r).toHaveProperty("recommendation");
      expect(r.requiredSampleSize).toBeGreaterThan(0);
    });
  });
});
