import { describe, it, expect, beforeEach } from "vitest";
import { creativeAI } from "../services/CreativeAIService";
import { creativeOptimizer } from "../services/CreativeOptimizer";
import { creativeVersionService } from "../services/CreativeVersionService";

const TEST_TENANT = "mass_pt2_tenant";
const TEST_CAMPAIGN = "mass_pt2_campaign";

describe("CreativeAIService", () => {
  it("generates headline variants", () => {
    const result = creativeAI.generateHeadlines("Buy our product", "tech buyers", 3);
    expect(result.length).toBe(3);
    result.forEach((h: string) => {
      expect(typeof h).toBe("string");
      expect(h.length).toBeGreaterThan(0);
    });
  });

  it("generates body copy variants", () => {
    const result = creativeAI.generateBody("Product X is amazing", "developers", "professional", 2);
    expect(result.length).toBe(2);
  });

  it("suggests tone adjustments", () => {
    const result = creativeAI.suggestTone("Buy now!", "google");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("expands a short headline", () => {
    const result = creativeAI.expandHeadline("Save Big");
    expect(result.length).toBeGreaterThan(0);
    expect(typeof result[0]).toBe("string");
  });

  it("analyzes text sentiment and readability", () => {
    const result = creativeAI.analyzeText("Amazing product that changes everything!");
    expect(result).toHaveProperty("sentiment");
    expect(typeof result.fleschKincaidGrade).toBe("number");
    expect(typeof result.fleschReadingEase).toBe("number");
  });

  it("generates full creative variants", () => {
    const result = creativeAI.generateVariants({
      productDescription: "Headline here",
      targetAudience: "tech buyers",
      tone: "professional",
      platform: "meta",
      count: 2,
    });
    expect(result.length).toBe(2);
    result.forEach((v: any) => {
      expect(v).toHaveProperty("headline");
      expect(v).toHaveProperty("body");
    });
  });

  it("manages MAB arms for creative variants", () => {
    creativeAI.mabGetOrCreateVariant("arm_a");
    creativeAI.mabGetOrCreateVariant("arm_b");
    creativeAI.mabGetOrCreateVariant("arm_c");
    const selected = creativeAI.mabSelectVariant(["arm_a", "arm_b", "arm_c"]);
    expect(["arm_a", "arm_b", "arm_c"]).toContain(selected.selectedKey);
    creativeAI.mabRecordResult(selected.selectedKey, true);
    creativeAI.mabRecordResult(selected.selectedKey, false);
    const all = creativeAI.mabGetAllVariants();
    expect(all.length).toBe(3);
  });

  it("detects creative fatigue", () => {
    const history = [
      { day: 1, impressions: 1000, clicks: 50, conversions: 5 },
      { day: 2, impressions: 1200, clicks: 55, conversions: 6 },
      { day: 3, impressions: 1100, clicks: 45, conversions: 4 },
      { day: 4, impressions: 1300, clicks: 40, conversions: 3 },
      { day: 5, impressions: 1250, clicks: 35, conversions: 3 },
    ];
    const result = creativeAI.detectFatigue(history);
    expect(typeof result.fatigueScore).toBe("number");
    expect(typeof result.recommendedRefresh).toBe("boolean");
  });

  it("simulates an A/B test", () => {
    const result = creativeAI.simulateABTest(
      [{ name: "A", baselineCtr: 0.05, lift: 0 }, { name: "B", baselineCtr: 0.05, lift: 10 }],
      1000, 7
    );
    expect(result).toHaveProperty("winner");
    expect(result).toHaveProperty("confidence");
  });

  it("predicts performance of a creative", () => {
    const result = creativeAI.predictPerformance({
      headline: "Test headline here",
      body: "Test body here",
      platform: "meta",
      tone: "professional",
    });
    expect(result).toHaveProperty("estimatedCtr");
    expect(result).toHaveProperty("estimatedCvr");
  });

  it("optimizes a variant against a goal", () => {
    const result = creativeAI.optimizeVariant({
      productDescription: "Original text here",
      targetAudience: "tech buyers",
      platform: "meta",
      tone: "professional",
    });
    expect(result).toHaveProperty("bestVariant");
    expect(result).toHaveProperty("performance");
  });
});

describe("CreativeOptimizer", () => {
  beforeEach(() => {
    creativeOptimizer.initializeThompsonSampling(TEST_TENANT, 3);
  });

  it("analyzes creative fatigue", () => {
    const mockCreatives = creativeOptimizer.generateMockCreatives();
    const result = creativeOptimizer.analyzeFatigue(mockCreatives);
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("creativeId");
      expect(typeof result[0].fatigueScore).toBe("number");
    }
  });

  it("fits a decay curve to impression data", () => {
    const dataPoints = [
      { day: 1, ctr: 3.5 }, { day: 5, ctr: 3.0 },
      { day: 10, ctr: 2.4 }, { day: 15, ctr: 2.0 },
      { day: 20, ctr: 1.7 },
    ];
    const result = creativeOptimizer.fitDecayCurve(dataPoints);
    expect(typeof result.a).toBe("number");
    expect(typeof result.lambda).toBe("number");
  });

  it("computes optimal rotation day", () => {
    const decayParams = { a: 2.0, lambda: 0.05, c: 1.0, halflife: 13.9 };
    const result = creativeOptimizer.optimalRotationDay(decayParams);
    expect(typeof result.day).toBe("number");
    expect(result.day).toBeGreaterThan(0);
  });

  it("computes cross-platform fatigue correlation", () => {
    const mockCreatives = creativeOptimizer.generateMockCreatives();
    const result = creativeOptimizer.crossPlatformFatigueCorrelation(mockCreatives);
    expect(result).toHaveProperty("platformPairs");
    expect(result).toHaveProperty("insight");
  });

  it("performs Bayesian A/B test", () => {
    const result = creativeOptimizer.bayesianAbTest([
      { id: "A", impressions: 100, clicks: 15 },
      { id: "B", impressions: 100, clicks: 25 },
    ]);
    expect(result).toHaveProperty("probBeatingA");
    expect(typeof result.probBeatingA).toBe("number");
    expect(result).toHaveProperty("bestVariant");
  });

  it("runs Thompson sampling for arm selection", () => {
    creativeOptimizer.updateThompsonArm(TEST_TENANT, 0, 1);
    creativeOptimizer.updateThompsonArm(TEST_TENANT, 1, 0);
    const selected = creativeOptimizer.selectThompsonArm(TEST_TENANT);
    expect(typeof selected.armIndex).toBe("number");
    expect(typeof selected.mean).toBe("number");
  });

  it("returns current Thompson sampling state", () => {
    const state = creativeOptimizer.getThompsonState(TEST_TENANT);
    expect(state).not.toBeNull();
    expect(state!.length).toBe(3);
  });

  it("uses Gaussian process for fatigue modeling", () => {
    const observations = [
      { day: 1, ctr: 3.5 }, { day: 3, ctr: 3.2 }, { day: 5, ctr: 2.9 },
      { day: 7, ctr: 2.7 }, { day: 9, ctr: 2.5 },
    ];
    const result = creativeOptimizer.gaussianProcessFatigueModel(observations, [10, 15, 20]);
    expect(result).toHaveProperty("predictions");
    expect(result.predictions.length).toBeGreaterThan(0);
    expect(result.predictions[0]).toHaveProperty("mean");
    expect(result.predictions[0]).toHaveProperty("variance");
  });

  it("computes A/B test significance", () => {
    const result = creativeOptimizer.abTestSignificance(
      { impressions: 1000, clicks: 50 },
      { impressions: 1000, clicks: 70 }
    );
    expect(typeof result.pValue).toBe("number");
    expect(result).toHaveProperty("isSignificant");
  });

  it("projects creative performance over time", () => {
    const mockCreatives = creativeOptimizer.generateMockCreatives();
    const result = creativeOptimizer.projectPerformance(mockCreatives[0], [10, 20, 30]);
    expect(result.length).toBe(3);
    expect(result[0]).toHaveProperty("predictedCtr");
  });
});

describe("CreativeVersionService", () => {
  let versionIds: string[] = [];

  it("creates a new version", () => {
    const v = creativeVersionService.createVersion("version_camp", "version_tenant", { headline: "Version 1", body: "Body 1" });
    expect(v).toHaveProperty("id");
    expect(v).toHaveProperty("version");
    expect(v.version).toBe(1);
    versionIds.push(v.id);
  });

  it("increments version number on subsequent creations", () => {
    const v2 = creativeVersionService.createVersion("version_camp", "version_tenant", { headline: "Version 2" });
    expect(v2.version).toBe(2);
    versionIds.push(v2.id);
  });

  it("lists all versions for a campaign", () => {
    const versions = creativeVersionService.getVersions("version_camp", "version_tenant");
    expect(versions.length).toBeGreaterThanOrEqual(2);
  });

  it("gets a specific version by id", () => {
    const versions = creativeVersionService.getVersions("version_camp", "version_tenant");
    const v = creativeVersionService.getVersion(versions[0].id, "version_tenant");
    expect(v).not.toBeUndefined();
    expect(v!.id).toBe(versions[0].id);
  });

  it("returns undefined for non-existent version", () => {
    const v = creativeVersionService.getVersion("non_existent_id", "version_tenant");
    expect(v).toBeUndefined();
  });

  it("deletes a version", () => {
    const versions = creativeVersionService.getVersions("version_camp", "version_tenant");
    const result = creativeVersionService.deleteVersion(versions[0].id, "version_tenant");
    expect(result).toBe(true);
    const after = creativeVersionService.getVersions("version_camp", "version_tenant");
    expect(after.length).toBe(versions.length - 1);
  });

  it("gets the latest version", () => {
    const v3 = creativeVersionService.createVersion("version_camp", "version_tenant", { headline: "Latest" });
    const latest = creativeVersionService.getLatestVersion("version_camp", "version_tenant");
    expect(latest).not.toBeUndefined();
    expect(latest!.id).toBe(v3.id);
  });

  it("diffs two versions", () => {
    const versions = creativeVersionService.getVersions("version_camp", "version_tenant");
    if (versions.length >= 2) {
      const diff = creativeVersionService.diff(versions[0].id, versions[1].id, "version_tenant");
      expect(diff).toHaveProperty("diffs");
      expect(diff).toHaveProperty("summary");
    }
  });

  it("analyzes rollback impact", () => {
    const versions = creativeVersionService.getVersions("version_camp", "version_tenant");
    if (versions.length > 0) {
      const result = creativeVersionService.analyzeRollback("version_camp", "version_tenant", versions[versions.length - 1].version);
      expect(result).toHaveProperty("changes");
      expect(result).toHaveProperty("riskLevel");
    }
  });

  it("performs semantic analysis on creative content", () => {
    const result = creativeVersionService.semanticAnalysis("version_camp", "version_tenant");
    expect(typeof result.totalVersions).toBe("number");
    expect(result).toHaveProperty("versionHistory");
  });

  it("computes change footprint between versions", () => {
    const versions = creativeVersionService.getVersions("version_camp", "version_tenant");
    if (versions.length >= 2) {
      const result = creativeVersionService.changeFootprint(versions[0].id, versions[1].id, "version_tenant");
      expect(result).toHaveProperty("totalChanges");
      expect(result.totalChanges).toBeGreaterThanOrEqual(0);
    }
  });
});
