import { describe, it, expect, beforeAll } from "vitest";
import { DataStore } from "../services/DataStore";
import { n0va1oExec } from "../services/N0VA1OExecutionService";
import { n0va1oAudit } from "../services/N0VA1OAuditService";
import { AdsMarketingModuleService } from "../services/AdsMarketingModuleService";

const T = "nova53";
const T2 = "nova53b";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

let module: AdsMarketingModuleService;

beforeAll(() => {
  DataStore.mem().insert("n0va1o_state", { tenantId: T, plan: "growth", createdAt: new Date().toISOString() });
  DataStore.mem().insert("n0va1o_state", { tenantId: T2, plan: "growth", createdAt: new Date().toISOString() });
  module = new AdsMarketingModuleService();
});

describe("Round 53 — VFS ops surfaced via module delegations", () => {
  it("vfsAwkProcess delegation passes through with guards", () => {
    const put: any = n0va1oExec.putFile(T, {
      filename: "r53_revenue.csv",
      sizeBytes: 4096,
      content: "name,dept,amount\nalice,eng,10\nbob,sales,20\ncarol,eng,30",
    });
    const files: any = n0va1oExec.listFiles(T);
    const file = files.files.find((f: any) => f.fileId === put.fileId);
    const sum: any = module.n0va1oVfsAwkProcess(T, file.fileId, "sum $3");
    expect(sum.fileId).toBe(file.fileId);
    expect(sum.output[0]).toBe("sum = 60 (3 numeric value(s))");
    const print: any = module.n0va1oVfsAwkProcess(T, file.fileId, "print $1");
    expect(print.output).toContain("alice");
    expect(() => module.n0va1oVfsAwkProcess(T, file.fileId, "")).toThrow(/program is required/);
    expect(() => module.n0va1oVfsAwkProcess(T, "fl_missing", "sum $1")).toThrow("File not found");
  });

  it("vfsConvertFormat delegation converts CSV→JSON with source sniffing", () => {
    const put: any = n0va1oExec.putFile(T, {
      filename: "r53_ledger.csv",
      sizeBytes: 512,
      content: "id,owner\na1,jane\na2,john",
    });
    const files: any = n0va1oExec.listFiles(T);
    const file = files.files.find((f: any) => f.fileId === put.fileId);
    const conv: any = module.n0va1oVfsConvertFormat(T, file.fileId, "json");
    expect(conv.sourceFormat).toBe("csv");
    expect(conv.targetFormat).toBe("json");
    expect(conv.preview).toContain("jane");
    expect(conv.summary).toContain("CSV → JSON");
    expect(() => module.n0va1oVfsConvertFormat(T, file.fileId, "xml")).toThrow(/targetFormat must be one of/);
  });

  it("vfsStreamExport delegation chunks deterministically with clamping", () => {
    const put: any = n0va1oExec.putFile(T, { filename: "r53_big.txt", sizeBytes: 4096, content: "payload" });
    const files: any = n0va1oExec.listFiles(T);
    const file = files.files.find((f: any) => f.fileId === put.fileId);
    const exp: any = module.n0va1oVfsStreamExport(T, file.fileId, { chunkSize: 64 });
    expect(exp.exportId).toMatch(/^exp_/);
    expect(exp.chunkSize).toBe(4096);
    expect(exp.totalChunks).toBe(1);
    expect(exp.transferBytes).toBe(4096);
    expect(exp.destination).toContain("vfs://exports/");
    const exp2: any = module.n0va1oVfsStreamExport(T, file.fileId, {});
    expect(exp2.chunkSize).toBe(65536);
    expect(exp2.exportId).toMatch(/^exp_/);
  });
});

describe("Round 53 — directory pulse (real-time lifecycle sync)", () => {
  it("simulateDirectoryPulse is deterministic per tenant + email", () => {
    const p1: any = module.n0va1oSimulateDirectoryPulse(T, "ana@n0va.io");
    const p2: any = module.n0va1oSimulateDirectoryPulse(T, "ana@n0va.io");
    expect(p1.heartbeatMs).toBe(p2.heartbeatMs);
    expect(p1.syncLatencyMs).toBe(p2.syncLatencyMs);
    expect(p1.heartbeatMs).toBe(30 + (hashStr(`${T}|ana@n0va.io|pulse`) % 240));
    expect(p1.identity.directoryId).toMatch(/^dir_/);
    expect(p1.nextSyncS).toBe(30);
    expect(p1.summary).toContain("real-time lifecycle sync armed");
  });

  it("different emails produce different pulses", () => {
    const a: any = module.n0va1oSimulateDirectoryPulse(T, "ana@n0va.io");
    const b: any = module.n0va1oSimulateDirectoryPulse(T, "bob@n0va.io");
    expect(a.identity.directoryId).not.toBe(b.identity.directoryId);
  });

  it("pulse works on a second tenant without cross-talk", () => {
    const a: any = module.n0va1oSimulateDirectoryPulse(T2, "ana@n0va.io");
    const b: any = module.n0va1oSimulateDirectoryPulse(T, "ana@n0va.io");
    expect(a.heartbeatMs).not.toBe(b.heartbeatMs);
    expect(a.identity.directoryId).not.toBe(b.identity.directoryId);
  });
});

describe("Round 53 — audit center depth", () => {
  it("auditDashboard exposes policy + retention + chain + directory", () => {
    const d: any = n0va1oAudit.auditDashboard(T2);
    expect(d.policy.retentionDays).toBeGreaterThanOrEqual(1);
    expect(typeof d.retention.retentionEnabled).toBe("boolean");
    expect(d.chain.chainIntact).toBe(true);
    expect(d.directory.groups).toBeDefined();
    expect(d.summary).toContain("Audit — chain");
  });

  it("directoryDashboard lists groups + users with counts", () => {
    const dd: any = n0va1oAudit.directoryDashboard(T2);
    expect(dd.groups).toBeDefined();
    expect(typeof dd.activeUsers).toBe("number");
    expect(dd.summary).toContain("group(s)");
  });
});
