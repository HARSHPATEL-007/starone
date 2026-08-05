import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function random6(): string {
  return String(Math.floor(Math.random() * 900000) + 100000);
}

function logEntry(tenantId: string, category: string, detail: string, extra: any = {}) {
  DataStore.mem().insert("n0va1o_observability_log", {
    tenantId, category, detail, at: new Date().toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...extra,
  });
}

export const OBSERVABILITY_SIGNALS = [
  { id: "traces", name: "Distributed Traces", collector: "OTLP", retentionDays: 30 },
  { id: "metrics", name: "Metrics", collector: "Prometheus", retentionDays: 90 },
  { id: "logs", name: "Structured Logs", collector: "OTLP", retentionDays: 30 },
  { id: "events", name: "Events", collector: "stream", retentionDays: 90 },
  { id: "alerts", name: "Alerts", collector: "notifier", retentionDays: 365 },
] as const;

export const ERROR_CLASSES = [
  { id: "transient", name: "Transient", description: "Network blips, 5xx upstreams, timeouts — safe to retry", retryStrategy: "exponential", maxAttempts: 5, baseBackoffMs: 200 },
  { id: "system", name: "System", description: "Infrastructure failures — limited retries with backoff", retryStrategy: "jittered", maxAttempts: 3, baseBackoffMs: 1000 },
  { id: "persistent", name: "Persistent", description: "Deterministic failures (bad auth, bad schema) — do not retry", retryStrategy: "none", maxAttempts: 1, baseBackoffMs: 0 },
  { id: "user_error", name: "User Error", description: "Client-side mistakes — surface to caller", retryStrategy: "none", maxAttempts: 1, baseBackoffMs: 0 },
  { id: "unknown", name: "Unknown", description: "Unclassified — treat conservatively", retryStrategy: "fixed", maxAttempts: 2, baseBackoffMs: 500 },
] as const;

export class N0VA1OObservabilityService {
  observabilityCatalog() {
    return {
      signals: OBSERVABILITY_SIGNALS.map((s) => ({ ...s })),
      errorClasses: ERROR_CLASSES.map((e) => ({ ...e })),
      totalSignals: OBSERVABILITY_SIGNALS.length,
      totalErrorClasses: ERROR_CLASSES.length,
      summary: `${OBSERVABILITY_SIGNALS.length} observability signals · ${ERROR_CLASSES.length} error classes with retry policies`,
    };
  }

  recordTelemetry(tenantId: string, input: any) {
    const signal = String(input?.signal || "log");
    const signalInfo = OBSERVABILITY_SIGNALS.find((s) => s.id === signal);
    if (!signalInfo) throw new Error(`Unknown signal — available: ${OBSERVABILITY_SIGNALS.map((s) => s.id).join(", ")}`);
    const scope = String(input?.scope || "gateway");
    const now = new Date().toISOString();
    const row: any = {
      tenantId, signal, scope,
      value: input?.value ?? null,
      message: input?.message ? String(input.message) : null,
      severity: input?.severity ? String(input.severity) : "info",
      durationMs: Number.isFinite(input?.durationMs) ? Math.floor(input.durationMs) : null,
      status: input?.status ? String(input.status) : "ok",
      at: now,
      createdAt: now, updatedAt: now,
    };
    const inserted = DataStore.mem().insert("n0va1o_telemetry", row);
    return { telemetryId: inserted._id, ...row, summary: `${signal} · ${scope}${row.durationMs != null ? ` · ${row.durationMs}ms` : ""}` };
  }

  recordTrace(tenantId: string, input: any) {
    const name = String(input?.name || "").trim();
    if (!name) throw new Error("Trace name is required");
    const durationMs = Number.isFinite(input?.durationMs) ? Math.max(1, Math.floor(input.durationMs)) : 100 + (hashStr(`${tenantId}|${name}|dur`) % 900);
    const seed = `${tenantId}|${name}|${durationMs}`;
    const traceId = `tr_${hashStr(seed).toString(36)}${random6()}`;
    const spanCount = 2 + (hashStr(seed + "spans") % 4);
    const spans = Array.from({ length: spanCount }, (_, i) => ({
      spanId: `sp_${hashStr(seed + i).toString(36)}${random6()}`,
      name: i === 0 ? name : `${name}·step${i + 1}`,
      durationMs: i === 0 ? durationMs : Math.round(durationMs / (i + 2)),
      status: hashStr(seed + "span" + i) % 9 === 0 ? "error" : "ok",
    }));
    const status = input?.status ? String(input.status) : spans.some((s) => s.status === "error") ? "error" : "ok";
    const row: any = {
      tenantId, name, traceId, durationMs, spans, status,
      at: new Date().toISOString(),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    const inserted = DataStore.mem().insert("n0va1o_traces", row);
    return { traceId, ...row, traceIdRaw: inserted._id, summary: `${name} — ${durationMs}ms · ${spanCount} spans · ${status}` };
  }

  tracesList(tenantId: string, status?: string) {
    let traces = DataStore.mem().find("n0va1o_traces", (t: any) => t.tenantId === tenantId);
    if (status) traces = traces.filter((t: any) => t.status === status);
    return {
      traces: traces.sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime()).map((t: any) => ({ traceId: t.traceId, name: t.name, durationMs: t.durationMs, status: t.status, spanCount: t.spans.length, at: t.at })),
      total: traces.length,
      errors: traces.filter((t: any) => t.status === "error").length,
    };
  }

  getTrace(tenantId: string, traceId: string) {
    const trace = DataStore.mem().findOne("n0va1o_traces", (t: any) => t.tenantId === tenantId && t.traceId === traceId);
    if (!trace) throw new Error("Trace not found");
    return { traceId: trace.traceId, ...trace, summary: `${trace.name} — ${trace.durationMs}ms` };
  }

  telemetryStats(tenantId: string) {
    const rows = DataStore.mem().find("n0va1o_telemetry", (t: any) => t.tenantId === tenantId);
    return {
      bySignal: OBSERVABILITY_SIGNALS.map((s) => ({
        signal: s.id,
        count: rows.filter((r: any) => r.signal === s.id).length,
      })),
      total: rows.length,
      avgDurationMs: rows.filter((r: any) => r.durationMs != null).length
        ? Math.round(rows.filter((r: any) => r.durationMs != null).reduce((a, r: any) => a + r.durationMs, 0) / rows.filter((r: any) => r.durationMs != null).length)
        : 0,
      errors: rows.filter((r: any) => r.status === "error").length,
      summary: `${rows.length} telemetry record(s) across ${OBSERVABILITY_SIGNALS.length} signals`,
    };
  }

  reportError(tenantId: string, input: any) {
    const errorClass = String(input?.errorClass || "unknown");
    const cls = ERROR_CLASSES.find((e) => e.id === errorClass);
    if (!cls) throw new Error(`Unknown error class — available: ${ERROR_CLASSES.map((e) => e.id).join(", ")}`);
    const message = String(input?.message || "").trim();
    if (!message) throw new Error("Error message is required");
    const scope = String(input?.scope || "gateway");
    const seed = `${tenantId}|${message}|${scope}`;
    const errorId = `err_${hashStr(seed).toString(36)}${random6()}`;
    const row: any = {
      tenantId, errorId, errorClass, message, scope,
      severity: cls.id === "persistent" || cls.id === "user_error" ? "high" : cls.id === "system" ? "medium" : "low",
      retryable: cls.retryStrategy !== "none",
      attempts: 0,
      status: "open",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    DataStore.mem().insert("n0va1o_errors", row);
    logEntry(tenantId, "error_reported", `${errorClass} · ${scope} — ${message}`, { errorId });
    return { errorId, ...row, summary: `${errorClass} error reported — ${message}` };
  }

  retryDecision(errorId: string, attempt: number) {
    const err = DataStore.mem().findOne("n0va1o_errors", (e: any) => e.errorId === errorId);
    if (!err) throw new Error("Error not found");
    const cls = ERROR_CLASSES.find((e) => e.id === err.errorClass) || ERROR_CLASSES[4];
    const attemptNo = Math.max(1, Math.floor(attempt));
    const giveUp = attemptNo >= cls.maxAttempts;
    const backoffMs = giveUp ? 0 : Math.min(cls.baseBackoffMs * Math.pow(2, attemptNo - 1) + (hashStr(`${err.tenantId}|${errorId}|j${attemptNo}`) % 100), 60000);
    const nextAttempt = attemptNo + 1;
    DataStore.mem().update("n0va1o_errors", (e: any) => e.errorId === errorId, { attempts: attemptNo, updatedAt: new Date().toISOString() });
    return {
      errorId, errorClass: err.errorClass, attempt: attemptNo,
      verdict: giveUp ? "give_up" : "retry",
      backoffMs,
      maxAttempts: cls.maxAttempts,
      strategy: cls.retryStrategy,
      summary: giveUp ? `Giving up after ${attemptNo}/${cls.maxAttempts} attempt(s)` : `Retry #${nextAttempt} in ${backoffMs}ms (${cls.retryStrategy})`,
    };
  }

  resolveError(errorId: string) {
    const err = DataStore.mem().findOne("n0va1o_errors", (e: any) => e.errorId === errorId);
    if (!err) throw new Error("Error not found");
    DataStore.mem().update("n0va1o_errors", (e: any) => e.errorId === errorId, { status: "resolved", resolvedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    logEntry(err.tenantId, "error_resolved", `${err.errorClass} error resolved — ${err.message}`, { errorId });
    return { errorId, status: "resolved", summary: `Error resolved — ${err.message}` };
  }

  errorsList(tenantId: string, status?: string) {
    let errors = DataStore.mem().find("n0va1o_errors", (e: any) => e.tenantId === tenantId);
    if (status) errors = errors.filter((e: any) => e.status === status);
    return {
      errors: errors.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((e: any) => ({ errorId: e.errorId, errorClass: e.errorClass, message: e.message, scope: e.scope, severity: e.severity, attempts: e.attempts, status: e.status, createdAt: e.createdAt })),
      total: errors.length,
      open: errors.filter((e: any) => e.status === "open").length,
      byClass: ERROR_CLASSES.map((c) => ({ errorClass: c.id, count: errors.filter((e: any) => e.errorClass === c.id).length })),
    };
  }

  observabilityDashboard(tenantId: string) {
    return {
      catalog: this.observabilityCatalog(),
      telemetry: this.telemetryStats(tenantId),
      traces: this.tracesList(tenantId),
      errors: this.errorsList(tenantId),
      alerts: OBSERVABILITY_SIGNALS[4],
      summary: `${this.telemetryStats(tenantId).total} telemetry record(s) · ${this.tracesList(tenantId).total} trace(s) · ${this.errorsList(tenantId).open} open error(s)`,
    };
  }

  observabilityLog(tenantId: string) {
    return { entries: DataStore.mem().find("n0va1o_observability_log", (l: any) => l.tenantId === tenantId).sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 50) };
  }
}

export const n0va1oObservability = new N0VA1OObservabilityService();
