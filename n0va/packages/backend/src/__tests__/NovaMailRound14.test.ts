import { describe, it, expect } from "vitest";
import { mailQuantum } from "../services/MailQuantumService";
import { mailCollab2 } from "../services/MailCollabV2Service";
import { DataStore } from "../services/DataStore";

let counter = 0;
function tenant(): string {
  counter += 1;
  return `nova-mail14_${counter}`;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function seedContact(t: string, id: string, name: string, email: string) {
  DataStore.mem().insert("mail_contacts", { _id: id, tenantId: t, name, email });
}

function seedMailbox(t: string, id: string, name: string) {
  DataStore.mem().insert("mailboxes", { _id: id, tenantId: t, name, email: `${name.toLowerCase().replace(/\s+/g, ".")}@n0va.test`, plan: "business" });
}

describe("mailQuantum PQC key management", () => {
  it("catalog exposes 6 algorithms with 4 NIST-standardized", () => {
    const r = mailQuantum.algorithmCatalog();
    expect(r.count).toBe(6);
    expect(r.standardized).toBe(4);
    const kyber = r.algorithms.find((a: any) => a.id === "kyber_1024");
    expect(kyber.type).toBe("kem");
    expect(kyber.securityBits).toBe(256);
    expect(kyber.status).toBe("nist_standardized");
    expect(mailQuantum.algorithmCatalog().summary).toContain("6 post-quantum algorithms");
  });

  it("creates a key pair with deterministic defaults", () => {
    const t = tenant();
    const r = mailQuantum.createKeyPair(t, {});
    expect(r.keyId).toBeTruthy();
    expect(r.algorithm).toBe("kyber_1024");
    expect(r.status).toBe("active");
    expect(r.keyBytes).toBe(3168);
    expect(r.securityBits).toBe(256);
    expect(r.publicFingerprint).toMatch(/^fp_/);
    expect(r.label).toBe("email_encryption@kyber_1024");
    expect(r.summary).toContain("256-bit security");
  });

  it("lists keys and supports unknown-algorithm rejection", () => {
    const t = tenant();
    mailQuantum.createKeyPair(t, { algorithm: "dilithium_5", purpose: "signing" });
    const list = mailQuantum.listKeys(t);
    expect(list.count).toBe(1);
    expect(list.active).toBe(1);
    expect(list.keys[0].purpose).toBe("signing");
    expect(() => mailQuantum.createKeyPair(t, { algorithm: "bogus" })).toThrow("Unknown PQC algorithm");
    expect(() => mailQuantum.getKey(t, "nope")).toThrow("not found");
  });

  it("rotates a key — old retired, fresh active, log entry", () => {
    const t = tenant();
    const k = mailQuantum.createKeyPair(t, {});
    const r = mailQuantum.rotateKey(t, k.keyId);
    expect(r.previousKeyId).toBe(k.keyId);
    expect(r.status).toBe("active");
    const old = mailQuantum.getKey(t, k.keyId);
    expect(old.status).toBe("retired");
    expect(old.previousFingerprint).toBe(k.publicFingerprint);
    const fresh = mailQuantum.getKey(t, r.keyId);
    expect(fresh.rotatedFrom).toBe(k.keyId);
    const list = mailQuantum.listKeys(t);
    expect(list.count).toBe(2);
    expect(list.active).toBe(1);
    const log = mailQuantum.quantumLog(t);
    expect(log.entries.some((e: any) => e.category === "key_rotation")).toBe(true);
  });

  it("revokes a key and logs it", () => {
    const t = tenant();
    const k = mailQuantum.createKeyPair(t, {});
    const r = mailQuantum.revokeKey(t, k.keyId);
    expect(r.fingerprint).toBe(k.publicFingerprint);
    expect(mailQuantum.getKey(t, k.keyId).status).toBe("revoked");
    expect(mailQuantum.quantumLog(t).entries.some((e: any) => e.category === "key_revoked")).toBe(true);
  });
});

describe("mailQuantum QKD channels", () => {
  it("creates a channel with deterministic physical parameters", () => {
    const t = tenant();
    const name = "Vienna-Singapore";
    const r = mailQuantum.createQkdChannel(t, { name });
    expect(r.channelId).toBeTruthy();
    expect(r.name).toBe(name);
    expect(r.status).toBe("active");
    expect(r.securityLevel).toBe("quantum-safe");
    expect(r.distanceKm).toBe(50 + (hashStr(t + "|" + name + "|dist") % 750));
    expect(r.errorRatePct).toBe((hashStr(t + "|" + name + "|err") % 30) / 10 + 0.5);
    expect(r.keyRateKbps).toBe(100 + (hashStr(t + "|" + name + "|rate") % 900));
    expect(r.lastExchangeAt).toBeNull();
    expect(r.summary).toContain(`${r.distanceKm} km`);
  });

  it("aggregates total key rate across channels", () => {
    const t = tenant();
    const a = mailQuantum.createQkdChannel(t, { name: "Athens-Brussels" });
    const b = mailQuantum.createQkdChannel(t, { name: "London-Auckland" });
    const r = mailQuantum.qkdChannels(t);
    expect(r.count).toBe(2);
    expect(r.totalKbps).toBe(a.keyRateKbps + b.keyRateKbps);
    expect(r.summary).toContain("2 QKD channel(s)");
  });

  it("simulates a deterministic key exchange with physical invariants", () => {
    const t = tenant();
    const ch = mailQuantum.createQkdChannel(t, { name: "CrossRiver-7" });
    const r = mailQuantum.simulateQkdExchange(t, ch.channelId);
    const seed = t + "|" + ch.channelId + "|" + ch.distanceKm;
    const sentPhotons = 10000 + (hashStr(seed + "|sent") % 900000);
    const detected = Math.floor(sentPhotons * (1 - ch.errorRatePct / 100));
    const sifted = Math.floor(detected * (0.5 + (hashStr(seed + "|sift") % 40) / 100));
    const distilled = Math.floor(sifted * 0.8);
    expect(r.exchangeId).toBeTruthy();
    expect(r.sentPhotons).toBe(sentPhotons);
    expect(r.detectedPhotons).toBe(detected);
    expect(r.siftedBits).toBe(sifted);
    expect(r.distilledKeyBits).toBe(distilled);
    expect(r.errorRatePct).toBe(ch.errorRatePct);
    expect(["clean", "mitigated"]).toContain(r.eavesdropCheck);
    expect(r.distilledKeyBits).toBeLessThanOrEqual(r.siftedBits);
    expect(r.siftedBits).toBeLessThanOrEqual(r.detectedPhotons);
    expect(mailQuantum.qkdChannels(t).channels[0].lastExchangeAt).toBeTruthy();
    expect(() => mailQuantum.simulateQkdExchange(t, "nope")).toThrow("not found");
  });

  it("logs exchanges and tracks total distilled key", () => {
    const t = tenant();
    const ch = mailQuantum.createQkdChannel(t, { name: "QuantumBackbone-1" });
    const r = mailQuantum.simulateQkdExchange(t, ch.channelId);
    const ex = mailQuantum.qkdExchanges(t);
    expect(ex.count).toBe(1);
    expect(ex.totalDistilled).toBe(r.distilledKeyBits);
    expect(ex.exchanges[0].channelName).toBe("QuantumBackbone-1");
    expect(mailQuantum.quantumLog(t).entries.some((e: any) => e.category === "qkd_exchange")).toBe(true);
  });
});

describe("mailQuantum encryption + certificates", () => {
  it("requires plaintext to encrypt", () => {
    expect(() => mailQuantum.encryptMessage(tenant(), {})).toThrow("Plaintext is required");
  });

  it("encrypts and decrypts a message bound to the active key", () => {
    const t = tenant();
    const key = mailQuantum.createKeyPair(t, {});
    const enc = mailQuantum.encryptMessage(t, { plaintext: "Treasury report — Q3" });
    expect(enc.cipherId).toMatch(/^cph_/);
    expect(enc.capsule).toMatch(/^kc_/);
    expect(enc.fingerprint).toBe(key.publicFingerprint);
    expect(enc.keyId).toBe(key.keyId);
    expect(enc.algorithm).toBe("kyber_1024");
    expect(enc.overheadPct).toBe(100);
    expect(enc.ciphertext).toBeTruthy();
    const dec = mailQuantum.decryptMessage(t, enc.cipherId);
    expect(dec.status).toBe("decrypted");
    expect(dec.plaintextBytes).toBe("Treasury report — Q3".length);
    expect(() => mailQuantum.decryptMessage(t, "cph_missing")).toThrow("not found");
  });

  it("issues certificates with validation", () => {
    const t = tenant();
    expect(() => mailQuantum.issueCertificate(t, {})).toThrow("Common name is required");
    expect(() => mailQuantum.issueCertificate(t, { commonName: "mail.n0va.io", validityDays: 0 })).toThrow("Validity days must be positive");
    const c = mailQuantum.issueCertificate(t, { commonName: "mail.n0va.io" });
    expect(c.serial).toBeTruthy();
    expect(c.issuer).toBe("N0VA-QCA");
    expect(c.chainDepth).toBe(0);
    expect(c.algorithm).toBe("dilithium_5");
    expect(c.status).toBe("active");
    expect(c.publicFingerprint).toMatch(/^fp_/);
  });

  it("full certificate lifecycle: issue → revoke → renew with chain verification", () => {
    const t = tenant();
    const c = mailQuantum.issueCertificate(t, { commonName: "mail.n0va.io" });
    expect(mailQuantum.listCertificates(t).active).toBe(1);
    expect(mailQuantum.certificateChain(t).verified).toBe(true);
    expect(mailQuantum.certificateChain(t).leaves).toBe(1);
    expect(mailQuantum.certificateChain(t).root.name).toContain("Root CA");
    expect(mailQuantum.certificateChain(t).intermediate.signedBy).toBe(mailQuantum.certificateChain(t).root.name);
    mailQuantum.revokeCertificate(t, c.certId);
    expect(mailQuantum.listCertificates(t).active).toBe(0);
    expect(mailQuantum.certificateChain(t).verified).toBe(false);
    expect(mailQuantum.quantumLog(t).entries.some((e: any) => e.category === "cert_revoked")).toBe(true);
    const r = mailQuantum.renewCertificate(t, c.certId);
    expect(r.serial).toBe(c.serial);
    expect(mailQuantum.listCertificates(t).active).toBe(1);
    expect(mailQuantum.certificateChain(t).verified).toBe(true);
    expect(mailQuantum.quantumLog(t).entries.some((e: any) => e.category === "cert_renewed")).toBe(true);
    expect(() => mailQuantum.getCertificate(t, "nope")).toThrow("not found");
  });

  it("overview reports at_risk on empty tenant with 3 recommendations", () => {
    const t = tenant();
    const o = mailQuantum.quantumOverview(t);
    expect(o.readiness).toBe(0);
    expect(o.level).toBe("at_risk");
    expect(o.keyCount).toBe(0);
    expect(o.qkdCount).toBe(0);
    expect(o.certCount).toBe(0);
    expect(o.encryptedMail).toBe(0);
    expect(o.recommendations.length).toBe(3);
    expect(o.summary).toContain("Quantum readiness 0% (at_risk)");
  });

  it("overview hardens to 75% when keys+channel+cert exist", () => {
    const t = tenant();
    mailQuantum.createKeyPair(t, {});
    mailQuantum.createQkdChannel(t, { name: "Athens-Brussels" });
    mailQuantum.issueCertificate(t, { commonName: "mail.n0va.io" });
    const o = mailQuantum.quantumOverview(t);
    expect(o.readiness).toBe(75);
    expect(o.level).toBe("hardened");
    expect(o.recommendations[0]).toContain("fully provisioned");
    expect(o.layers.filter((l: any) => l.status === "ready").length).toBe(3);
  });

  it("dashboard merges overview + vaults + recent log", () => {
    const t = tenant();
    mailQuantum.createKeyPair(t, {});
    const d = mailQuantum.quantumDashboard(t);
    expect(d.keys.count).toBe(1);
    expect(d.channels.count).toBe(0);
    expect(d.certificates.count).toBe(0);
    expect(d.generatedAt).toBeTruthy();
    expect(d.recentLog).toEqual(mailQuantum.quantumLog(t, 10).entries);
  });
});

describe("mailCollab2 approval workflows", () => {
  it("validates subject, approvers and requiredCount bounds", () => {
    const t = tenant();
    expect(() => mailCollab2.createApproval(t, {})).toThrow("Approval subject is required");
    expect(() => mailCollab2.createApproval(t, { subject: "Send 50k blast", approvers: [] })).toThrow("At least one approver is required");
    expect(() => mailCollab2.createApproval(t, { subject: "Send 50k blast", approvers: ["a@x.io"], requiredCount: 2 })).toThrow("must be between 1 and 1");
  });

  it("creates a pending approval with lowercased approver emails", () => {
    const t = tenant();
    const r = mailCollab2.createApproval(t, { subject: "Approve Q3 newsletter", approvers: ["A@x.io", "b@x.io"], requiredCount: 1, reason: "Campaign send" });
    expect(r.approvalId).toBeTruthy();
    expect(r.status).toBe("pending");
    expect(r.approvers[0].email).toBe("a@x.io");
    expect(r.requiredCount).toBe(1);
    expect(r.summary).toContain("1/2 required");
  });

  it("auto-approves when requiredCount reached", () => {
    const t = tenant();
    const r = mailCollab2.createApproval(t, { subject: "Quick one", approvers: ["a@x.io", "b@x.io"] });
    const out = mailCollab2.approveApproval(t, r.approvalId, { email: "a@x.io" });
    expect(out.status).toBe("approved");
    expect(out.summary).toContain("approved by 1/1");
    expect(mailCollab2.listApprovals(t).approvals[0].approvedAt).toBeTruthy();
    expect(() => mailCollab2.approveApproval(t, r.approvalId, { email: "b@x.io" })).toThrow("already approved");
    expect(() => mailCollab2.approveApproval(t, r.approvalId, { email: "nobody@x.io" })).toThrow("is not an approver");
  });

  it("requires all approvers when requiredCount equals approvers", () => {
    const t = tenant();
    const r = mailCollab2.createApproval(t, { subject: "Two signatures", approvers: ["a@x.io", "b@x.io"], requiredCount: 2 });
    let out = mailCollab2.approveApproval(t, r.approvalId, { email: "a@x.io" });
    expect(out.status).toBe("pending");
    out = mailCollab2.approveApproval(t, r.approvalId, { email: "b@x.io" });
    expect(out.status).toBe("approved");
  });

  it("reject locks the request and withdraw only works while pending", () => {
    const t = tenant();
    const r = mailCollab2.createApproval(t, { subject: "Reject me", approvers: ["a@x.io"] });
    const out = mailCollab2.rejectApproval(t, r.approvalId, { email: "a@x.io" });
    expect(out.status).toBe("rejected");
    expect(out.summary).toContain("rejected by a@x.io");
    expect(() => mailCollab2.approveApproval(t, r.approvalId, { email: "a@x.io" })).toThrow("already rejected");
    expect(() => mailCollab2.withdrawApproval(t, r.approvalId)).toThrow("Only pending approvals can be withdrawn");
    const w = mailCollab2.createApproval(t, { subject: "Winnie", approvers: ["a@x.io"] });
    expect(mailCollab2.withdrawApproval(t, w.approvalId).status).toBe("withdrawn");
  });

  it("filters by status and reports dashboard with deterministic turnaround", () => {
    const t = tenant();
    const a = mailCollab2.createApproval(t, { subject: "P1", approvers: ["a@x.io"] });
    const b = mailCollab2.createApproval(t, { subject: "P2", approvers: ["a@x.io"] });
    mailCollab2.approveApproval(t, a.approvalId, { email: "a@x.io" });
    mailCollab2.rejectApproval(t, b.approvalId, { email: "a@x.io" });
    const pending = mailCollab2.createApproval(t, { subject: "P3", approvers: ["a@x.io"] });
    expect(mailCollab2.listApprovals(t, "approved").count).toBe(1);
    expect(mailCollab2.listApprovals(t, "rejected").count).toBe(1);
    expect(mailCollab2.listApprovals(t, "pending").count).toBe(1);
    const dash = mailCollab2.approvalDashboard(t);
    expect(dash.total).toBe(3);
    expect(dash.pending).toBe(1);
    expect(dash.approved).toBe(1);
    expect(dash.rejected).toBe(1);
    expect(dash.approvalRate).toBe(33);
    expect(dash.avgTurnaroundHours).toBe(hashStr(t + "|approval_turnaround") % 48);
    expect(mailCollab2.withdrawApproval(t, pending.approvalId).status).toBe("withdrawn");
    expect(() => mailCollab2.approveApproval(t, "nope", { email: "a@x.io" })).toThrow("not found");
  });
});

describe("mailCollab2 delegation, roles and mentions", () => {
  it("validates delegation input", () => {
    const t = tenant();
    expect(() => mailCollab2.delegateInbox(t, {})).toThrow("mailboxId is required");
    seedMailbox(t, "q14_mb", "Jane Personal");
    expect(() => mailCollab2.delegateInbox(t, { mailboxId: "nope", granteeEmail: "x@x.io" })).toThrow("not found");
    expect(() => mailCollab2.delegateInbox(t, { mailboxId: "q14_mb", granteeEmail: "" })).toThrow("granteeEmail is required");
    expect(() => mailCollab2.delegateInbox(t, { mailboxId: "q14_mb", granteeEmail: "x@x.io", permission: "sudo" })).toThrow("Permission must be one of");
  });

  it("full delegation lifecycle: request → accept → revoke", () => {
    const t = tenant();
    seedMailbox(t, "q14_mb", "Team Inbox");
    const d = mailCollab2.delegateInbox(t, { mailboxId: "q14_mb", granteeEmail: "assistant@x.io", permission: "respond", reason: "Coverage" });
    expect(d.status).toBe("pending");
    expect(d.permission).toBe("respond");
    expect(d.summary).toContain("requested (respond)");
    expect(mailCollab2.acceptDelegation(t, d.delegationId).status).toBe("accepted");
    expect(() => mailCollab2.delegateInbox(t, { mailboxId: "q14_mb", granteeEmail: "assistant@x.io" })).toThrow("already delegated");
    const r = mailCollab2.revokeDelegation(t, d.delegationId);
    expect(r.status).toBe("revoked");
    expect(() => mailCollab2.acceptDelegation(t, d.delegationId)).toThrow("was revoked");
  });

  it("lists delegations with filters and summarizes by permission", () => {
    const t = tenant();
    seedMailbox(t, "q14_mb1", "Jane Personal");
    seedMailbox(t, "q14_mb2", "Work Inbox");
    const d1 = mailCollab2.delegateInbox(t, { mailboxId: "q14_mb1", granteeEmail: "a@x.io", permission: "read" });
    const d2 = mailCollab2.delegateInbox(t, { mailboxId: "q14_mb2", granteeEmail: "a@x.io", permission: "admin" });
    mailCollab2.acceptDelegation(t, d1.delegationId);
    mailCollab2.acceptDelegation(t, d2.delegationId);
    expect(mailCollab2.listDelegations(t, { mailboxId: "q14_mb1" }).count).toBe(1);
    expect(mailCollab2.listDelegations(t, { grantee: "a@x.io" }).count).toBe(2);
    const s = mailCollab2.delegationSummary(t);
    expect(s.active).toBe(2);
    expect(s.byPermission.find((p: any) => p.permission === "admin").count).toBe(1);
    expect(s.byMailbox.length).toBe(2);
    expect(s.summary).toContain("2 active delegation(s)");
  });

  it("assigns, updates, and removes team roles", () => {
    const t = tenant();
    expect(() => mailCollab2.assignRole(t, { member: "x@x.io", role: "ceo" })).toThrow("Role must be one of owner, admin, editor, viewer");
    expect(() => mailCollab2.assignRole(t, { role: "editor" })).toThrow("Member email is required");
    const r = mailCollab2.assignRole(t, { member: "john@x.io", role: "editor" });
    expect(r.roleId).toBeTruthy();
    expect(r.updated).toBe(false);
    const upd = mailCollab2.assignRole(t, { member: "john@x.io", role: "admin" });
    expect(upd.updated).toBe(true);
    expect(mailCollab2.listRoles(t).count).toBe(1);
    expect(mailCollab2.listRoles(t).roles[0].role).toBe("admin");
    expect(mailCollab2.removeRole(t, r.roleId).summary).toContain("john@x.io removed");
    expect(mailCollab2.listRoles(t).count).toBe(0);
    expect(() => mailCollab2.removeRole(t, "nope")).toThrow("not found");
  });

  it("exposes role matrix and team dashboard", () => {
    const t = tenant();
    const m = mailCollab2.roleMatrix();
    expect(m.roles.length).toBe(4);
    expect(m.roles[0].role).toBe("owner");
    expect(m.roles[0].permissions).toContain("manage_team");
    mailCollab2.assignRole(t, { member: "a@x.io", role: "owner" });
    mailCollab2.assignRole(t, { member: "b@x.io", role: "viewer" });
    const d = mailCollab2.teamDashboard(t);
    expect(d.members).toBe(2);
    expect(d.byRole.find((x: any) => x.role === "owner").count).toBe(1);
    expect(d.byRole.find((x: any) => x.role === "viewer").count).toBe(1);
    expect(d.coveragePct).toBe(40);
    expect(d.summary).toContain("2 member(s)");
  });

  it("detects mentions and resolves them against contacts", () => {
    const t = tenant();
    seedContact(t, "c1", "John Smith", "john.smith@partner.com");
    seedContact(t, "c2", "Sarah Chen", "sarah@n0va.test");
    const r = mailCollab2.mentionDetect(t, "Hey @john.smith@partner.com and @Sarah Chen, review @ghost@nowhere.io");
    expect(r.tokens.length).toBe(3);
    expect(r.resolvedCount).toBe(2);
    expect(r.resolved.find((x: any) => x.email === "john.smith@partner.com").resolved).toBe(true);
    expect(r.resolved.find((x: any) => x.token === "ghost@nowhere.io").resolved).toBe(false);
    expect(r.summary).toContain("2/3 mention(s) resolved");
  });

  it("creates mention notifications with validation", () => {
    const t = tenant();
    expect(() => mailCollab2.createMention(t, { text: "hi" })).toThrow("contextId is required");
    expect(() => mailCollab2.createMention(t, { text: "hi @a@b.c", contextType: "bogus", contextId: "x" })).toThrow("Context must be one of");
    seedContact(t, "c1", "John Smith", "john.smith@partner.com");
    const r = mailCollab2.createMention(t, { text: "Please review @john.smith@partner.com", contextType: "draft", contextId: "draft_9" });
    expect(r.count).toBe(1);
    expect(r.created[0].target).toBe("john.smith@partner.com");
    expect(r.summary).toContain("1 mention notification(s) created");
    expect(() => mailCollab2.createMention(t, { text: "ping @ghost@nowhere.io", contextType: "draft", contextId: "draft_9" })).toThrow("No mentionable recipients found");
  });

  it("lists mentions with unread filter, marks read, summarizes", () => {
    const t = tenant();
    seedContact(t, "c1", "John Smith", "john.smith@partner.com");
    const a = mailCollab2.createMention(t, { text: "@john.smith@partner.com one", contextType: "comment", contextId: "thr1" });
    const b = mailCollab2.createMention(t, { text: "@john.smith@partner.com two", contextType: "approval", contextId: "app1" });
    expect(mailCollab2.listMentions(t, { unreadOnly: true }).count).toBe(2);
    expect(mailCollab2.listMentions(t, { contextType: "approval" }).count).toBe(1);
    mailCollab2.markMentionRead(t, a.created[0].mentionId);
    const s = mailCollab2.mentionsSummary(t);
    expect(s.total).toBe(2);
    expect(s.unread).toBe(1);
    expect(s.byContext.find((c: any) => c.context === "approval").count).toBe(1);
    expect(mailCollab2.markMentionRead(t, b.created[0].mentionId).summary).toContain("marked read");
    expect(mailCollab2.mentionsSummary(t).unread).toBe(0);
    expect(() => mailCollab2.markMentionRead(t, "nope")).toThrow("not found");
  });

  it("collab2 dashboard merges approvals + delegation + roles + mentions", () => {
    const t = tenant();
    seedMailbox(t, "q14_mb", "Team Inbox");
    seedContact(t, "c1", "John Smith", "john.smith@partner.com");
    mailCollab2.createApproval(t, { subject: "Budget review", approvers: ["a@x.io"] });
    const d = mailCollab2.delegateInbox(t, { mailboxId: "q14_mb", granteeEmail: "a@x.io", permission: "read" });
    mailCollab2.createMention(t, { text: "@john.smith@partner.com heads up", contextType: "comment", contextId: "thr1" });
    const r = mailCollab2.collab2Dashboard(t);
    expect(r.approvals.pending).toBe(1);
    expect(r.delegation.pending).toBe(1);
    expect(r.team.members).toBe(0);
    expect(r.mentions.unread).toBe(1);
    expect(r.attentionScore).toBe(3);
    expect(r.summary).toContain("1 approval(s) pending");
    expect(r.generatedAt).toBeTruthy();
    mailCollab2.acceptDelegation(t, d.delegationId);
  });
});
