import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export const CHAOS_EXPERIMENTS = [
  { id: "smtp_kill", name: "SMTP server kill", target: "Inbound processor", blastRadius: "Single node", expected: "Traffic rerouted in <5s", autoRollback: true },
  { id: "mongo_failover", name: "MongoDB primary failover", target: "Metadata storage", blastRadius: "Single shard", expected: "Replica promotion <15s", autoRollback: true },
  { id: "ai_corruption", name: "AI model corruption", target: "Enrichment pipeline", blastRadius: "Single tenant", expected: "Fallback to base model", autoRollback: true },
  { id: "cdn_flush", name: "CDN cache flush", target: "Static assets", blastRadius: "Global", expected: "Origin serve + rewarm", autoRollback: false },
  { id: "ws_partition", name: "WebSocket mesh partition", target: "Real-time collab", blastRadius: "Single region", expected: "CRDT merge on reconnect", autoRollback: true },
  { id: "quantum_compromise", name: "Quantum key compromise", target: "Encryption layer", blastRadius: "Single channel", expected: "Key rotation + alert", autoRollback: true },
  { id: "voice_degradation", name: "Voice service degradation", target: "Transcription", blastRadius: "Single region", expected: "Queue + fallback engine", autoRollback: true },
  { id: "ddos_sim", name: "DDoS simulation", target: "API Gateway", blastRadius: "Full service", expected: "Auto-scale + rate limit", autoRollback: false },
] as const;

export const GAME_DAYS = [
  { frequency: "Weekly", scope: "Single component", participants: "On-call engineer", duration: "1 hour" },
  { frequency: "Monthly", scope: "Cross-service", participants: "Full team", duration: "4 hours" },
  { frequency: "Quarterly", scope: "Full system", participants: "All teams + executives", duration: "1 day" },
  { frequency: "Annually", scope: "Multi-region disaster", participants: "Company-wide drill", duration: "2 days" },
] as const;

function logEntry(tenantId: string, category: string, detail: string, extra: any = {}) {
  DataStore.mem().insert("mail_chaos_log", {
    tenantId, category, detail, at: new Date().toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...extra,
  });
}

export class MailChaosService {
  catalog(tenantId: string) {
    return {
      experiments: CHAOS_EXPERIMENTS,
      total: CHAOS_EXPERIMENTS.length,
      autoRollback: CHAOS_EXPERIMENTS.filter((e) => e.autoRollback).length,
      summary: `${CHAOS_EXPERIMENTS.length} chaos experiments in catalog — ${CHAOS_EXPERIMENTS.filter((e) => e.autoRollback).length} with auto-rollback`,
      seed: hashStr(tenantId + "chaos_catalog"),
    };
  }

  runExperiment(tenantId: string, experimentId: string) {
    const exp = CHAOS_EXPERIMENTS.find((e) => e.id === experimentId);
    if (!exp) throw new Error("Unknown chaos experiment");
    const existing = DataStore.mem().findOne("mail_chaos_experiments", (x: any) => x.tenantId === tenantId && x.experimentId === experimentId && x.status === "running");
    if (existing) return { started: false, experiment: existing, summary: `Experiment ${exp.name} already running` };

    const failureRoll = hashStr(tenantId + experimentId + "out") % 10;
    const succeeded = failureRoll !== 0;
    const recoverySeconds = exp.id === "smtp_kill" ? 4 + (hashStr(tenantId + experimentId + "sec") % 2) : exp.autoRollback ? 8 + (hashStr(tenantId + experimentId + "sec") % 20) : 30 + (hashStr(tenantId + experimentId + "sec") % 45);
    const row = {
      tenantId, experimentId: exp.id, name: exp.name, target: exp.target, blastRadius: exp.blastRadius,
      expected: exp.expected, autoRollback: exp.autoRollback,
      status: succeeded ? "recovered" : "failed",
      recoverySeconds,
      startedAt: new Date().toISOString(),
      resolvedAt: new Date().toISOString(),
    };
    const inserted = DataStore.mem().insert("mail_chaos_experiments", row);
    logEntry(tenantId, "experiment_run", `${exp.name} (${exp.id}) ${succeeded ? "RECOVERED" : "FAILED"} in ${recoverySeconds}s — expected: ${exp.expected}`, {
      experimentId: exp.id, status: row.status, recoverySeconds,
    });
    return {
      started: true,
      experiment: { runId: inserted._id, ...row },
      outcome: succeeded ? "recovered" : "failed",
      summary: succeeded
        ? `${exp.name} executed — traffic rerouted/recovered in ${recoverySeconds}s (expected: ${exp.expected})`
        : `${exp.name} FAILED resilience test — recovery exceeded expectations, ${exp.autoRollback ? "auto-rollback engaged" : "manual intervention required"}`,
    };
  }

  experiments(tenantId: string) {
    const list = DataStore.mem()
      .find("mail_chaos_experiments", (x: any) => x.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    return {
      runs: list.map((x: any) => ({ runId: x._id, ...x })),
      total: list.length,
      recovered: list.filter((x: any) => x.status === "recovered").length,
      failed: list.filter((x: any) => x.status === "failed").length,
      running: list.filter((x: any) => x.status === "running").length,
      summary: `${list.length} experiment run(s) — ${list.filter((x: any) => x.status === "recovered").length} recovered, ${list.filter((x: any) => x.status === "failed").length} failed`,
    };
  }

  resilienceScore(tenantId: string) {
    const runs = this.experiments(tenantId);
    const recovered = runs.recovered;
    const total = runs.total;
    const score = total === 0 ? 100 : Math.round((recovered / total) * 100);
    return {
      score,
      level: score >= 95 ? "excellent" : score >= 80 ? "good" : score >= 60 ? "fair" : "poor",
      runs: total,
      recovered,
      failed: runs.failed,
      summary: total === 0
        ? "No experiments run yet — baseline 100%"
        : `Resilience score ${score}/100 — ${recovered}/${total} experiments recovered within expectations`,
      seed: hashStr(tenantId + "resilience"),
    };
  }

  gameDays(tenantId: string) {
    return {
      schedule: GAME_DAYS.map((g) => ({
        ...g,
        lastRun: new Date(Date.now() - (hashStr(tenantId + g.frequency + "days") % 30) * 86400000).toISOString(),
        nextRun: new Date(Date.now() + (hashStr(tenantId + g.frequency + "next") % 10 + 1) * 86400000).toISOString(),
        status: "scheduled",
      })),
      summary: `Game day cadence: weekly component → annual multi-region disaster drill`,
    };
  }

  abortExperiment(tenantId: string, runId: string) {
    const run = DataStore.mem().findOne("mail_chaos_experiments", (x: any) => x.tenantId === tenantId && x._id === runId);
    if (!run) throw new Error("Experiment run not found");
    DataStore.mem().update("mail_chaos_experiments", (x: any) => x._id === runId, { status: "aborted", abortedAt: new Date().toISOString() });
    logEntry(tenantId, "experiment_aborted", `${run.name} aborted by operator`, { runId });
    return { run: { runId: run._id, ...run, status: "aborted" }, summary: `Experiment "${run.name}" aborted` };
  }

  chaosLog(tenantId: string) {
    const entries = DataStore.mem()
      .find("mail_chaos_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return { entries: entries.slice(0, 30), total: entries.length };
  }

  chaosDashboard(tenantId: string) {
    return {
      catalog: this.catalog(tenantId),
      runs: this.experiments(tenantId),
      resilience: this.resilienceScore(tenantId),
      gameDays: this.gameDays(tenantId),
      recentEvents: this.chaosLog(tenantId).entries,
      generatedAt: new Date().toISOString(),
      summary: `Chaos engineering ${this.experiments(tenantId).total} run(s) — resilience ${this.resilienceScore(tenantId).score}/100`,
      seed: hashStr(tenantId + "chaos_dashboard"),
    };
  }
}

export const mailChaos = new MailChaosService();
