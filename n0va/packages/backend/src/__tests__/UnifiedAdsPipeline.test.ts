import { describe, it, expect, beforeAll } from "vitest";
import { unifiedAdsPipeline } from "../services/UnifiedAdsPipelineService";
import { DataStore } from "../services/DataStore";

const TEST_TENANT = "test_uap_tenant";

beforeAll(() => {
  const mem = DataStore["mem"]();
  for (let i = 0; i < 2; i++) {
    mem.insert("campaigns", {
      name: `UAP Camp ${i}`,
      tenantId: TEST_TENANT,
      status: "active",
      budget: { daily: 100, lifetime: 3000, spent: 500 + i * 200, remaining: 2500 - i * 200, currency: "USD" },
      metrics: { impressions: 10000 + i * 2000, clicks: 200 + i * 50, conversions: 10 + i * 3, revenue: 800 + i * 200, spend: 500 + i * 200 },
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    });
  }
});

describe("UnifiedAdsPipeline - initialize", () => {
  it("creates a pipeline for a valid campaign", () => {
    const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
    const pipe = unifiedAdsPipeline.initializePipeline(campaigns[0]._id, TEST_TENANT);
    expect(pipe).not.toBeNull();
    expect(pipe!.currentStage).toBe("draft");
    expect(pipe!.status).toBe("on_track");
    expect(pipe!.events.length).toBe(1);
  });

  it("returns null for non-existent campaign", () => {
    const pipe = unifiedAdsPipeline.initializePipeline("nonexistent", TEST_TENANT);
    expect(pipe).toBeNull();
  });
});

describe("UnifiedAdsPipeline - getPipeline", () => {
  it("retrieves a pipeline by id", () => {
    const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
    const created = unifiedAdsPipeline.initializePipeline(campaigns[0]._id, TEST_TENANT)!;
    const retrieved = unifiedAdsPipeline.getPipeline(created.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(created.id);
  });
});

describe("UnifiedAdsPipeline - listPipelines", () => {
  it("lists pipelines for a tenant", () => {
    const list = unifiedAdsPipeline.listPipelines(undefined, TEST_TENANT);
    expect(list.length).toBeGreaterThan(0);
  });
});

describe("UnifiedAdsPipeline - configure and advance", () => {
  it("configures a pipeline step", () => {
    const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
    const pipe = unifiedAdsPipeline.initializePipeline(campaigns[0]._id, TEST_TENANT)!;
    const configured = unifiedAdsPipeline.configureStep(pipe.id, { budget: 5000, targeting: "auto", creative: "v1" });
    expect(configured).not.toBeNull();
    expect(configured!.config.budget).toBe(5000);
  });

  it("advances to next stage", () => {
    const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
    const pipe = unifiedAdsPipeline.initializePipeline(campaigns[0]._id, TEST_TENANT)!;
    const advanced = unifiedAdsPipeline.advanceStage(pipe.id);
    expect(advanced).not.toBeNull();
    expect(advanced!.pipeline.currentStage).toBe("configuring");
    expect(advanced!.requirements.stage).toBe("configuring");
  });
});

describe("UnifiedAdsPipeline - activation checks", () => {
  it("runs activation checks", () => {
    const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
    const pipe = unifiedAdsPipeline.initializePipeline(campaigns[0]._id, TEST_TENANT)!;
    unifiedAdsPipeline.configureStep(pipe.id, { budget: 5000, targeting: "auto" });
    const checks = unifiedAdsPipeline.runActivationChecks(pipe.id);
    expect(checks).not.toBeNull();
    expect(checks!.checks.length).toBeGreaterThan(0);
    expect(typeof checks!.passed).toBe("boolean");
  });
});

describe("UnifiedAdsPipeline - monitoring", () => {
  it("runs monitoring checks", () => {
    const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
    const pipe = unifiedAdsPipeline.initializePipeline(campaigns[0]._id, TEST_TENANT)!;
    const monitor = unifiedAdsPipeline.runMonitoringCheck(pipe.id);
    expect(monitor).not.toBeNull();
    expect(monitor!.metrics.length).toBeGreaterThan(0);
  });
});

describe("UnifiedAdsPipeline - optimization", () => {
  it("runs optimization cycle", () => {
    const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
    const pipe = unifiedAdsPipeline.initializePipeline(campaigns[0]._id, TEST_TENANT)!;
    const opt = unifiedAdsPipeline.runOptimizationCycle(pipe.id);
    expect(opt).not.toBeNull();
    expect(opt!.actions.length).toBeGreaterThanOrEqual(0);
    expect(opt!.expectedROASImprovement).toBeGreaterThanOrEqual(0);
  });
});

describe("UnifiedAdsPipeline - report and timeline", () => {
  it("generates a pipeline report", () => {
    const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
    const pipe = unifiedAdsPipeline.initializePipeline(campaigns[0]._id, TEST_TENANT)!;
    const report = unifiedAdsPipeline.generatePipelineReport(pipe.id);
    expect(report).not.toBeNull();
    expect(report!.pipelineId).toBe(pipe.id);
    expect(report!.stagesCompleted.length).toBeGreaterThanOrEqual(0);
  });

  it("retrieves pipeline timeline", () => {
    const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
    const pipe = unifiedAdsPipeline.initializePipeline(campaigns[0]._id, TEST_TENANT)!;
    const timeline = unifiedAdsPipeline.getPipelineTimeline(pipe.id);
    expect(timeline).not.toBeNull();
    expect(timeline!.events.length).toBeGreaterThan(0);
  });
});

describe("UnifiedAdsPipeline - archive", () => {
  it("archives a pipeline", () => {
    const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
    const pipe = unifiedAdsPipeline.initializePipeline(campaigns[0]._id, TEST_TENANT)!;
    const archived = unifiedAdsPipeline.archivePipeline(pipe.id);
    expect(archived).not.toBeNull();
    expect(archived!.currentStage).toBe("archived");
    expect(archived!.status).toBe("completed");
  });
});

describe("UnifiedAdsPipeline - health and validation", () => {
  it("checks pipeline health", () => {
    const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
    const pipe = unifiedAdsPipeline.initializePipeline(campaigns[0]._id, TEST_TENANT)!;
    const health = unifiedAdsPipeline.getPipelineHealth(pipe.id);
    expect(health).not.toBeNull();
    expect(health!.overallScore).toBeGreaterThanOrEqual(0);
  });

  it("validates a pipeline", () => {
    const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
    const pipe = unifiedAdsPipeline.initializePipeline(campaigns[0]._id, TEST_TENANT)!;
    const validation = unifiedAdsPipeline.validatePipeline(pipe.id);
    expect(validation).not.toBeNull();
    expect(typeof validation!.valid).toBe("boolean");
  });
});

describe("UnifiedAdsPipeline - rollback", () => {
  it("rolls back to previous stage", () => {
    const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
    const pipe = unifiedAdsPipeline.initializePipeline(campaigns[0]._id, TEST_TENANT)!;
    unifiedAdsPipeline.advanceStage(pipe.id);
    const rolledBack = unifiedAdsPipeline.rollbackStage(pipe.id);
    expect(rolledBack).not.toBeNull();
    expect(rolledBack!.currentStage).toBe("draft");
  });
});

describe("UnifiedAdsPipeline - getStageRequirements", () => {
  it("returns requirements for any stage", () => {
    const req = unifiedAdsPipeline.getStageRequirements("activating");
    expect(req.stage).toBe("activating");
    expect(req.required.length).toBeGreaterThan(0);
    expect(req.optional.length).toBeGreaterThanOrEqual(0);
  });
});
