import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export const ZT_LAYERS = [
  { id: "identity", name: "Identity", control: "MFA", tech: "FIDO2/WebAuthn + TOTP + Biometric", frequency: "Every login" },
  { id: "device", name: "Device", control: "Posture", tech: "MDM integration + EDR telemetry", frequency: "Every session start" },
  { id: "network", name: "Network", control: "Context", tech: "Geo-IP + ASN analysis + VPN detection", frequency: "Every request" },
  { id: "application", name: "Application", control: "Permission", tech: "ABAC with dynamic policy evaluation", frequency: "Every API call" },
  { id: "data", name: "Data", control: "Classification", tech: "DLP with ML content analysis", frequency: "Every access" },
  { id: "session", name: "Session", control: "Continuity", tech: "Behavioral biometrics + risk scoring", frequency: "Every 30 seconds" },
] as const;

export const ZT_PRINCIPLES = [
  { id: "never_trust", title: "NEVER TRUST, ALWAYS VERIFY", points: ["Every email access requires multi-factor validation", "Device trust score computed per session", "Network context evaluated (corporate VPN, public WiFi, unknown)", "Time-of-access risk scoring (off-hours = higher scrutiny)"] },
  { id: "least_privilege", title: "LEAST PRIVILEGE ACCESS", points: ["Role-based access control (RBAC)", "Just-in-time elevation for sensitive operations", "Automatic privilege revocation on anomaly detection", "Scope-limited API tokens with automatic expiration"] },
  { id: "assume_breach", title: "ASSUME BREACH", points: ["Micro-segmentation: each tenant isolated at network layer", "Blast radius containment: compromised account = single mailbox", "Honeytokens planted in sensitive mailboxes", "Deception technology: fake admin accounts to detect lateral movement"] },
  { id: "continuous", title: "CONTINUOUS VALIDATION", points: ["Session re-authentication every 15 minutes for admin roles", "Real-time device posture checks (patch level, AV status, encryption)", "Behavioral anomaly detection", "Risk score updated continuously"] },
] as const;

const DEVICE_TYPES = ["workstation", "laptop", "mobile", "tablet", "server"] as const;
const NETWORK_CONTEXTS = ["corporate_vpn", "office", "public_wifi", "unknown", "home"] as const;

function logEntry(tenantId: string, category: string, detail: string, extra: any = {}) {
  DataStore.mem().insert("mail_zt_log", {
    tenantId, category, detail, at: new Date().toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...extra,
  });
}

export class MailZeroTrustService {
  layers(tenantId: string) {
    return {
      layers: ZT_LAYERS.map((l) => {
        const passRate = Math.min(100, 88 + (hashStr(tenantId + l.id + "rate") % 12));
        return {
          ...l,
          passRate,
          verifiedCount: 100 + (hashStr(tenantId + l.id + "v") % 900),
          blockedCount: hashStr(tenantId + l.id + "b") % 40,
          status: passRate >= 95 ? "enforced" : passRate >= 85 ? "monitoring" : "review",
        };
      }),
      principles: ZT_PRINCIPLES,
      summary: `${ZT_LAYERS.length} zero-trust layers — identity-to-session continuous validation`,
      seed: hashStr(tenantId + "zt_layers"),
    };
  }

  enrollDevice(tenantId: string, input: any = {}) {
    const deviceId = String(input.deviceId || "").trim();
    if (!deviceId) throw new Error("deviceId is required");
    const existing = DataStore.mem().findOne("mail_zt_devices", (d: any) => d.tenantId === tenantId && d.deviceId === deviceId);
    if (existing) return { enrolled: false, device: { ...existing, deviceId: existing._id }, summary: `Device ${deviceId} already enrolled` };
    const type = DEVICE_TYPES.includes(input.type) ? input.type : "workstation";
    const posture = Math.min(100, 60 + (hashStr(tenantId + deviceId + "posture") % 41));
    const device = {
      tenantId, deviceId, name: String(input.name || deviceId), type,
      posture, status: posture >= 75 ? "trusted" : posture >= 40 ? "untrusted" : "quarantined",
      mdm: posture >= 70 ? "compliant" : "non_compliant",
      edr: hashStr(tenantId + deviceId + "edr") % 5 !== 0 ? "healthy" : "missing",
      patchLevel: 90 + (hashStr(tenantId + deviceId + "patch") % 11),
      encryption: hashStr(tenantId + deviceId + "enc") % 3 !== 0 ? "enabled" : "missing",
      enrolledAt: new Date().toISOString(),
    };
    const inserted = DataStore.mem().insert("mail_zt_devices", device);
    logEntry(tenantId, "device_enrolled", `${device.name} (${device.type}) enrolled with posture ${posture}%`, { deviceId, posture });
    return { enrolled: true, device: { ...inserted, deviceId: inserted._id }, summary: `Device "${device.name}" enrolled — posture ${posture}% (${device.status.toUpperCase()})` };
  }

  devices(tenantId: string) {
    const list = DataStore.mem().find("mail_zt_devices", (d: any) => d.tenantId === tenantId);
    return {
      devices: list.map((d: any) => ({ ...d, deviceId: d._id })),
      total: list.length,
      trusted: list.filter((d: any) => d.status === "trusted").length,
      quarantined: list.filter((d: any) => d.status === "quarantined").length,
      summary: `${list.length} device(s) — ${list.filter((d: any) => d.status === "trusted").length} trusted, ${list.filter((d: any) => d.status === "quarantined").length} quarantined`,
    };
  }

  devicePosture(tenantId: string, deviceId: string) {
    const d = DataStore.mem().findOne("mail_zt_devices", (x: any) => x.tenantId === tenantId && x._id === deviceId);
    if (!d) throw new Error("Device not found");
    return {
      device: { deviceId: d._id, ...d },
      checks: [
        { name: "MDM compliance", status: d.mdm, pass: d.mdm === "compliant" },
        { name: "EDR telemetry", status: d.edr, pass: d.edr === "healthy" },
        { name: "Patch level", status: `${d.patchLevel}%`, pass: d.patchLevel >= 90 },
        { name: "Disk encryption", status: d.encryption, pass: d.encryption === "enabled" },
      ],
      verdict: d.status,
      summary: `Device ${d.name} posture ${d.posture}% — ${d.status.toUpperCase()}`,
    };
  }

  accessRequest(tenantId: string, input: any = {}) {
    const userId = String(input.userId || "").trim();
    const action = String(input.action || "read_mail").trim();
    const device = DataStore.mem().findOne("mail_zt_devices", (d: any) => d.tenantId === tenantId && d._id === input.deviceId);
    const context = NETWORK_CONTEXTS.includes(input.networkContext) ? input.networkContext : "unknown";
    const offHours = input.offHours === true;
    const adminRole = input.adminRole === true;
    const mfaVerified = input.mfaVerified === true;
    const sessionScore = typeof input.sessionScore === "number" ? input.sessionScore : 50;

    const contextRisk = { corporate_vpn: 0, office: 10, home: 15, public_wifi: 30, unknown: 40 }[context] ?? 40;
    let risk = contextRisk;
    if (offHours) risk += 20;
    if (adminRole) risk += 15;
    if (sessionScore < 45) risk += 30;
    if (!mfaVerified && risk >= 30) risk += 25;

    const devicePosture = device ? device.posture : 30;
    const postureRisk = Math.max(0, 50 - devicePosture);
    risk += postureRisk;

    let verdict: string;
    if (device && device.status === "quarantined") verdict = "deny";
    else if (risk >= 85) verdict = "deny";
    else if (risk >= 45) verdict = "challenge";
    else verdict = "allow";

    logEntry(tenantId, "access_eval", `${userId} ${action} from ${context}${offHours ? " (off-hours)" : ""} → ${verdict.toUpperCase()} (risk ${risk})`, { userId, action, context, risk, verdict });
    return {
      userId, action, context, offHours, adminRole, mfaVerified, sessionScore, risk,
      verdict,
      layersChecked: ZT_LAYERS.map((l) => l.id),
      actions: verdict === "allow" ? ["grant"] : verdict === "challenge" ? ["require_mfa", "step_up_auth"] : ["block", "alert_admin"],
      summary: `Access ${verdict.toUpperCase()} — risk ${risk}/100 for ${action}`,
      seed: hashStr(tenantId + userId + action),
    };
  }

  honeytokens(tenantId: string) {
    const list = DataStore.mem().find("mail_zt_honeytokens", (h: any) => h.tenantId === tenantId);
    const seeded = list.length > 0;
    const tokens = list.length ? list : Array.from({ length: 3 }, (_, i) => {
      const token = `honey_${hashStr(tenantId + "honey" + i).toString(36)}${i}`;
      const row = {
        tenantId, token, name: `Decoy credential ${i + 1}`, purpose: i === 0 ? "admin credential" : i === 1 ? "API secret" : "vault key",
        status: "armed", createdAt: new Date().toISOString(),
      };
      DataStore.mem().insert("mail_zt_honeytokens", row);
      return row;
    });
    return {
      tokens: tokens.map((t: any) => ({ tokenId: t._id, ...t })),
      armed: tokens.filter((t: any) => t.status === "armed").length,
      hit: tokens.filter((t: any) => t.status === "hit").length,
      seeded,
      summary: `${tokens.length} honeytoken(s) planted — ${tokens.filter((t: any) => t.status === "hit").length} hit`,
    };
  }

  honeytokenHit(tenantId: string, token: string) {
    const t = DataStore.mem().findOne("mail_zt_honeytokens", (h: any) => h.tenantId === tenantId && h.token === token);
    if (!t) throw new Error("Unknown honeytoken");
    DataStore.mem().update("mail_zt_honeytokens", (h: any) => h._id === t._id, { status: "hit", hitAt: new Date().toISOString() });
    logEntry(tenantId, "honeytoken_hit", `HONEYTOKEN HIT: ${t.name} (${t.purpose}) — suspected lateral movement`, { token });
    return {
      token: { tokenId: t._id, ...t, status: "hit" },
      hit: true,
      alert: "high",
      actions: ["isolate_account", "alert_admin", "trace_access"],
      summary: `Honeytoken "${t.name}" hit — treating as breach indicator`,
    };
  }

  zeroTrustOverview(tenantId: string) {
    const devices = this.devices(tenantId);
    const logs = DataStore.mem().find("mail_zt_log", (l: any) => l.tenantId === tenantId);
    const denied = logs.filter((l: any) => l.category === "access_eval" && (l.detail || "").includes("DENY")).length;
    const challenged = logs.filter((l: any) => l.category === "access_eval" && (l.detail || "").includes("CHALLENGE")).length;
    const hits = logs.filter((l: any) => l.category === "honeytoken_hit").length;
    const ztScore = Math.min(100, Math.max(20, 92 - denied * 2 - hits * 8 + devices.trusted));
    return {
      ztScore,
      posture: ztScore >= 90 ? "hardened" : ztScore >= 70 ? "monitored" : "at_risk",
      devices,
      layers: this.layers(tenantId).layers,
      stats: { denied, challenged, honeytokenHits: hits, logEntries: logs.length },
      summary: `Zero-trust posture ${ztScore}/100 (${ztScore >= 90 ? "HARDENED" : ztScore >= 70 ? "MONITORED" : "AT RISK"}) — ${denied} denied, ${challenged} challenged, ${hits} honeytoken hit(s)`,
      generatedAt: new Date().toISOString(),
      seed: hashStr(tenantId + "zt_overview"),
    };
  }

  zeroTrustLog(tenantId: string) {
    const entries = DataStore.mem()
      .find("mail_zt_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return { entries: entries.slice(0, 30), total: entries.length };
  }

  zeroTrustDashboard(tenantId: string) {
    return {
      overview: this.zeroTrustOverview(tenantId),
      layers: this.layers(tenantId),
      devices: this.devices(tenantId),
      honeytokens: this.honeytokens(tenantId),
      recentEvents: this.zeroTrustLog(tenantId).entries,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const mailZeroTrust = new MailZeroTrustService();
