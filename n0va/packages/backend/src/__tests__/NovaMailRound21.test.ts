import { describe, it, expect, beforeAll } from "vitest";
import { DataStore } from "../services/DataStore";
import { MailResidencyService, RESIDENCY_REGIONS, TRANSFER_MECHANISMS, TRANSIT_ENCRYPTION, DATA_CLASSES } from "../services/MailResidencyService";
import { MailWhiteLabelService, BRAND_PRESETS, BRAND_FEATURES, DEPLOYMENT_MODELS } from "../services/MailWhiteLabelService";
import { MailMarketplaceService, MARKETPLACE_CATEGORIES, SEED_LISTINGS, PROGRAMS } from "../services/MailMarketplaceService";
import { MailDevService, SDK_STACK, CLI_TOOLS, DEV_METRICS, EXPLORER_ENDPOINTS } from "../services/MailDevService";
import { MailQuantumService } from "../services/MailQuantumService";
import { MailPredictiveService } from "../services/MailPredictiveService";

const residency = new MailResidencyService();
const whiteLabel = new MailWhiteLabelService();
const marketplace = new MailMarketplaceService();
const dev = new MailDevService();
const quantum = new MailQuantumService();
const predict = new MailPredictiveService();

const T = "nova-mail21";
const TB = "nova-mail21b";
const TC = "nova-mail21c";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

beforeAll(() => {
  DataStore.mem().insert("mailboxes", {
    _id: "mb_r21_main", tenantId: T, name: "R21 Business", type: "work", email: "ani@r21.io",
    plan: "business", quotaBytes: 1024 * 1024 * 1024 * 10, usedBytes: 0, status: "active",
  });
  DataStore.mem().insert("mailboxes", {
    _id: "mb_r21_free", tenantId: TB, name: "R21 Free", type: "work", email: "free@r21b.io",
    plan: "free", quotaBytes: 1024 * 1024 * 1024, usedBytes: 0, status: "active",
  });
  DataStore.mem().insert("mailboxes", {
    _id: "mb_r21_graph", tenantId: TC, name: "R21 Graph", type: "work", email: "graph@r21c.io",
    plan: "business", quotaBytes: 1024 * 1024 * 1024 * 10, usedBytes: 0, status: "active",
  });
  DataStore.mem().insert("mail_domains", { _id: "dm_r21_brand", tenantId: T, domain: "brand.n0va.io", status: "verified" });
  DataStore.mem().insert("mail_voice_notes", {
    _id: "vn_r21_1", tenantId: T, title: "Q3 priorities", transcript: "We need the Q3 numbers before Friday and the board deck by Thursday afternoon.",
    durationSec: 42, messageId: "msg_r21_1",
  });
  DataStore.mem().insert("mail_qkd_channels", { _id: "qkd_r21_1", tenantId: T, name: "Athens-Brussels", status: "active", createdAt: new Date().toISOString() });
  DataStore.mem().insert("mail_api_keys", {
    _id: "ak_r21_1", tenantId: T, label: "Smoke key", scopes: ["send", "read"], keyHash: "hash",
    prefix: "n0va_mk_smoke", last4: "1234", status: "active", callsToday: 0, callsTotal: 0, createdAt: new Date().toISOString(),
  });
  DataStore.mem().insert("mail_api_usage", { tenantId: T, apiKeyId: "ak_r21_1", label: "Smoke key", action: "send", at: new Date().toISOString() });
  DataStore.mem().insert("mail_api_usage", { tenantId: T, apiKeyId: "ak_r21_1", label: "Smoke key", action: "read", at: new Date().toISOString() });
  DataStore.mem().insert("mail_webhook_deliveries", {
    deliveryId: "dlv_r21_1", tenantId: T, event: "message.new", url: "https://hooks.r21.io/a", status: "delivered",
    attempts: 1, latencyMs: 84, signature: "sha256=abc", at: new Date().toISOString(),
  });
  DataStore.mem().insert("mail_webhook_deliveries", {
    deliveryId: "dlv_r21_2", tenantId: T, event: "spam.detected", url: "https://hooks.r21.io/b", status: "failed",
    attempts: 3, latencyMs: 250, signature: "sha256=def", at: new Date().toISOString(),
  });
  const msgs = [
    { _id: "r21_m1", tenantId: TC, folder: "inbox", subject: "Re: Q3 budget approval", from: { name: "Sarah Chen", email: "sarah@partner.io" }, to: [{ email: "graph@r21c.io" }], body: "The numbers are approved for the board deck.", receivedAt: new Date(Date.now() - 3600000).toISOString() },
    { _id: "r21_m2", tenantId: TC, folder: "inbox", subject: "Meeting invite for Thursday", from: { name: "John Smith", email: "john@partner.io" }, to: [{ email: "graph@r21c.io" }], body: "Can we sync on the roadmap?", receivedAt: new Date(Date.now() - 7200000).toISOString() },
    { _id: "r21_m3", tenantId: TC, folder: "inbox", subject: "Invoice #88", from: { name: "Mia Lopez", email: "mia@finance.io" }, to: [{ email: "graph@r21c.io" }], body: "Q3 services invoice attached.", receivedAt: new Date(Date.now() - 86400000).toISOString() },
    { _id: "r21_m4", tenantId: TC, folder: "sent", subject: "Re: Q3 budget approval", from: { email: "graph@r21c.io" }, to: [{ email: "sarah@partner.io" }], body: "Confirmed, thanks.", sentAt: new Date(Date.now() - 1800000).toISOString() },
  ];
  for (const m of msgs) DataStore.mem().insert("messages", m as any);
  const contacts = [
    { _id: "ct_r21_1", tenantId: TC, email: "sarah@partner.io", name: "Sarah Chen" },
    { _id: "ct_r21_2", tenantId: TC, email: "john@partner.io", name: "John Smith" },
    { _id: "ct_r21_3", tenantId: TC, email: "mia@finance.io", name: "Mia Lopez" },
  ];
  for (const c of contacts) DataStore.mem().insert("mail_contacts", c as any);
});

describe("data residency (§13.3)", () => {
  it("exposes 12 regions, 5 transfer mechanisms and 4 transit encryptions", () => {
    expect(RESIDENCY_REGIONS.length).toBe(12);
    expect(TRANSFER_MECHANISMS.length).toBe(5);
    expect(TRANSIT_ENCRYPTION.length).toBe(4);
    expect(DATA_CLASSES.length).toBe(6);
    const cat = residency.regionCatalog();
    expect(cat.regions.length).toBe(12);
    expect(cat.regions.every((r: any) => r.dataCenter && r.certifications.length > 0)).toBe(true);
  });

  it("assigns defaults and pins a class to a strict region", () => {
    const before = residency.residencyPolicies(T);
    expect(before.count).toBe(6);
    expect(before.policies.find((p: any) => p.dataClass === "analytics")?.regionId).toBe("eu");
    const r = residency.setResidencyPolicy(T, "messages", "germany", true);
    expect(r.regionName).toBe("Germany");
    expect(r.strict).toBe(true);
    const after = residency.residencyPolicies(T);
    expect(after.policies.find((p: any) => p.dataClass === "messages")?.regionId).toBe("germany");
    expect(after.policies.find((p: any) => p.dataClass === "messages")?.strict).toBe(true);
    expect(() => residency.setResidencyPolicy(T, "bogus", "us")).toThrow("Unknown data class");
    expect(() => residency.setResidencyPolicy(T, "messages", "atlantis")).toThrow("Unknown residency region");
  });

  it("tracks residency level across strict classes", () => {
    expect(residency.residencyStatus(T).level).toBe("default");
    residency.setResidencyPolicy(T, "contacts", "us", true);
    residency.setResidencyPolicy(T, "attachments", "us", true);
    expect(residency.residencyStatus(T).level).toBe("partial");
    for (const c of ["analytics", "backups", "ai_models"]) residency.setResidencyPolicy(T, c, "eu", true);
    const hardened = residency.residencyStatus(T);
    expect(hardened.level).toBe("hardened");
    expect(hardened.strictClasses).toBe(6);
  });

  it("monitors data flows", () => {
    const flow = residency.dataFlowMonitor(T);
    expect(flow.flows.length).toBeGreaterThan(0);
    expect(flow.flows.every((f: any) => f.dataClasses.length > 0)).toBe(true);
    expect(flow.verdict).toBe("compliant");
  });

  it("places, lists and releases sovereign locks", () => {
    const lock = residency.placeSovereignLock(T, "germany", "Board materials");
    expect(lock.garId).toBeTruthy();
    expect(lock.status).toBe("active");
    const locks = residency.sovereignLocks(T);
    expect(locks.locks.some((l: any) => l._id === lock.garId)).toBe(true);
    const released = residency.releaseSovereignLock(T, lock.garId);
    expect(released.status).toBe("released");
    expect(residency.sovereignLocks(T).open).toBe(0);
    expect(() => residency.placeSovereignLock(T, "atlantis")).toThrow("Unknown residency region");
    expect(() => residency.releaseSovereignLock(T, "missing")).toThrow("not found");
  });

  it("notifies breaches and issues certificates + jurisdiction reports", () => {
    const breach = residency.notifyBreach(T, "us", "Phishing cluster");
    expect(breach.ref).toBeTruthy();
    expect(residency.residencyLog(T).entries.some((e: any) => e.category === "breach")).toBe(true);
    const cert = residency.residencyCertificate(T, "germany");
    expect(cert.certificateId).toMatch(/^RESC-/);
    expect(cert.verificationHash).toBeTruthy();
    const report = residency.jurisdictionReport(T, "germany");
    expect(report.compliant).toBe(true);
    expect(report.dataClasses).toContain("messages");
    const dash = residency.residencyDashboard(T);
    expect(dash.status.level).toBe("hardened");
    expect(dash.flow.activeRegions).toBeGreaterThan(0);
  });
});

describe("white-label (§13.4)", () => {
  it("exposes 3 presets, 11 features and 4 deployment models", () => {
    expect(BRAND_PRESETS.length).toBe(3);
    expect(BRAND_FEATURES.length).toBe(11);
    expect(DEPLOYMENT_MODELS.length).toBe(4);
    expect(whiteLabel.brandPresets().presets.length).toBe(3);
    expect(whiteLabel.deploymentModels().models.map((m: any) => m.id)).toEqual(["shared", "dedicated", "on_prem", "hybrid"]);
  });

  it("defaults branding and applies updates on business plan", () => {
    const b = whiteLabel.getBranding(T);
    expect(b.navName).toBe("N0VA Mail");
    expect(b.colorPreset).toBe("ocean");
    const updated = whiteLabel.updateBranding(T, { navName: "Horizon", colorPreset: "ember" });
    expect(updated.navName).toBe("Horizon");
    expect(updated.colorPreset).toBe("ember");
    const custom = whiteLabel.updateBranding(T, { primary: "#123456" });
    expect(custom.primary).toBe("#123456");
  });

  it("gates premium brand features by plan", () => {
    expect(whiteLabel.getBranding(TB).availableFeatures).not.toContain("custom_colors");
    expect(() => whiteLabel.updateBranding(TB, { primary: "#000000" })).toThrow("Custom colors require Pro plan or higher");
    expect(() => whiteLabel.updateBranding(TB, { darkMode: true })).toThrow("Dark mode requires Business plan or higher");
    expect(() => whiteLabel.setCustomSla(TB, 99.9)).toThrow("Custom SLA requires Business plan or higher");
    expect(() => whiteLabel.updateBranding(T, { colorPreset: "rainbow" })).toThrow("Unknown brand preset");
  });

  it("selects a deployment model and reflects status", () => {
    const sel = whiteLabel.selectDeployment(T, "on_prem");
    expect(sel.deploymentModel).toBe("on_prem");
    const status = whiteLabel.deploymentStatus(T);
    expect(status.modelName).toBe("On-Premises / Air-Gapped");
    expect(status.status).toBe("air_gapped");
    expect(() => whiteLabel.selectDeployment(T, "edge")).toThrow("Unknown deployment model");
  });

  it("manages custom SLA values", () => {
    expect(whiteLabel.customSla(T).slaPct).toBe(99.9);
    const set = whiteLabel.setCustomSla(T, 99.99, 0.1);
    expect(set.slaPct).toBe(99.99);
    expect(whiteLabel.customSla(T).slaPct).toBe(99.99);
    expect(() => whiteLabel.setCustomSla(T, 95)).toThrow("SLA must be between 99 and 99.99999");
  });

  it("binds a verified outbound domain", () => {
    const candidates = whiteLabel.candidateDomains(T);
    expect(candidates.count).toBe(1);
    const bound = whiteLabel.bindOutboundDomain(T, "dm_r21_brand");
    expect(bound.domain).toBe("brand.n0va.io");
    expect(whiteLabel.getBranding(T).customMailDomain).toBe("brand.n0va.io");
    expect(() => whiteLabel.bindOutboundDomain(T, "dm_missing")).toThrow("not found");
  });

  it("aggregates white-label status + dashboard", () => {
    const status = whiteLabel.whiteLabelStatus(T);
    expect(status.planName).toBe("Business");
    expect(status.featureCount).toBeGreaterThanOrEqual(8);
    const dash = whiteLabel.whiteLabelDashboard(T);
    expect(dash.models.length).toBe(4);
    expect(dash.presets.length).toBe(3);
  });
});

describe("marketplace (§13.5)", () => {
  it("exposes 6 categories with revenue share", () => {
    expect(MARKETPLACE_CATEGORIES.length).toBe(6);
    expect(MARKETPLACE_CATEGORIES.find((c: any) => c.id === "ai_agents")?.devShare).toBe(70);
    expect(MARKETPLACE_CATEGORIES.find((c: any) => c.id === "themes")?.devShare).toBe(90);
    const cat = marketplace.categories();
    expect(cat.categories.length).toBe(6);
  });

  it("seeds 14 approved listings and filters by category", () => {
    expect(SEED_LISTINGS.length).toBe(14);
    const all = marketplace.marketplaceCatalog(T);
    expect(all.count).toBe(14);
    expect(all.listings.every((l: any) => l.installed === false)).toBe(true);
    const training = marketplace.marketplaceCatalog(T, "training");
    expect(training.count).toBe(2);
    expect(() => marketplace.marketplaceCatalog(T, "nope")).toThrow("Unknown category");
  });

  it("installs, uses and uninstalls a listing", () => {
    const install = marketplace.installListing(T, "mkt_sales_agent");
    expect(install.installed).toBe(true);
    const again = marketplace.installListing(T, "mkt_sales_agent");
    expect(again.alreadyInstalled).toBe(true);
    const installed = marketplace.installedListings(T);
    expect(installed.count).toBe(1);
    expect(installed.listings[0].listingId).toBe("mkt_sales_agent");
    expect(installed.listings[0].usageToday).toBeGreaterThan(0);
    const afterInstall = marketplace.marketplaceCatalog(T).listings.find((l: any) => l.listingId === "mkt_sales_agent");
    expect(afterInstall?.installed).toBe(true);
    marketplace.uninstallListing(T, "mkt_sales_agent");
    expect(marketplace.installedListings(T).count).toBe(0);
  });

  it("rates installed listings and recomputes the average", () => {
    marketplace.installListing(T, "mkt_theme_dark");
    const r1 = marketplace.rateListing(T, "mkt_theme_dark", 4, "Solid");
    expect(r1.rating).toBe(4);
    expect(r1.newAverage).toBe(4);
    const r2 = marketplace.rateListing(T, "mkt_theme_dark", 5);
    expect(r2.newAverage).toBe(4.5);
    expect(() => marketplace.rateListing(T, "mkt_theme_dark", 9)).toThrow("rating must be between 1 and 5");
    expect(() => marketplace.rateListing(T, "mkt_plugin_rt", 3)).toThrow("Install the listing before rating it");
  });

  it("runs the submit -> approve / reject lifecycle", () => {
    const sub = marketplace.submitListing(T, { title: "R21 Agent", description: "Test listing", category: "ai_agents", price: 10 });
    expect(sub.status).toBe("pending");
    expect(marketplace.pendingListings(T).count).toBe(1);
    const approved = marketplace.approveListing(T, sub.listingId);
    expect(approved.status).toBe("approved");
    expect(marketplace.marketplaceCatalog(T).count).toBe(15);
    const sub2 = marketplace.submitListing(T, { title: "Bad Listing", category: "plugins", price: 2 });
    const rejected = marketplace.rejectListing(T, sub2.listingId, "duplicate");
    expect(rejected.status).toBe("rejected");
    expect(marketplace.pendingListings(T).count).toBe(0);
    expect(() => marketplace.submitListing(T, { category: "ai_agents" })).toThrow("title is required");
  });

  it("joins developer programs and computes revenue share", () => {
    expect(PROGRAMS.length).toBe(5);
    const joined = marketplace.joinProgram(T, "champions");
    expect(joined.joined).toBe(true);
    expect(marketplace.joinProgram(T, "champions").alreadyMember).toBe(true);
    expect(() => marketplace.joinProgram(T, "lifetime")).toThrow("Unknown program");
    const sub = marketplace.submitListing(T, { title: "Revenue Agent", description: "Paid listing", category: "ai_agents", price: 10 });
    marketplace.approveListing(T, sub.listingId);
    marketplace.installListing(T, sub.listingId);
    const rev = marketplace.revenueOverview(T);
    expect(rev.listings).toBe(2);
    expect(rev.grossRevenue).toBe(10);
    expect(rev.devEarnings).toBe(7);
    const dash = marketplace.marketplaceDashboard(T);
    expect(dash.installedCount).toBe(2);
    expect(dash.revenue.devEarnings).toBe(7);
  });
});

describe("dev center (§8.5 / §11)", () => {
  it("exposes 6 SDKs, 5 CLI tools and 5 dev metrics", () => {
    expect(SDK_STACK.length).toBe(6);
    expect(CLI_TOOLS.length).toBe(5);
    expect(DEV_METRICS.length).toBe(5);
    expect(EXPLORER_ENDPOINTS.length).toBe(5);
    const sdks = dev.sdkStack();
    expect(sdks.sdks.find((s: any) => s.id === "js_ts")?.package).toBe("@n0va/mail-sdk");
    const metrics = dev.devMetrics(T);
    expect(metrics.metrics.length).toBe(5);
    expect(metrics.onTarget).toBeGreaterThanOrEqual(3);
  });

  it("creates, verifies, promotes and revokes sandbox keys", () => {
    const created = dev.createSandboxKey(T, { label: "r21 sandbox" });
    expect(created.key.startsWith("n0va_dev_")).toBe(true);
    expect(created.quotaPerDay).toBe(100);
    expect(dev.verifySandboxKey(T, created.keyId).valid).toBe(true);
    const promoted = dev.promoteSandboxKey(T, created.keyId);
    expect(promoted.status).toBe("production");
    expect(promoted.quotaPerDay).toBe(5000);
    expect(dev.sandboxKeys(T).keys.length).toBe(1);
    dev.revokeSandboxKey(T, created.keyId);
    const check = dev.verifySandboxKey(T, created.keyId);
    expect(check.valid).toBe(false);
    expect(check.reason).toBe("revoked");
    expect(dev.verifySandboxKey(T, "missing").reason).toBe("invalid");
    expect(() => dev.createSandboxKey(T, { label: "   " })).toThrow("label is required");
  });

  it("reads API usage, latency and rate limits", () => {
    const usage = dev.apiUsage(T);
    expect(usage.apiKeys).toBe(1);
    expect(usage.callsTotal).toBe(2);
    expect(usage.byAction.map((a: any) => a.action)).toEqual(expect.arrayContaining(["send", "read"]));
    const latency = dev.endpointLatency(T);
    expect(latency.endpoints.length).toBe(5);
    expect(latency.endpoints.every((e: any) => e.latencyMs > 0)).toBe(true);
    const limit = dev.rateLimitConsumption(T);
    expect(limit.plan).toBe("business");
    expect(limit.limit).toBe(5000);
    expect(limit.used).toBe(2);
    expect(limit.remaining).toBe(4998);
  });

  it("inspects webhook deliveries and runs test pings", () => {
    const inspected = dev.webhookInspector(T);
    expect(inspected.count).toBe(2);
    expect(inspected.summary).toContain("failures present");
    const ping = dev.testWebhook(T, "https://hooks.r21.io/c");
    expect(["200 OK", "timed out"]).toContain(ping.summary.split(" - ")[1]);
    expect(ping.latencyMs).toBeGreaterThan(0);
  });

  it("serves the OpenAPI spec and aggregates the dev dashboard", () => {
    const spec = dev.openApiSpec(T);
    expect(spec.version).toBe("v1");
    expect(spec.endpoints).toBe(5);
    const explorer = dev.apiExplorer(T);
    expect(explorer.endpoints.length).toBe(5);
    const dash = dev.devDashboard(T);
    expect(dash.sdks.length).toBe(6);
    expect(dash.cliTools.length).toBe(5);
    expect(dash.rateLimit.limit).toBe(5000);
  });
});

describe("quantum-secure voice", () => {
  it("encrypts a voice note over a QKD channel", () => {
    const enc = quantum.encryptVoiceNote(T, "vn_r21_1");
    expect(enc.encryptedId).toBeTruthy();
    expect(enc.cipherId.startsWith("cph_")).toBe(true);
    expect(enc.qkdProtected).toBe(true);
    expect(enc.channelName).toBe("Athens-Brussels");
    expect(enc.overheadPct).toBe(100);
    expect(enc.ciphertextBytes).toBeGreaterThanOrEqual(256);
    expect(enc.algorithmName).toBeTruthy();
    expect(() => quantum.encryptVoiceNote(T, "vn_missing")).toThrow("not found");
  });

  it("decrypts the encrypted voice note", () => {
    const enc = quantum.encryptVoiceNote(T, "vn_r21_1");
    const dec = quantum.decryptVoiceNote(T, enc.encryptedId);
    expect(dec.restored).toBe(true);
    expect(dec.title).toBe("Q3 priorities");
    expect(dec.qkdProtected).toBe(true);
    expect(() => quantum.decryptVoiceNote(T, "missing")).toThrow("not found");
  });

  it("reports voice encryption coverage", () => {
    const status = quantum.quantumVoiceStatus(T);
    expect(status.totalNotes).toBe(1);
    expect(status.encryptedNotes).toBe(1);
    expect(status.coveragePct).toBe(100);
    expect(status.status).toBe("hardened");
    const dash = quantum.quantumDashboard(T);
    expect(dash.voice.coveragePct).toBe(100);
  });
});

describe("predictive communication graph", () => {
  it("builds a weighted graph from message flows", () => {
    const graph = predict.communicationGraph(TC);
    expect(graph.nodeCount).toBeGreaterThanOrEqual(3);
    expect(graph.edgeCount).toBeGreaterThanOrEqual(3);
    expect(graph.nodes.every((n: any) => n.influence >= 25 && n.influence <= 100)).toBe(true);
    const influences = graph.nodes.map((n: any) => n.influence);
    expect([...influences].sort((a, b) => b - a)).toEqual(influences);
    expect(graph.clusters.some((c: any) => c.name === "partner.io")).toBe(true);
  });

  it("predicts next contacts ranked by probability", () => {
    const next = predict.predictNextContacts(TC, 3);
    expect(next.count).toBeLessThanOrEqual(3);
    expect(next.predictions.length).toBeGreaterThan(0);
    expect(next.predictions.every((p: any) => p.probability >= 0 && p.probability <= 98)).toBe(true);
    const probs = next.predictions.map((p: any) => p.probability);
    expect([...probs].sort((a, b) => b - a)).toEqual(probs);
    const known = ["sarah@partner.io", "john@partner.io", "mia@finance.io", "graph@r21c.io"];
    expect(next.predictions.every((p: any) => known.includes(p.email))).toBe(true);
  });

  it("computes best time to reach a contact", () => {
    const bt = predict.bestTimeToReach(TC, "sarah@partner.io");
    expect(bt.hour).toMatch(/^((0[89]|1[0-9]):00)$/);
    expect(bt.confidence).toBeGreaterThanOrEqual(55);
    expect(bt.summary).toContain("sarah@partner.io");
    const byName = predict.bestTimeToReach(TC, "Sarah Chen");
    expect(byName.contact).toBe("sarah@partner.io");
  });

  it("aggregates the communication graph dashboard", () => {
    const dash = predict.communicationGraphDashboard(TC);
    expect(dash.nextContacts.length).toBeGreaterThan(0);
    expect(dash.bestTime).toBeTruthy();
    expect(dash.summary).toContain("Communication graph");
    const seed = predict.communicationGraph(TC).seed;
    expect(seed).toBe(hashStr(TC + "|graph"));
  });
});