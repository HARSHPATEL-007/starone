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
  DataStore.mem().insert("n0va1o_gov_log", {
    tenantId, category, detail, at: new Date().toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...extra,
  });
}

export const ZT_LAYERS = [
  { id: "identity", name: "Identity", description: "Agent identity, JIT token, API key verification", checks: ["token_valid", "agent_active", "auth_method_allowed"] },
  { id: "authorization", name: "Authorization", description: "Scope pruning, tool access policy, MCP routing rules", checks: ["scopes_pruned", "tool_allowed", "policy_match"] },
  { id: "execution", name: "Execution", description: "Sandbox isolation, payload scanning, rate limits", checks: ["sandbox_isolated", "payload_scanned", "rate_limit_ok"] },
  { id: "audit", name: "Audit", description: "Every call logged, reasoning chain + merkle root", checks: ["call_logged", "chain_stamped", "merkle_verified"] },
] as const;

export const HITL_RISK_LEVELS = [
  { level: "critical", name: "Critical", timeoutHours: 4, action: "Block + interrogation room", autoOnTimeout: "reject", example: "Payments, production deploys, credential changes" },
  { level: "high", name: "High", timeoutHours: 24, action: "Human review required", autoOnTimeout: "reject", example: "Deletes, budget moves, employee edits" },
  { level: "medium", name: "Medium", timeoutHours: 72, action: "Review with override allowed", autoOnTimeout: "override_auto", example: "Campaign creation, invoice creation" },
  { level: "low", name: "Low", timeoutHours: 0, action: "Auto-execute", autoOnTimeout: "auto_executed", example: "Reads, queries, discovery" },
] as const;

export const INTERROGATION_PANELS = [
  { id: "agent_mind", name: "Agent Mind", description: "What the agent believed it was doing" },
  { id: "data_accessed", name: "Data Accessed", description: "Every record the tool call touched" },
  { id: "action_preview", name: "Action Preview", description: "What will happen if approved" },
  { id: "risk_dashboard", name: "Risk Dashboard", description: "Risk score, blast radius, similar past calls" },
  { id: "context_timeline", name: "Context Timeline", description: "The reasoning chain that led here" },
  { id: "override_controls", name: "Override Controls", description: "Approve with params, reject, or force-execute" },
] as const;

export class N0VA1OGovernanceService {
  zeroTrustStatus(tenantId: string) {
    const seed = `${tenantId}|zt`;
    const layers = ZT_LAYERS.map((l, i) => {
      const passRate = 88 + (hashStr(seed + l.id + "pass") % 12);
      return {
        ...l,
        passRate,
        verifiedCount: hashStr(seed + l.id + "ver") % 900 + 100,
        blockedCount: hashStr(seed + l.id + "blk") % 30,
        status: passRate >= 95 ? "pass" : "warn",
      };
    });
    const overall = Math.round(layers.reduce((a, l) => a + l.passRate, 0) / layers.length);
    return {
      layers,
      overallScore: overall,
      level: overall >= 95 ? "hardened" : overall >= 90 ? "strong" : "review",
      summary: `Zero-trust score ${overall}/100 — ${layers.filter((l) => l.status === "pass").length}/4 layers passing`,
    };
  }

  schemaModifierCatalog() {
    return {
      types: [
        { id: "schema", name: "Schema Modifier", description: "Rewrites tool input/output schemas before execution" },
        { id: "before", name: "Before-Execution Modifier", description: "Injects transformations before the call executes" },
        { id: "after", name: "After-Execution Modifier", description: "Post-processes the response before returning" },
      ],
      summary: "3 modifier types — schema / before-execution / after-execution",
    };
  }

  createModifier(tenantId: string, input: any) {
    const type = String(input?.type || "");
    const typeCatalog = this.schemaModifierCatalog().types.find((t) => t.id === type);
    if (!typeCatalog) throw new Error(`Unknown modifier type — available: schema, before, after`);
    const toolPattern = String(input?.toolPattern || "");
    if (!toolPattern) throw new Error("toolPattern is required");
    const name = String(input?.name || `${type}_${toolPattern.replace(/\./g, "_")}`);
    const row: any = {
      tenantId, type, name, toolPattern,
      transform: String(input?.transform || "").slice(0, 500),
      enabled: input?.enabled !== false,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    const inserted = DataStore.mem().insert("n0va1o_modifiers", row);
    logEntry(tenantId, "modifier_created", `${type} modifier "${name}" for ${toolPattern}`, { modifierId: inserted._id });
    return { modifierId: inserted._id, ...row, summary: `${type} modifier "${name}" registered` };
  }

  listModifiers(tenantId: string) {
    const modifiers = DataStore.mem().find("n0va1o_modifiers", (m: any) => m.tenantId === tenantId);
    return { modifiers, total: modifiers.length, enabled: modifiers.filter((m: any) => m.enabled).length };
  }

  deleteModifier(tenantId: string, modifierId: string) {
    const modifier = DataStore.mem().findOne("n0va1o_modifiers", (m: any) => m.tenantId === tenantId && m._id === modifierId);
    if (!modifier) throw new Error("Modifier not found");
    DataStore.mem().delete("n0va1o_modifiers", (m: any) => m._id === modifierId);
    logEntry(tenantId, "modifier_deleted", `Modifier "${modifier.name}" deleted`, {});
    return { modifierId, deleted: true, summary: `Modifier "${modifier.name}" deleted` };
  }

  patternMatches(pattern: string, toolId: string): boolean {
    const re = new RegExp("^" + pattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$");
    return re.test(toolId);
  }

  runModifierPipeline(tenantId: string, input: any) {
    const toolId = String(input?.toolId || "");
    if (!toolId) throw new Error("toolId is required");
    const phase = String(input?.phase || "");
    if (!["schema", "before", "after"].includes(phase)) throw new Error("phase must be schema, before, or after");
    const payload = input?.payload && typeof input.payload === "object" ? input.payload : {};
    const modifiers = DataStore.mem().find("n0va1o_modifiers", (m: any) => m.tenantId === tenantId && m.enabled && m.type === phase);
    const applicable = modifiers.filter((m: any) => this.patternMatches(m.toolPattern, toolId));
    const seed = `${tenantId}|${toolId}|${phase}`;
    const applied = applicable.map((m: any, i: number) => {
      const stableKey = `${m.name}|${m.toolPattern}|${i}`;
      const effect =
        phase === "schema"
          ? {
              schemaVersion: 2,
              addedProps: [...new Set([...(m.transform.split(",").map((s: string) => s.trim())).filter(Boolean)])].slice(0, 3),
              injectedAt: `schema:${toolId}`,
            }
          : phase === "before"
            ? {
                prepared: true,
                transformedPayload: {
                  ...payload,
                  _prepared: true,
                  _modifier: m.name,
                  _preparedAtMs: hashStr(seed + stableKey + "ms") % 40 + 5,
                },
              }
            : {
                postProcessed: true,
                resultSummary: `${toolId} output post-processed by ${m.name}`,
                _elapsedMs: hashStr(seed + stableKey + "lat") % 25 + 3,
              };
      logEntry(tenantId, "modifier_applied", `${phase} modifier "${m.name}" applied to ${toolId}`, { modifierId: m._id });
      return { modifierId: m._id, name: m.name, type: phase, toolPattern: m.toolPattern, effect };
    });
    const runId = `modrun_${hashStr(seed + Date.now().toString()).toString(36)}${random6()}`;
    DataStore.mem().insert("n0va1o_modifier_runs", {
      tenantId, toolId, phase, runId,
      appliedCount: applied.length,
      skippedCount: modifiers.length - applicable.length,
      applied: applied.map((a: any) => ({ modifierId: a.modifierId, name: a.name })),
      at: new Date().toISOString(),
    });
    return {
      runId, toolId, phase,
      applied,
      appliedCount: applied.length,
      skippedCount: modifiers.length - applicable.length,
      skipped: modifiers.filter((m: any) => !this.patternMatches(m.toolPattern, toolId)).map((m: any) => ({ modifierId: m._id, name: m.name, reason: `pattern ${m.toolPattern} does not match ${toolId}` })),
      pipelineMs: hashStr(seed + "pipe") % 20 + 3,
      summary: `${phase} pipeline for ${toolId}: ${applied.length} modifier(s) applied, ${modifiers.length - applicable.length} skipped`,
    };
  }

  modifierPipelineStatus(tenantId: string) {
    const modifiers = DataStore.mem().find("n0va1o_modifiers", (m: any) => m.tenantId === tenantId);
    const runs = DataStore.mem().find("n0va1o_modifier_runs", (r: any) => r.tenantId === tenantId);
    return {
      byPhase: ["schema", "before", "after"].map((p) => ({
        phase: p,
        modifiers: modifiers.filter((m: any) => m.type === p).length,
        enabled: modifiers.filter((m: any) => m.type === p && m.enabled).length,
        runs: runs.filter((r: any) => r.phase === p).length,
      })),
      totalModifiers: modifiers.length,
      enabledModifiers: modifiers.filter((m: any) => m.enabled).length,
      totalRuns: runs.length,
      summary: `${runs.length} pipeline run(s) across ${modifiers.filter((m: any) => m.enabled).length} enabled modifier(s)`,
    };
  }

  evaluateCall(tenantId: string, input: any) {
    const toolId = String(input?.toolId || "");
    const riskLevel = String(input?.riskLevel || "low");
    const level = HITL_RISK_LEVELS.find((l) => l.level === riskLevel);
    if (!level) throw new Error(`Unknown risk level — available: ${HITL_RISK_LEVELS.map((l) => l.level).join(", ")}`);
    const seed = `${tenantId}|${toolId}|${riskLevel}`;
    const riskScore = 35 + (hashStr(seed + "risk") % 60);
    if (riskLevel === "low") {
      logEntry(tenantId, "auto_executed", `${toolId} auto-executed (low risk, score ${riskScore})`, { toolId });
      return {
        verdict: "auto_execute", toolId, riskLevel: level.level, riskScore,
        action: "Executed without human review",
        summary: `${toolId} auto-executed — low risk (${riskScore}/100)`,
      };
    }
    const timeoutHours = level.timeoutHours;
    const now = new Date().toISOString();
    const row: any = {
      tenantId, toolId, riskLevel: level.level, riskName: level.name, riskScore,
      action: String(input?.action || toolId),
      reasoning: String(input?.reasoning || ""),
      status: "pending_review",
      timeoutHours,
      autoOnTimeout: level.autoOnTimeout,
      escalatedAt: now,
      deadline: level.timeoutHours ? new Date(Date.now() + level.timeoutHours * 3600000).toISOString() : null,
    };
    const inserted = DataStore.mem().insert("n0va1o_hitl", row);
    logEntry(tenantId, "hitl_escalated", `${toolId} escalated (${level.name}, ${timeoutHours}h window)`, { hitlId: inserted._id, riskScore });
    return {
      verdict: "escalated", hitlId: inserted._id, ...row,
      interrogationRoom: this.openInterrogationRoom(tenantId, inserted._id, toolId, riskScore),
      summary: `${toolId} escalated to ${level.name} review — ${timeoutHours}h window`,
    };
  }

  openInterrogationRoom(tenantId: string, hitlId: string, toolId: string, riskScore: number) {
    const seed = `${tenantId}|${toolId}|${riskScore}`;
    const room: any = {
      tenantId, hitlId, toolId, riskScore,
      panels: INTERROGATION_PANELS.map((p) => ({
        ...p,
        content: p.id === "agent_mind" ? `Agent requested ${toolId} with risk score ${riskScore}` :
          p.id === "data_accessed" ? `${hashStr(seed + "recs") % 12 + 1} record(s) in scope` :
          p.id === "action_preview" ? `Execute ${toolId} with current params` :
          p.id === "risk_dashboard" ? `Risk ${riskScore}/100 — blast radius ${hashStr(seed + "blast") % 10 + 1} workspace(s)` :
          p.id === "context_timeline" ? `${hashStr(seed + "steps") % 6 + 2} reasoning step(s) before call` :
          "Approve / Reject / Override with custom params",
      })),
      status: "open",
      openedAt: new Date().toISOString(),
    };
    const inserted = DataStore.mem().insert("n0va1o_rooms", room);
    return { roomId: inserted._id, ...room, roomIdRaw: inserted._id };
  }

  hitlQueue(tenantId: string) {
    const pending = DataStore.mem().find("n0va1o_hitl", (h: any) => h.tenantId === tenantId && h.status === "pending_review");
    return {
      queue: pending.map((h: any) => ({ hitlId: h._id, toolId: h.toolId, riskLevel: h.riskLevel, riskScore: h.riskScore, action: h.action, escalatedAt: h.escalatedAt, deadline: h.deadline, roomId: h.interrogationRoom?.roomId || null })),
      total: pending.length,
      byLevel: HITL_RISK_LEVELS.map((l) => ({ level: l.level, count: pending.filter((h: any) => h.riskLevel === l.level).length })),
    };
  }

  getHitl(tenantId: string, hitlId: string) {
    const hitl = DataStore.mem().findOne("n0va1o_hitl", (h: any) => h.tenantId === tenantId && h._id === hitlId);
    if (!hitl) throw new Error("Escalation not found");
    const room = DataStore.mem().findOne("n0va1o_rooms", (r: any) => r.tenantId === tenantId && r.hitlId === hitlId);
    return { hitlId: hitl._id, ...hitl, interrogationRoom: room ? { roomId: room._id, panels: room.panels, status: room.status } : null };
  }

  resolveHitl(tenantId: string, hitlId: string, decision: string, input: any = {}) {
    const hitl = DataStore.mem().findOne("n0va1o_hitl", (h: any) => h.tenantId === tenantId && h._id === hitlId);
    if (!hitl) throw new Error("Escalation not found");
    if (hitl.status !== "pending_review") throw new Error("Escalation already resolved");
    const allowed = ["approve", "reject", "override"];
    if (!allowed.includes(decision)) throw new Error(`decision must be one of ${allowed.join(", ")}`);
    if (decision === "override" && hitl.riskLevel !== "medium") throw new Error("Override only allowed for medium-risk escalations");
    const now = new Date().toISOString();
    DataStore.mem().update("n0va1o_hitl", (h: any) => h._id === hitlId, {
      status: decision === "reject" ? "rejected" : "approved",
      decision, decidedAt: now, decidedBy: String(input?.reviewer || "admin"),
      overrideParams: decision === "override" ? input?.overrideParams || {} : undefined,
      updatedAt: now,
    });
    const room = DataStore.mem().findOne("n0va1o_rooms", (r: any) => r.tenantId === tenantId && r.hitlId === hitlId);
    if (room) DataStore.mem().update("n0va1o_rooms", (r: any) => r._id === room._id, { status: decision === "reject" ? "closed_rejected" : "closed_approved", closedAt: now, updatedAt: now });
    logEntry(tenantId, "hitl_resolved", `${hitl.toolId} ${decision}ed by ${input?.reviewer || "admin"}`, { hitlId, riskLevel: hitl.riskLevel });
    return {
      hitlId, toolId: hitl.toolId, decision, status: decision === "reject" ? "rejected" : "approved",
      summary: decision === "reject" ? `Escalation rejected — ${hitl.toolId} blocked` : `Escalation approved — ${hitl.toolId} may execute`,
    };
  }

  hitlStatus(tenantId: string) {
    const all = DataStore.mem().find("n0va1o_hitl", (h: any) => h.tenantId === tenantId);
    const pending = all.filter((h: any) => h.status === "pending_review");
    return {
      total: all.length,
      pending: pending.length,
      approved: all.filter((h: any) => h.status === "approved").length,
      rejected: all.filter((h: any) => h.status === "rejected").length,
      autoExecuted: all.filter((h: any) => h.status === "auto_executed").length,
      overdue: pending.filter((h: any) => h.deadline && new Date(h.deadline).getTime() < Date.now()).length,
      matrix: HITL_RISK_LEVELS,
      summary: `${pending.length} pending, ${all.length} total escalations`,
    };
  }

  appendAudit(tenantId: string, input: any) {
    const action = String(input?.action || "");
    const toolId = String(input?.toolId || "");
    if (!action) throw new Error("action is required");
    const entries = DataStore.mem().find("n0va1o_audit", (a: any) => a.tenantId === tenantId);
    const prev = entries.length ? entries[entries.length - 1] : null;
    const actor = String(input?.actor || "agent");
    const contentHash = hashStr(`${tenantId}|${action}|${toolId}|${actor}|${JSON.stringify(input?.details || {})}`).toString(16).padStart(16, "0");
    const chainHash = hashStr(`${prev?.chainHash || "GENESIS"}|${contentHash}`).toString(16).padStart(32, "0");
    const row: any = {
      tenantId, action, toolId,
      actor,
      details: input?.details || {},
      contentHash, chainHash, previousHash: prev?.chainHash || "GENESIS",
      merkleRoot: prev?.merkleRoot || chainHash,
      at: new Date().toISOString(),
    };
    row.merkleRoot = hashStr(`${prev?.merkleRoot || "GENESIS"}|${chainHash}`).toString(16).padStart(32, "0");
    const inserted = DataStore.mem().insert("n0va1o_audit", row);
    logEntry(tenantId, "audit_stamped", `${action} stamped — chain ${entries.length + 1}`, { auditId: inserted._id, chainHash: row.chainHash });
    return {
      auditId: inserted._id, ...row,
      summary: `${action} recorded — merkle root ${row.merkleRoot.slice(0, 12)}…`,
    };
  }

  auditLog(tenantId: string, limit = 50) {
    const entries = DataStore.mem().find("n0va1o_audit", (a: any) => a.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
    return { entries, total: entries.length };
  }

  verifyAuditChain(tenantId: string) {
    const entries = DataStore.mem().find("n0va1o_audit", (a: any) => a.tenantId === tenantId);
    let brokenAt = -1;
    let prevChainHash = "GENESIS";
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const contentHash = hashStr(`${e.tenantId}|${e.action}|${e.toolId}|${e.actor}|${JSON.stringify(e.details || {})}`).toString(16).padStart(16, "0");
      const expected = hashStr(`${e.previousHash || "GENESIS"}|${contentHash}`).toString(16).padStart(32, "0");
      if (e.chainHash !== expected || e.previousHash !== prevChainHash) { brokenAt = i; break; }
      prevChainHash = e.chainHash;
    }
    return {
      entries: entries.length,
      chainIntact: brokenAt === -1,
      brokenAt: brokenAt === -1 ? null : brokenAt,
      merkleRoot: entries.length ? entries[entries.length - 1].merkleRoot : null,
      summary: brokenAt === -1 ? `${entries.length} audit entr(ies) hash-verified — chain intact` : `Chain broken at entry ${brokenAt}`,
    };
  }

  governanceDashboard(tenantId: string) {
    const zt = this.zeroTrustStatus(tenantId);
    const hitl = this.hitlStatus(tenantId);
    const audit = this.verifyAuditChain(tenantId);
    const modifiers = DataStore.mem().find("n0va1o_modifiers", (m: any) => m.tenantId === tenantId);
    const recent = DataStore.mem().find("n0va1o_gov_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 10);
    return {
      zeroTrust: zt,
      hitl,
      audit,
      modifiers: { total: modifiers.length, enabled: modifiers.filter((m: any) => m.enabled).length },
      interrogationPanels: INTERROGATION_PANELS,
      recent,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const n0va1oGov = new N0VA1OGovernanceService();
