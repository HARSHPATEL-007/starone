import { describe, it, expect } from "vitest";
import { mailDiscovery } from "../services/MailDiscoveryService";
import { mailCompliance } from "../services/MailComplianceService";
import { DataStore } from "../services/DataStore";

let counter = 0;
function tenant(): string {
  counter += 1;
  return `nova-mail13_${counter}`;
}

function seedMessage(t: string, id: string, subject: string, body: string, receivedAt = "2026-07-15T10:00:00.000Z") {
  DataStore.mem().insert("messages", {
    _id: id, tenantId: t, mailboxId: "mb1",
    from: { name: "Sender", email: "sender@n0va.test" }, to: [{ name: "Jane", email: "jane@n0va.test" }],
    subject, body, folder: "inbox", read: true, labels: [],
    receivedAt, sentAt: receivedAt,
  });
}

function seedDiscoveryTenant(): string {
  const t = tenant();
  seedMessage(t, "r13_contract", "Acme contract renewal terms", "The MSA renewal clause requires a signature from the counterparty before the SLA expires.");
  seedMessage(t, "r13_invoice", "Invoice #2044 payment due", "Your invoice shows an amount due of $4,200. The billing balance is overdue — please arrange payment.");
  seedMessage(t, "r13_finance", "Q3 budget forecast", "The revenue forecast shows spend above budget. ROI is tracking against the P&L for the quarter.");
  seedMessage(t, "r13_meeting", "Reschedule the sync", "Can we reschedule the meeting? I have availability on Thursday for the agenda walkthrough.");
  seedMessage(t, "r13_personal", "Weekend photos", "The vacation photos from the family trip are ready. Dinner on Saturday?");
  seedMessage(t, "r13_generic", "Hello there", "Just checking in. Hope everything is fine on your end.");
  seedMessage(t, "r13_subpoena", "Subpoena response from counsel", "Our attorney is preparing the discovery response for the lawsuit. The court deposition is next week.");
  return t;
}

describe("mailDiscovery concept search (§eDiscovery)", () => {
  it("clusters messages into concept groups", () => {
    const t = seedDiscoveryTenant();
    const r = mailDiscovery.conceptSearch(t, "");
    expect(r.total).toBe(7);
    expect(r.clusters.length).toBeGreaterThanOrEqual(5);
    const contract = r.clusters.find((c: any) => c.topic === "contract");
    expect(contract).toBeTruthy();
    expect(contract.count).toBe(1);
    expect(contract.messages[0].messageId).toBe("r13_contract");
    const invoice = r.clusters.find((c: any) => c.topic === "invoice");
    expect(invoice.messages[0].messageId).toBe("r13_invoice");
    expect(r.summary).toContain("clustered");
  });

  it("filters by query before clustering", () => {
    const t = seedDiscoveryTenant();
    const r = mailDiscovery.conceptSearch(t, "invoice");
    expect(r.total).toBe(1);
    expect(r.clusters[0].topic).toBe("invoice");
  });

  it("classifies legal mail under legal & litigation", () => {
    const t = seedDiscoveryTenant();
    const r = mailDiscovery.conceptSearch(t, "");
    const legal = r.clusters.find((c: any) => c.topic === "legal");
    expect(legal.messages.some((m: any) => m.messageId === "r13_subpoena")).toBe(true);
  });
});

describe("mailDiscovery privilege log (§eDiscovery)", () => {
  it("asserts privilege on an existing message", () => {
    const t = seedDiscoveryTenant();
    const r = mailDiscovery.markMessagePrivileged(t, "r13_subpoena", { type: "attorney_client", reason: "Attorney-client communication with outside counsel" });
    expect(r.privilegeId).toBeTruthy();
    expect(r.summary).toContain("Privilege asserted");
    const list = mailDiscovery.listPrivileges(t);
    expect(list.count).toBe(1);
    expect(list.privileges[0].typeLabel).toBe("Attorney-client communication");
    expect(list.privileges[0].subject).toBe("Subpoena response from counsel");
  });

  it("rejects missing messages, bad types and missing reasons", () => {
    const t = seedDiscoveryTenant();
    expect(() => mailDiscovery.markMessagePrivileged(t, "ghost", { type: "attorney_client", reason: "x" })).toThrow(/not found/);
    expect(() => mailDiscovery.markMessagePrivileged(t, "r13_contract", { type: "not_a_type", reason: "x" })).toThrow(/Unknown privilege type/);
    expect(() => mailDiscovery.markMessagePrivileged(t, "r13_contract", { type: "confidential" })).toThrow(/reason/);
  });

  it("prevents duplicate privilege assertions", () => {
    const t = seedDiscoveryTenant();
    mailDiscovery.markMessagePrivileged(t, "r13_contract", { type: "work_product", reason: "Attorney work product" });
    expect(() => mailDiscovery.markMessagePrivileged(t, "r13_contract", { type: "settlement", reason: "x" })).toThrow(/already privileged/);
  });

  it("removes privilege and summarizes by type", () => {
    const t = seedDiscoveryTenant();
    mailDiscovery.markMessagePrivileged(t, "r13_invoice", { type: "confidential", reason: "Commercial terms are confidential" });
    mailDiscovery.markMessagePrivileged(t, "r13_subpoena", { type: "attorney_client", reason: "With counsel" });
    const s = mailDiscovery.privilegeSummary(t);
    expect(s.total).toBe(2);
    const atc = s.byType.find((x: any) => x.type === "attorney_client") as any;
    expect(atc.count).toBe(1);
    const rm = mailDiscovery.removePrivilege(t, "r13_invoice");
    expect(rm.summary).toContain("Privilege removed");
    expect(mailDiscovery.listPrivileges(t).count).toBe(1);
    expect(() => mailDiscovery.removePrivilege(t, "r13_invoice")).toThrow(/No active privilege/);
  });
});

describe("mailDiscovery export audit chain (§eDiscovery)", () => {
  it("stamps a hash chain across exports", () => {
    const t = seedDiscoveryTenant();
    const e1 = mailDiscovery.createExport(t, { name: "First export", format: "csv", scope: { folder: "inbox" } });
    const e2 = mailDiscovery.createExport(t, { name: "Second export", format: "csv", scope: { folder: "inbox" } });
    expect(e1.chainHash).toBeTruthy();
    expect(e1.previousHash).toBe("GENESIS");
    expect(e2.previousHash).toBe(e1.chainHash);
    const chain = mailDiscovery.exportAuditChain(t);
    expect(chain.length).toBe(2);
    expect(chain.chainIntact).toBe(true);
    expect(chain.entries[1].verified).toBe(true);
    expect(chain.summary).toContain("intact");
  });

  it("detects tampering in the chain", () => {
    const t = seedDiscoveryTenant();
    const e1 = mailDiscovery.createExport(t, { name: "First export", format: "csv", scope: { folder: "inbox" } });
    mailDiscovery.createExport(t, { name: "Second export", format: "csv", scope: { folder: "inbox" } });
    DataStore.mem().update("mail_exports", (x: any) => x._id === e1.exportId, { download: { filename: "tampered.csv", content: "altered content" } });
    const chain = mailDiscovery.exportAuditChain(t);
    expect(chain.chainIntact).toBe(false);
    expect(chain.brokenAt).toBe(e1.exportId);
    expect(chain.entries.find((x: any) => x.exportId === e1.exportId)?.verified).toBe(false);
  });

  it("surfaces chain state in the discovery summary", () => {
    const t = seedDiscoveryTenant();
    mailDiscovery.createExport(t, { name: "First export", format: "csv", scope: { folder: "inbox" } });
    const s = mailDiscovery.discoverySummary(t);
    expect(s.exports).toBe(1);
    expect(s.chainIntact).toBe(true);
    expect(s.privileged).toBe(0);
  });
});

describe("mailCompliance legal hold calendar (§compliance)", () => {
  it("builds a 42-cell calendar with hold events", () => {
    const t = tenant();
    mailCompliance.placeHold(t, { subject: "litigation", reason: "Aug 2026 litigation", startDate: "2026-08-05T00:00:00.000Z", endDate: "2026-08-20T00:00:00.000Z" });
    const cal = mailCompliance.legalHoldCalendar(t, "2026-08");
    expect(cal.cells.length).toBe(42);
    expect(cal.activeHolds).toBe(1);
    expect(cal.placedThisMonth).toBe(1);
    const placed = cal.cells.find((c: any) => c.date === "2026-08-05");
    expect(placed.events.some((e: any) => e.type === "placed" && e.subject === "litigation")).toBe(true);
    const expiring = cal.cells.find((c: any) => c.date === "2026-08-20");
    expect(expiring.events.some((e: any) => e.type === "expiring")).toBe(true);
    const between = cal.cells.find((c: any) => c.date === "2026-08-10");
    expect(between.events.some((e: any) => e.type === "active")).toBe(true);
  });

  it("flags holds expiring within 7 days", () => {
    const t = tenant();
    const soon = new Date(Date.now() + 2 * 86400000).toISOString();
    mailCompliance.placeHold(t, { subject: "urgent", reason: "Expires soon", expiresAt: soon });
    const cal = mailCompliance.legalHoldCalendar(t);
    expect(cal.expiringSoon.length).toBe(1);
    expect(cal.expiringSoon[0].subject).toBe("urgent");
  });

  it("rejects invalid month formats", () => {
    const t = tenant();
    expect(() => mailCompliance.legalHoldCalendar(t, "Aug-2026")).toThrow(/Invalid month/);
    expect(() => mailCompliance.legalHoldCalendar(t, "2026-13")).toThrow(/Invalid month/);
  });

  it("excludes released holds from the calendar timeline", () => {
    const t = tenant();
    const today = new Date().toISOString();
    const h = mailCompliance.placeHold(t, { subject: "old case", reason: "Resolved", startDate: new Date(Date.now() - 2 * 86400000).toISOString(), endDate: today });
    const cal = mailCompliance.legalHoldCalendar(t);
    expect(cal.activeHolds).toBe(1);
    mailCompliance.releaseHold(t, h.holdId);
    const cal2 = mailCompliance.legalHoldCalendar(t);
    expect(cal2.activeHolds).toBe(0);
    const todayStr = today.slice(0, 10);
    expect(cal2.cells.find((c: any) => c.date === todayStr)?.events.some((e: any) => e.type === "released")).toBe(true);
  });
});

describe("mailCompliance report packs (§compliance)", () => {
  it("builds a GDPR report with deterministic checks", () => {
    const t = tenant();
    const r = mailCompliance.complianceReport(t, "GDPR");
    expect(r.framework).toBe("GDPR");
    expect(r.checks.length).toBe(5);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(["pass", "warn", "fail"].includes(r.status)).toBe(true);
    expect((r.checks.find((c: any) => c.key === "retention") as any).status).toBe("fail");
    expect(r.summary).toContain("GDPR posture");
  });

  it("rejects unknown frameworks", () => {
    const t = tenant();
    expect(() => mailCompliance.complianceReport(t, "SOX")).toThrow(/Unknown compliance framework/);
  });

  it("builds the 3-framework pack with an average", () => {
    const t = tenant();
    const pack = mailCompliance.complianceReports(t);
    expect(pack.reports.length).toBe(3);
    expect(pack.reports.map((r: any) => r.framework).sort()).toEqual(["CCPA", "GDPR", "HIPAA"]);
    expect(pack.average).toBeGreaterThanOrEqual(0);
    expect(pack.summary).toContain("average");
  });

  it("exports a report pack that joins the export audit chain", () => {
    const t = seedDiscoveryTenant();
    const e1 = mailDiscovery.createExport(t, { name: "ED export", format: "csv", scope: { folder: "inbox" } });
    const r = mailCompliance.exportComplianceReport(t, "GDPR");
    expect(r.exportId).toBeTruthy();
    expect(r.download.content).toContain("GDPR");
    expect(r.summary).toContain("exported");
    const chain = mailDiscovery.exportAuditChain(t);
    expect(chain.length).toBe(2);
    expect(chain.chainIntact).toBe(true);
    const comp = chain.entries.find((x: any) => x.exportId === r.exportId) as any;
    expect(comp).toBeTruthy();
    expect(comp.kind).toBe("compliance_report");
    expect(comp.previousHash).toBe(e1.chainHash);
    expect(comp.verified).toBe(true);
  });

  it("audits report exports", () => {
    const t = tenant();
    mailCompliance.exportComplianceReport(t, "HIPAA");
    const log = mailCompliance.auditLog(t);
    expect(log.log.some((l: any) => l.action === "compliance_report_export")).toBe(true);
  });
});
