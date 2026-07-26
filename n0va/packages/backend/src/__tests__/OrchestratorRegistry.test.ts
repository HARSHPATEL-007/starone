import { describe, it, expect } from "vitest";
import { OrchestratorRegistry, orchestratorRegistry } from "../business-logic/OrchestratorRegistry";

describe("OrchestratorRegistry", () => {
  it("has 57 registered orchestrators", () => {
    const all = orchestratorRegistry.getAll();
    const health = orchestratorRegistry.getHealth();
    expect(all.length).toBe(57);
    expect(health.total).toBe(57);
  });

  it("returns orchestrators grouped by domain", () => {
    const campaign = orchestratorRegistry.getByDomain("campaign");
    expect(campaign.length).toBeGreaterThan(0);
    for (const entry of campaign) {
      expect(entry.domain).toBe("campaign");
    }
  });

  it("returns health stats", () => {
    const health = orchestratorRegistry.getHealth();
    expect(health).toHaveProperty("total");
    expect(health).toHaveProperty("sync");
    expect(health).toHaveProperty("async");
    expect(health).toHaveProperty("domains");
    expect(health).toHaveProperty("status");
    expect(health.status).toBe("healthy");
    expect(health.domains).toBeGreaterThan(0);
    expect(health.total).toBe(health.sync + health.async);
  });

  it("registers entries with name, domain, and methods", () => {
    const all = orchestratorRegistry.getAll();
    for (const entry of all) {
      expect(entry).toHaveProperty("name");
      expect(entry).toHaveProperty("domain");
      expect(entry).toHaveProperty("methods");
      expect(Array.isArray(entry.methods)).toBe(true);
      expect(entry.methods.length).toBeGreaterThan(0);
    }
  });

  it("allows creating a fresh registry", () => {
    const reg = new OrchestratorRegistry();
    expect(reg.getCount()).toBe(0);
    reg.register("TestOrch", "test", ["doStuff"]);
    expect(reg.getCount()).toBe(1);
    expect(reg.getByDomain("test").length).toBe(1);
    expect(reg.getByDomain("other").length).toBe(0);
    expect(reg.getHealth().total).toBe(1);
  });
});
