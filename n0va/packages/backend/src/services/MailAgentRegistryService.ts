import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function random6(): string {
  return String(Math.floor(Math.random() * 900000) + 100000);
}

export const AGENT_PERSONAS = [
  { type: "mail_concierge", name: "Mail Concierge", description: "Manage mailboxes, folders, labels, and cleanup", autonomy: "high", tools: ["read", "organize"] },
  { type: "reply_assistant", name: "Reply Assistant", description: "Draft, refine, and send replies with approval gates", autonomy: "medium", tools: ["write"] },
  { type: "meeting_agent", name: "Meeting Agent", description: "Extract meeting details and prepare briefings", autonomy: "medium", tools: ["read", "ai"] },
  { type: "task_extractor", name: "Task Extractor", description: "Extract action items and keep tasks in sync", autonomy: "high", tools: ["read", "ai", "cross-module"] },
  { type: "crm_sync", name: "CRM Sync Agent", description: "Keep contacts and deal context in sync with CRM", autonomy: "medium", tools: ["read", "cross-module"] },
  { type: "compliance_agent", name: "Compliance Agent", description: "Retention, holds, PII scanning, audit trail", autonomy: "high", tools: ["read", "compliance"] },
  { type: "threat_hunter", name: "Threat Hunter", description: "Monitor abuse signals and quarantine threats", autonomy: "high", tools: ["read", "security"] },
  { type: "executive_brief", name: "Executive Brief", description: "Daily digest, priority summary, meeting prep", autonomy: "read-only", tools: ["read", "ai"] },
  { type: "cross_module", name: "Cross-Module Agent", description: "Bridge mail with tasks, calendar, docs, vault", autonomy: "medium", tools: ["cross-module"] },
  { type: "custom", name: "Custom Agent", description: "Bring your own prompt and tool set", autonomy: "medium", tools: ["read", "write"] },
];

export const AGENT_TOOLS = [
  { name: "mail.read.message", action: "Read a message", category: "read", rateLimit: 100, approval: false },
  { name: "mail.read.thread", action: "Read a thread", category: "read", rateLimit: 50, approval: false },
  { name: "mail.read.search", action: "Search mail", category: "read", rateLimit: 100, approval: false },
  { name: "mail.write.send", action: "Send a message", category: "write", rateLimit: 20, approval: true },
  { name: "mail.write.reply", action: "Reply to a message", category: "write", rateLimit: 20, approval: true },
  { name: "mail.write.schedule", action: "Schedule a message", category: "write", rateLimit: 20, approval: true },
  { name: "mail.write.draft", action: "Save a draft", category: "write", rateLimit: 50, approval: false },
  { name: "mail.organize.move", action: "Move message", category: "organize", rateLimit: 50, approval: false },
  { name: "mail.organize.archive", action: "Archive message", category: "organize", rateLimit: 50, approval: false },
  { name: "mail.organize.label", action: "Apply label", category: "organize", rateLimit: 50, approval: false },
  { name: "mail.organize.cleanup", action: "Clean up mailbox", category: "organize", rateLimit: 10, approval: true },
  { name: "mail.ai.summarize", action: "Summarize content", category: "ai", rateLimit: 100, approval: false },
  { name: "mail.ai.classify", action: "Classify intent / category", category: "ai", rateLimit: 100, approval: false },
  { name: "mail.ai.generate", action: "Generate content", category: "ai", rateLimit: 50, approval: false },
  { name: "mail.ai.analyze", action: "Analyze attachments", category: "ai", rateLimit: 50, approval: false },
  { name: "mail.security.quarantine", action: "Quarantine message", category: "security", rateLimit: 20, approval: true },
  { name: "mail.security.scan", action: "Scan for threats", category: "security", rateLimit: 50, approval: false },
  { name: "mail.compliance.retention", action: "Apply retention policy", category: "compliance", rateLimit: 10, approval: true },
  { name: "mail.compliance.hold", action: "Place legal hold", category: "compliance", rateLimit: 10, approval: true },
  { name: "mail.task.create", action: "Create a task", category: "cross-module", rateLimit: 50, approval: false },
  { name: "mail.calendar.create_event", action: "Create calendar event", category: "cross-module", rateLimit: 30, approval: true },
  { name: "mail.crm.upsert_lead", action: "Upsert CRM lead", category: "cross-module", rateLimit: 30, approval: false },
  { name: "mail.vault.save", action: "Save to vault", category: "cross-module", rateLimit: 30, approval: true },
  { name: "mail.docs.create", action: "Create doc", category: "cross-module", rateLimit: 20, approval: false },
  { name: "mail.bulk.send", action: "Bulk send campaign", category: "write", rateLimit: 5, approval: true },
];

function logAudit(tenantId: string, agentId: string, agentName: string, tool: string, status: string, riskScore: number, latencyMs: number, detail: string) {
  DataStore.mem().insert("mail_agent_audit", {
    tenantId, agentId, agentName, tool, status, riskScore, latencyMs, detail,
    at: new Date().toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });
}

export class MailAgentRegistryService {
  agentPersonas() {
    return {
      personas: AGENT_PERSONAS,
      summary: `${AGENT_PERSONAS.length} agent personas available`,
    };
  }

  toolCatalog() {
    const categories = [...new Set(AGENT_TOOLS.map((t) => t.category))];
    return {
      tools: AGENT_TOOLS,
      categories: categories.map((c) => ({
        category: c,
        count: AGENT_TOOLS.filter((t) => t.category === c).length,
      })),
      total: AGENT_TOOLS.length,
      summary: `${AGENT_TOOLS.length} tools across ${categories.length} categories`,
    };
  }

  toolDiscover(tenantId: string, query: string) {
    const q = String(query || "").toLowerCase().trim();
    const tokens = q.split(/\s+/).filter(Boolean);
    const scored = AGENT_TOOLS.map((t) => {
      let score = 0;
      const hay = `${t.name} ${t.action} ${t.category}`.toLowerCase();
      for (const tok of tokens) {
        if (hay.includes(tok)) score += 1;
      }
      if (tokens.some((tok) => t.category.includes(tok) || tok.includes(t.category))) score += 2;
      return { ...t, score };
    });
    const ranked = (tokens.length ? scored.filter((t) => t.score > 0) : scored)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 6)
      .map((t: any) => ({ name: t.name, action: t.action, category: t.category, rateLimit: t.rateLimit, approval: t.approval }));
    const topTool = ranked[0] || AGENT_TOOLS[0];
    const workflow = ranked.length >= 3 ? [ranked[0].name, ranked[1].name, ranked[2].name] : ranked.map((r: any) => r.name);
    return {
      query: query || "",
      tools: ranked,
      total: ranked.length,
      suggestedWorkflow: workflow,
      summary: tokens.length ? `${ranked.length} tool(s) matched "${query}"` : `Top ${ranked.length} tools by capability`,
      seed: hashStr((tenantId || "") + (query || "discover")),
    };
  }

  registerAgent(tenantId: string, input: any) {
    const name = String((input && input.agentName) || "").trim();
    if (!name) throw new Error("agentName is required");
    const type = String((input && input.agentType) || "").trim();
    const persona = AGENT_PERSONAS.find((p) => p.type === type);
    if (!persona) throw new Error(`Unknown agent type "${type}"`);
    const store = DataStore.mem();
    const agent = store.insert("mail_agents", {
      tenantId,
      agentName: name,
      agentType: type,
      persona: persona.name,
      autonomy: (input && input.autonomyLevel) || persona.autonomy,
      description: String((input && input.description) || persona.description),
      webhookUrl: (input && input.webhookUrl) || null,
      maxDailyActions: Math.max(1, Number((input && input.maxDailyActions) || 50)),
      actionsToday: 0,
      status: "active",
      apiKey: `n0va_ag_${hashStr(`${tenantId}|${name}|${type}`).toString(16)}${random6()}`,
      permissions: persona.tools,
      createdAt: new Date().toISOString(),
    });
    logAudit(tenantId, agent._id, name, "registry.register", "ok", 5, 12, "Agent registered");
    return {
      agentId: agent._id,
      agentName: agent.agentName,
      agentType: agent.agentType,
      persona: agent.persona,
      autonomy: agent.autonomy,
      status: agent.status,
      apiKey: agent.apiKey,
      permissions: agent.permissions,
      maxDailyActions: agent.maxDailyActions,
      summary: `Agent "${name}" (${persona.name}) registered`,
    };
  }

  listAgents(tenantId: string) {
    const agents = DataStore.mem().find("mail_agents", (a: any) => a.tenantId === tenantId);
    const sorted = [...agents].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return sorted.map((a: any) => ({
      agentId: a._id,
      agentName: a.agentName,
      agentType: a.agentType,
      persona: a.persona,
      autonomy: a.autonomy,
      status: a.status,
      actionsToday: a.actionsToday,
      maxDailyActions: a.maxDailyActions,
      webhookUrl: a.webhookUrl || null,
      createdAt: a.createdAt,
    }));
  }

  getAgent(tenantId: string, agentId: string) {
    const agent = DataStore.mem().findOne("mail_agents", (a: any) => a._id === agentId && a.tenantId === tenantId);
    if (!agent) throw new Error(`Agent "${agentId}" not found`);
    return {
      agentId: agent._id,
      agentName: agent.agentName,
      agentType: agent.agentType,
      persona: agent.persona,
      autonomy: agent.autonomy,
      description: agent.description,
      status: agent.status,
      actionsToday: agent.actionsToday,
      maxDailyActions: agent.maxDailyActions,
      webhookUrl: agent.webhookUrl || null,
      apiKey: agent.apiKey,
      permissions: agent.permissions,
      createdAt: agent.createdAt,
    };
  }

  updateAgent(tenantId: string, agentId: string, input: any) {
    const agent = DataStore.mem().findOne("mail_agents", (a: any) => a._id === agentId && a.tenantId === tenantId);
    if (!agent) throw new Error(`Agent "${agentId}" not found`);
    const patch: any = {};
    if (input && input.active !== undefined) patch.status = input.active ? "active" : "disabled";
    if (input && input.maxDailyActions !== undefined) patch.maxDailyActions = Math.max(1, Number(input.maxDailyActions));
    if (input && input.webhookUrl !== undefined) patch.webhookUrl = input.webhookUrl || null;
    DataStore.mem().update("mail_agents", (a: any) => a._id === agentId && a.tenantId === tenantId, patch);
    const row = { ...agent, ...patch };
    return {
      agentId: row._id,
      agentName: row.agentName,
      status: row.status,
      maxDailyActions: row.maxDailyActions,
      summary: `Agent "${row.agentName}" ${row.status === "active" ? "enabled" : "disabled"}`,
    };
  }

  deactivateAgent(tenantId: string, agentId: string) {
    return this.updateAgent(tenantId, agentId, { active: false });
  }

  createSession(tenantId: string, agentId: string, context: any) {
    const agent = DataStore.mem().findOne("mail_agents", (a: any) => a._id === agentId && a.tenantId === tenantId);
    if (!agent) throw new Error(`Agent "${agentId}" not found`);
    if (agent.status !== "active") throw new Error(`Agent "${agent.agentName}" is not active`);
    const session = DataStore.mem().insert("mail_agent_sessions", {
      tenantId,
      agentId,
      agentName: agent.agentName,
      context: String((context && context.context) || (context && context.name) || "default"),
      startedAt: new Date().toISOString(),
      status: "active",
      actions: 0,
    });
    return {
      sessionId: session._id,
      agentId,
      agentName: agent.agentName,
      context: session.context,
      status: session.status,
      startedAt: session.startedAt,
      summary: `Session opened for "${agent.agentName}"`,
    };
  }

  endSession(tenantId: string, sessionId: string) {
    const session = DataStore.mem().findOne("mail_agent_sessions", (s: any) => s._id === sessionId && s.tenantId === tenantId);
    if (!session) throw new Error(`Session "${sessionId}" not found`);
    DataStore.mem().update("mail_agent_sessions", (s: any) => s._id === sessionId && s.tenantId === tenantId, {
      status: "closed", endedAt: new Date().toISOString(),
    });
    return { sessionId, status: "closed", actions: session.actions, summary: "Session closed" };
  }

  agentSessions(tenantId: string) {
    const sessions = DataStore.mem().find("mail_agent_sessions", (s: any) => s.tenantId === tenantId);
    const sorted = [...sessions].sort((a: any, b: any) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    return {
      sessions: sorted.map((s: any) => ({
        sessionId: s._id,
        agentId: s.agentId,
        agentName: s.agentName,
        context: s.context,
        status: s.status,
        actions: s.actions,
        startedAt: s.startedAt,
        endedAt: s.endedAt || null,
      })),
      active: sessions.filter((s: any) => s.status === "active").length,
      total: sessions.length,
      summary: `${sessions.length} session(s) — ${sessions.filter((s: any) => s.status === "active").length} active`,
    };
  }

  private requireAgent(tenantId: string, agentId: string): any {
    const agent = DataStore.mem().findOne("mail_agents", (a: any) => a._id === agentId && a.tenantId === tenantId);
    if (!agent) throw new Error(`Agent "${agentId}" not found`);
    if (agent.status !== "active") throw new Error(`Agent "${agent.agentName}" is not active`);
    return agent;
  }

  agentAction(tenantId: string, agentId: string, input: any) {
    const agent = this.requireAgent(tenantId, agentId);
    const toolName = String((input && input.tool) || "").trim();
    const tool = AGENT_TOOLS.find((t) => t.name === toolName);
    if (!tool) throw new Error(`Unknown tool "${toolName}"`);
    if (agent.actionsToday >= agent.maxDailyActions) throw new Error(`Agent "${agent.agentName}" reached its daily action limit (${agent.maxDailyActions})`);
    const params = (input && input.params) || {};
    const paramsKey = JSON.stringify(params || {});
    const riskScore = hashStr(`${agentId}|${toolName}|${paramsKey}`) % 100;
    const latencyMs = 8 + (hashStr(`${agentId}|${toolName}|lat`) % 40);
    const sessionId = (input && input.sessionId) || null;
    if (sessionId) {
      const sess = DataStore.mem().findOne("mail_agent_sessions", (s: any) => s._id === sessionId && s.tenantId === tenantId);
      if (sess && sess.status === "active") {
        DataStore.mem().update("mail_agent_sessions", (s: any) => s._id === sessionId && s.tenantId === tenantId, { actions: (sess.actions || 0) + 1 });
      }
    }
    if (tool.approval) {
      const hitl = DataStore.mem().insert("mail_agent_hitl", {
        tenantId, agentId, agentName: agent.agentName, tool: toolName, toolAction: tool.action,
        params: paramsKey, status: "pending_review", requestedAt: new Date().toISOString(),
        riskScore, latencyMs,
      });
      logAudit(tenantId, agentId, agent.agentName, toolName, "pending_approval", riskScore, latencyMs, `Action requires approval — queued for review`);
      return {
        approved: false,
        hitlId: hitl._id,
        tool: toolName,
        riskScore,
        latencyMs,
        summary: `"${tool.action}" requires approval — queued in the interrogation room`,
      };
    }
    DataStore.mem().update("mail_agents", (a: any) => a._id === agentId && a.tenantId === tenantId, { actionsToday: (agent.actionsToday || 0) + 1 });
    const detail = `Executed ${toolName} ${Object.keys(params).length ? `with ${Object.keys(params).length} param(s)` : "with no params"}`;
    logAudit(tenantId, agentId, agent.agentName, toolName, "ok", riskScore, latencyMs, detail);
    return {
      approved: true,
      tool: toolName,
      execution: { status: "ok", latencyMs, riskScore },
      summary: `"${tool.action}" executed in ${latencyMs}ms (risk ${riskScore})`,
    };
  }

  hitlQueue(tenantId: string) {
    const items = DataStore.mem().find("mail_agent_hitl", (h: any) => h.tenantId === tenantId);
    const sorted = [...items].sort((a: any, b: any) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    return {
      queue: sorted.map((h: any) => ({
        hitlId: h._id,
        agentId: h.agentId,
        agentName: h.agentName,
        tool: h.tool,
        toolAction: h.toolAction,
        params: h.params,
        status: h.status,
        riskScore: h.riskScore,
        requestedAt: h.requestedAt,
        decidedAt: h.decidedAt || null,
        decision: h.decision || null,
      })),
      pending: sorted.filter((h: any) => h.status === "pending_review").length,
      total: sorted.length,
      summary: `${sorted.length} review item(s) — ${sorted.filter((h: any) => h.status === "pending_review").length} pending`,
    };
  }

  resolveHitl(tenantId: string, hitlId: string, decision: string) {
    if (!["approve", "reject", "modify"].includes(decision)) throw new Error(`Unknown decision "${decision}" — use approve, reject, or modify`);
    const hitl = DataStore.mem().findOne("mail_agent_hitl", (h: any) => h._id === hitlId && h.tenantId === tenantId);
    if (!hitl) throw new Error(`Review item "${hitlId}" not found`);
    if (hitl.status !== "pending_review") return { hitlId, status: hitl.status, summary: `Already ${hitl.status}` };
    const status = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "changes_requested";
    DataStore.mem().update("mail_agent_hitl", (h: any) => h._id === hitlId && h.tenantId === tenantId, {
      status, decision, decidedAt: new Date().toISOString(),
    });
    const agent = DataStore.mem().findOne("mail_agents", (a: any) => a._id === hitl.agentId && a.tenantId === tenantId);
    if (decision === "approve" && agent) {
      DataStore.mem().update("mail_agents", (a: any) => a._id === agent._id, { actionsToday: (agent.actionsToday || 0) + 1 });
      logAudit(tenantId, agent._id, agent.agentName, hitl.tool, "ok", hitl.riskScore, hitl.latencyMs, "Approved in interrogation room and executed");
    } else if (decision === "reject") {
      logAudit(tenantId, hitl.agentId, hitl.agentName, hitl.tool, "declined", hitl.riskScore, hitl.latencyMs, "Rejected in interrogation room");
    } else {
      logAudit(tenantId, hitl.agentId, hitl.agentName, hitl.tool, "changes_requested", hitl.riskScore, hitl.latencyMs, "Changes requested in interrogation room");
    }
    return { hitlId, decision, status, summary: `Review item ${status}` };
  }

  agentAuditLog(tenantId: string, agentId?: string) {
    const entries = DataStore.mem().find("mail_agent_audit", (a: any) => a.tenantId === tenantId && (!agentId || a.agentId === agentId));
    const sorted = [...entries].sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return {
      entries: sorted.slice(0, 50).map((a: any) => ({
        agentId: a.agentId,
        agentName: a.agentName,
        tool: a.tool,
        status: a.status,
        riskScore: a.riskScore,
        latencyMs: a.latencyMs,
        detail: a.detail,
        at: a.at,
      })),
      total: sorted.length,
      summary: `${sorted.length} audited action(s)`,
    };
  }

  agentFrameworkDashboard(tenantId: string) {
    const agents = DataStore.mem().find("mail_agents", (a: any) => a.tenantId === tenantId);
    const sessions = DataStore.mem().find("mail_agent_sessions", (s: any) => s.tenantId === tenantId);
    const audit = DataStore.mem().find("mail_agent_audit", (a: any) => a.tenantId === tenantId);
    const hitl = DataStore.mem().find("mail_agent_hitl", (h: any) => h.tenantId === tenantId);
    const actionsToday = agents.reduce((s: number, a: any) => s + (a.actionsToday || 0), 0);
    const ok = audit.filter((a: any) => a.status === "ok").length;
    const pending = hitl.filter((h: any) => h.status === "pending_review").length;
    const riskLevel = actionsToday + pending > 30 ? "elevated" : actionsToday + pending > 10 ? "moderate" : "low";
    const toolCounts: Record<string, number> = {};
    for (const a of audit) toolCounts[a.tool] = (toolCounts[a.tool] || 0) + 1;
    const topTools = Object.entries(toolCounts).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5).map(([tool, count]) => ({ tool, count }));
    const personas = AGENT_PERSONAS.map((p) => ({
      type: p.type,
      name: p.name,
      autonomy: p.autonomy,
      registered: agents.filter((a: any) => a.agentType === p.type).length,
    }));
    return {
      agents: agents.length,
      active: agents.filter((a: any) => a.status === "active").length,
      sessions: sessions.filter((s: any) => s.status === "active").length,
      actionsToday,
      pendingApprovals: pending,
      okActions: ok,
      riskLevel,
      personas,
      topTools,
      summary: `${agents.length} agent(s) — ${actionsToday} action(s) today, ${pending} approval(s) pending`,
      seed: hashStr(tenantId + "agent_seed"),
      generatedAt: new Date().toISOString(),
    };
  }
}

export const mailAgentRegistry = new MailAgentRegistryService();
