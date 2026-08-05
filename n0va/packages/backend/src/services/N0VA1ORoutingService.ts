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
  DataStore.mem().insert("n0va1o_routing_log", {
    tenantId, category, detail, at: new Date().toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...extra,
  });
}

export const MCP_TRANSPORTS = [
  { id: "stdio", name: "Stdio", description: "Local process spawn, zero-config", latencyP99: 5 },
  { id: "http_sse", name: "HTTP + SSE", description: "Stateless request/response with server-sent events", latencyP99: 25 },
  { id: "websocket", name: "WebSocket", description: "Persistent bidirectional, ideal for long-lived tools", latencyP99: 15 },
] as const;

export const PROTOCOL_TRANSLATORS = [
  { id: "rest", target: "REST", convertsFrom: ["soap", "graphql", "grpc"] },
  { id: "graphql", target: "GraphQL", convertsFrom: ["rest", "soap", "grpc"] },
  { id: "soap", target: "SOAP", convertsFrom: ["rest", "graphql", "grpc"] },
  { id: "grpc", target: "gRPC", convertsFrom: ["rest", "soap", "graphql"] },
] as const;

export const INTENT_KEYWORDS: Record<string, string[]> = {
  post: ["post", "share", "publish", "tweet", "announce", "broadcast"],
  read: ["read", "get", "fetch", "list", "retrieve", "show", "find", "search"],
  create: ["create", "make", "add", "new", "generate", "build", "write"],
  update: ["update", "edit", "change", "modify", "set", "adjust"],
  delete: ["delete", "remove", "cancel", "trash", "clear", "stop"],
  send: ["send", "email", "message", "notify", "deliver", "dm"],
  schedule: ["schedule", "book", "plan", "reserve", "calendar", "meeting"],
  analyze: ["analyze", "report", "stats", "metrics", "summary", "aggregate", "insights"],
  sync: ["sync", "import", "export", "migrate", "copy", "transfer"],
};

export const TOOL_ROUTING = [
  { id: "social.post", name: "Post to social channel", intent: "post", protocols: ["rest"], risk: "medium", hitl: false },
  { id: "social.read_feed", name: "Read social feed", intent: "read", protocols: ["rest", "graphql"], risk: "low", hitl: false },
  { id: "email.send", name: "Send email", intent: "send", protocols: ["rest"], risk: "medium", hitl: true },
  { id: "email.read", name: "Read email thread", intent: "read", protocols: ["rest"], risk: "low", hitl: false },
  { id: "crm.create_lead", name: "Create CRM lead", intent: "create", protocols: ["rest", "soap"], risk: "medium", hitl: false },
  { id: "crm.read_contacts", name: "Read CRM contacts", intent: "read", protocols: ["rest"], risk: "low", hitl: false },
  { id: "crm.update_deal", name: "Update CRM deal", intent: "update", protocols: ["rest"], risk: "medium", hitl: true },
  { id: "crm.delete_record", name: "Delete CRM record", intent: "delete", protocols: ["rest"], risk: "high", hitl: true },
  { id: "ads.create_campaign", name: "Create ad campaign", intent: "create", protocols: ["rest"], risk: "high", hitl: true },
  { id: "ads.read_campaigns", name: "Read ad campaigns", intent: "read", protocols: ["rest"], risk: "low", hitl: false },
  { id: "ads.update_budget", name: "Update campaign budget", intent: "update", protocols: ["rest"], risk: "high", hitl: true },
  { id: "analytics.query", name: "Query analytics", intent: "analyze", protocols: ["rest", "sql"], risk: "low", hitl: false },
  { id: "analytics.export", name: "Export analytics report", intent: "sync", protocols: ["rest"], risk: "low", hitl: false },
  { id: "schedule.book_meeting", name: "Book meeting", intent: "schedule", protocols: ["rest"], risk: "medium", hitl: false },
  { id: "schedule.read_calendar", name: "Read calendar", intent: "read", protocols: ["rest"], risk: "low", hitl: false },
  { id: "storage.upload_file", name: "Upload file", intent: "create", protocols: ["rest"], risk: "medium", hitl: false },
  { id: "storage.read_file", name: "Read file", intent: "read", protocols: ["rest"], risk: "low", hitl: false },
  { id: "storage.delete_file", name: "Delete file", intent: "delete", protocols: ["rest"], risk: "high", hitl: true },
  { id: "docs.create_page", name: "Create doc page", intent: "create", protocols: ["rest"], risk: "medium", hitl: false },
  { id: "docs.read_page", name: "Read doc page", intent: "read", protocols: ["rest"], risk: "low", hitl: false },
  { id: "finance.create_invoice", name: "Create invoice", intent: "create", protocols: ["rest", "soap"], risk: "high", hitl: true },
  { id: "finance.read_balance", name: "Read account balance", intent: "read", protocols: ["rest"], risk: "low", hitl: false },
  { id: "finance.create_payment", name: "Create payment", intent: "create", protocols: ["rest"], risk: "critical", hitl: true },
  { id: "devops.run_pipeline", name: "Run CI/CD pipeline", intent: "create", protocols: ["rest"], risk: "high", hitl: true },
  { id: "devops.read_issues", name: "Read issues", intent: "read", protocols: ["rest", "graphql"], risk: "low", hitl: false },
  { id: "devops.deploy", name: "Deploy to production", intent: "create", protocols: ["rest"], risk: "critical", hitl: true },
  { id: "hr.read_employees", name: "Read employee directory", intent: "read", protocols: ["rest"], risk: "low", hitl: false },
  { id: "hr.update_employee", name: "Update employee record", intent: "update", protocols: ["rest"], risk: "high", hitl: true },
  { id: "commerce.read_orders", name: "Read orders", intent: "read", protocols: ["rest"], risk: "low", hitl: false },
  { id: "commerce.update_inventory", name: "Update inventory", intent: "update", protocols: ["rest"], risk: "medium", hitl: false },
] as const;

export class N0VA1ORoutingService {
  mcpCatalog() {
    return {
      transports: MCP_TRANSPORTS,
      protocolTranslators: PROTOCOL_TRANSLATORS,
      endpoints: [
        { id: "default", name: "Default gateway", url: "https://mcp.n0va.io/mcp", transport: "http_sse" },
        { id: "ws_default", name: "WebSocket gateway", url: "wss://mcp.n0va.io/ws", transport: "websocket" },
      ],
      summary: `MCP mesh: ${MCP_TRANSPORTS.length} transports, ${PROTOCOL_TRANSLATORS.length} protocol translators`,
    };
  }

  discoverTools(tenantId: string, query: string, opts: any = {}) {
    const q = String(query || "").toLowerCase().trim();
    const tokens = q.split(/\s+/).filter(Boolean);
    let intent = String(opts?.intent || "");
    if (!intent) {
      const scores: Record<string, number> = {};
      for (const [int, kws] of Object.entries(INTENT_KEYWORDS)) {
        scores[int] = tokens.reduce((a, t) => a + (kws.some((k) => t.includes(k) || k.includes(t)) ? 1 : 0), 0);
      }
      intent = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[1] > 0 ? Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0] : "read";
    }
    const pool = TOOL_ROUTING.filter((t) => t.intent === intent || !intent);
    const scored = pool
      .map((t) => {
        const hay = `${t.name} ${t.id} ${t.protocols.join(" ")}`.toLowerCase();
        const kw = (INTENT_KEYWORDS[t.intent] || []).join(" ");
        let score = (INTENT_KEYWORDS[t.intent] || []).filter((k) => q.includes(k)).length * 3;
        for (const tok of tokens) if (hay.includes(tok)) score += 2;
        if (kw.includes(q)) score += 1;
        score += hashStr(tenantId + t.id) % 5;
        return { ...t, score };
      })
      .sort((a, b) => b.score - a.score);
    const top = scored.slice(0, opts?.limit || 4);
    logEntry(tenantId, "tools_discovered", `Intent "${intent}" → ${top.length} tool(s) injected`, { query: q, tools: top.map((t) => t.id) });
    return {
      intent,
      query: q,
      tools: top.map(({ id, name, protocols, risk }) => ({ toolId: id, name, protocols, risk })),
      injectedCount: top.length,
      discoveryP99Ms: 45,
      reasoning: `Matched ${top.length} of ${pool.length} candidate tools for intent "${intent}"`,
      summary: `Intent "${intent}" — ${top.length} tool(s) injected`,
    };
  }

  translateRequest(tenantId: string, input: any) {
    const toolId = String(input?.toolId || "");
    const targetProtocol = String(input?.targetProtocol || "rest");
    const tool = TOOL_ROUTING.find((t) => t.id === toolId);
    if (!tool) throw new Error("Tool not found");
    const translator = PROTOCOL_TRANSLATORS.find((p) => p.target.toLowerCase() === targetProtocol.toLowerCase());
    if (!translator) throw new Error(`Unknown target protocol — supported: ${PROTOCOL_TRANSLATORS.map((p) => p.target).join(", ")}`);
    const sourceProtocol = tool.protocols[0];
    const payload = input?.payload || {};
    const seed = `${tenantId}|${toolId}|${targetProtocol}|${hashStr(JSON.stringify(payload))}`;
    const translated = {
      method: "POST",
      url: `https://gateway.n0va.io/${toolId.replace(/\./g, "/")}/${targetProtocol}`,
      headers: { "x-n0va1o-translated": "true", "x-n0va1o-proto": targetProtocol.toUpperCase() },
      body: { ...payload, _n0va1o: { toolId, sourceProtocol, targetProtocol } },
      translationId: `tr_${hashStr(seed).toString(36)}${random6()}`,
    };
    logEntry(tenantId, "protocol_translated", `${toolId}: ${sourceProtocol.toUpperCase()} → ${targetProtocol.toUpperCase()}`, { translationId: translated.translationId });
    return {
      toolId, sourceProtocol, targetProtocol: translator.target,
      translated,
      translationMs: hashStr(seed + "lat") % 12 + 3,
      summary: `${toolId} translated ${sourceProtocol.toUpperCase()} → ${targetProtocol.toUpperCase()}`,
    };
  }

  createRoutingPolicy(tenantId: string, input: any) {
    const teamId = String(input?.teamId || "").trim();
    if (!teamId) throw new Error("teamId is required");
    const existing = DataStore.mem().findOne("n0va1o_policies", (p: any) => p.tenantId === tenantId && p.teamId === teamId);
    if (existing) throw new Error("Policy already exists for this team");
    const row: any = {
      tenantId, teamId,
      endpoint: `https://mcp.n0va.io/team/${teamId}`,
      transport: MCP_TRANSPORTS.some((m) => m.id === input?.transport) ? input.transport : "http_sse",
      ssoRequired: input?.ssoRequired !== false,
      whitelist: Array.isArray(input?.whitelist) ? input.whitelist : [],
      blacklist: Array.isArray(input?.blacklist) ? input.blacklist : [],
      approvalRequired: Array.isArray(input?.approvalRequired) ? input.approvalRequired : [],
      rateLimits: input?.rateLimits || { perMin: 60, perHour: 1000 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const inserted = DataStore.mem().insert("n0va1o_policies", row);
    logEntry(tenantId, "policy_created", `Routing policy for team "${teamId}" — ${row.endpoint}`, { policyId: inserted._id });
    return { policyId: inserted._id, ...row, summary: `Team "${teamId}" MCP endpoint ready — ${row.endpoint}` };
  }

  listRoutingPolicies(tenantId: string) {
    const policies = DataStore.mem().find("n0va1o_policies", (p: any) => p.tenantId === tenantId);
    return { policies, total: policies.length };
  }

  getRoutingPolicy(tenantId: string, teamId: string) {
    const policy = DataStore.mem().findOne("n0va1o_policies", (p: any) => p.tenantId === tenantId && p.teamId === teamId);
    if (!policy) throw new Error("Policy not found");
    return { policyId: policy._id, ...policy };
  }

  updateRoutingPolicy(tenantId: string, teamId: string, input: any) {
    const policy = DataStore.mem().findOne("n0va1o_policies", (p: any) => p.tenantId === tenantId && p.teamId === teamId);
    if (!policy) throw new Error("Policy not found");
    const patch: any = { updatedAt: new Date().toISOString() };
    if (input?.whitelist !== undefined) patch.whitelist = input.whitelist;
    if (input?.blacklist !== undefined) patch.blacklist = input.blacklist;
    if (input?.approvalRequired !== undefined) patch.approvalRequired = input.approvalRequired;
    if (input?.rateLimits !== undefined) patch.rateLimits = input.rateLimits;
    if (input?.ssoRequired !== undefined) patch.ssoRequired = input.ssoRequired;
    DataStore.mem().update("n0va1o_policies", (p: any) => p.tenantId === tenantId && p.teamId === teamId, patch);
    logEntry(tenantId, "policy_updated", `Routing policy for team "${teamId}" updated`, {});
    return { policyId: policy._id, ...policy, ...patch, summary: `Policy for team "${teamId}" updated` };
  }

  deleteRoutingPolicy(tenantId: string, teamId: string) {
    const policy = DataStore.mem().findOne("n0va1o_policies", (p: any) => p.tenantId === tenantId && p.teamId === teamId);
    if (!policy) throw new Error("Policy not found");
    DataStore.mem().delete("n0va1o_policies", (p: any) => p.tenantId === tenantId && p.teamId === teamId);
    logEntry(tenantId, "policy_deleted", `Routing policy for team "${teamId}" deleted`, {});
    return { teamId, deleted: true, summary: `Policy for team "${teamId}" deleted` };
  }

  evaluateToolAccess(tenantId: string, input: any) {
    const toolId = String(input?.toolId || "");
    const teamId = String(input?.teamId || "");
    const tool = TOOL_ROUTING.find((t) => t.id === toolId);
    if (!tool) throw new Error("Tool not found");
    const policy = DataStore.mem().findOne("n0va1o_policies", (p: any) => p.tenantId === tenantId && p.teamId === teamId);
    const blockedBy = (list: string[]) =>
      list.some((pat) => {
        const re = new RegExp("^" + pat.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$");
        return re.test(toolId);
      });
    if (policy) {
      if (blockedBy(policy.blacklist || [])) return { allowed: false, reason: `blocked by team policy blacklist`, toolId, teamId, verdict: "denied" };
      if ((policy.whitelist || []).length && !blockedBy(policy.whitelist) && !(policy.whitelist || []).includes(toolId)) {
        return { allowed: false, reason: "not in team policy whitelist", toolId, teamId, verdict: "denied" };
      }
    }
    const approvalRequired = policy ? (policy.approvalRequired || []).includes(toolId) || (policy.approvalRequired || []).some((p: string) => p.includes("*") && new RegExp("^" + p.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$").test(toolId)) : tool.hitl;
    logEntry(tenantId, "access_evaluated", `${toolId} for team "${teamId}" → ${approvalRequired ? "approval_required" : "allowed"}`, { teamId });
    return {
      allowed: true, toolId, teamId,
      verdict: approvalRequired ? "approval_required" : "allowed",
      risk: tool.risk,
      summary: `${toolId} ${approvalRequired ? "requires approval" : "allowed"}`,
    };
  }

  requestAccess(tenantId: string, input: any) {
    const toolId = String(input?.toolId || "");
    const teamId = String(input?.teamId || "");
    const requester = String(input?.requester || "").trim();
    if (!requester) throw new Error("requester is required");
    const tool = TOOL_ROUTING.find((t) => t.id === toolId);
    if (!tool) throw new Error("Tool not found");
    const row: any = {
      tenantId, toolId, teamId, requester,
      reason: String(input?.reason || ""),
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const inserted = DataStore.mem().insert("n0va1o_access_requests", row);
    logEntry(tenantId, "access_requested", `${requester} requested ${toolId} on team "${teamId}"`, { requestId: inserted._id });
    return { requestId: inserted._id, ...row, summary: `Access request filed for ${toolId}` };
  }

  listAccessRequests(tenantId: string, status?: string) {
    let requests = DataStore.mem().find("n0va1o_access_requests", (r: any) => r.tenantId === tenantId);
    if (status) requests = requests.filter((r: any) => r.status === status);
    return { requests, total: requests.length, pending: requests.filter((r: any) => r.status === "pending").length };
  }

  resolveAccessRequest(tenantId: string, requestId: string, decision: string) {
    const req = DataStore.mem().findOne("n0va1o_access_requests", (r: any) => r.tenantId === tenantId && r._id === requestId);
    if (!req) throw new Error("Access request not found");
    if (decision !== "approve" && decision !== "deny") throw new Error("decision must be approve or deny");
    DataStore.mem().update("n0va1o_access_requests", (r: any) => r._id === requestId, { status: decision === "approve" ? "approved" : "denied", decidedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    logEntry(tenantId, "access_resolved", `Access request ${decision === "approve" ? "approved" : "denied"} for ${req.requester} (${req.toolId})`, { requestId });
    return { requestId, status: decision === "approve" ? "approved" : "denied", summary: `Access ${decision === "approve" ? "approved" : "denied"}` };
  }

  routingLog(tenantId: string, limit = 50) {
    const entries = DataStore.mem().find("n0va1o_routing_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
    return { entries, total: entries.length };
  }

  routingOverview(tenantId: string) {
    const policies = DataStore.mem().find("n0va1o_policies", (p: any) => p.tenantId === tenantId);
    const requests = DataStore.mem().find("n0va1o_access_requests", (r: any) => r.tenantId === tenantId);
    const log = DataStore.mem().find("n0va1o_routing_log", (l: any) => l.tenantId === tenantId);
    return {
      toolCount: TOOL_ROUTING.length,
      intents: Object.keys(INTENT_KEYWORDS),
      teams: policies.map((p: any) => ({ teamId: p.teamId, endpoint: p.endpoint, tools: { whitelist: p.whitelist?.length || 0, blacklist: p.blacklist?.length || 0, approvalRequired: p.approvalRequired?.length || 0 } })),
      pendingAccessRequests: requests.filter((r: any) => r.status === "pending").length,
      discoveries: log.filter((l: any) => l.category === "tools_discovered").length,
      translations: log.filter((l: any) => l.category === "protocol_translated").length,
      discoveryP99Ms: 45,
      summary: `${TOOL_ROUTING.length} tools, ${policies.length} team endpoint(s), ${requests.filter((r: any) => r.status === "pending").length} pending access request(s)`,
    };
  }
}

export const n0va1oRouting = new N0VA1ORoutingService();
