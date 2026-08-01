import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

export class MailDomainService {
  private getDomain(tenantId: string, domainId: string): any {
    const d = DataStore.mem().findOne("mail_domains", (x: any) => x._id === domainId && x.tenantId === tenantId);
    if (!d) throw new Error(`Domain "${domainId}" not found`);
    return d;
  }

  private log(tenantId: string, entry: any) {
    DataStore.mem().insert("mail_domain_log", { tenantId, ...entry, at: new Date().toISOString() });
  }

  private buildRecords(domain: string, dmarcPolicy: string) {
    return {
      mx: { record: `10 mx1.n0vamail.com`, purpose: "Inbound mail routing", verified: null },
      spf: { record: `v=spf1 include:_spf.n0vamail.com ~all`, purpose: "Sender authorization", verified: null },
      dkim: { record: `v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC${hashStr(domain + "dkim").toString(36).toUpperCase().slice(0, 20)}...`, selector: "n0va", purpose: "Signed mail verification", verified: null },
      dmarc: { record: `v=DMARC1; p=${dmarcPolicy}; rua=mailto:dmarc@${domain}`, purpose: "Policy for unauthenticated mail", verified: null },
      mtasts: { record: `v=STSv1; id=${Math.floor(Date.now() / 1000)}`, purpose: "Forced TLS transport", verified: null },
      tlsrpt: { record: `v=TLSRPTv1; rua=mailto:tls@${domain}`, purpose: "TLS delivery reports", verified: null },
    };
  }

  registerDomain(tenantId: string, input: any) {
    if (!input || !input.domain) throw new Error("Domain name is required");
    const domain = String(input.domain).toLowerCase().trim();
    if (!DOMAIN_RE.test(domain)) throw new Error(`"${domain}" is not a valid domain name`);
    const existing = DataStore.mem().findOne("mail_domains", (d: any) => d.tenantId === tenantId && d.domain === domain);
    if (existing) throw new Error(`Domain "${domain}" is already registered`);
    const plan = input.plan || "free";
    const dmarcPolicy = plan === "free" ? "none" : "quarantine";
    const domainRecord = DataStore.mem().insert("mail_domains", {
      tenantId,
      domain,
      plan,
      status: "pending",
      dns: this.buildRecords(domain, dmarcPolicy),
      verifiedAt: null,
      reputation: { score: null, blacklisted: false, blacklists: [], deliverability: null, health: "unknown" },
      policies: { spfStrict: false, dmarcEnforce: false, mtaSts: false, tlsRpt: false, brandProtection: false },
      createdBy: input.createdBy || "user_001",
    });
    this.log(tenantId, { action: "registered", domainId: domainRecord._id, domain, detail: `Domain "${domain}" registered on ${plan} plan` });
    return { domainId: domainRecord._id, ...domainRecord, summary: `Domain "${domain}" registered — 6 DNS records generated` };
  }

  listDomains(tenantId: string) {
    const domains = DataStore.mem().find("mail_domains", (d: any) => d.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return {
      domains: domains.map(d => ({ domainId: d._id, domain: d.domain, plan: d.plan, status: d.status, reputation: d.reputation, policies: d.policies, verifiedAt: d.verifiedAt, createdAt: d.createdAt })),
      totals: {
        total: domains.length,
        pending: domains.filter(d => d.status === "pending").length,
        actionRequired: domains.filter(d => d.status === "action_required").length,
        active: domains.filter(d => d.status === "active").length,
      },
      summary: `${domains.length} domain(s) — ${domains.filter(d => d.status === "active").length} active`,
    };
  }

  getDomainPublic(tenantId: string, domainId: string) {
    const d = this.getDomain(tenantId, domainId);
    return { domainId: d._id, domain: d.domain, plan: d.plan, status: d.status, dns: d.dns, reputation: d.reputation, policies: d.policies, verifiedAt: d.verifiedAt, createdAt: d.createdAt };
  }

  deleteDomain(tenantId: string, domainId: string) {
    const d = this.getDomain(tenantId, domainId);
    DataStore.mem().delete("mail_domains", (x: any) => x._id === domainId && x.tenantId === tenantId);
    this.log(tenantId, { action: "deleted", domainId, domain: d.domain, detail: `Domain "${d.domain}" removed` });
    return { domainId, summary: `Domain "${d.domain}" deleted` };
  }

  verifyDomain(tenantId: string, domainId: string) {
    const d = this.getDomain(tenantId, domainId);
    const records: Record<string, any> = {};
    let verifiedCount = 0;
    for (const [key, rec] of Object.entries<any>(d.dns)) {
      const ok = hashStr(d.domain + key + "verify") % 100 < 85;
      records[key] = { ...rec, verified: ok };
      if (ok) verifiedCount++;
    }
    const status = verifiedCount === 6 ? "active" : "action_required";
    const updated = DataStore.mem().update("mail_domains", (x: any) => x._id === domainId && x.tenantId === tenantId, {
      dns: records,
      status,
      verifiedAt: status === "active" ? new Date().toISOString() : d.verifiedAt || null,
    });
    this.log(tenantId, { action: status === "active" ? "verified" : "verification_failed", domainId, domain: d.domain, detail: `Domain "${d.domain}" — ${verifiedCount}/6 DNS records verified (${status})` });
    return {
      domainId,
      domain: d.domain,
      status,
      records: records,
      verifiedCount,
      failing: Object.entries(records).filter(([, r]) => !r.verified).map(([k]) => k),
      summary: status === "active"
        ? `Domain "${d.domain}" verified — all 6 DNS records confirmed, mail routing active`
        : `Domain "${d.domain}" needs attention — ${verifiedCount}/6 records verified`,
    };
  }

  domainHealth(tenantId: string, domainId: string) {
    const d = this.getDomain(tenantId, domainId);
    const uptime = 99 + (hashStr(d.domain + "uptime") % 100) / 100;
    const deliverability = 70 + (hashStr(d.domain + "deliv") % 30);
    const blacklisted = hashStr(d.domain + "bl") % 7 === 0;
    const blacklists = blacklisted ? (["SpamCop", "Barracuda", "Spamhaus"].filter((b: string) => hashStr(d.domain + b) % 2 === 0)) : [];
    const reputation = 40 + (hashStr(d.domain + "rep") % 60);
    const cert = hashStr(d.domain + "cert") % 9 === 0 ? "expiring" : "valid";
    const health = reputation >= 75 ? "healthy" : reputation >= 50 ? "fair" : "critical";
    return {
      domainId,
      domain: d.domain,
      status: d.status,
      uptimePercent: uptime,
      deliverabilityScore: deliverability,
      blacklisted,
      blacklists,
      reputationScore: reputation,
      certStatus: cert,
      health,
      nextCheck: new Date(Date.now() + 24 * 3600000).toISOString(),
      summary: `${d.domain} — ${health} (${reputation}/100 reputation${blacklisted ? `, listed on ${blacklists.join(", ")}` : ""})`,
    };
  }

  reputationMonitor(tenantId: string) {
    const domains = DataStore.mem().find("mail_domains", (d: any) => d.tenantId === tenantId);
    const monitored = domains.map(d => {
      const health = this.domainHealth(tenantId, d._id);
      const alerts: string[] = [];
      if (health.blacklisted) alerts.push(`Listed on ${health.blacklists.join(", ")} — take corrective action`);
      if (health.reputationScore < 50) alerts.push("Reputation below 50 — warm up sending volume");
      if (d.status === "action_required") alerts.push("DNS records failing — verify the domain");
      return { ...health, alerts };
    });
    return {
      monitored,
      flagged: monitored.filter(m => m.blacklisted || m.reputationScore < 50 || m.status === "action_required"),
      summary: `${monitored.length} domain(s) monitored — ${monitored.filter(m => m.alerts.length > 0).length} need attention`,
    };
  }

  setDomainPolicy(tenantId: string, domainId: string, input: any) {
    const d = this.getDomain(tenantId, domainId);
    const premium = ["business", "enterprise", "n0va1o"].includes(d.plan);
    if ((input.dmarcEnforce !== undefined || input.mtaSts !== undefined) && !premium) {
      throw new Error("DMARC enforcement and MTA-STS require the Business plan or higher");
    }
    if (input.brandProtection !== undefined && !["enterprise", "n0va1o"].includes(d.plan)) {
      throw new Error("Brand Protection requires the Enterprise plan");
    }
    const policies = {
      spfStrict: input.spfStrict !== undefined ? !!input.spfStrict : d.policies.spfStrict,
      dmarcEnforce: input.dmarcEnforce !== undefined ? !!input.dmarcEnforce : d.policies.dmarcEnforce,
      mtaSts: input.mtaSts !== undefined ? !!input.mtaSts : d.policies.mtaSts,
      tlsRpt: input.tlsRpt !== undefined ? !!input.tlsRpt : d.policies.tlsRpt,
      brandProtection: input.brandProtection !== undefined ? !!input.brandProtection : d.policies.brandProtection,
    };
    const dns: Record<string, any> = { ...d.dns };
    if (policies.dmarcEnforce) dns.dmarc = { ...dns.dmarc, record: `v=DMARC1; p=reject; rua=mailto:dmarc@${d.domain}` };
    else if (policies.spfStrict) dns.spf = { ...dns.spf, record: `v=spf1 -all` };
    const updated = DataStore.mem().update("mail_domains", (x: any) => x._id === domainId && x.tenantId === tenantId, { policies, dns });
    this.log(tenantId, { action: "policy_updated", domainId, domain: d.domain, detail: `Policies for "${d.domain}" updated` });
    return { domainId, domain: d.domain, policies: updated.policies, summary: `Security policies for "${d.domain}" updated` };
  }

  domainLog(tenantId: string, limit = 20) {
    const log = DataStore.mem().find("mail_domain_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, limit);
    return { log, total: log.length, summary: `${log.length} domain event(s) recorded` };
  }

  domainSummary(tenantId: string) {
    const list = this.listDomains(tenantId);
    const monitor = this.reputationMonitor(tenantId);
    const avgReputation = list.domains.length
      ? Math.round(list.domains.reduce((acc, d) => acc + (d.reputation && d.reputation.score !== null ? d.reputation.score : 50 + (hashStr(d.domain + "rep") % 60)), 0) / list.domains.length)
      : 0;
    return {
      totals: list.totals,
      avgReputation,
      flagged: monitor.flagged.length,
      summary: `${list.totals.total} domain(s), ${list.totals.active} active, average reputation ${avgReputation}/100`,
      seed: hashStr(tenantId + "domain_summary"),
    };
  }
}

export const mailDomain = new MailDomainService();
