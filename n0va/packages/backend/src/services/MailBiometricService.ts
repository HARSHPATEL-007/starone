import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export const BIOMETRIC_SIGNALS = [
  { id: "keystroke_dynamics", name: "Keystroke Dynamics", confidence: 99.7, unit: "typing rhythm, pressure, intervals", useCase: "Session anomaly" },
  { id: "mouse_movement", name: "Mouse Movement", confidence: 98.9, unit: "velocity, acceleration, path curvature", useCase: "Bot detection" },
  { id: "gait_analysis", name: "Gait Analysis", confidence: 99.2, unit: "mobile accelerometer patterns", useCase: "Device trust" },
  { id: "neural_patterns", name: "Neural Patterns", confidence: 97.5, unit: "BCI signal signatures (research)", useCase: "Future authentication" },
  { id: "eye_tracking", name: "Eye Tracking", confidence: 99.1, unit: "saccade patterns, pupil dilation", useCase: "Focus verification" },
  { id: "sub_vocal", name: "Sub-vocal Recognition", confidence: 96.8, unit: "throat microphone EMG", useCase: "Silent command auth" },
  { id: "touch_pressure", name: "Touch Pressure", confidence: 98.5, unit: "screen pressure sensitivity", useCase: "Device ownership" },
  { id: "scroll_behavior", name: "Scroll Behavior", confidence: 97.3, unit: "scroll speed, direction patterns", useCase: "Bot detection" },
] as const;

const RISK_LEVELS = ["trusted", "suspicious", "blocked"] as const;

function logEntry(tenantId: string, category: string, detail: string, extra: any = {}) {
  DataStore.mem().insert("mail_biometric_log", {
    tenantId, category, detail, at: new Date().toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...extra,
  });
}

export class MailBiometricService {
  private session(tenantId: string, sessionId: string) {
    let s = DataStore.mem().findOne("mail_biometric_sessions", (x: any) => x.tenantId === tenantId && x.sessionId === sessionId);
    if (!s) {
      s = {
        tenantId, sessionId, trustScore: 100, riskLevel: "trusted",
        signals: {}, anomalyCount: 0, checks: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      DataStore.mem().insert("mail_biometric_sessions", s);
    }
    return s;
  }

  signals(tenantId: string) {
    return {
      signals: BIOMETRIC_SIGNALS.map((sig) => ({
        ...sig,
        deviationPct: parseFloat((hashStr(tenantId + sig.id + "dev") % 25).toFixed(1)),
        samples: 100 + (hashStr(tenantId + sig.id + "samples") % 4000),
      })),
      total: BIOMETRIC_SIGNALS.length,
      summary: `${BIOMETRIC_SIGNALS.length} continuous-auth signals monitored — best fidelity ${BIOMETRIC_SIGNALS.reduce((a, b) => (b.confidence > a.confidence ? b : a)).name} at ${BIOMETRIC_SIGNALS.reduce((a, b) => (b.confidence > a.confidence ? b : a)).confidence}%`,
      seed: hashStr(tenantId + "biometric_signals"),
    };
  }

  recordSignal(tenantId: string, sessionId: string, signalId: string, value?: number) {
    const sig = BIOMETRIC_SIGNALS.find((s) => s.id === signalId);
    if (!sig) throw new Error("Unknown biometric signal");
    const s = this.session(tenantId, sessionId);
    const deviation = Math.round(((value === undefined ? hashStr(tenantId + sessionId + signalId) % 100 : Math.abs(value)) / 100) * 30);
    const prev = s.signals[signalId];
    const trend = prev === undefined ? 0 : (deviation > prev ? 1 : deviation < prev ? -1 : 0);
    s.signals[signalId] = deviation;
    s.checks += 1;
    const anomaly = deviation > 12;
    if (anomaly) s.anomalyCount += 1;
    const trustDelta = Math.min(20, Math.round(deviation / 1.5));
    s.trustScore = Math.max(0, s.trustScore - trustDelta);
    s.riskLevel = s.trustScore >= 80 ? "trusted" : s.trustScore >= 45 ? "suspicious" : "blocked";
    s.updatedAt = new Date().toISOString();
    DataStore.mem().update("mail_biometric_sessions", (x: any) => x.tenantId === tenantId && x.sessionId === sessionId, s);
    if (anomaly) {
      logEntry(tenantId, "signal_anomaly", `${sig.name} deviation ${deviation}% on session ${sessionId} — trust ${s.trustScore} (${s.riskLevel})`, { sessionId, signal: signalId, deviation });
    }
    return {
      sessionId, signal: signalId, signalName: sig.name, deviation, anomaly, trend,
      trustScore: s.trustScore, riskLevel: s.riskLevel,
      summary: anomaly
        ? `${sig.name} deviated ${deviation}% — trust dropped to ${s.trustScore} (${s.riskLevel.toUpperCase()})`
        : `${sig.name} within baseline (deviation ${deviation}%) — trust ${s.trustScore}`,
    };
  }

  sessionScore(tenantId: string, sessionId: string) {
    const s = this.session(tenantId, sessionId);
    const breakdown = BIOMETRIC_SIGNALS.map((sig) => ({
      signal: sig.id, name: sig.name, deviation: s.signals[sig.id] ?? 0,
      status: (s.signals[sig.id] ?? 0) > 12 ? "anomaly" : "nominal",
    }));
    return {
      sessionId, trustScore: s.trustScore, riskLevel: s.riskLevel, anomalyCount: s.anomalyCount, checks: s.checks,
      breakdown,
      reAuthRequired: s.trustScore < 45,
      summary: `Session trust ${s.trustScore}/100 (${s.riskLevel.toUpperCase()}) — ${s.anomalyCount} anomaly(ies) across ${s.checks} check(s)`,
    };
  }

  evaluateAuth(tenantId: string, sessionId: string) {
    const s = this.session(tenantId, sessionId);
    const verdict = s.riskLevel === "trusted" ? "allow" : s.riskLevel === "suspicious" ? "challenge_mfa" : "deny";
    logEntry(tenantId, "session_eval", `Session ${sessionId} evaluated — ${verdict} (trust ${s.trustScore})`, { sessionId, verdict, trustScore: s.trustScore });
    return {
      sessionId, verdict, trustScore: s.trustScore, riskLevel: s.riskLevel,
      actions: verdict === "allow" ? ["continue"] : verdict === "challenge_mfa" ? ["force_mfa", "notify_user"] : ["revoke_session", "notify_admin"],
      summary: `Continuous auth verdict: ${verdict.toUpperCase()} for session ${sessionId}`,
    };
  }

  baseline(tenantId: string) {
    const sessions = DataStore.mem().find("mail_biometric_sessions", (x: any) => x.tenantId === tenantId);
    const avgTrust = sessions.length ? Math.round(sessions.reduce((s, x: any) => s + x.trustScore, 0) / sessions.length) : 100;
    const anomalies = DataStore.mem().find("mail_biometric_log", (l: any) => l.tenantId === tenantId && l.category === "signal_anomaly");
    return {
      sessionCount: sessions.length,
      activeSessions: sessions.filter((x: any) => x.riskLevel !== "blocked").length,
      blockedSessions: sessions.filter((x: any) => x.riskLevel === "blocked").length,
      avgTrustScore: avgTrust,
      overallRisk: avgTrust >= 80 ? "trusted" : avgTrust >= 45 ? "suspicious" : "blocked",
      anomalyCount: anomalies.length,
      summary: `${sessions.length} session(s), avg trust ${avgTrust}/100, ${anomalies.length} anomaly(ies)`,
      seed: hashStr(tenantId + "biometric_baseline"),
    };
  }

  biometricLog(tenantId: string) {
    const entries = DataStore.mem()
      .find("mail_biometric_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return { entries: entries.slice(0, 30), total: entries.length };
  }

  biometricDashboard(tenantId: string) {
    return {
      signals: this.signals(tenantId).signals,
      signalCount: BIOMETRIC_SIGNALS.length,
      baseline: this.baseline(tenantId),
      sessions: DataStore.mem().find("mail_biometric_sessions", (x: any) => x.tenantId === tenantId)
        .map((x: any) => ({ sessionId: x.sessionId, trustScore: x.trustScore, riskLevel: x.riskLevel, checks: x.checks, anomalyCount: x.anomalyCount }))
        .sort((a: any, b: any) => b.trustScore - a.trustScore),
      recentEvents: this.biometricLog(tenantId).entries,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const mailBiometric = new MailBiometricService();
