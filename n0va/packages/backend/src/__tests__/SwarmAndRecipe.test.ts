import { describe, it, expect, beforeAll } from "vitest";
import { AgentSwarmService } from "../services/AgentSwarmService";
import { RecipeCompilationService } from "../services/RecipeCompilationService";
import { HyperContextService } from "../services/HyperContextService";
import { AgentSwarmOrchestrator } from "../business-logic/AgentSwarmOrchestrator";
import { RecipeCompilationOrchestrator } from "../business-logic/RecipeCompilationOrchestrator";
import { MemoryStore } from "../services/MemoryStore";
import { orchestratorRegistry } from "../business-logic/OrchestratorRegistry";

const TENANT_ID = "tenant_test_swarm";

describe("AgentSwarmService", () => {
  const service = new AgentSwarmService();

  beforeAll(() => { MemoryStore.getInstance(); });

  it("executes a basic agent action successfully", async () => {
    const result = await service.executeAgentAction(TENANT_ID, "Budget Agent", "budget", "reallocate", "google_ads", { amount: 1000 }, 0);
    expect(result).toHaveProperty("id");
    expect(result.status).toBe("completed");
    expect(result.agentName).toBe("Budget Agent");
    expect(result.hitlRequired).toBe(false);
  });

  it("blocks execution with HITL when threshold exceeded", async () => {
    const result = await service.executeAgentAction(TENANT_ID, "Budget Agent", "budget", "reallocate", "meta_ads", { amount: 50000 }, 10000);
    expect(result.status).toBe("hitl_blocked");
    expect(result.hitlRequired).toBe(true);
  });

  it("resolves HITL requests", async () => {
    const result = await service.executeAgentAction(TENANT_ID, "Creative Agent", "creative", "generate", "meta_ads", { amount: 25000 }, 10000);
    expect(result.status).toBe("hitl_blocked");

    const resolved = await service.resolveHITL(result.id, true, "admin@test.com");
    expect(resolved).not.toBeNull();
    expect(resolved!.status).toBe("approved");
    expect(resolved!.approver).toBe("admin@test.com");
  });

  it("rejects HITL requests", async () => {
    const result = await service.executeAgentAction(TENANT_ID, "Audience Agent", "audience", "expand", "google_ads", { amount: 30000, segmentSize: 100000 }, 15000);
    expect(result.status).toBe("hitl_blocked");

    const resolved = await service.resolveHITL(result.id, false, "admin@test.com");
    expect(resolved).not.toBeNull();
    expect(resolved!.status).toBe("rejected");
  });

  it("returns HITL queue with pending requests", async () => {
    const queue = service.getHITLQueue();
    expect(Array.isArray(queue)).toBe(true);
  });

  it("returns swarm status with agent info", async () => {
    const status = service.getSwarmStatus(TENANT_ID);
    expect(status).toHaveProperty("swarmId");
    expect(status).toHaveProperty("agents");
    expect(status).toHaveProperty("recentExecutions");
    expect(status).toHaveProperty("pendingHITL");
    expect(status).toHaveProperty("totalExecutionsToday");
    expect(status).toHaveProperty("swarmHealth");
    expect(Array.isArray(status.agents)).toBe(true);
    expect(Array.isArray(status.recentExecutions)).toBe(true);
    expect(Array.isArray(status.pendingHITL)).toBe(true);
  });

  it("generates cross-module output for budget agent", async () => {
    const result = await service.executeAgentAction(TENANT_ID, "Budget Agent", "budget", "reallocate", "google_ads", { amount: 2000 }, 0);
    expect(result.crossModuleOutput).toHaveProperty("sheets_update");
    expect(result.crossModuleOutput).not.toHaveProperty("task_create");
  });

  it("generates cross-module output for creative agent", async () => {
    const result = await service.executeAgentAction(TENANT_ID, "Creative Agent", "creative", "generate", "meta_ads", { variantCount: 3 }, 0);
    expect(result.crossModuleOutput).toHaveProperty("task_create");
    expect(result.crossModuleOutput).toHaveProperty("docs_update");
  });

  it("generates cross-module output for fraud agent", async () => {
    const result = await service.executeAgentAction(TENANT_ID, "Fraud Agent", "fraud", "investigate", "google_ads", { flaggedCount: 3 }, 0);
    expect(result.crossModuleOutput).toHaveProperty("task_create");
    expect(result.crossModuleOutput).toHaveProperty("chat_alert");
  });

  it("generates legal hold for high fraud flags", async () => {
    const result = await service.executeAgentAction(TENANT_ID, "Fraud Agent", "fraud", "investigate", "meta_ads", { flaggedCount: 10 }, 0);
    expect(result.crossModuleOutput).toHaveProperty("vault_legal_hold");
  });
});

describe("RecipeCompilationService", () => {
  const service = new RecipeCompilationService();

  it("compiles a recipe definition", () => {
    const recipe = {
      name: "test_roas_alert",
      description: "Test ROAS drop alert",
      trigger: { type: "metric_drop", metric: "roas", threshold: 3.5, direction: "below" as const, window: "4h" },
      actions: [{ platform: "google_ads", action: "pause_campaign", params: { reason: "roas_drop" } }],
      hitlGate: { field: "amount", maxValue: 5000 },
      auditLevel: "basic" as const,
      isCompiled: true,
    };

    const compiled = service.compile(recipe);
    expect(compiled).toHaveProperty("name", "test_roas_alert");
    expect(compiled).toHaveProperty("hash");
    expect(compiled.hash.length).toBe(16);
    expect(compiled).toHaveProperty("bytecode");
    expect(compiled.bytecode).toContain("RECIPE_v2");
    expect(compiled).toHaveProperty("compiledAt");
    expect(compiled.executionCount).toBe(0);
    expect(compiled.avgLatencyMs).toBe(0);
  });

  it("stores compiled recipes and returns them", () => {
    const all = service.getAllCompiled();
    const compiled = all.find((c) => c.name === "test_roas_alert");
    expect(compiled).toBeDefined();
  });

  it("retrieves a compiled recipe by name", () => {
    const compiled = service.getCompiled("test_roas_alert");
    expect(compiled).toBeDefined();
    expect(compiled!.name).toBe("test_roas_alert");
  });

  it("compiles multiple recipes", () => {
    service.compile({
      name: "test_ctr_alert",
      description: "CTR drop alert",
      trigger: { type: "metric_drop", metric: "ctr", threshold: 2.0, direction: "below" as const, window: "6h" },
      actions: [{ platform: "meta_ads", action: "adjust_creative", params: { urgency: "high" } }],
      auditLevel: "full" as const,
      isCompiled: true,
    });

    const all = service.getAllCompiled();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it("returns execution history", () => {
    const history = service.getExecutionHistory();
    expect(Array.isArray(history)).toBe(true);
  });

  it("generates bytecode with proper structure", () => {
    const compiled = service.getCompiled("test_ctr_alert");
    expect(compiled).toBeDefined();
    expect(compiled!.bytecode).toContain("RECIPE_v2");
    expect(compiled!.bytecode).toContain("|");
  });
});

describe("HyperContextService", () => {
  const service = new HyperContextService();

  it("creates hyper-context links", () => {
    const links = service.link(TENANT_ID, "campaign", "camp_001", [
      { module: "tasks", entityType: "task", entityId: "task_001", description: "Review campaign", url: "/tasks/task_001" },
      { module: "docs", entityType: "doc", entityId: "doc_001", description: "Campaign brief", url: "/docs/doc_001" },
    ]);
    expect(links.length).toBe(2);
    expect(links[0]).toHaveProperty("linkedAt");
    expect(links[0].module).toBe("tasks");
  });

  it("retrieves links by entity", () => {
    const links = service.getLinks(TENANT_ID, "campaign", "camp_001");
    expect(links.length).toBe(2);
  });

  it("retrieves links by module", () => {
    const links = service.getLinksByModule(TENANT_ID, "tasks");
    expect(links.length).toBe(1);
    expect(links[0].entityId).toBe("task_001");
  });

  it("links campaign to tasks", () => {
    const links = service.linkCampaignToTasks(TENANT_ID, "camp_002", "Summer Campaign", ["Create ad sets", "Review targeting"]);
    expect(links.length).toBe(2);
    expect(links[0].module).toBe("tasks");
  });

  it("links campaign to calendar", () => {
    const links = service.linkCampaignToCalendar(TENANT_ID, "camp_002", "Summer Campaign", [{ title: "Launch Day", date: "2026-08-01" }]);
    expect(links.length).toBe(1);
    expect(links[0].module).toBe("calendar");
  });

  it("links campaign to docs", () => {
    const links = service.linkCampaignToDocs(TENANT_ID, "camp_002", "Creative Brief");
    expect(links.length).toBe(1);
    expect(links[0].module).toBe("docs");
  });

  it("links campaign to chat", () => {
    const links = service.linkCampaignToChat(TENANT_ID, "camp_002", "Campaign War Room");
    expect(links.length).toBe(1);
    expect(links[0].module).toBe("chat");
  });

  it("links campaign to CRM", () => {
    const links = service.linkCampaignToCRM(TENANT_ID, "camp_002");
    expect(links.length).toBe(1);
    expect(links[0].module).toBe("crm");
  });

  it("links campaign to finance", () => {
    const links = service.linkCampaignToFinance(TENANT_ID, "camp_002", 15000);
    expect(links.length).toBe(1);
    expect(links[0].module).toBe("finance");
  });

  it("returns aggregated campaign hyper-context", () => {
    const context = service.getCampaignHyperContext(TENANT_ID, "camp_002");
    expect(context).toHaveProperty("tasks");
    expect(context).toHaveProperty("calendar");
    expect(context).toHaveProperty("docs");
    expect(context).toHaveProperty("chat");
    expect(context).toHaveProperty("crm");
    expect(context).toHaveProperty("finance");
  });

  it("returns connected module list", () => {
    const modules = service.getConnectedModules(TENANT_ID, "camp_002");
    expect(modules).toContain("tasks");
    expect(modules).toContain("finance");
    expect(modules.length).toBe(6);
  });

  it("dispatches cross-module actions", () => {
    const action = service.dispatchCrossModuleAction(TENANT_ID, "campaign", "campaign", "camp_001", "tasks", "task", { title: "Follow up" });
    expect(action).toHaveProperty("actionId");
    expect(action.status).toBe("completed");
    expect(action.sourceModule).toBe("campaign");
    expect(action.targetModule).toBe("tasks");
  });
});

describe("AgentSwarmOrchestrator", () => {
  const orchestrator = new AgentSwarmOrchestrator();

  it("returns dashboard with swarm status", async () => {
    const dashboard = await orchestrator.getDashboard(TENANT_ID);
    expect(dashboard).toHaveProperty("swarmId");
    expect(dashboard).toHaveProperty("agents");
    expect(dashboard).toHaveProperty("agentCount");
    expect(dashboard).toHaveProperty("byType");
    expect(dashboard).toHaveProperty("byStatus");
    expect(dashboard).toHaveProperty("generatedAt");
  });

  it("executes actions via orchestrator", async () => {
    const result = await orchestrator.executeAction(TENANT_ID, "Bid Agent", "bid", "adjust_bid", "google_ads", { bidChange: 0.15 }, 0);
    expect(result).toHaveProperty("id");
    expect(result.status).toBe("completed");
  });

  it("returns HITL queue via orchestrator", async () => {
    const queue = await orchestrator.getHITLQueue();
    expect(Array.isArray(queue)).toBe(true);
  });

  it("resolves HITL via orchestrator", async () => {
    const exec = await orchestrator.executeAction(TENANT_ID, "Fraud Agent", "fraud", "block", "meta_ads", { amount: 50000 }, 10000);
    expect(exec.status).toBe("hitl_blocked");

    const resolved = await orchestrator.resolveHITL(exec.id, true, "admin@test.com");
    expect(resolved).not.toBeNull();
    expect(resolved!.status).toBe("approved");
  });

  it("returns execution history via orchestrator", async () => {
    const history = await orchestrator.getExecutionHistory(TENANT_ID);
    expect(Array.isArray(history)).toBe(true);
  });
});

describe("RecipeCompilationOrchestrator", () => {
  const orchestrator = new RecipeCompilationOrchestrator();

  beforeAll(async () => {
    await orchestrator.compileRecipe({
      name: "orchestrator_roas_alert",
      description: "ROAS alert via orchestrator",
      trigger: { type: "metric_drop", metric: "roas", threshold: 2.5, direction: "below", window: "4h" },
      actions: [{ platform: "google_ads", action: "pause", params: {} }],
      auditLevel: "full",
      isCompiled: true,
    });
  });

  it("compiles a recipe", async () => {
    const compiled = await orchestrator.compileRecipe({
      name: "orchestrator_spend_alert",
      description: "Spend alert via orchestrator",
      trigger: { type: "budget", metric: "spend", threshold: 10000, direction: "above", window: "1h" },
      actions: [{ platform: "meta_ads", action: "cap_spend", params: { max: 5000 } }],
      auditLevel: "basic",
      isCompiled: true,
    });
    expect(compiled.name).toBe("orchestrator_spend_alert");
    expect(compiled.hash).toBeTruthy();
  });

  it("returns all compiled recipes", async () => {
    const all = await orchestrator.getAllCompiled();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it("gets compiled recipe by name", async () => {
    const compiled = await orchestrator.getCompiled("orchestrator_roas_alert");
    expect(compiled).toBeDefined();
    expect(compiled!.name).toBe("orchestrator_roas_alert");
  });

  it("returns empty for missing compiled recipe", async () => {
    const compiled = await orchestrator.getCompiled("nonexistent");
    expect(compiled).toBeUndefined();
  });

  it("returns execution history", async () => {
    const history = await orchestrator.getExecutionHistory(10);
    expect(Array.isArray(history)).toBe(true);
  });

  it("returns dashboard", async () => {
    const dashboard = await orchestrator.getDashboard(TENANT_ID);
    expect(dashboard).toHaveProperty("totalRecipes");
    expect(dashboard).toHaveProperty("compiledCount");
    expect(dashboard).toHaveProperty("executedCount");
    expect(dashboard).toHaveProperty("compiledSchemas");
    expect(dashboard).toHaveProperty("generatedAt");
  });

  it("returns dashboard with correct counts", async () => {
    const dashboard = await orchestrator.getDashboard(TENANT_ID);
    expect(dashboard.compiledCount).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(dashboard.compiledSchemas)).toBe(true);
  });
});

describe("OrchestratorRegistry (new entries)", () => {
  it("registers AgentSwarmOrchestrator", () => {
    const entry = orchestratorRegistry.getByDomain("automation").find((e) => e.name === "AgentSwarmOrchestrator");
    expect(entry).toBeDefined();
    expect(entry!.methods).toContain("getDashboard");
    expect(entry!.methods).toContain("resolveHITL");
  });

  it("registers RecipeCompilationOrchestrator", () => {
    const entry = orchestratorRegistry.getByDomain("automation").find((e) => e.name === "RecipeCompilationOrchestrator");
    expect(entry).toBeDefined();
    expect(entry!.methods).toContain("compileRecipe");
    expect(entry!.methods).toContain("getDashboard");
  });

  it("increases registry count", () => {
    const health = orchestratorRegistry.getHealth();
    expect(health.total).toBeGreaterThanOrEqual(65);
  });
});
